# services/workflow_service.py
import logging
from django.utils import timezone
from ..models import Task, WorkflowStep, TaskApproval, WorkflowHistory, User
from .notification_service import NotificationService # Assuming NotificationService is in the same 'services' directory

logger = logging.getLogger(__name__)

class WorkflowService:

    @staticmethod
    def advance_task_workflow(
        task: Task, 
        completed_step: WorkflowStep, 
        user: User, 
        comment_for_advance: str = "",
        next_step_id_manual: str = None # For manually chosen next step
    ):
        """
        Advances the workflow for a given task from a completed step.
        Handles single next step, multiple next steps (requiring manual choice if not provided),
        and workflow completion.

        Args:
            task: The Task instance.
            completed_step: The WorkflowStep instance that was just completed.
            user: The User who triggered the advancement.
            comment_for_advance: Optional comment for the history log.
            next_step_id_manual: Optional ID of the next step if chosen manually from multiple options.

        Returns:
            bool: True if advanced (or completed), False if awaiting manual choice or error.
            str: Message indicating the outcome or error.
        """
        logger.info(f"Attempting to advance workflow for task {task.id} from step '{completed_step.name if completed_step else 'N/A'}' by user {user.username}")

        if not task.workflow:
            logger.warning(f"Task {task.id} has no workflow assigned. Cannot advance.")
            return False, "Tarefa não possui workflow atribuído."

        if not completed_step:
            # This can happen if a task is completed directly without being on a specific step,
            # or if current_workflow_step was None when advance was called.
            # If the intention is to complete the workflow:
            if task.status == 'completed': # Task itself is marked completed
                if task.current_workflow_step: # If it was on a step, log that step as completed
                     WorkflowService._log_workflow_history(
                        task=task, 
                        from_step=task.current_workflow_step, 
                        to_step=None, 
                        changed_by=user,
                        action='workflow_completed', # or 'step_completed' then 'workflow_completed'
                        comment=f"Workflow finalizado com a conclusão da tarefa. (Passo anterior: {task.current_workflow_step.name}) {comment_for_advance}".strip()
                    )
                else: # No specific step, just workflow completion
                    WorkflowService._log_workflow_history(
                        task=task, from_step=None, to_step=None, changed_by=user,
                        action='workflow_completed',
                        comment=f"Workflow finalizado com a conclusão da tarefa. {comment_for_advance}".strip()
                    )
                task.current_workflow_step = None
                task.save(update_fields=['current_workflow_step'])
                NotificationService.notify_workflow_completed(task, user)
                logger.info(f"Workflow for task {task.id} marked completed as task status is 'completed'.")
                return True, "Workflow finalizado."
            else:
                logger.error(f"advance_task_workflow called with no completed_step for task {task.id} which is not completed.")
                return False, "Passo de origem não especificado e tarefa não está completa."

        # Ensure the task is actually on the completed_step or this is a forced advance
        if task.current_workflow_step != completed_step:
            logger.warning(f"Task {task.id} current step '{task.current_workflow_step.name if task.current_workflow_step else 'N/A'}' "
                           f"does not match completed_step '{completed_step.name}'. Advancing based on provided completed_step.")
            # Potentially, one might want to disallow this or handle it differently.
            # For now, we proceed assuming `completed_step` is the one that just finished.
            # This also means we need to ensure task.current_workflow_step is updated appropriately BEFORE this call if it was different.

        if completed_step.requires_approval:
            is_approved = TaskApproval.objects.filter(
                task=task,
                workflow_step=completed_step,
                approved=True
            ).exists()
            if not is_approved:
                logger.info(f"Step '{completed_step.name}' of task {task.id} requires approval before advancing.")
                # Re-notify if not already handled, or rely on periodic checks.
                # For now, just prevent advancement.
                # NotificationService.notify_approval_needed(task, completed_step) # Avoid re-notifying if already pending
                return False, "Este passo requer aprovação antes de avançar."

        try:
            possible_next_step_ids = completed_step.get_next_steps()
        except Exception as e:
            logger.error(f"Error getting next_steps for step {completed_step.id} ('{completed_step.name}'): {e}")
            possible_next_step_ids = []

        if not possible_next_step_ids:  # No more steps defined, workflow ends here
            task.current_workflow_step = None
            # Only mark task as completed if it's not already.
            # The workflow ending doesn't strictly mean the task is 'completed' status-wise,
            # but it's a common outcome. Consider task.status logic carefully.
            if task.status != 'completed':
                task.status = 'completed' # Or another status like 'workflow_finished_pending_review'
                task.completed_at = timezone.now()
            task.save(update_fields=['current_workflow_step', 'status', 'completed_at'])
            
            WorkflowService._log_workflow_history(
                task=task, from_step=completed_step, to_step=None, changed_by=user,
                action='workflow_completed',
                comment=f"Workflow concluído após passo: '{completed_step.name}'. {comment_for_advance}".strip()
            )
            NotificationService.notify_workflow_completed(task, user)
            logger.info(f"Workflow for task {task.id} completed after step '{completed_step.name}'.")
            return True, "Workflow finalizado."

        actual_next_step = None
        if len(possible_next_step_ids) == 1:
            actual_next_step_id = possible_next_step_ids[0]
            try:
                actual_next_step = WorkflowStep.objects.get(id=actual_next_step_id)
            except WorkflowStep.DoesNotExist:
                logger.error(f"Defined next step with ID {actual_next_step_id} not found for task {task.id} from step '{completed_step.name}'.")
                return False, f"Próximo passo definido ({actual_next_step_id}) não encontrado."
        
        elif len(possible_next_step_ids) > 1:
            if not next_step_id_manual:
                logger.info(f"Task {task.id} from step '{completed_step.name}' has multiple next steps and no manual choice provided. Awaiting manual selection.")
                # Notify that manual selection is needed
                next_steps_available_details = []
                for step_id_opt in possible_next_step_ids:
                    try:
                        step_opt = WorkflowStep.objects.get(id=step_id_opt)
                        next_steps_available_details.append({
                            'id': str(step_opt.id), 'name': step_opt.name, 
                            'description': step_opt.description or '',
                            'assign_to': step_opt.assign_to.username if step_opt.assign_to else None,
                            'requires_approval': step_opt.requires_approval
                        })
                    except WorkflowStep.DoesNotExist:
                        logger.warning(f"Optional next step ID {step_id_opt} not found for task {task.id}.")
                
                if next_steps_available_details:
                     NotificationService.notify_manual_advance_needed(task, completed_step, next_steps_available_details)
                return False, "Múltiplos próximos passos disponíveis. Requer escolha manual."

            if str(next_step_id_manual) not in possible_next_step_ids:
                logger.error(f"Manual choice '{next_step_id_manual}' is not a valid next step for task {task.id} from step '{completed_step.name}'. Possible: {possible_next_step_ids}")
                return False, "Escolha manual inválida para o próximo passo."
            try:
                actual_next_step = WorkflowStep.objects.get(id=next_step_id_manual)
            except WorkflowStep.DoesNotExist:
                logger.error(f"Manually chosen next step ID {next_step_id_manual} not found for task {task.id}.")
                return False, f"Próximo passo escolhido manualmente ({next_step_id_manual}) não encontrado."

        if actual_next_step:
            task.current_workflow_step = actual_next_step
            task.workflow_comment = comment_for_advance # Store general advance comment here
            task.save(update_fields=['current_workflow_step', 'workflow_comment'])
            
            WorkflowService._log_workflow_history(
                task=task, from_step=completed_step, to_step=actual_next_step, changed_by=user,
                action='step_advanced',
                comment=f"Avançado de '{completed_step.name}' para '{actual_next_step.name}'. {comment_for_advance}".strip()
            )
            # Notify previous step completed and new step ready
            NotificationService.notify_step_completed(task, completed_step, user)
            NotificationService.notify_step_ready(task, actual_next_step, user) # User who advanced is considered "changed_by" for next step readiness
            logger.info(f"Workflow for task {task.id} advanced from '{completed_step.name}' to '{actual_next_step.name}'.")
            return True, f"Workflow avançado para '{actual_next_step.name}'."
        
        # Should not be reached if logic is correct
        logger.error(f"Failed to determine next step for task {task.id} from '{completed_step.name}'. This state should not be reached.")
        return False, "Erro inesperado ao determinar o próximo passo."

    @staticmethod
    def _log_workflow_history(task, from_step, to_step, changed_by, action, comment="", time_spent_minutes=None):
        """Helper to create workflow history entries."""
        WorkflowHistory.objects.create(
            task=task,
            from_step=from_step,
            to_step=to_step,
            changed_by=changed_by,
            action=action,
            comment=comment,
            time_spent_minutes=time_spent_minutes
        )

    @staticmethod
    def complete_step_and_advance(
        task: Task, 
        step_to_complete: WorkflowStep, 
        user: User, 
        completion_comment: str = "",
        time_spent_on_step: int = None, # Optional: time spent specifically on this step completion action
        next_step_id_manual: str = None  # If multiple next steps and one is pre-selected
    ):
        """
        Marks a step as completed and then attempts to advance the workflow.
        """
        logger.info(f"User {user.username} completing step '{step_to_complete.name}' for task {task.id}")

        if task.current_workflow_step != step_to_complete:
            # This could be a race condition or an attempt to complete an old step.
            # Or, the step might have already been advanced by another process.
            logger.warning(f"Attempt to complete step '{step_to_complete.name}' for task {task.id}, "
                           f"but task's current step is '{task.current_workflow_step.name if task.current_workflow_step else 'None'}'.")
            # Decide if we should proceed or return an error. For now, let's check if it was already completed.
            if WorkflowHistory.objects.filter(task=task, from_step=step_to_complete, action__in=['step_completed', 'step_advanced', 'workflow_completed']).exists():
                logger.info(f"Step '{step_to_complete.name}' for task {task.id} was already completed or advanced from. Skipping redundant completion log.")
                # Try to advance from this 'already completed' step, in case advancement failed before
                return WorkflowService.advance_task_workflow(task, step_to_complete, user, completion_comment, next_step_id_manual)

            # If not already completed, and current step is different, this is likely an issue.
            return False, "O passo atual da tarefa não corresponde ao passo que está a tentar concluir."


        # Log step completion
        WorkflowService._log_workflow_history(
            task=task,
            from_step=step_to_complete,
            to_step=None, # 'to_step' will be set by the 'step_advanced' log from advance_task_workflow
            changed_by=user,
            action='step_completed',
            comment=f"Passo '{step_to_complete.name}' concluído. {completion_comment}".strip(),
            time_spent_minutes=time_spent_on_step
        )
        NotificationService.notify_step_completed(task, step_to_complete, user)
        
        # Attempt to advance
        return WorkflowService.advance_task_workflow(task, step_to_complete, user, completion_comment, next_step_id_manual)
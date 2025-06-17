# api/services/workflow_service.py
import logging
from django.utils import timezone
from ..models import Task, WorkflowStep, TaskApproval, WorkflowHistory, User
from .notification_service import NotificationService 

logger = logging.getLogger(__name__)

class WorkflowService:

    @staticmethod
    def _log_workflow_history(task, from_step, to_step, changed_by, action, comment="", time_spent_minutes=None):
        """Método auxiliar para criar registos de histórico de forma consistente."""
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
    def advance_task_workflow(
        task: Task, 
        completed_step: WorkflowStep, 
        user: User, 
        comment_for_advance: str = "",
        next_step_id_manual: str = None
    ):
        """
        Avança o workflow para uma determinada tarefa a partir de um passo concluído.
        Retorna (bool: success, str: message).
        """
        logger.info(f"A tentar avançar o workflow para a tarefa {task.id} a partir do passo '{completed_step.name if completed_step else 'N/A'}' pelo utilizador {user.username}")

        if not task.workflow:
            logger.warning(f"A tarefa {task.id} não tem workflow atribuído. Não é possível avançar.")
            return False, "Tarefa não possui workflow atribuído."

        if not completed_step:
            logger.error(f"advance_task_workflow chamado sem um passo de origem para a tarefa {task.id}.")
            return False, "Passo de origem não especificado."

        if task.current_workflow_step != completed_step:
            logger.warning(f"O passo atual da tarefa {task.id} ('{task.current_workflow_step.name if task.current_workflow_step else 'N/A'}') "
                           f"não corresponde ao passo concluído ('{completed_step.name}'). A avançar com base no passo concluído fornecido.")

        if completed_step.requires_approval:
            if not TaskApproval.objects.filter(task=task, workflow_step=completed_step, approved=True).exists():
                logger.info(f"O passo '{completed_step.name}' da tarefa {task.id} requer aprovação antes de avançar.")
                return False, "Este passo requer aprovação antes de avançar."

        try:
            possible_next_steps = list(completed_step.next_steps.all())
        except Exception as e:
            logger.error(f"Erro ao obter próximos passos para o passo {completed_step.id} ('{completed_step.name}'): {e}")
            possible_next_steps = []

        if not possible_next_steps:
            task.current_workflow_step = None
            if task.status != 'completed':
                task.status = 'completed'
                task.completed_at = timezone.now()
            task.save(update_fields=['current_workflow_step', 'status', 'completed_at'])
            
            WorkflowService._log_workflow_history(
                task=task, from_step=completed_step, to_step=None, changed_by=user,
                action='workflow_completed',
                comment=f"Workflow concluído após passo: '{completed_step.name}'. {comment_for_advance}".strip()
            )
            NotificationService.notify_task_completed(task, user)
            logger.info(f"Workflow para a tarefa {task.id} concluído após o passo '{completed_step.name}'. Tarefa marcada como concluída.")
            return True, "Workflow finalizado e tarefa marcada como concluída."

        actual_next_step = None
        if len(possible_next_steps) == 1:
            actual_next_step = possible_next_steps[0]
        elif next_step_id_manual:
            try:
                actual_next_step = next((s for s in possible_next_steps if str(s.id) == next_step_id_manual), None)
                if not actual_next_step:
                     logger.error(f"Escolha manual '{next_step_id_manual}' não é um próximo passo válido para a tarefa {task.id} a partir do passo '{completed_step.name}'.")
                     return False, "Escolha manual inválida para o próximo passo."
            except WorkflowStep.DoesNotExist:
                logger.error(f"Passo escolhido manualmente com ID {next_step_id_manual} não encontrado para a tarefa {task.id}.")
                return False, f"Próximo passo escolhido manualmente ({next_step_id_manual}) não encontrado."
        else:
            logger.info(f"A tarefa {task.id} a partir do passo '{completed_step.name}' tem múltiplos próximos passos e nenhuma escolha manual foi fornecida. A aguardar seleção manual.")
            next_steps_available_details = completed_step.get_next_steps_data()
            if next_steps_available_details:
                NotificationService.notify_manual_advance_needed(task, completed_step, next_steps_available_details)
            return False, "Múltiplos próximos passos disponíveis. Requer escolha manual."

        if actual_next_step:
            task.current_workflow_step = actual_next_step
            task.workflow_comment = comment_for_advance
            task.save(update_fields=['current_workflow_step', 'workflow_comment'])
            
            WorkflowService._log_workflow_history(
                task=task, from_step=completed_step, to_step=actual_next_step, changed_by=user,
                action='step_advanced',
                comment=f"Avançado de '{completed_step.name}' para '{actual_next_step.name}'. {comment_for_advance}".strip()
            )
            NotificationService.notify_step_ready(task, actual_next_step, user)
            logger.info(f"Workflow para a tarefa {task.id} avançou de '{completed_step.name}' para '{actual_next_step.name}'.")
            return True, f"Workflow avançado para '{actual_next_step.name}'."
        
        logger.error(f"Falha ao determinar o próximo passo para a tarefa {task.id} a partir de '{completed_step.name}'. Este estado não deveria ser alcançado.")
        return False, "Erro inesperado ao determinar o próximo passo."

    @staticmethod
    def complete_step_and_advance(
        task: Task, 
        step_to_complete: WorkflowStep, 
        user: User, 
        completion_comment: str = "",
        time_spent_on_step: int = None,
        next_step_id_manual: str = None,
        should_auto_advance: bool = True  # <<-- ARGUMENTO CORRIGIDO AQUI
    ):
        """
        Marca um passo como concluído e, se should_auto_advance for True, tenta avançar o workflow.
        """
        logger.info(f"Utilizador {user.username} a concluir o passo '{step_to_complete.name}' para a tarefa {task.id}")

        if task.current_workflow_step != step_to_complete:
            logger.warning(f"Tentativa de concluir o passo '{step_to_complete.name}' para a tarefa {task.id}, "
                           f"mas o passo atual da tarefa é '{task.current_workflow_step.name if task.current_workflow_step else 'Nenhum'}'.")
            if WorkflowHistory.objects.filter(task=task, from_step=step_to_complete, action__in=['step_completed', 'step_advanced', 'workflow_completed']).exists():
                logger.info(f"O passo '{step_to_complete.name}' para a tarefa {task.id} já foi concluído ou avançado. A ignorar conclusão redundante.")
                return WorkflowService.advance_task_workflow(task, step_to_complete, user, completion_comment, next_step_id_manual)
            return False, "O passo atual da tarefa não corresponde ao passo que está a tentar concluir."

        # Registar a conclusão do passo
        WorkflowService._log_workflow_history(
            task=task,
            from_step=step_to_complete,
            to_step=None,
            changed_by=user,
            action='step_completed',
            comment=f"Passo '{step_to_complete.name}' concluído. {completion_comment}".strip(),
            time_spent_minutes=time_spent_on_step
        )
        NotificationService.notify_step_completed(task, step_to_complete, user)
        
        # Tentar avançar apenas se `should_auto_advance` for True
        if should_auto_advance:
            logger.info(f"Avanço automático ativado. A tentar avançar workflow para a tarefa {task.id}.")
            return WorkflowService.advance_task_workflow(task, step_to_complete, user, completion_comment, next_step_id_manual)
        else:
            logger.info(f"Avanço automático desativado para a tarefa {task.id}. A tarefa permanece no passo '{step_to_complete.name}'.")
            NotificationService.notify_manual_advance_needed(task, step_to_complete, user)
            return True, "Passo concluído com sucesso. O avanço manual é necessário."
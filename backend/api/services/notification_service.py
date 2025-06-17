# services/notification_service.py
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from ..models import WorkflowNotification, Task, WorkflowStep, Profile, NotificationSettings, NotificationTemplate # Added NotificationTemplate
# from .notification_template_service import NotificationTemplateService # Removed direct import
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Serviço centralizado para criação e gestão de notificações de workflow
    """
    
    @staticmethod
    def create_notification( # This is the CORE method, now primarily called by NotificationTemplateService
        user,
        task,
        notification_type,
        title, # Title and message now come pre-rendered from NotificationTemplateService
        message,
        workflow_step=None,
        priority='normal',
        created_by=None,
        metadata=None,
        scheduled_for=None,
        check_existing_recent=False, 
        recent_threshold_hours=24    
    ):
        """
        Cria uma nova notificação respeitando configurações do usuário.
        This method should ideally be the single point of DB creation for notifications.
        """
        
        try:
            settings = user.notification_settings
            if not settings.should_notify(notification_type):
                logger.info(f"Notificação {notification_type} desabilitada para {user.username}")
                return None
            
            if settings.is_quiet_time() and not scheduled_for: # Only schedule if not already scheduled
                logger.info(f"Horário de silêncio ativo para {user.username}, notificação {notification_type} será agendada")
                # Ensure digest_time is a datetime.time object
                digest_hour = settings.digest_time.hour if settings.digest_time else 9 # Default to 9 AM
                digest_minute = settings.digest_time.minute if settings.digest_time else 0

                # Schedule for the next occurrence of digest_time
                now = timezone.now()
                scheduled_time_today = now.replace(hour=digest_hour, minute=digest_minute, second=0, microsecond=0)
                if scheduled_time_today <= now : # If digest time for today has passed
                    scheduled_for = scheduled_time_today + timedelta(days=1)
                else:
                    scheduled_for = scheduled_time_today
                    
        except NotificationSettings.DoesNotExist:
            pass # Use default behavior (notify immediately)
        except AttributeError: # Handle if user.notification_settings doesn't exist
            logger.warning(f"NotificationSettings não encontradas para {user.username}. Usando defaults.")
            pass

        if check_existing_recent:
            cutoff_time = timezone.now() - timedelta(hours=recent_threshold_hours)
            # Be more specific if possible, e.g. for deadline reminders, check metadata
            query_filters = {
                'user': user, 'task': task, 'notification_type': notification_type,
                'created_at__gte': cutoff_time
            }
            if workflow_step:
                query_filters['workflow_step'] = workflow_step
            
            existing = WorkflowNotification.objects.filter(**query_filters).exists()
            if existing:
                logger.info(f"Notificação similar recente ({notification_type} para tarefa {task.id if task else 'N/A'}) já enviada para {user.username}")
                return None

        try:
            notification = WorkflowNotification.objects.create(
                user=user,
                task=task,
                workflow_step=workflow_step,
                notification_type=notification_type,
                priority=priority,
                title=title, # Comes from template
                message=message, # Comes from template
                created_by=created_by,
                metadata=metadata or {},
                scheduled_for=scheduled_for
            )
            
            logger.info(f"Notificação ({notification.id}) tipo '{notification_type}' criada: {notification.title} para {user.username}")
            return notification
            
        except Exception as e:
            logger.error(f"Erro ao criar notificação do tipo '{notification_type}' para {user.username}: {e}", exc_info=True)
            return None

    # --- All specific notify_... methods will now use NotificationTemplateService ---
    @staticmethod
    def _get_notification_template_service():
        """Helper to avoid top-level import of NotificationTemplateService."""
        from .notification_template_service import NotificationTemplateService
        return NotificationTemplateService

    @staticmethod
    def notify_step_ready(task: Task, workflow_step: WorkflowStep, changed_by: User = None):
        if not workflow_step.assign_to:
            logger.warning(f"Passo {workflow_step.name} (tarefa {task.id}) não tem responsável, notificação 'step_ready' não enviada.")
            return None
        
        return NotificationService._get_notification_template_service().create_notification_with_template(
            user_target=workflow_step.assign_to,
            task=task,
            notification_type='step_ready',
            workflow_step=workflow_step,
            created_by=changed_by,
            check_existing_recent=True 
        )
    
    @staticmethod
    def notify_approval_needed(task: Task, workflow_step: WorkflowStep, approvers: list[User] = None, is_reminder: bool = False, comment: str = ""):
        actual_approvers = []
        if approvers:
             actual_approvers = [User.objects.get(id=app_id) if not isinstance(app_id, User) else app_id for app_id in approvers]
        else:
            # Logic to determine approvers if not provided
            if task.client and task.client.organization:
                org = task.client.organization
                # This logic should ideally be on the WorkflowStep model or a WorkflowService
                if workflow_step.approver_role:
                    approver_profiles = Profile.objects.filter(
                        organization=org,
                        role__icontains=workflow_step.approver_role, # Case-insensitive role check
                        user__is_active=True
                    )
                    actual_approvers = [p.user for p in approver_profiles]
                else: # Fallback to org admins
                    admin_profiles = Profile.objects.filter(
                        organization=org, is_org_admin=True, user__is_active=True
                    )
                    actual_approvers = [p.user for p in admin_profiles]
            if not actual_approvers:
                 logger.warning(f"Tarefa {task.id} (cliente {task.client_id}) não tem organização válida ou aprovadores definidos para o passo {workflow_step.id}.")

        notifications = []
        priority_level = 'urgent' if is_reminder else 'high'

        for approver in actual_approvers:
            if not approver.is_active:
                logger.info(f"Aprovador {approver.username} está inativo. Notificação de aprovação suprimida.")
                continue
            
            extra_context = {
                'reminder_prefix': "LEMBRETE: " if is_reminder else "",
                'comment': f"Comentário adicional: {comment}" if comment else ""
            }
            notification = NotificationService._get_notification_template_service().create_notification_with_template(
                user_target=approver,
                task=task,
                workflow_step=workflow_step,
                notification_type='approval_needed',
                extra_context=extra_context,
                priority_override=priority_level,
                check_existing_recent=is_reminder,
                recent_threshold_hours=24*2
            )
            if notification:
                notifications.append(notification)
        return notifications

    @staticmethod
    def notify_approval_completed(task: Task, workflow_step: WorkflowStep, approval_record, approved_by: User):
        users_to_notify_set = set()
        if workflow_step.assign_to and workflow_step.assign_to.is_active: users_to_notify_set.add(workflow_step.assign_to)
        if task.assigned_to and task.assigned_to.is_active: users_to_notify_set.add(task.assigned_to)
        if task.created_by and task.created_by.is_active: users_to_notify_set.add(task.created_by)
        
        notification_type = 'approval_completed' if approval_record.approved else 'step_rejected'
        priority = 'normal' if approval_record.approved else 'high'
        
        extra_context = {
            'approval_status': "APROVADO" if approval_record.approved else "REJEITADO",
            'approval_status_text': "aprovado" if approval_record.approved else "rejeitado", # for lowercase in message
            'approver_name': approved_by.get_full_name() or approved_by.username,
            'approval_comment': approval_record.comment or "Nenhum comentário fornecido."
        }
        
        notifications = []
        for user_to_notify in users_to_notify_set:
            if user_to_notify == approved_by: continue
            
            notification = NotificationService._get_notification_template_service().create_notification_with_template(
                user_target=user_to_notify,
                task=task,
                workflow_step=workflow_step,
                notification_type=notification_type,
                extra_context=extra_context,
                priority_override=priority,
                created_by=approved_by
            )
            if notification:
                notifications.append(notification)
        return notifications

    @staticmethod
    def notify_manual_advance_needed(task: Task, workflow_step: WorkflowStep, next_steps_available: list):
        users_to_notify_set = set()
        if workflow_step.assign_to and workflow_step.assign_to.is_active: users_to_notify_set.add(workflow_step.assign_to)
        if task.assigned_to and task.assigned_to.is_active: users_to_notify_set.add(task.assigned_to)
        if not users_to_notify_set and task.created_by and task.created_by.is_active: users_to_notify_set.add(task.created_by)
        if not users_to_notify_set and task.client and task.client.organization:
            admin_profiles = Profile.objects.filter(organization=task.client.organization, is_org_admin=True, user__is_active=True)
            users_to_notify_set.update(p.user for p in admin_profiles)

        extra_context = {
            'completed_step_name': workflow_step.name,
            'next_steps_names_list': ", ".join([step['name'] for step in next_steps_available])
        }
        metadata_for_notification = {
            'next_steps_available': next_steps_available,
            'requires_manual_choice': True,
            'completed_step_id': str(workflow_step.id),
            'completed_step_name': workflow_step.name
        }
        notifications = []
        for user_to_notify in users_to_notify_set:
            notification = NotificationService._get_notification_template_service().create_notification_with_template(
                user_target=user_to_notify,
                task=task,
                workflow_step=workflow_step,
                notification_type='manual_advance_needed',
                extra_context=extra_context,
                metadata=metadata_for_notification # Keep specific metadata for actions
            )
            if notification:
                notifications.append(notification)
        return notifications
        
    @staticmethod
    def notify_step_completed(task: Task, workflow_step: WorkflowStep, completed_by: User):
        users_to_notify_set = set()
        if task.created_by and task.created_by.is_active: users_to_notify_set.add(task.created_by)
        if task.assigned_to and task.assigned_to.is_active: users_to_notify_set.add(task.assigned_to)
        
        notifications = []
        for user_to_notify in users_to_notify_set:
            if user_to_notify == completed_by: continue
            notification = NotificationService._get_notification_template_service().create_notification_with_template(
                user_target=user_to_notify,
                task=task,
                workflow_step=workflow_step,
                notification_type='step_completed',
                created_by=completed_by
            )
            if notification:
                notifications.append(notification)
        return notifications

    @staticmethod # MODIFIED: Was notify_workflow_completed
    def notify_task_completed(task: Task, completed_by: User):
        users_to_notify_set = set()
        if task.created_by and task.created_by.is_active: users_to_notify_set.add(task.created_by)
        if task.assigned_to and task.assigned_to.is_active: users_to_notify_set.add(task.assigned_to)
        if task.client and task.client.account_manager and task.client.account_manager.is_active:
            users_to_notify_set.add(task.client.account_manager)
        
        notifications = []
        for user_to_notify in users_to_notify_set:
            if user_to_notify == completed_by: continue
            notification = NotificationService._get_notification_template_service().create_notification_with_template(
                user_target=user_to_notify,
                task=task,
                workflow_step=None,
                notification_type='task_completed',
                created_by=completed_by
            )
            if notification:
                notifications.append(notification)
        return notifications

    @staticmethod
    def notify_deadline_approaching(task: Task, days_remaining: int):
        if not task.deadline: return []
        
        users_to_notify_set = set()
        if task.assigned_to and task.assigned_to.is_active: users_to_notify_set.add(task.assigned_to)
        if task.current_workflow_step and task.current_workflow_step.assign_to and task.current_workflow_step.assign_to.is_active:
            users_to_notify_set.add(task.current_workflow_step.assign_to)
        if task.created_by and task.created_by.is_active and task.created_by not in users_to_notify_set:
             users_to_notify_set.add(task.created_by)
        if not users_to_notify_set:
            logger.warning(f"Nenhum usuário ativo para notificar sobre deadline da tarefa {task.id}")
            return []

        priority_level = 'normal'
        if days_remaining == 0: priority_level = 'urgent'
        elif days_remaining == 1: priority_level = 'high'
        
        days_remaining_text_map = {
            0: "HOJE", 1: "AMANHÃ",
            # For other days, you might construct "em X dias" in the template or here
        }
        days_remaining_text = days_remaining_text_map.get(days_remaining, f"em {days_remaining} dias")
        
        extra_context = {
            'days_remaining': days_remaining,
            'days_remaining_text': days_remaining_text,
            'deadline_date': task.deadline.strftime('%d/%m/%Y')
        }
        notifications = []
        for user_to_notify in users_to_notify_set:
            notification = NotificationService._get_notification_template_service().create_notification_with_template(
                user_target=user_to_notify,
                task=task,
                workflow_step=task.current_workflow_step,
                notification_type='deadline_approaching',
                extra_context=extra_context,
                priority_override=priority_level,
                metadata={'days_remaining': days_remaining, 'deadline': task.deadline.strftime('%d/%m/%Y')}, # Keep specific metadata
                check_existing_recent=True, recent_threshold_hours=23 
            )
            if notification:
                notifications.append(notification)
        return notifications

    @staticmethod
    def notify_step_overdue(task: Task, workflow_step: WorkflowStep, days_overdue: int = None):
        users_to_notify_set = set()
        responsible_user = None
        if workflow_step.assign_to and workflow_step.assign_to.is_active:
            responsible_user = workflow_step.assign_to
            users_to_notify_set.add(responsible_user)
        elif task.assigned_to and task.assigned_to.is_active: 
            responsible_user = task.assigned_to
            users_to_notify_set.add(responsible_user)
        
        if task.created_by and task.created_by.is_active and task.created_by != responsible_user:
            users_to_notify_set.add(task.created_by)
        if task.client and task.client.account_manager and task.client.account_manager.is_active and task.client.account_manager not in users_to_notify_set:
            users_to_notify_set.add(task.client.account_manager)
        if not users_to_notify_set:
            logger.warning(f"Nenhum usuário ativo para notificar sobre atraso do passo {workflow_step.name} da tarefa {task.id}")
            return []
        
        extra_context = {
            'days_overdue': days_overdue,
            'days_overdue_text': f"{days_overdue} dia(s)" if days_overdue is not None else "um tempo",
            'step_assignee_name': responsible_user.get_full_name() or responsible_user.username if responsible_user else "Não atribuído",
            'deadline_date': task.deadline.strftime('%d/%m/%Y') if task.deadline else "N/A"
        }
        notifications = []
        for user_to_notify in users_to_notify_set:
            priority = 'urgent' if user_to_notify == responsible_user else 'high'
            notification = NotificationService._get_notification_template_service().create_notification_with_template(
                user_target=user_to_notify,
                task=task,
                workflow_step=workflow_step,
                notification_type='step_overdue',
                extra_context=extra_context,
                priority_override=priority,
                metadata={'days_overdue': days_overdue} if days_overdue is not None else {}, # Keep specific metadata
                check_existing_recent=True, recent_threshold_hours=24*2 
            )
            if notification:
                notifications.append(notification)
        return notifications

    @staticmethod
    def create_manual_reminder(task: Task, target_users: list[User], title: str, message: str, created_by: User, priority: str = 'normal', scheduled_for=None):
        notifications = []
        extra_context = {
            'manual_title': title, # For template variable {manual_title}
            'manual_message': message, # For template variable {manual_message}
        }
        for user in target_users:
            if not user.is_active:
                logger.info(f"Usuário {user.username} está inativo, lembrete manual não enviado.")
                continue
            notification = NotificationService._get_notification_template_service().create_notification_with_template(
                user_target=user,
                task=task,
                workflow_step=task.current_workflow_step,
                notification_type='manual_reminder',
                extra_context=extra_context,
                priority_override=priority,
                created_by=created_by,
                scheduled_for=scheduled_for,
                metadata={'is_manual': True, 'original_title': title, 'original_message': message} # Keep original for any non-template processing
            )
            if notification:
                notifications.append(notification)
        return notifications
        
    @staticmethod
    def notify_workflow_assigned(task: Task, assigned_by: User):
        target_user = None
        first_step_message_part = ""
        first_step = None

        if task.workflow:
            first_step = task.workflow.steps.order_by('order').first()
            if first_step and first_step.assign_to and first_step.assign_to.is_active:
                target_user = first_step.assign_to
                first_step_message_part = f"O primeiro passo '{first_step.name}' está pronto para si. "
            elif task.assigned_to and task.assigned_to.is_active:
                target_user = task.assigned_to
            elif task.created_by and task.created_by.is_active: 
                target_user = task.created_by

        if target_user:
            extra_context = {
                'first_step_message': first_step_message_part,
                'first_step_name': first_step.name if first_step else "N/A"
            }
            NotificationService._get_notification_template_service().create_notification_with_template(
                user_target=target_user,
                task=task,
                workflow_step=first_step, 
                notification_type='workflow_assigned',
                extra_context=extra_context,
                created_by=assigned_by,
                check_existing_recent=True, recent_threshold_hours=1 
            )
            return True
        logger.warning(f"Não foi possível determinar o usuário alvo para notificação de atribuição de workflow para tarefa {task.id}")
        return False

    @staticmethod
    def notify_step_rejected(task: Task, workflow_step: WorkflowStep, rejected_by: User, comment: str):
        users_to_notify_set = set()
        if workflow_step.assign_to and workflow_step.assign_to.is_active: users_to_notify_set.add(workflow_step.assign_to)
        if task.assigned_to and task.assigned_to.is_active: users_to_notify_set.add(task.assigned_to)
        if task.created_by and task.created_by.is_active: users_to_notify_set.add(task.created_by)

        extra_context = {
            'comment': comment or "Nenhum comentário fornecido."
        }
        notifications = []
        for user_to_notify in users_to_notify_set:
            if user_to_notify == rejected_by: continue
            notification = NotificationService._get_notification_template_service().create_notification_with_template(
                user_target=user_to_notify,
                task=task,
                workflow_step=workflow_step,
                notification_type='step_rejected',
                extra_context=extra_context,
                created_by=rejected_by
            )
            if notification:
                notifications.append(notification)
        return notifications
    
    # --- Utility methods (no change needed for templating) ---
    @staticmethod
    def get_unread_count(user):
        return WorkflowNotification.objects.filter(user=user, is_read=False, is_archived=False).count()
    
    @staticmethod
    def mark_all_as_read(user):
        return WorkflowNotification.objects.filter(user=user, is_read=False, is_archived=False).update(
            is_read=True, read_at=timezone.now()
        )
# api/services/notification_service.py
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from ..models import WorkflowNotification, Task, WorkflowStep, Profile, NotificationSettings, GeneratedReport
from .notification_template_service import NotificationTemplateService
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Serviço centralizado para criação e gestão de notificações de workflow.
    """

    @staticmethod
    def create_notification(
        user, task, notification_type, title, message,
        workflow_step=None, priority='normal', created_by=None,
        metadata=None, scheduled_for=None, check_existing_recent=False,
        recent_threshold_hours=24
    ):
        """
        Método central para criar um registo de WorkflowNotification no banco de dados.
        Verifica as configurações do usuário antes de criar.
        Agora respeita notification_types_enabled, preferred_channels, digest_enabled, quiet_hours_enabled.
        """
        try:
            settings = user.notification_settings
            # --- 1. Notification type enabled? ---
            if hasattr(settings, 'notification_types_enabled') and settings.notification_types_enabled:
                enabled_types = settings.notification_types_enabled
                if notification_type in enabled_types and not enabled_types[notification_type]:
                    logger.info(f"Notificação {notification_type} desabilitada para {user.username} via notification_types_enabled")
                    return None
            elif not settings.should_notify(notification_type):
                logger.info(f"Notificação {notification_type} desabilitada para {user.username}")
                return None

            # --- 2. Quiet hours logic ---
            if getattr(settings, 'quiet_hours_enabled', False) and settings.is_quiet_time() and not scheduled_for:
                logger.info(f"Horário de silêncio ativo para {user.username}, notificação {notification_type} será agendada para digest ou após quiet hours")
                if getattr(settings, 'digest_enabled', True):
                    # Schedule for digest
                    digest_hour = settings.digest_time.hour if settings.digest_time else 9
                    digest_minute = settings.digest_time.minute if settings.digest_time else 0
                    now = timezone.now()
                    scheduled_time_today = now.replace(hour=digest_hour, minute=digest_minute, second=0, microsecond=0)
                    if scheduled_time_today <= now:
                        scheduled_for = scheduled_time_today + timedelta(days=1)
                    else:
                        scheduled_for = scheduled_time_today
                else:
                    # Schedule for after quiet hours
                    end_time = settings.quiet_end_time
                    now = timezone.now()
                    scheduled_for = now.replace(hour=end_time.hour, minute=end_time.minute, second=0, microsecond=0)
                    if scheduled_for <= now:
                        scheduled_for += timedelta(days=1)

            # --- 3. Digest logic ---
            if getattr(settings, 'digest_enabled', True) and getattr(settings, 'digest_frequency', 'immediate') != 'immediate' and not scheduled_for:
                digest_hour = settings.digest_time.hour if settings.digest_time else 9
                digest_minute = settings.digest_time.minute if settings.digest_time else 0
                now = timezone.now()
                scheduled_time_today = now.replace(hour=digest_hour, minute=digest_minute, second=0, microsecond=0)
                if scheduled_time_today <= now:
                    scheduled_for = scheduled_time_today + timedelta(days=1)
                else:
                    scheduled_for = scheduled_time_today

            # --- 4. Channel logic (for frontend integration) ---
            # Save preferred_channels in metadata for frontend to use (e.g., ['in_app', 'email'])
            if hasattr(settings, 'preferred_channels') and settings.preferred_channels:
                if metadata is None:
                    metadata = {}
                metadata['preferred_channels'] = settings.preferred_channels

        except NotificationSettings.DoesNotExist:
            pass
        except AttributeError:
            logger.warning(f"NotificationSettings não encontradas para {user.username}. Usando defaults.")
            pass

        if check_existing_recent:
            cutoff_time = timezone.now() - timedelta(hours=recent_threshold_hours)
            query_filters = {'user': user, 'task': task, 'notification_type': notification_type, 'created_at__gte': cutoff_time}
            if workflow_step: query_filters['workflow_step'] = workflow_step
            
            if WorkflowNotification.objects.filter(**query_filters).exists():
                logger.info(f"Notificação similar recente ({notification_type}) já enviada para {user.username}")
                return None

        try:
            notification = WorkflowNotification.objects.create(
                user=user, task=task, workflow_step=workflow_step,
                notification_type=notification_type, priority=priority,
                title=title, message=message, created_by=created_by,
                metadata=metadata or {}, scheduled_for=scheduled_for
            )
            logger.info(f"Notificação ({notification.id}) tipo '{notification_type}' criada: {notification.title} para {user.username}")
            return notification
        except Exception as e:
            logger.error(f"Erro ao criar notificação do tipo '{notification_type}' para {user.username}: {e}", exc_info=True)
            return None

    @staticmethod
    def _call_template_service_and_create(
        user_target, notification_type, task=None, workflow_step=None, 
        created_by=None, extra_context=None, priority_override=None, 
        report=None, **kwargs
    ):
        """
        Método auxiliar para encapsular o padrão "renderizar e depois criar".
        """
        rendered_content = NotificationTemplateService.get_rendered_notification_content(
            user_target=user_target, notification_type=notification_type,
            task=task, workflow_step=workflow_step, created_by=created_by,
            extra_context=extra_context, priority_override=priority_override,
            report=report
        )

        task_for_creation = task if notification_type != 'report_generated' else None
        step_for_creation = workflow_step if notification_type != 'report_generated' else None
        
        # Merge context from template service with any specific metadata passed in kwargs
        final_metadata = rendered_content.get('context', {})
        if 'metadata' in kwargs and isinstance(kwargs['metadata'], dict):
            final_metadata.update(kwargs['metadata'])

        return NotificationService.create_notification(
            user=user_target, task=task_for_creation, workflow_step=step_for_creation,
            notification_type=notification_type,
            title=rendered_content['title'], message=rendered_content['message'],
            priority=rendered_content['priority'], created_by=created_by,
            metadata=final_metadata, **kwargs
        )

    @staticmethod
    def notify_step_ready(task: Task, workflow_step: WorkflowStep, changed_by: User = None):
        if not workflow_step.assign_to:
            logger.warning(f"Passo {workflow_step.name} (tarefa {task.id}) não tem responsável, notificação 'step_ready' não enviada.")
            return []
        
        notification = NotificationService._call_template_service_and_create(
            user_target=workflow_step.assign_to, task=task,
            notification_type='step_ready', workflow_step=workflow_step,
            created_by=changed_by, check_existing_recent=True
        )
        return [notification] if notification else []

    @staticmethod
    def notify_approval_needed(task: Task, workflow_step: WorkflowStep, approvers: list[User] = None, is_reminder: bool = False, comment: str = ""):
        actual_approvers = []
        if approvers:
            actual_approvers = approvers
        elif task.client and task.client.organization:
            org = task.client.organization
            if workflow_step.approver_role:
                approver_profiles = Profile.objects.filter(organization=org, role__icontains=workflow_step.approver_role, user__is_active=True)
                actual_approvers = [p.user for p in approver_profiles]
            else:
                admin_profiles = Profile.objects.filter(organization=org, is_org_admin=True, user__is_active=True)
                actual_approvers = [p.user for p in admin_profiles]
        
        notifications = []
        priority_level = 'urgent' if is_reminder else 'high'
        for approver in actual_approvers:
            if not approver.is_active: continue

            extra_context = {
                'reminder_prefix': "LEMBRETE: " if is_reminder else "",
                'comment': f"Comentário adicional: {comment}" if comment else ""
            }
            notification = NotificationService._call_template_service_and_create(
                user_target=approver, task=task, workflow_step=workflow_step,
                notification_type='approval_needed', extra_context=extra_context,
                priority_override=priority_level,
                check_existing_recent=is_reminder, recent_threshold_hours=24*2
            )
            if notification: notifications.append(notification)
        return notifications

    @staticmethod
    def notify_approval_completed(task: Task, workflow_step: WorkflowStep, approval_record, approved_by: User):
        users_to_notify_set = {task.created_by, task.assigned_to, workflow_step.assign_to}
        users_to_notify_set.discard(None)
        users_to_notify_set.discard(approved_by)
        
        notification_type = 'approval_completed' if approval_record.approved else 'step_rejected'
        priority = 'normal' if approval_record.approved else 'high'
        extra_context = {
            'approval_status': "APROVADO" if approval_record.approved else "REJEITADO",
            'approval_status_text': "aprovado" if approval_record.approved else "rejeitado",
            'approver_name': approved_by.get_full_name() or approved_by.username,
            'approval_comment': approval_record.comment or "Nenhum comentário fornecido."
        }
        
        notifications = []
        for user_to_notify in users_to_notify_set:
            if user_to_notify and user_to_notify.is_active:
                notification = NotificationService._call_template_service_and_create(
                    user_target=user_to_notify, task=task, workflow_step=workflow_step,
                    notification_type=notification_type, extra_context=extra_context,
                    priority_override=priority, created_by=approved_by
                )
                if notification: notifications.append(notification)
        return notifications

    @staticmethod
    def notify_manual_advance_needed(task: Task, workflow_step: WorkflowStep, next_steps_available: list):
        users_to_notify_set = {task.created_by, task.assigned_to, workflow_step.assign_to}
        users_to_notify_set.discard(None)
        
        extra_context = {
            'completed_step_name': workflow_step.name,
            'next_steps_names_list': ", ".join([step['name'] for step in next_steps_available])
        }
        metadata_for_notification = {
            'next_steps_available': next_steps_available,
            'requires_manual_choice': True,
            'completed_step_id': str(workflow_step.id),
        }
        notifications = []
        for user_to_notify in users_to_notify_set:
            if user_to_notify and user_to_notify.is_active:
                notification = NotificationService._call_template_service_and_create(
                    user_target=user_to_notify, task=task, workflow_step=workflow_step,
                    notification_type='manual_advance_needed', extra_context=extra_context,
                    metadata=metadata_for_notification
                )
                if notification: notifications.append(notification)
        return notifications

    @staticmethod
    def notify_step_completed(task: Task, workflow_step: WorkflowStep, completed_by: User):
        users_to_notify_set = {task.created_by, task.assigned_to}
        users_to_notify_set.discard(None)
        users_to_notify_set.discard(completed_by)

        notifications = []
        for user_to_notify in users_to_notify_set:
            if user_to_notify and user_to_notify.is_active:
                notification = NotificationService._call_template_service_and_create(
                    user_target=user_to_notify, task=task, workflow_step=workflow_step,
                    notification_type='step_completed', created_by=completed_by
                )
                if notification: notifications.append(notification)
        return notifications

    @staticmethod
    def notify_task_completed(task: Task, completed_by: User):
        users_to_notify_set = {task.created_by, task.assigned_to}
        if task.client and task.client.account_manager: users_to_notify_set.add(task.client.account_manager)
        users_to_notify_set.discard(None)
        users_to_notify_set.discard(completed_by)
        
        notifications = []
        for user_to_notify in users_to_notify_set:
            if user_to_notify and user_to_notify.is_active:
                notification = NotificationService._call_template_service_and_create(
                    user_target=user_to_notify, task=task,
                    notification_type='task_completed', created_by=completed_by
                )
                if notification: notifications.append(notification)
        return notifications

    @staticmethod
    def notify_deadline_approaching(task: Task, days_remaining: int):
        if not task.deadline: return []
        
        users_to_notify_set = {task.assigned_to, task.created_by}
        if task.current_workflow_step: users_to_notify_set.add(task.current_workflow_step.assign_to)
        users_to_notify_set.discard(None)

        priority_level = 'normal'
        if days_remaining == 0: priority_level = 'urgent'
        elif days_remaining <= 2: priority_level = 'high'
        
        days_map = {0: "HOJE", 1: "AMANHÃ"}
        extra_context = {
            'days_remaining': days_remaining,
            'days_remaining_text': days_map.get(days_remaining, f"em {days_remaining} dias"),
            'deadline_date': task.deadline.strftime('%d/%m/%Y')
        }
        
        notifications = []
        for user in users_to_notify_set:
            if user and user.is_active:
                notification = NotificationService._call_template_service_and_create(
                    user_target=user, task=task, workflow_step=task.current_workflow_step,
                    notification_type='deadline_approaching', extra_context=extra_context,
                    priority_override=priority_level, check_existing_recent=True, recent_threshold_hours=23
                )
                if notification: notifications.append(notification)
        return notifications

    @staticmethod
    def notify_step_overdue(task: Task, workflow_step: WorkflowStep, days_overdue: int = None):
        users_to_notify_set = set()
        responsible_user = workflow_step.assign_to or task.assigned_to
        if responsible_user and responsible_user.is_active: users_to_notify_set.add(responsible_user)
        if task.created_by and task.created_by.is_active: users_to_notify_set.add(task.created_by)
        if task.client and task.client.account_manager and task.client.account_manager.is_active:
            users_to_notify_set.add(task.client.account_manager)
        
        extra_context = {
            'days_overdue': days_overdue,
            'days_overdue_text': f"{days_overdue} dia(s)" if days_overdue is not None else "um tempo",
            'step_assignee_name': responsible_user.get_full_name() or responsible_user.username if responsible_user else "Não atribuído",
            'deadline_date': task.deadline.strftime('%d/%m/%Y') if task.deadline else "N/A"
        }
        
        notifications = []
        for user_to_notify in users_to_notify_set:
            priority = 'urgent' if user_to_notify == responsible_user else 'high'
            notification = NotificationService._call_template_service_and_create(
                user_target=user_to_notify, task=task, workflow_step=workflow_step,
                notification_type='step_overdue', extra_context=extra_context,
                priority_override=priority, check_existing_recent=True, recent_threshold_hours=24*2
            )
            if notification: notifications.append(notification)
        return notifications

    @staticmethod
    def create_manual_reminder(task: Task, target_users: list[User], title: str, message: str, created_by: User, priority: str = 'normal', scheduled_for=None):
        notifications = []
        extra_context = {'manual_title': title, 'manual_message': message}
        
        for user in target_users:
            if not user.is_active: continue

            notification = NotificationService._call_template_service_and_create(
                user_target=user, task=task, workflow_step=task.current_workflow_step,
                notification_type='manual_reminder', extra_context=extra_context,
                priority_override=priority, created_by=created_by, scheduled_for=scheduled_for,
                metadata={'is_manual': True, 'original_title': title, 'original_message': message}
            )
            if notification: notifications.append(notification)
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
            else:
                target_user = task.assigned_to or task.created_by
        
        if target_user and target_user.is_active:
            extra_context = {
                'first_step_message': first_step_message_part,
                'first_step_name': first_step.name if first_step else "N/A"
            }
            NotificationService._call_template_service_and_create(
                user_target=target_user, task=task, workflow_step=first_step, 
                notification_type='workflow_assigned', extra_context=extra_context,
                created_by=assigned_by, check_existing_recent=True, recent_threshold_hours=1
            )
            return True
        logger.warning(f"Não foi possível determinar o usuário alvo para notificação de workflow na tarefa {task.id}")
        return False
    
    @staticmethod
    def get_unread_count(user):
        return WorkflowNotification.objects.filter(user=user, is_read=False, is_archived=False).count()
    
    @staticmethod
    def mark_all_as_read(user):
        return WorkflowNotification.objects.filter(user=user, is_read=False, is_archived=False).update(
            is_read=True, read_at=timezone.now()
        )
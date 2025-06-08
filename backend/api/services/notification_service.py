from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from ..models import WorkflowNotification, Task, WorkflowStep, Profile, NotificationSettings
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Serviço centralizado para criação e gestão de notificações de workflow
    """
    
    @staticmethod

    def create_notification(
        user,
        task,
        notification_type,
        title,
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
        Cria uma nova notificação respeitando configurações do usuário
        """
        
        # Verificar configurações do usuário
        try:
            settings = user.notification_settings
            
            # Verificar se o tipo de notificação está habilitado
            if not settings.should_notify(notification_type):
                logger.info(f"Notificação {notification_type} desabilitada para {user.username}")
                return None
            
            # Verificar horário de silêncio
            if settings.is_quiet_time():
                logger.info(f"Horário de silêncio ativo para {user.username}, notificação será agendada")
                # Agendar para depois do horário de silêncio
                if not scheduled_for:
                    tomorrow = timezone.now().replace(hour=settings.digest_time.hour, 
                                                    minute=settings.digest_time.minute, 
                                                    second=0, microsecond=0) + timedelta(days=1)
                    scheduled_for = tomorrow
                    
        except NotificationSettings.DoesNotExist:
            # Se não tem configurações, usar padrão
            pass
        
        # Verificar notificações recentes
        if check_existing_recent:
            cutoff_time = timezone.now() - timedelta(hours=recent_threshold_hours)
            existing = WorkflowNotification.objects.filter(
                user=user,
                task=task,
                workflow_step=workflow_step, 
                notification_type=notification_type,
                created_at__gte=cutoff_time
            ).exists()
            if existing:
                logger.info(f"Notificação similar recente já enviada para {user.username}")
                return None

        try:
            notification = WorkflowNotification.objects.create(
                user=user,
                task=task,
                workflow_step=workflow_step,
                notification_type=notification_type,
                priority=priority,
                title=title,
                message=message,
                created_by=created_by,
                metadata=metadata or {},
                scheduled_for=scheduled_for
            )
            
            logger.info(f"Notificação criada: {notification.title} para {user.username}")
            return notification
            
        except Exception as e:
            logger.error(f"Erro ao criar notificação: {e}")
            return None
        
    @staticmethod
    def notify_step_ready(task, workflow_step, changed_by=None):
        """
        Notifica que um passo está pronto para execução
        """
        if not workflow_step.assign_to:
            logger.warning(f"Passo {workflow_step.name} (tarefa {task.id}) não tem responsável, notificação 'step_ready' não enviada.")
            return None
            
        return NotificationService.create_notification(
            user=workflow_step.assign_to,
            task=task,
            workflow_step=workflow_step,
            notification_type='step_ready',
            title=f"Passo pronto: {workflow_step.name}",
            message=f"A tarefa '{task.title}' chegou ao passo '{workflow_step.name}' e está pronta para ser trabalhada.",
            priority='normal',
            created_by=changed_by,
            check_existing_recent=True 
        )
    
    @staticmethod
    def notify_approval_needed(task, workflow_step, approvers=None, is_reminder=False):
        """
        Notifica sobre aprovação necessária. Can also be used for reminders.
        """
        if not approvers:
            if task.client and task.client.organization:
                org = task.client.organization
                if workflow_step.approver_role:
                    approvers_profiles = Profile.objects.filter(
                        organization=org,
                        role__icontains=workflow_step.approver_role,
                        user__is_active=True
                    )
                    approvers = [p.user for p in approvers_profiles]
                else:
                    admin_profiles = Profile.objects.filter(
                        organization=org,
                        is_org_admin=True,
                        user__is_active=True
                    )
                    approvers = [p.user for p in admin_profiles]
            else:
                logger.warning(f"Tarefa {task.id} (cliente {task.client_id}) não tem organização válida. Não é possível determinar aprovadores para o passo {workflow_step.id}.")
                approvers = []
        
        notifications = []
        title_prefix = "LEMBRETE: " if is_reminder else ""
        priority_level = 'urgent' if is_reminder else 'high'

        for approver in approvers:
            if not isinstance(approver, User): # Ensure approver is a User instance
                try:
                    approver = User.objects.get(id=approver) # Assuming approver might be an ID
                except User.DoesNotExist:
                    logger.warning(f"Aprovador com ID {approver} não encontrado.")
                    continue
            
            if not approver.is_active:
                logger.info(f"Aprovador {approver.username} está inativo. Notificação de aprovação suprimida.")
                continue

            notification = NotificationService.create_notification(
                user=approver,
                task=task,
                workflow_step=workflow_step,
                notification_type='approval_needed',
                title=f"{title_prefix}Aprovação necessária: {workflow_step.name}",
                message=f"O passo '{workflow_step.name}' da tarefa '{task.title}' precisa de sua aprovação.",
                priority=priority_level,
                check_existing_recent=is_reminder, 
                recent_threshold_hours= 24 * 2 # For reminders, check last 2 days
            )
            if notification:
                notifications.append(notification)
        
        return notifications
    
    @staticmethod
    def notify_step_completed(task, workflow_step, completed_by):
        """
        Notifica sobre conclusão de passo
        """
        notifications = []
        
        users_to_notify_set = set()
        if task.created_by and task.created_by.is_active:
            users_to_notify_set.add(task.created_by)
        if task.assigned_to and task.assigned_to.is_active:
            users_to_notify_set.add(task.assigned_to)
        
        for user_to_notify in users_to_notify_set:
            if user_to_notify == completed_by: # Don't notify the person who completed it
                continue
            
            notification = NotificationService.create_notification(
                user=user_to_notify,
                task=task,
                workflow_step=workflow_step,
                notification_type='step_completed',
                title=f"Passo concluído: {workflow_step.name}",
                message=f"O passo '{workflow_step.name}' da tarefa '{task.title}' foi concluído por {completed_by.username}.",
                priority='normal',
                created_by=completed_by
            )
            if notification:
                notifications.append(notification)
        
        return notifications
    
    @staticmethod
    def notify_workflow_completed(task, completed_by):
        """
        Notifica sobre conclusão de workflow
        """
        notifications = []
        
        users_to_notify_set = set()
        
        if task.created_by and task.created_by.is_active:
            users_to_notify_set.add(task.created_by)
        if task.assigned_to and task.assigned_to.is_active:
            users_to_notify_set.add(task.assigned_to)
        if task.client and task.client.account_manager and task.client.account_manager.is_active:
            users_to_notify_set.add(task.client.account_manager)
        
        for user in users_to_notify_set:
            if user != completed_by:
                notification = NotificationService.create_notification(
                    user=user,
                    task=task,
                    notification_type='workflow_completed',
                    title=f"Workflow concluído: {task.title}",
                    message=f"O workflow da tarefa '{task.title}' foi concluído com sucesso por {completed_by.username}.",
                    priority='normal',
                    created_by=completed_by
                )
                if notification:
                    notifications.append(notification)
        
        return notifications
    
    @staticmethod
    def notify_deadline_approaching(task, days_remaining):
        """
        Notifica sobre prazo próximo.
        `days_remaining` pode ser 0 para "hoje", 1 para "amanhã", etc.
        """
        if not task.deadline:
            return []
        
        notifications = []
        users_to_notify_set = set()
        
        if task.assigned_to and task.assigned_to.is_active:
            users_to_notify_set.add(task.assigned_to)
        
        if task.current_workflow_step and task.current_workflow_step.assign_to and task.current_workflow_step.assign_to.is_active:
            users_to_notify_set.add(task.current_workflow_step.assign_to)
        
        if task.created_by and task.created_by.is_active and task.created_by not in users_to_notify_set:
             users_to_notify_set.add(task.created_by)

        if not users_to_notify_set:
            logger.warning(f"Nenhum usuário ativo para notificar sobre deadline da tarefa {task.id}")
            return []

        for user in users_to_notify_set:
            deadline_str = task.deadline.strftime('%d/%m/%Y')
            if days_remaining == 0:
                message = f"A tarefa '{task.title}' vence HOJE ({deadline_str})."
                priority_level = 'urgent'
            elif days_remaining == 1:
                message = f"A tarefa '{task.title}' vence AMANHÃ ({deadline_str})."
                priority_level = 'high'
            else:
                message = f"A tarefa '{task.title}' vence em {days_remaining} dias ({deadline_str})."
                priority_level = 'normal'

            notification = NotificationService.create_notification(
                user=user,
                task=task,
                workflow_step=task.current_workflow_step,
                notification_type='deadline_approaching',
                title=f"Prazo próximo: {task.title}",
                message=message,
                priority=priority_level,
                metadata={'days_remaining': days_remaining, 'deadline': deadline_str},
                check_existing_recent=True, 
                recent_threshold_hours=23 
            )
            if notification:
                notifications.append(notification)
        
        return notifications
    
    @staticmethod
    def notify_step_overdue(task, workflow_step, days_overdue=None):
        """
        Notifica sobre passo atrasado.
        `days_overdue` é opcional, se não fornecido, uma mensagem genérica é usada.
        """
        notifications = []
        
        users_to_notify_set = set()
        responsible_user = None

        if workflow_step.assign_to and workflow_step.assign_to.is_active:
            responsible_user = workflow_step.assign_to
            users_to_notify_set.add(responsible_user)
        elif task.assigned_to and task.assigned_to.is_active: 
            responsible_user = task.assigned_to
            users_to_notify_set.add(responsible_user)

        if not responsible_user:
            logger.warning(f"Passo {workflow_step.name} da tarefa {task.id} não tem responsável ativo. Notificação de atraso não enviada ao responsável direto.")
        
        if task.created_by and task.created_by.is_active and task.created_by != responsible_user:
            users_to_notify_set.add(task.created_by)
        if task.client and task.client.account_manager and task.client.account_manager.is_active and task.client.account_manager != responsible_user:
             # Ensure account_manager is not already in the set (implicitly handled by set)
            if task.client.account_manager not in users_to_notify_set:
                 users_to_notify_set.add(task.client.account_manager)
        
        if not users_to_notify_set:
            logger.warning(f"Nenhum usuário ativo para notificar sobre atraso do passo {workflow_step.name} da tarefa {task.id}")
            return []

        for user_to_notify in users_to_notify_set:
            is_direct_responsible = (user_to_notify == responsible_user)
            
            title = f"Passo atrasado: {workflow_step.name}"
            if days_overdue is not None:
                message = f"O passo '{workflow_step.name}' da tarefa '{task.title}' está {days_overdue} dia(s) atrasado."
            else:
                message = f"O passo '{workflow_step.name}' da tarefa '{task.title}' está atrasado."
            
            if not is_direct_responsible and responsible_user:
                message += f" (Responsável: {responsible_user.username})."

            notification = NotificationService.create_notification(
                user=user_to_notify,
                task=task,
                workflow_step=workflow_step,
                notification_type='step_overdue',
                title=title,
                message=message,
                priority='urgent' if is_direct_responsible else 'high',
                metadata={'days_overdue': days_overdue} if days_overdue is not None else {},
                check_existing_recent=True,
                recent_threshold_hours=24 * 2 
            )
            if notification:
                notifications.append(notification)
        
        return notifications
    
    @staticmethod
    def create_manual_reminder(task, target_users, title, message, created_by, priority='normal', scheduled_for=None):
        """
        Cria lembrete manual
        """
        notifications = []
        
        for user in target_users:
            if not user.is_active:
                logger.info(f"Usuário {user.username} está inativo, lembrete manual não enviado.")
                continue

            notification = NotificationService.create_notification(
                user=user,
                task=task,
                workflow_step=task.current_workflow_step,
                notification_type='manual_reminder',
                title=title,
                message=message,
                priority=priority,
                created_by=created_by,
                scheduled_for=scheduled_for,
                metadata={'is_manual': True}
            )
            if notification:
                notifications.append(notification)
        
        return notifications
    
    @staticmethod
    def get_unread_count(user):
        """
        Retorna contagem de notificações não lidas para um usuário
        """
        return WorkflowNotification.objects.filter(
            user=user,
            is_read=False,
            is_archived=False
        ).count()
    
    @staticmethod
    def mark_all_as_read(user):
        """
        Marca todas as notificações de um usuário como lidas
        """
        return WorkflowNotification.objects.filter(
            user=user,
            is_read=False,
            is_archived=False 
        ).update(
            is_read=True,
            read_at=timezone.now()
        )

    @staticmethod
    def notify_workflow_assigned(task: Task, assigned_by: User):
        """Notifica o responsável pela tarefa (ou pelo primeiro passo) que um workflow foi atribuído."""
        target_user = None
        first_step = None

        if task.workflow:
            first_step = task.workflow.steps.order_by('order').first()
            if first_step and first_step.assign_to and first_step.assign_to.is_active:
                target_user = first_step.assign_to
            elif task.assigned_to and task.assigned_to.is_active:
                target_user = task.assigned_to
            elif task.created_by and task.created_by.is_active: 
                target_user = task.created_by

        if target_user:
            NotificationService.create_notification(
                user=target_user,
                task=task,
                workflow_step=first_step, 
                notification_type='workflow_assigned',
                title=f"Novo Workflow: {task.title}",
                message=f"O workflow '{task.workflow.name}' foi atribuído à tarefa '{task.title}' por {assigned_by.username}." +
                        (f" O primeiro passo '{first_step.name}' está pronto para si." if first_step else " Verifique a tarefa."),
                priority='normal',
                created_by=assigned_by,
                check_existing_recent=True,
                recent_threshold_hours=1 
            )
            return True
        logger.warning(f"Não foi possível determinar o usuário alvo para notificação de atribuição de workflow para tarefa {task.id}")
        return False

    @staticmethod
    def notify_step_rejected(task: Task, workflow_step: WorkflowStep, rejected_by: User, comment: str):
        """Notifica os envolvidos que um passo foi rejeitado."""
        notifications = []
        
        users_to_notify_set = set()
        
        if workflow_step.assign_to and workflow_step.assign_to.is_active:
            users_to_notify_set.add(workflow_step.assign_to)
        
        if task.assigned_to and task.assigned_to.is_active:
            users_to_notify_set.add(task.assigned_to)
            
        if task.created_by and task.created_by.is_active:
            users_to_notify_set.add(task.created_by)

        for user_to_notify in users_to_notify_set:
            if user_to_notify == rejected_by:
                continue

            notification = NotificationService.create_notification(
                user=user_to_notify,
                task=task,
                workflow_step=workflow_step,
                notification_type='step_rejected',
                title=f"Passo Rejeitado: {workflow_step.name}",
                message=f"O passo '{workflow_step.name}' da tarefa '{task.title}' foi REJEITADO por {rejected_by.username}. " +
                        f"Comentário: {comment or 'Nenhum comentário fornecido.'}",
                priority='high',
                created_by=rejected_by
            )
            if notification:
                notifications.append(notification)
        return notifications
# management/commands/setup_notification_templates.py

from django.core.management.base import BaseCommand
from ...models import Organization, NotificationTemplate
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Configura templates padrão de notificação para todas as organizações'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--organization',
            type=str,
            help='ID da organização específica (opcional)'
        )
        
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Sobrescrever templates existentes'
        )
    
    def handle(self, *args, **options):
        org_id = options['organization']
        overwrite = options['overwrite']
        
        if org_id:
            try:
                organizations = [Organization.objects.get(id=org_id)]
            except Organization.DoesNotExist:
                self.stderr.write(f'Organização {org_id} não encontrada')
                return
        else:
            organizations = Organization.objects.filter(is_active=True)
        
        total_created = 0
        
        for organization in organizations:
            created_count = self.setup_templates_for_org(organization, overwrite)
            total_created += created_count
            
            self.stdout.write(
                f'✅ {organization.name}: {created_count} templates criados/atualizados'
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎉 Configuração concluída: {total_created} templates no total'
            )
        )
    
    def setup_templates_for_org(self, organization, overwrite):
        """Configura templates para uma organização"""
        templates_data = [
            {
                'notification_type': 'step_ready',
                'name': 'Passo Pronto - Padrão',
                'title_template': '🔔 Passo pronto: {step_name}',
                'message_template': '''Olá {user_first_name},

A tarefa "{task_title}" (Cliente: {client_name}) chegou ao passo "{step_name}" e está pronta para ser trabalhada.

📋 Workflow: {workflow_name}
📅 Data: {current_date}
🏢 Organização: {organization_name}

Por favor, acesse o sistema para dar continuidade.''',
                'default_priority': 'normal',
                'is_default': True,
                'available_variables': [
                    'user_name', 'user_first_name', 'task_title', 'client_name',
                    'step_name', 'workflow_name', 'organization_name', 'current_date', 'current_time'
                ]
            },
            {
                'notification_type': 'approval_needed',
                'name': 'Aprovação Necessária - Padrão',
                'title_template': '⚠️ Aprovação necessária: {step_name}',
                'message_template': '''Caro {user_first_name},

O passo "{step_name}" da tarefa "{task_title}" (Cliente: {client_name}) precisa de sua aprovação.

📋 Workflow: {workflow_name}
⏰ Solicitado em: {current_date} às {current_time}

Por favor, revise e aprove o mais breve possível para não atrasar o processo.''',
                'default_priority': 'high',
                'is_default': True,
                'available_variables': [
                    'user_name', 'user_first_name', 'task_title', 'client_name',
                    'step_name', 'workflow_name', 'organization_name', 'current_date', 'current_time'
                ]
            },
            {
                'notification_type': 'step_overdue',
                'name': 'Passo Atrasado - Padrão',
                'title_template': '🚨 URGENTE: Passo atrasado - {step_name}',
                'message_template': '''ATENÇÃO {user_first_name},

O passo "{step_name}" da tarefa "{task_title}" (Cliente: {client_name}) está ATRASADO.

📋 Workflow: {workflow_name}
⚠️ Esta atividade precisa ser priorizada para evitar impactos no cronograma.

Por favor, tome as medidas necessárias imediatamente.''',
                'default_priority': 'urgent',
                'is_default': True,
                'available_variables': [
                    'user_name', 'user_first_name', 'task_title', 'client_name',
                    'step_name', 'workflow_name', 'organization_name', 'current_date', 'current_time'
                ]
            },
            {
                'notification_type': 'deadline_approaching',
                'name': 'Prazo Próximo - Padrão',
                'title_template': '⏰ Prazo próximo: {task_title}',
                'message_template': '''Olá {user_first_name},

A tarefa "{task_title}" (Cliente: {client_name}) tem prazo próximo.

📅 Verifique os detalhes no sistema para garantir que tudo seja concluído a tempo.

Workflow atual: {workflow_name}''',
                'default_priority': 'high',
                'is_default': True,
                'available_variables': [
                    'user_name', 'user_first_name', 'task_title', 'client_name',
                    'workflow_name', 'organization_name', 'current_date', 'current_time'
                ]
            },
            {
                'notification_type': 'workflow_completed',
                'name': 'Workflow Concluído - Padrão',
                'title_template': '✅ Workflow concluído: {task_title}',
                'message_template': '''Parabéns {user_first_name},

O workflow da tarefa "{task_title}" (Cliente: {client_name}) foi concluído com sucesso!

📋 Workflow: {workflow_name}
✅ Finalizado em: {current_date}

Obrigado pela dedicação e qualidade do trabalho realizado.''',
                'default_priority': 'normal',
                'is_default': True,
                'available_variables': [
                    'user_name', 'user_first_name', 'task_title', 'client_name',
                    'workflow_name', 'organization_name', 'current_date', 'current_time'
                ]
            },
        ]
        
        created_count = 0
        admin_user = User.objects.filter(is_superuser=True).first()
        
        for template_data in templates_data:
            # Verificar se já existe
            existing = NotificationTemplate.objects.filter(
                organization=organization,
                notification_type=template_data['notification_type'],
                is_default=True
            ).first()
            
            if existing and not overwrite:
                continue
            
            if existing and overwrite:
                # Atualizar existente
                for key, value in template_data.items():
                    if key != 'notification_type':  # Não mudar o tipo
                        setattr(existing, key, value)
                existing.save()
                created_count += 1
            else:
                # Criar novo
                NotificationTemplate.objects.create(
                    organization=organization,
                    created_by=admin_user,
                    **template_data
                )
                created_count += 1
        
        return created_count
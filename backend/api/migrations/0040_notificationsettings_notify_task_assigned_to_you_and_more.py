# Generated by Django 4.2.21 on 2025-06-18 22:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0039_task_collaborators_alter_task_assigned_to'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificationsettings',
            name='notify_task_assigned_to_you',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='notificationtemplate',
            name='notification_type',
            field=models.CharField(choices=[('step_assigned', 'Passo Atribuído'), ('step_ready', 'Passo Pronto para Execução'), ('step_completed', 'Passo Concluído'), ('approval_needed', 'Aprovação Necessária'), ('approval_completed', 'Aprovação Concluída'), ('task_completed', 'Tarefa Concluída'), ('task_assigned_to_you', 'Nova Tarefa Atribuída a Si'), ('deadline_approaching', 'Prazo Próximo'), ('step_overdue', 'Passo Atrasado'), ('manual_reminder', 'Lembrete Manual'), ('workflow_assigned', 'Workflow Atribuído'), ('step_rejected', 'Passo Rejeitado'), ('manual_advance_needed', 'Avanço Manual Necessário')], max_length=50, verbose_name='Tipo de Notificação'),
        ),
        migrations.AlterField(
            model_name='workflownotification',
            name='notification_type',
            field=models.CharField(choices=[('step_assigned', 'Passo Atribuído'), ('step_ready', 'Passo Pronto para Execução'), ('step_completed', 'Passo Concluído'), ('approval_needed', 'Aprovação Necessária'), ('approval_completed', 'Aprovação Concluída'), ('task_completed', 'Tarefa Concluída'), ('task_assigned_to_you', 'Nova Tarefa Atribuída a Si'), ('deadline_approaching', 'Prazo Próximo'), ('step_overdue', 'Passo Atrasado'), ('manual_reminder', 'Lembrete Manual'), ('workflow_assigned', 'Workflow Atribuído'), ('step_rejected', 'Passo Rejeitado'), ('manual_advance_needed', 'Avanço Manual Necessário')], max_length=50, verbose_name='Tipo de Notificação'),
        ),
    ]

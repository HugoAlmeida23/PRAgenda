# Generated by Django 4.2.21 on 2025-06-04 17:56

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0023_notificationsettings'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationDigest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('digest_type', models.CharField(choices=[('hourly', 'Hourly'), ('daily', 'Daily'), ('weekly', 'Weekly')], max_length=20)),
                ('period_start', models.DateTimeField()),
                ('period_end', models.DateTimeField()),
                ('is_sent', models.BooleanField(default=False)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('title', models.CharField(max_length=200)),
                ('content', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('notifications', models.ManyToManyField(related_name='digests', to='api.workflownotification')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notification_digests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Digest de Notificação',
                'verbose_name_plural': 'Digests de Notificação',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='NotificationTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('step_assigned', 'Passo Atribuído'), ('step_ready', 'Passo Pronto para Execução'), ('step_completed', 'Passo Concluído'), ('approval_needed', 'Aprovação Necessária'), ('approval_completed', 'Aprovação Concluída'), ('workflow_completed', 'Workflow Concluído'), ('deadline_approaching', 'Prazo Próximo'), ('step_overdue', 'Passo Atrasado'), ('manual_reminder', 'Lembrete Manual'), ('workflow_assigned', 'Workflow Atribuído'), ('step_rejected', 'Passo Rejeitado')], max_length=50, verbose_name='Tipo de Notificação')),
                ('name', models.CharField(max_length=100, verbose_name='Nome do Template')),
                ('title_template', models.CharField(help_text='Use variáveis como {task_title}, {client_name}, {user_name}, {step_name}', max_length=200)),
                ('message_template', models.TextField(help_text='Template da mensagem com variáveis substituíveis')),
                ('default_priority', models.CharField(choices=[('low', 'Baixa'), ('normal', 'Normal'), ('high', 'Alta'), ('urgent', 'Urgente')], default='normal', max_length=10)),
                ('is_active', models.BooleanField(default=True)),
                ('is_default', models.BooleanField(default=False, help_text='Template padrão para este tipo de notificação')),
                ('available_variables', models.JSONField(default=list, help_text='Lista de variáveis disponíveis neste template')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_templates', to=settings.AUTH_USER_MODEL)),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notification_templates', to='api.organization', verbose_name='Organização')),
            ],
            options={
                'verbose_name': 'Template de Notificação',
                'verbose_name_plural': 'Templates de Notificação',
                'ordering': ['notification_type', 'name'],
                'unique_together': {('organization', 'notification_type', 'is_default')},
            },
        ),
    ]

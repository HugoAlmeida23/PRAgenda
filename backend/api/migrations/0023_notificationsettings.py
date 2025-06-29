# Generated by Django 4.2.21 on 2025-06-04 17:30

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0022_workflownotification_created_by_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email_notifications_enabled', models.BooleanField(default=True)),
                ('push_notifications_enabled', models.BooleanField(default=True)),
                ('notify_step_ready', models.BooleanField(default=True)),
                ('notify_step_completed', models.BooleanField(default=True)),
                ('notify_approval_needed', models.BooleanField(default=True)),
                ('notify_approval_completed', models.BooleanField(default=True)),
                ('notify_workflow_completed', models.BooleanField(default=True)),
                ('notify_deadline_approaching', models.BooleanField(default=True)),
                ('notify_step_overdue', models.BooleanField(default=True)),
                ('notify_workflow_assigned', models.BooleanField(default=True)),
                ('notify_step_rejected', models.BooleanField(default=True)),
                ('notify_manual_reminders', models.BooleanField(default=True)),
                ('digest_frequency', models.CharField(choices=[('immediate', 'Imediato'), ('hourly', 'A cada hora'), ('daily', 'Diário'), ('weekly', 'Semanal')], default='immediate', max_length=20)),
                ('digest_time', models.TimeField(default='09:00')),
                ('deadline_days_notice', models.JSONField(default=list, help_text='Lista de dias antes do deadline para notificar [3, 1, 0]')),
                ('overdue_threshold_days', models.PositiveIntegerField(default=5)),
                ('approval_reminder_days', models.PositiveIntegerField(default=2)),
                ('quiet_start_time', models.TimeField(blank=True, null=True)),
                ('quiet_end_time', models.TimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='notification_settings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Configurações de Notificação',
                'verbose_name_plural': 'Configurações de Notificações',
            },
        ),
    ]

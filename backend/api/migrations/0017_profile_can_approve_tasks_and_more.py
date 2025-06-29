# Generated by Django 4.2.20 on 2025-05-15 21:45

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_profile_invitation_code'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='can_approve_tasks',
            field=models.BooleanField(default=False, verbose_name='Pode Aprovar Etapas de Tarefas'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_assign_workflows',
            field=models.BooleanField(default=False, verbose_name='Pode Atribuir Workflows'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_change_client_status',
            field=models.BooleanField(default=False, verbose_name='Pode Ativar/Desativar Clientes'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_create_clients',
            field=models.BooleanField(default=False, verbose_name='Pode Criar Clientes'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_create_custom_reports',
            field=models.BooleanField(default=False, verbose_name='Pode Criar Relatórios Personalizados'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_create_tasks',
            field=models.BooleanField(default=False, verbose_name='Pode Criar Tarefas'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_create_workflows',
            field=models.BooleanField(default=False, verbose_name='Pode Criar Workflows'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_delete_clients',
            field=models.BooleanField(default=False, verbose_name='Pode Excluir Clientes'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_delete_tasks',
            field=models.BooleanField(default=False, verbose_name='Pode Excluir Tarefas'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_edit_all_tasks',
            field=models.BooleanField(default=False, verbose_name='Pode Editar Qualquer Tarefa'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_edit_all_time',
            field=models.BooleanField(default=False, verbose_name='Pode Editar Tempo de Qualquer Pessoa'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_edit_assigned_tasks',
            field=models.BooleanField(default=False, verbose_name='Pode Editar Tarefas Atribuídas'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_edit_client_fees',
            field=models.BooleanField(default=False, verbose_name='Pode Alterar Taxas de Clientes'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_edit_clients',
            field=models.BooleanField(default=False, verbose_name='Pode Editar Clientes'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_edit_own_time',
            field=models.BooleanField(default=True, verbose_name='Pode Editar Próprio Tempo'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_edit_workflows',
            field=models.BooleanField(default=False, verbose_name='Pode Editar Workflows'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_export_reports',
            field=models.BooleanField(default=False, verbose_name='Pode Exportar Relatórios'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_log_time',
            field=models.BooleanField(default=True, verbose_name='Pode Registrar Tempo'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_manage_expenses',
            field=models.BooleanField(default=False, verbose_name='Pode Gerenciar Despesas'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_schedule_reports',
            field=models.BooleanField(default=False, verbose_name='Pode Agendar Relatórios'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_view_all_tasks',
            field=models.BooleanField(default=False, verbose_name='Pode Ver Todas as Tarefas'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_view_client_fees',
            field=models.BooleanField(default=False, verbose_name='Pode Ver Taxas de Clientes'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_view_organization_profitability',
            field=models.BooleanField(default=False, verbose_name='Pode Ver Rentabilidade da Organização'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_view_team_profitability',
            field=models.BooleanField(default=False, verbose_name='Pode Ver Rentabilidade da Equipe'),
        ),
        migrations.AddField(
            model_name='profile',
            name='can_view_team_time',
            field=models.BooleanField(default=False, verbose_name='Pode Ver Registros de Tempo da Equipe'),
        ),
    ]

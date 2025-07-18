# Generated by Django 4.2.21 on 2025-06-26 16:50

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0047_remove_workflownotification_api_workflo_user_id_c4fe5d_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='SAFTFile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('file', models.FileField(upload_to='saft_files/%Y/%m/', verbose_name='Ficheiro SAFT')),
                ('original_filename', models.CharField(max_length=255, verbose_name='Nome Original do Ficheiro')),
                ('status', models.CharField(choices=[('PENDING', 'Pendente para Processamento'), ('PROCESSING', 'A Processar'), ('COMPLETED', 'Concluído com Sucesso'), ('ERROR', 'Erro no Processamento')], db_index=True, default='PENDING', max_length=20)),
                ('processing_log', models.TextField(blank=True, help_text='Registos ou erros do processo de parsing.', null=True)),
                ('fiscal_year', models.IntegerField(blank=True, null=True, verbose_name='Ano Fiscal')),
                ('start_date', models.DateField(blank=True, null=True, verbose_name='Data de Início')),
                ('end_date', models.DateField(blank=True, null=True, verbose_name='Data de Fim')),
                ('company_name', models.CharField(blank=True, max_length=255, null=True, verbose_name='Nome da Empresa')),
                ('company_tax_id', models.CharField(blank=True, max_length=50, null=True, verbose_name='NIF da Empresa')),
                ('summary_data', models.JSONField(blank=True, default=dict, help_text='Sumário de dados extraídos, como totais de faturação, impostos, etc.')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True, verbose_name='Data de Upload')),
                ('processed_at', models.DateTimeField(blank=True, null=True, verbose_name='Data de Processamento')),
                ('organization', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='saft_files', to='api.organization', verbose_name='Organização')),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='saft_uploads', to=settings.AUTH_USER_MODEL, verbose_name='Enviado por')),
            ],
            options={
                'verbose_name': 'Ficheiro SAFT-PT',
                'verbose_name_plural': 'Ficheiros SAFT-PT',
                'ordering': ['-uploaded_at'],
            },
        ),
    ]

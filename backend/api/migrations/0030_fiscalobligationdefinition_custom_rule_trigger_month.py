# Generated by Django 4.2.21 on 2025-06-14 13:39

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0029_remove_workflowstep_next_steps_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='fiscalobligationdefinition',
            name='custom_rule_trigger_month',
            field=models.PositiveIntegerField(blank=True, choices=[(1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5'), (6, '6'), (7, '7'), (8, '8'), (9, '9'), (10, '10'), (11, '11'), (12, '12')], help_text="Se Periodicidade='Outra', define o mês em que esta obrigação deve ser considerada para geração. Ex: IRS (junho), IRC (maio), IES (julho).", null=True, verbose_name='Mês de Gatilho para Regra Customizada (1-12)'),
        ),
    ]

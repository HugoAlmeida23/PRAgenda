# Generated by Django 4.2.21 on 2025-06-29 22:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0055_client_compliance_risks'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='revenue_opportunities',
            field=models.JSONField(blank=True, default=list, help_text='List of identified revenue opportunities.'),
        ),
    ]

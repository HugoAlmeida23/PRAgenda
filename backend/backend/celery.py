import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seu_projeto.settings')

app = Celery('seu_projeto')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Carregar tasks de todas as apps Django
app.autodiscover_tasks()

# Configurar tarefas agendadas do sistema fiscal
app.conf.beat_schedule = {
    # Geração automática diária às 08:00
    'generate-fiscal-obligations-daily': {
        'task': 'api.tasks.generate_fiscal_obligations_task',  # Ajustar caminho
        'schedule': crontab(hour=8, minute=0),
        'options': {'expires': 3600},
        'kwargs': {'months_ahead': 3},
    },
    
    # Limpeza semanal às 02:00 de segunda
    'clean-old-fiscal-obligations': {
        'task': 'api.tasks.clean_old_fiscal_obligations_task',  # Ajustar caminho
        'schedule': crontab(hour=2, minute=0, day_of_week=1),
        'options': {'expires': 1800},
        'kwargs': {'days_old': 30},
    },
    
    # Verificação de deadlines diária às 07:00
    'check-fiscal-deadlines': {
        'task': 'api.tasks.check_fiscal_deadlines_task',  # Ajustar caminho
        'schedule': crontab(hour=7, minute=0),
        'options': {'expires': 1800},
    },
    
    # Relatório semanal às 17:00 de sexta
    'weekly-fiscal-report': {
        'task': 'api.tasks.generate_weekly_fiscal_report_task',  # Ajustar caminho
        'schedule': crontab(hour=17, minute=0, day_of_week=5),
        'options': {'expires': 3600},
    }
}

app.conf.timezone = 'Europe/Lisbon'
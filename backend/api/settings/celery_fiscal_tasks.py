"""
Configuração das tarefas automáticas do sistema fiscal.
Para ser usado com Celery Beat para agendamento.
"""

from celery.schedules import crontab

# Configurações do Celery Beat para tarefas fiscais
CELERY_BEAT_SCHEDULE_FISCAL = {
    # Geração automática diária às 08:00
    'generate-fiscal-obligations-daily': {
        'task': 'fiscal.tasks.generate_fiscal_obligations_task',
        'schedule': crontab(hour=8, minute=0),  # Diariamente às 08:00
        'options': {
            'expires': 3600,  # Expira em 1 hora se não executar
        },
        'kwargs': {
            'months_ahead': 3,
        }
    },
    
    # Limpeza de obrigações obsoletas (semanal)
    'clean-old-fiscal-obligations': {
        'task': 'fiscal.tasks.clean_old_fiscal_obligations_task',
        'schedule': crontab(hour=2, minute=0, day_of_week=1),  # Segundas às 02:00
        'options': {
            'expires': 1800,  # Expira em 30 minutos
        },
        'kwargs': {
            'days_old': 30,
        }
    },
    
    # Verificação de deadlines (diário às 07:00)
    'check-fiscal-deadlines': {
        'task': 'fiscal.tasks.check_fiscal_deadlines_task',
        'schedule': crontab(hour=7, minute=0),
        'options': {
            'expires': 1800,
        }
    },
    
    # Relatório semanal de obrigações (sextas às 17:00)
    'weekly-fiscal-report': {
        'task': 'fiscal.tasks.generate_weekly_fiscal_report_task',
        'schedule': crontab(hour=17, minute=0, day_of_week=5),  # Sextas às 17:00
        'options': {
            'expires': 3600,
        }
    }
}
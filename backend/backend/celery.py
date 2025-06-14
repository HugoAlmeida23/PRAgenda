# backend/celery.py
import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module for the 'celery' program.
# Ensure 'backend.settings' matches your project's settings file location.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('backend') # Use your project name

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django app configs.
app.autodiscover_tasks() # This will find tasks.py in your 'api' app

# Celery Beat Schedule
app.conf.beat_schedule = {
    # === Fiscal System Tasks ===
    'generate-fiscal-obligations-daily': {
        'task': 'api.tasks.generate_fiscal_obligations_task', # Correct path
        'schedule': crontab(hour=8, minute=0), 
        'options': {'expires': 3600},
        'kwargs': {'months_ahead': 3}
    },
    'clean-old-fiscal-obligations-weekly': {
        'task': 'api.tasks.clean_old_fiscal_obligations_task', # Correct path
        'schedule': crontab(hour=2, minute=0, day_of_week=1), 
        'options': {'expires': 1800},
        'kwargs': {'days_old': 30}
    },
    'check-fiscal-system-deadlines-daily': { # Fiscal system specific deadlines
        'task': 'api.tasks.check_fiscal_deadlines_task', # Correct path
        'schedule': crontab(hour=7, minute=15), # Slightly different time
        'options': {'expires': 1800},
    },
    'generate-weekly-fiscal-report': {
        'task': 'api.tasks.generate_weekly_fiscal_report_task', # Correct path
        'schedule': crontab(hour=17, minute=0, day_of_week=5), 
        'options': {'expires': 3600},
    },  
    # Client Profitability
    'update-client-profitability-nightly': {
        'task': 'api.tasks.update_client_profitability_globally_task',
        'schedule': crontab(hour=2, minute=0), 
    },

    # === General Notification & Maintenance Tasks ===
    'check-upcoming-task-deadlines-daily': {
        'task': 'api.tasks.check_upcoming_deadlines_and_notify_task',
        'schedule': crontab(hour=6, minute=0), 
        'options': {'expires': 3600}, 
    },
    'check-overdue-workflow-steps-daily': {
        'task': 'api.tasks.check_overdue_steps_and_notify_task',
        'schedule': crontab(hour=6, minute=30), 
        'options': {'expires': 3600},
        'kwargs': {'default_overdue_threshold_days': 3} 
    },
    'check-pending-task-approvals-daily': {
        'task': 'api.tasks.check_pending_approvals_and_remind_task',
        'schedule': crontab(hour=7, minute=0), 
        'options': {'expires': 3600},
        'kwargs': {'default_reminder_threshold_days': 2} 
    },
    'notification-maintenance-cleanup-daily': {
        'task': 'api.tasks.notification_cleanup_task',
        'schedule': crontab(hour=3, minute=0), 
        'kwargs': {'days': 90}
    },
    'notification-maintenance-generate-digests-daily': {
        'task': 'api.tasks.notification_generate_digests_task',
        'schedule': crontab(hour=4, minute=0), 
    },
    'notification-maintenance-send-digests-hourly': { 
        'task': 'api.tasks.notification_send_digests_task',
        'schedule': crontab(minute=0), # Every hour at minute 0
    },
    'notification-maintenance-escalate-hourly': { 
        'task': 'api.tasks.notification_escalate_task',
        'schedule': crontab(minute=30), # Every hour at minute 30
    },
}

app.conf.timezone = 'Europe/Lisbon' # Or your project's timezone

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
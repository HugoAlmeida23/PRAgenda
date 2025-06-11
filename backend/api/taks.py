from .tasks.fiscal_tasks import (
    generate_fiscal_obligations_task,
    clean_old_fiscal_obligations_task,
    check_fiscal_deadlines_task,
    generate_weekly_fiscal_report_task,
    generate_fiscal_obligations_for_organization_task
)

# Re-exportar as tasks para uso do Celery
__all__ = [
    'generate_fiscal_obligations_task',
    'clean_old_fiscal_obligations_task', 
    'check_fiscal_deadlines_task',
    'generate_weekly_fiscal_report_task',
    'generate_fiscal_obligations_for_organization_task'
]
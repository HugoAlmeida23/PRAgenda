# api/services/workflow_analytics_service.py (NEW FILE)
from ..models import WorkflowDefinition, WorkflowStep, WorkflowHistory
from django.db.models import Avg, F, ExpressionWrapper, DurationField

class WorkflowAnalyticsService:
    @staticmethod
    def analyze_workflow(workflow_def: WorkflowDefinition) -> dict:
        """Analyzes a workflow and its steps to find bottlenecks and suggestions."""
        analysis = {'suggestions': [], 'bottlenecks': []}
        steps = workflow_def.steps.all().order_by('order')
        
        if not steps:
            return analysis

        # Calculate average time for each step
        for step in steps:
            duration_data = WorkflowHistory.objects.filter(
                from_step=step,
                action='step_advanced' # Only consider when it advanced to next
            ).annotate(
                duration=ExpressionWrapper(F('created_at') - F('task__workflow_history__created_at'), output_field=DurationField()) # Simplified, needs better logic
            ).aggregate(avg_duration=Avg('duration'))
            
            avg_minutes = duration_data['avg_duration'].total_seconds() / 60 if duration_data['avg_duration'] else 0
            step.avg_completion_minutes = avg_minutes
            step.save(update_fields=['avg_completion_minutes'])

        # Identify bottlenecks (steps taking much longer than the average)
        all_step_times = [s.avg_completion_minutes for s in steps if s.avg_completion_minutes is not None and s.avg_completion_minutes > 0]
        if not all_step_times: return analysis

        overall_avg = sum(all_step_times) / len(all_step_times)
        for step in steps:
            if step.avg_completion_minutes and step.avg_completion_minutes > (overall_avg * 1.5): # If 50% above average
                analysis['bottlenecks'].append({
                    'step_id': str(step.id),
                    'step_name': step.name,
                    'avg_time': step.avg_completion_minutes,
                    'overall_avg': overall_avg
                })
        
        # Add a simple suggestion
        if analysis['bottlenecks']:
             analysis['suggestions'].append("Considere dividir os passos identificados como gargalos em etapas menores ou alocar mais recursos.")

        return analysis
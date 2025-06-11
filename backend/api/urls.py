# urls.py - Versão atualizada com novos endpoints

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'clients', views.ClientViewSet, basename='client')
router.register(r'task-categories', views.TaskCategoryViewSet, basename='taskcategory')
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'time-entries', views.TimeEntryViewSet, basename='time-entry')
router.register(r'expenses', views.ExpenseViewSet, basename='expense')
router.register(r'client-profitability', views.ClientProfitabilityViewSet, basename='client-profitability')
router.register(r'nlp-processor', views.NLPProcessorViewSet, basename='nlp-processor')
router.register(r'auto-time-tracking', views.AutoTimeTrackingViewSet, basename='auto-time-tracking')
router.register(r'workflow-definitions', views.WorkflowDefinitionViewSet, basename='workflow-definition')
router.register(r'workflow-steps', views.WorkflowStepViewSet, basename='workflow-step')
router.register(r'task-approvals', views.TaskApprovalViewSet, basename='task-approval')
router.register(r'organizations', views.OrganizationViewSet, basename='organization')
router.register(r'gemini-nlp', views.GeminiNLPViewSet, basename='gemini-nlp')
router.register(r'workflow-notifications', views.WorkflowNotificationViewSet, basename='workflow-notification')
router.register(r'workflow-history', views.WorkflowHistoryViewSet, basename='workflow-history')
router.register(r'workflow-step-details', views.WorkflowStepDetailViewSet, basename='workflow-step-detail')

# NOVOS: Sistema completo de notificações
router.register(r'notification-settings', views.NotificationSettingsViewSet, basename='notification-settings')
router.register(r'notification-templates', views.NotificationTemplateViewSet, basename='notification-templates')
router.register(r'notification-digests', views.NotificationDigestViewSet, basename='notification-digests')
router.register(r'fiscal-obligation-definitions', views.FiscalObligationDefinitionViewSet, basename='fiscal-obligation-definition')
router.register(r'fiscal-system-settings', views.FiscalSystemSettingsViewSet, basename='fiscal-system-settings')


urlpatterns = [
    # Autenticação
    path("register/", views.CreateUserView.as_view(), name="register"),
    
    # Router principal
    path('', include(router.urls)),
    
    # Dashboard e relatórios
    path('dashboard-summary/', views.dashboard_summary, name='dashboard-summary'),
    path('update-profitability/', views.update_organization_profitability, name='update-profitability'),
    
    # Sistema de verificações automáticas
    path('system/check-deadlines/', views.check_deadlines_and_notify_view, name='check-deadlines'),
    path('system/check-overdue-steps/', views.check_overdue_steps_and_notify_view, name='check-overdue-steps'),
    path('system/check-pending-approvals/', views.check_pending_approvals_and_notify_view, name='check-pending-approvals'),
    
    # NOVOS: Endpoints completos do sistema de notificações
    path('notifications/stats/', views.notification_stats, name='notification-stats'),
    path('notifications/organization-stats/', views.organization_notification_stats, name='organization-notification-stats'),
    path('notifications/workflow-performance/', views.workflow_notification_performance, name='workflow-notification-performance'),
    
    # NOVOS: Relatórios e escalação
    path('reports/notifications/', views.notification_reports, name='notification-reports'),
    path('reports/workflow-efficiency/', views.workflow_efficiency_report, name='workflow-efficiency-report'),
    path('system/trigger-escalation/', views.trigger_escalation_check, name='trigger-escalation'),
    
    # NOVOS: Gestão de digests
    path('system/generate-daily-digests/', views.generate_daily_digests_view, name='generate-daily-digests'),
    path('system/send-pending-digests/', views.send_pending_digests_view, name='send-pending-digests'),
]
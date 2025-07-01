# In api/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

router = DefaultRouter()
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'clients', views.ClientViewSet, basename='client')
router.register(r'task-categories', views.TaskCategoryViewSet, basename='taskcategory')
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'time-entries', views.TimeEntryViewSet, basename='time-entry')
router.register(r'expenses', views.ExpenseViewSet, basename='expense')
router.register(r'client-profitability', views.ClientProfitabilityViewSet, basename='client-profitability')
router.register(r'auto-time-tracking', views.AutoTimeTrackingViewSet, basename='auto-time-tracking')
router.register(r'workflow-definitions', views.WorkflowDefinitionViewSet, basename='workflow-definition')
router.register(r'workflow-steps', views.WorkflowStepViewSet, basename='workflow-step')
router.register(r'task-approvals', views.TaskApprovalViewSet, basename='task-approval')
router.register(r'organizations', views.OrganizationViewSet, basename='organization')
router.register(r'workflow-notifications', views.WorkflowNotificationViewSet, basename='workflow-notification')
router.register(r'workflow-history', views.WorkflowHistoryViewSet, basename='workflow-history')
router.register(r'workflow-step-details', views.WorkflowStepDetailViewSet, basename='workflow-step-detail')

# NOVOS: Sistema completo de notificações
router.register(r'notification-settings', views.NotificationSettingsViewSet, basename='notification-settings')
router.register(r'notification-templates', views.NotificationTemplateViewSet, basename='notification-templates')
router.register(r'notification-digests', views.NotificationDigestViewSet, basename='notification-digests')
router.register(r'fiscal-obligation-definitions', views.FiscalObligationDefinitionViewSet, basename='fiscal-obligation-definition')
router.register(r'fiscal-system-settings', views.FiscalSystemSettingsViewSet, basename='fiscal-system-settings')
router.register(r'generated-reports', views.GeneratedReportViewSet, basename='generated-report') # NOVA LINHA
router.register(r'saft-files', views.SAFTFileViewSet, basename='saftfile')
router.register(r'invoice-batches', views.InvoiceBatchViewSet, basename='invoicebatch')
router.register(r'scanned-invoices', views.ScannedInvoiceViewSet, basename='scannedinvoice')
router.register(r'action-logs', views.OrganizationActionLogViewSet, basename='organization-action-log')

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="get_token"),
    path("token/refresh/", TokenRefreshView.as_view(), name="refresh"),
    # Autenticação
    path("register/", views.CreateUserView.as_view(), name="register"),
    
    # Router principal
    path('', include(router.urls)),
    
    # Dashboard e relatórios
    path('dashboard-summary/', views.dashboard_summary, name='dashboard-summary'),
    path('update-profitability/', views.update_organization_profitability, name='update-profitability'),
    path('time-entry-context/', views.time_entry_context, name='time-entry-context'),

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

    # Gestão de obrigações fiscais
    path('fiscal/generate-manual/', views.generate_fiscal_obligations_manual, name='generate-fiscal-manual'),
    path('fiscal/stats/', views.fiscal_obligations_stats, name='fiscal-stats'),
    path('fiscal/test-client/', views.test_client_fiscal_obligations, name='test-fiscal-client'),
    path('fiscal/upcoming-deadlines/', views.fiscal_upcoming_deadlines, name='fiscal-upcoming-deadlines'), 

    path('ai-advisor/get-initial-context/', views.get_ai_advisor_initial_context, name='ai-get-initial-context'),
    path('ai-advisor/start-session/', views.start_ai_advisor_session, name='ai-start-session'),
    path('ai-advisor/query/', views.query_ai_advisor, name='ai-query-advisor'),
    path('ai-advisor/test/', views.test_ai_advisor_context, name='ai-test-context'),
    
    path('reports/generate/', views.generate_report, name='generate-report'),
    path('reports/context/', views.get_report_generation_context, name='report-generation-context'),
    path('reports/download/<uuid:report_id>/', views.download_report, name='download-report'),

    #documentation
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

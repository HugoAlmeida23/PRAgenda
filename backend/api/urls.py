from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'clients', views.ClientViewSet, basename='client')
router.register(r'task-categories', views.TaskCategoryViewSet, basename='taskcategory') # Added basename
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'time-entries', views.TimeEntryViewSet, basename='time-entry')
router.register(r'expenses', views.ExpenseViewSet, basename='expense')
router.register(r'client-profitability', views.ClientProfitabilityViewSet, basename='client-profitability')
router.register(r'nlp-processor', views.NLPProcessorViewSet, basename='nlp-processor')
router.register(r'auto-time-tracking', views.AutoTimeTrackingViewSet, basename='auto-time-tracking')
router.register(r'workflow-definitions', views.WorkflowDefinitionViewSet, basename='workflow-definition') # Basename was missing here or error was from a previous state
router.register(r'workflow-steps', views.WorkflowStepViewSet, basename='workflow-step') # Added basename
router.register(r'task-approvals', views.TaskApprovalViewSet, basename='task-approval')
router.register(r'organizations', views.OrganizationViewSet, basename='organization')
router.register(r'gemini-nlp', views.GeminiNLPViewSet, basename='gemini-nlp')
router.register(r'workflow-notifications', views.WorkflowNotificationViewSet, basename='workflow-notification')
router.register(r'workflow-history', views.WorkflowHistoryViewSet, basename='workflow-history')
router.register(r'workflow-step-details', views.WorkflowStepDetailViewSet, basename='workflow-step-detail')

urlpatterns = [
    path("register/", views.CreateUserView.as_view(), name="register"),
    path('', include(router.urls)),
    path('dashboard-summary/', views.dashboard_summary, name='dashboard-summary'),
    path('update-profitability/', views.update_organization_profitability, name='update-profitability'),
    path('system/check-deadlines/', views.check_deadlines_and_notify_view, name='check-deadlines'),
    path('system/check-overdue-steps/', views.check_overdue_steps_and_notify_view, name='check-overdue-steps'),
    path('system/check-pending-approvals/', views.check_pending_approvals_and_notify_view, name='check-pending-approvals'),
]
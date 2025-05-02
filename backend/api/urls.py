from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'clients', views.ClientViewSet, basename='client')  # Added basename
router.register(r'task-categories', views.TaskCategoryViewSet)
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'time-entries', views.TimeEntryViewSet, basename='time-entry')
router.register(r'expenses', views.ExpenseViewSet, basename='expense')
router.register(r'client-profitability', views.ClientProfitabilityViewSet, basename='client-profitability')
router.register(r'nlp-processor', views.NLPProcessorViewSet, basename='nlp-processor')
router.register(r'auto-time-tracking', views.AutoTimeTrackingViewSet, basename='auto-time-tracking')
router.register(r'workflow-definitions', views.WorkflowDefinitionViewSet)
router.register(r'workflow-steps', views.WorkflowStepViewSet)
router.register(r'task-approvals', views.TaskApprovalViewSet, basename='task-approval')
router.register(r'organizations', views.OrganizationViewSet, basename='organization')
router.register(r'gemini-nlp', views.GeminiNLPViewSet, basename='gemini-nlp')

urlpatterns = [
    path("register/", views.CreateUserView.as_view(), name="register"),
    path('', include(router.urls)),
]
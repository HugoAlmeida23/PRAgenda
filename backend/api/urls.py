from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'clients', views.ClientViewSet)
router.register(r'task-categories', views.TaskCategoryViewSet)
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'time-entries', views.TimeEntryViewSet, basename='time-entry')
router.register(r'expenses', views.ExpenseViewSet, basename='expense')
router.register(r'client-profitability', views.ClientProfitabilityViewSet, basename='client-profitability')

urlpatterns = [
    path("register/", views.CreateUserView.as_view(), name="register"),
    path('', include(router.urls)),
]
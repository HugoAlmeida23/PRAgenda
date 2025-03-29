from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Client, TaskCategory, Task, TimeEntry, Expense, ClientProfitability, Profile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}
        
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = Profile
        fields = ['id', 'user', 'username', 'hourly_rate', 'role', 'access_level', 
                  'phone', 'productivity_metrics']
        read_only_fields = ['id', 'user']  # Added 'user' as read-only


class ClientSerializer(serializers.ModelSerializer):
    account_manager_name = serializers.ReadOnlyField(source='account_manager.username')
    
    class Meta:
        model = Client
        fields = ['id', 'name', 'nif', 'email', 'phone', 'address', 
                  'account_manager', 'account_manager_name', 'monthly_fee', 
                  'created_at', 'updated_at', 'is_active', 'notes']
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskCategory
        fields = ['id', 'name', 'description', 'color', 'average_time_minutes', 'created_at']
        read_only_fields = ['id', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source='client.name')
    category_name = serializers.ReadOnlyField(source='category.name')
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'client', 'client_name', 
                  'category', 'category_name', 'assigned_to', 'assigned_to_name', 
                  'created_by', 'created_by_name', 'status', 'priority', 
                  'deadline', 'estimated_time_minutes', 'created_at', 
                  'updated_at', 'completed_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at']


class TimeEntrySerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.username')
    client_name = serializers.ReadOnlyField(source='client.name')
    task_title = serializers.ReadOnlyField(source='task.title')
    category_name = serializers.ReadOnlyField(source='category.name')
    
    class Meta:
        model = TimeEntry
        fields = ['id', 'user', 'user_name', 'client', 'client_name', 
                  'task', 'task_title', 'category', 'category_name', 
                  'description', 'minutes_spent', 'date', 'start_time', 
                  'end_time', 'created_at', 'original_text']
        read_only_fields = ['id', 'created_at']


class ExpenseSerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source='client.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    
    class Meta:
        model = Expense
        fields = ['id', 'amount', 'description', 'category', 'date', 
                  'client', 'client_name', 'created_by', 'created_by_name', 
                  'created_at', 'is_auto_categorized', 'source']
        read_only_fields = ['id', 'created_at']


class ClientProfitabilitySerializer(serializers.ModelSerializer):
    client_name = serializers.ReadOnlyField(source='client.name')
    
    class Meta:
        model = ClientProfitability
        fields = ['id', 'client', 'client_name', 'year', 'month', 
                  'total_time_minutes', 'time_cost', 'total_expenses', 
                  'monthly_fee', 'profit', 'profit_margin', 'is_profitable', 
                  'last_updated']
        read_only_fields = ['id', 'last_updated']
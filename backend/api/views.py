from rest_framework import viewsets, generics
from rest_framework.request import Request
from datetime import datetime
from django.utils import timezone
import json
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Client, TaskCategory, Task, TimeEntry, Expense, ClientProfitability, Profile, AutoTimeTracking, WorkflowStep
from .serializers import (ClientSerializer, TaskCategorySerializer, TaskSerializer,
                         TimeEntrySerializer, ExpenseSerializer, ClientProfitabilitySerializer,
                         ProfileSerializer, AutoTimeTrackingSerializer)
from .models import NLPProcessor, WorkflowDefinition, TaskApproval
from django.contrib.auth.models import User
from .serializers import UserSerializer, NLPProcessorSerializer, WorkflowDefinitionSerializer, WorkflowStepSerializer, TaskApprovalSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user) 

class AutoTimeTrackingViewSet(viewsets.ModelViewSet):
    serializer_class = AutoTimeTrackingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return AutoTimeTracking.objects.filter(user=self.request.user).order_by('-start_time')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save()  # Remove the created_by parameter


class TaskCategoryViewSet(viewsets.ModelViewSet):
    queryset = TaskCategory.objects.all()
    serializer_class = TaskCategorySerializer
    permission_classes = [IsAuthenticated]

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Task.objects.all()
        status = self.request.GET.get('status')
        if status:
            queryset = queryset.filter(status=status)
        # Filter by client if provided
        client_id = self.request.GET.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def advance_workflow(self, request, pk=None):
        task = self.get_object()
        
        step_id = request.data.get('step_id')
        comment = request.data.get('comment', '')
        
        if not step_id:
            return Response(
                {'error': 'Workflow step ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            next_step = WorkflowStep.objects.get(id=step_id)
        except WorkflowStep.DoesNotExist:
            return Response(
                {'error': 'Invalid workflow step ID'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Check if this is a valid next step
        current_step = task.current_workflow_step
        if current_step:
            try:
                next_steps = json.loads(current_step.next_steps)
                if str(next_step.id) not in next_steps:
                    return Response(
                        {'error': 'Invalid workflow transition'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except:
                pass
                
        # Update the task
        task.current_workflow_step = next_step
        task.workflow_comment = comment
        
        # If the step has an assignee, update the task assignment
        if next_step.assign_to:
            task.assigned_to = next_step.assign_to
            
        task.save()
        
        # Create a notification
        if next_step.requires_approval and next_step.approver_role:
            # In a real implementation, you'd find users with the appropriate role
            # and create notifications for them
            pass
            
        return Response(
            {'success': True, 'message': 'Workflow advanced successfully'},
            status=status.HTTP_200_OK
        )

# Create your views here.
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class TimeEntryViewSet(viewsets.ModelViewSet):
    serializer_class = TimeEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = TimeEntry.objects.all()
        # Filter by date range if provided
        start_date = self.request.GET.get('start_date')
        end_date = self.request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
        # Filter by client if provided
        client_id = self.request.GET.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset
    
    def perform_create(self, serializer):
        print(f"Creating time entry with user: {self.request.user}")
        serializer.save(user=self.request.user)

class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Expense.objects.all()
        # Filter by date range if provided
        start_date = self.request.GET.get('start_date')
        end_date = self.request.GET.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
        # Filter by client if provided
        client_id = self.request.GET.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ClientProfitabilityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ClientProfitabilitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = ClientProfitability.objects.all()
        # Filter by year/month if provided
        year = self.request.GET.get('year')
        month = self.request.GET.get('month')
        if year:
            queryset = queryset.filter(year=year)
        if month:
            queryset = queryset.filter(month=month)
        # Filter by client if provided
        client_id = self.request.GET.get('client')
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        return queryset
    
class NLPProcessorViewSet(viewsets.ModelViewSet):
    queryset = NLPProcessor.objects.all()
    serializer_class = NLPProcessorSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def process_text(self, request):
        """
        Process natural language text and return extracted information
        """
        text = request.data.get('text', '')
        client_id = request.data.get('client_id')
        
        if not text:
            return Response(
                {'error': 'Text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        results = NLPProcessor.process_text(text, request.user)
        
        # Format the response
        response_data = {
            'clients': [],
            'categories': [],
            'times': results['times'],
            'activities': results['activities'],
            'confidence': results['confidence']
        }
        
        # Add client information
        for client in results['clients']:
            response_data['clients'].append({
                'id': client.id,
                'name': client.name
            })
            
        # Add category information
        for category in results['categories']:
            response_data['categories'].append({
                'id': category.id,
                'name': category.name
            })
            
        return Response(response_data)
    
    @action(detail=False, methods=['post'])
    def create_time_entries(self, request):
        """
        Create time entries from natural language text
        """
        text = request.data.get('text', '')
        client_id = request.data.get('client_id')
        date_str = request.data.get('date')
        
        if not text:
            return Response(
                {'error': 'Text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if date_str:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            date = timezone.now().date()
            
        try:
            entries = NLPProcessor.create_time_entries_from_text(
                text, request.user, client_id, date
            )
            
            # Serialize and return the created entries
            serializer = TimeEntrySerializer(entries, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
class WorkflowDefinitionViewSet(viewsets.ModelViewSet):
    queryset = WorkflowDefinition.objects.all()
    serializer_class = WorkflowDefinitionSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class WorkflowStepViewSet(viewsets.ModelViewSet):
    queryset = WorkflowStep.objects.all()
    serializer_class = WorkflowStepSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = WorkflowStep.objects.all()
        workflow_id = self.request.query_params.get('workflow')
        if workflow_id:
            queryset = queryset.filter(workflow=workflow_id)
        return queryset.order_by('workflow', 'order')


class TaskApprovalViewSet(viewsets.ModelViewSet):
    serializer_class = TaskApprovalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = TaskApproval.objects.all()
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task=task_id)
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(approved_by=self.request.user)
from venv import logger
from django.db import models
from django.contrib.auth.models import User
import uuid
from django.utils import timezone
from decimal import Decimal
from django.db.models import JSONField
import random
import json
from django.core.exceptions import ValidationError
from django.db.models import Manager # <--- Make sure this is imported
import logging
from django.db.models import OuterRef, Exists, Q
from django.db.models.expressions import RawSQL


class Organization(models.Model):
    """
    Representa uma organização ou empresa que utiliza o sistema.
    Múltiplos perfis (Profile) podem pertencer a uma organização.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name="Nome")
    description = models.TextField(blank=True, null=True, verbose_name="Descrição")
    address = models.CharField(max_length=255, blank=True, null=True, verbose_name="Morada")
    phone = models.CharField(max_length=50, blank=True, null=True, verbose_name="Telefone")
    email = models.EmailField(blank=True, null=True, verbose_name="Email de Contacto")
    logo = models.CharField(max_length=255, blank=True, null=True, verbose_name="Logo URL")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    is_active = models.BooleanField(default=True, verbose_name="Ativo", db_index=True) # <-- ADD INDEX    
    # Campos adicionais que podem ser úteis
    subscription_plan = models.CharField(max_length=50, blank=True, null=True, verbose_name="Plano de Subscrição")
    max_users = models.PositiveIntegerField(default=5, verbose_name="Máximo de Utilizadores")
    settings = models.JSONField(default=dict, verbose_name="Configurações")
    
    class Meta:
        verbose_name = "Organização"
        verbose_name_plural = "Organizações"
        ordering = ["name"]
    
    def __str__(self):
        return self.name

class GeneratedReport(models.Model):
    REPORT_TYPE_CHOICES = [
        ('client_summary', 'Resumo de Cliente(s)'),
        ('profitability_analysis', 'Análise de Rentabilidade'),
        ('task_performance', 'Performance de Tarefas'),
        ('time_tracking_summary', 'Resumo de Registo de Tempos'),
        ('custom_report', 'Relatório Personalizado'),
    ]

    REPORT_FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('csv', 'CSV'),
        ('xlsx', 'Excel (XLSX)'),
    ]

    REPORT_STATUS_CHOICES = [
        ('PENDING', 'Pendente'),
        ('IN_PROGRESS', 'Em Progresso'),
        ('COMPLETED', 'Concluído'),
        ('FAILED', 'Falhou'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nome do Relatório")
    report_type = models.CharField(max_length=50, choices=REPORT_TYPE_CHOICES, verbose_name="Tipo de Relatório", db_index=True) # <-- ADD INDEX
    report_format = models.CharField(max_length=10, choices=REPORT_FORMAT_CHOICES, default='pdf', verbose_name="Formato")
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="generated_reports", verbose_name="Organização", db_index=True) # <-- ADD INDEX    
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_reports_meta", verbose_name="Gerado por", db_index=True) # <-- ADD INDEX    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Data de Geração")
    parameters = models.JSONField(default=dict, blank=True, verbose_name="Parâmetros Usados")
    
    storage_url = models.URLField(max_length=1024, verbose_name="URL de Armazenamento", blank=True, null=True)
    file_size_kb = models.PositiveIntegerField(null=True, blank=True, verbose_name="Tamanho (KB)")
    
    description = models.TextField(blank=True, null=True, verbose_name="Descrição Curta")
    
    status = models.CharField(
        max_length=20,
        choices=REPORT_STATUS_CHOICES,
        default='PENDING',
        db_index=True, # Add index for faster filtering
        verbose_name="Status de Geração"
    )

    class Meta:
        verbose_name = "Relatório Gerado"
        verbose_name_plural = "Relatórios Gerados"
        ordering = ['-created_at']

    def __str__(self):
        org_name = self.organization.name if self.organization else "N/A"
        return f"{self.name} ({self.get_report_type_display()}) - {org_name} [{self.status}]" 

def generate_four_digit_id():
    """Generate a random 4-digit number (between 1000 and 9999)"""
    return random.randint(1000, 9999)

class ClientManager(Manager):
    def for_user(self, user: User):
        """
        Returns a base queryset of clients the user is allowed to see.
        """
        if not user.is_authenticated:
            return self.none()
        if user.is_superuser:
            return self.all()
        try:
            profile = user.profile
            if not profile.organization:
                return self.none()
            
            base_queryset = self.filter(organization=profile.organization)
            
            if profile.is_org_admin or profile.can_view_all_clients:
                return base_queryset
            else:
                # Regular users see clients specifically assigned to them
                return base_queryset.filter(id__in=profile.visible_clients.values_list('id', flat=True))
        except Profile.DoesNotExist:
            return self.none()

class TimeEntryManager(Manager):
    def for_user(self, user: User):
        """
        Returns a base queryset of time entries the user is allowed to see.
        """
        if not user.is_authenticated:
            return self.none()
        if user.is_superuser:
            return self.all()
        try:
            profile = user.profile
            if not profile.organization:
                return self.none()
            
            # All entries must be within the user's organization
            org_queryset = self.filter(client__organization=profile.organization)
            
            if profile.is_org_admin or profile.can_view_team_time:
                return org_queryset
            else:
                # Regular users can only see their own time entries
                return org_queryset.filter(user=user)
        except Profile.DoesNotExist:
            return self.none()
        
class TaskManager(Manager):
    def for_user(self, user: User):
        """
        Returns a base queryset of tasks that the given user is allowed to see.
        This encapsulates all core visibility and permission logic.
        """
        if not user.is_authenticated:
            return self.none()

        if user.is_superuser:
            return self.all() # Superuser can see everything

        try:
            profile = user.profile
            if not profile.organization:
                return self.none() # User not in an org sees no tasks

            # Admins or users with global view see all tasks in their organization
            if profile.is_org_admin or profile.can_view_all_tasks:
                return self.filter(client__organization=profile.organization)
            
            # Regular users see tasks they are involved in
            user_id_str = str(user.id) # For consistent comparison with JSONField values

            # Subquery to check if the logged-in user is assigned to any workflow step
            is_workflow_assignee_subquery = Task.objects.filter(
                pk=OuterRef('pk')
            ).annotate(
                is_wf_assigned=RawSQL(
                    "EXISTS(SELECT 1 FROM jsonb_each_text(workflow_step_assignments) vals WHERE vals.value = %s)",
                    (user_id_str,)
                )
            )
            q_in_workflow = Q(Exists(is_workflow_assignee_subquery.filter(is_wf_assigned=True)))
            
            # Combine all involvement conditions for the logged-in user
            q_user_is_involved = Q(assigned_to=user) | Q(collaborators=user) | q_in_workflow
            
            # Return tasks in the user's organization that they are involved in
            return self.filter(
                client__organization=profile.organization
            ).filter(q_user_is_involved).distinct()

        except Profile.DoesNotExist:
            return self.none() # No profile, no tasks (unless superuser)
        
class Profile(models.Model):
    """
    Armazena os dados do user que está logged
    como o seu preço à hora, a sua responsabilidade, etc
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    
    invitation_code = models.CharField(
        max_length=4, 
        unique=True, # <--- CHANGE THIS FROM False TO True
        verbose_name="Código de Convite",
        help_text="Código de 4 dígitos para adicionar este utilizador a uma organização"
    )
    
    organization = models.ForeignKey(
        'Organization', 
        on_delete=models.CASCADE, 
        related_name='members',
        null=True, 
        blank=True,
        verbose_name="Organização"
    )
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), verbose_name="Preço à Hora")
    role = models.CharField(max_length=100, verbose_name="Função")
    access_level = models.CharField(max_length=100, verbose_name="Nível de Acesso")
    phone = models.CharField(max_length=100, blank=True, verbose_name="Telefone")
    productivity_metrics = JSONField(
        default=dict, 
        verbose_name="Métricas de Produtividade"
    )
    
    # Permissões de administração
    is_org_admin = models.BooleanField(default=False, verbose_name="Administrador da Organização")
    
    # ======== PERMISSÕES PARA GESTÃO DE CLIENTES ========
    can_manage_clients = models.BooleanField(default=False, verbose_name="Pode Gerir Clientes")
    can_view_all_clients = models.BooleanField(default=False, verbose_name="Pode Ver Todos os Clientes")
    can_create_clients = models.BooleanField(default=False, verbose_name="Pode Criar Clientes")
    can_edit_clients = models.BooleanField(default=False, verbose_name="Pode Editar Clientes")
    can_delete_clients = models.BooleanField(default=False, verbose_name="Pode Excluir Clientes")
    can_change_client_status = models.BooleanField(default=False, verbose_name="Pode Ativar/Desativar Clientes")
    
    # Clientes específicos visíveis para este usuário
    visible_clients = models.ManyToManyField(
        'Client', 
        blank=True, 
        related_name='visible_to_profiles',
        verbose_name="Clientes Visíveis"
    )
    
    # ======== PERMISSÕES PARA GESTÃO DE TAREFAS ========
    can_assign_tasks = models.BooleanField(default=False, verbose_name="Pode Atribuir Tarefas")
    can_create_tasks = models.BooleanField(default=False, verbose_name="Pode Criar Tarefas")
    can_edit_all_tasks = models.BooleanField(default=False, verbose_name="Pode Editar Qualquer Tarefa")
    can_edit_assigned_tasks = models.BooleanField(default=False, verbose_name="Pode Editar Tarefas Atribuídas")
    can_delete_tasks = models.BooleanField(default=False, verbose_name="Pode Excluir Tarefas")
    can_view_all_tasks = models.BooleanField(default=False, verbose_name="Pode Ver Todas as Tarefas")
    can_approve_tasks = models.BooleanField(default=False, verbose_name="Pode Aprovar Etapas de Tarefas")
    
    # ======== PERMISSÕES PARA GESTÃO DE TEMPO ========
    can_log_time = models.BooleanField(default=True, verbose_name="Pode Registrar Tempo")
    can_edit_own_time = models.BooleanField(default=True, verbose_name="Pode Editar Próprio Tempo")
    can_edit_all_time = models.BooleanField(default=False, verbose_name="Pode Editar Tempo de Qualquer Pessoa")
    can_view_team_time = models.BooleanField(default=False, verbose_name="Pode Ver Registros de Tempo da Equipe")
    
    # ======== PERMISSÕES FINANCEIRAS ========
    can_view_client_fees = models.BooleanField(default=False, verbose_name="Pode Ver Taxas de Clientes")
    can_edit_client_fees = models.BooleanField(default=False, verbose_name="Pode Alterar Taxas de Clientes")
    can_manage_expenses = models.BooleanField(default=False, verbose_name="Pode Gerenciar Despesas")
    can_view_profitability = models.BooleanField(default=False, verbose_name="Pode Ver Rentabilidade")
    can_view_team_profitability = models.BooleanField(default=False, verbose_name="Pode Ver Rentabilidade da Equipe")
    can_view_organization_profitability = models.BooleanField(default=False, verbose_name="Pode Ver Rentabilidade da Organização")
    
    # ======== PERMISSÕES DE RELATÓRIOS E ANÁLISES ========
    can_view_analytics = models.BooleanField(default=False, verbose_name="Pode Ver Análises")
    can_export_reports = models.BooleanField(default=False, verbose_name="Pode Exportar Relatórios")
    can_create_custom_reports = models.BooleanField(default=False, verbose_name="Pode Criar Relatórios Personalizados")
    can_schedule_reports = models.BooleanField(default=False, verbose_name="Pode Agendar Relatórios")
    
    # ======== PERMISSÕES DE WORKFLOW ========
    can_create_workflows = models.BooleanField(default=False, verbose_name="Pode Criar Workflows")
    can_edit_workflows = models.BooleanField(default=False, verbose_name="Pode Editar Workflows")
    can_assign_workflows = models.BooleanField(default=False, verbose_name="Pode Atribuir Workflows")
    can_manage_workflows = models.BooleanField(default=False, verbose_name="Pode Gerenciar Workflows")
    
    class Meta:
        verbose_name = "Perfil"
        verbose_name_plural = "Perfis"

    def __str__(self):
        return f"{self.user.username} - {self.role}"
    
    def save(self, *args, **kwargs):
        # Generate a unique invitation code if not set
        if not self.invitation_code:
            self._generate_unique_invitation_code()
        super().save(*args, **kwargs)
    
    def _generate_unique_invitation_code(self):
        """Generate a unique 4-digit invitation code"""
        max_attempts = 100
        for _ in range(max_attempts):
            code = str(random.randint(1000, 9999))
            if not Profile.objects.filter(invitation_code=code).exists():
                self.invitation_code = code
                return
        raise ValueError("Unable to generate a unique invitation code after multiple attempts")
    
    def get_organization_colleagues(self):
        """Retorna todos os perfis da mesma organização, exceto o próprio."""
        if not self.organization:
            return Profile.objects.none()
            
        return Profile.objects.filter(
            organization=self.organization
        ).exclude(id=self.id)
    
    def can_manage_profile(self, profile):
        """Verifica se este perfil pode gerir outro perfil."""
        # Admins da organização podem gerir qualquer perfil na mesma organização
        if self.is_org_admin and self.organization and self.organization == profile.organization:
            return True
        return False
    
    def get_accessible_clients(self):
        """Returns clients the user can access based on permissions."""
        if self.is_org_admin or self.can_view_all_clients:
            # Administrators and users with full access can see all organization clients
            return Client.objects.filter(organization=self.organization)
        else:
            # Other users can only see clients explicitly granted to them
            return self.visible_clients.all()
    
    def can_access_client(self, client):
        """Check if user can access a specific client."""
        if self.is_org_admin or self.can_view_all_clients:
            return client.organization == self.organization
        else:
            return self.visible_clients.filter(id=client.id).exists()
    
    # Novos métodos auxiliares para verificar permissões específicas
    
    def can_manage_task(self, task):
        """Verifica se este usuário pode gerenciar uma tarefa específica."""
        # Administradores podem gerenciar qualquer tarefa
        if self.is_org_admin:
            return True
        
        # Usuários com permissão para editar todas as tarefas
        if self.can_edit_all_tasks:
            return True
            
        # Usuários podem editar suas próprias tarefas atribuídas
        if self.can_edit_assigned_tasks and task.assigned_to == self.user:
            return True
            
        # Usuários podem gerenciar tarefas de clientes que têm permissão para gerenciar
        if self.can_manage_clients and self.can_access_client(task.client):
            return True
            
        return False
    
    def can_manage_time_entry(self, time_entry):
        """Verifica se este usuário pode gerenciar um registro de tempo específico."""
        # Administradores podem gerenciar qualquer registro
        if self.is_org_admin:
            return True
            
        # Usuários com permissão para editar qualquer registro de tempo
        if self.can_edit_all_time:
            return True
            
        # Usuários podem editar seus próprios registros de tempo
        if self.can_edit_own_time and time_entry.user == self.user:
            return True
            
        return False
            
    @classmethod
    def find_by_invitation_code(cls, code):
        """
        Encontrar um perfil pelo código de convite.
        Retorna None se não encontrar.
        """
        try:
            return cls.objects.get(invitation_code=code)
        except cls.DoesNotExist:
            return None
                
class Client(models.Model):
    """
    Cliente do escritório de contabilidade.
    Armazena informações básicas e financeiras dos clientes.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name="Nome")
    nif = models.CharField(max_length=50, blank=True, null=True, verbose_name="NIFP")
    email = models.EmailField(blank=True, null=True, verbose_name="Email")
    phone = models.CharField(max_length=50, blank=True, null=True, verbose_name="Telefone")
    address = models.CharField(blank=True, null=True, verbose_name="Morada")
    account_manager = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='clients_managed',
        verbose_name="Gestor de Conta",
        db_index=True # <-- ADD INDEX
    )
    #Informações Financeiras
    monthly_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name="Avença Mensal", 
        blank=True, null=True
    )
    
    organization = models.ForeignKey(
        Organization, 
        on_delete=models.CASCADE, 
        related_name='clients',
        null=True,
        verbose_name="Organização",
        db_index=True # <-- ADD INDEX
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    is_active = models.BooleanField(default=True, verbose_name="Ativo", db_index=True) # <-- ADD INDEX
    notes = models.TextField(blank=True, null=True, verbose_name="Observações")
    
    fiscal_tags = JSONField(
        default=list, blank=True,
        verbose_name="Tags Fiscais do Cliente",
        help_text="Usado para identificar a que obrigações este cliente está sujeito. Ex: ['EMPRESA', 'IVA_TRIMESTRAL', 'REGIME_GERAL_IRC']"
    )
    
    objects = ClientManager() 
    
    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["name"]
        
    
    def __str__(self):
        return self.name
       
class TaskCategory(models.Model):
    """
    Categorias de tarefas contábeis.
    Permite agrupar tarefas similares e definir um tempo médio para elas.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Nome")
    description = models.TextField(blank=True, null=True, verbose_name="Descrição")
    color = models.CharField(max_length=7, default="#3498db", verbose_name="Cor")  # Formato HEX
    average_time_minutes = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        verbose_name="Tempo Médio (minutos)"
    )
    
    # Metadados
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    
    class Meta:
        verbose_name = "Categoria de Tarefa"
        verbose_name_plural = "Categorias de Tarefas"
        ordering = ["name"]
    
    def __str__(self):
        return self.name
    
class WorkflowDefinition(models.Model):
    """
    Defines a workflow template that can be applied to tasks.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Nome")
    description = models.TextField(blank=True, null=True, verbose_name="Descrição")
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_workflows',
        verbose_name="Criado por"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    is_active = models.BooleanField(default=True, verbose_name="Ativo")
    
    class Meta:
        verbose_name = "Definição de Fluxo de Trabalho"
        verbose_name_plural = "Definições de Fluxo de Trabalho"
        ordering = ["-created_at"]
    
    def __str__(self):
        return self.name

class Expense(models.Model):
    """
    Despesas que podem estar associadas a clientes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Detalhes da despesa
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Valor")
    description = models.TextField(blank=True, null=True, verbose_name="Descrição")
    category = models.CharField(max_length=100, blank=True, null=True, verbose_name="Categoria")
    date = models.DateField(verbose_name="Data")
    
    # Relações
    client = models.ForeignKey(
        Client, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='expenses',
        verbose_name="Cliente"
    )
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_expenses',
        verbose_name="Criado por"
    )
    
    # Metadados
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    is_auto_categorized = models.BooleanField(default=False, verbose_name="Categorizado Automaticamente")
    source = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        verbose_name="Fonte"
    )  # ex: 'bank_import', 'manual'
    
    class Meta:
        verbose_name = "Despesa"
        verbose_name_plural = "Despesas"
        ordering = ["-date"]
    
    def __str__(self):
        client_name = self.client.name if self.client else "Sem cliente"
        return f"{client_name} - {self.amount}€ - {self.date}"
    
class ClientProfitability(models.Model):
    """
    Armazena dados agregados de rentabilidade por cliente e período.
    Esta tabela é atualizada periodicamente com base nos dados de tempo e despesas.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relações
    client = models.ForeignKey(
        Client, 
        on_delete=models.CASCADE, 
        related_name='profitability_records',
        verbose_name="Cliente"
    )
    
    # Período e dados agregados
    year = models.IntegerField(verbose_name="Ano")
    month = models.IntegerField(verbose_name="Mês")
    total_time_minutes = models.PositiveIntegerField(default=0, verbose_name="Tempo Total (minutos)")
    time_cost = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name="Custo do Tempo"
    )
    total_expenses = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name="Despesas Totais"
    )
    monthly_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name="Avença Mensal"
    )
    profit = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True,
        verbose_name="Lucro"
    )
    profit_margin = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True,
        verbose_name="Margem de Lucro (%)"
    )
    
    # Metadados
    is_profitable = models.BooleanField(null=True, verbose_name="É Rentável")
    last_updated = models.DateTimeField(auto_now=True, verbose_name="Última Atualização")
    
    class Meta:
        verbose_name = "Rentabilidade de Cliente"
        verbose_name_plural = "Rentabilidades de Clientes"
        ordering = ["-year", "-month", "client__name"]
        unique_together = ["client", "year", "month"]  # Garante apenas um registro por cliente/mês
    
    def __str__(self):
        return f"{self.client.name} - {self.year}/{self.month:02d} - {'Rentável' if self.is_profitable else 'Não Rentável'}"
    
    def calculate_profit(self):
        """Calcula o lucro e a margem de lucro com base nos valores registrados"""
        total_cost = self.time_cost + self.total_expenses
        self.profit = self.monthly_fee - total_cost
        
        if self.monthly_fee > 0:
            self.profit_margin = (self.profit / self.monthly_fee) * 100
        else:
            self.profit_margin = None
            
        self.is_profitable = self.profit > 0 if self.profit is not None else None
        return self.profit  
    
# Add this at the end of your models.py file
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.cache import cache

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(
            user=instance,
            hourly_rate=0.0,
            role='New User',
            access_level='Standard',
            phone=''
        )

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

class AutoTimeTracking(models.Model):
    """
    Tracks user activity automatically for time entry generation.
    This model stores data related to automatic time tracking sessions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='auto_time_tracking',
        verbose_name="Usuário"
    )
    start_time = models.DateTimeField(verbose_name="Hora de Início")
    end_time = models.DateTimeField(null=True, blank=True, verbose_name="Hora de Término")
    activity_data = models.JSONField(default=dict, verbose_name="Dados de Atividade")
    processed = models.BooleanField(default=False, verbose_name="Processado")
    converted_to_entries = models.JSONField(
        default=list, 
        verbose_name="Convertido em Registros"
    )
    
    class Meta:
        verbose_name = "Rastreamento Automático"
        verbose_name_plural = "Rastreamentos Automáticos"
        ordering = ["-start_time"]
    
    def __str__(self):
        return f"{self.user.username} - {self.start_time}"
            
class WorkflowStep(models.Model):
    """
    Defines a step within a workflow.
    Uses ManyToManyField for proper database relationships.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        WorkflowDefinition, 
        on_delete=models.CASCADE, 
        related_name='steps',
        verbose_name="Fluxo de Trabalho"
    )
    name = models.CharField(max_length=100, verbose_name="Nome")
    description = models.TextField(blank=True, null=True, verbose_name="Descrição")
    order = models.PositiveIntegerField(verbose_name="Ordem")
    assign_to = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_workflow_steps',
        verbose_name="Atribuir a"
    )
    requires_approval = models.BooleanField(default=False, verbose_name="Requer Aprovação")
    approver_role = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        verbose_name="Papel do Aprovador"
    )
    
    # ONLY define next_steps - Django automatically creates previous_steps!
    next_steps = models.ManyToManyField(
        'self',
        symmetrical=False,
        related_name='previous_steps',  # This creates the automatic reverse relationship
        blank=True,
        verbose_name="Próximos Passos",
        help_text="Passos que podem ser executados após este passo"
    )
    
    class Meta:
        verbose_name = "Passo de Fluxo de Trabalho"
        verbose_name_plural = "Passos de Fluxo de Trabalho"
        ordering = ["workflow", "order"]
        unique_together = ["workflow", "order"]
    
    def __str__(self):
        return f"{self.workflow.name} - {self.name}"

    # REMOVE the old clean() method and JSONField helper methods
    # These are no longer needed with ManyToManyField
    
    # NEW: Helper methods for ManyToManyField relationships
    def get_next_step_ids(self):
        """Returns a list of next step IDs"""
        return list(self.next_steps.values_list('id', flat=True))
    
    def get_previous_step_ids(self):
        """Returns a list of previous step IDs (automatic reverse relationship)"""
        return list(self.previous_steps.values_list('id', flat=True))
    
    def add_next_step(self, step):
        """Add a next step"""
        self.next_steps.add(step)
    
    def remove_next_step(self, step):
        """Remove a next step"""
        self.next_steps.remove(step)
    
    def can_advance_to(self, step):
        """Check if this step can advance to another step"""
        return self.next_steps.filter(id=step.id).exists()
    
    def get_available_next_steps(self):
        """Get all available next steps as queryset"""
        return self.next_steps.all()
    
    def get_steps_that_lead_here(self):
        """Get all steps that can lead to this step (using reverse relationship)"""
        return self.previous_steps.all()
    
    def get_next_steps_data(self):
        """Get next steps data for API responses"""
        return [
            {
                'id': str(step.id),
                'name': step.name,
                'order': step.order,
                'assign_to': step.assign_to.username if step.assign_to else None
            }
            for step in self.next_steps.all()
        ]

class TaskApproval(models.Model):
    """
    Records approvals for workflow steps in tasks.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        'Task', 
        on_delete=models.CASCADE, 
        related_name='approvals',
        verbose_name="Tarefa"
    )
    workflow_step = models.ForeignKey(
        WorkflowStep, 
        on_delete=models.CASCADE, 
        related_name='task_approvals',
        verbose_name="Passo do Fluxo"
    )
    approved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='task_approvals',
        verbose_name="Aprovado por"
    )
    approved_at = models.DateTimeField(auto_now_add=True, verbose_name="Aprovado em")
    approved = models.BooleanField(default=True, verbose_name="Aprovado")
    comment = models.TextField(blank=True, null=True, verbose_name="Comentário")
    
    class Meta:
        verbose_name = "Aprovação de Tarefa"
        verbose_name_plural = "Aprovações de Tarefas"
        ordering = ["-approved_at"]
        unique_together = ["task", "workflow_step", "approved_by"]
    
    def __str__(self):
        status = "aprovado" if self.approved else "rejeitado"
        return f"Passo {self.workflow_step.name} {status} por {self.approved_by.username}"

class Task(models.Model):
    """
    Enhanced Task model with multi-user assignment support.
    Users can be assigned as primary responsible, collaborators, or through workflow steps.
    """
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('in_progress', 'Em Progresso'),
        ('completed', 'Concluída'),
        ('cancelled', 'Cancelada')
    ]
    
    PRIORITY_CHOICES = [
        (1, 'Urgente'),
        (2, 'Alta'),
        (3, 'Média'),
        (4, 'Baixa'),
        (5, 'Pode Esperar')
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, verbose_name="Título")
    description = models.TextField(blank=True, null=True, verbose_name="Descrição")
    
    # Relações
    client = models.ForeignKey(
        Client, 
        on_delete=models.CASCADE, 
        related_name='tasks',
        verbose_name="Cliente",
        db_index=True # <-- ADD INDEX
    )
    category = models.ForeignKey(
        TaskCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='tasks',
        verbose_name="Categoria"
    )
    
    assigned_to = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='primary_assigned_tasks',
        verbose_name="Responsável Principal",
        db_index=True # <-- ADD INDEX
    )
    # NEW: Additional collaborators who can work on the task
    collaborators = models.ManyToManyField(
        User,
        blank=True,
        related_name='collaborative_tasks',
        verbose_name="Colaboradores",
        help_text="Usuários que podem trabalhar nesta tarefa além do responsável principal"
    )
    
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_tasks',
        verbose_name="Criado por",
        db_index=True # <-- ADD INDEX
    )
    
    # Status e prioridade
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        verbose_name="Status",
        db_index=True # <-- ADD INDEX
    )
    priority = models.IntegerField(
        choices=PRIORITY_CHOICES, 
        default=3,
        verbose_name="Prioridade"
    )
    
    # Datas
    deadline = models.DateTimeField(blank=True, null=True, verbose_name="Prazo", db_index=True) # <-- ADD INDEX
    estimated_time_minutes = models.PositiveIntegerField(
        blank=True, 
        null=True,
        verbose_name="Tempo Estimado (minutos)"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    completed_at = models.DateTimeField(blank=True, null=True, verbose_name="Concluída em", db_index=True) # <-- ADD INDEX
    
    # Workflow fields
    workflow = models.ForeignKey(
        WorkflowDefinition,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
        verbose_name="Fluxo de Trabalho",
        db_index=True # <-- ADD INDEX
    )
    current_workflow_step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_tasks',
        verbose_name="Passo Atual do Fluxo",
        db_index=True # <-- ADD INDEX
    )
    workflow_step_assignments = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Atribuições de Passos do Workflow",
        help_text="Mapeamento de step_id para user_id. Ex: {'step_id_1': user_id_A, 'step_id_2': user_id_B}"
    )
    workflow_comment = models.TextField(
        blank=True,
        null=True,
        verbose_name="Comentário do Fluxo"
    )

    # Fiscal obligation source
    source_fiscal_obligation = models.ForeignKey(
        'FiscalObligationDefinition',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='generated_tasks',
        verbose_name="Origem da Obrigação Fiscal",
        db_index=True # <-- ADD INDEX
    )
    obligation_period_key = models.CharField(
        max_length=50, null=True, blank=True,
        verbose_name="Chave do Período da Obrigação",
        help_text="Identificador único para o período desta obrigação (ex: ANO-TRIMESTRE)"
    )

    objects = TaskManager()
    
    class Meta:
        verbose_name = "Tarefa"
        verbose_name_plural = "Tarefas"
        ordering = ["priority", "deadline"]
        unique_together = [['client', 'source_fiscal_obligation', 'obligation_period_key']]

    def __str__(self):
        return f"{self.title} - {self.client.name}"
    
    def save(self, *args, **kwargs):
        # Se o status mudou para 'completed', registrar a data de conclusão
        if self.status == 'completed' and self.completed_at is None:
            self.completed_at = timezone.now()
        # Se o status mudou de 'completed', limpar a data de conclusão
        elif self.status != 'completed':
            self.completed_at = None
            
        super(Task, self).save(*args, **kwargs)

    # ENHANCED: New methods for multi-user access control
    def get_all_assigned_users(self):
        """
        Returns all users who have access to this task:
        - Primary assignee
        - Collaborators
        - Users assigned to workflow steps
        """
        users = set()
        
        # Primary assignee
        if self.assigned_to:
            users.add(self.assigned_to)
        
        # Collaborators
        users.update(self.collaborators.all())
        
        # Workflow step assignees
        if self.workflow_step_assignments:
            step_user_ids = [
                user_id for user_id in self.workflow_step_assignments.values() 
                if user_id and str(user_id).isdigit()
            ]
            if step_user_ids:
                workflow_users = User.objects.filter(id__in=step_user_ids)
                users.update(workflow_users)
        
        return list(users)
    
    def can_user_access_task(self, user):
        """
        Check if a user has access to this task through any assignment method
        """
        # Primary assignee
        if self.assigned_to == user:
            return True
        
        # Collaborator
        if self.collaborators.filter(id=user.id).exists():
            return True
        
        # Workflow step assignment
        if self.workflow_step_assignments:
            assigned_user_ids = [
                str(user_id) for user_id in self.workflow_step_assignments.values()
                if user_id
            ]
            if str(user.id) in assigned_user_ids:
                return True
        
        return False
    
    def get_user_role_in_task(self, user):
        """
        Get the user's role in this task
        Returns: 'primary', 'collaborator', 'workflow_step', None
        """
        if self.assigned_to == user:
            return 'primary'
        
        if self.collaborators.filter(id=user.id).exists():
            return 'collaborator'
        
        if self.workflow_step_assignments:
            assigned_user_ids = [
                str(user_id) for user_id in self.workflow_step_assignments.values()
                if user_id
            ]
            if str(user.id) in assigned_user_ids:
                return 'workflow_step'
        
        return None
    
    def get_workflow_progress_data(self):
        """
        Calcula o progresso do workflow de forma eficiente.
        """
        if not self.workflow:
            return None

        try:
            if hasattr(self.workflow, '_prefetched_objects_cache') and 'steps' in self.workflow._prefetched_objects_cache:
                all_steps = self.workflow.steps.all()
            else:
                all_steps = self.workflow.steps.order_by('order')
        except WorkflowDefinition.steps.RelatedObjectDoesNotExist:
             all_steps = []

        total_steps = len(all_steps)
        if total_steps == 0:
            return {'current_step': 0, 'completed_steps': 0, 'total_steps': 0, 'percentage': 0, 'is_completed': False}
        
        task_history = self.workflow_history.all() if hasattr(self, 'workflow_history') else []
        workflow_completed = any(h.action == 'workflow_completed' for h in task_history)

        if workflow_completed:
            completed_count = total_steps
            current_step_number = total_steps
            percentage = 100.0
        elif self.current_workflow_step:
            current_order = self.current_workflow_step.order
            completed_step_ids = {h.from_step_id for h in task_history if h.action in ['step_completed', 'step_advanced'] and h.from_step_id}
            
            for step in all_steps:
                if step.order < current_order:
                    completed_step_ids.add(step.id)

            completed_count = len(completed_step_ids)
            current_step_number = current_order
            percentage = (completed_count / total_steps) * 100 if total_steps > 0 else 0
        else:
            completed_count = 0
            current_step_number = 1
            percentage = 0.0

        return {
            'current_step': current_step_number,
            'completed_steps': completed_count,
            'total_steps': total_steps,
            'percentage': round(percentage, 1),
            'is_completed': workflow_completed
        }

    def get_available_next_steps(self):
        """Retorna os próximos passos disponíveis de forma eficiente."""
        if not self.current_workflow_step:
            if self.workflow:
                first_steps = self.workflow.steps.filter(order=1)
                return [
                    {
                        'id': str(step.id), 
                        'name': step.name, 
                        'order': step.order,
                        'assign_to': step.assign_to.username if step.assign_to else None
                    } 
                    for step in first_steps
                ]
            return []
            
        try:
            return self.current_workflow_step.get_next_steps_data()
        except Exception:
            next_steps = self.current_workflow_step.next_steps.all()
            return [
                {
                    'id': str(step.id), 
                    'name': step.name, 
                    'order': step.order,
                    'assign_to': step.assign_to.username if step.assign_to else None
                } 
                for step in next_steps
        ]

class FiscalObligationDefinition(models.Model):
    PERIODICITY_CHOICES = [
        ('MONTHLY', 'Mensal'),
        ('QUARTERLY', 'Trimestral'),
        ('ANNUAL', 'Anual'),
        ('BIANNUAL', 'Semestral'), # Semestral = a cada 6 meses
        ('OTHER', 'Outra'),
    ]
    CALCULATION_BASIS_CHOICES = [
        ('END_OF_PERIOD', 'Fim do Período de Referência'),
        ('SPECIFIC_DATE', 'Data Específica no Ano'),
        ('EVENT_DRIVEN', 'Após um Evento'),
    ]
    CUSTOM_RULE_TYPE_CHOICES = [
        ('MONTHLY_ON_DAY', 'Mensal em Dia Específico'), # e.g. every month on the 15th (use periodicity MONTHLY for this)
        ('SPECIFIC_MONTH_OCCURRENCE', 'Ocorrência em Mês Específico'), # For 'OTHER' periodicity that should trigger in a certain month
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, verbose_name="Nome da Obrigação")
    description = models.TextField(blank=True, null=True, verbose_name="Descrição Detalhada")
    periodicity = models.CharField(max_length=20, choices=PERIODICITY_CHOICES, verbose_name="Periodicidade")
    
    calculation_basis = models.CharField(
        max_length=20, 
        choices=CALCULATION_BASIS_CHOICES, 
        default='END_OF_PERIOD',
        verbose_name="Base de Cálculo do Prazo"
    )
    # Dia do mês para o deadline (1-31)
    deadline_day = models.PositiveIntegerField(
        verbose_name="Dia Limite do Mês para Entrega/Pagamento",
        help_text="Ex: 20 para o dia 20"
    )
    # Offset em meses APÓS o fim do período de referência ou após o specific_month/trigger_event_description
    deadline_month_offset = models.PositiveIntegerField(
        default=0, 
        verbose_name="Offset de Meses para Deadline",
        help_text="0 para o mesmo mês, 1 para o mês seguinte, etc."
    )
    # Para obrigações anuais ou com data base específica (ex: IES, Modelo 10)
    # Se calculation_basis='SPECIFIC_DATE', este é o mês base.
    specific_month_reference = models.PositiveIntegerField(
        null=True, blank=True, 
        verbose_name="Mês de Referência Específico (1-12)",
        help_text="Para obrigações com uma data base anual ou um mês específico de início de contagem."
    )
    
    # Este campo será usado para filtrar clientes. Cliente terá tags.
    applies_to_client_tags = JSONField(
        default=list, blank=True,
        verbose_name="Aplica-se a Clientes com Tags",
        help_text="Lista de tags que o cliente deve ter. Ex: ['EMPRESA', 'IVA_MENSAL']"
    )

    default_task_title_template = models.CharField(
        max_length=255, 
        default="{obligation_name} - {client_name} - {period_description}",
        verbose_name="Template do Título da Tarefa",
        help_text="Variáveis: {obligation_name}, {client_name}, {period_description}, {year}, {month_name}, {quarter}"
    )
    default_task_category = models.ForeignKey(
        TaskCategory, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        verbose_name="Categoria de Tarefa Padrão"
    )
    default_priority = models.IntegerField(
        choices=Task.PRIORITY_CHOICES, # Requer que Task.PRIORITY_CHOICES exista
        default=2, 
        verbose_name="Prioridade Padrão da Tarefa"
    )
    default_workflow = models.ForeignKey(
        WorkflowDefinition,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="Workflow Padrão"
    )
    # Quantos dias antes do deadline a tarefa deve ser criada
    generation_trigger_offset_days = models.IntegerField(
        default=30, 
        verbose_name="Criar Tarefa X Dias Antes do Deadline"
    )
    is_active = models.BooleanField(default=True, verbose_name="Definição Ativa", db_index=True) # <-- ADD INDEX
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='fiscal_obligation_definitions',
        verbose_name="Organização",
        null=True, blank=True,
        db_index=True # <-- ADD INDEX
    )

    custom_rule_trigger_month = models.PositiveIntegerField(
        null=True, blank=True,
        choices=[(i, str(i)) for i in range(1, 13)], # 1=Jan, ..., 12=Dec
        verbose_name="Mês de Gatilho para Regra Customizada (1-12)",
        help_text="Se Periodicidade='Outra', define o mês em que esta obrigação deve ser considerada para geração. Ex: IRS (junho), IRC (maio), IES (julho)."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Definição de Obrigação Fiscal"
        verbose_name_plural = "Definições de Obrigações Fiscais"
        ordering = ['name']

    def __str__(self):
        org_name = f" ({self.organization.name})" if self.organization else " (Global)"
        return f"{self.name}{org_name}"

class WorkflowNotification(models.Model):
    """
    Notificações relacionadas a atualizações de workflow
    """
    NOTIFICATION_TYPES = [
        ('step_assigned', 'Passo Atribuído'),
        ('step_ready', 'Passo Pronto para Execução'),
        ('step_completed', 'Passo Concluído'),
        ('approval_needed', 'Aprovação Necessária'),
        ('approval_completed', 'Aprovação Concluída'),
        ('task_completed', 'Tarefa Concluída'), 
        ('task_assigned_to_you', 'Nova Tarefa Atribuída a Si'),
        ('deadline_approaching', 'Prazo Próximo'),
        ('step_overdue', 'Passo Atrasado'),
        ('manual_reminder', 'Lembrete Manual'),
        ('workflow_assigned', 'Workflow Atribuído'),
        ('step_rejected', 'Passo Rejeitado'),
        ('manual_advance_needed', 'Avanço Manual Necessário'),
        ('report_generated', 'Relatório Gerado'), # NEW TYPE
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Baixa'),
        ('normal', 'Normal'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workflow_notifications',
        verbose_name="Usuário"
    )
    task = models.ForeignKey( # Task can be null for non-task-specific notifications like report generation
        Task,
        on_delete=models.CASCADE,
        related_name='workflow_notifications',
        verbose_name="Tarefa",
        null=True, # Allow null for report_generated
        blank=True  # Allow blank for report_generated
    )
    workflow_step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Passo do Workflow",
        null=True,
        blank=True
    )
    
    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_TYPES,
        verbose_name="Tipo de Notificação",
        db_index=True # <-- ADD INDEX
    )
    
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_LEVELS,
        default='normal',
        verbose_name="Prioridade"
    )
    
    title = models.CharField(max_length=200, verbose_name="Título")
    message = models.TextField(verbose_name="Mensagem")
    
    is_read = models.BooleanField(default=False, verbose_name="Lida", db_index=True) # <-- ADD INDEX
    is_archived = models.BooleanField(default=False, verbose_name="Arquivada", db_index=True) # <-- ADD INDEX
    email_sent = models.BooleanField(default=False, verbose_name="Email Enviado")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    read_at = models.DateTimeField(null=True, blank=True, verbose_name="Lida em")
    scheduled_for = models.DateTimeField(null=True, blank=True, verbose_name="Agendada para")
    
    metadata = models.JSONField(
        default=dict, 
        verbose_name="Metadados",
        help_text="Dados adicionais da notificação (e.g., report_id for 'report_generated')" # UPDATED HELP TEXT
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_notifications',
        verbose_name="Criado por"
    )
    
    class Meta:
        # Your existing Meta class is already good.
        verbose_name = "Notificação de Workflow"
        verbose_name_plural = "Notificações de Workflow"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=['user', 'is_read', 'is_archived']), # <-- Add 'is_archived' for better query performance on the main list
            models.Index(fields=['task', 'notification_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"
    
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def mark_as_unread(self):
        if self.is_read:
            self.is_read = False
            self.read_at = None
            self.save(update_fields=['is_read', 'read_at'])
    
    def archive(self):
        self.is_archived = True
        self.save(update_fields=['is_archived'])

class TimeEntry(models.Model):
    """
    Registro de tempo gasto em tarefas para clientes.
    Este é o coração do sistema de tracking de tempo.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relações
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='time_entries',
        verbose_name="Usuário",
        db_index=True # <-- ADD INDEX
    )
    client = models.ForeignKey(
        Client, 
        on_delete=models.CASCADE, 
        related_name='time_entries',
        verbose_name="Cliente",
        db_index=True # <-- ADD INDEX
    )
    task = models.ForeignKey(
        Task, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='time_entries',
        verbose_name="Tarefa",
        db_index=True # <-- ADD INDEX
    )
    category = models.ForeignKey(
        TaskCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Categoria"
    )
    
    # NOVO: Passo do workflow associado
    workflow_step = models.ForeignKey(
        'WorkflowStep',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='time_entries',
        verbose_name="Passo do Workflow"
    )
    
    # Detalhes do tempo
    description = models.TextField(verbose_name="Descrição")
    minutes_spent = models.PositiveIntegerField(verbose_name="Minutos Gastos")
    date = models.DateField(default=timezone.now, verbose_name="Data", db_index=True) # <-- ADD INDEX
    start_time = models.TimeField(null=True, blank=True, verbose_name="Hora de Início")
    end_time = models.TimeField(null=True, blank=True, verbose_name="Hora de Término")
    
    # Metadados
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    original_text = models.TextField(
        blank=True, 
        null=True, 
        verbose_name="Texto Original"
    )
    task_status_after = models.CharField(
        max_length=20,
        choices=[
            ('no_change', 'Sem alteração'),
            ('in_progress', 'Em Progresso'),
            ('completed', 'Concluída')
        ],
        default='no_change',
        verbose_name="Status da Tarefa Após Registro"
    )
    
    # NOVO: Avançar workflow ao registrar tempo
    advance_workflow = models.BooleanField(
        default=False,
        verbose_name="Avançar Workflow"
    )
    workflow_step_completed = models.BooleanField(
        default=False,
        verbose_name="Passo do Workflow Concluído"
    )
    
    objects = TimeEntryManager()
    
    class Meta:
        verbose_name = "Registro de Tempo"
        verbose_name_plural = "Registros de Tempo"
        ordering = ["-date", "-created_at"]
    
    def __str__(self):
        step_info = f" - {self.workflow_step.name}" if self.workflow_step else ""
        return f"{self.client.name} - {self.minutes_spent}min - {self.date}{step_info}"

# NOVO: Modelo para histórico de workflow
class WorkflowHistory(models.Model):
    """
    Histórico de mudanças no workflow de uma tarefa
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='workflow_history',
        verbose_name="Tarefa"
    )
    from_step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history_from',
        verbose_name="Passo Anterior"
    )
    to_step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history_to',
        verbose_name="Passo Seguinte"
    )
    
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='workflow_changes',
        verbose_name="Alterado por"
    )
    
    action = models.CharField(
        max_length=50,
        choices=[
            ('step_started', 'Passo Iniciado'),
            ('step_work_logged', 'Trabalho Registrado no Passo'),  # NEW
            ('step_completed', 'Passo Concluído'),
            ('step_advanced', 'Passo Avançado'),  # NEW - replaces old logic
            ('step_approved', 'Passo Aprovado'),
            ('step_rejected', 'Passo Rejeitado'),
            ('workflow_assigned', 'Workflow Atribuído'),
            ('workflow_completed', 'Workflow Concluído')
        ],
        verbose_name="Ação"
    )
    
    comment = models.TextField(blank=True, null=True, verbose_name="Comentário")
    time_spent_minutes = models.PositiveIntegerField(
        null=True, 
        blank=True,
        verbose_name="Tempo Gasto (minutos)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    
    class Meta:
        verbose_name = "Histórico de Workflow"
        verbose_name_plural = "Históricos de Workflow"
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"{self.task.title} - {self.action} - {self.created_at}"
  
class NotificationSettings(models.Model):
    """
    Configurações de notificação personalizadas por usuário
    """
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='notification_settings'
    )
    
    # Configurações gerais
    email_notifications_enabled = models.BooleanField(default=True)
    push_notifications_enabled = models.BooleanField(default=True)
    
    # Configurações por tipo de notificação
    notify_step_ready = models.BooleanField(default=True)
    notify_step_completed = models.BooleanField(default=True)
    notify_approval_needed = models.BooleanField(default=True)
    notify_approval_completed = models.BooleanField(default=True)
    notify_deadline_approaching = models.BooleanField(default=True)
    notify_manual_advance_needed = models.BooleanField(default=True) 
    notify_task_completed = models.BooleanField(default=True) 
    notify_step_overdue = models.BooleanField(default=True)
    notify_workflow_assigned = models.BooleanField(default=True)
    notify_step_rejected = models.BooleanField(default=True)
    notify_manual_reminders = models.BooleanField(default=True)
    notify_task_assigned_to_you = models.BooleanField(default=True) # NOVO CAMPO
    notify_report_generated = models.BooleanField(default=True) # NEW FIELD


    # Configurações de frequência
    digest_frequency = models.CharField(
        max_length=20,
        choices=[
            ('immediate', 'Imediato'),
            ('hourly', 'A cada hora'),
            ('daily', 'Diário'),
            ('weekly', 'Semanal'),
        ],
        default='immediate'
    )
    
    # Horários para digest
    digest_time = models.TimeField(default='09:00')
    
    # Configurações de deadline
    deadline_days_notice = models.JSONField(
        default=list,
        help_text="Lista de dias antes do deadline para notificar [3, 1, 0]"
    )
    
    # Configurações de passos atrasados
    overdue_threshold_days = models.PositiveIntegerField(default=5)
    
    # Configurações de aprovação
    approval_reminder_days = models.PositiveIntegerField(default=2)
    
    # Quiet hours (horário de silêncio)
    quiet_start_time = models.TimeField(null=True, blank=True)
    quiet_end_time = models.TimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Configurações de Notificação"
        verbose_name_plural = "Configurações de Notificações"
    
    def __str__(self):
        return f"Configurações de {self.user.username}"
    
    def should_notify(self, notification_type):
        """Verifica se deve notificar baseado nas configurações"""
        type_mapping = {
            'step_ready': self.notify_step_ready,
            'step_completed': self.notify_step_completed,
            'approval_needed': self.notify_approval_needed,
            'approval_completed': self.notify_approval_completed,
            'task_completed': self.notify_task_completed,
            'deadline_approaching': self.notify_deadline_approaching,
            'step_overdue': self.notify_step_overdue,
            'workflow_assigned': self.notify_workflow_assigned,
            'step_rejected': self.notify_step_rejected,
            'manual_reminder': self.notify_manual_reminders,
            'manual_advance_needed': self.notify_manual_advance_needed,
            'task_assigned_to_you': self.notify_task_assigned_to_you, # NOVO MAPPING
            'report_generated': self.notify_report_generated, # NEW MAPPING
        }
        return type_mapping.get(notification_type, True)
    
    def is_quiet_time(self):
        """Verifica se está no horário de silêncio"""
        if not self.quiet_start_time or not self.quiet_end_time:
            return False
        
        now_time = timezone.now().time()
        
        if self.quiet_start_time <= self.quiet_end_time:
            # Ex: 22:00 - 08:00 (mesmo dia)
            return self.quiet_start_time <= now_time <= self.quiet_end_time
        else:
            # Ex: 22:00 - 08:00 (atravessa meia-noite)
            return now_time >= self.quiet_start_time or now_time <= self.quiet_end_time
        
class NotificationTemplate(models.Model):
    """
    Templates personalizáveis para diferentes tipos de notificação
    """
    

    logger = logging.getLogger(__name__)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='notification_templates',
        verbose_name="Organização"
    )
    
    notification_type = models.CharField(
        max_length=50,
        choices=WorkflowNotification.NOTIFICATION_TYPES,
        verbose_name="Tipo de Notificação"
    )
    
    name = models.CharField(max_length=100, verbose_name="Nome do Template")
    
    # Templates com variáveis substituíveis
    title_template = models.CharField(
        max_length=200,
        help_text="Use variáveis como {task_title}, {client_name}, {user_name}, {step_name}"
    )
    
    message_template = models.TextField(
        help_text="Template da mensagem com variáveis substituíveis"
    )
    
    # Configurações específicas
    default_priority = models.CharField(
        max_length=10,
        choices=WorkflowNotification.PRIORITY_LEVELS,
        default='normal'
    )
    
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(
        default=False,
        help_text="Template padrão para este tipo de notificação"
    )
    
    # Variáveis disponíveis (para documentação)
    available_variables = models.JSONField(
        default=list,
        help_text="Lista de variáveis disponíveis neste template"
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_templates'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Template de Notificação"
        verbose_name_plural = "Templates de Notificação"
        unique_together = ['organization', 'notification_type', 'is_default']
        ordering = ['notification_type', 'name']
    
    def __str__(self):
        return f"{self.organization.name} - {self.get_notification_type_display()} - {self.name}"
    
    def render(self, context):
        """
        Renderiza o template com as variáveis do contexto
        """
        try:
            title = self.title_template.format(**context)
            message = self.message_template.format(**context)
            return title, message
        except KeyError as e:
            logger.error(f"Variável ausente no template {self.id}: {e}")
            return self.title_template, self.message_template

    @staticmethod
    def get_context_variables(task=None, user=None, workflow_step=None, **kwargs):
        """
        Gera contexto padrão para renderização de forma mais robusta.
        """
        # 1. Initialize with default values to prevent KeyErrors
        context = {
            'user_name': 'Utilizador',
            'user_first_name': 'Utilizador',
            'task_title': 'Tarefa não especificada',
            'client_name': 'Cliente não especificado',
            'step_name': 'Passo não especificado',
            'workflow_name': 'Workflow não especificado',
            'organization_name': 'Organização não especificada',
        }

        # 2. Safely populate from provided objects
        if user:
            context['user_name'] = user.username
            context['user_first_name'] = user.first_name or user.username

        if task:
            context['task_title'] = task.title
            if task.client:
                context['client_name'] = task.client.name
                if task.client.organization:
                    context['organization_name'] = task.client.organization.name

        if workflow_step:
            context['step_name'] = workflow_step.name
            if workflow_step.workflow:
                context['workflow_name'] = workflow_step.workflow.name
        elif task and task.workflow:  # Fallback to get workflow name from task
            context['workflow_name'] = task.workflow.name

        # 3. Add dynamic values like date/time
        now = timezone.now()
        context['current_date'] = now.strftime('%d/%m/%Y')
        context['current_time'] = now.strftime('%H:%M')

        # 4. Update with any extra variables passed in kwargs.
        # This allows for custom context for specific notification types.
        context.update(kwargs)
        
        return context

class NotificationDigest(models.Model):
    """
    Agrupamento de notificações para envio em digest
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notification_digests'
    )
    
    digest_type = models.CharField(
        max_length=20,
        choices=[
            ('hourly', 'Hourly'),
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
        ]
    )
    
    # Período coberto pelo digest
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Notificações incluídas
    notifications = models.ManyToManyField(
        WorkflowNotification,
        related_name='digests'
    )
    
    # Status
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    # Conteúdo do digest
    title = models.CharField(max_length=200)
    content = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Digest de Notificação"
        verbose_name_plural = "Digests de Notificação"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Digest {self.digest_type} - {self.user.username} - {self.period_start.date()}"

class FiscalSystemSettings(models.Model):
    """
    Configurações específicas do sistema fiscal por organização.
    """
    organization = models.OneToOneField(
        'Organization',
        on_delete=models.CASCADE,
        related_name='fiscal_settings',
        verbose_name="Organização"
    )
    
    # Configurações de geração automática
    auto_generation_enabled = models.BooleanField(
        default=True,
        verbose_name="Geração Automática Ativada"
    )
    generation_time = models.TimeField(
        default=timezone.datetime.strptime('08:00', '%H:%M').time(),
        verbose_name="Horário da Geração Automática"
    )
    months_ahead_generation = models.PositiveIntegerField(
        default=3,
        verbose_name="Meses Futuros para Gerar"
    )
    
    # Configurações de limpeza
    auto_cleanup_enabled = models.BooleanField(
        default=True,
        verbose_name="Limpeza Automática Ativada"
    )
    cleanup_days_threshold = models.PositiveIntegerField(
        default=30,
        verbose_name="Dias para Considerar Obsoleto"
    )
    
    # Configurações de notificações
    notify_on_generation = models.BooleanField(
        default=True,
        verbose_name="Notificar ao Gerar"
    )
    notify_on_errors = models.BooleanField(
        default=True,
        verbose_name="Notificar em Erros"
    )
    email_notifications_enabled = models.BooleanField(
        default=True,
        verbose_name="Notificações por Email"
    )
    notification_recipients = models.JSONField(
        default=list,
        verbose_name="Destinatários de Notificação",
        help_text="Lista de emails para receber notificações"
    )
    
    # Configurações de integração
    webhook_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="URL do Webhook",
        help_text="URL para receber notificações via webhook"
    )
    webhook_secret = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Segredo do Webhook"
    )
    
    # Configurações avançadas
    advanced_settings = models.JSONField(
        default=dict,
        verbose_name="Configurações Avançadas",
        help_text="Configurações adicionais em formato JSON"
    )
    
    # Metadados
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_generation = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Última Geração"
    )
    
    class Meta:
        verbose_name = "Configurações do Sistema Fiscal"
        verbose_name_plural = "Configurações do Sistema Fiscal"
    
    def __str__(self):
        return f"Configurações Fiscais - {self.organization.name}"
    
    @classmethod
    def get_for_organization(cls, organization):
        """Obtém ou cria configurações para uma organização."""
        settings, created = cls.objects.get_or_create(
            organization=organization,
            defaults={
                'auto_generation_enabled': True,
                'generation_time': timezone.datetime.strptime('08:00', '%H:%M').time(),
                'months_ahead_generation': 3,
                'auto_cleanup_enabled': True,
                'cleanup_days_threshold': 30,
            }
        )
        return settings
    
    def update_last_generation(self):
        """Atualiza timestamp da última geração."""
        self.last_generation = timezone.now()
        self.save(update_fields=['last_generation'])
    
    def get_notification_recipients(self):
        """Retorna lista de emails para notificação."""
        recipients = list(self.notification_recipients)
        
        # Adicionar admins da organização se não estiver na lista
        org_admins = self.organization.members.filter(
            is_org_admin=True,
            user__is_active=True,
            user__email__isnull=False
        ).exclude(user__email='')
        
        for admin in org_admins:
            if admin.user.email not in recipients:
                recipients.append(admin.user.email)
        
        return recipients
    

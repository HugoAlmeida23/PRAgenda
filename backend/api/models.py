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
    is_active = models.BooleanField(default=True, verbose_name="Ativo")
    
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
    
def generate_four_digit_id():
    """Generate a random 4-digit number (between 1000 and 9999)"""
    return random.randint(1000, 9999)

class Profile(models.Model):
    """
    Armazena os dados do user que está logged
    como o seu preço à hora, a sua responsabilidade, etc
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    
    invitation_code = models.CharField(
        max_length=4, 
        unique=False,
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
        verbose_name="Gestor de Conta"
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
        null=True,  # Definir como null=False após migração de dados existentes
        verbose_name="Organização"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    is_active = models.BooleanField(default=True, verbose_name="Ativo")
    notes = models.TextField(blank=True, null=True, verbose_name="Observações")
    
    fiscal_tags = JSONField(
        default=list, blank=True,
        verbose_name="Tags Fiscais do Cliente",
        help_text="Usado para identificar a que obrigações este cliente está sujeito. Ex: ['EMPRESA', 'IVA_TRIMESTRAL', 'REGIME_GERAL_IRC']"
    )
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
    
    
class NLPProcessor(models.Model):
    """
    Model that stores patterns and entities for natural language processing.
    Used for extracting information from user text inputs.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pattern = models.CharField(max_length=500, verbose_name="Padrão")
    entity_type = models.CharField(max_length=100, verbose_name="Tipo de Entidade")
    confidence = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00'),
        verbose_name="Confiança"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    usage_count = models.PositiveIntegerField(default=0, verbose_name="Contador de Uso")
    
    class Meta:
        verbose_name = "Processador NLP"
        verbose_name_plural = "Processadores NLP"
        ordering = ["-usage_count", "-confidence"]
    
    def __str__(self):
        return f"{self.entity_type}: {self.pattern}"
    
    @classmethod
    def process_text(cls, text, user=None):
        """
        Process a natural language text and extract relevant information.
        
        Args:
            text (str): The text to process
            user (User, optional): The user who created the text
            
        Returns:
            dict: Extracted information including:
                - clients: List of identified client objects
                - categories: List of identified task category objects
                - tasks: List of identified task objects
                - times: List of durations in minutes
                - activities: List of activity descriptions
        """
        import re

        results = {
            'clients': [],
            'categories': [],
            'tasks': [],
            'times': [],
            'activities': [],
            'confidence': 0.0
        }
        
        if not text:
            return results
            
        # This is a simplified implementation - in a real system, this would
        # use more sophisticated NLP techniques or external NLP services
        
        # 1. Find client mentions
        from .models import Client
        clients = Client.objects.filter(is_active=True)
        
        for client in clients:
            # Verifica se o nome do cliente está no texto 
            # (com verificação de palavras completas para evitar falsos positivos)
            client_name_pattern = r'\b' + re.escape(client.name.lower()) + r'\b'
            if re.search(client_name_pattern, text.lower()):
                results['clients'].append(client)
                
        # 2. Find categories
        from .models import TaskCategory
        categories = TaskCategory.objects.all()
        
        for category in categories:
            # Busca categorias no texto
            category_name_pattern = r'\b' + re.escape(category.name.lower()) + r'\b'
            if re.search(category_name_pattern, text.lower()):
                results['categories'].append(category)
        
        # 3. Find tasks related to the identified clients
        from .models import Task
        
        # Se encontramos clientes, buscamos tarefas desses clientes
        if results['clients']:
            tasks = Task.objects.filter(
                client__in=results['clients'], 
                status__in=['pending', 'in_progress']
            )
            
            for task in tasks:
                # Verifica se o título da tarefa está mencionado no texto
                task_title_lower = task.title.lower()
                # Busca tanto o título completo quanto palavras-chave do título
                if task_title_lower in text.lower():
                    results['tasks'].append(task)
                    continue
                
                # Verifica palavras-chave do título da tarefa
                for keyword in task_title_lower.split():
                    if len(keyword) > 3 and keyword in text.lower():  # Ignora palavras muito curtas
                        results['tasks'].append(task)
                        break
        
        # 4. Extract time information using regex
        import re
        
        # Match patterns like "2 hours", "30 minutes", "2h", "30m", "2.5 hours", etc.
        hour_patterns = [
            r'(\d+\.?\d*)\s*hours?',
            r'(\d+\.?\d*)\s*h(?:rs?)?',
            r'(\d+\.?\d*)\s*horas?',  # Padrão em português
        ]
        
        minute_patterns = [
            r'(\d+)\s*minutes?',
            r'(\d+)\s*mins?',
            r'(\d+)\s*m(?:in)?',
            r'(\d+)\s*minutos?',  # Padrão em português
        ]
        
        for pattern in hour_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    hours = float(match)
                    minutes = int(hours * 60)
                    results['times'].append(minutes)
                except ValueError:
                    continue
                    
        for pattern in minute_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    minutes = int(match)
                    results['times'].append(minutes)
                except ValueError:
                    continue
        
        # 5. Extract activities
        # This is highly simplified - in a real implementation, this would use
        # more advanced NLP techniques to identify activities
        
        activity_keywords = [
            "preparation", "review", "meeting", "call", "email", "report",
            "tax", "accounting", "declaration", "invoice", "expense",
            "reconciliation", "payroll", "financial", "statement", "audit",
            "preparação", "revisão", "reunião", "chamada", "email", "relatório",
            "imposto", "contabilidade", "declaração", "fatura", "despesa", 
            "conciliação", "folha de pagamento", "financeiro", "demonstração", "auditoria"
        ]
        
        for keyword in activity_keywords:
            if keyword in text.lower():
                # Find the sentence containing the keyword
                sentences = re.split(r'[.!?]', text)
                for sentence in sentences:
                    if keyword in sentence.lower():
                        results['activities'].append(sentence.strip())
                        break
        
        # If tasks were found, use their titles as activities if no activities were found
        if results['tasks'] and not results['activities']:
            for task in results['tasks']:
                results['activities'].append(f"Trabalho na tarefa: {task.title}")
        
        # Calculate confidence - this is a very simple heuristic
        if (results['clients'] and results['times'] and (results['tasks'] or results['categories'])):
            results['confidence'] = 0.9  # Maior confiança quando temos cliente, tempo e tarefa/categoria
        elif results['clients'] and results['times']:
            results['confidence'] = 0.8
        elif results['clients'] or results['times']:
            results['confidence'] = 0.5
        else:
            results['confidence'] = 0.2
            
        # Increment usage count for matching patterns
        for pattern in cls.objects.filter(entity_type__in=['client', 'category', 'time']):
            if re.search(pattern.pattern, text, re.IGNORECASE):
                pattern.usage_count += 1
                pattern.save()
        
        return results
        
    @staticmethod
    def create_time_entries_from_text(text, user, client_id=None, date=None, task_id=None):
        """
        Create TimeEntry objects based on natural language text.
        
        Args:
            text (str): The natural language description
            user (User): The user creating the entry
            client_id (UUID, optional): Default client if not detected in text
            date (date, optional): The date for the entry, defaults to today
            task_id (UUID, optional): Default task if provided
            
        Returns:
            list: Created TimeEntry objects
        """
        from .models import TimeEntry, Client, Task
        
        if not date:
            date = timezone.now().date()
            
        # Process the text
        results = NLPProcessor.process_text(text, user)
        created_entries = []
        
        # If task_id is provided, use that task
        selected_task = None
        if task_id:
            try:
                selected_task = Task.objects.get(id=task_id)
                # Adiciona a tarefa aos resultados se ainda não estiver lá
                if selected_task not in results['tasks']:
                    results['tasks'].append(selected_task)
                    
                # Se a tarefa tem um cliente, usamos esse cliente
                if selected_task.client and selected_task.client not in results['clients']:
                    results['clients'].append(selected_task.client)
            except Task.DoesNotExist:
                pass
        
        # If no clients found in text but a default is provided
        if not results['clients'] and client_id:
            try:
                default_client = Client.objects.get(id=client_id)
                results['clients'] = [default_client]
            except Client.DoesNotExist:
                pass
                
        # If no time found, use a default of 1 hour
        if not results['times']:
            results['times'] = [60]  # 60 minutes = 1 hour
            
        # If no activities found, use the original text
        if not results['activities']:
            results['activities'] = [text]
        
        # Create time entries
        # Behavior changes based on whether we have tasks identified
        if results['tasks']:
            # Se encontramos tarefas, criamos entradas de tempo para cada tarefa
            for i, task in enumerate(results['tasks']):
                # Para cada tarefa, usamos o tempo correspondente ou o primeiro tempo
                if i < len(results['times']):
                    minutes = results['times'][i]
                else:
                    minutes = results['times'][0]
                    
                # Usamos a descrição correspondente ou o texto original
                if i < len(results['activities']):
                    description = results['activities'][i]
                else:
                    description = f"Trabalho na tarefa: {task.title}"
                    
                # Criamos a entrada de tempo com o cliente e categoria da tarefa
                entry = TimeEntry.objects.create(
                    user=user,
                    client=task.client,
                    task=task,
                    category=task.category,
                    minutes_spent=minutes,
                    description=description,
                    date=date,
                    original_text=text
                )
                created_entries.append(entry)
                
        elif len(results['clients']) > 1 and len(results['times']) > 1:
            # Se não temos tarefas mas temos múltiplos clientes e tempos
            for i, client in enumerate(results['clients']):
                if i < len(results['times']):
                    minutes = results['times'][i]
                else:
                    minutes = results['times'][0]
                    
                if i < len(results['activities']):
                    description = results['activities'][i]
                else:
                    description = text
                    
                # Usar a categoria se encontrada
                category = results['categories'][i] if i < len(results['categories']) else None
                    
                # Criar a entrada
                entry = TimeEntry.objects.create(
                    user=user,
                    client=client,
                    category=category,
                    minutes_spent=minutes,
                    description=description,
                    date=date,
                    original_text=text
                )
                created_entries.append(entry)
        else:
            # Caso mais simples: um cliente ou um tempo
            client = results['clients'][0] if results['clients'] else None
            minutes = results['times'][0] if results['times'] else 60
            description = results['activities'][0] if results['activities'] else text
            category = results['categories'][0] if results['categories'] else None
            
            if client:
                entry = TimeEntry.objects.create(
                    user=user,
                    client=client,
                    category=category,
                    minutes_spent=minutes,
                    description=description,
                    date=date,
                    original_text=text
                )
                created_entries.append(entry)
                
        return created_entries
      
class WorkflowStep(models.Model):
    """
    Defines a step within a workflow.
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
    next_steps = models.ManyToManyField(
        'self',
        symmetrical=False,
        related_name='previous_steps_rel', # Use a different related_name to avoid clash
        blank=True,
        verbose_name="Próximos Passos"
    )
    previous_steps = models.JSONField(
        default=list, 
        verbose_name="Passos Anteriores", 
        help_text="List of possible previous step IDs"
    )
    
    class Meta:
        verbose_name = "Passo de Fluxo de Trabalho"
        verbose_name_plural = "Passos de Fluxo de Trabalho"
        ordering = ["workflow", "order"]
        unique_together = ["workflow", "order"]
    
    def __str__(self):
        return f"{self.workflow.name} - {self.name}"

    def clean(self):
        """Validate next_steps and previous_steps are proper lists"""
        super().clean()
        
        # Validate next_steps
        if self.next_steps:
            if isinstance(self.next_steps, str):
                try:
                    self.next_steps = json.loads(self.next_steps)
                except json.JSONDecodeError:
                    raise ValidationError("next_steps must be valid JSON array")
            
            if not isinstance(self.next_steps, list):
                raise ValidationError("next_steps must be a list")
        
        # Validate previous_steps
        if self.previous_steps:
            if isinstance(self.previous_steps, str):
                try:
                    self.previous_steps = json.loads(self.previous_steps)
                except json.JSONDecodeError:
                    raise ValidationError("previous_steps must be valid JSON array")
            
            if not isinstance(self.previous_steps, list):
                raise ValidationError("previous_steps must be a list")
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def get_next_steps(self):
        """Returns next_steps as a list of step IDs"""
        if isinstance(self.next_steps, str):
            try:
                return json.loads(self.next_steps) if self.next_steps else []
            except json.JSONDecodeError:
                return []
        elif isinstance(self.next_steps, list):
            return self.next_steps
        else:
            return []
    
    def get_previous_steps(self):
        """Returns previous_steps as a list of step IDs"""
        if isinstance(self.previous_steps, str):
            try:
                return json.loads(self.previous_steps) if self.previous_steps else []
            except json.JSONDecodeError:
                return []
        elif isinstance(self.previous_steps, list):
            return self.previous_steps
        else:
            return []



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
    Tarefas a serem realizadas para os clientes.
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
        verbose_name="Cliente"
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
        related_name='assigned_tasks',
        verbose_name="Atribuído a"
    )
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='created_tasks',
        verbose_name="Criado por"
    )
    
    # Status e prioridade
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        verbose_name="Status"
    )
    priority = models.IntegerField(
        choices=PRIORITY_CHOICES, 
        default=3,
        verbose_name="Prioridade"
    )
    
    # Datas
    deadline = models.DateTimeField(blank=True, null=True, verbose_name="Prazo")
    estimated_time_minutes = models.PositiveIntegerField(
        blank=True, 
        null=True,
        verbose_name="Tempo Estimado (minutos)"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    completed_at = models.DateTimeField(blank=True, null=True, verbose_name="Concluída em")
    workflow = models.ForeignKey(
        WorkflowDefinition,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
        verbose_name="Fluxo de Trabalho"
    )
    current_workflow_step = models.ForeignKey(
        WorkflowStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_tasks',
        verbose_name="Passo Atual do Fluxo"
    )
    workflow_comment = models.TextField(
        blank=True,
        null=True,
        verbose_name="Comentário do Fluxo"
    )

    source_fiscal_obligation = models.ForeignKey(
        'FiscalObligationDefinition',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='generated_tasks',
        verbose_name="Origem da Obrigação Fiscal"
    )
    obligation_period_key = models.CharField(
        max_length=50, null=True, blank=True, # Ex: "2024-Q1", "2024-M01"
        verbose_name="Chave do Período da Obrigação",
        help_text="Identificador único para o período desta obrigação (ex: ANO-TRIMESTRE)"
    )

    class Meta:
        verbose_name = "Tarefa"
        verbose_name_plural = "Tarefas"
        ordering = ["priority", "deadline"]
        unique_together = [['client', 'source_fiscal_obligation', 'obligation_period_key']] # Evitar duplicados

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

    # ==============================================================================
    #  NEW MODEL METHODS: Logic moved from serializer for performance and SRP
    # ==============================================================================
    def get_workflow_progress_data(self):
        """
        Calcula o progresso do workflow de forma eficiente.
        Esta lógica foi movida do TaskSerializer para o modelo.
        """
        if not self.workflow:
            return None

        # Usar prefetch_related para otimizar. O ViewSet deve prefetch 'workflow__steps'
        try:
            # Check if steps are already prefetched
            if hasattr(self.workflow, '_prefetched_objects_cache') and 'steps' in self.workflow._prefetched_objects_cache:
                all_steps = self.workflow.steps.all()
            else:
                # Fallback to query if not prefetched (less optimal but safe)
                all_steps = self.workflow.steps.order_by('order')
        except WorkflowDefinition.steps.RelatedObjectDoesNotExist:
             all_steps = []

        total_steps = len(all_steps)
        if total_steps == 0:
            return {'current_step': 0, 'completed_steps': 0, 'total_steps': 0, 'percentage': 0, 'is_completed': False}
        
        # O histórico deve ser pré-carregado no queryset da view para máxima eficiência
        # Aqui, estamos assumindo que `workflow_history` foi pré-carregado no objeto `task`
        task_history = self.workflow_history.all() if hasattr(self, 'workflow_history') else []

        workflow_completed = any(h.action == 'workflow_completed' for h in task_history)

        if workflow_completed:
            completed_count = total_steps
            current_step_number = total_steps
            percentage = 100.0
        elif self.current_workflow_step:
            current_order = self.current_workflow_step.order
            completed_step_ids = {h.from_step_id for h in task_history if h.action in ['step_completed', 'step_advanced'] and h.from_step_id}
            
            # Adicionar todos os passos anteriores ao atual como concluídos
            for step in all_steps:
                if step.order < current_order:
                    completed_step_ids.add(step.id)

            completed_count = len(completed_step_ids)
            current_step_number = current_order
            percentage = (completed_count / total_steps) * 100 if total_steps > 0 else 0
        else: # Workflow não iniciado ou concluído sem passo atual
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
            return []
            
        try:
            next_step_ids = self.current_workflow_step.get_next_steps()
            
            # Para otimizar, o ViewSet deve fazer prefetch de workflow.steps.
            # Desta forma, não atingimos a BD aqui.
            if hasattr(self.workflow, '_prefetched_objects_cache') and 'steps' in self.workflow._prefetched_objects_cache:
                all_steps = self.workflow.steps.all()
                next_steps = [s for s in all_steps if str(s.id) in next_step_ids or s.id in next_step_ids]
            else:
                # Fallback (menos eficiente)
                next_steps = WorkflowStep.objects.filter(id__in=next_step_ids)

            return [{'id': str(step.id), 'name': step.name, 'assign_to': step.assign_to.username if step.assign_to else None} 
                    for step in next_steps]
        except Exception:
            # Captura erros de JSON ou outros problemas
            return []
 
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
    is_active = models.BooleanField(default=True, verbose_name="Definição Ativa")
    organization = models.ForeignKey( # Uma definição pode ser global (org=null) ou específica de uma org
        Organization,
        on_delete=models.CASCADE,
        related_name='fiscal_obligation_definitions',
        verbose_name="Organização",
        null=True, blank=True
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
        verbose_name="Usuário"
    )
    client = models.ForeignKey(
        Client, 
        on_delete=models.CASCADE, 
        related_name='time_entries',
        verbose_name="Cliente"
    )
    task = models.ForeignKey(
        Task, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='time_entries',
        verbose_name="Tarefa"
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
    date = models.DateField(default=timezone.now, verbose_name="Data")
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
    
    class Meta:
        verbose_name = "Registro de Tempo"
        verbose_name_plural = "Registros de Tempo"
        ordering = ["-date", "-created_at"]
    
    def __str__(self):
        step_info = f" - {self.workflow_step.name}" if self.workflow_step else ""
        return f"{self.client.name} - {self.minutes_spent}min - {self.date}{step_info}"

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
        ('workflow_completed', 'Workflow Concluído'),
        ('deadline_approaching', 'Prazo Próximo'),
        ('step_overdue', 'Passo Atrasado'),
        ('manual_reminder', 'Lembrete Manual'),
        ('workflow_assigned', 'Workflow Atribuído'),
        ('step_rejected', 'Passo Rejeitado'),
        ('manual_advance_needed', 'Avanço Manual Necessário'),
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
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='workflow_notifications',
        verbose_name="Tarefa"
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
        verbose_name="Tipo de Notificação"
    )
    
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_LEVELS,
        default='normal',
        verbose_name="Prioridade"
    )
    
    title = models.CharField(max_length=200, verbose_name="Título")
    message = models.TextField(verbose_name="Mensagem")
    
    # Campos de estado
    is_read = models.BooleanField(default=False, verbose_name="Lida")
    is_archived = models.BooleanField(default=False, verbose_name="Arquivada")
    email_sent = models.BooleanField(default=False, verbose_name="Email Enviado")
    
    # Campos de timing
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    read_at = models.DateTimeField(null=True, blank=True, verbose_name="Lida em")
    scheduled_for = models.DateTimeField(null=True, blank=True, verbose_name="Agendada para")
    
    # Metadados adicionais
    metadata = models.JSONField(
        default=dict, 
        verbose_name="Metadados",
        help_text="Dados adicionais da notificação"
    )
    
    # Quem criou a notificação (para notificações manuais)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_notifications',
        verbose_name="Criado por"
    )
    
    class Meta:
        verbose_name = "Notificação de Workflow"
        verbose_name_plural = "Notificações de Workflow"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['task', 'notification_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"
    
    def mark_as_read(self):
        """Marca a notificação como lida"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def mark_as_unread(self):
        """Marca a notificação como não lida"""
        if self.is_read:
            self.is_read = False
            self.read_at = None
            self.save(update_fields=['is_read', 'read_at'])
    
    def archive(self):
        """Arquiva a notificação"""
        self.is_archived = True
        self.save(update_fields=['is_archived'])


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
    notify_manual_advance_needed = models.BooleanField(default=True)
    notify_workflow_completed = models.BooleanField(default=True)
    notify_deadline_approaching = models.BooleanField(default=True)
    notify_step_overdue = models.BooleanField(default=True)
    notify_workflow_assigned = models.BooleanField(default=True)
    notify_step_rejected = models.BooleanField(default=True)
    notify_manual_reminders = models.BooleanField(default=True)
    
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
            'workflow_completed': self.notify_workflow_completed,
            'deadline_approaching': self.notify_deadline_approaching,
            'step_overdue': self.notify_step_overdue,
            'workflow_assigned': self.notify_workflow_assigned,
            'step_rejected': self.notify_step_rejected,
            'manual_reminder': self.notify_manual_reminders,
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
    import logging

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
    
    def get_context_variables(self, task=None, user=None, workflow_step=None, **kwargs):
        """
        Gera contexto padrão para renderização
        """
        context = {
            'user_name': user.username if user else '',
            'user_first_name': user.first_name if user else '',
            'task_title': task.title if task else '',
            'client_name': task.client.name if task and task.client else '',
            'step_name': workflow_step.name if workflow_step else '',
            'workflow_name': workflow_step.workflow.name if workflow_step and workflow_step.workflow else '',
            'organization_name': task.client.organization.name if task and task.client and task.client.organization else '',
            'current_date': timezone.now().strftime('%d/%m/%Y'),
            'current_time': timezone.now().strftime('%H:%M'),
        }
        
        # Adicionar variáveis extras do kwargs
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


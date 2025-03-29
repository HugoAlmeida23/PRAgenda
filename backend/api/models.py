from django.db import models
from django.contrib.auth.models import User
import uuid
from django.utils import timezone
from decimal import Decimal
from django.db.models import JSONField

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
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    is_active = models.BooleanField(default=True, verbose_name="Ativo")
    notes = models.TextField(blank=True, null=True, verbose_name="Observações")
    
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

    class Meta:
        verbose_name = "Tarefa"
        verbose_name_plural = "Tarefas"
        ordering = ["priority", "deadline"]
    
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
    )  # Para guardar o texto natural inserido pelo usuário
    
    class Meta:
        verbose_name = "Registro de Tempo"
        verbose_name_plural = "Registros de Tempo"
        ordering = ["-date", "-created_at"]
    
    def __str__(self):
        return f"{self.client.name} - {self.minutes_spent}min - {self.date}"
    
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
    
class Profile(models.Model):
    """
    Armaneza os dados do user que está logged
    como o seu preço à hora, a sua responsabilidade, etc
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    from decimal import Decimal
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), verbose_name="Preço à Hora")
    role = models.CharField(max_length=100, verbose_name="Função")
    access_level = models.CharField(max_length=100, verbose_name="Nível de Acesso")
    phone = models.CharField(max_length=100, blank=True, verbose_name="Telefone")
    productivity_metrics = JSONField(
        default=dict, 
        verbose_name="Métricas de Produtividade"
    )

    class Meta:
        verbose_name = "Perfil"
        verbose_name_plural = "Perfis"

    def __str__(self):
        return f"{self.user.username} - {self.role}"
    
    
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

        
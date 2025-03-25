
    class User {
        +username: string
        +email: string
        +password: string
        +is_active: boolean
        +date_joined: datetime
    }
    
    class Profile {
        +user: User
        +hourly_rate: decimal
        +role: string
        +access_level: string
        +phone: string
        +photo: string
        +productivity_metrics: JSON
        +notification_preferences: JSON
    }
    
    class Client {
        +id: UUID
        +name: string
        +nif: string
        +email: string
        +phone: string
        +address: string
        +monthly_fee: decimal
        +is_active: boolean
        +account_manager: User
        +notes: text
        +created_at: datetime
        +updated_at: datetime
    }
    
    class TaskCategory {
        +id: UUID
        +name: string
        +description: text
        +color: string
        +average_time_minutes: integer
        +created_at: datetime
    }
    
    class Task {
        +id: UUID
        +title: string
        +description: text
        +client: Client
        +category: TaskCategory
        +assigned_to: User
        +created_by: User
        +status: string
        +priority: integer
        +automated_priority: integer
        +deadline: datetime
        +estimated_time_minutes: integer
        +created_at: datetime
        +updated_at: datetime
        +completed_at: datetime
        +requires_approval: boolean
        +approved_by: User
        +approval_date: datetime
        +is_recurring: boolean
        +recurrence_pattern: JSON
        +calculate_profitability()
    }
    
    class WorkflowDefinition {
        +id: UUID
        +name: string
        +description: text
        +created_by: User
        +created_at: datetime
        +updated_at: datetime
        +is_active: boolean
    }
    
    class WorkflowStep {
        +id: UUID
        +workflow: WorkflowDefinition
        +name: string
        +order: integer
        +assign_to: User
        +requires_approval: boolean
        +approver_role: string
        +next_steps: JSON
        +previous_steps: JSON
    }
    
    class TimeEntry {
        +id: UUID
        +user: User
        +client: Client
        +task: Task
        +category: TaskCategory
        +description: text
        +minutes_spent: integer
        +date: date
        +start_time: time
        +end_time: time
        +created_at: datetime
        +original_text: text
        +monetary_value: decimal
        +is_auto_tracked: boolean
        +source: string
        +confidence_score: decimal
    }
    
    class AutoTimeTracking {
        +id: UUID
        +user: User
        +start_time: datetime
        +end_time: datetime
        +activity_data: JSON
        +processed: boolean
        +converted_to_entries: JSON
    }
    
    class Document {
        +id: UUID
        +name: string
        +file_path: string
        +file_type: string
        +client: Client
        +task: Task
        +uploaded_by: User
        +upload_date: datetime
        +description: text
        +is_processed: boolean
        +extracted_data: JSON
        +source: string
    }
    
    class Expense {
        +id: UUID
        +amount: decimal
        +description: text
        +category: string
        +date: date
        +client: Client
        +created_by: User
        +created_at: datetime
        +is_auto_categorized: boolean
        +source: string
    }
    
    class ClientProfitability {
        +id: UUID
        +client: Client
        +year: integer
        +month: integer
        +total_time_minutes: integer
        +time_cost: decimal
        +total_expenses: decimal
        +monthly_fee: decimal
        +profit: decimal
        +profit_margin: decimal
        +is_profitable: boolean
        +last_updated: datetime
        +projected_next_month: JSON
        +trend_analysis: JSON
        +calculate_profit()
    }
    
    class TeamWorkload {
        +id: UUID
        +user: User
        +date: date
        +planned_minutes: integer
        +actual_minutes: integer
        +task_count: integer
        +completion_rate: decimal
        +overload_risk: decimal
        +calculate_capacity()
    }
    
    class SystemSettings {
        +id: UUID
        +setting_key: string
        +setting_value: text
        +description: text
        +get_value()
    }
    
    class Notification {
        +id: UUID
        +user: User
        +title: string
        +message: text
        +notification_type: string
        +created_at: datetime
        +read: boolean
        +read_at: datetime
        +delivery_channels: JSON
        +related_client: Client
        +related_task: Task
        +mark_as_read()
        +send()
    }
    
    class NLPProcessor {
        +id: UUID
        +pattern: string
        +entity_type: string
        +confidence: decimal
        +created_at: datetime
        +updated_at: datetime
        +usage_count: integer
        +process_text()
    }
    
    class AIInsight {
        +id: UUID
        +user: User
        +client: Client
        +task: Task
        +insight_type: string
        +suggestion: text
        +confidence: decimal
        +created_at: datetime
        +acted_upon: boolean
        +feedback: string
    }
    
    class Report {
        +id: UUID
        +name: string
        +description: text
        +report_type: string
        +parameters: JSON
        +created_by: User
        +created_at: datetime
        +schedule: JSON
        +recipients: JSON
        +last_generated: datetime
        +file_path: string
        +generate()
        +send()
    }
    
    class IntegrationChannel {
        +id: UUID
        +name: string
        +channel_type: string
        +credentials: JSON
        +is_active: boolean
        +created_at: datetime
        +updated_at: datetime
        +configuration: JSON
        +process_incoming()
        +send_outgoing()
    }
    
    class ActivityLog {
        +id: UUID
        +user: User
        +action: string
        +model_name: string
        +object_id: string
        +timestamp: datetime
        +description: text
        +old_values: JSON
        +new_values: JSON
    }
    
    User "1" -- "1" Profile
    User "1" -- "0..*" TimeEntry
    User "1" -- "0..*" Task : created_by
    User "1" -- "0..*" Task : assigned_to
    User "1" -- "0..*" Document : uploaded_by
    User "1" -- "0..*" Expense : created_by
    User "1" -- "0..*" Notification
    User "1" -- "0..*" TeamWorkload
    User "1" -- "0..*" AIInsight
    User "1" -- "0..*" Report : created_by
    User "1" -- "0..*" ActivityLog
    User "1" -- "0..*" AutoTimeTracking
    
    Client "1" -- "0..*" Task
    Client "1" -- "0..*" TimeEntry
    Client "1" -- "0..*" Document
    Client "1" -- "0..*" Expense
    Client "1" -- "0..*" ClientProfitability
    Client "1" -- "0..*" AIInsight
    Client "1" -- "0..*" Report
    Client "1" -- "0..*" Notification : related_client
    
    TaskCategory "1" -- "0..*" Task
    TaskCategory "1" -- "0..*" TimeEntry
    
    Task "1" -- "0..*" TimeEntry
    Task "1" -- "0..*" Document
    Task "1" -- "0..*" AIInsight
    Task "1" -- "0..*" Notification : related_task
    Task "0..*" -- "0..*" WorkflowStep : current_tasks
    
    WorkflowDefinition "1" -- "0..*" WorkflowStep
    WorkflowDefinition "1" -- "0..*" Task : follows_workflow
    
    IntegrationChannel "1" -- "0..*" TimeEntry : source_channel
    IntegrationChannel "1" -- "0..*" Document : source_channel
    IntegrationChannel "1" -- "0..*" Notification : delivery_channel
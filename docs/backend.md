# PRAgenda Backend API Documentation

## Overview

This document describes the full backend API for PRAgenda, including all endpoints, models, authentication, and features. It is strictly descriptive of the current implementation.

---

## Authentication

- **JWT Authentication** using `rest_framework_simplejwt`.
    - `POST /api/token/` — Obtain JWT token pair.
    - `POST /api/token/refresh/` — Refresh JWT access token.
- **User Registration**
    - `POST /api/register/` — Register a new user.

---

## Main Resources & Endpoints

### Profiles
- `GET /api/profiles/` — List profiles
- `POST /api/profiles/` — Create profile
- `GET /api/profiles/{id}/` — Retrieve profile
- `PUT/PATCH /api/profiles/{id}/` — Update profile
- `DELETE /api/profiles/{id}/` — Delete profile
- `GET /api/profiles/my_settings/` — Get current user's profile settings

### Clients
- `GET /api/clients/` — List clients
- `POST /api/clients/` — Create client
- `GET /api/clients/{id}/` — Retrieve client
- `PUT/PATCH /api/clients/{id}/` — Update client
- `DELETE /api/clients/{id}/` — Delete client
- `PATCH /api/clients/{id}/toggle_status/` — Toggle client active status

### Organizations
- `GET /api/organizations/` — List organizations
- `POST /api/organizations/` — Create organization
- `GET /api/organizations/{id}/` — Retrieve organization
- `PUT/PATCH /api/organizations/{id}/` — Update organization
- `DELETE /api/organizations/{id}/` — Delete organization
- `GET /api/organizations/{id}/members/` — List organization members
- `GET /api/organizations/{id}/clients/` — List organization clients
- `POST /api/organizations/{id}/add_member_by_code/` — Add member by invitation code
- `POST /api/organizations/{id}/remove_member/` — Remove member
- `POST /api/organizations/{id}/update_member/` — Update member
- `POST /api/organizations/{id}/dismiss/` — Dismiss member
- `POST /api/organizations/{id}/mark_acted/` — Mark member as acted

### Tasks
- `GET /api/tasks/` — List tasks
- `POST /api/tasks/` — Create task
- `GET /api/tasks/{id}/` — Retrieve task
- `PUT/PATCH /api/tasks/{id}/` — Update task
- `DELETE /api/tasks/{id}/` — Delete task
- `GET /api/tasks/{id}/workflow_status/` — Get workflow status
- `POST /api/tasks/{id}/assign_users/` — Assign users to task
- `GET /api/tasks/assignment_suggestions/` — Get assignment suggestions
- `GET /api/tasks/my_assignments/` — List tasks assigned to current user

### Task Categories
- `GET /api/task-categories/` — List task categories
- `POST /api/task-categories/` — Create task category
- `GET /api/task-categories/{id}/` — Retrieve task category
- `PUT/PATCH /api/task-categories/{id}/` — Update task category
- `DELETE /api/task-categories/{id}/` — Delete task category

### Time Entries
- `GET /api/time-entries/` — List time entries
- `POST /api/time-entries/` — Create time entry
- `GET /api/time-entries/{id}/` — Retrieve time entry
- `PUT/PATCH /api/time-entries/{id}/` — Update time entry
- `DELETE /api/time-entries/{id}/` — Delete time entry
- `POST /api/time-entries/bulk_create/` — Bulk create time entries

### Expenses
- `GET /api/expenses/` — List expenses
- `POST /api/expenses/` — Create expense
- `GET /api/expenses/{id}/` — Retrieve expense
- `PUT/PATCH /api/expenses/{id}/` — Update expense
- `DELETE /api/expenses/{id}/` — Delete expense

### Client Profitability
- `GET /api/client-profitability/` — List client profitability records

### Auto Time Tracking
- `GET /api/auto-time-tracking/` — List auto time tracking records
- `POST /api/auto-time-tracking/` — Create auto time tracking record

### Workflow Definitions & Steps
- `GET /api/workflow-definitions/` — List workflow definitions
- `POST /api/workflow-definitions/` — Create workflow definition
- `GET /api/workflow-definitions/{id}/` — Retrieve workflow definition
- `PUT/PATCH /api/workflow-definitions/{id}/` — Update workflow definition
- `DELETE /api/workflow-definitions/{id}/` — Delete workflow definition
- `GET /api/workflow-definitions/{id}/analyze/` — Analyze workflow definition
- `POST /api/workflow-definitions/{id}/assign_to_task/` — Assign workflow to task

- `GET /api/workflow-steps/` — List workflow steps
- `POST /api/workflow-steps/` — Create workflow step
- `GET /api/workflow-steps/{id}/` — Retrieve workflow step
- `PUT/PATCH /api/workflow-steps/{id}/` — Update workflow step
- `DELETE /api/workflow-steps/{id}/` — Delete workflow step

- `GET /api/workflow-step-details/` — List workflow step details
- `GET /api/workflow-step-details/{id}/` — Retrieve workflow step detail
- `GET /api/workflow-step-details/{id}/time_entries/` — List time entries for step
- `GET /api/workflow-step-details/{id}/current_tasks/` — List current tasks for step

### Task Approvals
- `GET /api/task-approvals/` — List task approvals
- `POST /api/task-approvals/` — Create task approval
- `GET /api/task-approvals/{id}/` — Retrieve task approval
- `PUT/PATCH /api/task-approvals/{id}/` — Update task approval
- `DELETE /api/task-approvals/{id}/` — Delete task approval

### Workflow Notifications
- `GET /api/workflow-notifications/` — List notifications
- `POST /api/workflow-notifications/` — Create notification
- `GET /api/workflow-notifications/{id}/` — Retrieve notification
- `PUT/PATCH /api/workflow-notifications/{id}/` — Update notification
- `DELETE /api/workflow-notifications/{id}/` — Delete notification
- `GET /api/workflow-notifications/summary_stats/` — Get notification summary stats
- `POST /api/workflow-notifications/{id}/mark_as_read/` — Mark notification as read
- `POST /api/workflow-notifications/{id}/mark_as_unread/` — Mark notification as unread
- `POST /api/workflow-notifications/mark_all_as_read/` — Mark all as read
- `GET /api/workflow-notifications/unread_count/` — Get unread notification count
- `POST /api/workflow-notifications/{id}/archive/` — Archive notification
- `POST /api/workflow-notifications/create_manual_reminder/` — Create manual reminder

### Notification Settings
- `GET /api/notification-settings/` — List notification settings
- `POST /api/notification-settings/` — Create notification settings
- `GET /api/notification-settings/{id}/` — Retrieve notification settings
- `PUT/PATCH /api/notification-settings/{id}/` — Update notification settings
- `DELETE /api/notification-settings/{id}/` — Delete notification settings
- `GET /api/notification-settings/my_settings/` — Get current user's notification settings
- `PATCH /api/notification-settings/update_settings/` — Update current user's notification settings
- `POST /api/notification-settings/reset_to_defaults/` — Reset notification settings to defaults

### Notification Templates
- `GET /api/notification-templates/` — List notification templates
- `POST /api/notification-templates/` — Create notification template
- `GET /api/notification-templates/{id}/` — Retrieve notification template
- `PUT/PATCH /api/notification-templates/{id}/` — Update notification template
- `DELETE /api/notification-templates/{id}/` — Delete notification template
- `GET /api/notification-templates/available_types/` — List available notification types
- `POST /api/notification-templates/{id}/preview/` — Preview notification template
- `POST /api/notification-templates/create_defaults/` — Create default templates

### Notification Digests
- `GET /api/notification-digests/` — List notification digests
- `GET /api/notification-digests/{id}/` — Retrieve notification digest
- `POST /api/notification-digests/generate_digest/` — Generate notification digest

### Fiscal Obligation Definitions
- `GET /api/fiscal-obligation-definitions/` — List fiscal obligation definitions
- `POST /api/fiscal-obligation-definitions/` — Create fiscal obligation definition
- `GET /api/fiscal-obligation-definitions/{id}/` — Retrieve fiscal obligation definition
- `PUT/PATCH /api/fiscal-obligation-definitions/{id}/` — Update fiscal obligation definition
- `DELETE /api/fiscal-obligation-definitions/{id}/` — Delete fiscal obligation definition

### Fiscal System Settings
- `GET /api/fiscal-system-settings/` — List fiscal system settings
- `POST /api/fiscal-system-settings/` — Create fiscal system settings
- `GET /api/fiscal-system-settings/{id}/` — Retrieve fiscal system settings
- `PUT/PATCH /api/fiscal-system-settings/{id}/` — Update fiscal system settings
- `DELETE /api/fiscal-system-settings/{id}/` — Delete fiscal system settings
- `GET /api/fiscal-system-settings/my_settings/` — Get current user's fiscal system settings
- `PATCH /api/fiscal-system-settings/update_settings/` — Update fiscal system settings
- `POST /api/fiscal-system-settings/test_webhook/` — Test webhook
- `POST /api/fiscal-system-settings/send_test_email/` — Send test email

### Generated Reports
- `GET /api/generated-reports/` — List generated reports
- `GET /api/generated-reports/{id}/` — Retrieve generated report

### SAFT Files
- `GET /api/saft-files/` — List SAFT files
- `POST /api/saft-files/` — Upload SAFT file
- `GET /api/saft-files/{id}/` — Retrieve SAFT file
- `DELETE /api/saft-files/{id}/` — Delete SAFT file
- `GET /api/saft-files/{id}/details/` — Get SAFT file details

### Invoice Batches & Scanned Invoices
- `GET /api/invoice-batches/` — List invoice batches
- `POST /api/invoice-batches/` — Create invoice batch
- `GET /api/invoice-batches/{id}/` — Retrieve invoice batch
- `POST /api/invoice-batches/{id}/create_batch_tasks/` — Create tasks for batch
- `GET /api/invoice-batches/{id}/batch_status/` — Get batch status
- `GET /api/invoice-batches/{id}/generate_excel/` — Generate Excel for batch

- `GET /api/scanned-invoices/` — List scanned invoices
- `POST /api/scanned-invoices/` — Create scanned invoice
- `GET /api/scanned-invoices/{id}/` — Retrieve scanned invoice
- `PATCH /api/scanned-invoices/{id}/` — Update scanned invoice

### Organization Action Logs
- `GET /api/action-logs/` — List organization action logs
- `GET /api/action-logs/{id}/` — Retrieve action log

---

## Custom Function-Based Endpoints

- `GET /api/dashboard-summary/` — Get dashboard summary
- `POST /api/update-profitability/` — Update organization profitability
- `GET /api/time-entry-context/` — Get time entry context
- `GET /api/notification-stats/` — Get notification stats
- `GET /api/organization-notification-stats/` — Get organization notification stats
- `GET /api/workflow-notification-performance/` — Get workflow notification performance
- `GET /api/reports/notifications/` — Get notification reports
- `GET /api/reports/workflow-efficiency/` — Get workflow efficiency report
- `POST /api/system/trigger-escalation/` — Trigger escalation check
- `POST /api/system/generate-daily-digests/` — Generate daily digests
- `POST /api/system/send-pending-digests/` — Send pending digests
- `POST /api/fiscal/generate-manual/` — Manually generate fiscal obligations
- `GET /api/fiscal/stats/` — Get fiscal obligations stats
- `POST /api/fiscal/test-client/` — Test client fiscal obligations
- `GET /api/fiscal/upcoming-deadlines/` — Get upcoming fiscal deadlines
- `GET /api/ai-advisor/get-initial-context/` — Get AI advisor initial context
- `POST /api/ai-advisor/start-session/` — Start AI advisor session
- `POST /api/ai-advisor/query/` — Query AI advisor
- `POST /api/reports/generate/` — Generate report
- `GET /api/reports/context/` — Get report generation context
- `GET /api/reports/download/{report_id}/` — Download report

---

## Models

### User, Profile, Organization
- **User**: Standard Django user model.
- **Profile**: Extends user with organization, permissions, hourly rate, role, access level, phone, productivity metrics, admin flags, and notification settings.
- **Organization**: Name, description, address, phone, email, logo, subscription plan, max users, settings, created/updated timestamps, is_active.

### Client
- Name, NIF, email, phone, address, account manager, organization, monthly fee, churn risk, created/updated timestamps, is_active, notes, financial health score, compliance risks, revenue opportunities, fiscal tags.

### Task & TaskCategory
- **Task**: Title, description, client, category, assigned_to, collaborators, created_by, status, priority, deadline, estimated time, workflow, workflow step assignments, notifications, etc.
- **TaskCategory**: Name, description, color, average time, created_at.

### TimeEntry
- User, client, task, category, workflow step, description, minutes spent, date, start/end time, created_at, original text, task status after, advance workflow, workflow step completed.

### Expense
- Amount, description, category, date, client, created_by, created_at, is_auto_categorized, source, source_scanned_invoice.

### ClientProfitability
- Client, year, month, total time, time cost, total expenses, monthly fee, profit, profit margin, is_profitable, last_updated.

### WorkflowDefinition, WorkflowStep, TaskApproval, WorkflowHistory
- **WorkflowDefinition**: Name, description, created_by, created_at, updated_at, is_active.
- **WorkflowStep**: Workflow, name, description, order, assign_to, requires_approval, approver_role, avg_completion_minutes, next_steps, previous_steps.
- **TaskApproval**: Task, workflow_step, approved_by, approved_at, approved, comment.
- **WorkflowHistory**: Task, from_step, to_step, changed_by, action, comment, time_spent_minutes, created_at.

### Notification System
- **WorkflowNotification**: User, task, workflow_step, notification_type, priority, title, message, is_read, is_archived, email_sent, created_at, read_at, scheduled_for, metadata, created_by, action_type, dismissed_at, acted_at.
- **NotificationSettings**: User, email/push enabled, per-type notification flags, digest frequency, digest time, deadline notice, overdue threshold, approval reminder, quiet hours, preferred channels, notification types enabled, digest enabled, quiet hours enabled.
- **NotificationTemplate**: Organization, notification_type, name, title_template, message_template, default_priority, is_active, is_default, available_variables, created_by, created_at, updated_at.
- **NotificationDigest**: User, digest_type, period_start, period_end, notifications, is_sent, sent_at, title, content, created_at.

### Fiscal & Reporting
- **FiscalObligationDefinition**: Name, description, periodicity, calculation_basis, deadline_day, deadline_month_offset, specific_month_reference, applies_to_client_tags, default_task_title_template, default_task_category, default_priority, default_workflow, generation_trigger_offset_days, is_active, organization, custom_rule_trigger_month.
- **FiscalSystemSettings**: Organization, auto_generation_enabled, generation_time, months_ahead_generation, auto_cleanup_enabled, cleanup_days_threshold, notify_on_generation, notify_on_errors, email_notifications_enabled, notification_recipients, webhook_url, webhook_secret, advanced_settings, created_at, updated_at, last_generation.
- **GeneratedReport**: Name, report_type, report_format, organization, generated_by, created_at, parameters, storage_url, file_size_kb, description, status.
- **SAFTFile**: Organization, uploaded_by, file, original_filename, status, processing_log, fiscal_year, start_date, end_date, company_name, company_tax_id, summary_data, uploaded_at, processed_at.
- **InvoiceBatch**: Organization, uploaded_by, created_at, description, invoices.
- **ScannedInvoice**: Batch, original_file, original_filename, status, processing_log, raw_qr_code_data, nif_emitter, nif_acquirer, country_code, doc_type, doc_date, doc_uid, atcud, taxable_amount, vat_amount, gross_total, edited_data, is_reviewed, created_at.
- **OrganizationActionLog**: Organization, user, action_type, action_description, timestamp, related_object_id, related_object_type.

---

## Serializers

All major models have corresponding serializers exposing all relevant fields, including related names and display fields for foreign keys. See `serializers.py` for details.

---

## Permissions

- Most endpoints require authentication (`IsAuthenticated`).
- Some endpoints require organization admin (`IsOrgAdmin`) or specific permissions (e.g., `CanManageClients`, `CanManageTimeEntry`).
- Permissions are enforced at the ViewSet and method level.

---

## Notification, Workflow, Fiscal, Reporting, and AI Features

- **Notification System**: In-app, email, digest, escalation, analytics, feedback tracking, anti-spam, quiet hours, user preferences, templates, and digests.
- **Workflow System**: Multi-step workflows, approvals, history, assignment, and analytics.
- **Fiscal System**: Obligation definitions, system settings, manual and automatic generation, stats, deadlines, and notifications.
- **Reporting**: Generated reports, download, context, and analytics.
- **AI Advisor**: Initial context, session start, and query endpoints for AI-powered assistance.

---

## Notes

- All endpoints and models are described as currently implemented. For request/response schemas, see the OpenAPI specification (`openapi.yaml`).
- For further details, see the codebase and serializers for exact field types and validation. 
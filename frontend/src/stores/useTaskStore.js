// src/stores/useTaskStore.js - Enhanced with multi-user assignment support
import { create } from 'zustand';

const initialFormData = {
    title: "", description: "", client: "", category: "", assigned_to: "",
    status: "pending", priority: 3, deadline: "", estimated_time_minutes: "",
    workflow: "", collaborators: [] // Added collaborators support
};

const initialFilters = {
    status: "", client: "", priority: "", assignedTo: "", category: ""
};

export const useTaskStore = create((set, get) => ({
    // STATE
    formData: initialFormData,
    selectedTask: null,
    showForm: false,
    showNaturalLanguageForm: false,
    naturalLanguageInput: "",
    
    searchTerm: "",
    sortConfig: { key: "deadline", direction: "asc" },
    filters: initialFilters,
    showFiltersPanel: false,
    
    showTimeEntryModal: false,
    selectedTaskForTimeEntry: null,
    
    selectedTaskForWorkflowView: null,

    selectedWorkflowForForm: '',
    workflowStepsForForm: [],
    stepAssignmentsForForm: {},
    isLoadingWorkflowStepsForForm: false,
    showWorkflowConfigInForm: false,

    notifications: [],

    // ENHANCED: Multi-user assignment state
    assignmentMode: 'single', // 'single' or 'multiple'
    selectedCollaborators: [],
    availableUsers: [],
    workflowAssignees: [],

    // ACTIONS

    // Notification Actions
    addNotification: (notification) => {
        const id = notification.id || Date.now() + Math.random();
        const fullNotification = { ...notification, id };
        set(state => ({ notifications: [...state.notifications, fullNotification] }));
        
        const duration = notification.duration || 4000;
        setTimeout(() => {
            get().removeNotification(id);
        }, duration);
    },
    removeNotification: (id) => set(state => ({
        notifications: state.notifications.filter(n => n.id !== id)
    })),
    showSuccessNotification: (title, message, duration) => get().addNotification({ type: 'success', title, message, duration }),
    showErrorNotification: (title, message, duration = 6000) => get().addNotification({ type: 'error', title, message, duration }),
    showWarningNotification: (title, message, duration = 5000) => get().addNotification({ type: 'warning', title, message, duration }),
    showInfoNotification: (title, message, duration) => get().addNotification({ type: 'info', title, message, duration }),

    // ENHANCED: Multi-user assignment actions
    setAssignmentMode: (mode) => set(state => {
        const newState = { assignmentMode: mode };
        if (mode === 'single') {
            newState.selectedCollaborators = [];
        }
        return newState;
    }),

    setSelectedCollaborators: (collaborators) => set({ selectedCollaborators: collaborators }),
    
    addCollaborator: (user) => set(state => {
        const exists = state.selectedCollaborators.find(c => 
            (c.id || c.user) === (user.id || user.user)
        );
        if (!exists) {
            return {
                selectedCollaborators: [...state.selectedCollaborators, {
                    id: user.id || user.user,
                    username: user.username,
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    email: user.email || ''
                }]
            };
        }
        return state;
    }),

    removeCollaborator: (userId) => set(state => ({
        selectedCollaborators: state.selectedCollaborators.filter(c => 
            (c.id || c.user) !== userId
        )
    })),

    clearCollaborators: () => set({ selectedCollaborators: [] }),

    setAvailableUsers: (users) => set({ availableUsers: users }),

    setWorkflowAssignees: (assignees) => set({ workflowAssignees: assignees }),

    // Form and Data Actions
    setFormDataField: (name, value) => set(state => ({
        formData: { ...state.formData, [name]: value }
    })),
    
    setStepAssignmentForForm: (stepId, userId) => set(state => ({
        stepAssignmentsForForm: { ...state.stepAssignmentsForForm, [stepId]: userId }
    })),
    
    _resetFormState: () => ({
        formData: initialFormData,
        selectedTask: null,
        selectedWorkflowForForm: '',
        workflowStepsForForm: [],
        stepAssignmentsForForm: {},
        showWorkflowConfigInForm: false,
        assignmentMode: 'single',
        selectedCollaborators: []
    }),

    openFormForNew: () => set(state => ({
        ...state._resetFormState(),
        showForm: true,
        showNaturalLanguageForm: false,
    })),

    openFormForEdit: (task) => {
        const deadline = task.deadline ? task.deadline.split("T")[0] : "";
        const existingAssignments = task.workflow_step_assignments || {}; 
        
        // ENHANCED: Handle collaborators data
        const collaborators = task.collaborators_info || [];
        const assignmentMode = collaborators.length > 0 ? 'multiple' : 'single';

        set(state => ({
            ...state._resetFormState(),
            selectedTask: task,
            formData: {
                title: task.title || "",
                description: task.description || "",
                client: task.client || "",
                category: task.category || "",
                assigned_to: task.assigned_to || "",
                status: task.status || "pending",
                priority: task.priority || 3,
                deadline: deadline,
                estimated_time_minutes: task.estimated_time_minutes || "",
                workflow: task.workflow || "",
                collaborators: collaborators.map(c => c.id || c.user || c) // Ensure we have IDs
            },
            showForm: true,
            showNaturalLanguageForm: false,
            selectedWorkflowForForm: task.workflow || '', 
            assignmentMode: assignmentMode,
            selectedCollaborators: collaborators
        }));
    },

    closeForm: () => set(state => ({
        showForm: false,
        showNaturalLanguageForm: false,
        naturalLanguageInput: "",
        ...state._resetFormState(),
    })),

    toggleNaturalLanguageForm: () => set(state => ({
        showNaturalLanguageForm: !state.showNaturalLanguageForm,
        showForm: false,
        ...( !state.showNaturalLanguageForm ? { ...state._resetFormState() } : { naturalLanguageInput: "" } )
    })),
    setNaturalLanguageInput: (text) => set({ naturalLanguageInput: text }),

    setSearchTerm: (term) => set({ searchTerm: term }),
    setSortConfig: (key) => set(state => ({
        sortConfig: {
            key,
            direction: state.sortConfig.key === key && state.sortConfig.direction === "asc" ? "desc" : "asc",
        }
    })),
    setFilter: (name, value) => set(state => ({
        filters: { ...state.filters, [name]: value }
    })),
    resetFilters: () => set({ filters: initialFilters, searchTerm: "" }),
    toggleShowFiltersPanel: () => set(state => ({ showFiltersPanel: !state.showFiltersPanel })),

    openTimeEntryModal: (task) => set({ showTimeEntryModal: true, selectedTaskForTimeEntry: task }),
    closeTimeEntryModal: () => set({ showTimeEntryModal: false, selectedTaskForTimeEntry: null }),

    openWorkflowView: (task) => set({ selectedTaskForWorkflowView: task }),
    closeWorkflowView: () => set({ selectedTaskForWorkflowView: null }),

    setSelectedWorkflowForFormStore: (workflowId) => set({ selectedWorkflowForForm: workflowId }),
    setWorkflowStepsForForm: (steps) => set({ workflowStepsForForm: steps }),
    setIsLoadingWorkflowStepsForForm: (loading) => set({ isLoadingWorkflowStepsForForm: loading }),
    setShowWorkflowConfigInForm: (show) => set({ showWorkflowConfigInForm: show }),
    
    // ENHANCED: Initialize step assignments with support for existing workflow assignments
    initializeStepAssignmentsForForm: (steps, existingAssignments = {}) => {
        const initialAssignments = {};
        const workflowUsers = [];
        
        steps.forEach(step => {
            // Prioritize existing assignment for this task instance,
            // then default assignee from step definition, then empty.
            const assignedUserId = existingAssignments[step.id] || step.default_assignee || '';
            initialAssignments[step.id] = assignedUserId;
            
            // Collect workflow assignees for suggestions
            if (assignedUserId && !workflowUsers.find(u => u.id === assignedUserId)) {
                workflowUsers.push({
                    id: assignedUserId,
                    user: assignedUserId,
                    stepName: step.name,
                    stepId: step.id
                });
            }
        });
        
        set({ 
            stepAssignmentsForForm: initialAssignments,
            workflowAssignees: workflowUsers
        });
    },

    // ENHANCED: Get all users assigned to current task in any capacity
    getAllAssignedUsers: () => {
        const state = get();
        const assignedUsers = new Set();
        
        // Primary assignee
        if (state.formData.assigned_to) {
            assignedUsers.add(state.formData.assigned_to);
        }
        
        // Collaborators
        state.selectedCollaborators.forEach(collaborator => {
            assignedUsers.add(collaborator.id || collaborator.user);
        });
        
        // Workflow step assignees
        Object.values(state.stepAssignmentsForForm).forEach(userId => {
            if (userId) {
                assignedUsers.add(userId);
            }
        });
        
        return Array.from(assignedUsers);
    },

    // ENHANCED: Get assignment summary for display
    getAssignmentSummary: () => {
        const state = get();
        const summary = {
            primaryAssignee: state.formData.assigned_to,
            collaborators: state.selectedCollaborators,
            workflowSteps: Object.keys(state.stepAssignmentsForForm).filter(
                stepId => state.stepAssignmentsForForm[stepId]
            ).length,
            totalAssigned: 0,
            hasMultipleTypes: false
        };
        
        const assignmentTypes = [
            summary.primaryAssignee ? 1 : 0,
            summary.collaborators.length > 0 ? 1 : 0,
            summary.workflowSteps > 0 ? 1 : 0
        ];
        
        summary.totalAssigned = (summary.primaryAssignee ? 1 : 0) + 
                                summary.collaborators.length + 
                                summary.workflowSteps;
        
        summary.hasMultipleTypes = assignmentTypes.filter(Boolean).length > 1;
        
        return summary;
    },

    // ENHANCED: Validate assignments before form submission
    validateAssignments: () => {
        const state = get();
        const errors = [];
        
        // Check if any assignment is made
        const hasAnyAssignment = state.formData.assigned_to || 
                                state.selectedCollaborators.length > 0 ||
                                Object.values(state.stepAssignmentsForForm).some(Boolean);
        
        if (!hasAnyAssignment) {
            errors.push("Pelo menos um utilizador deve ser atribuído à tarefa.");
        }
        
        // Check for conflicts between primary and collaborators
        if (state.formData.assigned_to && 
            state.selectedCollaborators.find(c => (c.id || c.user) === state.formData.assigned_to)) {
            errors.push("O responsável principal não pode ser também um colaborador.");
        }
        
        // Validate workflow assignments if workflow is selected
        if (state.selectedWorkflowForForm && state.workflowStepsForForm.length > 0) {
            const unassignedSteps = state.workflowStepsForForm.filter(step => 
                !state.stepAssignmentsForForm[step.id]
            );
            
            if (unassignedSteps.length > 0) {
                errors.push(`${unassignedSteps.length} passo(s) do workflow não tem utilizador atribuído.`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },

    // ENHANCED: Prepare form data for submission
    prepareFormDataForSubmission: () => {
        const state = get();
        const collaboratorIds = state.selectedCollaborators.map(c => c.id || c.user || c);
        
        return {
            ...state.formData,
            collaborators: state.assignmentMode === 'multiple' ? collaboratorIds : [],
            workflow_step_assignments: state.selectedWorkflowForForm ? state.stepAssignmentsForForm : {}
        };
    }
}));
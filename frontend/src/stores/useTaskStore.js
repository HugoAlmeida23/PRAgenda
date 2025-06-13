// src/stores/useTaskStore.js
import { create } from 'zustand';

const initialFormData = {
    title: "", description: "", client: "", category: "", assigned_to: "",
    status: "pending", priority: 3, deadline: "", estimated_time_minutes: "",
    workflow: "", 
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
    }),

    openFormForNew: () => set(state => ({
        ...state._resetFormState(),
        showForm: true,
        showNaturalLanguageForm: false,
    })),

    openFormForEdit: (task) => {
        const deadline = task.deadline ? task.deadline.split("T")[0] : "";
        // Assumes 'task.current_workflow_assignments' might exist if backend provides it
        // e.g., task.current_workflow_assignments = { step_def_id_1: user_id_A, step_def_id_2: user_id_B }
        const existingAssignments = task.current_workflow_assignments || {}; 

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
                workflow: task.workflow || "", // This is workflow_definition_id
            },
            showForm: true,
            showNaturalLanguageForm: false,
            selectedWorkflowForForm: task.workflow || '', 
            // Step assignments will be initialized by useEffect in TaskForm
            // after steps are fetched, using existingAssignments if task.workflow is set.
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
    
    // existingAssignments now comes from the selectedTask object if editing
    initializeStepAssignmentsForForm: (steps, existingAssignments = {}) => {
        const initialAssignments = {};
        steps.forEach(step => {
            // Prioritize existing assignment for this task instance,
            // then default assignee from step definition, then empty.
            initialAssignments[step.id] = existingAssignments[step.id] || step.default_assignee || '';
        });
        set({ stepAssignmentsForForm: initialAssignments });
    },
}));
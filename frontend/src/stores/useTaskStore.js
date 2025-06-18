// src/stores/useTaskStore.js
import { create } from 'zustand';

const initialFormData = {
    title: "", description: "", client: "", category: "", assigned_to: null, // Explicitly null
    status: "pending", priority: 3, deadline: "", estimated_time_minutes: "",
    workflow: "", 
    // 'collaborators' for formData will represent the IDs to be sent to backend in 'multiple' mode
    // 'selectedCollaborators' (below) will hold full user objects for UI display in 'multiple' mode
    collaborators: [] 
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

    // User Assignment Specific State
    assignmentMode: 'single', // 'single' or 'multiple'
    // selectedCollaborators will store full user objects for UI when in 'multiple' mode
    // It's primarily a UI state for the multi-selector component.
    // The actual IDs for submission will be managed in formData.collaborators
    selectedCollaboratorsUi: [], 
    availableUsers: [], // This should be populated from an API call, passed as prop for now
    workflowAssignees: [],

    // ACTIONS

    // Notification Actions (keep as is)
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

    // User Assignment Actions
    setAssignmentModeStore: (mode) => set(state => {
        const newFormData = { ...state.formData };
        let newSelectedCollaboratorsUi = [...state.selectedCollaboratorsUi];

        if (mode === 'single') {
            // Switching to single: if collaborators exist, use the first as assigned_to
            if (newSelectedCollaboratorsUi.length > 0) {
                newFormData.assigned_to = newSelectedCollaboratorsUi[0].id || newSelectedCollaboratorsUi[0].user;
            }
            // Clear collaborators for submission and UI
            newFormData.collaborators = [];
            newSelectedCollaboratorsUi = [];
        } else { // Switching to 'multiple'
            // If assigned_to exists, move it to collaborators
            if (newFormData.assigned_to) {
                const primaryAssigneeUser = state.availableUsers.find(u => (u.id || u.user) === newFormData.assigned_to);
                if (primaryAssigneeUser && !newSelectedCollaboratorsUi.find(c => (c.id || c.user) === newFormData.assigned_to)) {
                    newSelectedCollaboratorsUi.push({
                        id: primaryAssigneeUser.id || primaryAssigneeUser.user,
                        username: primaryAssigneeUser.username,
                        // ... other relevant user fields for display
                    });
                }
            }
            newFormData.assigned_to = null; // Clear primary assignee
            newFormData.collaborators = newSelectedCollaboratorsUi.map(c => c.id || c.user); // Store IDs for submission
        }
        return { 
            assignmentMode: mode, 
            formData: newFormData,
            selectedCollaboratorsUi: newSelectedCollaboratorsUi
        };
    }),
    
    // Actions for managing selectedCollaboratorsUi (for 'multiple' mode UI)
    addCollaboratorUi: (user) => set(state => {
        if (state.assignmentMode !== 'multiple') return state; // Should not happen if UI is correct
        const exists = state.selectedCollaboratorsUi.find(c => (c.id || c.user) === (user.id || user.user));
        if (!exists) {
            const newSelectedCollaboratorsUi = [...state.selectedCollaboratorsUi, user];
            return {
                selectedCollaboratorsUi: newSelectedCollaboratorsUi,
                formData: {
                    ...state.formData,
                    collaborators: newSelectedCollaboratorsUi.map(c => c.id || c.user)
                }
            };
        }
        return state;
    }),

    removeCollaboratorUi: (userId) => set(state => {
        if (state.assignmentMode !== 'multiple') return state;
        const newSelectedCollaboratorsUi = state.selectedCollaboratorsUi.filter(c => (c.id || c.user) !== userId);
        return {
            selectedCollaboratorsUi: newSelectedCollaboratorsUi,
            formData: {
                ...state.formData,
                collaborators: newSelectedCollaboratorsUi.map(c => c.id || c.user)
            }
        };
    }),
    
    setAvailableUsersStore: (users) => set({ availableUsers: users }), // To be called when users are fetched
    

    // Form and Data Actions
    setFormDataField: (name, value) => set(state => {
        const newFormData = { ...state.formData, [name]: value };
        // If assigned_to is changed in single mode, ensure collaborators is empty
        if (name === 'assigned_to' && state.assignmentMode === 'single') {
            newFormData.collaborators = [];
            // Also clear UI collaborators if any were mistakenly there
            if(state.selectedCollaboratorsUi.length > 0) {
                return { formData: newFormData, selectedCollaboratorsUi: [] };
            }
        }
        return { formData: newFormData };
    }),
    
    setStepAssignmentForForm: (stepId, userId) => set(state => ({
        stepAssignmentsForForm: { ...state.stepAssignmentsForForm, [stepId]: userId }
    })),
    
    _resetFormStateAndAssignments: () => ({ // Renamed for clarity
        formData: initialFormData,
        selectedTask: null,
        selectedWorkflowForForm: '',
        workflowStepsForForm: [],
        stepAssignmentsForForm: {},
        showWorkflowConfigInForm: false,
        assignmentMode: 'single',      // Default to single mode
        selectedCollaboratorsUi: [], // Reset UI collaborators
    }),

    openFormForNew: () => set(state => ({
        ...state._resetFormStateAndAssignments(),
        showForm: true,
        showNaturalLanguageForm: false,
    })),

    openFormForEdit: (task, allUsers) => { // Pass allUsers for initializing selectedCollaboratorsUi
        const deadline = task.deadline ? task.deadline.split("T")[0] : "";
        const existingAssignments = task.workflow_step_assignments || {}; 
        
        let assignmentMode = 'single';
        let assigned_to = task.assigned_to || null;
        let collaboratorsIds = [];
        let selectedCollaboratorsUi = [];

        if (task.collaborators && task.collaborators.length > 0) {
            assignmentMode = 'multiple';
            assigned_to = null; // In multiple mode, primary assigned_to is conceptually part of collaborators
            collaboratorsIds = task.collaborators; // Assuming task.collaborators contains IDs
            if (allUsers && allUsers.length > 0) {
                 selectedCollaboratorsUi = allUsers.filter(u => collaboratorsIds.includes(u.id || u.user));
            }
        } else if (task.assigned_to) {
            assignmentMode = 'single';
        }

        set(state => ({
            ...state._resetFormStateAndAssignments(),
            selectedTask: task,
            formData: {
                ...initialFormData, // Start with defaults
                title: task.title || "",
                description: task.description || "",
                client: task.client || "",
                category: task.category || "",
                assigned_to: assigned_to, // Set based on logic above
                status: task.status || "pending",
                priority: task.priority || 3,
                deadline: deadline,
                estimated_time_minutes: task.estimated_time_minutes || "",
                workflow: task.workflow || "",
                collaborators: collaboratorsIds, // Set based on logic above
            },
            showForm: true,
            showNaturalLanguageForm: false,
            selectedWorkflowForForm: task.workflow || '', 
            assignmentMode: assignmentMode,
            selectedCollaboratorsUi: selectedCollaboratorsUi,
            availableUsers: allUsers || [], // Store available users
        }));
    },

    closeForm: () => set(state => ({
        showForm: false,
        showNaturalLanguageForm: false,
        naturalLanguageInput: "",
        ...state._resetFormStateAndAssignments(),
    })),

    toggleNaturalLanguageForm: () => set(state => ({
        showNaturalLanguageForm: !state.showNaturalLanguageForm,
        showForm: false, // Ensure main form is closed when NLP form is open
        ...( !state.showNaturalLanguageForm ? { ...state._resetFormStateAndAssignments() } : { naturalLanguageInput: "" } )
    })),
    setNaturalLanguageInput: (text) => set({ naturalLanguageInput: text }),

    // Filter and Sort Actions (keep as is)
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

    // Modal Actions (keep as is)
    openTimeEntryModal: (task) => set({ showTimeEntryModal: true, selectedTaskForTimeEntry: task }),
    closeTimeEntryModal: () => set({ showTimeEntryModal: false, selectedTaskForTimeEntry: null }),
    openWorkflowView: (task) => set({ selectedTaskForWorkflowView: task }),
    closeWorkflowView: () => set({ selectedTaskForWorkflowView: null }),

    // Workflow Configuration for Form (keep as is)
    setSelectedWorkflowForFormStore: (workflowId) => set({ selectedWorkflowForForm: workflowId }),
    setWorkflowStepsForForm: (steps) => set({ workflowStepsForForm: steps }),
    setIsLoadingWorkflowStepsForForm: (loading) => set({ isLoadingWorkflowStepsForForm: loading }),
    setShowWorkflowConfigInForm: (show) => set({ showWorkflowConfigInForm: show }),
    initializeStepAssignmentsForForm: (steps, existingAssignments = {}) => {
        const initialAssignments = {};
        const wfAssigneesForSuggestion = [];
        steps.forEach(step => {
            const assignedUserId = existingAssignments[step.id] || step.assign_to || ''; // Use step.assign_to as default
            initialAssignments[step.id] = assignedUserId;
            if (assignedUserId && !wfAssigneesForSuggestion.find(u => (u.id || u.user) === assignedUserId)) {
                 const userObj = get().availableUsers.find(u => (u.id || u.user) === assignedUserId);
                 if(userObj) wfAssigneesForSuggestion.push(userObj);
            }
        });
        set({ 
            stepAssignmentsForForm: initialAssignments,
            workflowAssignees: wfAssigneesForSuggestion // For suggesting collaborators
        });
    },
    
    // Prepare form data for submission
    prepareFormDataForSubmission: () => {
        const state = get();
        const { formData, assignmentMode, selectedCollaboratorsUi, selectedWorkflowForForm, stepAssignmentsForForm } = state;
        
        const finalFormData = { ...formData };

        if (assignmentMode === 'single') {
            finalFormData.collaborators = []; // Ensure collaborators is empty in single mode
        } else { // 'multiple' mode
            finalFormData.assigned_to = null; // Ensure assigned_to is null in multiple mode
            finalFormData.collaborators = selectedCollaboratorsUi.map(c => c.id || c.user);
        }

        // Handle workflow assignments
        finalFormData.workflow = selectedWorkflowForForm || null;
        if (selectedWorkflowForForm) {
            finalFormData.workflow_step_assignments = stepAssignmentsForForm;
        } else {
            finalFormData.workflow_step_assignments = {}; // Or delete if backend prefers
        }
        
        return finalFormData;
    }
}));
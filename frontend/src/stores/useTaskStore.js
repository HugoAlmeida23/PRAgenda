// src/stores/useTaskStore.js

import { create } from 'zustand';

// --- Estado Inicial ---
const initialFormData = {
    title: "", 
    description: "", 
    client: "", 
    category: "", 
    assigned_to: null,
    status: "pending", 
    priority: 3, 
    deadline: "", 
    estimated_time_minutes: "",
    workflow: "", 
    collaborators: [],
    workflow_step_assignments: {},
    source_scanned_invoice: null,
};

const initialFilters = {
    status: "", 
    client: "", 
    priority: "", 
    assignedTo: "", 
    category: "",
    overdue: null,
};

export const useTaskStore = create((set, get) => ({
    // =================================================================
    // STATE
    // =================================================================
    
    // -- Estado do Formulário Principal --
    formData: { ...initialFormData },
    selectedTask: null,
    showForm: false,
    
    // -- Estado do Formulário NLP --
    showNaturalLanguageForm: false,
    naturalLanguageInput: "",

    // -- Estado da Lista de Tarefas (Filtros, etc.) --
    searchTerm: "",
    sortConfig: { key: "deadline", direction: "asc" },
    filters: { ...initialFilters },
    showFiltersPanel: false,
    isTaskCreationModalOpen: false,
    
    // -- Estado de Modais Relacionados --
    showTimeEntryModal: false,
    selectedTaskForTimeEntry: null,
    selectedTaskForWorkflowView: null,

    // -- Estado da Configuração de Workflow --
    selectedWorkflowForForm: '',
    workflowStepsForForm: [],
    stepAssignmentsForForm: {},
    isLoadingWorkflowStepsForForm: false,
    showWorkflowConfigInForm: false,

    // -- Estado de Notificações --
    notifications: [],

    // -- Estado de Atribuição de Utilizadores --
    assignmentMode: 'single',
    selectedCollaboratorsUi: [],
    availableUsers: [],
    workflowAssignees: [],

    // --- NEW: Estado para Seleção de Batch/Invoice ---
    showBatchSelectionModal: false,
    selectedInvoiceForTask: null,
    selectedBatchForTask: null,
    availableClientsForBatch: [],

    // =================================================================
    // ACTIONS
    // =================================================================

    // --- Ações de Notificação ---
    addNotification: (notification) => {
        const id = notification.id || Date.now() + Math.random();
        const fullNotification = { ...notification, id };
        
        set(state => ({ 
            notifications: [...state.notifications, fullNotification] 
        }));
        
        const duration = notification.duration || 4000;
        setTimeout(() => {
            try {
                get().removeNotification(id);
            } catch (e) {
                console.warn('Error removing notification:', e);
            }
        }, duration);
    },

    removeNotification: (id) => set(state => ({ 
        notifications: state.notifications.filter(n => n.id !== id) 
    })),

    showSuccessNotification: (title, message, duration) => {
        get().addNotification({ type: 'success', title, message, duration });
    },

    showErrorNotification: (title, message, duration = 6000) => {
        get().addNotification({ type: 'error', title, message, duration });
    },

    showWarningNotification: (title, message, duration = 5000) => {
        get().addNotification({ type: 'warning', title, message, duration });
    },

    showInfoNotification: (title, message, duration) => {
        get().addNotification({ type: 'info', title, message, duration });
    },

    // --- Ações de Atribuição de Utilizadores ---
    setAssignmentModeStore: (mode) => set({ assignmentMode: mode }),

    addCollaboratorUi: (user) => set(state => {
        if (state.assignmentMode !== 'multiple') return state;
        const userId = user.user || user.id;
        const exists = state.selectedCollaboratorsUi.find(c => (c.id || c.user) === userId);
        if (exists) return state;

        return { 
            selectedCollaboratorsUi: [...state.selectedCollaboratorsUi, user] 
        };
    }),

    removeCollaboratorUi: (userId) => set(state => {
        if (state.assignmentMode !== 'multiple') return state;
        return {
            selectedCollaboratorsUi: state.selectedCollaboratorsUi.filter(c => (c.id || c.user) !== userId)
        };
    }),
    
    setAvailableUsersStore: (users) => set({ availableUsers: users }),

    // --- Ações de Formulário ---
    setFormDataField: (name, value) => set(state => ({
        formData: { ...state.formData, [name]: value }
    })),

    setStepAssignmentForForm: (stepId, userId) => set(state => ({
        stepAssignmentsForForm: { ...state.stepAssignmentsForForm, [stepId]: userId }
    })),

    // --- Reset Helper ---
    resetFormToInitialState: () => set({
        formData: { ...initialFormData },
        selectedTask: null,
        selectedWorkflowForForm: '',
        workflowStepsForForm: [],
        stepAssignmentsForForm: {},
        showWorkflowConfigInForm: false,
        assignmentMode: 'single',
        selectedCollaboratorsUi: [],
    }),

    openFormForNew: () => {
        get().resetFormToInitialState();
        set({
            showForm: true,
            showNaturalLanguageForm: false,
        });
    },
    
    // --- START: NEW ACTIONS FOR BATCH/INVOICE SELECTION ---

    openBatchSelectionModal: (invoice, batch, clients) => {
        set({
            showBatchSelectionModal: true,
            selectedInvoiceForTask: invoice,
            selectedBatchForTask: batch,
            availableClientsForBatch: Array.isArray(clients) ? clients : [],
        });
    },

    closeBatchSelectionModal: () => {
        set({
            showBatchSelectionModal: false,
            selectedInvoiceForTask: null,
            selectedBatchForTask: null,
            availableClientsForBatch: [],
        });
    },

    createTaskForInvoice: (invoice, clients) => {
        if (!invoice) return;
        const safeClients = Array.isArray(clients) ? clients : [];
        const targetClient = safeClients.find(c => c.nif === invoice.nif_acquirer);

        get().resetFormToInitialState();
        
        const newFormData = {
            ...initialFormData,
            title: `Lançar Fatura: ${invoice.atcud || 'Ref ' + String(invoice.id).substring(0, 8)}`,
            description: `Lançamento contabilístico da fatura de ${invoice.nif_emitter || 'N/A'}.\nData: ${invoice.doc_date || 'N/A'}\nValor Total: ${invoice.gross_total || '0.00'}€\nIVA: ${invoice.vat_amount || '0.00'}€`,
            client: targetClient ? targetClient.id : "",
            source_scanned_invoice: invoice.id,
        };
        
        set({
            isTaskCreationModalOpen: true,
            formData: newFormData,
            showBatchSelectionModal: false, // Close selection modal
        });

        if (!targetClient && safeClients.length > 0 && invoice.nif_acquirer) {
            setTimeout(() => get().showWarningNotification(
                "Cliente não encontrado", 
                `Nenhum cliente com o NIF ${invoice.nif_acquirer} foi encontrado. Por favor, selecione manualmente.`
            ), 500);
        }
    },

    createTaskForBatch: (batch, clients) => {
        if (!batch) return;
        const safeClients = Array.isArray(clients) ? clients : [];
        const completedInvoices = batch.invoices?.filter(inv => inv.status === 'COMPLETED') || [];
        const invoiceCount = completedInvoices.length;
        const totalValue = completedInvoices.reduce((sum, inv) => sum + (parseFloat(inv.gross_total) || 0), 0);
        
        const uniqueNifs = [...new Set(completedInvoices.map(inv => inv.nif_acquirer).filter(Boolean))];
        let targetClient = null;
        if (uniqueNifs.length === 1) {
            targetClient = safeClients.find(c => c.nif === uniqueNifs[0]);
        }
        
        get().resetFormToInitialState();
        
        const newFormData = {
            ...initialFormData,
            title: `Lançamento em Lote: ${batch.description || `Lote de ${invoiceCount} Faturas`}`,
            description: `Lançamento contabilístico de ${invoiceCount} faturas processadas em lote.\n` +
                       `Valor total: ${totalValue.toFixed(2)}€\n` +
                       `Data de processamento: ${new Date().toLocaleDateString('pt-PT')}\n` +
                       `${uniqueNifs.length === 1 ? `Cliente: NIF ${uniqueNifs[0]}` : `Múltiplos clientes (${uniqueNifs.length})`}`,
            client: targetClient ? targetClient.id : "",
        };
        
        set({
            isTaskCreationModalOpen: true,
            formData: newFormData,
            showBatchSelectionModal: false, // Close selection modal
        });

        if (!targetClient && uniqueNifs.length > 1) {
            setTimeout(() => get().showWarningNotification(
                "Múltiplos clientes", 
                `Este lote contém faturas de ${uniqueNifs.length} clientes diferentes. Por favor, selecione o cliente principal manualmente.`
            ), 500);
        } else if (!targetClient && uniqueNifs.length === 1) {
            setTimeout(() => get().showWarningNotification(
                "Cliente não encontrado", 
                `Nenhum cliente com o NIF ${uniqueNifs[0]} foi encontrado. Por favor, selecione manualmente.`
            ), 500);
        }
    },

    // UPDATED: This is now the entry point for the logic
    openFormForInvoiceLaunch: (invoice, batch, clients) => {
        // If batch info is missing or it only contains one invoice, go straight to creation
        if (!batch || !batch.invoices || batch.invoices.length <= 1) {
            get().createTaskForInvoice(invoice, clients);
        } else {
            // Otherwise, open the selection modal
            get().openBatchSelectionModal(invoice, batch, clients);
        }
    },
    
    // --- END: NEW ACTIONS ---

    closeTaskCreationModal: () => {
        set({ isTaskCreationModalOpen: false });
        get().resetFormToInitialState();
    },

    openFormForEdit: (task) => {
        const deadline = task.deadline ? task.deadline.split("T")[0] : "";
        
        let assignmentMode = 'single';
        let assigned_to = task.assigned_to || null;
        let collaboratorsUi = [];
        
        if (task.collaborators_info && task.collaborators_info.length > 0) {
            assignmentMode = 'multiple';
            assigned_to = null; 
            collaboratorsUi = task.collaborators_info;
        }

        get().resetFormToInitialState();
        
        set({
            selectedTask: task,
            showForm: true,
            showNaturalLanguageForm: false,
            assignmentMode: assignmentMode,
            selectedCollaboratorsUi: collaboratorsUi,
            selectedWorkflowForForm: task.workflow || '',
            formData: {
                title: task.title || "",
                description: task.description || "",
                client: task.client || "",
                category: task.category || "",
                status: task.status || "pending",
                priority: task.priority || 3,
                deadline: deadline,
                estimated_time_minutes: task.estimated_time_minutes || "",
                workflow: task.workflow || "",
                assigned_to: assigned_to,
                collaborators: task.collaborators || [],
                source_scanned_invoice: task.source_scanned_invoice || null,
                workflow_step_assignments: {}
            }
        });
    },

    closeForm: () => {
        set({
            showForm: false,
            showNaturalLanguageForm: false,
            naturalLanguageInput: "",
        });
        get().resetFormToInitialState();
    },

    toggleNaturalLanguageForm: () => {
        const current = get().showNaturalLanguageForm;
        
        if (!current) {
            get().resetFormToInitialState();
        }
        
        set({
            showNaturalLanguageForm: !current,
            showForm: false,
            naturalLanguageInput: !current ? "" : get().naturalLanguageInput
        });
    },
    
    setNaturalLanguageInput: (text) => set({ naturalLanguageInput: text }),

    // --- Ações de Filtros e Ordenação ---
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
    
    resetFilters: () => set({ 
        filters: { ...initialFilters }, 
        searchTerm: "" 
    }),
    
    toggleShowFiltersPanel: () => set(state => ({ 
        showFiltersPanel: !state.showFiltersPanel 
    })),

    // --- Ações de Modais ---
    openTimeEntryModal: (task) => set({ 
        showTimeEntryModal: true, 
        selectedTaskForTimeEntry: task 
    }),
    
    closeTimeEntryModal: () => set({ 
        showTimeEntryModal: false, 
        selectedTaskForTimeEntry: null 
    }),
    
    openWorkflowView: (task) => set({ 
        selectedTaskForWorkflowView: task 
    }),
    
    closeWorkflowView: () => set({ 
        selectedTaskForWorkflowView: null 
    }),

    // --- Ações de Workflow ---
    setSelectedWorkflowForFormStore: (workflowId) => set({ 
        selectedWorkflowForForm: workflowId 
    }),
    
    setWorkflowStepsForForm: (steps) => set({ 
        workflowStepsForForm: steps 
    }),
    
    setIsLoadingWorkflowStepsForForm: (loading) => set({ 
        isLoadingWorkflowStepsForForm: loading 
    }),
    
    setShowWorkflowConfigInForm: (show) => set({ 
        showWorkflowConfigInForm: show 
    }),
    
    initializeStepAssignmentsForForm: (steps, existingAssignments = {}) => {
        const currentState = get();
        const initialAssignments = {};
        const wfAssigneesForSuggestion = [];
        
        steps.forEach(step => {
            const assignedUserId = existingAssignments[step.id] || step.assign_to || '';
            initialAssignments[step.id] = assignedUserId;
            
            if (assignedUserId && !wfAssigneesForSuggestion.find(u => (u.id || u.user) === assignedUserId)) {
                const userObj = currentState.availableUsers.find(u => (u.id || u.user) === assignedUserId);
                if (userObj) wfAssigneesForSuggestion.push(userObj);
            }
        });
        
        set({ 
            stepAssignmentsForForm: initialAssignments,
            workflowAssignees: wfAssigneesForSuggestion
        });
    },
    
    // --- Função de Preparação para API ---
    prepareFormDataForSubmission: () => {
        const { 
            formData, 
            assignmentMode, 
            selectedCollaboratorsUi, 
            selectedWorkflowForForm, 
            stepAssignmentsForForm 
        } = get();
        
        const finalFormData = { ...formData };

        if (assignmentMode === 'single') {
            finalFormData.collaborators = [];
        } else {
            finalFormData.assigned_to = null;
            finalFormData.collaborators = selectedCollaboratorsUi.map(c => c.id || c.user);
        }

        finalFormData.workflow = selectedWorkflowForForm || null;
        finalFormData.workflow_step_assignments = selectedWorkflowForForm ? stepAssignmentsForForm : {};
        
        return finalFormData;
    }
}));
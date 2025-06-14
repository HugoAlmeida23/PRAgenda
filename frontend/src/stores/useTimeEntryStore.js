// src/stores/useTimeEntryStore.js
import { create } from 'zustand';

const initialManualFormData = {
    client: "",
    task: "",
    category: "",
    description: "",
    minutes_spent: 0,
    date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    task_status_after: "no_change",
    workflow_step: "",
    advance_workflow: false,
    workflow_step_completed: false,
};

const initialFilters = {
    startDate: "",
    endDate: "",
    client: "",
    searchQuery: "", // Keep searchQuery within filters for simplicity
    sortField: "date",
    sortDirection: "desc",
};

export const useTimeEntryStore = create((set, get) => ({
    // UI State for Forms & Modals
    showTimeEntryForm: false,
    isNaturalLanguageMode: false, // Toggles between manual and NLP within the main form area
    showNLPConfirmationDialog: false,
    showAutoTrackingUI: false, // To show/hide the auto-tracking component/section

    // Form Data
    manualFormData: initialManualFormData,
    naturalLanguageInput: "",
    nlpExtractedEntries: null, // For confirmation dialog

    // List View State
    filters: initialFilters,
    groupBy: 'none', // 'none', 'date', 'client'
    viewMode: 'list', // 'list', 'grid'
    
    // Auto-Tracking Specific State
    isAutoTrackingActive: false,
    autoTrackedElapsedTime: 0, // in seconds
    autoTrackingRecordId: null, // ID of the AutoTimeTracking record from backend
    autoTrackingActivityData: [], // For simulated activity
    autoTrackingSuggestedData: { client: "", task: "", category: "", description: ""}, // From NLP on auto-tracked data
    showAutoTrackingConfirmation: false,

    // Feedback
    lastSavedEntryFeedback: null, // { data: entryData, type: 'manual' | 'nlp' | 'auto' }

    // ACTIONS

    // Form and Modal Visibility
    toggleTimeEntryForm: () => set(state => ({ showTimeEntryForm: !state.showTimeEntryForm, isNaturalLanguageMode: false, manualFormData: initialManualFormData, naturalLanguageInput: "" })),
    setNaturalLanguageMode: (isNLP) => set({ isNaturalLanguageMode: isNLP }),
    openNLPConfirmationDialog: (extractedData) => set({ nlpExtractedEntries: extractedData, showNLPConfirmationDialog: true }),
    closeNLPConfirmationDialog: () => set({ showNLPConfirmationDialog: false, nlpExtractedEntries: null }),
    toggleAutoTrackingUI: () => set(state => ({ showAutoTrackingUI: !state.showAutoTrackingUI })),

    // Form Data Management
    setManualFormField: (name, value) => set(state => ({
        manualFormData: { ...state.manualFormData, [name]: value }
    })),
    resetManualForm: (initialValues = {}) => set({ 
        manualFormData: { ...initialManualFormData, ...initialValues },
        isNaturalLanguageMode: false, // Usually reset NLP mode too
        naturalLanguageInput: ""
    }),
    setNaturalLanguageInput: (text) => set({ naturalLanguageInput: text }),
    
    // List Control Actions
    setFilter: (name, value) => set(state => ({ filters: { ...state.filters, [name]: value } })),
    resetFilters: () => set({ filters: initialFilters }),
    setGroupBy: (grouping) => set({ groupBy: grouping }),
    setViewMode: (mode) => set({ viewMode: mode }),
    setSortConfig: (field) => set(state => ({
        filters: {
            ...state.filters,
            sortField: field,
            sortDirection: state.filters.sortField === field && state.filters.sortDirection === "asc" ? "desc" : "asc",
        }
    })),

    // Auto-Tracking Actions
    startAutoTrackingStore: (recordId) => set({ isAutoTrackingActive: true, autoTrackingRecordId: recordId, autoTrackedElapsedTime: 0, autoTrackingActivityData: [] }),
    stopAutoTrackingStore: () => set({ isAutoTrackingActive: false }),
    incrementAutoTrackedTime: () => set(state => ({ autoTrackedElapsedTime: state.autoTrackedElapsedTime + 1 })),
    addAutoTrackingActivity: (activity) => set(state => ({ autoTrackingActivityData: [...state.autoTrackingActivityData, activity] })),
    setAutoTrackingSuggestedData: (data) => set({ autoTrackingSuggestedData: data }),
    openAutoTrackingConfirmation: () => set({ showAutoTrackingConfirmation: true }),
    closeAutoTrackingConfirmation: () => set({ 
        showAutoTrackingConfirmation: false, 
        autoTrackedElapsedTime: 0, 
        autoTrackingRecordId: null, 
        autoTrackingActivityData: [],
        autoTrackingSuggestedData: { client: "", task: "", category: "", description: ""}
    }),

    // Feedback Action
    setLastSavedEntryFeedback: (entryData, type) => set({ lastSavedEntryFeedback: { data: entryData, type } }),
    clearLastSavedEntryFeedback: () => set({ lastSavedEntryFeedback: null }),
}));
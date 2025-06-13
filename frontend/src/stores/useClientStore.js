// src/stores/useClientStore.js

import { create } from 'zustand';

const initialFormData = {
    name: "", nif: "", email: "", phone: "", address: "",
    monthly_fee: "", notes: "", fiscal_tags: [], is_active: true
};

const initialFilters = {
    active: true, hasEmail: null, hasPhone: null, hasNif: null,
    hasMonthlyFee: null, accountManager: '', minMonthlyFee: '', maxMonthlyFee: ''
};

export const useClientStore = create((set, get) => ({
    // STATE
    searchTerm: "",
    sortConfig: { key: "name", direction: "asc" },
    filters: initialFilters,
    viewMode: 'grid',
    showFilters: false,
    showClientModal: false,
    showForm: false,
    selectedClient: null,
    formData: initialFormData,

    // ACTIONS
    setSearchTerm: (term) => set({ searchTerm: term }),
    setSortConfig: (key) => set((state) => ({
        sortConfig: {
            key,
            direction: state.sortConfig.key === key && state.sortConfig.direction === "asc" ? "desc" : "asc",
        }
    })),
    setFilter: (name, value) => set((state) => ({
        filters: { ...state.filters, [name]: value }
    })),
    resetFilters: () => set({ filters: initialFilters, searchTerm: "" }),
    setViewMode: (mode) => set({ viewMode: mode }),
    toggleShowFilters: () => set((state) => ({ showFilters: !state.showFilters })),

    // Form and Modal Actions
    openFormForNew: () => set({ selectedClient: null, formData: initialFormData, showForm: true }),
    openFormForEdit: (client) => set({
        selectedClient: client,
        formData: {
            name: client.name || "",
            nif: client.nif || "",
            email: client.email || "",
            phone: client.phone || "",
            address: client.address || "",
            monthly_fee: client.monthly_fee || "",
            notes: client.notes || "",
            fiscal_tags: Array.isArray(client.fiscal_tags) ? client.fiscal_tags : [],
            is_active: client.is_active,
        },
        showForm: true,
    }),
    closeForm: () => set({ showForm: false, selectedClient: null, formData: initialFormData }),
    setFormData: (e) => {
        const { name, value, type, checked } = e.target;
        set((state) => ({
            formData: { ...state.formData, [name]: type === 'checkbox' ? checked : value }
        }));
    },
    
    // Client Details Modal Actions
    openDetailsModal: (client) => set({ selectedClient: client, showClientModal: true }),
    closeDetailsModal: () => set({ showClientModal: false, selectedClient: null }),
}));
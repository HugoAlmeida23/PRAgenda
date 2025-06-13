// src/stores/useTaskStore.js
import { create } from 'zustand';

export const useTaskStore = create((set) => ({
  // State
  showForm: false,
  showFilters: false,
  searchTerm: '',
  filters: { status: "", client: "", priority: "", assignedTo: "", category: "" },
  sortConfig: { key: "deadline", direction: "asc" },
  selectedTask: null,
  
  // Actions
  toggleForm: () => set((state) => ({ showForm: !state.showForm })),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setFilter: (filterName, value) => set((state) => ({ filters: { ...state.filters, [filterName]: value } })),
  setSortConfig: (key) => set((state) => ({ 
      sortConfig: { 
          key, 
          direction: state.sortConfig.key === key && state.sortConfig.direction === 'asc' ? 'desc' : 'asc' 
      } 
  })),
  selectTaskForEdit: (task) => set({ selectedTask: task, showForm: true }),
  reset: () => set({ showForm: false, selectedTask: null, searchTerm: '', filters: { status: "", client: "", priority: "", assignedTo: "", category: "" } }),
}));
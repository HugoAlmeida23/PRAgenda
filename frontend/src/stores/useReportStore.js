// src/stores/useReportStore.js
import { create } from 'zustand';

const initialGeneratedReportsFilters = {
  report_type: '',
  date_from: '',
  date_to: '',
  search_term: '', // Adicionado para pesquisa frontend se necessário
};

export const useReportStore = create((set, get) => ({
  // State for listing generated reports
  generatedReportsFilters: initialGeneratedReportsFilters,
  setGeneratedReportsFilter: (name, value) =>
    set((state) => ({
      generatedReportsFilters: { ...state.generatedReportsFilters, [name]: value },
    })),
  resetGeneratedReportsFilters: () =>
    set({ generatedReportsFilters: initialGeneratedReportsFilters }),

  // State for creating new reports (to be expanded)
  showReportCreationModal: false,
  currentReportTypeForCreation: null, // e.g., 'client_summary', 'profitability_analysis'
  currentReportParams: {},         // Parameters for the report being configured
  
  openReportCreationModal: (reportType = 'custom_report', initialParams = {}) => 
    set({ 
        showReportCreationModal: true, 
        currentReportTypeForCreation: reportType,
        currentReportParams: initialParams 
    }),
  closeReportCreationModal: () => 
    set({ 
        showReportCreationModal: false, 
        currentReportTypeForCreation: null, 
        currentReportParams: {} 
    }),
  updateCurrentReportParam: (field, value) => {
    // Se estamos definindo o tipo de relatório, atualizamos também o currentReportTypeForCreation
    if (field === 'report_type') {
      set(state => ({ 
          currentReportTypeForCreation: value,
          currentReportParams: { ...state.currentReportParams, [field]: value }
      }));
    } else {
      set(state => ({ 
          currentReportParams: { ...state.currentReportParams, [field]: value }
      }));
    }
  },
}));
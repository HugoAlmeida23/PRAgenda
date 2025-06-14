// src/pages/TimeEntry.jsx
import React, { useMemo, useCallback, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import api from "../api";
import {
    Download, Loader2, AlertTriangle, RotateCcw, Brain, User, Activity,
    Plus, X, CheckCircle as CheckCircleIcon, Clock
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from "../contexts/PermissionsContext";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundElements from "../components/HeroSection/BackgroundElements";

import { useTimeEntryStore } from "../stores/useTimeEntryStore";
import TimeEntryListFilters from "../components/timeentry/TimeEntryListFilters";
import TimeEntryList from "../components/timeentry/TimeEntryList";
import TimeEntryCombinedForm from "../components/timeentry/TimeEntryCombinedForm";
import TimeEntryNLPConfirmation from "../components/timeentry/TimeEntryNLPConfirmation";

// Styles and Variants
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px'
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 150, damping: 20 } }
};

// Error View Component
const ErrorView = ({ message, onRetry }) => (
  <div style={{ position: 'relative', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', textAlign: 'center', color: 'white' }}>
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...glassStyle, padding: '2rem', maxWidth: '500px' }}>
      <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Ocorreu um erro!</h2>
      <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>{message || 'Falha ao carregar dados.'}</p>
      {onRetry && (
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRetry}
          style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.2)', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', marginTop: '1rem' }}>
          <RotateCcw size={18} /> Tentar novamente
        </motion.button>
      )}
    </motion.div>
  </div>
);

// Fetching function for TIME ENTRIES ONLY, now with backend filtering
const fetchTimeEntriesOnly = async (userId, timeEntryFiltersFromStore) => {
  const params = new URLSearchParams();
  
  // Apply filters from the store to query parameters
  if (timeEntryFiltersFromStore.startDate) params.append('start_date', timeEntryFiltersFromStore.startDate);
  if (timeEntryFiltersFromStore.endDate) params.append('end_date', timeEntryFiltersFromStore.endDate);
  if (timeEntryFiltersFromStore.client) params.append('client', timeEntryFiltersFromStore.client);
  if (timeEntryFiltersFromStore.searchQuery) params.append('search', timeEntryFiltersFromStore.searchQuery);
  // Add other filters like task_id, user_id (for admins) if implemented in TimeEntryViewSet
  // if (timeEntryFiltersFromStore.task) params.append('task', timeEntryFiltersFromStore.task);
  // if (permissions.isOrgAdmin && timeEntryFiltersFromStore.user_id_param) params.append('user', timeEntryFiltersFromStore.user_id_param);


  if (timeEntryFiltersFromStore.sortField && timeEntryFiltersFromStore.sortDirection) {
    params.append('ordering', `${timeEntryFiltersFromStore.sortDirection === 'desc' ? '-' : ''}${timeEntryFiltersFromStore.sortField}`);
  } else {
    params.append('ordering', '-date'); // Default sort by date descending
  }

  // Backend should scope to the current user by default if not admin or if no user_id_param is specified
  const endpoint = `/time-entries/?${params.toString()}`;
  const response = await api.get(endpoint);
  return response.data.results || response.data || [];
};

const fetchClientsForTimeEntry = async () => api.get("/clients/?is_active=true").then(res => res.data.results || res.data || []);
const fetchTasksForTimeEntry = async (userId, selectedClientId) => {
    let taskEndpoint = `/tasks/?status=pending,in_progress&limit=200`; // Fetch more tasks potentially
    if (selectedClientId) {
        taskEndpoint += `&client=${selectedClientId}`;
    }
    // Consider if tasks should be further scoped by user assignment here or rely on backend
    return api.get(taskEndpoint).then(res => res.data.results || res.data || []);
};
const fetchCategoriesForTimeEntry = async () => api.get("/task-categories/").then(res => res.data.results || res.data || []);


const TimeEntry = () => {
    const queryClient = useQueryClient();
    const permissions = usePermissions();

    const {
        showTimeEntryForm, toggleTimeEntryForm, isNaturalLanguageMode,
        manualFormData, naturalLanguageInput, 
        nlpExtractedEntries, openNLPConfirmationDialog, closeNLPConfirmationDialog,
        filters, // This 'filters' is from useTimeEntryStore for TimeEntry
        lastSavedEntryFeedback, setLastSavedEntryFeedback, clearLastSavedEntryFeedback,
    } = useTimeEntryStore();

    // Query for stable dropdown data
    const { data: clients = [], isLoading: isLoadingClients, isError: isErrorClients, error: errorClients } = useQuery({ 
        queryKey: ['clientsForTimeEntryDropdown'], 
        queryFn: fetchClientsForTimeEntry, 
        staleTime: 5 * 60 * 1000,
        enabled: !!permissions.initialized,
    });
    const { data: categories = [], isLoading: isLoadingCategories, isError: isErrorCategories, error: errorCategories } = useQuery({ 
        queryKey: ['categoriesForTimeEntryDropdown'], 
        queryFn: fetchCategoriesForTimeEntry, 
        staleTime: Infinity,
        enabled: !!permissions.initialized,
    });
    const { data: tasksForDropdown = [], isLoading: isLoadingTasksDropdown, isError: isErrorTasksDropdown, error: errorTasksDropdown } = useQuery({
        queryKey: ['tasksForTimeEntryDropdown', permissions.userId, manualFormData.client],
        queryFn: () => fetchTasksForTimeEntry(permissions.userId, manualFormData.client),
        staleTime: 1 * 60 * 1000,
        enabled: !!permissions.initialized && showTimeEntryForm,
    });

    // Query for the list of Time Entries - this is the dynamic one
    const { 
        data: timeEntries = [], 
        isLoading: isLoadingEntriesFirstTime,
        isFetching: isFetchingEntries,
        isError: isErrorEntries, 
        error: entriesError, 
        refetch: refetchTimeEntries 
    } = useQuery({
        queryKey: ['timeEntries', permissions.userId, filters], // Filters from useTimeEntryStore included
        queryFn: () => fetchTimeEntriesOnly(permissions.userId, filters),
        staleTime: 1 * 60 * 1000,
        enabled: !!permissions.initialized && (permissions.isOrgAdmin || permissions.canLogTime || permissions.canViewTeamTime),
        keepPreviousData: true,
    });

    // Mutations
    const deleteTimeEntryMutation = useMutation({ /* ... as before ... */ });
    const createTimeEntryMutation = useMutation({ /* ... as before ... */ });
    const createNlpTimeEntryMutation = useMutation({ /* ... as before ... */ });
    // Auto-tracking mutations would go here if UI was present

    const handleFormSubmit = useCallback(() => { /* ... as before ... */ }, [/* dependencies */]);
    const handleConfirmNLPCreate = useCallback(() => { /* ... as before ... */ }, [/* dependencies */]);
    const handleDuplicateEntry = useCallback((entryToDuplicate) => { /* ... as before ... */ }, [/* dependencies */]);
    const handleDeleteEntry = useCallback((entryId) => { /* ... as before ... */ }, [/* dependencies */]);
    const formatMinutesForDisplay = (minutes) => minutes != null ? `${Math.floor(minutes/60)}h ${minutes%60}m` : "0h 0m";
    
    // Loading and Error States for the Page
    const isEssentialStaticDataLoading = 
        permissions.loading || 
        isLoadingClients || 
        isLoadingCategories;
        // isLoadingTasksDropdown is tied to form visibility, so not for initial page block

    const essentialStaticDataError = 
        (isErrorClients && !clients.length) ||
        (isErrorCategories && !categories.length);
    
    const combinedEssentialErrorMessage = errorClients?.message || errorCategories?.message || "Falha ao carregar dados essenciais para formulários.";

    if (isEssentialStaticDataLoading) {
        return ( 
            <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'rgba(0,0,0,0.1)'}}>
                <Loader2 size={48} className="animate-spin text-blue-500" style={{color:'rgb(59, 130, 246)'}} />
            </div> 
        );
    }

    if (essentialStaticDataError) {
        return <ErrorView message={combinedEssentialErrorMessage} onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ['clientsForTimeEntryDropdown'] });
            queryClient.invalidateQueries({ queryKey: ['categoriesForTimeEntryDropdown'] });
        }}/>;
    }
    
    if (!permissions.isOrgAdmin && !permissions.canLogTime && !permissions.canViewTeamTime && !isEssentialStaticDataLoading && !essentialStaticDataError) {
        return ( <ErrorView message="Acesso restrito à página de registo de tempos." /> );
    }

    const FeedbackPopup = () => { /* ... as before ... */ };
    const generateExcelReport = async () => { /* ... as before ... */ };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
            <BackgroundElements />
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 99999 }}/>
            <AnimatePresence><FeedbackPopup /></AnimatePresence>

            <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}>
                <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                        <div style={{padding:'0.75rem', background:'rgba(59,130,246,0.2)', borderRadius:'12px', border:'1px solid rgba(59,130,246,0.3)'}}>
                             <Clock size={28} style={{color: 'rgb(59,130,246)'}}/>
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0',color: 'rgb(255, 255, 255)' }}>Registo de Tempos</h1>
                            <p style={{ fontSize: '1rem', color: 'rgba(191,219,254,1)', margin: 0 }}>Adicione e gira os seus registos de tempo.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                         {(permissions.isOrgAdmin || permissions.canLogTime) && (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleTimeEntryForm}
                                style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: `1px solid rgba(59,130,246, ${showTimeEntryForm ? 0.6 : 0.3})`, background: `rgba(59,130,246, ${showTimeEntryForm ? 0.3 : 0.2})`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {showTimeEntryForm ? <X size={18}/> : <Plus size={18}/>} {showTimeEntryForm ? 'Cancelar Entrada' : 'Nova Entrada'}
                            </motion.button>
                         )}
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={generateExcelReport} disabled={isLoadingEntriesFirstTime || timeEntries.length === 0 || isFetchingEntries}
                            style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (isLoadingEntriesFirstTime || timeEntries.length === 0 || isFetchingEntries) ? 0.7 : 1 }}>
                            <Download size={18}/> Exportar
                        </motion.button>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {showTimeEntryForm && (permissions.isOrgAdmin || permissions.canLogTime) && (
                         <TimeEntryCombinedForm
                            clients={clients} 
                            tasks={tasksForDropdown} 
                            categories={categories}
                            onFormSubmit={handleFormSubmit}
                            isSubmitting={createTimeEntryMutation.isPending || createNlpTimeEntryMutation.isPending}
                            permissions={permissions}
                        />
                    )}
                </AnimatePresence>

                <TimeEntryListFilters clientsData={clients} />
                
                <div style={{position: 'relative'}}>
                    {(() => {
                        if (isLoadingEntriesFirstTime && timeEntries.length === 0 && !isErrorEntries) {
                            return (
                                <div style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', ...glassStyle }}>
                                    <Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59,130,246)' }} />
                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>A carregar registos de tempo...</p>
                                </div>
                            );
                        }
                        if (isErrorEntries && timeEntries.length === 0) { 
                            return <ErrorView message={entriesError?.message || "Falha ao carregar registos."} onRetry={refetchTimeEntries} />;
                        }
                        return (
                            <>
                                {isFetchingEntries && timeEntries.length > 0 && (
                                     <div style={{
                                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                        padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.6)', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 5,
                                        color: 'white', fontSize: '0.8rem'
                                    }}>
                                        <Loader2 size={16} className="animate-spin" />
                                        Atualizando registos...
                                    </div>
                                )}
                                <TimeEntryList
                                    timeEntriesData={timeEntries} // Already filtered and sorted by backend
                                    onDeleteEntry={handleDeleteEntry}
                                    onDuplicateEntry={handleDuplicateEntry}
                                    permissions={permissions}
                                    formatMinutesFunc={formatMinutesForDisplay}
                                    isLoading={isFetchingEntries && timeEntries.length === 0}
                                />
                            </>
                         );
                    })()}
                </div>
                 <AnimatePresence>
                    {nlpExtractedEntries && ( 
                        <TimeEntryNLPConfirmation
                            onConfirm={handleConfirmNLPCreate}
                            isProcessingNLP={createNlpTimeEntryMutation.isPending}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                .switch { position: relative; display: inline-block; width: 40px; height: 20px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.2); transition: .4s; border-radius: 20px; }
                .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: rgb(147, 51, 234); }
                input:focus + .slider { box-shadow: 0 0 1px rgb(147, 51, 234); }
                input:checked + .slider:before { transform: translateX(20px); }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 4px; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
            `}</style>
        </div>
    );
};

export default TimeEntry;
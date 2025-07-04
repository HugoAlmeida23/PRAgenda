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

// Fetching functions
const fetchTimeEntriesOnly = async (userId, timeEntryFiltersFromStore) => {
    const params = new URLSearchParams();

    if (timeEntryFiltersFromStore.startDate) params.append('start_date', timeEntryFiltersFromStore.startDate);
    if (timeEntryFiltersFromStore.endDate) params.append('end_date', timeEntryFiltersFromStore.endDate);
    if (timeEntryFiltersFromStore.client) params.append('client', timeEntryFiltersFromStore.client);
    if (timeEntryFiltersFromStore.searchQuery) params.append('search', timeEntryFiltersFromStore.searchQuery);

    if (timeEntryFiltersFromStore.sortField && timeEntryFiltersFromStore.sortDirection) {
        params.append('ordering', `${timeEntryFiltersFromStore.sortDirection === 'desc' ? '-' : ''}${timeEntryFiltersFromStore.sortField}`);
    } else {
        params.append('ordering', '-date');
    }

    const endpoint = `/time-entries/?${params.toString()}`;
    const response = await api.get(endpoint);
    return response.data.results || response.data || [];
};

// NEW fetching function for the form context
const fetchTimeEntryFormContext = async () => {
    const response = await api.get('/time-entry-context/');
    return response.data;
};


const TimeEntry = () => {
    const queryClient = useQueryClient();
    const permissions = usePermissions();

    const {
        showTimeEntryForm, toggleTimeEntryForm, isNaturalLanguageMode,
        manualFormData, naturalLanguageInput, resetManualForm,
        nlpExtractedEntries, openNLPConfirmationDialog, closeNLPConfirmationDialog,
        filters,
        lastSavedEntryFeedback, setLastSavedEntryFeedback, clearLastSavedEntryFeedback,
    } = useTimeEntryStore();

    // NEW: Single query for all form context data
    const {
        data: formContextMenu,
        isLoading: isLoadingFormContext,
        isError: isErrorFormContext,
        error: formContextError
    } = useQuery({
        queryKey: ['timeEntryFormContext'],
        queryFn: fetchTimeEntryFormContext,
        staleTime: 5 * 60 * 1000,
        enabled: !!permissions.initialized && showTimeEntryForm, // Only fetch when form is open
    });

    // Memoize the data from the context query to prevent re-renders
    const { data: clientsForDropdown = [] } = useQuery({
        queryKey: ['clientsForDropdowns'],
        // Não precisa de queryFn se for garantido que o Layout já carregou,
        // mas é boa prática incluir para o caso de a página ser acedida diretamente.
        queryFn: () => api.get("/clients/?is_active=true").then(res => res.data.results || res.data),
        staleTime: 15 * 60 * 1000
    });
    const { data: categoriesForDropdown = [] } = useQuery({
        queryKey: ['categoriesForDropdowns'],
        queryFn: () => api.get("/task-categories/").then(res => res.data.results || res.data),
        staleTime: Infinity
    });

    // 3. Obter tarefas. Esta query é específica para o contexto do utilizador e pode não ser
    // a mesma que a do TaskManagement, então mantemos a sua própria query.
    const { data: tasksForDropdown = [] } = useQuery({
        queryKey: ['tasksForTimeEntryDropdown'],
        queryFn: () => api.get("/tasks/?status=pending,in_progress").then(res => res.data.results || res.data),
        staleTime: 2 * 60 * 1000 // Tarefas mudam mais, então o staleTime é menor
    });


    // Query for the list of Time Entries (remains the same)
    const {
        data: timeEntries = [],
        isLoading: isLoadingEntriesFirstTime,
        isFetching: isFetchingEntries,
        isError: isErrorEntries,
        error: entriesError,
        refetch: refetchTimeEntries
    } = useQuery({
        queryKey: ['timeEntries', permissions.userId, filters],
        queryFn: () => fetchTimeEntriesOnly(permissions.userId, filters),
        staleTime: 1 * 60 * 1000,
        enabled: !!permissions.initialized && (permissions.isOrgAdmin || permissions.canLogTime || permissions.canViewTeamTime),
        keepPreviousData: true,
    });

    const deleteTimeEntryMutation = useMutation({
        mutationFn: async (entryId) => {
            await api.delete(`/time-entries/${entryId}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
            toast.success('Registo de tempo excluído com sucesso!');
        },
        onError: (error) => {
            console.error('Erro ao excluir registo:', error);
            toast.error('Erro ao excluir registo de tempo.');
        }
    });

    const createTimeEntryMutation = useMutation({
        mutationFn: async (timeEntryData) => {
            const response = await api.post('/time-entries/', timeEntryData);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
            toast.success('Registo de tempo criado com sucesso!');
            setLastSavedEntryFeedback(data, 'manual');
            resetManualForm();
            toggleTimeEntryForm(); // Close form
        },
        onError: (error) => {
            console.error('Erro ao criar registo:', error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Erro ao criar registo de tempo.';
            toast.error(errorMsg);
        }
    });

    const createNlpTimeEntryMutation = useMutation({
        mutationFn: async (nlpData) => {
            const response = await api.post('/nlp-processor/create_time_entries/', nlpData);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
            toast.success(`${Array.isArray(data) ? data.length : 1} registo(s) criado(s) com IA!`);
            setLastSavedEntryFeedback(data, 'nlp');
            resetManualForm();
            closeNLPConfirmationDialog();
            toggleTimeEntryForm(); // Close form
        },
        onError: (error) => {
            console.error('Erro ao criar registo via IA:', error);
            toast.error(error.response?.data?.error || 'Erro ao processar com IA.');
            closeNLPConfirmationDialog();
        }
    });

    // Form submission handler with FIX
    const handleFormSubmit = useCallback(async () => {
        try {
            if (isNaturalLanguageMode) {
                if (!naturalLanguageInput.trim()) {
                    toast.error('Por favor, descreva sua atividade.');
                    return;
                }
                const nlpPayload = {
                    text: naturalLanguageInput,
                    client_id: manualFormData.client || null,
                    date: manualFormData.date,
                    task_status_after: manualFormData.task_status_after
                };
                createNlpTimeEntryMutation.mutate(nlpPayload);
            } else {
                const requiredFields = ['client', 'description', 'minutes_spent', 'date'];
                const missingFields = requiredFields.filter(field => !manualFormData[field]);

                if (missingFields.length > 0) {
                    toast.error(`Campos obrigatórios em falta: ${missingFields.join(', ')}`);
                    return;
                }

                // Convert minutes_spent to integer and validate
                const minutes = parseInt(manualFormData.minutes_spent, 10);
                if (isNaN(minutes) || minutes <= 0) {
                    toast.error('Minutos gastos deve ser um número maior que 0.');
                    return;
                }

                // Prepare payload with corrected types
                const payload = {
                    ...manualFormData,
                    minutes_spent: minutes, // Send as integer
                    // Ensure optional fields are sent as null if empty, not empty strings
                    task: manualFormData.task || null,
                    category: manualFormData.category || null,
                    workflow_step: manualFormData.workflow_step || null,
                    start_time: manualFormData.start_time || null,
                    end_time: manualFormData.end_time || null,
                };
                createTimeEntryMutation.mutate(payload);
            }
        } catch (error) {
            console.error('Erro no handleFormSubmit:', error);
            toast.error('Erro inesperado ao submeter formulário.');
        }
    }, [isNaturalLanguageMode, naturalLanguageInput, manualFormData, createNlpTimeEntryMutation, createTimeEntryMutation]);

    const handleConfirmNLPCreate = useCallback(() => {
        if (!nlpExtractedEntries) return;
        const nlpPayload = {
            text: naturalLanguageInput,
            client_id: manualFormData.client || null,
            date: manualFormData.date,
            task_status_after: manualFormData.task_status_after
        };
        createNlpTimeEntryMutation.mutate(nlpPayload);
    }, [nlpExtractedEntries, naturalLanguageInput, manualFormData, createNlpTimeEntryMutation]);

    const handleDuplicateEntry = useCallback((entryToDuplicate) => {
        resetManualForm({
            client: entryToDuplicate.client,
            task: entryToDuplicate.task || "",
            category: entryToDuplicate.category || "",
            description: entryToDuplicate.description,
            minutes_spent: entryToDuplicate.minutes_spent,
            date: new Date().toISOString().split("T")[0],
            start_time: entryToDuplicate.start_time || "",
            end_time: entryToDuplicate.end_time || "",
        });
        if (!showTimeEntryForm) {
            toggleTimeEntryForm();
        }
        toast.info('Formulário preenchido com dados do registo duplicado.');
    }, [resetManualForm, showTimeEntryForm, toggleTimeEntryForm]);

    const handleDeleteEntry = useCallback((entryId) => {
        if (window.confirm('Tem a certeza que deseja excluir este registo de tempo?')) {
            deleteTimeEntryMutation.mutate(entryId);
        }
    }, [deleteTimeEntryMutation]);

    const formatMinutesForDisplay = (minutes) => minutes != null ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : "0h 0m";

    // Loading and Error States
    if (permissions.loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'rgba(0,0,0,0.1)' }}>
                <Loader2 size={48} className="animate-spin" style={{ color: 'rgb(59, 130, 246)' }} />
            </div>
        );
    }

    if (isErrorFormContext) {
        return <ErrorView message={formContextError?.message || "Falha ao carregar dados para o formulário."} onRetry={() => queryClient.invalidateQueries(['timeEntryFormContext'])} />;
    }

    if (!permissions.isOrgAdmin && !permissions.canLogTime && !permissions.canViewTeamTime) {
        return (<ErrorView message="Acesso restrito à página de registo de tempos." />);
    }

    const generateExcelReport = async () => {
        toast.info('Funcionalidade de exportação será implementada em breve.');
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
            <BackgroundElements />
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 99999 }} />

            <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}>
                <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.2)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
                            <Clock size={28} style={{ color: 'rgb(59,130,246)' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0', color: 'rgb(255, 255, 255)' }}>Registo de Tempos</h1>
                            <p style={{ fontSize: '1rem', color: 'rgba(191,219,254,1)', margin: 0 }}>Adicione e gira os seus registos de tempo.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {(permissions.isOrgAdmin || permissions.canLogTime) && (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleTimeEntryForm}
                                style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: `1px solid rgba(59,130,246, ${showTimeEntryForm ? 0.6 : 0.3})`, background: `rgba(59,130,246, ${showTimeEntryForm ? 0.3 : 0.2})`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {showTimeEntryForm ? <X size={18} /> : <Plus size={18} />} {showTimeEntryForm ? 'Cancelar Entrada' : 'Nova Entrada'}
                            </motion.button>
                        )}
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={generateExcelReport} disabled={isLoadingEntriesFirstTime || timeEntries.length === 0 || isFetchingEntries}
                            style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (isLoadingEntriesFirstTime || timeEntries.length === 0 || isFetchingEntries) ? 0.7 : 1 }}>
                            <Download size={18} /> Exportar
                        </motion.button>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {showTimeEntryForm && (permissions.isOrgAdmin || permissions.canLogTime) && (
                        <TimeEntryCombinedForm
                            clients={clientsForDropdown}
                            tasks={tasksForDropdown}
                            categories={categoriesForDropdown}
                            onFormSubmit={handleFormSubmit}
                            isSubmitting={createTimeEntryMutation.isPending || createNlpTimeEntryMutation.isPending || isLoadingFormContext}
                            permissions={permissions}
                        />
                    )}
                </AnimatePresence>

                <TimeEntryListFilters clientsData={clientsForDropdown} />

                <div style={{ position: 'relative' }}>
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
                                    timeEntriesData={timeEntries}
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
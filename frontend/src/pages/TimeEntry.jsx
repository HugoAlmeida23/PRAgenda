import React, { useMemo, useCallback, useEffect } from "react"; // Added useEffect
import { toast, ToastContainer } from "react-toastify";
import api from "../api"; // Adjust path as needed
import { 
    Download, Loader2, AlertTriangle, RotateCcw, Brain, User, Activity, 
    Plus, X, CheckCircle as CheckCircleIcon // Renamed to avoid conflict
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from "../contexts/PermissionsContext";
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundElements from "../components/HeroSection/BackgroundElements"; // Adjust path

// Store and Components
import { useTimeEntryStore } from "../stores/useTimeEntryStore"; // Adjust path
import TimeEntryListFilters from "../components/timeentry/TimeEntryListFilters"; // Adjust path
import TimeEntryList from "../components/timeentry/TimeEntryList"; // Adjust path
import TimeEntryCombinedForm from "../components/timeentry/TimeEntryCombinedForm"; // Adjust path
import TimeEntryNLPConfirmation from "../components/timeentry/TimeEntryNLPConfirmation"; // Adjust path

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px'
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

const ErrorView = ({ message, onRetry }) => (
  <div style={{ position: 'relative', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', textAlign: 'center', color: 'white' }}>
    <BackgroundElements businessStatus="optimal" />
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

const fetchTimeEntries = async (userId, filters = {}) => {
  let url = `/time-entries/?user_id=${userId}`;
  const params = new URLSearchParams();
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  if (filters.client) params.append('client', filters.client);
  if (filters.searchQuery) params.append('search', filters.searchQuery);
  if (filters.sortField && filters.sortDirection) {
    params.append('ordering', `${filters.sortDirection === 'desc' ? '-' : ''}${filters.sortField}`);
  }
  const paramString = params.toString();
  if (paramString) url += `&${paramString}`;
  const response = await api.get(url);
  return response.data;
};

const fetchClientsForTimeEntry = async () => api.get("/clients/?is_active=true").then(res => res.data);
const fetchTasksForTimeEntry = async (userId) => api.get(`/tasks/?user_id=${userId}&status=pending,in_progress`).then(res => res.data);
const fetchCategoriesForTimeEntry = async () => api.get("/task-categories/").then(res => res.data);

const TimeEntry = () => {
    const queryClient = useQueryClient();
    const permissions = usePermissions();

    const {
        showTimeEntryForm, toggleTimeEntryForm, isNaturalLanguageMode,
        manualFormData, naturalLanguageInput, 
        nlpExtractedEntries, openNLPConfirmationDialog, closeNLPConfirmationDialog,
        filters, 
        showAutoTrackingUI, toggleAutoTrackingUI,
        startAutoTrackingStore, stopAutoTrackingStore,
        autoTrackingRecordId, setAutoTrackingSuggestedData, openAutoTrackingConfirmation,
        lastSavedEntryFeedback, setLastSavedEntryFeedback, clearLastSavedEntryFeedback,
    } = useTimeEntryStore();

    const { data: timeEntries = [], isLoading: isLoadingEntries, isError: isErrorEntries, error: entriesError, refetch: refetchTimeEntries } = useQuery({
        queryKey: ['timeEntries', permissions.userId, filters],
        queryFn: () => fetchTimeEntries(permissions.userId, filters),
        staleTime: 1 * 60 * 1000,
        enabled: !!permissions.userId && permissions.initialized,
    });
    const { data: clients = [], isLoading: isLoadingClients } = useQuery({ queryKey: ['clientsForTimeEntry'], queryFn: fetchClientsForTimeEntry, staleTime: Infinity });
    const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({ queryKey: ['tasksForTimeEntry', permissions.userId], queryFn: () => fetchTasksForTimeEntry(permissions.userId), enabled: !!permissions.userId, staleTime: 5 * 60 * 1000 });
    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({ queryKey: ['categoriesForTimeEntry'], queryFn: fetchCategoriesForTimeEntry, staleTime: Infinity });

    const deleteTimeEntryMutation = useMutation({
        mutationFn: (entryId) => api.delete(`/time-entries/${entryId}/`),
        onSuccess: () => { toast.success("Registo eliminado."); queryClient.invalidateQueries({ queryKey: ['timeEntries'] }); },
        onError: () => toast.error("Falha ao eliminar registo."),
    });

    const createTimeEntryMutation = useMutation({
        mutationFn: (entryData) => api.post("/time-entries/", entryData),
        onSuccess: (response) => { // Changed 'data' to 'response' to avoid conflict
            toast.success("Registo de tempo criado!");
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toggleTimeEntryForm();
            setLastSavedEntryFeedback(response.data, 'manual');
        },
        onError: (error) => { 
            const errorMsg = error.response?.data?.detail || error.message || "Falha ao criar registo.";
            toast.error(errorMsg); 
        }
    });

    const createNlpTimeEntryMutation = useMutation({
        mutationFn: (nlpPayload) => api.post("/gemini-nlp/create_time_entries/", nlpPayload),
        onSuccess: (response) => { // Changed 'data' to 'response'
            toast.success(`${response.data.length || 0} entrada(s) de tempo criada(s) com IA!`);
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            closeNLPConfirmationDialog();
            toggleTimeEntryForm();
            setLastSavedEntryFeedback(response.data, 'nlp');
        },
        onError: () => toast.error("Falha ao criar entradas com IA."),
    });

    const startAutoTrackApiMutation = useMutation({
        mutationFn: () => api.post("/auto-time-tracking/", { start_time: new Date().toISOString(), activity_data: [], processed: false }),
        onSuccess: (response) => { startAutoTrackingStore(response.data.id); toast.info("Rastreamento automático iniciado."); },
        onError: () => toast.error("Falha ao iniciar rastreamento no servidor.")
    });

    const stopAutoTrackApiMutation = useMutation({
        mutationFn: ({ recordId, activityData }) => api.patch(`/auto-time-tracking/${recordId}/`, { end_time: new Date().toISOString(), activity_data: activityData }),
        onSuccess: (response, variables) => { // Changed 'data' to 'response'
            stopAutoTrackingStore();
            // Simulate NLP analysis for auto-tracked data - replace with actual backend call if needed
            const randomClient = clients[Math.floor(Math.random() * clients.length)]; // Example
            setAutoTrackingSuggestedData({ client: randomClient?.id || "", description: "Trabalho automático rastreado...", task: "", category: "" });
            openAutoTrackingConfirmation();
            toast.info("Rastreamento parado. Analisando atividade...");
        },
        onError: () => toast.error("Falha ao parar rastreamento no servidor.")
    });

    const confirmAutoTrackEntryMutation = useMutation({
        mutationFn: ({ suggestedData, recordId, elapsedTime }) => api.post("/time-entries/", { /* ...payload... */
            client: suggestedData.client, task: suggestedData.task || null, category: suggestedData.category || null,
            description: suggestedData.description, minutes_spent: Math.ceil(elapsedTime / 60),
            date: new Date().toISOString().split("T")[0], original_text: `Auto-tracked (Record: ${recordId})`
        }),
        onSuccess: (response, variables) => { // Changed 'data' to 'response'
            api.patch(`/auto-time-tracking/${variables.recordId}/`, { processed: true, converted_to_entries: [response.data.id] });
            toast.success("Entrada de tempo automática criada!");
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
            useTimeEntryStore.getState().closeAutoTrackingConfirmation(); // Call store action directly
            setLastSavedEntryFeedback(response.data, 'auto');
        },
        onError: () => toast.error("Falha ao confirmar entrada automática.")
    });

    const handleFormSubmit = useCallback(() => {
        if (isNaturalLanguageMode) {
            if (!naturalLanguageInput.trim()) { toast.error("Descreva sua atividade."); return; }
            api.post("/gemini-nlp/process_text/", { text: naturalLanguageInput, client_id: manualFormData.client || null })
                .then(response => openNLPConfirmationDialog(response.data))
                .catch(() => toast.error("Falha ao processar com IA."));
        } else {
            if (!manualFormData.client || !manualFormData.description || !manualFormData.minutes_spent || manualFormData.minutes_spent <= 0) {
                toast.error("Preencha Cliente, Descrição e Minutos (>0)."); return;
            }
            const submissionData = { ...manualFormData };
            submissionData.start_time = submissionData.start_time ? `${submissionData.start_time}:00` : null;
            submissionData.end_time = submissionData.end_time ? `${submissionData.end_time}:00` : null;
            createTimeEntryMutation.mutate(submissionData);
        }
    }, [isNaturalLanguageMode, naturalLanguageInput, manualFormData, createTimeEntryMutation, openNLPConfirmationDialog]);

    const handleConfirmNLPCreate = useCallback(() => {
        if (!nlpExtractedEntries) return;
        createNlpTimeEntryMutation.mutate({
            text: naturalLanguageInput, client_id: manualFormData.client || (nlpExtractedEntries?.clients?.[0]?.id) || null,
            date: manualFormData.date, task_status_after: manualFormData.task_status_after,
            task_id: manualFormData.task || (nlpExtractedEntries?.tasks?.[0]?.id) || null,
        });
    }, [nlpExtractedEntries, naturalLanguageInput, manualFormData, createNlpTimeEntryMutation]);

    const handleDuplicateEntry = useCallback((entryToDuplicate) => {
        useTimeEntryStore.getState().resetManualForm({
            client: entryToDuplicate.client, task: entryToDuplicate.task, category: entryToDuplicate.category,
            description: `Cópia de: ${entryToDuplicate.description}`, minutes_spent: entryToDuplicate.minutes_spent,
            date: new Date().toISOString().split("T")[0], start_time: "", end_time: "",
        });
        if (!showTimeEntryForm) toggleTimeEntryForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.info("Formulário preenchido para duplicação.");
    }, [showTimeEntryForm, toggleTimeEntryForm]);

    const handleDeleteEntry = useCallback((entryId) => {
        const entry = timeEntries.find(e => e.id === entryId);
        const canDelete = permissions.isOrgAdmin || permissions.canEditAllTime || (permissions.canEditOwnTime && entry?.user === permissions.userId);
        if (!canDelete) { toast.error("Sem permissão para eliminar."); return; }
        if (window.confirm("Tem certeza que deseja eliminar este registo?")) deleteTimeEntryMutation.mutate(entryId);
    }, [permissions, deleteTimeEntryMutation, timeEntries]);

    const formatMinutesForDisplay = (minutes) => minutes ? `${Math.floor(minutes/60)}h ${minutes%60}m` : "0h 0m";

    const handleAutoTrackingActions = useCallback((actionType, data) => {
        if (actionType === 'start_auto_track') startAutoTrackApiMutation.mutate();
        else if (actionType === 'stop_auto_track_and_analyze') stopAutoTrackApiMutation.mutate({ recordId: autoTrackingRecordId, activityData: useTimeEntryStore.getState().autoTrackingActivityData });
        else if (actionType === 'confirm_auto_entry') confirmAutoTrackEntryMutation.mutate({ suggestedData: data, recordId: autoTrackingRecordId, elapsedTime: useTimeEntryStore.getState().autoTrackedElapsedTime });
    }, [startAutoTrackApiMutation, stopAutoTrackApiMutation, confirmAutoTrackEntryMutation, autoTrackingRecordId]);

    const isLoadingOverall = isLoadingEntries || isLoadingClients || isLoadingTasks || isLoadingCategories || 
                             deleteTimeEntryMutation.isPending || createTimeEntryMutation.isPending || 
                             createNlpTimeEntryMutation.isPending || startAutoTrackApiMutation.isPending || 
                             stopAutoTrackApiMutation.isPending || confirmAutoTrackEntryMutation.isPending;

    if (permissions.loading) { /* ... Loading Spinner Full Page ... */ 
        return ( <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'rgba(0,0,0,0.1)'}}><Loader2 size={48} className="animate-spin text-blue-500"/></div> );
    }
    if (!permissions.canLogTime && !permissions.isOrgAdmin) { /* ... Access Denied ... */ 
        return ( <ErrorView message="Acesso restrito a esta página." /> );
    }
    if (isErrorEntries) { return <ErrorView message={entriesError?.message} onRetry={refetchTimeEntries} />; }

    const FeedbackPopup = () => { /* ... same as before ... */ 
        const { lastSavedEntryFeedback, clearLastSavedEntryFeedback: clearFeedback } = useTimeEntryStore(); // Ensure correct action name
        useEffect(() => {
            if (lastSavedEntryFeedback) {
                const timer = setTimeout(clearFeedback, 5000);
                return () => clearTimeout(timer);
            }
        }, [lastSavedEntryFeedback, clearFeedback]);

        if (!lastSavedEntryFeedback) return null;
        const entryData = Array.isArray(lastSavedEntryFeedback.data) ? lastSavedEntryFeedback.data[0] : lastSavedEntryFeedback.data;

        return (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 1000, ...glassStyle, padding: '1rem', background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', maxWidth: '350px' }}>
                <div style={{display:'flex', alignItems:'flex-start'}}>
                    <CheckCircleIcon size={20} style={{color:'rgb(52,211,153)', marginRight:'0.75rem', marginTop:'0.125rem'}}/>
                    <div>
                        <h4 style={{fontWeight:'600', color:'white', margin:'0 0 0.25rem 0'}}>Registo Salvo! ({lastSavedEntryFeedback.type})</h4>
                        <p style={{fontSize:'0.875rem', color:'rgba(255,255,255,0.8)', margin:0}}>{formatMinutesForDisplay(entryData?.minutes_spent || 0)} para {entryData?.client_name || 'Cliente'}</p>
                        <div style={{marginTop:'0.75rem', display:'flex', gap:'0.5rem'}}>
                            <motion.button onClick={() => handleDuplicateEntry(entryData)} style={{fontSize:'0.75rem', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', color:'white', padding:'0.25rem 0.75rem', borderRadius:'6px', cursor:'pointer'}}>Duplicar</motion.button>
                            <motion.button onClick={clearFeedback} style={{fontSize:'0.75rem', color:'rgba(255,255,255,0.7)', background:'none', border:'none', padding:'0.25rem 0.5rem', cursor:'pointer'}}>Fechar</motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    const generateExcelReport = async () => { /* ... same as before ... */ 
        if (!timeEntries || timeEntries.length === 0) {
            toast.warn("Não há registros para gerar relatório");
            return;
          }
          try {
            toast.info("Gerando relatório Excel...", { autoClose: false, toastId: "generating-excel" });
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();
            const clientGroups = timeEntries.reduce((acc, entry) => {
              const clientName = entry.client_name || "Sem Cliente";
              if (!acc[clientName]) acc[clientName] = [];
              acc[clientName].push(entry);
              return acc;
            }, {});
      
            const summaryData = [['Cliente', 'Total de Horas', 'Qtd. Registros', 'Percentual']];
            let totalAllClientsMinutes = 0;
            Object.values(clientGroups).forEach(entries => {
              totalAllClientsMinutes += entries.reduce((sum, entry) => sum + entry.minutes_spent, 0);
            });
      
            Object.entries(clientGroups).forEach(([clientName, entries]) => {
              const clientTotalMinutes = entries.reduce((sum, entry) => sum + entry.minutes_spent, 0);
              const percentage = totalAllClientsMinutes > 0 ? (clientTotalMinutes / totalAllClientsMinutes * 100).toFixed(1) : "0.0";
              summaryData.push([
                clientName,
                formatMinutesForDisplay(clientTotalMinutes),
                entries.length,
                `${percentage}%`
              ]);
            });
            summaryData.push(['TOTAL', formatMinutesForDisplay(totalAllClientsMinutes), timeEntries.length, '100%']);
            const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
            summaryWs['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo');
      
            Object.entries(clientGroups).forEach(([clientName, entries]) => {
              const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
              const clientSheetData = [['Data', 'Descrição', 'Categoria', 'Tarefa', 'Minutos', 'Tempo']];
              sortedEntries.forEach(entry => {
                clientSheetData.push([
                  entry.date,
                  entry.description,
                  entry.category_name || '',
                  entry.task_title || '',
                  entry.minutes_spent,
                  formatMinutesForDisplay(entry.minutes_spent)
                ]);
              });
              const totalClientMinutes = sortedEntries.reduce((sum, entry) => sum + entry.minutes_spent, 0);
              clientSheetData.push(['', '', '', 'TOTAL', totalClientMinutes, formatMinutesForDisplay(totalClientMinutes)]);
              const ws = XLSX.utils.aoa_to_sheet(clientSheetData);
              ws['!cols'] = [{ wch: 12 }, { wch: 50 }, { wch: 18 }, { wch: 25 }, { wch: 10 }, { wch: 12 }];
              const safeSheetName = clientName.replace(/[\[\]*?/\\]/g, '_').substring(0, 31);
              XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
            });
      
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Relatorio_Tempo_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // Clean up blob URL
            toast.dismiss("generating-excel");
            toast.success("Relatório Excel gerado com sucesso!");
          } catch (error) {
            console.error("Erro ao gerar relatório Excel:", error);
            toast.dismiss("generating-excel");
            toast.error("Ocorreu um erro ao gerar o relatório Excel");
          }
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
            <BackgroundElements businessStatus="optimal" />
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 99999 }}/>
            <AnimatePresence><FeedbackPopup /></AnimatePresence>

            <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}>
                <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                        <Activity size={36} style={{color: 'rgb(52,211,153)'}}/>
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0',color: 'rgb(255, 255, 255)' }}>Gestão de Tempos</h1>
                            <p style={{ fontSize: '1rem', color: 'rgba(191,219,254,1)', margin: 0 }}>Seus registros e ferramentas de produtividade.</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                         {(permissions.isOrgAdmin || permissions.canLogTime) && ( // Ensure user can log time
                            <>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleTimeEntryForm}
                                style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: `1px solid rgba(59,130,246, ${showTimeEntryForm ? 0.6 : 0.3})`, background: `rgba(59,130,246, ${showTimeEntryForm ? 0.3 : 0.2})`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {showTimeEntryForm ? <X size={18}/> : <Plus size={18}/>} {showTimeEntryForm ? 'Cancelar' : 'Nova Entrada'}
                            </motion.button>
                            </>
                         )}
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={generateExcelReport} disabled={isLoadingOverall || timeEntries.length === 0}
                            style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (isLoadingOverall || timeEntries.length === 0) ? 0.7 : 1 }}>
                            <Download size={18}/> Exportar
                        </motion.button>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {showTimeEntryForm && (permissions.isOrgAdmin || permissions.canLogTime) && (
                         <TimeEntryCombinedForm
                            clients={clients} tasks={tasks} categories={categories}
                            onFormSubmit={handleFormSubmit}
                            isSubmitting={createTimeEntryMutation.isPending || createNlpTimeEntryMutation.isPending}
                            permissions={permissions}
                        />
                    )}
                </AnimatePresence>

                <TimeEntryListFilters clientsData={clients} />
                
                <TimeEntryList
                    timeEntriesData={timeEntries}
                    onDeleteEntry={handleDeleteEntry}
                    onDuplicateEntry={handleDuplicateEntry}
                    permissions={permissions}
                    formatMinutesFunc={formatMinutesForDisplay}
                    isLoading={isLoadingEntries}
                />
                 <AnimatePresence>
                    {nlpExtractedEntries && ( // showNLPConfirmationDialog is implicitly handled by nlpExtractedEntries not being null
                        <TimeEntryNLPConfirmation
                            onConfirm={handleConfirmNLPCreate}
                            isProcessingNLP={createNlpTimeEntryMutation.isPending}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
            {/* ... Floating Action Button and Styles ... */}
             <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1, type: "spring", stiffness: 200 }}
                style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
                <motion.button whileHover={{ scale: 1.1, boxShadow: '0 0 30px rgba(147,51,234,0.5)' }} whileTap={{ scale: 0.9 }}
                style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, rgb(147,51,234), rgb(196,181,253))', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(147,51,234,0.3)' }}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <motion.div animate={{ rotate: [0, 15, -10, 15, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}><Brain size={24} /></motion.div>
                </motion.button>
            </motion.div>
            
      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.5) !important; }
        select option { background: #1f2937 !important; color: white !important; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
        * { transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease; }
        button:hover { transform: translateY(-1px); }
        button:focus, input:focus, select:focus, textarea:focus { outline: 2px solid rgba(59,130,246,0.5); outline-offset: 2px; }
        /* Switch for Natural Language Mode */
        .switch { position: relative; display: inline-block; width: 40px; height: 20px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255,255,255,0.2); transition: .4s; border-radius: 20px; }
        .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: rgb(147, 51, 234); }
        input:focus + .slider { box-shadow: 0 0 1px rgb(147, 51, 234); }
        input:checked + .slider:before { transform: translateX(20px); }
        .slider.round { border-radius: 20px; }
        .slider.round:before { border-radius: 50%; }
      `}</style>
        </div>
    );
};

export default TimeEntry;
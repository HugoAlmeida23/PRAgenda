import React, { useState, useMemo, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import api from "../api";
// Removed "../styles/Home.css"; as styles will be inline or via <style jsx>
import {
  Clock,
  Calendar,
  Search,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Grid,
  List,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowRight,
  FileText,
  Brain,
  Sparkles,
  Activity,
  Target,
  Settings,
  User, // Added for consistency if needed later
} from "lucide-react";
import AutoTimeTracking from "../components/AutoTimeTracking"; // Assuming this component exists
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from "../contexts/PermissionsContext";
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundElements from "../components/HeroSection/BackgroundElements";

// Estilos glass
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px'
};

// Variantes de animação
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 200, damping: 20 }
  }
};

const ErrorView = ({ message, onRetry }) => (
  <div style={{
    position: 'relative',
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    textAlign: 'center',
    color: 'white'
  }}>
            <BackgroundElements businessStatus="optimal" />

    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        ...glassStyle,
        padding: '2rem',
        maxWidth: '500px',
      }}
    >
      <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>
        Ocorreu um erro!
      </h2>
      <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
        {message || 'Falha ao carregar dados.'}
      </p>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          style={{
            ...glassStyle,
            padding: '0.75rem 1.5rem',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            background: 'rgba(59, 130, 246, 0.2)',
            color: 'white',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginTop: '1rem'
          }}
        >
          <RotateCcw size={18} />
          Tentar novamente
        </motion.button>
      )}
    </motion.div>
  </div>
);


// Funções de obtenção de dados (fora do componente)
const fetchTimeEntries = async (filters = {}) => {
  let url = "/time-entries/?";
  const params = new URLSearchParams();

  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  if (filters.client) params.append('client', filters.client);
  if (filters.searchQuery) params.append('search', filters.searchQuery);
  if (filters.sortField && filters.sortDirection) {
    params.append('ordering', `${filters.sortDirection === 'desc' ? '-' : ''}${filters.sortField}`);
  }
  
  url += params.toString();
  const response = await api.get(url);
  return response.data;
};

const fetchClients = async () => {
  const response = await api.get("/clients/");
  return response.data;
};

const fetchTaskCategories = async () => {
  const response = await api.get("/task-categories/");
  return response.data;
};

const fetchTasks = async () => {
  const response = await api.get("/tasks/");
  return response.data;
};

const TimeEntry = () => {
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'date', 'client'
  const [lastSavedEntry, setLastSavedEntry] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    client: "",
    task: "",
    category: "",
    description: "",
    minutes_spent: 0,
    date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    original_text: "",
    task_status_after: "no_change",
  });
  const [isNaturalLanguageMode, setIsNaturalLanguageMode] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAutoTracking, setShowAutoTracking] = useState(false); // Assuming AutoTimeTracking component will be styled similarly
  const [viewMode, setViewMode] = useState('list'); 
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    client: "",
    searchQuery: "", // This will be updated from the top-level searchQuery state
    sortField: "date",
    sortDirection: "desc"
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedEntries, setExtractedEntries] = useState(null);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);


  // Consultas React Query
  const {
    data: timeEntries = [],
    isLoading: isLoadingEntries,
    isError: isErrorEntries,
    error: entriesError,
    refetch: refetchTimeEntries
  } = useQuery({
    queryKey: ['timeEntries', filters],
    queryFn: () => fetchTimeEntries(filters),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: clients = [],
    isLoading: isLoadingClients
  } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: taskCategories = [],
    isLoading: isLoadingCategories
  } = useQuery({
    queryKey: ['taskCategories'],
    queryFn: fetchTaskCategories,
    staleTime: 10 * 60 * 1000,
  });

  const {
    data: tasks = [],
    isLoading: isLoadingTasks
  } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    staleTime: 10 * 60 * 1000,
  });

  // Mutações React Query
  const createTimeEntryMutation = useMutation({
    mutationFn: (entryData) => api.post("/time-entries/", entryData),
    onSuccess: (data) => {
      toast.success("Registo de tempo criado com sucesso");
      setLastSavedEntry(data); // Assuming data structure is { client_name: "...", minutes_spent: ... }
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
    onError: (error) => {
      console.error("Erro ao criar registo de tempo:", error);
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        const messages = Object.entries(errorData)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('; ');
        toast.error(`Falha ao criar registo: ${messages || "Erro desconhecido."}`);
      } else {
        toast.error("Falha ao criar registo de tempo.");
      }
    }
  });

  const deleteTimeEntryMutation = useMutation({
    mutationFn: (entryId) => api.delete(`/time-entries/${entryId}/`),
    onSuccess: () => {
      toast.success("Registo de tempo eliminado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
    onError: (error) => {
      console.error("Erro ao eliminar registo de tempo:", error);
      toast.error("Falha ao eliminar registo de tempo");
    }
  });

  // Manipuladores de eventos
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const handleNaturalLanguageInputChange = useCallback((e) => {
    setNaturalLanguageInput(e.target.value);
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  }, []);


  const resetFilters = useCallback(() => {
    setFilters({
      startDate: "",
      endDate: "",
      client: "",
      searchQuery: "",
      sortField: "date",
      sortDirection: "desc"
    });
    setSearchQuery("");
  }, []);

  const handleNaturalLanguageSubmit = async (e) => {
    e.preventDefault();
    if (!naturalLanguageInput) {
      toast.error("Por favor insira uma descrição da sua atividade");
      return;
    }
    setIsProcessing(true);
    try {
      const response = await api.post("/gemini-nlp/process_text/", {
        text: naturalLanguageInput,
        client_id: formData.client || null,
      });
      const extractedData = response.data;
      if (extractedData.clients.length === 0 && !formData.client) {
        toast.warning("Não consegui identificar nenhum cliente no texto. Por favor selecione um cliente manualmente.");
        setIsProcessing(false);
        return;
      }
      if (extractedData.times.length === 0) {
        toast.warning("Não consegui identificar o tempo gasto nas atividades. Por favor verifique ou especifique manualmente.");
        setIsProcessing(false);
        return;
      }
      setExtractedEntries(extractedData);
      setShowConfirmationDialog(true);
    } catch (error) {
      console.error("Erro ao processar texto natural:", error);
      toast.error("Ocorreu um erro ao processar seu texto. Por favor tente novamente ou use o formulário manual.");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAndCreateEntries = useCallback(async () => {
    setIsProcessing(true);
    try {
      const payload = {
        text: naturalLanguageInput,
        client_id: formData.client || (extractedEntries?.clients?.[0]?.id) || null,
        date: formData.date,
        task_status_after: formData.task_status_after,
        task_id: formData.task || (extractedEntries?.tasks?.[0]?.id) || null,
      };
      const response = await api.post("/gemini-nlp/create_time_entries/", payload);
      toast.success(`${response.data.length} entrada(s) de tempo criada(s) com sucesso!`);
      resetForm();
      setShowConfirmationDialog(false);
      setExtractedEntries(null);
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    } catch (error) {
      console.error("Erro ao criar entradas de tempo:", error);
      toast.error("Ocorreu um erro ao criar as entradas de tempo.");
    } finally {
      setIsProcessing(false);
    }
  }, [naturalLanguageInput, formData, extractedEntries, queryClient]);


  const handleSort = useCallback((field) => {
    setFilters(prevFilters => {
      const newDirection =
        prevFilters.sortField === field && prevFilters.sortDirection === "asc"
          ? "desc"
          : "asc";
      return { ...prevFilters, sortField: field, sortDirection: newDirection };
    });
  }, []);
  

  const validateForm = () => {
    const errors = {};
    if (!isNaturalLanguageMode) {
        if (!formData.client) errors.client = "Cliente é obrigatório";
        if (!formData.description) errors.description = "Descrição é obrigatória";
        if (!formData.minutes_spent || formData.minutes_spent <= 0) errors.minutes_spent = "Tempo gasto deve ser maior que zero";
    
        if (formData.start_time && formData.end_time) {
          const startMinutes = timeToMinutes(formData.start_time);
          const endMinutes = timeToMinutes(formData.end_time);
          if (endMinutes <= startMinutes) {
            errors.end_time = "Horário de término deve ser após o início";
          }
          const calculatedMinutes = endMinutes - startMinutes;
          if (Math.abs(calculatedMinutes - formData.minutes_spent) > 1) { // Allow 1 min diff for rounding
            errors.minutes_spent = "Tempo total não corresponde aos horários informados. Diferença: " + Math.abs(calculatedMinutes - formData.minutes_spent) + " minutos.";
          }
        } else if (formData.start_time && !formData.end_time) {
            errors.end_time = "Horário de término é obrigatório se o de início for fornecido.";
        } else if (!formData.start_time && formData.end_time) {
            errors.start_time = "Horário de início é obrigatório se o de término for fornecido.";
        }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const timeToMinutes = (timeString) => {
    if (!timeString || !timeString.includes(':')) return 0;
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
    return (hours || 0) * 60 + (minutes || 0);
  };

  const duplicateEntry = useCallback((entry) => {
    setFormData({
      client: entry.client,
      task: entry.task || "",
      category: entry.category || "",
      description: entry.description,
      minutes_spent: entry.minutes_spent,
      date: new Date().toISOString().split("T")[0],
      start_time: entry.start_time || "",
      end_time: entry.end_time || "",
      task_status_after: entry.task_status_after || "no_change",
      original_text: entry.original_text || ""
    });
    setIsNaturalLanguageMode(false); // Assume duplication goes to manual mode
    setShowForm(true);
    toast.info("Entrada duplicada! Edite se necessário e salve.");
  }, []);

  const getTaskStatusLabel = (status) => {
    switch (status) {
      case 'in_progress': return 'Em Progresso';
      case 'completed': return 'Concluída';
      default: return 'Sem alteração';
    }
  };

  const generateExcelReport = async () => {
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
          formatMinutes(clientTotalMinutes),
          entries.length,
          `${percentage}%`
        ]);
      });
      summaryData.push(['TOTAL', formatMinutes(totalAllClientsMinutes), timeEntries.length, '100%']);
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
            formatMinutes(entry.minutes_spent)
          ]);
        });
        const totalClientMinutes = sortedEntries.reduce((sum, entry) => sum + entry.minutes_spent, 0);
        clientSheetData.push(['', '', '', 'TOTAL', totalClientMinutes, formatMinutes(totalClientMinutes)]);
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
      toast.dismiss("generating-excel");
      toast.success("Relatório Excel gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar relatório Excel:", error);
      toast.dismiss("generating-excel");
      toast.error("Ocorreu um erro ao gerar o relatório Excel");
    }
  };

  const displayedEntries = useMemo(() => {
    // This function now primarily handles grouping, filtering is done by query
    if (groupBy === 'none') return { 'Todos os registros': timeEntries };
    return timeEntries.reduce((groups, entry) => {
      const key = groupBy === 'date' ? entry.date : (entry.client_name || "Sem Cliente");
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
      return groups;
    }, {});
  }, [timeEntries, groupBy]);

  const SaveFeedback = ({ entry, onDuplicate, onClose }) => {
    if (!entry) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            zIndex: 1000,
            ...glassStyle,
            padding: '1rem',
            background: 'rgba(52, 211, 153, 0.2)', // Greenish glass
            border: '1px solid rgba(52, 211, 153, 0.3)',
            maxWidth: '350px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <CheckCircle size={20} style={{ color: 'rgb(52, 211, 153)', marginRight: '0.75rem', marginTop: '0.125rem' }} />
          <div>
            <h4 style={{ fontWeight: '600', color: 'white', margin: '0 0 0.25rem 0' }}>
                Registro salvo com sucesso
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
              {formatMinutes(entry.data.minutes_spent)} registrados para {entry.data.client_name}
            </p>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDuplicate(entry.data)}
                style={{
                    fontSize: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                }}
              >
                Duplicar
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    background: 'none',
                    border: 'none',
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer'
                }}
              >
                Fechar
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Por favor corrija os erros no formulário.");
      return;
    }
    if (isNaturalLanguageMode) {
      await handleNaturalLanguageSubmit(e);
    } else {
      const submissionData = { ...formData };
      submissionData.start_time = submissionData.start_time ? formatTimeForAPI(submissionData.start_time) : null;
      submissionData.end_time = submissionData.end_time ? formatTimeForAPI(submissionData.end_time) : null;
      createTimeEntryMutation.mutate(submissionData);
    }
  };

  const resetForm = useCallback(() => {
    setFormData({
      client: "", task: "", category: "", description: "",
      minutes_spent: 0, date: new Date().toISOString().split("T")[0],
      start_time: "", end_time: "", original_text: "", task_status_after: "no_change",
    });
    setNaturalLanguageInput("");
    setShowForm(false);
    setFormErrors({});
  }, []);

  const handleDeleteEntry = useCallback((entryId) => {
    const canDelete = permissions.isOrgAdmin || permissions.canEditAllTime;
    if (!canDelete) {
      toast.error("Você não tem permissão para excluir registros de tempo");
      return;
    }
    if (window.confirm("Tem certeza que deseja eliminar este registo de tempo?")) {
      deleteTimeEntryMutation.mutate(entryId);
    }
  }, [permissions, deleteTimeEntryMutation]);

  const formatTimeForAPI = (timeString) => {
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) return timeString;
    if (/^\d{2}:\d{2}$/.test(timeString)) return `${timeString}:00`;
    try {
      const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    } catch (e) {
      console.error("Erro ao formatar hora:", e);
      return null; 
    }
  };

  const formatMinutes = (minutes) => {
    if (minutes === null || minutes === undefined) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const isLoadingOverall = isLoadingEntries || isLoadingClients || isLoadingCategories || isLoadingTasks ||
    createTimeEntryMutation.isPending || deleteTimeEntryMutation.isPending || isProcessing;

  if (permissions.loading) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity }}}>
          <Brain size={48} style={{ color: 'rgb(147, 51, 234)' }} />
        </motion.div>
        <p style={{ marginLeft: '1rem', fontSize: '1rem' }}>Carregando...</p>
      </div>
    );
  }

  if (!permissions.canLogTime) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'white' }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...glassStyle, padding: '2rem', textAlign: 'center', maxWidth: '500px' }}>
          <AlertCircle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Acesso Restrito</h2>
          <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>Você não possui permissões para registrar tempo.</p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>Entre em contato com o administrador.</p>
        </motion.div>
      </div>
    );
  }
  
  if (isErrorEntries) {
    return <ErrorView message={entriesError?.message || "Erro ao carregar registos de tempo"} onRetry={refetchTimeEntries} />;
  }

  const ConfirmationDialog = ({ visible, extractedData, onConfirm, onCancel }) => {
    if (!visible || !extractedData) return null;
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          style={{ ...glassStyle, width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', color: 'white' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Confirmar Entradas de Tempo</h2>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <p style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>
              Encontrei as seguintes informações no seu texto. Por favor verifique e confirme:
            </p>
            {/* Clients */}
            {extractedData.clients?.length > 0 ? (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '500', color: 'white' }}>Clientes:</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {extractedData.clients.map((client, index) => (
                    <li key={index} style={{ color: 'rgba(255,255,255,0.8)' }}>{client.name}</li>
                  ))}
                </ul>
              </div>
            ) : (<div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '8px' }}><p style={{color: 'rgb(251, 191, 36)', fontSize: '0.875rem' }}>Nenhum cliente novo identificado. Será usado o cliente padrão selecionado (se houver).</p></div>)}
            {/* Tasks */}
            {extractedData.tasks?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '500', color: 'white' }}>Tarefas:</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {extractedData.tasks.map((task, index) => (
                    <li key={index} style={{ color: 'rgba(255,255,255,0.8)' }}>{task.title} {task.client_name && `(${task.client_name})`}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Times */}
            {extractedData.times?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '500', color: 'white' }}>Tempos:</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {extractedData.times.map((minutes, index) => ( <li key={index} style={{ color: 'rgba(255,255,255,0.8)' }}>{formatMinutes(minutes)}</li> ))}
                </ul>
              </div>
            )}
            {/* Activities */}
             {extractedData.activities?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '500', color: 'white' }}>Atividades:</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {extractedData.activities.map((activity, index) => ( <li key={index} style={{ color: 'rgba(255,255,255,0.8)' }}>{activity}</li> ))}
                </ul>
              </div>
            )}
             {/* Categories */}
            {extractedData.categories?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '500', color: 'white' }}>Categorias:</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {extractedData.categories.map((category, index) => ( <li key={index} style={{ color: 'rgba(255,255,255,0.8)' }}>{category.name}</li> ))}
                </ul>
              </div>
            )}
            {formData.task_status_after !== 'no_change' && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px' }}>
                    <p style={{color: 'rgb(59, 130, 246)', fontSize: '0.875rem' }}><strong>Status da Tarefa:</strong> Será alterado para "{getTaskStatusLabel(formData.task_status_after)}"</p>
                </div>
            )}
          </div>
          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onCancel} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Cancelar</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onConfirm} style={{ padding: '0.75rem 1.5rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Confirmar e Criar</motion.button>
          </div>
        </motion.div>
      </div>
    );
  };
  
  const TimeEntryCard = ({ entry, onDelete, onDuplicate, permissions }) => (
    <motion.div
      variants={itemVariants}
      style={{
        ...glassStyle,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        opacity: entry.is_billed ? 0.7 : 1, // Example: Dim if billed
        borderLeft: entry.is_billed ? '4px solid rgb(251, 146, 60)' : `4px solid ${entry.client_color || 'rgb(59, 130, 246)'}`, // Client color or default
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
          <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{entry.date}</span>
        </div>
        <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', borderRadius: '9999px', background: 'rgba(59, 130, 246, 0.2)', color: 'rgb(59, 130, 246)' }}>
          {formatMinutes(entry.minutes_spent)}
        </span>
      </div>
      <h3 style={{ fontWeight: '600', fontSize: '1rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.client_name || "Cliente não especificado"}
      </h3>
      {entry.task_title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
          <Activity size={14} />
          <span>{entry.task_title}</span>
        </div>
      )}
      <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', margin: 0, flexGrow: 1, maxHeight: '3.9em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
        {entry.description}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
          {entry.start_time && entry.end_time ? `${entry.start_time.substring(0,5)} - ${entry.end_time.substring(0,5)}` : "Sem horário"}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDuplicate(entry)} title="Duplicar" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '0.5rem', color: 'white', cursor: 'pointer' }}>
            <Copy size={16} />
          </motion.button>
          {(permissions.isOrgAdmin || permissions.canEditAllTime) && (
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDelete(entry.id)} title="Excluir" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(239,68,68)', cursor: 'pointer' }}>
              <Trash2 size={16} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const ViewToggle = ({ activeView, onChange }) => (
    <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onChange('grid')}
        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: activeView === 'grid' ? 'rgba(59,130,246,0.3)' : 'transparent', color: 'white' }}>
        <Grid size={16} /> Cartões
      </motion.button>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => onChange('list')}
        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: '500', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: activeView === 'list' ? 'rgba(59,130,246,0.3)' : 'transparent', color: 'white' }}>
        <List size={16} /> Tabela
      </motion.button>
    </div>
  );

  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
        <BackgroundElements businessStatus="optimal" />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 9999 }}/>
      <AnimatePresence>
        {lastSavedEntry && (
          <SaveFeedback entry={lastSavedEntry} onDuplicate={duplicateEntry} onClose={() => setLastSavedEntry(null)} />
        )}
      </AnimatePresence>
      
      <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}>
        {/* Header */}
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Registo de Tempos
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>Monitorize e gira o seu tempo eficientemente.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => { setShowForm(!showForm); if (showAutoTracking) setShowAutoTracking(false); }}
              style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: `1px solid rgba(${showForm ? '239,68,68,0.3' : '59,130,246,0.3'})`, background: `rgba(${showForm ? '239,68,68,0.2' : '59,130,246,0.2'})`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              <Plus size={18} /> {showForm ? "Cancelar" : "Registar Tempo"}
            </motion.button>
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={generateExcelReport} disabled={isLoadingOverall || timeEntries.length === 0}
              style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              <Download size={18} /> Exportar
            </motion.button>
          </div>
        </motion.div>

        <ConfirmationDialog visible={showConfirmationDialog} extractedData={extractedEntries} onConfirm={confirmAndCreateEntries} onCancel={() => setShowConfirmationDialog(false)} />
        {isProcessing && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
                <motion.div style={{ ...glassStyle, padding: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59,130,246)'}} />
                    <p style={{ fontSize: '1rem', color: 'white' }}>Processando texto...</p>
                </motion.div>
            </div>
        )}
        
        {/* Auto Tracking Component (if shown) */}
        {showAutoTracking && (
          <motion.div variants={itemVariants} style={{ marginBottom: '2rem' }}>
            <AutoTimeTracking onTimeEntryCreated={() => queryClient.invalidateQueries({ queryKey: ['timeEntries'] })} />
          </motion.div>
        )}

        {/* Form Section */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3 }} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: '12px' }}><Clock style={{ color: 'rgb(59,130,246)'}} size={20} /></div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Registar Tempo</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>Adicione uma nova entrada de tempo manual ou por linguagem natural.</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)'}}>Linguagem Natural</span>
                  <label className="switch"> {/* Ensure .switch .slider styles are in <style jsx> */}
                    <input type="checkbox" checked={isNaturalLanguageMode} onChange={() => setIsNaturalLanguageMode(!isNaturalLanguageMode)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
              <form onSubmit={handleSubmit}>
                {isNaturalLanguageMode ? (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Cliente (Opcional)</label>
                      <select name="client" value={formData.client} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                        <option value="" style={{ background: '#1f2937', color: 'white' }}>Selecionar Cliente (Padrão)</option>
                        {clients.map((client) => (<option key={client.id} value={client.id} style={{ background: '#1f2937', color: 'white' }}>{client.name}</option>))}
                      </select>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Descreva a sua atividade *</label>
                      <textarea value={naturalLanguageInput} onChange={handleNaturalLanguageInputChange} placeholder="Ex: 2h declaração IVA cliente ABC, 30m reunião XYZ" rows={3} required style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', resize: 'vertical' }} />
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>O sistema irá extrair o tempo, cliente e outras informações.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Data</label>
                            <input type="date" name="date" value={formData.date} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Status da Tarefa (Após)</label>
                            <select name="task_status_after" value={formData.task_status_after} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                                <option value="no_change" style={{ background: '#1f2937', color: 'white' }}>Sem alteração</option>
                                <option value="in_progress" style={{ background: '#1f2937', color: 'white' }}>Marcar como Em Progresso</option>
                                <option value="completed" style={{ background: '#1f2937', color: 'white' }}>Marcar como Concluída</option>
                            </select>
                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>Aplicado à tarefa identificada no texto.</p>
                        </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                      {/* Client, Task, Category, Date, Minutes Spent, Start/End Time */}
                       <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Cliente *</label>
                        <select name="client" value={formData.client} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: `1px solid ${formErrors.client ? 'rgb(239,68,68)' : 'rgba(255,255,255,0.2)'}`, borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                            <option value="" style={{ background: '#1f2937', color: 'white' }}>Selecionar Cliente</option>
                            {clients.map((client) => (<option key={client.id} value={client.id} style={{ background: '#1f2937', color: 'white' }}>{client.name}</option>))}
                        </select>
                        {formErrors.client && <p style={{fontSize: '0.75rem', color: 'rgb(239,68,68)', marginTop: '0.25rem'}}>{formErrors.client}</p>}
                       </div>
                       <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Tarefa (Opcional)</label>
                        <select name="task" value={formData.task} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                            <option value="" style={{ background: '#1f2937', color: 'white' }}>Selecionar Tarefa</option>
                            {tasks.filter(task => (!formData.client || task.client === formData.client) && task.status !== "completed").map(task => (<option key={task.id} value={task.id} style={{ background: '#1f2937', color: 'white' }}>{task.title}</option>))}
                        </select>
                       </div>
                       <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Categoria (Opcional)</label>
                        <select name="category" value={formData.category} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                            <option value="" style={{ background: '#1f2937', color: 'white' }}>Selecionar Categoria</option>
                            {taskCategories.map((category) => (<option key={category.id} value={category.id} style={{ background: '#1f2937', color: 'white' }}>{category.name}</option>))}
                        </select>
                       </div>
                       <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Status da Tarefa (Após)</label>
                            <select name="task_status_after" value={formData.task_status_after} onChange={handleInputChange} disabled={!formData.task} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', opacity: !formData.task ? 0.5 : 1 }}>
                                <option value="no_change" style={{ background: '#1f2937', color: 'white' }}>Sem alteração</option>
                                <option value="in_progress" style={{ background: '#1f2937', color: 'white' }}>Marcar como Em Progresso</option>
                                <option value="completed" style={{ background: '#1f2937', color: 'white' }}>Marcar como Concluída</option>
                            </select>
                            {!formData.task && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>Selecione uma tarefa.</p>}
                        </div>
                       <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Data *</label>
                        <input type="date" name="date" value={formData.date} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} />
                       </div>
                       <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Minutos Gastos *</label>
                        <input type="number" name="minutes_spent" value={formData.minutes_spent} onChange={handleInputChange} required min="1" style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: `1px solid ${formErrors.minutes_spent ? 'rgb(239,68,68)' : 'rgba(255,255,255,0.2)'}`, borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} />
                        {formErrors.minutes_spent && <p style={{fontSize: '0.75rem', color: 'rgb(239,68,68)', marginTop: '0.25rem'}}>{formErrors.minutes_spent}</p>}
                       </div>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Hora Início</label>
                                <input type="time" name="start_time" value={formData.start_time} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: `1px solid ${formErrors.start_time ? 'rgb(239,68,68)' : 'rgba(255,255,255,0.2)'}`, borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} />
                                {formErrors.start_time && <p style={{fontSize: '0.75rem', color: 'rgb(239,68,68)', marginTop: '0.25rem'}}>{formErrors.start_time}</p>}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Hora Fim</label>
                                <input type="time" name="end_time" value={formData.end_time} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: `1px solid ${formErrors.end_time ? 'rgb(239,68,68)' : 'rgba(255,255,255,0.2)'}`, borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} />
                                {formErrors.end_time && <p style={{fontSize: '0.75rem', color: 'rgb(239,68,68)', marginTop: '0.25rem'}}>{formErrors.end_time}</p>}
                            </div>
                       </div>
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Descrição *</label>
                      <textarea name="description" value={formData.description} onChange={handleInputChange} rows={2} required style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: `1px solid ${formErrors.description ? 'rgb(239,68,68)' : 'rgba(255,255,255,0.2)'}`, borderRadius: '8px', color: 'white', fontSize: '0.875rem', resize: 'vertical' }} />
                      {formErrors.description && <p style={{fontSize: '0.75rem', color: 'rgb(239,68,68)', marginTop: '0.25rem'}}>{formErrors.description}</p>}
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={resetForm} style={{ padding: '0.75rem 1.5rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}>Cancelar</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" disabled={isLoadingOverall} style={{ padding: '0.75rem 1.5rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isLoadingOverall ? (<Loader2 size={16} className="animate-spin" />) : (isNaturalLanguageMode ? "Processar e Criar" : "Guardar Registo")}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Section */}
        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showFilters ? '1.5rem' : 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Filtros e Pesquisa</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>Configure a visualização conforme necessário.</p>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowFilters(!showFilters)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}>
              {showFilters ? <EyeOff size={20} /> : <Eye size={20} />}
            </motion.button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: showFilters ? '1rem' : 0 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
                  style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                  <option value="none" style={{ background: '#1f2937', color: 'white' }}>Sem Agrupamento</option>
                  <option value="date" style={{ background: '#1f2937', color: 'white' }}>Agrupar por Data</option>
                  <option value="client" style={{ background: '#1f2937', color: 'white' }}>Agrupar por Cliente</option>
                </select>
                <ViewToggle activeView={viewMode} onChange={setViewMode} />
            </div>
            <div style={{ position: 'relative', minWidth: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
              <input type="text" placeholder="Pesquisar..." value={searchQuery} onChange={handleSearchChange}
                style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}/>
            </div>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Data Início</label>
                  <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', fontSize: '0.875rem' }}/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Data Fim</label>
                  <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', fontSize: '0.875rem' }}/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)'}}>Cliente</label>
                  <select name="client" value={filters.client} onChange={handleFilterChange} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', fontSize: '0.875rem' }}>
                    <option value="" style={{ background: '#1f2937', color: 'white' }}>Todos</option>
                    {clients.map(client => (<option key={client.id} value={client.id} style={{ background: '#1f2937', color: 'white' }}>{client.name}</option>))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={resetFilters}
                    style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Limpar Filtros</motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Time Entries List/Grid */}
        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: 'rgba(52,211,153,0.2)', borderRadius: '12px' }}><Activity style={{ color: 'rgb(52,211,153)'}} size={20} /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Registos de Tempo</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>{timeEntries.length} registos encontrados</p>
              </div>
            </div>
          </div>
          {isLoadingOverall ? (
            <div style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><Loader2 size={32} style={{ color: 'rgb(59,130,246)'}} /></motion.div>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>Carregando registos...</p>
            </div>
          ) : timeEntries.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
              <Clock size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Nenhum registo encontrado</h4>
              <p style={{ margin: 0 }}>Tente ajustar os filtros ou crie um novo registo.</p>
            </div>
          ) : (
            <div style={{ padding: viewMode === 'grid' ? '1.5rem' : '0' }}>
              {viewMode === 'list' ? (
                  Object.entries(displayedEntries).map(([groupName, entriesInGroup]) => (
                    <div key={groupName}>
                      {groupBy !== 'none' && (
                        <h3 style={{ margin:0, padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600' }}>
                            {groupName} ({entriesInGroup.length} {entriesInGroup.length === 1 ? 'registo' : 'registos'})
                        </h3>
                      )}
                       <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ backgroundColor: groupBy === 'none' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                            <tr>
                                {['date', 'client_name', 'task_title', 'description', 'minutes_spent'].map(field => (
                                <th key={field} style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSort(field)}
                                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}>
                                    {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    {filters.sortField === field ? (filters.sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : (<ChevronDown size={16} style={{ opacity: 0.5 }} />)}
                                    </motion.button>
                                </th>
                                ))}
                                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>Ações</th>
                            </tr>
                            </thead>
                            <tbody>
                            {entriesInGroup.map((entry, index) => (
                                <motion.tr key={entry.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                                style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{entry.date}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{entry.client_name || "N/A"}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{entry.task_title || "N/A"}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description}</td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{formatMinutes(entry.minutes_spent)}</td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => duplicateEntry(entry)} title="Duplicar" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '0.5rem', color: 'white', cursor: 'pointer' }}><Copy size={16} /></motion.button>
                                    {(permissions.isOrgAdmin || permissions.canEditAllTime) && (
                                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteEntry(entry.id)} title="Excluir" disabled={deleteTimeEntryMutation.isPending} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(239,68,68)', cursor: 'pointer' }}><Trash2 size={16} /></motion.button>
                                    )}
                                    </div>
                                </td>
                                </motion.tr>
                            ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                  ))
              ) : ( // Grid View
                Object.entries(displayedEntries).map(([groupName, entriesInGroup]) => (
                    <div key={groupName}>
                        {groupBy !== 'none' && (
                            <h3 style={{ margin: '0 0 1rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '1rem', fontWeight: '600' }}>
                                {groupName} ({entriesInGroup.length} {entriesInGroup.length === 1 ? 'registo' : 'registos'})
                            </h3>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {entriesInGroup.map((entry, index) => (
                                <TimeEntryCard key={entry.id} entry={entry} onDelete={handleDeleteEntry} onDuplicate={duplicateEntry} permissions={permissions} />
                            ))}
                        </div>
                    </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </motion.div>

      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1, type: "spring", stiffness: 200 }}
        style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
        <motion.button whileHover={{ scale: 1.1, boxShadow: '0 0 30px rgba(147,51,234,0.5)' }} whileTap={{ scale: 0.9 }}
          style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, rgb(147,51,234), rgb(196,181,253))', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(147,51,234,0.3)' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}><Brain size={24} /></motion.div>
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
import React, { useState, useMemo, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import TimeEntryForms from "../components/TimeEntryForms"; // Path correto
import api from "../api";
import {
  Clock,
  Calendar,
  Search,
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
  Activity,
  Brain,
  User,
} from "lucide-react";
import AutoTimeTracking from "../components/AutoTimeTracking";
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

// Funções de obtenção de dados
const fetchTimeEntries = async (userId, filters = {}) => {
  let url = `/time-entries/?user=${userId}`;
  const params = new URLSearchParams();

  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  if (filters.client) params.append('client', filters.client);
  if (filters.searchQuery) params.append('search', filters.searchQuery);
  if (filters.sortField && filters.sortDirection) {
    params.append('ordering', `${filters.sortDirection === 'desc' ? '-' : ''}${filters.sortField}`);
  }
  
  const paramString = params.toString();
  if (paramString) {
    url += `&${paramString}`;
  }
  
  const response = await api.get(url);
  return response.data;
};

const fetchClients = async () => {
  const response = await api.get("/clients/");
  return response.data;
};

const TimeEntry = () => {
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('none');
  const [lastSavedEntry, setLastSavedEntry] = useState(null);
  const [showAutoTracking, setShowAutoTracking] = useState(false);
  const [viewMode, setViewMode] = useState('list'); 
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    client: "",
    searchQuery: "",
    sortField: "date",
    sortDirection: "desc"
  });
  
  // Consultas React Query
  const {
    data: timeEntries = [],
    isLoading: isLoadingEntries,
    isError: isErrorEntries,
    error: entriesError,
    refetch: refetchTimeEntries
  } = useQuery({
    queryKey: ['timeEntries', permissions.userId, filters],
    queryFn: () => fetchTimeEntries(permissions.userId, filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!permissions.userId,
  });

  const {
    data: clients = [],
    isLoading: isLoadingClients
  } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    staleTime: 10 * 60 * 1000,
  });

  // Mutation para delete
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

  // Handlers
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

  const handleSort = useCallback((field) => {
    setFilters(prevFilters => {
      const newDirection =
        prevFilters.sortField === field && prevFilters.sortDirection === "asc"
          ? "desc"
          : "asc";
      return { ...prevFilters, sortField: field, sortDirection: newDirection };
    });
  }, []);

  const duplicateEntry = useCallback((entry) => {
    // Esta função será chamada pelo TimeEntryForms quando necessário
    toast.info("Use o formulário acima para criar uma nova entrada baseada nesta.");
  }, []);

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
            background: 'rgba(52, 211, 153, 0.2)',
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
              {formatMinutes(entry.data?.minutes_spent || 0)} registrados para {entry.data?.client_name || 'Cliente'}
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

  const formatMinutes = (minutes) => {
    if (minutes === null || minutes === undefined) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const isLoadingOverall = isLoadingEntries || isLoadingClients || deleteTimeEntryMutation.isPending;

  // Success notification handler
  const showSuccess = (title, message) => {
    toast.success(`${title}: ${message}`);
  };

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

  const TimeEntryCard = ({ entry, onDelete, onDuplicate, permissions }) => (
    <motion.div
      variants={itemVariants}
      style={{
        ...glassStyle,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        opacity: entry.is_billed ? 0.7 : 1,
        borderLeft: entry.is_billed ? '4px solid rgb(251, 146, 60)' : `4px solid ${entry.client_color || 'rgb(59, 130, 246)'}`,
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
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={generateExcelReport} disabled={isLoadingOverall || timeEntries.length === 0}
              style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              <Download size={18} /> Exportar
            </motion.button>
          </div>
        </motion.div>

        {/* Auto Tracking Component (if shown) */}
        {showAutoTracking && (
          <motion.div variants={itemVariants} style={{ marginBottom: '2rem' }}>
            <AutoTimeTracking onTimeEntryCreated={() => queryClient.invalidateQueries({ queryKey: ['timeEntries'] })} />
          </motion.div>
        )}

        {/* TimeEntryForms Component */}
        <TimeEntryForms 
          onTimeEntryCreated={(newEntry) => {
            queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
            if (Array.isArray(newEntry)) {
              showSuccess("Entradas Criadas", `${newEntry.length} entradas de tempo criadas com sucesso`);
            } else {
              showSuccess("Entrada Criada", "Entrada de tempo criada com sucesso");
            }
          }}
          permissions={permissions}
        />

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
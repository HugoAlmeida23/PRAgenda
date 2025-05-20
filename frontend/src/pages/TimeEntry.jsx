import { useState, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify";
import Header from "../components/Header";
import api from "../api";
import "../styles/Home.css";
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
  List
} from "lucide-react";
import AutoTimeTracking from "../components/AutoTimeTracking";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from "../contexts/PermissionsContext";
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {  Copy,  Download, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

const ErrorView = ({ message, onRetry }) => (
  <div className="flex flex-col justify-center items-center min-h-[300px] p-4 text-center">
    <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-lg" role="alert">
      <strong className="font-bold block sm:inline">Ocorreu um erro!</strong>
      <span className="block sm:inline"> {message || 'Falha ao carregar dados.'}</span>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-white-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Tentar novamente
      </button>
    )}
  </div>
);

// Funções de obtenção de dados (fora do componente)
const fetchTimeEntries = async (filters = {}) => {
  let url = "/time-entries/?";

  if (filters.startDate && filters.endDate) {
    url += `start_date=${filters.startDate}&end_date=${filters.endDate}`;
  }

  if (filters.client) {
    url += `&client=${filters.client}`;
  }

  if (filters.searchQuery) {
    url += `&search=${encodeURIComponent(filters.searchQuery)}`;
  }

  // Adicionando suporte para ordenação
  if (filters.sortField && filters.sortDirection) {
    url += `&ordering=${filters.sortDirection === 'desc' ? '-' : ''}${filters.sortField}`;
  }

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
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'date', 'client'
  const [lastSavedEntry, setLastSavedEntry] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    field: "date",
    direction: "desc"
  });
  const [formErrors, setFormErrors] = useState({});
  // Estados locais
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
  });
  const [isNaturalLanguageMode, setIsNaturalLanguageMode] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAutoTracking, setShowAutoTracking] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' ou 'grid'
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    client: "",
    searchQuery: "",
    sortField: "date",
    sortDirection: "desc"
  });
  // Novos estados para o processamento NLP
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
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const {
    data: clients = [],
    isLoading: isLoadingClients
  } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    staleTime: 10 * 60 * 1000, // 10 minutos
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
      setLastSavedEntry(data);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
    onError: (error) => {
      console.error("Erro ao criar registo de tempo:", error);

      if (error.response?.data) {
        const errorMessages = [];

        for (const field in error.response.data) {
          const messages = error.response.data[field].join(', ');
          errorMessages.push(`${field}: ${messages}`);
        }

        if (errorMessages.length > 0) {
          toast.error(`Falha ao criar registo: ${errorMessages.join('; ')}`);
        } else {
          toast.error("Falha ao criar registo de tempo");
        }
      } else {
        toast.error("Falha ao criar registo de tempo");
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
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleNaturalLanguageInputChange = (e) => {
    setNaturalLanguageInput(e.target.value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const applyFilters = () => {
    // Atualizar filtros com a consulta de pesquisa
    setFilters(prev => ({
      ...prev,
      searchQuery: searchQuery,
    }));

    // A refetch é automática devido à dependência de filtros na queryKey
    refetchTimeEntries();
  };

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      client: "",
      searchQuery: "",
      sortField: "date",
      sortDirection: "desc"
    });
    setSearchQuery("");
  };

  const handleNaturalLanguageSubmit = async (e) => {
    e.preventDefault();

    if (!naturalLanguageInput) {
      toast.error("Por favor insira uma descrição da sua atividade");
      return;
    }

    // Mostrar estado de carregamento
    setIsProcessing(true);

    try {
      // Chamar o endpoint da API para processamento NLP com Gemini
      const response = await api.post("/gemini-nlp/process_text/", {
        text: naturalLanguageInput,
        client_id: formData.client || null,  // Cliente padrão (opcional)
      });

      const extractedData = response.data;

      // Verificar se foram encontrados dados suficientes
      if (extractedData.clients.length === 0 && !formData.client) {
        toast.warning("Não consegui identificar nenhum cliente no texto. Por favor selecione um cliente manualmente.");
        setIsProcessing(false);
        return;
      }

      // Verificar se foram extraídos tempos
      if (extractedData.times.length === 0) {
        toast.warning("Não consegui identificar o tempo gasto nas atividades. Por favor verifique ou especifique manualmente.");
        setIsProcessing(false);
        return;
      }

      // Mostrar ao usuário o que foi extraído para confirmação
      setExtractedEntries(extractedData);
      setShowConfirmationDialog(true);
    } catch (error) {
      console.error("Erro ao processar texto natural:", error);
      toast.error("Ocorreu um erro ao processar seu texto. Por favor tente novamente ou use o formulário manual.");
    } finally {
      setIsProcessing(false);
    }
  };


  const confirmAndCreateEntries = async () => {
    try {
      // Preparar dados para envio
      const payload = {
        text: naturalLanguageInput,
        client_id: formData.client || null,  // Cliente padrão (opcional)
        date: formData.date
      };

      // Se uma tarefa foi selecionada no formulário, enviar também o ID da tarefa
      if (formData.task) {
        payload.task_id = formData.task;
      }

      // Verificar se uma tarefa foi identificada no texto e foi selecionada na UI
      if (extractedEntries && extractedEntries.tasks && extractedEntries.tasks.length > 0) {
        // Podemos usar a primeira tarefa identificada se não houver uma selecionada
        if (!payload.task_id) {
          payload.task_id = extractedEntries.tasks[0].id;
        }
      }

      // Chamar o endpoint para criar entradas de tempo
      const response = await api.post("/gemini-nlp/create_time_entries/", payload);

      // Se bem-sucedido, exibir mensagem de sucesso
      toast.success(`${response.data.length} entrada(s) de tempo criada(s) com sucesso!`);

      // Limpar formulário e atualizar lista
      resetForm();
      setShowConfirmationDialog(false);
      setExtractedEntries(null);

      // Invalidar cache de consultas para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    } catch (error) {
      console.error("Erro ao criar entradas de tempo:", error);
      toast.error("Ocorreu um erro ao criar as entradas de tempo.");
    }
  };

  const handleSort = (field) => {
    setSortConfig(prevConfig => {
      const newDirection =
        prevConfig.field === field && prevConfig.direction === "asc"
          ? "desc"
          : "asc";

      // Atualizar filtros com os novos parâmetros de ordenação
      setFilters(prev => ({
        ...prev,
        sortField: field,
        sortDirection: newDirection
      }));

      return { field, direction: newDirection };
    });
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.client) errors.client = "Cliente é obrigatório";
    if (!formData.description) errors.description = "Descrição é obrigatória";
    if (!formData.minutes_spent || formData.minutes_spent <= 0) errors.minutes_spent = "Tempo gasto deve ser maior que zero";

    // Validar conflito entre tempo total e horários específicos
    if (formData.start_time && formData.end_time) {
      const startMinutes = timeToMinutes(formData.start_time);
      const endMinutes = timeToMinutes(formData.end_time);

      if (endMinutes <= startMinutes) {
        errors.end_time = "Horário de término deve ser após o início";
      }

      // Verifica se os minutos calculados entre horários são consistentes
      const calculatedMinutes = endMinutes - startMinutes;
      if (Math.abs(calculatedMinutes - formData.minutes_spent) > 10) {
        errors.minutes_spent = "Tempo total não corresponde aos horários informados";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const timeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
    return hours * 60 + minutes;
  };

  const duplicateEntry = (entry) => {
    // Clone a entrada mas com a data atual
    const newEntry = {
      client: entry.client,
      task: entry.task || "",
      category: entry.category || "",
      description: entry.description,
      minutes_spent: entry.minutes_spent,
      date: new Date().toISOString().split("T")[0], // Data atual
      start_time: entry.start_time || "",
      end_time: entry.end_time || "",
    };

    // Preparar formulário para edição
    setFormData(newEntry);
    setShowForm(true);

    toast.success("Entrada duplicada! Edite se necessário e salve.");
  };


  const generateExcelReport = async () => {
  if (!timeEntries || timeEntries.length === 0) {
    toast.warn("Não há registros para gerar relatório");
    return;
  }

  try {
    toast.info("Gerando relatório Excel...", { autoClose: false, toastId: "generating-excel" });

    // Importar a biblioteca xlsx dinamicamente (caso não esteja no bundle)
    const XLSX = await import('xlsx');

    // Criar um novo workbook
    const wb = XLSX.utils.book_new();
    
    // Agrupar dados por cliente
    const clientGroups = timeEntries.reduce((acc, entry) => {
      if (!acc[entry.client_name]) {
        acc[entry.client_name] = [];
      }
      acc[entry.client_name].push(entry);
      return acc;
    }, {});

    // Planilha de resumo geral
    const summaryData = [];
    let totalAllClients = 0;
    
    // Adicionar linha de cabeçalho para o resumo
    summaryData.push(['Cliente', 'Total de Horas', 'Qtd. Registros', 'Percentual']);
    
    // Calcular totais e percentuais
    Object.entries(clientGroups).forEach(([clientName, entries]) => {
      const clientTotal = entries.reduce((sum, entry) => sum + entry.minutes_spent, 0);
      totalAllClients += clientTotal;
      summaryData.push([
        clientName,
        formatMinutes(clientTotal),
        entries.length,
        0 // Placeholder para a porcentagem, será calculado depois
      ]);
    });
    
    // Adicionar linha de total
    summaryData.push(['TOTAL', formatMinutes(totalAllClients), timeEntries.length, '100%']);
    
    // Calcular percentuais
    for (let i = 1; i < summaryData.length - 1; i++) {
      const clientTotal = summaryData[i][0] === 'TOTAL' 
        ? totalAllClients 
        : clientGroups[summaryData[i][0]].reduce((sum, entry) => sum + entry.minutes_spent, 0);
      const percentage = (clientTotal / totalAllClients * 100).toFixed(1);
      summaryData[i][3] = `${percentage}%`;
    }
    
    // Criar planilha de resumo
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Definir larguras de coluna para o resumo
    const summaryColWidths = [
      { wch: 30 }, // Cliente
      { wch: 15 }, // Total de Horas
      { wch: 15 }, // Qtd. Registros
      { wch: 12 }, // Percentual
    ];
    summaryWs['!cols'] = summaryColWidths;
    
    // Adicionar a planilha de resumo ao workbook
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo');
    
    // Criar uma planilha para cada cliente
    Object.entries(clientGroups).forEach(([clientName, entries]) => {
      // Ordenar entradas por data (mais recente primeiro)
      const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Preparar dados para a planilha
      const clientData = [];
      
      // Cabeçalho da tabela
      clientData.push(['Data', 'Descrição', 'Categoria', 'Tarefa', 'Minutos', 'Tempo']);
      
      // Adicionar entradas
      sortedEntries.forEach(entry => {
        clientData.push([
          entry.date,
          entry.description,
          entry.category_name || '',
          entry.task_title || '',
          entry.minutes_spent,
          formatMinutes(entry.minutes_spent)
        ]);
      });
      
      // Adicionar linha de total
      const totalMinutes = sortedEntries.reduce((sum, entry) => sum + entry.minutes_spent, 0);
      clientData.push(['', '', '', 'TOTAL', totalMinutes, formatMinutes(totalMinutes)]);
      
      // Criar planilha para o cliente
      const ws = XLSX.utils.aoa_to_sheet(clientData);
      
      // Definir larguras de coluna
      const colWidths = [
        { wch: 12 }, // Data
        { wch: 50 }, // Descrição
        { wch: 18 }, // Categoria
        { wch: 25 }, // Tarefa
        { wch: 10 }, // Minutos
        { wch: 12 }, // Tempo formatado
      ];
      ws['!cols'] = colWidths;
      
      // Adicionar a planilha ao workbook
      const safeSheetName = clientName.replace(/[\[\]\*\?\/\\]/g, '_').substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    });
    
    // Gerar arquivo Excel
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Criar link para download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatório_Tempo_${new Date().toISOString().split('T')[0]}.xlsx`;
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


  const filteredEntries = useMemo(() => {
    if (!timeEntries || timeEntries.length === 0) return [];
    if (!searchQuery) return timeEntries;

    const query = searchQuery.toLowerCase();
    return timeEntries.filter(entry =>
      entry.description.toLowerCase().includes(query) ||
      entry.client_name.toLowerCase().includes(query) ||
      (entry.task_title && entry.task_title.toLowerCase().includes(query))
    );
  }, [timeEntries, searchQuery]);

  // Agrupamento por dia/cliente
  const groupedEntries = useMemo(() => {
    if (groupBy === 'none') return { 'Todos os registros': filteredEntries };

    return filteredEntries.reduce((groups, entry) => {
      const key = groupBy === 'date' ? entry.date : entry.client_name;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
      return groups;
    }, {});
  }, [filteredEntries, groupBy]);

  // Componente para feedback após salvar
  const SaveFeedback = ({ entry, onDuplicate, onClose }) => {
    if (!entry) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 bg-green-100 border border-green-300 p-4 rounded-lg shadow-lg max-w-md z-50"
      >
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-800">Registro salvo com sucesso</h4>
            <p className="text-sm text-green-700 mt-1">
              {formatMinutes(entry.minutes_spent)} registrados para {entry.client_name}
            </p>
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => onDuplicate(entry)}
                className="text-xs bg-white text-green-700 px-2 py-1 rounded border border-green-300 hover:bg-green-50"
              >
                Duplicar
              </button>
              <button
                onClick={onClose}
                className="text-xs text-green-700 px-2 py-1 hover:underline"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isNaturalLanguageMode) {
      // Usar o método para processamento de linguagem natural
      await handleNaturalLanguageSubmit(e);
    } else {
      // Validar campos obrigatórios para o formulário manual
      if (!validateForm()) {
        // Mostrar mensagem de erro se a validação falhar
        toast.error("Por favor corrija os erros no formulário");
        return;
      }

      // Formatar horas se fornecidas
      const submissionData = { ...formData };

      if (submissionData.start_time) {
        submissionData.start_time = formatTimeForAPI(submissionData.start_time);
      }

      if (submissionData.end_time) {
        submissionData.end_time = formatTimeForAPI(submissionData.end_time);
      }

      // Envio regular do formulário
      createTimeEntryMutation.mutate(submissionData);
    }
  };

  const resetForm = () => {
    setFormData({
      client: "",
      task: "",
      category: "",
      description: "",
      minutes_spent: 0,
      date: new Date().toISOString().split("T")[0],
      start_time: "",
      end_time: "",
      original_text: "",
    });
    setNaturalLanguageInput("");
    setShowForm(false);
  };

  const handleDeleteEntry = (entryId) => {
    // Verificar permissão para excluir registros de tempo
    const canDelete = permissions.isOrgAdmin || permissions.canEditAllTime;

    if (!canDelete) {
      toast.error("Você não tem permissão para excluir registros de tempo");
      return;
    }

    if (window.confirm("Tem certeza que deseja eliminar este registo de tempo?")) {
      deleteTimeEntryMutation.mutate(entryId);
    }
  };

  // Funções auxiliares
  const formatTimeForAPI = (timeString) => {
    // Se o tempo já estiver no formato correto (HH:MM:SS), retorná-lo
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }

    // Se estiver no formato HH:MM, adicionar segundos
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return `${timeString}:00`;
    }

    // Tentar analisar a entrada e formatá-la corretamente
    try {
      // Para entradas como "9:30", converter para "09:30:00"
      const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    } catch (e) {
      console.error("Erro ao formatar hora:", e);
      return timeString; // Retornar original e deixar a API lidar com o erro
    }
  };

  const formatMinutes = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Verificar estado de carregamento global
  const isLoading = isLoadingEntries || isLoadingClients || isLoadingCategories || isLoadingTasks ||
    createTimeEntryMutation.isPending || deleteTimeEntryMutation.isPending;

  // Se ocorrer um erro ao carregar dados essenciais, mostrar mensagem de erro
  if (isErrorEntries) {
    return <Header><ErrorView message={entriesError?.message || "Erro ao carregar registos de tempo"} onRetry={refetchTimeEntries} /></Header>;
  }

  // Diálogo de confirmação para entradas extraídas do NLP
  // Componente ConfirmationDialog
  const ConfirmationDialog = ({ visible, extractedData, onConfirm, onCancel }) => {
    if (!visible || !extractedData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Confirmar entradas de tempo</h2>

          <p className="mb-4 text-gray-700">
            Encontrei as seguintes informações no seu texto. Por favor verifique e confirme:
          </p>

          {extractedData.clients.length > 0 ? (
            <div className="mb-4">
              <h3 className="font-medium text-gray-800">Clientes identificados:</h3>
              <ul className="list-disc pl-5 mt-1">
                {extractedData.clients.map((client, index) => (
                  <li key={index} className="text-gray-700">{client.name}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mb-4 p-2 bg-yellow-50 border border-yellow-300 rounded">
              <p className="text-yellow-800 text-sm">
                Nenhum cliente identificado. Será utilizado o cliente selecionado manualmente.
              </p>
            </div>
          )}

          {/* Exibir as tarefas identificadas */}
          {extractedData.tasks && extractedData.tasks.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-800">Tarefas identificadas:</h3>
              <ul className="list-disc pl-5 mt-1">
                {extractedData.tasks.map((task, index) => (
                  <li key={index} className="text-gray-700">
                    {task.title} {task.client_name && `(${task.client_name})`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {extractedData.times.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-800">Tempos identificados:</h3>
              <ul className="list-disc pl-5 mt-1">
                {extractedData.times.map((minutes, index) => (
                  <li key={index} className="text-gray-700">
                    {formatMinutes(minutes)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {extractedData.activities.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-800">Atividades identificadas:</h3>
              <ul className="list-disc pl-5 mt-1">
                {extractedData.activities.map((activity, index) => (
                  <li key={index} className="text-gray-700">{activity}</li>
                ))}
              </ul>
            </div>
          )}

          {extractedData.categories.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-gray-800">Categorias identificadas:</h3>
              <ul className="list-disc pl-5 mt-1">
                {extractedData.categories.map((category, index) => (
                  <li key={index} className="text-gray-700">{category.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-white-50"
            >
              Cancelar
            </button>

            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Confirmar e Criar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Obter permissões do contexto
  const permissions = usePermissions();

  // Verificar permissões para mostrar mensagem de acesso restrito
  if (permissions.loading) {
    return (
      <div className="main">
        <Header>
          <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          </div>
        </Header>
      </div>
    );
  }

  // Verificar se usuário pode registrar tempo
  if (!permissions.canLogTime) {
    return (
      <div className="main">
        <Header>
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 max-w-lg">
              <div className="flex items-start">
                <AlertCircle className="h-6 w-6 mr-2" />
                <div>
                  <p className="font-bold">Acesso Restrito</p>
                  <p>Você não possui permissões para registrar tempo.</p>
                </div>
              </div>
            </div>
            <p className="text-gray-600">
              Entre em contato com o administrador da sua organização para solicitar acesso.
            </p>
          </div>
        </Header>
      </div>
    );
  }

  const TimeEntryCard = ({ entry, onDelete, onDuplicate, permissions }) => {
    return (
      <motion.div
        variants={itemVariants}
        className="bg-white p-4 rounded-lg shadow border border-gray-100 hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center">
            <Calendar size={16} className="text-blue-600 mr-2" />
            <span className="font-medium">{entry.date}</span>
          </div>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            {formatMinutes(entry.minutes_spent)}
          </span>
        </div>

        <h3 className="font-semibold mb-2 truncate">{entry.client_name}</h3>

        {entry.task_title && (
          <div className="mb-2 flex items-center text-sm text-gray-600">
            <Clock size={14} className="mr-1" />
            <span>{entry.task_title}</span>
          </div>
        )}

        <p className="text-sm text-gray-700 mb-3 line-clamp-2">{entry.description}</p>

        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {entry.start_time && entry.end_time ? `${entry.start_time.substring(0, 5)} - ${entry.end_time.substring(0, 5)}` : "Sem horário definido"}
          </div>

          <div className="flex space-x-2">
            {/* Botão de duplicar */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(entry);
              }}
              className="text-blue-500 hover:text-blue-700"
              title="Duplicar registro"
            >
              <Copy size={16} />
            </button>

            {/* Botão de excluir */}
            {(permissions.isOrgAdmin || permissions.canEditAllTime) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entry.id);
                }}
                className="text-red-500 hover:text-red-700"
                title="Excluir registro"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Componente para alternar entre visualizações
  const ViewToggle = ({ activeView, onChange }) => {
    return (
      <div className="inline-flex rounded-md overflow-hidden shadow-sm">
        <button
          className={`px-4 py-2 text-sm font-medium ${activeView === 'grid'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          onClick={() => onChange('grid')}
        >
          <Grid size={16} className="inline-block ml-2 mr-1" />
          Cartões
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeView === 'list'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          onClick={() => onChange('list')}
        >
          <List size={16} className="inline-block ml-2 mr-1" />
          Tabela
        </button>
      </div>
    );
  };

  return (
    <div className="main bg-white">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <AnimatePresence>
        {lastSavedEntry && (
          <SaveFeedback
            entry={lastSavedEntry}
            onDuplicate={duplicateEntry}
            onClose={() => setLastSavedEntry(null)}
          />
        )}
      </AnimatePresence>
      <Header>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="p-6 bg-white min-h-screen"
          style={{ marginLeft: "3%" }}
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Registo de Tempos</h1>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  if (showAutoTracking) setShowAutoTracking(false);
                }}
                className={`${showForm ? "bg-white-600" : "bg-blue-600 hover:bg-blue-700"} text-white px-4 py-2 rounded-md flex items-center`}
              >
                <Plus size={18} className="mr-2" />
                {showForm ? "Cancelar" : "Registar Entradas de Tempo"}
              </button>
              <button
              onClick={generateExcelReport}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-200 shadow-sm"
              disabled={isLoading || timeEntries.length === 0}
            >
              <Download size={18} className="mr-2" />
              Exportar
            </button>
            </div>
            <ConfirmationDialog
              visible={showConfirmationDialog}
              extractedData={extractedEntries}
              onConfirm={confirmAndCreateEntries}
              onCancel={() => setShowConfirmationDialog(false)}
            />

            {/* Indicador de processamento */}
            {isProcessing && (
              <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg flex items-center space-x-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="text-gray-700">Processando texto...</p>
                </div>
              </div>
            )}
          </div>

          {/* Componente de Rastreamento Automático de Tempo */}
          {showAutoTracking && (
            <div className="mb-6">
              <AutoTimeTracking onTimeEntryCreated={() => queryClient.invalidateQueries({ queryKey: ['timeEntries'] })} />
            </div>
          )}

          {/* Formulário de Registo Manual */}
          {showForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Registar Tempo Manualmente</h2>
                <div className="flex items-center">
                  <span className="mr-2">Linguagem Natural</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={isNaturalLanguageMode}
                      onChange={() => setIsNaturalLanguageMode(!isNaturalLanguageMode)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {isNaturalLanguageMode ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-gray-700 mb-2">Cliente</label>
                      <select
                        name="client"
                        value={formData.client}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Selecionar Cliente</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-700 mb-2">
                        Descreva a sua atividade
                      </label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={naturalLanguageInput}
                        onChange={handleNaturalLanguageInputChange}
                        placeholder="Exemplo: Demorei 2 horas na declaração de IVA para o cliente ABC e 30 minutos numa reunião com XYZ"
                        rows={3}
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        O sistema irá extrair o tempo gasto e categorizar a sua atividade.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Data</label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Cliente</label>
                        <select
                          name="client"
                          value={formData.client}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                        >
                          <option value="">Selecionar Cliente</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">Tarefa</label>
                        <select
                          name="task"
                          value={formData.task}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Selecionar Tarefa (Opcional)</option>
                          {tasks
                            .filter(task => !formData.client || task.client === formData.client)
                            .filter(task => task.status !== "completed")
                            .map(task => (
                              <option key={task.id} value={task.id}>
                                {task.title}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">Categoria</label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Selecionar Categoria (Opcional)</option>
                          {taskCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">Data</label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">
                          Minutos Gastos
                        </label>
                        <input
                          type="number"
                          name="minutes_spent"
                          value={formData.minutes_spent}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                          min="1"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-700 mb-2">
                            Hora de Início (Opcional)
                          </label>
                          <input
                            type="time"
                            name="start_time"
                            value={formData.start_time}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2">
                            Hora de Fim (Opcional)
                          </label>
                          <input
                            type="time"
                            name="end_time"
                            value={formData.end_time}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-gray-700 mb-2">
                          Descrição
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          rows={2}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                        A guardar...
                      </>
                    ) : (
                      "Guardar Registo de Tempo"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">Data de Início</label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Data de Fim</label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Cliente</label>
                <select
                  name="client"
                  value={filters.client}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todos os Clientes</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Pesquisar</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por descrição, cliente ou tarefa..."
                  className="w-full p-2 pl-10 border border-gray-300 rounded-md"
                />
                
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Agrupar por</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="none">Sem agrupamento</option>
                <option value="date">Data</option>
                <option value="client">Cliente</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-white-100 rounded-md transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex items-center mr-4">
              <h2 className="text-xl font-semibold p-6 border-b">Registos de Tempo</h2>
              <ViewToggle activeView={viewMode} onChange={setViewMode} />
            </div>
            {isLoading ? (
              <div className="p-6 flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              </div>
            ) : timeEntries.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Nenhum registo de tempo encontrado. Crie o seu primeiro!
              </div>
            ) : (
              <div className="overflow-x-auto">
                {viewMode === 'list' ? (
                  <div>
                    {Object.entries(groupedEntries).map(([groupName, entries]) => (
                      <div key={groupName}>
                        {groupBy !== 'none' && (
                          <h3 className="font-medium p-3 bg-gray-100">{groupName}</h3>
                        )}
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-white-50">
                            <tr>
                              <tr>
                                <th
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                  onClick={() => handleSort("date")}
                                >
                                  <div className="flex items-center">
                                    Data
                                    {sortConfig.field === "date" && (
                                      sortConfig.direction === "asc" ?
                                        <ChevronUp size={14} className="ml-1" /> :
                                        <ChevronDown size={14} className="ml-1" />
                                    )}
                                  </div>
                                </th>
                              </tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Cliente
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tarefa
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Descrição
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tempo
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {timeEntries.map((entry) => (
                              <tr key={entry.id} className="hover:bg-white-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Calendar size={16} className="mr-2 text-gray-400" />
                                    {entry.date}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {entry.client_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {entry.task_title || (
                                    <span className="text-gray-400">Sem tarefa</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="max-w-xs truncate">{entry.description}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Clock size={16} className="mr-2 text-gray-400" />
                                    {formatMinutes(entry.minutes_spent)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <button
                                    className="text-red-600 hover:text-red-900 flex items-center"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    disabled={deleteTimeEntryMutation.isPending}
                                  >
                                    <Trash2 size={16} className="mr-1" />
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {Object.entries(groupedEntries).map(([groupName, entries]) => (
                      <div key={groupName} className="col-span-full">
                        {groupBy !== 'none' && (
                          <h3 className="font-medium p-3 bg-gray-100 mb-3">{groupName}</h3>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {entries.map(entry => (
                            <TimeEntryCard
                              key={entry.id}
                              entry={entry}
                              onDelete={handleDeleteEntry}
                              onDuplicate={duplicateEntry}
                              permissions={permissions}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </Header>
    </div>
  );
};

export default TimeEntry;
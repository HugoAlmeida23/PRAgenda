import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import Header from "../components/Header";
import api from "../api";
import "../styles/Home.css";
import { 
  Clock, 
  Calendar, 
  Search, 
  Plus, 
  Filter, 
  Trash2,
  Loader2,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import AutoTimeTracking from "../components/AutoTimeTracking";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Componentes auxiliares de carregamento e erro
const LoadingView = () => (
  <div className="flex justify-center items-center min-h-screen">
    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
  </div>
);

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
        className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <RotateCcw className="h-4 w-4 mr-2"/>
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
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    client: "",
  });

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
    onSuccess: () => {
      toast.success("Registo de tempo criado com sucesso");
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
    // A refetch é automática devido à dependência de filtros na queryKey
    refetchTimeEntries();
  };

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      client: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isNaturalLanguageMode) {
      if (!naturalLanguageInput) {
        toast.error("Por favor insira uma descrição da sua atividade");
        return;
      }
      
      if (!formData.client) {
        toast.error("Por favor selecione um cliente");
        return;
      }
      
      // Formato das horas se fornecidas
      let timeData = {};
      if (formData.start_time) {
        timeData.start_time = formatTimeForAPI(formData.start_time);
      }
      
      if (formData.end_time) {
        timeData.end_time = formatTimeForAPI(formData.end_time);
      }
      
      // Em uma implementação real, enviaria para o processador NLP
      createTimeEntryMutation.mutate({
        client: formData.client,
        description: naturalLanguageInput,
        minutes_spent: 60, // Padrão ou estimado do texto em implementação real
        date: formData.date,
        original_text: naturalLanguageInput,
        ...timeData
      });
    } else {
      // Validar campos obrigatórios
      if (!formData.client || !formData.description || !formData.minutes_spent) {
        toast.error("Por favor preencha todos os campos obrigatórios");
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

  return (
    <div className="main">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <Header>
      <div className="p-6 bg-gray-100 min-h-screen" style={{ marginLeft: "3%" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Registo de Tempos</h1>
            <div className="flex space-x-3">
              {/* <button
                onClick={() => {
                  setShowAutoTracking(!showAutoTracking);
                  if (showForm) setShowForm(false);
                }}
                className={`${showAutoTracking ? "bg-gray-600" : "bg-indigo-600 hover:bg-indigo-700"} text-white px-4 py-2 rounded-md flex items-center`}
              >
                <Clock size={18} className="mr-2" />
                {showAutoTracking ? "Ocultar Rastreamento Auto" : "Rastreamento Auto"}
              </button> */}
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  if (showAutoTracking) setShowAutoTracking(false);
                }}
                className={`${showForm ? "bg-gray-600" : "bg-blue-600 hover:bg-blue-700"} text-white px-4 py-2 rounded-md flex items-center`}
              >
                <Plus size={18} className="mr-2" />
                {showForm ? "Cancelar" : "Registo Manual"}
              </button>
            </div>
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
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 rounded-md transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h2 className="text-xl font-semibold p-6 border-b">Registos de Tempo</h2>
            
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
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
                      <tr key={entry.id} className="hover:bg-gray-50">
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
            )}
          </div>
        </div>
      </div>
      </Header>
    </div>
  );
};

export default TimeEntry;
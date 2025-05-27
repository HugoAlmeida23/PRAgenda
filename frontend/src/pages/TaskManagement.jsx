import React, { useState, useMemo, useCallback } from "react";
import api from "../api";
import "../styles/Home.css";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from '@tanstack/react-query';
import { toast, ToastContainer } from "react-toastify";
import {
  CheckCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Settings,
  Sparkles,
  Brain,
  Target,
  Activity,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2
} from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import TaskWorkflowView from './TaskOverflowView';
import { usePermissions } from "../contexts/PermissionsContext";
import { AlertCircle } from "lucide-react";
import BackgroundElements from "../components/HeroSection/BackgroundElements";


const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente", color: "rgb(251, 191, 36)" },
  { value: "in_progress", label: "Em Progresso", color: "rgb(59, 130, 246)" },
  { value: "completed", label: "Concluída", color: "rgb(52, 211, 153)" },
  { value: "cancelled", label: "Cancelada", color: "rgb(239, 68, 68)" },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: "Urgente", color: "rgb(239, 68, 68)" },
  { value: 2, label: "Alta", color: "rgb(251, 146, 60)" },
  { value: 3, label: "Média", color: "rgb(251, 191, 36)" },
  { value: 4, label: "Baixa", color: "rgb(59, 130, 246)" },
  { value: 5, label: "Pode Esperar", color: "rgba(255, 255, 255, 0.6)" },
];

// --- Data Fetching Function (Outside Component) ---
const fetchTaskManagementData = async () => {
  console.log("Fetching task management data...");
  const [tasksRes, clientsRes, usersRes, categoriesRes] = await Promise.all([
    api.get("/tasks/"),
    api.get("/clients/?is_active=true"),
    api.get("/profiles/"),
    api.get("/task-categories/")
  ]);
  console.log("Data fetched:", { tasks: tasksRes.data.length, clients: clientsRes.data.length, users: usersRes.data.length, categories: categoriesRes.data.length });
  return {
    tasks: tasksRes.data || [],
    clients: clientsRes.data || [],
    users: usersRes.data || [],
    categories: categoriesRes.data || [],
  };
};

// --- Main Component ---
const TaskManagement = () => {
  const permissions = usePermissions();

  // Function to initialize or reset form data
  const getInitialFormData = () => ({
    title: "", description: "", client: "", category: "", assigned_to: "",
    status: "pending", priority: 3, deadline: "", estimated_time_minutes: "",
  });

  // --- React Query Client ---
  const queryClient = useQueryClient();

  // --- Local UI State ---
  const [selectedTask, setSelectedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showNaturalLanguageForm, setShowNaturalLanguageForm] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "deadline", direction: "asc" });
  const [filters, setFilters] = useState({ status: "", client: "", priority: "", assignedTo: "", category: "" });
  const [selectedTaskForWorkflow, setSelectedTaskForWorkflow] = useState(null);
  const [formData, setFormData] = useState(getInitialFormData());
  const [showFilters, setShowFilters] = useState(false);

  // --- Data Fetching using React Query ---
  const { data, isLoading: isLoadingData, isError, error, refetch } = useQuery({
    queryKey: ['taskManagementData'],
    queryFn: fetchTaskManagementData,
    staleTime: 5 * 60 * 1000,
  });

  // Extracted data lists (provide defaults)
  const tasks = data?.tasks ?? [];
  const clients = data?.clients ?? [];
  const users = data?.users ?? [];
  const categories = data?.categories ?? [];

  // --- Mutations using React Query ---
  const mutationOptions = {
    onSuccess: () => {
      console.log("Mutation successful, invalidating taskManagementData query");
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
      resetForm();
    },
    onError: (err, variables, context) => {
      console.error("Mutation failed:", err);
      const errorMessage = err.response?.data?.detail || err.message || "An error occurred";
      toast.error(`Falha: ${errorMessage}`);
    },
  };

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: (newTaskData) => api.post("/tasks/", newTaskData),
    ...mutationOptions,
    onSuccess: () => {
      toast.success("Tarefa criada com sucesso");
      mutationOptions.onSuccess();
    }
  });

  // Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updatedData }) => api.put(`/tasks/${id}/`, updatedData),
    ...mutationOptions,
    onSuccess: () => {
      toast.success("Tarefa atualizada com sucesso");
      mutationOptions.onSuccess();
    }
  });

  // Update Task Status Mutation (using PATCH)
  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}/`, { status }),
    onSuccess: (data, variables) => {
      toast.success(`Tarefa marcada como ${STATUS_OPTIONS.find(s => s.value === variables.status)?.label.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
    },
    onError: (err) => {
      console.error("Error updating task status:", err);
      toast.error("Falha ao atualizar status da tarefa");
    }
  });

  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}/`),
    onSuccess: () => {
      toast.success("Tarefa excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
    },
    onError: (err) => {
      console.error("Error deleting task:", err);
      toast.error("Falha ao excluir tarefa");
    }
  });

  // Natural Language Task Creation Mutation
  const createNlpTaskMutation = useMutation({
    mutationFn: (nlpData) => api.post("/tasks/", nlpData),
    ...mutationOptions,
    onSuccess: () => {
      toast.success("Tarefa criada a partir do texto");
      setNaturalLanguageInput("");
      setShowNaturalLanguageForm(false);
      mutationOptions.onSuccess();
    },
    onError: (err) => {
      console.error("Error creating NLP task:", err);
      toast.error("Falha ao criar tarefa a partir do texto");
    }
  });

  // --- Client-Side Filtering and Sorting using useMemo ---
  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks) return [];
    console.log(`Memo: Filtering/Sorting ${tasks.length} tasks. Filters:`, filters, `Search:`, searchTerm, `Sort:`, sortConfig);

    let result = [...tasks];

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(task =>
        task.title?.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term) ||
        clients.find(c => c.id === task.client)?.name.toLowerCase().includes(term) ||
        users.find(u => u.id === task.assigned_to)?.username.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.status) result = result.filter(task => task.status === filters.status);
    if (filters.client) result = result.filter(task => task.client === filters.client);
    if (filters.priority) result = result.filter(task => task.priority === parseInt(filters.priority));
    if (filters.assignedTo) result = result.filter(task => task.assigned_to === filters.assignedTo);
    if (filters.category) result = result.filter(task => task.category === filters.category);

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (sortConfig.key === "deadline") {
          valA = new Date(valA);
          valB = new Date(valB);
          return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        }

        if (sortConfig.key === "client") {
          valA = clients.find(c => c.id === valA)?.name?.toLowerCase() || '';
          valB = clients.find(c => c.id === valB)?.name?.toLowerCase() || '';
        } else if (sortConfig.key === "assigned_to") {
          valA = users.find(u => u.id === valA)?.username?.toLowerCase() || '';
          valB = users.find(u => u.id === valB)?.username?.toLowerCase() || '';
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    console.log(`Memo Result: ${result.length} tasks`);
    return result;
  }, [tasks, clients, users, searchTerm, filters, sortConfig]);

  // --- Event Handlers ---
  const handleSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? (value ? parseInt(value, 10) : "") : value,
    }));
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ status: "", client: "", priority: "", assignedTo: "", category: "" });
    setSearchTerm("");
    setSortConfig({ key: "deadline", direction: "asc" });
  }, []);

  const handleNaturalLanguageInputChange = useCallback((e) => {
    setNaturalLanguageInput(e.target.value);
  }, []);

  // Reset form function
  const resetForm = useCallback(() => {
    setSelectedTask(null);
    setFormData(getInitialFormData());
    setShowForm(false);
    setShowNaturalLanguageForm(false);
    setNaturalLanguageInput("");
    setSelectedTaskForWorkflow(null);
  }, []);

  // Handle submission from the main form
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (selectedTask) {
      const canEdit = permissions.isOrgAdmin ||
        permissions.canEditAllTasks ||
        (permissions.canEditAssignedTasks && selectedTask.assigned_to === permissions.userId);

      if (!canEdit) {
        toast.error("Você não tem permissão para editar esta tarefa");
        return;
      }
      updateTaskMutation.mutate({ id: selectedTask.id, updatedData: formData });
    } else {
      if (!permissions.isOrgAdmin && !permissions.canCreateTasks) {
        toast.error("Você não tem permissão para criar tarefas");
        return;
      }
      createTaskMutation.mutate(formData);
    }
  }, [selectedTask, formData, createTaskMutation, updateTaskMutation, permissions]); 

  // Handle NLP form submission
  const handleNaturalLanguageSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!naturalLanguageInput.trim()) {
      toast.error("Por favor, insira algum texto para criar uma tarefa.");
      return;
    }

    // Basic NLP Placeholder
    const deadlineMatch = naturalLanguageInput.match(/até (\d{4}-\d{2}-\d{2})/i);
    let deadline = deadlineMatch ? deadlineMatch[1] : null;

    let priority = 3;
    if (/urgente/i.test(naturalLanguageInput)) priority = 1;
    else if (/alta prioridade/i.test(naturalLanguageInput)) priority = 2;
    else if (/baixa prioridade/i.test(naturalLanguageInput)) priority = 4;

    let clientId = null;
    for (const client of clients) {
      const clientRegex = new RegExp(`\\b${client.name}\\b`, 'i');
      if (clientRegex.test(naturalLanguageInput)) {
        clientId = client.id;
        break;
      }
    }

    const nlpTaskData = {
      title: naturalLanguageInput.substring(0, 100),
      description: naturalLanguageInput,
      client: clientId,
      status: "pending",
      priority: priority,
      deadline: deadline,
    };

    createNlpTaskMutation.mutate(nlpTaskData);
  }, [naturalLanguageInput, clients, createNlpTaskMutation]);

  // Prepare a task for editing
  const selectTaskForEdit = useCallback((task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      client: task.client || "",
      category: task.category || "",
      assigned_to: task.assigned_to || "",
      status: task.status || "pending",
      priority: task.priority || 3,
      deadline: task.deadline ? task.deadline.split("T")[0] : "",
      estimated_time_minutes: task.estimated_time_minutes || "",
    });
    setShowForm(true);
    setShowNaturalLanguageForm(false);
  }, []);

  // Handle view workflow  
  const handleViewWorkflow = useCallback((task) => {
    setSelectedTaskForWorkflow(task);
  }, []);

  // Confirm and trigger delete
  const confirmDelete = useCallback((taskId) => {
    if (!permissions.isOrgAdmin && !permissions.canDeleteTasks) {
      toast.error("Você não tem permissão para excluir tarefas");
      return;
    }
    if (window.confirm("Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.")) {
      deleteTaskMutation.mutate(taskId);
    }
  }, [deleteTaskMutation, permissions]);

  // Trigger status update
  const updateTaskStatusHandler = useCallback((task, newStatus) => {
    const canUpdate = permissions.isOrgAdmin ||
      permissions.canEditAllTasks ||
      (permissions.canEditAssignedTasks && task.assigned_to === permissions.userId);

    if (!canUpdate) {
      toast.error("Você não tem permissão para atualizar esta tarefa");
      return;
    }
    updateTaskStatusMutation.mutate({ id: task.id, status: newStatus });
  }, [updateTaskStatusMutation, permissions]);

  // --- Helper Functions ---
  const formatDate = (dateString) => {
    if (!dateString) return "Sem prazo";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT');
  };

  const isOverdue = (deadline) => {
    if (!deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  const getPriorityInfo = (priorityValue) => {
    const priority = PRIORITY_OPTIONS.find(p => p.value === priorityValue) || PRIORITY_OPTIONS[2];
    return {
      label: priority.label,
      color: priority.color
    };
  };

  const {
    data: workflowDefinitions = [],
    isLoading: isLoadingWorkflows
  } = useQuery({
    queryKey: ['workflowDefinitions'],
    queryFn: async () => {
      try {
        const response = await api.get('/workflow-definitions/?is_active=true');
        return response.data;
      } catch (error) {
        console.error('Error fetching workflows:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000
  });

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
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    }
  };

  // --- Render Logic ---
  if (permissions.loading || isLoadingData) {
    return (
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1, repeat: Infinity }
          }}
        >
          <Brain size={48} style={{ color: 'rgb(147, 51, 234)' }} />
        </motion.div>
        <p style={{ marginLeft: '1rem', fontSize: '1rem' }}>
          Carregando gestão de tarefas...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
<BackgroundElements businessStatus="optimal" />        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            ...glassStyle,
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '500px',
            color: 'white'
          }}
        >
          <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>
            Erro ao Carregar
          </h2>
          <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
            {error?.message || "Não foi possível carregar os dados das tarefas."}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refetch}
            style={{
              ...glassStyle,
              padding: '0.75rem 1.5rem',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              background: 'rgba(59, 130, 246, 0.2)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              margin: '0 auto'
            }}
          >
            <RotateCcw size={18} />
            Tentar Novamente
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Verificar permissões para mostrar mensagem de acesso restrito
  const canViewTasks = permissions.canViewAllTasks || permissions.isOrgAdmin;

  if (!canViewTasks && !permissions.canEditAssignedTasks) {
    return (
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
<BackgroundElements businessStatus="optimal" />        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            ...glassStyle,
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '500px',
            color: 'white'
          }}
        >
          <AlertCircle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>
            Acesso Restrito
          </h2>
          <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
            Você não possui permissões para visualizar ou gerenciar tarefas.
          </p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            Entre em contato com o administrador da sua organização para solicitar acesso.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      color: 'white'
    }}>
<BackgroundElements businessStatus="optimal" />      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        style={{ zIndex: 9999 }}
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '2rem',
          paddingTop: '1rem'
        }}
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h1 style={{
              fontSize: '1.8rem',
              fontWeight: '700',
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Gestão de Tarefas
            </h1>
            <p style={{
              fontSize: '1rem',
              color: 'rgba(191, 219, 254, 1)',
              margin: 0
            }}>
              Organize e acompanhe todas as suas tarefas
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowNaturalLanguageForm(!showNaturalLanguageForm);
                if (showForm) setShowForm(false);
                if (showNaturalLanguageForm) setNaturalLanguageInput("");
              }}
              style={{
                ...glassStyle,
                padding: '0.75rem 1.5rem',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                background: showNaturalLanguageForm ? 'rgba(239, 68, 68, 0.2)' : 'rgba(147, 51, 234, 0.2)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <FileText size={18} />
              {showNaturalLanguageForm ? 'Cancelar' : 'Entrada Natural'}
            </motion.button>

            {(permissions.isOrgAdmin || permissions.canCreateTasks) && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetForm();
                  setShowForm(!showForm);
                  if (showNaturalLanguageForm) setShowNaturalLanguageForm(false);
                }}
                style={{
                  ...glassStyle,
                  padding: '0.75rem 1.5rem',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  background: showForm ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                <Plus size={18} />
                {showForm ? 'Cancelar' : 'Nova Tarefa'}
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Natural Language Form */}
        <AnimatePresence>
          {showNaturalLanguageForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{
                ...glassStyle,
                padding: '1.5rem',
                marginBottom: '2rem'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity }
                  }}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: 'rgba(147, 51, 234, 0.2)',
                    borderRadius: '12px'
                  }}
                >
                  <Brain style={{ color: 'rgb(196, 181, 253)' }} size={20} />
                </motion.div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                    Criar Tarefas com Linguagem Natural
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                    Descreva suas tarefas naturalmente e deixe a IA organizá-las
                  </p>
                </div>
              </div>

              <form onSubmit={handleNaturalLanguageSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Descreva suas Tarefas
                  </label>
                  <textarea
                    value={naturalLanguageInput}
                    onChange={handleNaturalLanguageInputChange}
                    placeholder="Exemplo: Entregar a declaração de IVA para o cliente ABC até sexta-feira, revisar extratos bancários para XYZ com média prioridade..."
                    rows={4}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    margin: '0.5rem 0 0 0'
                  }}>
                    O sistema irá extrair clientes, prazos e prioridades do seu texto.
                  </p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Cliente Padrão (se não especificado no texto)
                  </label>
                  <select
                    name="client"
                    value={formData.client}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="" style={{ background: '#1f2937', color: 'white' }}>Todos os Status</option>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} style={{ background: '#1f2937', color: 'white' }}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Cliente
                  </label>
                  <select
                    name="client"
                    value={filters.client}
                    onChange={handleFilterChange}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="" style={{ background: '#1f2937', color: 'white' }}>Todos os Clientes</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id} style={{ background: '#1f2937', color: 'white' }}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Prioridade
                  </label>
                  <select
                    name="priority"
                    value={filters.priority}
                    onChange={handleFilterChange}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="" style={{ background: '#1f2937', color: 'white' }}>Todas as Prioridades</option>
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} style={{ background: '#1f2937', color: 'white' }}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Atribuída a
                  </label>
                  <select
                    name="assignedTo"
                    value={filters.assignedTo}
                    onChange={handleFilterChange}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="" style={{ background: '#1f2937', color: 'white' }}>Todos os Responsáveis</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.user} style={{ background: '#1f2937', color: 'white' }}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Categoria
                  </label>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="" style={{ background: '#1f2937', color: 'white' }}>Todas as Categorias</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id} style={{ background: '#1f2937', color: 'white' }}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
{/* Task Summary Stats */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}
        >
          {/* Total Tasks */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'rgb(59, 130, 246)',
              marginBottom: '0.5rem'
            }}>
              {tasks.length}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Total de Tarefas
            </div>
          </motion.div>

          {/* Pending Tasks */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.2)'
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'rgb(251, 191, 36)',
              marginBottom: '0.5rem'
            }}>
              {tasks.filter(t => t.status === 'pending').length}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Pendentes
            </div>
          </motion.div>

          {/* In Progress Tasks */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'rgb(59, 130, 246)',
              marginBottom: '0.5rem'
            }}>
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Em Progresso
            </div>
          </motion.div>

          {/* Completed Tasks */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.2)'
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'rgb(52, 211, 153)',
              marginBottom: '0.5rem'
            }}>
              {tasks.filter(t => t.status === 'completed').length}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Concluídas
            </div>
          </motion.div>

          {/* Overdue Tasks */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'rgb(239, 68, 68)',
              marginBottom: '0.5rem'
            }}>
              {tasks.filter(t => isOverdue(t.deadline) && t.status !== 'completed').length}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Atrasadas
            </div>
          </motion.div>
        </motion.div>

        {/* Task List */}
        <motion.div
          variants={itemVariants}
          style={{
            ...glassStyle,
            padding: 0,
            overflow: 'hidden'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                backgroundColor: 'rgba(52, 211, 153, 0.2)',
                borderRadius: '12px'
              }}>
                <Activity style={{ color: 'rgb(52, 211, 153)' }} size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                  Lista de Tarefas
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                  {filteredAndSortedTasks.length} tarefas encontradas
                </p>
              </div>
            </div>
          </div>

          {filteredAndSortedTasks.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              <Target size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                Nenhuma tarefa encontrada
              </h4>
              <p style={{ margin: 0 }}>
                {searchTerm || Object.values(filters).some(val => val)
                  ? "Tente ajustar os filtros para ver mais resultados."
                  : "Crie sua primeira tarefa para começar!"}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSort("title")}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: 'inherit',
                          fontWeight: 'inherit'
                        }}
                      >
                        Título
                        {sortConfig.key === "title" ? (
                          sortConfig.direction === "asc" ? 
                            <ChevronUp size={16} /> : 
                            <ChevronDown size={16} />
                        ) : (
                          <ChevronDown size={16} style={{ opacity: 0.5 }} />
                        )}
                      </motion.button>
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSort("client_name")}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: 'inherit',
                          fontWeight: 'inherit'
                        }}
                      >
                        Cliente
                        {sortConfig.key === "client_name" ? (
                          sortConfig.direction === "asc" ? 
                            <ChevronUp size={16} /> : 
                            <ChevronDown size={16} />
                        ) : (
                          <ChevronDown size={16} style={{ opacity: 0.5 }} />
                        )}
                      </motion.button>
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSort("priority")}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: 'inherit',
                          fontWeight: 'inherit'
                        }}
                      >
                        Prioridade
                        {sortConfig.key === "priority" ? (
                          sortConfig.direction === "asc" ? 
                            <ChevronUp size={16} /> : 
                            <ChevronDown size={16} />
                        ) : (
                          <ChevronDown size={16} style={{ opacity: 0.5 }} />
                        )}
                      </motion.button>
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSort("deadline")}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: 'inherit',
                          fontWeight: 'inherit'
                        }}
                      >
                        Prazo
                        {sortConfig.key === "deadline" ? (
                          sortConfig.direction === "asc" ? 
                            <ChevronUp size={16} /> : 
                            <ChevronDown size={16} />
                        ) : (
                          <ChevronDown size={16} style={{ opacity: 0.5 }} />
                        )}
                      </motion.button>
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSort("status")}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: 'inherit',
                          fontWeight: 'inherit'
                        }}
                      >
                        Status
                        {sortConfig.key === "status" ? (
                          sortConfig.direction === "asc" ? 
                            <ChevronUp size={16} /> : 
                            <ChevronDown size={16} />
                        ) : (
                          <ChevronDown size={16} style={{ opacity: 0.5 }} />
                        )}
                      </motion.button>
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      Responsável
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'center',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedTasks.map((task, index) => (
                    <motion.tr
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                      whileHover={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: 'white',
                            fontSize: '0.875rem',
                            marginBottom: '0.25rem'
                          }}>
                            {task.title}
                          </div>
                          {task.description && (
                            <div style={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.75rem',
                              maxWidth: '300px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {task.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: '0.875rem'
                        }}>
                          {task.client_name || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: `${getPriorityInfo(task.priority).color}20`,
                          border: `1px solid ${getPriorityInfo(task.priority).color}30`,
                          color: getPriorityInfo(task.priority).color
                        }}>
                          {getPriorityInfo(task.priority).label}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: isOverdue(task.deadline) && task.status !== 'completed'
                            ? 'rgb(239, 68, 68)'
                            : 'rgba(255, 255, 255, 0.8)',
                          fontSize: '0.875rem'
                        }}>
                          <Calendar
                            size={16}
                            style={{
                              marginRight: '0.5rem',
                              color: isOverdue(task.deadline) && task.status !== 'completed'
                                ? 'rgb(239, 68, 68)'
                                : 'rgba(255, 255, 255, 0.6)'
                            }}
                          />
                          {formatDate(task.deadline)}
                          {isOverdue(task.deadline) && task.status !== 'completed' && (
                            <AlertTriangle size={16} style={{ marginLeft: '0.5rem', color: 'rgb(239, 68, 68)' }} />
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.5rem 1rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: `${STATUS_OPTIONS.find(s => s.value === task.status)?.color || 'rgba(255, 255, 255, 0.6)'}20`,
                          border: `1px solid ${STATUS_OPTIONS.find(s => s.value === task.status)?.color || 'rgba(255, 255, 255, 0.6)'}30`,
                          color: STATUS_OPTIONS.find(s => s.value === task.status)?.color || 'rgba(255, 255, 255, 0.6)'
                        }}>
                          {STATUS_OPTIONS.find(option => option.value === task.status)?.label || task.status}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontSize: '0.875rem'
                        }}>
                          <User size={16} style={{ marginRight: '0.5rem', color: 'rgba(255, 255, 255, 0.6)' }} />
                          {task.assigned_to_name || "Não atribuída"}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}>
                          {task.status !== "completed" && (
                            <motion.button
                              whileHover={{ scale: 1.1, y: -2 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateTaskStatusHandler(task, "completed")}
                              title="Marcar como concluída"
                              style={{
                                background: 'rgba(52, 211, 153, 0.2)',
                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                borderRadius: '6px',
                                padding: '0.5rem',
                                color: 'rgb(52, 211, 153)',
                                cursor: 'pointer'
                              }}
                            >
                              <CheckCircle size={16} />
                            </motion.button>
                          )}
                          {task.status === "pending" && (
                            <motion.button
                              whileHover={{ scale: 1.1, y: -2 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => updateTaskStatusHandler(task, "in_progress")}
                              title="Marcar como em progresso"
                              style={{
                                background: 'rgba(59, 130, 246, 0.2)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '6px',
                                padding: '0.5rem',
                                color: 'rgb(59, 130, 246)',
                                cursor: 'pointer'
                              }}
                            >
                              <Clock size={16} />
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => selectTaskForEdit(task)}
                            title="Editar tarefa"
                            style={{
                              background: 'rgba(147, 51, 234, 0.2)',
                              border: '1px solid rgba(147, 51, 234, 0.3)',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              color: 'rgb(147, 51, 234)',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit size={16} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleViewWorkflow(task)}
                            title="Ver workflow"
                            style={{
                              background: 'rgba(251, 146, 60, 0.2)',
                              border: '1px solid rgba(251, 146, 60, 0.3)',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              color: 'rgb(251, 146, 60)',
                              cursor: 'pointer'
                            }}
                          >
                            <Settings size={16} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1, y: -2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => confirmDelete(task.id)}
                            title="Excluir tarefa"
                            style={{
                              background: 'rgba(239, 68, 68, 0.2)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '6px',
                              padding: '0.5rem',
                              color: 'rgb(239, 68, 68)',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        input::placeholder, textarea::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }
        
        select option {
          background: #1f2937 !important;
          color: white !important;
        }
        
        /* Scrollbar personalizada */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        /* Smooth transitions para todos os elementos */
        * {
          transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease;
        }
        
        /* Efeito hover suave para botões */
        button:hover {
          transform: translateY(-1px);
        }
        
        /* Animação para loading states */
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        /* Melhores efeitos de glass morphism */
        .glass-effect {
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
        }

        /* Hover effects para tabelas */
        tbody tr:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }

        /* Focus states para acessibilidade */
        button:focus, input:focus, select:focus, textarea:focus {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }

        /* Animação suave para status badges */
        .status-badge {
          transition: all 0.3s ease;
        }

        .status-badge:hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

export default TaskManagement;
        
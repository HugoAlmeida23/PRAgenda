import { useState, useMemo, useCallback } from "react";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from '@tanstack/react-query';
import { toast, ToastContainer } from "react-toastify";
import TimeEntryForms from "../components/TimeEntryForms";
import TaskOverflow from "./TaskOverflow";
import {
  CheckCircle,
  Clock,
  Plus,
  Edit3 as EditIcon, // Renamed for clarity
  Trash2,
  Calendar,
  AlertTriangle,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Settings2 as SettingsIcon, // Renamed for clarity
  Brain,
  Target,
  Activity,
  Filter as FilterIcon,
  Search as SearchIcon,
  Eye as EyeIcon,
  XCircle,
  Zap, // For NLP
  ListChecks, // For tasks list
  Briefcase, // For client
  Tag as TagIcon, // For category
  UserCheck, // For assigned to
  Paperclip, // Generic task icon
  Loader2, // For loading
  SlidersHorizontal, // For filter button
  EyeOff,
  X,
  Info,
  Network,
  Users,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock4,
  User2,
  Star,
  Workflow,
  GitBranch,
  Route, 
} from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
const fetchTaskManagementData = async (userId) => {
  console.log("Fetching task management data for user:", userId);
  const [tasksRes, clientsRes, usersRes, categoriesRes, workflowsRes] = await Promise.all([
    api.get(`/tasks/?user=${userId}`),
    api.get("/clients/?is_active=true"),
    api.get("/profiles/"),
    api.get("/task-categories/"),
    api.get("/workflow-definitions/?is_active=true") // ADICIONAR ESTA LINHA
  ]);
  console.log("Data fetched:", {
    tasks: tasksRes.data.length,
    clients: clientsRes.data.length,
    users: usersRes.data.length,
    categories: categoriesRes.data.length,
    workflows: workflowsRes.data.length  // ADICIONAR ESTA LINHA
  });
  return {
    tasks: tasksRes.data || [],
    clients: clientsRes.data || [],
    users: usersRes.data || [],
    categories: categoriesRes.data || [],
    workflows: workflowsRes.data || [], // ADICIONAR ESTA LINHA
  };
};

const WorkflowConfiguration = ({
  selectedWorkflow,
  workflows,
  users,
  workflowSteps,
  onStepAssignmentChange,
  isLoadingSteps
}) => {
  if (!selectedWorkflow) return null;

  const selectedWorkflowData = workflows.find(w => w.id === selectedWorkflow);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'rgba(147, 51, 234, 0.1)',
        border: '1px solid rgba(147, 51, 234, 0.2)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginTop: '1rem'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>
        <Workflow size={20} style={{ color: 'rgb(147, 51, 234)' }} />
        <div>
          <h4 style={{ margin: 0, color: 'white', fontWeight: '600' }}>
            Configuração do Workflow: {selectedWorkflowData?.name}
          </h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            Atribua responsáveis para cada passo do workflow
          </p>
        </div>
      </div>

      {isLoadingSteps ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'rgb(147, 51, 234)' }} />
          <p style={{ margin: '0.5rem 0 0 0', color: 'rgba(255, 255, 255, 0.7)' }}>
            Carregando passos...
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {workflowSteps.map((step, index) => (
            <div key={step.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(147, 51, 234, 0.2)',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgb(147, 51, 234)',
                fontWeight: '600',
                fontSize: '0.875rem'
              }}>
                {step.order}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: 'white', marginBottom: '0.25rem' }}>
                  {step.name}
                </div>
                {step.description && (
                  <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                    {step.description}
                  </div>
                )}
                {step.requires_approval && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'rgb(251, 191, 36)',
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <AlertTriangle size={12} />
                    Requer aprovação: {step.approver_role || 'Necessária'}
                  </div>
                )}
              </div>

              <div style={{ minWidth: '200px' }}>
                <select
                  value={step.assign_to || ''}
                  onChange={(e) => onStepAssignmentChange(step.id, e.target.value)}
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
                  <option value="" style={{ background: '#1f2937', color: 'white' }}>
                    Selecionar Responsável
                  </option>
                  {users.map((user) => (
                    <option key={user.id} value={user.user} style={{ background: '#1f2937', color: 'white' }}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </div>

              {index < workflowSteps.length - 1 && (
                <ArrowRight size={16} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const WorkflowIndicator = ({ task, onViewWorkflow }) => {
  if (!task.workflow_name) return null;

  const progressPercentage = task.workflow_progress?.percentage || 0;
  const currentStep = task.workflow_progress?.current_step || 0;
  const totalSteps = task.workflow_progress?.total_steps || 0;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem',
      background: 'rgba(147, 51, 234, 0.1)',
      border: '1px solid rgba(147, 51, 234, 0.2)',
      borderRadius: '8px',
      fontSize: '0.75rem'
    }}>
      <Network size={12} style={{ color: 'rgb(147, 51, 234)' }} />
      <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
        {task.workflow_name}
      </span>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        color: 'rgb(147, 51, 234)'
      }}>
        <span>{currentStep}/{totalSteps}</span>
        <div style={{
          width: '30px',
          height: '4px',
          background: 'rgba(147, 51, 234, 0.2)',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: '100%',
            background: 'rgb(147, 51, 234)',
            borderRadius: '2px'
          }} />
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onViewWorkflow(task)}
        style={{
          background: 'rgba(147, 51, 234, 0.2)',
          border: '1px solid rgba(147, 51, 234, 0.3)',
          borderRadius: '4px',
          padding: '0.25rem',
          color: 'rgb(147, 51, 234)',
          cursor: 'pointer'
        }}
      >
        <EyeIcon size={12} />
      </motion.button>
    </div>
  );
};

// --- Main Component ---
const TaskManagement = () => {
  const permissions = usePermissions();

  // Function to initialize or reset form data
  const getInitialFormData = () => ({
    title: "", description: "", client: "", category: "", assigned_to: "",
    status: "pending", priority: 3, deadline: "", estimated_time_minutes: "",
    worflow: "", workflow_step_assignments: {}
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
  const [notifications, setNotifications] = useState([]);
  const [showTimeEntryModal, setShowTimeEntryModal] = useState(false);
  const [selectedTaskForTimeEntry, setSelectedTaskForTimeEntry] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [stepAssignments, setStepAssignments] = useState({});
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [showWorkflowConfig, setShowWorkflowConfig] = useState(false);

  // --- Data Fetching using React Query ---
  const { data, isLoading: isLoadingData, isError, error, refetch } = useQuery({
    queryKey: ['taskManagementData', permissions.userId],
    queryFn: () => fetchTaskManagementData(permissions.userId),
    staleTime: 5 * 60 * 1000,
    enabled: !!permissions.userId,
  });

  const handleLogTimeForTask = useCallback((task) => {
    setSelectedTaskForTimeEntry(task);
    setShowTimeEntryModal(true);
  }, []);

  // Extracted data lists (provide defaults)
  const tasks = data?.tasks ?? [];
  const clients = data?.clients ?? [];
  const users = data?.users ?? [];
  const categories = data?.categories ?? [];
  const workflows = data?.workflows ?? [];

  const addNotification = useCallback((type, title, message, duration = 4000) => {
    const id = Date.now() + Math.random();
    const notification = { id, type, title, message };

    setNotifications(prev => [...prev, notification]);

    // Auto remove notification
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, duration);
  }, []);

  const fetchWorkflowSteps = useCallback(async (workflowId) => {
    if (!workflowId) {
      setWorkflowSteps([]);
      setStepAssignments({});
      setShowWorkflowConfig(false);
      return;
    }

    try {
      setIsLoadingSteps(true);
      const response = await api.get(`/workflow-steps/?workflow=${workflowId}`);
      const steps = response.data.sort((a, b) => a.order - b.order);
      setWorkflowSteps(steps);
      setShowWorkflowConfig(true);

      // Inicializar assignments vazios
      const initialAssignments = {};
      steps.forEach(step => {
        initialAssignments[step.id] = step.assign_to || '';
      });
      setStepAssignments(initialAssignments);
    } catch (error) {
      console.error("Error fetching workflow steps:", error);
      toast.error("Falha ao carregar passos do workflow");
    } finally {
      setIsLoadingSteps(false);
    }
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  }, []);

  // Funções de conveniência para diferentes tipos de notificação
  const showSuccess = useCallback((title, message) => {
    addNotification('success', title, message);
  }, [addNotification]);

  const showError = useCallback((title, message) => {
    addNotification('error', title, message, 6000); // Erros ficam mais tempo
  }, [addNotification]);

  const showWarning = useCallback((title, message) => {
    addNotification('warning', title, message, 5000);
  }, [addNotification]);

  const showInfo = useCallback((title, message) => {
    addNotification('info', title, message);
  }, [addNotification]);

  // Componente de notificação individual
  const NotificationItem = ({ notification, onRemove }) => {
    const getIcon = () => {
      switch (notification.type) {
        case 'success':
          return <CheckCircle size={20} style={{ color: 'rgb(52, 211, 153)' }} />;
        case 'error':
          return <XCircle size={20} style={{ color: 'rgb(239, 68, 68)' }} />;
        case 'warning':
          return <AlertTriangle size={20} style={{ color: 'rgb(251, 191, 36)' }} />;
        case 'info':
          return <Info size={20} style={{ color: 'rgb(59, 130, 246)' }} />;
        default:
          return <Info size={20} style={{ color: 'rgb(59, 130, 246)' }} />;
      }
    };

    const getColors = () => {
      switch (notification.type) {
        case 'success':
          return {
            bg: 'rgba(52, 211, 153, 0.1)',
            border: 'rgba(52, 211, 153, 0.3)',
            text: 'rgb(52, 211, 153)'
          };
        case 'error':
          return {
            bg: 'rgba(239, 68, 68, 0.1)',
            border: 'rgba(239, 68, 68, 0.3)',
            text: 'rgb(239, 68, 68)'
          };
        case 'warning':
          return {
            bg: 'rgba(251, 191, 36, 0.1)',
            border: 'rgba(251, 191, 36, 0.3)',
            text: 'rgb(251, 191, 36)'
          };
        case 'info':
          return {
            bg: 'rgba(59, 130, 246, 0.1)',
            border: 'rgba(59, 130, 246, 0.3)',
            text: 'rgb(59, 130, 246)'
          };
        default:
          return {
            bg: 'rgba(59, 130, 246, 0.1)',
            border: 'rgba(59, 130, 246, 0.3)',
            text: 'rgb(59, 130, 246)'
          };
      }
    };

    const colors = getColors();

    return (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.8 }}
        whileHover={{ scale: 1.02 }}
        style={{
          ...glassStyle,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          padding: '1rem',
          marginBottom: '0.75rem',
          maxWidth: '400px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ marginTop: '0.125rem' }}>
            {getIcon()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{
              fontWeight: '600',
              color: 'white',
              margin: '0 0 0.25rem 0',
              fontSize: '0.875rem'
            }}>
              {notification.title}
            </h4>
            <p style={{
              fontSize: '0.8rem',
              color: 'rgba(255, 255, 255, 0.8)',
              margin: 0,
              lineHeight: '1.4'
            }}>
              {notification.message}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onRemove(notification.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </motion.button>
        </div>
      </motion.div>
    );
  };

  // Container de notificações (adicione antes do fechamento do div principal)
  const NotificationsContainer = () => (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      zIndex: 9999,
      pointerEvents: 'none'
    }}>
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <div key={notification.id} style={{ pointerEvents: 'auto' }}>
            <NotificationItem
              notification={notification}
              onRemove={removeNotification}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );

  const createTaskMutation = useMutation({
    mutationFn: (newTaskData) => api.post("/tasks/", newTaskData),
    onSuccess: () => {
      showSuccess("Tarefa Criada", "A nova tarefa foi criada com sucesso");
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
      resetForm();
    },
    onError: (err) => {
      console.error("Mutation failed:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Ocorreu um erro desconhecido";
      showError("Erro ao Criar", errorMessage);
    },
  });

  // Update Task Mutation - DEPOIS:
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updatedData }) => api.put(`/tasks/${id}/`, updatedData),
    onSuccess: () => {
      showSuccess("Tarefa Atualizada", "As alterações foram salvas com sucesso");
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
      resetForm();
    },
    onError: (err) => {
      console.error("Update failed:", err);
      const errorMessage = err.response?.data?.detail || err.message || "Erro ao atualizar";
      showError("Falha na Atualização", errorMessage);
    },
  });

  // Update Task Status Mutation - DEPOIS:
  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}/`, { status }),
    onSuccess: (data, variables) => {
      const statusLabel = STATUS_OPTIONS.find(s => s.value === variables.status)?.label || variables.status;
      showSuccess("Status Alterado", `Tarefa marcada como ${statusLabel.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
    },
    onError: (err) => {
      console.error("Error updating task status:", err);
      showError("Erro de Status", "Não foi possível atualizar o status da tarefa");
    }
  });

  // Delete Task Mutation - DEPOIS:
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}/`),
    onSuccess: () => {
      showSuccess("Tarefa Excluída", "A tarefa foi removida permanentemente");
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
    },
    onError: (err) => {
      console.error("Error deleting task:", err);
      showError("Erro ao Excluir", "Não foi possível excluir a tarefa");
    }
  });

  // Natural Language Task Creation Mutation - DEPOIS:
  const createNlpTaskMutation = useMutation({
    mutationFn: (nlpData) => api.post("/tasks/", nlpData),
    onSuccess: () => {
      showSuccess("IA Processada", "Tarefa criada a partir da linguagem natural");
      setNaturalLanguageInput("");
      setShowNaturalLanguageForm(false);
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
      resetForm();
    },
    onError: (err) => {
      console.error("Error creating NLP task:", err);
      showError("Erro de Processamento", "Falha ao processar o texto com IA");
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

    if (name === 'workflow') {
      setSelectedWorkflow(value);
      fetchWorkflowSteps(value);
    }
  }, [fetchWorkflowSteps]);

  const handleStepAssignmentChange = useCallback((stepId, userId) => {
    setStepAssignments(prev => ({
      ...prev,
      [stepId]: userId
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
    setSelectedWorkflow('');
    setWorkflowSteps([]);
    setStepAssignments({});
    setShowWorkflowConfig(false);
  }, []);

  // Handle submission from the main form
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (selectedTask) {
      const canEdit = permissions.isOrgAdmin ||
        permissions.canEditAllTasks ||
        (permissions.canEditAssignedTasks && selectedTask.assigned_to === permissions.userId);

      if (!canEdit) {
        showWarning("Acesso Negado", "Você não tem permissão para editar esta tarefa");
        return;
      }

      updateTaskMutation.mutate({ id: selectedTask.id, updatedData: formData });
    } else {
      if (!permissions.isOrgAdmin && !permissions.canCreateTasks) {
        showWarning("Acesso Restrito", "Você não tem permissão para criar tarefas");
        return;
      }
      createTaskMutation.mutate(formData);
    }
  }, [selectedTask, formData, createTaskMutation, updateTaskMutation, permissions]);

  // Handle NLP form submission
  const handleNaturalLanguageSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!naturalLanguageInput.trim()) {
      showWarning("Campo Obrigatório", "Por favor, insira algum texto para criar uma tarefa");
      return;
    }

    // Resto da função permanece igual...
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
  }, [naturalLanguageInput, clients, createNlpTaskMutation, showWarning]);
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
      showWarning("Acesso Negado", "Você não tem permissão para excluir tarefas");
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
      showWarning("Acesso Restrito", "Você não tem permissão para atualizar esta tarefa");
      return;
    }
    updateTaskStatusMutation.mutate({ id: task.id, status: newStatus });
  }, [updateTaskStatusMutation, permissions, showWarning]);

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
  const canCreateAnyTask = permissions.isOrgAdmin || permissions.canCreateTasks;

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
      color: 'white',
      padding: '2rem',
      zIndex: 9999
    }}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 9999 }} />
      <BackgroundElements businessStatus="optimal" />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '2rem',
          paddingTop: '1rem',
        }}
      >
        {/* Header */}
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ListChecks size={36} style={{ color: 'rgb(52,211,153)' }} />
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Gestão de Tarefas
              </h1>
              <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>Organize e acompanhe todas as suas tarefas.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {canCreateAnyTask && (
              <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => {
                setShowNaturalLanguageForm(!showNaturalLanguageForm);
                if (showForm) setShowForm(false);
                if (showNaturalLanguageForm) setNaturalLanguageInput("");
                setShowFilters(false);
              }}
                style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: `1px solid rgba(147,51,234,${showNaturalLanguageForm ? 0.6 : 0.3})`, background: `rgba(147,51,234,${showNaturalLanguageForm ? 0.3 : 0.2})`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                <Zap size={18} /> {showNaturalLanguageForm ? 'Cancelar IA' : 'Criar com IA'}
              </motion.button>
            )}
            {canCreateAnyTask && (
              <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => {
                resetForm();
                setShowForm(!showForm);
                if (showNaturalLanguageForm) setShowNaturalLanguageForm(false);
                setShowFilters(false);
              }}
                style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: `1px solid rgba(59,130,246,${showForm ? 0.6 : 0.3})`, background: `rgba(59,130,246,${showForm ? 0.3 : 0.2})`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                <Plus size={18} /> {showForm ? 'Cancelar Tarefa' : 'Nova Tarefa'}
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
                    <option value="" style={{ background: '#1f2937', color: 'white' }}>Selecione um Cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id} style={{ background: '#1f2937', color: 'white' }}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Regular Task Form */}
        <AnimatePresence>
          {showForm && (
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
                <div style={{
                  padding: '0.5rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px'
                }}>
                  <Plus style={{ color: 'rgb(147, 197, 253)' }} size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                    {selectedTask ? 'Editar Tarefa' : 'Criar Nova Tarefa'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                    {selectedTask ? 'Atualize os detalhes da tarefa' : 'Preencha os campos para criar uma nova tarefa'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  {/* Título */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Título *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      placeholder="Digite o título da tarefa"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  {/* Cliente */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Cliente
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
                      <option value="" style={{ background: '#1f2937', color: 'white' }}>
                        Selecione um cliente
                      </option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id} style={{ background: '#1f2937', color: 'white' }}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Categoria */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Categoria
                    </label>
                    <select
                      name="category"
                      value={formData.category}
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
                      <option value="" style={{ background: '#1f2937', color: 'white' }}>
                        Selecione uma categoria
                      </option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id} style={{ background: '#1f2937', color: 'white' }}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Responsável */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Responsável
                    </label>
                    <select
                      name="assigned_to"
                      value={formData.assigned_to}
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
                      <option value="" style={{ background: '#1f2937', color: 'white' }}>
                        Selecione um responsável
                      </option>
                      {users.map((user) => (
                        <option key={user.id} value={user.user} style={{ background: '#1f2937', color: 'white' }}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
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
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} style={{ background: '#1f2937', color: 'white' }}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Prioridade */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Prioridade
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
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
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} style={{ background: '#1f2937', color: 'white' }}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Prazo */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Prazo
                    </label>
                    <input
                      type="date"
                      name="deadline"
                      value={formData.deadline}
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
                    />
                  </div>

                  {/* Tempo Estimado */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Tempo Estimado (minutos)
                    </label>
                    <input
                      type="number"
                      name="estimated_time_minutes"
                      value={formData.estimated_time_minutes}
                      onChange={handleInputChange}
                      placeholder="Ex: 120"
                      min="0"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                {/* Workflow */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Workflow (Opcional)
                  </label>
                  <select
                    name="workflow"
                    value={formData.workflow}
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
                    <option value="" style={{ background: '#1f2937', color: 'white' }}>
                      Selecionar Workflow
                    </option>
                    {workflows.map((workflow) => (
                      <option key={workflow.id} value={workflow.id} style={{ background: '#1f2937', color: 'white' }}>
                        {workflow.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Descrição */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Descrição
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Descrição detalhada da tarefa..."
                    rows={4}
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
                </div>

                {/* Configuração de Workflow */}
                <AnimatePresence>
                  {showWorkflowConfig && (
                    <WorkflowConfiguration
                      selectedWorkflow={selectedWorkflow}
                      workflows={workflows}
                      users={users}
                      workflowSteps={workflowSteps}
                      onWorkflowChange={setSelectedWorkflow}
                      onStepAssignmentChange={handleStepAssignmentChange}
                      isLoadingSteps={isLoadingSteps}
                    />
                  )}
                </AnimatePresence>

                {/* Botões */}
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end'
                }}>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetForm}
                    style={{
                      ...glassStyle,
                      padding: '0.75rem 1.5rem',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.2)',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                    style={{
                      ...glassStyle,
                      padding: '0.75rem 1.5rem',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      background: 'rgba(52, 211, 153, 0.2)',
                      color: 'white',
                      cursor: createTaskMutation.isPending || updateTaskMutation.isPending ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      opacity: createTaskMutation.isPending || updateTaskMutation.isPending ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {(createTaskMutation.isPending || updateTaskMutation.isPending) && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {selectedTask ? 'Atualizar' : 'Criar'} Tarefa
                  </motion.button>
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
      {/* Search and Filters Section */}
      <motion.div
        variants={itemVariants}
        style={{
          ...glassStyle,
          padding: '1.5rem',
          marginBottom: '2rem'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              padding: '0.5rem',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '12px'
            }}>
              <SearchIcon style={{ color: 'rgb(147, 197, 253)' }} size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                Pesquisa e Filtros
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                Encontre rapidamente as tarefas que procura
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              style={{
                ...glassStyle,
                padding: '0.75rem 1rem',
                border: `1px solid rgba(59, 130, 246, ${showFilters ? 0.6 : 0.3})`,
                background: `rgba(59, 130, 246, ${showFilters ? 0.3 : 0.2})`,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <SlidersHorizontal size={16} />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetFilters}
              style={{
                ...glassStyle,
                padding: '0.75rem 1rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.2)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <RotateCcw size={16} />
              Limpar
            </motion.button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: showFilters ? '1.5rem' : '0' }}>
          <div style={{ position: 'relative' }}>
            <SearchIcon
              size={20}
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.5)'
              }}
            />
            <input
              type="text"
              placeholder="Pesquisar tarefas por título, descrição, cliente..."
              value={searchTerm}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 3rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}
            >
              {/* Status Filter */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <Activity size={16} />
                  Status
                </label>
                <select
                  name="status"
                  value={filters.status}
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
                  <option value="" style={{ background: '#1f2937', color: 'white' }}>Todos os Status</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} style={{ background: '#1f2937', color: 'white' }}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Filter */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <Briefcase size={16} />
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

              {/* Priority Filter */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <Target size={16} />
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

              {/* Assigned To Filter */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <UserCheck size={16} />
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

              {/* Category Filter */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <TagIcon size={16} />
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
            </motion.div>
          )}
        </AnimatePresence>
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
                    textAlign: 'left',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.9)'
                  }}>
                    Workflow
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
                    <td style={{ padding: '1rem' }}>
                      {task.workflow_name ? (
                        <WorkflowIndicator task={task} onViewWorkflow={handleViewWorkflow} />
                      ) : (
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.875rem' }}>
                          Sem workflow
                        </span>
                      )}
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
                          <EditIcon size={16} />
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
                          <SettingsIcon size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1, y: -2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleLogTimeForTask(task)}
                          title="Registrar tempo"
                          style={{
                            background: 'rgba(52, 211, 153, 0.2)',
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            color: 'rgb(52, 211, 153)',
                            cursor: 'pointer'
                          }}
                        >
                          <Clock size={16} />
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
      <AnimatePresence>
        {showTimeEntryModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                ...glassStyle,
                width: '100%',
                maxWidth: '800px',
                maxHeight: '90vh',
                overflowY: 'auto',
                color: 'white'
              }}
            >
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0 }}>
                  Registrar Tempo - {selectedTaskForTimeEntry?.title}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowTimeEntryModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={24} />
                </motion.button>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <TimeEntryForms
                  initialClientId={selectedTaskForTimeEntry?.client}
                  initialTaskId={selectedTaskForTimeEntry?.id}
                  onTimeEntryCreated={(newEntry) => {
                    queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
                    setShowTimeEntryModal(false);
                    showSuccess("Tempo Registrado", "Tempo registrado com sucesso para a tarefa");
                  }}
                  permissions={permissions}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <NotificationsContainer />
      {/* Modal do TaskOverflow */}
<AnimatePresence>
  {selectedTaskForWorkflow && (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          ...glassStyle,
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflowY: 'auto',
          color: 'white'
        }}
      >
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0 }}>
            Workflow - {selectedTaskForWorkflow?.title}
          </h3>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSelectedTaskForWorkflow(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer'
            }}
          >
            <X size={24} />
          </motion.button>
        </div>
        
        <div style={{ padding: '1.5rem' }}>
          <TaskOverflow
            taskId={selectedTaskForWorkflow?.id}
            onWorkflowUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
            }}
            permissions={permissions}
          />
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
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

import React, { useMemo, useCallback } from "react"; 
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast, ToastContainer } from "react-toastify";
import TaskOverflow from "./TaskOverflow"; // This might need to be components/task/TaskOverflow.jsx
import {
  CheckCircle, Clock, Plus, Edit3 as EditIcon, Trash2, Calendar, AlertTriangle, User,
  ChevronDown, ChevronUp, RotateCcw, Settings2 as SettingsIcon, Brain, Target, Activity,
  Filter as FilterIcon, Search as SearchIcon, Eye as EyeIcon, XCircle, Zap, ListChecks,
  Briefcase, Tag as TagIcon, UserCheck, Loader2, SlidersHorizontal, X, Info, Network,
  ArrowRight, CheckCircle2, Workflow
} from "lucide-react";
import { usePermissions } from "../contexts/PermissionsContext";
import { AlertCircle } from "lucide-react";
import BackgroundElements from "../components/HeroSection/BackgroundElements";

// Import new store and components
import { useTaskStore } from "../stores/useTaskStore";
import TaskStats from "../components/task/TaskStats";
import TaskFilters from "../components/task/TaskFilters";
import TaskForm from "../components/task/TaskForm";
import TaskTable from "../components/task/TaskTable";

// Export constants if they are used by other files (like TaskFilters)
export const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente", color: "rgb(251, 191, 36)" },
  { value: "in_progress", label: "Em Progresso", color: "rgb(59, 130, 246)" },
  { value: "completed", label: "Concluída", color: "rgb(52, 211, 153)" },
  { value: "cancelled", label: "Cancelada", color: "rgb(239, 68, 68)" },
];

export const PRIORITY_OPTIONS = [
  { value: 1, label: "Urgente", color: "rgb(239, 68, 68)" },
  { value: 2, label: "Alta", color: "rgb(251, 146, 60)" },
  { value: 3, label: "Média", color: "rgb(251, 191, 36)" },
  { value: 4, label: "Baixa", color: "rgb(59, 130, 246)" },
  { value: 5, label: "Pode Esperar", color: "rgba(255, 255, 255, 0.6)" },
];

const fetchTaskManagementData = async (userId, permissions) => {
  const tasksEndpoint = permissions.isOrgAdmin ? "/tasks/" : `/tasks/?user_id=${userId}`; // Ensure query param is correct
  const [tasksRes, clientsRes, usersRes, categoriesRes, workflowsRes] = await Promise.all([
    api.get(tasksEndpoint),
    api.get("/clients/?is_active=true"),
    api.get("/profiles/"), // Ensure this returns users with 'user' (ID) and 'username'
    api.get("/task-categories/"),
    api.get("/workflow-definitions/?is_active=true")
  ]);

  return {
    tasks: tasksRes.data || [],
    clients: clientsRes.data || [],
    users: usersRes.data || [],
    categories: categoriesRes.data || [],
    workflows: workflowsRes.data || [],
  };
};

// Main Component
const TaskManagement = () => {
  const permissions = usePermissions();
  const queryClient = useQueryClient();

  // Zustand Store
  const {
    formData, selectedTask, showForm, showNaturalLanguageForm, naturalLanguageInput,
    searchTerm, sortConfig, filters, showTimeEntryModal, selectedTaskForTimeEntry,
    selectedTaskForWorkflowView, stepAssignmentsForForm, selectedWorkflowForForm,
    openFormForNew, closeForm, toggleNaturalLanguageForm,
    setSortConfig: setSortConfigStore, // Renamed to avoid conflict with local if any
    openTimeEntryModal: openTimeEntryModalStore, closeTimeEntryModal,
    openWorkflowView: openWorkflowViewStore, closeWorkflowView,
    setIsLoadingWorkflowStepsForForm, setWorkflowStepsForForm, initializeStepAssignmentsForForm,
    setShowWorkflowConfigInForm,notifications, removeNotification,
    showSuccessNotification, showErrorNotification, showWarningNotification
  } = useTaskStore();

  const { data, isLoading: isLoadingData, isError, error, refetch } = useQuery({
    queryKey: ['taskManagementData', permissions.userId, permissions.isOrgAdmin],
    queryFn: () => fetchTaskManagementData(permissions.userId, permissions),
    staleTime: 5 * 60 * 1000,
    enabled: !!permissions.userId && permissions.initialized,
  });

  const tasks = data?.tasks ?? [];
  const clients = data?.clients ?? [];
  const users = data?.users ?? []; // Expected: [{id, user (FK to auth_user), username}, ...]
  const categories = data?.categories ?? [];
  const workflows = data?.workflows ?? []; // Workflow Definitions

  // Notification System (can be extracted)
  const addNotification = useCallback((type, title, message, duration = 4000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), duration);
  }, []);
  const showSuccess = useCallback((title, message) => addNotification('success', title, message), [addNotification]);
  const showError = useCallback((title, message) => addNotification('error', title, message, 6000), [addNotification]);
  const showWarning = useCallback((title, message) => addNotification('warning', title, message, 5000), [addNotification]);

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (newTaskData) => api.post("/tasks/", newTaskData),
    onSuccess: () => {
      showSuccessNotification("Tarefa Criada", "A nova tarefa foi criada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
      closeForm();
    },
    onError: (err) => showErrorNotification("Erro ao Criar", err.response?.data?.detail || err.message),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updatedData }) => api.put(`/tasks/${id}/`, updatedData),
    onSuccess: () => {
      showSuccessNotification("Tarefa Atualizada", "As alterações foram salvas com sucesso.");
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
      closeForm();
    },
    onError: (err) => showErrorNotification("Falha na Atualização", err.response?.data?.detail || err.message),
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}/`, { status }),
    onSuccess: (data, variables) => {
      const statusLabel = STATUS_OPTIONS.find(s => s.value === variables.status)?.label || variables.status;
      showSuccessNotification("Status Alterado", `Tarefa marcada como ${statusLabel.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
    },
    onError: (err) => showErrorNotification("Erro de Status", "Não foi possível atualizar o status."),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}/`),
    onSuccess: () => {
      showSuccessNotification("Tarefa Excluída", "A tarefa foi removida permanentemente.");
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
    },
    onError: (err) => showErrorNotification("Erro ao Excluir", "Não foi possível excluir a tarefa."),
  });
  
  const createNlpTaskMutation = useMutation({
    mutationFn: (nlpData) => api.post("/tasks/parse-natural-language/", nlpData),
    onSuccess: (parsedData) => {
        createTaskMutation.mutate(parsedData.data); 
        showSuccessNotification("IA Processada", "Tarefa extraída, a criar...");
    },
    onError: (err) => {
        console.error("Error parsing NLP task:", err);
        showErrorNotification("Erro de Processamento IA", `Falha ao processar o texto: ${err.response?.data?.detail || err.message}`);
    }
  });

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(task =>
        task.title?.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term) ||
        clients.find(c => c.id === task.client)?.name.toLowerCase().includes(term) ||
        users.find(u => u.user === task.assigned_to)?.username.toLowerCase().includes(term)
      );
    }
    if (filters.status) result = result.filter(task => task.status === filters.status);
    if (filters.client) result = result.filter(task => task.client === parseInt(filters.client));
    if (filters.priority) result = result.filter(task => task.priority === parseInt(filters.priority));
    if (filters.assignedTo) result = result.filter(task => task.assigned_to === parseInt(filters.assignedTo)); // Ensure assignedTo filter values are numbers if IDs
    if (filters.category) result = result.filter(task => task.category === parseInt(filters.category));

    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (sortConfig.key === "deadline") {
          valA = new Date(valA); valB = new Date(valB);
          return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        }
        if (sortConfig.key === "client_name") {
            valA = a.client_name?.toLowerCase() || '';
            valB = b.client_name?.toLowerCase() || '';
        } else if (sortConfig.key === "assigned_to_name") {
            valA = a.assigned_to_name?.toLowerCase() || '';
            valB = b.assigned_to_name?.toLowerCase() || '';
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase(); valB = valB.toLowerCase();
        }
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [tasks, clients, users, searchTerm, filters, sortConfig]);
  
  // Event Handlers
  const handleSort = useCallback((key) => setSortConfigStore(key), [setSortConfigStore]);

  const fetchWorkflowStepsCallback = useCallback(async (workflowId, autoShowConfig = true) => {
    if (!workflowId) {
        setWorkflowStepsForForm([]);
        initializeStepAssignmentsForForm([]);
        if (autoShowConfig) setShowWorkflowConfigInForm(false);
        return [];
    }
    try {
        setIsLoadingWorkflowStepsForForm(true);
        const response = await api.get(`/workflow-steps/?workflow=${workflowId}`);
        const steps = response.data.sort((a, b) => a.order - b.order);
        setWorkflowStepsForForm(steps);
        initializeStepAssignmentsForForm(steps); // Initialize with default assignees or empty
        if (autoShowConfig) setShowWorkflowConfigInForm(true);
        return steps; // Return steps for further processing if needed
    } catch (error) {
        console.error("Error fetching workflow steps:", error);
        toast.error("Falha ao carregar passos do workflow");
        if (autoShowConfig) setShowWorkflowConfigInForm(false);
        return [];
    } finally {
        setIsLoadingWorkflowStepsForForm(false);
    }
  }, [setWorkflowStepsForForm, initializeStepAssignmentsForForm, setShowWorkflowConfigInForm, setIsLoadingWorkflowStepsForForm]);

   const handleSubmitMainForm = useCallback(() => {
    const finalFormData = {
        ...formData,
        client: formData.client ? formData.client : null,
        category: formData.category ? parseInt(formData.category) : null,
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
        priority: formData.priority ? parseInt(formData.priority) : 3,
        estimated_time_minutes: formData.estimated_time_minutes ? parseInt(formData.estimated_time_minutes) : null,
        workflow: formData.workflow ? parseInt(formData.workflow) : null,
    };

    if (finalFormData.workflow && Object.keys(stepAssignmentsForForm).length > 0) {
        const assignments = {};
        for (const stepDefId in stepAssignmentsForForm) {
            // Assuming stepDefId from the form is a string, and userId might also be a string from select
            assignments[stepDefId] = stepAssignmentsForForm[stepDefId] 
                                      ? parseInt(stepAssignmentsForForm[stepDefId]) // Or keep as string if backend expects string
                                      : null; 
        }
        finalFormData.workflow_step_assignments = assignments;
    }

    if (selectedTask) {
      if (!permissions.isOrgAdmin && !permissions.canEditAllTasks && !(permissions.canEditAssignedTasks && selectedTask.assigned_to === permissions.userId)) {
        showWarningNotification("Acesso Negado", "Sem permissão para editar esta tarefa"); return;
      }
      updateTaskMutation.mutate({ id: selectedTask.id, updatedData: finalFormData });
    } else {
      if (!permissions.isOrgAdmin && !permissions.canCreateTasks) {
        showWarningNotification("Acesso Restrito", "Sem permissão para criar tarefas"); return;
      }
      createTaskMutation.mutate(finalFormData);
    }

    console.log("Submitting task form with data:", finalFormData);
  }, [formData, selectedTask, createTaskMutation, updateTaskMutation, permissions, showWarningNotification, stepAssignmentsForForm]);

  const handleSubmitNlpForm = useCallback(() => {
    if (!naturalLanguageInput.trim()) {
      showWarningNotification("Campo Obrigatório", "Insira texto para a IA processar"); return;
    }
    createNlpTaskMutation.mutate({ 
        natural_language_text: naturalLanguageInput,
        default_client_id: formData.client ? parseInt(formData.client) : null 
    });
  }, [naturalLanguageInput, createNlpTaskMutation, showWarningNotification, formData.client]);

  const confirmDeleteTask = useCallback((taskId) => {
    if (!permissions.isOrgAdmin && !permissions.canDeleteTasks) {
      showWarning("Acesso Negado", "Sem permissão para excluir tarefas"); return;
    }
    if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
      deleteTaskMutation.mutate(taskId);
    }
  }, [deleteTaskMutation, permissions, showWarning]);

  const handleUpdateStatus = useCallback((task, newStatus) => {
    if (!permissions.isOrgAdmin && !permissions.canEditAllTasks && !(permissions.canEditAssignedTasks && task.assigned_to === permissions.userId)) {
      showWarning("Acesso Restrito", "Sem permissão para atualizar esta tarefa"); return;
    }
    updateTaskStatusMutation.mutate({ id: task.id, status: newStatus });
  }, [updateTaskStatusMutation, permissions, showWarning]);

  // Helper Functions
  const formatDate = (dateString) => {
    if (!dateString) return "Sem prazo";
    return new Date(dateString).toLocaleDateString('pt-PT');
  };
  const isOverdue = (deadline) => deadline && new Date(deadline) < new Date() && new Date(deadline).setHours(0,0,0,0) !== new Date().setHours(0,0,0,0);
  const getPriorityLabelAndColor = (priorityValue) => PRIORITY_OPTIONS.find(p => p.value === priorityValue) || PRIORITY_OPTIONS[2];


  // --- Render Logic ---
  const glassStyle = { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px' };
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 200, damping: 20 } } };

  if (permissions.loading || isLoadingData) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div animate={{ rotate: 360, scale: [1,1.1,1] }} transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }}>
          <Brain size={48} style={{ color: 'rgb(147,51,234)' }} />
        </motion.div>
        <p style={{ marginLeft: '1rem', fontSize: '1rem' }}>Carregando gestão de tarefas...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...glassStyle, padding: '2rem', textAlign: 'center', maxWidth: '500px', color: 'white' }}>
          <AlertTriangle size={48} style={{ color: 'rgb(239,68,68)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Erro ao Carregar</h2>
          <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.8)' }}>{error?.message || "Não foi possível carregar os dados."}</p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => refetch()} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', margin: '0 auto' }}>
            <RotateCcw size={18} /> Tentar Novamente
          </motion.button>
        </motion.div>
      </div>
    );
  }
  
  const canViewAnyTask = permissions.isOrgAdmin || permissions.canViewAllTasks || permissions.canViewAssignedTasks;
  if (!permissions.loading && !canViewAnyTask) {
     return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...glassStyle, padding: '2rem', textAlign: 'center', maxWidth: '500px', color: 'white' }}>
          <AlertCircle size={48} style={{ color: 'rgb(251,191,36)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Acesso Restrito</h2>
          <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.8)' }}>Sem permissões para visualizar tarefas.</p>
        </motion.div>
      </div>
    );
  }

  const NotificationItem = ({ notification, onRemove }) => { // Define NotificationItem here or import
    const icons = { success: <CheckCircle2 />, error: <XCircle />, warning: <AlertTriangle />, info: <Info /> };
    const colors = { success: 'rgb(52,211,153)', error: 'rgb(239,68,68)', warning: 'rgb(251,191,36)', info: 'rgb(59,130,246)' };
    return (
        <motion.div initial={{ opacity: 0, y: 50, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.8 }} whileHover={{ scale: 1.02 }}
            style={{ ...glassStyle, background: `${colors[notification.type]}20`, border: `1px solid ${colors[notification.type]}30`, padding: '1rem', marginBottom: '0.75rem', maxWidth: '400px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ marginTop: '0.125rem', color: colors[notification.type] }}>{React.cloneElement(icons[notification.type], { size: 20 })}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontWeight: '600', color: 'white', margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>{notification.title}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: '1.4' }}>{notification.message}</p>
                </div>
                <motion.button whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }} whileTap={{ scale: 0.9 }} onClick={() => onRemove(notification.id)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={16} />
                </motion.button>
            </div>
        </motion.div>
    );
  };
  const NotificationsContainer = () => (
    <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 99999, pointerEvents: 'none' }}>
        <AnimatePresence mode="popLayout">{notifications.map(n => <div key={n.id} style={{ pointerEvents: 'auto' }}><NotificationItem notification={n} onRemove={removeNotification} /></div>)}</AnimatePresence>
    </div>
  );


  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white', paddingBottom: '2rem' }}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 9999 }} />
      <BackgroundElements businessStatus="optimal" />
      <NotificationsContainer /> {/* Use notifications from store */}

      <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}>
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ListChecks size={36} style={{ color: 'rgb(52,211,153)' }} />
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Gestão de Tarefas</h1>
              <p style={{ fontSize: '1rem', color: 'rgba(191,219,254,1)', margin: 0 }}>Organize e acompanhe todas as suas tarefas.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {(permissions.isOrgAdmin || permissions.canCreateTasks) && (
              <>
                <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={toggleNaturalLanguageForm}
                    style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: `1px solid rgba(147,51,234,${showNaturalLanguageForm ? 0.6:0.3})`, background: `rgba(147,51,234,${showNaturalLanguageForm ? 0.3:0.2})`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    <Zap size={18} /> {showNaturalLanguageForm ? 'Cancelar IA' : 'Criar com IA'}
                </motion.button>
                <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={showForm ? closeForm : openFormForNew}
                    style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: `1px solid rgba(59,130,246,${showForm ? 0.6:0.3})`, background: `rgba(59,130,246,${showForm ? 0.3:0.2})`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    <Plus size={18} /> {showForm ? 'Cancelar Tarefa' : 'Nova Tarefa'}
                </motion.button>
              </>
            )}
          </div>
        </motion.div>

        <TaskForm
            clients={clients} users={users} categories={categories} workflows={workflows}
            onMainSubmit={handleSubmitMainForm} onNlpSubmit={handleSubmitNlpForm}
            isSaving={createTaskMutation.isPending || updateTaskMutation.isPending}
            isNlpProcessing={createNlpTaskMutation.isPending}
            fetchWorkflowStepsCallback={fetchWorkflowStepsCallback}
        />
        
        <TaskStats tasks={tasks} isOverdue={isOverdue} />
        <TaskFilters clients={clients} users={users} categories={categories} />

        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(52,211,153,0.2)', borderRadius: '12px' }}><Activity style={{ color: 'rgb(52,211,153)' }} size={20} /></div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Lista de Tarefas</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>{filteredAndSortedTasks.length} tarefas encontradas</p>
                    </div>
                </div>
            </div>
            <TaskTable
                tasks={filteredAndSortedTasks}
                onSort={handleSort}
                onUpdateStatus={handleUpdateStatus}
                onDelete={confirmDeleteTask}
                // onLogTime is handled by openTimeEntryModalStore inside TaskTable which calls store action
                formatDate={formatDate}
                isOverdue={isOverdue}
                getPriorityLabelAndColor={getPriorityLabelAndColor}
                permissions={permissions}
                usersData={users} 
                clientsData={clients}
            />
        </motion.div>

        <AnimatePresence>
          {selectedTaskForWorkflowView && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ ...glassStyle, width: '100%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', color: 'white' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Workflow - {selectedTaskForWorkflowView?.title}</h3>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={closeWorkflowView} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}><X size={24} /></motion.button>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <TaskOverflow taskId={selectedTaskForWorkflowView?.id} onWorkflowUpdate={() => queryClient.invalidateQueries({ queryKey: ['taskManagementData'] })} permissions={permissions} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </motion.div>
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        input::placeholder, textarea::placeholder { color: rgba(255, 255, 255, 0.5) !important; }
        select option { background: #1f2937 !important; color: white !important; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
        * { transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease; }
      `}</style>
    </div>
  );
};

export default TaskManagement;
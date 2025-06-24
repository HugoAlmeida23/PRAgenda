import React, { useMemo, useCallback, useEffect } from "react";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

import {
  CheckCircle as CheckCircleIcon, Clock, Plus, Edit3 as EditIcon, Trash2, Calendar, AlertTriangle, User,
  ChevronDown, ChevronUp, RotateCcw, Settings2 as SettingsIcon, Brain, Target, Activity,
  Filter as FilterIcon, Search as SearchIcon, Eye as EyeIcon, XCircle, Zap, ListChecks,
  Briefcase, Tag as TagIcon, UserCheck, Loader2, SlidersHorizontal, X, Info, Network,
  ArrowRight, CheckCircle2, Workflow, AlertCircle
} from "lucide-react";

import { usePermissions } from "../contexts/PermissionsContext";
import BackgroundElements from "../components/HeroSection/BackgroundElements";
import { useTaskStore } from "../stores/useTaskStore";
import TaskStats from "../components/task/TaskStats";
import TaskFilters from "../components/task/TaskFilters";
import TaskForm from "../components/task/TaskForm";
import TaskTable from "../components/task/TaskTable";
import TaskOverflow from "./TaskOverflow";

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

const fetchTasksOnly = async (taskFilters, taskSearchTerm, taskSortConfig) => {
  const params = new URLSearchParams();

  if (taskFilters.status) params.append('status', taskFilters.status);
  if (taskFilters.client) params.append('client', taskFilters.client);
  if (taskFilters.priority) params.append('priority', taskFilters.priority);
  if (taskFilters.assignedTo) params.append('assignedTo', taskFilters.assignedTo);
  if (taskFilters.category) params.append('category', taskFilters.category);
  if (taskFilters.overdue === 'true' || taskFilters.overdue === true) params.append('overdue', 'true');
  if (taskFilters.due) params.append('due', taskFilters.due);

  if (taskSearchTerm) params.append('search', taskSearchTerm);

  if (taskSortConfig.key) {
    params.append('ordering', `${taskSortConfig.direction === 'desc' ? '-' : ''}${taskSortConfig.key}`);
  }

  const tasksEndpoint = `/tasks/?${params.toString()}`;
  const tasksRes = await api.get(tasksEndpoint);
  return tasksRes.data.results || tasksRes.data || [];
};

const TaskManagement = () => {
  const permissions = usePermissions();
  const queryClient = useQueryClient();

  const {
    formData, selectedTask, showForm, showNaturalLanguageForm, naturalLanguageInput,
    searchTerm, sortConfig, filters,
    selectedTaskForWorkflowView, stepAssignmentsForForm, selectedWorkflowForForm,
    openFormForNew, openFormForEdit, closeForm, toggleNaturalLanguageForm,
    setSortConfig: setSortConfigStore,
    openWorkflowView, closeWorkflowView,
    setIsLoadingWorkflowStepsForForm, setWorkflowStepsForForm, initializeStepAssignmentsForForm,
    setShowWorkflowConfigInForm, notifications, removeNotification,
    showSuccessNotification, showErrorNotification, showWarningNotification
  } = useTaskStore();

  // --- ROBUST PERMISSION CHECK ---
  const canViewPage = useMemo(() => {
    if (!permissions.initialized) return false;
    return (
      permissions.isOrgAdmin ||
      permissions.canViewAllTasks ||
      permissions.canEditAssignedTasks
    );
  }, [permissions.initialized, permissions.isOrgAdmin, permissions.canViewAllTasks, permissions.canEditAssignedTasks]);

  const { data: clients = [], isLoading: isLoadingClients, isError: isErrorClients, error: errorClients } = useQuery({
    queryKey: ['clientsForDropdowns'],
    queryFn: () => api.get("/clients/?is_active=true").then(res => res.data.results || res.data),
    staleTime: 10 * 60 * 1000,
    enabled: !!permissions.initialized,
  });

  const { data: users = [], isLoading: isLoadingUsers, isError: isErrorUsers, error: errorUsers } = useQuery({
    queryKey: ['organizationMembersForTaskDropdowns'],
    queryFn: async () => {
      try {
        if (!permissions.organization) {
          console.warn('User has no organization, cannot fetch members.');
          return [];
        }
        const membersResponse = await api.get(`/organizations/${permissions.organization}/members/`);
        return membersResponse.data.results || membersResponse.data || [];
      } catch (error) {
        console.error('Error fetching organization members:', error);
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!permissions.organization,
  });

  const { data: categories = [], isLoading: isLoadingCategories, isError: isErrorCategories, error: errorCategories } = useQuery({
    queryKey: ['categoriesForDropdowns'],
    queryFn: () => api.get("/task-categories/").then(res => res.data.results || res.data),
    staleTime: Infinity,
    enabled: !!permissions.initialized,
  });

  const { data: workflows = [], isLoading: isLoadingWorkflows, isError: isErrorWorkflows, error: errorWorkflows } = useQuery({
    queryKey: ['workflowsForTaskDropdowns'],
    queryFn: () => api.get("/workflow-definitions/?is_active=true").then(res => res.data.results || res.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!permissions.initialized,
  });

  const {
    data: tasks = [],
    isLoading: isLoadingTasksFirstTime,
    isFetching: isFetchingTasks,
    isError: isErrorTasks,
    error: errorTasks,
    refetch: refetchTasks
  } = useQuery({
    queryKey: ['tasks', filters, searchTerm, sortConfig],
    queryFn: () => fetchTasksOnly(filters, searchTerm, sortConfig),
    staleTime: 30 * 1000,
    enabled: canViewPage, // This query depends on the permission check
    keepPreviousData: true,
  });

  const createTaskMutation = useMutation({
    mutationFn: (newTaskData) => api.post("/tasks/", newTaskData),
    onSuccess: () => {
      showSuccessNotification("Tarefa Criada", "A nova tarefa foi criada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      closeForm();
    },
    onError: (err) => showErrorNotification("Erro ao Criar", err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(', ') || err.message),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updatedData }) => api.put(`/tasks/${id}/`, updatedData),
    onSuccess: () => {
      showSuccessNotification("Tarefa Atualizada", "As alterações foram salvas com sucesso.");
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      closeForm();
    },
    onError: (err) => showErrorNotification("Falha na Atualização", err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(', ') || err.message),
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}/`, { status }),
    onSuccess: (response, variables) => {
      const statusLabel = STATUS_OPTIONS.find(s => s.value === variables.status)?.label || variables.status;
      showSuccessNotification("Status Alterado", `Tarefa marcada como ${statusLabel.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => showErrorNotification("Erro de Status", err.response?.data?.error || "Não foi possível atualizar o status."),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}/`),
    onSuccess: () => {
      showSuccessNotification("Tarefa Excluída", "A tarefa foi removida permanentemente.");
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => showErrorNotification("Erro ao Excluir", err.response?.data?.detail || "Não foi possível excluir a tarefa."),
  });

  const createNlpTaskMutation = useMutation({
    mutationFn: async (nlpData) => {
      const nlpResponse = await api.post("/gemini-nlp/process_text/", {
        text: nlpData.natural_language_text,
        client_id: nlpData.default_client_id
      });

      if (nlpResponse.data && nlpResponse.data.success && nlpResponse.data.tasks?.length > 0) {
        const createdTasksInfo = [];
        const nlpTask = nlpResponse.data.tasks[0];
        const taskPayload = {
          title: nlpTask.title || nlpData.natural_language_text.substring(0, 100),
          description: nlpResponse.data.activities?.[0]?.description || nlpData.natural_language_text,
          client: nlpTask.client_id || nlpData.default_client_id || null,
          minutes_spent: nlpResponse.data.times?.[0]?.minutes || null,
          deadline: nlpTask.deadline || null,
          priority: nlpTask.priority || 3,
          status: 'pending',
        };
        const taskCreationResponse = await createTaskMutation.mutateAsync(taskPayload);
        createdTasksInfo.push(taskCreationResponse);
        return createdTasksInfo;
      } else if (nlpResponse.data && nlpResponse.data.error) {
        throw new Error(nlpResponse.data.error);
      } else {
        throw new Error("IA não conseguiu extrair tarefas do texto.");
      }
    },
    onSuccess: (createdTasksInfo) => {
      showSuccessNotification("IA Processada", `${createdTasksInfo?.length || 0} tarefa(s) extraída(s) e a criar...`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      closeForm();
    },
    onError: (err) => {
      console.error("Error parsing NLP task:", err);
      showErrorNotification("Erro de Processamento IA", `Falha ao processar o texto: ${err.message}`);
    }
  });

  const handleSort = useCallback((key) => { setSortConfigStore(key); }, [setSortConfigStore]);

  const fetchWorkflowStepsCallback = useCallback(async (workflowId) => {
    if (!workflowId) {
      setWorkflowStepsForForm([]);
      initializeStepAssignmentsForForm([], {});
      setShowWorkflowConfigInForm(false);
      return [];
    }
    try {
      setIsLoadingWorkflowStepsForForm(true);
      const response = await api.get(`/workflow-steps/?workflow=${workflowId}`);
      const stepsData = response.data.results || response.data || [];
      const steps = stepsData.sort((a, b) => a.order - b.order);

      setWorkflowStepsForForm(steps);
      const assignmentsToInit = selectedTask && selectedTask.workflow === workflowId
        ? selectedTask.workflow_step_assignments || {}
        : {};
      initializeStepAssignmentsForForm(steps, assignmentsToInit);

      setShowWorkflowConfigInForm(true);
      return steps;
    } catch (error) {
      console.error("Error fetching workflow steps:", error);
      showErrorNotification("Erro de Workflow", "Falha ao carregar passos do workflow");
      setShowWorkflowConfigInForm(false);
      return [];
    } finally {
      setIsLoadingWorkflowStepsForForm(false);
    }
  }, [
    setWorkflowStepsForForm,
    initializeStepAssignmentsForForm,
    setShowWorkflowConfigInForm,
    setIsLoadingWorkflowStepsForForm,
    showErrorNotification,
    selectedTask
  ]);

  const handleSubmitMainForm = useCallback((formDataToSubmit) => {
    if (selectedTask) {
      if (!permissions.isOrgAdmin && !permissions.canEditAllTasks && !(permissions.canEditAssignedTasks && selectedTask.assigned_to === permissions.userId)) {
        showWarningNotification("Acesso Negado", "Sem permissão para editar esta tarefa"); return;
      }
      updateTaskMutation.mutate({ id: selectedTask.id, updatedData: formDataToSubmit });
    } else {
      if (!permissions.isOrgAdmin && !permissions.canCreateTasks) {
        showWarningNotification("Acesso Restrito", "Sem permissão para criar tarefas"); return;
      }
      createTaskMutation.mutate(formDataToSubmit);
    }
  }, [formData, selectedTask, createTaskMutation, updateTaskMutation, permissions, showWarningNotification, selectedWorkflowForForm, stepAssignmentsForForm]);

  const handleSubmitNlpForm = useCallback((nlpData) => {
    if (!nlpData.natural_language_text.trim()) {
      showWarningNotification("Campo Obrigatório", "Insira texto para a IA processar"); return;
    }
    createNlpTaskMutation.mutate(nlpData);
  }, [createNlpTaskMutation, showWarningNotification]);

  const confirmDeleteTask = useCallback((taskId) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    const canDelete = permissions.isOrgAdmin || permissions.canDeleteTasks;
    if (!canDelete) {
      showWarningNotification("Acesso Negado", "Sem permissão para excluir tarefas"); return;
    }
    if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
      deleteTaskMutation.mutate(taskId);
    }
  }, [deleteTaskMutation, permissions, showWarningNotification, tasks]);

  const handleUpdateStatus = useCallback((task, newStatus) => {
    const canUpdate = permissions.isOrgAdmin ||
      permissions.canEditAllTasks ||
      (permissions.canEditAssignedTasks && task.assigned_to === permissions.userId);
    if (!canUpdate) {
      showWarningNotification("Acesso Restrito", "Sem permissão para atualizar esta tarefa"); return;
    }
    updateTaskStatusMutation.mutate({ id: task.id, status: newStatus });
  }, [updateTaskStatusMutation, permissions, showWarningNotification]);

  const formatDate = (dateString) => {
    if (!dateString) return "Sem prazo";
    return new Date(dateString).toLocaleDateString('pt-PT');
  };
  const isOverdue = (deadline) => deadline && new Date(deadline) < new Date() && new Date(deadline).setHours(0, 0, 0, 0) !== new Date().setHours(0, 0, 0, 0);
  const getPriorityLabelAndColor = (priorityValue) => PRIORITY_OPTIONS.find(p => p.value === priorityValue) || PRIORITY_OPTIONS[2];

  const NotificationItem = ({ notification, onRemove }) => {
    const icons = { success: <CheckCircleIcon />, error: <XCircle />, warning: <AlertTriangle />, info: <Info /> };
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
          <motion.button whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }} whileTap={{ scale: 0.9 }} onClick={() => removeNotification(notification.id)}
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

  const isLoadingEssentialData = isLoadingClients || isLoadingUsers || isLoadingCategories || isLoadingWorkflows;

  // --- NEW, ROBUST GUARD CLAUSES ---
  if (permissions.loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>
        <BackgroundElements />
        <Loader2 size={48} className="animate-spin" style={{ color: 'rgb(147, 51, 234)' }} />
      </div>
    );
  }

  if (!canViewPage) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <BackgroundElements />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...glassStyle, padding: '2rem', textAlign: 'center', maxWidth: '500px', color: 'white' }}>
          <AlertCircle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Acesso Restrito</h2>
          <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)' }}>
            Sem permissões para visualizar tarefas.
          </p>
        </motion.div>
      </div>
    );
  }

  if (isErrorTasks && tasks.length === 0) {
    return <ErrorView message={errorTasks?.message || "Falha ao carregar tarefas."} onRetry={refetchTasks} />;
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white', paddingBottom: '2rem' }}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 99999 }} theme="dark" />
      <BackgroundElements />
      <NotificationsContainer />

      <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}>
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(52,211,153,0.2)', borderRadius: '12px', border: '1px solid rgba(52,211,153,0.3)' }}>
              <ListChecks size={28} style={{ color: 'rgb(52,211,153)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Gestão de Tarefas</h1>
              <p style={{ fontSize: '1rem', color: 'rgba(191,219,254,1)', margin: 0 }}>Organize e acompanhe todas as suas tarefas.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {(permissions.isOrgAdmin || permissions.canCreateTasks) && (
              <>
                <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={showForm ? closeForm : () => openFormForNew()}
                  style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: `1px solid rgba(59,130,246,${showForm ? 0.6 : 0.3})`, background: `rgba(59,130,246,${showForm ? 0.3 : 0.2})`, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  <Plus size={18} /> {showForm ? 'Fechar Formulário' : 'Nova Tarefa'}
                </motion.button>
              </>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <TaskForm
              clients={clients} users={users} categories={categories} workflows={workflows}
              onMainSubmit={handleSubmitMainForm}
              onNlpSubmit={handleSubmitNlpForm}
              isSaving={createTaskMutation.isPending || updateTaskMutation.isPending}
              isNlpProcessing={createNlpTaskMutation.isPending}
              fetchWorkflowStepsCallback={fetchWorkflowStepsCallback}
            />
          )}
        </AnimatePresence>

        <TaskStats tasks={tasks} isOverdue={isOverdue} />
        <TaskFilters clients={clients} users={users} categories={categories} />

        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: 'rgba(52,211,153,0.2)', borderRadius: '12px' }}><Activity style={{ color: 'rgb(52,211,153)' }} size={20} /></div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Lista de Tarefas</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>{tasks.length} tarefas encontradas</p>
              </div>
            </div>
          </div>

          {(() => {
            if (isLoadingTasksFirstTime && tasks.length === 0 && !isErrorTasks) {
              return (
                <div style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59,130,246)' }} />
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>A carregar tarefas...</p>
                </div>
              );
            }
            if (isErrorTasks && tasks.length === 0) {
              return <ErrorView message={errorTasks?.message || "Falha ao carregar tarefas."} onRetry={refetchTasks} />;
            }
            return (
              <>
                {isFetchingTasks && tasks.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(50% + 20px)',
                    left: '50%', transform: 'translate(-50%, -50%)',
                    padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.6)', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 5,
                    color: 'white', fontSize: '0.8rem'
                  }}>
                    <Loader2 size={16} className="animate-spin" />
                    Atualizando lista...
                  </div>
                )}
                {(tasks.length > 0 || (isFetchingTasks && tasks.length > 0)) && (
                  <TaskTable
                    tasks={tasks}
                    onSort={handleSort}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={confirmDeleteTask}
                    onLogTime={() => { }}
                    formatDate={formatDate}
                    isOverdue={isOverdue}
                    getPriorityLabelAndColor={getPriorityLabelAndColor}
                    permissions={permissions}
                    usersData={users}
                    clientsData={clients}
                  />
                )}
                {tasks.length === 0 && !isFetchingTasks && (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                    <SearchIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Nenhuma tarefa encontrada</h4>
                    <p style={{ margin: 0 }}>Tente ajustar os filtros ou verifique as suas tarefas atribuídas.</p>
                  </div>
                )}
              </>
            );
          })()}
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
                  <TaskOverflow taskId={selectedTaskForWorkflowView?.id} onWorkflowUpdate={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })} permissions={permissions} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.5) !important; }
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
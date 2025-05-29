import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Calendar,
  User,
  Briefcase,
  Activity,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Brain,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  FileText,
  Target,
  Settings,
  Bell,
  Send,
  X,
  Plus,
  Timer,
  Workflow,
  ChevronDown,
  ChevronRight,
  UserCheck,
  MessageSquare,
  Info,
  Zap
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Estilos glass modernos
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(16px)',
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

const stepVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { type: "spring", stiffness: 150, damping: 15 }
  },
  hover: { 
    scale: 1.02, 
    y: -2,
    transition: { type: "spring", stiffness: 400, damping: 25 }
  }
};

// Componente de Step do Workflow
const WorkflowStepCard = ({ step, isActive, isCompleted, onClick, timeSpent = 0 }) => {
  const getStepColor = () => {
    if (isCompleted) return 'rgb(52, 211, 153)';
    if (isActive) return 'rgb(59, 130, 246)';
    return 'rgba(255, 255, 255, 0.4)';
  };

  const formatTime = (minutes) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <motion.div
      variants={stepVariants}
      whileHover="hover"
      onClick={onClick}
      style={{
        ...glassStyle,
        padding: '1rem',
        cursor: 'pointer',
        background: isActive 
          ? 'rgba(59, 130, 246, 0.15)' 
          : isCompleted
          ? 'rgba(52, 211, 153, 0.1)'
          : 'rgba(255, 255, 255, 0.05)',
        border: `1px solid ${getStepColor()}40`,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Indicador de status */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        background: getStepColor()
      }} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: `${getStepColor()}20`,
            border: `2px solid ${getStepColor()}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            color: getStepColor(),
            fontSize: '0.875rem'
          }}>
            {isCompleted ? (
              <CheckCircle size={16} />
            ) : isActive ? (
              <Play size={16} />
            ) : (
              step.order
            )}
          </div>
          
          <div>
            <h4 style={{
              margin: '0 0 0.25rem 0',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'white'
            }}>
              {step.name}
            </h4>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              {step.assign_to_name && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <UserCheck size={12} />
                  {step.assign_to_name}
                </span>
              )}
              {timeSpent > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Timer size={12} />
                  {formatTime(timeSpent)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {step.requires_approval && (
            <div style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.625rem',
              fontWeight: '600',
              background: 'rgba(251, 191, 36, 0.2)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              color: 'rgb(251, 191, 36)'
            }}>
              Aprovação
            </div>
          )}
          
          <span style={{
            padding: '0.25rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.625rem',
            fontWeight: '600',
            background: `${getStepColor()}20`,
            border: `1px solid ${getStepColor()}40`,
            color: getStepColor()
          }}>
            {isCompleted ? 'Concluído' : 
             isActive ? 'Atual' : 'Pendente'}
          </span>
        </div>
      </div>

      {step.description && (
        <p style={{
          margin: 0,
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.6)',
          lineHeight: '1.4'
        }}>
          {step.description}
        </p>
      )}
    </motion.div>
  );
};

// Componente principal TimeEntryForms
const TimeEntryForms = ({ 
  onTimeEntryCreated, 
  initialClientId = null, 
  initialTaskId = null,
  permissions = {}
}) => {
  const queryClient = useQueryClient();
  
  // Estados
  const [showForm, setShowForm] = useState(false);
  const [isNaturalLanguageMode, setIsNaturalLanguageMode] = useState(false);
  const [selectedWorkflowStep, setSelectedWorkflowStep] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [workflowData, setWorkflowData] = useState(null);
  const [showWorkflowSteps, setShowWorkflowSteps] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedEntries, setExtractedEntries] = useState(null);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    client: initialClientId || "",
    task: initialTaskId || "",
    category: "",
    description: "",
    minutes_spent: 0,
    date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    task_status_after: "no_change",
    workflow_step: "",
    advance_workflow: false,
    workflow_step_completed: false
  });
  
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");

  // Queries para buscar dados
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients/').then(res => res.data),
    staleTime: 10 * 60 * 1000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', permissions.userId],
    queryFn: () => api.get(`/tasks/?user=${permissions.userId}`).then(res => res.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!permissions.userId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['taskCategories'],
    queryFn: () => api.get('/task-categories/').then(res => res.data),
    staleTime: 10 * 60 * 1000,
  });

  // Buscar dados do workflow quando uma tarefa é selecionada
  useEffect(() => {
    if (formData.task) {
      fetchWorkflowData();
    } else {
      setWorkflowData(null);
      setSelectedWorkflowStep(null);
      setShowWorkflowSteps(false);
    }
  }, [formData.task]);

  const fetchWorkflowData = async () => {
    if (!formData.task) return;
    
    try {
      const response = await api.get(`/tasks/${formData.task}/workflow_status/`);
      
      if (response.data.workflow) {
        setWorkflowData(response.data.workflow);
        setShowWorkflowSteps(true);
        
        // Se há um step atual, selecioná-lo por padrão
        if (response.data.workflow.current_step) {
          setSelectedWorkflowStep(response.data.workflow.current_step.id);
          setFormData(prev => ({
            ...prev,
            workflow_step: response.data.workflow.current_step.id
          }));
        }
      } else {
        setWorkflowData(null);
        setShowWorkflowSteps(false);
      }
    } catch (error) {
      console.error("Error fetching workflow data:", error);
    }
  };

  // Mutations
  const createTimeEntryMutation = useMutation({
    mutationFn: (entryData) => api.post("/time-entries/", entryData),
    onSuccess: (data) => {
      toast.success("Registro de tempo criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetForm();
      if (onTimeEntryCreated) onTimeEntryCreated(data.data);
    },
    onError: (error) => {
      console.error("Erro ao criar registro de tempo:", error);
      const errorData = error.response?.data;
      if (errorData && typeof errorData === 'object') {
        const messages = Object.entries(errorData)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
          .join('; ');
        toast.error(`Falha ao criar registro: ${messages}`);
      } else {
        toast.error("Falha ao criar registro de tempo.");
      }
    }
  });

  const createNlpTimeEntryMutation = useMutation({
    mutationFn: (nlpData) => api.post("/gemini-nlp/create_time_entries/", nlpData),
    onSuccess: (data) => {
      toast.success(`${data.data.length} entrada(s) de tempo criada(s) com IA!`);
      setNaturalLanguageInput("");
      setShowConfirmationDialog(false);
      setExtractedEntries(null);
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetForm();
      if (onTimeEntryCreated) onTimeEntryCreated(data.data);
    },
    onError: (error) => {
      console.error("Erro ao criar entrada NLP:", error);
      toast.error("Falha ao processar texto com IA");
    }
  });

  // Event handlers
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const handleTaskChange = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setSelectedTask(task);
    setFormData(prev => ({
      ...prev,
      task: taskId,
      client: task ? task.client : prev.client,
      category: task ? task.category : prev.category
    }));
  }, [tasks]);

  const handleWorkflowStepSelect = useCallback((stepId) => {
    setSelectedWorkflowStep(stepId);
    setFormData(prev => ({
      ...prev,
      workflow_step: stepId
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      client: initialClientId || "",
      task: initialTaskId || "",
      category: "",
      description: "",
      minutes_spent: 0,
      date: new Date().toISOString().split("T")[0],
      start_time: "",
      end_time: "",
      task_status_after: "no_change",
      workflow_step: "",
      advance_workflow: false,
      workflow_step_completed: false
    });
    setNaturalLanguageInput("");
    setShowForm(false);
    setSelectedWorkflowStep(null);
    setWorkflowData(null);
    setShowWorkflowSteps(false);
    setSelectedTask(null);
  }, [initialClientId, initialTaskId]);

  const handleNaturalLanguageSubmit = async (e) => {
    e.preventDefault();
    if (!naturalLanguageInput.trim()) {
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
      
      createNlpTimeEntryMutation.mutate(payload);
    } catch (error) {
      console.error("Erro ao criar entradas de tempo:", error);
      toast.error("Ocorreu um erro ao criar as entradas de tempo.");
    } finally {
      setIsProcessing(false);
    }
  }, [naturalLanguageInput, formData, extractedEntries, createNlpTimeEntryMutation]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (isNaturalLanguageMode) {
      await handleNaturalLanguageSubmit(e);
    } else {
      // Validações
      if (!formData.client) {
        toast.error("Cliente é obrigatório");
        return;
      }
      if (!formData.description) {
        toast.error("Descrição é obrigatória");
        return;
      }
      if (!formData.minutes_spent || formData.minutes_spent <= 0) {
        toast.error("Tempo gasto deve ser maior que zero");
        return;
      }
      
      const submissionData = { ...formData };
      submissionData.start_time = submissionData.start_time ? formatTimeForAPI(submissionData.start_time) : null;
      submissionData.end_time = submissionData.end_time ? formatTimeForAPI(submissionData.end_time) : null;
      
      createTimeEntryMutation.mutate(submissionData);
    }
  }, [formData, isNaturalLanguageMode, createTimeEntryMutation, handleNaturalLanguageSubmit]);

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

  const getTaskStatusLabel = (status) => {
    switch (status) {
      case 'in_progress': return 'Em Progresso';
      case 'completed': return 'Concluída';
      default: return 'Sem alteração';
    }
  };

  // Componente de confirmação para IA
  const ConfirmationDialog = ({ visible, extractedData, onConfirm, onCancel }) => {
    if (!visible || !extractedData) return null;
    
    return (
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
            maxWidth: '600px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            color: 'white'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Brain size={24} style={{ color: 'rgb(147, 51, 234)' }} />
              Confirmar Entradas de Tempo
            </h2>
          </div>
          
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem'
          }}>
            <p style={{
              marginBottom: '1rem',
              color: 'rgba(255,255,255,0.8)'
            }}>
              Encontrei as seguintes informações no seu texto. Por favor verifique e confirme:
            </p>
            
            {/* Informações extraídas */}
            {extractedData.clients?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '500', color: 'white', marginBottom: '0.5rem' }}>Clientes:</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {extractedData.clients.map((client, index) => (
                    <li key={index} style={{ color: 'rgba(255,255,255,0.8)' }}>{client.name}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {extractedData.tasks?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '500', color: 'white', marginBottom: '0.5rem' }}>Tarefas:</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {extractedData.tasks.map((task, index) => (
                    <li key={index} style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {task.title} {task.client_name && `(${task.client_name})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {extractedData.times?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '500', color: 'white', marginBottom: '0.5rem' }}>Tempos:</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {extractedData.times.map((minutes, index) => (
                    <li key={index} style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {formatMinutes(minutes)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {extractedData.activities?.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: '500', color: 'white', marginBottom: '0.5rem' }}>Atividades:</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  {extractedData.activities.map((activity, index) => (
                    <li key={index} style={{ color: 'rgba(255,255,255,0.8)' }}>{activity}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {formData.task_status_after !== 'no_change' && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px'
              }}>
                <p style={{
                  color: 'rgb(59, 130, 246)',
                  fontSize: '0.875rem',
                  margin: 0
                }}>
                  <strong>Status da Tarefa:</strong> Será alterado para "{getTaskStatusLabel(formData.task_status_after)}"
                </p>
              </div>
            )}
          </div>
          
          <div style={{
            padding: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem'
          }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onConfirm}
              disabled={isProcessing}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(52, 211, 153, 0.2)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Confirmar e Criar
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{ color: 'white' }}
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              padding: '0.75rem',
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '12px'
            }}
          >
            <Clock style={{ color: 'rgb(59, 130, 246)' }} size={24} />
          </motion.div>
          <div>
            <h2 style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1.25rem',
              fontWeight: '600'
            }}>
              Registrar Tempo
            </h2>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              Adicione uma nova entrada de tempo com suporte a workflows
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
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
            {showForm ? 'Cancelar' : 'Registrar Tempo'}
          </motion.button>
        </div>
      </motion.div>

      {/* Formulário */}
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
            {/* Toggle de modo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                  {isNaturalLanguageMode ? 'Modo IA' : 'Modo Manual'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                  {isNaturalLanguageMode 
                    ? 'Descreva suas atividades em linguagem natural'
                    : 'Preencha os campos manualmente'
                  }
                </p>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                  Manual
                </span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={isNaturalLanguageMode}
                    onChange={() => setIsNaturalLanguageMode(!isNaturalLanguageMode)}
                  />
                  <span className="slider round"></span>
                </label>
                <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                  IA
                </span>
                <Sparkles size={16} style={{ color: 'rgb(147, 51, 234)' }} />
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {isNaturalLanguageMode ? (
                // Modo IA
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255,255,255,0.8)'
                    }}>
                      Cliente (Opcional)
                    </label>
                    <select
                      name="client"
                      value={formData.client}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="" style={{ background: '#1f2937', color: 'white' }}>
                        Selecionar Cliente (Padrão)
                      </option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id} style={{ background: '#1f2937', color: 'white' }}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255,255,255,0.8)'
                    }}>
                      Descreva sua atividade *
                    </label>
                    <textarea
                      value={naturalLanguageInput}
                      onChange={(e) => setNaturalLanguageInput(e.target.value)}
                      placeholder="Ex: 2h declaração IVA cliente ABC, 30m reunião XYZ"
                      rows={3}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem',
                        resize: 'vertical'
                      }}
                    />
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.6)',
                      marginTop: '0.5rem'
                    }}>
                      O sistema irá extrair o tempo, cliente e outras informações automaticamente.
                    </p>
                  </div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem',
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        Data
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem',
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        Status da Tarefa (Após)
                      </label>
                      <select
                        name="task_status_after"
                        value={formData.task_status_after}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}
                      >
                        <option value="no_change" style={{ background: '#1f2937', color: 'white' }}>
                          Sem alteração
                        </option>
                        <option value="in_progress" style={{ background: '#1f2937', color: 'white' }}>
                          Marcar como Em Progresso
                        </option>
                        <option value="completed" style={{ background: '#1f2937', color: 'white' }}>
                          Marcar como Concluída
                        </option>
                      </select>
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.6)',
                        marginTop: '0.25rem'
                      }}>
                        Aplicado à tarefa identificada no texto.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Modo Manual
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {/* Cliente */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem',
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        Cliente *
                      </label>
                      <select
                        name="client"
                        value={formData.client}
                        onChange={handleInputChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}
                      >
                        <option value="" style={{ background: '#1f2937', color: 'white' }}>
                          Selecionar Cliente
                        </option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id} style={{ background: '#1f2937', color: 'white' }}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tarefa */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem',
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        Tarefa (Opcional)
                      </label>
                      <select
                        name="task"
                        value={formData.task}
                        onChange={(e) => handleTaskChange(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}
                      >
                        <option value="" style={{ background: '#1f2937', color: 'white' }}>
                          Selecionar Tarefa
                        </option>
                        {tasks
                          .filter(task => (!formData.client || task.client === formData.client) && task.status !== "completed")
                          .map(task => (
                            <option key={task.id} value={task.id} style={{ background: '#1f2937', color: 'white' }}>
                              {task.title}
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
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        Categoria (Opcional)
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}
                      >
                        <option value="" style={{ background: '#1f2937', color: 'white' }}>
                          Selecionar Categoria
                        </option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id} style={{ background: '#1f2937', color: 'white' }}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Minutos */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem',
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        Minutos Gastos *
                      </label>
                      <input
                        type="number"
                        name="minutes_spent"
                        value={formData.minutes_spent}
                        onChange={handleInputChange}
                        required
                        min="1"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>

                    {/* Data */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem',
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        Data *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>

                    {/* Status da Tarefa */}
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem',
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        Status da Tarefa (Após)
                      </label>
                      <select
                        name="task_status_after"
                        value={formData.task_status_after}
                        onChange={handleInputChange}
                        disabled={!formData.task}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.875rem',
                          opacity: !formData.task ? 0.5 : 1
                        }}
                      >
                        <option value="no_change" style={{ background: '#1f2937', color: 'white' }}>
                          Sem alteração
                        </option>
                        <option value="in_progress" style={{ background: '#1f2937', color: 'white' }}>
                          Marcar como Em Progresso
                        </option>
                        <option value="completed" style={{ background: '#1f2937', color: 'white' }}>
                          Marcar como Concluída
                        </option>
                      </select>
                      {!formData.task && (
                        <p style={{
                          fontSize: '0.75rem',
                          color: 'rgba(255,255,255,0.6)',
                          marginTop: '0.25rem'
                        }}>
                          Selecione uma tarefa para alterar o status.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Horários */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem',
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        Hora Início
                      </label>
                      <input
                        type="time"
                        name="start_time"
                        value={formData.start_time}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem',
                        color: 'rgba(255,255,255,0.8)'
                      }}>
                        Hora Fim
                      </label>
                      <input
                        type="time"
                        name="end_time"
                        value={formData.end_time}
                        onChange={handleInputChange}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                  </div>

                  {/* Descrição */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255,255,255,0.8)'
                    }}>
                      Descrição *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={2}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Workflow Steps Section */}
              {!isNaturalLanguageMode && workflowData && showWorkflowSteps && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  style={{
                    ...glassStyle,
                    background: 'rgba(147, 51, 234, 0.05)',
                    border: '1px solid rgba(147, 51, 234, 0.2)',
                    padding: '1.5rem',
                    marginBottom: '1.5rem'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                        <Workflow style={{ color: 'rgb(196, 181, 253)' }} size={20} />
                      </motion.div>
                      <div>
                        <h4 style={{
                          margin: '0 0 0.25rem 0',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'white'
                        }}>
                          Workflow: {workflowData.name}
                        </h4>
                        <p style={{
                          margin: 0,
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                          Selecione o passo específico para registrar o tempo
                        </p>
                      </div>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setShowWorkflowSteps(!showWorkflowSteps)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.7)',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '8px'
                      }}
                    >
                      {showWorkflowSteps ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </motion.button>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1rem'
                  }}>
                    {workflowData.steps.map((step) => (
                      <WorkflowStepCard
                        key={step.id}
                        step={step}
                        isActive={step.id === workflowData.current_step?.id}
                        isCompleted={step.order < (workflowData.current_step?.order || 0)}
                        onClick={() => handleWorkflowStepSelect(step.id)}
                        timeSpent={workflowData.time_by_step?.[step.id] || 0}
                      />
                    ))}
                  </div>

                  {selectedWorkflowStep && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle size={16} style={{ color: 'rgb(59, 130, 246)' }} />
                        <span style={{
                          fontSize: '0.875rem',
                          color: 'rgb(59, 130, 246)',
                          fontWeight: '500'
                        }}>
                          Passo selecionado: {workflowData.steps.find(s => s.id === selectedWorkflowStep)?.name}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginTop: '0.75rem'
                      }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                          <input
                            type="checkbox"
                            name="workflow_step_completed"
                            checked={formData.workflow_step_completed}
                            onChange={handleInputChange}
                            style={{ width: '16px', height: '16px' }}
                          />
                          Marcar passo como concluído
                        </label>
                        
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                          <input
                            type="checkbox"
                            name="advance_workflow"
                            checked={formData.advance_workflow}
                            onChange={handleInputChange}
                            style={{ width: '16px', height: '16px' }}
                          />
                          Avançar workflow automaticamente
                        </label>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Botões */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end'
              }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(239,68,68,0.2)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Cancelar
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={createTimeEntryMutation.isPending || isProcessing}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(59,130,246,0.2)',
                    border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: (createTimeEntryMutation.isPending || isProcessing) ? 0.7 : 1
                  }}
                >
                  {(createTimeEntryMutation.isPending || isProcessing) ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isNaturalLanguageMode ? (
                    <Brain size={16} />
                  ) : (
                    <Send size={16} />
                  )}
                  {isNaturalLanguageMode ? 'Processar com IA' : 'Guardar Registro'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay para processamento */}
      {isProcessing && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <motion.div
            style={{
              ...glassStyle,
              padding: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59,130,246)' }} />
            <p style={{ fontSize: '1rem', color: 'white' }}>Processando com IA...</p>
          </motion.div>
        </div>
      )}

      {/* Modal de confirmação */}
      <AnimatePresence>
        {showConfirmationDialog && (
          <ConfirmationDialog
            visible={showConfirmationDialog}
            extractedData={extractedEntries}
            onConfirm={confirmAndCreateEntries}
            onCancel={() => setShowConfirmationDialog(false)}
          />
        )}
      </AnimatePresence>

      {/* CSS para o switch */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        input::placeholder, textarea::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }
        
        select option {
          background: #1f2937 !important;
          color: white !important;
        }
        
        /* Switch para modo IA */
        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }
        
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255,255,255,0.2);
          transition: .4s;
          border-radius: 24px;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        
        input:checked + .slider {
          background-color: rgb(147, 51, 234);
        }
        
        input:focus + .slider {
          box-shadow: 0 0 1px rgb(147, 51, 234);
        }
        
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        
        .slider.round {
          border-radius: 24px;
        }
        
        .slider.round:before {
          border-radius: 50%;
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
        
        /* Focus states para acessibilidade */
        button:focus, input:focus, select:focus, textarea:focus {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }
        
        /* Animações suaves para workflow steps */
        .workflow-step {
          transition: all 0.3s ease;
        }
        
        .workflow-step:hover {
          transform: translateY(-2px) scale(1.02);
        }
        
        /* Glass morphism effect enhancement */
        .glass-effect {
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
        }
        
        /* Status badges animation */
        .status-badge {
          transition: all 0.3s ease;
        }
        
        .status-badge:hover {
          transform: scale(1.05);
        }
        
        /* Workflow progress indicator */
        .workflow-progress {
          background: linear-gradient(90deg, 
            rgba(59, 130, 246, 0.3) 0%, 
            rgba(147, 51, 234, 0.3) 100%);
          border-radius: 4px;
          overflow: hidden;
        }
        
        .workflow-progress-bar {
          background: linear-gradient(90deg, 
            rgb(59, 130, 246) 0%, 
            rgb(147, 51, 234) 100%);
          height: 100%;
          transition: width 0.5s ease;
        }
        
        /* Notification styles */
        .notification-pulse {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(147, 51, 234, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(147, 51, 234, 0);
          }
        }
        
        /* Enhanced form validation styles */
        .input-error {
          border-color: rgb(239, 68, 68) !important;
          box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.2);
        }
        
        .input-success {
          border-color: rgb(52, 211, 153) !important;
          box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.2);
        }
        
        /* Loading states */
        .loading-shimmer {
          background: linear-gradient(90deg, 
            rgba(255, 255, 255, 0.1) 25%, 
            rgba(255, 255, 255, 0.3) 50%, 
            rgba(255, 255, 255, 0.1) 75%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .switch {
            width: 40px;
            height: 20px;
          }
          
          .switch .slider:before {
            height: 14px;
            width: 14px;
          }
          
          input:checked + .slider:before {
            transform: translateX(20px);
          }
        }
        
        /* Dark mode enhancements */
        @media (prefers-color-scheme: dark) {
          .glass-effect {
            background: rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 255, 255, 0.1);
          }
        }
        
        /* Print styles */
        @media print {
          .switch, button, .workflow-step {
            display: none !important;
          }
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .slider {
            border: 2px solid currentColor;
          }
          
          .workflow-step {
            border: 2px solid currentColor;
          }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        
        /* Enhanced focus indicators for accessibility */
        .workflow-step:focus-within {
          outline: 2px solid rgb(59, 130, 246);
          outline-offset: 2px;
        }
        
        /* Custom scrollbar for webkit browsers */
        .workflow-steps-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .workflow-steps-container::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        
        .workflow-steps-container::-webkit-scrollbar-thumb {
          background: rgba(147, 51, 234, 0.6);
          border-radius: 3px;
        }
        
        .workflow-steps-container::-webkit-scrollbar-thumb:hover {
          background: rgba(147, 51, 234, 0.8);
        }
      `}</style>
    </motion.div>
  );
};

export default TimeEntryForms;
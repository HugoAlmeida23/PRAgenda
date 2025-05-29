import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  PlayCircle,
  PauseCircle,
  SkipForward,
  MessageSquare,
  Calendar,
  Timer,
  UserCheck,
  Zap,
  Activity,
  TrendingUp,
  Eye,
  EyeOff,
  Settings,
  Bell,
  BellOff,
  Send,
  Plus,
  X,
  Brain,
  Network,
  Info,
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Star,
  Clock4,
  User2,
  MessageCircle,
  RotateCcw
} from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Estilos glass modernos
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px'
};

// Variantes de animação aprimoradas
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { 
      staggerChildren: 0.1, 
      delayChildren: 0.2,
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const itemVariants = {
  hidden: { y: 30, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 200, 
      damping: 20,
      duration: 0.6
    }
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
    y: -4,
    transition: { type: "spring", stiffness: 400, damping: 25 }
  }
};

// Hook customizado para gerenciar workflow
const useWorkflow = (taskId) => {
  const queryClient = useQueryClient();

  // Query para buscar dados do workflow
  const { 
    data: workflowData, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['workflowStatus', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const response = await api.get(`/tasks/${taskId}/workflow_status/`);
      return response.data;
    },
    enabled: !!taskId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refresh a cada minuto
  });

  // Mutation para avançar workflow
  const advanceWorkflowMutation = useMutation({
    mutationFn: async ({ nextStepId, comment }) => {
      return await api.post(`/tasks/${taskId}/advance_workflow/`, {
        next_step_id: nextStepId,
        comment: comment
      });
    },
    onSuccess: () => {
      toast.success("Workflow avançado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['workflowStatus', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error("Error advancing workflow:", error);
      toast.error(error.response?.data?.error || "Falha ao avançar workflow");
    }
  });

  // Mutation para aprovar passo
  const approveStepMutation = useMutation({
    mutationFn: async ({ stepId, comment }) => {
      return await api.post('/task-approvals/', {
        task: taskId,
        workflow_step: stepId,
        approved: true,
        comment: comment
      });
    },
    onSuccess: () => {
      toast.success("Passo aprovado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['workflowStatus', taskId] });
    },
    onError: (error) => {
      console.error("Error approving step:", error);
      toast.error("Falha ao aprovar passo");
    }
  });

  return {
    workflowData,
    isLoading,
    isError,
    error,
    refetch,
    advanceWorkflow: advanceWorkflowMutation.mutate,
    approveStep: approveStepMutation.mutate,
    isAdvancing: advanceWorkflowMutation.isPending,
    isApproving: approveStepMutation.isPending
  };
};

// Componente para ícone de status do passo
const StepStatusIcon = ({ status, isApproved, requiresApproval }) => {
  if (status === 'completed') {
    return <CheckCircle2 size={20} style={{ color: 'rgb(52, 211, 153)' }} />;
  }
  
  if (status === 'current') {
    if (requiresApproval && !isApproved) {
      return <AlertCircle size={20} style={{ color: 'rgb(251, 191, 36)' }} />;
    }
    return <PlayCircle size={20} style={{ color: 'rgb(59, 130, 246)' }} />;
  }
  
  return <Clock4 size={20} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />;
};

// Componente para badge de status
const StatusBadge = ({ status, isApproved, requiresApproval }) => {
  let config = {
    bg: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
    color: 'rgba(255, 255, 255, 0.6)',
    text: 'Pendente'
  };

  if (status === 'completed') {
    config = {
      bg: 'rgba(52, 211, 153, 0.2)',
      border: 'rgba(52, 211, 153, 0.3)',
      color: 'rgb(110, 231, 183)',
      text: 'Concluído'
    };
  } else if (status === 'current') {
    if (requiresApproval && !isApproved) {
      config = {
        bg: 'rgba(251, 191, 36, 0.2)',
        border: 'rgba(251, 191, 36, 0.3)',
        color: 'rgb(251, 191, 36)',
        text: 'Aguarda Aprovação'
      };
    } else {
      config = {
        bg: 'rgba(59, 130, 246, 0.2)',
        border: 'rgba(59, 130, 246, 0.3)',
        color: 'rgb(147, 197, 253)',
        text: 'Em Andamento'
      };
    }
  }

  return (
    <span style={{
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '600',
      background: config.bg,
      border: `1px solid ${config.border}`,
      color: config.color
    }}>
      {config.text}
    </span>
  );
};

// Componente para card de passo do workflow
const WorkflowStepCard = ({ 
  step, 
  isActive, 
  isCompleted, 
  isApproved, 
  timeSpent = 0, 
  onAdvance, 
  onApprove,
  canAdvance,
  canApprove,
  isAdvancing,
  isApproving
}) => {
  const [showActions, setShowActions] = useState(false);
  const [comment, setComment] = useState('');

  const formatTime = (minutes) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStepColor = () => {
    if (isCompleted) return 'rgb(52, 211, 153)';
    if (isActive) return 'rgb(59, 130, 246)';
    return 'rgba(255, 255, 255, 0.4)';
  };

  const status = isCompleted ? 'completed' : isActive ? 'current' : 'pending';

  return (
    <motion.div
      variants={stepVariants}
      whileHover="hover"
      style={{
        ...glassStyle,
        padding: '1.5rem',
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
      {/* Indicador de status lateral */}
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
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: `${getStepColor()}20`,
            border: `2px solid ${getStepColor()}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            color: getStepColor()
          }}>
            <StepStatusIcon 
              status={status} 
              isApproved={isApproved} 
              requiresApproval={step.requires_approval} 
            />
          </div>
          
          <div>
            <h4 style={{
              margin: '0 0 0.25rem 0',
              fontSize: '1rem',
              fontWeight: '600',
              color: 'white'
            }}>
              {step.name}
            </h4>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              {step.assign_to_name && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <User2 size={14} />
                  {step.assign_to_name}
                </span>
              )}
              {timeSpent > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Timer size={14} />
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
              background: isApproved 
                ? 'rgba(52, 211, 153, 0.2)' 
                : 'rgba(251, 191, 36, 0.2)',
              border: isApproved 
                ? '1px solid rgba(52, 211, 153, 0.3)' 
                : '1px solid rgba(251, 191, 36, 0.3)',
              color: isApproved 
                ? 'rgb(110, 231, 183)' 
                : 'rgb(251, 191, 36)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <UserCheck size={12} />
              {isApproved ? 'Aprovado' : 'Aprovação'}
            </div>
          )}
          
          <StatusBadge 
            status={status} 
            isApproved={isApproved} 
            requiresApproval={step.requires_approval} 
          />
        </div>
      </div>

      {step.description && (
        <p style={{
          margin: '0 0 1rem 0',
          fontSize: '0.875rem',
          color: 'rgba(255, 255, 255, 0.6)',
          lineHeight: '1.5',
          paddingLeft: '3rem'
        }}>
          {step.description}
        </p>
      )}

      {/* Ações do passo atual */}
      {isActive && (
        <div style={{
          paddingLeft: '3rem',
          marginTop: '1rem'
        }}>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: showActions ? '1rem' : 0
          }}>
            {step.requires_approval && !isApproved && canApprove && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onApprove(step.id, comment)}
                disabled={isApproving}
                style={{
                  ...glassStyle,
                  padding: '0.75rem 1.5rem',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  background: 'rgba(52, 211, 153, 0.2)',
                  color: 'white',
                  cursor: isApproving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  opacity: isApproving ? 0.7 : 1
                }}
              >
                {isApproving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Aprovar Passo
              </motion.button>
            )}

            {canAdvance && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowActions(!showActions)}
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
                  fontSize: '0.875rem'
                }}
              >
                <SkipForward size={16} />
                Avançar Workflow
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  ...glassStyle,
                  padding: '1rem',
                  background: 'rgba(0, 0, 0, 0.2)'
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Comentário (Opcional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Adicione observações sobre este passo..."
                    rows={3}
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

                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end'
                }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowActions(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    Cancelar
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onAdvance(step.id, comment);
                      setComment('');
                      setShowActions(false);
                    }}
                    disabled={isAdvancing}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      opacity: isAdvancing ? 0.7 : 1
                    }}
                  >
                    {isAdvancing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    Confirmar
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

// Componente principal TaskOverflow
const TaskOverflow = ({ taskId, onWorkflowUpdate, permissions }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showTimeEntries, setShowTimeEntries] = useState(false);

  const {
    workflowData,
    isLoading,
    isError,
    error,
    refetch,
    advanceWorkflow,
    approveStep,
    isAdvancing,
    isApproving
  } = useWorkflow(taskId);

  const formatTime = useCallback((minutes) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('pt-PT');
  }, []);

  // Verificar permissões
  const canAdvanceWorkflow = useMemo(() => {
    if (!workflowData?.workflow?.current_step || !permissions) return false;
    
    return (
      permissions.isOrgAdmin ||
      permissions.canEditAllTasks ||
      (permissions.canEditAssignedTasks && workflowData.task?.assigned_to === permissions.userId) ||
      (workflowData.workflow.current_step.assign_to === permissions.username)
    );
  }, [workflowData, permissions]);

  const canApproveStep = useMemo(() => {
    if (!workflowData?.workflow?.current_step?.requires_approval || !permissions) return false;
    
    return permissions.isOrgAdmin || permissions.canApproveTasks;
  }, [workflowData, permissions]);

  const handleAdvanceWorkflow = useCallback((nextStepId, comment) => {
    advanceWorkflow({ nextStepId, comment });
    if (onWorkflowUpdate) onWorkflowUpdate();
  }, [advanceWorkflow, onWorkflowUpdate]);

  const handleApproveStep = useCallback((stepId, comment) => {
    approveStep({ stepId, comment });
    if (onWorkflowUpdate) onWorkflowUpdate();
  }, [approveStep, onWorkflowUpdate]);

  // Estados de loading e erro
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '300px',
        color: 'white'
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Brain size={48} style={{ color: 'rgb(147, 51, 234)' }} />
        </motion.div>
        <p style={{ marginLeft: '1rem', fontSize: '1rem' }}>
          Carregando workflow...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          ...glassStyle,
          padding: '2rem',
          textAlign: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'white'
        }}
      >
        <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
        <h3 style={{ margin: '0 0 0.5rem 0' }}>
          Erro ao Carregar Workflow
        </h3>
        <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
          {error?.message || 'Ocorreu um erro ao carregar os dados do workflow.'}
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
            margin: '0 auto'
          }}
        >
          <RotateCcw size={16} />
          Tentar Novamente
        </motion.button>
      </motion.div>
    );
  }

  if (!workflowData?.workflow) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          ...glassStyle,
          padding: '2rem',
          textAlign: 'center',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          color: 'white'
        }}
      >
        <Network size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
        <h3 style={{ margin: '0 0 0.5rem 0' }}>
          Sem Workflow Associado
        </h3>
        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)' }}>
          Esta tarefa não possui um workflow associado.
        </p>
      </motion.div>
    );
  }

  const workflow = workflowData.workflow;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{ color: 'white' }}
    >
      {/* Header do Workflow */}
      <motion.div
        variants={itemVariants}
        style={{
          ...glassStyle,
          padding: '2rem',
          marginBottom: '2rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h2 style={{ 
                margin: '0 0 0.5rem 0', 
                fontSize: '1.5rem', 
                fontWeight: '700',
                background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                {workflow.name}
              </h2>
              <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Passo Atual: {workflow.current_step?.name || 'Não iniciado'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHistory(!showHistory)}
              style={{
                ...glassStyle,
                padding: '0.75rem 1rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: showHistory ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              {showHistory ? <EyeOff size={16} /> : <Eye size={16} />}
              Histórico
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTimeEntries(!showTimeEntries)}
              style={{
                ...glassStyle,
                padding: '0.75rem 1rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: showTimeEntries ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              <Timer size={16} />
              Tempos
            </motion.button>
          </div>
        </div>

        {/* Progresso Geral */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '12px',
          padding: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} style={{ color: 'rgb(59, 130, 246)' }} />
              <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600' }}>
                Progresso do Workflow
              </span>
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: '700', color: 'white' }}>
              {workflow.current_step?.order || 0} de {workflow.steps?.length || 0}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '12px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${((workflow.current_step?.order || 0) / (workflow.steps?.length || 1)) * 100}%`
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, rgb(59, 130, 246), rgb(147, 51, 234))',
                borderRadius: '6px',
                position: 'relative'
              }}
            >
              <motion.div
                animate={{ x: [-10, 10, -10] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '20px',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  borderRadius: '6px'
                }}
              />
            </motion.div>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.75rem',
            fontSize: '0.875rem',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            <span>Iniciado</span>
            <span>
              {Math.round(((workflow.current_step?.order || 0) / (workflow.steps?.length || 1)) * 100)}% concluído
            </span>
            <span>Finalizado</span>
          </div>
        </div>
      </motion.div>

      {/* Visualização dos Passos */}
      <motion.div
        variants={itemVariants}
        style={{
          ...glassStyle,
          padding: '2rem',
          marginBottom: '2rem'
        }}
      >
        <h3 style={{
          margin: '0 0 2rem 0',
          fontSize: '1.25rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          <Network size={24} />
          Passos do Workflow
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {workflow.steps?.map((step, index) => {
            const isActive = workflow.current_step && step.id === workflow.current_step.id;
            const isCompleted = workflow.current_step && step.order < workflow.current_step.order;
            const isApproved = workflow.approvals?.some(
              approval => approval.workflow_step === step.name && approval.approved
            ) || false;
            const timeSpent = workflow.time_by_step?.[step.id] || 0;
            
            return (
              <WorkflowStepCard
                key={step.id}
                step={step}
                isActive={isActive}
                isCompleted={isCompleted}
                isApproved={isApproved}
                timeSpent={timeSpent}
                onAdvance={handleAdvanceWorkflow}
                onApprove={handleApproveStep}
                canAdvance={canAdvanceWorkflow && isActive}
                canApprove={canApproveStep && isActive}
                isAdvancing={isAdvancing}
                isApproving={isApproving}
              />
            );
          })}
        </div>
      </motion.div>

      {/* História do Workflow */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{
              ...glassStyle,
              padding: '2rem',
              marginBottom: '2rem'
            }}
          >
            <h3 style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.25rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'white'
            }}>
              <FileText size={20} />
              Histórico do Workflow
            </h3>

            {!workflow.history || workflow.history.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <MessageCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>Nenhum histórico disponível ainda.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {workflow.history.slice(0, 10).map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      ...glassStyle,
                      padding: '1.5rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem'
                    }}
                  >
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: 'rgb(59, 130, 246)',
                      marginTop: '0.25rem',
                      flexShrink: 0
                    }} />
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        marginBottom: '0.5rem',
                        color: 'white'
                      }}>
                        {entry.from_step && entry.to_step 
                          ? `${entry.from_step} → ${entry.to_step}`
                          : entry.to_step || entry.from_step || 'Workflow'
                        }
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ fontWeight: '500' }}>{entry.changed_by}</span> • {formatDate(entry.created_at)}
                      </div>
                      {entry.comment && (
                        <div style={{
                          fontSize: '0.875rem',
                          color: 'rgba(255, 255, 255, 0.8)',
                          fontStyle: 'italic',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          marginTop: '0.5rem'
                        }}>
                          "{entry.comment}"
                        </div>
                      )}
                    </div>

                    {entry.time_spent_minutes && (
                      <div style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        background: 'rgba(52, 211, 153, 0.2)',
                        fontSize: '0.75rem',
                        color: 'rgb(52, 211, 153)',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        flexShrink: 0
                      }}>
                        <Timer size={12} />
                        {formatTime(entry.time_spent_minutes)}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tempo por Passo */}
      <AnimatePresence>
        {showTimeEntries && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{
              ...glassStyle,
              padding: '2rem',
              marginBottom: '2rem'
            }}
          >
            <h3 style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.25rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'white'
            }}>
              <Timer size={20} />
              Tempo por Passo
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              {workflow.steps?.map((step, index) => {
                const timeSpent = workflow.time_by_step?.[step.id] || 0;
                const isActive = workflow.current_step && step.id === workflow.current_step.id;
                
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    style={{
                      ...glassStyle,
                      padding: '1.5rem',
                      background: isActive 
                        ? 'rgba(59, 130, 246, 0.1)' 
                        : 'rgba(255, 255, 255, 0.05)',
                      textAlign: 'center',
                      border: isActive 
                        ? '1px solid rgba(59, 130, 246, 0.3)' 
                        : '1px solid rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    <div style={{
                      fontSize: '2rem',
                      fontWeight: '700',
                      color: isActive ? 'rgb(59, 130, 246)' : 'rgb(147, 51, 234)',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}>
                      <Timer size={24} />
                      {formatTime(timeSpent)}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: '500'
                    }}>
                      {step.name}
                    </div>
                    {step.assign_to_name && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        marginTop: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem'
                      }}>
                        <User2 size={12} />
                        {step.assign_to_name}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Resumo Total */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                ...glassStyle,
                padding: '1.5rem',
                marginTop: '2rem',
                background: 'rgba(147, 51, 234, 0.1)',
                border: '1px solid rgba(147, 51, 234, 0.2)',
                textAlign: 'center'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: 'white'
                }}>
                  <Sparkles size={20} style={{ color: 'rgb(147, 51, 234)' }} />
                  Tempo Total do Workflow:
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: 'rgb(147, 51, 234)'
                }}>
                  {formatTime(
                    Object.values(workflow.time_by_step || {}).reduce((total, time) => total + time, 0)
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.div 
        initial={{ scale: 0, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        style={{ 
          position: 'fixed', 
          bottom: '2rem', 
          right: '2rem', 
          zIndex: 100 
        }}
      >
      </motion.div>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }
        
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
        button:focus, textarea:focus {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }
        
        /* Glass morphism effect enhancement */
        .glass-effect {
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
        }
        
        /* Animações suaves para workflow steps */
        .workflow-step {
          transition: all 0.3s ease;
        }
        
        .workflow-step:hover {
          transform: translateY(-2px) scale(1.02);
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
          border-radius: 6px;
          overflow: hidden;
        }
        
        .workflow-progress-bar {
          background: linear-gradient(90deg, 
            rgb(59, 130, 246) 0%, 
            rgb(147, 51, 234) 100%);
          height: 100%;
          transition: width 0.5s ease;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .workflow-step-card {
            padding: 1rem;
          }
          
          .workflow-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
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
      `}</style>
    </motion.div>
  );
};

export default TaskOverflow;
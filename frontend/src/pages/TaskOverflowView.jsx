import React, { useState, useEffect, useMemo } from 'react';
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
  X
} from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';

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

const TaskOverflowView = ({ taskId, onWorkflowUpdate, permissions }) => {
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [workflowData, setWorkflowData] = useState(null);
  const [comment, setComment] = useState('');
  const [selectedNextStep, setSelectedNextStep] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showTimeEntries, setShowTimeEntries] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchWorkflowData();
    }
  }, [taskId]);

  const fetchWorkflowData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tasks/${taskId}/workflow_status/`);
      
      if (response.data.workflow) {
        setWorkflowData(response.data.workflow);
        
        // Buscar dados da tarefa
        const taskResponse = await api.get(`/tasks/${taskId}/`);
        setTask(taskResponse.data);
      } else {
        setWorkflowData(null);
        setTask(null);
      }
    } catch (error) {
      console.error("Error fetching workflow data:", error);
      toast.error("Falha ao carregar dados do workflow");
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceWorkflow = async () => {
    if (!selectedNextStep) {
      toast.error("Selecione o próximo passo");
      return;
    }

    try {
      setAdvancing(true);
      await api.post(`/tasks/${taskId}/advance_workflow/`, {
        next_step_id: selectedNextStep,
        comment: comment
      });
      
      toast.success("Workflow avançado com sucesso!");
      setComment('');
      setSelectedNextStep('');
      setShowAdvanceModal(false);
      await fetchWorkflowData();
      
      if (onWorkflowUpdate) {
        onWorkflowUpdate();
      }
    } catch (error) {
      console.error("Error advancing workflow:", error);
      toast.error(error.response?.data?.error || "Falha ao avançar workflow");
    } finally {
      setAdvancing(false);
    }
  };

  const handleApproveStep = async () => {
    if (!workflowData.current_step) {
      return;
    }

    try {
      setApproving(true);
      await api.post('/task-approvals/', {
        task: taskId,
        workflow_step: workflowData.current_step.id,
        approved: true,
        comment: comment
      });
      
      toast.success("Passo aprovado com sucesso!");
      setComment('');
      await fetchWorkflowData();
      
      if (onWorkflowUpdate) {
        onWorkflowUpdate();
      }
    } catch (error) {
      console.error("Error approving step:", error);
      toast.error("Falha ao aprovar passo");
    } finally {
      setApproving(false);
    }
  };

  const formatTime = (minutes) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('pt-PT');
  };

  const getStepStatus = (step) => {
    if (step.is_current) return 'current';
    if (step.is_completed) return 'completed';
    return 'pending';
  };

  const getStepColor = (status) => {
    switch (status) {
      case 'completed':
        return 'rgb(52, 211, 153)';
      case 'current':
        return 'rgb(59, 130, 246)';
      default:
        return 'rgba(255, 255, 255, 0.4)';
    }
  };

  const canAdvanceWorkflow = useMemo(() => {
    if (!workflowData?.current_step || !permissions) return false;
    
    return (
      permissions.isOrgAdmin ||
      permissions.canEditAllTasks ||
      (permissions.canEditAssignedTasks && task?.assigned_to === permissions.userId) ||
      (workflowData.current_step.assign_to === permissions.username)
    );
  }, [workflowData, permissions, task]);

  const canApproveStep = useMemo(() => {
    if (!workflowData?.current_step?.requires_approval || !permissions) return false;
    
    return permissions.isOrgAdmin || permissions.canApproveTasks;
  }, [workflowData, permissions]);

  const availableNextSteps = useMemo(() => {
    if (!workflowData?.current_step) return [];
    
    return workflowData.steps.filter(step => 
      step.order > workflowData.current_step.order
    );
  }, [workflowData]);

  const isStepApproved = (stepId) => {
    return workflowData?.approvals?.some(
      approval => approval.workflow_step === stepId && approval.approved
    ) || false;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '300px'
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={32} style={{ color: 'rgb(59, 130, 246)' }} />
        </motion.div>
      </div>
    );
  }

  if (!workflowData) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          ...glassStyle,
          padding: '2rem',
          textAlign: 'center',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.2)'
        }}
      >
        <AlertTriangle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'white' }}>
          Sem Workflow Associado
        </h3>
        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)' }}>
          Esta tarefa não possui um workflow associado.
        </p>
      </motion.div>
    );
  }

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
          padding: '1.5rem',
          marginBottom: '1.5rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              <Activity style={{ color: 'rgb(59, 130, 246)' }} size={24} />
            </motion.div>
            <div>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
                {workflowData.name}
              </h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Passo Atual: {workflowData.current_step?.name || 'Não iniciado'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHistory(!showHistory)}
              style={{
                ...glassStyle,
                padding: '0.5rem 1rem',
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
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTimeEntries(!showTimeEntries)}
              style={{
                ...glassStyle,
                padding: '0.5rem 1rem',
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
          borderRadius: '8px',
          padding: '1rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem'
          }}>
            <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              Progresso do Workflow
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
              {workflowData.current_step?.order || 0} de {workflowData.steps.length}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${((workflowData.current_step?.order || 0) / workflowData.steps.length) * 100}%`
              }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, rgb(59, 130, 246), rgb(147, 51, 234))',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Visualização dos Passos */}
      <motion.div
        variants={itemVariants}
        style={{
          ...glassStyle,
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}
      >
        <h3 style={{
          margin: '0 0 1.5rem 0',
          fontSize: '1.125rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <TrendingUp size={20} />
          Passos do Workflow
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {workflowData.steps.map((step, index) => {
            const status = getStepStatus(step);
            const stepColor = getStepColor(status);
            const isApproved = isStepApproved(step.name);
            
            return (
              <motion.div
                key={step.id}
                variants={stepVariants}
                whileHover="hover"
                style={{
                  ...glassStyle,
                  padding: '1.5rem',
                  background: status === 'current' 
                    ? 'rgba(59, 130, 246, 0.1)' 
                    : status === 'completed'
                    ? 'rgba(52, 211, 153, 0.1)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${stepColor}40`,
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
                  background: stepColor
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
                      background: `${stepColor}20`,
                      border: `2px solid ${stepColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      color: stepColor
                    }}>
                      {status === 'completed' ? (
                        <CheckCircle size={20} />
                      ) : status === 'current' ? (
                        <PlayCircle size={20} />
                      ) : (
                        step.order
                      )}
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
                        {step.assign_to && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <UserCheck size={14} />
                            {step.assign_to}
                          </span>
                        )}
                        {step.time_spent > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Timer size={14} />
                            {formatTime(step.time_spent)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {step.requires_approval && (
                      <div style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: isApproved 
                          ? 'rgba(52, 211, 153, 0.2)' 
                          : 'rgba(251, 191, 36, 0.2)',
                        border: isApproved 
                          ? '1px solid rgba(52, 211, 153, 0.3)' 
                          : '1px solid rgba(251, 191, 36, 0.3)',
                        color: isApproved 
                          ? 'rgb(110, 231, 183)' 
                          : 'rgb(251, 191, 36)'
                      }}>
                        {isApproved ? 'Aprovado' : 'Requer Aprovação'}
                      </div>
                    )}
                    
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: `${stepColor}20`,
                      border: `1px solid ${stepColor}40`,
                      color: stepColor
                    }}>
                      {status === 'completed' ? 'Concluído' : 
                       status === 'current' ? 'Em Andamento' : 'Pendente'}
                    </span>
                  </div>
                </div>

                {step.description && (
                  <p style={{
                    margin: '0 0 1rem 0',
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    paddingLeft: '3rem'
                  }}>
                    {step.description}
                  </p>
                )}

                {/* Ações do passo atual */}
                {status === 'current' && (
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    paddingLeft: '3rem',
                    marginTop: '1rem'
                  }}>
                    {step.requires_approval && !isApproved && canApproveStep && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleApproveStep}
                        disabled={approving}
                        style={{
                          ...glassStyle,
                          padding: '0.5rem 1rem',
                          border: '1px solid rgba(52, 211, 153, 0.3)',
                          background: 'rgba(52, 211, 153, 0.2)',
                          color: 'white',
                          cursor: approving ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.875rem',
                          opacity: approving ? 0.7 : 1
                        }}
                      >
                        {approving ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Aprovar Passo
                      </motion.button>
                    )}

                    {canAdvanceWorkflow && availableNextSteps.length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAdvanceModal(true)}
                        style={{
                          ...glassStyle,
                          padding: '0.5rem 1rem',
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
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Histórico do Workflow */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}
          >
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FileText size={20} />
              Histórico do Workflow
            </h3>

            {workflowData.history.length === 0 ? (
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)' }}>
                Nenhum histórico disponível.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {workflowData.history.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      ...glassStyle,
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'rgb(59, 130, 246)'
                    }} />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.25rem'
                      }}>
                        {entry.from_step && entry.to_step 
                          ? `${entry.from_step} → ${entry.to_step}`
                          : entry.to_step || entry.from_step || 'Workflow'
                        }
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.6)'
                      }}>
                        {entry.changed_by} • {formatDate(entry.created_at)}
                      </div>
                      {entry.comment && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.8)',
                          marginTop: '0.25rem',
                          fontStyle: 'italic'
                        }}>
                          "{entry.comment}"
                        </div>
                      )}
                    </div>

                    {entry.time_spent_minutes && (
                      <div style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(52, 211, 153, 0.2)',
                        fontSize: '0.75rem',
                        color: 'rgb(52, 211, 153)'
                      }}>
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}
          >
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Timer size={20} />
              Tempo por Passo
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              {workflowData.steps.map((step) => (
                <motion.div
                  key={step.id}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    ...glassStyle,
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    textAlign: 'center'
                  }}
                >
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: 'rgb(59, 130, 246)',
                    marginBottom: '0.5rem'
                  }}>
                    {formatTime(workflowData.time_by_step[step.id] || 0)}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    {step.name}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal para avançar workflow */}
      <AnimatePresence>
        {showAdvanceModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
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
                maxWidth: '500px',
                padding: '2rem',
                color: 'white'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  Avançar Workflow
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAdvanceModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={24} />
                </motion.button>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  marginBottom: '0.5rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Próximo Passo *
                </label>
                <select
                  value={selectedNextStep}
                  onChange={(e) => setSelectedNextStep(e.target.value)}
                  required
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
                    Selecione o próximo passo
                  </option>
                  {availableNextSteps.map((step) => (
                    <option 
                      key={step.id} 
                      value={step.id}
                      style={{ background: '#1f2937', color: 'white' }}
                    >
                      {step.name} {step.assign_to ? `(${step.assign_to})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
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
                  placeholder="Adicione observações sobre esta transição..."
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
                  onClick={() => setShowAdvanceModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
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
                  onClick={handleAdvanceWorkflow}
                  disabled={advancing || !selectedNextStep}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: advancing || !selectedNextStep ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: advancing || !selectedNextStep ? 0.7 : 1
                  }}
                >
                  {advancing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  Avançar
                </motion.button>
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
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        select option {
          background: #1f2937 !important;
          color: white !important;
        }
        
        textarea::placeholder, select::placeholder {
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
      `}</style>
    </motion.div>
  );
};

export default TaskOverflowView;
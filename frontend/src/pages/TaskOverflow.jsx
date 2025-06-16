// src/pages/TaskOverflow.jsx

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  FileText,
  PlayCircle,
  Timer,
  TrendingUp,
  Eye,
  EyeOff,
  Brain,
  Network,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock4,
  RotateCcw,
  User2,
  SkipForward
} from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px'
};

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

const useWorkflow = (taskId) => {
  const queryClient = useQueryClient();

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
    refetchInterval: 60 * 1000,
  });

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
      toast.error(error.response?.data?.error || "Falha ao avançar workflow.");
    }
  });

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
      toast.error(error.response?.data?.error || "Falha ao aprovar passo.");
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

const formatTime = (minutes) => {
    if (minutes === null || minutes === undefined) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};

const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
};

const CompactWorkflowStepCard = ({
  step,
  workflowData,
  onAdvance,
  onApprove,
  canAdvance,
  canApprove,
  isAdvancing,
  isApproving
}) => {
  const [showActions, setShowActions] = useState(false);
  
  if (!step) return null;

  const isActive = Boolean(step.is_current);
  const isCompleted = Boolean(step.is_completed);
  const timeSpent = workflowData.workflow?.time_by_step?.[step.id] || 0;
  
  const isApproved = useMemo(() => {
    if (!step.requires_approval) return true;
    if (!workflowData?.approvals?.length) return false;
    return workflowData.approvals.some(appr => appr.workflow_step_id === step.id && appr.approved);
  }, [step, workflowData?.approvals]);

  const getStepColors = () => {
    if (isCompleted) return { bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.3)', text: 'rgb(52, 211, 153)' };
    if (isActive) {
      if (step.requires_approval && !isApproved) return { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: 'rgb(251, 191, 36)' };
      return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', text: 'rgb(59, 130, 246)' };
    }
    return { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.15)', text: 'rgba(255, 255, 255, 0.4)' };
  };

  const colors = getStepColors();
  
  const StatusIcon = () => {
    if (isCompleted) return <CheckCircle2 size={12} style={{ color: colors.text }} />;
    if (isActive) {
      if (step.requires_approval && !isApproved) return <AlertCircle size={12} style={{ color: colors.text }} />;
      return <PlayCircle size={12} style={{ color: colors.text }} />;
    }
    return <Clock4 size={12} style={{ color: colors.text }} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        ...glassStyle,
        padding: '0.75rem',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        position: 'relative'
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: colors.text, borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: colors.bg, border: `1px solid ${colors.text}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <StatusIcon />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white', marginBottom: '0.1rem' }}>
              {step.order}. {step.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {step.assign_to_name && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <User2 size={12}/>
                    {step.assign_to_name}
                </span>
              )}
              {timeSpent > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Timer size={12}/>
                    {formatTime(timeSpent)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
          {step.requires_approval && (
            <span style={{ fontSize: '0.9rem', padding: '0.2rem 0.4rem', borderRadius: '4px', background: isApproved ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)', color: isApproved ? 'rgb(110, 231, 183)' : 'rgb(251, 191, 36)' }}>
              {isApproved ? '✓' : '⚠️ Necessita Aprovação'}
            </span>
          )}
          
          {isActive && (canAdvance || (canApprove && step.requires_approval && !isApproved)) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowActions(!showActions)}
              style={{ padding: '0.3rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '0.6rem' }}
            >
              ⚡
            </motion.button>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {showActions && isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
              {step.requires_approval && !isApproved && canApprove && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => onApprove && onApprove(step.id, '')}
                  disabled={isApproving}
                  style={{ padding: '0.4rem 0.6rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '0.6rem' }}
                >
                  {isApproving ? '⏳' : '✅'} Aprovar
                </motion.button>
              )}
              {canAdvance && (!step.requires_approval || isApproved) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => onAdvance && onAdvance(null, '')}
                  disabled={isAdvancing}
                  style={{ padding: '0.4rem 0.6rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '4px', color: 'white', cursor: 'pointer', fontSize: '0.6rem' }}
                >
                  {isAdvancing ? '⏳' : '➡️'} Avançar
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

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

  const canAdvanceWorkflow = useMemo(() => {
    if (!workflowData?.current_step || !permissions || workflowData.is_completed) return false;
    const currentStepDefinition = workflowData.workflow?.steps?.find(s => s.id === workflowData.current_step.id);
    if (!currentStepDefinition) return false;

    return (
      permissions.isOrgAdmin ||
      permissions.canEditAllTasks ||
      (permissions.canEditAssignedTasks && workflowData.task?.assigned_to === permissions.userId) ||
      (currentStepDefinition.assign_to === permissions.username)
    );
  }, [workflowData, permissions]);

  const canApproveStep = useMemo(() => {
    if (!workflowData?.current_step || !permissions || workflowData.is_completed) return false;
    const currentStepDefinition = workflowData.workflow?.steps?.find(s => s.id === workflowData.current_step.id);
    if (!currentStepDefinition?.requires_approval) return false;

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

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'white' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
          <Brain size={48} style={{ color: 'rgb(147, 51, 234)' }} />
        </motion.div>
        <p style={{ marginLeft: '1rem', fontSize: '1.1rem', fontWeight: '500' }}>Carregando workflow...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ ...glassStyle, padding: '2rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'white' }}>
        <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>Erro ao Carregar Workflow</h3>
        <p style={{ margin: '0 0 1.5rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
          {error?.response?.data?.detail || error?.message || 'Ocorreu uma falha inesperada.'}
        </p>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => refetch()} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.2)', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <RotateCcw size={16} />
          Tentar Novamente
        </motion.button>
      </motion.div>
    );
  }

  if (!workflowData || !workflowData.workflow || !workflowData.workflow.steps) {
    return (
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ ...glassStyle, padding: '2rem', textAlign: 'center', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', color: 'white' }}>
        <Network size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>Sem Workflow Associado</h3>
        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)' }}>
          Esta tarefa não possui um workflow definido ou os dados não puderam ser carregados.
        </p>
      </motion.div>
    );
  }

  const { steps: stepsDefinition, progress } = workflowData.workflow;
  const progressPercentage = progress ? progress.percentage : 0;
  const completedStepsCount = progress ? progress.completed_steps : 0;
  const totalSteps = progress ? progress.total_steps : 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      style={{ color: 'white' }}
    >
      <motion.div
        variants={itemVariants}
        style={{ ...glassStyle, padding: '1rem', marginBottom: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '8px' }}>
              <Network size={16} style={{ color: 'rgb(147, 197, 253)' }} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 0.1rem 0', fontSize: '1rem', fontWeight: 'bold', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {workflowData.workflow.name}
              </h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                {workflowData.workflow.is_completed ? 'Finalizado' : (workflowData.current_step?.name || 'Não iniciado')}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowHistory(!showHistory)} style={{ ...glassStyle, padding: '0.4rem 0.6rem', border: '1px solid rgba(255, 255, 255, 0.2)', background: showHistory ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
              {showHistory ? <EyeOff size={10} /> : <Eye size={10} />} Histórico
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowTimeEntries(!showTimeEntries)} style={{ ...glassStyle, padding: '0.4rem 0.6rem', border: '1px solid rgba(255, 255, 255, 0.2)', background: showTimeEntries ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}>
              <Timer size={10} /> Tempos
            </motion.button>
          </div>
        </div>
        <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <TrendingUp size={12} style={{ color: 'rgb(59, 130, 246)' }} />
              <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600' }}>Progresso</span>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'white' }}>
              {completedStepsCount}/{totalSteps}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              style={{ height: '100%', background: 'linear-gradient(90deg, rgb(59, 130, 246), rgb(147, 51, 234))', borderRadius: '3px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            <span>{Math.round(progressPercentage)}% concluído</span>
          </div>
        </div>
      </motion.div>
      <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1rem', marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          <Network size={14} /> Passos do Workflow
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {stepsDefinition.map((stepInfo) => (
            <CompactWorkflowStepCard
              key={stepInfo.id}
              step={stepInfo}
              workflowData={workflowData}
              onAdvance={handleAdvanceWorkflow}
              onApprove={handleApproveStep}
              canAdvance={canAdvanceWorkflow}
              canApprove={canApproveStep}
              isAdvancing={isAdvancing}
              isApproving={isApproving}
            />
          ))}
        </div>
      </motion.div>
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} style={{ ...glassStyle, padding: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white' }}>
              <FileText size={12} /> Histórico
            </h3>
            {!workflowData.history || workflowData.history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem 0', color: 'rgba(255, 255, 255, 0.6)' }}>
                <p style={{ margin: 0, fontSize: '0.65rem' }}>Nenhum histórico disponível.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto' }}>
                {workflowData.history.slice(0, 5).map((entry, index) => (
                  <div key={entry.id || index} style={{ ...glassStyle, padding: '0.6rem', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgb(59, 130, 246)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: '600', color: 'white', marginBottom: '0.2rem' }}>
                        {entry.from_step && entry.to_step ? `${entry.from_step_name || entry.from_step} → ${entry.to_step_name || entry.to_step}` : entry.to_step_name || 'Ação'}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        {entry.changed_by_username} • {formatDate(entry.created_at)}
                      </div>
                    </div>
                    {entry.time_spent_minutes > 0 && (
                      <div style={{ fontSize: '0.55rem', color: 'rgb(110, 231, 183)', fontWeight: '600' }}>
                        {formatTime(entry.time_spent_minutes)}
                      </div>
                    )}
                  </div>
                ))}
                {workflowData.history.length > 5 && (
                  <div style={{ textAlign: 'center', fontSize: '0.6rem', color: 'rgba(255, 255, 255, 0.5)', padding: '0.3rem' }}>
                    +{workflowData.history.length - 5} mais entradas
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTimeEntries && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} style={{ ...glassStyle, padding: '1rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white' }}>
              <Timer size={12} /> Tempos
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
              {stepsDefinition.map((stepInfo) => {
                const timeForStep = workflowData.workflow.time_by_step?.[stepInfo.id] || 0;
                if (timeForStep > 0 || workflowData.current_step?.id === stepInfo.id) {
                  return (
                    <div key={stepInfo.id} style={{ ...glassStyle, padding: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: '600', color: 'white', marginBottom: '0.2rem' }}>
                        {stepInfo.name}
                      </div>
                      <div style={{ fontSize: '0.65rem', fontWeight: '700', color: timeForStep > 0 ? 'rgb(52, 211, 153)' : 'rgb(251, 191, 36)' }}>
                        {formatTime(timeForStep)}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
            <div style={{ ...glassStyle, padding: '0.6rem', marginTop: '0.75rem', background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: '600', color: 'white' }}>
                Total: <span style={{ color: 'rgb(147, 51, 234)', fontWeight: '700' }}>
                  {formatTime(Object.values(workflowData.workflow.time_by_step || {}).reduce((total, time) => total + (time || 0), 0))}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TaskOverflow;
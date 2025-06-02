
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  FileText,
  PlayCircle,
  MessageSquare,
  Timer, // For buttons and titles
  TrendingUp, // For progress bar
  Eye, // For show history button
  EyeOff, // For hide history button
  Brain, // For loading icon
  Network, // For "No Workflow" and section title
  Sparkles, // For total time summary
  CheckCircle2, // Used by module-level StepStatusIcon
  AlertCircle,  // Used by module-level StepStatusIcon
  Clock4,       // Used by module-level StepStatusIcon
  RotateCcw,    // For retry button
} from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WorkflowStepCard from '../components/WorkflowStepCard';
import SimpleWorkflowStepTimeCard from '../components/SimpleWorkflowStepTimeCard';

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

// Hook customizado para gerenciar workflow
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
      if (!taskId) return null; // Important for enabled: !!taskId
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
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // To update task list if workflow changes task status
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

// --- Main TaskOverflow Component ---
const TaskOverflow = ({ taskId, onWorkflowUpdate, permissions }) => {
  // ----- HOOKS (Must be at the top) -----
  const [showHistory, setShowHistory] = useState(false);
  const [showTimeEntries, setShowTimeEntries] = useState(false);

  const {
    workflowData, // This is the full object from API: { task, workflow: {name, steps}, current_step, history, approvals, time_by_step, is_completed }
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
    if (minutes === null || minutes === undefined) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
  }, []);

  const canAdvanceWorkflow = useMemo(() => {
    if (!workflowData?.current_step || !permissions || workflowData.is_completed) return false;
    // Check if current step exists within the workflow definition
    const currentStepDefinition = workflowData.workflow?.steps?.find(s => s.id === workflowData.current_step.id);
    if (!currentStepDefinition) return false;

    return (
      permissions.isOrgAdmin ||
      permissions.canEditAllTasks ||
      (permissions.canEditAssignedTasks && workflowData.task?.assigned_to === permissions.userId) ||
      (currentStepDefinition.assign_to === permissions.username) // 'assign_to' on step definition likely refers to a role or a dynamic assignment logic based on username.
    );
  }, [workflowData, permissions]);

  const canApproveStep = useMemo(() => {
    if (!workflowData?.current_step || !permissions || workflowData.is_completed) return false;
    const currentStepDefinition = workflowData.workflow?.steps?.find(s => s.id === workflowData.current_step.id);
    if (!currentStepDefinition?.requires_approval) return false;

    // Further logic might be needed if approval is role-based, e.g., checking currentStepDefinition.approver_role against user permissions.
    return permissions.isOrgAdmin || permissions.canApproveTasks;
  }, [workflowData, permissions]);

  const handleAdvanceWorkflow = useCallback((nextStepId, comment) => {
    // console.log('🚀 Advancing workflow to step:', nextStepId, 'with comment:', comment);
    advanceWorkflow({ nextStepId, comment });
    if (onWorkflowUpdate) onWorkflowUpdate();
  }, [advanceWorkflow, onWorkflowUpdate]);

  const handleApproveStep = useCallback((stepId, comment) => {
    // console.log('✅ Approving step:', stepId, 'with comment:', comment);
    approveStep({ stepId, comment });
    if (onWorkflowUpdate) onWorkflowUpdate();
  }, [approveStep, onWorkflowUpdate]);

  // ----- LOADING AND ERROR STATES (After all hooks) -----
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

  // Ensure workflowData and its critical nested `workflow` object are present
  if (!workflowData || !workflowData.workflow || !workflowData.workflow.steps) {
    console.log("⚠️ No workflow data or steps found, workflowData:", workflowData);
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

  // At this point, workflowData and workflowData.workflow.steps are available.
  // For clarity in JSX, we can use `workflowData` directly.
  // `workflowData.workflow` contains the definition (name, steps array)
  // `workflowData` (root) contains dynamic status (current_step, history, approvals, time_by_step, is_completed)

  const stepsDefinition = workflowData.workflow.steps || [];
  const totalSteps = stepsDefinition.length
  const progressCurrentOrder = workflowData.current_step?.order || (workflowData.is_completed ? stepsDefinition.length : 0);
  const progressTotalSteps = stepsDefinition.length || 0;


  let completedStepsCount = 0;
  let currentStepOrder = 0;

  if (workflowData.workflow.is_completed) {
    completedStepsCount = totalSteps;
    currentStepOrder = totalSteps;
  } else if (workflowData.current_step) {
    // Se há um passo atual, contar passos anteriores + o atual se estiver concluído
    currentStepOrder = workflowData.current_step.order;

    // Contar passos concluídos baseado no que está marcado como concluído
    completedStepsCount = stepsDefinition.filter(step => step.is_completed).length;

    // Se não há passos marcados como concluídos, usar a lógica de ordem
    if (completedStepsCount === 0 && currentStepOrder > 1) {
      // Se estamos no passo 2 ou superior, pelo menos o passo 1 deve estar concluído
      completedStepsCount = currentStepOrder - 1;
    }
  } else {
    // Não há passo atual, verificar se há passos concluídos
    completedStepsCount = stepsDefinition.filter(step => step.is_completed).length;
    currentStepOrder = completedStepsCount;
  }

  const progressPercentage = totalSteps > 0 ? (completedStepsCount / totalSteps) * 100 : 0;

  console.log('📊 Progress calculation (CORRECTED):', {
    totalSteps,
    completedStepsCount,
    currentStepOrder,
    progressPercentage,
    isWorkflowCompleted: workflowData.workflow.is_completed,
    currentStep: workflowData.current_step,
    stepsWithStatus: stepsDefinition.map(s => ({
      name: s.name,
      order: s.order,
      isCompleted: s.is_completed,
      isCurrent: s.is_current
    }))
  });

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
        style={{ ...glassStyle, padding: '2rem', marginBottom: '2rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '12px' }}>
              <Network size={28} style={{ color: 'rgb(147, 197, 253)' }} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.75rem', fontWeight: 'bold', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {workflowData.workflow.name}
              </h2>
              <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Passo Atual: {workflowData.workflow.is_completed ? 'Finalizado' : (workflowData.current_step?.name || 'Não iniciado')}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => setShowHistory(!showHistory)} style={{ ...glassStyle, padding: '0.75rem 1rem', border: '1px solid rgba(255, 255, 255, 0.2)', background: showHistory ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              {showHistory ? <EyeOff size={16} /> : <Eye size={16} />} Histórico
            </motion.button>
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => setShowTimeEntries(!showTimeEntries)} style={{ ...glassStyle, padding: '0.75rem 1rem', border: '1px solid rgba(255, 255, 255, 0.2)', background: showTimeEntries ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <Timer size={16} /> Tempos
            </motion.button>
          </div>
        </div>

        {/* Progresso Geral */}
        <div style={{ background: 'rgba(0, 0, 0, 0.2)', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} style={{ color: 'rgb(59, 130, 246)' }} />
              <span style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600' }}>
                Progresso do Workflow
              </span>
            </div>
            <span style={{ fontSize: '1.125rem', fontWeight: '700', color: 'white' }}>
              {completedStepsCount} de {totalSteps}
            </span>
          </div>
          <div style={{ width: '100%', height: '12px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, rgb(59, 130, 246), rgb(147, 51, 234))',
                borderRadius: '6px',
                position: 'relative'
              }}
            >
              {progressPercentage < 100 && progressPercentage > 0 && (
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
              )}
            </motion.div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            <span>Iniciado</span>
            <span>{Math.round(progressPercentage)}% concluído</span>
            <span>Finalizado</span>
          </div>
        </div>
      </motion.div>

      {/* Visualização dos Passos */}
      <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.35rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          <Network size={24} /> Passos do Workflow
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {stepsDefinition.map((stepInfo) => (
            <WorkflowStepCard
              key={stepInfo.id}
              step={stepInfo} // stepInfo is a step DEFINITION { id, name, order, requires_approval, etc. }
              workflowData={workflowData} // Full DYNAMIC workflow data for this task { current_step, history, approvals, time_by_step, workflow: {steps (definitions)} }
              timeSpent={workflowData.time_by_step?.[stepInfo.id] || 0}
              onAdvance={handleAdvanceWorkflow}
              onApprove={handleApproveStep}
              canAdvance={canAdvanceWorkflow}
              canApprove={canApproveStep}
              isAdvancing={isAdvancing}
              isApproving={isApproving}
              isWorkflowCompleted={workflowData.is_completed}
            />
          ))}
        </div>
      </motion.div>

      {/* História do Workflow */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} transition={{ duration: 0.35 }} style={{ ...glassStyle, padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white' }}>
              <FileText size={20} /> Histórico do Workflow
            </h3>
            {!workflowData.history || workflowData.history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255, 255, 255, 0.6)' }}>
                <MessageSquare size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>Nenhum histórico disponível.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {workflowData.history.map((entry, index) => (
                  <motion.div
                    key={entry.id || index} // Use entry.id if available, otherwise index as fallback
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{ ...glassStyle, padding: '1.25rem', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
                  >
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgb(59, 130, 246)', marginTop: '0.3rem', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: 'white' }}>
                        {entry.from_step && entry.to_step ? `${entry.from_step_name || entry.from_step} → ${entry.to_step_name || entry.to_step}` : entry.to_step_name || entry.from_step_name || entry.to_step || entry.from_step || 'Ação no Workflow'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '500' }}>{entry.changed_by_username || entry.changed_by}</span> • {formatDate(entry.created_at)}
                      </div>
                      {entry.comment && (
                        <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.85)', fontStyle: 'italic', background: 'rgba(0,0,0, 0.1)', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          "{entry.comment}"
                        </div>
                      )}
                    </div>
                    {entry.time_spent_minutes > 0 && (
                      <div style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', background: 'rgba(52, 211, 153, 0.15)', fontSize: '0.75rem', color: 'rgb(110, 231, 183)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0, alignSelf: 'center' }}>
                        <Timer size={12} /> {formatTime(entry.time_spent_minutes)}
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
          <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }} transition={{ duration: 0.35 }} style={{ ...glassStyle, padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'white' }}>
              <Timer size={20} /> Tempo por Passo
            </h3>
            {Object.keys(workflowData.time_by_step || {}).length === 0 && stepsDefinition.every(s => !(workflowData.time_by_step?.[s.id] > 0)) ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255, 255, 255, 0.6)' }}>
                <Timer size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>Nenhum tempo registrado para os passos deste workflow.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  {stepsDefinition.map((stepInfo) => {
                    const timeForStep = workflowData.time_by_step?.[stepInfo.id] || 0;
                    // Only render if time is logged or it's the current step to show it's active even with 0 time
                    if (timeForStep > 0 || workflowData.current_step?.id === stepInfo.id) {
                      return (<SimpleWorkflowStepTimeCard key={stepInfo.id} step={stepInfo} timeSpent={timeForStep} isCurrentStep={workflowData.current_step?.id === stepInfo.id} />);
                    }
                    return null;
                  })}
                </div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ ...glassStyle, padding: '1.5rem', marginTop: '2rem', background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.2)', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem', fontWeight: '600', color: 'white' }}>
                      <Sparkles size={20} style={{ color: 'rgb(147, 51, 234)' }} /> Tempo Total Registrado no Workflow:
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'rgb(147, 51, 234)' }}>
                      {formatTime(Object.values(workflowData.time_by_step || {}).reduce((total, time) => total + (time || 0), 0))}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty Floating Action Button container (can be removed if not used) */}
      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 200 }} style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }} />

      <style jsx>{`
        // Base styles from original file
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        textarea::placeholder { color: rgba(255, 255, 255, 0.5) !important; }
        
        // Custom scrollbar for applicable elements (like history)
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.25); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.4); }
        
        // General smooth transitions (can be too broad, apply specifically if needed)
        // * { transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease; }
        
        button { transition: transform 0.15s ease-out, background-color 0.2s ease, box-shadow 0.2s ease; }
        button:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        button:active { transform: translateY(0px) scale(0.98); }
        
        button:focus-visible, textarea:focus-visible, input:focus-visible, select:focus-visible {
          outline: 2px solid rgba(96, 165, 250, 0.7); // Brighter blue for focus
          outline-offset: 2px;
          box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.3); // Softer glow
        }
        
        // Glass morphism can be applied with a class if needed for more elements
        // .glass-effect { backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); }

        @media (max-width: 768px) {
          // Add mobile-specific styles if needed
          // .workflow-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
        }
        
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            animation-delay: 0ms !important;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default TaskOverflow;

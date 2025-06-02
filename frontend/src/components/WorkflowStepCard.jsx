// WorkflowStepCard.jsx (ou pode ser definido dentro de TaskOverflow.jsx)
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, // Para concluído
  PlayCircle,   // Para atual
  AlertCircle,  // Para aguarda aprovação
  Clock4,       // Para pendente
  User2,
  Timer,
  UserCheck,
  SkipForward,
  Send,
  Loader2,
  CheckCircle // Para botão de aprovar
} from 'lucide-react';
import { toast } from 'react-toastify'; // Se quiser usar toast para feedback

// Estilo glass (pode ser compartilhado ou definido aqui)
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(16px)', // Mais blur para o card principal
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
};

const itemVariants = { // Para animação de entrada/saída do formulário de ações
    hidden: { opacity: 0, height: 0, y: -10 },
    visible: { opacity: 1, height: 'auto', y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, height: 0, y: -10, transition: { duration: 0.2 } }
};

const stepCardVariants = { // Para animação do card em si
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 150, damping: 20 }
  },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: "0px 10px 20px rgba(0,0,0,0.2)", // Adiciona sombra no hover
    transition: { type: "spring", stiffness: 300, damping: 15 }
  }
};

const WorkflowStepCard = ({
  step,
  workflowData, // Objeto completo do workflow, incluindo workflow.steps, workflow.approvals
  timeSpent,    // Tempo gasto especificamente neste passo (pode vir de workflowData.time_by_step)
  onAdvance,    // Função para avançar: (nextStepId, comment) => {}
  onApprove,    // Função para aprovar: (stepId, comment) => {}
  canAdvance,   // Booleano: Se o usuário tem permissão geral para avançar
  canApprove,   // Booleano: Se o usuário tem permissão geral para aprovar
  isAdvancing,  // Booleano: Se a mutação de avançar está em progresso
  isApproving   // Booleano: Se a mutação de aprovar está em progresso
}) => {
  const [showActionsForm, setShowActionsForm] = useState(false);
  const [comment, setComment] = useState('');
  const [selectedNextStepId, setSelectedNextStepId] = useState('');

  // Status diretamente do backend
  const isActive = step.is_current;
  const isCompleted = step.is_completed;
  console.log('WorkflowStepCard Debug:', {
    stepName: step.name,
    stepId: step.id,
    isActive,
    isCompleted,
    workflowData: workflowData,
    approvals: workflowData?.approvals
  });
  
  const isApproved = useMemo(() => {
    if (!step.requires_approval) return true; // Não precisa de aprovação, então é "aprovado" para fins de avanço
    return workflowData?.approvals?.some(
      appr => appr.workflow_step_id === step.id && appr.approved
    ) || false;
  }, [step, workflowData?.approvals]);

  const formatTime = (minutes) => {
    if (minutes === null || minutes === undefined || minutes === 0) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStepColorClasses = () => {
    if (isCompleted) return {
      bg: 'rgba(52, 211, 153, 0.1)',
      border: 'rgba(52, 211, 153, 0.3)',
      text: 'rgb(52, 211, 153)',
      iconBg: 'rgba(52, 211, 153, 0.2)',
    };
    if (isActive) {
      if (step.requires_approval && !isApproved) return { // Aguardando Aprovação
        bg: 'rgba(251, 191, 36, 0.1)',
        border: 'rgba(251, 191, 36, 0.3)',
        text: 'rgb(251, 191, 36)',
        iconBg: 'rgba(251, 191, 36, 0.2)',
      };
      return { // Ativo e pronto ou aprovado
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.3)',
        text: 'rgb(59, 130, 246)',
        iconBg: 'rgba(59, 130, 246, 0.2)',
      };
    }
    return { // Pendente
      bg: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.15)',
      text: 'rgba(255, 255, 255, 0.4)',
      iconBg: 'rgba(255, 255, 255, 0.1)',
    };
  };
  const colors = getStepColorClasses();

  const StepStatusIconDisplay = () => {
    if (isCompleted) return <CheckCircle2 size={20} style={{ color: colors.text }} />;
    if (isActive) {
      if (step.requires_approval && !isApproved) return <AlertCircle size={20} style={{ color: colors.text }} />;
      return <PlayCircle size={20} style={{ color: colors.text }} />;
    }
    return <Clock4 size={20} style={{ color: colors.text }} />;
  };

  const StatusBadgeDisplay = () => {
    let textContent = 'Pendente';
    if (isCompleted) textContent = 'Concluído';
    else if (isActive) {
      textContent = (step.requires_approval && !isApproved) ? 'Aguarda Aprovação' : 'Em Andamento';
    }

    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        background: colors.bg, // Usa o bg do status para o badge
        border: `1px solid ${colors.border}`, // Usa a borda do status
        color: colors.text, // Usa o texto do status
        whiteSpace: 'nowrap'
      }}>
        {textContent}
      </span>
    );
  };

  const availableNextStepsForThisStep = useMemo(() => {
    if (!isActive || !step.next_steps || step.next_steps.length === 0) return [];
    return workflowData.steps.filter(s => step.next_steps.includes(s.id));
  }, [isActive, step.next_steps, workflowData.steps]);

  useEffect(() => {
    if (availableNextStepsForThisStep.length === 1) {
      setSelectedNextStepId(availableNextStepsForThisStep[0].id);
    } else {
      setSelectedNextStepId('');
    }
  }, [availableNextStepsForThisStep]);

  const handleAdvanceButtonClick = () => {
    // Se não há próximos passos ou apenas um, não precisa mostrar o formulário, apenas avança.
    if (availableNextStepsForThisStep.length <= 1) {
      const nextId = availableNextStepsForThisStep.length === 1 ? availableNextStepsForThisStep[0].id : null;
      onAdvance(nextId, comment || (availableNextStepsForThisStep.length === 0 ? "Workflow finalizado." : ""));
      setComment(''); // Limpa o comentário após o avanço
    } else {
      setShowActionsForm(!showActionsForm); // Mostra o formulário para escolher
    }
  };
  
  const handleConfirmAdvance = () => {
    if (availableNextStepsForThisStep.length > 1 && !selectedNextStepId) {
      toast.warn("Por favor, selecione o próximo passo.");
      return;
    }
    onAdvance(selectedNextStepId, comment);
    setShowActionsForm(false);
    setComment('');
  };

  return (
    <motion.div
      variants={stepCardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      style={{
        ...glassStyle,
        padding: '1.5rem',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        position: 'relative',
        overflow: 'hidden', // Para o indicador lateral
      }}
    >
      {/* Indicador de status lateral */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '5px',
        background: colors.text, // Cor principal do status
        borderTopLeftRadius: '15px',
        borderBottomLeftRadius: '15px',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: colors.iconBg,
            border: `2px solid ${colors.text}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600',
            color: colors.text,
            flexShrink: 0,
          }}>
            <StepStatusIconDisplay />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: '600', color: 'white' }}>
              {step.order}. {step.name}
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 1rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
              {step.assign_to_name && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <User2 size={14} /> {step.assign_to_name}
                </span>
              )}
              {timeSpent > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Timer size={14} /> {formatTime(timeSpent)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {step.requires_approval && (
            <div style={{
              padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600',
              background: isApproved ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)',
              border: `1px solid ${isApproved ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
              color: isApproved ? 'rgb(110, 231, 183)' : 'rgb(251, 191, 36)',
              display: 'flex', alignItems: 'center', gap: '0.25rem'
            }}>
              <UserCheck size={12} /> {isApproved ? 'Aprovado' : 'Requer Aprovação'}
            </div>
          )}
          <StatusBadgeDisplay />
        </div>
      </div>

      {step.description && (
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', paddingLeft: 'calc(40px + 1rem)' /* Alinhado com o texto do nome */ }}>
          {step.description}
        </p>
      )}

      {isActive && (
        <div style={{ paddingLeft: 'calc(40px + 1rem)', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: showActionsForm ? '1rem' : 0 }}>
            {step.requires_approval && !isApproved && canApprove && (
              <motion.button
                whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if(comment.trim() === "" && window.confirm("Deseja aprovar sem comentário?")){
                        onApprove(step.id, comment);
                    } else if (comment.trim() !== "") {
                        onApprove(step.id, comment);
                    } else if (comment.trim() === "" && !window.confirm("Deseja aprovar sem comentário?")) {
                        toast.info("Adicione um comentário ou confirme para aprovar sem.")
                    }
                }}
                disabled={isApproving}
                style={{ ...glassStyle, padding: '0.6rem 1.2rem', border: '1px solid rgba(52, 211, 153, 0.4)', background: 'rgba(52, 211, 153, 0.25)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', opacity: isApproving ? 0.7 : 1 }}
              >
                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Aprovar Passo
              </motion.button>
            )}
            {canAdvance && (!step.requires_approval || isApproved) && (
              <motion.button
                whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}
                onClick={handleAdvanceButtonClick}
                style={{ ...glassStyle, padding: '0.6rem 1.2rem', border: '1px solid rgba(59, 130, 246, 0.4)', background: 'rgba(59, 130, 246, 0.25)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
              >
                <SkipForward size={16} />
                {availableNextStepsForThisStep.length > 1 ? (showActionsForm ? 'Cancelar Avanço' : 'Avançar Workflow') : 'Avançar Workflow'}
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {showActionsForm && availableNextStepsForThisStep.length > 1 && (
              <motion.div
                variants={itemVariants} initial="hidden" animate="visible" exit="exit"
                style={{ ...glassStyle, padding: '1rem', marginTop: '1rem', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                    Próximo Passo *
                  </label>
                  <select
                    value={selectedNextStepId}
                    onChange={(e) => setSelectedNextStepId(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}
                  >
                    <option value="" style={{ background: '#1f2937', color: 'white' }}>Selecione o próximo passo</option>
                    {availableNextStepsForThisStep.map(nextS => (
                      <option key={nextS.id} value={nextS.id} style={{ background: '#1f2937', color: 'white' }}>
                        {nextS.order}. {nextS.name} {nextS.assign_to_name ? `(${nextS.assign_to_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                    Comentário (Opcional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Adicione observações sobre este avanço..."
                    rows={2}
                    style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => { setShowActionsForm(false); setComment(''); }}
                    style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={handleConfirmAdvance}
                    disabled={isAdvancing || !selectedNextStepId}
                    style={{ padding: '0.5rem 1rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', opacity: (isAdvancing || !selectedNextStepId) ? 0.7 : 1 }}
                  >
                    {isAdvancing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Confirmar Avanço
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
            {/* Campo de comentário para aprovação, se aplicável */}
            {isActive && step.requires_approval && !isApproved && canApprove && (
                 <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                        Comentário de Aprovação (Opcional)
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Adicione um comentário para a aprovação..."
                        rows={2}
                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', resize: 'vertical' }}
                    />
                 </div>
            )}
        </div>
      )}
    </motion.div>
  );
};

export default WorkflowStepCard;
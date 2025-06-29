import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle,
  Save,
  Trash2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Settings2 as SettingsIcon,
  HelpCircle,
  Users,
  XCircle,
  Network,
  MoveVertical,
  Link2,
  ShieldCheck,
  Loader2,
  GitBranch,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';
import { useQuery } from '@tanstack/react-query';

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '12px',
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

const CONNECTION_TYPES = {
  SEQUENTIAL: 'sequential',
  CONDITIONAL: 'conditional',
  PARALLEL: 'parallel',
  CUSTOM: 'custom'
};

const WorkflowAnalysis = ({ workflowId }) => {
  const { data: analysis, isLoading, isError } = useQuery({
      queryKey: ['workflowAnalysis', workflowId],
      queryFn: () => api.get(`/workflow-definitions/${workflowId}/analyze/`).then(res => res.data),
      enabled: !!workflowId,
  });

  if (isLoading) return <div><Loader2 className="animate-spin" /> Analisando...</div>;
  if (isError) return <div><AlertTriangle /> Erro ao carregar análise.</div>;

  return (
      <motion.div style={{ ...glassStyle, padding: '1.5rem', background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: 'white' }}>Otimizações Sugeridas</h3>
          {analysis && analysis.bottlenecks && analysis.bottlenecks.map(b => (
               <div key={b.step_id}>
                  <h4>Gargalo: {b.step_name}</h4>
                  <p>Tempo médio: {b.avg_time.toFixed(0)} min (Média geral: {b.overall_avg.toFixed(0)} min)</p>
               </div>
          ))}
          {analysis && analysis.suggestions && analysis.suggestions.map((s, i) => (
              <p key={i}>{s}</p>
          ))}
      </motion.div>
  );
}

const WorkflowDesigner = ({
  existingWorkflow = null,
  users = [],
  onSave,
  onCancel,
  isSaving = false
}) => {
  const navigate = useNavigate();

  const { data: fetchedUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (users && users.length > 0) return users;
      const response = await api.get('/profiles/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const effectiveUsers = users.length > 0 ? users : fetchedUsers;

  const [workflowData, setWorkflowData] = useState({
    name: '', 
    description: '', 
    is_active: true, 
    steps: []
  });

  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const [connectionType, setConnectionType] = useState(CONNECTION_TYPES.SEQUENTIAL);
  const [showConnectionPreview, setShowConnectionPreview] = useState(false);
  const [connectionErrors, setConnectionErrors] = useState([]);

  const [newStep, setNewStep] = useState({
    name: '', 
    description: '', 
    order: 0, 
    requires_approval: false,
    approver_role: '', 
    assign_to: ''
  });

  useEffect(() => {
    if (existingWorkflow) {
      const processedSteps = (existingWorkflow.steps || []).map(step => ({
        ...step,
        next_steps: Array.isArray(step.next_steps) ? step.next_steps : [],
        previous_steps: (step.previous_steps_info || []).map(ps => ps.id),
      }));

      setWorkflowData({
        name: existingWorkflow.name || '',
        description: existingWorkflow.description || '',
        is_active: existingWorkflow.is_active !== undefined ? existingWorkflow.is_active : true,
        steps: processedSteps
      });
    } else {
      setWorkflowData({ name: '', description: '', is_active: true, steps: [] });
      setNewStep({ name: '', description: '', order: 0, requires_approval: false, approver_role: '', assign_to: '' });
      setEditingStepIndex(null);
    }
  }, [existingWorkflow]);

  const handleWorkflowChange = (e) => {
    const { name, value, type, checked } = e.target;
    setWorkflowData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddStep = () => {
    if (!newStep.name.trim()) {
      toast.warn('O nome do passo é obrigatório.');
      return;
    }
    
    const stepToAdd = { 
      ...newStep, 
      order: workflowData.steps.length + 1, 
      id: `temp-${Date.now()}`,
      next_steps: [],
      previous_steps: []
    };
    
    setWorkflowData(prev => ({ ...prev, steps: [...prev.steps, stepToAdd] }));
    setNewStep({ 
      name: '', 
      description: '', 
      order: workflowData.steps.length + 2, 
      requires_approval: false, 
      approver_role: '', 
      assign_to: ''
    });
  };

  const handleStepChange = (index, field, value) => {
    const updatedSteps = [...workflowData.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setWorkflowData(prev => ({ ...prev, steps: updatedSteps }));
  };

  const handleRemoveStep = (indexToRemove) => {
    if (window.confirm('Tem certeza que deseja remover este passo?')) {
      const stepToRemove = workflowData.steps[indexToRemove];
      const updatedSteps = workflowData.steps
        .filter((_, i) => i !== indexToRemove)
        .map((step, i) => ({ ...step, order: i + 1 }));

      const deletedStepId = stepToRemove.id;
      const finalSteps = updatedSteps.map(step => ({
        ...step,
        next_steps: (step.next_steps || []).filter(id => id !== deletedStepId),
        previous_steps: (step.previous_steps || []).filter(id => id !== deletedStepId)
      }));

      setWorkflowData(prev => ({ ...prev, steps: finalSteps }));
      if (editingStepIndex === indexToRemove) setEditingStepIndex(null);
      else if (editingStepIndex > indexToRemove) setEditingStepIndex(editingStepIndex - 1);
    }
  };

  const moveStep = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= workflowData.steps.length) return;

    const updatedSteps = [...workflowData.steps];
    [updatedSteps[index], updatedSteps[newIndex]] = [updatedSteps[newIndex], updatedSteps[index]];
    const reorderedSteps = updatedSteps.map((step, i) => ({ ...step, order: i + 1 }));

    setWorkflowData(prev => ({ ...prev, steps: reorderedSteps }));

    if (editingStepIndex === index) setEditingStepIndex(newIndex);
    else if (editingStepIndex === newIndex) setEditingStepIndex(index);
  };

  const generateConnections = useCallback(() => {
    const steps = [...workflowData.steps];
    
    steps.forEach(step => {
      step.next_steps = [];
      step.previous_steps = [];
    });

    switch (connectionType) {
      case CONNECTION_TYPES.SEQUENTIAL:
        for (let i = 0; i < steps.length - 1; i++) {
          steps[i].next_steps = [steps[i + 1].id];
          steps[i + 1].previous_steps = [steps[i].id];
        }
        break;

      case CONNECTION_TYPES.CONDITIONAL:
        if (steps.length > 1) {
          const firstStep = steps[0];
          const lastStep = steps[steps.length - 1];
          
          firstStep.next_steps = steps.slice(1).map(s => s.id);
          
          for (let i = 1; i < steps.length - 1; i++) {
            steps[i].previous_steps = [firstStep.id];
            steps[i].next_steps = [lastStep.id];
            lastStep.previous_steps = steps.slice(1, -1).map(s => s.id);
          }
          
          if (steps.length > 2) {
            lastStep.previous_steps = steps.slice(1, -1).map(s => s.id);
          } else {
            lastStep.previous_steps = [firstStep.id];
          }
        }
        break;

      case CONNECTION_TYPES.PARALLEL:
        steps.forEach((step, index) => {
          const otherSteps = steps.filter((_, i) => i !== index);
          step.next_steps = otherSteps.map(s => s.id);
          step.previous_steps = otherSteps.map(s => s.id);
        });
        break;

      case CONNECTION_TYPES.CUSTOM:
        return workflowData.steps.map(s => ({ ...s })); // Return a copy to avoid direct state mutation if custom logic modifies it
    }

    return steps;
  }, [workflowData.steps, connectionType]);

  const previewConnections = () => {
    const connectedSteps = generateConnections();
    setWorkflowData(prev => ({ ...prev, steps: connectedSteps }));
    setShowConnectionPreview(true);
    validateConnections(connectedSteps);
  };

  const validateConnections = (steps) => {
    const errors = [];
    const orphanedSteps = steps.filter(step => 
      (step.next_steps || []).length === 0 && (step.previous_steps || []).length === 0
    );
    
    if (orphanedSteps.length > 0 && steps.length > 1) {
      errors.push(`Passos isolados encontrados: ${orphanedSteps.map(s => s.name).join(', ')}`);
    }

    const hasCircularRef = (stepId, visited = new Set(), path = []) => {
      if (visited.has(stepId)) {
        if (path.includes(stepId)) {
          return true;
        }
        return false;
      }
      
      visited.add(stepId);
      path.push(stepId);
      
      const step = steps.find(s => s.id === stepId);
      if (step) {
        for (let nextId of step.next_steps || []) {
          if (hasCircularRef(nextId, new Set(visited), [...path])) { // Pass copies of visited and path
            return true;
          }
        }
      }
      return false;
    };

    for (let step of steps) {
      if (hasCircularRef(step.id)) {
        errors.push(`Referência circular detectada envolvendo o passo: ${step.name}`);
        break;
      }
    }

    const allStepIds = steps.map(s => s.id);
    steps.forEach(step => {
      const invalidNext = (step.next_steps || []).filter(id => !allStepIds.includes(id));
      const invalidPrev = (step.previous_steps || []).filter(id => !allStepIds.includes(id));
      
      if (invalidNext.length > 0) {
        errors.push(`Passo "${step.name}" tem referências inválidas em next_steps: ${invalidNext.join(', ')}`);
      }
      if (invalidPrev.length > 0) {
        errors.push(`Passo "${step.name}" tem referências inválidas em previous_steps: ${invalidPrev.join(', ')}`);
      }
    });

    setConnectionErrors(errors);
    return errors.length === 0;
  };

  const handleSaveWorkflow = () => {
    if (!workflowData.name.trim()) {
      toast.error('O nome do workflow é obrigatório.');
      return;
    }
    if (workflowData.steps.length === 0) {
      toast.warn('O workflow precisa ter pelo menos um passo.');
      return;
    }

    const finalStepsWithConnections = generateConnections();
    
    if (!validateConnections(finalStepsWithConnections)) {
      toast.error('Existem erros nas conexões do workflow. Verifique os erros exibidos.');
      return;
    }
    
    const stepsForPayload = finalStepsWithConnections.map(step => {
      const { previous_steps, ...stepPayload } = step; 
      return stepPayload;
    });

    const workflowToSave = {
      ...workflowData,
      steps: stepsForPayload,
    };
    
    if (typeof onSave === 'function') {
        onSave(workflowToSave);
    } else {
        console.error("WorkflowDesigner: onSave prop is not a function! Received:", onSave, "Type:", typeof onSave);
        toast.error("Erro crítico: Ação de salvar não está disponível. Contacte o suporte.");
    }
  };

  const toggleEditStep = (index) => setEditingStepIndex(editingStepIndex === index ? null : index);
  const handleNewStepChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewStep(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const inputStyle = { 
    width: '100%', 
    padding: '0.75rem', 
    background: 'rgba(0,0,0,0.2)', 
    border: '1px solid rgba(255,255,255,0.2)', 
    borderRadius: '8px', 
    color: 'white', 
    fontSize: '0.875rem' 
  };
  
  const labelStyle = { 
    display: 'block', 
    fontSize: '0.875rem', 
    fontWeight: '500', 
    marginBottom: '0.5rem', 
    color: 'rgba(255,255,255,0.8)' 
  };
  
  const buttonStyle = (variant = 'primary') => ({
    padding: '0.75rem 1.5rem',
    border: `1px solid rgba(${variant === 'danger' ? '239,68,68' : variant === 'success' ? '52,211,153' : '59,130,246'},0.3)`,
    background: `rgba(${variant === 'danger' ? '239,68,68' : variant === 'success' ? '52,211,153' : '59,130,246'},0.2)`,
    borderRadius: '8px', 
    color: 'white', 
    fontSize: '0.875rem', 
    fontWeight: '500', 
    cursor: 'pointer',
    display: 'flex', 
    alignItems: 'center', 
    gap: '0.5rem'
  });

  const getConnectionDescription = (type) => {
    switch (type) {
      case CONNECTION_TYPES.SEQUENTIAL:
        return "Cada passo conecta ao próximo em sequência";
      case CONNECTION_TYPES.CONDITIONAL:
        return "Primeiro passo pode ir para qualquer outro, outros convergem no último";
      case CONNECTION_TYPES.PARALLEL:
        return "Todos os passos conectam entre si";
      case CONNECTION_TYPES.CUSTOM:
        return "Manter conexões existentes (modo manual)";
      default:
        return "";
    }
  };

  return (
    <motion.div style={{ ...glassStyle, padding: '2rem' }} variants={itemVariants}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.5rem', backgroundColor: 'rgba(147,51,234,0.2)', borderRadius: '12px' }}>
          <Network style={{ color: 'rgb(147,51,234)' }} size={24} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
            {existingWorkflow ? 'Editar Workflow' : 'Criar Novo Workflow'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>
            Defina os passos e o tipo de conexão do seu fluxo de trabalho.
          </p>
        </div>
      </div>

      <motion.div variants={itemVariants} style={{ ...glassStyle, background: 'rgba(255,255,255,0.03)', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <label htmlFor="workflowName" style={labelStyle}>Nome do Workflow *</label>
            <input 
              id="workflowName" 
              type="text" 
              name="name" 
              value={workflowData.name} 
              onChange={handleWorkflowChange} 
              style={inputStyle} 
              placeholder="Ex: Processo de Onboarding Cliente" 
              required 
            />
          </div>
          <div style={{ alignSelf: 'flex-end', paddingBottom: '0.2rem' }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0 }}>
              <input 
                type="checkbox" 
                id="is_active" 
                name="is_active" 
                checked={workflowData.is_active} 
                onChange={handleWorkflowChange} 
                style={{ width: '18px', height: '18px', accentColor: 'rgb(52,211,153)' }} 
              />
              Workflow Ativo
            </label>
          </div>
        </div>
        <div>
          <label htmlFor="workflowDescription" style={labelStyle}>Descrição</label>
          <textarea 
            id="workflowDescription" 
            name="description" 
            value={workflowData.description} 
            onChange={handleWorkflowChange} 
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} 
            placeholder="Descreva o propósito e âmbito deste workflow" 
          />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} style={{ ...glassStyle, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgb(139,194,255)' }}>
          <GitBranch size={20} />
          Tipo de Conexão dos Passos
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {Object.values(CONNECTION_TYPES).map(type => (
            <label 
              key={type}
              style={{ 
                ...labelStyle, 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '0.75rem', 
                cursor: 'pointer', 
                fontWeight: 'normal', 
                marginBottom: 0,
                padding: '1rem',
                background: connectionType === type ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                border: connectionType === type ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <input 
                type="radio" 
                name="connectionType"
                value={type}
                checked={connectionType === type}
                onChange={(e) => setConnectionType(e.target.value)}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  accentColor: 'rgb(59,130,246)',
                  marginTop: '0.125rem'
                }} 
              />
              <div>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                  {type === 'sequential' ? 'Sequencial' : 
                   type === 'conditional' ? 'Condicional' : 
                   type === 'parallel' ? 'Paralelo' : 'Personalizado'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                  {getConnectionDescription(type)}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <motion.button 
            type="button" 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={previewConnections}
            disabled={workflowData.steps.length < 2}
            style={{ 
              ...buttonStyle(), 
              background: 'rgba(251,191,36,0.2)', 
              borderColor: 'rgba(251,191,36,0.3)',
              color: 'rgb(251,191,36)',
              opacity: workflowData.steps.length < 2 ? 0.5 : 1
            }}
          >
            <Zap size={18} /> 
            Gerar Conexões
          </motion.button>
          
          {showConnectionPreview && (
            <motion.button 
              type="button" 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              onClick={() => setShowConnectionPreview(false)}
              style={{ 
                ...buttonStyle('secondary'), 
                background: 'rgba(255,255,255,0.1)', 
                borderColor: 'rgba(255,255,255,0.2)'
              }}
            >
              <RefreshCw size={18} /> 
              Ocultar Preview
            </motion.button>
          )}
        </div>

        {connectionErrors.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              background: 'rgba(239,68,68,0.1)', 
              border: '1px solid rgba(239,68,68,0.3)', 
              borderRadius: '8px' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertCircle size={18} style={{ color: 'rgb(239,68,68)' }} />
              <span style={{ fontWeight: '600', color: 'rgb(239,68,68)' }}>Erros de Conexão:</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'rgba(255,255,255,0.8)' }}>
              {connectionErrors.map((error, index) => (
                <li key={index} style={{ marginBottom: '0.25rem' }}>{error}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MoveVertical size={20} />
            Passos do Workflow ({workflowData.steps.length})
          </h3>
          
          {connectionErrors.length === 0 && showConnectionPreview && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgb(52,211,153)' }}>
              <CheckCircle2 size={16} />
              <span style={{ fontSize: '0.875rem' }}>Conexões válidas</span>
            </div>
          )}
        </div>
        
        {workflowData.steps.length === 0 ? (
          <div style={{ ...glassStyle, background: 'rgba(0,0,0,0.1)', padding: '2rem', textAlign: 'center', borderStyle: 'dashed' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>Nenhum passo definido.</p>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>Use o formulário abaixo para adicionar o primeiro passo.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {workflowData.steps.map((step, index) => (
              <motion.div key={step.id || index} style={{ ...glassStyle, background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }} variants={itemVariants}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ padding: '0.25rem 0.6rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '50%', fontSize: '0.75rem', fontWeight: '600' }}>
                      {index + 1}
                    </span>
                    <h4 style={{ margin: 0, fontWeight: '600', color: 'white' }}>{step.name}</h4>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {step.previous_steps && step.previous_steps.length > 0 && (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: 'rgb(147,51,234)', 
                          background: 'rgba(147,51,234,0.1)', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          ← {step.previous_steps.length} anterior{step.previous_steps.length !== 1 ? 'es' : ''}
                        </span>
                      )}
                      
                      {step.next_steps && step.next_steps.length > 0 && (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: 'rgb(52,211,153)', 
                          background: 'rgba(52,211,153,0.1)', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          → {step.next_steps.length} próximo{step.next_steps.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <motion.button 
                      type="button" 
                      whileHover={{ scale: 1.1 }} 
                      whileTap={{ scale: 0.9 }} 
                      onClick={() => moveStep(index, -1)} 
                      disabled={index === 0} 
                      style={{ 
                        ...buttonStyle('secondary'), 
                        padding: '0.5rem', 
                        background: index === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(147,51,234,0.2)', 
                        borderColor: index === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(147,51,234,0.3)' 
                      }} 
                      title="Mover para cima"
                    >
                      <ChevronUp size={16} />
                    </motion.button>
                    
                    <motion.button 
                      type="button" 
                      whileHover={{ scale: 1.1 }} 
                      whileTap={{ scale: 0.9 }} 
                      onClick={() => moveStep(index, 1)} 
                      disabled={index === workflowData.steps.length - 1} 
                      style={{ 
                        ...buttonStyle('secondary'), 
                        padding: '0.5rem', 
                        background: index === workflowData.steps.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(147,51,234,0.2)', 
                        borderColor: index === workflowData.steps.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(147,51,234,0.3)' 
                      }} 
                      title="Mover para baixo"
                    >
                      <ChevronDown size={16} />
                    </motion.button>
                    
                    <motion.button 
                      type="button" 
                      whileHover={{ scale: 1.1 }} 
                      whileTap={{ scale: 0.9 }} 
                      onClick={() => toggleEditStep(index)} 
                      style={{ ...buttonStyle(), padding: '0.5rem' }} 
                      title="Editar passo"
                    >
                      <SettingsIcon size={16} />
                    </motion.button>
                    
                    <motion.button 
                      type="button" 
                      whileHover={{ scale: 1.1 }} 
                      whileTap={{ scale: 0.9 }} 
                      onClick={() => handleRemoveStep(index)} 
                      style={{ ...buttonStyle('danger'), padding: '0.5rem' }} 
                      title="Remover passo"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </div>
                
                <AnimatePresence>
                  {editingStepIndex === index && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }} 
                      transition={{ duration: 0.3 }}
                    >
                      <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label style={labelStyle}>Nome do Passo</label>
                            <input 
                              type="text" 
                              value={step.name} 
                              onChange={(e) => handleStepChange(index, 'name', e.target.value)} 
                              style={inputStyle} 
                            />
                          </div>
                          <div>
                            <label style={labelStyle}>Atribuir a (Utilizador)</label>
                            <select 
                              value={step.assign_to || ''} 
                              onChange={(e) => handleStepChange(index, 'assign_to', e.target.value)} 
                              style={inputStyle}
                            >
                              <option value="">Ninguém (Geral)</option>
                              {effectiveUsers.map(user => (
                                <option key={user.id} value={user.id}>{user.username}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={labelStyle}>Descrição do Passo</label>
                          <textarea 
                            value={step.description || ''} 
                            onChange={(e) => handleStepChange(index, 'description', e.target.value)} 
                            style={{ ...inputStyle, minHeight: '60px' }} 
                          />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                          <label style={{ 
                            ...labelStyle, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            cursor: 'pointer', 
                            marginBottom: 0 
                          }}>
                            <input 
                              type="checkbox" 
                              checked={step.requires_approval || false} 
                              onChange={(e) => handleStepChange(index, 'requires_approval', e.target.checked)} 
                              style={{ width: '18px', height: '18px', accentColor: 'rgb(251,191,36)' }} 
                            />
                            Requer Aprovação <ShieldCheck size={16} style={{ color: 'rgb(251,191,36)' }} />
                          </label>
                          
                          {step.requires_approval && (
                            <div style={{ flexGrow: 1 }}>
                              <label style={labelStyle}>Papel do Aprovador</label>
                              <input 
                                type="text" 
                                value={step.approver_role || ''} 
                                onChange={(e) => handleStepChange(index, 'approver_role', e.target.value)} 
                                style={inputStyle} 
                                placeholder="Ex: Gestor de Conta" 
                              />
                            </div>
                          )}
                        </div>
                        
                        {showConnectionPreview && (
                          <div style={{ 
                            ...glassStyle, 
                            background: 'rgba(0,0,0,0.2)', 
                            padding: '1rem', 
                            marginTop: '1rem'
                          }}>
                            <label style={{ 
                              ...labelStyle, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem',
                              marginBottom: '0.75rem'
                            }}>
                              <Link2 size={16} />
                              Conexões Geradas ({connectionType})
                            </label>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div>
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  fontWeight: '600', 
                                  color: 'rgb(147,51,234)', 
                                  marginBottom: '0.5rem' 
                                }}>
                                  Passos Anteriores ({(step.previous_steps || []).length})
                                </div>
                                <div style={{ 
                                  minHeight: '60px', 
                                  padding: '0.5rem', 
                                  background: 'rgba(147,51,234,0.1)', 
                                  border: '1px solid rgba(147,51,234,0.2)', 
                                  borderRadius: '6px',
                                  fontSize: '0.75rem'
                                }}>
                                  {(step.previous_steps || []).length > 0 ? (
                                    (step.previous_steps || []).map(prevId => {
                                      const prevStep = workflowData.steps.find(s => s.id === prevId);
                                      return prevStep ? (
                                        <div key={prevId} style={{ 
                                          padding: '0.25rem 0.5rem', 
                                          margin: '0.25rem 0',
                                          background: 'rgba(147,51,234,0.2)', 
                                          borderRadius: '4px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.25rem'
                                        }}>
                                          ← {prevStep.name}
                                        </div>
                                      ) : null;
                                    })
                                  ) : (
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                                      Nenhum passo anterior
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  fontWeight: '600', 
                                  color: 'rgb(52,211,153)', 
                                  marginBottom: '0.5rem' 
                                }}>
                                  Próximos Passos ({(step.next_steps || []).length})
                                </div>
                                <div style={{ 
                                  minHeight: '60px', 
                                  padding: '0.5rem', 
                                  background: 'rgba(52,211,153,0.1)', 
                                  border: '1px solid rgba(52,211,153,0.2)', 
                                  borderRadius: '6px',
                                  fontSize: '0.75rem'
                                }}>
                                  {(step.next_steps || []).length > 0 ? (
                                    (step.next_steps || []).map(nextId => {
                                      const nextStep = workflowData.steps.find(s => s.id === nextId);
                                      return nextStep ? (
                                        <div key={nextId} style={{ 
                                          padding: '0.25rem 0.5rem', 
                                          margin: '0.25rem 0',
                                          background: 'rgba(52,211,153,0.2)', 
                                          borderRadius: '4px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.25rem'
                                        }}>
                                          → {nextStep.name}
                                        </div>
                                      ) : null;
                                    })
                                  ) : (
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                                      Nenhum próximo passo
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div 
        variants={itemVariants} 
        style={{ 
          ...glassStyle, 
          background: 'rgba(59,130,246,0.05)', 
          border: '1px solid rgba(59,130,246,0.2)', 
          padding: '1.5rem', 
          marginBottom: '2rem' 
        }}
      >
        <h3 style={{ 
          fontSize: '1.125rem', 
          fontWeight: '600', 
          marginBottom: '1rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          color: 'rgb(139,194,255)' 
        }}>
          <PlusCircle size={20} />
          Adicionar Novo Passo
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Nome do Passo *</label>
            <input 
              type="text" 
              name="name" 
              value={newStep.name} 
              onChange={handleNewStepChange} 
              style={inputStyle} 
              placeholder="Nome breve e descritivo" 
              required 
            />
          </div>
          <div>
            <label style={labelStyle}>Atribuir a (Utilizador)</label>
            <select name="assign_to" value={newStep.assign_to} onChange={handleNewStepChange} style={inputStyle}>
              <option value="">Ninguém (Geral)</option>
              {effectiveUsers.map(user => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Descrição do Passo</label>
          <textarea 
            name="description" 
            value={newStep.description} 
            onChange={handleNewStepChange} 
            style={{ ...inputStyle, minHeight: '60px' }} 
            placeholder="Instruções ou detalhes adicionais" 
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <label style={{ 
            ...labelStyle, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            cursor: 'pointer', 
            marginBottom: 0 
          }}>
            <input 
              type="checkbox" 
              name="requires_approval" 
              checked={newStep.requires_approval} 
              onChange={handleNewStepChange} 
              style={{ width: '18px', height: '18px', accentColor: 'rgb(251,191,36)' }} 
            />
            Requer Aprovação <ShieldCheck size={16} style={{ color: 'rgb(251,191,36)' }} />
          </label>
          
          {newStep.requires_approval && (
            <div style={{ flexGrow: 1 }}>
              <label style={labelStyle}>Papel do Aprovador</label>
              <input 
                type="text" 
                name="approver_role" 
                value={newStep.approver_role} 
                onChange={handleNewStepChange} 
                style={inputStyle} 
                placeholder="Ex: Gestor de Conta" 
              />
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <motion.button 
            type="button" 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }} 
            onClick={handleAddStep} 
            style={buttonStyle()}
          >
            <PlusCircle size={18} /> 
            Adicionar Passo à Lista
          </motion.button>
        </div>
      </motion.div>

      {workflowData.steps.length > 0 && (
        <motion.div variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '600', 
            marginBottom: '1rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem' 
          }}>
            <Network size={20} />
            Visualização do Fluxo
            {showConnectionPreview && (
              <span style={{ 
                fontSize: '0.75rem', 
                color: 'rgb(251,191,36)', 
                background: 'rgba(251,191,36,0.1)', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '12px' 
              }}>
                {connectionType === 'sequential' ? 'Sequencial' : 
                 connectionType === 'conditional' ? 'Condicional' : 
                 connectionType === 'parallel' ? 'Paralelo' : 'Personalizado'}
              </span>
            )}
          </h3>
          
          <div style={{ 
            ...glassStyle, 
            background: 'rgba(0,0,0,0.1)', 
            padding: '1.5rem', 
            overflowX: 'auto' 
          }}>
            {!showConnectionPreview ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem', 
                color: 'rgba(255,255,255,0.6)' 
              }}>
                <Network size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>Clique em "Gerar Conexões" para visualizar o fluxo com as conexões automáticas.</p>
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1rem',
                minWidth: 'max-content' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {workflowData.steps.map((step, index) => (
                    <React.Fragment key={`flow-view-${step.id || index}`}>
                      <div style={{ 
                        textAlign: 'center',
                        position: 'relative'
                      }}>
                        <div style={{
                          padding: '1rem 1.25rem', 
                          borderRadius: '12px',
                          border: `2px solid ${step.requires_approval ? 'rgba(251,191,36,0.5)' : 'rgba(59,130,246,0.5)'}`,
                          background: step.requires_approval ? 'rgba(251,191,36,0.15)' : 'rgba(59,130,246,0.15)',
                          minWidth: '160px', 
                          marginBottom: '0.5rem',
                          position: 'relative'
                        }}>
                          <div style={{ 
                            position: 'absolute',
                            top: '-8px',
                            left: '8px',
                            background: step.requires_approval ? 'rgb(251,191,36)' : 'rgb(59,130,246)',
                            color: 'white',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            {index + 1}
                          </div>
                          
                          <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                            {step.name}
                          </div>
                          
                          {step.assign_to && (
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.25rem' }}>
                              <Users size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                              {effectiveUsers.find(u => u.id === step.assign_to)?.username || 'Utilizador'}
                            </div>
                          )}
                          
                          {step.requires_approval && (
                            <div style={{ fontSize: '0.75rem', color: 'rgb(251,191,36)' }}>
                              <ShieldCheck size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                              Aprovação
                            </div>
                          )}
                          
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            marginTop: '0.5rem',
                            fontSize: '0.6rem'
                          }}>
                            <span style={{ color: 'rgb(147,51,234)' }}>
                              ← {(step.previous_steps || []).length}
                            </span>
                            <span style={{ color: 'rgb(52,211,153)' }}>
                              → {(step.next_steps || []).length}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {index < workflowData.steps.length - 1 && (
                        <div style={{ 
                          margin: '0 0.5rem', 
                          color: 'rgba(255,255,255,0.4)' 
                        }}>
                          <ArrowRight size={24} />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                
                {workflowData.steps.length > 1 && (
                  <div style={{ 
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px'
                  }}>
                    <h4 style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      marginBottom: '1rem',
                      color: 'rgba(255,255,255,0.8)'
                    }}>
                      Matriz de Conexões
                    </h4>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: `120px repeat(${workflowData.steps.length}, 1fr)`,
                      gap: '0.5rem',
                      alignItems: 'center'
                    }}>
                      <div></div>
                      {workflowData.steps.map((step, i) => (
                        <div key={`header-${i}`} style={{ 
                          fontSize: '0.75rem', 
                          textAlign: 'center',
                          color: 'rgba(255,255,255,0.7)',
                          fontWeight: '600'
                        }}>
                          {i + 1}
                        </div>
                      ))}
                      
                      {workflowData.steps.map((fromStep, fromIndex) => (
                        <React.Fragment key={`row-${fromIndex}`}>
                          <div style={{ 
                            fontSize: '0.75rem',
                            color: 'rgba(255,255,255,0.7)',
                            fontWeight: '600'
                          }}>
                            {fromIndex + 1}. {fromStep.name.length > 12 ? fromStep.name.substring(0, 12) + '...' : fromStep.name}
                          </div>
                          
                          {workflowData.steps.map((toStep, toIndex) => {
                            const isConnected = (fromStep.next_steps || []).includes(toStep.id);
                            const isSelf = fromIndex === toIndex;
                            
                            return (
                              <div key={`cell-${fromIndex}-${toIndex}`} style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '4px',
                                background: isSelf ? 'rgba(255,255,255,0.1)' : 
                                           isConnected ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.05)',
                                border: isSelf ? '1px solid rgba(255,255,255,0.2)' :
                                        isConnected ? '1px solid rgba(52,211,153,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                margin: '0 auto'
                              }}>
                                {isSelf ? '•' : isConnected ? '→' : ''}
                              </div>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {workflowData.steps.length > 0 && existingWorkflow && (
        <motion.div variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <WorkflowAnalysis workflowId={existingWorkflow.id} />
        </motion.div>
      )}

      <motion.div 
        variants={itemVariants} 
        style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}
      >
        <motion.button 
          type="button" 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }} 
          onClick={onCancel} 
          style={{ 
            ...buttonStyle('danger'), 
            background: 'rgba(255,255,255,0.1)', 
            borderColor: 'rgba(255,255,255,0.2)' 
          }}
        >
          <XCircle size={18} /> 
          Cancelar
        </motion.button>
        
        <motion.button 
          type="button" 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }} 
          onClick={handleSaveWorkflow} 
          style={buttonStyle('success')} 
          disabled={isSaving || connectionErrors.length > 0}
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {existingWorkflow ? 'Salvar Alterações' : 'Criar Workflow'}
        </motion.button>
      </motion.div>

      <motion.div 
        variants={itemVariants} 
        style={{ 
          ...glassStyle, 
          background: 'rgba(59,130,246,0.05)', 
          border: '1px solid rgba(59,130,246,0.2)', 
          padding: '1.5rem', 
          marginTop: '2.5rem' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <HelpCircle style={{ color: 'rgb(139,194,255)', flexShrink: 0, marginTop: '0.125rem' }} size={20} />
          <div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600' }}>
              Dicas para Workflows Eficazes:
            </h4>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '1.25rem', 
              fontSize: '0.875rem', 
              color: 'rgba(255,255,255,0.8)', 
              lineHeight: 1.6, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.25rem' 
            }}>
              <li>Mantenha os nomes dos passos curtos e claros.</li>
              <li>Use descrições para detalhar tarefas ou critérios.</li>
              <li>Defina quem é responsável por cada passo, se aplicável.</li>
              <li><strong>Sequencial:</strong> Para processos lineares passo-a-passo.</li>
              <li><strong>Condicional:</strong> Para fluxos com decisões e caminhos alternativos.</li>
              <li><strong>Paralelo:</strong> Para processos onde qualquer passo pode ser executado em qualquer ordem.</li>
              <li>Use aprovações para pontos de controle importantes.</li>
              <li>Teste o workflow simulando um processo real antes de o ativar.</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WorkflowDesigner;
import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Save,
  Trash2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Settings2 as SettingsIcon, // Renamed to avoid conflict
  HelpCircle,
  Users,
  XCircle, // For cancel
  Network, // For workflow icon
  MoveVertical,
  Link2,
  ShieldCheck // For approval
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // Kept if standalone usage is possible
import { toast } from 'react-toastify';
import api from '../api';
import { useQuery } from '@tanstack/react-query';

// Estilos glass (pode ser movido para um arquivo de utils se usado em muitos lugares)
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(10px)', // Slightly less blur for embedded components
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '12px', // Smaller radius for sub-components
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};


const WorkflowDesigner = ({ 
  existingWorkflow = null, 
  users = [], 
  onSave, 
  onCancel,
  isSaving = false // Prop to indicate saving state from parent
}) => {
  const navigate = useNavigate();
  
  const { data: fetchedUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (users && users.length > 0) return users; // Use prop if available
      const response = await api.get('/profiles/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 mins
  });
  
  const effectiveUsers = users.length > 0 ? users : fetchedUsers;
  
  const [workflowData, setWorkflowData] = useState({
    name: '', description: '', is_active: true, steps: []
  });
  
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  
  const [newStep, setNewStep] = useState({
    name: '', description: '', order: 0, requires_approval: false, 
    approver_role: '', assign_to: '', next_steps: []
  });

  useEffect(() => {
    if (existingWorkflow) {
      setWorkflowData({
        name: existingWorkflow.name || '',
        description: existingWorkflow.description || '',
        is_active: existingWorkflow.is_active !== undefined ? existingWorkflow.is_active : true,
        steps: (existingWorkflow.steps || []).map(step => ({
            ...step,
            next_steps: Array.isArray(step.next_steps) ? step.next_steps :
              (typeof step.next_steps === 'string' && step.next_steps.startsWith('[')) ? JSON.parse(step.next_steps) : []
        }))
      });
    } else {
      // Reset for new workflow creation
      setWorkflowData({ name: '', description: '', is_active: true, steps: [] });
      setNewStep({ name: '', description: '', order: 0, requires_approval: false, approver_role: '', assign_to: '', next_steps: [] });
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
    const stepToAdd = { ...newStep, order: workflowData.steps.length + 1, id: `temp-${Date.now()}` };
    setWorkflowData(prev => ({ ...prev, steps: [...prev.steps, stepToAdd] }));
    setNewStep({ name: '', description: '', order: workflowData.steps.length + 2, requires_approval: false, approver_role: '', assign_to: '', next_steps: [] });
  };

  const handleStepChange = (index, field, value) => {
    const updatedSteps = [...workflowData.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setWorkflowData(prev => ({ ...prev, steps: updatedSteps }));
  };

  const handleRemoveStep = (indexToRemove) => {
    if (window.confirm('Tem certeza que deseja remover este passo?')) {
      const updatedSteps = workflowData.steps.filter((_, i) => i !== indexToRemove)
        .map((step, i) => ({ ...step, order: i + 1 })); // Reorder
      
      // Update next_steps arrays for all steps to remove references to the deleted step
      const deletedStepId = workflowData.steps[indexToRemove].id;
      const finalSteps = updatedSteps.map(step => ({
          ...step,
          next_steps: (step.next_steps || []).filter(id => id !== deletedStepId)
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
    [updatedSteps[index], updatedSteps[newIndex]] = [updatedSteps[newIndex], updatedSteps[index]]; // Swap
    const reorderedSteps = updatedSteps.map((step, i) => ({ ...step, order: i + 1 })); // Reorder

    setWorkflowData(prev => ({ ...prev, steps: reorderedSteps }));

    if (editingStepIndex === index) setEditingStepIndex(newIndex);
    else if (editingStepIndex === newIndex) setEditingStepIndex(index);
  };

  const updateStepConnections = (stepIndex, nextStepIds) => {
    const updatedSteps = [...workflowData.steps];
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], next_steps: nextStepIds };
    setWorkflowData(prev => ({ ...prev, steps: updatedSteps }));
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
    onSave(workflowData);
  };

  const getPossibleNextSteps = (currentStepIndex) => {
    return workflowData.steps.filter((_, index) => index !== currentStepIndex); // Allow connections to any other step
  };

  const toggleEditStep = (index) => setEditingStepIndex(editingStepIndex === index ? null : index);
  const handleNewStepChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewStep(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const inputStyle = { width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' };
  const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' };
  const buttonStyle = (variant = 'primary') => ({
    padding: '0.75rem 1.5rem',
    border: `1px solid rgba(${variant === 'danger' ? '239,68,68' : variant === 'success' ? '52,211,153' : '59,130,246'},0.3)`,
    background: `rgba(${variant === 'danger' ? '239,68,68' : variant === 'success' ? '52,211,153' : '59,130,246'},0.2)`,
    borderRadius: '8px', color: 'white', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '0.5rem'
  });

  return (
    <motion.div style={{ ...glassStyle, padding: '2rem' }} variants={itemVariants}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '0.5rem', backgroundColor: 'rgba(147,51,234,0.2)', borderRadius: '12px' }}><Network style={{ color: 'rgb(147,51,234)' }} size={24} /></div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
            {existingWorkflow ? 'Editar Workflow' : 'Criar Novo Workflow'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>Defina os detalhes e passos do seu fluxo de trabalho.</p>
        </div>
      </div>
      
      {/* Detalhes básicos do workflow */}
      <motion.div variants={itemVariants} style={{ ...glassStyle, background: 'rgba(255,255,255,0.03)', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <label htmlFor="workflowName" style={labelStyle}>Nome do Workflow *</label>
            <input id="workflowName" type="text" name="name" value={workflowData.name} onChange={handleWorkflowChange} style={inputStyle} placeholder="Ex: Processo de Onboarding Cliente" required />
          </div>
          <div style={{alignSelf: 'flex-end', paddingBottom: '0.2rem'}}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: 0 }}>
              <input type="checkbox" id="is_active" name="is_active" checked={workflowData.is_active} onChange={handleWorkflowChange} style={{ width: '18px', height: '18px', accentColor: 'rgb(52,211,153)' }} />
              Workflow Ativo
            </label>
          </div>
        </div>
        <div>
          <label htmlFor="workflowDescription" style={labelStyle}>Descrição</label>
          <textarea id="workflowDescription" name="description" value={workflowData.description} onChange={handleWorkflowChange} style={{...inputStyle, minHeight: '80px', resize: 'vertical'}} placeholder="Descreva o propósito e âmbito deste workflow" />
        </div>
      </motion.div>
      
      {/* Lista de passos existentes */}
      <motion.div variants={itemVariants} style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MoveVertical size={20}/>Passos do Workflow</h3>
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
                    <span style={{ padding: '0.25rem 0.6rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '50%', fontSize: '0.75rem', fontWeight: '600' }}>{index + 1}</span>
                    <h4 style={{ margin: 0, fontWeight: '600', color: 'white' }}>{step.name}</h4>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <motion.button type="button" whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={() => moveStep(index, -1)} disabled={index === 0} style={{...buttonStyle('secondary'), padding: '0.5rem', background: index === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(147,51,234,0.2)', borderColor: index === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(147,51,234,0.3)'}} title="Mover para cima"><ChevronUp size={16}/></motion.button>
                    <motion.button type="button" whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={() => moveStep(index, 1)} disabled={index === workflowData.steps.length - 1} style={{...buttonStyle('secondary'), padding: '0.5rem', background: index === workflowData.steps.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(147,51,234,0.2)', borderColor: index === workflowData.steps.length - 1 ? 'rgba(255,255,255,0.1)' : 'rgba(147,51,234,0.3)'}} title="Mover para baixo"><ChevronDown size={16}/></motion.button>
                    <motion.button type="button" whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={() => toggleEditStep(index)} style={{...buttonStyle(), padding: '0.5rem'}} title="Editar passo"><SettingsIcon size={16}/></motion.button>
                    <motion.button type="button" whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={() => handleRemoveStep(index)} style={{...buttonStyle('danger'), padding: '0.5rem'}} title="Remover passo"><Trash2 size={16}/></motion.button>
                  </div>
                </div>
                <AnimatePresence>
                  {editingStepIndex === index && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                      <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label style={labelStyle}>Nome do Passo</label>
                            <input type="text" value={step.name} onChange={(e) => handleStepChange(index, 'name', e.target.value)} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Atribuir a (Utilizador)</label>
                            <select value={step.assign_to || ''} onChange={(e) => handleStepChange(index, 'assign_to', e.target.value)} style={inputStyle}>
                              <option value="">Ninguém (Geral)</option>
                              {effectiveUsers.map(user => <option key={user.id} value={user.id}>{user.username}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{marginBottom: '1rem'}}>
                          <label style={labelStyle}>Descrição do Passo</label>
                          <textarea value={step.description || ''} onChange={(e) => handleStepChange(index, 'description', e.target.value)} style={{...inputStyle, minHeight: '60px'}} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                           <label style={{...labelStyle, display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', marginBottom:0}}>
                              <input type="checkbox" checked={step.requires_approval || false} onChange={(e) => handleStepChange(index, 'requires_approval', e.target.checked)} style={{width:'18px', height:'18px', accentColor: 'rgb(251,191,36)'}} />
                              Requer Aprovação <ShieldCheck size={16} style={{color: 'rgb(251,191,36)'}}/>
                           </label>
                           {step.requires_approval && (
                              <div style={{flexGrow: 1}}>
                                 <label style={labelStyle}>Papel do Aprovador</label>
                                 <input type="text" value={step.approver_role || ''} onChange={(e) => handleStepChange(index, 'approver_role', e.target.value)} style={inputStyle} placeholder="Ex: Gestor de Conta"/>
                              </div>
                           )}
                        </div>
                        <div>
                          <label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Link2 size={16} />Próximos Passos Possíveis</label>
                          <div style={{...glassStyle, background: 'rgba(0,0,0,0.2)', padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                            {getPossibleNextSteps(index).length === 0 ? <p style={{fontSize:'0.875rem', color:'rgba(255,255,255,0.6)'}}>Não há outros passos para conectar.</p> :
                             getPossibleNextSteps(index).map(nextPossibleStep => (
                              <label key={nextPossibleStep.id} style={{...labelStyle, display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', fontWeight:'normal', marginBottom:0}}>
                                <input type="checkbox" checked={(step.next_steps || []).includes(nextPossibleStep.id)}
                                  onChange={(e) => {
                                    const currentNext = [...(step.next_steps || [])];
                                    if (e.target.checked) currentNext.push(nextPossibleStep.id);
                                    else currentNext.splice(currentNext.indexOf(nextPossibleStep.id), 1);
                                    updateStepConnections(index, currentNext);
                                  }} style={{width:'16px', height:'16px', accentColor: 'rgb(52,211,153)'}}/>
                                {nextPossibleStep.order}. {nextPossibleStep.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
      
      {/* Formulário para adicionar novo passo */}
      <motion.div variants={itemVariants} style={{ ...glassStyle, background: 'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.2)', padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color:'rgb(139,194,255)' }}><PlusCircle size={20}/>Adicionar Novo Passo</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Nome do Passo *</label>
            <input type="text" name="name" value={newStep.name} onChange={handleNewStepChange} style={inputStyle} placeholder="Nome breve e descritivo" required />
          </div>
          <div>
            <label style={labelStyle}>Atribuir a (Utilizador)</label>
            <select name="assign_to" value={newStep.assign_to} onChange={handleNewStepChange} style={inputStyle}>
              <option value="">Ninguém (Geral)</option>
              {effectiveUsers.map(user => <option key={user.id} value={user.id}>{user.username}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom: '1rem'}}>
          <label style={labelStyle}>Descrição do Passo</label>
          <textarea name="description" value={newStep.description} onChange={handleNewStepChange} style={{...inputStyle, minHeight: '60px'}} placeholder="Instruções ou detalhes adicionais"/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <label style={{...labelStyle, display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer', marginBottom:0}}>
              <input type="checkbox" name="requires_approval" checked={newStep.requires_approval} onChange={handleNewStepChange} style={{width:'18px', height:'18px', accentColor: 'rgb(251,191,36)'}} />
              Requer Aprovação <ShieldCheck size={16} style={{color: 'rgb(251,191,36)'}}/>
            </label>
            {newStep.requires_approval && (
              <div style={{flexGrow: 1}}>
                <label style={labelStyle}>Papel do Aprovador</label>
                <input type="text" name="approver_role" value={newStep.approver_role} onChange={handleNewStepChange} style={inputStyle} placeholder="Ex: Gestor de Conta"/>
              </div>
            )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <motion.button type="button" whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={handleAddStep} style={buttonStyle()}>
            <PlusCircle size={18} /> Adicionar Passo à Lista
          </motion.button>
        </div>
      </motion.div>
      
      {/* Visualização do fluxo */}
      {workflowData.steps.length > 0 && (
        <motion.div variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Network size={20}/>Visualização do Fluxo</h3>
          <div style={{ ...glassStyle, background: 'rgba(0,0,0,0.1)', padding: '1.5rem', overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 'max-content' }}>
              {workflowData.steps.map((step, index) => (
                <React.Fragment key={`flow-view-${step.id || index}`}>
                  <div style={{ textAlign: 'center', marginRight: (step.next_steps || []).length > 0 ? '1rem' : '0' }}>
                    <div style={{
                      padding: '0.75rem 1rem', borderRadius: '8px',
                      border: `1px solid ${step.requires_approval ? 'rgba(251,191,36,0.3)' : 'rgba(59,130,246,0.3)'}`,
                      background: step.requires_approval ? 'rgba(251,191,36,0.1)' : 'rgba(59,130,246,0.1)',
                      minWidth: '150px', marginBottom: '0.5rem'
                    }}>
                      <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{step.name}</div>
                      {step.assign_to && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
                          <Users size={12} style={{display:'inline', marginRight:'0.25rem'}}/>{effectiveUsers.find(u=>u.id === step.assign_to)?.username || 'Utilizador'}
                      </div>}
                      {step.requires_approval && <div style={{ fontSize: '0.75rem', color: 'rgb(251,191,36)', marginTop: '0.25rem' }}>
                          <ShieldCheck size={12} style={{display:'inline', marginRight:'0.25rem'}}/>Aprovação
                      </div>}
                    </div>
                    {/* Lines to next steps could be complex to draw here without a library. Keeping it simple. */}
                  </div>
                  {(step.next_steps || []).length > 0 && index < workflowData.steps.length - 1 && (
                     <div style={{ margin: '1rem 0.5rem 0 0.5rem', color: 'rgba(255,255,255,0.4)', alignSelf: 'center' }}>
                        <ArrowRight size={20} />
                     </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      
      <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
        <motion.button type="button" whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={onCancel} style={{...buttonStyle('danger'), background: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)'}}>
          <XCircle size={18}/> Cancelar
        </motion.button>
        <motion.button type="button" whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={handleSaveWorkflow} style={buttonStyle('success')} disabled={isSaving}>
          {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
          {existingWorkflow ? 'Salvar Alterações' : 'Criar Workflow'}
        </motion.button>
      </motion.div>
      
      <motion.div variants={itemVariants} style={{ ...glassStyle, background:'rgba(59,130,246,0.05)', border:'1px solid rgba(59,130,246,0.2)', padding: '1.5rem', marginTop: '2.5rem' }}>
        <div style={{display:'flex', alignItems:'flex-start', gap:'0.75rem'}}>
          <HelpCircle style={{color:'rgb(139,194,255)', flexShrink:0, marginTop:'0.125rem'}} size={20}/>
          <div>
            <h4 style={{margin:'0 0 0.5rem 0', fontSize:'0.875rem', fontWeight:'600'}}>Dicas para Workflows Eficazes:</h4>
            <ul style={{margin:0, paddingLeft:'1.25rem', fontSize:'0.875rem', color:'rgba(255,255,255,0.8)', lineHeight:1.6, display:'flex', flexDirection:'column', gap:'0.25rem'}}>
              <li>Mantenha os nomes dos passos curtos e claros.</li>
              <li>Use descrições para detalhar tarefas ou critérios.</li>
              <li>Defina quem é responsável por cada passo, se aplicável.</li>
              <li>Considere todos os caminhos possíveis, incluindo aprovações e rejeições.</li>
              <li>Teste o workflow simulando um processo real antes de o ativar.</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WorkflowDesigner;
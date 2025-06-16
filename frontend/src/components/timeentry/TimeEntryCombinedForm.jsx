// src/components/timeentry/TimeEntryCombinedForm.jsx
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Briefcase, Activity, CheckCircle, Workflow, SkipForward,
  Brain, Sparkles, Send, Loader2, Plus, X, Info, Zap, Calendar, UserCheck, Target, MessageSquare,Timer,Play, ChevronDown, User2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useTimeEntryStore } from '../../stores/useTimeEntryStore';
import api from '../../api';
import { usePermissions } from '../../contexts/PermissionsContext';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.875rem'
};

const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
    color: 'rgba(255, 255, 255, 0.8)'
};

const WorkflowStepCard = ({ step, isSelected, onClick, timeSpent = 0, formatMinutes }) => {
  const isActive = step.is_current;
  const isCompleted = step.is_completed;
  const getStepColor = () => {
    if (isCompleted) return 'rgb(52, 211, 153)';
    if (isActive) return 'rgb(59, 130, 246)';
    return 'rgba(255, 255, 255, 0.4)';
  };
  const stepColor = getStepColor();

  return (
    <motion.div
      onClick={onClick}
      style={{
        ...glassStyle, padding: '1rem', cursor: 'pointer',
        background: isActive ? 'rgba(59,130,246,0.15)' : isCompleted ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${isSelected ? 'rgb(147,51,234)' : stepColor + '40'}`, position: 'relative', overflow: 'hidden',
      }}
      whileHover={{ y: -2, scale: 1.02 }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: stepColor }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${stepColor}20`, border: `2px solid ${stepColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: stepColor, fontSize: '0.875rem' }}>
            {isCompleted ? <CheckCircle size={16} /> : isActive ? <Play size={16} /> : step.order}
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>{step.name}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
              {step.assign_to_name && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><UserCheck size={12} />{step.assign_to_name}</span>}
              {timeSpent > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Timer size={12} />{formatMinutes(timeSpent)}</span>}
            </div>
          </div>
        </div>
        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600', background: `${stepColor}20`, border: `1px solid ${stepColor}40`, color: stepColor }}>
          {isCompleted ? 'Concluído' : isActive ? 'Atual' : 'Pendente'}
        </span>
      </div>
      {step.description && <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4' }}>{step.description}</p>}
    </motion.div>
  );
};


const TimeEntryCombinedForm = ({
    clients, tasks, categories,
    onFormSubmit, isSubmitting,
}) => {
    const {
        showTimeEntryForm, toggleTimeEntryForm: closeStoreForm,
        isNaturalLanguageMode, setNaturalLanguageMode,
        manualFormData, setManualFormField,
        naturalLanguageInput, setNaturalLanguageInput,
    } = useTimeEntryStore();

    const permissions = usePermissions();
    const [workflowDataForForm, setWorkflowDataForForm] = useState(null);
    const [showWorkflowSteps, setShowWorkflowSteps] = useState(false);
    const [selectedWorkflowStepId, setSelectedWorkflowStepId] = useState("");

    const fetchWorkflowDataForTask = useCallback(async (taskId) => {
        if (!taskId) {
            setWorkflowDataForForm(null);
            setShowWorkflowSteps(false);
            setSelectedWorkflowStepId("");
            setManualFormField('workflow_step', "");
            return;
        }
        try {
            const response = await api.get(`/tasks/${taskId}/workflow_status/`);
            if (response.data.workflow) {
                setWorkflowDataForForm(response.data);
                setShowWorkflowSteps(true);
                if (response.data.current_step) {
                    setSelectedWorkflowStepId(response.data.current_step.id);
                    setManualFormField('workflow_step', response.data.current_step.id);
                } else {
                    setSelectedWorkflowStepId("");
                    setManualFormField('workflow_step', "");
                }
            } else {
                setWorkflowDataForForm(null);
                setShowWorkflowSteps(false);
            }
        } catch (error) {
            console.error("Error fetching workflow data for task:", error);
            setWorkflowDataForForm(null);
            setShowWorkflowSteps(false);
        }
    }, [setManualFormField]);

    useEffect(() => {
        if (manualFormData.task) {
            fetchWorkflowDataForTask(manualFormData.task);
        } else {
            setWorkflowDataForForm(null);
            setShowWorkflowSteps(false);
            setSelectedWorkflowStepId("");
        }
    }, [manualFormData.task, fetchWorkflowDataForTask]);
    
    const userWorkflowSteps = useMemo(() => {
        if (!workflowDataForForm || !workflowDataForForm.workflow || !workflowDataForForm.workflow.steps) {
            return [];
        }
        if (permissions.isOrgAdmin) {
            return workflowDataForForm.workflow.steps;
        }
        
        const assignments = workflowDataForForm.task.workflow_step_assignments || {};
        return workflowDataForForm.workflow.steps.filter(step => {
            const assignedUserId = assignments[step.id];
            return String(assignedUserId) === String(permissions.userId);
        });
    }, [workflowDataForForm, permissions.isOrgAdmin, permissions.userId]);

    const handleInputChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        setManualFormField(name, type === "checkbox" ? checked : value);
    }, [setManualFormField]);

    const handleTaskChange = useCallback((e) => {
        const taskId = e.target.value;
        const task = tasks.find(t => t.id === taskId);
        setManualFormField('task', taskId);
        if (task) {
            setManualFormField('client', task.client);
            if (task.category) setManualFormField('category', task.category);
        }
    }, [tasks, setManualFormField]);

    const handleWorkflowStepSelect = useCallback((stepId) => {
        setSelectedWorkflowStepId(stepId);
        setManualFormField('workflow_step', stepId);
        setManualFormField('workflow_step_completed', false);
        setManualFormField('advance_workflow', false);
    }, [setManualFormField]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onFormSubmit();
    };
    
    const formatMinutes = (minutes) => {
        if (minutes === null || minutes === undefined) return "N/A";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    if (!showTimeEntryForm) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} style={{ padding: '0.5rem', backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: '12px' }}>
                        <Clock style={{ color: 'rgb(59,130,246)' }} size={20} />
                    </motion.div>
                    <div>
                        <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: '600' }}>Registrar Tempo</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>
                            {isNaturalLanguageMode ? 'Descreva sua atividade com IA' : 'Preencha os campos manualmente'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>Manual</span>
                    <label className="switch">
                        <input type="checkbox" checked={isNaturalLanguageMode} onChange={() => setNaturalLanguageMode(!isNaturalLanguageMode)} />
                        <span className="slider round"></span>
                    </label>
                    <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>IA</span>
                    <Sparkles size={16} style={{ color: 'rgb(147,51,234)' }} />
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {isNaturalLanguageMode ? (
                    <div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Cliente (Opcional - IA tentará detectar)</label>
                            <select name="client" value={manualFormData.client} onChange={handleInputChange} style={{...inputStyle}}>
                                <option value="" style={{ background: '#1f2937' }}>Selecionar Cliente Padrão</option>
                                {clients.map(c => <option key={c.id} value={c.id} style={{ background: '#1f2937' }}>{c.name}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={labelStyle}>Descreva sua atividade *</label>
                            <textarea value={naturalLanguageInput} onChange={(e) => setNaturalLanguageInput(e.target.value)} placeholder="Ex: 2h declaração IVA cliente ABC, 30m reunião XYZ" rows={3} required style={{...inputStyle, resize: 'vertical'}} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <label style={labelStyle}>Data *</label>
                                <input type="date" name="date" value={manualFormData.date} onChange={handleInputChange} required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Status da Tarefa (Após)</label>
                                <select name="task_status_after" value={manualFormData.task_status_after} onChange={handleInputChange} style={inputStyle}>
                                    <option value="no_change" style={{ background: '#1f2937' }}>Sem alteração</option>
                                    <option value="in_progress" style={{ background: '#1f2937' }}>Marcar Em Progresso</option>
                                    <option value="completed" style={{ background: '#1f2937' }}>Marcar Concluída</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={labelStyle}><Briefcase size={14} style={{display:'inline', marginRight:'0.25rem'}}/> Cliente *</label>
                                <select name="client" value={manualFormData.client} onChange={handleInputChange} required style={inputStyle}>
                                    <option value="" style={{ background: '#1f2937' }}>Selecionar Cliente</option>
                                    {clients.map(c => <option key={c.id} value={c.id} style={{ background: '#1f2937' }}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}><Target size={14} style={{display:'inline', marginRight:'0.25rem'}}/> Tarefa (Opcional)</label>
                                <select name="task" value={manualFormData.task} onChange={handleTaskChange} style={inputStyle}>
                                    <option value="" style={{ background: '#1f2937' }}>Selecionar Tarefa</option>
                                    {tasks.filter(t => (!manualFormData.client || t.client === manualFormData.client) && t.status !== "completed").map(t => <option key={t.id} value={t.id} style={{ background: '#1f2937' }}>{t.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}><Activity size={14} style={{display:'inline', marginRight:'0.25rem'}}/> Categoria (Opcional)</label>
                                <select name="category" value={manualFormData.category} onChange={handleInputChange} style={inputStyle}>
                                    <option value="" style={{ background: '#1f2937' }}>Selecionar Categoria</option>
                                    {categories.map(cat => <option key={cat.id} value={cat.id} style={{ background: '#1f2937' }}>{cat.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}><Timer size={14} style={{display:'inline', marginRight:'0.25rem'}}/> Minutos Gastos *</label>
                                <input type="number" name="minutes_spent" value={manualFormData.minutes_spent} onChange={handleInputChange} required min="1" placeholder="0" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}><Calendar size={14} style={{display:'inline', marginRight:'0.25rem'}}/> Data *</label>
                                <input type="date" name="date" value={manualFormData.date} onChange={handleInputChange} required style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}><CheckCircle size={14} style={{display:'inline', marginRight:'0.25rem'}}/> Status da Tarefa (Após)</label>
                                <select name="task_status_after" value={manualFormData.task_status_after} onChange={handleInputChange} disabled={!manualFormData.task} style={{...inputStyle, opacity: !manualFormData.task ? 0.5 : 1}}>
                                    <option value="no_change" style={{ background: '#1f2937' }}>Sem alteração</option>
                                    <option value="in_progress" style={{ background: '#1f2937' }}>Marcar Em Progresso</option>
                                    <option value="completed" style={{ background: '#1f2937' }}>Marcar Concluída</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={labelStyle}><MessageSquare size={14} style={{display:'inline', marginRight:'0.25rem'}}/> Descrição *</label>
                            <textarea name="description" value={manualFormData.description} onChange={handleInputChange} rows={3} required placeholder="Descreva a atividade realizada..." style={{...inputStyle, resize: 'vertical'}} />
                        </div>
                        {manualFormData.task && workflowDataForForm && showWorkflowSteps && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...glassStyle, background: 'rgba(147,51,234,0.05)', border: '1px solid rgba(147,51,234,0.2)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
                                        <Workflow style={{color:'rgb(196,181,253)'}} size={20}/>
                                        <h4 style={{margin:0, fontSize:'0.875rem', fontWeight:'600'}}>Workflow: {workflowDataForForm.workflow.name}</h4>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                                    {userWorkflowSteps.length > 0 ? (
                                        userWorkflowSteps.map(step => (
                                            <WorkflowStepCard key={step.id} step={step} isSelected={selectedWorkflowStepId === step.id} onClick={() => handleWorkflowStepSelect(step.id)} timeSpent={workflowDataForForm.workflow.time_by_step?.[step.id]} formatMinutes={formatMinutes}/>
                                        ))
                                    ) : (
                                        <p style={{color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', gridColumn: '1 / -1'}}>Nenhum passo deste workflow está atribuído a si.</p>
                                    )}
                                </div>
                                {selectedWorkflowStepId && (
                                    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} style={{marginTop:'1rem', padding:'1rem', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'8px'}}>
                                        <div style={{display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'1rem'}}>
                                            <CheckCircle size={16} style={{color:'rgb(59,130,246)'}}/>
                                            <span style={{fontSize:'0.875rem', color:'rgb(59,130,246)', fontWeight:'500'}}>
                                                Passo selecionado: {workflowDataForForm.workflow.steps.find(s=>s.id===selectedWorkflowStepId)?.name}
                                            </span>
                                        </div>
                                        <div style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
                                            <label style={{display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer',fontSize:'0.875rem',padding:'0.5rem',borderRadius:'6px',background:manualFormData.workflow_step_completed ? 'rgba(52,211,153,0.1)':'rgba(255,255,255,0.05)'}}>
                                                <input type="checkbox" name="workflow_step_completed" checked={manualFormData.workflow_step_completed} onChange={handleInputChange} style={{width:'16px', height:'16px'}}/>
                                                <CheckCircle size={16} style={{color:manualFormData.workflow_step_completed ? 'rgb(52,211,153)':'rgba(255,255,255,0.5)'}}/>
                                                <span>Marcar passo como concluído</span>
                                            </label>
                                            <label style={{display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer',fontSize:'0.875rem',padding:'0.5rem',borderRadius:'6px',background:manualFormData.advance_workflow ? 'rgba(147,51,234,0.1)':'rgba(255,255,255,0.05)', opacity: manualFormData.workflow_step_completed ? 1:0.6}}>
                                                <input type="checkbox" name="advance_workflow" checked={manualFormData.advance_workflow} onChange={handleInputChange} disabled={!manualFormData.workflow_step_completed} style={{width:'16px', height:'16px'}}/>
                                                <SkipForward size={16} style={{color:manualFormData.advance_workflow && manualFormData.workflow_step_completed ? 'rgb(147,51,234)':'rgba(255,255,255,0.5)'}}/>
                                                <span>Avançar workflow para próximo passo</span>
                                            </label>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={closeStoreForm} style={{ padding: '0.75rem 1.5rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Cancelar</motion.button>
                    <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={isSubmitting} style={{ padding: '0.75rem 1.5rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSubmitting ? 0.7 : 1 }}>
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (isNaturalLanguageMode ? <Brain size={16} /> : <Send size={16} />)}
                        {isNaturalLanguageMode ? 'Processar com IA' : 'Guardar Registro'}
                    </motion.button>
                </div>
            </form>
        </motion.div>
    );
};

export default TimeEntryCombinedForm;
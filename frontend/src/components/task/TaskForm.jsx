// src/components/task/TaskForm.jsx
import React, { useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Brain, Loader2, Users, Save, X } from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../pages/TaskManagement';
import WorkflowConfigurationForm from './WorkflowConfigurationForm';
import UserAssignmentSelector from './UserAssignmentSelector';

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

const TaskForm = ({
    clients,
    users,
    categories,
    workflows,
    onMainSubmit,
    onNlpSubmit,
    isSaving,
    isNlpProcessing,
    fetchWorkflowStepsCallback
}) => {
    const {
        formData, setFormDataField,
        selectedTask, closeForm,
        showNaturalLanguageForm, toggleNaturalLanguageForm, naturalLanguageInput, setNaturalLanguageInput,
        selectedWorkflowForForm, setSelectedWorkflowForFormStore,
        setStepAssignmentForForm,
        showWorkflowConfigInForm, setShowWorkflowConfigInForm,
        initializeStepAssignmentsForForm,
        assignmentMode, setAssignmentModeStore,
        selectedCollaboratorsUi, addCollaboratorUi, removeCollaboratorUi,
        setAvailableUsersStore
    } = useTaskStore();

    // Memoize the users array to prevent unnecessary re-renders
    const memoizedUsers = useMemo(() => {
        return Array.isArray(users) ? users : [];
    }, [users]);

    // Popula a lista de utilizadores disponíveis na store assim que for recebida
    useEffect(() => {
        if (memoizedUsers.length > 0) {
            setAvailableUsersStore(memoizedUsers);
        }
    }, [memoizedUsers, setAvailableUsersStore]);

    // Early return with loading state if essential data is missing
    if (!memoizedUsers || !clients || !categories) {
        return (
            <div style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
                <Loader2 size={24} className="animate-spin" />
                <p>A carregar dados do formulário...</p>
            </div>
        );
    }

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === "number" ? (value ? parseInt(value, 10) : "") : value;
        setFormDataField(name, finalValue);

        // Handle workflow selection separately to avoid state updates during render
        if (name === 'workflow') {
            setSelectedWorkflowForFormStore(finalValue);
        }
    };

    // FIXED: Move workflow step loading to a separate effect with proper dependency handling
    useEffect(() => {
        let isMounted = true;

        const loadWorkflowSteps = async () => {
            if (!selectedWorkflowForForm || !fetchWorkflowStepsCallback) {
                // Clear workflow config when no workflow is selected
                if (isMounted) {
                    setShowWorkflowConfigInForm(false);
                    initializeStepAssignmentsForForm([], {});
                }
                return;
            }

            try {
                const steps = await fetchWorkflowStepsCallback(selectedWorkflowForForm);
                
                if (!isMounted) return; // Component unmounted during async operation

                if (steps && steps.length > 0) {
                    const existingAssignments = selectedTask?.workflow === selectedWorkflowForForm 
                                              ? (selectedTask.workflow_step_assignments || {}) 
                                              : {};
                    
                    initializeStepAssignmentsForForm(steps, existingAssignments);
                    setShowWorkflowConfigInForm(true);
                } else {
                    setShowWorkflowConfigInForm(false);
                    initializeStepAssignmentsForForm([], {});
                }
            } catch (error) {
                console.error('Error loading workflow steps:', error);
                if (isMounted) {
                    setShowWorkflowConfigInForm(false);
                    initializeStepAssignmentsForForm([], {});
                }
            }
        };

        // Use setTimeout to defer the state update and avoid render-time state changes
        const timeoutId = setTimeout(loadWorkflowSteps, 0);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [
        selectedWorkflowForForm, 
        selectedTask?.workflow, 
        selectedTask?.workflow_step_assignments,
        fetchWorkflowStepsCallback,
        initializeStepAssignmentsForForm,
        setShowWorkflowConfigInForm
    ]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSubmit = useTaskStore.getState().prepareFormDataForSubmission();
        onMainSubmit(dataToSubmit);
    };

    const handleNlpFormSubmit = (e) => {
        e.preventDefault();
        onNlpSubmit({ 
            natural_language_text: naturalLanguageInput,
            default_client_id: formData.client || null 
        });
    };

    const formFields = [
        { name: "title", label: "Título *", type: "text", required: true, placeholder: "Digite o título da tarefa" },
        { name: "client", label: "Cliente", type: "select", options: clients.map(c => ({ value: c.id, label: c.name })) },
        { name: "category", label: "Categoria", type: "select", options: categories.map(cat => ({ value: cat.id, label: cat.name })) },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })) },
        { name: "priority", label: "Prioridade", type: "select", options: PRIORITY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })) },
        { name: "deadline", label: "Prazo", type: "date" },
        { name: "estimated_time_minutes", label: "Tempo Estimado (minutos)", type: "number", placeholder: "Ex: 120", min: "0" },
    ];

    if (showNaturalLanguageForm) {
        return (
            <motion.div
                key="nlp-form"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><Brain size={20} /> Criar Tarefa com IA</h3>
                    <motion.button type="button" whileHover={{scale:1.1}} onClick={() => toggleNaturalLanguageForm()} style={{background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer'}}><X size={24}/></motion.button>
                </div>
                <form onSubmit={handleNlpFormSubmit}>
                    <textarea value={naturalLanguageInput} onChange={(e) => setNaturalLanguageInput(e.target.value)} placeholder="Ex: 2h declaração IVA cliente ABC, 30m reunião XYZ" rows={3} required style={{...inputStyle, resize: 'vertical', width:'100%', marginBottom:'1rem'}} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                         <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={isNlpProcessing} style={{...inputStyle, width:'auto', padding:'0.75rem 1.5rem', background:'rgba(147,51,234,0.2)', border:'1px solid rgba(147,51,234,0.3)', cursor:'pointer', display:'flex', alignItems:'center', gap:'0.5rem'}}>
                            {isNlpProcessing ? <Loader2 size={16} className="animate-spin"/> : <Brain size={16}/>} Processar
                        </motion.button>
                    </div>
                </form>
            </motion.div>
        );
    }
    
    return (
        <motion.div
            key="main-form"
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
                        <Plus style={{ color: 'rgb(147, 197, 253)' }} size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{selectedTask ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>{selectedTask ? 'Atualize os detalhes' : 'Preencha os campos'}</p>
                    </div>
                </div>
                <motion.button type="button" whileHover={{scale:1.1}} onClick={closeForm} style={{background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer'}}>
                    <X size={24}/>
                </motion.button>
            </div>
            
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {formFields.map(field => (
                        <div key={field.name}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>{field.label}</label>
                            {field.type === "select" ? (
                                <select name={field.name} value={formData[field.name] || ""} onChange={handleInputChange} style={inputStyle}>
                                    <option value="" style={{ background: '#1f2937' }}>Selecione</option>
                                    {field.options.map(opt => <option key={opt.value} value={opt.value} style={{ background: '#1f2937' }}>{opt.label}</option>)}
                                </select>
                            ) : (
                                <input type={field.type} name={field.name} value={formData[field.name] || ""} onChange={handleInputChange} required={field.required} placeholder={field.placeholder} min={field.min} style={inputStyle} />
                            )}
                        </div>
                    ))}
                </div>

                <UserAssignmentSelector
                    users={memoizedUsers}
                    primaryAssignee={formData.assigned_to}
                    collaborators={selectedCollaboratorsUi}
                    onPrimaryAssigneeChange={(userId) => setFormDataField('assigned_to', userId)}
                    onAddCollaborator={addCollaboratorUi}
                    onRemoveCollaborator={removeCollaboratorUi}
                    onModeChange={setAssignmentModeStore}
                />

                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>Workflow (Opcional)</label>
                    <select name="workflow" value={formData.workflow || ""} onChange={handleInputChange} style={inputStyle}>
                        <option value="" style={{ background: '#1f2937' }}>Nenhum Workflow</option>
                        {workflows.map(wf => <option key={wf.id} value={wf.id} style={{ background: '#1f2937' }}>{wf.name}</option>)}
                    </select>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>Descrição</label>
                    <textarea name="description" value={formData.description || ""} onChange={handleInputChange} placeholder="Descrição detalhada..." rows={4} style={{...inputStyle, resize: 'vertical', width: '100%'}} />
                </div>

                <AnimatePresence>
                    {showWorkflowConfigInForm && selectedWorkflowForForm && (
                        <WorkflowConfigurationForm
                            workflows={workflows}
                            users={memoizedUsers}
                            onStepAssignmentChange={setStepAssignmentForForm}
                        />
                    )}
                </AnimatePresence>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <motion.button type="button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={closeForm} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.2)', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Cancelar</motion.button>
                    <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={isSaving} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.2)', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.7 : 1 }}>
                        {isSaving && <Loader2 size={16} className="animate-spin" />}
                        <Save size={16} />
                        {selectedTask ? 'Atualizar' : 'Criar'} Tarefa
                    </motion.button>
                </div>
            </form>
        </motion.div>
    );
};

export default TaskForm;
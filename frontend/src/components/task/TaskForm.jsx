// src/components/task/TaskForm.jsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Brain, Loader2 } from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../pages/TaskManagement';
import WorkflowConfigurationForm from './WorkflowConfigurationForm';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const TaskForm = ({
    clients, users, categories, workflows, // Data props
    onMainSubmit, onNlpSubmit, // Submit handlers
    isSaving, isNlpProcessing, // Loading states
    fetchWorkflowStepsCallback // Callback to fetch steps
    // fetchTaskWorkflowAssignmentsCallback is removed
}) => {
    const {
        formData, setFormDataField,
        selectedTask, // This might have 'current_workflow_assignments'
        showForm, closeForm,
        showNaturalLanguageForm, naturalLanguageInput, setNaturalLanguageInput,
        selectedWorkflowForForm, setSelectedWorkflowForFormStore,
        setStepAssignmentForForm,
        showWorkflowConfigInForm, setShowWorkflowConfigInForm,
        initializeStepAssignmentsForForm,
        workflowStepsForForm
    } = useTaskStore();

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === "number" ? (value ? parseInt(value, 10) : "") : value;
        setFormDataField(name, finalValue);

        if (name === 'workflow') {
            setSelectedWorkflowForFormStore(finalValue); 
            if (finalValue) {
                // Fetch steps, then initialize assignments.
                // For a new task, existingAssignments will be empty.
                // For an edited task, selectedTask.current_workflow_assignments will be used if present.
                (async () => {
                    const steps = await fetchWorkflowStepsCallback(finalValue); // autoShowConfig is true by default
                    if (steps && steps.length > 0) {
                        const existingAssignments = selectedTask?.workflow === finalValue 
                                                  ? (selectedTask.current_workflow_assignments || {}) 
                                                  : {};
                        initializeStepAssignmentsForForm(steps, existingAssignments);
                        setShowWorkflowConfigInForm(true);
                    } else {
                        setShowWorkflowConfigInForm(false);
                    }
                })();
            } else {
                setShowWorkflowConfigInForm(false);
                 initializeStepAssignmentsForForm([], {}); // Clear assignments if workflow is removed
            }
        }
    };
    
    // Effect to load workflow steps and pre-fill assignments when editing a task
    useEffect(() => {
        if (showForm && selectedTask && selectedTask.workflow) {
            // This logic runs when the form opens for an existing task that has a workflow.
            // selectedWorkflowForForm is already set by openFormForEdit.
            (async () => {
                // Fetch steps for the task's current workflow
                const steps = await fetchWorkflowStepsCallback(selectedTask.workflow, false); // Don't auto-show yet
                if (steps && steps.length > 0) {
                    // Use 'current_workflow_assignments' from the task object itself if backend provides it
                    const assignments = selectedTask.current_workflow_assignments || {};
                    initializeStepAssignmentsForForm(steps, assignments);
                    setShowWorkflowConfigInForm(true); // Now show the config section
                } else {
                     setShowWorkflowConfigInForm(false); // No steps, or error fetching
                }
            })();
        } else if (showForm && !selectedTask && selectedWorkflowForForm) {
            // This is for a new task, if a workflow is selected via the dropdown
            // The handleInputChange for 'workflow' already handles this.
            // This block might be redundant or could be a fallback.
            // For safety, let's ensure steps are fetched if selectedWorkflowForForm is set on new form.
            (async () => {
                 const steps = await fetchWorkflowStepsCallback(selectedWorkflowForForm);
                 if (steps && steps.length > 0) {
                    initializeStepAssignmentsForForm(steps, {}); // New task, so empty existing assignments
                    setShowWorkflowConfigInForm(true);
                 } else {
                    setShowWorkflowConfigInForm(false);
                 }
            })();
        }


        // Cleanup: If form closes or no workflow is selected, hide config
        if (!showForm || !selectedWorkflowForForm) {
            setShowWorkflowConfigInForm(false);
        }

    }, [
        showForm, 
        selectedTask, // Rerun if the task being edited changes
        // selectedWorkflowForForm, // This is now handled by handleInputChange or initial load of selectedTask
        fetchWorkflowStepsCallback, 
        initializeStepAssignmentsForForm, 
        setShowWorkflowConfigInForm
        // No longer depends on selectedWorkflowForForm directly here,
        // as its change should trigger handleInputChange which handles step fetching.
        // Or if form opens with selectedTask, that also triggers fetching.
    ]);


    const handleSubmit = (e) => {
        e.preventDefault();
        onMainSubmit();
    };

    const handleNlpFormSubmit = (e) => {
        e.preventDefault();
        onNlpSubmit();
    };

    const formFields = [
        { name: "title", label: "Título *", type: "text", required: true, placeholder: "Digite o título da tarefa" },
        { name: "client", label: "Cliente", type: "select", options: clients.map(c => ({ value: c.id, label: c.name })) },
        { name: "category", label: "Categoria", type: "select", options: categories.map(cat => ({ value: cat.id, label: cat.name })) },
        { name: "assigned_to", label: "Responsável", type: "select", options: users.map(u => ({ value: u.user, label: u.username })) },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })) },
        { name: "priority", label: "Prioridade", type: "select", options: PRIORITY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })) },
        { name: "deadline", label: "Prazo", type: "date" },
        { name: "estimated_time_minutes", label: "Tempo Estimado (minutos)", type: "number", placeholder: "Ex: 120", min: "0" },
    ];

    if (!showForm && !showNaturalLanguageForm) return null;

    return (
        <AnimatePresence>
            {showNaturalLanguageForm && (
                <motion.div
                    key="nlp-form"
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <motion.div animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} style={{ padding: '0.5rem', backgroundColor: 'rgba(147, 51, 234, 0.2)', borderRadius: '12px' }}>
                            <Brain style={{ color: 'rgb(196, 181, 253)' }} size={20} />
                        </motion.div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Criar Tarefas com Linguagem Natural</h3>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>Descreva suas tarefas e deixe a IA organizá-las</p>
                        </div>
                    </div>
                    <form onSubmit={handleNlpFormSubmit}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>Descreva suas Tarefas</label>
                            <textarea value={naturalLanguageInput} onChange={(e) => setNaturalLanguageInput(e.target.value)} placeholder="Ex: Entregar IVA para Cliente XPTO até 2024-12-31..." rows={4} required style={{ width: '100%', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={closeForm} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.2)', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Cancelar</motion.button>
                            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={isNlpProcessing} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(147,51,234,0.3)', background: 'rgba(147,51,234,0.2)', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isNlpProcessing ? 0.7 : 1 }}>
                                {isNlpProcessing && <Loader2 size={16} className="animate-spin" />} Processar com IA
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            )}

            {showForm && (
                <motion.div
                    key="main-form"
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
                            <Plus style={{ color: 'rgb(147, 197, 253)' }} size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{selectedTask ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</h3>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>{selectedTask ? 'Atualize os detalhes' : 'Preencha os campos'}</p>
                        </div>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            {formFields.map(field => (
                                <div key={field.name}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>{field.label}</label>
                                    {field.type === "select" ? (
                                        <select name={field.name} value={formData[field.name] || ""} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                                            <option value="" style={{ background: '#1f2937', color: 'white' }}>Selecione</option>
                                            {field.options.map(opt => <option key={opt.value} value={opt.value} style={{ background: '#1f2937', color: 'white' }}>{opt.label}</option>)}
                                        </select>
                                    ) : (
                                        <input type={field.type} name={field.name} value={formData[field.name] || ""} onChange={handleInputChange} required={field.required} placeholder={field.placeholder} min={field.min} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>Workflow (Opcional)</label>
                            <select name="workflow" value={formData.workflow || ""} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                                <option value="" style={{ background: '#1f2937', color: 'white' }}>Selecionar Workflow</option>
                                {workflows.map(wf => <option key={wf.id} value={wf.id} style={{ background: '#1f2937', color: 'white' }}>{wf.name}</option>)}
                            </select>
                        </div>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>Descrição</label>
                            <textarea name="description" value={formData.description || ""} onChange={handleInputChange} placeholder="Descrição detalhada..." rows={4} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', resize: 'vertical' }} />
                        </div>

                        <AnimatePresence>
                            {showWorkflowConfigInForm && selectedWorkflowForForm && (
                                <WorkflowConfigurationForm
                                    workflows={workflows} 
                                    users={users} 
                                    onStepAssignmentChange={setStepAssignmentForForm}
                                />
                            )}
                        </AnimatePresence>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={closeForm} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.2)', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Cancelar</motion.button>
                            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={isSaving} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.2)', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.7 : 1 }}>
                                {isSaving && <Loader2 size={16} className="animate-spin" />}
                                {selectedTask ? 'Atualizar' : 'Criar'} Tarefa
                            </motion.button>
                        </div>
                    </form>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TaskForm;
// src/components/task/TaskForm.jsx
import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Brain, Loader2, Users, UserPlus, X, User, Check, AlertCircle, Search } from 'lucide-react'; // Added Search
import { useTaskStore } from '../../stores/useTaskStore';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../pages/TaskManagement';
import WorkflowConfigurationForm from './WorkflowConfigurationForm'; // Assuming this path is correct

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const TaskForm = ({
    clients, 
    // users prop is now primarily for displaying names, availableUsers in store is used for selection logic
    users: allUsersList, // Renamed to avoid conflict with store's users
    categories, workflows,
    onMainSubmit, onNlpSubmit,
    isSaving, isNlpProcessing,
    fetchWorkflowStepsCallback
}) => {
    const {
        formData, setFormDataField,
        selectedTask,
        showForm, closeForm,
        showNaturalLanguageForm, naturalLanguageInput, setNaturalLanguageInput,
        selectedWorkflowForForm, setSelectedWorkflowForFormStore,
        setStepAssignmentForForm,
        showWorkflowConfigInForm, setShowWorkflowConfigInForm,
        initializeStepAssignmentsForForm,
        // Assignment related state and actions from store
        assignmentMode, setAssignmentModeStore,
        selectedCollaboratorsUi, addCollaboratorUi, removeCollaboratorUi,
        availableUsers, setAvailableUsersStore, // Store action to set available users
    } = useTaskStore();

    const [userSearchTerm, setUserSearchTerm] = useState(''); // Local search for collaborator selection

    // Populate availableUsers in the store once when the component mounts or allUsersList changes
    useEffect(() => {
        if (allUsersList && allUsersList.length > 0) {
            setAvailableUsersStore(allUsersList);
        }
    }, [allUsersList, setAvailableUsersStore]);


    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        const finalValue = type === "number" ? (value ? parseInt(value, 10) : "") : value;
        setFormDataField(name, finalValue);

        if (name === 'workflow') {
            setSelectedWorkflowForFormStore(finalValue);
            if (finalValue) {
                (async () => {
                    const steps = await fetchWorkflowStepsCallback(finalValue);
                    if (steps && steps.length > 0) {
                        const existingAssignments = selectedTask?.workflow === finalValue 
                                                  ? (selectedTask.workflow_step_assignments || {}) 
                                                  : {};
                        initializeStepAssignmentsForForm(steps, existingAssignments);
                        setShowWorkflowConfigInForm(true);
                    } else {
                        setShowWorkflowConfigInForm(false);
                    }
                })();
            } else {
                setShowWorkflowConfigInForm(false);
                initializeStepAssignmentsForForm([], {});
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSubmit = useTaskStore.getState().prepareFormDataForSubmission();
        onMainSubmit(dataToSubmit);
    };

    const handleNlpFormSubmit = (e) => {
        e.preventDefault();
        // NLP submit logic might need to be adjusted based on how assignment is handled by NLP
        // For now, assuming it relies on formData.client for default context
        onNlpSubmit({ 
            natural_language_text: naturalLanguageInput,
            default_client_id: formData.client || null 
        });
    };
    
    // Filter users for collaborator selection dropdown
    const filteredAvailableUsersForSelection = useCallback(() => {
        if (!availableUsers) return [];
        
        // Exclude already selected collaborators
        const selectedCollaboratorIds = selectedCollaboratorsUi.map(c => c.id || c.user);
        
        let usersForSelection = availableUsers.filter(
            u => !selectedCollaboratorIds.includes(u.id || u.user)
        );

        if (userSearchTerm.trim()) {
            const term = userSearchTerm.toLowerCase();
            usersForSelection = usersForSelection.filter(user =>
                (user.username || '').toLowerCase().includes(term) ||
                (user.first_name || '').toLowerCase().includes(term) ||
                (user.last_name || '').toLowerCase().includes(term)
            );
        }
        return usersForSelection;
    }, [availableUsers, selectedCollaboratorsUi, userSearchTerm]);


    useEffect(() => {
        if (showForm && selectedTask && selectedTask.workflow) {
            (async () => {
                const steps = await fetchWorkflowStepsCallback(selectedTask.workflow, false); // Don't auto-show config yet
                if (steps && steps.length > 0) {
                    const assignments = selectedTask.workflow_step_assignments || {};
                    initializeStepAssignmentsForForm(steps, assignments);
                    if (Object.keys(assignments).length > 0 || steps.some(s=>s.assign_to)) { // Show if existing or default assignments
                        setShowWorkflowConfigInForm(true);
                    }
                } else {
                    setShowWorkflowConfigInForm(false);
                }
            })();
        } else if (showForm && !selectedTask && selectedWorkflowForForm) {
            // When creating new task and a workflow is selected
            (async () => {
                const steps = await fetchWorkflowStepsCallback(selectedWorkflowForForm);
                 if (steps && steps.length > 0) {
                    initializeStepAssignmentsForForm(steps, {}); // No existing assignments for new task
                    setShowWorkflowConfigInForm(true);
                 } else {
                    setShowWorkflowConfigInForm(false);
                 }
            })();
        } else if (!showForm || !selectedWorkflowForForm) {
             // When form is closed or no workflow selected, hide config
            setShowWorkflowConfigInForm(false);
        }
    // Dependencies: Listen to changes that should trigger workflow step fetching/config visibility
    }, [
        showForm, 
        selectedTask, // For editing
        selectedWorkflowForForm, // For new tasks or when workflow changes
        fetchWorkflowStepsCallback, 
        initializeStepAssignmentsForForm, 
        setShowWorkflowConfigInForm
    ]);


    const formFields = [
        { name: "title", label: "Título *", type: "text", required: true, placeholder: "Digite o título da tarefa" },
        { name: "client", label: "Cliente", type: "select", options: clients.map(c => ({ value: c.id, label: c.name })) },
        { name: "category", label: "Categoria", type: "select", options: categories.map(cat => ({ value: cat.id, label: cat.name })) },
        { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })) },
        { name: "priority", label: "Prioridade", type: "select", options: PRIORITY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })) },
        { name: "deadline", label: "Prazo", type: "date" },
        { name: "estimated_time_minutes", label: "Tempo Estimado (minutos)", type: "number", placeholder: "Ex: 120", min: "0" },
    ];

    if (!showForm && !showNaturalLanguageForm) return null;

    return (
        <AnimatePresence>
            {showForm && (
                <motion.div
                    key="main-form"
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
                >
                    {/* ... Form Header ... */}
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

                        {/* User Assignment Section */}
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Users size={16} /> Atribuir a
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                        onClick={() => setAssignmentModeStore('single')}
                                        style={{ ...glassStyle, padding: '0.5rem 0.75rem', fontSize: '0.75rem', background: assignmentMode === 'single' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)', border: assignmentMode === 'single' ? '1px solid rgba(59,130,246,0.6)' : '1px solid rgba(255,255,255,0.2)' }}
                                    >
                                        <User size={14} style={{ marginRight: '0.25rem', display: 'inline' }} /> Individual
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                        onClick={() => setAssignmentModeStore('multiple')}
                                        style={{ ...glassStyle, padding: '0.5rem 0.75rem', fontSize: '0.75rem', background: assignmentMode === 'multiple' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)', border: assignmentMode === 'multiple' ? '1px solid rgba(59,130,246,0.6)' : '1px solid rgba(255,255,255,0.2)' }}
                                    >
                                        <Users size={14} style={{ marginRight: '0.25rem', display: 'inline' }} /> Múltiplos
                                    </motion.button>
                                </div>
                            </div>

                            {assignmentMode === 'single' && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>Responsável</label>
                                    <select name="assigned_to" value={formData.assigned_to || ""} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                                        <option value="" style={{ background: '#1f2937', color: 'white' }}>Ninguém selecionado</option>
                                        {availableUsers.map(u => (
                                            <option key={u.user || u.id} value={u.user || u.id} style={{ background: '#1f2937', color: 'white' }}>
                                                {u.username}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {assignmentMode === 'multiple' && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'rgba(255,255,255,0.8)' }}>Colaboradores ({selectedCollaboratorsUi.length})</label>
                                    </div>
                                    {/* Selected Collaborators */}
                                    {selectedCollaboratorsUi.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                            {selectedCollaboratorsUi.map(collab => (
                                                <motion.div
                                                    key={collab.id || collab.user}
                                                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', fontSize: '0.8rem' }}
                                                >
                                                    <User size={12} /> {collab.username}
                                                    <motion.button type="button" onClick={() => removeCollaboratorUi(collab.id || collab.user)} whileHover={{ scale: 1.2, color: 'rgb(239,68,68)' }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '0.1rem' }}><X size={12} /></motion.button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                    {/* User Selector Dropdown */}
                                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}/>
                                        <input
                                            type="text"
                                            placeholder="Pesquisar e adicionar colaborador..."
                                            value={userSearchTerm}
                                            onChange={(e) => setUserSearchTerm(e.target.value)}
                                            style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white', fontSize: '0.8rem' }}
                                        />
                                        {userSearchTerm && filteredAvailableUsersForSelection().length > 0 && (
                                            <motion.div initial={{opacity:0, y:5}} animate={{opacity:1, y:0}} style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'rgba(30,40,55,0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0 0 8px 8px', maxHeight: '150px', overflowY: 'auto', zIndex: 10, marginTop: '0.25rem' }}>
                                                {filteredAvailableUsersForSelection().map(user => (
                                                    <div key={user.user || user.id} onClick={() => { addCollaboratorUi(user); setUserSearchTerm(''); }} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="hover:bg-blue-700/30">
                                                        <span>{user.username} ({user.first_name || 'Utilizador'})</span>
                                                        <UserPlus size={14}/>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </div>
                                     {userSearchTerm && filteredAvailableUsersForSelection().length === 0 && (
                                        <p style={{fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', textAlign:'center', padding: '0.5rem'}}>Nenhum utilizador encontrado ou já adicionado.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Workflow and Description */}
                         <div style={{ marginBottom: '1.5rem' }}>
                             <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>Workflow (Opcional)</label>
                            <select name="workflow" value={formData.workflow || ""} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                                <option value="" style={{ background: '#1f2937', color: 'white' }}>Nenhum Workflow</option>
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
                                    users={allUsersList} // Pass the full list of users for dropdowns inside
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
// src/components/task/TaskForm.jsx - Enhanced with complete multi-user assignment
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Brain, Loader2, Users, UserPlus, X, User, Check, AlertCircle } from 'lucide-react';
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
    clients, users, categories, workflows,
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
        workflowStepsForForm,
        stepAssignmentsForForm
    } = useTaskStore();

    // Enhanced state for multi-user assignment
    const [selectedCollaborators, setSelectedCollaborators] = useState([]);
    const [showUserSelector, setShowUserSelector] = useState(false);
    const [assignmentMode, setAssignmentMode] = useState('single'); // 'single' or 'multiple'
    const [searchTerm, setSearchTerm] = useState('');

    // Initialize collaborators when editing a task
    useEffect(() => {
        if (selectedTask) {
            if (selectedTask.collaborators_info && selectedTask.collaborators_info.length > 0) {
                setSelectedCollaborators(selectedTask.collaborators_info);
                setAssignmentMode('multiple');
            } else {
                setSelectedCollaborators([]);
                setAssignmentMode('single');
            }
        } else {
            setSelectedCollaborators([]);
            setAssignmentMode('single');
        }
    }, [selectedTask]);

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

    const handleAssignmentModeChange = (mode) => {
        setAssignmentMode(mode);
        if (mode === 'single') {
            setSelectedCollaborators([]);
        }
    };

    const handleAddCollaborator = (userId) => {
        const user = users.find(u => u.user === userId);
        if (user && !selectedCollaborators.find(c => c.id === userId)) {
            const collaboratorData = {
                id: userId,
                username: user.username,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || ''
            };
            setSelectedCollaborators([...selectedCollaborators, collaboratorData]);
            setSearchTerm('');
        }
    };

    const handleRemoveCollaborator = (userId) => {
        setSelectedCollaborators(selectedCollaborators.filter(c => c.id !== userId));
    };

    const getAvailableUsers = () => {
        const assignedUserId = formData.assigned_to;
        const collaboratorIds = selectedCollaborators.map(c => c.id);
        
        let availableUsers = users.filter(user => 
            user.user !== assignedUserId && 
            !collaboratorIds.includes(user.user)
        );

        // Filter by search term if provided
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            availableUsers = availableUsers.filter(user =>
                user.username.toLowerCase().includes(term) ||
                (user.first_name && user.first_name.toLowerCase().includes(term)) ||
                (user.last_name && user.last_name.toLowerCase().includes(term)) ||
                (user.email && user.email.toLowerCase().includes(term))
            );
        }

        return availableUsers;
    };

    const getUsersAssignedToWorkflowSteps = () => {
        if (!stepAssignmentsForForm || Object.keys(stepAssignmentsForForm).length === 0) {
            return [];
        }

        const assignedUserIds = Object.values(stepAssignmentsForForm).filter(Boolean);
        return users.filter(user => assignedUserIds.includes(user.user));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Include collaborators in form data
        const enhancedFormData = {
            ...formData,
            collaborators: assignmentMode === 'multiple' ? selectedCollaborators.map(c => c.id) : []
        };
        
        onMainSubmit(enhancedFormData);
    };

    const handleNlpFormSubmit = (e) => {
        e.preventDefault();
        onNlpSubmit();
    };

    useEffect(() => {
        if (showForm && selectedTask && selectedTask.workflow) {
            (async () => {
                const steps = await fetchWorkflowStepsCallback(selectedTask.workflow, false);
                if (steps && steps.length > 0) {
                    const assignments = selectedTask.workflow_step_assignments || {};
                    initializeStepAssignmentsForForm(steps, assignments);
                    setShowWorkflowConfigInForm(true);
                } else {
                    setShowWorkflowConfigInForm(false);
                }
            })();
        } else if (showForm && !selectedTask && selectedWorkflowForForm) {
            (async () => {
                const steps = await fetchWorkflowStepsCallback(selectedWorkflowForForm);
                if (steps && steps.length > 0) {
                    initializeStepAssignmentsForForm(steps, {});
                    setShowWorkflowConfigInForm(true);
                } else {
                    setShowWorkflowConfigInForm(false);
                }
            })();
        }

        if (!showForm || !selectedWorkflowForForm) {
            setShowWorkflowConfigInForm(false);
        }
    }, [
        showForm, 
        selectedTask, 
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

                        {/* Enhanced User Assignment Section */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                marginBottom: '1rem',
                                padding: '1rem',
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: '8px'
                            }}>
                                <div>
                                    <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={16} />
                                        Atribuição de Utilizadores
                                    </label>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', margin: '0.25rem 0 0 0' }}>
                                        Escolha como atribuir esta tarefa aos membros da equipa
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleAssignmentModeChange('single')}
                                        style={{
                                            ...glassStyle,
                                            padding: '0.5rem 0.75rem',
                                            border: assignmentMode === 'single' 
                                                ? '1px solid rgba(59, 130, 246, 0.6)' 
                                                : '1px solid rgba(255, 255, 255, 0.2)',
                                            background: assignmentMode === 'single' 
                                                ? 'rgba(59, 130, 246, 0.3)' 
                                                : 'rgba(255, 255, 255, 0.1)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            fontWeight: assignmentMode === 'single' ? '600' : '400'
                                        }}
                                    >
                                        <User size={14} />
                                        Individual
                                        {assignmentMode === 'single' && <Check size={12} />}
                                    </motion.button>
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleAssignmentModeChange('multiple')}
                                        style={{
                                            ...glassStyle,
                                            padding: '0.5rem 0.75rem',
                                            border: assignmentMode === 'multiple' 
                                                ? '1px solid rgba(59, 130, 246, 0.6)' 
                                                : '1px solid rgba(255, 255, 255, 0.2)',
                                            background: assignmentMode === 'multiple' 
                                                ? 'rgba(59, 130, 246, 0.3)' 
                                                : 'rgba(255, 255, 255, 0.1)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            fontWeight: assignmentMode === 'multiple' ? '600' : '400'
                                        }}
                                    >
                                        <Users size={14} />
                                        Múltiplos
                                        {assignmentMode === 'multiple' && <Check size={12} />}
                                    </motion.button>
                                </div>
                            </div>

                            {/* Primary Assignee */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ 
                                    display: 'block', 
                                    fontSize: '0.875rem', 
                                    fontWeight: '500', 
                                    marginBottom: '0.5rem', 
                                    color: 'rgba(255, 255, 255, 0.8)' 
                                }}>
                                    {assignmentMode === 'multiple' ? 'Responsável Principal' : 'Responsável'}
                                    {assignmentMode === 'multiple' && (
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)', marginLeft: '0.5rem' }}>
                                            (O utilizador principal responsável pela tarefa)
                                        </span>
                                    )}
                                </label>
                                <select 
                                    name="assigned_to" 
                                    value={formData.assigned_to || ""} 
                                    onChange={handleInputChange} 
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
                                    <option value="" style={{ background: '#1f2937', color: 'white' }}>Selecionar Responsável</option>
                                    {users.map(u => (
                                        <option key={u.user} value={u.user} style={{ background: '#1f2937', color: 'white' }}>
                                            {u.username} {u.first_name && `(${u.first_name})`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Collaborators Section (only show in multiple mode) */}
                            {assignmentMode === 'multiple' && (
                                <div>
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between', 
                                        marginBottom: '0.75rem' 
                                    }}>
                                        <div>
                                            <label style={{ 
                                                fontSize: '0.875rem', 
                                                fontWeight: '500', 
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <Users size={16} />
                                                Colaboradores ({selectedCollaborators.length})
                                            </label>
                                            <p style={{ 
                                                fontSize: '0.75rem', 
                                                color: 'rgba(255, 255, 255, 0.6)', 
                                                margin: '0.25rem 0 0 0' 
                                            }}>
                                                Utilizadores que podem trabalhar nesta tarefa junto com o responsável principal
                                            </p>
                                        </div>
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setShowUserSelector(!showUserSelector)}
                                            style={{
                                                ...glassStyle,
                                                padding: '0.5rem 0.75rem',
                                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                                background: 'rgba(52, 211, 153, 0.2)',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                fontWeight: '500'
                                            }}
                                        >
                                            <UserPlus size={14} />
                                            {showUserSelector ? 'Fechar' : 'Adicionar'}
                                        </motion.button>
                                    </div>

                                    {/* Selected Collaborators */}
                                    {selectedCollaborators.length > 0 && (
                                        <div style={{ 
                                            marginBottom: '1rem',
                                            padding: '0.75rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                            <div style={{ 
                                                fontSize: '0.75rem', 
                                                color: 'rgba(255, 255, 255, 0.7)', 
                                                marginBottom: '0.5rem',
                                                fontWeight: '500'
                                            }}>
                                                Colaboradores Selecionados:
                                            </div>
                                            <div style={{ 
                                                display: 'flex', 
                                                flexWrap: 'wrap', 
                                                gap: '0.5rem'
                                            }}>
                                                {selectedCollaborators.map(collaborator => (
                                                    <motion.div
                                                        key={collaborator.id}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.8 }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            padding: '0.5rem 0.75rem',
                                                            background: 'rgba(59, 130, 246, 0.2)',
                                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                                            borderRadius: '6px',
                                                            fontSize: '0.875rem',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        <User size={14} />
                                                        <span>{collaborator.username}</span>
                                                        {collaborator.first_name && (
                                                            <span style={{ 
                                                                fontSize: '0.75rem', 
                                                                color: 'rgba(255, 255, 255, 0.7)' 
                                                            }}>
                                                                ({collaborator.first_name})
                                                            </span>
                                                        )}
                                                        <motion.button
                                                            type="button"
                                                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.4)' }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => handleRemoveCollaborator(collaborator.id)}
                                                            style={{
                                                                background: 'rgba(239, 68, 68, 0.3)',
                                                                border: 'none',
                                                                borderRadius: '50%',
                                                                width: '20px',
                                                                height: '20px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                                color: 'white'
                                                            }}
                                                            title={`Remover ${collaborator.username}`}
                                                        >
                                                            <X size={12} />
                                                        </motion.button>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* User Selector Dropdown */}
                                    <AnimatePresence>
                                        {showUserSelector && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    borderRadius: '8px',
                                                    padding: '0.75rem',
                                                    marginBottom: '1rem'
                                                }}
                                            >
                                                {/* Search Input */}
                                                <div style={{ marginBottom: '0.75rem' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Pesquisar utilizadores..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.5rem',
                                                            background: 'rgba(255, 255, 255, 0.1)',
                                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                                            borderRadius: '6px',
                                                            color: 'white',
                                                            fontSize: '0.875rem'
                                                        }}
                                                    />
                                                </div>

                                                <div style={{ 
                                                    maxHeight: '200px', 
                                                    overflowY: 'auto',
                                                    marginBottom: '0.5rem'
                                                }}>
                                                    {getAvailableUsers().length === 0 ? (
                                                        <div style={{ 
                                                            textAlign: 'center', 
                                                            color: 'rgba(255, 255, 255, 0.6)', 
                                                            fontSize: '0.875rem', 
                                                            padding: '1rem' 
                                                        }}>
                                                            {searchTerm ? 'Nenhum utilizador encontrado' : 'Nenhum utilizador disponível'}
                                                        </div>
                                                    ) : (
                                                        getAvailableUsers().map(user => (
                                                            <motion.div
                                                                key={user.user}
                                                                whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                                                                onClick={() => {
                                                                    handleAddCollaborator(user.user);
                                                                }}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '0.75rem',
                                                                    padding: '0.75rem',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.875rem',
                                                                    color: 'white',
                                                                    marginBottom: '0.25rem',
                                                                    border: '1px solid transparent',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                                                    <div style={{
                                                                        width: '32px',
                                                                        height: '32px',
                                                                        borderRadius: '50%',
                                                                        background: 'rgba(59, 130, 246, 0.2)',
                                                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: 'rgb(59, 130, 246)',
                                                                        fontWeight: '600',
                                                                        fontSize: '0.875rem'
                                                                    }}>
                                                                        {user.username.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ fontWeight: '500', marginBottom: '0.125rem' }}>
                                                                            {user.username}
                                                                        </div>
                                                                        <div style={{ 
                                                                            fontSize: '0.75rem', 
                                                                            color: 'rgba(255, 255, 255, 0.6)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '0.5rem'
                                                                        }}>
                                                                            {user.first_name && user.last_name && (
                                                                                <span>{user.first_name} {user.last_name}</span>
                                                                            )}
                                                                            {user.role && (
                                                                                <span style={{
                                                                                    padding: '0.125rem 0.375rem',
                                                                                    background: 'rgba(147, 51, 234, 0.2)',
                                                                                    borderRadius: '4px',
                                                                                    fontSize: '0.625rem'
                                                                                }}>
                                                                                    {user.role}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <motion.button
                                                                    type="button"
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleAddCollaborator(user.user);
                                                                    }}
                                                                    style={{
                                                                        background: 'rgba(52, 211, 153, 0.2)',
                                                                        border: '1px solid rgba(52, 211, 153, 0.3)',
                                                                        borderRadius: '6px',
                                                                        padding: '0.375rem',
                                                                        color: 'rgb(52, 211, 153)',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                    title={`Adicionar ${user.username} como colaborador`}
                                                                >
                                                                    <UserPlus size={14} />
                                                                </motion.button>
                                                            </motion.div>
                                                        ))
                                                    )}
                                                </div>

                                                {/* Quick add all workflow users button */}
                                                {getUsersAssignedToWorkflowSteps().length > 0 && (
                                                    <div style={{ 
                                                        borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
                                                        paddingTop: '0.75rem',
                                                        marginTop: '0.75rem'
                                                    }}>
                                                        <div style={{ 
                                                            fontSize: '0.75rem', 
                                                            color: 'rgba(255, 255, 255, 0.7)', 
                                                            marginBottom: '0.5rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem'
                                                        }}>
                                                            <AlertCircle size={12} />
                                                            Utilizadores atribuídos aos passos do workflow:
                                                        </div>
                                                        <motion.button
                                                            type="button"
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => {
                                                                getUsersAssignedToWorkflowSteps().forEach(user => {
                                                                    if (!selectedCollaborators.find(c => c.id === user.user)) {
                                                                        handleAddCollaborator(user.user);
                                                                    }
                                                                });
                                                                setShowUserSelector(false);
                                                            }}
                                                            style={{
                                                                ...glassStyle,
                                                                padding: '0.5rem 0.75rem',
                                                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                                                background: 'rgba(251, 191, 36, 0.2)',
                                                                color: 'white',
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                width: '100%',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <Users size={14} />
                                                            Adicionar Todos os Utilizadores do Workflow ({getUsersAssignedToWorkflowSteps().length})
                                                        </motion.button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Assignment Summary */}
                            {(formData.assigned_to || selectedCollaborators.length > 0 || Object.keys(stepAssignmentsForForm).some(key => stepAssignmentsForForm[key])) && (
                                <div style={{
                                    padding: '1rem',
                                    background: 'rgba(52, 211, 153, 0.1)',
                                    border: '1px solid rgba(52, 211, 153, 0.2)',
                                    borderRadius: '8px',
                                    marginTop: '1rem'
                                }}>
                                    <div style={{ 
                                        fontSize: '0.875rem', 
                                        fontWeight: '600', 
                                        color: 'white', 
                                        marginBottom: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <Users size={16} />
                                        Resumo de Atribuições
                                    </div>
                                    
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        {formData.assigned_to && (
                                            <div style={{ 
                                                fontSize: '0.75rem', 
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <div style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: 'rgb(59, 130, 246)'
                                                }} />
                                                <strong>Responsável Principal:</strong> {users.find(u => u.user === formData.assigned_to)?.username || 'Desconhecido'}
                                            </div>
                                        )}
                                        
                                        {selectedCollaborators.length > 0 && (
                                            <div style={{ 
                                                fontSize: '0.75rem', 
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <div style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: 'rgb(147, 51, 234)'
                                                }} />
                                                <strong>Colaboradores ({selectedCollaborators.length}):</strong> {selectedCollaborators.map(c => c.username).join(', ')}
                                            </div>
                                        )}
                                        
                                        {Object.keys(stepAssignmentsForForm).filter(key => stepAssignmentsForForm[key]).length > 0 && (
                                            <div style={{ 
                                                fontSize: '0.75rem', 
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <div style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: 'rgb(251, 191, 36)'
                                                }} />
                                                <strong>Passos do Workflow:</strong> {Object.keys(stepAssignmentsForForm).filter(key => stepAssignmentsForForm[key]).length} passo(s) atribuído(s)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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
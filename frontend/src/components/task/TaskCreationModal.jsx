// src/components/task/TaskCreationModal.jsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { X, Loader2 } from 'lucide-react';

import api from '../../api';
import { useTaskStore } from '../../stores/useTaskStore';
import TaskForm from './TaskForm';

const glassStyle = {
    background: 'rgba(17, 24, 39, 0.9)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    color: 'white',
};

const TaskCreationModal = () => {
    const queryClient = useQueryClient();
    const {
        isTaskCreationModalOpen,
        closeTaskCreationModal,
        showSuccessNotification,
        showErrorNotification
    } = useTaskStore();

    // Debug log to see if modal state is changing
    useEffect(() => {
        console.log('TaskCreationModal - isTaskCreationModalOpen:', isTaskCreationModalOpen);
    }, [isTaskCreationModalOpen]);

    // Buscar os dados necessários para os dropdowns do TaskForm
    const { data: contextData, isLoading: isLoadingContext, error: contextError } = useQuery({
        queryKey: ['taskCreationModalContext'],
        queryFn: async () => {
            console.log('Fetching context data for task creation modal...');
            try {
                const [clientsRes, usersRes, categoriesRes, workflowsRes] = await Promise.all([
                    api.get("/clients/?is_active=true"),
                    api.get("/profiles/"), // ou /users/ dependendo do seu endpoint
                    api.get("/task-categories/"),
                    api.get("/workflow-definitions/?is_active=true")
                ]);
                
                const result = {
                    clients: clientsRes.data.results || clientsRes.data || [],
                    users: usersRes.data.results || usersRes.data || [],
                    categories: categoriesRes.data.results || categoriesRes.data || [],
                    workflows: workflowsRes.data.results || workflowsRes.data || []
                };
                
                console.log('Context data fetched:', {
                    clientsCount: result.clients.length,
                    usersCount: result.users.length,
                    categoriesCount: result.categories.length,
                    workflowsCount: result.workflows.length
                });
                
                return result;
            } catch (error) {
                console.error('Error fetching context data:', error);
                throw error;
            }
        },
        enabled: isTaskCreationModalOpen, // Só busca os dados quando o modal está aberto
        staleTime: 5 * 60 * 1000,
    });

    const createTaskMutation = useMutation({
        mutationFn: (newTaskData) => {
            console.log('Creating task with data:', newTaskData);
            return api.post("/tasks/", newTaskData);
        },
        onSuccess: (response) => {
            console.log('Task created successfully:', response);
            showSuccessNotification("Tarefa Criada", "A nova tarefa foi criada com sucesso.");
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            closeTaskCreationModal();
        },
        onError: (err) => {
            console.error('Error creating task:', err);
            const errorMsg = err.response?.data?.detail || 
                           Object.values(err.response?.data || {}).flat().join(', ') || 
                           err.message;
            showErrorNotification("Erro ao Criar Tarefa", errorMsg);
        }
    });

    const handleSubmit = (formData) => {
        console.log('TaskCreationModal handleSubmit called with:', formData);
        createTaskMutation.mutate(formData);
    };

    // Debug: Log when modal should be visible
    console.log('TaskCreationModal render - isOpen:', isTaskCreationModalOpen);

    if (!isTaskCreationModalOpen) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed', 
                    inset: 0, 
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    zIndex: 1000, 
                    padding: '1rem'
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        console.log('Modal backdrop clicked, closing modal');
                        closeTaskCreationModal();
                    }
                }}
            >
                <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{
                        ...glassStyle,
                        width: '100%', 
                        maxWidth: '800px', 
                        maxHeight: '90vh',
                        overflowY: 'auto', 
                        display: 'flex', 
                        flexDirection: 'column'
                    }}
                    className="custom-scrollbar"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{ 
                        padding: '1.5rem', 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
                            Criar Nova Tarefa
                        </h2>
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                console.log('Close button clicked');
                                closeTaskCreationModal();
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.7)',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '8px'
                            }}
                        >
                            <X size={24} />
                        </motion.button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1.5rem', flex: 1 }}>
                        {isLoadingContext ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <Loader2 size={32} className="animate-spin" />
                                <p style={{ marginTop: '1rem' }}>A carregar dados do formulário...</p>
                            </div>
                        ) : contextError ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#fca5a5' }}>
                                <p>Erro ao carregar dados: {contextError.message}</p>
                                <button 
                                    onClick={() => queryClient.invalidateQueries({ queryKey: ['taskCreationModalContext'] })}
                                    style={{
                                        marginTop: '1rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(59, 130, 246, 0.2)',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                        borderRadius: '8px',
                                        color: 'rgb(59, 130, 246)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Tentar Novamente
                                </button>
                            </div>
                        ) : contextData ? (
                            <TaskForm
                                clients={contextData.clients || []}
                                users={contextData.users || []}
                                categories={contextData.categories || []}
                                workflows={contextData.workflows || []}
                                onMainSubmit={handleSubmit}
                                isSaving={createTaskMutation.isPending}
                                fetchWorkflowStepsCallback={async () => []} // Empty for creation modal
                            />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <p>Nenhum dado disponível</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TaskCreationModal;
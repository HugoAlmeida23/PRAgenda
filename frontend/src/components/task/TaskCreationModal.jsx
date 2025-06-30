// src/components/task/TaskCreationModal.jsx - Versão atualizada para suportar batches
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { X, Loader2, FileText, Layers } from 'lucide-react';

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
        showErrorNotification,
        formData
    } = useTaskStore();

    // Debug log to see if modal state is changing
    useEffect(() => {
        console.log('TaskCreationModal - isTaskCreationModalOpen:', isTaskCreationModalOpen);
    }, [isTaskCreationModalOpen]);

    // Detectar se é uma tarefa de batch
    const isBatchTask = formData?.metadata?.batch_processing === true;
    const batchId = formData?.metadata?.batch_id;
    const invoiceIds = formData?.metadata?.invoice_ids || [];

    // Buscar os dados necessários para os dropdowns do TaskForm
    const { data: contextData, isLoading: isLoadingContext, error: contextError } = useQuery({
        queryKey: ['taskCreationModalContext'],
        queryFn: async () => {
            console.log('Fetching context data for task creation modal...');
            try {
                const [clientsRes, usersRes, categoriesRes, workflowsRes] = await Promise.all([
                    api.get("/clients/?is_active=true"),
                    api.get("/profiles/"),
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
        enabled: isTaskCreationModalOpen,
        staleTime: 5 * 60 * 1000,
    });

    const createTaskMutation = useMutation({
        mutationFn: (newTaskData) => {
            console.log('Creating task with data:', newTaskData);
            
            // Se for uma tarefa de batch, usar endpoint específico
            if (isBatchTask && batchId) {
                return api.post(`/invoice-batches/${batchId}/create_batch_tasks/`, {
                    task_data: newTaskData,
                    invoices_to_process: invoiceIds
                });
            } else {
                // Tarefa individual normal
                return api.post("/tasks/", newTaskData);
            }
        },
        onSuccess: (response) => {
            console.log('Task(s) created successfully:', response);
            
            if (isBatchTask) {
                const tasksCreated = response.data.tasks_created || 0;
                const tasksFailed = response.data.tasks_failed || 0;
                
                if (tasksCreated > 0) {
                    showSuccessNotification(
                        "Tarefas Criadas", 
                        `${tasksCreated} tarefa(s) criada(s) com sucesso para o lote.`
                    );
                }
                
                if (tasksFailed > 0) {
                    showErrorNotification(
                        "Algumas Tarefas Falharam", 
                        `${tasksFailed} tarefa(s) não puderam ser criadas. Verifique os detalhes.`
                    );
                }
            } else {
                showSuccessNotification("Tarefa Criada", "A nova tarefa foi criada com sucesso.");
            }
            
            // Invalidar queries relevantes
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['invoiceBatches'] });
            
            closeTaskCreationModal();
        },
        onError: (err) => {
            console.error('Error creating task(s):', err);
            const errorMsg = err.response?.data?.detail || 
                           err.response?.data?.error ||
                           Object.values(err.response?.data || {}).flat().join(', ') || 
                           err.message;
            
            const title = isBatchTask ? "Erro ao Criar Tarefas do Lote" : "Erro ao Criar Tarefa";
            showErrorNotification(title, errorMsg);
        }
    });

    const handleSubmit = (formData) => {
        console.log('TaskCreationModal handleSubmit called with:', formData);
        
        // Remover metadados antes de enviar (são apenas para controlo interno)
        const cleanFormData = { ...formData };
        delete cleanFormData.metadata;
        
        createTaskMutation.mutate(cleanFormData);
    };

    // Debug: Log when modal should be visible
    console.log('TaskCreationModal render - isOpen:', isTaskCreationModalOpen);

    if (!isTaskCreationModalOpen) {
        return null;
    }

    const modalTitle = isBatchTask ? "Criar Tarefas do Lote" : "Criar Nova Tarefa";
    const modalIcon = isBatchTask ? <Layers size={24} /> : <FileText size={24} />;

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
                        maxWidth: '900px', 
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ 
                                padding: '0.5rem', 
                                background: isBatchTask ? 'rgba(52, 211, 153, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
                                borderRadius: '8px' 
                            }}>
                                {modalIcon}
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
                                    {modalTitle}
                                </h2>
                                {isBatchTask && (
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                                        {invoiceIds.length} faturas selecionadas para processamento
                                    </p>
                                )}
                            </div>
                        </div>
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
                        {/* Informação específica para tarefas de batch */}
                        {isBatchTask && (
                            <div style={{
                                marginBottom: '1.5rem',
                                padding: '1rem',
                                background: 'rgba(52, 211, 153, 0.1)',
                                border: '1px solid rgba(52, 211, 153, 0.2)',
                                borderRadius: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Layers size={16} style={{ color: 'rgb(52, 211, 153)' }} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'rgb(52, 211, 153)' }}>
                                        Processamento em Lote
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                    Esta tarefa será aplicada a {invoiceIds.length} faturas do mesmo lote. 
                                    Todas as faturas selecionadas serão processadas com os mesmos parâmetros.
                                </p>
                                {batchId && (
                                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                                        ID do Lote: {batchId.substring(0, 8)}...
                                    </p>
                                )}
                            </div>
                        )}

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
                                isBatchMode={isBatchTask}
                                batchInfo={isBatchTask ? {
                                    batchId,
                                    invoiceCount: invoiceIds.length,
                                    invoiceIds
                                } : null}
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
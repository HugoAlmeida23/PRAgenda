// src/components/invoices/BatchSelectionModal.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { File, Layers, X, Info } from 'lucide-react';

const glassStyle = {
    background: 'rgba(17, 24, 39, 0.9)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    color: 'white',
};

const optionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    color: 'white',
};

const BatchSelectionModal = ({ isOpen, onClose, invoice, batch, onSelectInvoice, onSelectBatch }) => {
    if (!isOpen || !invoice || !batch) return null;

    const completedInvoices = batch.invoices?.filter(i => i.status === 'COMPLETED') || [];
    const invoicesWithTasks = batch.invoices?.filter(i => 
        i.generated_task_ids && i.generated_task_ids.length > 0
    ) || [];
    const completedWithoutTasks = completedInvoices.filter(i => 
        !i.generated_task_ids || i.generated_task_ids.length === 0
    );

    const batchHasExistingTasks = invoicesWithTasks.length > 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: '1rem'
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: 50, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        style={{ ...glassStyle, width: '100%', maxWidth: '650px', display: 'flex', flexDirection: 'column' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>Criar Tarefa a Partir de Fatura</h2>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer' }}>
                                <X size={24} />
                            </motion.button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '1.5rem', flex: 1 }}>
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <Info size={16} style={{ color: 'rgb(59, 130, 246)' }} />
                                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'rgb(59, 130, 246)' }}>
                                        Informação do Lote
                                    </span>
                                </div>
                                <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                                    A fatura <strong>"{invoice.original_filename}"</strong> faz parte de um lote com:
                                </p>
                                <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0, listStyleType: 'disc', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                                    <li>{batch.invoices.length} ficheiros total</li>
                                    <li>{completedInvoices.length} faturas processadas com sucesso</li>
                                    {batchHasExistingTasks && <li>{invoicesWithTasks.length} faturas já têm tarefas criadas</li>}
                                    {completedWithoutTasks.length > 0 && <li>{completedWithoutTasks.length} faturas ainda sem tarefas</li>}
                                </ul>
                            </div>

                            <p style={{ margin: '0 0 1.5rem 0', color: 'rgba(255,255,255,0.8)' }}>
                                Como deseja criar a tarefa?
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Opção: Apenas desta fatura */}
                                <motion.button 
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.1)' }} 
                                    style={optionStyle} 
                                    onClick={onSelectInvoice}
                                >
                                    <File size={32} style={{ color: 'rgb(59, 130, 246)', flexShrink: 0 }} />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Apenas desta Fatura</h3>
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                                            Criar uma tarefa específica para lançar apenas a fatura "{invoice.original_filename}".
                                        </p>
                                    </div>
                                </motion.button>
                                
                                {/* Opção: Do lote inteiro - só se houver faturas sem tarefas */}
                                {completedWithoutTasks.length > 0 && (
                                    <motion.button 
                                        whileHover={{ scale: 1.02, backgroundColor: 'rgba(52, 211, 153, 0.1)' }} 
                                        style={optionStyle} 
                                        onClick={onSelectBatch}
                                    >
                                        <Layers size={32} style={{ color: 'rgb(52, 211, 153)', flexShrink: 0 }} />
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Do Lote Inteiro</h3>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                                                Criar uma tarefa para lançar todas as {completedWithoutTasks.length} faturas do lote que ainda não têm tarefas.
                                                {batchHasExistingTasks && (
                                                    <span style={{ display: 'block', marginTop: '0.25rem', color: 'rgb(251, 191, 36)' }}>
                                                        ⚠️ {invoicesWithTasks.length} faturas já têm tarefas e serão ignoradas.
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </motion.button>
                                )}

                                {/* Mensagem se todas as faturas já têm tarefas */}
                                {completedWithoutTasks.length === 0 && batchHasExistingTasks && (
                                    <div style={{ 
                                        padding: '1rem', 
                                        background: 'rgba(251, 191, 36, 0.1)', 
                                        border: '1px solid rgba(251, 191, 36, 0.2)', 
                                        borderRadius: '8px',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ margin: 0, color: 'rgb(251, 191, 36)', fontSize: '0.875rem' }}>
                                            ℹ️ Todas as faturas processadas deste lote já têm tarefas criadas.
                                        </p>
                                        <p style={{ margin: '0.5rem 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                                            Pode criar uma tarefa individual para esta fatura específica se necessário.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BatchSelectionModal;
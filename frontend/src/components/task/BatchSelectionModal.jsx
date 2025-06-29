// src/components/invoices/BatchSelectionModal.jsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { File, Layers, X } from 'lucide-react';

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

    const completedInvoicesCount = batch.invoices?.filter(i => i.status === 'COMPLETED').length || 0;

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
                        style={{ ...glassStyle, width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column' }}
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
                            <p style={{ margin: '0 0 1.5rem 0', color: 'rgba(255,255,255,0.8)' }}>
                                A fatura <strong>"{invoice.original_filename}"</strong> faz parte de um lote com {batch.invoices.length} ficheiros ({completedInvoicesCount} concluídos).
                                <br/>Como deseja criar a tarefa?
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <motion.button whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.1)' }} style={optionStyle} onClick={onSelectInvoice}>
                                    <File size={32} style={{ color: 'rgb(59, 130, 246)', flexShrink: 0 }} />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Apenas desta Fatura</h3>
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                                            Criar uma tarefa para lançar apenas a fatura selecionada.
                                        </p>
                                    </div>
                                </motion.button>
                                
                                <motion.button whileHover={{ scale: 1.02, backgroundColor: 'rgba(52, 211, 153, 0.1)' }} style={optionStyle} onClick={onSelectBatch} disabled={completedInvoicesCount === 0}>
                                    <Layers size={32} style={{ color: 'rgb(52, 211, 153)', flexShrink: 0 }} />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Do Lote Inteiro</h3>
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                                            Criar uma tarefa para lançar todas as {completedInvoicesCount} faturas concluídas deste lote.
                                        </p>
                                    </div>
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BatchSelectionModal;
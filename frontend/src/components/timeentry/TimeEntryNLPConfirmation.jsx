// src/components/timeentry/TimeEntryNLPConfirmation.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Send, X, Loader2 } from 'lucide-react';
import { useTimeEntryStore } from '../../stores/useTimeEntryStore';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const TimeEntryNLPConfirmation = ({ onConfirm, isProcessingNLP }) => {
    const {
        showNLPConfirmationDialog,
        closeNLPConfirmationDialog,
        nlpExtractedEntries,
        manualFormData // To get date and task_status_after if set by user before NLP
    } = useTimeEntryStore();

    if (!showNLPConfirmationDialog || !nlpExtractedEntries) return null;

    const formatMinutes = (minutes) => {
        if (minutes === null || minutes === undefined) return "N/A";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const getTaskStatusLabel = (status) => {
        switch (status) {
          case 'in_progress': return 'Em Progresso';
          case 'completed': return 'Concluída';
          default: return 'Sem alteração';
        }
    };
    
    const displayData = Array.isArray(nlpExtractedEntries) ? nlpExtractedEntries[0] : nlpExtractedEntries;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{ ...glassStyle, width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', color: 'white' }}
            >
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, display:'flex', alignItems:'center', gap:'0.5rem' }}><Brain size={24} style={{color:'rgb(147,51,234)'}}/>Confirmar Entradas da IA</h2>
                    <motion.button whileHover={{scale:1.1}} whileTap={{scale:0.9}} onClick={closeNLPConfirmationDialog} style={{background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer'}}><X size={24}/></motion.button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    <p style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>A IA extraiu as seguintes informações. Confirme para criar as entradas de tempo:</p>
                    {/* Display simplified summary or first entry */}
                    {displayData?.clients?.length > 0 && <p><strong>Cliente(s):</strong> {displayData.clients.map(c => c.name).join(', ')}</p>}
                    {displayData?.tasks?.length > 0 && <p><strong>Tarefa(s):</strong> {displayData.tasks.map(t => t.title).join(', ')}</p>}
                    {displayData?.times?.length > 0 && <p><strong>Tempo(s):</strong> {displayData.times.map(t => formatMinutes(t)).join(', ')}</p>}
                    {displayData?.activities?.length > 0 && <p><strong>Atividade(s):</strong> {displayData.activities.join('; ')}</p>}
                    <p><strong>Data (a ser usada):</strong> {manualFormData.date}</p>
                    {manualFormData.task_status_after !== 'no_change' && 
                        <p><strong>Status da Tarefa Principal (após):</strong> {getTaskStatusLabel(manualFormData.task_status_after)}</p>
                    }
                     {!displayData && <p>Não foi possível extrair detalhes claros. Por favor, refine sua descrição ou use o modo manual.</p>}
                </div>
                <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={closeNLPConfirmationDialog} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Cancelar</motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onConfirm} disabled={isProcessingNLP || !displayData} style={{ padding: '0.75rem 1.5rem', background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: (isProcessingNLP || !displayData) ? 0.7 : 1 }}>
                        {isProcessingNLP ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Confirmar e Criar
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default TimeEntryNLPConfirmation;
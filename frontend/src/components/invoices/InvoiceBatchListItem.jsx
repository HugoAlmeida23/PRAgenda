// src/components/invoices/InvoiceBatchListItem.jsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CheckCircle, Clock, XCircle, FileSpreadsheet, Loader2, PlusSquare, Layers } from 'lucide-react';
import ScannedInvoiceEditor from './ScannedInvoiceEditor';
import api from '../../api';
import { toast } from 'react-toastify';

const InvoiceBatchListItem = ({ batch, clients, isExpanded, onToggle }) => {
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [isCreatingBatchTasks, setIsCreatingBatchTasks] = useState(false);

  const summary = batch.status_summary.reduce((acc, curr) => {
    acc[curr.status] = curr.count;
    return acc;
  }, {});

  // Calcular estatísticas das tarefas
  const completedInvoices = batch.invoices?.filter(inv => inv.status === 'COMPLETED') || [];
  const invoicesWithTasks = batch.invoices?.filter(inv => 
    inv.generated_task_ids && inv.generated_task_ids.length > 0
  ) || [];
  const invoicesWithoutTasks = completedInvoices.filter(inv => 
    !inv.generated_task_ids || inv.generated_task_ids.length === 0
  );

  const batchHasAnyTasks = invoicesWithTasks.length > 0;
  const canCreateBatchTasks = invoicesWithoutTasks.length > 0;

  const generateExcel = async () => {
    setIsGeneratingExcel(true);
    toast.info("A gerar o seu ficheiro Excel. Por favor, aguarde...");
    try {
      const response = await api.get(`/invoice-batches/${batch.id}/generate_excel/`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `faturas_lote_${batch.id}.xlsx`;
      if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
          if (fileNameMatch && fileNameMatch.length === 2) {
              fileName = fileNameMatch[1];
          }
      }
      link.setAttribute('download', fileName);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Error generating Excel:", err);
      toast.error("Erro ao gerar ficheiro Excel");
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleCreateBatchTasks = async () => {
    if (isCreatingBatchTasks || invoicesWithoutTasks.length === 0) return;

    setIsCreatingBatchTasks(true);
    
    try {
      const response = await api.post(`/invoice-batches/${batch.id}/create_batch_tasks/`, {
        invoices_to_process: invoicesWithoutTasks.map(inv => inv.id)
      });

      if (response.data.success) {
        toast.success(`${response.data.tasks_created} tarefas criadas com sucesso!`);
        // Opcional: recarregar dados do batch
        window.location.reload();
      } else {
        toast.warning(response.data.message || "Algumas tarefas não puderam ser criadas");
      }
    } catch (error) {
      console.error("Error creating batch tasks:", error);
      toast.error("Erro ao criar tarefas do lote");
    } finally {
      setIsCreatingBatchTasks(false);
    }
  };

  return (
    <div style={{ background: 'rgba(255, 255, 255,0.03)', border: '1px solid rgba(255, 255, 255,0.1)', borderRadius: '12px' }}>
      <motion.header
        onClick={onToggle}
        style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: '600' }}>{batch.description || `Lote de ${new Date(batch.created_at).toLocaleString('pt-PT')}`}</p>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
            {batch.invoice_count} ficheiros
            {batchHasAnyTasks && (
              <span style={{ marginLeft: '0.5rem', color: 'rgb(52, 211, 153)' }}>
                • {invoicesWithTasks.length} com tarefas
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
          {summary.COMPLETED > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><CheckCircle size={14} color="rgb(52, 211, 153)"/>{summary.COMPLETED}</span>}
          {summary.PROCESSING > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Loader2 size={14} className="animate-spin" color="rgb(59, 130, 246)"/>{summary.PROCESSING}</span>}
          {summary.PENDING > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} color="rgb(251, 191, 36)"/>{summary.PENDING}</span>}
          {summary.ERROR > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={14} color="rgb(239, 68, 68)"/>{summary.ERROR}</span>}
        </div>
        <ChevronDown size={20} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
      </motion.header>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 0', gap: '1rem' }}>
                {/* Botão para criar tarefas do lote (apenas se houver faturas sem tarefas) */}
                {canCreateBatchTasks && (
                  <motion.button 
                    onClick={handleCreateBatchTasks}
                    disabled={isCreatingBatchTasks}
                    whileHover={{ scale: 1.05 }}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      background: 'rgba(147, 51, 234, 0.2)', 
                      border: '1px solid rgba(147, 51, 234, 0.3)', 
                      borderRadius: '8px', 
                      color: 'rgb(147, 51, 234)', 
                      cursor: 'pointer', 
                      display: 'flex',
                      alignItems: 'center', 
                      gap: '0.5rem'
                    }}
                  >
                    {isCreatingBatchTasks ? (
                      <Loader2 size={16} className="animate-spin"/>
                    ) : (
                      <Layers size={16}/>
                    )}
                    {isCreatingBatchTasks ? 'A criar...' : `Criar ${invoicesWithoutTasks.length} Tarefas`}
                  </motion.button>
                )}

                {/* Botão para gerar Excel */}
                <motion.button 
                  onClick={generateExcel}
                  disabled={isGeneratingExcel}
                  whileHover={{ scale: 1.05 }}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: 'rgba(52, 211, 153, 0.2)', 
                    border: '1px solid rgba(52, 211, 153, 0.3)', 
                    borderRadius: '8px', 
                    color: 'rgb(52, 211, 153)', 
                    cursor: 'pointer', 
                    display: 'flex',
                    alignItems: 'center', 
                    gap: '0.5rem'
                  }}
                >
                  {isGeneratingExcel ? <Loader2 size={16} className="animate-spin"/> : <FileSpreadsheet size={16}/>}
                  {isGeneratingExcel ? 'A gerar...' : 'Gerar Excel'}
                </motion.button>
              </div>

              {/* Mostrar estatísticas das tarefas se relevante */}
              {batchHasAnyTasks && (
                <div style={{ 
                  marginBottom: '1rem', 
                  padding: '0.75rem', 
                  background: 'rgba(52, 211, 153, 0.05)', 
                  border: '1px solid rgba(52, 211, 153, 0.15)', 
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <p style={{ margin: 0, fontWeight: '500', color: '#86efac' }}>
                    Estado das Tarefas do Lote:
                  </p>
                  <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0, listStyleType: 'disc' }}>
                    <li>{invoicesWithTasks.length} faturas já têm tarefas criadas</li>
                    {invoicesWithoutTasks.length > 0 && (
                      <li>{invoicesWithoutTasks.length} faturas ainda sem tarefas</li>
                    )}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {batch.invoices.map(invoice => (
                  <ScannedInvoiceEditor 
                    key={invoice.id} 
                    invoice={invoice} 
                    batch={batch} 
                    clients={clients}
                    batchHasTasks={batchHasAnyTasks}
                  />
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InvoiceBatchListItem;
// src/pages/InvoiceProcessing.jsx - Atualizações para suportar a nova funcionalidade

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScanLine, CloudUpload, History, Loader2, AlertTriangle } from 'lucide-react';

import api from '../api';
import BackgroundElements from '../components/HeroSection/BackgroundElements';
import InvoiceUploader from '../components/invoices/InvoiceUploader';
import InvoiceBatchList from '../components/invoices/InvoiceBatchList';
import BatchSelectionModal from '../components/task/BatchSelectionModal';
import TaskCreationModal from '../components/task/TaskCreationModal'; // Adicionar importação
import { useTaskStore } from '../stores/useTaskStore';

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120 } },
};

const InvoiceProcessingPage = () => {
  const queryClient = useQueryClient();
  const { 
    showSuccessNotification, 
    showErrorNotification,
    // Estado e ações da store para o modal
    showBatchSelectionModal,
    closeBatchSelectionModal,
    selectedInvoiceForTask,
    selectedBatchForTask,
    availableClientsForBatch,
    createTaskForInvoice,
    createTaskForBatch,
  } = useTaskStore();

  const [activeBatchId, setActiveBatchId] = useState(null);

  const hasPendingInvoices = (batches) => {
    if (!Array.isArray(batches)) return false;
    return batches.some(batch => 
      batch.invoices && batch.invoices.some(invoice => 
        ['PENDING', 'PROCESSING'].includes(invoice.status)
      )
    );
  };

  const { data: batches = [], isLoading: isLoadingBatches, isError: isErrorBatches, error: errorBatches } = useQuery({
    queryKey: ['invoiceBatches'],
    queryFn: async () => {
        const response = await api.get('/invoice-batches/');
        const results = response.data.results || response.data || [];
        
        // Melhorar os dados do lote com informações de tarefas
        const enhancedResults = await Promise.all(
          results.map(async (batch) => {
            try {
              // Buscar estado detalhado do lote
              const statusResponse = await api.get(`/invoice-batches/${batch.id}/batch_status/`);
              batch.task_stats = statusResponse.data.task_stats;
              batch.can_create_more_tasks = statusResponse.data.can_create_more_tasks;
              batch.ready_for_batch_creation = statusResponse.data.ready_for_batch_creation;
            } catch (error) {
              console.warn(`Erro ao buscar estado do lote ${batch.id}:`, error);
              // Usar valores padrão se a busca falhar
              batch.task_stats = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
              batch.can_create_more_tasks = false;
              batch.ready_for_batch_creation = false;
            }
            
            return batch;
          })
        );
        
        return enhancedResults;
    },
    refetchInterval: data => hasPendingInvoices(data) ? 3000 : false,
    staleTime: 1000,
  });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
      queryKey: ['clientsForDropdowns'],
      queryFn: () => api.get("/clients/?is_active=true").then(res => res.data.results || res.data),
      staleTime: 10 * 60 * 1000, // Cache de 10 minutos para a lista de clientes
  });

  const uploadMutation = useMutation({
    mutationFn: ({ files, description }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (description) formData.append('description', description);
      
      return api.post('/invoice-batches/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (data) => {
      showSuccessNotification('Lote Enviado', 'As suas faturas estão a ser processadas.');
      queryClient.invalidateQueries({ queryKey: ['invoiceBatches'] });
      if (data.data && data.data.id) {
        setActiveBatchId(data.data.id);
      }
    },
    onError: (err) => {
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || 'Falha ao enviar o lote de faturas.';
      showErrorNotification('Erro de Upload', errorMessage);
    },
  });

  const handleUpload = (files, description) => {
    if (files && files.length > 0) {
      uploadMutation.mutate({ files, description });
    } else {
      showErrorNotification('Erro', 'Nenhum ficheiro selecionado.');
    }
  };

  const pageTitle = "Processamento de Faturas (QR Code)";
  const pageSubtitle = "Envie faturas em imagem ou PDF para extração automática de dados via QR Code.";
  
  const isLoading = isLoadingBatches || isLoadingClients;
  const isError = isErrorBatches || !clients;
  const error = errorBatches || new Error("Não foi possível carregar a lista de clientes.");

  // Calcular estatísticas gerais dos lotes
  const batchStats = batches.reduce((stats, batch) => {
    const taskStats = batch.task_stats || {};
    stats.totalInvoices += batch.invoice_count || 0;
    stats.totalTasks += Object.values(taskStats).reduce((sum, count) => sum + count, 0);
    stats.pendingTasks += taskStats.pending || 0;
    stats.completedTasks += taskStats.completed || 0;
    stats.batchesWithTasks += Object.values(taskStats).reduce((sum, count) => sum + count, 0) > 0 ? 1 : 0;
    return stats;
  }, {
    totalInvoices: 0,
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    batchesWithTasks: 0
  });

  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
      <BackgroundElements />
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem', maxWidth: '1400px', margin: '0 auto' }}
      >
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(52, 211, 153, 0.2)', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
            <ScanLine size={28} style={{ color: 'rgb(52, 211, 153)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0 }}>{pageTitle}</h1>
            <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>{pageSubtitle}</p>
          </div>
          
          {/* Estatísticas rápidas */}
          {batchStats.totalInvoices > 0 && (
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', minWidth: '80px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'rgb(59, 130, 246)' }}>{batchStats.totalInvoices}</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Faturas</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', minWidth: '80px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'rgb(52, 211, 153)' }}>{batchStats.totalTasks}</div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Tarefas</div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <InvoiceUploader onUpload={handleUpload} isUploading={uploadMutation.isPending} />
        </motion.div>

        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History size={20} style={{ color: 'rgb(196, 181, 253)' }}/>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Lotes de Faturas Enviadas</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(191, 219, 254, 1)' }}>
                {batches.length} lotes encontrados
                {batchStats.batchesWithTasks > 0 && (
                  <span style={{ marginLeft: '0.5rem', color: 'rgb(52, 211, 153)' }}>
                    • {batchStats.batchesWithTasks} com tarefas
                  </span>
                )}
              </p>
            </div>
          </div>
          
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59, 130, 246)' }} />
              <p style={{ marginTop: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                A carregar dados...
              </p>
            </div>
          ) : isError ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#fca5a5' }}>
              <AlertTriangle size={32} style={{ marginBottom: '1rem' }} />
              <p>Erro ao carregar dados: {error?.message || 'Erro desconhecido'}</p>
              <button 
                onClick={() => queryClient.invalidateQueries()}
                style={{
                  marginTop: '1rem', padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px',
                  color: 'rgb(59, 130, 246)', cursor: 'pointer'
                }}
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            <InvoiceBatchList 
              batches={batches}
              clients={clients}
              activeBatchId={activeBatchId}
              setActiveBatchId={setActiveBatchId}
            />
          )}
        </motion.div>
      </motion.div>

      {/* Modal de seleção de batch/invoice */}
      <BatchSelectionModal
          isOpen={showBatchSelectionModal}
          onClose={closeBatchSelectionModal}
          invoice={selectedInvoiceForTask}
          batch={selectedBatchForTask}
          onSelectInvoice={() => createTaskForInvoice(selectedInvoiceForTask, availableClientsForBatch)}
          onSelectBatch={() => createTaskForBatch(selectedBatchForTask, availableClientsForBatch)}
      />

      {/* Modal de criação de tarefas */}
      <TaskCreationModal />
    </div>
  );
};

export default InvoiceProcessingPage;
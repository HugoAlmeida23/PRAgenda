// Fix for InvoiceProcessing.jsx

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ScanLine, CloudUpload, History, FileSpreadsheet, Loader2, AlertTriangle } from 'lucide-react';

import api from '../api';
import BackgroundElements from '../components/HeroSection/BackgroundElements';
import InvoiceUploader from '../components/invoices/InvoiceUploader';
import InvoiceBatchList from '../components/invoices/InvoiceBatchList';
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
  const { showSuccessNotification, showErrorNotification } = useTaskStore();
  const [activeBatchId, setActiveBatchId] = useState(null);

  // Check if any batches have invoices being processed
  const hasPendingInvoices = (batches) => {
    if (!Array.isArray(batches)) return false;
    return batches.some(batch => 
      batch.invoices && batch.invoices.some(invoice => 
        ['PENDING', 'PROCESSING'].includes(invoice.status)
      )
    );
  };

  // Fetch all invoice batches for the user's organization
  const { data: batches = [], isLoading, isError, error } = useQuery({
    queryKey: ['invoiceBatches'],
    queryFn: async () => {
      try {
        const response = await api.get('/invoice-batches/');
        console.log('Invoice Batches API Response:', response.data);
        
        // Handle different response formats
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data && response.data.results) {
          return response.data.results;
        } else {
          return [];
        }
      } catch (error) {
        console.error('Invoice Batches API Error:', error);
        throw error;
      }
    },
    // Auto-refresh when there are pending invoices
    refetchInterval: data => hasPendingInvoices(data) ? 3000 : false,
    // Show cached data while refetching
    staleTime: 1000,
  });

  // Mutation for uploading a new batch of invoices
  const uploadMutation = useMutation({
    mutationFn: ({ files, description }) => {
      const formData = new FormData();
      files.forEach(file => {
        console.log('Adding file to form:', file.name, file.size);
        formData.append('files', file);
      });
      if (description) {
        formData.append('description', description);
      }
      
      return api.post('/invoice-batches/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (data) => {
      console.log('Upload successful:', data.data);
      showSuccessNotification('Lote Enviado', 'As suas faturas estão a ser processadas.');
      
      // Invalidate and refetch the batches
      queryClient.invalidateQueries({ queryKey: ['invoiceBatches'] });
      
      // Set the new batch as active to show it expanded
      if (data.data && data.data.id) {
        setActiveBatchId(data.data.id);
      }
    },
    onError: (err) => {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.detail || 
                          'Falha ao enviar o lote de faturas.';
      showErrorNotification('Erro de Upload', errorMessage);
    },
  });

  const handleUpload = (files, description) => {
    if (files && files.length > 0) {
      console.log('Starting upload with files:', files.map(f => f.name));
      uploadMutation.mutate({ files, description });
    } else {
      showErrorNotification('Erro', 'Nenhum ficheiro selecionado.');
    }
  };

  const pageTitle = "Processamento de Faturas (QR Code)";
  const pageSubtitle = "Envie faturas em imagem ou PDF para extração automática de dados via QR Code.";

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
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0 }}>{pageTitle}</h1>
            <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>{pageSubtitle}</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={{ marginBottom: '2rem' }}>
          <InvoiceUploader onUpload={handleUpload} isUploading={uploadMutation.isPending} />
        </motion.div>

        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <History size={20} style={{ color: 'rgb(196, 181, 253)' }}/>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Lotes de Faturas Enviadas</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(191, 219, 254, 1)' }}>
                {batches.length} lotes encontrados
              </p>
            </div>
          </div>
          
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59, 130, 246)' }} />
              <p style={{ marginTop: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                A carregar lotes de faturas...
              </p>
            </div>
          ) : isError ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#fca5a5' }}>
              <AlertTriangle size={32} style={{ marginBottom: '1rem' }} />
              <p>Erro ao carregar lotes: {error?.message || 'Erro desconhecido'}</p>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['invoiceBatches'] })}
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
          ) : (
            <InvoiceBatchList 
              batches={batches} 
              activeBatchId={activeBatchId}
              setActiveBatchId={setActiveBatchId}
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default InvoiceProcessingPage;
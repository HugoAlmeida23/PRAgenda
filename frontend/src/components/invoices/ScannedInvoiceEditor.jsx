import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Edit2, AlertTriangle, CheckCircle, PlusSquare } from 'lucide-react';
import api from '../../api';
import { useTaskStore } from '../../stores/useTaskStore';

// Receber a nova prop `batch`
const ScannedInvoiceEditor = ({ invoice, batch, clients }) => {
  const queryClient = useQueryClient();
  const { openFormForInvoiceLaunch } = useTaskStore();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  useEffect(() => {
    setFormData({
      nif_emitter: invoice.edited_data?.nif_emitter ?? invoice.nif_emitter ?? '',
      nif_acquirer: invoice.edited_data?.nif_acquirer ?? invoice.nif_acquirer ?? '',
      doc_date: invoice.edited_data?.doc_date ?? invoice.doc_date ?? '',
      gross_total: invoice.edited_data?.gross_total ?? invoice.gross_total ?? '',
      vat_amount: invoice.edited_data?.vat_amount ?? invoice.vat_amount ?? '',
      taxable_amount: invoice.edited_data?.taxable_amount ?? invoice.taxable_amount ?? '',
    });
  }, [invoice]);

  const updateMutation = useMutation({
    mutationFn: (updatedData) => api.patch(`/scanned-invoices/${invoice.id}/`, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceBatches'] });
      setIsEditing(false);
    }
  });

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(() => {
    updateMutation.mutate(formData);
  }, [updateMutation, formData]);
  
  // Atualizar a chamada e as dependências
  const handleCreateTaskClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isCreatingTask) {
      console.log('Task creation already in progress, ignoring click');
      return;
    }
    
    setIsCreatingTask(true);
    console.log('Creating task for invoice:', invoice.id, 'from batch:', batch.id);
    
    try {
      const safeClients = Array.isArray(clients) ? clients : [];
      
      setTimeout(() => {
        try {
          // Passar `invoice`, `batch`, e `clients` para a store
          openFormForInvoiceLaunch(invoice, batch, safeClients);
          
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setIsCreatingTask(false);
          }, 200);
        } catch (error) {
          console.error('Error opening form for invoice launch:', error);
          setIsCreatingTask(false);
        }
      }, 100);
    } catch (error) {
      console.error('Error in handleCreateTaskClick:', error);
      setIsCreatingTask(false);
    }
  }, [invoice, batch, clients, openFormForInvoiceLaunch, isCreatingTask]);

  const hasError = invoice.status === 'ERROR';
  const isCompleted = invoice.status === 'COMPLETED';

  return (
    <div style={{ 
      padding: '1rem', 
      background: `rgba(255, 255, 255, ${hasError ? '0.02' : '0.05'})`, 
      border: `1px solid rgba(255,255,255,${hasError ? '0.05' : '0.1'})`, 
      borderRadius: '8px' 
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: isEditing ? '1rem' : 0 
      }}>
        <p style={{ margin: 0, fontWeight: '500' }}>{invoice.original_filename}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {hasError && (
            <span style={{ 
              color: '#fca5a5', 
              fontSize: '0.8rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.25rem' 
            }}>
              <AlertTriangle size={14}/>
              {invoice.processing_log}
            </span>
          )}
          
          {invoice.is_reviewed && (
            <span style={{ 
              color: '#86efac', 
              fontSize: '0.8rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.25rem' 
            }}>
              <CheckCircle size={14}/>
              Revisto
            </span>
          )}
          
          {isCompleted && (
            <motion.button
              onClick={handleCreateTaskClick}
              disabled={isCreatingTask}
              whileHover={!isCreatingTask ? { scale: 1.1, color: '#34d399' } : {}}
              whileTap={!isCreatingTask ? { scale: 0.95 } : {}}
              title="Criar tarefa a partir desta fatura"
              style={{ 
                background: 'none', 
                border: 'none', 
                color: isCreatingTask ? '#6b7280' : '#86efac', 
                cursor: isCreatingTask ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem', 
                fontSize: '0.8rem', 
                fontWeight: '500',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
                opacity: isCreatingTask ? 0.6 : 1
              }}
            >
              <PlusSquare size={16} /> 
              {isCreatingTask ? 'A criar...' : 'Criar Tarefa'}
            </motion.button>
          )}

          <button 
            onClick={() => setIsEditing(!isEditing)} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: isEditing ? '#fca5a5' : '#60a5fa', 
              cursor: 'pointer', 
              padding: '0.25rem' 
            }}
          >
            <Edit2 size={16} />
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }} 
            style={{overflow: 'hidden'}}
          >
            <div style={{
              paddingTop: '1rem', 
              borderTop: '1px solid rgba(255,255,255,0.1)', 
              marginTop: '1rem'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '1rem', 
                marginBottom: '1rem' 
              }}>
                {Object.keys(formData).map(key => (
                  <div key={key}>
                    <label style={{ 
                      fontSize: '0.75rem', 
                      display: 'block', 
                      marginBottom: '0.25rem', 
                      textTransform: 'capitalize' 
                    }}>
                      {key.replace('_', ' ')}
                    </label>
                    <input
                      type={key.includes('date') ? 'date' : 'text'}
                      name={key}
                      value={formData[key] || ''}
                      onChange={handleInputChange}
                      style={{ 
                        width: '100%', 
                        padding: '0.5rem', 
                        background: 'rgba(0,0,0,0.2)', 
                        border: '1px solid rgba(255,255,255,0.2)', 
                        borderRadius: '6px', 
                        color: 'white' 
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <motion.button 
                  onClick={handleSave} 
                  disabled={updateMutation.isPending}
                  whileHover={{scale: 1.05}}
                  whileTap={{scale: 0.95}}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    background: 'rgba(59, 130, 246, 0.2)', 
                    border: '1px solid rgba(59, 130, 246, 0.3)', 
                    borderRadius: '8px', 
                    color: '#60a5fa',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Save size={16}/> Salvar
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScannedInvoiceEditor;
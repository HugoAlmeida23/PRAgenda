// frontend/src/components/invoices/ScannedInvoiceEditor.jsx

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Save, Edit2, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../api';

const ScannedInvoiceEditor = ({ invoice }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Initialize form with edited data if available, otherwise use extracted data
    setFormData({
      nif_emitter: invoice.edited_data.nif_emitter ?? invoice.nif_emitter ?? '',
      nif_acquirer: invoice.edited_data.nif_acquirer ?? invoice.nif_acquirer ?? '',
      doc_date: invoice.edited_data.doc_date ?? invoice.doc_date ?? '',
      gross_total: invoice.edited_data.gross_total ?? invoice.gross_total ?? '',
      vat_amount: invoice.edited_data.vat_amount ?? invoice.vat_amount ?? '',
      taxable_amount: invoice.edited_data.taxable_amount ?? invoice.taxable_amount ?? '',
    });
  }, [invoice]);

  const updateMutation = useMutation({
    mutationFn: (updatedData) => api.patch(`/scanned-invoices/${invoice.id}/`, updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceBatches'] });
      setIsEditing(false);
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };
  
  const hasError = invoice.status === 'ERROR';

  return (
    <div style={{ padding: '1rem', background: `rgba(255, 255, 255, ${hasError ? '0.02' : '0.05'})`, border: `1px solid rgba(255,255,255,${hasError ? '0.05' : '0.1'})`, borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ margin: 0, fontWeight: '500' }}>{invoice.original_filename}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {hasError && <span style={{ color: '#fca5a5', fontSize: '0.8rem', display: 'flex', gap: '0.25rem' }}><AlertTriangle size={14}/>{invoice.processing_log}</span>}
          {invoice.is_reviewed && <span style={{ color: '#86efac', fontSize: '0.8rem', display: 'flex', gap: '0.25rem' }}><CheckCircle size={14}/>Revidisto</span>}
          <button onClick={() => setIsEditing(!isEditing)} style={{ background: 'none', border: 'none', color: isEditing ? '#fca5a5' : '#60a5fa', cursor: 'pointer' }}>
            <Edit2 size={16} />
          </button>
        </div>
      </div>
      
      {isEditing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {Object.keys(formData).map(key => (
              <div key={key}>
                <label style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>{key.replace('_', ' ')}</label>
                <input
                  type={key.includes('date') ? 'date' : 'text'}
                  name={key}
                  value={formData[key]}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white' }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSave} disabled={updateMutation.isPending} style={{ padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#60a5fa' }}>
              <Save size={16}/>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ScannedInvoiceEditor;
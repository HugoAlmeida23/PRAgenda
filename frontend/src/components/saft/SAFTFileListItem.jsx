// frontend/src/components/saft/SAFTFileListItem.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, Loader2, XCircle, Eye, AlertTriangle } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    PENDING: { icon: <Clock size={14} />, text: 'Pendente', color: 'rgb(251, 191, 36)', bg: 'rgba(251, 191, 36, 0.1)' },
    PROCESSING: { icon: <Loader2 size={14} className="animate-spin" />, text: 'A Processar', color: 'rgb(59, 130, 246)', bg: 'rgba(59, 130, 246, 0.1)' },
    COMPLETED: { icon: <CheckCircle size={14} />, text: 'Concluído', color: 'rgb(52, 211, 153)', bg: 'rgba(52, 211, 153, 0.1)' },
    ERROR: { icon: <XCircle size={14} />, text: 'Erro', color: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.1)' },
  };

  const config = statusConfig[status] || { 
    icon: <AlertTriangle size={14} />, 
    text: 'Desconhecido', 
    color: 'rgb(156, 163, 175)', 
    bg: 'rgba(156, 163, 175, 0.1)' 
  };

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '600',
      color: config.color,
      background: config.bg,
    }}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
};

const SAFTFileListItem = ({ file, onViewDetails }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-PT', { 
      dateStyle: 'short', 
      timeStyle: 'short' 
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <motion.div
      whileHover={{ 
        scale: 1.01, 
        boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)' 
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          padding: '0.75rem',
          background: 'rgba(59, 130, 246, 0.2)',
          borderRadius: '12px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          flexShrink: 0
        }}>
          <FileText size={24} style={{ color: 'rgb(59, 130, 246)' }} />
        </div>
        <div>
          <p style={{ 
            margin: 0, 
            fontWeight: '600', 
            fontSize: '0.95rem',
            color: 'white'
          }}>
            {file.original_filename || 'Ficheiro SAFT'}
          </p>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            marginTop: '0.25rem'
          }}>
            <p style={{ 
              margin: 0, 
              fontSize: '0.75rem', 
              color: 'rgba(255, 255, 255, 0.6)' 
            }}>
              Por: {file.uploaded_by_username || 'Sistema'}
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: '0.75rem', 
              color: 'rgba(255, 255, 255, 0.6)' 
            }}>
              {formatDate(file.uploaded_at)}
            </p>
          </div>
          {file.fiscal_year && (
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              fontSize: '0.75rem', 
              color: 'rgba(255, 255, 255, 0.5)' 
            }}>
              Ano Fiscal: {file.fiscal_year}
            </p>
          )}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1.5rem' 
      }}>
        {file.status === 'COMPLETED' && file.summary_data && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ 
              margin: 0, 
              fontSize: '0.75rem', 
              color: 'rgba(255, 255, 255, 0.6)' 
            }}>
              Faturação Total
            </p>
            <p style={{ 
              margin: 0, 
              fontWeight: '600',
              color: 'rgb(52, 211, 153)',
              fontSize: '0.9rem'
            }}>
              €{new Intl.NumberFormat('pt-PT').format(file.summary_data.total_gross || 0)}
            </p>
            {file.summary_data.invoice_count && (
              <p style={{ 
                margin: 0, 
                fontSize: '0.7rem', 
                color: 'rgba(255, 255, 255, 0.5)' 
              }}>
                {file.summary_data.invoice_count} faturas
              </p>
            )}
          </div>
        )}
        
        <StatusBadge status={file.status} />
        
        {file.status === 'COMPLETED' && onViewDetails && (
          <motion.button 
            onClick={() => onViewDetails(file.id)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            style={{ 
              padding: '0.5rem',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              color: 'rgb(59, 130, 246)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease-in-out'
            }}
            title="Ver Detalhes"
          >
            <Eye size={16} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default SAFTFileListItem;
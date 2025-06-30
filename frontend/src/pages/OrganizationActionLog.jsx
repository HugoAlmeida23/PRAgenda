import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, RefreshCw, Clock, User, FileText } from 'lucide-react';

// Import your API utility - this should be the same one used in other pages
import api from '../api';

const columns = [
  { key: 'timestamp', label: 'Data/Hora' },
  { key: 'user', label: 'Utilizador' },
  { key: 'action_type', label: 'Tipo de Ação' },
  { key: 'action_description', label: 'Descrição' },
  { key: 'related_object_type', label: 'Objeto' },
];

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-PT', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px'
};

export default function OrganizationActionLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching logs from /action-logs/...');
      
      // Use the same api instance that other components use
      // This should automatically include authentication headers
      const response = await api.get('/action-logs/');
      
      console.log('API Response:', response);
      
      // Handle both paginated and non-paginated responses
      const data = response.data.results || response.data || [];
      
      console.log('Logs data:', data);
      setLogs(data);
      
    } catch (err) {
      console.error('Error fetching logs:', err);
      console.error('Error response:', err.response);
      
      // Detailed error handling
      if (err.response?.status === 401) {
        setError('Não autenticado. Por favor, faça login novamente.');
      } else if (err.response?.status === 403) {
        setError('Sem permissão para ver registos de ações.');
      } else if (err.response?.status === 404) {
        setError('Endpoint não encontrado. Verifique se a URL /api/action-logs/ está configurada.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(err.message || 'Erro ao carregar logs');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = () => {
    fetchLogs();
  };

  if (loading) {
    return (
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        padding: '2rem', 
        color: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw size={48} style={{ color: '#60a5fa' }} />
          </motion.div>
          <p style={{ marginTop: '1rem', color: '#60a5fa' }}>A carregar registos...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem', color: 'white' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '2rem' }}
      >
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 700, 
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Activity size={32} style={{ color: '#60a5fa' }} />
          Registo de Ações da Organização
        </h1>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          fontSize: '1.125rem' 
        }}>
          Monitorize todas as atividades e alterações na sua organização
        </p>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            ...glassStyle,
            padding: '1.5rem',
            marginBottom: '2rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <AlertCircle size={24} style={{ color: '#f87171' }} />
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: '#f87171' }}>Erro ao carregar registos</p>
            <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.875rem' }}>{error}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            style={{
              marginLeft: 'auto',
              padding: '0.5rem 1rem',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <RefreshCw size={16} />
            Tentar novamente
          </motion.button>
        </motion.div>
      )}

      {/* Refresh Button */}
      {!error && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw size={18} />
            Atualizar
          </motion.button>
        </div>
      )}

      {/* Table */}
      {!error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            ...glassStyle,
            overflow: 'hidden'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ background: 'rgba(59,130,246,0.15)' }}>
                  {columns.map(col => (
                    <th 
                      key={col.key} 
                      style={{ 
                        padding: '1rem', 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)', 
                        textAlign: 'left', 
                        fontWeight: 600, 
                        color: '#93c5fd',
                        fontSize: '0.875rem'
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && !loading && (
                  <tr>
                    <td 
                      colSpan={columns.length} 
                      style={{ 
                        padding: '3rem 2rem', 
                        textAlign: 'center', 
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontSize: '1.125rem'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '1rem' 
                      }}>
                        <Activity size={48} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                        Nenhuma ação registada ainda.
                      </div>
                    </td>
                  </tr>
                )}
                {logs.map((log, index) => (
                  <motion.tr
                    key={log.id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.2s'
                    }}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                  >
                    <td style={{ 
                      padding: '1rem', 
                      color: '#bae6fd', 
                      fontSize: '0.875rem' 
                    }}>
                      {formatDate(log.timestamp)}
                    </td>
                    <td style={{ 
                      padding: '1rem', 
                      fontSize: '0.875rem' 
                    }}>
                      {log.user || 'Desconhecido'}
                    </td>
                    <td style={{ 
                      padding: '1rem', 
                      fontSize: '0.875rem' 
                    }}>
                      <span 
                        style={{ 
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: '#fbbf2420',
                          color: '#fbbf24',
                          border: '1px solid #fbbf2440'
                        }}
                      >
                        {log.action_type || 'N/A'}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '1rem', 
                      color: '#fff', 
                      fontSize: '0.875rem',
                      maxWidth: '400px'
                    }}>
                      {log.action_description}
                    </td>
                    <td style={{ 
                      padding: '1rem', 
                      color: '#a5b4fc', 
                      fontSize: '0.875rem' 
                    }}>
                      {log.related_object_type || '-'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
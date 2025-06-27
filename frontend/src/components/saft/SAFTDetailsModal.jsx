// frontend/src/components/saft/SAFTDetailsModal.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Calendar, Building, Hash, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import api from '../../api';

const SAFTDetailsModal = ({ isOpen, onClose, saftFileId }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && saftFileId) {
      fetchDetails();
    }
  }, [isOpen, saftFileId]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/saft-files/${saftFileId}/details/`);
      setDetails(response.data);
    } catch (err) {
      console.error('Error fetching SAFT details:', err);
      if (err.response?.status === 401) {
        setError('Sessão expirada. Por favor, faça login novamente.');
      } else {
        const errorMessage = err.response?.data?.error || err.response?.data?.detail || 'Erro ao carregar detalhes do ficheiro';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle size={20} style={{ color: 'rgb(52, 211, 153)' }} />;
      case 'ERROR':
        return <XCircle size={20} style={{ color: 'rgb(239, 68, 68)' }} />;
      case 'PROCESSING':
        return <Loader2 size={20} style={{ color: 'rgb(59, 130, 246)' }} className="animate-spin" />;
      default:
        return <Clock size={20} style={{ color: 'rgb(156, 163, 175)' }} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'COMPLETED': return 'Concluído';
      case 'ERROR': return 'Erro';
      case 'PROCESSING': return 'A processar';
      case 'PENDING': return 'Pendente';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-PT');
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem'
            }}
          >
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...glassStyle,
                width: '100%',
                maxWidth: '56rem',
                maxHeight: '90vh',
                color: 'white',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    padding: '0.5rem',
                    background: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}>
                    <FileText size={24} style={{ color: 'rgb(59, 130, 246)' }} />
                  </div>
                  <div>
                    <h2 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      margin: 0,
                      color: 'white'
                    }}>
                      Detalhes do Ficheiro SAFT-PT
                    </h2>
                    {details && (
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        margin: '0.25rem 0 0 0'
                      }}>
                        {details.original_filename}
                      </p>
                    )}
                  </div>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  style={{
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: 'rgba(255, 255, 255, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              {/* Content */}
              <div style={{
                padding: '1.5rem',
                overflowY: 'auto',
                maxHeight: 'calc(90vh - 140px)'
              }}>
                {loading ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem',
                    gap: '1rem'
                  }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59, 130, 246)' }} />
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
                      A carregar detalhes do ficheiro...
                    </p>
                  </div>
                ) : error ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem',
                    gap: '1rem'
                  }}>
                    <XCircle size={48} style={{ color: 'rgb(239, 68, 68)' }} />
                    <p style={{ color: 'rgb(239, 68, 68)', margin: 0, textAlign: 'center' }}>
                      {error}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={fetchDetails}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px',
                        color: 'rgb(59, 130, 246)',
                        cursor: 'pointer'
                      }}
                    >
                      Tentar Novamente
                    </motion.button>
                  </div>
                ) : details ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Status Section */}
                    <div style={{ ...glassStyle, padding: '1rem' }}>
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: '500',
                        color: 'white',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        Estado do Processamento
                      </h3>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: details.processing_log ? '1rem' : 0
                      }}>
                        {getStatusIcon(details.status)}
                        <span style={{ fontWeight: '500', color: 'white' }}>
                          {getStatusText(details.status)}
                        </span>
                      </div>
                      {details.processing_log && (
                        <div style={{
                          background: 'rgba(0, 0, 0, 0.2)',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontSize: '0.875rem',
                            margin: 0,
                            fontFamily: 'monospace'
                          }}>
                            {details.processing_log}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* File Information */}
                    <div style={{ ...glassStyle, padding: '1rem' }}>
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: '500',
                        color: 'white',
                        marginBottom: '1rem'
                      }}>
                        Informações do Ficheiro
                      </h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem'
                      }}>
                        <div>
                          <label style={{
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            color: 'rgba(255, 255, 255, 0.6)',
                            display: 'block',
                            marginBottom: '0.25rem'
                          }}>
                            Nome Original
                          </label>
                          <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                            {details.original_filename || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label style={{
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            color: 'rgba(255, 255, 255, 0.6)',
                            display: 'block',
                            marginBottom: '0.25rem'
                          }}>
                            Tamanho
                          </label>
                          <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                            {details.file_size_kb ? `${(details.file_size_kb / 1024).toFixed(2)} MB` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label style={{
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            color: 'rgba(255, 255, 255, 0.6)',
                            display: 'block',
                            marginBottom: '0.25rem'
                          }}>
                            Enviado em
                          </label>
                          <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                            {formatDateTime(details.uploaded_at)}
                          </p>
                        </div>
                        <div>
                          <label style={{
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            color: 'rgba(255, 255, 255, 0.6)',
                            display: 'block',
                            marginBottom: '0.25rem'
                          }}>
                            Processado em
                          </label>
                          <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                            {formatDateTime(details.processed_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Company & Period Information */}
                    {(details.company_name || details.fiscal_year) && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.5rem'
                      }}>
                        {/* Company Info */}
                        {(details.company_name || details.company_tax_id) && (
                          <div style={{ ...glassStyle, padding: '1rem' }}>
                            <h3 style={{
                              fontSize: '1.1rem',
                              fontWeight: '500',
                              color: 'white',
                              marginBottom: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <Building size={20} />
                              Empresa
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div>
                                <label style={{
                                  fontSize: '0.8rem',
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  display: 'block',
                                  marginBottom: '0.25rem'
                                }}>
                                  Nome
                                </label>
                                <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                                  {details.company_name || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <label style={{
                                  fontSize: '0.8rem',
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  display: 'block',
                                  marginBottom: '0.25rem'
                                }}>
                                  NIF
                                </label>
                                <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                                  {details.company_tax_id || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Period Info */}
                        {details.fiscal_year && (
                          <div style={{ ...glassStyle, padding: '1rem' }}>
                            <h3 style={{
                              fontSize: '1.1rem',
                              fontWeight: '500',
                              color: 'white',
                              marginBottom: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <Calendar size={20} />
                              Período Fiscal
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div>
                                <label style={{
                                  fontSize: '0.8rem',
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  display: 'block',
                                  marginBottom: '0.25rem'
                                }}>
                                  Ano Fiscal
                                </label>
                                <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                                  {details.fiscal_year}
                                </p>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                  <label style={{
                                    fontSize: '0.8rem',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    display: 'block',
                                    marginBottom: '0.25rem'
                                  }}>
                                    Início
                                  </label>
                                  <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                                    {formatDate(details.start_date)}
                                  </p>
                                </div>
                                <div>
                                  <label style={{
                                    fontSize: '0.8rem',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    display: 'block',
                                    marginBottom: '0.25rem'
                                  }}>
                                    Fim
                                  </label>
                                  <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                                    {formatDate(details.end_date)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Financial Summary */}
                    {details.summary_data && Object.keys(details.summary_data).length > 0 && (
                      <div style={{ ...glassStyle, padding: '1rem' }}>
                        <h3 style={{
                          fontSize: '1.1rem',
                          fontWeight: '500',
                          color: 'white',
                          marginBottom: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Hash size={20} />
                          Resumo Financeiro
                        </h3>
                        
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <div style={{
                            background: 'rgba(52, 211, 153, 0.1)',
                            border: '1px solid rgba(52, 211, 153, 0.3)',
                            padding: '1rem',
                            borderRadius: '8px',
                            textAlign: 'center'
                          }}>
                            <p style={{
                              fontSize: '0.8rem',
                              color: 'rgba(255, 255, 255, 0.6)',
                              margin: '0 0 0.5rem 0'
                            }}>
                              Total Bruto
                            </p>
                            <p style={{
                              fontSize: '1.2rem',
                              fontWeight: '600',
                              color: 'rgb(52, 211, 153)',
                              margin: 0
                            }}>
                              {formatCurrency(details.summary_data.total_gross)}
                            </p>
                          </div>
                          
                          <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            padding: '1rem',
                            borderRadius: '8px',
                            textAlign: 'center'
                          }}>
                            <p style={{
                              fontSize: '0.8rem',
                              color: 'rgba(255, 255, 255, 0.6)',
                              margin: '0 0 0.5rem 0'
                            }}>
                              Total Líquido
                            </p>
                            <p style={{
                              fontSize: '1.2rem',
                              fontWeight: '600',
                              color: 'rgb(59, 130, 246)',
                              margin: 0
                            }}>
                              {formatCurrency(details.summary_data.total_net)}
                            </p>
                          </div>
                          
                          <div style={{
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            padding: '1rem',
                            borderRadius: '8px',
                            textAlign: 'center'
                          }}>
                            <p style={{
                              fontSize: '0.8rem',
                              color: 'rgba(255, 255, 255, 0.6)',
                              margin: '0 0 0.5rem 0'
                            }}>
                              Impostos
                            </p>
                            <p style={{
                              fontSize: '1.2rem',
                              fontWeight: '600',
                              color: 'rgb(251, 191, 36)',
                              margin: 0
                            }}>
                              {formatCurrency(details.summary_data.total_tax)}
                            </p>
                          </div>
                          
                          {details.summary_data.invoice_count && (
                            <div style={{
                              background: 'rgba(168, 85, 247, 0.1)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              padding: '1rem',
                              borderRadius: '8px',
                              textAlign: 'center'
                            }}>
                              <p style={{
                                fontSize: '0.8rem',
                                color: 'rgba(255, 255, 255, 0.6)',
                                margin: '0 0 0.5rem 0'
                              }}>
                                Nº Faturas
                              </p>
                              <p style={{
                                fontSize: '1.2rem',
                                fontWeight: '600',
                                color: 'rgb(168, 85, 247)',
                                margin: 0
                              }}>
                                {details.summary_data.invoice_count}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem'
                  }}>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
                      Nenhum detalhe disponível
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SAFTDetailsModal;
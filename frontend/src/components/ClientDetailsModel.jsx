import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, User, Mail, Phone, MapPin, Building, Euro, FileText, 
  Calendar, Tag, Hash, Plus, Search, AlertTriangle, Info, Users,
  Edit3, CheckCircle, XCircle
} from 'lucide-react';

import TagManager from './TagManager';

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '12px'
};

const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  color: 'white',
  fontSize: '0.875rem'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: '500',
  marginBottom: '0.5rem',
  color: 'rgba(255, 255, 255, 0.8)'
};

const ClientDetailsModal = ({ 
  client, 
  users = [], 
  onClose, 
  onSave, 
  permissions 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nif: '',
    email: '',
    phone: '',
    address: '',
    monthly_fee: '',
    notes: '',
    is_active: true,
    account_manager: '',
    fiscal_tags: [] // Novo campo para tags fiscais
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        nif: client.nif || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        monthly_fee: client.monthly_fee || '',
        notes: client.notes || '',
        is_active: client.is_active !== undefined ? client.is_active : true,
        account_manager: client.account_manager || '',
        fiscal_tags: Array.isArray(client.fiscal_tags) ? client.fiscal_tags : []
      });
    }
  }, [client]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTagsChange = (newTags) => {
    setFormData(prev => ({
      ...prev,
      fiscal_tags: newTags
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit = permissions.isOrgAdmin || permissions.canEditClients;

  if (!client) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          ...glassStyle,
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
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
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderRadius: '12px'
            }}>
              <User style={{ color: 'rgb(59, 130, 246)' }} size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: 'white' }}>
                {isEditing ? 'Editar Cliente' : 'Detalhes do Cliente'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                {client.name}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {canEdit && !isEditing && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(147, 51, 234, 0.2)',
                  border: '1px solid rgba(147, 51, 234, 0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Edit3 size={16} />
                Editar
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              style={{
                padding: '0.5rem',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {/* Informações Básicas */}
            <div>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Building size={18} style={{ color: 'rgb(59, 130, 246)' }} />
                Informações Básicas
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Nome *</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      style={inputStyle}
                      required
                    />
                  ) : (
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}>
                      {client.name || 'Não informado'}
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>NIF</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="nif"
                      value={formData.nif}
                      onChange={handleInputChange}
                      style={inputStyle}
                    />
                  ) : (
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}>
                      {client.nif || 'Não informado'}
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Avença Mensal (€)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="monthly_fee"
                      value={formData.monthly_fee}
                      onChange={handleInputChange}
                      style={inputStyle}
                      step="0.01"
                      min="0"
                    />
                  ) : (
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}>
                      {client.monthly_fee ? `${client.monthly_fee} €` : 'Não definida'}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <input
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <label htmlFor="is_active" style={{
                      fontSize: '0.875rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Cliente Ativo
                    </label>
                  </div>
                )}

                {!isEditing && (
                  <div>
                    <label style={labelStyle}>Status</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {client.is_active ? (
                        <CheckCircle size={16} style={{ color: 'rgb(52, 211, 153)' }} />
                      ) : (
                        <XCircle size={16} style={{ color: 'rgb(239, 68, 68)' }} />
                      )}
                      <span style={{
                        color: client.is_active ? 'rgb(52, 211, 153)' : 'rgb(239, 68, 68)',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {client.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Informações de Contacto */}
            <div>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Mail size={18} style={{ color: 'rgb(52, 211, 153)' }} />
                Informações de Contacto
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      style={inputStyle}
                    />
                  ) : (
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}>
                      {client.email || 'Não informado'}
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Telefone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      style={inputStyle}
                    />
                  ) : (
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem'
                    }}>
                      {client.phone || 'Não informado'}
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Morada</label>
                  {isEditing ? (
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      style={{
                        ...inputStyle,
                        resize: 'vertical'
                      }}
                    />
                  ) : (
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem',
                      minHeight: '4rem'
                    }}>
                      {client.address || 'Não informado'}
                    </div>
                  )}
                </div>

                {users.length > 0 && (
                  <div>
                    <label style={labelStyle}>Gestor de Conta</label>
                    {isEditing ? (
                      <select
                        name="account_manager"
                        value={formData.account_manager}
                        onChange={handleInputChange}
                        style={inputStyle}
                      >
                        <option value="">Selecionar gestor</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.username}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}>
                        {client.account_manager_name || 'Não atribuído'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags Fiscais */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Tag size={18} style={{ color: 'rgb(147, 51, 234)' }} />
              Tags Fiscais
            </h3>

            <div style={{
              ...glassStyle,
              padding: '1rem',
              background: 'rgba(147, 51, 234, 0.05)',
              border: '1px solid rgba(147, 51, 234, 0.2)'
            }}>
              <p style={{
                margin: '0 0 1rem 0',
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                As tags fiscais são usadas para categorizar o cliente e determinar automaticamente 
                as obrigações fiscais aplicáveis.
              </p>

              <TagManager
                selectedTags={formData.fiscal_tags}
                onChange={handleTagsChange}
                disabled={!isEditing}
                placeholder="Adicionar tags fiscais ao cliente..."
                showDescription={true}
                maxTags={10}
              />

              {formData.fiscal_tags.length > 0 && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <Info size={14} style={{ color: 'rgb(59, 130, 246)' }} />
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      color: 'rgb(59, 130, 246)'
                    }}>
                      IMPACTO DAS TAGS:
                    </span>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    lineHeight: 1.4
                  }}>
                    Com estas tags, o sistema irá gerar automaticamente tarefas para obrigações 
                    como IVA, IRC, e outras específicas do perfil fiscal deste cliente.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FileText size={18} style={{ color: 'rgb(251, 191, 36)' }} />
              Observações
            </h3>

            {isEditing ? (
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                style={{
                  ...inputStyle,
                  resize: 'vertical'
                }}
                placeholder="Observações sobre o cliente..."
              />
            ) : (
              <div style={{
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem',
                minHeight: '5rem',
                whiteSpace: 'pre-wrap'
              }}>
                {client.notes || 'Sem observações registadas.'}
              </div>
            )}
          </div>

          {/* Informações do Sistema */}
          {!isEditing && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Calendar size={18} style={{ color: 'rgb(156, 163, 175)' }} />
                Informações do Sistema
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.25rem'
                  }}>
                    Criado em
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'white',
                    fontWeight: '500'
                  }}>
                    {client.created_at ? new Date(client.created_at).toLocaleDateString('pt-PT') : 'N/A'}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.25rem'
                  }}>
                    Última atualização
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'white',
                    fontWeight: '500'
                  }}>
                    {client.updated_at ? new Date(client.updated_at).toLocaleDateString('pt-PT') : 'N/A'}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '0.25rem'
                  }}>
                    ID do Cliente
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'white',
                    fontWeight: '500',
                    fontFamily: 'monospace'
                  }}>
                    {client.id}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {isEditing && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            padding: '1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setIsEditing(false);
                // Reset form data to original client data
                setFormData({
                  name: client.name || '',
                  nif: client.nif || '',
                  email: client.email || '',
                  phone: client.phone || '',
                  address: client.address || '',
                  monthly_fee: client.monthly_fee || '',
                  notes: client.notes || '',
                  is_active: client.is_active !== undefined ? client.is_active : true,
                  account_manager: client.account_manager || '',
                  fiscal_tags: Array.isArray(client.fiscal_tags) ? client.fiscal_tags : []
                });
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(52, 211, 153, 0.2)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: isSaving ? 0.7 : 1
              }}
            >
              {isSaving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Save size={16} />
                  </motion.div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar Alterações
                </>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Custom styles */}
      <style jsx>{`
        input::placeholder, textarea::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }
        
        select option {
          background: #1f2937 !important;
          color: white !important;
        }
        
        /* Scrollbar customization */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        /* Focus states for accessibility */
        button:focus, input:focus, select:focus, textarea:focus {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }
        
        /* Smooth transitions */
        * {
          transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease;
        }
        
        /* Loading animation */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </motion.div>
  );
};

// Demo component
const ClientDetailsModalDemo = () => {
  const [showModal, setShowModal] = useState(true);
  
  const mockClient = {
    id: '12345',
    name: 'Empresa Exemplo Lda',
    nif: '123456789',
    email: 'contacto@exemplo.pt',
    phone: '+351 912 345 678',
    address: 'Rua das Flores, 123\n4000-000 Porto\nPortugal',
    monthly_fee: '150.00',
    notes: 'Cliente desde 2020.\nEmpresa de tecnologia com crescimento constante.\nRequer atenção especial durante período de IVA.',
    is_active: true,
    account_manager: '1',
    account_manager_name: 'João Silva',
    fiscal_tags: ['EMPRESA', 'IVA_TRIMESTRAL', 'REGIME_GERAL_IRC'],
    created_at: '2020-03-15T10:30:00Z',
    updated_at: '2024-12-10T15:45:00Z'
  };

  const mockUsers = [
    { id: '1', username: 'João Silva' },
    { id: '2', username: 'Maria Santos' },
    { id: '3', username: 'Pedro Costa' }
  ];

  const mockPermissions = {
    isOrgAdmin: true,
    canEditClients: true,
    canManageClients: true
  };

  const handleSave = async (formData) => {
    console.log('Saving client data:', formData);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert('Cliente atualizado com sucesso!');
  };

  if (!showModal) {
    return (
      <div style={{
        padding: '2rem',
        background: 'linear-gradient(135deg, rgb(47, 106, 201) 0%, rgb(60, 21, 97) 50%, rgb(8, 134, 156) 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '1rem 2rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Abrir Modal de Cliente
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgb(47, 106, 201) 0%, rgb(60, 21, 97) 50%, rgb(8, 134, 156) 100%)',
      minHeight: '100vh'
    }}>
      <AnimatePresence>
        {showModal && (
          <ClientDetailsModal
            client={mockClient}
            users={mockUsers}
            onClose={() => setShowModal(false)}
            onSave={handleSave}
            permissions={mockPermissions}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientDetailsModalDemo;
                
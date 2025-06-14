import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Save, User, Mail, Phone, MapPin, Building, Euro, FileText, 
  Calendar, Tag, Info, Edit3, Loader2, CheckCircle, XCircle 
} from 'lucide-react';
import TagInput from './TagInput'; // Usando nosso novo componente robusto

// --- Sub-componentes para um código mais limpo ---

const ModalSection = ({ title, icon, children }) => (
  <div style={{ marginBottom: '1.5rem' }}>
    <h3 style={{
      margin: '0 0 1rem 0',
      fontSize: '1.125rem',
      fontWeight: '600',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      paddingBottom: '0.75rem'
    }}>
      {icon}
      {title}
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {children}
    </div>
  </div>
);

const DisplayField = ({ label, value, type = 'text' }) => {
  let displayValue = value || 'Não informado';
  if (type === 'currency' && value) {
    displayValue = `${parseFloat(value).toFixed(2)} €`;
  }

  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: '0.25rem'
      }}>
        {label}
      </label>
      <div style={{
        color: 'white',
        fontSize: '0.875rem',
        fontWeight: '500',
        whiteSpace: 'pre-wrap'
      }}>
        {displayValue}
      </div>
    </div>
  );
};

const EditField = ({ label, name, value, onChange, type = 'text', required = false, rows = 3 }) => {
  const commonStyles = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.875rem'
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
        {label}{required && ' *'}
      </label>
      {type === 'textarea' ? (
        <textarea name={name} value={value} onChange={onChange} style={{ ...commonStyles, resize: 'vertical' }} rows={rows} />
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} style={commonStyles} required={required} />
      )}
    </div>
  );
};

// --- Componente Principal ---

const ClientDetailsModal = ({ client, users = [], onClose, onSave, permissions }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({});

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
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleTagsChange = (newTags) => {
    setFormData(prev => ({ ...prev, fiscal_tags: newTags }));
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
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original client data
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
  };

  const canEdit = permissions.isOrgAdmin || permissions.canEditClients;

  if (!client) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem',
        marginTop: '4rem', borderRadius: '16px', overflow: 'hidden'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto',
          background: 'rgba(17, 24, 39, 0.9)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px',
          display: 'flex', flexDirection: 'column'
        }}
        className="custom-scrollbar"
      >
        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'sticky', top: 0, background: 'rgba(17, 24, 39, 0.8)', zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
              <Building style={{ color: 'rgb(96, 165, 250)' }} size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'white' }}>
                {isEditing ? 'Editar Cliente' : 'Detalhes do Cliente'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>{client.name}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {canEdit && !isEditing && (
              <motion.button onClick={() => setIsEditing(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{ padding: '0.5rem 1rem', background: 'rgba(147, 51, 234, 0.2)', border: '1px solid rgba(147, 51, 234, 0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={16} /> Editar
              </motion.button>
            )}
            <motion.button onClick={onClose} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
              <X size={20} />
            </motion.button>
          </div>
        </header>

        {/* Content */}
        <main style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
          {/* Coluna Esquerda */}
          <div>
            <ModalSection title="Informações Básicas" icon={<User size={18} style={{ color: 'rgb(96, 165, 250)' }} />}>
              {isEditing ? <>
                <EditField label="Nome" name="name" value={formData.name} onChange={handleInputChange} required />
                <EditField label="NIF" name="nif" value={formData.nif} onChange={handleInputChange} />
                <EditField label="Avença Mensal (€)" name="monthly_fee" value={formData.monthly_fee} onChange={handleInputChange} type="number" />
              </> : <>
                <DisplayField label="Nome" value={formData.name} />
                <DisplayField label="NIF" value={formData.nif} />
                <DisplayField label="Avença Mensal" value={formData.monthly_fee} type="currency" />
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '500', color: 'rgba(255, 255, 255, 0.6)' }}>Status</label>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: formData.is_active ? 'rgb(52, 211, 153)' : 'rgb(239, 68, 68)', fontWeight: '500' }}>
                    {formData.is_active ? <CheckCircle size={16} /> : <XCircle size={16} />} {formData.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </>}
            </ModalSection>
            
            <ModalSection title="Informações de Contacto" icon={<Mail size={18} style={{ color: 'rgb(52, 211, 153)' }} />}>
              {isEditing ? <>
                <EditField label="Email" name="email" value={formData.email} onChange={handleInputChange} type="email" />
                <EditField label="Telefone" name="phone" value={formData.phone} onChange={handleInputChange} type="tel" />
                <EditField label="Morada" name="address" value={formData.address} onChange={handleInputChange} type="textarea" />
              </> : <>
                <DisplayField label="Email" value={formData.email} />
                <DisplayField label="Telefone" value={formData.phone} />
                <DisplayField label="Morada" value={formData.address} />
              </>}
            </ModalSection>
          </div>

          {/* Coluna Direita */}
          <div>
            <ModalSection title="Tags Fiscais" icon={<Tag size={18} style={{ color: 'rgb(196, 181, 253)' }} />}>
              <TagInput tags={formData.fiscal_tags} onTagsChange={handleTagsChange} disabled={!isEditing} />
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgb(96, 165, 250)', fontWeight: '600' }}>
                    <Info size={16} />
                    IMPACTO DAS TAGS
                  </div>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.5 }}>
                    Com estas tags, o sistema irá gerar automaticamente tarefas para obrigações como IVA, IRC, etc.
                  </p>
              </div>
            </ModalSection>
            
            <ModalSection title="Observações" icon={<FileText size={18} style={{ color: 'rgb(251, 191, 36)' }} />}>
              {isEditing ? (
                <EditField name="notes" value={formData.notes} onChange={handleInputChange} type="textarea" rows={5} />
              ) : (
                <DisplayField label="" value={formData.notes} />
              )}
            </ModalSection>
            
            {isEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <input type="checkbox" id="is_active_edit" name="is_active" checked={formData.is_active} onChange={handleInputChange} style={{ width: '18px', height: '18px' }} />
                    <label htmlFor="is_active_edit" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Cliente Ativo</label>
                </div>
            )}
          </div>
        </main>
        
        {/* Footer */}
        {isEditing ? (
            <footer style={{
                display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(17, 24, 39, 0.8)'
            }}>
                <motion.button onClick={handleCancelEdit} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    style={{ padding: '0.75rem 1.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                    Cancelar
                </motion.button>
                <motion.button onClick={handleSave} disabled={isSaving} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    style={{ padding: '0.75rem 1.5rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {isSaving ? 'Salvando...' : 'Salvar'}
                </motion.button>
            </footer>
        ) : (
             <footer style={{
                padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'
             }}>
                <DisplayField label="Criado em" value={new Date(client.created_at).toLocaleDateString('pt-PT')} />
                <DisplayField label="Última atualização" value={new Date(client.updated_at).toLocaleDateString('pt-PT')} />
                <DisplayField label="ID do Cliente" value={client.id} />
             </footer>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ClientDetailsModal;
// src/components/client/ClientForm.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, User, Save } from 'lucide-react';
import { useClientStore } from '../../stores/useClientStore';
import TagInput from '../TagInput';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const ClientForm = ({ onSubmit, isSaving }) => {
    // Get state and actions directly from the store
    const { formData, setFormData, selectedClient, closeForm } = useClientStore();

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData); // Parent still handles the mutation call
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
                    <User style={{ color: 'rgb(59, 130, 246)' }} size={20} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                        {selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                        {selectedClient ? 'Atualize as informações do cliente' : 'Adicione um novo cliente ao sistema'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                            Nome *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name || ''} 
                            onChange={setFormData} 
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.875rem'
                            }}
                            placeholder="Nome do cliente"
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                            NIF
                        </label>
                        <input
                            type="text"
                            name="nif"
                            value={formData.nif || ''}
                            onChange={setFormData}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.875rem'
                            }}
                            placeholder="Número de contribuinte"
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email || ''}
                            onChange={setFormData}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.875rem'
                            }}
                            placeholder="email@exemplo.com"
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                            Telefone
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone || ''}
                            onChange={setFormData}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.875rem'
                            }}
                            placeholder="Número de telefone"
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                            Morada
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address || ''}
                            onChange={setFormData}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.875rem'
                            }}
                            placeholder="Morada completa"
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            marginBottom: '0.5rem',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                            Avença Mensal (€)
                        </label>
                        <input
                            type="number"
                            name="monthly_fee"
                            value={formData.monthly_fee || ''}
                            onChange={setFormData}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.875rem'
                            }}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                        />
                    </div>
                </div>
<div style={{ marginBottom: '1.5rem' }}>
    <label style={{
        display: 'block', fontSize: '0.875rem', fontWeight: '500',
        marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)'
    }}>
        Tags Fiscais
    </label>
    <TagInput
        tags={formData.fiscal_tags || []} // Ensure it's an array
        onTagsChange={(newTags) => setFormData('fiscal_tags', newTags)}
        placeholder="Adicionar tag fiscal e Enter"
    />
</div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        marginBottom: '0.5rem',
                        color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                        Observações
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes || ''}
                        onChange={setFormData}
                        rows={3}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.875rem',
                            resize: 'vertical'
                        }}
                        placeholder="Notas adicionais sobre o cliente..."
                    />
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1.5rem'
                }}>
                    <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        checked={formData.is_active || false}
                        onChange={setFormData}
                        style={{ width: '18px', height: '18px' }}
                    />
                    <label htmlFor="is_active" style={{
                        fontSize: '0.875rem',
                        color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                        Cliente Ativo
                    </label>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end'
                }}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={closeForm}
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
                        type="submit"
                        disabled={isSaving}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        {isSaving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                        <Save size={16} />
                        {selectedClient ? 'Atualizar' : 'Criar'} Cliente
                    </motion.button>
                </div>
            </form>
        </motion.div>
    );
};

export default ClientForm;
// src/components/client/ClientCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  User, Edit, Trash2, Clock, FileText, DollarSign,
  BarChart2, XCircle, CheckCircle, ArrowRight, Tag,
  Phone, Mail, MapPin
} from "lucide-react";

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const ClientCard = ({ client, onEdit, onToggleStatus, onDelete, permissions, onClick }) => {
    const { isOrgAdmin, canEditClients, canChangeClientStatus, canDeleteClients } = permissions;

    const fiscalTagsToDisplay = Array.isArray(client.fiscal_tags) ? client.fiscal_tags : [];

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            style={{
                ...glassStyle,
                padding: '1.5rem',
                cursor: 'pointer',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                opacity: client.is_active ? 1 : 0.7,
                background: client.is_active ? 'rgba(255, 255, 255, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: client.is_active ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(239, 68, 68, 0.2)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{
                    width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem',
                    color: 'rgb(59, 130, 246)', fontWeight: '600'
                }}>
                    <User size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: 'white' }}>
                        {client.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{
                            padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600',
                            background: client.is_active ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            border: client.is_active ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                            color: client.is_active ? 'rgb(110, 231, 183)' : 'rgb(252, 165, 165)'
                        }}>
                            {client.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        {client.nif && (
                            <span style={{
                                padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600',
                                background: 'rgba(147, 51, 234, 0.2)', border: '1px solid rgba(147, 51, 234, 0.3)',
                                color: 'rgb(196, 181, 253)'
                            }}>
                                NIF: {client.nif}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {client.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                        <Mail size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                        <span>{client.email}</span>
                    </div>
                )}
                {client.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                        <Phone size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                        <span>{client.phone}</span>
                    </div>
                )}
                {client.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                        <MapPin size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {client.address}
                        </span>
                    </div>
                )}
            </div>

            {fiscalTagsToDisplay.length > 0 && (
                <div style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Tag size={16} style={{ color: 'rgb(147, 51, 234)' }} />
                        <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>
                            Tags Fiscais:
                        </h4>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {fiscalTagsToDisplay.slice(0, 3).map((tag, index) => (
                            <span key={index} style={{
                                padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '500',
                                background: 'rgba(147, 51, 234, 0.2)', border: '1px solid rgba(147, 51, 234, 0.3)',
                                color: 'rgb(196, 181, 253)',
                            }}>
                                {tag}
                            </span>
                        ))}
                        {fiscalTagsToDisplay.length > 3 && (
                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', alignSelf: 'center' }}>
                                +{fiscalTagsToDisplay.length - 3} mais
                            </span>
                        )}
                    </div>
                </div>
            )}
            
            <div style={{ marginTop: 'auto' }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', marginBottom: '1rem'
                }}>
                    <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Avença Mensal:</span>
                    <span style={{ fontSize: '1rem', fontWeight: '600', color: 'rgb(52, 211, 153)' }}>
                        {client.monthly_fee ? `${client.monthly_fee} €` : 'Não definida'}
                    </span>
                </div>

                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {(isOrgAdmin || canEditClients) && (
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                                style={{ background: 'rgba(147, 51, 234, 0.2)', border: '1px solid rgba(147, 51, 234, 0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(147, 51, 234)', cursor: 'pointer' }} title="Editar cliente">
                                <Edit size={16} />
                            </motion.button>
                        )}
                        {(isOrgAdmin || canChangeClientStatus) && (
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onToggleStatus(client); }}
                                style={{
                                    background: client.is_active ? 'rgba(251, 146, 60, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                                    border: client.is_active ? '1px solid rgba(251, 146, 60, 0.3)' : '1px solid rgba(52, 211, 153, 0.3)',
                                    borderRadius: '6px', padding: '0.5rem', color: client.is_active ? 'rgb(251, 146, 60)' : 'rgb(52, 211, 153)', cursor: 'pointer'
                                }} title={client.is_active ? "Desativar" : "Ativar"}>
                                {client.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            </motion.button>
                        )}
                        {(isOrgAdmin || canDeleteClients) && (
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onDelete(client.id); }}
                                style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(239, 68, 68)', cursor: 'pointer' }} title="Excluir cliente">
                                <Trash2 size={16} />
                            </motion.button>
                        )}
                    </div>

                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer'
                        }}>
                        Detalhes <ArrowRight size={14} />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default ClientCard;
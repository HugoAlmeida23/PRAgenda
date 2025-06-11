import React from 'react';
import { motion } from 'framer-motion';
import { Archive, Edit, Trash2, Tag, Settings, Briefcase, Clock, CheckCircle, AlertTriangle, Workflow } from 'lucide-react';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    color: 'white',
};

const FiscalObligationCard = ({ definition, onEdit, onDelete, permissions }) => {
    const {
        id, name, description, periodicity, deadline_day, deadline_month_offset,
        generation_trigger_offset_days, is_active, organization_name,
        default_task_category_name, default_workflow_name, applies_to_client_tags = [],
        default_priority, // Assuming this is an integer from backend
    } = definition;

    const PERIODICITY_LABELS = {
        MONTHLY: 'Mensal', QUARTERLY: 'Trimestral', ANNUAL: 'Anual',
        BIANNUAL: 'Semestral', OTHER: 'Outra',
    };
    const PRIORITY_LABELS = { 1: "Urgente", 2: "Alta", 3: "Média", 4: "Baixa", 5: "Pode Esperar" };
    const PRIORITY_COLORS = { 1: "rgb(239, 68, 68)", 2: "rgb(251, 146, 60)", 3: "rgb(251, 191, 36)", 4: "rgb(59, 130, 246)", 5: "rgba(255,255,255,0.6)" };


    const canManage = permissions.isOrgAdmin || permissions.isSuperuser;

    return (
        <motion.div
            style={{ ...glassStyle, padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}
            whileHover={{ scale: 1.02, y: -3, boxShadow: `0 0 20px rgba(${is_active ? '52, 211, 153' : '239, 68, 68'}, 0.2)` }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.25rem 0', color: 'white' }}>{name}</h2>
                        <span style={{
                            padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '600',
                            background: is_active ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            border: `1px solid ${is_active ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            color: is_active ? 'rgb(52, 211, 153)' : 'rgb(239, 68, 68)'
                        }}>
                            {is_active ? 'Ativa' : 'Inativa'}
                        </span>
                    </div>
                   
                </div>

                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem', minHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {description || 'Sem descrição detalhada.'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>
                    <div style={{display:'flex', alignItems:'center', gap: '0.3rem'}}><Clock size={14} /> <strong>Periodicidade:</strong> {PERIODICITY_LABELS[periodicity] || periodicity}</div>
                    <div style={{display:'flex', alignItems:'center', gap: '0.3rem'}}><CheckCircle size={14} /> <strong>Prazo:</strong> Dia {deadline_day}, {deadline_month_offset} mês(es) após</div>
                    <div style={{display:'flex', alignItems:'center', gap: '0.3rem'}}><AlertTriangle size={14} /> <strong>Gatilho:</strong> {generation_trigger_offset_days} dias antes</div>
                    <div style={{display:'flex', alignItems:'center', gap: '0.3rem'}}>
                        <Tag size={14} /> <strong>Prioridade:</strong>
                        <span style={{ color: PRIORITY_COLORS[default_priority] || PRIORITY_COLORS[3], fontWeight: '500', marginLeft: '0.25rem' }}>
                            {PRIORITY_LABELS[default_priority] || 'Média'}
                        </span>
                    </div>
                    {default_task_category_name && <div style={{display:'flex', alignItems:'center', gap: '0.3rem'}}><Archive size={14} /> <strong>Categoria:</strong> {default_task_category_name}</div>}
                    {default_workflow_name && <div style={{display:'flex', alignItems:'center', gap: '0.3rem'}}><Workflow size={14} /> <strong>Workflow:</strong> {default_workflow_name}</div>}
                </div>

                {applies_to_client_tags && applies_to_client_tags.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)' }}>Tags de Cliente Requeridas:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                            {applies_to_client_tags.map(tag => (
                                <span key={tag} style={{
                                    background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: 'rgb(59, 130, 246)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem'
                                }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {canManage && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <motion.button
                        onClick={() => onEdit(definition)}
                        whileHover={{ scale: 1.05, background: 'rgba(147, 51, 234, 0.3)' }} whileTap={{ scale: 0.95 }}
                        style={{ ...glassStyle, flex: 1, padding: '0.6rem', background: 'rgba(147, 51, 234, 0.2)', border: '1px solid rgba(147, 51, 234, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                    >
                        <Edit size={16} /> Editar
                    </motion.button>
                    <motion.button
                        onClick={() => onDelete(id)}
                        whileHover={{ scale: 1.05, background: 'rgba(239, 68, 68, 0.3)' }} whileTap={{ scale: 0.95 }}
                        style={{ ...glassStyle, flex: 1, padding: '0.6rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                    >
                        <Trash2 size={16} /> Excluir
                    </motion.button>
                </div>
            )}
        </motion.div>
    );
};

export default FiscalObligationCard;
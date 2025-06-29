// src/components/task/WorkflowConfigurationForm.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Workflow, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';

const WorkflowConfigurationForm = ({ workflows = [], users = [], onStepAssignmentChange }) => {
    const {
        selectedWorkflowForForm,
        workflowStepsForForm,
        stepAssignmentsForForm,
        isLoadingWorkflowStepsForForm,
    } = useTaskStore();

    // --- GUARDA DE SEGURANÇA ---
    // Se não houver um workflow selecionado, não renderiza nada.
    if (!selectedWorkflowForForm) {
        return null;
    }

    const selectedWorkflowData = (workflows || []).find(w => w.id === selectedWorkflowForForm);

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{
                background: 'rgba(147, 51, 234, 0.1)',
                border: '1px solid rgba(147, 51, 234, 0.2)',
                borderRadius: '12px',
                padding: '1.5rem',
                marginTop: '1rem'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Workflow size={20} style={{ color: 'rgb(147, 51, 234)' }} />
                <div>
                    <h4 style={{ margin: 0, color: 'white', fontWeight: '600' }}>
                        Configuração do Workflow: {selectedWorkflowData?.name}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                        Atribua responsáveis para cada passo do workflow.
                    </p>
                </div>
            </div>

            {isLoadingWorkflowStepsForForm ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <Loader2 size={24} className="animate-spin" style={{ color: 'rgb(147, 51, 234)' }} />
                    <p style={{ margin: '0.5rem 0 0 0', color: 'rgba(255, 255, 255, 0.7)' }}>Carregando passos...</p>
                </div>
            ) : !workflowStepsForForm || workflowStepsForForm.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '8px' }}>
                    <AlertTriangle size={18} style={{ color: 'rgb(251, 191, 36)', marginBottom: '0.5rem' }}/>
                    <p style={{margin: 0, color: 'rgba(255,255,255,0.8)'}}>Este workflow não tem passos definidos.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {workflowStepsForForm.map((step) => (
                        <div key={step.id} style={{
                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem',
                            background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(147, 51, 234, 0.2)',
                                border: '1px solid rgba(147, 51, 234, 0.3)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', color: 'rgb(147, 51, 234)', fontWeight: '600', fontSize: '0.875rem', flexShrink: 0
                            }}>
                                {step.order}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: '600', color: 'white', marginBottom: '0.25rem' }}>{step.name}</div>
                                {step.description && <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>{step.description}</div>}
                                {step.requires_approval && (
                                    <div style={{ fontSize: '0.75rem', color: 'rgb(251, 191, 36)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <AlertTriangle size={12} /> Requer aprovação: {step.approver_role || 'Necessária'}
                                    </div>
                                )}
                            </div>
                            <div style={{ minWidth: '200px' }}>
                                <select
                                    value={stepAssignmentsForForm[step.id] || ''}
                                    onChange={(e) => onStepAssignmentChange(step.id, e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: 'white', fontSize: '0.875rem'
                                    }}
                                >
                                    <option value="" style={{ background: '#1f2937' }}>{step.assign_to_name || 'Automático'}</option>
                                    {(users || []).map((user) => ( // Adicionada guarda (users || [])
                                        <option key={user.user || user.id} value={user.user || user.id} style={{ background: '#1f2937' }}>
                                            {user.username}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default WorkflowConfigurationForm;
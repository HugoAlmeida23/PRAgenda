import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { toast, ToastContainer } from 'react-toastify';
import { motion } from 'framer-motion';
import { Settings, Bell, Trash2, Clock, Send, Save, Loader2, AlertTriangle, HelpCircle, RefreshCw, Link as LinkIcon } from 'lucide-react';
import BackgroundElements from '../HeroSection/BackgroundElements';
import TagInput from '../TagInput'; // Reusable TagInput
import { usePermissions } from '../../contexts/PermissionsContext';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    color: 'white',
};

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
};

const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
    color: 'rgba(255, 255, 255, 0.8)'
};

const FiscalSystemSettingsPage = () => {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [formData, setFormData] = useState({
        auto_generation_enabled: true,
        generation_time: '08:00',
        months_ahead_generation: 3,
        auto_cleanup_enabled: true,
        cleanup_days_threshold: 30,
        notify_on_generation: true,
        notify_on_errors: true,
        email_notifications_enabled: true,
        notification_recipients: [],
        webhook_url: '',
        webhook_secret: '', // Will be write-only, handled carefully
        advanced_settings: {}, // Default to empty object
    });

    const { data: settings, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['fiscalSystemSettings'],
        queryFn: async () => {
            const response = await api.get('/fiscal-system-settings/my_settings/');
            return response.data;
        },
        enabled: permissions.isOrgAdmin, // Only fetch if user is org admin
        onSuccess: (data) => {
            if (data) {
                setFormData({
                    auto_generation_enabled: data.auto_generation_enabled !== undefined ? data.auto_generation_enabled : true,
                    generation_time: data.generation_time || '08:00',
                    months_ahead_generation: data.months_ahead_generation || 3,
                    auto_cleanup_enabled: data.auto_cleanup_enabled !== undefined ? data.auto_cleanup_enabled : true,
                    cleanup_days_threshold: data.cleanup_days_threshold || 30,
                    notify_on_generation: data.notify_on_generation !== undefined ? data.notify_on_generation : true,
                    notify_on_errors: data.notify_on_errors !== undefined ? data.notify_on_errors : true,
                    email_notifications_enabled: data.email_notifications_enabled !== undefined ? data.email_notifications_enabled : true,
                    notification_recipients: Array.isArray(data.notification_recipients) ? data.notification_recipients : [],
                    webhook_url: data.webhook_url || '',
                    webhook_secret: '', // Never pre-fill secret
                    advanced_settings: typeof data.advanced_settings === 'object' && data.advanced_settings !== null ? data.advanced_settings : {},
                });
            }
        }
    });

    const updateSettingsMutation = useMutation({
        mutationFn: (updatedData) => api.patch('/fiscal-system-settings/update_settings/', updatedData),
        onSuccess: () => {
            toast.success('Configurações fiscais atualizadas com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['fiscalSystemSettings'] });
        },
        onError: (err) => {
            console.error("Error updating settings:", err.response?.data || err.message);
            toast.error(`Falha ao atualizar: ${err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(', ') || err.message}`);
        }
    });
    
    const testWebhookMutation = useMutation({
        mutationFn: () => api.post('/fiscal-system-settings/test_webhook/'),
        onSuccess: (data) => toast.success(data.data.message || 'Webhook testado com sucesso!'),
        onError: (err) => toast.error(`Erro no teste do webhook: ${err.response?.data?.error || err.message}`),
    });

    const sendTestEmailMutation = useMutation({
        mutationFn: () => api.post('/fiscal-system-settings/send_test_email/'),
        onSuccess: (data) => toast.success(data.data.message || 'Email de teste enviado!'),
        onError: (err) => toast.error(`Erro ao enviar email: ${err.response?.data?.error || err.message}`),
    });


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleRecipientsChange = (newRecipients) => {
        setFormData(prev => ({ ...prev, notification_recipients: newRecipients }));
    };
    
    const handleAdvancedSettingsChange = (e) => {
        const { name, value } = e.target;
        try {
            const parsedValue = value ? JSON.parse(value) : {};
            setFormData(prev => ({...prev, advanced_settings: parsedValue }));
        } catch (jsonError) {
            // Handle JSON parsing error, maybe show a message
            console.warn("Invalid JSON for advanced settings:", jsonError);
             toast.warn("JSON inválido para configurações avançadas.");
        }
    };


    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSubmit = { ...formData };
        // Don't send webhook_secret if it's empty (meaning user doesn't want to change it)
        if (!formData.webhook_secret) {
            delete dataToSubmit.webhook_secret;
        }
        // Ensure advanced_settings is an object
        if (typeof dataToSubmit.advanced_settings !== 'object' || dataToSubmit.advanced_settings === null) {
            dataToSubmit.advanced_settings = {};
        }

        updateSettingsMutation.mutate(dataToSubmit);
    };

    if (!permissions.isOrgAdmin && !permissions.loading) {
        return (
            <div style={{ ...glassStyle, padding: '2rem', margin: '2rem auto', maxWidth: '600px', textAlign: 'center' }}>
                <AlertTriangle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
                <h2>Acesso Restrito</h2>
                <p>Apenas administradores da organização podem aceder a estas configurações.</p>
            </div>
        );
    }
    
    if (isLoading && !settings) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'white' }}>
                <Loader2 size={48} className="animate-spin" />
                <span style={{marginLeft: '1rem'}}>Carregando configurações...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div style={{ ...glassStyle, padding: '2rem', margin: '2rem auto', maxWidth: '600px', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.5)' }}>
                <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
                <h2 style={{ margin: '0 0 1rem 0' }}>Erro ao Carregar Configurações</h2>
                <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
                    {error?.response?.data?.detail || error?.message || "Não foi possível carregar os dados."}
                </p>
                <button onClick={() => refetch()} style={{ ...glassStyle, padding: '0.75rem 1.5rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)', cursor: 'pointer' }}>
                    <RefreshCw size={16} style={{marginRight: '0.5rem'}}/> Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', color: 'white', minHeight: '100vh', position: 'relative' }}>
            <BackgroundElements />
            <ToastContainer position="top-right" autoClose={4000} theme="dark" />

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ maxWidth: '900px', margin: '0 auto' }}
            >
                <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(147, 51, 234, 0.2)', borderRadius: '12px', border: '1px solid rgba(147, 51, 234, 0.3)' }}>
                        <Settings size={28} style={{ color: 'rgb(147, 51, 234)' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0 }}>Configurações do Sistema Fiscal</h1>
                        <p style={{ color: 'rgba(191, 219, 254, 1)', margin: 0 }}>
                            Ajuste o comportamento da geração de obrigações e notificações.
                        </p>
                    </div>
                </header>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Geração Automática */}
                        <motion.section style={{ ...glassStyle, padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}><Clock size={20}/>Geração Automática</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" name="auto_generation_enabled" id="auto_generation_enabled" checked={formData.auto_generation_enabled} onChange={handleChange} style={{width: '18px', height: '18px'}} />
                                    <label htmlFor="auto_generation_enabled" style={labelStyle}>Ativar Geração Automática</label>
                                </div>
                                <div>
                                    <label htmlFor="generation_time" style={labelStyle}>Horário da Geração</label>
                                    <input type="time" name="generation_time" id="generation_time" value={formData.generation_time} onChange={handleChange} style={inputStyle} disabled={!formData.auto_generation_enabled} />
                                </div>
                                <div>
                                    <label htmlFor="months_ahead_generation" style={labelStyle}>Gerar para Meses Futuros</label>
                                    <input type="number" name="months_ahead_generation" id="months_ahead_generation" value={formData.months_ahead_generation} onChange={handleChange} min="1" max="12" style={inputStyle} />
                                </div>
                            </div>
                        </motion.section>

                        {/* Limpeza Automática */}
                        <motion.section style={{ ...glassStyle, padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}><Trash2 size={20}/>Limpeza Automática</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" name="auto_cleanup_enabled" id="auto_cleanup_enabled" checked={formData.auto_cleanup_enabled} onChange={handleChange} style={{width: '18px', height: '18px'}}/>
                                    <label htmlFor="auto_cleanup_enabled" style={labelStyle}>Ativar Limpeza Automática</label>
                                </div>
                                <div>
                                    <label htmlFor="cleanup_days_threshold" style={labelStyle}>Considerar Obsoleto Após (dias)</label>
                                    <input type="number" name="cleanup_days_threshold" id="cleanup_days_threshold" value={formData.cleanup_days_threshold} onChange={handleChange} min="1" max="365" style={inputStyle} disabled={!formData.auto_cleanup_enabled}/>
                                </div>
                            </div>
                        </motion.section>

                        {/* Notificações */}
                        <motion.section style={{ ...glassStyle, padding: '1.5rem' }}>
                             <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}><Bell size={20}/>Notificações</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" name="notify_on_generation" id="notify_on_generation" checked={formData.notify_on_generation} onChange={handleChange} style={{width: '18px', height: '18px'}}/>
                                    <label htmlFor="notify_on_generation" style={labelStyle}>Notificar Conclusão da Geração</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" name="notify_on_errors" id="notify_on_errors" checked={formData.notify_on_errors} onChange={handleChange} style={{width: '18px', height: '18px'}}/>
                                    <label htmlFor="notify_on_errors" style={labelStyle}>Notificar Erros na Geração</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" name="email_notifications_enabled" id="email_notifications_enabled" checked={formData.email_notifications_enabled} onChange={handleChange} style={{width: '18px', height: '18px'}}/>
                                    <label htmlFor="email_notifications_enabled" style={labelStyle}>Ativar Notificações por Email</label>
                                </div>
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <label htmlFor="notification_recipients" style={labelStyle}>Destinatários de Email (separar por Enter)</label>
                                <TagInput
                                    tags={formData.notification_recipients}
                                    onTagsChange={handleRecipientsChange}
                                    placeholder="Adicionar email e pressionar Enter"
                                    inputType="email"
                                    validationRegex={/^[^\s@]+@[^\s@]+\.[^\s@]+$/} // Basic email regex
                                    validationMessage="Por favor, insira um email válido."
                                />
                                <button type="button" onClick={() => sendTestEmailMutation.mutate()} disabled={sendTestEmailMutation.isPending || !formData.email_notifications_enabled || formData.notification_recipients.length === 0} style={{...inputStyle, width:'auto', padding: '0.5rem 1rem', marginTop:'0.5rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', cursor: 'pointer', display:'flex', alignItems:'center', gap:'0.5rem'}} >
                                    {sendTestEmailMutation.isPending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Enviar Email de Teste
                                </button>
                            </div>
                        </motion.section>
                        
                        {/* Integração Webhook */}
                        {/* <motion.section style={{ ...glassStyle, padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}><LinkIcon size={20}/>Integração Webhook</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div>
                                    <label htmlFor="webhook_url" style={labelStyle}>URL do Webhook (Opcional)</label>
                                    <input type="url" name="webhook_url" id="webhook_url" value={formData.webhook_url} onChange={handleChange} style={inputStyle} placeholder="https://seu-servico.com/webhook"/>
                                </div>
                                <div>
                                    <label htmlFor="webhook_secret" style={labelStyle}>Segredo do Webhook (Opcional - Deixe em branco para não alterar)</label>
                                    <input type="password" name="webhook_secret" id="webhook_secret" value={formData.webhook_secret} onChange={handleChange} style={inputStyle} placeholder="Digite um novo segredo se desejar alterar"/>
                                </div>
                                 <button type="button" onClick={() => testWebhookMutation.mutate()} disabled={testWebhookMutation.isPending || !formData.webhook_url} style={{...inputStyle, width:'auto', padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', cursor: 'pointer', display:'flex', alignItems:'center', gap:'0.5rem'}} >
                                    {testWebhookMutation.isPending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>} Testar Webhook
                                </button>
                            </div>
                        </motion.section> */}

                        {/* Configurações Avançadas */}
                         {/* <motion.section style={{ ...glassStyle, padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                                <HelpCircle size={20}/>Configurações Avançadas (JSON)
                            </h2>
                            <textarea
                                name="advanced_settings"
                                value={typeof formData.advanced_settings === 'string' ? formData.advanced_settings : JSON.stringify(formData.advanced_settings, null, 2)}
                                onChange={handleAdvancedSettingsChange}
                                rows={5}
                                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', fontFamily: 'monospace' }}
                                placeholder='{ "exemplo_config": true, "outro_valor": 123 }'
                            />
                            <small style={{fontSize:'0.7rem', opacity:0.7, display: 'block', marginTop: '0.5rem'}}>Insira um objeto JSON válido. Estas configurações podem ser usadas para funcionalidades futuras ou personalizadas.</small>
                        </motion.section> */}


                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <motion.button
                                type="submit"
                                disabled={updateSettingsMutation.isPending}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                style={{ ...glassStyle, padding: '0.75rem 2rem', background: 'rgba(52, 211, 153, 0.3)', border: '1px solid rgba(52, 211, 153, 0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: '500' }}
                            >
                                {updateSettingsMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                Salvar Configurações
                            </motion.button>
                        </div>
                    </div>
                </form>
            </motion.div>
             <style jsx global>{`
                input[type="time"]::-webkit-calendar-picker-indicator {
                    filter: invert(0.8); /* Lighten the icon for dark themes */
                }
            `}</style>
        </div>
    );
};

export default FiscalSystemSettingsPage;
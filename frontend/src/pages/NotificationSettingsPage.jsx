// src/pages/NotificationSettingsPage.jsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
    BellRing, Loader2, AlertTriangle, Workflow, CheckSquare,
    AlertCircle, Clock, Calendar, Send, FileText, HelpCircle
} from 'lucide-react';
import Select from 'react-select';
import Tooltip from '../components/Tooltip'; // Adjust path as needed

import BackgroundElements from '../components/HeroSection/BackgroundElements';
import { useTaskStore } from '../stores/useTaskStore';
const glassStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 150, damping: 20 } }
};

const SettingRow = ({ label, description, helpText, isEnabled, onToggle, isUpdating }) => (
    <motion.div
        variants={itemVariants}
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.2rem',
            background: 'linear-gradient(135deg, rgba(55,48,163,0.18), rgba(147,51,234,0.10))',
            borderRadius: '16px',
            boxShadow: '0 2px 12px rgba(80,0,120,0.08)',
            border: '1.5px solid rgba(147,51,234,0.13)',
            marginBottom: '0.5rem',
            transition: 'background 0.3s'
        }}
    >
        <div style={{ marginRight: '1rem', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'white' }}>{label}</h4>
                {helpText && (
                    <Tooltip text={helpText}>
                        <HelpCircle size={18} color="#a3a3a3" style={{ verticalAlign: 'middle' }} />
                    </Tooltip>
                )}
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.92rem', color: 'rgba(255,255,255,0.7)' }}>
                {description}
            </p>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {isUpdating && <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.7)', marginRight: '0.5rem' }} />}
            <motion.div
                onClick={() => !isUpdating && onToggle(!isEnabled)}
                style={{
                    width: '48px',
                    height: '26px',
                    backgroundColor: isEnabled ? 'rgb(139, 92, 246)' : 'rgba(255,255,255,0.18)',
                    borderRadius: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    justifyContent: isEnabled ? 'flex-end' : 'flex-start',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.18)',
                    transition: 'background-color 0.3s'
                }}
            >
                <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                    style={{
                        width: '22px',
                        height: '22px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        boxShadow: isEnabled ? '0 0 8px #a78bfa' : 'none'
                    }}
                />
            </motion.div>
        </div>
    </motion.div>
);

const CHANNEL_OPTIONS = [
    { value: 'in_app', label: 'In-App' },
    { value: 'email', label: 'Email' },
    // { value: 'sms', label: 'SMS' }, // Uncomment for future
    // { value: 'slack', label: 'Slack' },
];
const DIGEST_OPTIONS = [
    { value: 'immediate', label: 'Imediato' },
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
];

const NotificationSettingsPage = () => {
    const queryClient = useQueryClient();
    const { showSuccessNotification, showErrorNotification } = useTaskStore();

    const { data: settings, isLoading, isError, error } = useQuery({
        queryKey: ['notificationSettings'],
        queryFn: () => api.get('/notification-settings/my_settings/').then(res => res.data),
        staleTime: 5 * 60 * 1000,
    });

    const updateSettingsMutation = useMutation({
        mutationFn: ({ settingName, value }) => api.patch('/notification-settings/update_settings/', { [settingName]: value }),
        onSuccess: (data, variables) => {
            queryClient.setQueryData(['notificationSettings'], oldData => ({
                ...oldData,
                [variables.settingName]: variables.value
            }));
            showSuccessNotification('Feito!', 'Configuração atualizada!');
        },
        onError: (err, variables) => {
            toast.error('Falha ao atualizar. Tente novamente.');
            queryClient.setQueryData(['notificationSettings'], oldData => ({
                ...oldData,
                [variables.settingName]: !variables.value
            }));
        }
    });

    const handleToggle = (settingName, value) => {
        updateSettingsMutation.mutate({ settingName, value });
    };

    // --- New state for time pickers ---
    const [localSettings, setLocalSettings] = React.useState(null);
    React.useEffect(() => {
        if (settings) setLocalSettings(settings);
    }, [settings]);

    // --- New PATCH helpers ---
    const patchSetting = (field, value) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
        updateSettingsMutation.mutate({ settingName: field, value });
    };

    const notificationSettingsMap = [
        {
            title: 'Geral',
            icon: BellRing,
            settings: [
                {
                    key: 'email_notifications_enabled',
                    label: 'Notificações por Email',
                    description: 'Receber notificações e resumos por email (se configurado).',
                    helpText: 'Você receberá notificações importantes e resumos diários/semanal por email, se este canal estiver ativo.'
                },
                {
                    key: 'push_notifications_enabled',
                    label: 'Notificações Push',
                    description: 'Receber notificações push no navegador ou app (se suportado).',
                    helpText: 'Ative para receber alertas instantâneos diretamente no seu navegador ou aplicativo.'
                },
            ]
        },
        {
            title: 'Tarefas e Workflows',
            icon: Workflow,
            settings: [
                {
                    key: 'notify_task_assigned_to_you',
                    label: 'Tarefa Atribuída a Si',
                    description: 'Quando uma nova tarefa é atribuída a si diretamente.',
                    helpText: 'Receba um alerta sempre que uma tarefa for atribuída a você.'
                },
                {
                    key: 'notify_workflow_assigned',
                    label: 'Workflow Atribuído',
                    description: 'Quando um workflow é atribuído a uma tarefa.',
                    helpText: 'Seja notificado quando um workflow for vinculado a uma tarefa sob sua responsabilidade.'
                },
                {
                    key: 'notify_step_ready',
                    label: 'Passo Pronto',
                    description: 'Quando um passo está pronto para ser trabalhado.',
                    helpText: 'Fique atento quando um novo passo do workflow estiver disponível para ação.'
                },
                {
                    key: 'notify_step_completed',
                    label: 'Passo Concluído',
                    description: 'Quando um colega completa um passo.',
                    helpText: 'Saiba quando um colega concluir um passo do workflow.'
                },
                {
                    key: 'notify_task_completed',
                    label: 'Tarefa Concluída',
                    description: 'Quando uma tarefa é marcada como concluída.',
                    helpText: 'Receba confirmação ao finalizar uma tarefa.'
                },
                {
                    key: 'notify_manual_advance_needed',
                    label: 'Avanço Manual Necessário',
                    description: 'Quando é necessário avançar manualmente um passo do workflow.',
                    helpText: 'Você será avisado quando precisar avançar manualmente um passo.'
                },
            ]
        },
        {
            title: 'Aprovações',
            icon: CheckSquare,
            settings: [
                {
                    key: 'notify_approval_needed',
                    label: 'Aprovação Necessária',
                    description: 'Quando um passo precisa da sua aprovação.',
                    helpText: 'Receba um alerta sempre que sua aprovação for necessária em um passo.'
                },
                {
                    key: 'notify_approval_completed',
                    label: 'Aprovação Concluída',
                    description: 'Quando um passo que você aguardava é aprovado.',
                    helpText: 'Seja informado quando um passo aguardando sua aprovação for aprovado.'
                },
                {
                    key: 'notify_step_rejected',
                    label: 'Passo Rejeitado',
                    description: 'Quando um passo que precisa da sua atenção é rejeitado.',
                    helpText: 'Você será avisado se um passo for rejeitado.'
                },
            ]
        },
        {
            title: 'Lembretes e Prazos',
            icon: Clock,
            settings: [
                {
                    key: 'notify_deadline_approaching',
                    label: 'Prazo a Expirar',
                    description: 'Lembretes automáticos quando o prazo de uma tarefa está próximo.',
                    helpText: 'Receba lembretes automáticos quando um prazo estiver se aproximando.'
                },
                {
                    key: 'notify_step_overdue',
                    label: 'Passo Atrasado',
                    description: 'Alertas quando um passo excede o tempo esperado.',
                    helpText: 'Seja alertado quando um passo estiver atrasado.'
                },
                {
                    key: 'notify_manual_reminders',
                    label: 'Lembretes Manuais',
                    description: 'Receber lembretes enviados por outros colegas.',
                    helpText: 'Permite receber lembretes manuais enviados por membros da equipe.'
                },
            ]
        },
        {
            title: 'Relatórios',
            icon: FileText,
            settings: [
                {
                    key: 'notify_report_generated',
                    label: 'Relatório Gerado',
                    description: 'Quando um novo relatório é gerado e está disponível para download.',
                    helpText: 'Você será notificado quando um novo relatório estiver pronto para download.'
                },
            ]
        }
    ];

    // Modify the 'Geral' group icon if 'notify_report_generated' exists
    const generalGroup = notificationSettingsMap.find(g => g.title === 'Geral');
    if (generalGroup && generalGroup.settings.find(s => s.key === 'notify_report_generated')) {
        // Example: If you want to change the icon for the general group if it contains report setting.
        // This is just an example, you might choose a different icon or logic.
        // For now, let's keep BellRing but you could add FileText if it's primary.
    }


    if (isLoading) {
        return (
            <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <BackgroundElements />
                <Loader2 size={48} className="animate-spin" style={{ color: 'rgb(147,51,234)' }} />
            </div>
        );
    }

    if (isError || !settings) { // Check if settings data is available
        return (
            <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center' }}>
                <BackgroundElements />
                <AlertTriangle size={48} style={{ color: 'rgb(239,68,68)', marginBottom: '1rem' }} />
                <h2 style={{ margin: 0 }}>Erro ao carregar configurações</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>{error?.message || "Não foi possível obter os dados das configurações."}</p>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
            <BackgroundElements />
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                style={{ position: 'relative', zIndex: 10, padding: '2rem', maxWidth: '800px', margin: '0 auto' }}
            >
                <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(147,51,234,0.2)', borderRadius: '12px', border: '1px solid rgba(147,51,234,0.3)' }}>
                        <BellRing size={28} style={{ color: 'rgb(196, 181, 253)' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0, background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Configurações de Notificação
                        </h1>
                        <p style={{ fontSize: '1rem', color: 'rgba(191,219,254,1)', margin: 0, marginTop: '0.25rem' }}>
                            Personalize quando e como você recebe alertas.
                        </p>
                    </div>
                </motion.div>

                {/* --- NEW: Smart Notification Preferences --- */}
                <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'white', marginBottom: '1rem' }}>
                        Preferências Inteligentes
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                        {/* Preferred Channels */}
                        <div style={{ minWidth: 220, flex: 1 }}>
                            <label style={{ fontWeight: 500, color: 'white', marginBottom: 4, display: 'block' }}>Canais Preferidos</label>
                            <Select
                                isMulti
                                options={CHANNEL_OPTIONS}
                                value={CHANNEL_OPTIONS.filter(opt => localSettings?.preferred_channels?.includes(opt.value))}
                                onChange={opts => patchSetting('preferred_channels', opts.map(o => o.value))}
                                styles={{
                                    control: base => ({ ...base, background: 'rgba(255,255,255,0.08)', border: 'none', color: 'black' }),
                                    menu: base => ({ ...base, background: 'rgba(30,30,40,0.98)', color: 'black' }),
                                    multiValue: base => ({ ...base, background: 'rgba(59,130,246,0.15)' }),
                                    option: base => ({ ...base, color: 'black' })
                                }}
                                placeholder="Escolha canais..."
                            />
                        </div>
                        {/* Digest Enabled & Frequency */}
                        <div style={{ minWidth: 180 }}>
                            <label style={{ fontWeight: 500, color: 'white', marginBottom: 4, display: 'block' }}>Resumo Diário/Semanal</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="checkbox"
                                    checked={!!localSettings?.digest_enabled}
                                    onChange={e => patchSetting('digest_enabled', e.target.checked)}
                                    style={{ marginRight: 8 }}
                                />
                                <span>Ativar</span>
                            </div>
                            {localSettings?.digest_enabled && (
                                <select
                                    value={localSettings?.digest_frequency || 'immediate'}
                                    onChange={e => patchSetting('digest_frequency', e.target.value)}
                                    style={{ marginTop: 8, padding: 6, borderRadius: 6, border: '1px solid #ccc', background: 'rgba(255,255,255,0.08)', color: 'white' }}
                                >
                                    {DIGEST_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        {/* Quiet Hours */}
                        <div style={{ minWidth: 220 }}>
                            <label style={{ fontWeight: 500, color: 'white', marginBottom: 4, display: 'block' }}>Horário de Silêncio</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                    type="checkbox"
                                    checked={!!localSettings?.quiet_hours_enabled}
                                    onChange={e => patchSetting('quiet_hours_enabled', e.target.checked)}
                                    style={{ marginRight: 8 }}
                                />
                                <span>Ativar</span>
                            </div>
                            {localSettings?.quiet_hours_enabled && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <input
                                        type="time"
                                        value={localSettings?.quiet_start_time || ''}
                                        onChange={e => patchSetting('quiet_start_time', e.target.value)}
                                        style={{ padding: 6, borderRadius: 6, border: '1px solid #ccc', background: 'rgba(255,255,255,0.08)', color: 'white' }}
                                    />
                                    <span>até</span>
                                    <input
                                        type="time"
                                        value={localSettings?.quiet_end_time || ''}
                                        onChange={e => patchSetting('quiet_end_time', e.target.value)}
                                        style={{ padding: 6, borderRadius: 6, border: '1px solid #ccc', background: 'rgba(255,255,255,0.08)', color: 'white' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {notificationSettingsMap.map(group => (
                    <motion.div key={group.title} variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <group.icon size={20} style={{ color: 'rgb(196, 181, 253)' }} />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'white' }}>
                                {group.title}
                            </h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {group.settings.map(setting => (
                                <SettingRow
                                    key={setting.key}
                                    label={setting.label}
                                    description={setting.description}
                                    isEnabled={settings?.[setting.key] ?? false} // Handle case where setting might not exist yet in DB
                                    onToggle={(newValue) => handleToggle(setting.key, newValue)}
                                    isUpdating={updateSettingsMutation.isPending && updateSettingsMutation.variables?.settingName === setting.key}
                                />
                            ))}
                        </div>
                    </motion.div>
                ))}

            </motion.div>
        </div>
    );
};

export default NotificationSettingsPage;
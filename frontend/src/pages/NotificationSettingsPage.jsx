// src/pages/NotificationSettingsPage.jsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { 
    BellRing, Loader2, AlertTriangle, Workflow, CheckSquare, 
    AlertCircle, Clock, Calendar, Send, FileText // Added FileText
} from 'lucide-react';

import BackgroundElements from '../components/HeroSection/BackgroundElements';

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

// Componente para uma única linha de configuração
const SettingRow = ({ label, description, isEnabled, onToggle, isUpdating }) => (
    <motion.div
        variants={itemVariants}
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
        }}
    >
        <div style={{ marginRight: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: 'white' }}>{label}</h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                {description}
            </p>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {isUpdating && <Loader2 size={16} className="animate-spin" style={{ color: 'rgba(255,255,255,0.7)', marginRight: '0.5rem' }}/>}
            <motion.div
                onClick={() => !isUpdating && onToggle(!isEnabled)}
                style={{
                    width: '44px',
                    height: '24px',
                    backgroundColor: isEnabled ? 'rgb(52, 211, 153)' : 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    justifyContent: isEnabled ? 'flex-end' : 'flex-start',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                    transition: 'background-color 0.3s ease'
                }}
            >
                <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 700, damping: 30 }}
                    style={{
                        width: '20px',
                        height: '20px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                    }}
                />
            </motion.div>
        </div>
    </motion.div>
);

const NotificationSettingsPage = () => {
    const queryClient = useQueryClient();

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
            showSuccessNotification('Feito!','Configuração atualizada!');
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

    const notificationSettingsMap = [
        {
            title: 'Geral',
            icon: BellRing,
            settings: [
                { key: 'email_notifications_enabled', label: 'Notificações por Email', description: 'Receber um resumo por email (se configurado).' },
                { key: 'notify_report_generated', label: 'Relatório Gerado', description: 'Quando um novo relatório é gerado.' }, // NEW SETTING
            ]
        },
        {
            title: 'Eventos de Tarefas e Workflows', // Combined for brevity
            icon: Workflow,
            settings: [
                { key: 'notify_task_assigned_to_you', label: 'Tarefa Atribuída a Si', description: 'Quando uma nova tarefa é atribuída a si diretamente.'},
                { key: 'notify_workflow_assigned', label: 'Workflow Atribuído', description: 'Quando um workflow é atribuído a uma tarefa.' },
                { key: 'notify_step_ready', label: 'Passo Pronto', description: 'Quando um passo está pronto para ser trabalhado.' },
                { key: 'notify_step_completed', label: 'Passo Concluído', description: 'Quando um colega completa um passo.' },
                { key: 'notify_task_completed', label: 'Tarefa Concluída', description: 'Quando uma tarefa é marcada como concluída.' },
            ]
        },
        {
            title: 'Aprovações',
            icon: CheckSquare,
            settings: [
                { key: 'notify_approval_needed', label: 'Aprovação Necessária', description: 'Quando um passo precisa da sua aprovação.' },
                { key: 'notify_approval_completed', label: 'Aprovação Concluída', description: 'Quando um passo que você aguardava é aprovado.' },
                { key: 'notify_step_rejected', label: 'Passo Rejeitado', description: 'Quando um passo que precisa da sua atenção é rejeitado.' },
            ]
        },
        {
            title: 'Lembretes e Prazos',
            icon: Clock,
            settings: [
                { key: 'notify_deadline_approaching', label: 'Prazo a Expirar', description: 'Lembretes automáticos quando o prazo de uma tarefa está próximo.' },
                { key: 'notify_step_overdue', label: 'Passo Atrasado', description: 'Alertas quando um passo excede o tempo esperado.' },
                { key: 'notify_manual_reminders', label: 'Lembretes Manuais', description: 'Receber lembretes enviados por outros colegas.' },
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
                <h2 style={{margin: 0}}>Erro ao carregar configurações</h2>
                <p style={{color: 'rgba(255,255,255,0.7)'}}>{error?.message || "Não foi possível obter os dados das configurações."}</p>
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

                {notificationSettingsMap.map(group => (
                    <motion.div key={group.title} variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                            <group.icon size={20} style={{ color: 'rgb(196, 181, 253)' }}/>
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
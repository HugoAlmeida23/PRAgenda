import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api'; // Your API utility
import { motion, AnimatePresence } from 'framer-motion';

import { Link } from 'react-router-dom';
import { BarChart2, AlertTriangle, Calendar, PlayCircle, Settings, Loader2, RefreshCw, Clock, CheckCircle, Archive as ArchiveIcon, Users, Zap, TrendingUp, FileText, Eye, Activity, ExternalLink, ListFilter, CheckSquare, DollarSign } from 'lucide-react';

// Import child components (we will create/refine these)
import BackgroundElements from '../components/HeroSection/BackgroundElements';
import AIInsightsPanel from '../components/HeroSection/AIInsightsPanel'; // Assuming this is okay
import QuickActionsGrid from '../components/HeroSection/QuickActionsGrid'; // Assuming this is okay
import { usePermissions } from '../contexts/PermissionsContext'; // For permission checks

// Glassmorphism style (can be moved to a shared styles file)
const glassCardStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: 'white',
    marginBottom: '1.5rem', // Spacing between cards
};

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    color: 'white',
};

const formatMinutes = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};
const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-PT') : 'N/A';

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


const FiscalSnapshotSection = ({ fiscalStats, upcomingFiscalDeadlines = [], permissions, isLoadingStats, isLoadingDeadlines }) => {
    const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) : 'N/A';

    const [showManualGenerateModal, setShowManualGenerateModal] = useState(false);
    const [manualGenerationParams, setManualGenerationParams] = useState({
        months_ahead: 3,
        clean_old: false,
        days_old: 30,
    });

    const manualGenerateMutation = useMutation({
        mutationFn: (params) => api.post('/fiscal/generate-manual/', params),
        onSuccess: (data) => {
            toast.success(data.data.message || 'Geração manual concluída!');
            queryClient.invalidateQueries({ queryKey: ['fiscalStats'] });
            queryClient.invalidateQueries({ queryKey: ['upcomingFiscalDeadlines'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardMainData'] }); // Invalidate main dashboard data
            setShowManualGenerateModal(false);
        },
        onError: (err) => {
            toast.error(`Falha na geração manual: ${err.response?.data?.error || err.response?.data?.detail || err.message}`);
        }
    });

    const handleManualGenerationParamChange = (e) => {
        const { name, value, type, checked } = e.target;
        setManualGenerationParams(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value, 10) : value)
        }));
    };

    const triggerManualGeneration = () => {
        if (!permissions.isOrgAdmin) {
            toast.warn("Apenas administradores podem iniciar a geração manual.");
            return;
        }
        manualGenerateMutation.mutate(manualGenerationParams);
    };


    // Conditionally render based on permissions
    if (!permissions.isOrgAdmin && !permissions.canViewAnalytics) {
        // Optionally, show a limited view or nothing if no permission
        return null;
    }

    const lastGenDate = fiscalStats?.organization_info?.last_generation
        ? new Date(fiscalStats.organization_info.last_generation).toLocaleString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Nunca';

    return (
        <motion.div style={{ ...glassCardStyle, background: 'rgba(25, 28, 36, 0.7)' }} variants={itemVariants}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ ...sectionTitleStyle, borderBottom: 'none', paddingBottom: 0, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArchiveIcon size={22} style={{ color: 'rgb(52, 211, 153)' }} />
                    Snapshot Fiscal
                </h2>
                <Link to="/fiscal-dashboard" style={{ ...actionButtonStyle, padding: '0.5rem 1rem', background: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.25)' }}>
                    Dashboard Fiscal <ExternalLink size={14} />
                </Link>
            </div>

            {/* Key Fiscal Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <MiniStatCard title="Obrigações Pendentes" value={fiscalStats?.pending || 0} icon={Clock} color="rgb(251, 191, 36)" isLoading={isLoadingStats} />
                <MiniStatCard title="Em Atraso" value={fiscalStats?.overdue || 0} icon={AlertTriangle} color="rgb(239, 68, 68)" isLoading={isLoadingStats} />
                <MiniStatCard title="Definições Ativas" value={fiscalStats?.organization_info?.active_definitions || 0} icon={ListFilter} color="rgb(59, 130, 246)" isLoading={isLoadingStats} />
                <MiniStatCard title="Taxa Conclusão" value={`${parseFloat(fiscalStats?.completion_rate || 0).toFixed(0)}%`} icon={TrendingUp} color="rgb(147, 51, 234)" isLoading={isLoadingStats} />
            </div>


            {/* Upcoming Fiscal Deadlines */}
            <div>
                <h3 style={{ ...subSectionTitleStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={18} style={{ color: 'rgb(251, 146, 60)' }} /> Próximos Prazos Fiscais (7 dias)
                </h3>
                {isLoadingDeadlines ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Loader2 size={24} className="animate-spin" style={{ color: 'rgb(251, 146, 60)' }} /></div>
                ) : upcomingFiscalDeadlines.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }} className="custom-scrollbar-thin">
                        {upcomingFiscalDeadlines.slice(0, 5).map(task => ( // Show max 5
                            <Link key={task.id} to={`/tasks?taskId=${task.id}`} style={{ ...listItemStyle, background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.75rem' }}>
                                <div style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <span title={task.title} style={{ fontWeight: 500 }}>{task.title}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                                        ({task.client_name || task.client?.name || 'N/A'})
                                    </span>
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginLeft: '1rem', whiteSpace: 'nowrap' }}>{formatDate(task.deadline)}</span>
                            </Link>
                        ))}
                    </div>
                ) : <p style={{ ...emptyTextStyle, padding: '0.5rem 0' }}>Nenhum prazo fiscal nos próximos 7 dias.</p>}
            </div>

            {/* Admin Actions */}
            {permissions.isOrgAdmin && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <motion.button
                        onClick={() => setShowManualGenerateModal(true)}
                        style={{ ...actionButtonStyle, background: 'rgba(52, 211, 153, 0.2)', borderColor: 'rgba(52, 211, 153, 0.3)' }}
                        whileHover={{ background: 'rgba(52, 211, 153, 0.3)' }}
                    >
                        <PlayCircle size={16} /> Gerar Obrigações Manualmente
                    </motion.button>
                    <Link to="/fiscal-definitions" style={{ ...actionButtonStyle, background: 'rgba(147, 51, 234, 0.15)', borderColor: 'rgba(147, 51, 234, 0.25)' }}>
                        <FileText size={16} /> Gerir Definições
                    </Link>
                    <Link to="/fiscal-settings" style={{ ...actionButtonStyle, background: 'rgba(147, 51, 234, 0.15)', borderColor: 'rgba(147, 51, 234, 0.25)' }}>
                        <Settings size={16} /> Configurações Fiscais
                    </Link>
                </div>
            )}
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: '1rem', marginBottom: 0 }}>
                Última geração: {lastGenDate}
            </p>

            {/* Manual Generation Modal */}
            <AnimatePresence>
                {showManualGenerateModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}
                        onClick={() => setShowManualGenerateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            style={{ ...glassCardStyle, background: 'rgba(30,35,45,0.95)', padding: '2rem', width: '100%', maxWidth: '500px' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PlayCircle size={22} />Gerar Obrigações Manualmente</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <label htmlFor="modal_months_ahead" style={modalLabelStyle}>Meses Futuros a Gerar:</label>
                                    <input type="number" name="months_ahead" id="modal_months_ahead" value={manualGenerationParams.months_ahead} onChange={handleManualGenerationParamChange} min="1" max="12" style={modalInputStyle} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" name="clean_old" id="modal_clean_old" checked={manualGenerationParams.clean_old} onChange={handleManualGenerationParamChange} style={{ width: '16px', height: '16px' }} />
                                    <label htmlFor="modal_clean_old" style={{ ...modalLabelStyle, marginBottom: 0 }}>Limpar obrigações antigas pendentes?</label>
                                </div>
                                {manualGenerationParams.clean_old && (
                                    <div>
                                        <label htmlFor="modal_days_old" style={modalLabelStyle}>Considerar Antigas Após (dias):</label>
                                        <input type="number" name="days_old" id="modal_days_old" value={manualGenerationParams.days_old} onChange={handleManualGenerationParamChange} min="7" max="365" style={modalInputStyle} />
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button onClick={() => setShowManualGenerateModal(false)} style={{ ...modalButtonStyle, background: 'rgba(255,255,255,0.1)' }}>Cancelar</button>
                                <button onClick={triggerManualGeneration} disabled={manualGenerateMutation.isPending} style={{ ...modalButtonStyle, background: 'rgba(52, 211, 153, 0.2)', borderColor: 'rgba(52, 211, 153, 0.3)' }}>
                                    {manualGenerateMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />} Iniciar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const MiniStatCard = ({ title, value, icon: Icon, color, isLoading }) => (
    <div style={{ padding: '1rem', background: `rgba(${color.replace('rgb(', '').replace(')', '')}, 0.05)`, borderRadius: '12px', border: `1px solid rgba(${color.replace('rgb(', '').replace(')', '')}, 0.15)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <Icon size={18} style={{ color }} />
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{title}</h4>
        </div>
        {isLoading ? (
            <Loader2 size={24} className="animate-spin" style={{ color, marginTop: '0.25rem' }} />
        ) : (
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color }}>{value}</p>
        )}
    </div>
);

// Common styles used in this section (can be extracted)
const modalLabelStyle = { display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' };
const modalInputStyle = { ...inputStyle, padding: '0.6rem', fontSize: '0.8rem' };
const modalButtonStyle = { ...glassStyle, padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' };

const StatCard = ({ title, value, icon: Icon, color = 'rgb(59, 130, 246)', unit = '', linkTo, isLoading }) => {
    const cardContent = (
        <motion.div
            style={{ ...glassCardStyle, textAlign: 'center', background: `rgba(${color.replace('rgb(', '').replace(')', '')}, 0.1)`, border: `1px solid rgba(${color.replace('rgb(', '').replace(')', '')}, 0.2)` }}
            whileHover={{ scale: 1.03, y: -5, boxShadow: `0 0 20px rgba(${color.replace('rgb(', '').replace(')', '')}, 0.3)` }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: `rgba(${color.replace('rgb(', '').replace(')', '')}, 0.2)`, borderRadius: '12px', marginRight: '1rem' }}>
                    <Icon size={24} style={{ color }} />
                </div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', textAlign: 'left', flexGrow: 1 }}>{title}</h3>
            </div>
            {isLoading ? (
                <Loader2 size={36} className="animate-spin" style={{ color, margin: '0.5rem auto' }} />
            ) : (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: '700', color }}>
                    {value}
                    {unit && <span style={{ fontSize: '1rem', marginLeft: '0.25rem', opacity: 0.7 }}>{unit}</span>}
                </p>
            )}
        </motion.div>
    );
    return linkTo ? <Link to={linkTo} style={{ textDecoration: 'none' }}>{cardContent}</Link> : cardContent;
};


// --- Dashboard Section Components (Placeholders - to be fleshed out) ---

const MyDaySection = ({ upcomingTasks = [], recentTimeEntries = [] }) => {


    return (
        <motion.div style={{ ...glassCardStyle }} variants={itemVariants}>
            <h2 style={sectionTitleStyle}>Foco do Dia</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div>
                    <h3 style={subSectionTitleStyle}>Próximas Tarefas</h3>
                    {upcomingTasks.length > 0 ? (
                        upcomingTasks.slice(0, 3).map(task => (
                            <Link key={task.id} to={`/tasks?taskId=${task.id}`} style={listItemStyle}>
                                <span>{task.title}</span>
                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{formatDate(task.deadline)}</span>
                            </Link>
                        ))
                    ) : <p style={emptyTextStyle}>Nenhuma tarefa próxima.</p>}
                    {upcomingTasks.length > 3 && <Link to="/tasks" style={viewAllLinkStyle}>Ver todas as tarefas...</Link>}
                </div>
                <div>
                    <h3 style={subSectionTitleStyle}>Tempo Registado Recentemente</h3>
                    {recentTimeEntries.length > 0 ? (
                        recentTimeEntries.slice(0, 3).map(entry => (
                            <div key={entry.id} style={listItemStyle}>
                                <span>{entry.description || entry.task_title || "Registo"} ({entry.client_name})</span>
                                <span style={{ color: 'rgb(52, 211, 153)' }}>{formatMinutes(entry.minutes_spent)}</span>
                            </div>
                        ))
                    ) : <p style={emptyTextStyle}>Nenhum tempo registado recentemente.</p>}
                    {recentTimeEntries.length > 3 && <Link to="/timeentry" style={viewAllLinkStyle}>Ver todos os registos...</Link>}
                </div>
            </div>
        </motion.div>
    );
};


// --- Main Dashboard Component ---
const DashboardRouter = () => {
    const permissions = usePermissions();

    // Fetch all necessary data for the dashboard
    // This combines data previously fetched in `DashboardPages.jsx` and `HeroSection.jsx`
    const { data: dashboardData, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['dashboardMainData'],
        queryFn: async () => {
            // Simulate fetching various pieces of data
            // In a real app, these might be separate queries or one larger query
            const [summaryRes, tasksRes, timeRes, clientsRes, fiscalStatsRes, upcomingFiscalDeadlinesRes] = await Promise.allSettled([
                api.get('/dashboard-summary/'), // Existing endpoint
                api.get('/tasks/?limit=5&ordering=-created_at'), // Recent tasks
                api.get('/time-entries/?limit=5&ordering=-date'), // Recent time entries
                api.get('/clients/?limit=5&is_active=true'), // Active clients sample
                (permissions.isOrgAdmin || permissions.canViewAnalytics) ? api.get('/fiscal/stats/') : Promise.resolve({ data: {} }),
                (permissions.isOrgAdmin || permissions.canViewAnalytics) ? api.get('/fiscal/upcoming-deadlines/?days=7&limit=3') : Promise.resolve({ data: [] }),
            ]);

            const processResult = (res) => res.status === 'fulfilled' ? (res.value.data.results || res.value.data) : (res.reason.isAxiosError && res.reason.response?.data ? res.reason.response.data : { error: res.reason.message });

            return {
                summary: processResult(summaryRes),
                recentTasks: processResult(tasksRes),
                recentTimeEntries: processResult(timeRes),
                activeClientsSample: processResult(clientsRes),
                fiscalStats: processResult(fiscalStatsRes),
                upcomingFiscalDeadlines: processResult(upcomingFiscalDeadlinesRes),
                // Pass down permissions from summary or use context directly in child components
                permissions: processResult(summaryRes)?.permissions || permissions,
            };
        },
        enabled: permissions.initialized, // Only run once permissions are loaded
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const mappedStatsFromSummary = useMemo(() => ({ // Used by AIInsightsPanel and QuickActionsGrid
        timeTrackedToday: dashboardData?.summary?.time_tracked_today || 0,
        activeTasks: dashboardData?.summary?.active_tasks || 0,
        overdueTasksCount: dashboardData?.summary?.overdue_tasks || 0,
        unprofitableClientsCount: dashboardData?.summary?.unprofitable_clients || 0,
    }), [dashboardData?.summary]);

    const generateInsights = (data) => { // Kept similar for AIInsightsPanel
        const insights = [];
        if (!data) return [{ type: 'loading', title: 'Analisando...', message: 'A IA está processando seus dados.', icon: Brain, color: 'rgb(147, 51, 234)' }];

        if (data.overdueTasksCount > 0) insights.push({ type: 'urgent_tasks', title: 'Tarefas Atrasadas Urgentes!', message: `Existem ${data.overdueTasksCount} tarefas que passaram do prazo.`, icon: AlertTriangle, color: 'rgb(239, 68, 68)', action: '/tasks?status=pending&overdue=true' });
        if (data.unprofitableClientsCount > 0) insights.push({ type: 'profit_optimization', title: 'Clientes de Baixa Rentabilidade', message: `${data.unprofitableClientsCount} clientes precisam de atenção para melhorar a rentabilidade.`, icon: DollarSign, color: 'rgb(251, 191, 36)', action: '/clientprofitability?filter=unprofitable' });
        if ((data.timeTrackedToday || 0) < 240 && (data.timeTrackedToday || 0) > 0) insights.push({ type: 'low_tracked_time', title: 'Tempo Registado Baixo', message: `Apenas ${Math.floor((data.timeTrackedToday || 0) / 60)}h ${(data.timeTrackedToday || 0) % 60}m registados hoje.`, icon: Clock, color: 'rgb(245, 158, 11)', action: '/timeentry' });

        return insights.length > 0 ? insights : [{ type: 'all_good', title: 'Tudo em Ordem!', message: 'Continue o bom trabalho, seu escritório está otimizado.', icon: CheckSquare, color: 'rgb(52, 211, 153)' }];
    };

   

    if (isLoading && !dashboardData) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>
                <BackgroundElements />
                <Loader2 size={48} className="animate-spin" style={{ color: 'rgb(147, 51, 234)' }} />
                <p style={{ marginLeft: '1rem', fontSize: '1.2rem' }}>Carregando seu dashboard...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', padding: '2rem' }}>
                <BackgroundElements status="error" />
                <AlertTriangle size={60} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.5rem' }}>Oops! Algo deu errado.</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>Não foi possível carregar os dados do dashboard.</p>
                <pre style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', maxWidth: '600px', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                    {error?.message || JSON.stringify(error?.response?.data)}
                </pre>
                <button
                    onClick={() => refetch()}
                    style={{ ...glassCardStyle, padding: '0.75rem 1.5rem', marginTop: '1rem', cursor: 'pointer', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)' }}
                >
                    <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />Tentar Novamente
                </button>
            </div>
        );
    }

    // Ensure dashboardData and its nested properties are checked before use
    const insightsForPanel = generateInsights(mappedStatsFromSummary);

 
    
        const generateQuickActions = (data) => {
            const actions = [
                { 
                    type: 'time_entry', 
                    label: 'Registar Tempo', 
                    subtitle: 'Adicionar nova entrada', 
                    icon: Clock, 
                    action: '/timeentry',
                    color: 'rgba(52, 211, 153, 0.2)' 
                }, 
                { 
                    type: 'create_task', 
                    label: 'Nova Tarefa', 
                    subtitle: 'Criar e atribuir', 
                    icon: CheckSquare, 
                    action: '/tasks',
                    color: 'rgba(59, 130, 246, 0.2)' 
                }
            ];
            
            if (data?.overdueTasksCount > 0) {
                actions.unshift({ 
                    type: 'urgent_tasks_review', 
                    label: 'Resolver Urgentes', 
                    subtitle: `${data.overdueTasksCount} atrasadas`, 
                    icon: AlertTriangle, 
                    action: '/tasks?status=pending&overdue=true',
                    color: 'rgba(239, 68, 68, 0.2)' 
                });
            }
            
            if (permissions.isOrgAdmin || permissions.canManageClients) {
                actions.push({ 
                    type: 'add_client', 
                    label: 'Novo Cliente', 
                    subtitle: 'Registar empresa', 
                    icon: Users, 
                    action: '/clients',
                    color: 'rgba(147, 51, 234, 0.2)' 
                });
            }
            
            return actions.slice(0, 4);
        };
    
        // Generate quick actions using the mapped stats
        const quickActionsForGrid = generateQuickActions(mappedStatsFromSummary);
    return (
        <div style={{ minHeight: '100vh', position: 'relative' }}>
            <BackgroundElements businessStatus="optimal" />
            <motion.div
                style={{ position: 'relative', zIndex: 10, padding: '1.5rem' }}
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: '700', color: 'white', margin: '0 0 0.25rem 0' }}>
                            Bem-vindo de volta!
                        </h1>
                        <p style={{ color: 'rgba(191, 219, 254, 1)', fontSize: '1.125rem', margin: 0 }}>
                            Seu hub de produtividade e insights.
                        </p>
                    </div>
                </header>

                {/* Hero Section: AI Insights and Quick Actions */}
                <div style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                    <AIInsightsPanel 
                        insights={insightsForPanel} 
                        dashboardData={dashboardData} // ✅ Pass dashboardData here
                        businessStatus="optimal" 
                    />
                </div>
        <QuickActionsGrid actions={quickActionsForGrid} />

                {/* KPI Stats Grid */}
                <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem', marginTop: '2rem' }} variants={itemVariants}>
                    <StatCard title="Tempo Hoje" value={formatMinutes(dashboardData?.summary?.time_tracked_today || 0)} icon={Clock} color="rgb(52, 211, 153)" linkTo="/timeentry" isLoading={isLoading} />
                    <StatCard title="Tarefas Ativas" value={dashboardData?.summary?.active_tasks || 0} icon={Activity} color="rgb(59, 130, 246)" linkTo="/tasks" isLoading={isLoading} />
                    <StatCard title="Tarefas Atrasadas" value={dashboardData?.summary?.overdue_tasks || 0} icon={AlertTriangle} color="rgb(239, 68, 68)" linkTo="/tasks?overdue=true" isLoading={isLoading} />
                    {(permissions.isOrgAdmin || permissions.canViewProfitability) &&
                        <StatCard title="Rentabilidade Média" value={parseFloat(dashboardData?.summary?.average_profit_margin || 0).toFixed(1)} unit="%" icon={DollarSign} color="rgb(147, 51, 234)" linkTo="/clientprofitability" isLoading={isLoading} />
                    }
                </motion.div>

                {/* My Day Section */}
                <MyDaySection
                    upcomingTasks={dashboardData?.recentTasks || []} // Assuming recentTasks can serve as upcoming for now
                    recentTimeEntries={dashboardData?.recentTimeEntries || []}
                />

                {/* Fiscal Snapshot Section */}
               {(permissions.isOrgAdmin || permissions.canViewAnalytics) && (
    <FiscalSnapshotSection
        fiscalStats={dashboardData?.fiscalStats} // From your main dashboard data fetch
        upcomingFiscalDeadlines={dashboardData?.upcomingFiscalDeadlines || []} // From your main data fetch
        permissions={permissions}
        isLoadingStats={isLoading && !dashboardData?.fiscalStats} // Pass loading state for stats
        isLoadingDeadlines={isLoading && !dashboardData?.upcomingFiscalDeadlines} // Pass loading for deadlines
    />
)}


            </motion.div>
        </div>
    );
};

// Helper styles (can be moved to a CSS file or styled-components)
const sectionTitleStyle = {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
};

const subSectionTitleStyle = {
    fontSize: '1rem',
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: '0.75rem',
};

const listItemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    textDecoration: 'none',
    color: 'white',
    transition: 'background-color 0.2s ease',
    cursor: 'pointer',
    '&:hover': { // This won't work directly in inline styles, use CSS or styled-components
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }
};

const emptyTextStyle = {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.875rem',
    textAlign: 'center',
    padding: '1rem 0',
};

const viewAllLinkStyle = {
    display: 'block',
    textAlign: 'right',
    color: 'rgb(59, 130, 246)',
    fontSize: '0.8rem',
    marginTop: '0.5rem',
    textDecoration: 'none',
};

const actionButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'white',
    transition: 'background-color 0.2s ease',
};


const itemVariants = { // For staggering animations of sections
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const containerVariants = { // For the main page container
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
};


export default DashboardRouter;
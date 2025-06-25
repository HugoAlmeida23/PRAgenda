// src/pages/DashboardRouter.jsx

import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

// --- Icon Imports ---
import {
    Activity, AlertTriangle, Archive as ArchiveIcon, Brain, Calendar, CheckCircle,
    CheckSquare, Clock, DollarSign, ExternalLink, FileText, ListFilter, Loader2,
    PlayCircle, RefreshCw, Settings, TrendingUp, Users, Zap
} from 'lucide-react';

// --- Child Component Imports & Contexts ---
import BackgroundElements from '../components/HeroSection/BackgroundElements';
import AIInsightsPanel from '../components/HeroSection/AIInsightsPanel';
import QuickActionsGrid from '../components/HeroSection/QuickActionsGrid';
import { usePermissions } from '../contexts/PermissionsContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api';
import LoadingIndicator from '../components/LoadingIndicator';

// --- Fast Animation Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05, delay: 0.1 } } // Fast stagger
};
const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } // Fast easeOut
};

// --- Helper Functions (Unchanged) ---
const formatMinutes = (minutes) => {
    if (typeof minutes !== 'number' || isNaN(minutes)) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
};
const formatDate = (dateString, options = { day: '2-digit', month: 'short' }) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-PT', options);
};

// =================================================================================
//  THEME-AWARE SUB-COMPONENTS (WITH FAST ANIMATIONS)
// =================================================================================

const StatCard = ({ title, value, unit = '', icon: Icon, color, linkTo, isLoading }) => {
    const { theme } = useTheme();
    const cardStyle = useMemo(() => ({
        textAlign: 'center', padding: '1.5rem', background: theme === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)', borderRadius: '16px', border: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255, 255, 255, 0.15)'}`,
        color: theme === 'light' ? '#1f2937' : 'white', textDecoration: 'none', display: 'block',
    }), [theme]);
    
    const cardContent = (
        <motion.div style={cardStyle} variants={itemVariants} whileHover={{ y: -4, transition: { duration: 0.15, ease: 'easeOut' } }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: `rgba(${color.replace('rgb(','').replace(')','')}, 0.2)`, borderRadius: '12px', marginRight: '1rem' }}><Icon size={24} style={{ color }} /></div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: theme === 'light' ? '#4b5563' : 'rgba(255,255,255,0.8)', textAlign: 'left', flexGrow: 1 }}>{title}</h3>
            </div>
            {isLoading ? <Loader2 size={36} className="animate-spin" style={{ color, margin: '0.5rem auto' }} /> : <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: '700', color }}>{value !== undefined && value !== null ? value : '-'}{unit && <span style={{ fontSize: '1rem', marginLeft: '0.25rem', opacity: 0.7 }}>{unit}</span>}</p>}
        </motion.div>
    );
    return linkTo ? <Link to={linkTo} style={{ textDecoration: 'none' }}>{cardContent}</Link> : cardContent;
};

const MyDaySection = ({ upcomingTasks = [], recentTimeEntries = [], isLoading }) => {
    const { theme } = useTheme();
    const sectionStyle = useMemo(() => ({
        background: theme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(30, 35, 45, 0.7)', backdropFilter: 'blur(12px)', borderRadius: '16px', padding: '1.5rem',
        border: `1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)'}`, color: theme === 'light' ? '#1f2937' : 'white',
    }), [theme]);
    const titleStyle = useMemo(() => ({ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: `1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}` }), [theme]);
    const subTitleStyle = useMemo(() => ({ fontSize: '1rem', fontWeight: '500', marginBottom: '0.75rem', color: theme === 'light' ? '#374151' : 'rgba(255,255,255,0.9)' }), [theme]);
    const listItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.875rem', textDecoration: 'none', color: 'inherit', cursor: 'pointer' };
    
    return (
        <motion.div style={sectionStyle} variants={itemVariants}>
            <h2 style={titleStyle}>Foco do Dia</h2>
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px' }}>
                    <Loader2 size={24} className="animate-spin" />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <h3 style={subTitleStyle}>Próximas Tarefas</h3>
                        {upcomingTasks.length > 0 ? upcomingTasks.slice(0, 3).map(task => (<Link key={task.id} to={`/tasks?openTask=${task.id}`} style={listItemStyle}><span>{task.title}</span><span style={{ color: 'rgba(107, 114, 128, 1)' }}>{formatDate(task.deadline)}</span></Link>)) : <p>Nenhuma tarefa próxima.</p>}
                    </div>
                    <div>
                        <h3 style={subTitleStyle}>Tempo Registado Recentemente</h3>
                        {recentTimeEntries.length > 0 ? recentTimeEntries.slice(0, 3).map(entry => (<div key={entry.id} style={listItemStyle}><span>{entry.description || entry.task_title || "Registo"}</span><span style={{ color: 'rgb(52, 211, 153)' }}>{formatMinutes(entry.minutes_spent)}</span></div>)) : <p>Nenhum tempo registado.</p>}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const FiscalSnapshotSection = ({ fiscalStats, upcomingFiscalDeadlines, permissions, isLoadingStats, isLoadingDeadlines }) => {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const manualGenerateMutation = useMutation({
        mutationFn: (params) => api.post('/fiscal/generate-manual/', params),
        onSuccess: (data) => {
            toast.success(data.data.message || 'Geração manual concluída!');
            queryClient.invalidateQueries(['dashboardFiscalStats', 'dashboardUpcomingFiscal']);
        },
        onError: (err) => toast.error(`Falha na geração: ${err.response?.data?.error || err.message}`),
    });

    const sectionStyle = useMemo(() => ({ background: theme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(30, 35, 45, 0.7)', backdropFilter: 'blur(12px)', borderRadius: '16px', padding: '1.5rem', border: `1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)'}`, color: theme === 'light' ? '#1f2937' : 'white', marginTop: '1.5rem' }), [theme]);
    const titleStyle = useMemo(() => ({ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: theme === 'light' ? '#111827' : 'white' }), [theme]);
    
    if (!permissions.isOrgAdmin && !permissions.canViewAnalytics) return null;
    const lastGenDate = fiscalStats?.organization_info?.last_generation ? formatDate(fiscalStats.organization_info.last_generation, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca';
    
    return (
        <motion.div style={sectionStyle} variants={itemVariants}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={titleStyle}><ArchiveIcon size={22} style={{ color: 'rgb(52, 211, 153)', marginRight: '0.5rem' }} />Snapshot Fiscal</h2>
                <Link to="/fiscal-dashboard" style={{color: 'inherit', textDecoration: 'none'}}>Dashboard Fiscal <ExternalLink size={14} /></Link>
            </div>
            {(isLoadingStats || isLoadingDeadlines) ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px' }}>
                    <Loader2 size={24} className="animate-spin" />
                </div>
            ) : (
                <>
                    {/* Conteúdo do FiscalSnapshotSection aqui */}
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: '1rem', marginBottom: 0 }}>Última geração: {lastGenDate}</p>
                </>
            )}
        </motion.div>
    )
};


// =================================================================================
//  FETCHING FUNCTIONS (UNCHANGED)
// =================================================================================

const fetchDashboardSummary = async () => {
    const res = await api.get('/dashboard-summary/');
    return res.data;
};
const fetchRecentTasks = async () => {
    const res = await api.get('/tasks/?limit=5&ordering=-created_at');
    return res.data.results || res.data;
};
const fetchRecentTimeEntries = async () => {
    const res = await api.get('/time-entries/?limit=5&ordering=-date');
    return res.data.results || res.data;
};
const fetchFiscalStats = async () => {
    const res = await api.get('/fiscal/stats/');
    return res.data;
};
const fetchUpcomingFiscalDeadlines = async () => {
    const res = await api.get('/fiscal/upcoming-deadlines/?days=7&limit=5');
    return res.data.results || res.data;
};

// =================================================================================
//  MAIN DASHBOARD COMPONENT (WITH FAST ANIMATIONS)
// =================================================================================

const DashboardRouter = () => {
    const { theme } = useTheme();
    const permissions = usePermissions();
    const queryClient = useQueryClient();

    const { data: summary, isLoading: isLoadingSummary, isError: isErrorSummary, error: errorSummary } = useQuery({
        queryKey: ['dashboardSummary'],
        queryFn: fetchDashboardSummary,
        enabled: permissions.initialized,
        staleTime: 1 * 60 * 1000,
    });

    const { data: recentTasks, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['dashboardRecentTasks'],
        queryFn: fetchRecentTasks,
        enabled: permissions.initialized,
        staleTime: 5 * 60 * 1000,
    });

    const { data: recentTimeEntries, isLoading: isLoadingTimeEntries } = useQuery({
        queryKey: ['dashboardRecentTimeEntries'],
        queryFn: fetchRecentTimeEntries,
        enabled: permissions.initialized,
        staleTime: 5 * 60 * 1000,
    });

    const { data: fiscalStats, isLoading: isLoadingFiscalStats } = useQuery({
        queryKey: ['dashboardFiscalStats'],
        queryFn: fetchFiscalStats,
        enabled: permissions.initialized && (permissions.isOrgAdmin || permissions.canViewAnalytics),
        staleTime: 10 * 60 * 1000,
    });

    const { data: upcomingFiscalDeadlines, isLoading: isLoadingFiscalDeadlines } = useQuery({
        queryKey: ['dashboardUpcomingFiscal'],
        queryFn: fetchUpcomingFiscalDeadlines,
        enabled: permissions.initialized && (permissions.isOrgAdmin || permissions.canViewAnalytics),
        staleTime: 10 * 60 * 1000,
    });

    const insights = useMemo(() => {
        if (!summary) return [{ type: 'loading', title: 'Analisando...', message: 'A processar seus dados.', icon: Brain, color: 'rgb(147, 51, 234)' }];
        const generated = [];
        if (summary.overdue_tasks > 0) generated.push({ type: 'urgent_tasks', title: 'Tarefas Atrasadas!', message: `Existem ${summary.overdue_tasks} tarefas urgentes.`, icon: AlertTriangle, color: 'rgb(239, 68, 68)', action: '/tasks?overdue=true' });
        if (summary.unprofitable_clients > 3) generated.push({ type: 'profit_alert', title: 'Alerta de Rentabilidade', message: `${summary.unprofitable_clients} clientes não são rentáveis.`, icon: DollarSign, color: 'rgb(251, 146, 60)', action: '/clientprofitability' });
        return generated.length > 0 ? generated : [{ type: 'all_good', title: 'Tudo em Ordem!', message: 'Continue o bom trabalho.', icon: CheckCircle, color: 'rgb(52, 211, 153)' }];
    }, [summary]);

    const quickActions = useMemo(() => {
        const actions = [{ type: 'time_entry', label: 'Registar Tempo', icon: Clock, action: '/timeentry' }, { type: 'create_task', label: 'Nova Tarefa', icon: CheckSquare, action: '/tasks' }];
        if (permissions.isOrgAdmin || permissions.canManageClients) actions.push({ type: 'add_client', label: 'Novo Cliente', icon: Users, action: '/clients' });
        return actions;
    }, [permissions]);

    if (permissions.loading) {
        return <LoadingIndicator />;
    }

    if (isErrorSummary) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)', padding: '2rem' }}>
                <AlertTriangle size={60} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.5rem',marginBottom:'2rem', color: theme === 'light' ? '#111827' : 'white' }}>
                    {errorSummary?.response?.data?.error || "Ocorreu um erro ao carregar o dashboard."}
                </h2>
                <motion.button onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] })} whileHover={{scale: 1.05}} whileTap={{scale: 0.95}} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={16} /> Tentar Novamente
                </motion.button>
            </div>
        );
    }
    
    return (
        <div style={{ minHeight: '100vh', position: 'relative' }}>
            <BackgroundElements />
            <motion.div style={{ position: 'relative', zIndex: 10, padding: '1.5rem' }} variants={containerVariants} initial="hidden" animate="visible">
                <header style={{ marginBottom: '2rem' }}>
                    <h1 style={{ color: theme === 'light' ? '#111827' : 'white', margin: '0 0 0.25rem 0', fontSize: '2.25rem', fontWeight: 700 }}>Bem-vindo de volta!</h1>
                    <p style={{ color: theme === 'light' ? '#4b5563' : 'rgba(191, 219, 254, 1)', fontSize: '1.125rem', margin: 0 }}>Seu hub de produtividade e insights.</p>
                </header>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <AIInsightsPanel insights={insights} isLoading={isLoadingSummary} />
                    <QuickActionsGrid actions={quickActions} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <StatCard title="Tempo Hoje" value={formatMinutes(summary?.time_tracked_today)} icon={Clock} color="rgb(52, 211, 153)" linkTo="/timeentry" isLoading={isLoadingSummary} />
                    <StatCard title="Tarefas Ativas" value={summary?.active_tasks} icon={Activity} color="rgb(59, 130, 246)" linkTo="/tasks" isLoading={isLoadingSummary} />
                    <StatCard title="Tarefas Atrasadas" value={summary?.overdue_tasks} icon={AlertTriangle} color="rgb(239, 68, 68)" linkTo="/tasks?overdue=true" isLoading={isLoadingSummary} />
                    {(permissions.isOrgAdmin || permissions.canViewProfitability) && <StatCard title="Rentabilidade Média" value={parseFloat(summary?.average_profit_margin || 0).toFixed(1)} unit="%" icon={DollarSign} color="rgb(147, 51, 234)" linkTo="/clientprofitability" isLoading={isLoadingSummary} />}
                </div>

                <MyDaySection upcomingTasks={recentTasks || []} recentTimeEntries={recentTimeEntries || []} isLoading={isLoadingTasks || isLoadingTimeEntries} />
                
                {(permissions.isOrgAdmin || permissions.canViewAnalytics) && (
                    <FiscalSnapshotSection 
                        fiscalStats={fiscalStats} 
                        upcomingFiscalDeadlines={upcomingFiscalDeadlines || []} 
                        permissions={permissions} 
                        isLoadingStats={isLoadingFiscalStats} 
                        isLoadingDeadlines={isLoadingFiscalDeadlines} 
                    />
                )}
            </motion.div>
        </div>
    );
};

export default DashboardRouter;
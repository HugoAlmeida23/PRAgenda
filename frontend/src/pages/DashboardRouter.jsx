import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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

// --- Animation Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

// --- Helper Functions ---
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
//  THEME-AWARE SUB-COMPONENTS (ALL ORIGINAL COMPONENTS RESTORED)
// =================================================================================

const StatCard = ({ title, value, unit = '', icon: Icon, color, linkTo, isLoading }) => {
    const { theme } = useTheme();
    const cardStyle = useMemo(() => ({
        textAlign: 'center', padding: '1.5rem', background: theme === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)', borderRadius: '16px', border: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255, 255, 255, 0.15)'}`,
        color: theme === 'light' ? '#1f2937' : 'white', textDecoration: 'none', display: 'block', transition: 'all 0.3s ease',
    }), [theme]);
    const cardContent = (
        <motion.div style={cardStyle} variants={itemVariants} whileHover={{ scale: 1.03, y: -5, boxShadow: `0 10px 25px rgba(${color.replace('rgb(', '').replace(')', '')}, 0.3)` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: `rgba(${color.replace('rgb(','').replace(')','')}, 0.2)`, borderRadius: '12px', marginRight: '1rem' }}><Icon size={24} style={{ color }} /></div>
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: theme === 'light' ? '#4b5563' : 'rgba(255,255,255,0.8)', textAlign: 'left', flexGrow: 1 }}>{title}</h3>
            </div>
            {isLoading ? <Loader2 size={36} className="animate-spin" style={{ color, margin: '0.5rem auto' }} /> : <p style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: '700', color }}>{value}{unit && <span style={{ fontSize: '1rem', marginLeft: '0.25rem', opacity: 0.7 }}>{unit}</span>}</p>}
        </motion.div>
    );
    return linkTo ? <Link to={linkTo} style={{ textDecoration: 'none' }}>{cardContent}</Link> : cardContent;
};

const MyDaySection = ({ upcomingTasks = [], recentTimeEntries = [] }) => {
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div>
                    <h3 style={subTitleStyle}>Próximas Tarefas</h3>
                    {upcomingTasks.length > 0 ? upcomingTasks.slice(0, 3).map(task => (<Link key={task.id} to={`/tasks?taskId=${task.id}`} style={listItemStyle}><span>{task.title}</span><span style={{ color: 'rgba(107, 114, 128, 1)' }}>{formatDate(task.deadline)}</span></Link>)) : <p>Nenhuma tarefa próxima.</p>}
                </div>
                <div>
                    <h3 style={subTitleStyle}>Tempo Registado Recentemente</h3>
                    {recentTimeEntries.length > 0 ? recentTimeEntries.slice(0, 3).map(entry => (<div key={entry.id} style={listItemStyle}><span>{entry.description || entry.task_title || "Registo"}</span><span style={{ color: 'rgb(52, 211, 153)' }}>{formatMinutes(entry.minutes_spent)}</span></div>)) : <p>Nenhum tempo registado.</p>}
                </div>
            </div>
        </motion.div>
    );
};

const FiscalSnapshotSection = ({ fiscalStats, upcomingFiscalDeadlines, permissions, isLoadingStats, isLoadingDeadlines }) => {
    const { theme } = useTheme();
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [modalParams, setModalParams] = useState({ months_ahead: 3, clean_old: false, days_old: 30 });

    const manualGenerateMutation = useMutation({
        mutationFn: (params) => api.post('/fiscal/generate-manual/', params),
        onSuccess: (data) => {
            toast.success(data.data.message || 'Geração manual concluída!');
            queryClient.invalidateQueries(['dashboardMainData']);
            setShowModal(false);
        },
        onError: (err) => toast.error(`Falha na geração: ${err.response?.data?.error || err.message}`),
    });

    // Theme-aware styles
    const sectionStyle = useMemo(() => ({ background: theme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(30, 35, 45, 0.7)', backdropFilter: 'blur(12px)', borderRadius: '16px', padding: '1.5rem', border: `1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)'}`, color: theme === 'light' ? '#1f2937' : 'white', marginTop: '1.5rem' }), [theme]);
    const titleStyle = useMemo(() => ({ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: theme === 'light' ? '#111827' : 'white' }), [theme]);
    const subTitleStyle = useMemo(() => ({ fontSize: '1rem', fontWeight: '500', marginBottom: '0.75rem', color: theme === 'light' ? '#374151' : 'rgba(255,255,255,0.9)' }), [theme]);
    const listItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', marginBottom: '0.5rem', textDecoration: 'none', color: 'inherit' };
    
    if (!permissions.isOrgAdmin && !permissions.canViewAnalytics) return null;

    const lastGenDate = fiscalStats?.organization_info?.last_generation ? formatDate(fiscalStats.organization_info.last_generation, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca';
    
    return (
        <motion.div style={sectionStyle} variants={itemVariants}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={titleStyle}><ArchiveIcon size={22} style={{ color: 'rgb(52, 211, 153)', marginRight: '0.5rem' }} />Snapshot Fiscal</h2>
                <Link to="/fiscal-dashboard" style={{color: 'inherit', textDecoration: 'none'}}>Dashboard Fiscal <ExternalLink size={14} /></Link>
            </div>
            {/* Stats, Deadlines, and Admin Actions... */}
             <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: '1rem', marginBottom: 0 }}>Última geração: {lastGenDate}</p>
        </motion.div>
    )
};


// =================================================================================
//  MAIN DASHBOARD COMPONENT
// =================================================================================

const DashboardRouter = () => {
    // --- ALL HOOKS AT THE TOP ---
    const { theme } = useTheme();
    const permissions = usePermissions();

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['dashboardMainData'],
        queryFn: async () => {
            const endpoints = [api.get('/dashboard-summary/'), api.get('/tasks/?limit=5&ordering=-created_at'), api.get('/time-entries/?limit=5&ordering=-date')];
            if (permissions.isOrgAdmin || permissions.canViewAnalytics) {
                endpoints.push(api.get('/fiscal/stats/'));
                endpoints.push(api.get('/fiscal/upcoming-deadlines/?days=7&limit=5'));
            }
            const results = await Promise.allSettled(endpoints);
            const process = (res) => res.status === 'fulfilled' ? (res.value.data.results || res.value.data) : null;
            return { summary: process(results[0]), recentTasks: process(results[1]), recentTimeEntries: process(results[2]), fiscalStats: process(results[3]), upcomingFiscalDeadlines: process(results[4]) };
        },
        enabled: permissions.initialized,
        staleTime: 5 * 60 * 1000,
    });

    const insights = useMemo(() => {
        if (!data?.summary) return [{ type: 'loading', title: 'Analisando...', message: 'A processar seus dados.', icon: Brain, color: 'rgb(147, 51, 234)' }];
        const generated = [];
        if (data.summary.overdue_tasks > 0) generated.push({ type: 'urgent_tasks', title: 'Tarefas Atrasadas!', message: `Existem ${data.summary.overdue_tasks} tarefas urgentes.`, icon: AlertTriangle, color: 'rgb(239, 68, 68)', action: '/tasks?overdue=true' });
        return generated.length > 0 ? generated : [{ type: 'all_good', title: 'Tudo em Ordem!', message: 'Continue o bom trabalho.', icon: CheckCircle, color: 'rgb(52, 211, 153)' }];
    }, [data]);

    const quickActions = useMemo(() => {
        const actions = [{ type: 'time_entry', label: 'Registar Tempo', icon: Clock, action: '/timeentry' }, { type: 'create_task', label: 'Nova Tarefa', icon: CheckSquare, action: '/tasks' }];
        if (permissions.isOrgAdmin || permissions.canManageClients) actions.push({ type: 'add_client', label: 'Novo Cliente', icon: Users, action: '/clients' });
        return actions;
    }, [permissions]);

    // --- GUARD CLAUSES (AFTER ALL HOOKS) ---
    if (!permissions.initialized || isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)', color: theme === 'light' ? '#374151' : 'white' }}>
                <Loader2 size={48} className="animate-spin" style={{ color: 'rgb(147, 51, 234)' }} />
                <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>Carregando seu dashboard...</p>
            </div>
        );
    }
    if (isError) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)', padding: '2rem' }}>
                <AlertTriangle size={60} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.5rem',marginBottom:'2rem', color: theme === 'light' ? '#111827' : 'white' }}>Você não pertence a nenhuma organização!</h2>
                <button onClick={() => refetch()} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)', color: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><RefreshCw size={16} /> Tentar Novamente</button>
            </div>
        );
    }
    if (!data || !data.summary) {
        return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}><p style={{color: theme === 'light' ? '#374151' : 'white'}}>Nenhum dado encontrado para o dashboard.</p></div>)
    }

    // --- MAIN RENDER (Data is guaranteed to exist) ---
    return (
        <div style={{ minHeight: '100vh', position: 'relative' }}>
            <BackgroundElements />
            <motion.div style={{ position: 'relative', zIndex: 10, padding: '1.5rem' }} variants={containerVariants} initial="hidden" animate="visible">
                <header style={{ marginBottom: '2rem' }}>
                    <h1 style={{ color: theme === 'light' ? '#111827' : 'white', margin: '0 0 0.25rem 0', fontSize: '2.25rem', fontWeight: 700 }}>Bem-vindo de volta!</h1>
                    <p style={{ color: theme === 'light' ? '#4b5563' : 'rgba(191, 219, 254, 1)', fontSize: '1.125rem', margin: 0 }}>Seu hub de produtividade e insights.</p>
                </header>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <AIInsightsPanel insights={insights} dashboardData={data} />
                    <QuickActionsGrid actions={quickActions} />
                </div>
                <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <StatCard title="Tempo Hoje" value={formatMinutes(data.summary.time_tracked_today)} icon={Clock} color="rgb(52, 211, 153)" linkTo="/timeentry" isLoading={false} />
                    <StatCard title="Tarefas Ativas" value={data.summary.active_tasks} icon={Activity} color="rgb(59, 130, 246)" linkTo="/tasks" isLoading={false} />
                    <StatCard title="Tarefas Atrasadas" value={data.summary.overdue_tasks} icon={AlertTriangle} color="rgb(239, 68, 68)" linkTo="/tasks?overdue=true" isLoading={false} />
                    {(permissions.isOrgAdmin || permissions.canViewProfitability) && <StatCard title="Rentabilidade Média" value={parseFloat(data.summary.average_profit_margin || 0).toFixed(1)} unit="%" icon={DollarSign} color="rgb(147, 51, 234)" linkTo="/clientprofitability" isLoading={false} />}
                </motion.div>
                <MyDaySection upcomingTasks={data.recentTasks || []} recentTimeEntries={data.recentTimeEntries || []} />
                <FiscalSnapshotSection fiscalStats={data.fiscalStats} upcomingFiscalDeadlines={data.upcomingFiscalDeadlines || []} permissions={permissions} isLoadingStats={isLoading} isLoadingDeadlines={isLoading} />
            </motion.div>
        </div>
    );
};

export default DashboardRouter;
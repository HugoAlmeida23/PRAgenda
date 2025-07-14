import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
    Activity, AlertTriangle, Archive as ArchiveIcon, Brain, Calendar, CheckCircle,
    CheckSquare, Clock, DollarSign, ExternalLink, FileText, ListFilter, Loader2,
    PlayCircle, RefreshCw, Settings, TrendingUp, Users, Zap
} from 'lucide-react';

import BackgroundElements from '../components/HeroSection/BackgroundElements';
import AIInsightsPanel from '../components/HeroSection/AIInsightsPanel';
import QuickActionsGrid from '../components/HeroSection/QuickActionsGrid';
import { usePermissions } from '../contexts/PermissionsContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api';
import LoadingIndicator from '../components/LoadingIndicator';
import DashboardTour from './DashboardTour';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05, delay: 0.1 } }
};
const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }
};

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

const StatCard = ({ title, value, unit = '', icon: Icon, color, linkTo, isLoading }) => {
    const { theme } = useTheme();
    const cardStyle = useMemo(() => ({
        textAlign: 'center', 
        padding: '1.5rem', 
        background: theme === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)', 
        borderRadius: '16px', 
        border: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255, 255, 255, 0.15)'}`,
        color: theme === 'light' ? '#1f2937' : 'white', 
        textDecoration: 'none', 
        display: 'block',
        position: 'relative',
        zIndex: 1,
    }), [theme]);
    
    const cardContent = (
        <motion.div 
            style={cardStyle} 
            variants={itemVariants} 
            whileHover={{ y: -4, transition: { duration: 0.15, ease: 'easeOut' } }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <div style={{ 
                    padding: '0.75rem', 
                    backgroundColor: `rgba(${color.replace('rgb(','').replace(')','')}, 0.2)`, 
                    borderRadius: '12px', 
                    marginRight: '1rem' 
                }}>
                    <Icon size={24} style={{ color }} />
                </div>
                <h3 style={{ 
                    margin: 0, 
                    fontSize: '0.9rem', 
                    color: theme === 'light' ? '#4b5563' : 'rgba(255,255,255,0.8)', 
                    textAlign: 'left', 
                    flexGrow: 1 
                }}>
                    {title}
                </h3>
            </div>
            {isLoading ? (
                <Loader2 size={36} className="animate-spin" style={{ color, margin: '0.5rem auto' }} />
            ) : (
                <p style={{ 
                    margin: '0.5rem 0 0 0', 
                    fontSize: '2rem', 
                    fontWeight: '700', 
                    color 
                }}>
                    {value !== undefined && value !== null ? value : '-'}
                    {unit && <span style={{ fontSize: '1rem', marginLeft: '0.25rem', opacity: 0.7 }}>{unit}</span>}
                </p>
            )}
        </motion.div>
    );
    
    return linkTo ? <Link to={linkTo} style={{ textDecoration: 'none' }}>{cardContent}</Link> : cardContent;
};

const MyDaySection = ({ upcomingTasks = [], recentTimeEntries = [], isLoading, className }) => {
    const { theme } = useTheme();
    const sectionStyle = useMemo(() => ({
        background: theme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(30, 35, 45, 0.7)', 
        backdropFilter: 'blur(12px)', 
        borderRadius: '16px', 
        padding: '1.5rem',
        border: `1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)'}`, 
        color: theme === 'light' ? '#1f2937' : 'white',
        position: 'relative',
        zIndex: 1,
    }), [theme]);
    
    const titleStyle = useMemo(() => ({ 
        fontSize: '1.25rem', 
        fontWeight: '600', 
        marginBottom: '1rem', 
        paddingBottom: '0.75rem', 
        borderBottom: `1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}` 
    }), [theme]);
    
    const subTitleStyle = useMemo(() => ({ 
        fontSize: '1rem', 
        fontWeight: '500', 
        marginBottom: '0.75rem', 
        color: theme === 'light' ? '#374151' : 'rgba(255,255,255,0.9)' 
    }), [theme]);
    
    const listItemStyle = { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '0.75rem', 
        background: theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)', 
        borderRadius: '8px', 
        marginBottom: '0.5rem', 
        fontSize: '0.875rem', 
        textDecoration: 'none', 
        color: 'inherit', 
        cursor: 'pointer' 
    };
    
    return (
        <motion.div className={className} style={sectionStyle} variants={itemVariants}>
            <h2 style={titleStyle}>Foco do Dia</h2>
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '150px' }}>
                    <Loader2 size={24} className="animate-spin" />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <h3 style={subTitleStyle}>Próximas Tarefas</h3>
                        {upcomingTasks.length > 0 ? (
                            upcomingTasks.slice(0, 3).map(task => (
                                <Link key={task.id} to={`/tasks?openTask=${task.id}`} style={listItemStyle}>
                                    <span>{task.title}</span>
                                    <span style={{ color: 'rgba(107, 114, 128, 1)' }}>
                                        {formatDate(task.deadline)}
                                    </span>
                                </Link>
                            ))
                        ) : (
                            <p>Nenhuma tarefa próxima.</p>
                        )}
                    </div>
                    <div>
                        <h3 style={subTitleStyle}>Tempo Registado Recentemente</h3>
                        {recentTimeEntries.length > 0 ? (
                            recentTimeEntries.slice(0, 3).map(entry => (
                                <div key={entry.id} style={listItemStyle}>
                                    <span>{entry.description || entry.task_title || "Registo"}</span>
                                    <span style={{ color: 'rgb(52, 211, 153)' }}>
                                        {formatMinutes(entry.minutes_spent)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p>Nenhum tempo registado.</p>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

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

const DashboardRouter = () => {
    const { theme } = useTheme();
    const permissions = usePermissions();
    const queryClient = useQueryClient();
    
    // Estados para o tour
    const [showTour, setShowTour] = useState(false);
    const [tourReady, setTourReady] = useState(false);
    const [dashboardReady, setDashboardReady] = useState(false);

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

    const insights = useMemo(() => {
        if (!summary) return [{ 
            type: 'loading', 
            title: 'Analisando...', 
            message: 'A processar seus dados.', 
            icon: Brain, 
            color: 'rgb(147, 51, 234)' 
        }];
        
        const generated = [];
        
        if (summary.overdue_tasks > 0) {
            generated.push({ 
                type: 'urgent_tasks', 
                title: 'Tarefas Atrasadas!', 
                message: `Existem ${summary.overdue_tasks} tarefas urgentes.`, 
                icon: AlertTriangle, 
                color: 'rgb(239, 68, 68)', 
                action: '/tasks?overdue=true' 
            });
        }
        
        if (summary.unprofitable_clients > 3) {
            generated.push({ 
                type: 'profit_alert', 
                title: 'Alerta de Rentabilidade', 
                message: `${summary.unprofitable_clients} clientes não são rentáveis.`, 
                icon: DollarSign, 
                color: 'rgb(251, 146, 60)', 
                action: '/clientprofitability' 
            });
        }
        
        return generated.length > 0 ? generated : [{ 
            type: 'all_good', 
            title: 'Tudo em Ordem!', 
            message: 'Continue o bom trabalho.', 
            icon: CheckCircle, 
            color: 'rgb(52, 211, 153)' 
        }];
    }, [summary]);

    const quickActions = useMemo(() => {
        const actions = [
            { 
                type: 'time_entry', 
                label: 'Registar Tempo', 
                icon: Clock, 
                action: '/timeentry',
                color: 'rgba(52, 211, 153, 0.2)',
                subtitle: 'Regista o teu tempo rapidamente'
            }, 
            { 
                type: 'create_task', 
                label: 'Nova Tarefa', 
                icon: CheckSquare, 
                action: '/tasks',
                color: 'rgba(59, 130, 246, 0.2)',
                subtitle: 'Cria uma nova tarefa'
            }
        ];
        
        if (permissions.isOrgAdmin || permissions.canManageClients) {
            actions.push({ 
                type: 'add_client', 
                label: 'Novo Cliente', 
                icon: Users, 
                action: '/clients',
                color: 'rgba(147, 51, 234, 0.2)',
                subtitle: 'Adiciona um novo cliente'
            });
        }
        
        return actions;
    }, [permissions]);

    // Função chamada quando a animação do dashboard termina
    const handleAnimationComplete = () => {
        setDashboardReady(true);
        // Aguarda um pouco mais para garantir que tudo está estável
        setTimeout(() => {
            setTourReady(true);
        }, 1000);
    };

    // Função para debug dos elementos
    const debugElements = () => {
        const targets = [
            '.ai-insights-panel',
            '.quick-actions-grid', 
            '.stat-card-tempo-hoje',
            '.stat-card-tarefas-ativas',
            '.my-day-section'
        ];
        
        console.log('=== Dashboard Tour Debug ===');
        targets.forEach(target => {
            const element = document.querySelector(target);
            console.log(`${target}:`, element ? 'Found' : 'Not found', element);
            if (element) {
                const rect = element.getBoundingClientRect();
                console.log(`  Position: ${rect.top}, ${rect.left}, ${rect.width}x${rect.height}`);
            }
        });
    };

    // Função para resetar o tour
    const resetTour = () => {
        setShowTour(false);
        setTimeout(() => {
            setShowTour(true);
        }, 100);
    };

    // Effect para debug (remover em produção)
    useEffect(() => {
        if (tourReady && showTour) {
            setTimeout(debugElements, 500);
        }
    }, [tourReady, showTour]);

    if (permissions.loading || (isLoadingSummary && !summary)) {
        return <LoadingIndicator />;
    }

    if (isErrorSummary) {
        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: 'calc(100vh - 120px)', 
                padding: '2rem', 
                color: theme === 'light' ? '#111827' : 'white' 
            }}>
                <BackgroundElements />
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid rgba(239, 68, 68, 0.3)', 
                        padding: '2rem', 
                        borderRadius: '16px', 
                        textAlign: 'center', 
                        maxWidth: '500px' 
                    }}
                >
                    <AlertTriangle size={60} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Erro ao Carregar Dashboard</h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '2rem' }}>
                        {errorSummary?.response?.data?.error || "Não foi possível carregar os dados do painel de controlo."}
                    </p>
                    <motion.button 
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] })} 
                        whileHover={{ scale: 1.05 }} 
                        whileTap={{ scale: 0.95 }} 
                        style={{ 
                            padding: '0.75rem 1.5rem', 
                            cursor: 'pointer', 
                            background: 'rgba(52, 211, 153, 0.2)', 
                            border: '1px solid rgba(52, 211, 153, 0.3)', 
                            color: 'white', 
                            borderRadius: '8px', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '0.5rem' 
                        }}
                    >
                        <RefreshCw size={16} /> Tentar Novamente
                    </motion.button>
                </motion.div>
            </div>
        );
    }
    
    return (
        <div style={{ minHeight: '100vh', position: 'relative' }}>
            <BackgroundElements />
            
            <motion.div 
                style={{ position: 'relative', zIndex: 10, padding: '1.5rem' }} 
                variants={containerVariants} 
                initial="hidden" 
                animate="visible"
                onAnimationComplete={handleAnimationComplete}
            >
                <header style={{ 
                    marginBottom: '2rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start' 
                }}>
                    <div>
                        <h1 style={{ 
                            color: theme === 'light' ? '#111827' : 'white', 
                            margin: '0 0 0.25rem 0', 
                            fontSize: '2.25rem', 
                            fontWeight: 700 
                        }}>
                            Bem-vindo de volta!
                        </h1>
                        <p style={{ 
                            color: theme === 'light' ? '#4b5563' : 'rgba(191, 219, 254, 1)', 
                            fontSize: '1.125rem', 
                            margin: 0 
                        }}>
                            Seu hub de produtividade e insights.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setShowTour(true)}
                            disabled={!tourReady}
                            style={{
                                backgroundColor: tourReady ? '#9333ea' : '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '10px 20px',
                                cursor: tourReady ? 'pointer' : 'not-allowed',
                                fontSize: '14px',
                                fontWeight: '500',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                whiteSpace: 'nowrap',
                                opacity: tourReady ? 1 : 0.6,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {tourReady ? 'VER TOUR' : 'PREPARANDO...'}
                        </button>
                        {process.env.NODE_ENV === 'development' && (
                            <button
                                onClick={debugElements}
                                style={{
                                    backgroundColor: '#374151',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                }}
                            >
                                DEBUG
                            </button>
                        )}
                    </div>
                </header>
                
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                    gap: '1.5rem', 
                    marginBottom: '2rem' 
                }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <AIInsightsPanel className="ai-insights-panel" insights={insights} isLoading={isLoadingSummary} />
                    </div>
                    <div className="quick-actions-grid" style={{ position: 'relative', zIndex: 1 }}>
                        <QuickActionsGrid actions={quickActions} />
                    </div>
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                    gap: '1.5rem', 
                    marginBottom: '2rem' 
                }}>
                    <div className="stat-card-tempo-hoje">
                        <StatCard 
                            title="Tempo Hoje" 
                            value={formatMinutes(summary?.time_tracked_today)} 
                            icon={Clock} 
                            color="rgb(52, 211, 153)" 
                            linkTo="/timeentry" 
                            isLoading={isLoadingSummary} 
                        />
                    </div>
                    <div className="stat-card-tarefas-ativas">
                        <StatCard 
                            title="Tarefas Ativas" 
                            value={summary?.active_tasks} 
                            icon={Activity} 
                            color="rgb(59, 130, 246)" 
                            linkTo="/tasks" 
                            isLoading={isLoadingSummary} 
                        />
                    </div>
                    <div className="stat-card-tarefas-atrasadas">
                        <StatCard 
                            title="Tarefas Atrasadas" 
                            value={summary?.overdue_tasks} 
                            icon={AlertTriangle} 
                            color="rgb(239, 68, 68)" 
                            linkTo="/tasks?overdue=true" 
                            isLoading={isLoadingSummary} 
                        />
                    </div>
                    {(permissions.isOrgAdmin || permissions.canViewProfitability) && (
                        <div className="stat-card-rentabilidade">
                            <StatCard 
                                title="Rentabilidade Média" 
                                value={parseFloat(summary?.average_profit_margin || 0).toFixed(1)} 
                                unit="%" 
                                icon={DollarSign} 
                                color="rgb(147, 51, 234)" 
                                linkTo="/clientprofitability" 
                                isLoading={isLoadingSummary} 
                            />
                        </div>
                    )}
                </div>

                <MyDaySection
                    className="my-day-section"
                    upcomingTasks={recentTasks || []}
                    recentTimeEntries={recentTimeEntries || []}
                    isLoading={isLoadingTasks || isLoadingTimeEntries}
                />
            </motion.div>
            
            {showTour && tourReady && (
                <DashboardTour 
                    onClose={() => {
                        setShowTour(false);
                    }} 
                />
            )}
        </div>
    );
};

export default DashboardRouter;
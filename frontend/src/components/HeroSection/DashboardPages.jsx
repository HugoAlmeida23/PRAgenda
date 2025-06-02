import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Timer,
    Sheet,
    AlertTriangle,
    Plus,
    BarChart2,
    DollarSign,
    Users,
    TrendingUp,
    CheckSquare,
    Clock,
    CheckCircle,
    Activity,
    Clipboard,
    ArrowBigLeftDash,
    Sparkles,
    Zap,
    FileText,
    ArrowRight
} from 'lucide-react';

// Import dos componentes da primeira página
import AIInsightsPanel from './AIInsightsPanel';
import BackgroundElements from './BackgroundElements';
import QuickActionsGrid from './QuickActionsGrid';

const DashboardPages = ({ dashboardData }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Mapped stats derivados do dashboardData
    const mappedStats = {
        timeTrackedToday: dashboardData?.time_tracked_today || 0,
        timeTrackedWeek: dashboardData?.time_tracked_week || 0,
        activeTasks: dashboardData?.active_tasks || 0,
        overdueTasksCount: dashboardData?.overdue_tasks || 0,
        todayTasksCount: dashboardData?.today_tasks || 0,
        tasksCompletedThisWeek: dashboardData?.completed_tasks_week || 0,
        unprofitableClientsCount: dashboardData?.unprofitable_clients || 0,
        total_revenue: dashboardData?.total_revenue || 0,
        total_cost: dashboardData?.total_cost || 0,
        average_profit_margin: dashboardData?.average_profit_margin || 0,
        recentTimeEntries: dashboardData?.recent_time_entries || [],
        upcomingTasks: dashboardData?.upcoming_tasks || [],
    };

    const formatMinutes = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const handlePageChange = (direction) => {
        if (isTransitioning) return;

        setIsTransitioning(true);
        if (direction === 'next' && currentPage === 0) {
            setCurrentPage(1);
        } else if (direction === 'prev' && currentPage === 1) {
            setCurrentPage(0);
        }

        setTimeout(() => setIsTransitioning(false), 500);
    };

    // Função para lidar com teclas do teclado
    const handleKeyDown = (event) => {
        if (event.key === 'ArrowLeft' && currentPage === 1) {
            handlePageChange('prev');
        } else if (event.key === 'ArrowRight' && currentPage === 0) {
            handlePageChange('next');
        } else if (event.key === 'Escape') {
            // Fechar qualquer modal ou voltar ao início
            setCurrentPage(0);
        }
    };

    // Event listener para teclas
    React.useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentPage]);

    // Geração de insights AI
    const generateInsights = (data) => {
        const insights = [];

        if (data?.overdue_tasks > 0) {
            insights.push({
                type: 'urgent_tasks',
                title: 'Tarefas Atrasadas',
                message: `Você tem ${data.overdue_tasks} tarefas atrasadas que precisam de atenção imediata.`,
                icon: AlertTriangle,
                color: 'rgb(239, 68, 68)',
                confidence: 0.95,
                impact: 'high'
            });
        }

        if (data?.unprofitable_clients > 0) {
            insights.push({
                type: 'profit_optimization',
                title: 'Otimização de Lucro',
                message: `Existem ${data.unprofitable_clients} clientes com baixa rentabilidade que merecem revisão.`,
                icon: DollarSign,
                color: 'rgb(251, 191, 36)',
                confidence: 0.85,
                impact: 'medium'
            });
        }

        if ((data?.time_tracked_today || 0) < 240 && (data?.time_tracked_today || 0) > 0) {
            insights.push({
                type: 'low_tracked_time',
                title: 'Baixo Tempo Registado',
                message: `Apenas ${formatMinutes(data?.time_tracked_today || 0)} registados hoje. Considere rever o seu planeamento.`,
                icon: Clock,
                color: 'rgb(245, 158, 11)',
                confidence: 0.70,
                impact: 'medium'
            });
        }

        return insights.length > 0 ? insights : [{
            type: 'all_good',
            title: 'Tudo em Ordem!',
            message: 'Nenhum insight crítico no momento. Continue o excelente trabalho!',
            icon: CheckCircle,
            color: 'rgb(52, 211, 153)',
            confidence: 0.9,
            impact: 'positive'
        }];
    };

    // Geração de ações rápidas contextuais
    const generateQuickActions = (data) => {
        const actions = [];

        // Ação para registar tempo (sempre disponível)
        actions.push({
            type: 'time_entry',
            label: 'Registar Tempo',
            subtitle: 'Adicionar entrada de tempo',
            icon: Timer,
            color: 'rgba(52, 211, 153, 0.8)',
            action: '/timeentry'
        });

        // Ação urgente se há tarefas atrasadas
        if (data?.overdue_tasks > 0) {
            actions.push({
                type: 'urgent_tasks_review',
                label: 'Resolver Urgentes',
                subtitle: `${data.overdue_tasks} tarefas atrasadas`,
                icon: AlertTriangle,
                color: 'rgba(239, 68, 68, 0.8)',
                action: '/tasks?status=pending&overdue=true'
            });
        }

        // Ação para criar nova tarefa
        actions.push({
            type: 'create_task',
            label: 'Nova Tarefa',
            subtitle: 'Criar nova tarefa',
            icon: Plus,
            color: 'rgba(59, 130, 246, 0.8)',
            action: '/tasks'
        });

        // Ação de voz para entrada rápida
        actions.push({
            type: 'voice_entry',
            label: 'Entrada por Voz',
            subtitle: 'Descrever trabalho feito',
            icon: FileText,
            color: 'rgba(147, 51, 234, 0.8)',
            action: 'voice' // Não é uma URL, será tratado diferentemente
        });

        return actions.slice(0, 4); // Limitar a 4 ações
    };

    // Estilos uniformes para ambas as páginas
    const containerStyle = {
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
    };

    const pageWrapperStyle = {
        position: 'relative',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        padding: '1.8rem',
        overflowY: 'auto',
        color: 'white',
    };

    const glassCardStyle = {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        marginBottom: '1.5rem',
        color: 'white',
    };

    const navigationStyle = {
        position: 'fixed',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        borderRadius: '50%',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease'
    };

    const leftNavStyle = {
        ...navigationStyle,
        left: '20px'
    };

    const rightNavStyle = {
        ...navigationStyle,
        right: '20px'
    };

    const pageIndicatorStyle = {
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '0.5rem',
        zIndex: 100
    };

    const dotStyle = {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        cursor: 'pointer',
        transition: 'all 0.3s',
        border: 'none'
    };

    const activeDotStyle = {
        ...dotStyle,
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
    };

    const inactiveDotStyle = {
        ...dotStyle,
        backgroundColor: 'rgba(255, 255, 255, 0.5)'
    };

    // Variantes de animação
    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1,
            transition: {
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
            }
        },
        exit: (direction) => ({
            x: direction < 0 ? 1000 : -1000,
            opacity: 0,
            transition: {
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
            }
        })
    };

    // Primeira página - Dashboard Principal
    const FirstPage = () => (
        <motion.div
            style={{ ...pageWrapperStyle, overflowY: 'hidden' }}
            custom={currentPage}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            role="main"
            aria-label="Dashboard Principal"
        >
            <BackgroundElements businessStatus="optimal" />
            <div style={{ position: 'relative', zIndex: 10 }}>
                {/* Header */}
                <header style={{ marginBottom: '1.8rem' }}>
                    <h1 style={{
                        fontSize: '1.8rem',
                        fontWeight: '700',
                        color: 'white',
                        marginBottom: '0.5rem',
                        margin: 0
                    }}>
                        Bom dia !
                    </h1>
                    <p style={{
                        color: 'rgba(191, 219, 254, 1)',
                        fontSize: '1rem',
                        margin: 0
                    }}>
                        Pronto para otimizar o seu escritório?
                    </p>
                </header>

                {/* Main Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, 1fr)',
                    gap: '1rem'
                }}>
                    <div style={{ gridColumn: 'span 8' }}>
                        <AIInsightsPanel
                            insights={generateInsights(dashboardData)}
                            businessStatus="optimal"
                        />
                    </div>
                    <div style={{ gridColumn: 'span 4' }}>
                        <QuickActionsGrid
                            actions={generateQuickActions(dashboardData)}
                            dashboardData={dashboardData}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );

    // Segunda página - Análises Detalhadas com estilo uniforme
    const SecondPage = () => (
        <motion.div
            style={pageWrapperStyle}
            custom={currentPage}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            role="main"
            aria-label="Análises Detalhadas"
        >
            <BackgroundElements businessStatus="optimal" />
            <div style={{ position: 'relative', zIndex: 10 }}>
                {/* Header para consistência */}
                <header style={{ marginBottom: '1.8rem' }}>
                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: '700',
                        color: 'white',
                        marginBottom: '0.5rem',
                        margin: 0
                    }}>
                        Análises Detalhadas
                    </h1>
                    <p style={{
                        color: 'rgba(191, 219, 254, 1)',
                        fontSize: '1rem',
                        margin: 0
                    }}>
                        Visão completa do seu escritório
                    </p>
                </header>

                {/* Quick Actions Row - com estilo glass */}
                <div style={glassCardStyle}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1.5rem'
                    }}>
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, 180, 360]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            style={{
                                padding: '0.5rem',
                                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                                borderRadius: '12px'
                            }}
                        >
                            <Zap style={{ color: 'rgb(251, 191, 36)' }} size={20} />
                        </motion.div>
                        <div>
                            <h3 style={{
                                color: 'white',
                                fontWeight: '600',
                                margin: 0,
                                fontSize: '1rem'
                            }}>
                                Ações Rápidas
                            </h3>
                            <p style={{
                                color: 'rgb(191, 219, 254)',
                                fontSize: '0.875rem',
                                margin: 0
                            }}>
                                Acesso direto às funcionalidades principais
                            </p>
                        </div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem'
                    }}>
                        {/* Registar Tempo */}
                        <Link
                            to="/timeentry"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '1rem',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                backgroundColor: 'rgba(52, 211, 153, 0.2)',
                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                color: 'white',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(52, 211, 153, 0.3)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(52, 211, 153, 0.2)'}
                            aria-label="Registar tempo de trabalho"
                        >
                            <div style={{
                                padding: '0.75rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(34, 197, 94, 0.3)',
                                marginRight: '1rem'
                            }}>
                                <Timer size={18} />
                            </div>
                            <div>
                                <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>Registar Tempo</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                    Registe as suas horas
                                </div>
                            </div>
                        </Link>

                        {/* Exportar */}
                        <Link
                            to="/invoices/create"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '1rem',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: 'white',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(245, 158, 11, 0.3)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(245, 158, 11, 0.2)'}
                            aria-label="Exportar ficheiro com horas"
                        >
                            <div style={{
                                padding: '0.75rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(251, 191, 36, 0.3)',
                                marginRight: '1rem'
                            }}>
                                <Sheet size={18} />
                            </div>
                            <div>
                                <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>Exportar</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                    Ficheiro com horas
                                </div>
                            </div>
                        </Link>

                        {/* Tarefas Atrasadas - apenas se existirem */}
                        {mappedStats.overdueTasksCount > 0 && (
                            <Link
                                to="/tasks?status=pending&overdue=true"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: 'white',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'}
                                aria-label={`Resolver ${mappedStats.overdueTasksCount} tarefas atrasadas`}
                            >
                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(248, 113, 113, 0.3)',
                                    marginRight: '1rem'
                                }}>
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>Fora de prazo</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                        {mappedStats.overdueTasksCount} tarefas
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* Nova Tarefa */}
                        <Link
                            to="/tasks"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '1rem',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: 'white',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
                            aria-label="Criar nova tarefa"
                        >
                            <div style={{
                                padding: '0.75rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(96, 165, 250, 0.3)',
                                marginRight: '1rem'
                            }}>
                                <Plus size={18} />
                            </div>
                            <div>
                                <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>Nova Tarefa</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                    Criar tarefa
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards Grid - com estilo glass */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '1.8rem'
                }}>
                    {/* Receita vs Custos */}
                    <div style={glassCardStyle}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '1rem'
                        }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                marginRight: '0.75rem'
                            }}>
                                <DollarSign size={20} style={{ color: 'rgb(34, 197, 94)' }} />
                            </div>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                margin: 0,
                                color: 'white'
                            }}>
                                Receita vs Custos
                            </h3>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem'
                            }}>
                                <span style={{
                                    fontSize: '0.875rem',
                                    color: 'rgba(255, 255, 255, 0.8)'
                                }}>
                                    Receita:
                                </span>
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    color: 'rgb(34, 197, 94)'
                                }}>
                                    €{(mappedStats.total_revenue).toLocaleString()}
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem'
                            }}>
                                <span style={{
                                    fontSize: '0.875rem',
                                    color: 'rgba(255, 255, 255, 0.8)'
                                }}>
                                    Custo:
                                </span>
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    color: 'rgb(239, 68, 68)'
                                }}>
                                    €{(mappedStats.total_cost).toLocaleString()}
                                </span>
                            </div>

                            <div style={{
                                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                                paddingTop: '0.5rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        color: 'white'
                                    }}>
                                        Lucro:
                                    </span>
                                    <span style={{
                                        fontSize: '1rem',
                                        fontWeight: '700',
                                        color: 'white'
                                    }}>
                                        €{(mappedStats.total_revenue - mappedStats.total_cost).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <Link
                            to="/profitability"
                            style={{
                                color: 'rgb(96, 165, 250)',
                                fontSize: '0.875rem',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                fontWeight: '500'
                            }}
                            aria-label="Ver análise financeira detalhada"
                        >
                            Ver análise financeira
                            <ArrowRight size={14} style={{ marginLeft: '0.25rem' }} />
                        </Link>
                    </div>

                    {/* Produtividade */}
                    <div style={glassCardStyle}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '1rem'
                        }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(147, 51, 234, 0.2)',
                                marginRight: '0.75rem'
                            }}>
                                <Users size={20} style={{ color: 'rgb(147, 51, 234)' }} />
                            </div>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                margin: 0,
                                color: 'white'
                            }}>
                                Produtividade
                            </h3>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem'
                            }}>
                                <span style={{
                                    fontSize: '0.875rem',
                                    color: 'rgba(255, 255, 255, 0.8)'
                                }}>
                                    Eficiência:
                                </span>
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    color: 'rgb(147, 51, 234)'
                                }}>
                                    {Math.round(((mappedStats.tasksCompletedThisWeek) / Math.max(mappedStats.activeTasks, 1)) * 100)}%
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{
                                    fontSize: '0.875rem',
                                    color: 'rgba(255, 255, 255, 0.8)'
                                }}>
                                    Esta semana:
                                </span>
                                <span style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: 'white'
                                }}>
                                    {mappedStats.tasksCompletedThisWeek} de {mappedStats.activeTasks}
                                </span>
                            </div>
                        </div>

                        <Link
                            to="/reports/productivity"
                            style={{
                                color: 'rgb(96, 165, 250)',
                                fontSize: '0.875rem',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                fontWeight: '500'
                            }}
                            aria-label="Ver relatório de produtividade"
                        >
                            Ver relatório
                            <ArrowRight size={14} style={{ marginLeft: '0.25rem' }} />
                        </Link>
                    </div>

                    {/* Tarefas Críticas */}
                    <div style={glassCardStyle}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '1rem'
                        }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                marginRight: '0.75rem'
                            }}>
                                <AlertTriangle size={20} style={{ color: 'rgb(239, 68, 68)' }} />
                            </div>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                margin: 0,
                                color: 'white'
                            }}>
                                Tarefas Críticas
                            </h3>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem'
                            }}>
                                <span style={{
                                    fontSize: '0.875rem',
                                    color: 'rgba(255, 255, 255, 0.8)'
                                }}>
                                    Atrasadas:
                                </span>
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    color: 'rgb(239, 68, 68)'
                                }}>
                                    {mappedStats.overdueTasksCount}
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{
                                    fontSize: '0.875rem',
                                    color: 'rgba(255, 255, 255, 0.8)'
                                }}>
                                    Para hoje:
                                </span>
                                <span style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: 'rgb(251, 146, 60)'
                                }}>
                                    {mappedStats.todayTasksCount}
                                </span>
                            </div>
                        </div>

                        <Link
                            to="/tasks?status=pending&overdue=true"
                            style={{
                                color: 'rgb(96, 165, 250)',
                                fontSize: '0.875rem',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                fontWeight: '500'
                            }}
                            aria-label="Resolver tarefas críticas"
                        >
                            Resolver críticas
                            <ArrowRight size={14} style={{ marginLeft: '0.25rem' }} />
                        </Link>
                    </div>

                    {/* Margem de Lucro */}
                    <div style={glassCardStyle}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '1rem'
                        }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                                marginRight: '0.75rem'
                            }}>
                                <TrendingUp size={20} style={{ color: 'rgb(251, 191, 36)' }} />
                            </div>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                margin: 0,
                                color: 'white'
                            }}>
                                Margem de Lucro
                            </h3>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem'
                            }}>
                                <span style={{
                                    fontSize: '0.875rem',
                                    color: 'rgba(255, 255, 255, 0.8)'
                                }}>
                                    Margem média:
                                </span>
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: '700',
                                    color: 'rgb(251, 191, 36)'
                                }}>
                                    {Math.round(mappedStats.average_profit_margin)}%
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{
                                    fontSize: '0.875rem',
                                    color: 'rgba(255, 255, 255, 0.8)'
                                }}>
                                    Não rentáveis:
                                </span>
                                <span style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: 'rgb(239, 68, 68)'
                                }}>
                                    {mappedStats.unprofitableClientsCount}
                                </span>
                            </div>
                        </div>

                        <Link
                            to="/profitability"
                            style={{
                                color: 'rgb(96, 165, 250)',
                                fontSize: '0.875rem',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                fontWeight: '500'
                            }}
                            aria-label="Ver análise de rentabilidade"
                        >
                            Ver análise
                            <ArrowRight size={14} style={{ marginLeft: '0.25rem' }} />
                        </Link>
                    </div>
                </div>

                {/* Time & Productivity Stats - com estilo glass */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '1.8rem'
                }}>
                    {/* Tempo de Hoje */}
                    <div style={glassCardStyle}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            marginBottom: '1rem' 
                        }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                marginRight: '0.75rem'
                            }}>
                                <Timer size={24} style={{ color: 'rgb(59, 130, 246)' }} />
                            </div>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                margin: 0,
                                color: 'white'
                            }}>
                                Hoje
                            </h3>
                        </div>
                        
                        <p style={{
                            fontSize: '1.8rem',
                            fontWeight: '700',
                            color: 'rgb(52, 211, 153)',
                            margin: '0 0 0.5rem 0'
                        }}>
                            {formatMinutes(mappedStats.timeTrackedToday)}
                        </p>
                        
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'rgba(255, 255, 255, 0.8)',
                            margin: '0 0 1rem 0'
                        }}>
                            Total de tempo monitorado hoje
                        </p>
                        
                        <Link
                            to="/timeentry"
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                color: 'white',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontWeight: '500',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                            aria-label="Ir para registo de tempo"
                        >
                            <Clock size={16} style={{ marginRight: '0.5rem' }} />
                            Registar tempo
                        </Link>
                    </div>

                    {/* Score de Eficiência */}
                    <div style={glassCardStyle}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            marginBottom: '1rem' 
                        }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(147, 51, 234, 0.2)',
                                marginRight: '0.75rem'
                            }}>
                                <TrendingUp size={24} style={{ color: 'rgb(147, 51, 234)' }} />
                            </div>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                margin: 0,
                                color: 'white'
                            }}>
                                Score de Eficiência
                            </h3>
                        </div>

                        {/* Progress Bar */}
                        <div style={{
                            width: '100%',
                            height: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            marginBottom: '1rem',
                            overflow: 'hidden'
                        }}>
                            <motion.div 
                                style={{
                                    height: '100%',
                                    background: 'linear-gradient(to right, rgb(147, 51, 234), rgb(196, 181, 253))',
                                    borderRadius: '4px'
                                }}
                                initial={{ width: "0%" }}
                                animate={{ width: `${Math.round(((mappedStats.timeTrackedToday) / 480) * 100)}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                            />
                        </div>

                        <p style={{
                            fontSize: '1.8rem',
                            fontWeight: '700',
                            color: 'rgb(147, 51, 234)',
                            margin: '0 0 0.5rem 0'
                        }}>
                            {Math.round(((mappedStats.timeTrackedToday) / Math.max(480, 1)) * 100)}%
                        </p>
                        
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'rgba(255, 255, 255, 0.8)',
                            margin: '0 0 1rem 0'
                        }}>
                            Meta: 8h diárias
                        </p>
                        
                        <Link
                            to="/analytics/efficiency"
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                color: 'white',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontWeight: '500',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                            aria-label="Ver análise de eficiência detalhada"
                        >
                            <BarChart2 size={16} style={{ marginRight: '0.5rem' }} />
                            Ver eficiência
                        </Link>
                    </div>

                    {/* Tarefas Concluídas */}
                    <div style={glassCardStyle}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            marginBottom: '1rem' 
                        }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(52, 211, 153, 0.2)',
                                marginRight: '0.75rem'
                            }}>
                                <CheckSquare size={24} style={{ color: 'rgb(52, 211, 153)' }} />
                            </div>
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                margin: 0,
                                color: 'white'
                            }}>
                                Tarefas Concluídas
                            </h3>
                        </div>
                        
                        <p style={{
                            fontSize: '1.8rem',
                            fontWeight: '700',
                            color: 'rgb(52, 211, 153)',
                            margin: '0 0 0.5rem 0'
                        }}>
                            {mappedStats.tasksCompletedThisWeek}
                        </p>
                        
                        <p style={{
                            fontSize: '0.875rem',
                            color: 'rgba(255, 255, 255, 0.8)',
                            margin: '0 0 1rem 0'
                        }}>
                            últimos 7 dias
                        </p>
                        
                        <Link
                            to="/tasks?status=completed"
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                color: 'white',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontWeight: '500',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                            aria-label="Ver tarefas concluídas"
                        >
                            <CheckCircle size={16} style={{ marginRight: '0.5rem' }} />
                            Ver concluídas
                        </Link>
                    </div>
                </div>

                {/* Smart Insights Section - com estilo glass */}
                <div style={glassCardStyle}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                        marginBottom: '1rem'
                    }}>
                        <h2 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            margin: 0,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(147, 51, 234, 0.2)',
                                marginRight: '0.75rem'
                            }}>
                                <Activity size={20} style={{ color: 'rgb(147, 51, 234)' }} />
                            </div>
                            Smart Insights
                        </h2>
                        <motion.div
                            animate={{
                                rotate: [0, 10, -10, 0],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <Sparkles style={{ color: 'rgb(196, 181, 253)' }} size={16} />
                        </motion.div>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '1rem'
                    }}>
                        {/* Alerta de Baixo Tempo */}
                        {(mappedStats.timeTrackedToday) < 240 && (mappedStats.timeTrackedToday > 0) && (
                            <motion.div 
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    padding: '1rem',
                                    backgroundColor: 'rgba(251, 191, 36, 0.2)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(251, 191, 36, 0.3)'
                                }}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <Clock size={20} style={{ 
                                    color: 'rgb(251, 191, 36)', 
                                    marginRight: '0.75rem', 
                                    marginTop: '0.25rem', 
                                    flexShrink: 0 
                                }} />
                                <div>
                                    <h4 style={{
                                        fontWeight: '500',
                                        color: 'white',
                                        margin: '0 0 0.25rem 0'
                                    }}>
                                        Poucas Horas Diárias
                                    </h4>
                                    <p style={{
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        fontSize: '0.875rem',
                                        margin: 0
                                    }}>
                                        Apenas {formatMinutes(mappedStats.timeTrackedToday)} registadas hoje.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Alerta de Rentabilidade de Clientes */}
                        {(mappedStats.unprofitableClientsCount) > 0 && (
                            <motion.div 
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    padding: '1rem',
                                    backgroundColor: 'rgba(244, 63, 94, 0.2)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(244, 63, 94, 0.3)'
                                }}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <TrendingUp size={20} style={{ 
                                    color: 'rgb(244, 63, 94)', 
                                    marginRight: '0.75rem', 
                                    marginTop: '0.25rem', 
                                    flexShrink: 0 
                                }} />
                                <div>
                                    <h4 style={{
                                        fontWeight: '500',
                                        color: 'white',
                                        margin: '0 0 0.25rem 0'
                                    }}>
                                        Otimização de Lucro
                                    </h4>
                                    <p style={{
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        fontSize: '0.875rem',
                                        margin: 0
                                    }}>
                                        {mappedStats.unprofitableClientsCount} clientes precisam de ajuste.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Alerta de Carga de Tarefas */}
                        {(mappedStats.todayTasksCount) > 5 && (
                            <motion.div 
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    padding: '1rem',
                                    backgroundColor: 'rgba(56, 189, 248, 0.2)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(56, 189, 248, 0.3)'
                                }}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Clipboard size={20} style={{ 
                                    color: 'rgb(56, 189, 248)', 
                                    marginRight: '0.75rem', 
                                    marginTop: '0.25rem', 
                                    flexShrink: 0 
                                }} />
                                <div>
                                    <h4 style={{
                                        fontWeight: '500',
                                        color: 'white',
                                        margin: '0 0 0.25rem 0'
                                    }}>
                                        Carga Alta de Tarefas
                                    </h4>
                                    <p style={{
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        fontSize: '0.875rem',
                                        margin: 0
                                    }}>
                                        {mappedStats.todayTasksCount} tarefas para hoje.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Mensagem de Sucesso - Apenas se não houver outros alertas */}
                        {(mappedStats.timeTrackedToday >= 240 || mappedStats.timeTrackedToday === 0) &&
                         (mappedStats.unprofitableClientsCount === 0) &&
                         (mappedStats.todayTasksCount <= 5) &&
                         (mappedStats.overdueTasksCount === 0) && (
                            <motion.div 
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    padding: '1rem',
                                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(16, 185, 129, 0.3)'
                                }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                            >
                                <CheckCircle size={20} style={{ 
                                    color: 'rgb(16, 185, 129)', 
                                    marginRight: '0.75rem', 
                                    marginTop: '0.25rem', 
                                    flexShrink: 0 
                                }} />
                                <div>
                                    <h4 style={{
                                        fontWeight: '500',
                                        color: 'white',
                                        margin: '0 0 0.25rem 0'
                                    }}>
                                        Tudo Otimizado
                                    </h4>
                                    <p style={{
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        fontSize: '0.875rem',
                                        margin: 0
                                    }}>
                                        Excelente progresso e gestão!
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Atividade Recente - com estilo glass */}
                <div style={glassCardStyle}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                        marginBottom: '1rem'
                    }}>
                        <h2 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            margin: 0,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <div style={{
                                padding: '0.5rem',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(52, 211, 153, 0.2)',
                                marginRight: '0.75rem'
                            }}>
                                <Activity size={20} style={{ color: 'rgb(52, 211, 153)' }} />
                            </div>
                            Atividade Recente
                        </h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'rgba(56, 189, 248, 0.2)',
                                    color: 'rgb(56, 189, 248)',
                                    borderRadius: '9999px',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(56, 189, 248, 0.3)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(56, 189, 248, 0.2)'}
                                aria-label="Filtrar por hoje"
                            >
                                Hoje
                            </button>
                            <button 
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    borderRadius: '9999px',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                                aria-label="Filtrar por semana"
                            >
                                Semana
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {mappedStats.recentTimeEntries?.length === 0 && mappedStats.upcomingTasks?.length === 0 && (
                            <div style={{
                                textAlign: 'center',
                                padding: '1.8rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <Activity size={40} style={{ 
                                    color: 'rgba(255, 255, 255, 0.4)', 
                                    margin: '0 auto 1rem auto' 
                                }} />
                                <p style={{ 
                                    color: 'rgba(255, 255, 255, 0.6)', 
                                    margin: 0,
                                    fontSize: '0.875rem'
                                }}>
                                    Sem atividade recente
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div style={containerStyle}>
            <AnimatePresence mode="wait" custom={currentPage}>
                {currentPage === 0 ? (
                    <FirstPage key="first" />
                ) : (
                    <SecondPage key="second" />
                )}
            </AnimatePresence>

            {/* Navigation Controls com melhor acessibilidade */}
            {currentPage === 1 && (
                <motion.button
                    style={leftNavStyle}
                    onClick={() => handlePageChange('prev')}
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.25)' }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    aria-label="Ir para análises detalhadas"
                    tabIndex={0}
                >
                    <ChevronRight size={24} style={{ color: 'white' }} />
                </motion.button>
            )}

            {/* Page Indicators com melhor acessibilidade */}
            <div style={pageIndicatorStyle} role="tablist" aria-label="Navegação de páginas">
                <button
                    style={currentPage === 0 ? activeDotStyle : inactiveDotStyle}
                    onClick={() => !isTransitioning && setCurrentPage(0)}
                    disabled={isTransitioning}
                    aria-label="Ir para dashboard principal"
                    aria-pressed={currentPage === 0}
                    role="tab"
                    tabIndex={0}
                />
                <button
                    style={currentPage === 1 ? activeDotStyle : inactiveDotStyle}
                    onClick={() => !isTransitioning && setCurrentPage(1)}
                    disabled={isTransitioning}
                    aria-label="Ir para análises detalhadas"
                    aria-pressed={currentPage === 1}
                    role="tab"
                    tabIndex={0}
                />
            </div>

            {/* Skip to content link para acessibilidade */}
            <a
                href="#main-content"
                style={{
                    position: 'absolute',
                    top: '-40px',
                    left: '6px',
                    backgroundColor: 'white',
                    color: 'black',
                    padding: '8px',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '500',
                    zIndex: 1000,
                    transition: 'top 0.3s'
                }}
                onFocus={(e) => e.target.style.top = '6px'}
                onBlur={(e) => e.target.style.top = '-40px'}
            >
                Saltar para conteúdo principal
            </a>

            {/* Screen reader announcements */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                style={{
                    position: 'absolute',
                    left: '-10000px',
                    width: '1px',
                    height: '1px',
                    overflow: 'hidden'
                }}
            >
                {currentPage === 0 ? 'Dashboard principal carregado' : 'Análises detalhadas carregadas'}
            </div>
        </div>
    );
};

export default DashboardPages; 
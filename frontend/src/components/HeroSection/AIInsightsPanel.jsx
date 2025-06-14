import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Brain, 
    ArrowRight, 
    Sparkles, 
    TrendingUp, 
    ChevronLeft, 
    ChevronRight,
    Play,
    Pause,
    BarChart3,
    Clock,
    CheckSquare,
    AlertTriangle,
    Users
} from 'lucide-react';
import { usePermissions } from '../../contexts/PermissionsContext'; // Adjust path as needed

const AIInsightsPanel = ({ insights = [], businessStatus, dashboardData }) => {
    const [currentInsight, setCurrentInsight] = useState(0);
    const [isAutoRotating, setIsAutoRotating] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const permissions = usePermissions();
    
    // Debug logs
    console.log("🔍 AI Insights Panel Data Recebido (AIInsightsPanel.jsx):", insights);
    console.log("📊 Business Status:", businessStatus);
    console.log("📊 Dashboard Data:", dashboardData);
    console.log("🎯 Component mounted and rendering");

    // ✅ Move mappedStatsFromSummary here and use dashboardData prop
    const mappedStatsFromSummary = useMemo(() => ({
        timeTrackedToday: dashboardData?.summary?.time_tracked_today || 0,
        activeTasks: dashboardData?.summary?.active_tasks || 0,
        overdueTasksCount: dashboardData?.summary?.overdue_tasks || 0,
        unprofitableClientsCount: dashboardData?.summary?.unprofitable_clients || 0,
    }), [dashboardData?.summary]);

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

    // Auto-rotate insights every 5 seconds
    useEffect(() => {
        console.log("⏰ Auto-rotation effect triggered", { isAutoRotating, isPaused, insightsLength: insights.length });
        
        if (!isAutoRotating || isPaused || insights.length <= 1) {
            console.log("❌ Auto-rotation stopped");
            return;
        }

        const interval = setInterval(() => {
            console.log("🔄 Auto-rotating to next insight");
            setCurrentInsight((prev) => (prev + 1) % insights.length);
        }, 5000);

        return () => {
            console.log("🧹 Cleaning up auto-rotation interval");
            clearInterval(interval);
        };
    }, [isAutoRotating, isPaused, insights.length]);

    const handlePrevious = () => {
        console.log("⬅️ Previous insight clicked");
        setCurrentInsight((prev) => 
            prev === 0 ? insights.length - 1 : prev - 1
        );
    };

    const handleNext = () => {
        console.log("➡️ Next insight clicked");
        setCurrentInsight((prev) => (prev + 1) % insights.length);
    };

    const handlePauseToggle = () => {
        console.log("⏸️ Pause toggle clicked", { currentState: isPaused });
        setIsPaused(!isPaused);
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8) return 'rgb(52, 211, 153)';
        if (confidence >= 0.6) return 'rgb(251, 191, 36)';
        return 'rgb(251, 146, 60)';
    };

    const containerStyle = {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '1.5rem',
        height: '100%',
        minHeight: '320px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'relative', // Add position for debugging
        zIndex: 1 // Add z-index for debugging
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    const insightVariants = {
        enter: { 
            x: 300, 
            opacity: 0,
            scale: 0.9
        },
        center: { 
            x: 0, 
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30
            }
        },
        exit: { 
            x: -300, 
            opacity: 0,
            scale: 0.9,
            transition: {
                duration: 0.2
            }
        }
    };

    const currentInsightData = insights && insights.length > 0 ? insights[currentInsight] : null;

    const getImpactBadge = (impact) => {
        const badges = {
            high: { 
                color: 'rgba(239, 68, 68, 0.2)',
                textColor: 'rgb(252, 165, 165)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                label: 'Alto Impacto'
            },
            medium: { 
                color: 'rgba(245, 158, 11, 0.2)',
                textColor: 'rgb(253, 230, 138)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                label: 'Médio Impacto'
            },
            positive: { 
                color: 'rgba(16, 185, 129, 0.2)',
                textColor: 'rgb(110, 231, 183)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                label: 'Positivo'
            }
        };
        return badges[impact] || badges.medium;
    };
    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem'
    };

    const headerLeftStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
    };

    const iconContainerStyle = {
        padding: '0.5rem',
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
        borderRadius: '12px'
    };

    const controlsStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    };

    const buttonStyle = {
        padding: '0.5rem',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    };

    const buttonHoverStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.1)'
    };

    const insightContainerStyle = {
        position: 'relative',
        height: '128px',
        marginBottom: '1.5rem'
    };

    const insightCardStyle = {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    };

    const insightHeaderStyle = {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '1rem'
    };

    const insightIconStyle = {
        padding: '0.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px'
    };

    const actionButtonStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: 'white',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        border: 'none',
        borderRadius: '8px',
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: 'pointer',
        marginTop: '2rem',
        alignSelf: 'flex-start',
        transition: 'background-color 0.2s',
        marginLeft: '-1.5rem',
        marginBottom: '1rem'
    };

    const actionButtonHoverStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.2)'
    };

    const progressBarContainerStyle = {
        marginTop: '1rem',
        marginBottom: '1rem'
    };

    const progressBarStyle = {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        height: '4px'
    };

    // Debug: Check if insights array is empty or invalid
    if (!insights || !Array.isArray(insights) || insights.length === 0) {
        console.log("❌ No insights available, showing loading state");
        return (
            <motion.div 
                style={containerStyle}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '128px',
                    color: 'rgba(255, 255, 255, 0.6)'
                }}>
                    <Brain style={{ marginRight: '0.75rem' }} size={24} />
                    <span>Analisando dados para gerar insights...</span>
                </div>
            </motion.div>
        );
    }

    console.log("✅ Rendering full insights panel with", insights.length, "insights");


    const useInsightAction = () => {
        const navigate = useNavigate();
        return (insight) => {
            if (!insight || !insight.type) return;
            if (insight.type === "urgent_tasks") {
                navigate("/tasks");
            } else if (insight.type === "profit_optimization") {
                navigate("/clientprofitability");
            }
        };
    };

    const insightAction = useInsightAction();
    return (
        <motion.div 
            style={containerStyle}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            // Add debugging props
            data-testid="ai-insights-panel"
            data-insights-count={insights.length}
        >
            {/* Header */}
            <div style={headerStyle}>
                <div style={headerLeftStyle}>
                    <motion.div
                        animate={{ 
                            rotate: [0, 360],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                            scale: { duration: 2, repeat: Infinity }
                        }}
                        style={iconContainerStyle}
                    >
                        <Brain style={{ color: 'rgb(196, 181, 253)' }} size={24} />
                    </motion.div>
                    <div>
                        <h3 style={{ 
                            color: 'white', 
                            fontWeight: '600', 
                            fontSize: '1.125rem',
                            margin: 0 
                        }}>
                            AI Insights
                        </h3>
                        <p style={{ 
                            color: 'rgb(191, 219, 254)', 
                            fontSize: '0.875rem',
                            margin: 0 
                        }}>
                            Análise inteligente em tempo real
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div style={controlsStyle}>
                    <motion.button
                        onClick={handlePauseToggle}
                        style={buttonStyle}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = buttonHoverStyle.backgroundColor}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        {isPaused ? 
                            <Play style={{ color: 'rgba(255, 255, 255, 0.7)' }} size={16} /> : 
                            <Pause style={{ color: 'rgba(255, 255, 255, 0.7)' }} size={16} />
                        }
                    </motion.button>
                    
                    <motion.button
                        onClick={handlePrevious}
                        style={buttonStyle}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = buttonHoverStyle.backgroundColor}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        <ChevronLeft style={{ color: 'rgba(255, 255, 255, 0.7)' }} size={16} />
                    </motion.button>
                    
                    <motion.button
                        onClick={handleNext}
                        style={buttonStyle}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = buttonHoverStyle.backgroundColor}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        <ChevronRight style={{ color: 'rgba(255, 255, 255, 0.7)' }} size={16} />
                    </motion.button>
                </div>
            </div>

            {/* Progress Bar for Auto-rotation */}
            {isAutoRotating && !isPaused && insights.length > 1 && (
                <div style={progressBarContainerStyle}>
                    <div style={progressBarStyle}>
                        <motion.div
                            style={{
                                background: 'linear-gradient(to right, rgb(96, 165, 250), rgb(147, 51, 234))',
                                height: '4px',
                                borderRadius: '4px',
                            }}
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ 
                                duration: 5,
                                ease: "linear",
                                repeat: Infinity
                            }}
                            key={currentInsight}
                        />
                    </div>
                </div>
            )}

            {/* Main Insight Display */}
            <div style={insightContainerStyle}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentInsight}
                        variants={insightVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        style={insightCardStyle}
                    >
                        {currentInsightData && (
                            <>
                                <div>
                                    <div style={insightHeaderStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={insightIconStyle}>
                                                {/* Safe icon rendering */}
                                                {currentInsightData.icon && React.createElement(currentInsightData.icon, {
                                                    style: { color: currentInsightData.color || 'white' },
                                                    size: 20
                                                })}
                                            </div>
                                            <div>
                                                <h4 style={{ 
                                                    color: 'white', 
                                                    fontWeight: '500',
                                                    margin: 0 
                                                }}>
                                                    {currentInsightData.title || 'Insight sem título'}
                                                </h4>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '0.5rem', 
                                                    marginTop: '0.25rem' 
                                                }}>
                                                    <div style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '9999px',
                                                        fontSize: '0.75rem',
                                                        border: `1px solid ${getImpactBadge(currentInsightData.impact).borderColor}`,
                                                        backgroundColor: getImpactBadge(currentInsightData.impact).color,
                                                        color: getImpactBadge(currentInsightData.impact).textColor
                                                    }}>
                                                        {getImpactBadge(currentInsightData.impact).label}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <p style={{ 
                                        color: 'rgb(191, 219, 254)', 
                                        fontSize: '0.875rem', 
                                        lineHeight: 1.6,
                                        margin: 0 
                                    }}>
                                        {currentInsightData.message || 'Nenhuma mensagem disponível'}
                                    </p>
                                </div>

                                                                                <motion.button
                                                                                    style={actionButtonStyle}
                                                                                    whileHover={{ scale: 1.02, x: 5 }}
                                                                                    whileTap={{ scale: 0.98 }}
                                                                                    onMouseEnter={(e) => e.target.style.backgroundColor = actionButtonHoverStyle.backgroundColor}
                                                                                    onMouseLeave={(e) => e.target.style.backgroundColor = actionButtonStyle.backgroundColor}
                                                                                    onClick={() => insightAction(currentInsightData)}
                                                                                >
                                                                                    <span>Tomar Ação</span>
                                                                                    <ArrowRight size={14} />
                                                                                </motion.button>
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default AIInsightsPanel;
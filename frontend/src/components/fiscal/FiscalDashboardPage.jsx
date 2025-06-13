import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { toast, ToastContainer } from 'react-toastify';
import { motion } from 'framer-motion';
import { BarChart2, ListChecks, AlertTriangle, Calendar, PlayCircle, Settings, Loader2, RefreshCw, Clock, CheckCircle, Archive, Users, Zap, TrendingUp, FileText, Eye, Activity, ListCheck } from 'lucide-react';
import BackgroundElements from '../../components/HeroSection/BackgroundElements';
import { usePermissions } from '../../contexts/PermissionsContext';
import { Link } from 'react-router-dom'; // For navigation links

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    color: 'white',
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
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

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 200,
            damping: 20
        }
    }
};

const StatCard = ({ title, value, icon, color = 'rgb(59, 130, 246)', unit = '', linkTo, isLoading }) => {
    const IconComponent = icon;
    const cardContent = (
        <motion.div
            style={{ ...glassStyle, padding: '1.5rem', textAlign: 'center', background: `rgba(${color.replace('rgb(', '').replace(')', '')}, 0.1)`, border: `1px solid rgba(${color.replace('rgb(', '').replace(')', '')}, 0.2)` }}
            whileHover={{ scale: 1.03, y: -5, boxShadow: `0 0 20px rgba(${color.replace('rgb(', '').replace(')', '')}, 0.3)` }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: `rgba(${color.replace('rgb(', '').replace(')', '')}, 0.2)`, borderRadius: '12px', marginRight: '1rem' }}>
                    <IconComponent size={24} style={{ color }} />
                </div>
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', textAlign: 'left', flexGrow: 1 }}>{title}</h3>
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

    if (linkTo) {
        return <Link to={linkTo} style={{ textDecoration: 'none' }}>{cardContent}</Link>;
    }
    return cardContent;
};


const FiscalDashboardPage = () => {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const [manualGenerationParams, setManualGenerationParams] = useState({
        months_ahead: 3,
        clean_old: false,
        days_old: 30,
    });

    // Fetch Fiscal Stats
    const { data: fiscalStats, isLoading: isLoadingStats, isError: isErrorStats, error: errorStats, refetch: refetchStats } = useQuery({
        queryKey: ['fiscalStats'],
        queryFn: async () => {
            const response = await api.get('/fiscal/stats/');
            return response.data;
        },
        enabled: permissions.isOrgAdmin || permissions.canViewAnalytics,
        staleTime: 5 * 60 * 1000,
    });

    const { data: upcomingDeadlines = [], isLoading: isLoadingDeadlines, refetch: refetchDeadlines } = useQuery({
        queryKey: ['upcomingFiscalDeadlines'],
        queryFn: async () => {
            try {
                // Adjust params as needed, e.g., days=7 for next week
                const response = await api.get('/fiscal/upcoming-deadlines/?days=30&limit=10');
                return response.data; // Assuming the backend returns an array of tasks directly
            } catch (e) {
                console.error("Error fetching upcoming fiscal deadlines:", e);
                toast.error("Falha ao carregar prazos fiscais futuros.");
                return []; // Return empty array on error
            }
        },
        enabled: permissions.isOrgAdmin || permissions.canViewAnalytics, // Same condition as fiscalStats
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    // Manual Generation Mutation
    const manualGenerateMutation = useMutation({
        mutationFn: (params) => api.post('/fiscal/generate-manual/', params),
        onSuccess: (data) => {
            toast.success(data.data.message || 'Geração manual concluída!');
            queryClient.invalidateQueries({ queryKey: ['fiscalStats'] });
            queryClient.invalidateQueries({ queryKey: ['upcomingFiscalDeadlines'] }); // Invalidate to refetch
        },
        onError: (err) => {
            toast.error(`Falha na geração manual: ${err.response?.data?.error || err.message}`);
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

    const PRIORITY_MAP = { 1: "Urgente", 2: "Alta", 3: "Média", 4: "Baixa", 5: "Pode Esperar" };
    const PRIORITY_COLOR_MAP = { 1: "rgb(239, 68, 68)", 2: "rgb(251, 146, 60)", 3: "rgb(251, 191, 36)", 4: "rgb(59, 130, 246)", 5: "rgba(255,255,255,0.6)" };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('pt-PT', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    if (!permissions.isOrgAdmin && !permissions.canViewAnalytics && !permissions.loading) {
        return (
            <div style={{ ...glassStyle, padding: '2rem', margin: '2rem auto', maxWidth: '600px', textAlign: 'center' }}>
                <AlertTriangle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
                <h2>Acesso Restrito</h2>
                <p>Você não tem permissão para visualizar o dashboard fiscal.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', color: 'white', minHeight: '100vh', position: 'relative' }}>
            <BackgroundElements />
            <ToastContainer position="top-right" autoClose={4000} theme="dark" />

            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                style={{
                    position: 'relative',
                    zIndex: 10,
                    padding: '2rem',
                    paddingTop: '1rem',
                }}
            >
                <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <ListChecks size={36} style={{ color: 'rgb(52,211,153)' }} />
                        <div>
                            <h1 style={{
                                fontSize: '1.8rem',
                                fontWeight: '700',
                                margin: '0 0 0.5rem 0',
                                // Use the more specific 'backgroundImage' property instead of the 'background' shorthand
                                backgroundImage: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                            }}>
                                Obrigações Fiscais
                            </h1>
                            <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>Organize e acompanhe todas as suas tarefas.</p>
                        </div>
                    </div>
                    <motion.button
                        onClick={() => { refetchStats(); refetchDeadlines(); }} // Update to refetch both
                        disabled={isLoadingStats || isLoadingDeadlines}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{ ...glassStyle, padding: '0.75rem 1.5rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {(isLoadingStats || isLoadingDeadlines) ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        Atualizar
                    </motion.button>
                </motion.div>

                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <StatCard title="Total Gerado" value={fiscalStats?.total_generated || 0} icon={FileText} color="rgb(52, 211, 153)" isLoading={isLoadingStats} />
                    <StatCard title="Pendentes" value={fiscalStats?.pending || 0} icon={Clock} color="rgb(251, 191, 36)" isLoading={isLoadingStats} />
                    <StatCard title="Concluídas" value={fiscalStats?.completed || 0} icon={CheckCircle} color="rgb(59, 130, 246)" isLoading={isLoadingStats} />
                    <StatCard title="Em Atraso" value={fiscalStats?.overdue || 0} icon={AlertTriangle} color="rgb(239, 68, 68)" isLoading={isLoadingStats} />
                    <StatCard title="Taxa de Conclusão" value={parseFloat(fiscalStats?.completion_rate || 0).toFixed(1)} unit="%" icon={TrendingUp} color="rgb(147, 51, 234)" isLoading={isLoadingStats} />
                </div>

                {/* Sections: Manual Generation & Upcoming Deadlines */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', md: { gridTemplateColumns: '1fr 1fr' }, gap: '2rem', marginBottom: '2rem' }}>
                    {/* Manual Generation */}
                    {permissions.isOrgAdmin && (
                        <motion.section style={{ ...glassStyle, padding: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                                <PlayCircle size={20} style={{ color: 'rgb(52, 211, 153)' }} /> Geração Manual
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label htmlFor="months_ahead" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Meses Futuros:</label>
                                    <input type="number" name="months_ahead" id="months_ahead" value={manualGenerationParams.months_ahead} onChange={handleManualGenerationParamChange} min="1" max="12" style={inputStyle} />
                                </div>
                                <div>
                                    <label htmlFor="days_old" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Limpar Antigas (dias):</label>
                                    <input type="number" name="days_old" id="days_old" value={manualGenerationParams.days_old} onChange={handleManualGenerationParamChange} min="1" max="365" style={inputStyle} disabled={!manualGenerationParams.clean_old} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input type="checkbox" name="clean_old" id="clean_old" checked={manualGenerationParams.clean_old} onChange={handleManualGenerationParamChange} style={{ width: '18px', height: '18px' }} />
                                        <label htmlFor="clean_old" style={{ fontSize: '0.875rem' }}>Limpar Antigas?</label>
                                    </div>
                                </div>
                            </div>
                            <motion.button
                                onClick={triggerManualGeneration}
                                disabled={manualGenerateMutation.isPending}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                style={{ ...glassStyle, width: '100%', padding: '0.75rem', background: 'rgba(52, 211, 153, 0.3)', border: '1px solid rgba(52, 211, 153, 0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: '500' }}
                            >
                                {manualGenerateMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} />}
                                Iniciar Geração
                            </motion.button>
                        </motion.section>
                    )}

                    {/* Upcoming Deadlines */}
                    <motion.section style={{ ...glassStyle, padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                            <Calendar size={20} style={{ color: 'rgb(251, 146, 60)' }} /> Prazos Próximos (30 dias)
                        </h2>
                        {isLoadingDeadlines ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Loader2 size={24} className="animate-spin" /></div>
                        ) : upcomingDeadlines.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)' }}>Nenhum prazo fiscal iminente.</p>
                        ) : (
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="custom-scrollbar">
                                {upcomingDeadlines.map(task => (
                                    <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <Link to={`/tasks?taskId=${task.id}`} style={{ textDecoration: 'none', color: 'white', fontWeight: '500', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                                                {task.title}
                                            </Link>
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>{task.client_name || 'Cliente não especificado'}</span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ display: 'block', color: PRIORITY_COLOR_MAP[task.priority] || PRIORITY_COLOR_MAP[3], fontWeight: '500', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                                {PRIORITY_MAP[task.priority] || 'Média'}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{formatDate(task.deadline)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.section>
                </div>

                {/* Links to other Fiscal Pages */}
                <motion.section style={{ ...glassStyle, padding: '1.5rem', marginTop: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                        <Activity size={20} style={{ color: 'rgb(147, 51, 234)' }} /> Ações e Gestão
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        <Link to="/fiscal-definitions" style={{ textDecoration: 'none' }}>
                            <motion.div style={{ ...glassStyle, padding: '1.5rem', textAlign: 'center', background: 'rgba(147, 51, 234, 0.15)', border: '1px solid rgba(147, 51, 234, 0.25)' }} whileHover={{ scale: 1.05 }}>
                                <Archive size={32} style={{ color: 'rgb(147, 51, 234)', marginBottom: '0.5rem' }} />
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0.5rem 0' }}>Gerir Definições</h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Criar e editar regras fiscais.</p>
                            </motion.div>
                        </Link>
                        <Link to="/fiscal-settings" style={{ textDecoration: 'none' }}>
                            <motion.div style={{ ...glassStyle, padding: '1.5rem', textAlign: 'center', background: 'rgba(147, 51, 234, 0.15)', border: '1px solid rgba(147, 51, 234, 0.25)' }} whileHover={{ scale: 1.05 }}>
                                <Settings size={32} style={{ color: 'rgb(147, 51, 234)', marginBottom: '0.5rem' }} />
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0.5rem 0' }}>Configurações</h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Ajustar sistema e notificações.</p>
                            </motion.div>
                        </Link>
                        <Link to="/clients" style={{ textDecoration: 'none' }}>
                            <motion.div style={{ ...glassStyle, padding: '1.5rem', textAlign: 'center', background: 'rgba(147, 51, 234, 0.15)', border: '1px solid rgba(147, 51, 234, 0.25)' }} whileHover={{ scale: 1.05 }}>
                                <Users size={32} style={{ color: 'rgb(147, 51, 234)', marginBottom: '0.5rem' }} />
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: '0.5rem 0' }}>Gerir Tags de Clientes</h3>
                                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Atribuir tags fiscais aos clientes.</p>
                            </motion.div>
                        </Link>
                    </div>
                </motion.section>

            </motion.div>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.4);
                }
            `}</style>
        </div>
    );
};

export default FiscalDashboardPage;
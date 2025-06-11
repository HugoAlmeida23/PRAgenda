import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Settings, Calendar, TrendingUp, AlertTriangle, CheckCircle, 
    Clock, Users, FileText, Play, RotateCcw, Download, Upload,
    Filter, Search, Plus, Edit3, Trash2, Eye, Target, Zap,
    BarChart3, PieChart, Activity, Bell, RefreshCw, Cog,
    Building, Tag, ListChecks, Sparkles
} from 'lucide-react';

// Dados simulados para demonstração
const MOCK_DATA = {
    stats: {
        total_generated: 1247,
        pending: 89,
        completed: 1098,
        overdue: 60,
        completion_rate: 88.1,
        organization: 'Escritório ABC Contabilidade'
    },
    definitions: [
        {
            id: 1,
            name: 'Declaração Periódica de IVA Trimestral',
            periodicity: 'QUARTERLY',
            applies_to_client_tags: ['EMPRESA', 'IVA_TRIMESTRAL'],
            deadline_day: 20,
            deadline_month_offset: 1,
            is_active: true,
            tasks_generated: 48,
            organization_name: null
        },
        {
            id: 2,
            name: 'Modelo 22 - Declaração IRC',
            periodicity: 'ANNUAL',
            applies_to_client_tags: ['EMPRESA', 'REGIME_GERAL_IRC'],
            deadline_day: 31,
            deadline_month_offset: 5,
            is_active: true,
            tasks_generated: 156,
            organization_name: null
        },
        {
            id: 3,
            name: 'IES - Informação Empresarial Simplificada',
            periodicity: 'ANNUAL',
            applies_to_client_tags: ['EMPRESA'],
            deadline_day: 15,
            deadline_month_offset: 7,
            is_active: true,
            tasks_generated: 203,
            organization_name: null
        }
    ],
    clients: [
        {
            id: 1,
            name: 'Empresa XYZ Lda',
            fiscal_tags: ['EMPRESA', 'IVA_TRIMESTRAL', 'REGIME_GERAL_IRC'],
            pending_obligations: 3,
            completed_obligations: 8,
            next_deadline: '2025-01-20'
        },
        {
            id: 2,
            name: 'João Silva (Profissional Liberal)',
            fiscal_tags: ['PROFISSIONAL_LIBERAL', 'IRS_CATEGORIA_B'],
            pending_obligations: 1,
            completed_obligations: 4,
            next_deadline: '2025-06-30'
        }
    ],
    generation_history: [
        { month: '2024-12', tasks_created: 45, tasks_skipped: 12, errors: 0 },
        { month: '2024-11', tasks_created: 38, tasks_skipped: 8, errors: 1 },
        { month: '2024-10', tasks_created: 52, tasks_skipped: 15, errors: 0 },
        { month: '2024-09', tasks_created: 41, tasks_skipped: 9, errors: 2 }
    ]
};

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
};

// Componente principal do dashboard
const FiscalManagementDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastGeneration, setLastGeneration] = useState(null);
    const [showGenerationDialog, setShowGenerationDialog] = useState(false);

    const tabs = [
        { key: 'overview', label: 'Visão Geral', icon: BarChart3 },
        { key: 'definitions', label: 'Definições', icon: ListChecks },
        { key: 'clients', label: 'Clientes', icon: Users },
        { key: 'generation', label: 'Geração', icon: Zap },
        { key: 'settings', label: 'Configurações', icon: Settings }
    ];

    return (
        <div style={{
            padding: '2rem',
            background: 'linear-gradient(135deg, rgb(30, 64, 175) 0%, rgb(91, 33, 182) 50%, rgb(168, 85, 247) 100%)',
            minHeight: '100vh',
            color: 'white'
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ 
                        fontSize: '2.5rem', 
                        fontWeight: '700', 
                        margin: '0 0 0.5rem 0',
                        background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Sistema de Obrigações Fiscais
                    </h1>
                    <p style={{ 
                        fontSize: '1.1rem', 
                        color: 'rgba(191, 219, 254, 1)', 
                        margin: 0 
                    }}>
                        Geração automática e gestão inteligente de obrigações contábeis
                    </p>
                </div>

                {/* Navigation Tabs */}
                <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    marginBottom: '2rem',
                    flexWrap: 'wrap'
                }}>
                    {tabs.map(({ key, label, icon: Icon }) => (
                        <motion.button
                            key={key}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveTab(key)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: activeTab === key 
                                    ? 'rgba(59,130,246,0.3)' 
                                    : 'rgba(255,255,255,0.1)',
                                border: `1px solid ${activeTab === key 
                                    ? 'rgba(59,130,246,0.5)' 
                                    : 'rgba(255,255,255,0.2)'}`,
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <Icon size={18} />
                            {label}
                        </motion.button>
                    ))}
                </div>

                {/* Content based on active tab */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {activeTab === 'overview' && <OverviewPanel />}
                        {activeTab === 'definitions' && <DefinitionsPanel />}
                        {activeTab === 'clients' && <ClientsPanel />}
                        {activeTab === 'generation' && <GenerationPanel />}
                        {activeTab === 'settings' && <SettingsPanel />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

// Painel de visão geral
const OverviewPanel = () => {
    const stats = MOCK_DATA.stats;
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Métricas principais */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem' 
            }}>
                {[
                    { 
                        label: 'Total Gerado', 
                        value: stats.total_generated, 
                        icon: FileText, 
                        color: '#3B82F6',
                        trend: '+12%'
                    },
                    { 
                        label: 'Pendentes', 
                        value: stats.pending, 
                        icon: Clock, 
                        color: '#F59E0B',
                        trend: '-5%'
                    },
                    { 
                        label: 'Concluídas', 
                        value: stats.completed, 
                        icon: CheckCircle, 
                        color: '#10B981',
                        trend: '+8%'
                    },
                    { 
                        label: 'Em Atraso', 
                        value: stats.overdue, 
                        icon: AlertTriangle, 
                        color: '#EF4444',
                        trend: '+3%'
                    }
                ].map(({ label, value, icon: Icon, color, trend }) => (
                    <motion.div
                        key={label}
                        whileHover={{ scale: 1.02 }}
                        style={{
                            ...glassStyle,
                            padding: '1.5rem',
                            borderLeft: `4px solid ${color}`
                        }}
                    >
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '1rem'
                        }}>
                            <div style={{
                                padding: '0.75rem',
                                borderRadius: '12px',
                                backgroundColor: `${color}20`
                            }}>
                                <Icon size={24} style={{ color }} />
                            </div>
                            <span style={{
                                fontSize: '0.75rem',
                                color: trend.startsWith('+') ? '#10B981' : '#EF4444',
                                fontWeight: '600'}}>
                                {trend}
                            </span>
                        </div>
                        <div>
                            <div style={{ 
                                fontSize: '2rem', 
                                fontWeight: '700',
                                color: 'white',
                                marginBottom: '0.25rem'
                            }}>
                                {value.toLocaleString()}
                            </div>
                            <div style={{ 
                                fontSize: '0.875rem',
                                color: 'rgba(255,255,255,0.7)'
                            }}>
                                {label}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Taxa de conclusão e gráficos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Taxa de conclusão */}
                <div style={{ ...glassStyle, padding: '1.5rem' }}>
                    <h3 style={{ 
                        margin: '0 0 1.5rem 0',
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Target size={20} style={{ color: '#10B981' }} />
                        Taxa de Conclusão
                    </h3>
                    
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <div style={{
                            fontSize: '3rem',
                            fontWeight: '700',
                            color: '#10B981',
                            lineHeight: 1
                        }}>
                            {stats.completion_rate}%
                        </div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: 'rgba(255,255,255,0.7)'
                        }}>
                            de obrigações concluídas
                        </div>
                    </div>
                    
                    {/* Barra de progresso */}
                    <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.completion_rate}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #10B981, #34D399)',
                                borderRadius: '4px'
                            }}
                        />
                    </div>
                </div>

                {/* Histórico recente */}
                <div style={{ ...glassStyle, padding: '1.5rem' }}>
                    <h3 style={{ 
                        margin: '0 0 1.5rem 0',
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Activity size={20} style={{ color: '#8B5CF6' }} />
                        Atividade Recente
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {MOCK_DATA.generation_history.slice(0, 4).map((record, index) => (
                            <motion.div
                                key={record.month}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '8px'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: '500', color: 'white' }}>
                                        {record.month}
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.75rem', 
                                        color: 'rgba(255,255,255,0.6)' 
                                    }}>
                                        {record.errors > 0 ? `${record.errors} erros` : 'Sem erros'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ 
                                        color: '#10B981', 
                                        fontWeight: '600' 
                                    }}>
                                        +{record.tasks_created}
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.75rem', 
                                        color: 'rgba(255,255,255,0.6)' 
                                    }}>
                                        -{record.tasks_skipped} skip
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Alertas e notificações */}
            <div style={{ ...glassStyle, padding: '1.5rem' }}>
                <h3 style={{ 
                    margin: '0 0 1.5rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Bell size={20} style={{ color: '#F59E0B' }} />
                    Alertas e Recomendações
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                        {
                            type: 'warning',
                            title: '60 obrigações em atraso',
                            message: 'Há obrigações que ultrapassaram o prazo. Recomenda-se ação imediata.',
                            action: 'Ver detalhes'
                        },
                        {
                            type: 'info',
                            title: 'Próxima geração automática',
                            message: 'A próxima geração automática está agendada para amanhã às 08:00.',
                            action: 'Configurar'
                        },
                        {
                            type: 'success',
                            title: 'Sistema funcionando bem',
                            message: 'Taxa de conclusão acima de 85%. Parabéns pela eficiência!',
                            action: null
                        }
                    ].map((alert, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            style={{
                                padding: '1rem',
                                background: alert.type === 'warning' 
                                    ? 'rgba(245,158,11,0.1)' 
                                    : alert.type === 'info'
                                    ? 'rgba(59,130,246,0.1)'
                                    : 'rgba(16,185,129,0.1)',
                                border: `1px solid ${alert.type === 'warning' 
                                    ? 'rgba(245,158,11,0.3)' 
                                    : alert.type === 'info'
                                    ? 'rgba(59,130,246,0.3)'
                                    : 'rgba(16,185,129,0.3)'}`,
                                borderRadius: '8px',
                                borderLeft: `4px solid ${alert.type === 'warning' 
                                    ? '#F59E0B' 
                                    : alert.type === 'info'
                                    ? '#3B82F6'
                                    : '#10B981'}`
                            }}
                        >
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: '1rem'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ 
                                        fontWeight: '600', 
                                        color: 'white',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {alert.title}
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.875rem',
                                        color: 'rgba(255,255,255,0.8)'
                                    }}>
                                        {alert.message}
                                    </div>
                                </div>
                                {alert.action && (
                                    <button style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '6px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: '500'
                                    }}>
                                        {alert.action}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Painel de definições
const DefinitionsPanel = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    const filteredDefinitions = MOCK_DATA.definitions.filter(def =>
        def.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header com controles */}
            <div style={{ ...glassStyle, padding: '1.5rem' }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem' 
                }}>
                    <div>
                        <h3 style={{ 
                            margin: '0 0 0.5rem 0',
                            fontSize: '1.25rem',
                            fontWeight: '600'
                        }}>
                            Definições de Obrigações Fiscais
                        </h3>
                        <p style={{ 
                            margin: 0,
                            fontSize: '0.875rem',
                            color: 'rgba(255,255,255,0.7)'
                        }}>
                            {MOCK_DATA.definitions.length} definições ativas
                        </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{
                                position: 'absolute',
                                left: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'rgba(255,255,255,0.5)'
                            }} />
                            <input
                                type="text"
                                placeholder="Pesquisar definições..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    minWidth: '250px'
                                }}
                            />
                        </div>
                        
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowCreateDialog(true)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: 'rgba(59,130,246,0.3)',
                                border: '1px solid rgba(59,130,246,0.5)',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}
                        >
                            <Plus size={16} />
                            Nova Definição
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Lista de definições */}
            <div style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
                <div style={{
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)'
                }}>
                    <div style={{ 
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto auto auto',
                        gap: '1rem',
                        alignItems: 'center',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        color: 'rgba(255,255,255,0.8)'
                    }}>
                        <div>Nome da Obrigação</div>
                        <div>Periodicidade</div>
                        <div>Tags Aplicáveis</div>
                        <div>Tarefas Geradas</div>
                        <div>Ações</div>
                    </div>
                </div>
                
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {filteredDefinitions.map((definition, index) => (
                        <motion.div
                            key={definition.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            style={{
                                padding: '1.5rem',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: 'rgba(255,255,255,0.02)'
                            }}
                        >
                            <div style={{ 
                                display: 'grid',
                                gridTemplateColumns: '1fr auto auto auto auto',
                                gap: '1rem',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ 
                                        fontWeight: '600',
                                        color: 'white',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {definition.name}
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.75rem',
                                        color: 'rgba(255,255,255,0.6)'
                                    }}>
                                        Prazo: Dia {definition.deadline_day}, +{definition.deadline_month_offset} mês(es)
                                    </div>
                                    {definition.organization_name && (
                                        <div style={{ 
                                            fontSize: '0.75rem',
                                            color: 'rgba(147,51,234,0.8)',
                                            fontWeight: '500'
                                        }}>
                                            Org: {definition.organization_name}
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '9999px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        background: definition.periodicity === 'MONTHLY' 
                                            ? 'rgba(59,130,246,0.2)' 
                                            : definition.periodicity === 'QUARTERLY'
                                            ? 'rgba(16,185,129,0.2)'
                                            : 'rgba(245,158,11,0.2)',
                                        color: definition.periodicity === 'MONTHLY' 
                                            ? 'rgb(147,197,253)' 
                                            : definition.periodicity === 'QUARTERLY'
                                            ? 'rgb(110,231,183)'
                                            : 'rgb(251,191,36)',
                                        border: `1px solid ${definition.periodicity === 'MONTHLY' 
                                            ? 'rgba(59,130,246,0.3)' 
                                            : definition.periodicity === 'QUARTERLY'
                                            ? 'rgba(16,185,129,0.3)'
                                            : 'rgba(245,158,11,0.3)'}`
                                    }}>
                                        {definition.periodicity === 'MONTHLY' ? 'Mensal' :
                                         definition.periodicity === 'QUARTERLY' ? 'Trimestral' :
                                         definition.periodicity === 'ANNUAL' ? 'Anual' : definition.periodicity}
                                    </span>
                                </div>
                                
                                <div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {definition.applies_to_client_tags.slice(0, 2).map(tag => (
                                            <span
                                                key={tag}
                                                style={{
                                                    padding: '0.125rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.625rem',
                                                    background: 'rgba(147,51,234,0.2)',
                                                    color: 'rgb(196,181,253)',
                                                    border: '1px solid rgba(147,51,234,0.3)'
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                        {definition.applies_to_client_tags.length > 2 && (
                                            <span style={{
                                                fontSize: '0.625rem',
                                                color: 'rgba(255,255,255,0.6)'
                                            }}>
                                                +{definition.applies_to_client_tags.length - 2}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ 
                                        fontWeight: '600',
                                        color: '#10B981'
                                    }}>
                                        {definition.tasks_generated}
                                    </div>
                                    <div style={{ 
                                        fontSize: '0.75rem',
                                        color: 'rgba(255,255,255,0.6)'
                                    }}>
                                        tarefas
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        style={{
                                            padding: '0.5rem',
                                            background: 'rgba(59,130,246,0.2)',
                                            border: '1px solid rgba(59,130,246,0.3)',
                                            borderRadius: '6px',
                                            color: 'rgb(147,197,253)',
                                            cursor: 'pointer'
                                        }}
                                        title="Visualizar"
                                    >
                                        <Eye size={14} />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        style={{
                                            padding: '0.5rem',
                                            background: 'rgba(147,51,234,0.2)',
                                            border: '1px solid rgba(147,51,234,0.3)',
                                            borderRadius: '6px',
                                            color: 'rgb(196,181,253)',
                                            cursor: 'pointer'
                                        }}
                                        title="Editar"
                                    >
                                        <Edit3 size={14} />
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        style={{
                                            padding: '0.5rem',
                                            background: 'rgba(239,68,68,0.2)',
                                            border: '1px solid rgba(239,68,68,0.3)',
                                            borderRadius: '6px',
                                            color: 'rgb(248,113,113)',
                                            cursor: 'pointer'
                                        }}
                                        title="Remover"
                                    >
                                        <Trash2 size={14} />
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Painel de clientes
const ClientsPanel = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div style={{ ...glassStyle, padding: '1.5rem' }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <h3 style={{ 
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: '600'
                    }}>
                        Clientes e Tags Fiscais
                    </h3>
                    
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute',
                            left: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'rgba(255,255,255,0.5)'
                        }} />
                        <input
                            type="text"
                            placeholder="Pesquisar clientes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.875rem',
                                minWidth: '250px'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Lista de clientes */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {MOCK_DATA.clients.map((client, index) => (
                    <motion.div
                        key={client.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        style={{
                            ...glassStyle,
                            padding: '1.5rem',
                            cursor: 'pointer'
                        }}
                        onClick={() => setSelectedClient(client)}
                        whileHover={{ scale: 1.01 }}
                    >
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '1rem'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ 
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    marginBottom: '1rem'
                                }}>
                                    <Building size={20} style={{ color: '#3B82F6' }} />
                                    <h4 style={{ 
                                        margin: 0,
                                        fontSize: '1.125rem',
                                        fontWeight: '600',
                                        color: 'white'
                                    }}>
                                        {client.name}
                                    </h4>
                                </div>
                                
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ 
                                        fontSize: '0.875rem',
                                        color: 'rgba(255,255,255,0.7)',
                                        marginBottom: '0.5rem'
                                    }}>
                                        Tags Fiscais:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {client.fiscal_tags.map(tag => (
                                            <span
                                                key={tag}
                                                style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '9999px',
                                                    fontSize: '0.75rem',
                                                    background: 'rgba(147,51,234,0.2)',
                                                    color: 'rgb(196,181,253)',
                                                    border: '1px solid rgba(147,51,234,0.3)',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                
                                <div style={{ 
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                    gap: '1rem',
                                    fontSize: '0.875rem'
                                }}>
                                    <div>
                                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                                            Pendentes
                                        </div>
                                        <div style={{ 
                                            fontWeight: '600',
                                            color: '#F59E0B'
                                        }}>
                                            {client.pending_obligations}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                                            Concluídas
                                        </div>
                                        <div style={{ 
                                            fontWeight: '600',
                                            color: '#10B981'
                                        }}>
                                            {client.completed_obligations}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                                            Próximo Prazo
                                        </div>
                                        <div style={{ 
                                            fontWeight: '600',
                                            color: 'white'
                                        }}>
                                            {new Date(client.next_deadline).toLocaleDateString('pt-PT')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(59,130,246,0.2)',
                                    border: '1px solid rgba(59,130,246,0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Lógica para testar obrigações do cliente
                                }}
                            >
                                Testar Obrigações
                            </motion.button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// Painel de geração
const GenerationPanel = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationSettings, setGenerationSettings] = useState({
        monthsAhead: 3,
        cleanOld: false,
        daysOld: 30
    });

    const handleGenerate = async () => {
        setIsGenerating(true);
        // Simular geração
        setTimeout(() => {
            setIsGenerating(false);
        }, 3000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Controles de geração */}
            <div style={{ ...glassStyle, padding: '1.5rem' }}>
                <h3 style={{ 
                    margin: '0 0 1.5rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Zap size={20} style={{ color: '#F59E0B' }} />
                    Geração de Obrigações Fiscais
                </h3>
                
                <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem'
                }}>
                    <div>
                        <label style={{ 
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            color: 'rgba(255,255,255,0.8)',
                            fontWeight: '500'
                        }}>
                            Meses futuros para gerar:
                        </label>
                        <select
                            value={generationSettings.monthsAhead}
                            onChange={(e) => setGenerationSettings(prev => ({
                                ...prev,
                                monthsAhead: parseInt(e.target.value)
                            }))}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.875rem'
                            }}
                        >
                            <option value={1}>1 mês</option>
                            <option value={2}>2 meses</option>
                            <option value={3}>3 meses</option>
                            <option value={6}>6 meses</option>
                            <option value={12}>12 meses</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style={{ 
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            color: 'rgba(255,255,255,0.8)',
                            fontWeight: '500'
                        }}>
                            Limpeza de tarefas obsoletas:
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                checked={generationSettings.cleanOld}
                                onChange={(e) => setGenerationSettings(prev => ({
                                    ...prev,
                                    cleanOld: e.target.checked
                                }))}
                                style={{ 
                                    width: '18px', 
                                    height: '18px',
                                    accentColor: '#10B981'
                                }}
                            />
                            <span style={{ 
                                fontSize: '0.875rem',
                                color: 'rgba(255,255,255,0.8)'
                            }}>
                                Remover tarefas com mais de {generationSettings.daysOld} dias
                            </span>
                        </div>
                        {generationSettings.cleanOld && (
                            <input
                                type="number"
                                value={generationSettings.daysOld}
                                onChange={(e) => setGenerationSettings(prev => ({
                                    ...prev,
                                    daysOld: parseInt(e.target.value)
                                }))}
                                style={{
                                    width: '100px',
                                    padding: '0.5rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    marginTop: '0.5rem'
                                }}
                                min={1}
                                max={365}
                            />
                        )}
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        style={{
                            padding: '0.75rem 2rem',
                            background: isGenerating 
                                ? 'rgba(107,114,128,0.3)' 
                                : 'rgba(16,185,129,0.3)',
                            border: `1px solid ${isGenerating 
                                ? 'rgba(107,114,128,0.5)' 
                                : 'rgba(16,185,129,0.5)'}`,
                            borderRadius: '8px',
                            color: 'white',
                            cursor: isGenerating ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <Play size={16} />
                                Gerar Agora
                            </>
                        )}
                    </motion.button>
                    
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'rgba(59,130,246,0.2)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Calendar size={16} />
                        Agendar Geração
                    </motion.button>
                    
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'rgba(245,158,11,0.2)',
                            border: '1px solid rgba(245,158,11,0.3)',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Download size={16} />
                        Exportar Log
                    </motion.button>
                </div>
            </div>
            
            {/* Histórico de gerações */}
            <div style={{ ...glassStyle, padding: '1.5rem' }}>
                <h3 style={{ 
                    margin: '0 0 1.5rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Activity size={20} style={{ color: '#8B5CF6' }} />
                    Histórico de Gerações
                </h3>
                
                <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1rem'
                }}>
                    {MOCK_DATA.generation_history.map((record, index) => (
                        <motion.div
                            key={record.month}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            style={{
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px'
                            }}
                        >
                            <div style={{ 
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '0.75rem'
                            }}>
                                <div style={{ 
                                    fontWeight: '600',
                                    color: 'white'
                                }}>
                                    {record.month}
                                </div>
                                <div style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    background: record.errors > 0 
                                        ? 'rgba(239,68,68,0.2)' 
                                        : 'rgba(16,185,129,0.2)',
                                    color: record.errors > 0 
                                        ? 'rgb(248,113,113)' 
                                        : 'rgb(110,231,183)'
                                }}>
                                    {record.errors > 0 ? `${record.errors} erros` : 'Sucesso'}
                                </div>
                            </div>
                            
                            <div style={{ 
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.75rem',
                                fontSize: '0.875rem'
                            }}>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                                        Criadas
                                    </div>
                                    <div style={{ 
                                        fontWeight: '600',
                                        color: '#10B981'
                                    }}>
                                        {record.tasks_created}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                                        Ignoradas
                                    </div>
                                    <div style={{ 
                                        fontWeight: '600',
                                        color: '#F59E0B'
                                    }}>
                                        {record.tasks_skipped}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
            
            {/* Status em tempo real */}
            {isGenerating && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        ...glassStyle,
                        padding: '1.5rem',
                        border: '1px solid rgba(16,185,129,0.3)',
                        background: 'rgba(16,185,129,0.1)'
                    }}
                >
                    <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '1rem'
                    }}>
                        <RefreshCw size={20} className="animate-spin" style={{ color: '#10B981' }} />
                        <h4 style={{ 
                            margin: 0,
                            fontSize: '1.125rem',
                            fontWeight: '600',
                            color: 'white'
                        }}>
                            Geração em Progresso
                        </h4>
                    </div>
                    
                    <div style={{ 
                        fontSize: '0.875rem',
                        color: 'rgba(255,255,255,0.8)',
                        lineHeight: 1.6
                    }}>
                        <div>✓ Verificando definições ativas...</div>
                        <div>✓ Processando clientes elegíveis...</div>
                        <div>⏳ Calculando prazos e gerando tarefas...</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                            ⏸ Notificando responsáveis...
                        </div>
                    </div>
                    
                    <div style={{
                        marginTop: '1rem',
                        width: '100%',
                        height: '4px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                    }}>
                        <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: '75%' }}
                            transition={{ duration: 2 }}
                            style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #10B981, #34D399)',
                                borderRadius: '2px'
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </div>
    );
};

// Painel de configurações
const SettingsPanel = () => {
    const [settings, setSettings] = useState({
        autoGeneration: true,
        generationTime: '08:00',
        notifyOnGeneration: true,
        notifyOnErrors: true,
        cleanupEnabled: true,
        cleanupDays: 30,
        emailNotifications: true,
        webhookUrl: ''
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Configurações de geração automática */}
            <div style={{ ...glassStyle, padding: '1.5rem' }}>
                <h3 style={{ 
                    margin: '0 0 1.5rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Cog size={20} style={{ color: '#8B5CF6' }} />
                    Geração Automática
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                            type="checkbox"
                            checked={settings.autoGeneration}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                autoGeneration: e.target.checked
                            }))}
                            style={{ 
                                width: '18px', 
                                height: '18px',
                                accentColor: '#10B981'
                            }}
                        />
                        <label style={{ 
                            fontSize: '0.875rem',
                            color: 'rgba(255,255,255,0.8)',
                            fontWeight: '500'
                        }}>
                            Ativar geração automática diária
                        </label>
                    </div>
                    
                    {settings.autoGeneration && (
                        <div>
                            <label style={{ 
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontSize: '0.875rem',
                                color: 'rgba(255,255,255,0.8)',
                                fontWeight: '500'
                            }}>
                                Horário da geração automática:
                            </label>
                            <input
                                type="time"
                                value={settings.generationTime}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    generationTime: e.target.value
                                }))}
                                style={{
                                    padding: '0.75rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
            
            {/* Configurações de notificações */}
            <div style={{ ...glassStyle, padding: '1.5rem' }}>
                <h3 style={{ 
                    margin: '0 0 1.5rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Bell size={20} style={{ color: '#F59E0B' }} />
                    Notificações
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                        { key: 'notifyOnGeneration', label: 'Notificar quando geração for concluída' },
                        { key: 'notifyOnErrors', label: 'Notificar quando houver erros' },
                        { key: 'emailNotifications', label: 'Enviar notificações por email' }
                    ].map(({ key, label }) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input
                                type="checkbox"
                                checked={settings[key]}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    [key]: e.target.checked
                                }))}
                                style={{ 
                                    width: '18px', 
                                    height: '18px',
                                    accentColor: '#10B981'
                                }}
                            />
                            <label style={{ 
                                fontSize: '0.875rem',
                                color: 'rgba(255,255,255,0.8)',
                                fontWeight: '500'
                            }}>
                                {label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Configurações de limpeza */}
            <div style={{ ...glassStyle, padding: '1.5rem' }}>
                <h3 style={{ 
                    margin: '0 0 1.5rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <RotateCcw size={20} style={{ color: '#EF4444' }} />
                    Limpeza Automática
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                            type="checkbox"
                            checked={settings.cleanupEnabled}
                            onChange={(e) => setSettings(prev => ({
                                ...prev,
                                cleanupEnabled: e.target.checked
                            }))}
                            style={{ 
                                width: '18px', 
                                height: '18px',
                                accentColor: '#10B981'
                            }}
                        />
                        <label style={{ 
                            fontSize: '0.875rem',
                            color: 'rgba(255,255,255,0.8)',
                            fontWeight: '500'
                        }}>
                            Ativar limpeza automática de tarefas obsoletas
                        </label>
                    </div>
                    
                    {settings.cleanupEnabled && (
                        <div>
                            <label style={{ 
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontSize: '0.875rem',
                                color: 'rgba(255,255,255,0.8)',
                                fontWeight: '500'
                            }}>
                                Remover tarefas pendentes após (dias):
                            </label>
                            <input
                                type="number"
                                value={settings.cleanupDays}
                                onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    cleanupDays: parseInt(e.target.value)
                                }))}
                                style={{
                                    width: '120px',
                                    padding: '0.75rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.875rem'
                                }}
                                min={1}
                                max={365}
                            />
                        </div>
                    )}
                </div>
            </div>
            
            {/* Botões de ação */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'rgba(107,114,128,0.2)',
                        border: '1px solid rgba(107,114,128,0.3)',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                    }}
                >
                    Cancelar
                </motion.button>
                
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                        padding: '0.75rem 2rem',
                        background: 'rgba(16,185,129,0.3)',
                        border: '1px solid rgba(16,185,129,0.5)',
                        borderRadius: '8px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                    }}
                >
                    Salvar Configurações
                </motion.button>
            </div>
        </div>
    );
};

export default FiscalManagementDashboard;
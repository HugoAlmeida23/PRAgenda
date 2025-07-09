import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Brain, Sparkles, AlertTriangle, HelpCircle, User, RefreshCw, WifiOff, Settings, CheckCircle, Database, BarChart3, Users, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import qs from 'qs';
import { useTaskStore } from '../stores/useTaskStore';
import { useReportStore } from '../stores/useReportStore';
import { useClientStore } from '../stores/useClientStore';


const glassStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    color: 'white',
};

// Error messages mapping
const ERROR_MESSAGES = {
    NO_ORGANIZATION: "Você precisa estar associado a uma organização para usar o Consultor AI.",
    INSUFFICIENT_PERMISSIONS: "Apenas administradores podem aceder ao Consultor AI.",
    SERVICE_UNHEALTHY: "O serviço AI está temporariamente indisponível.",
    CONFIGURATION_ERROR: "O Consultor AI não está configurado corretamente. Contacte o administrador.",
    SERVICE_UNAVAILABLE: "O serviço AI está temporariamente indisponível. Tente novamente em alguns minutos.",
    AUTHENTICATION_ERROR: "Problema de autenticação com o serviço AI. Contacte o administrador.",
    SESSION_EXPIRED: "A sua sessão expirou. A página será recarregada automaticamente.",
    SESSION_CORRUPTED: "A sessão foi corrompida. A página será recarregada automaticamente.",
    API_ERROR: "Erro de comunicação com o serviço AI. Tente novamente.",
    NETWORK_ERROR: "Erro de conectividade. Verifique a sua ligação à internet.",
    TIMEOUT_ERROR: "O pedido demorou muito tempo. Tente novamente.",
    INTERNAL_ERROR: "Erro interno do sistema. Tente novamente ou contacte o suporte."
};

const ChartRenderer = ({ config }) => {
    if (!config || typeof config !== 'object') return null;
    const { type, data, ...rest } = config;

    if (!type || !Array.isArray(data)) return <div style={{color: '#fca5a5'}}>Dados do gráfico inválidos.</div>;

    if (type === 'bar') {
        return (
            <div style={{ width: '100%', height: 300, margin: '1rem 0', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem' }}>
                <ResponsiveContainer>
                    <BarChart data={data} {...rest}>
                        <XAxis dataKey={rest.xKey || 'name'} stroke="rgba(255,255,255,0.7)" />
                        <YAxis stroke="rgba(255,255,255,0.7)" />
                        <Tooltip contentStyle={{ background: '#333', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <Legend wrapperStyle={{ color: 'white' }} />
                        <Bar dataKey={rest.yKey || 'value'} fill={rest.barColor || '#8884d8'} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }
    if (type === 'pie') {
        const COLORS = rest.colors || ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];
        return (
            <div style={{ width: '100%', height: 300, margin: '1rem 0', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem' }}>
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={data} dataKey={rest.yKey || 'value'} nameKey={rest.xKey || 'name'} cx="50%" cy="50%" outerRadius={100} fill={rest.pieColor || '#8884d8'} label>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#333', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <Legend wrapperStyle={{ color: 'white' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    }
    return <div>Tipo de gráfico não suportado: {type}</div>;
};

const ContextIndicator = ({ contextTypes, isLoading }) => {
    const contextIcons = {
        clients: <Users size={14} />,
        tasks: <Calendar size={14} />,
        profitability: <BarChart3 size={14} />,
        specific_client: <User size={14} />
    };

    const contextLabels = {
        clients: 'Clientes',
        tasks: 'Tarefas', 
        profitability: 'Rentabilidade',
        specific_client: 'Cliente Específico'
    };

    if (!contextTypes || contextTypes.length === 0) return null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: 'rgba(96, 165, 250, 0.8)',
            border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
            <Database size={12} />
            <span>Dados carregados:</span>
            {contextTypes.map((type, i) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {contextIcons[type]}
                    <span>{contextLabels[type]}</span>
                    {i < contextTypes.length - 1 && <span>,</span>}
                </div>
            ))}
            {isLoading && <Loader2 size={12} className="animate-spin" />}
        </div>
    );
};

const ErrorDisplay = ({ error, onRetry, onGoToSettings }) => {
    const getErrorInfo = (error) => {
        const errorCode = error?.error_code || 'UNKNOWN_ERROR';
        const errorMessage = error?.error || error?.message || 'Erro desconhecido';
        const friendlyMessage = ERROR_MESSAGES[errorCode] || errorMessage;
        
        return {
            code: errorCode,
            message: friendlyMessage,
            canRetry: !['NO_ORGANIZATION', 'INSUFFICIENT_PERMISSIONS', 'CONFIGURATION_ERROR'].includes(errorCode),
            needsSettings: ['CONFIGURATION_ERROR', 'AUTHENTICATION_ERROR'].includes(errorCode),
            autoReload: ['SESSION_EXPIRED', 'SESSION_CORRUPTED'].includes(errorCode)
        };
    };

    const errorInfo = getErrorInfo(error);

    useEffect(() => {
        // Remove automatic reload on error
        // if (errorInfo.autoReload) {
        //     const timer = setTimeout(() => {
        //         window.location.reload();
        //     }, 3000);
        //     return () => clearTimeout(timer);
        // }
    }, [errorInfo.autoReload]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
                ...glassStyle,
                background: `rgba(239, 68, 68, 0.1)`,
                border: `1px solid rgba(239, 68, 68, 0.3)`,
                padding: '2rem',
                textAlign: 'center',
                margin: '2rem'
            }}
        >
            <div style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }}>
                <AlertTriangle size={24} />
            </div>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: 'white' }}>
                Consultor AI Indisponível
            </h3>
            
            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', lineHeight: '1.6' }}>
                {errorInfo.message}
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                {errorInfo.canRetry && onRetry && (
                    <motion.button
                        onClick={onRetry}
                        style={{
                            ...glassStyle,
                            padding: '0.75rem 1.5rem',
                            background: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                        whileHover={{ background: 'rgba(59, 130, 246, 0.3)' }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <RefreshCw size={16} />
                        Tentar Novamente
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
};

const SuggestedQuestions = ({ onQuestionClick, isLoading }) => {
    const questions = [
        "Quais são os meus clientes menos rentáveis este mês?",
        "Como posso melhorar a rentabilidade do cliente X?",
        "Quanto tempo em média é gasto em tarefas de IVA?",
        "Sugira prioridades para as minhas tarefas pendentes.",
        "Há alguma tarefa crítica que precisa da minha atenção imediata?"
    ];

    return (
        <div style={{ marginBottom: '1.5rem', padding: '0 1rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={16} /> Sugestões de Perguntas:
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {questions.map((q, i) => (
                    <motion.button
                        key={i}
                        onClick={() => !isLoading && onQuestionClick(q)}
                        disabled={isLoading}
                        style={{
                            ...glassStyle,
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '0.5rem 1rem',
                            fontSize: '0.8rem',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            border: '1px solid rgba(255,255,255,0.2)',
                            opacity: isLoading ? 0.6 : 1
                        }}
                        whileHover={!isLoading ? { background: 'rgba(255, 255, 255, 0.2)' } : {}}
                        whileTap={!isLoading ? { scale: 0.95 } : {}}
                    >
                        {q}
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

// FIX: This component is now self-contained and handles its own parsing.
const AIMessage = ({ message, contextTypes }) => {
    const { status, text } = message;

    // These parsing functions are now defined *within* the component's scope
    // and are not passed as props, preventing conflicts.

    const handleAction = useCallback((actionUrl) => {
        // This function would ideally be passed from the parent or use a global state/context
        // for now, we'll alert as a placeholder.
        alert(`Action triggered: ${actionUrl}`);
        // In a real app, you would use navigate, zustand stores, etc. here.
        // Example: if (actionUrl.includes('create-task')) taskStore.openCreationModal();
    }, []);

    const parseInline = useCallback((lineContent, keyPrefix) => {
        const parts = [];
        let currentIndex = 0;
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let lastLinkIndex = 0;
        let match;
        while ((match = linkRegex.exec(lineContent)) !== null) {
            if (match.index > lastLinkIndex) {
                parts.push(lineContent.slice(lastLinkIndex, match.index));
            }
            const [full, text, url] = match;
            if (url.startsWith('action://')) {
                parts.push(
                    <button
                        key={`${keyPrefix}-action-${currentIndex}`}
                        onClick={() => handleAction(url)}
                        style={{
                            background: 'linear-gradient(90deg, #6366f1, #a5b4fc)',
                            color: 'white', border: 'none', borderRadius: '6px',
                            padding: '0.3rem 0.8rem', margin: '0 0.2rem', cursor: 'pointer',
                            fontWeight: 500, fontSize: '0.95em',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                        }}
                    >
                        {text}
                    </button>
                );
            } else if (url.startsWith('/')) {
                parts.push(<Link key={`${keyPrefix}-link-${currentIndex}`} to={url} style={{ color: '#60a5fa', textDecoration: 'underline' }}>{text}</Link>);
            } else {
                parts.push(<a key={`${keyPrefix}-a-${currentIndex}`} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>{text}</a>);
            }
            lastLinkIndex = match.index + full.length;
            currentIndex++;
        }
        if (lastLinkIndex < lineContent.length) {
            parts.push(lineContent.slice(lastLinkIndex));
        }
        return parts.length > 0 ? parts.map((part, i) => <React.Fragment key={i}>{part}</React.Fragment>) : <>{lineContent}</>;
    }, [handleAction]);

    const renderTextContent = useCallback((text, keyPrefix) => {
        if (!text) return null;
        const elements = [];
        let listItems = [];
        let currentListType = null;

        const flushList = () => {
            if (listItems.length > 0) {
                const ListTag = currentListType;
                elements.push(<ListTag key={`${keyPrefix}-list-${elements.length}`} style={{ paddingLeft: '20px', margin: '0.5rem 0' }}>{listItems}</ListTag>);
                listItems = [];
                currentListType = null;
            }
        };

        text.split('\n').forEach((line, lineIndex) => {
            const key = `${keyPrefix}-line-${lineIndex}`;
            const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
            if (headerMatch) { flushList(); const Tag = `h${Math.min(headerMatch[1].length + 2, 6)}`; elements.push(React.createElement(Tag, { key, style: { fontWeight: '600', margin: '1rem 0 0.5rem 0' } }, parseInline(headerMatch[2], key))); return; }
            const ulMatch = line.match(/^(\s*)(?:[-*+])\s+(.*)/);
            if (ulMatch) { if (currentListType !== 'ul') { flushList(); currentListType = 'ul'; } listItems.push(<li key={key}>{parseInline(ulMatch[2], key)}</li>); return; }
            const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
            if (olMatch) { if (currentListType !== 'ol') { flushList(); currentListType = 'ol'; } listItems.push(<li key={key}>{parseInline(olMatch[3], key)}</li>); return; }
            
            flushList();
            if (line.trim()) { elements.push(<p key={key} style={{ margin: 0, padding: 0 }}>{parseInline(line, key)}</p>); }
            else if (elements.length > 0 && elements[elements.length - 1].type !== 'br') { elements.push(<br key={key} />); }
        });

        flushList();
        return elements;
    }, [parseInline]);

    const parseMarkdown = useCallback((text) => {
        if (!text) return null;

        const chartBlockRegex = /```chart\s*([\s\S]*?)```/g;
        const parts = text.split(chartBlockRegex);
        const elements = [];

        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
                // This is a regular text part
                elements.push(<div key={`text-part-${i}`}>{renderTextContent(parts[i], `text-part-${i}`)}</div>);
            } else {
                // This is a chart JSON part
                try {
                    const chartConfig = JSON.parse(parts[i]);
                    elements.push(<ChartRenderer key={`chart-part-${i}`} config={chartConfig} />);
                } catch (e) {
                    console.error("Failed to parse chart JSON:", e, "Content:", parts[i]);
                    elements.push(<div key={`chart-error-${i}`} style={{ color: '#fca5a5', padding: '1rem', border: '1px solid #ef4444' }}>Erro ao renderizar o gráfico.</div>);
                }
            }
        }
        return elements;
    }, [renderTextContent]);

    const renderContent = () => {
        if (status === 'pending') {
            return (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Consultor AI a processar o seu pedido...</span>
                    </div>
                    {contextTypes && contextTypes.length > 0 && (
                        <ContextIndicator contextTypes={contextTypes} isLoading={true} />
                    )}
                </div>
            );
        }
        if (status === 'error') {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} />
                    <span>Erro: {text}</span>
                </div>
            );
        }

        return (
            <div>
                {contextTypes && contextTypes.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                        <ContextIndicator contextTypes={contextTypes} />
                    </div>
                )}
                {parseMarkdown(text)}
            </div>
        );
    };

    return (
        <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            layout
            style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.75rem' }}
        >
            <Sparkles size={18} style={{ color: 'rgb(196, 181, 253)', marginRight: '0.5rem', flexShrink: 0, alignSelf: 'flex-start', marginTop: '0.5rem' }} />
            <div style={{
                maxWidth: '85%',
                padding: '0.75rem 1rem',
                borderRadius: '12px 12px 12px 0',
                background: status === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: status === 'error' ? 'rgb(252, 165, 165)' : 'white',
                border: status === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                fontSize: '0.9rem',
                lineHeight: '1.5',
            }}>
                {renderContent()}
            </div>
        </motion.div>
    );
};

const ServiceStatus = ({ health }) => {
    if (!health) return null;

    const getStatusColor = () => {
        switch (health.status) {
            case 'healthy': return 'rgb(34, 197, 94)';
            case 'degraded': return 'rgb(251, 191, 36)';
            case 'unhealthy': return 'rgb(239, 68, 68)';
            default: return 'rgb(156, 163, 175)';
        }
    };

    const getStatusIcon = () => {
        switch (health.status) {
            case 'healthy': return <CheckCircle size={14} />;
            case 'degraded': return <AlertTriangle size={14} />;
            case 'unhealthy': return <WifiOff size={14} />;
            default: return <HelpCircle size={14} />;
        }
    };

    const features = health.features || {};

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '0.75rem',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '8px',
            fontSize: '0.75rem'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: getStatusColor()
            }}>
                {getStatusIcon()}
                <span>Serviço: {health.status}</span>
            </div>
            {features.progressive_context && (
                <div style={{ color: 'rgba(96, 165, 250, 0.8)', fontSize: '0.7rem' }}>
                    🚀 Contexto Progressivo Ativo
                </div>
            )}
        </div>
    );
};

// Main Component: EnhancedAIAdvisorPage
const AIAdvisorPage = () => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [initializationStep, setInitializationStep] = useState('idle');
    const [systemError, setSystemError] = useState(null);
    const [serviceHealth, setServiceHealth] = useState(null);
    const [contextTypesUsed, setContextTypesUsed] = useState([]);
    const [completeTaskModal, setCompleteTaskModal] = useState({ open: false, taskId: null });
    const [reportViewer, setReportViewer] = useState({ open: false, reportId: null, reportUrl: null, reportFormat: null });
    const [confirmTaskModal, setConfirmTaskModal] = useState({ open: false, fields: null });
    const [confirmTimeEntryModal, setConfirmTimeEntryModal] = useState({ open: false, fields: null });
    
    const messagesEndRef = useRef(null);
    const queryClient = useQueryClient();
    const taskStore = useTaskStore();
    const reportStore = useReportStore();
    const navigate = useNavigate();

    // Define handleAction in component scope
    const handleAction = (actionUrl) => {
        try {
            if (!actionUrl.startsWith('action://')) return;
            const url = new URL(actionUrl.replace('action://', 'http://dummy/'));
            const actionType = url.pathname.replace(/^\//, '');
            const params = Object.fromEntries(url.searchParams.entries());
            switch (actionType) {
                case 'confirm-create-task':
                    setConfirmTaskModal({ open: true, fields: params });
                    break;
                case 'create-task': {
                    // Open TaskCreationModal with client prefilled
                    if (params.client) {
                        taskStore.resetFormToInitialState();
                        taskStore.setFormDataField('client', params.client);
                    }
                    taskStore.setFormDataField('status', 'pending');
                    taskStore.setFormDataField('priority', 3);
                    taskStore.setFormDataField('title', '');
                    taskStore.setFormDataField('description', '');
                    taskStore.setFormDataField('deadline', '');
                    taskStore.setFormDataField('category', '');
                    taskStore.setFormDataField('assigned_to', null);
                    taskStore.setFormDataField('workflow', '');
                    taskStore.setFormDataField('collaborators', []);
                    taskStore.setFormDataField('workflow_step_assignments', {});
                    taskStore.setFormDataField('source_scanned_invoice', null);
                    taskStore.setFormDataField('estimated_time_minutes', '');
                    taskStore.setFormDataField('metadata', undefined);
                    taskStore.setFormDataField('showWorkflowConfigInForm', false);
                    taskStore.setFormDataField('selectedWorkflowForForm', '');
                    taskStore.setFormDataField('selectedCollaboratorsUi', []);
                    taskStore.setFormDataField('assignmentMode', 'single');
                    taskStore.setFormDataField('stepAssignmentsForForm', {});
                    taskStore.setFormDataField('selectedTask', null);
                    taskStore.setFormDataField('showForm', false);
                    taskStore.setFormDataField('showNaturalLanguageForm', false);
                    taskStore.setFormDataField('naturalLanguageInput', '');
                    taskStore.setFormDataField('selectedTaskForWorkflowView', null);
                    taskStore.setFormDataField('showWorkflowConfigInForm', false);
                    taskStore.setFormDataField('workflowStepsForForm', []);
                    taskStore.setFormDataField('isLoadingWorkflowStepsForForm', false);
                    taskStore.setFormDataField('notifications', []);
                    taskStore.setFormDataField('showTimeEntryModal', false);
                    taskStore.setFormDataField('selectedTaskForTimeEntry', null);
                    taskStore.setFormDataField('selectedTaskForWorkflowView', null);
                    taskStore.setFormDataField('showBatchSelectionModal', false);
                    taskStore.setFormDataField('selectedInvoiceForTask', null);
                    taskStore.setFormDataField('selectedBatchForTask', null);
                    taskStore.setFormDataField('availableClientsForBatch', []);
                    taskStore.setFormDataField('isTaskCreationModalOpen', true);
                    break;
                }
                case 'complete-task': {
                    // TODO: Open task completion modal or trigger completion
                    alert(`Completar tarefa ${params.task}`);
                    break;
                }
                case 'view-report': {
                    // Navigate to /reports and scroll to the report (could use anchor or filter)
                    navigate('/reports');
                    // Optionally, set a filter or highlight the report
                    break;
                }
                case 'view-profitability-report': {
                    // Navigate to /reports with filter set to profitability_analysis
                    reportStore.setGeneratedReportsFilter('report_type', 'profitability_analysis');
                    navigate('/reports');
                    break;
                }
                case 'confirm-create-time-entry':
                    setConfirmTimeEntryModal({ open: true, fields: params });
                    break;
                default:
                    alert(`Ação não implementada: ${actionType}`);
            }
        } catch (e) {
            console.error('Erro ao processar ação:', e);
        }
    };

    // Define parseInline in component scope
    const parseInline = (lineContent, keyPrefix) => {
        const parts = [];
        let currentIndex = 0;
        // Markdown link: [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let lastLinkIndex = 0;
        let match;
        while ((match = linkRegex.exec(lineContent)) !== null) {
            if (match.index > lastLinkIndex) {
                parts.push(<span key={`${keyPrefix}-text-${currentIndex}`}>{lineContent.slice(lastLinkIndex, match.index)}</span>);
                currentIndex++;
            }
            const [full, text, url] = match;
            if (url.startsWith('action://')) {
                parts.push(
                    <button
                        key={`${keyPrefix}-action-${currentIndex}`}
                        onClick={() => handleAction(url)}
                        style={{
                            background: 'linear-gradient(90deg, #6366f1, #a5b4fc)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.3rem 0.8rem',
                            margin: '0 0.2rem',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.95em',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                        }}
                    >
                        {text}
                    </button>
                );
            } else if (url.startsWith('/')) {
                parts.push(
                    <Link key={`${keyPrefix}-link-${currentIndex}`} to={url} style={{ color: '#60a5fa', textDecoration: 'underline' }}>{text}</Link>
                );
            } else {
                parts.push(
                    <a key={`${keyPrefix}-a-${currentIndex}`} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>{text}</a>
                );
            }
            lastLinkIndex = match.index + full.length;
            currentIndex++;
        }
        if (lastLinkIndex < lineContent.length) {
            parts.push(<span key={`${keyPrefix}-text-end`}>{lineContent.slice(lastLinkIndex)}</span>);
        }
        return parts.length > 0 ? parts : <span key={`${keyPrefix}-original`}>{lineContent}</span>;
    };

    // Define parseMarkdown above any code that uses it
    const parseMarkdown = (text) => {
        if (!text) return '';
        // Chart code block detection
        const chartBlockRegex = /```chart\s*([\s\S]*?)```/g;
        let chartBlocks = [];
        let match;
        let lastIndex = 0;
        const elements = [];
        while ((match = chartBlockRegex.exec(text)) !== null) {
            // Push text before chart
            if (match.index > lastIndex) {
                elements.push(...parseMarkdown(text.slice(lastIndex, match.index)));
            }
            // Parse chart JSON
            let chartConfig = null;
            try {
                chartConfig = JSON.parse(match[1]);
            } catch (e) {
                chartConfig = null;
            }
            elements.push(<ChartRenderer key={`chart-${match.index}`} config={chartConfig} />);
            lastIndex = chartBlockRegex.lastIndex;
        }
        if (lastIndex < text.length) {
            // Parse remaining text
            const lines = text.slice(lastIndex).split('\n');
            const elementsFromRest = [];
            let currentListType = null;
            let listItems = [];
            let inTable = false;
            let tableHeaders = [];
            let tableRows = [];

            const flushList = () => {
                if (listItems.length > 0) {
                    if (currentListType === 'ul') {
                        elementsFromRest.push(<ul key={`ul-${elementsFromRest.length}`} style={{ paddingLeft: '20px', margin: '0.5rem 0' }}>{listItems}</ul>);
                    } else if (currentListType === 'ol') {
                        elementsFromRest.push(<ol key={`ol-${elementsFromRest.length}`} style={{ paddingLeft: '20px', margin: '0.5rem 0' }}>{listItems}</ol>);
                    }
                    listItems = [];
                    currentListType = null;
                }
            };

            const flushTable = () => {
                if (tableHeaders.length > 0 && tableRows.length > 0) {
                    elementsFromRest.push(
                        <div key={`table-${elementsFromRest.length}`} style={{ margin: '1rem 0', overflowX: 'auto' }}>
                            <table style={{ 
                                width: '100%', 
                                borderCollapse: 'collapse',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                                        {tableHeaders.map((header, i) => (
                                            <th key={i} style={{ 
                                                padding: '0.75rem', 
                                                textAlign: 'left', 
                                                borderBottom: '1px solid rgba(255,255,255,0.2)',
                                                fontWeight: '600'
                                            }}>
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((row, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            {row.map((cell, j) => (
                                                <td key={j} style={{ 
                                                    padding: '0.75rem',
                                                    fontSize: '0.9rem'
                                                }}>
                                                    {parseInline(cell, `table-${i}-${j}`)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }
                tableHeaders = [];
                tableRows = [];
                inTable = false;
            };

            lines.forEach((line, lineIndex) => {
                const key = `line-${lineIndex}`;

                // Handle table rows
                if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
                    
                    if (!inTable) {
                        flushList();
                        inTable = true;
                        tableHeaders = cells;
                    } else if (cells.every(cell => cell.match(/^[-:\s]+$/))) {
                        // Table separator row, skip
                        return;
                    } else {
                        tableRows.push(cells);
                    }
                    return;
                } else if (inTable) {
                    flushTable();
                }

                // Handle headers
                const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
                if (headerMatch) {
                    flushList();
                    const level = headerMatch[1].length;
                    const text = headerMatch[2];
                    const HeaderTag = `h${Math.min(level + 2, 6)}`;
                    
                    elementsFromRest.push(
                        React.createElement(HeaderTag, {
                            key: key,
                            style: { 
                                fontSize: level === 1 ? '1.25rem' : level === 2 ? '1.1rem' : '1rem',
                                fontWeight: '600',
                                margin: '1rem 0 0.5rem 0',
                                color: level === 1 ? 'rgb(96, 165, 250)' : level === 2 ? 'rgb(129, 140, 248)' : 'white'
                            }
                        }, parseInline(text, `${key}-header`))
                    );
                    return;
                }

                // Handle lists
                const ulMatch = line.match(/^(\s*)(?:[-*+])\s+(.*)/);
                if (ulMatch) {
                    if (currentListType !== 'ul') { flushList(); currentListType = 'ul'; }
                    listItems.push(<li key={`${key}-li`}>{parseInline(ulMatch[2], `${key}-li-content`)}</li>);
                    return;
                }

                const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
                if (olMatch) {
                    if (currentListType !== 'ol') { flushList(); currentListType = 'ol'; }
                    listItems.push(<li key={`${key}-li`}>{parseInline(olMatch[3], `${key}-li-content`)}</li>);
                    return;
                }

                flushList();

                if (!line.trim()) {
                    if (elementsFromRest.length === 0 || elementsFromRest[elementsFromRest.length - 1].type !== 'br') {
                        elementsFromRest.push(<br key={key} />);
                    }
                } else {
                    elementsFromRest.push(<div key={key} style={{ marginBottom: '0.5rem' }}>{parseInline(line, `${key}-p-content`)}</div>);
                }
            });

            flushList();
            flushTable();
            
            return elementsFromRest;
        }
        return elements;
    };

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(scrollToBottom, [messages]);

    const handleError = useCallback((error, context = '') => {
        console.error(`${context} error:`, error);
        
        let errorInfo = {
            error: 'Erro desconhecido',
            error_code: 'INTERNAL_ERROR'
        };

        if (error?.response?.data) {
            errorInfo = error.response.data;
        } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
            errorInfo = {
                error: 'Erro de conectividade',
                error_code: 'NETWORK_ERROR'
            };
        } else if (error?.message) {
            errorInfo = {
                error: error.message,
                error_code: 'API_ERROR'
            };
        }

        setSystemError(errorInfo);
        setInitializationStep('error');
    }, []);

    // Health check query
    const { data: healthData } = useQuery({
        queryKey: ['enhancedAiAdvisorHealth'],
        queryFn: async () => {
            const response = await api.get('/ai-advisor/enhanced/health/');
            return response.data;
        },
        refetchInterval: 30000,
        retry: 1,
        refetchOnWindowFocus: false,
        onSuccess: (data) => {
            setServiceHealth(data);
        },
        onError: (error) => {
            console.warn('Health check failed:', error);
            setServiceHealth({
                status: 'unhealthy',
                message: 'Health check failed'
            });
        }
    });

    // Fetch optimized initial context
    const { data: contextData, isLoading: isContextLoading, error: contextError, refetch: refetchInitialContext } = useQuery({
        queryKey: ['enhancedAiAdvisorInitialData'],
        queryFn: async () => {
            console.log('Fetching optimized initial context...');
            setInitializationStep('fetching_context');
            setSystemError(null);
            const response = await api.get('/ai-advisor/enhanced/get-initial-context/');
            console.log('Enhanced context received:', response);
            return response.data;
        },
        enabled: initializationStep === 'idle',
        retry: (failureCount, error) => {
            const errorCode = error?.response?.data?.error_code;
            if (['NO_ORGANIZATION', 'INSUFFICIENT_PERMISSIONS', 'CONFIGURATION_ERROR'].includes(errorCode)) {
                return false;
            }
            return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        staleTime: 0,
        gcTime: 0,
        onError: (error) => {
            handleError(error, 'Enhanced context fetch');
        }
    });

    useEffect(() => {
        if (contextData && !isContextLoading && !contextError) {
            console.log('Enhanced context ready:', contextData);
            setInitializationStep('context_ready');
        }
    }, [contextData, isContextLoading, contextError]);

    // Start enhanced AI session
    const { mutate: startSession, isPending: isStartingSession } = useMutation({
        mutationFn: (contextData) => {
            console.log('Starting enhanced AI session with context:', contextData);
            return api.post('/ai-advisor/enhanced/start-session/', { context: contextData });
        },
        onSuccess: (response) => {
            console.log('Enhanced AI session started:', response);
            const data = response.data;
            setSessionId(data.session_id);
            setMessages([{ 
                id: `ai-${Date.now()}`, 
                text: data.initial_message, 
                sender: 'ai', 
                status: 'completed' 
            }]);
            setInitializationStep('ready');
            
            if (data.health_status) {
                setServiceHealth(prev => prev ? { ...prev, status: data.health_status } : null);
            }
        },
        onError: (error) => {
            handleError(error, 'Enhanced session start');
        }
    });

    useEffect(() => {
        if (initializationStep === 'context_ready' && contextData) {
            console.log('Starting enhanced session...');
            setInitializationStep('starting_session');
            startSession(contextData);
        }
    }, [initializationStep, contextData, startSession]);

    // Enhanced query AI
    const { mutate: queryAI, isPending: isQuerying } = useMutation({
        mutationFn: async ({ session_id, query }) => {
            const response = await api.post('/ai-advisor/enhanced/query/', { session_id, query });
            return response.data;
        },
        onSuccess: (data, variables) => {
            const { placeholderId } = variables;
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === placeholderId 
                        ? { ...msg, status: 'completed', text: data.response, contextTypes: data.context_types_used || [] }
                        : msg
                )
            );
        },
        onError: (error, variables) => {
            const { placeholderId } = variables;
            const errorInfo = error?.response?.data || { 
                error: 'Erro ao processar pergunta',
                error_code: 'QUERY_ERROR'
            };
            
            const errorMessage = ERROR_MESSAGES[errorInfo.error_code] || errorInfo.error;
            
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === placeholderId 
                        ? { ...msg, status: 'error', text: errorMessage }
                        : msg
                )
            );
        }
    });

    // Mutation for completing a task
    const completeTaskMutation = useMutation({
        mutationFn: async (taskId) => {
            // PATCH /tasks/:id/ { status: 'completed' }
            await api.patch(`/tasks/${taskId}/`, { status: 'completed' });
        },
        onSuccess: () => {
            setCompleteTaskModal({ open: false, taskId: null });
            // Optionally show notification, refetch tasks, etc.
        },
        onError: (err) => {
            alert('Erro ao completar tarefa: ' + (err?.response?.data?.error || err.message));
        }
    });

    // Mutation for creating a task
    const createTaskMutation = useMutation({
        mutationFn: async (fields) => {
            // POST /tasks/ with fields
            return api.post('/tasks/', fields);
        },
        onSuccess: (res, fields) => {
            setConfirmTaskModal({ open: false, fields: null });
            setMessages(prev => [...prev, {
                id: `ai-task-created-${Date.now()}`,
                sender: 'ai',
                status: 'completed',
                text: `✅ Tarefa criada com sucesso: ${fields.title || '(sem título)'}`
            }]);
        },
        onError: (err) => {
            setMessages(prev => [...prev, {
                id: `ai-task-create-error-${Date.now()}`,
                sender: 'ai',
                status: 'error',
                text: 'Erro ao criar tarefa: ' + (err?.response?.data?.error || err.message)
            }]);
            setConfirmTaskModal({ open: false, fields: null });
        }
    });

    // Add mutation for creating time entry
    const createTimeEntryMutation = useMutation({
        mutationFn: async (fields) => {
            return api.post('/ai-advisor/enhanced/confirm-time-entry/', fields);
        },
        onSuccess: (res, fields) => {
            setConfirmTimeEntryModal({ open: false, fields: null });
            setMessages(prev => [...prev, {
                id: `ai-timeentry-created-${Date.now()}`,
                sender: 'ai',
                status: 'completed',
                text: `✅ Registo de tempo criado com sucesso: ${fields.description || ''} (${fields.minutes_spent} min)`
            }]);
        },
        onError: (err) => {
            setMessages(prev => [...prev, {
                id: `ai-timeentry-create-error-${Date.now()}`,
                sender: 'ai',
                status: 'error',
                text: 'Erro ao criar registo de tempo: ' + (err?.response?.data?.error || err.message)
            }]);
            setConfirmTimeEntryModal({ open: false, fields: null });
        }
    });

    // Fetch client list for name-to-UUID mapping
    const { data: clientsList = [] } = useQuery({
        queryKey: ['clientsForDropdowns'],
        queryFn: () => api.get("/clients/?is_active=true").then(res => res.data.results || res.data),
        staleTime: 5 * 60 * 1000,
    });

    const handleSendMessage = (e, questionOverride = null) => {
        if (e) e.preventDefault();
        const queryText = questionOverride || inputValue.trim();
        const isAiBusy = messages.some(m => m.sender === 'ai' && m.status === 'pending');

        if (!queryText || !sessionId || isAiBusy || isQuerying) {
            return;
        }

        const userMessage = { id: `user-${Date.now()}`, text: queryText, sender: 'user' };
        const aiPlaceholderId = `ai-placeholder-${Date.now()}`;
        
        // Determine potential context types that might be loaded
        const potentialContextTypes = [];
        const queryLower = queryText.toLowerCase();
        if (queryLower.includes('cliente')) potentialContextTypes.push('clients');
        if (queryLower.includes('tarefa')) potentialContextTypes.push('tasks');
        if (queryLower.includes('rentabil')) potentialContextTypes.push('profitability');
        
        const aiPlaceholderMessage = {
            id: aiPlaceholderId,
            sender: 'ai',
            status: 'pending',
            text: 'A processar...',
            contextTypes: potentialContextTypes
        };

        setMessages(prev => [...prev, userMessage, aiPlaceholderMessage]);
        setInputValue('');
        
        queryAI({ 
            session_id: sessionId, 
            query: queryText, 
            placeholderId: aiPlaceholderId 
        });
    };
    
    const handleRetryInitialization = () => {
        console.log('Retrying enhanced initialization...');
        setMessages([]);
        setSessionId(null);
        setSystemError(null);
        setInitializationStep('idle');
        setContextTypesUsed([]);
        queryClient.invalidateQueries(['enhancedAiAdvisorInitialData']);
        refetchInitialContext();
    };
    
    const isAiBusy = messages.some(m => m.sender === 'ai' && m.status === 'pending');
    const isChatInterfaceDisabled = initializationStep !== 'ready' || isAiBusy;

    if (systemError) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', color: 'white', position: 'relative' }}>
                <ErrorDisplay 
                    error={systemError} 
                    onRetry={handleRetryInitialization}
                />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', color: 'white', position: 'relative' }}>
            <div style={{
                ...glassStyle,
                margin: '1.5rem', padding: '1.5rem', flexGrow: 1,
                display: 'flex', flexDirection: 'column',
                position: 'relative', zIndex: 1,
                background: 'rgba(15, 20, 30, 0.85)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <motion.div 
                            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} 
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} 
                            style={{ padding: '0.5rem', background: 'rgba(147, 51, 234, 0.2)', borderRadius: '12px' }}
                        >
                            <Brain size={28} style={{ color: 'rgb(196, 181, 253)' }} />
                        </motion.div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
                                TarefAI Enhanced
                                <span style={{ fontSize: '0.75rem', color: 'rgba(96, 165, 250, 0.8)', marginLeft: '0.5rem' }}>
                                    Contexto Progressivo
                                </span>
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.875rem' }}>
                                Consultor AI inteligente com carregamento otimizado de dados.
                            </p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <ServiceStatus health={serviceHealth} />
                        
                        <motion.button
                            onClick={handleRetryInitialization}
                            style={{
                                ...glassStyle, 
                                padding: '0.5rem 1rem', 
                                background: 'rgba(59, 130, 246, 0.2)', 
                                border: '1px solid rgba(59, 130, 246, 0.3)', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                fontSize: '0.875rem'
                            }}
                            whileHover={{ background: 'rgba(59, 130, 246, 0.3)'}}
                            whileTap={{ scale: 0.95 }}
                        >
                            <RefreshCw size={16} /> Reiniciar
                        </motion.button>
                    </div>
                </header>

                <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }} className="custom-scrollbar-dark">
                    <AnimatePresence>
                        {messages.map((msg) => 
                            msg.sender === 'user' ? (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0 }} 
                                    layout
                                    style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}
                                >
                                    <div style={{
                                        maxWidth: '75%', 
                                        padding: '0.75rem 1rem', 
                                        borderRadius: '12px 12px 0 12px',
                                        background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(96, 165, 250))',
                                        color: 'white', 
                                        fontSize: '0.9rem', 
                                        lineHeight: '1.5',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                    }}>
                                        {msg.text}
                                    </div>
                                    <User size={18} style={{ color: 'rgb(96, 165, 250)', marginLeft: '0.5rem', flexShrink: 0, alignSelf: 'flex-start', marginTop: '0.5rem' }} />
                                </motion.div>
                            ) : (
                                <AIMessage key={msg.id} message={msg} contextTypes={msg.contextTypes} /> 
                                                       )
                        )}
                    </AnimatePresence>
                    
                    {initializationStep === 'fetching_context' && (
                        <motion.div layout className="ai-message-loading">
                            <Database className="animate-spin" size={18} />
                            A recolher dados otimizados do seu escritório...
                        </motion.div>
                    )}
                    {initializationStep === 'starting_session' && (
                        <motion.div layout className="ai-message-loading">
                            <Sparkles size={18} />
                            A iniciar sessão inteligente com o Consultor AI...
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                {initializationStep === 'ready' && (
                    <SuggestedQuestions 
                        onQuestionClick={(q) => handleSendMessage(null, q)} 
                        isLoading={isAiBusy} 
                    />
                )}

                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                    <input
                        type="text" 
                        value={inputValue} 
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isChatInterfaceDisabled ? "Aguarde o Consultor AI..." : "Pergunte sobre clientes, tarefas, rentabilidade..."}
                        disabled={isChatInterfaceDisabled}
                        style={{
                            flexGrow: 1, 
                            padding: '0.85rem 1.15rem', 
                            background: 'rgba(0,0,0,0.25)',
                            border: '1px solid rgba(255,255,255,0.15)', 
                            borderRadius: '10px',
                            color: 'white', 
                            fontSize: '0.95rem', 
                            outline: 'none',
                            opacity: isChatInterfaceDisabled ? 0.6 : 1,
                        }}
                    />
                    <motion.button
                        type="submit" 
                        disabled={isChatInterfaceDisabled || !inputValue.trim()}
                        style={{
                            padding: '0.85rem 1.5rem', 
                            background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(96, 165, 250))',
                            border: 'none', 
                            borderRadius: '10px', 
                            color: 'white', 
                            fontSize: '0.95rem',
                            fontWeight: '500', 
                            cursor: (isChatInterfaceDisabled || !inputValue.trim()) ? 'not-allowed' : 'pointer',
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            opacity: (isChatInterfaceDisabled || !inputValue.trim()) ? 0.6 : 1,
                        }}
                        whileHover={!isChatInterfaceDisabled && inputValue.trim() ? { filter: 'brightness(1.15)' } : {}} 
                        whileTap={!isChatInterfaceDisabled && inputValue.trim() ? { scale: 0.97 } : {}}
                    >
                        <Send size={18} /> 
                        {isQuerying ? <Loader2 size={18} className="animate-spin" /> : 'Enviar'}
                    </motion.button>
                </form>

                {/* Context Debug Panel (only in development) */}
                {process.env.NODE_ENV === 'development' && contextData && (
                    <details style={{ marginTop: '1rem', fontSize: '0.75rem' }}>
                        <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
                            Debug: Contexto Inicial ({contextData.context_mode || 'standard'})
                        </summary>
                        <pre style={{ 
                            marginTop: '0.5rem',
                            padding: '0.5rem',
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '4px',
                            overflow: 'auto',
                            maxHeight: '200px',
                            color: 'rgba(255,255,255,0.7)'
                        }}>
                            {JSON.stringify(contextData, null, 2)}
                        </pre>
                    </details>
                )}
            </div>
            
            {/* Complete Task Modal */}
            {completeTaskModal.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#18181b', padding: '2rem', borderRadius: '12px', minWidth: 320, color: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                        <h3>Concluir Tarefa</h3>
                        <p>Tem a certeza que deseja marcar esta tarefa como concluída?</p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setCompleteTaskModal({ open: false, taskId: null })} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 6, color: 'white', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={() => completeTaskMutation.mutate(completeTaskModal.taskId)} style={{ background: 'linear-gradient(90deg, #10b981, #22d3ee)', border: 'none', borderRadius: 6, color: 'white', padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 600 }}>Concluir</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Report Viewer Modal */}
            {reportViewer.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#18181b', padding: '1.5rem', borderRadius: '12px', minWidth: 400, minHeight: 400, color: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', position: 'relative' }}>
                        <button onClick={() => setReportViewer({ open: false, reportId: null, reportUrl: null, reportFormat: null })} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'white', fontSize: 22, cursor: 'pointer' }}>×</button>
                        <h3 style={{ marginBottom: '1rem' }}>Visualizar Relatório</h3>
                        {reportViewer.reportFormat === 'pdf' ? (
                            <iframe src={reportViewer.reportUrl} title="Relatório PDF" style={{ width: 600, height: 600, border: 'none', background: 'white' }} />
                        ) : (
                            <a href={reportViewer.reportUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Baixar Relatório</a>
                        )}
                    </div>
                </div>
            )}
            {/* Confirm Create Task Modal */}
            {confirmTaskModal.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#18181b', padding: '2rem', borderRadius: '12px', minWidth: 340, color: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                        <h3>Confirmar Criação de Tarefa</h3>
                        <div style={{ margin: '1rem 0' }}>
                            {confirmTaskModal.fields && (
                                <ul style={{ listStyle: 'none', padding: 0, fontSize: '1rem' }}>
                                    {Object.entries(confirmTaskModal.fields).map(([k, v]) => (
                                        <li key={k}><b>{k}:</b> {v}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmTaskModal({ open: false, fields: null })} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 6, color: 'white', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>Cancelar</button>
                            {/* Priority and client mapping fix here */}
                            <button onClick={() => {
                                const PRIORITY_MAP = {
                                    'Urgente': 1,
                                    'Alta': 2,
                                    'Normal': 3,
                                    'Baixa': 4
                                };
                                let clientUUID = confirmTaskModal.fields.client;
                                if (clientsList && Array.isArray(clientsList)) {
                                    const found = clientsList.find(c => c.name === confirmTaskModal.fields.client);
                                    if (found) clientUUID = found.id;
                                }
                                const fieldsToSend = {
                                    ...confirmTaskModal.fields,
                                    priority: PRIORITY_MAP[confirmTaskModal.fields.priority] || confirmTaskModal.fields.priority,
                                    client: clientUUID
                                };
                                createTaskMutation.mutate(fieldsToSend);
                            }} style={{ background: 'linear-gradient(90deg, #10b981, #22d3ee)', border: 'none', borderRadius: 6, color: 'white', padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 600 }} disabled={createTaskMutation.isPending}>Confirmar</button>
                        </div>
                        {createTaskMutation.isPending && <div style={{ marginTop: '1rem', color: '#60a5fa' }}>A criar tarefa...</div>}
                    </div>
                </div>
            )}
            {/* Confirm Time Entry Modal */}
            {confirmTimeEntryModal.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#18181b', padding: '2rem', borderRadius: '12px', minWidth: 340, color: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                        <h3>Confirmar Registo de Tempo</h3>
                        <div style={{ margin: '1rem 0' }}>
                            {confirmTimeEntryModal.fields && (
                                <ul style={{ listStyle: 'none', padding: 0, fontSize: '1rem' }}>
                                    {Object.entries(confirmTimeEntryModal.fields).map(([k, v]) => (
                                        <li key={k}><b>{k}:</b> {v}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmTimeEntryModal({ open: false, fields: null })} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', borderRadius: 6, color: 'white', padding: '0.5rem 1.2rem', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={() => {
                                // Map fields if needed (e.g., client name to UUID, task title to ID)
                                let fieldsToSend = { ...confirmTimeEntryModal.fields };
                                // Map client name to UUID if needed
                                if (fieldsToSend.client && clientsList && Array.isArray(clientsList)) {
                                    const found = clientsList.find(c => c.name === fieldsToSend.client);
                                    if (found) fieldsToSend.client = found.id;
                                }
                                // Map minutes (e.g., '2h' or '120min') to integer minutes if needed
                                if (fieldsToSend.minutes_spent && typeof fieldsToSend.minutes_spent === 'string') {
                                    const minMatch = fieldsToSend.minutes_spent.match(/(\d+)\s*min/);
                                    const hourMatch = fieldsToSend.minutes_spent.match(/(\d+)\s*h/);
                                    let total = 0;
                                    if (hourMatch) total += parseInt(hourMatch[1], 10) * 60;
                                    if (minMatch) total += parseInt(minMatch[1], 10);
                                    if (!isNaN(Number(fieldsToSend.minutes_spent))) total = Number(fieldsToSend.minutes_spent);
                                    if (total > 0) fieldsToSend.minutes_spent = total;
                                }
                                createTimeEntryMutation.mutate(fieldsToSend);
                            }} style={{ background: 'linear-gradient(90deg, #10b981, #22d3ee)', border: 'none', borderRadius: 6, color: 'white', padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 600 }} disabled={createTimeEntryMutation.isPending}>Confirmar</button>
                        </div>
                        {createTimeEntryMutation.isPending && <div style={{ marginTop: '1rem', color: '#60a5fa' }}>A criar registo de tempo...</div>}
                    </div>
                </div>
            )}
            <style jsx global>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 3px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
                .ai-message-loading {
                    display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem;
                    background: rgba(255,255,255,0.05); border-radius: 12px;
                    font-size: 0.9rem; color: rgba(255,255,255,0.6); margin-bottom: 0.75rem;
                }
                .ai-message-loading > svg { animation: spin 1.5s linear infinite; color: rgba(255,255,255,0.6); }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default AIAdvisorPage;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Brain, Sparkles, AlertTriangle, HelpCircle, User, RefreshCw } from 'lucide-react';
import BackgroundElements from '../components/HeroSection/BackgroundElements';

// Helper custom hook for polling the AI query result
const usePollAIResult = (taskId, onComplete) => {
    return useQuery({
        queryKey: ['aiQueryStatus', taskId],
        queryFn: async () => {
            const { data } = await api.get(`/ai-advisor/query-status/${taskId}/`);
            return data;
        },
        refetchInterval: (query) => {
            if (query.state.data?.status === 'SUCCESS' || query.state.data?.status === 'FAILURE') {
                return false; // Stop polling
            }
            return 3000; // Poll every 3 seconds
        },
        refetchOnWindowFocus: false,
        enabled: !!taskId, // Only run this query if a taskId is provided
        onSuccess: (data) => {
            if (data.status === 'SUCCESS' || data.status === 'FAILURE') {
                onComplete(data);
            }
        },
        onError: (error) => {
            onComplete({ status: 'FAILURE', result: error.response?.data?.error || 'Polling failed' });
        }
    });
};


const glassStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    color: 'white',
};

const parseMarkdown = (text) => {
    if (!text) return '';

    const lines = text.split('\n');
    const elements = [];
    let currentListType = null; // 'ul' or 'ol'
    let listItems = [];

    const flushList = () => {
        if (listItems.length > 0) {
            if (currentListType === 'ul') {
                elements.push(<ul key={`ul-${elements.length}`} style={{ paddingLeft: '20px', margin: '0.5rem 0' }}>{listItems}</ul>);
            } else if (currentListType === 'ol') {
                elements.push(<ul key={`ol-${elements.length}`} style={{ paddingLeft: '20px', margin: '0.5rem 0' }}>{listItems}</ul>);
            }
            listItems = [];
            currentListType = null;
        }
    };

    const parseInline = (lineContent, keyPrefix) => {
        const parts = [];
        let currentIndex = 0;
        
        const inlinePatterns = [
            { regex: /\*\*\*(.*?)\*\*\*/g, component: (content, k) => <strong key={k}><em>{content}</em></strong> },
            { regex: /\*\*(.*?)\*\*/g, component: (content, k) => <strong key={k}>{content}</strong> },
            { regex: /\*(.*?)\*/g, component: (content, k) => <em key={k}>{content}</em> },
            { regex: /`(.*?)`/g, component: (content, k) => <code key={k} style={{background: 'rgba(255,255,255,0.1)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.85em'}}>{content}</code> },
        ];

        const allMatches = [];
        inlinePatterns.forEach(pattern => {
            let match;
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
            while ((match = regex.exec(lineContent)) !== null) {
                allMatches.push({ start: match.index, end: match.index + match[0].length, content: match[1], component: pattern.component });
            }
        });

        allMatches.sort((a, b) => a.start - b.start);

        const validMatches = [];
        let lastEnd = 0;
        allMatches.forEach(match => {
            if (match.start >= lastEnd) {
                validMatches.push(match);
                lastEnd = match.end;
            }
        });
        
        let partIndex = 0;
        validMatches.forEach(match => {
            if (match.start > currentIndex) {
                parts.push(<span key={`${keyPrefix}-text-${partIndex++}`}>{lineContent.slice(currentIndex, match.start)}</span>);
            }
            parts.push(match.component(match.content, `${keyPrefix}-match-${partIndex++}`));
            currentIndex = match.end;
        });

        if (currentIndex < lineContent.length) {
            parts.push(<span key={`${keyPrefix}-text-${partIndex++}`}>{lineContent.slice(currentIndex)}</span>);
        }
        
        return parts.length > 0 ? parts : <span key={`${keyPrefix}-original`}>{lineContent}</span>;
    };

    lines.forEach((line, lineIndex) => {
        const key = `line-${lineIndex}`;
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
            if (elements.length === 0 || elements[elements.length - 1].type !== 'br') {
                elements.push(<br key={key} />);
            }
        } else {
            elements.push(<div key={key} style={{ marginBottom: '0.5rem' }}>{parseInline(line, `${key}-p-content`)}</div>);
        }
    });

    flushList();
    return elements;
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
                            border: '1px solid rgba(255,255,255,0.2)'
                        }}
                        whileHover={{ background: 'rgba(255, 255, 255, 0.2)' }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {q}
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

// ======================================================================
// NEW COMPONENT: AIMessage
// This component manages its own polling to get the final result.
// ======================================================================
const AIMessage = ({ message, onUpdateMessage }) => {
    const { status, taskId, text } = message;

    const handlePollingComplete = useCallback((data) => {
        if (data.status === 'SUCCESS') {
            onUpdateMessage(taskId, 'completed', data.result);
        } else {
            onUpdateMessage(taskId, 'error', data.error || 'An unknown error occurred.');
        }
    }, [taskId, onUpdateMessage]);

    // This hook will only run if taskId is present and status is 'pending'
    usePollAIResult(status === 'pending' ? taskId : null, handlePollingComplete);

    const renderContent = () => {
        if (status === 'pending') {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Consultor AI a processar o seu pedido...</span>
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
        // If status is 'completed'
        return parseMarkdown(text);
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
                maxWidth: '75%',
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

// ======================================================================
// Main Component: AIAdvisorPage
// ======================================================================
const AIAdvisorPage = () => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [initialDataContext, setInitialDataContext] = useState(null);
    const [initializationStep, setInitializationStep] = useState('idle');
    
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(scrollToBottom, [messages]);

    // 1. Fetch initial data to send to AI
    const { refetch: refetchInitialContext } = useQuery({
        queryKey: ['aiAdvisorInitialData'],
        queryFn: () => {
            setInitializationStep('fetching_context');
            return api.get('/ai-advisor/get-initial-context/');
        },
        enabled: initializationStep === 'idle', // Only fetch on initial load or retry
        retry: 1,
        refetchOnWindowFocus: false,
        onSuccess: (response) => {
            setInitialDataContext(response.data);
            setInitializationStep('context_ready');
        },
        onError: (err) => {
            const errorMsg = err.response?.data?.error || err.message || "Erro ao carregar dados iniciais.";
            setMessages([{ id: `err-${Date.now()}`, text: errorMsg, sender: 'ai', status: 'error' }]);
            setInitializationStep('error');
        }
    });

    // 2. Start AI session mutation (when context is ready)
    const { mutate: startSession, isPending: isStartingSession } = useMutation({
        mutationFn: (contextData) => api.post('/ai-advisor/start-session/', { context: contextData }),
        onSuccess: (response) => {
            const data = response.data;
            setSessionId(data.session_id);
            setMessages([{ id: `ai-${Date.now()}`, text: data.initial_message, sender: 'ai', status: 'completed' }]);
            setInitializationStep('ready');
        },
        onError: (err) => {
            const errorMsg = err.response?.data?.error || err.message || "Erro desconhecido ao iniciar sessão.";
            setMessages(prev => [...prev, { id: `err-${Date.now()}`, text: `Erro: ${errorMsg}`, sender: 'ai', status: 'error' }]);
            setInitializationStep('error');
        }
    });

    // Effect to trigger session start automatically
    useEffect(() => {
        if (initializationStep === 'context_ready' && initialDataContext) {
            setInitializationStep('starting_session');
            startSession(initialDataContext);
        }
    }, [initializationStep, initialDataContext, startSession]);

    // 3. Start the AI query task (asynchronous)
    const { mutate: startQueryTask, isPending: isStartingQueryTask } = useMutation({
        mutationFn: (queryData) => api.post('/ai-advisor/start-query/', queryData),
        onSuccess: (response, variables) => {
            const { task_id } = response.data;
            const { placeholderId } = variables;
            // Update placeholder with the real task ID to trigger polling
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === placeholderId ? { ...msg, taskId: task_id } : msg
                )
            );
        },
        onError: (err, variables) => {
            const { placeholderId } = variables;
            const errorMessage = err.response?.data?.error || 'Não foi possível enviar o seu pedido.';
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === placeholderId ? { ...msg, status: 'error', text: errorMessage } : msg
                )
            );
        }
    });
    
    // Callback to update a message in the state (e.g., when polling finishes)
    const handleUpdateMessage = useCallback((taskId, newStatus, newText) => {
        setMessages(prev =>
            prev.map(msg =>
                msg.taskId === taskId ? { ...msg, status: newStatus, text: newText } : msg
            )
        );
    }, []);

    const handleSendMessage = (e, questionOverride = null) => {
        if (e) e.preventDefault();
        const queryText = questionOverride || inputValue.trim();
        const isAiBusy = messages.some(m => m.sender === 'ai' && m.status === 'pending');

        if (!queryText || !sessionId || isAiBusy || isStartingQueryTask) {
            return;
        }

        const userMessage = { id: `user-${Date.now()}`, text: queryText, sender: 'user' };
        const aiPlaceholderId = `ai-placeholder-${Date.now()}`;
        const aiPlaceholderMessage = {
            id: aiPlaceholderId,
            sender: 'ai',
            status: 'pending',
            text: 'Iniciando...',
            taskId: null
        };

        setMessages(prev => [...prev, userMessage, aiPlaceholderMessage]);
        setInputValue('');
        startQueryTask({ session_id: sessionId, query: queryText, placeholderId: aiPlaceholderId });
    };
    
    const handleRetryInitialization = () => {
        setMessages([]);
        setInitialDataContext(null);
        setSessionId(null);
        setInitializationStep('idle');
        // This will trigger the useQuery to run again due to `enabled: initializationStep === 'idle'`
    };
    
    const isAiBusy = messages.some(m => m.sender === 'ai' && m.status === 'pending');
    const isChatInterfaceDisabled = initializationStep !== 'ready' || isAiBusy;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', color: 'white', position: 'relative' }}>
            <BackgroundElements />
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
                        <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} style={{ padding: '0.5rem', background: 'rgba(147, 51, 234, 0.2)', borderRadius: '12px' }}>
                            <Brain size={28} style={{ color: 'rgb(196, 181, 253)' }} />
                        </motion.div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>Consultor AI TarefAI</h1>
                            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.875rem' }}>Seu assistente inteligente para otimização de negócios.</p>
                        </div>
                    </div>
                    {initializationStep === 'error' && (
                         <motion.button
                            onClick={handleRetryInitialization}
                            style={{...glassStyle, padding: '0.5rem 1rem', background: 'rgba(251, 191, 36, 0.2)', border: '1px solid rgba(251, 191, 36, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'}}
                            whileHover={{ background: 'rgba(251, 191, 36, 0.3)'}}
                            whileTap={{ scale: 0.95 }}
                        >
                            <RefreshCw size={16} /> Tentar Novamente
                        </motion.button>
                    )}
                </header>

                <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }} className="custom-scrollbar-dark">
                    <AnimatePresence>
                        {messages.map((msg) => 
                            msg.sender === 'user' ? (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} layout
                                    style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}
                                >
                                    <div style={{
                                        maxWidth: '75%', padding: '0.75rem 1rem', borderRadius: '12px 12px 0 12px',
                                        background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(96, 165, 250))',
                                        color: 'white', fontSize: '0.9rem', lineHeight: '1.5',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                    }}>
                                        {msg.text}
                                    </div>
                                    <User size={18} style={{ color: 'rgb(96, 165, 250)', marginLeft: '0.5rem', flexShrink: 0, alignSelf: 'flex-start', marginTop: '0.5rem' }} />
                                </motion.div>
                            ) : (
                                <AIMessage key={msg.id} message={msg} onUpdateMessage={handleUpdateMessage} />
                            )
                        )}
                    </AnimatePresence>
                    
                    {initializationStep === 'fetching_context' && (
                        <motion.div layout className="ai-message-loading"><Loader2 className="animate-spin" size={18} />A recolher e analisar dados do seu escritório...</motion.div>
                    )}
                    {initializationStep === 'starting_session' && (
                        <motion.div layout className="ai-message-loading"><Sparkles size={18} />A iniciar sessão com o Consultor AI e a preparar os seus insights...</motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                {initializationStep === 'ready' && <SuggestedQuestions onQuestionClick={(q) => handleSendMessage(null, q)} isLoading={isAiBusy} />}

                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                    <input
                        type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                        placeholder={initializationStep !== 'ready' ? "Aguarde o Consultor AI..." : "Faça uma pergunta sobre seus dados..."}
                        disabled={isChatInterfaceDisabled}
                        style={{
                            flexGrow: 1, padding: '0.85rem 1.15rem', background: 'rgba(0,0,0,0.25)',
                            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px',
                            color: 'white', fontSize: '0.95rem', outline: 'none',
                            opacity: isChatInterfaceDisabled ? 0.6 : 1,
                        }}
                    />
                    <motion.button
                        type="submit" disabled={isChatInterfaceDisabled || !inputValue.trim()}
                        style={{
                            padding: '0.85rem 1.5rem', background: 'linear-gradient(135deg, rgb(59, 130, 246), rgb(96, 165, 250))',
                            border: 'none', borderRadius: '10px', color: 'white', fontSize: '0.95rem',
                            fontWeight: '500', cursor: (isChatInterfaceDisabled || !inputValue.trim()) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            opacity: (isChatInterfaceDisabled || !inputValue.trim()) ? 0.6 : 1,
                        }}
                        whileHover={{ filter: 'brightness(1.15)' }} whileTap={{ scale: 0.97 }}
                    >
                        <Send size={18} /> Enviar
                    </motion.button>
                </form>
            </div>
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
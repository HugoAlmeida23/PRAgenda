import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Brain, Sparkles, AlertTriangle, HelpCircle, MessageSquare, User, RefreshCw } from 'lucide-react';
import BackgroundElements from '../components/HeroSection/BackgroundElements';
import { usePermissions } from '../contexts/PermissionsContext';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    color: 'white',
};

// AIAdvisorPage.jsx

// ... (imports and other code) ...

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
                elements.push(<ol key={`ol-${elements.length}`} style={{ paddingLeft: '20px', margin: '0.5rem 0' }}>{listItems}</ol>);
            }
            listItems = [];
            currentListType = null;
        }
    }
    

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
            const regex = new RegExp(pattern.regex.source, pattern.regex.flags); // Create new RegExp instance
            while ((match = regex.exec(lineContent)) !== null) {
                allMatches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    content: match[1],
                    component: pattern.component,
                });
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

        // Unordered list item
        const ulMatch = line.match(/^(\s*)(?:[-*+])\s+(.*)/);
        if (ulMatch) {
            if (currentListType !== 'ul') {
                flushList(); // Flush previous list if different type
                currentListType = 'ul';
            }
            const [, , itemContent] = ulMatch;
            listItems.push(<li key={`${key}-li`}>{parseInline(itemContent, `${key}-li-content`)}</li>);
            return; // Continue to next line
        }

        // Ordered list item
        const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
        if (olMatch) {
            if (currentListType !== 'ol') {
                flushList();
                currentListType = 'ol';
            }
            const [, , , itemContent] = olMatch;
            listItems.push(<li key={`${key}-li`}>{parseInline(itemContent, `${key}-li-content`)}</li>);
            return; // Continue to next line
        }

        // If not a list item, flush any existing list
        flushList();

        // Handle empty lines as paragraph breaks (or just breaks if many)
        if (!line.trim()) {
            // Add a single break for an empty line, but avoid too many consecutive
            if (elements.length === 0 || elements[elements.length - 1].type !== 'br') {
                 elements.push(<br key={key} />);
            }
        } else {
            // Regular paragraph
            elements.push(<div key={key} style={{ marginBottom: '0.5rem' }}>{parseInline(line, `${key}-p-content`)}</div>);
        }
    });

    // Flush any remaining list items at the end of the text
    flushList();

    return elements;
};

// ... (Rest of AIAdvisorPage.jsx) ...

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

const AIAdvisorPage = () => {
    console.log("AIAdvisorPage: Component rendered/re-rendered.");

    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [initialDataContext, setInitialDataContext] = useState(null);
    const [initializationStep, setInitializationStep] = useState('idle');
    const [initialContextReady, setInitialContextReady] = useState(false);
    const [shouldStartFetching, setShouldStartFetching] = useState(true);
    
    const messagesEndRef = useRef(null);
    const queryClient = useQueryClient();

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(scrollToBottom, [messages]);

    // 1. Fetch initial data to send to AI
    const {
        data: fetchedInitialData,
        isLoading: isLoadingInitialContextQuery,
        isError: isErrorInitialContextQuery,
        error: errorInitialContextQuery,
        isSuccess: isSuccessInitialContextQuery,
        refetch: refetchInitialContext
    } = useQuery({
        queryKey: ['aiAdvisorInitialData'],
        queryFn: async () => {
            console.log("AIAdvisorPage: queryFn - Starting fetch...");
            setInitializationStep('fetching_context');
            
            try {
                console.log("AIAdvisorPage: Making API call to /ai-advisor/get-initial-context/");
                const response = await api.get('/ai-advisor/get-initial-context/');
                console.log("AIAdvisorPage: API response received:", response);
                console.log("AIAdvisorPage: Response data:", response.data);
                console.log("AIAdvisorPage: Response status:", response.status);
                return response.data;
            } catch (error) {
                console.error("AIAdvisorPage: API call failed:", error);
                console.error("AIAdvisorPage: Error response:", error.response);
                console.error("AIAdvisorPage: Error message:", error.message);
                throw error;
            }
        },
        enabled: shouldStartFetching && !sessionId && !initialDataContext,
        staleTime: 0,
        cacheTime: 0,
        retry: false, // Disable retry for easier debugging
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        onSuccess: (data) => {
            console.log("AIAdvisorPage: onSuccess triggered with data:", data);
            console.log("AIAdvisorPage: Data type:", typeof data);
            console.log("AIAdvisorPage: Data keys:", data ? Object.keys(data) : 'No data');
            
            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                console.log("AIAdvisorPage: Data validation passed, setting context");
                setInitialDataContext(data);
                setInitialContextReady(true);
            } else {
                console.warn("AIAdvisorPage: Data validation failed - empty or invalid data");
                const errorMsg = "Dados iniciais vazios ou inválidos. Tente recarregar.";
                setMessages(prev => [...prev, { 
                    id: `err-${Date.now()}`, 
                    text: errorMsg, 
                    sender: 'ai', 
                    type: 'error' 
                }]);
                setInitializationStep('error');
            }
        },
        onError: (err) => {
            console.error("AIAdvisorPage: onError triggered:", err);
            console.error("AIAdvisorPage: Error details:", {
                message: err.message,
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data
            });
            
            let errorMsg = "Erro desconhecido";
            if (err.response?.status === 403) {
                errorMsg = "Sem permissão para aceder ao Consultor AI";
            } else if (err.response?.status === 404) {
                errorMsg = "Endpoint do Consultor AI não encontrado";
            } else if (err.response?.status >= 500) {
                errorMsg = "Erro interno do servidor";
            } else if (err.response?.data?.error) {
                errorMsg = err.response.data.error;
            } else {
                errorMsg = err.message || "Erro ao carregar dados iniciais";
            }
            
            setMessages(prev => [...prev, { 
                id: `err-${Date.now()}`, 
                text: `Erro: ${errorMsg}`, 
                sender: 'ai', 
                type: 'error' 
            }]);
            setInitializationStep('error');
        }
    });

    // Debug effect to monitor query state and handle success manually
    useEffect(() => {
        console.log("AIAdvisorPage: Query state changed:", {
            isLoading: isLoadingInitialContextQuery,
            isError: isErrorInitialContextQuery,
            isSuccess: isSuccessInitialContextQuery,
            error: errorInitialContextQuery,
            data: fetchedInitialData,
            enabled: shouldStartFetching && !sessionId && !initialDataContext,
            shouldStartFetching,
            sessionId,
            initialDataContext: !!initialDataContext
        });

        // Manual handling if onSuccess didn't trigger
        if (isSuccessInitialContextQuery && fetchedInitialData && !initialDataContext) {
            console.log("AIAdvisorPage: Manual success handling - fetchedInitialData:", fetchedInitialData);
            console.log("AIAdvisorPage: fetchedInitialData type:", typeof fetchedInitialData);
            console.log("AIAdvisorPage: fetchedInitialData keys:", fetchedInitialData ? Object.keys(fetchedInitialData) : 'No data');
            
            // Try to process the data manually
            if (fetchedInitialData && typeof fetchedInitialData === 'object') {
                const dataKeys = Object.keys(fetchedInitialData);
                console.log("AIAdvisorPage: Manual processing - data has", dataKeys.length, "keys");
                
                if (dataKeys.length > 0) {
                    console.log("AIAdvisorPage: Manual processing - setting initial data context");
                    setInitialDataContext(fetchedInitialData);
                    setInitialContextReady(true);
                    setInitializationStep('ready_for_session'); // Different step to avoid confusion
                } else {
                    console.warn("AIAdvisorPage: Manual processing - data object is empty");
                    setInitializationStep('error');
                }
            } else {
                console.warn("AIAdvisorPage: Manual processing - data is not an object:", fetchedInitialData);
                setInitializationStep('error');
            }
        }
    }, [
        isLoadingInitialContextQuery, 
        isErrorInitialContextQuery, 
        isSuccessInitialContextQuery, 
        errorInitialContextQuery, 
        fetchedInitialData,
        shouldStartFetching,
        sessionId,
        initialDataContext
    ]);

    // 2. Start AI session mutation
    const { mutate: startSession, isPending: isStartingSessionMutation, reset: resetStartSessionMutation } = useMutation({
        mutationFn: (contextData) => {
            console.log("AIAdvisorPage: startSessionMutation mutationFn - Context:", contextData);
            if (!contextData || Object.keys(contextData).length === 0) {
                throw new Error("Dados de contexto inválidos");
            }
            return api.post('/ai-advisor/start-session/', { context: contextData });
        },
        onSuccess: (response) => {
            const data = response.data;
            console.log("AIAdvisorPage: startSessionMutation onSuccess - AI session started:", data);
            setSessionId(data.session_id);
            setMessages([{ id: `ai-${Date.now()}`, text: data.initial_message || "Olá! Sou o seu Consultor AI...", sender: 'ai' }]);
            setInitializationStep('ready');
        },
        onError: (err) => {
            console.error("AIAdvisorPage: startSessionMutation onError - Error starting AI session:", err);
            const errorMsg = err.response?.data?.error || err.message || "Erro desconhecido";
            setMessages(prev => [...prev, { id: `err-${Date.now()}`, text: `Erro ao iniciar sessão: ${errorMsg}`, sender: 'ai', type: 'error' }]);
            setInitializationStep('error');
        }
    });

    // Effect to trigger session start once initial context is ready
    useEffect(() => {
        console.log("AIAdvisorPage: useEffect [session start check] - State:", { 
            initialContextReady, 
            initialDataContext: initialDataContext ? "Data Loaded" : "No Data", 
            sessionId, 
            initializationStep, 
            isStartingSessionMutation 
        });

        if (initialContextReady && initialDataContext && !sessionId && 
            (initializationStep === 'ready_for_session' || initializationStep === 'fetching_context') &&
            initializationStep !== 'starting_session' && 
            initializationStep !== 'ready' &&          
            initializationStep !== 'error' &&          
            !isStartingSessionMutation) {
            
            console.log("AIAdvisorPage: useEffect - Starting session...");
            setInitializationStep('starting_session');
            startSession(initialDataContext);
        }
    }, [initialContextReady, initialDataContext, sessionId, initializationStep, startSession, isStartingSessionMutation]);

    // 3. Send query mutation
    const { mutate: sendQuery, isPending: isSendingQuery } = useMutation({
        mutationFn: (queryData) => {
            console.log("AIAdvisorPage: sendQueryMutation mutationFn - Sending query:", queryData);
            return api.post('/ai-advisor/query/', queryData);
        },
        onSuccess: (response) => {
            const data = response.data;
            console.log("AIAdvisorPage: sendQueryMutation onSuccess - Received AI response:", data);
            setMessages(prev => [...prev, { id: `ai-${Date.now()}`, text: data.response, sender: 'ai' }]);
        },
        onError: (err) => {
            console.error("AIAdvisorPage: sendQueryMutation onError - Error sending query to AI:", err);
            const errorMessage = err?.response?.data?.error || err?.message || "Erro desconhecido.";
            setMessages(prev => [...prev, { id: `err-${Date.now()}`, text: `Erro ao processar sua pergunta: ${errorMessage}`, sender: 'ai', type: 'error' }]);
        }
    });

    const handleSendMessage = (e, questionOverride = null) => {
        if (e) e.preventDefault();
        const queryText = questionOverride || inputValue.trim();
        console.log("AIAdvisorPage: handleSendMessage - Attempting to send:", queryText);

        if (!queryText || !sessionId) {
            console.warn("AIAdvisorPage: handleSendMessage - Aborted: No query text or session ID.", { queryText, sessionId });
            return;
        }
        if (isSendingQuery || initializationStep !== 'ready') {
            console.warn("AIAdvisorPage: handleSendMessage - Aborted: AI busy or not ready.", { isSendingQuery, initializationStep });
            return;
        }

        setMessages(prev => [...prev, { id: `user-${Date.now()}`, text: queryText, sender: 'user' }]);
        setInputValue('');
        sendQuery({ session_id: sessionId, query: queryText });
    };
    
    const handleRetryInitialization = () => {
        console.log("AIAdvisorPage: handleRetryInitialization - Retrying...");
        setMessages([]);
        setInitialDataContext(null);
        setSessionId(null);
        setInitializationStep('idle');
        setInitialContextReady(false);
        resetStartSessionMutation();
        // Trigger refetch immediately
        refetchInitialContext();
    };
    
    // Determine UI loading/disabled states
    const isChatInterfaceDisabled = !sessionId || initializationStep !== 'ready' || isSendingQuery;

    console.log("AIAdvisorPage: Current State:", { 
        initializationStep, 
        sessionId, 
        isLoadingInitialContextQuery, 
        isStartingSessionMutation, 
        isSendingQuery, 
        isChatInterfaceDisabled,
        shouldStartFetching
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', color: 'white', position: 'relative' }}>
            <BackgroundElements />
            <div style={{
                ...glassStyle,
                margin: '1.5rem',
                padding: '1.5rem',
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                zIndex: 1,
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
                            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.875rem' }}>
                                Seu assistente inteligente para otimização de negócios.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                        <motion.button
                            onClick={() => {
                                console.log("=== DEBUG INFO ===");
                                console.log("Current State:", {
                                    initializationStep,
                                    sessionId,
                                    initialDataContext: !!initialDataContext,
                                    initialContextReady,
                                    shouldStartFetching,
                                    isLoadingInitialContextQuery,
                                    isErrorInitialContextQuery,
                                    errorInitialContextQuery,
                                    isSuccessInitialContextQuery
                                });
                                console.log("Messages:", messages);
                                console.log("=== END DEBUG ===");
                            }}
                            style={{...glassStyle, padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'}}
                            whileHover={{ background: 'rgba(59, 130, 246, 0.3)'}}
                            whileTap={{ scale: 0.95 }}
                        >
                            🔍 Debug
                        </motion.button>
                    </div>
                </header>

                <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.5rem' }} className="custom-scrollbar-dark">
                    <AnimatePresence>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                layout
                                style={{
                                    display: 'flex',
                                    justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                    marginBottom: '0.75rem',
                                }}
                            >
                                {msg.sender === 'ai' && (
                                    <Sparkles size={18} style={{ color: 'rgb(196, 181, 253)', marginRight: '0.5rem', flexShrink: 0, alignSelf: 'flex-start', marginTop: '0.5rem' }} />
                                )}
                                <div style={{
                                    maxWidth: '75%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                    background: msg.sender === 'user'
                                        ? 'linear-gradient(135deg, rgb(59, 130, 246), rgb(96, 165, 250))'
                                        : (msg.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)'),
                                    color: msg.type === 'error' ? 'rgb(252, 165, 165)' : 'white',
                                    border: msg.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.5',
                                    boxShadow: msg.sender === 'user' ? '0 2px 5px rgba(0,0,0,0.2)' : '0 2px 5px rgba(0,0,0,0.1)'
                                }}>
                                    {msg.type === 'error' && <AlertTriangle size={16} style={{ marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'middle' }} />}
                                    {msg.sender === 'ai' ? parseMarkdown(msg.text) : msg.text}
                                </div>
                                {msg.sender === 'user' && (
                                     <User size={18} style={{ color: 'rgb(96, 165, 250)', marginLeft: '0.5rem', flexShrink: 0, alignSelf: 'flex-start', marginTop: '0.5rem' }} />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    
                    {/* Loading Indicators */}
                    {initializationStep === 'fetching_context' && (
                        <motion.div layout className="ai-message-loading">
                            <Loader2 className="animate-spin" size={18} />
                            <div>
                                <div>A recolher e analisar dados do seu escritório...</div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
                                    Query state: {isLoadingInitialContextQuery ? 'Loading' : isErrorInitialContextQuery ? 'Error' : isSuccessInitialContextQuery ? 'Success' : 'Idle'}
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {initializationStep === 'starting_session' && (
                        <motion.div layout className="ai-message-loading">
                            <Sparkles size={18} />
                            A iniciar sessão com o Consultor AI e a preparar os seus insights...
                        </motion.div>
                    )}
                     {isSendingQuery && (
                        <motion.div layout className="ai-message-loading">
                            <Sparkles size={18} />
                            Consultor AI a processar o seu pedido...
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                {initializationStep === 'ready' && <SuggestedQuestions onQuestionClick={(q) => handleSendMessage(null, q)} isLoading={isSendingQuery} />}

                <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                        placeholder={initializationStep !== 'ready' ? "Aguarde o Consultor AI..." : "Faça uma pergunta sobre seus dados..."}
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
                        onClick={handleSendMessage}
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
                        whileHover={{ filter: 'brightness(1.15)' }}
                        whileTap={{ scale: 0.97 }}
                    >
                        {isSendingQuery ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        Enviar
                    </motion.button>
                </div>
            </div>
             <style jsx global>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 3px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
                .ai-message-loading {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    background: rgba(255,255,255,0.05);
                    border-radius: 12px;
                    font-size: 0.9rem;
                    color: rgba(255,255,255,0.6);
                    margin-bottom: 0.75rem;
                }
                .ai-message-loading > svg {
                    animation: spin 1.5s linear infinite;
                    color: rgba(255,255,255,0.6);
                }
                .ai-message-loading .animate-pulse > svg {
                     animation: pulseColor 2s infinite ease-in-out;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulseColor {
                    0%, 100% { color: rgb(196, 181, 253); }
                    50% { color: rgb(147, 51, 234); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default AIAdvisorPage;
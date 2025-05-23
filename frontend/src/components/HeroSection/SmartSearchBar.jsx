import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    Mic, 
    Sparkles, 
    Clock, 
    User, 
    FileText,
    ArrowRight,
    Zap,
    Command
} from 'lucide-react';

const SmartSearchBar = ({ dashboardData, placeholder }) => {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef(null);

    const getSmartSuggestions = (searchQuery) => {
        const currentHour = new Date().getHours();
        const baseSuggestions = [
            {
                type: 'time_entry',
                icon: Clock,
                text: 'Trabalhei 2 horas com cliente ABC hoje',
                category: 'Entrada de Tempo',
                color: 'rgb(52, 211, 153)'
            },
            {
                type: 'task_creation',
                icon: FileText,
                text: 'Criar tarefa de revisão fiscal para cliente XYZ',
                category: 'Nova Tarefa',
                color: 'rgb(96, 165, 250)'
            },
            {
                type: 'client_query',
                icon: User,
                text: 'Mostrar relatório de rentabilidade do cliente ABC',
                category: 'Consulta',
                color: 'rgb(196, 181, 253)'
            }
        ];

        const contextSuggestions = [];

        if (currentHour >= 6 && currentHour < 12) {
            contextSuggestions.push({
                type: 'morning_routine',
                icon: Zap,
                text: 'Mostrar tarefas prioritárias para hoje',
                category: 'Planeamento',
                color: 'rgb(251, 191, 36)'
            });
        }

        if (currentHour >= 12 && currentHour < 18) {
            contextSuggestions.push({
                type: 'afternoon_check',
                icon: Clock,
                text: 'Quanto tempo trabalhei hoje?',
                category: 'Progresso',
                color: 'rgb(34, 197, 94)'
            });
        }

        if (dashboardData?.overdueTasksCount > 0) {
            contextSuggestions.push({
                type: 'overdue_alert',
                icon: FileText,
                text: `Resolver ${dashboardData.overdueTasksCount} tarefas atrasadas`,
                category: 'Urgente',
                color: 'rgb(239, 68, 68)'
            });
        }

        return [...contextSuggestions, ...baseSuggestions].slice(0, 4);
    };

    useEffect(() => {
        if (query.length > 0 || isFocused) {
            const newSuggestions = getSmartSuggestions(query);
            setSuggestions(newSuggestions);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    }, [query, dashboardData, isFocused]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleVoiceToggle = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'pt-PT';

            if (!isListening) {
                setIsListening(true);
                recognition.start();

                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    setQuery(transcript);
                    setIsListening(false);
                };

                recognition.onerror = () => {
                    setIsListening(false);
                };

                recognition.onend = () => {
                    setIsListening(false);
                };
            } else {
                recognition.stop();
                setIsListening(false);
            }
        } else {
            alert('Speech recognition não é suportado neste navegador');
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion.text);
        setShowSuggestions(false);
        console.log('Processing suggestion:', suggestion);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            console.log('Processing query:', query);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { duration: 0.3 }
        }
    };

    const suggestionVariants = {
        hidden: { opacity: 0, y: -10 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                duration: 0.2,
                ease: "easeOut"
            }
        },
        exit: { 
            opacity: 0, 
            y: -10,
            transition: { duration: 0.1 }
        }
    };

    const containerStyle = {
        position: 'relative',
        width: '100%'
    };

    const formStyle = {
        position: 'relative'
    };

    const inputContainerStyle = {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: isFocused 
            ? '1px solid rgba(255, 255, 255, 0.4)' 
            : '1px solid rgba(255, 255, 255, 0.3)',
        backgroundColor: isFocused 
            ? 'rgba(255, 255, 255, 0.2)' 
            : 'rgba(255, 255, 255, 0.15)',
        boxShadow: isFocused 
            ? '0 10px 25px rgba(255, 255, 255, 0.2)' 
            : 'none',
        transition: 'all 0.3s'
    };

    const searchIconStyle = {
        paddingLeft: '1.5rem',
        paddingRight: '0.75rem'
    };

    const inputStyle = {
        flex: 1,
        padding: '1rem 0.5rem',
        backgroundColor: 'transparent',
        color: 'white',
        border: 'none',
        outline: 'none',
        fontSize: '0.875rem'
    };

    const aiIndicatorStyle = {
        paddingLeft: '0.75rem',
        paddingRight: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        opacity: isFocused ? 1 : 0.7,
        transition: 'opacity 0.2s'
    };

    const voiceButtonStyle = {
        margin: '0 0.75rem',
        padding: '0.5rem',
        borderRadius: '8px',
        backgroundColor: isListening 
            ? 'rgb(239, 68, 68)' 
            : 'rgba(255, 255, 255, 0.1)',
        color: isListening 
            ? 'white' 
            : 'rgba(255, 255, 255, 0.8)',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s'
    };

    const voiceButtonHoverStyle = {
        backgroundColor: isListening 
            ? 'rgb(239, 68, 68)' 
            : 'rgba(255, 255, 255, 0.2)'
    };

    const shortcutStyle = {
        paddingRight: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        color: 'rgba(255, 255, 255, 0.4)'
    };

    const suggestionsStyle = {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: '0.5rem',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        overflow: 'hidden',
        zIndex: 50
    };

    const suggestionItemStyle = {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.2s'
    };

    const suggestionItemHoverStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.1)'
    };

    const suggestionFooterStyle = {
        padding: '0.5rem 1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
    };

    const listeningIndicatorStyle = {
        position: 'absolute',
        bottom: '-48px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '8px',
        padding: '0.5rem 1rem'
    };

    const listeningContentStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    };

    const listeningDotStyle = {
        width: '8px',
        height: '8px',
        backgroundColor: 'rgb(248, 113, 113)',
        borderRadius: '50%'
    };

    return (
        <motion.div 
            style={containerStyle}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <form onSubmit={handleSubmit} style={formStyle}>
                <motion.div
                    style={inputContainerStyle}
                    animate={{
                        scale: isFocused ? 1.02 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Search Icon */}
                    <div style={searchIconStyle}>
                        <Search 
                            style={{ 
                                color: isFocused ? 'white' : 'rgba(255, 255, 255, 0.6)',
                                transition: 'color 0.2s'
                            }} 
                            size={20} 
                        />
                    </div>

                    {/* Input Field */}
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                        placeholder={placeholder}
                        style={{
                            ...inputStyle,
                            '::placeholder': {
                                color: 'rgba(255, 255, 255, 0.5)'
                            }
                        }}
                    />

                    {/* AI Indicator */}
                    <motion.div 
                        style={aiIndicatorStyle}
                        animate={{
                            opacity: isFocused ? 1 : 0.7
                        }}
                    >
                        <Sparkles 
                            style={{ color: 'rgb(196, 181, 253)' }}
                            size={16}
                        />
                        <span style={{ 
                            color: 'rgb(196, 181, 253)', 
                            fontSize: '0.75rem', 
                            fontWeight: '500' 
                        }}>
                            AI
                        </span>
                    </motion.div>

                    {/* Voice Button */}
                    <motion.button
                        type="button"
                        onClick={handleVoiceToggle}
                        style={voiceButtonStyle}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = voiceButtonHoverStyle.backgroundColor}
                        onMouseLeave={(e) => e.target.style.backgroundColor = voiceButtonStyle.backgroundColor}
                    >
                        <motion.div
                            animate={isListening ? {
                                scale: [1, 1.2, 1],
                                rotate: [0, 5, -5, 0]
                            } : {}}
                            transition={{ 
                                duration: 0.5,
                                repeat: isListening ? Infinity : 0
                            }}
                        >
                            <Mic size={16} />
                        </motion.div>
                    </motion.button>

                    {/* Keyboard Shortcut Hint */}
                    {!isFocused && (
                        <motion.div 
                            style={shortcutStyle}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <Command size={12} />
                            <span style={{ fontSize: '0.75rem' }}>K</span>
                        </motion.div>
                    )}
                </motion.div>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={suggestionVariants}
                            style={suggestionsStyle}
                        >
                            <div style={{ padding: '0.5rem' }}>
                                {suggestions.map((suggestion, index) => {
                                    const SuggestionIcon = suggestion.icon;
                                    return (
                                        <motion.button
                                            key={index}
                                            onClick={() => handleSuggestionClick(suggestion)}
                                            style={suggestionItemStyle}
                                            whileHover={{ x: 5 }}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = suggestionItemHoverStyle.backgroundColor}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                        >
                                            <SuggestionIcon 
                                                style={{ color: suggestion.color }}
                                                size={16} 
                                            />
                                            <div style={{ flex: 1 }}>
                                                <p style={{
                                                    color: 'white',
                                                    fontSize: '0.875rem',
                                                    margin: 0
                                                }}>
                                                    {suggestion.text}
                                                </p>
                                                <p style={{
                                                    color: 'rgba(255, 255, 255, 0.5)',
                                                    fontSize: '0.75rem',
                                                    margin: 0
                                                }}>
                                                    {suggestion.category}
                                                </p>
                                            </div>
                                            <ArrowRight 
                                                style={{ 
                                                    color: 'rgba(255, 255, 255, 0.3)',
                                                    transition: 'color 0.2s'
                                                }}
                                                size={14} 
                                            />
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div style={suggestionFooterStyle}>
                                <p style={{
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    fontSize: '0.75rem',
                                    textAlign: 'center',
                                    margin: 0
                                }}>
                                    Digite ou fale naturalmente • IA processará automaticamente
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>

            {/* Listening Indicator */}
            <AnimatePresence>
                {isListening && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        style={listeningIndicatorStyle}
                    >
                        <div style={listeningContentStyle}>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                style={listeningDotStyle}
                            />
                            <span style={{
                                color: 'rgb(248, 113, 113)',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}>
                                A escutar...
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default SmartSearchBar;
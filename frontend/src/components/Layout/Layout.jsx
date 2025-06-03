import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link, Outlet } from 'react-router-dom';
import {
  Home, Users, Clock, CheckSquare, DollarSign, Settings,
  Bell, Search, Menu, X, LogOut, User as UserIconLucide, // Renamed User to UserIconLucide
  Briefcase, GitPullRequest, Sparkles, Zap, Brain,
  BarChart3, TrendingUp, Calendar, FileText, HelpCircle, User2,
  ArrowRight, Send, Command, Check, Loader2, PackageOpen, PlayCircle, AlertTriangle// Added Loader2 and PackageOpen
} from 'lucide-react';
import api from '../../api';
import BackgroundElements from '../HeroSection/BackgroundElements';
import './Layout.css'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Added React Query
import { toast } from 'react-toastify'; // For potential error messages

// AI Navigation Service (existing)
class AINavigationService {
  static navigationMap = [
    {
      keywords: ['dashboard', 'inicio', 'home', 'painel', 'overview', 'resumo'],
      path: '/',
      label: 'Dashboard',
      description: 'Ver painel principal e estatísticas'
    },
    {
      keywords: ['cliente', 'clientes', 'client', 'clients', 'empresas', 'empresa'],
      path: '/clients',
      label: 'Clientes',
      description: 'Gerir clientes e informações'
    },
    {
      keywords: ['tempo', 'time', 'registo', 'registrar', 'timesheet', 'horas', 'minutos'],
      path: '/timeentry',
      label: 'Registo de Tempos',
      description: 'Registar tempo gasto em tarefas'
    },
    {
      keywords: ['tarefa', 'tarefas', 'task', 'tasks', 'trabalho', 'atividade', 'atividades'],
      path: '/tasks',
      label: 'Tarefas',
      description: 'Ver e gerir tarefas'
    },
    {
      keywords: ['rentabilidade', 'lucro', 'profit', 'profitability', 'financeiro', 'dinheiro'],
      path: '/clientprofitability',
      label: 'Rentabilidade',
      description: 'Análise de rentabilidade de clientes'
    },
    {
      keywords: ['organização', 'organization', 'empresa', 'equipa', 'team', 'membros'],
      path: '/organization',
      label: 'Organização',
      description: 'Gerir organização e membros'
    },
    {
      keywords: ['workflow', 'fluxo', 'processo', 'aprovação', 'etapa', 'etapas'],
      path: '/workflow-management',
      label: 'Workflows',
      description: 'Gerir fluxos de trabalho'
    },
    {
      keywords: ['perfil', 'profile', 'conta', 'utilizador', 'user', 'configurações pessoais'],
      path: '/profile',
      label: 'Perfil',
      description: 'Ver e editar perfil pessoal'
    }
  ];

  static processNavigationIntent(query) {
    const cleanQuery = query.toLowerCase().trim();
    
    const navigationPatterns = [
      { pattern: /^(ir para|ir a|ir|navegar para|abrir|ver|mostrar|quero ver)\s+(.+)/, intentType: 'navigate' },
      { pattern: /^(criar|nova?|novo|adicionar|registar|registrar)\s+(.+)/, intentType: 'create' },
      { pattern: /^(editar|alterar|modificar|mudar)\s+(.+)/, intentType: 'edit' },
      { pattern: /^(procurar|pesquisar|encontrar|buscar)\s+(.+)/, intentType: 'search' }
    ];

    for (const { pattern, intentType } of navigationPatterns) {
      const match = cleanQuery.match(pattern);
      if (match) {
        const target = match[2];
        const route = this.findBestMatch(target);
        if (route) {
          return {
            type: intentType,
            route,
            confidence: this.calculateConfidence(target, route.keywords),
            query: cleanQuery
          };
        }
      }
    }

    const directMatch = this.findBestMatch(cleanQuery);
    if (directMatch) {
      return {
        type: 'navigate',
        route: directMatch,
        confidence: this.calculateConfidence(cleanQuery, directMatch.keywords),
        query: cleanQuery
      };
    }

    return null;
  }

  static findBestMatch(query) {
    let bestMatch = null;
    let highestScore = 0;

    for (const route of this.navigationMap) {
      for (const keyword of route.keywords) {
        const score = this.calculateSimilarity(query, keyword);
        if (score > highestScore && score > 0.3) {
          highestScore = score;
          bestMatch = route;
        }
      }
    }

    return bestMatch;
  }

  static calculateSimilarity(query, keyword) {
    if (query.includes(keyword) || keyword.includes(query)) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(query, keyword);
    const maxLength = Math.max(query.length, keyword.length);
    return 1 - (distance / maxLength);
  }

  static levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  static calculateConfidence(query, keywords) {
    const scores = keywords.map(keyword => this.calculateSimilarity(query, keyword));
    return Math.max(...scores);
  }
}

// AI Search Component (existing)
const AISearchBar = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length > 2) {
      const intent = AINavigationService.processNavigationIntent(value);
      if (intent && intent.confidence > 0.3) {
        setSuggestions([intent]);
        setShowSuggestions(true);
      } else {
        const partialMatches = AINavigationService.navigationMap
          .filter(route => 
            route.keywords.some(keyword => 
              keyword.includes(value.toLowerCase()) || 
              value.toLowerCase().includes(keyword)
            )
          )
          .slice(0, 3)
          .map(route => ({
            type: 'navigate',
            route,
            confidence: 0.7,
            query: value
          }));
        
        setSuggestions(partialMatches);
        setShowSuggestions(partialMatches.length > 0);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setIsLoading(true);
    setTimeout(() => {
      onNavigate(suggestion.route.path);
      setQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
    }, 500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && suggestions.length > 0) {
      handleSuggestionClick(suggestions[0]);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getIntentIcon = (intentType) => {
    switch (intentType) {
      case 'create': return <FileText size={16} />;
      case 'edit': return <Settings size={16} />;
      case 'search': return <Search size={16} />;
      default: return <ArrowRight size={16} />;
    }
  };

  const getIntentText = (intentType) => {
    switch (intentType) {
      case 'create': return 'Criar';
      case 'edit': return 'Editar';
      case 'search': return 'Pesquisar';
      default: return 'Ir para';
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchRef]);


  return (
    <div style={{ position: 'relative', width: '100%' }} ref={searchRef}>
      <motion.div
        whileHover={{ scale: 1.05 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '44px',
          padding: '0.7rem 2rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          width: '130%',
        }}
      >
        <Search
          size={18}
          style={{
            marginRight: '0.75rem',
            color: 'rgba(255, 255, 255, 0.7)'
          }}
        />
        <input
          type="text"
          placeholder="Pesquisar ou navegar com AI..."
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyPress}
          onFocus={() => query.length > 2 && setShowSuggestions(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '0.9rem',
            outline: 'none',
            width: '100%'
          }}
        />
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Brain size={16} style={{ color: 'rgb(196, 181, 253)' }} />
          </motion.div>
        ) : (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Sparkles
              size={16}
              style={{ color: 'rgb(196, 181, 253)' }}
            />
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '100%',
              width: '130%',
              left: 0,
              right: 0,
              marginTop: '0.5rem',
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              overflow: 'hidden',
              zIndex: 1000
            }}
          >
            <div style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: 'rgba(255, 255, 255, 0.7)'
            }}>
              <Brain size={14} />
              Sugestões da AI
            </div>
            
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ 
                  background: 'rgba(255, 255, 255, 0.1)',
                  x: 4
                }}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: '1rem',
                  cursor: 'pointer',
                  borderBottom: index < suggestions.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem'
                  }}>
                    {getIntentIcon(suggestion.type)}
                    <span style={{
                      color: 'white',
                      fontWeight: '500',
                      fontSize: '0.9rem'
                    }}>
                      {getIntentText(suggestion.type)} {suggestion.route.label}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255, 255, 255, 0.6)'
                  }}>
                    {suggestion.route.description}
                  </div>
                </div>
                
                <div style={{
                  padding: '0.5rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.1)'
                }}>
                  <Send size={14} style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                </div>
              </motion.div>
            ))}
            
            <div style={{
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.5)',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.05)'
            }}>
              <Command size={12} style={{ marginRight: '0.25rem' }} />
              Pressione Enter para navegar
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Navigation Component (existing)
const NavigationPanel = ({ isOpen, onClose, currentPath, userProfile }) => {
  const navigate = useNavigate();

  const menuItems = [
    { path: "/", icon: Home, label: "Dashboard", category: "main" },
    { path: "/clientprofitability", icon: DollarSign, label: "Rentabilidade", category: "analytics" },
    { path: "/tasks", icon: CheckSquare, label: "Tarefas", category: "main" },
    { path: "/timeentry", icon: Clock, label: "Registo de Tempos", category: "main" },
    { path: "/clients", icon: Users, label: "Clientes", category: "main" },
    { path: "/organization", icon: Briefcase, label: "Organização", category: "settings" },
    { path: "/workflow-management", icon: Settings, label: "Gerir Workflows", category: "advanced" },
    { path: "/profile", icon: UserIconLucide, label: "Perfil", category: "main" }
  ];

  const handleMenuClick = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 998
            }}
          />

          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              width: '320px',
              background: 'rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.2)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              color: 'white'
            }}
          >
            <div style={{
              padding: '2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <motion.div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(147, 51, 234, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '1.2rem'
                  }}>
                    T
                  </div>
                  <span style={{
                    fontSize: '1.5rem',
                    fontWeight: '700'
                  }}>
                    TarefAi
                  </span>
                </motion.div>

                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '8px'
                  }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(147, 51, 234, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  marginRight: '1rem'
                }}>
                  {userProfile?.username?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {userProfile?.username || 'Utilizador'}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}>
                    {userProfile?.organization_name || 'Organização'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="navigation-menu-scrollable" style={{
              flex: 1,
              padding: '1rem 0',
              overflowX: 'hidden',
              overflowY: 'auto'
              
            }}>
              {menuItems.map((item, index) => {
                const IconComponent = item.icon;
                const isActive = currentPath === item.path;

                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <motion.button
                      onClick={() => handleMenuClick(item.path)}
                      whileHover={{ scale: 1.02, x: 8 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '1rem 2rem',
                        background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                        border: 'none',
                        color: 'white',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        borderRadius: '0 24px 24px 0',
                        margin: '0.25rem 0',
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{
                        marginRight: '1rem',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'
                      }}>
                        <IconComponent size={18} />
                      </div>
                      {item.label}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>

            <div style={{
              padding: '2rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'white',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
              >
                <LogOut size={18} style={{ marginRight: '0.75rem' }} />
                Terminar Sessão
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Notifications Dropdown Component
const NotificationsDropdown = ({
  isOpen,
  onClose,
  notifications,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigate
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const getNotificationIcon = (type, priority) => {
    const iconMap = {
      step_ready: PlayCircle,
      step_completed: CheckSquare,
      approval_needed: HelpCircle,
      approval_completed: Check,
      workflow_completed: Sparkles,
      deadline_approaching: Clock,
      step_overdue: AlertTriangle,
      manual_reminder: Bell,
      workflow_assigned: GitPullRequest,
      step_rejected: X,
      default: Bell,
    };
    const Icon = iconMap[type] || iconMap.default;
    let color = "rgba(255, 255, 255, 0.7)";
    if (priority === 'urgent') color = 'rgb(239, 68, 68)';
    else if (priority === 'high') color = 'rgb(251, 146, 60)';
    else if (type === 'step_completed' || type === 'workflow_completed') color = 'rgb(52, 211, 153)';
    return <Icon size={18} style={{ color, marginRight: '0.75rem', flexShrink: 0 }} />;
  };
  
  const timeSince = (dateString) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "a";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "min";
    return Math.floor(seconds) + "s";
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.5rem)',
            right: 0,
            width: '360px',
            background: 'rgba(20, 20, 30, 0.9)',
            backdropFilter: 'blur(15px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            zIndex: 1001,
            color: 'white',
            overflow: 'hidden'
          }}
        >
          <div style={{
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Notificações</h3>
            {notifications && notifications.length > 0 && (
              <motion.button
                onClick={onMarkAllAsRead}
                whileHover={{ color: 'rgb(59, 130, 246)'}}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}
              >
                Marcar todas como lidas
              </motion.button>
            )}
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="notification-list-scrollable">
            {isLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map(notif => (
                <motion.div
                  key={notif.id}
                  onClick={() => {
                    onMarkAsRead(notif.id);
                    if (notif.task) onNavigate(`/tasks?taskId=${notif.task}`); // Or specific task view
                    onClose();
                  }}
                  whileHover={{ background: 'rgba(255, 255, 255, 0.1)' }}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    position: 'relative'
                  }}
                >
                  {!notif.is_read && (
                    <motion.div 
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', 
                        background: 'rgb(59, 130, 246)', 
                        position: 'absolute', left: '0.5rem', top: 'calc(50% - 4px)'
                      }}
                    />
                  )}
                  {getNotificationIcon(notif.notification_type, notif.priority)}
                  <div style={{ flex: 1, paddingLeft: !notif.is_read ? '0.5rem' : '0' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.25rem'
                    }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem', color: notif.is_read ? 'rgba(255,255,255,0.7)' : 'white' }}>
                        {notif.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {timeSince(notif.created_at)}
                      </span>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: notif.is_read ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {notif.message}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                <PackageOpen size={32} style={{ marginBottom: '0.5rem' }} />
                <p>Nenhuma notificação nova.</p>
              </div>
            )}
          </div>

          <Link
            to="/notifications" // Future page for all notifications
            onClick={onClose}
            style={{
              display: 'block',
              padding: '1rem',
              textAlign: 'center',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'rgb(59, 130, 246)',
              textDecoration: 'none',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255,255,255,0.05)'
            }}
          >
            Ver todas as notificações
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


// Main Layout Component
const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [navOpen, setNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profileData = await fetchDashboardData();
        if (profileData && profileData.length > 0) {
          setUserProfile(profileData[0]);
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
      }
    };

    loadUserProfile();
  }, []);

  const toggleNav = () => setNavOpen(!navOpen);

  const handleAINavigation = (path) => {
    navigate(path);
    setNavOpen(false);
  };

  // Fetch unread notification count
  const { data: unreadData, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['unreadNotificationCount'],
    queryFn: () => api.get('/workflow-notifications/unread_count/').then(res => res.data),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
  const unreadCount = unreadData?.unread_count || 0;

  // Fetch notifications list for dropdown
  const { data: notificationList, isLoading: isLoadingNotifications, refetch: refetchNotificationList } = useQuery({
    queryKey: ['notificationList'],
    queryFn: () => api.get('/workflow-notifications/?limit=7&ordering=-created_at&is_archived=false').then(res => res.data.results || res.data), // Ensure results is an array
    enabled: notificationsOpen,
    staleTime: 30 * 1000, // 30 seconds
  });
  
  // Mutations for notifications
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => api.post(`/workflow-notifications/${notificationId}/mark_as_read/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      queryClient.invalidateQueries({ queryKey: ['notificationList'] });
    },
    onError: (error) => toast.error("Falha ao marcar como lida: " + (error.response?.data?.detail || error.message)),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.post('/workflow-notifications/mark_all_as_read/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
      queryClient.invalidateQueries({ queryKey: ['notificationList'] });
      toast.success("Todas as notificações marcadas como lidas.");
    },
    onError: (error) => toast.error("Falha ao marcar todas como lidas: " + (error.response?.data?.detail || error.message)),
  });

  useEffect(() => {
    if (notificationsOpen) {
      refetchNotificationList();
    }
  }, [notificationsOpen, refetchNotificationList]);


  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <BackgroundElements businessStatus="optimal" />

      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'white'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <motion.button
            onClick={toggleNav}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Menu size={20} />
          </motion.button>
          <AISearchBar onNavigate={handleAINavigation} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <motion.button
              onClick={() => setNotificationsOpen(prev => !prev)}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '0.75rem',
                color: 'white',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </motion.button>
            <NotificationsDropdown
              isOpen={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
              notifications={notificationList}
              isLoading={isLoadingNotifications}
              onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
              onMarkAllAsRead={() => markAllAsReadMutation.mutate()}
              onNavigate={handleAINavigation}
            />
          </div>
        </div>
      </motion.header>

      <NavigationPanel
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
        currentPath={location.pathname}
        userProfile={userProfile}
      />

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: 'calc(100vh - 80px)' // Adjusted for header height
        }}
      >
        <Outlet />
      </motion.main>
    </div>
  );
};

export default Layout;
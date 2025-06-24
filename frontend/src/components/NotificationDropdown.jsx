// src/components/NotificationDropdown.jsx (Corrected and Improved)

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Import useQuery
import { 
  Bell, CheckCircle, Clock, AlertTriangle, Sparkles, X, Eye,
  ChevronRight, PlayCircle, HelpCircle, GitPullRequest, Loader2, FileText
} from 'lucide-react';
import api from '../api'; // Your api instance

const NotificationDropdown = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // Get query client instance

  // --- Contador de notificações não lidas ---
  // Este já estava a funcionar corretamente com polling em segundo plano.
  const { data: unreadData } = useQuery({
    queryKey: ['unreadNotificationCount'],
    queryFn: async () => {
      const response = await api.get('/workflow-notifications/unread_count/');
      return response.data;
    },
    refetchInterval: 30000, // Continua a atualizar o contador a cada 30s
    refetchOnWindowFocus: true,
    staleTime: 15000,
  });
  
  const unreadCount = unreadData?.unread_count || 0;

  // --- LISTA DE NOTIFICAÇÕES (LÓGICA ALTERADA) ---
  // A consulta agora corre em segundo plano, independentemente do dropdown estar aberto.
  const { data: notifications = [], isLoading: isLoadingList } = useQuery({
    queryKey: ['notificationList'],
    queryFn: async () => {
      const response = await api.get('/workflow-notifications/', {
        params: { limit: 7, is_archived: false }
      });
      return response.data.results || response.data || [];
    },
    // <-- ALTERAÇÃO PRINCIPAL: `enabled` foi removido (ou é `true` por defeito).
    // A consulta agora corre assim que o componente é montado.
    refetchInterval: 120000, // Atualiza a lista em segundo plano a cada 2 minutos.
    refetchOnWindowFocus: true, // Atualiza quando o utilizador volta ao separador.
    staleTime: 60000, // Considera os dados "frescos" por 1 minuto para evitar re-fetches desnecessários.
  });

  // Mutações para interagir com as notificações
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => api.post(`/workflow-notifications/${notificationId}/mark_as_read/`),
    onSuccess: () => {
      // Invalida ambas as queries para obter dados frescos imediatamente após a ação.
      queryClient.invalidateQueries({ queryKey: ['notificationList'] });
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
    },
  });

  // Efeito para fechar o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const markAsReadAndNavigate = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    // Lógica de navegação
    if (notification.notification_type === 'report_generated' && notification.metadata?.report_id) {
      navigate(`/reports?highlight=${notification.metadata.report_id}`);
    } else if (notification.task) {
      navigate(`/tasks?openTask=${notification.task}`);
    } else {
      onNavigate('/notifications');
    }
    setIsOpen(false);
  };
  
  const getNotificationIcon = (type, priority) => {
    const iconMap = {
      step_ready: PlayCircle,
      step_completed: CheckCircle,
      approval_needed: HelpCircle,
      approval_completed: CheckCircle,
      workflow_completed: Sparkles,
      deadline_approaching: Clock,
      step_overdue: AlertTriangle,
      manual_reminder: Bell,
      workflow_assigned: GitPullRequest,
      step_rejected: X,
      manual_advance_needed: HelpCircle,
      report_generated: FileText,
      task_assigned_to_you: Bell,
    };
    const Icon = iconMap[type] || Bell;
    let color = "rgba(255, 255, 255, 0.7)";
    if (priority === 'urgent') color = 'rgb(239, 68, 68)';
    else if (priority === 'high') color = 'rgb(251, 146, 60)';
    else if (type === 'step_completed' || type === 'workflow_completed' || type === 'approval_completed') color = 'rgb(52, 211, 153)';
    else if (type === 'report_generated') color = 'rgb(59, 130, 246)';
    return <Icon size={16} style={{ color }} />;
  };

  const timeSince = (dateString) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " anos";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " dias";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min";
    return "agora";
  };
  
  const handleViewAll = () => {
    setIsOpen(false);
    onNavigate('/notifications');
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: 'relative',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white'
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              background: 'rgb(239, 68, 68)',
              color: 'white',
              borderRadius: '50%',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: '600',
              padding: '0 3px'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </motion.button>
      
      <AnimatePresence>
        {isOpen && (
           <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
              width: '400px', maxHeight: '500px', background: 'rgba(20, 20, 30, 0.95)',
              backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', zIndex: 1003, overflow: 'hidden',
              display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'white' }}>Notificações</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Todas lidas'}
                </p>
              </div>
              <motion.button onClick={handleViewAll} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '0.5rem 1rem', color: 'rgb(59, 130, 246)', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Ver todas <ChevronRight size={14} />
              </motion.button>
            </div>
            
            <div style={{ flexGrow: 1, maxHeight: 'calc(500px - 100px)', overflowY: 'auto' }} className="custom-scrollbar-dropdown">
              {isLoadingList && notifications.length === 0 ? (
                <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  <Loader2 size={24} className="animate-spin" />
                  <span>A carregar...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                  <Bell size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>Nenhuma notificação recente</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    onClick={() => markAsReadAndNavigate(notification)}
                    style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', cursor: 'pointer', position: 'relative', background: notification.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)' }}
                  >
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ marginTop: '0.25rem', flexShrink: 0 }}>{getNotificationIcon(notification.notification_type, notification.priority)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: notification.is_read ? 'rgba(255, 255, 255, 0.7)' : 'white', lineHeight: 1.3 }}>{notification.title}</h4>
                              {notification.priority === 'urgent' && (<span style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'rgb(239, 68, 68)', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.625rem', fontWeight: '600', textTransform: 'uppercase', flexShrink: 0, marginLeft: '0.5rem' }}>URGENTE</span>)}
                          </div>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: notification.is_read ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.8)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{notification.message}</p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              {(notification.task_title || notification.metadata?.report_name) && (<span style={{ fontSize: '0.625rem', color: 'rgba(255, 255, 255, 0.5)', background: 'rgba(255, 255, 255, 0.05)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
                                  {notification.notification_type === 'report_generated' ? `Relatório: ${notification.metadata?.report_name || notification.title}` : `${notification.task_client_name || 'Tarefa'}: ${notification.task_title}`}
                              </span>)}
                              <span style={{ fontSize: '0.625rem', color: 'rgba(255, 255, 255, 0.5)' }}>{timeSince(notification.created_at)}</span>
                          </div>
                      </div>
                      {!notification.is_read && (<div style={{ width: '6px', height: '6px', background: 'rgb(59, 130, 246)', borderRadius: '50%', marginTop: '0.5rem', flexShrink: 0 }} />)}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style jsx global>{`
        .custom-scrollbar-dropdown::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar-dropdown::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar-dropdown::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar-dropdown::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NotificationDropdown;
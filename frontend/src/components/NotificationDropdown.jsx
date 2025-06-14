import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  X,
  Eye,
  ChevronRight,
  PlayCircle,
  HelpCircle,
  GitPullRequest,
  Loader2
} from 'lucide-react';


const NotificationDropdown = ({ onNavigate, api }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      
      // Fetch recent notifications (limit to 5 for dropdown)
      const notificationsResponse = await api.get('/workflow-notifications/', {
        params: {
          limit: 5,
          is_archived: false
        }
      });
      
      // Fetch unread count
      const unreadResponse = await api.get('/workflow-notifications/unread_count/');
      
      setNotifications(notificationsResponse.data.results || notificationsResponse.data || []);
      setUnreadCount(unreadResponse.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fetch notifications when component mounts or dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Initial fetch for unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get('/workflow-notifications/unread_count/');
        setUnreadCount(response.data.unread_count || 0);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };
    
    fetchUnreadCount();
    
    // Set up polling for unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get notification icon based on type
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
    };

    const Icon = iconMap[type] || Bell;
    let color = "rgba(255, 255, 255, 0.7)";

    if (priority === 'urgent') color = 'rgb(239, 68, 68)';
    else if (priority === 'high') color = 'rgb(251, 146, 60)';
    else if (type === 'step_completed' || type === 'workflow_completed') color = 'rgb(52, 211, 153)';

    return <Icon size={16} style={{ color }} />;
  };

  // Time since helper
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

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/workflow-notifications/${notificationId}/mark_as_read/`);
      
      // Update local state
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId ? { ...notif, is_read: true } : notif
      ));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle viewing all notifications
  const handleViewAll = () => {
    setIsOpen(false);
    onNavigate('/notifications');
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Notification Bell Button */}
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
        
        {/* Unread Count Badge */}
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
              fontWeight: '600'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              width: '400px',
              maxHeight: '500px',
              background: 'rgba(20, 20, 30, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              zIndex: 1003,
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: 'white'
                }}>
                  Notificações
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Todas lidas'}
                </p>
              </div>
              
              <motion.button
                onClick={handleViewAll}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '0.5rem 1rem',
                  color: 'rgb(59, 130, 246)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                Ver todas
                <ChevronRight size={14} />
              </motion.button>
            </div>

            {/* Notifications List */}
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {isLoading ? (
                <div style={{
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Carregando notificações...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  <Bell size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>Nenhuma notificação recente</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                    style={{
                      padding: '1rem 1.5rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: notification.is_read ? 'default' : 'pointer',
                      position: 'relative',
                      background: notification.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {/* Icon */}
                      <div style={{
                        marginTop: '0.25rem',
                        flexShrink: 0
                      }}>
                        {getNotificationIcon(notification.notification_type, notification.priority)}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: '0.25rem'
                        }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: notification.is_read ? 'rgba(255, 255, 255, 0.7)' : 'white',
                            lineHeight: 1.3
                          }}>
                            {notification.title}
                          </h4>
                          
                          {notification.priority === 'urgent' && (
                            <span style={{
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: 'rgb(239, 68, 68)',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px',
                              fontSize: '0.625rem',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              flexShrink: 0,
                              marginLeft: '0.5rem'
                            }}>
                              Urgente
                            </span>
                          )}
                        </div>

                        <p style={{
                          margin: '0 0 0.5rem 0',
                          fontSize: '0.75rem',
                          color: notification.is_read ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {notification.message}
                        </p>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          {notification.task_title && (
                            <span style={{
                              fontSize: '0.625rem',
                              color: 'rgba(255, 255, 255, 0.5)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '4px'
                            }}>
                              {notification.task_client_name}: {notification.task_title}
                            </span>
                          )}
                          
                          <span style={{
                            fontSize: '0.625rem',
                            color: 'rgba(255, 255, 255, 0.5)'
                          }}>
                            {timeSince(notification.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div style={{
                          width: '6px',
                          height: '6px',
                          background: 'rgb(59, 130, 246)',
                          borderRadius: '50%',
                          marginTop: '0.5rem',
                          flexShrink: 0
                        }} />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center'
              }}>
                <motion.button
                  onClick={handleViewAll}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgb(59, 130, 246)',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    padding: '0.5rem 1rem'
                  }}
                >
                  Ver todas as notificações
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
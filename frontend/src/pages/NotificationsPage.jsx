import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Bell,
    Check,
    CheckCircle,
    Archive,
    Filter,
    Search,
    ChevronDown,
    Loader2,
    AlertTriangle,
    Clock,
    GitPullRequest,
    Sparkles,
    X,
    PlayCircle,
    HelpCircle,
    Trash2,
    MoreVertical,
    Eye,
    EyeOff
} from 'lucide-react';
import api from "../api";
import { toast } from 'react-toastify';

const NotificationsPage = () => {
    const [filters, setFilters] = useState({
        isRead: null, // null = all, true = read, false = unread
        type: '',
        priority: '',
        isArchived: false
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNotifications, setSelectedNotifications] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, priority

    const queryClient = useQueryClient();

    // Fetch notifications with filters
    const { data: notifications = [], isLoading, refetch } = useQuery({
        queryKey: ['notifications', filters, searchQuery, sortBy],
        queryFn: async () => {
            const params = new URLSearchParams();

            if (filters.isRead !== null) params.append('is_read', filters.isRead);
            if (filters.type) params.append('type', filters.type);
            if (filters.priority) params.append('priority', filters.priority);
            params.append('is_archived', filters.isArchived);

            let ordering = '-created_at'; // default newest first
            if (sortBy === 'oldest') ordering = 'created_at';
            else if (sortBy === 'priority') ordering = 'priority,-created_at';
            params.append('ordering', ordering);

            const response = await api.get(`/workflow-notifications/?${params.toString()}`);
            return response.data.results || response.data;
        },
        staleTime: 30 * 1000,
    });

    // Filter notifications by search query
    const filteredNotifications = notifications.filter(notif =>
        notif.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notif.task_title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: (notificationId) => api.post(`/workflow-notifications/${notificationId}/mark_as_read/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
        },
    });

    // Mark as unread mutation
    const markAsUnreadMutation = useMutation({
        mutationFn: (notificationId) => api.post(`/workflow-notifications/${notificationId}/mark_as_unread/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
        },
    });

    // Archive mutation
    const archiveMutation = useMutation({
        mutationFn: (notificationId) => api.post(`/workflow-notifications/${notificationId}/archive/`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Notificação arquivada');
        },
    });

    // Bulk mark all as read
    const markAllAsReadMutation = useMutation({
        mutationFn: () => api.post('/workflow-notifications/mark_all_as_read/'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] });
            toast.success('Todas as notificações marcadas como lidas');
        },
    });

    // Bulk actions
    const handleBulkAction = (action) => {
        selectedNotifications.forEach(id => {
            if (action === 'markRead') markAsReadMutation.mutate(id);
            else if (action === 'markUnread') markAsUnreadMutation.mutate(id);
            else if (action === 'archive') archiveMutation.mutate(id);
        });
        setSelectedNotifications([]);
    };

    // Get notification icon
    const getNotificationIcon = (type, priority) => {
        const iconMap = {
            step_ready: PlayCircle,
            step_completed: CheckCircle,
            approval_needed: HelpCircle,
            approval_completed: Check,
            workflow_completed: Sparkles,
            deadline_approaching: Clock,
            step_overdue: AlertTriangle,
            manual_reminder: Bell,
            workflow_assigned: GitPullRequest,
            step_rejected: X,
        };

        const Icon = iconMap[type] || Bell;
        let color = "rgba(255, 255, 255, 0.7)";

        if (priority === 'urgent') color = 'rgb(239, 68, 68)';
        else if (priority === 'high') color = 'rgb(251, 146, 60)';
        else if (type === 'step_completed' || type === 'workflow_completed') color = 'rgb(52, 211, 153)';

        return <Icon size={20} style={{ color }} />;
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

    const pageVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            style={{
                minHeight: '100vh',
                padding: '2rem',
                color: 'white',
                position: 'relative'
            }}
        >
            {/* Background elements */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgb(19, 41, 77) 0%, rgb(18, 7, 29) 50%, rgb(3, 53, 61) 100%)',
                zIndex: -1
            }} />

            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: '2rem' }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                                padding: '1rem',
                                background: 'rgba(59, 130, 246, 0.2)',
                                borderRadius: '16px',
                                border: '1px solid rgba(59, 130, 246, 0.3)'
                            }}>
                                <Bell size={24} style={{ color: 'rgb(59, 130, 246)' }} />
                            </div>
                            <div>
                                <h1 style={{
                                    fontSize: '2rem',
                                    fontWeight: '700',
                                    margin: 0,
                                    background: 'linear-gradient(135deg, white, rgb(191, 219, 254))',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    Notificações
                                </h1>
                                <p style={{
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    margin: 0,
                                    fontSize: '1rem'
                                }}>
                                    Gerir todas as suas notificações
                                </p>
                            </div>
                        </div>

                        <motion.button
                            onClick={() => markAllAsReadMutation.mutate()}
                            disabled={markAllAsReadMutation.isPending}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: 'rgba(52, 211, 153, 0.2)',
                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                borderRadius: '12px',
                                color: 'rgb(52, 211, 153)',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {markAllAsReadMutation.isPending ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Check size={16} />
                            )}
                            Marcar todas como lidas
                        </motion.button>
                    </div>

                    {/* Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Total</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{notifications.length}</div>
                        </div>
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(59, 130, 246, 0.2)'
                        }}>
                            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Não lidas</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'rgb(59, 130, 246)' }}>
                                {notifications.filter(n => !n.is_read).length}
                            </div>
                        </div>
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>Urgentes</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'rgb(239, 68, 68)' }}>
                                {notifications.filter(n => n.priority === 'urgent').length}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Controls */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        marginBottom: '1.5rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                >
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto',
                        gap: '1rem',
                        alignItems: 'center'
                    }}>
                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search
                                size={20}
                                style={{
                                    position: 'absolute',
                                    left: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'rgba(255, 255, 255, 0.5)'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Pesquisar notificações..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 3rem',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                padding: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '0.875rem'
                            }}
                        >
                            <option value="newest">Mais recentes</option>
                            <option value="oldest">Mais antigas</option>
                            <option value="priority">Por prioridade</option>
                        </select>

                        {/* Filters Toggle */}
                        <motion.button
                            onClick={() => setShowFilters(!showFilters)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                padding: '0.75rem 1rem',
                                background: showFilters ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                border: `1px solid ${showFilters ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.2)'}`,
                                borderRadius: '12px',
                                color: showFilters ? 'rgb(59, 130, 246)' : 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Filter size={16} />
                            Filtros
                            <ChevronDown
                                size={16}
                                style={{
                                    transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }}
                            />
                        </motion.button>
                    </div>

                    {/* Filters Panel */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{
                                    overflow: 'hidden',
                                    marginTop: '1rem',
                                    paddingTop: '1rem',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            >
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '1rem'
                                }}>
                                    <div>
                                        <label style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                                            Estado
                                        </label>
                                        <select
                                            value={filters.isRead === null ? 'all' : filters.isRead ? 'read' : 'unread'}
                                            onChange={(e) => setFilters(prev => ({
                                                ...prev,
                                                isRead: e.target.value === 'all' ? null : e.target.value === 'read'
                                            }))}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            <option value="all">Todas</option>
                                            <option value="unread">Não lidas</option>
                                            <option value="read">Lidas</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                                            Tipo
                                        </label>
                                        <select
                                            value={filters.type}
                                            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            <option value="">Todos os tipos</option>
                                            <option value="step_ready">Passo pronto</option>
                                            <option value="approval_needed">Aprovação necessária</option>
                                            <option value="step_overdue">Passo atrasado</option>
                                            <option value="workflow_completed">Workflow concluído</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.5rem', display: 'block' }}>
                                            Prioridade
                                        </label>
                                        <select
                                            value={filters.priority}
                                            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                borderRadius: '8px',
                                                color: 'white',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            <option value="">Todas as prioridades</option>
                                            <option value="urgent">Urgente</option>
                                            <option value="high">Alta</option>
                                            <option value="normal">Normal</option>
                                        </select>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Bulk Actions */}
                {selectedNotifications.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: '12px',
                            padding: '1rem',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                    >
                        <span style={{ color: 'rgb(59, 130, 246)', fontWeight: '500' }}>
                            {selectedNotifications.length} notificação(ões) selecionada(s)
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => handleBulkAction('markRead')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(52, 211, 153, 0.2)',
                                    border: '1px solid rgba(52, 211, 153, 0.3)',
                                    borderRadius: '8px',
                                    color: 'rgb(52, 211, 153)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                Marcar como lidas
                            </button>
                            <button
                                onClick={() => handleBulkAction('archive')}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(251, 146, 60, 0.2)',
                                    border: '1px solid rgba(251, 146, 60, 0.3)',
                                    borderRadius: '8px',
                                    color: 'rgb(251, 146, 60)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                Arquivar
                            </button>
                            <button
                                onClick={() => setSelectedNotifications([])}
                                style={{
                                    padding: '0.5rem',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    color: 'rgb(239, 68, 68)',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Notifications List */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.2 } }}
                >
                    {isLoading ? (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '3rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px'
                        }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59, 130, 246)' }} />
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '16px',
                            color: 'rgba(255, 255, 255, 0.6)'
                        }}>
                            <Bell size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <h3 style={{ margin: '0 0 0.5rem 0' }}>Nenhuma notificação encontrada</h3>
                            <p style={{ margin: 0 }}>
                                {searchQuery ? 'Tente ajustar os filtros de pesquisa' : 'Não há notificações para mostrar'}
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {filteredNotifications.map((notification, index) => (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 } }}
                                    whileHover={{ scale: 1.02 }}
                                    style={{
                                        background: notification.is_read
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'rgba(255, 255, 255, 0.1)',
                                        border: `1px solid ${notification.is_read
                                            ? 'rgba(255, 255, 255, 0.1)'
                                            : 'rgba(59, 130, 246, 0.3)'}`,
                                        borderRadius: '12px',
                                        padding: '1rem',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                    onClick={() => !notification.is_read && markAsReadMutation.mutate(notification.id)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                        {/* Selection checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={selectedNotifications.includes(notification.id)}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                setSelectedNotifications(prev =>
                                                    e.target.checked
                                                        ? [...prev, notification.id]
                                                        : prev.filter(id => id !== notification.id)
                                                );
                                            }}
                                            style={{
                                                marginTop: '0.25rem',
                                                cursor: 'pointer'
                                            }}
                                        />

                                        {/* Icon */}
                                        <div style={{
                                            padding: '0.5rem',
                                            background: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '8px',
                                            flexShrink: 0,
                                            marginTop: '0.25rem'
                                        }}>
                                            {getNotificationIcon(notification.notification_type, notification.priority)}
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                marginBottom: '0.5rem'
                                            }}>
                                                <h4 style={{
                                                    margin: 0,
                                                    fontWeight: '600',
                                                    color: notification.is_read ? 'rgba(255, 255, 255, 0.7)' : 'white',
                                                    fontSize: '0.95rem'
                                                }}>
                                                    {notification.title}
                                                </h4>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {notification.priority === 'urgent' && (
                                                        <span style={{
                                                            background: 'rgba(239, 68, 68, 0.2)',
                                                            color: 'rgb(239, 68, 68)',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '12px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '500'
                                                        }}>
                                                            URGENTE
                                                        </span>
                                                    )}
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: 'rgba(255, 255, 255, 0.5)'
                                                    }}>
                                                        {timeSince(notification.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            <p style={{
                                                margin: '0 0 0.5rem 0',
                                                color: notification.is_read ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                                                fontSize: '0.875rem',
                                                lineHeight: 1.4
                                            }}>
                                                {notification.message}
                                            </p>

                                            {notification.task_title && (
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: 'rgba(255, 255, 255, 0.6)',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '6px',
                                                    display: 'inline-block'
                                                }}>
                                                    Tarefa: {notification.task_title}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <motion.button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    notification.is_read
                                                        ? markAsUnreadMutation.mutate(notification.id)
                                                        : markAsReadMutation.mutate(notification.id);
                                                }}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                style={{
                                                    padding: '0.25rem',
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: 'rgba(255, 255, 255, 0.7)'
                                                }}
                                                title={notification.is_read ? 'Marcar como não lida' : 'Marcar como lida'}
                                            >
                                                {notification.is_read ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </motion.button>

                                            <motion.button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    archiveMutation.mutate(notification.id);
                                                }}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                style={{
                                                    padding: '0.25rem',
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: 'rgba(255, 255, 255, 0.7)'
                                                }}
                                                title="Arquivar notificação"
                                            >
                                                <Archive size={14} />
                                            </motion.button>
                                        </div>

                                        {/* Unread indicator */}
                                        {!notification.is_read && (
                                            <div style={{
                                                position: 'absolute',
                                                left: '0.5rem',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: '4px',
                                                height: '24px',
                                                background: 'rgb(59, 130, 246)',
                                                borderRadius: '2px'
                                            }} />
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Load More / Pagination */}
                {filteredNotifications.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: 0.3 } }}
                        style={{
                            textAlign: 'center',
                            marginTop: '2rem'
                        }}
                    >
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                padding: '0.75rem 2rem',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                            onClick={() => refetch()}
                        >
                            Recarregar notificações
                        </motion.button>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default NotificationsPage;
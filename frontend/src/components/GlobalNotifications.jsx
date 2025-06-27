import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle as CheckCircleIcon,
  XCircle,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { useTaskStore } from '../stores/useTaskStore'; // Using the existing store
import { forwardRef } from 'react'; // <-- Import forwardRef

// Re-usable style for the notification cards
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px',
  color: 'white',
};

// The individual notification item
const NotificationItem = forwardRef(({ notification, onRemove }, ref) => { // <-- Receive `ref` as the second argument
  const icons = {
    success: <CheckCircleIcon />,
    error: <XCircle />,
    warning: <AlertTriangle />,
    info: <Info />
  };

  const colors = {
    success: 'rgb(52, 211, 153)',
    error: 'rgb(239, 68, 68)',
    warning: 'rgb(251, 191, 36)',
    info: 'rgb(59, 130, 246)'
  };

  const icon = icons[notification.type] || <Info />;
  const color = colors[notification.type] || colors.info;

  return (
    <motion.div
      ref={ref} // <-- ATTACH THE FORWARDED REF HERE
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      whileHover={{ scale: 1.03 }}
      layout
      style={{
        ...glassStyle,
        background: `${color}20`,
        border: `1px solid ${color}30`,
        padding: '1rem',
        marginBottom: '0.75rem',
        width: '100%',
        maxWidth: '400px',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ marginTop: '0.125rem', color: color }}>
          {React.cloneElement(icon, { size: 20 })}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontWeight: '600', color: 'white', margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>
            {notification.title}
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)', margin: 0, lineHeight: '1.4' }}>
            {notification.message}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onRemove(notification.id)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
});

// The container that will be placed globally
const GlobalNotifications = () => {
  const { notifications, removeNotification } = useTaskStore();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 99999, // Ensure it's on top of everything
        pointerEvents: 'none' // Clicks pass through the container itself
      }}
    >
      <AnimatePresence mode="popLayout">
        {notifications.map(n => (
          <NotificationItem
            key={n.id}
            notification={n}
            onRemove={removeNotification}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default GlobalNotifications;
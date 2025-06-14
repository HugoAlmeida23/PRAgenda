// src/components/timeentry/TimeEntryCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Copy, Trash2, Activity } from 'lucide-react'; // User is not typically displayed per entry card
import { useTimeEntryStore } from '../../stores/useTimeEntryStore'; // Not directly used here but kept for consistency if needed later

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

const TimeEntryCard = ({ entry, onDelete, onDuplicate, permissions, formatMinutes }) => {
    // Determine color based on client or a default
    const clientColor = entry.client_color || 'rgb(59, 130, 246)'; // Default blue if no client_color

    return (
        <motion.div
            variants={itemVariants} // Use variants passed from parent or define locally
            style={{
                ...glassStyle,
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                opacity: entry.is_billed ? 0.7 : 1, // Example: Dim if billed
                borderLeft: `4px solid ${clientColor}`,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
                    <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>{entry.date}</span>
                </div>
                <span style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: '600', borderRadius: '9999px', background: `${clientColor}33`, color: clientColor }}>
                    {formatMinutes(entry.minutes_spent)}
                </span>
            </div>
            <h3 style={{ fontWeight: '600', fontSize: '1rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.client_name || "Cliente não especificado"}
            </h3>
            {entry.task_title && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                    <Activity size={14} />
                    <span>{entry.task_title}</span>
                </div>
            )}
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)', margin: 0, flexGrow: 1, maxHeight: '3.9em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                {entry.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                    {entry.start_time && entry.end_time ? `${entry.start_time.substring(0, 5)} - ${entry.end_time.substring(0, 5)}` : "Sem horário"}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDuplicate(entry)} title="Duplicar" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '0.5rem', color: 'white', cursor: 'pointer' }}>
                        <Copy size={16} />
                    </motion.button>
                    {(permissions.isOrgAdmin || permissions.canEditAllTime || (permissions.canEditOwnTime && entry.user === permissions.userId)) && (
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDelete(entry.id)} title="Excluir" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(239,68,68)', cursor: 'pointer' }}>
                            <Trash2 size={16} />
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default TimeEntryCard;
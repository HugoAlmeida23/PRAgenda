// src/components/task/TaskStats.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Target, AlertTriangle, Activity, CheckCircle, Clock } from 'lucide-react'; // Added Clock

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

const TaskStats = ({ tasks, isOverdue }) => {
    const totalTasks = tasks.length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => isOverdue(t.deadline) && t.status !== 'completed').length;

    const stats = [
        { label: "Total de Tarefas", value: totalTasks, icon: Activity, color: 'rgb(59, 130, 246)' },
        { label: "Pendentes", value: pendingTasks, icon: Clock, color: 'rgb(251, 191, 36)' },
        { label: "Em Progresso", value: inProgressTasks, icon: Target, color: 'rgb(59, 130, 246)' }, // Changed icon for variety
        { label: "Concluídas", value: completedTasks, icon: CheckCircle, color: 'rgb(52, 211, 153)' },
        { label: "Atrasadas", value: overdueTasks, icon: AlertTriangle, color: 'rgb(239, 68, 68)' },
    ];

    return (
        <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}
        >
            {stats.map((stat, index) => (
                <motion.div
                    key={index}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02, y: -5 }}
                    style={{
                        ...glassStyle,
                        padding: '1.5rem',
                        textAlign: 'center',
                        background: `rgba(${stat.color.replace('rgb(', '').replace(')', '')}, 0.1)`,
                        border: `1px solid rgba(${stat.color.replace('rgb(', '').replace(')', '')}, 0.2)`
                    }}
                >
                    <stat.icon size={24} style={{ color: stat.color, marginBottom: '0.75rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: stat.color, marginBottom: '0.5rem' }}>
                        {stat.value}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                        {stat.label}
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
};

export default TaskStats;
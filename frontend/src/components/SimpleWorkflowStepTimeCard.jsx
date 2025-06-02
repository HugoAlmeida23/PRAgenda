// SimpleWorkflowStepTimeCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Timer, User2 } from 'lucide-react';

const glassStyle = { /* ... seu glassStyle ... */ };
const stepCardVariants = { /* ... seus stepCardVariants ... */ };

const SimpleWorkflowStepTimeCard = ({ step, timeSpent }) => {
  const formatTime = (minutes) => {
    if (minutes === null || minutes === undefined || minutes === 0) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const isActive = step.is_current; // Ainda pode usar para estilização se quiser

  return (
    <motion.div
      variants={stepCardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      style={{
        ...glassStyle,
        padding: '1.5rem',
        background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        textAlign: 'center',
        border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)'
      }}
    >
      <div style={{
        fontSize: '2rem',
        fontWeight: '700',
        color: isActive ? 'rgb(59, 130, 246)' : 'rgb(147, 51, 234)', // ou outra cor
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
      }}>
        <Timer size={24} />
        {formatTime(timeSpent)}
      </div>
      <div style={{
        fontSize: '0.875rem',
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500'
      }}>
        {step.order}. {step.name}
      </div>
      {step.assign_to_name && (
        <div style={{
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.6)',
          marginTop: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.25rem'
        }}>
          <User2 size={12} />
          {step.assign_to_name}
        </div>
      )}
    </motion.div>
  );
};

export default SimpleWorkflowStepTimeCard;
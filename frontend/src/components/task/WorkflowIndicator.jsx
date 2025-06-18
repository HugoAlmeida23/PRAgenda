// src/components/task/WorkflowIndicator.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Network, Eye as EyeIcon, CheckCircle2 } from 'lucide-react';

const WorkflowIndicator = ({ task, onViewWorkflow }) => {
    if (!task.workflow_name) {
        return null;
    }

    const progressData = task.workflow_progress;

    if (!progressData) {
        // Fallback for when workflow is assigned but no progress data yet (e.g., not started)
        const totalStepsFallback = task.workflow_total_steps || 1; // Assume at least 1 step if total not available
        const currentStepFallback = 0;
        const progressPercentageFallback = 0;

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                background: 'rgba(147, 51, 234, 0.1)',
                border: '1px solid rgba(147, 51, 234, 0.2)',
                borderRadius: '8px',
                fontSize: '0.75rem'
            }}>
                <Network size={12} style={{ color: 'rgb(147, 51, 234)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {task.workflow_name}
                </span>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: 'rgb(147, 51, 234)'
                }}>
                    <span>{currentStepFallback}/{totalStepsFallback}</span>
                    <div style={{
                        width: '30px',
                        height: '4px',
                        background: 'rgba(147, 51, 234, 0.2)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${progressPercentageFallback}%`,
                            height: '100%',
                            background: 'rgb(147, 51, 234)',
                            borderRadius: '2px'
                        }} />
                    </div>
                </div>
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); onViewWorkflow(task); }} // Stop propagation if inside a clickable row
                    style={{
                        background: 'rgba(147, 51, 234, 0.2)',
                        border: '1px solid rgba(147, 51, 234, 0.3)',
                        borderRadius: '4px',
                        padding: '0.25rem',
                        color: 'rgb(147, 51, 234)',
                        cursor: 'pointer',
                        display: 'flex', // Ensure icon is centered
                        alignItems: 'center'
                    }}
                    title="Ver workflow"
                >
                    <EyeIcon size={12} />
                </motion.button>
            </div>
        );
    }

    const completedSteps = progressData.completed_steps || 0;
    const totalSteps = progressData.total_steps || 0;
    const percentage = progressData.percentage || 0;
    const isCompleted = progressData.is_completed || false;

    let displayText;
    let displayColor;
    let backgroundColor;
    let borderColor;

    if (totalSteps === 0) {
        displayText = "Sem passos";
        displayColor = 'rgba(255, 255, 255, 0.5)';
        backgroundColor = 'rgba(255, 255, 255, 0.05)';
        borderColor = 'rgba(255, 255, 255, 0.1)';
    } else if (isCompleted) {
        displayText = `${totalSteps}/${totalSteps}`;
        displayColor = 'rgb(52, 211, 153)';
        backgroundColor = 'rgba(52, 211, 153, 0.1)';
        borderColor = 'rgba(52, 211, 153, 0.2)';
    } else {
        displayText = `${completedSteps}/${totalSteps}`;
        displayColor = 'rgb(147, 51, 234)';
        backgroundColor = 'rgba(147, 51, 234, 0.1)';
        borderColor = 'rgba(147, 51, 234, 0.2)';
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem',
            background: backgroundColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            fontSize: '0.75rem'
        }}>
            <Network size={12} style={{ color: displayColor }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }} title={task.workflow_name}>
                {task.workflow_name}
            </span>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                color: displayColor
            }}>
                <span style={{ fontWeight: 'bold' }}>{displayText}</span>
                <div style={{
                    minWidth: '30px', // Use minWidth for consistency
                    height: '4px',
                    background: `${displayColor}20`, // Lighter shade of displayColor
                    borderRadius: '2px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${Math.max(0, Math.min(100, percentage))}%`,
                        height: '100%',
                        background: displayColor,
                        borderRadius: '2px',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>
            {isCompleted && (
                <CheckCircle2 size={12} style={{ color: 'rgb(52, 211, 153)' }} />
            )}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onViewWorkflow(task); }} // Stop propagation
                style={{
                    background: `${displayColor}20`,
                    border: `1px solid ${displayColor}30`,
                    borderRadius: '4px',
                    padding: '0.25rem',
                    color: displayColor,
                    cursor: 'pointer',
                    display: 'flex', // Ensure icon is centered
                    alignItems: 'center'
                }}
                title="Ver detalhes do workflow"
            >
                <EyeIcon size={12} />
            </motion.button>
        </div>
    );
};

export default WorkflowIndicator;
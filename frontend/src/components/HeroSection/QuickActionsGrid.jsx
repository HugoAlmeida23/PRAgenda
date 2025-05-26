// --- START OF FILE QuickActionsGrid.jsx ---

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Zap,
    Sparkles,
    ArrowUpRight,
    // ✅ Add any other icons that might be passed dynamically if not already imported
    // For example, if DashboardPages passes Mic, AlertTriangle, PlusSquare:
    Mic,
    AlertTriangle,
    PlusSquare
} from 'lucide-react';

// ✅ actions prop will now come from DashboardPages with icon components
const QuickActionsGrid = ({ actions = [], dashboardData }) => {
    const [hoveredAction, setHoveredAction] = useState(null);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const actionVariants = {
        hidden: { y: 20, opacity: 0, scale: 0.9 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 200,
                damping: 20
            }
        }
    };

    const hoverVariants = {
        hover: {
            scale: 1.05,
            y: -5,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 20
            }
        },
        tap: {
            scale: 0.95
        }
    };

    // This function might be specific for certain action types
    const handleActionClick = (action) => {
        if (action.type === 'voice_entry' || action.type === 'time_entry_voice') { // Handle new type
            console.log('Opening voice entry for action:', action);
            // Implement actual voice entry logic here
            // For example, you might set some state to open a modal,
            // or call a function passed via props.
            alert(`Voice entry for: ${action.label}`);
            return;
        }
        // For other types, the Link component will handle navigation
    };

    // --- Styles (keep as they are) ---
    const containerStyle = {
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '1.5rem',
        height: '100%',
        minHeight: '320px', // Ensure it has some height
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex', // Added for better structure if content is short
        flexDirection: 'column' // Added
    };

    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexShrink: 0 // Prevent header from shrinking
    };

    const headerLeftStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
    };

    const iconContainerStyle = {
        padding: '0.5rem',
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        borderRadius: '12px'
    };

    const actionsGridStyle = {
        display: 'grid',
        gridTemplateColumns: '1fr', // Each action takes full width in the column
        gap: '0.75rem',
        flexGrow: 1 // Allow grid to take available space
    };

    const actionCardStyle = {
        position: 'relative',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '1rem',
        minHeight: '96px', // Ensure actions have a minimum height
        border: '1px solid rgba(255, 255, 255, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.3s',
        overflow: 'hidden',
        display: 'flex', // Added to help with content layout
        flexDirection: 'column', // Added
        justifyContent: 'space-between' // Added
    };

    const actionCardHoverStyle = {
        borderColor: 'rgba(255, 255, 255, 0.2)',
        boxShadow: '0 10px 25px rgba(255, 255, 255, 0.1)'
    };

    const actionContentStyle = {
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%'
    };

    const actionTopStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    };

    const actionIconStyle = { // Style for the container of the icon
        padding: '0.5rem',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    const actionTextStyle = {
        display: 'flex',
        flexDirection: 'column',
        marginTop: 'auto' // Push text to bottom if card is taller
    };

    const suggestionFooterStyle = {
        marginTop: '1.5rem',
        padding: '0.75rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        flexShrink: 0 // Prevent footer from shrinking
    };

    const suggestionContentStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    };

    const pulseStyle = {
        width: '8px',
        height: '8px',
        backgroundColor: 'rgb(34, 197, 94)',
        borderRadius: '50%',
        animation: 'pulse 2s infinite'
    };

    const priorityIndicatorStyle = { // No change
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        width: '16px',
        height: '16px',
        backgroundColor: 'rgb(239, 68, 68)',
        borderRadius: '50%'
    };
    // --- End of Styles ---


    const getActionContent = (action) => {
        // ✅ The icon is now a component passed in action.icon
        const ActionIconComponent = action.icon;

        return (
            <motion.div
                style={{ position: 'relative', height: '100%' }} // Ensure motion div takes full height of grid cell
                variants={actionVariants} // This variant is for the individual action card
                // whileHover="hover" // these are now on the inner card
                // whileTap="tap"
                onHoverStart={() => setHoveredAction(action.type)}
                onHoverEnd={() => setHoveredAction(null)}
            >
                <motion.div
                    style={{
                        ...actionCardStyle, // Base style
                        ...(hoveredAction === action.type ? actionCardHoverStyle : {})
                    }}
                    variants={hoverVariants} // Hover/tap variants for the card itself
                    whileHover="hover" // Apply hover variants here
                    whileTap="tap"     // Apply tap variants here
                >
                    {/* Background Glow Effect */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: action.color || 'rgba(255,255,255,0.1)', // Default color if not provided
                        opacity: hoveredAction === action.type ? 0.15 : 0, // Slightly more visible glow
                        borderRadius: '12px',
                        transition: 'opacity 0.3s'
                    }} />

                    <div style={actionContentStyle}>
                        <div style={actionTopStyle}>
                            <motion.div
                                style={{
                                    ...actionIconStyle, // This is the container style
                                    backgroundColor: action.color || 'rgba(255,255,255,0.2)' // Icon container background
                                }}
                                animate={{
                                    rotate: hoveredAction === action.type ? [0, 5, -5, 0] : 0
                                }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* ✅ Render the icon component */}
                                {ActionIconComponent && <ActionIconComponent style={{ color: 'white' }} size={16} />}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{
                                    opacity: hoveredAction === action.type ? 1 : 0,
                                    scale: hoveredAction === action.type ? 1 : 0
                                }}
                                transition={{ duration: 0.2 }}
                            >
                                <ArrowUpRight style={{ color: 'rgba(255, 255, 255, 0.6)' }} size={14} />
                            </motion.div>
                        </div>

                        <div style={actionTextStyle}>
                            <h4 style={{
                                color: 'white',
                                fontWeight: '500',
                                fontSize: '0.875rem',
                                margin: '0 0 0.25rem 0'
                            }}>
                                {action.label}
                            </h4>
                            <p style={{
                                color: 'rgb(191, 219, 254)',
                                fontSize: '0.75rem',
                                margin: 0
                            }}>
                                {action.subtitle}
                            </p>
                        </div>
                    </div>

                    {/* Shine Effect */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent)',
                            borderRadius: '12px',
                            pointerEvents: 'none' // Ensure shine doesn't block interactions
                        }}
                        initial={{ x: '-100%' }}
                        animate={{
                            x: hoveredAction === action.type ? '100%' : '-100%'
                        }}
                        transition={{ duration: 0.6, ease: 'linear' }}
                    />
                </motion.div>
            </motion.div>
        );
    };

    if (!actions || actions.length === 0) { // Check actions prop directly
        return (
            <motion.div
                style={containerStyle}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <div style={{
                    display: 'flex',
                    flexDirection: 'column', // Center content vertically
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%', // Take full height
                    color: 'rgba(255, 255, 255, 0.6)',
                    textAlign: 'center'
                }}>
                    <Zap style={{ marginBottom: '0.75rem' }} size={32} /> {/* Bigger icon */}
                    <span>Sem ações rápidas disponíveis no momento.</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            style={containerStyle}
            variants={containerVariants} // This variant is for the main container
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <div style={headerStyle}>
                <div style={headerLeftStyle}>
                    <motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 180, 360]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={iconContainerStyle}
                    >
                        <Zap style={{ color: 'rgb(251, 191, 36)' }} size={20} />
                    </motion.div>
                    <div>
                        <h3 style={{
                            color: 'white',
                            fontWeight: '600',
                            margin: 0,
                            fontSize: '1rem'
                        }}>
                            Ações Rápidas
                        </h3>
                        <p style={{
                            color: 'rgb(191, 219, 254)',
                            fontSize: '0.875rem',
                            margin: 0
                        }}>
                            Baseadas no seu contexto
                        </p>
                    </div>
                </div>

                <motion.div
                    animate={{
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <Sparkles style={{ color: 'rgb(196, 181, 253)' }} size={16} />
                </motion.div>
            </div>

            {/* Actions Grid */}
            <motion.div
                style={actionsGridStyle}
                // Removed variants here as individual items have their own animation
            >
                {actions.map((action, index) => (
                    <React.Fragment key={action.type || index}> {/* Use index as fallback key */}
                        {/* Check if action.action is a path for <Link> or needs onClick */}
                        {action.action && typeof action.action === 'string' && action.action.startsWith('/') ? (
                            <Link
                                to={action.action}
                                style={{ textDecoration: 'none', display: 'block', height: '100%' }}
                            >
                                {getActionContent(action)}
                            </Link>
                        ) : (
                            <div onClick={() => handleActionClick(action)} style={{ height: '100%', cursor: 'pointer' }}>
                                {getActionContent(action)}
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </motion.div>



            {/* Priority Indicator (Optional, if you have 'urgent' actions) */}
            {actions.some(action => action.type === 'urgent' || action.type === 'urgent_tasks_review') && (
                <motion.div
                    style={priorityIndicatorStyle}
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            )}

            {/* CSS Animation for pulseStyle */}
            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                }
            `}</style>
        </motion.div>
    );
};

export default QuickActionsGrid;
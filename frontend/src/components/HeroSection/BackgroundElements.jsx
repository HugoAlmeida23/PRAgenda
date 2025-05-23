import React from 'react';
import { motion } from 'framer-motion';

const BackgroundElements = ({ businessStatus }) => {
    // Generate random positions for floating particles
    const generateParticles = (count) => {
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            delay: Math.random() * 2,
            duration: 3 + Math.random() * 4,
            size: 4 + Math.random() * 8
        }));
    };

    const particles = generateParticles(12);
    businessStatus = 'optimal'; // For testing purposes, you can change this to 'warning' or 'critical'

    const getGradientColors = () => {
        return {
                    from: 'linear-gradient(135deg, rgb(47, 106, 201) 0%, rgb(60, 21, 97) 50%, rgb(8, 134, 156) 100%)',
                    accent: 'rgb(255, 255, 255)'
                };
    };
    // Status-based gradient colors
    /* const getGradientColors = () => {
        switch (businessStatus) {
            case 'optimal':
                return {
                    from: 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(147, 51, 234) 50%, rgb(6, 182, 212) 100%)',
                    accent: 'rgb(52, 211, 153)'
                };
            case 'warning':
                return {
                    from: 'linear-gradient(135deg, rgb(249, 115, 22) 0%, rgb(239, 68, 68) 50%, rgb(147, 51, 234) 100%)',
                    accent: 'rgb(251, 191, 36)'
                };
            case 'critical':
                return {
                    from: 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(236, 72, 153) 50%, rgb(147, 51, 234) 100%)',
                    accent: 'rgb(248, 113, 113)'
                };
            default:
                return {
                    from: 'linear-gradient(135deg, rgb(59, 130, 246) 0%, rgb(147, 51, 234) 50%, rgb(79, 70, 229) 100%)',
                    accent: 'rgb(96, 165, 250)'
                };
        }
    }; */

    const colors = getGradientColors();

    const floatingVariants = {
        animate: {
            y: [-20, 20],
            x: [-10, 10],
            transition: {
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
            }
        }
    };

    const pulseVariants = {
        animate: {
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
            transition: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    const waveVariants = {
        animate: {
            pathLength: [0, 1],
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: "linear"
            }
        }
    };

    const containerStyle = {
        position: 'absolute',
        inset: 0,
        overflow: 'hidden'
    };

    const mainGradientStyle = {
        position: 'absolute',
        inset: 0,
        background: colors.from
    };

    const overlayStyle = {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.1)'
    };

    const meshGradientStyle = {
        position: 'absolute',
        inset: 0,
        opacity: 0.4
    };

    const particleStyle = (particle) => ({
        position: 'absolute',
        width: '8px',
        height: '8px',
        backgroundColor: colors.accent,
        borderRadius: '50%',
        opacity: 0.2,
        left: `${particle.x}%`,
        top: `${particle.y}%`
    });

    const shapeStyle1 = {
        position: 'absolute',
        top: '2.5rem',
        right: '2.5rem',
        width: '128px',
        height: '128px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '50%'
    };

    const shapeStyle2 = {
        position: 'absolute',
        bottom: '5rem',
        left: '2.5rem',
        width: '96px',
        height: '96px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '8px',
        transform: 'rotate(45deg)'
    };

    const pulseRing1Style = {
        position: 'absolute',
        top: '50%',
        left: '25%',
        width: '192px',
        height: '192px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '50%'
    };

    const pulseRing2Style = {
        position: 'absolute',
        top: '33.333333%',
        right: '25%',
        width: '128px',
        height: '128px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '50%'
    };

    const waveStyle = {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '128px',
        opacity: 0.1
    };

    const gridStyle = {
        position: 'absolute',
        inset: 0,
        opacity: 0.02,
        backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
    };

    const lightBeamStyle = {
        position: 'absolute',
        top: '-80px',
        left: '50%',
        width: '1px',
        height: '160px',
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.4), transparent)'
    };

    const cornerAccentStyle = {
        position: 'absolute',
        width: '80px',
        height: '80px',
        border: '2px solid rgba(255, 255, 255, 0.1)'
    };

    const cornerTopLeftStyle = {
        ...cornerAccentStyle,
        top: 0,
        left: 0,
        borderRight: 'none',
        borderBottom: 'none',
        borderTopLeftRadius: '16px'
    };

    const cornerTopRightStyle = {
        ...cornerAccentStyle,
        top: 0,
        right: 0,
        borderLeft: 'none',
        borderBottom: 'none',
        borderTopRightRadius: '16px'
    };

    const cornerBottomLeftStyle = {
        ...cornerAccentStyle,
        bottom: 0,
        left: 0,
        borderRight: 'none',
        borderTop: 'none',
        borderBottomLeftRadius: '16px'
    };

    const cornerBottomRightStyle = {
        ...cornerAccentStyle,
        bottom: 0,
        right: 0,
        borderLeft: 'none',
        borderTop: 'none',
        borderBottomRightRadius: '16px'
    };

    return (
        <div style={containerStyle}>
            {/* Main Gradient Background */}
            <div style={mainGradientStyle} />
            
            {/* Overlay for depth */}
            <div style={overlayStyle} />

            {/* Animated Mesh Gradient */}
            <motion.div 
                style={meshGradientStyle}
                animate={{
                    background: [
                        'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%)',
                        'radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
                        'radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)'
                    ]
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "reverse"
                }}
            />

            {/* Floating Particles */}
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    style={particleStyle(particle)}
                    animate={{
                        y: [-particle.size, particle.size],
                        x: [-particle.size/2, particle.size/2],
                        opacity: [0.1, 0.4, 0.1],
                        scale: [0.5, 1, 0.5]
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: particle.delay,
                        ease: "easeInOut"
                    }}
                />
            ))}

            {/* Geometric Shapes */}
            <motion.div
                style={shapeStyle1}
                variants={floatingVariants}
                animate="animate"
            />
            
            <motion.div
                style={shapeStyle2}
                variants={floatingVariants}
                animate="animate"
                transition={{ delay: 1 }}
            />

            {/* Pulse Rings */}
            <motion.div
                style={pulseRing1Style}
                variants={pulseVariants}
                animate="animate"
            />
            
            <motion.div
                style={pulseRing2Style}
                variants={pulseVariants}
                animate="animate"
                transition={{ delay: 1.5 }}
            />

            {/* Animated Wave Lines */}
            <svg 
                style={waveStyle}
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
            >
                <motion.path
                    d="M0,60 C300,120 600,0 900,60 C1050,90 1200,30 1200,60 L1200,120 L0,120 Z"
                    fill="white"
                    variants={waveVariants}
                    animate="animate"
                />
            </svg>

            {/* Grid Pattern Overlay */}
            <div style={gridStyle} />

            {/* Top Light Beam */}
            <motion.div
                style={lightBeamStyle}
                animate={{
                    scaleY: [0.5, 1, 0.5],
                    opacity: [0.2, 0.6, 0.2]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Corner Accents */}
            <div style={cornerTopLeftStyle} />
            <div style={cornerTopRightStyle} />
            <div style={cornerBottomLeftStyle} />
            <div style={cornerBottomRightStyle} />
        </div>
    );
};

export default BackgroundElements;
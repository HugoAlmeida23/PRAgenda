import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const generateParticles = (count) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 4 + Math.random() * 5,
        size: 3 + Math.random() * 5
    }));
};

const BackgroundElements = () => {
    const { theme } = useTheme();
    const particles = useMemo(() => generateParticles(15), []);

    const colors = useMemo(() => {
        if (theme === 'light') {
            return {
                background: 'linear-gradient(135deg, rgb(249, 250, 251) 0%, rgb(229, 231, 235) 100%)',
                overlay: 'rgba(255, 255, 255, 0.1)',
                meshAnimate: [
                    'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 40%)',
                    'radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.08) 0%, transparent 40%)',
                    'radial-gradient(circle at 40% 40%, rgba(52, 211, 153, 0.08) 0%, transparent 40%)'
                ],
                particle: { color: 'rgb(55, 65, 81)', opacity: 0.4 },
                shapeBorder: 'rgba(0, 0, 0, 0.06)',
                pulseRing: 'rgba(0, 0, 0, 0.04)',
                grid: 'rgba(0, 0, 0, 0.05)',
                lightBeam: 'rgba(0, 0, 0, 0.15)',
                cornerAccent: 'rgba(0, 0, 0, 0.07)',
            };
        }
        return {
            background: 'linear-gradient(135deg, rgb(19, 41, 77) 0%, rgb(18, 7, 29) 50%, rgb(3, 53, 61) 100%)',
            overlay: 'rgba(0, 0, 0, 0.1)',
            meshAnimate: [
                'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%)',
                'radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
                'radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)'
            ],
            particle: { color: 'rgb(255, 255, 255)', opacity: 0.2 },
            shapeBorder: 'rgba(255, 255, 255, 0.1)',
            pulseRing: 'rgba(255, 255, 255, 0.05)',
            grid: 'rgba(255, 255, 255, 0.02)',
            lightBeam: 'rgba(255, 255, 255, 0.4)',
            cornerAccent: 'rgba(255, 255, 255, 0.1)',
        };
    }, [theme]);

    // --- Animation Variants (unchanged) ---
    const floatingVariants = { animate: { y: [-15, 15], x: [-10, 10], transition: { duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } } };
    const pulseVariants = { animate: { scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4], transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } } };
    const lightBeamVariants = { animate: { scaleY: [0.5, 1, 0.5], opacity: [0.3, 0.7, 0.3], transition: { duration: 5, repeat: Infinity, ease: "easeInOut" } } };
    const meshVariants = { transition: { duration: 10, repeat: Infinity, repeatType: "reverse" } };
    
    // --- Style Objects ---
    const containerStyle = { position: 'absolute', inset: 0, overflow: 'hidden', transition: 'background 0.5s ease-in-out' };
    const mainGradientStyle = { position: 'absolute', inset: 0, background: colors.background };
    const overlayStyle = { position: 'absolute', inset: 0, backgroundColor: colors.overlay };
    const meshGradientStyle = { position: 'absolute', inset: 0, opacity: 0.5 };
    const gridStyle = { position: 'absolute', inset: 0, opacity: 1, backgroundImage: `linear-gradient(${colors.grid} 1px, transparent 1px), linear-gradient(90deg, ${colors.grid} 1px, transparent 1px)`, backgroundSize: '50px 50px' };
    const lightBeamStyle = { position: 'absolute', top: '-80px', left: '50%', width: '1px', height: '160px', background: `linear-gradient(to bottom, ${colors.lightBeam}, transparent)` };
    const shapeStyle1 = { position: 'absolute', top: '2.5rem', right: '2.5rem', width: '128px', height: '128px', border: `1px solid ${colors.shapeBorder}`, borderRadius: '50%' };
    const shapeStyle2 = { position: 'absolute', bottom: '5rem', left: '2.5rem', width: '96px', height: '96px', border: `1px solid ${colors.shapeBorder}`, borderRadius: '8px', transform: 'rotate(45deg)' };
    const pulseRing1Style = { position: 'absolute', top: '50%', left: '25%', width: '192px', height: '192px', border: `1px solid ${colors.pulseRing}`, borderRadius: '50%' };
    const pulseRing2Style = { position: 'absolute', top: '33%', right: '25%', width: '128px', height: '128px', border: `1px solid ${colors.pulseRing}`, borderRadius: '50%' };
    
    // ================== THE FIX IS HERE ==================

    // 1. The base style NO LONGER contains the 'border' shorthand property.
    const cornerAccentBaseStyle = {
        position: 'absolute',
        width: '80px',
        height: '80px',
    };

    // 2. Each specific style now EXPLICITLY defines its borders using longhand properties.
    const cornerTopLeftStyle = {
        ...cornerAccentBaseStyle,
        top: 0,
        left: 0,
        borderTop: `2px solid ${colors.cornerAccent}`,
        borderLeft: `2px solid ${colors.cornerAccent}`,
        borderRight: 'none',
        borderBottom: 'none',
        borderTopLeftRadius: '16px'
    };
    const cornerTopRightStyle = {
        ...cornerAccentBaseStyle,
        top: 0,
        right: 0,
        borderTop: `2px solid ${colors.cornerAccent}`,
        borderRight: `2px solid ${colors.cornerAccent}`,
        borderLeft: 'none',
        borderBottom: 'none',
        borderTopRightRadius: '16px'
    };
    const cornerBottomLeftStyle = {
        ...cornerAccentBaseStyle,
        bottom: 0,
        left: 0,
        borderBottom: `2px solid ${colors.cornerAccent}`,
        borderLeft: `2px solid ${colors.cornerAccent}`,
        borderTop: 'none',
        borderRight: 'none',
        borderBottomLeftRadius: '16px'
    };
    const cornerBottomRightStyle = {
        ...cornerAccentBaseStyle,
        bottom: 0,
        right: 0,
        borderBottom: `2px solid ${colors.cornerAccent}`,
        borderRight: `2px solid ${colors.cornerAccent}`,
        borderTop: 'none',
        borderLeft: 'none',
        borderBottomRightRadius: '16px'
    };

    // ================== END OF FIX ==================

    return (
        <div style={containerStyle}>
            <div style={mainGradientStyle} />
            <div style={overlayStyle} />
            <motion.div style={meshGradientStyle} animate={{ background: colors.meshAnimate }} transition={meshVariants.transition} />

            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    style={{ position: 'absolute', width: `${p.size}px`, height: `${p.size}px`, backgroundColor: colors.particle.color, borderRadius: '50%', left: `${p.x}%`, top: `${p.y}%` }}
                    animate={{ y: [-p.size, p.size], x: [-p.size / 2, p.size / 2], opacity: [0, colors.particle.opacity, 0], scale: [0.5, 1, 0.5] }}
                    transition={{ duration: p.duration, repeat: Infinity, repeatType: "reverse", delay: p.delay, ease: "easeInOut" }}
                />
            ))}

            <div style={gridStyle} />
            <motion.div style={shapeStyle1} variants={floatingVariants} animate="animate" />
            <motion.div style={shapeStyle2} variants={floatingVariants} animate="animate" transition={{ delay: 1 }} />
            <motion.div style={pulseRing1Style} variants={pulseVariants} animate="animate" />
            <motion.div style={pulseRing2Style} variants={pulseVariants} animate="animate" transition={{ delay: 1.5 }} />
            <motion.div style={lightBeamStyle} variants={lightBeamVariants} animate="animate" />
            
            {/* These divs now use the corrected, unambiguous styles */}
            <div style={cornerTopLeftStyle} />
            <div style={cornerTopRightStyle} />
            <div style={cornerBottomLeftStyle} />
            <div style={cornerBottomRightStyle} />
        </div>
    );
};

export default BackgroundElements;
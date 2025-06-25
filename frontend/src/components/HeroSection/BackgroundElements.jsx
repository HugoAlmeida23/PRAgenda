// src/components/HeroSection/BackgroundElements.jsx

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useTheme } from '../../contexts/ThemeContext';

// --- Helper to generate particles ---
const generateParticles = (count) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 8 + Math.random() * 6, // Slower particle movement
        size: 1 + Math.random() * 2 // Smaller particles
    }));
};

// --- Fast Animation Variants ---
const floatingVariants = { animate: { y: [-5, 5], x: [-4, 4], transition: { duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } } };
const pulseVariants = { animate: { scale: [1, 1.03, 1], opacity: [0.2, 0.4, 0.2], transition: { duration: 7, repeat: Infinity, ease: "easeInOut" } } };
const lightBeamVariants = { animate: { scaleY: [0.4, 1, 0.4], opacity: [0.2, 0.5, 0.2], transition: { duration: 7, repeat: Infinity, ease: "easeInOut" } } };

const meshAnimation = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// --- Styled Components ---
const BackgroundContainer = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: ${({ theme }) => theme.body === 'rgb(243, 244, 246)' 
    ? 'linear-gradient(135deg, rgb(249, 250, 251) 0%, rgb(229, 231, 235) 100%)' 
    : 'linear-gradient(135deg, rgb(19, 41, 77) 0%, rgb(18, 7, 29) 50%, rgb(3, 53, 61) 100%)'};
  transition: background 0.3s ease-in-out;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${({ theme }) => theme.body === 'rgb(243, 244, 246)' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
`;

const MeshGradient = styled(motion.div)`
  position: absolute;
  inset: 0;
  opacity: 0.5;
  background: ${({ theme }) => theme.body === 'rgb(243, 244, 246)'
    ? 'radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 40%), radial-gradient(circle at 80% 20%, rgba(147, 51, 234, 0.08) 0%, transparent 40%)'
    : 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)'};
  animation: ${meshAnimation} 30s ease infinite; // Slower animation
`;

const Grid = styled.div`
  position: absolute;
  inset: 0;
  opacity: 1;
  background-image: ${({ theme }) => `
    linear-gradient(${theme.body === 'rgb(243, 244, 246)' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.02)'} 1px, transparent 1px),
    linear-gradient(90deg, ${theme.body === 'rgb(243, 244, 246)' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.02)'} 1px, transparent 1px)
  `};
  background-size: 50px 50px;
`;

const Particle = styled(motion.div)`
  position: absolute;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.body === 'rgb(243, 244, 246)' ? 'rgb(55, 65, 81)' : 'rgb(255, 255, 255)'};
`;

const FloatingShape = styled(motion.div)`
  position: absolute;
  border: 1px solid ${({ theme }) => theme.body === 'rgb(243, 244, 246)' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)'};
`;

const PulseRing = styled(motion.div)`
  position: absolute;
  border: 1px solid ${({ theme }) => theme.body === 'rgb(243, 244, 246)' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 50%;
`;

const LightBeam = styled(motion.div)`
  position: absolute;
  top: -80px;
  left: 50%;
  width: 1px;
  height: 160px;
  background: ${({ theme }) => `linear-gradient(to bottom, ${theme.body === 'rgb(243, 244, 246)' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.4)'}, transparent)`};
`;

const CornerAccent = styled.div`
  position: absolute;
  width: 80px;
  height: 80px;
  border-color: ${({ theme }) => theme.body === 'rgb(243, 244, 246)' ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.1)'};
  border-style: solid;
`;

const BackgroundElements = () => {
    const { theme } = useTheme(); 
    const particles = useMemo(() => generateParticles(8), []); // Reduced particle count

    return (
        <BackgroundContainer>
            <Overlay />
            <MeshGradient />

            {particles.map((p) => (
                <Particle
                    key={p.id}
                    style={{ width: `${p.size}px`, height: `${p.size}px`, left: `${p.x}%`, top: `${p.y}%` }}
                    animate={{
                        y: [-p.size * 2, p.size * 2],
                        opacity: [0, theme === 'light' ? 0.2 : 0.1, 0], // More subtle
                        scale: [0.5, 1, 0.5]
                    }}
                    transition={{ duration: p.duration, repeat: Infinity, repeatType: "reverse", delay: p.delay, ease: "easeInOut" }}
                />
            ))}

            <Grid />

            <FloatingShape variants={floatingVariants} animate="animate" style={{ top: '2.5rem', right: '2.5rem', width: '128px', height: '128px', borderRadius: '50%' }} />
            <FloatingShape variants={floatingVariants} animate="animate" style={{ bottom: '5rem', left: '2.5rem', width: '96px', height: '96px', borderRadius: '8px', transform: 'rotate(45deg)' }} />

            <PulseRing variants={pulseVariants} animate="animate" style={{ top: '50%', left: '25%', width: '192px', height: '192px' }} />
            <PulseRing variants={pulseVariants} animate="animate" style={{ top: '33%', right: '25%', width: '128px', height: '128px' }} />

            <LightBeam variants={lightBeamVariants} animate="animate" />

            <CornerAccent style={{ top: 0, left: 0, borderTopWidth: '2px', borderLeftWidth: '2px', borderTopLeftRadius: '16px' }} />
            <CornerAccent style={{ top: 0, right: 0, borderTopWidth: '2px', borderRightWidth: '2px', borderTopRightRadius: '16px' }} />
            <CornerAccent style={{ bottom: 0, left: 0, borderBottomWidth: '2px', borderLeftWidth: '2px', borderBottomLeftRadius: '16px' }} />
            <CornerAccent style={{ bottom: 0, right: 0, borderBottomWidth: '2px', borderRightWidth: '2px', borderBottomRightRadius: '16px' }} />
        </BackgroundContainer>
    );
};

export default BackgroundElements;
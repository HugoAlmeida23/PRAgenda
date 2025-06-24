// src/components/HeroSection/AIInsightsPanel.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
    Brain, ArrowRight, Sparkles, ChevronLeft, ChevronRight,
    Play, Pause, Clock, CheckSquare, AlertTriangle, Users
} from 'lucide-react';

// --- Styled Components (No changes) ---
const PanelContainer = styled(motion.div)`
  background: ${({ theme }) => theme.aiInsights.bg};
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 1.5rem;
  height: 100%;
  min-height: 320px;
  border: 1px solid ${({ theme }) => theme.aiInsights.border};
  color: ${({ theme }) => theme.aiInsights.headerText};
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const IconContainer = styled(motion.div)`
  padding: 0.5rem;
  background-color: ${({ theme }) => theme.aiInsights.iconContainer};
  border-radius: 12px;
`;

const Title = styled.h3`
  font-weight: 600;
  font-size: 1.125rem;
  margin: 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.aiInsights.subHeaderText};
  font-size: 0.875rem;
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ControlButton = styled(motion.button)`
  padding: 0.5rem;
  background-color: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.textMuted};
  transition: background-color 0.2s;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const InsightContainer = styled.div`
  position: relative;
  flex-grow: 1;
  min-height: 180px;
  margin-bottom: 1rem;
`;

const InsightCard = styled(motion.div)`
  position: absolute;
  inset: 0;
  background-color: ${({ theme }) => theme.aiInsights.insightCardBg};
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid ${({ theme }) => theme.aiInsights.insightCardBorder};
`;

const InsightHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const InsightIcon = styled.div`
  padding: 0.5rem;
  background-color: ${({ theme }) => theme.body === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
`;

const InsightTitle = styled.h4`
  color: ${({ theme }) => theme.text};
  font-weight: 500;
  margin: 0;
`;

const InsightMessage = styled.p`
  color: ${({ theme }) => theme.aiInsights.subHeaderText};
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0;
`;

const ActionButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.aiInsights.actionButtonBg};
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: 1.5rem;
  align-self: flex-start;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const ProgressBarContainer = styled.div`
  margin-bottom: 1rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  height: 4px;
`;

const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: ${({ theme }) => theme.textMuted};

    svg {
        margin-right: 0.75rem;
    }
`;

// --- Main Component ---
const AIInsightsPanel = ({ insights = [], dashboardData }) => {
    const [currentInsight, setCurrentInsight] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isPaused || !insights || insights.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentInsight((prev) => (prev + 1) % insights.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [isPaused, insights, insights.length]);
    
    const handlePrevious = () => setCurrentInsight(prev => (prev === 0 ? (insights?.length || 1) - 1 : prev - 1));
    const handleNext = () => setCurrentInsight(prev => (prev + 1) % (insights?.length || 1));
    const handlePauseToggle = () => setIsPaused(!isPaused);
    const insightAction = (insight) => {
        if (insight?.action) navigate(insight.action);
    };

    // REFACTOR: Simplified animation variants for a faster, cleaner feel.
    const containerVariants = { 
        hidden: { opacity: 0, y: 15 }, 
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } 
    };
    
    // REFACTOR: Replaced the complex spring-based slide animation with a simple, clean cross-fade.
    // This feels faster, less "wobbly", and is more performant.
    const insightVariants = {
        enter: { opacity: 0 },
        center: { opacity: 1, transition: { duration: 0.3, ease: 'easeIn' } },
        exit: { opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }
    };
    
    const getImpactBadge = (impact) => {
        const badges = {
            high: { color: 'rgba(239, 68, 68, 0.2)', textColor: 'rgb(252, 165, 165)', borderColor: 'rgba(239, 68, 68, 0.3)', label: 'Alto Impacto' },
            medium: { color: 'rgba(245, 158, 11, 0.2)', textColor: 'rgb(253, 230, 138)', borderColor: 'rgba(245, 158, 11, 0.3)', label: 'Médio Impacto' },
            positive: { color: 'rgba(16, 185, 129, 0.2)', textColor: 'rgb(110, 231, 183)', borderColor: 'rgba(16, 185, 129, 0.3)', label: 'Positivo' }
        };
        return badges[impact] || badges.medium;
    };
    
    if (!insights || insights.length === 0) {
        return (
            <PanelContainer variants={containerVariants} initial="hidden" animate="visible">
                <LoadingContainer>
                    <Brain size={24} />
                    <span>Analisando dados para gerar insights...</span>
                </LoadingContainer>
            </PanelContainer>
        );
    }
    
    const currentInsightData = insights[currentInsight];

    return (
        <PanelContainer variants={containerVariants} initial="hidden" animate="visible">
            <Header>
                <HeaderLeft>
                    <IconContainer>
                        <Brain style={{ color: 'rgb(196, 181, 253)' }} size={24} />
                    </IconContainer>
                    <div>
                        <Title>AI Insights</Title>
                        <Subtitle>Análise inteligente em tempo real</Subtitle>
                    </div>
                </HeaderLeft>
                <Controls>
                    <ControlButton onClick={handlePauseToggle} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        {isPaused ? <Play size={16} /> : <Pause size={16} />}
                    </ControlButton>
                    <ControlButton onClick={handlePrevious} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <ChevronLeft size={16} />
                    </ControlButton>
                    <ControlButton onClick={handleNext} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <ChevronRight size={16} />
                    </ControlButton>
                </Controls>
            </Header>

            {!isPaused && insights.length > 1 && (
                <ProgressBarContainer>
                    <ProgressBar>
                        <motion.div style={{ background: 'linear-gradient(to right, rgb(96, 165, 250), rgb(147, 51, 234))', height: '4px', borderRadius: '4px' }}
                            initial={{ width: "0%" }} animate={{ width: "100%" }}
                            transition={{ duration: 5, ease: "linear" }} key={currentInsight} />
                    </ProgressBar>
                </ProgressBarContainer>
            )}

            <InsightContainer>
                <AnimatePresence mode="wait" initial={false}>
                    <InsightCard key={currentInsight} variants={insightVariants} initial="enter" animate="center" exit="exit">
                        {currentInsightData && (
                            <>
                                <div>
                                    <InsightHeader>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <InsightIcon>
                                                {React.createElement(currentInsightData.icon, { style: { color: currentInsightData.color || 'white' }, size: 20 })}
                                            </InsightIcon>
                                            <div>
                                                <InsightTitle>{currentInsightData.title}</InsightTitle>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                    <div style={{ padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', border: `1px solid ${getImpactBadge(currentInsightData.impact).borderColor}`, backgroundColor: getImpactBadge(currentInsightData.impact).color, color: getImpactBadge(currentInsightData.impact).textColor }}>
                                                        {getImpactBadge(currentInsightData.impact).label}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </InsightHeader>
                                    <InsightMessage>{currentInsightData.message}</InsightMessage>
                                </div>
                                {currentInsightData.action && (
                                    <ActionButton whileHover={{ scale: 1.02, x: 2, transition:{duration: 0.2} }} whileTap={{ scale: 0.98 }} onClick={() => insightAction(currentInsightData)}>
                                        <span>Tomar Ação</span>
                                        <ArrowRight size={14} />
                                    </ActionButton>
                                )}
                            </>
                        )}
                    </InsightCard>
                </AnimatePresence>
            </InsightContainer>
        </PanelContainer>
    );
};

export default AIInsightsPanel;
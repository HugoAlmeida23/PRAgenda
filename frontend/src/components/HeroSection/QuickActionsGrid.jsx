// src/components/HeroSection/QuickActionsGrid.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowUpRight, Zap, Sparkles } from 'lucide-react';
import { Clock, CheckSquare, AlertTriangle, Users, Mic } from 'lucide-react';

// --- Styled Components (No changes) ---
const PanelContainer = styled(motion.div)`
  background: ${({ theme }) => theme.quickActions.bg};
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 1.5rem;
  height: 100%;
  min-height: 320px;
  border: 1px solid ${({ theme }) => theme.quickActions.border};
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-shrink: 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const IconContainer = styled(motion.div)`
  padding: 0.5rem;
  background-color: ${({ theme }) => theme.quickActions.iconContainer};
  border-radius: 12px;
`;

const Title = styled.h3`
  color: ${({ theme }) => theme.quickActions.headerText};
  font-weight: 600;
  margin: 0;
  font-size: 1.125rem;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.quickActions.subHeaderText};
  font-size: 0.875rem;
  margin: 0;
`;

const ActionsGridContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  flex-grow: 1;
`;

const ActionCard = styled(motion.div)`
  position: relative;
  background-color: ${({ theme }) => theme.quickActions.actionCardBg};
  border-radius: 12px;
  padding: 1rem;
  min-height: 96px;
  border: 1px solid ${({ theme }) => theme.quickActions.actionCardBorder};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  
  &:hover {
    border-color: ${({ theme }) => theme.quickActions.actionCardHoverBorder};
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }
`;

const ActionContent = styled.div`
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
`;

const ActionTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ActionIconContainer = styled(motion.div)`
  padding: 0.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ color }) => color || 'rgba(255,255,255,0.2)'};
`;

const ActionLabel = styled.h4`
  color: ${({ theme }) => theme.quickActions.actionLabel};
  font-weight: 500;
  font-size: 0.875rem;
  margin: auto 0 0.25rem 0;
`;

const ActionSublabel = styled.p`
  color: ${({ theme }) => theme.quickActions.actionSublabel};
  font-size: 0.75rem;
  margin: 0;
`;

const ShineEffect = styled(motion.div)`
    position: absolute;
    inset: 0;
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
    border-radius: 12px;
    pointer-events: none;
`;

// --- Main Component ---
const QuickActionsGrid = ({ actions = [], dashboardData }) => {
    const [hoveredAction, setHoveredAction] = useState(null);

    // REFACTOR: Faster stagger and simpler child animation for a snappier grid appearance.
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
    };
    
    // REFACTOR: Replaced spring with a simple, fast easeOut transition.
    const actionVariants = {
        hidden: { y: 15, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }
    };

    const handleActionClick = (action) => {
        if (action.type === 'voice_entry' || action.type === 'time_entry_voice') {
            alert(`Voice entry for: ${action.label}`);
        }
    };

    const getActionContent = (action) => {
        const ActionIconComponent = action.icon;
        return (
            <motion.div
                style={{ position: 'relative', height: '100%' }}
                variants={actionVariants}
                onHoverStart={() => setHoveredAction(action.type)}
                onHoverEnd={() => setHoveredAction(null)}
            >
                {/* REFACTOR: Changed hover to a direct prop for simplicity and responsiveness. */}
                <ActionCard whileHover={{ scale: 1.03, y: -4, transition: { duration: 0.2, ease: "easeOut" } }} whileTap={{ scale: 0.97 }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: action.color || 'rgba(255,255,255,0.1)', opacity: hoveredAction === action.type ? 0.15 : 0, borderRadius: '12px', transition: 'opacity 0.3s' }} />
                    <ActionContent>
                        <ActionTop>
                            <ActionIconContainer color={action.color}>
                                {ActionIconComponent && <ActionIconComponent style={{ color: 'white' }} size={16} />}
                            </ActionIconContainer>
                            <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: hoveredAction === action.type ? 1 : 0, scale: hoveredAction === action.type ? 1 : 0 }} transition={{ duration: 0.2 }}>
                                <ArrowUpRight style={{ opacity: 0.6 }} size={14} />
                            </motion.div>
                        </ActionTop>
                        <div>
                            <ActionLabel>{action.label}</ActionLabel>
                            <ActionSublabel>{action.subtitle}</ActionSublabel>
                        </div>
                    </ActionContent>
                    <ShineEffect initial={{ x: '-100%' }} animate={{ x: hoveredAction === action.type ? '100%' : '-100%' }} transition={{ duration: 0.6, ease: 'linear' }} />
                </ActionCard>
            </motion.div>
        );
    };

    if (!actions || actions.length === 0) {
        return (
            <PanelContainer variants={containerVariants} initial="hidden" animate="visible">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6, textAlign: 'center' }}>
                    <Zap style={{ marginBottom: '0.75rem' }} size={32} />
                    <span>Sem ações rápidas disponíveis.</span>
                </div>
            </PanelContainer>
        );
    }

    return (
        <PanelContainer variants={containerVariants} initial="hidden" animate="visible">
            <Header>
                <HeaderLeft>
                    <IconContainer>
                        <Zap style={{ color: 'rgb(251, 191, 36)' }} size={20} />
                    </IconContainer>
                    <div>
                        <Title>Ações Rápidas</Title>
                        <Subtitle>Baseadas no seu contexto</Subtitle>
                    </div>
                </HeaderLeft>
                <Sparkles style={{ color: 'rgb(196, 181, 253)' }} size={16} />
            </Header>

            <ActionsGridContainer>
                {actions.map((action, index) => (
                    <React.Fragment key={action.type || index}>
                        {action.action && action.action.startsWith('/') ? (
                            <Link to={action.action} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                                {getActionContent(action)}
                            </Link>
                        ) : (
                            <div onClick={() => handleActionClick(action)} style={{ height: '100%', cursor: 'pointer' }}>
                                {getActionContent(action)}
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </ActionsGridContainer>
        </PanelContainer>
    );
};

export default QuickActionsGrid;
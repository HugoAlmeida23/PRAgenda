// src/components/client/FinancialHealthScore.jsx (NEW FILE)
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const ScoreContainer = styled(motion.div)`
  width: 100px;
  height: 100px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ScoreText = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ color }) => color};
  z-index: 2;
`;

const ScoreCircle = ({ score = 50 }) => {
    const getScoreColor = () => {
        if (score >= 80) return '#34D399'; // green
        if (score >= 50) return '#FBBF24'; // yellow
        return '#F87171'; // red
    };

    const color = getScoreColor();
    const circumference = 2 * Math.PI * 45; // 45 is radius

    return (
        <ScoreContainer>
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="8" />
                <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (score / 100) * circumference}
                    strokeLinecap="round"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
                    transition={{ duration: 1, ease: "easeOut" }}
                />
            </svg>
            <ScoreText color={color}>{score}</ScoreText>
        </ScoreContainer>
    );
};

const FinancialHealthScore = ({ score, placement = 'card' }) => {
    const getStatus = () => {
        if (score === null || score === undefined) return { Icon: AlertTriangle, text: "Não Calculado", color: "#9CA3AF" };
        if (score >= 80) return { Icon: TrendingUp, text: "Excelente", color: "#34D399" };
        if (score >= 50) return { Icon: AlertTriangle, text: "Atenção", color: "#FBBF24" };
        return { Icon: AlertTriangle, text: "Crítico", color: "#F87171" };
    };

    const { Icon, text, color } = getStatus();

    if (placement === 'modal') {
        return (
            <div style={{ textAlign: 'center' }} title="Health Score: Mede a saúde financeira do cliente com base em lucratividade, compliance e cash flow. Quanto mais alto, melhor.">
                <ScoreCircle score={score} />
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: color, fontWeight: '600' }}>
                    <Icon size={18} />
                    <span>{text}</span>
                </div>
            </div>
        );
    }
    
    // Default card placement
    return (
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }} title="Health Score: Mede a saúde financeira do cliente com base em lucratividade, compliance e cash flow. Quanto mais alto, melhor.">
            <div style={{ fontSize: '0.75rem', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>Health Score</div>
            <ScoreCircle score={score} />
        </div>
    );
};

export default FinancialHealthScore;
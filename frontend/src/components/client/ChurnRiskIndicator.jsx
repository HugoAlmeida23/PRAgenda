// src/components/client/ChurnRiskIndicator.jsx (NEW FILE)
import React from 'react';
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';

const ChurnRiskIndicator = ({ risk = 'LOW' }) => {
    const config = {
        LOW: { Icon: ShieldCheck, color: '#34D399', text: 'Risco Baixo' },
        MEDIUM: { Icon: ShieldQuestion, color: '#FBBF24', text: 'Risco Médio' },
        HIGH: { Icon: ShieldAlert, color: '#F87171', text: 'Risco Alto' }
    };

    const { Icon, color, text } = config[risk] || config.LOW;

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: `${color}20`,
            border: `1px solid ${color}30`,
            color: color,
        }}>
            <Icon size={14} />
            <span>{text}</span>
        </div>
    );
};

export default ChurnRiskIndicator;
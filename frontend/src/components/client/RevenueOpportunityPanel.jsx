// src/components/client/RevenueOpportunityPanel.jsx (NEW FILE)
import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Zap } from 'lucide-react';

const RevenueOpportunityPanel = ({ opportunities = [] }) => {
    if (opportunities.length === 0) {
        return <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Nenhuma oportunidade identificada.</div>;
    }

    const getSeverityColor = (severity) => {
        if (severity === 'high') return '#F87171';
        if (severity === 'medium') return '#FBBF24';
        return '#34D399'; // low
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {opportunities.map((opp, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{ padding: '1rem', background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.2)', borderRadius: '8px', position: 'relative' }}
                >
                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: getSeverityColor(opp.severity) }}><Zap size={16} /></div>
                    <h4 style={{ margin: 0, fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><DollarSign size={16} /> {opp.title}</h4>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{opp.details}</p>
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '6px' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>Ação Sugerida: <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.7)' }}>{opp.action_suggestion}</span></p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default RevenueOpportunityPanel;
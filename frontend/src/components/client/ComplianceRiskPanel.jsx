// src/components/client/ComplianceRiskPanel.jsx (NEW FILE)
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const ComplianceRiskPanel = ({ risks = [] }) => {
    if (risks.length === 0) {
        return (
            <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle size={20} style={{ color: '#34D399' }} />
                <div>
                    <h4 style={{ margin: 0, fontWeight: 600, color: 'white' }}>Sem Riscos</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Nenhum risco de compliance detectado.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {risks.map((risk, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}
                >
                    <AlertTriangle size={20} style={{ color: '#F87171', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <h4 style={{ margin: 0, fontWeight: 600, color: 'white' }}>{risk.title}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{risk.details}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default ComplianceRiskPanel;
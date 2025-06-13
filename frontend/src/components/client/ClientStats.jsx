// src/components/client/ClientStats.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle, XCircle, DollarSign } from 'lucide-react';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const ClientStats = ({ clients }) => {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.is_active).length;
    const inactiveClients = totalClients - activeClients;
    const totalRevenue = clients
        .filter(c => c.is_active && c.monthly_fee)
        .reduce((sum, c) => sum + parseFloat(c.monthly_fee || 0), 0);

    const stats = [
        { label: "Total de Clientes", value: totalClients, icon: Users, color: 'rgb(59, 130, 246)' },
        { label: "Clientes Ativos", value: activeClients, icon: CheckCircle, color: 'rgb(52, 211, 153)' },
        { label: "Clientes Inativos", value: inactiveClients, icon: XCircle, color: 'rgb(239, 68, 68)' },
        { label: "Receita Mensal", value: `${new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalRevenue)}`, icon: DollarSign, color: 'rgb(147, 51, 234)' }
    ];

    return (
        <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}
        >
            {stats.map((stat, index) => (
                <motion.div key={index} variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }} whileHover={{ scale: 1.02, y: -5 }}
                    style={{ ...glassStyle, padding: '1.5rem', textAlign: 'center', background: `rgba(${stat.color.replace('rgb(', '').replace(')', '')}, 0.1)`, border: `1px solid rgba(${stat.color.replace('rgb(', '').replace(')', '')}, 0.2)` }}>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: stat.color, marginBottom: '0.5rem' }}>{stat.value}</div>
                    <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>{stat.label}</div>
                </motion.div>
            ))}
        </motion.div>
    );
};

export default ClientStats;
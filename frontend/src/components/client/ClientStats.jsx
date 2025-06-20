// src/components/client/ClientStats.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Users, CheckCircle, XCircle, DollarSign } from 'lucide-react';

// --- Styled Components ---

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCardContainer = styled(motion.div)`
  background: ${({ theme, colorKey }) => theme.statCard[colorKey]?.bg || theme.glassBg};
  border: 1px solid ${({ theme, colorKey }) => theme.statCard[colorKey]?.text + '33' || theme.glassBorder}; // Use 20% opacity of the text color for border
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.2s ease-in-out;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme, colorKey }) => theme.statCard[colorKey]?.text || theme.textHighlight};
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.statCard.label};
`;

// --- The Main Component ---

const ClientStats = ({ clients }) => {
    // Data calculation logic remains the same
    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.is_active).length;
    const inactiveClients = totalClients - activeClients;
    const totalRevenue = clients
        .filter(c => c.is_active && c.monthly_fee)
        .reduce((sum, c) => sum + parseFloat(c.monthly_fee || 0), 0);

    // We now add a `colorKey` to map to our theme object
    const stats = [
        { label: "Total de Clientes", value: totalClients, icon: Users, colorKey: 'total' },
        { label: "Clientes Ativos", value: activeClients, icon: CheckCircle, colorKey: 'active' },
        { label: "Clientes Inativos", value: inactiveClients, icon: XCircle, colorKey: 'inactive' },
        { label: "Receita Mensal", value: `${new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalRevenue)}`, icon: DollarSign, colorKey: 'revenue' }
    ];

    const containerVariants = { 
        hidden: { opacity: 0 }, 
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } } 
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };
    
    return (
        <StatsGrid
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {stats.map((stat, index) => (
                <StatCardContainer
                    key={index}
                    variants={itemVariants}
                    whileHover={{ scale: 1.03, y: -5 }}
                    colorKey={stat.colorKey} // Pass the key to the styled component
                >
                    <stat.icon 
                        size={24} 
                        // The color of the icon is now also controlled by the theme
                        style={{ 
                            color: stat.color, // We can keep the original color for the icon itself if we want
                            marginBottom: '0.75rem' 
                        }} 
                    />
                    <StatValue colorKey={stat.colorKey}>{stat.value}</StatValue>
                    <StatLabel>{stat.label}</StatLabel>
                </StatCardContainer>
            ))}
        </StatsGrid>
    );
};

export default ClientStats;
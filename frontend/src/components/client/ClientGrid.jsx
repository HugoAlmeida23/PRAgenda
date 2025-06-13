// src/components/client/ClientGrid.jsx
import React from 'react';
import { motion } from 'framer-motion';
import ClientCard from './ClientCard';
import { Users } from 'lucide-react';

const ClientGrid = ({ clients, onEdit, onToggleStatus, onDelete, permissions, onCardClick }) => {
    if (clients.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Nenhum cliente encontrado</h4>
                <p style={{ margin: 0 }}>Tente ajustar sua pesquisa ou filtros.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {clients.map((client, index) => (
                <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <ClientCard
                        client={client}
                        onEdit={onEdit}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        permissions={permissions}
                        onClick={() => onCardClick(client)}
                    />
                </motion.div>
            ))}
        </div>
    );
};

export default ClientGrid;
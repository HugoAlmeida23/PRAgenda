// src/components/client/ClientGrid.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import ClientCard from './ClientCard';
import { Users } from 'lucide-react';
import { useClientStore } from '../../stores/useClientStore';

// Styled Components
const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`;

const EmptyStateContainer = styled.div`
  padding: 3rem;
  text-align: center;
  color: ${({ theme }) => theme.textMuted};
  
  svg {
    margin-bottom: 1rem;
    opacity: 0.5;
  }
  
  h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    color: ${({ theme }) => theme.text};
  }
  
  p {
    margin: 0;
  }
`;

const ClientGrid = ({ clients, onToggleStatus, onDelete, permissions }) => {
    const { openFormForEdit, openDetailsModal } = useClientStore();

    if (clients.length === 0) {
        return (
            <EmptyStateContainer>
                <Users size={48} />
                <h4>Nenhum cliente encontrado</h4>
                <p>Tente ajustar sua pesquisa ou filtros.</p>
            </EmptyStateContainer>
        );
    }

    return (
        <GridContainer>
            {clients.map((client, index) => (
                <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <ClientCard
                        client={client}
                        onEdit={openFormForEdit}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        permissions={permissions}
                        onClick={() => openDetailsModal(client)}
                    />
                </motion.div>
            ))}
        </GridContainer>
    );
};

export default ClientGrid;
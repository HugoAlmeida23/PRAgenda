// src/components/client/ClientTable.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { ChevronUp, ChevronDown, Edit, Trash2, XCircle, CheckCircle, Eye } from 'lucide-react';
import { useClientStore } from '../../stores/useClientStore';

// Styled Components
const TableWrapper = styled.div`
  overflow-x: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background-color: ${({ theme }) => theme.table.headerBg};
`;

const TableHeaderCell = styled.th`
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid ${({ theme }) => theme.headerBorder};
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const SortButton = styled(motion.button)`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: inherit;
  font-weight: inherit;
  padding: 0;
`;

const TableRow = styled(motion.tr)`
  background-color: transparent;
  border-bottom: 1px solid ${({ theme }) => theme.table.rowBorder};
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: ${({ theme }) => theme.table.rowHoverBg};
  }
`;

const TableCell = styled.td`
  padding: 1rem;
`;

const AvatarPlaceholder = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  color: rgb(59, 130, 246);
  font-weight: 600;
  flex-shrink: 0;
`;

const StatusPill = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $isActive }) => $isActive ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  border: 1px solid ${({ $isActive }) => $isActive ? 'rgba(52, 211, 153, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
  color: ${({ $isActive }) => $isActive ? 'rgb(110, 231, 183)' : 'rgb(252, 165, 165)'};
`;

const ActionButton = styled(motion.button)`
  background: ${({ bgColor }) => bgColor || 'rgba(147, 51, 234, 0.2)'};
  border: 1px solid ${({ borderColor }) => borderColor || 'rgba(147, 51, 234, 0.3)'};
  border-radius: 6px;
  padding: 0.5rem;
  color: ${({ color }) => color || 'rgb(147, 51, 234)'};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DetailsButton = styled(motion.button)`
  background: ${({ theme }) => theme.button.secondaryBg};
  border: 1px solid ${({ theme }) => theme.button.secondaryBorder};
  border-radius: 6px;
  padding: 0.5rem;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
`;

const ClientTable = ({ clients, onSort, sortConfig, onToggleStatus, onDelete, permissions }) => {
    const { openFormForEdit, openDetailsModal } = useClientStore();

    const handleSort = (key) => {
        if (onSort) onSort(key);
    };

    if (clients.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                Nenhum cliente encontrado.
            </div>
        );
    }
    
    return (
        <TableWrapper>
            <StyledTable>
                <TableHead>
                    <tr>
                        <TableHeaderCell>
                            <SortButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSort("name")}>
                                Nome
                                {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : <ChevronDown size={16} style={{ opacity: 0.5 }} />}
                            </SortButton>
                        </TableHeaderCell>
                        <TableHeaderCell>Contacto</TableHeaderCell>
                        <TableHeaderCell>
                            <SortButton whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSort("monthly_fee")}>
                                Avença Mensal
                                {sortConfig.key === "monthly_fee" ? (sortConfig.direction === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : <ChevronDown size={16} style={{ opacity: 0.5 }} />}
                            </SortButton>
                        </TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Ações</TableHeaderCell>
                    </tr>
                </TableHead>
                <tbody>
                    {clients.map((client, index) => (
                        <TableRow
                            key={client.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => openDetailsModal(client)}
                        >
                            <TableCell>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <AvatarPlaceholder>{client.name.charAt(0).toUpperCase()}</AvatarPlaceholder>
                                    <div>
                                        <div style={{ fontWeight: '500', color: 'inherit', fontSize: '0.875rem' }}>{client.name}</div>
                                        <div style={{ color: 'inherit', opacity: 0.7, fontSize: '0.75rem' }}>{client.nif || "Sem NIF"}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div>
                                    <div style={{ color: 'inherit', fontSize: '0.875rem' }}>{client.email || "Sem email"}</div>
                                    <div style={{ color: 'inherit', opacity: 0.7, fontSize: '0.75rem' }}>{client.phone || "Sem telefone"}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span style={{ fontWeight: '600', color: 'rgb(52, 211, 153)', fontSize: '0.875rem' }}>
                                    {client.monthly_fee ? `${client.monthly_fee} €` : "Não definida"}
                                </span>
                            </TableCell>
                            <TableCell>
                                <StatusPill $isActive={client.is_active}>
                                    {client.is_active ? "Ativo" : "Inativo"}
                                </StatusPill>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {(permissions.isOrgAdmin || permissions.canEditClients) && (
                                        <ActionButton whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }} onClick={() => openFormForEdit(client)} title="Editar cliente">
                                            <Edit size={16} />
                                        </ActionButton>
                                    )}
                                    {(permissions.isOrgAdmin || permissions.canChangeClientStatus) && (
                                        <ActionButton whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }} onClick={() => onToggleStatus(client)} title={client.is_active ? "Desativar" : "Ativar"}
                                            bgColor={client.is_active ? 'rgba(251, 146, 60, 0.2)' : 'rgba(52, 211, 153, 0.2)'}
                                            borderColor={client.is_active ? 'rgba(251, 146, 60, 0.3)' : 'rgba(52, 211, 153, 0.3)'}
                                            color={client.is_active ? 'rgb(251, 146, 60)' : 'rgb(52, 211, 153)'}
                                        >
                                            {client.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                        </ActionButton>
                                    )}
                                    {(permissions.isOrgAdmin || permissions.canDeleteClients) && (
                                        <ActionButton whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }} onClick={() => onDelete(client.id)} title="Excluir cliente"
                                            bgColor='rgba(239, 68, 68, 0.2)' borderColor='rgba(239, 68, 68, 0.3)' color='rgb(239, 68, 68)'
                                        >
                                            <Trash2 size={16} />
                                        </ActionButton>
                                    )}
                                    <DetailsButton whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }} onClick={() => openDetailsModal(client)} title="Ver detalhes">
                                        <Eye size={14} /> Detalhes
                                    </DetailsButton>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </tbody>
            </StyledTable>
        </TableWrapper>
    );
};

export default ClientTable;
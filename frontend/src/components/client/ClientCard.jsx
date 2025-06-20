// src/components/client/ClientCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  User, Edit, Trash2, ArrowRight, Tag,
  Phone, Mail, MapPin, XCircle, CheckCircle
} from "lucide-react";

// --- Styled Components Definition ---

// The main card container. It uses a "transient prop" ($isActive)
// to avoid passing the prop down to the underlying DOM element.
const CardContainer = styled(motion.div)`
  background: ${({ theme, $isActive }) => 
    $isActive 
      ? theme.glassBg 
      : (theme.body === 'rgb(243, 244, 246)' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.1)')
  };
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme, $isActive }) => 
    $isActive 
      ? theme.glassBorder 
      : (theme.body === 'rgb(243, 244, 246)' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.3)')
  };
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  height: 100%;
  display: flex;
  flex-direction: column;
  opacity: ${({ $isActive }) => $isActive ? 1 : 0.8};
  color: ${({ theme }) => theme.text};
  transition: background 0.3s, border-color 0.3s;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const IconWrapper = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  color: rgb(59, 130, 246);
  flex-shrink: 0;
`;

const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ClientName = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
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

const InfoPill = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(147, 51, 234, 0.2);
  border: 1px solid rgba(147, 51, 234, 0.3);
  color: rgb(196, 181, 253);
`;

const ContactSection = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.875rem;
  
  svg {
    color: ${({ theme }) => theme.textMuted};
    opacity: 0.8;
  }
  
  span {
    color: ${({ theme }) => theme.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const FiscalTag = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  background: rgba(147, 51, 234, 0.2);
  border: 1px solid rgba(147, 51, 234, 0.3);
  color: rgb(196, 181, 253);
`;

const CardFooter = styled.div`
  margin-top: auto;
`;

const MonthlyFeeBox = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${({ theme }) => (theme.body === 'rgb(243, 244, 246)' ? 'rgba(0,0,0,0.03)' : 'rgba(0, 0, 0, 0.1)')};
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const FeeLabel = styled.span`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.textMuted};
`;

const FeeValue = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: rgb(52, 211, 153);
`;

const ActionsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => (theme.body === 'rgb(243, 244, 246)' ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.1)')};
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: ${({ theme }) => theme.button.secondaryBg};
  border: 1px solid ${({ theme }) => theme.button.secondaryBorder};
  border-radius: 8px;
  color: ${({ theme }) => theme.text};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
`;

// --- The Component ---

const ClientCard = ({ client, onEdit, onToggleStatus, onDelete, permissions, onClick }) => {
    const { isOrgAdmin, canEditClients, canChangeClientStatus, canDeleteClients } = permissions;
    const fiscalTagsToDisplay = Array.isArray(client.fiscal_tags) ? client.fiscal_tags : [];
    const isActive = client.is_active;

    return (
        <CardContainer
            whileHover={{ scale: 1.02, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            $isActive={isActive} // Use transient prop for styled-components
        >
            <CardHeader>
                <IconWrapper>
                    <User size={20} />
                </IconWrapper>
                <ClientInfo>
                    <ClientName>{client.name}</ClientName>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <StatusPill $isActive={isActive}>
                            {isActive ? 'Ativo' : 'Inativo'}
                        </StatusPill>
                        {client.nif && (
                            <InfoPill>NIF: {client.nif}</InfoPill>
                        )}
                    </div>
                </ClientInfo>
            </CardHeader>

            <ContactSection>
                {client.email && (
                    <ContactItem><Mail size={16} /><span>{client.email}</span></ContactItem>
                )}
                {client.phone && (
                    <ContactItem><Phone size={16} /><span>{client.phone}</span></ContactItem>
                )}
                {client.address && (
                    <ContactItem>
                        <MapPin size={16} />
                        <span>{client.address}</span>
                    </ContactItem>
                )}
            </ContactSection>

            {fiscalTagsToDisplay.length > 0 && (
                <div style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Tag size={16} style={{ color: 'rgb(147, 51, 234)' }} />
                        <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '500', color: 'inherit', opacity: 0.7 }}>
                            Tags Fiscais:
                        </h4>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {fiscalTagsToDisplay.slice(0, 3).map((tag, index) => (
                            <FiscalTag key={index}>{tag}</FiscalTag>
                        ))}
                        {fiscalTagsToDisplay.length > 3 && (
                            <span style={{ fontSize: '0.7rem', color: 'inherit', opacity: 0.5, alignSelf: 'center' }}>
                                +{fiscalTagsToDisplay.length - 3} mais
                            </span>
                        )}
                    </div>
                </div>
            )}
            
            <CardFooter>
                <MonthlyFeeBox>
                    <FeeLabel>Avença Mensal:</FeeLabel>
                    <FeeValue>
                        {client.monthly_fee ? `${client.monthly_fee} €` : 'Não definida'}
                    </FeeValue>
                </MonthlyFeeBox>

                <ActionsContainer>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {(isOrgAdmin || canEditClients) && (
                            <ActionButton onClick={(e) => { e.stopPropagation(); onEdit(client); }} title="Editar cliente">
                                <Edit size={16} />
                            </ActionButton>
                        )}
                        {(isOrgAdmin || canChangeClientStatus) && (
                            <ActionButton 
                                onClick={(e) => { e.stopPropagation(); onToggleStatus(client); }} 
                                title={isActive ? "Desativar" : "Ativar"}
                                bgColor={isActive ? 'rgba(251, 146, 60, 0.2)' : 'rgba(52, 211, 153, 0.2)'}
                                borderColor={isActive ? 'rgba(251, 146, 60, 0.3)' : 'rgba(52, 211, 153, 0.3)'}
                                color={isActive ? 'rgb(251, 146, 60)' : 'rgb(52, 211, 153)'}
                            >
                                {isActive ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            </ActionButton>
                        )}
                        {(isOrgAdmin || canDeleteClients) && (
                            <ActionButton 
                                onClick={(e) => { e.stopPropagation(); onDelete(client.id); }} 
                                title="Excluir cliente"
                                bgColor='rgba(239, 68, 68, 0.2)'
                                borderColor='rgba(239, 68, 68, 0.3)'
                                color='rgb(239, 68, 68)'
                            >
                                <Trash2 size={16} />
                            </ActionButton>
                        )}
                    </div>

                    <DetailsButton whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        Detalhes <ArrowRight size={14} />
                    </DetailsButton>
                </ActionsContainer>
            </CardFooter>
        </CardContainer>
    );
};

export default ClientCard;
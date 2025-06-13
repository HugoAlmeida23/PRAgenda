// src/components/client/ClientTable.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Edit, Trash2, XCircle, CheckCircle, Eye } from 'lucide-react';

const ClientTable = ({ clients, onSort, sortConfig, onEdit, onToggleStatus, onDelete, permissions, onRowClick }) => {
    if (clients.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                Nenhum cliente encontrado.
            </div>
        );
    }
    
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{
                    width: '100%',
                    borderCollapse: 'collapse'
                  }}>
                    <thead style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <tr>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.9)'
                        }}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSort("name")}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'inherit',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: 'inherit',
                              fontWeight: 'inherit'
                            }}
                          >
                            Nome
                            {sortConfig.key === "name" ? (
                              sortConfig.direction === "asc" ?
                                <ChevronUp size={16} /> :
                                <ChevronDown size={16} />
                            ) : (
                              <ChevronDown size={16} style={{ opacity: 0.5 }} />
                            )}
                          </motion.button>
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.9)'
                        }}>
                          Contacto
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.9)'
                        }}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSort("monthly_fee")}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'inherit',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: 'inherit',
                              fontWeight: 'inherit'
                            }}
                          >
                            Avença Mensal
                            {sortConfig.key === "monthly_fee" ? (
                              sortConfig.direction === "asc" ?
                                <ChevronUp size={16} /> :
                                <ChevronDown size={16} />
                            ) : (
                              <ChevronDown size={16} style={{ opacity: 0.5 }} />
                            )}
                          </motion.button>
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.9)'
                        }}>
                          Status
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'rgba(255, 255, 255, 0.9)'
                        }}>
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((client, index) => (
                        <motion.tr
                          key={client.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            cursor: 'pointer'
                          }}
                          whileHover={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
                          }}
                          onClick={() => handleViewClientDetails(client)}
                        >
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(59, 130, 246, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '1rem',
                                color: 'rgb(59, 130, 246)',
                                fontWeight: '600'
                              }}>
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{
                                  fontWeight: '500',
                                  color: 'white',
                                  fontSize: '0.875rem'
                                }}>
                                  {client.name}
                                </div>
                                <div style={{
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  fontSize: '0.75rem'
                                }}>
                                  {client.nif || "Sem NIF"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div>
                              <div style={{
                                color: 'white',
                                fontSize: '0.875rem'
                              }}>
                                {client.email || "Sem email"}
                              </div>
                              <div style={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: '0.75rem'
                              }}>
                                {client.phone || "Sem telefone"}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              fontWeight: '600',
                              color: 'rgb(52, 211, 153)',
                              fontSize: '0.875rem'
                            }}>
                              {client.monthly_fee
                                ? `${client.monthly_fee} €`
                                : "Não definida"}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: client.is_active
                                ? 'rgba(52, 211, 153, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                              border: client.is_active
                                ? '1px solid rgba(52, 211, 153, 0.3)'
                                : '1px solid rgba(239, 68, 68, 0.3)',
                              color: client.is_active
                                ? 'rgb(110, 231, 183)'
                                : 'rgb(252, 165, 165)'
                            }}>
                              {client.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              {(permissions.isOrgAdmin || permissions.canEditClients) && (
                                <motion.button
                                  whileHover={{ scale: 1.1, y: -2 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => selectClientForEdit(client)}
                                  style={{
                                    background: 'rgba(147, 51, 234, 0.2)',
                                    border: '1px solid rgba(147, 51, 234, 0.3)',
                                    borderRadius: '6px',
                                    padding: '0.5rem',
                                    color: 'rgb(147, 51, 234)',
                                    cursor: 'pointer'
                                  }}
                                  title="Editar cliente"
                                >
                                  <Edit size={16} />
                                </motion.button>
                              )}

                              {(permissions.isOrgAdmin || permissions.canChangeClientStatus) && (
                                <motion.button
                                  whileHover={{ scale: 1.1, y: -2 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => toggleClientStatus(client)}
                                  style={{
                                    background: client.is_active
                                      ? 'rgba(251, 146, 60, 0.2)'
                                      : 'rgba(52, 211, 153, 0.2)',
                                    border: client.is_active
                                      ? '1px solid rgba(251, 146, 60, 0.3)'
                                      : '1px solid rgba(52, 211, 153, 0.3)',
                                    borderRadius: '6px',
                                    padding: '0.5rem',
                                    color: client.is_active
                                      ? 'rgb(251, 146, 60)'
                                      : 'rgb(52, 211, 153)',
                                    cursor: 'pointer'
                                  }}
                                  title={client.is_active ? "Desativar" : "Ativar"}
                                >
                                  {client.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                </motion.button>
                              )}

                              {(permissions.isOrgAdmin || permissions.canDeleteClients) && (
                                <motion.button
                                  whileHover={{ scale: 1.1, y: -2 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => confirmDelete(client.id)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '6px',
                                    padding: '0.5rem',
                                    color: 'rgb(239, 68, 68)',
                                    cursor: 'pointer'
                                  }}
                                  title="Excluir cliente"
                                >
                                  <Trash2 size={16} />
                                </motion.button>
                              )}

                              <motion.button
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleViewClientDetails(client)}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  borderRadius: '6px',
                                  padding: '0.5rem',
                                  color: 'white',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem'
                                }}
                                title="Ver detalhes"
                              >
                                <Eye size={14} />
                                Detalhes
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
        </div>
    );
};

export default ClientTable;
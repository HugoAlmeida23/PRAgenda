// src/components/task/UserAssignmentSelector.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, User, UserPlus, X, Search, Check, 
    AlertCircle, ChevronDown, ChevronUp 
} from 'lucide-react';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px'
};

const UserAssignmentSelector = ({
    users = [],
    primaryAssignee = null,
    collaborators = [],
    workflowAssignees = [],
    onPrimaryAssigneeChange,
    onCollaboratorsChange,
    mode = 'single', // 'single' or 'multiple'
    onModeChange,
    excludeUserIds = [],
    title = "Atribuição de Utilizadores",
    showWorkflowSuggestions = false,
    className = ""
}) => {
    const [showSelector, setShowSelector] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expanded, setExpanded] = useState(false);

    // Filter available users
    const getAvailableUsers = () => {
        const excludedIds = [
            ...excludeUserIds,
            primaryAssignee,
            ...collaborators.map(c => c.id || c.user || c)
        ].filter(Boolean);

        let availableUsers = users.filter(user => 
            !excludedIds.includes(user.user || user.id)
        );

        // Apply search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            availableUsers = availableUsers.filter(user =>
                (user.username || '').toLowerCase().includes(term) ||
                (user.first_name || '').toLowerCase().includes(term) ||
                (user.last_name || '').toLowerCase().includes(term) ||
                (user.email || '').toLowerCase().includes(term)
            );
        }

        return availableUsers;
    };

    const getUserDisplayName = (user) => {
        if (!user) return 'Não selecionado';
        if (typeof user === 'string') {
            const foundUser = users.find(u => (u.user || u.id) === user);
            return foundUser ? foundUser.username : user;
        }
        return user.username || user.name || 'Utilizador';
    };

    const handleAddCollaborator = (userId) => {
        const user = users.find(u => (u.user || u.id) === userId);
        if (user && !collaborators.find(c => (c.id || c.user || c) === userId)) {
            const collaboratorData = {
                id: user.user || user.id,
                username: user.username,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || ''
            };
            onCollaboratorsChange([...collaborators, collaboratorData]);
            setSearchTerm('');
        }
    };

    const handleRemoveCollaborator = (userId) => {
        const updatedCollaborators = collaborators.filter(c => (c.id || c.user || c) !== userId);
        onCollaboratorsChange(updatedCollaborators);
    };

    const totalAssignedUsers = (primaryAssignee ? 1 : 0) + collaborators.length;

    return (
        <div className={className}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px'
            }}>
                <div>
                    <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Users size={16} />
                        {title}
                        {totalAssignedUsers > 0 && (
                            <span style={{
                                fontSize: '0.75rem',
                                padding: '0.125rem 0.375rem',
                                background: 'rgba(52, 211, 153, 0.2)',
                                borderRadius: '9999px',
                                color: 'rgb(52, 211, 153)'
                            }}>
                                {totalAssignedUsers}
                            </span>
                        )}
                    </div>
                    <p style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        margin: '0.25rem 0 0 0'
                    }}>
                        {mode === 'single' 
                            ? 'Atribua esta tarefa a um utilizador'
                            : 'Atribua esta tarefa a múltiplos utilizadores'
                        }
                    </p>
                </div>

                {/* Mode Toggle */}
                {onModeChange && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onModeChange('single')}
                            style={{
                                ...glassStyle,
                                padding: '0.5rem 0.75rem',
                                border: mode === 'single' 
                                    ? '1px solid rgba(59, 130, 246, 0.6)' 
                                    : '1px solid rgba(255, 255, 255, 0.2)',
                                background: mode === 'single' 
                                    ? 'rgba(59, 130, 246, 0.3)' 
                                    : 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontWeight: mode === 'single' ? '600' : '400'
                            }}
                        >
                            <User size={14} />
                            Individual
                            {mode === 'single' && <Check size={12} />}
                        </motion.button>
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onModeChange('multiple')}
                            style={{
                                ...glassStyle,
                                padding: '0.5rem 0.75rem',
                                border: mode === 'multiple' 
                                    ? '1px solid rgba(59, 130, 246, 0.6)' 
                                    : '1px solid rgba(255, 255, 255, 0.2)',
                                background: mode === 'multiple' 
                                    ? 'rgba(59, 130, 246, 0.3)' 
                                    : 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontWeight: mode === 'multiple' ? '600' : '400'
                            }}
                        >
                            <Users size={14} />
                            Múltiplos
                            {mode === 'multiple' && <Check size={12} />}
                        </motion.button>
                    </div>
                )}
            </div>

            {/* Primary Assignee */}
            <div style={{ marginBottom: '1rem' }}>
                <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                }}>
                    {mode === 'multiple' ? 'Responsável Principal' : 'Responsável'}
                    {mode === 'multiple' && (
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.6)',
                            marginLeft: '0.5rem'
                        }}>
                            (Utilizador principal responsável pela tarefa)
                        </span>
                    )}
                </label>
                <select
                    value={primaryAssignee || ""}
                    onChange={(e) => onPrimaryAssigneeChange(e.target.value || null)}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                    }}
                >
                    <option value="" style={{ background: '#1f2937', color: 'white' }}>
                        Selecionar Responsável
                    </option>
                    {users.map(user => (
                        <option
                            key={user.user || user.id}
                            value={user.user || user.id}
                            style={{ background: '#1f2937', color: 'white' }}
                        >
                            {user.username} {user.first_name && `(${user.first_name})`}
                        </option>
                    ))}
                </select>
            </div>

            {/* Collaborators Section */}
            {mode === 'multiple' && (
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.75rem'
                    }}>
                        <div>
                            <label style={{
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: 'rgba(255, 255, 255, 0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Users size={16} />
                                Colaboradores ({collaborators.length})
                            </label>
                            <p style={{
                                fontSize: '0.75rem',
                                color: 'rgba(255, 255, 255, 0.6)',
                                margin: '0.25rem 0 0 0'
                            }}>
                                Utilizadores que podem trabalhar nesta tarefa
                            </p>
                        </div>
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowSelector(!showSelector)}
                            style={{
                                ...glassStyle,
                                padding: '0.5rem 0.75rem',
                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                background: 'rgba(52, 211, 153, 0.2)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontWeight: '500'
                            }}
                        >
                            <UserPlus size={14} />
                            {showSelector ? 'Fechar' : 'Adicionar'}
                        </motion.button>
                    </div>

                    {/* Selected Collaborators */}
                    {collaborators.length > 0 && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'rgba(255, 255, 255, 0.7)',
                                marginBottom: '0.5rem',
                                fontWeight: '500'
                            }}>
                                Colaboradores Selecionados:
                            </div>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                            }}>
                                {collaborators.map(collaborator => (
                                    <motion.div
                                        key={collaborator.id || collaborator.user || collaborator}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.5rem 0.75rem',
                                            background: 'rgba(59, 130, 246, 0.2)',
                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                            borderRadius: '6px',
                                            fontSize: '0.875rem',
                                            color: 'white'
                                        }}
                                    >
                                        <User size={14} />
                                        <span>{getUserDisplayName(collaborator)}</span>
                                        {collaborator.first_name && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: 'rgba(255, 255, 255, 0.7)'
                                            }}>
                                                ({collaborator.first_name})
                                            </span>
                                        )}
                                        <motion.button
                                            type="button"
                                            whileHover={{ 
                                                scale: 1.1, 
                                                backgroundColor: 'rgba(239, 68, 68, 0.4)' 
                                            }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleRemoveCollaborator(collaborator.id || collaborator.user || collaborator)}
                                            style={{
                                                background: 'rgba(239, 68, 68, 0.3)',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '20px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: 'white'
                                            }}
                                            title={`Remover ${getUserDisplayName(collaborator)}`}
                                        >
                                            <X size={12} />
                                        </motion.button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* User Selector */}
                    <AnimatePresence>
                        {showSelector && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    marginBottom: '1rem'
                                }}
                            >
                                {/* Search Input */}
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search 
                                            size={16} 
                                            style={{ 
                                                position: 'absolute', 
                                                left: '0.75rem', 
                                                top: '50%', 
                                                transform: 'translateY(-50%)', 
                                                color: 'rgba(255, 255, 255, 0.5)' 
                                            }} 
                                        />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar utilizadores..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                borderRadius: '6px',
                                                color: 'white',
                                                fontSize: '0.875rem'
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Available Users List */}
                                <div style={{
                                    maxHeight: '250px',
                                    overflowY: 'auto',
                                    marginBottom: '0.5rem'
                                }}>
                                    {getAvailableUsers().length === 0 ? (
                                        <div style={{
                                            textAlign: 'center',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                            fontSize: '0.875rem',
                                            padding: '1rem'
                                        }}>
                                            {searchTerm ? 'Nenhum utilizador encontrado' : 'Nenhum utilizador disponível'}
                                        </div>
                                    ) : (
                                        getAvailableUsers().map(user => (
                                            <UserItem
                                                key={user.user || user.id}
                                                user={user}
                                                onSelect={() => handleAddCollaborator(user.user || user.id)}
                                            />
                                        ))
                                    )}
                                </div>

                                {/* Workflow Suggestions */}
                                {showWorkflowSuggestions && workflowAssignees.length > 0 && (
                                    <div style={{
                                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                        paddingTop: '0.75rem',
                                        marginTop: '0.75rem'
                                    }}>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.7)',
                                            marginBottom: '0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}>
                                            <AlertCircle size={12} />
                                            Utilizadores atribuídos aos passos do workflow:
                                        </div>
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                workflowAssignees.forEach(user => {
                                                    const userId = user.user || user.id;
                                                    if (!collaborators.find(c => (c.id || c.user || c) === userId)) {
                                                        handleAddCollaborator(userId);
                                                    }
                                                });
                                                setShowSelector(false);
                                            }}
                                            style={{
                                                ...glassStyle,
                                                padding: '0.5rem 0.75rem',
                                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                                background: 'rgba(251, 191, 36, 0.2)',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                width: '100%',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Users size={14} />
                                            Adicionar Utilizadores do Workflow ({workflowAssignees.length})
                                        </motion.button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Assignment Summary */}
            {(primaryAssignee || collaborators.length > 0) && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        padding: '1rem',
                        background: 'rgba(52, 211, 153, 0.1)',
                        border: '1px solid rgba(52, 211, 153, 0.2)',
                        borderRadius: '8px',
                        marginTop: '1rem'
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.75rem'
                    }}>
                        <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <Users size={16} />
                            Resumo de Atribuições
                        </div>
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setExpanded(!expanded)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.7)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.75rem'
                            }}
                        >
                            {expanded ? 'Recolher' : 'Expandir'}
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </motion.button>
                    </div>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ display: 'grid', gap: '0.5rem' }}
                            >
                                {primaryAssignee && (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <div style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: 'rgb(59, 130, 246)'
                                        }} />
                                        <strong>Responsável Principal:</strong> {getUserDisplayName(primaryAssignee)}
                                    </div>
                                )}

                                {collaborators.length > 0 && (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <div style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: 'rgb(147, 51, 234)'
                                        }} />
                                        <strong>Colaboradores ({collaborators.length}):</strong> {collaborators.map(c => getUserDisplayName(c)).join(', ')}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!expanded && (
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.8)'
                        }}>
                            {primaryAssignee ? 1 : 0} responsável principal, {collaborators.length} colaborador(es)
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
};

// UserItem Component
const UserItem = ({ user, onSelect }) => {
    return (
        <motion.div
            whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
            onClick={onSelect}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: 'white',
                marginBottom: '0.25rem',
                border: '1px solid transparent',
                transition: 'all 0.2s ease'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgb(59, 130, 246)',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                }}>
                    {(user.username || user.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.125rem' }}>
                        {user.username || user.name}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        {user.first_name && user.last_name && (
                            <span>{user.first_name} {user.last_name}</span>
                        )}
                        {user.role && (
                            <span style={{
                                padding: '0.125rem 0.375rem',
                                background: 'rgba(147, 51, 234, 0.2)',
                                borderRadius: '4px',
                                fontSize: '0.625rem'
                            }}>
                                {user.role}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                }}
                style={{
                    background: 'rgba(52, 211, 153, 0.2)',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    borderRadius: '6px',
                    padding: '0.375rem',
                    color: 'rgb(52, 211, 153)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title={`Adicionar ${user.username || user.name} como colaborador`}
            >
                <UserPlus size={14} />
            </motion.button>
        </motion.div>
    );
};

export default UserAssignmentSelector;
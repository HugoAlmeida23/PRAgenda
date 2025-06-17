// src/components/task/TaskTable.jsx - Enhanced with multi-user assignment display
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronUp, ChevronDown, Edit3 as EditIcon, Trash2, CheckCircle, Clock, Calendar, 
    AlertTriangle, User, Eye as EyeIcon, Settings2 as SettingsIcon, Target as TargetIcon,
    Users, UserCheck, ChevronRight, MoreHorizontal, Workflow
} from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../pages/TaskManagement';
import WorkflowIndicator from './WorkflowIndicator';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px'
};

const AssignmentIndicator = ({ task, usersData, onViewDetails }) => {
    const [showDetails, setShowDetails] = useState(false);
    
    const getUserName = (userId) => {
        if (!usersData || !userId) return "Desconhecido";
        const user = usersData.find(u => u.user === userId);
        return user ? user.username : "Desconhecido";
    };

    const primaryAssignee = task.assigned_to ? getUserName(task.assigned_to) : null;
    const collaborators = task.collaborators_info || [];
    const workflowAssignees = task.workflow_step_assignments ? 
        Object.values(task.workflow_step_assignments).filter(Boolean).length : 0;
    
    const totalAssigned = (primaryAssignee ? 1 : 0) + collaborators.length + workflowAssignees;
    const hasMultipleAssignments = totalAssigned > 1;

    if (totalAssigned === 0) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.875rem'
            }}>
                <User size={16} style={{ marginRight: '0.5rem' }} />
                Não atribuída
            </div>
        );
    }

    if (!hasMultipleAssignments && primaryAssignee) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.875rem'
            }}>
                <User size={16} style={{ marginRight: '0.5rem', color: 'rgba(255, 255, 255, 0.6)' }} />
                {primaryAssignee}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => setShowDetails(!showDetails)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: 'white'
                }}
            >
                <Users size={16} style={{ color: 'rgb(59, 130, 246)' }} />
                <span>{totalAssigned} utilizadores</span>
                <ChevronRight 
                    size={14} 
                    style={{ 
                        color: 'rgba(255, 255, 255, 0.6)',
                        transform: showDetails ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                    }} 
                />
            </motion.div>

            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 50,
                            marginTop: '0.5rem',
                            ...glassStyle,
                            padding: '0.75rem',
                            background: 'rgba(30, 41, 59, 0.95)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            minWidth: '250px'
                        }}
                    >
                        <div style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: 'white',
                            marginBottom: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                        }}>
                            <Users size={12} />
                            Atribuições da Tarefa
                        </div>

                        {primaryAssignee && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.5rem',
                                padding: '0.375rem',
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: '4px'
                            }}>
                                <div style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: 'rgb(59, 130, 246)'
                                }} />
                                <span style={{ fontSize: '0.75rem', color: 'white' }}>
                                    <strong>Principal:</strong> {primaryAssignee}
                                </span>
                            </div>
                        )}

                        {collaborators.length > 0 && (
                            <div style={{
                                marginBottom: '0.5rem',
                                padding: '0.375rem',
                                background: 'rgba(147, 51, 234, 0.1)',
                                borderRadius: '4px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.25rem'
                                }}>
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: 'rgb(147, 51, 234)'
                                    }} />
                                    <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: '600' }}>
                                        Colaboradores ({collaborators.length}):
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginLeft: '1rem' }}>
                                    {collaborators.map(c => c.username).join(', ')}
                                </div>
                            </div>
                        )}

                        {workflowAssignees > 0 && (
                            <div style={{
                                padding: '0.375rem',
                                background: 'rgba(251, 191, 36, 0.1)',
                                borderRadius: '4px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: 'rgb(251, 191, 36)'
                                    }} />
                                    <span style={{ fontSize: '0.75rem', color: 'white' }}>
                                        <strong>Workflow:</strong> {workflowAssignees} passo(s) atribuído(s)
                                    </span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TaskActionsMenu = ({ task, permissions, onEdit, onDelete, onUpdateStatus, onViewWorkflow, onLogTime }) => {
    const [showMenu, setShowMenu] = useState(false);

    const canEdit = permissions.isOrgAdmin || 
                   permissions.canEditAllTasks || 
                   (permissions.canEditAssignedTasks && task.assigned_to === permissions.userId);
    
    const canDelete = permissions.isOrgAdmin || permissions.canDeleteTasks;
    
    const canLogTime = permissions.isOrgAdmin || 
                       permissions.canLogTimeEntries || 
                       (permissions.canLogOwnTimeEntries && task.assigned_to === permissions.userId);

    const actions = [];

    // Status actions
    if (task.status !== "completed" && canEdit) {
        actions.push({
            icon: CheckCircle,
            label: "Concluir",
            color: 'rgb(52, 211, 153)',
            onClick: () => onUpdateStatus(task, "completed")
        });
    }

    if (task.status === "pending" && canEdit) {
        actions.push({
            icon: Clock,
            label: "Iniciar",
            color: 'rgb(59, 130, 246)',
            onClick: () => onUpdateStatus(task, "in_progress")
        });
    }

    // Edit action
    if (canEdit) {
        actions.push({
            icon: EditIcon,
            label: "Editar",
            color: 'rgb(147, 51, 234)',
            onClick: () => onEdit(task)
        });
    }

    // Workflow action
    if (task.workflow_name) {
        actions.push({
            icon: Workflow,
            label: "Ver Workflow",
            color: 'rgb(251, 146, 60)',
            onClick: () => onViewWorkflow(task)
        });
    }

    // Time logging action
    if (canLogTime) {
        actions.push({
            icon: Clock,
            label: "Registar Tempo",
            color: 'rgb(52, 211, 153)',
            onClick: () => onLogTime(task)
        });
    }

    // Delete action
    if (canDelete) {
        actions.push({
            icon: Trash2,
            label: "Excluir",
            color: 'rgb(239, 68, 68)',
            onClick: () => onDelete(task.id)
        });
    }

    if (actions.length === 0) {
        return null;
    }

    return (
        <div style={{ position: 'relative' }}>
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowMenu(!showMenu)}
                style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <MoreHorizontal size={16} />
            </motion.button>

            <AnimatePresence>
                {showMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            zIndex: 50,
                            marginTop: '0.5rem',
                            ...glassStyle,
                            padding: '0.5rem',
                            background: 'rgba(30, 41, 59, 0.95)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            minWidth: '150px'
                        }}
                    >
                        {actions.map((action, index) => (
                            <motion.button
                                key={index}
                                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                onClick={() => {
                                    action.onClick();
                                    setShowMenu(false);
                                }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem',
                                    background: 'none',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: action.color,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    textAlign: 'left'
                                }}
                            >
                                <action.icon size={14} />
                                {action.label}
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TaskTable = ({
    tasks,
    onSort,
    onUpdateStatus, onDelete, onLogTime,
    formatDate, isOverdue, getPriorityLabelAndColor,
    permissions,
    usersData,
    clientsData
}) => {
    const {
        sortConfig,
        openFormForEdit,
        openWorkflowView,
        openTimeEntryModal
    } = useTaskStore();

    const getClientName = (clientId) => {
        if (!clientsData || !clientId) return "N/A";
        const client = clientsData.find(c => c.id === clientId);
        return client ? client.name : "Desconhecido";
    };

    const headers = [
        { key: "title", label: "Título" },
        { key: "client_name", label: "Cliente" },
        { key: "priority", label: "Prioridade" },
        { key: "deadline", label: "Prazo" },
        { key: "status", label: "Status" },
        { key: null, label: "Atribuições" }, // Not sortable
        { key: null, label: "Workflow" }, // Not sortable
        { key: null, label: "Ações" } // Not sortable
    ];

    if (tasks.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                <TargetIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Nenhuma tarefa encontrada</h4>
                <p style={{ margin: 0 }}>Tente ajustar os filtros ou crie uma nova tarefa.</p>
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                        {headers.map(header => (
                            <th 
                                key={header.key || header.label} 
                                style={{ 
                                    padding: '1rem', 
                                    textAlign: 'left', 
                                    borderBottom: '1px solid rgba(255,255,255,0.1)', 
                                    fontSize: '0.875rem', 
                                    fontWeight: '600', 
                                    color: 'rgba(255,255,255,0.9)',
                                    minWidth: header.label === 'Atribuições' ? '200px' : 'auto'
                                }}
                            >
                                {header.key ? (
                                    <motion.button 
                                        whileHover={{ scale: 1.05 }} 
                                        whileTap={{ scale: 0.95 }} 
                                        onClick={() => onSort(header.key)} 
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
                                        {header.label}
                                        {sortConfig.key === header.key ? 
                                            (sortConfig.direction === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : 
                                            <ChevronDown size={16} style={{ opacity: 0.5 }} />
                                        }
                                    </motion.button>
                                ) : header.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task, index) => {
                        const priorityInfo = getPriorityLabelAndColor(task.priority);
                        const statusInfo = STATUS_OPTIONS.find(s => s.value === task.status) || { 
                            label: task.status, 
                            color: 'rgba(255,255,255,0.6)' 
                        };
                        const taskClientName = task.client_name || getClientName(task.client);

                        return (
                            <motion.tr
                                key={task.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                style={{ 
                                    backgroundColor: 'rgba(255,255,255,0.02)', 
                                    borderBottom: '1px solid rgba(255,255,255,0.05)' 
                                }}
                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                            >
                                {/* Title Column */}
                                <td style={{ padding: '1rem', maxWidth: '300px' }}>
                                    <div style={{ 
                                        fontWeight: '600', 
                                        color: 'white', 
                                        fontSize: '0.875rem', 
                                        marginBottom: '0.25rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {task.title}
                                    </div>
                                    {task.description && (
                                        <div style={{ 
                                            color: 'rgba(255,255,255,0.6)', 
                                            fontSize: '0.75rem', 
                                            maxWidth: '280px', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis', 
                                            whiteSpace: 'nowrap' 
                                        }}>
                                            {task.description}
                                        </div>
                                    )}
                                    {task.source_fiscal_obligation && (
                                        <div style={{
                                            fontSize: '0.6rem',
                                            color: 'rgb(251, 191, 36)',
                                            marginTop: '0.25rem',
                                            padding: '0.125rem 0.375rem',
                                            background: 'rgba(251, 191, 36, 0.1)',
                                            borderRadius: '4px',
                                            display: 'inline-block'
                                        }}>
                                            Obrigação Fiscal
                                        </div>
                                    )}
                                </td>

                                {/* Client Column */}
                                <td style={{ padding: '1rem' }}>
                                    <span style={{ 
                                        color: 'rgba(255,255,255,0.8)', 
                                        fontSize: '0.875rem' 
                                    }}>
                                        {taskClientName}
                                    </span>
                                </td>

                                {/* Priority Column */}
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        padding: '0.25rem 0.75rem', 
                                        borderRadius: '9999px', 
                                        fontSize: '0.75rem', 
                                        fontWeight: '600', 
                                        backgroundColor: `${priorityInfo.color}20`, 
                                        border: `1px solid ${priorityInfo.color}30`, 
                                        color: priorityInfo.color 
                                    }}>
                                        {priorityInfo.label}
                                    </div>
                                </td>

                                {/* Deadline Column */}
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        color: isOverdue(task.deadline) && task.status !== 'completed' ? 
                                            'rgb(239,68,68)' : 'rgba(255,255,255,0.8)', 
                                        fontSize: '0.875rem' 
                                    }}>
                                        <Calendar size={16} style={{ 
                                            marginRight: '0.5rem', 
                                            color: isOverdue(task.deadline) && task.status !== 'completed' ? 
                                                'rgb(239,68,68)' : 'rgba(255,255,255,0.6)' 
                                        }} />
                                        {formatDate(task.deadline)}
                                        {isOverdue(task.deadline) && task.status !== 'completed' && 
                                            <AlertTriangle size={16} style={{ marginLeft: '0.5rem', color: 'rgb(239,68,68)' }} />
                                        }
                                    </div>
                                </td>

                                {/* Status Column */}
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        padding: '0.5rem 1rem', 
                                        borderRadius: '9999px', 
                                        fontSize: '0.75rem', 
                                        fontWeight: '600', 
                                        backgroundColor: `${statusInfo.color}20`, 
                                        border: `1px solid ${statusInfo.color}30`, 
                                        color: statusInfo.color 
                                    }}>
                                        {statusInfo.label}
                                    </div>
                                </td>

                                {/* Assignments Column */}
                                <td style={{ padding: '1rem' }}>
                                    <AssignmentIndicator 
                                        task={task} 
                                        usersData={usersData}
                                        onViewDetails={() => {
                                            // Could open a detailed view or modal
                                            console.log('View assignment details for task:', task.id);
                                        }}
                                    />
                                </td>

                                {/* Workflow Column */}
                                <td style={{ padding: '1rem' }}>
                                    {task.workflow_name ? (
                                        <WorkflowIndicator 
                                            task={task} 
                                            onViewWorkflow={() => openWorkflowView(task)} 
                                        />
                                    ) : (
                                        <span style={{ 
                                            color: 'rgba(255,255,255,0.4)', 
                                            fontSize: '0.875rem' 
                                        }}>
                                            Sem workflow
                                        </span>
                                    )}
                                </td>

                                {/* Actions Column */}
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <TaskActionsMenu
                                        task={task}
                                        permissions={permissions}
                                        onEdit={openFormForEdit}
                                        onDelete={onDelete}
                                        onUpdateStatus={onUpdateStatus}
                                        onViewWorkflow={openWorkflowView}
                                        onLogTime={openTimeEntryModal}
                                    />
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Click outside handler for menus */}
            <style jsx>{`
                tr:hover .task-actions-visible {
                    opacity: 1;
                }
                
                .task-actions-visible {
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                }
                
                @media (max-width: 768px) {
                    table {
                        font-size: 0.75rem;
                    }
                    
                    th, td {
                        padding: 0.75rem 0.5rem;
                    }
                    
                    .assignment-details {
                        min-width: 200px;
                    }
                }
            `}</style>
        </div>
    );
};

export default TaskTable;
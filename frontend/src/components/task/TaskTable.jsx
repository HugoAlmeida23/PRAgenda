// src/components/task/TaskTable.jsx
import React from 'react';
import { motion } from 'framer-motion';
import {
    ChevronUp, ChevronDown, Edit3 as EditIcon, Trash2, CheckCircle, Clock, Calendar, AlertTriangle, User, Eye as EyeIcon, Settings2 as SettingsIcon, Target as TargetIcon
} from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../pages/TaskManagement';
import WorkflowIndicator from './WorkflowIndicator'; // Assuming WorkflowIndicator is now here or imported correctly

const TaskTable = ({
    tasks, // This should be filteredAndSortedTasks
    onSort, // Passed from TaskManagement, calls store's setSortConfig
    onUpdateStatus, onDelete, onLogTime, // Mutation handlers from TaskManagement
    formatDate, isOverdue, getPriorityLabelAndColor, // Utility functions from TaskManagement
    permissions, // Permissions context
    usersData // Pass full users data for finding names if task.assigned_to_name is not available
}) => {
    const {
        sortConfig,
        openFormForEdit,
        openWorkflowView,
        openTimeEntryModal
    } = useTaskStore();

    const getAssigneeName = (assigneeId) => {
        if (!usersData || !assigneeId) return "Não atribuída";
        const user = usersData.find(u => u.user === assigneeId); // u.user is the ID, u.username is name
        return user ? user.username : "Desconhecido";
    };
    
    const getClientName = (clientId, clientsData) => {
        if (!clientsData || !clientId) return "N/A";
        const client = clientsData.find(c => c.id === clientId);
        return client ? client.name : "Desconhecido";
    };


    const headers = [
        { key: "title", label: "Título" },
        { key: "client_name", label: "Cliente" }, // Assuming client_name is populated by backend or in useMemo
        { key: "priority", label: "Prioridade" },
        { key: "deadline", label: "Prazo" },
        { key: "status", label: "Status" },
        { key: "assigned_to_name", label: "Responsável" }, // Assuming assigned_to_name is populated
        { key: null, label: "Workflow" }, // Not sortable by this field directly in this example
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
                            <th key={header.key || header.label} style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                {header.key ? (
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onSort(header.key)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'inherit', fontWeight: 'inherit' }}>
                                        {header.label}
                                        {sortConfig.key === header.key ? (sortConfig.direction === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : <ChevronDown size={16} style={{ opacity: 0.5 }} />}
                                    </motion.button>
                                ) : header.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {tasks.map((task, index) => {
                        const priorityInfo = getPriorityLabelAndColor(task.priority);
                        const statusInfo = STATUS_OPTIONS.find(s => s.value === task.status) || { label: task.status, color: 'rgba(255,255,255,0.6)' };
                        const taskClientName = task.client_name || getClientName(task.client, usersData); // Fallback if client_name not directly on task
                        const taskAssigneeName = task.assigned_to_name || getAssigneeName(task.assigned_to);


                        return (
                            <motion.tr
                                key={task.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                            >
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: '600', color: 'white', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{task.title}</div>
                                    {task.description && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>}
                                </td>
                                <td style={{ padding: '1rem' }}><span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>{taskClientName}</span></td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: `${priorityInfo.color}20`, border: `1px solid ${priorityInfo.color}30`, color: priorityInfo.color }}>
                                        {priorityInfo.label}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', color: isOverdue(task.deadline) && task.status !== 'completed' ? 'rgb(239,68,68)' : 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                                        <Calendar size={16} style={{ marginRight: '0.5rem', color: isOverdue(task.deadline) && task.status !== 'completed' ? 'rgb(239,68,68)' : 'rgba(255,255,255,0.6)' }} />
                                        {formatDate(task.deadline)}
                                        {isOverdue(task.deadline) && task.status !== 'completed' && <AlertTriangle size={16} style={{ marginLeft: '0.5rem', color: 'rgb(239,68,68)' }} />}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: `${statusInfo.color}20`, border: `1px solid ${statusInfo.color}30`, color: statusInfo.color }}>
                                        {statusInfo.label}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                                        <User size={16} style={{ marginRight: '0.5rem', color: 'rgba(255,255,255,0.6)' }} />
                                        {taskAssigneeName}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {task.workflow_name ? <WorkflowIndicator task={task} onViewWorkflow={() => openWorkflowView(task)} /> : <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Sem workflow</span>}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        {task.status !== "completed" && (permissions.isOrgAdmin || permissions.canEditAllTasks || (permissions.canEditAssignedTasks && task.assigned_to === permissions.userId)) && (
                                            <motion.button whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }} onClick={() => onUpdateStatus(task, "completed")} title="Concluir" style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(52,211,153)', cursor: 'pointer' }}><CheckCircle size={16} /></motion.button>
                                        )}
                                        {task.status === "pending" && (permissions.isOrgAdmin || permissions.canEditAllTasks || (permissions.canEditAssignedTasks && task.assigned_to === permissions.userId)) && (
                                            <motion.button whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }} onClick={() => onUpdateStatus(task, "in_progress")} title="Iniciar" style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(59,130,246)', cursor: 'pointer' }}><Clock size={16} /></motion.button>
                                        )}
                                        {(permissions.isOrgAdmin || permissions.canEditAllTasks || (permissions.canEditAssignedTasks && task.assigned_to === permissions.userId)) && (
                                            <motion.button whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }} onClick={() => openFormForEdit(task)} title="Editar" style={{ background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(147,51,234)', cursor: 'pointer' }}><EditIcon size={16} /></motion.button>
                                        )}
                                        {task.workflow_name && <motion.button whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }} onClick={() => openWorkflowView(task)} title="Ver Workflow" style={{ background: 'rgba(251,146,60,0.2)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(251,146,60)', cursor: 'pointer' }}><SettingsIcon size={16} /></motion.button> }
                                        {(permissions.isOrgAdmin || permissions.canLogTimeEntries || (permissions.canLogOwnTimeEntries && task.assigned_to === permissions.userId)) && (
                                            <motion.button whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }} onClick={() => openTimeEntryModal(task)} title="Registar Tempo" style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(52,211,153)', cursor: 'pointer' }}><Clock size={16} /></motion.button>
                                        )}
                                        {(permissions.isOrgAdmin || permissions.canDeleteTasks) && (
                                            <motion.button whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }} onClick={() => onDelete(task.id)} title="Excluir" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(239,68,68)', cursor: 'pointer' }}><Trash2 size={16} /></motion.button>
                                        )}
                                    </div>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default TaskTable;
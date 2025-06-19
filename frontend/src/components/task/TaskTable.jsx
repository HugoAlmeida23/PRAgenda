// src/components/task/TaskTable.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'; // Added useEffect, useRef
import ReactDOM from 'react-dom'; // Import ReactDOM for Portals
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
    background: 'rgba(30, 41, 59, 0.85)', // Darker, less transparent for better readability
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)', // Brighter border
    borderRadius: '8px', // Consistent rounding
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)', // Softer shadow
};


const AssignmentIndicator = ({ task, usersData, onViewDetails }) => {
    const [showDetails, setShowDetails] = useState(false); // Controls if the portal menu is visible
    const buttonRef = useRef(null); // Ref for the trigger button/div
    const menuRef = useRef(null);   // Ref for the menu itself
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, right: 'auto', visible: false });


    const getUserName = (userId) => {
        if (!usersData || !userId) return "Desconhecido";
        // Assuming usersData is an array of profile-like objects where 'user' is the ID and 'username' is the name
        const user = usersData.find(u => (u.user || u.id) === userId); 
        return user ? user.username : "Desconhecido";
    };

    const primaryAssignee = task.assigned_to ? getUserName(task.assigned_to) : null;
    // Ensure collaborators_info exists and is an array before using it
    const collaborators = Array.isArray(task.collaborators_info) ? task.collaborators_info : [];
    
    const workflowAssigneesCount = task.workflow_step_assignments && typeof task.workflow_step_assignments === 'object' ? 
        Object.values(task.workflow_step_assignments).filter(Boolean).length : 0;

    const totalDirectlyAssigned = (task.assigned_to ? 1 : 0) + collaborators.length;
    const hasMultipleAssignments = totalDirectlyAssigned > 1 || (totalDirectlyAssigned === 1 && workflowAssigneesCount > 0) || workflowAssigneesCount > 1;
    
    const totalUsersInvolved = new Set([
        ...(task.assigned_to ? [task.assigned_to] : []),
        // Ensure collaborators contains IDs if it's just IDs, or map to IDs if objects
        ...(collaborators.map(c => c.id || c.user || c)), 
        ...(task.workflow_step_assignments && typeof task.workflow_step_assignments === 'object' ? Object.values(task.workflow_step_assignments).filter(Boolean) : [])
    ]).size;


    const toggleDetailsPopup = (event) => {
        event.stopPropagation();
        if (menuPosition.visible) {
            setMenuPosition({ top: 0, left: 0, right: 'auto', visible: false });
        } else {
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                let top = rect.bottom + window.scrollY + 5;
                const menuWidthEstimate = 280; // Width of your details popup
                const menuHeightEstimate = 150; // Approximate height
                
                let left = rect.left + window.scrollX; 
                // Try to open to the left if not enough space on the right
                if (left + menuWidthEstimate > window.innerWidth - 20) { // 20px buffer
                    left = rect.right + window.scrollX - menuWidthEstimate;
                }
                 if (left < 10) left = 10; // Ensure it's not off-screen left

                if (top + menuHeightEstimate > window.innerHeight + window.scrollY - 20) {
                    top = rect.top + window.scrollY - menuHeightEstimate - 5;
                }
                if (top < 10) top = 10; // Ensure it's not off-screen top


                setMenuPosition({ top, left, right: 'auto', visible: true });
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)) {
                setMenuPosition({ top: 0, left: 0, right: 'auto', visible: false });
            }
        };
        if (menuPosition.visible) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuPosition.visible]);


    if (totalUsersInvolved === 0) {
        // ... (código para "Não atribuída" como antes) ...
        return (
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.875rem' }}>
                <User size={16} style={{ marginRight: '0.5rem' }} />
                Não atribuída
            </div>
        );
    }

    if (!hasMultipleAssignments && primaryAssignee) {
        // ... (código para mostrar só o responsável principal como antes) ...
        return (
            <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                <User size={16} style={{ marginRight: '0.5rem', color: 'rgba(255, 255, 255, 0.6)' }} />
                {primaryAssignee}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }} ref={buttonRef} onClick={e => e.stopPropagation()}>
            <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={toggleDetailsPopup} // Alterado para usar a nova função
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
                <span>{collaborators.length} utilizador(es)</span>
                <ChevronRight 
                    size={14} 
                    style={{ 
                        color: 'rgba(255, 255, 255, 0.6)',
                        transform: menuPosition.visible ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                    }} 
                />
            </motion.div>

            {menuPosition.visible && ReactDOM.createPortal(
                <AnimatePresence>
                    <motion.div
                        ref={menuRef} // Adicionar ref ao menu
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10, transition: {duration: 0.15} }}
                        style={{
                            position: 'absolute',
                            top: `${menuPosition.top}px`,
                            left: menuPosition.left !== 'auto' ? `${menuPosition.left}px` : 'auto',
                            right: menuPosition.right !== 'auto' ? `${menuPosition.right}px` : 'auto',
                            zIndex: 1050, 
                            marginTop: '0.5rem', // Espaçamento do botão, se top for rect.bottom
                            ...glassStyle, // Reutilizar o glassStyle definido no TaskActionsMenu ou globalmente
                            padding: '0.75rem',
                            background: 'rgba(30, 41, 59, 0.98)', 
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            minWidth: '280px', 
                            boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
                        }}
                        onClick={(e) => e.stopPropagation()} 
                    >
                        {/* Conteúdo do pop-up (como antes) */}
                        <div style={{
                            fontSize: '0.75rem', fontWeight: '600', color: 'white',
                            marginBottom: '0.5rem', display: 'flex', alignItems: 'center',
                            gap: '0.25rem', paddingBottom: '0.5rem',
                            borderBottom: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <Users size={12} /> Atribuições da Tarefa
                        </div>

                        {primaryAssignee && (
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.375rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px'}}>
                                <div style={{width: '6px', height: '6px', borderRadius: '50%', background: 'rgb(59, 130, 246)'}} />
                                <span style={{ fontSize: '0.75rem', color: 'white' }}>
                                    <strong>Principal:</strong> {primaryAssignee}
                                </span>
                            </div>
                        )}

                        {collaborators.length > 0 && (
                            <div style={{marginBottom: '0.5rem', padding: '0.375rem', background: 'rgba(147, 51, 234, 0.1)', borderRadius: '4px'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem'}}>
                                    <div style={{width: '6px', height: '6px', borderRadius: '50%', background: 'rgb(147, 51, 234)'}} />
                                    <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: '600' }}>
                                        Colaboradores ({collaborators.length}):
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.8)', marginLeft: '1rem', display: 'flex', flexDirection:'column', gap:'0.2rem' }}>
                                    {collaborators.map(c => <span key={c.id || c.user}>{c.username}</span>)}
                                </div>
                            </div>
                        )}

                        {workflowAssigneesCount > 0 && (
                             <div style={{padding: '0.375rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '4px'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                    <div style={{width: '6px', height: '6px', borderRadius: '50%', background: 'rgb(251, 191, 36)'}} />
                                    <span style={{ fontSize: '0.75rem', color: 'white' }}>
                                        <strong>Workflow:</strong> {workflowAssigneesCount} passo(s) atribuído(s)
                                    </span>
                                </div>
                            </div>
                        )}
                         {totalUsersInvolved === 0 && (
                            <p style={{fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center'}}>Nenhum utilizador atribuído diretamente ou via workflow.</p>
                        )}
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};


const TaskActionsMenu = ({ task, permissions, onEdit, onDelete, onUpdateStatus, onViewWorkflow, onLogTime }) => {
    const [showMenu, setShowMenu] = useState(false);
    const buttonRef = useRef(null); // Ref for the "..." button
    const menuRef = useRef(null);   // Ref for the menu itself
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, right: 'auto', visible: false });

    // --- Permission checks (same as before) ---
    const canEdit = permissions.isOrgAdmin || 
                   permissions.canEditAllTasks || 
                   (permissions.canEditAssignedTasks && task.assigned_to === permissions.userId);
    const canDelete = permissions.isOrgAdmin || permissions.canDeleteTasks;
    const canLogTime = permissions.isOrgAdmin || 
                       permissions.canLogTime /* Assuming a general perm */ || 
                       (permissions.canEditOwnTime && task.assigned_to === permissions.userId); // Or tie to own tasks

    const actions = [];
    if (task.status !== "completed" && canEdit) {
        actions.push({ icon: CheckCircle, label: "Concluir", color: 'rgb(52, 211, 153)', onClick: () => onUpdateStatus(task, "completed") });
    }
    if (task.status === "pending" && canEdit) {
        actions.push({ icon: Clock, label: "Iniciar", color: 'rgb(59, 130, 246)', onClick: () => onUpdateStatus(task, "in_progress") });
    }
    if (canEdit) {
        actions.push({ icon: EditIcon, label: "Editar", color: 'rgb(147, 51, 234)', onClick: () => onEdit(task) });
    }
    if (task.workflow_name) {
        actions.push({ icon: Workflow, label: "Ver Workflow", color: 'rgb(251, 146, 60)', onClick: () => onViewWorkflow(task) });
    }
    if (canLogTime) {
        actions.push({ icon: Clock, label: "Registar Tempo", color: 'rgb(52, 211, 153)', onClick: () => onLogTime(task) });
    }
    if (canDelete) {
        actions.push({ icon: Trash2, label: "Excluir", color: 'rgb(239, 68, 68)', onClick: () => onDelete(task.id) });
    }

    const toggleMenu = (event) => {
        event.stopPropagation(); 
        if (menuPosition.visible) {
            setMenuPosition({ top: 0, left: 0, right: 'auto', visible: false });
        } else {
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                let top = rect.bottom + window.scrollY + 5;
                
                // CALCULAR PARA ABRIR À ESQUERDA
                // Assumimos uma largura de menu (pode ser dinâmica se conseguir medir o menuRef antes de mostrar)
                const menuWidthEstimate = 180; // Ajuste este valor conforme a largura real do seu menu
                let left = rect.left + window.scrollX - menuWidthEstimate + rect.width; // Alinha a borda DIREITA do menu com a borda DIREITA do botão
                let right = 'auto';

                // Opcional: Se for demasiado para a esquerda e sair da tela, alinhe com a borda esquerda da tela
                if (left < 0) {
                    left = 5; // Pequena margem da borda da tela
                }

                // Ajuste para não ir para fora do ecrã no topo (como antes)
                const menuHeightEstimate = actions.length * 35 + 20; 
                if (top + menuHeightEstimate > window.innerHeight + window.scrollY) {
                    top = rect.top + window.scrollY - menuHeightEstimate - 5;
                }

                setMenuPosition({ top, left, right, visible: true });
            }
        }
    };

    // Effect to close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)) {
                setMenuPosition({ top: 0, left: 0, visible: false });
            }
        };
        if (menuPosition.visible) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuPosition.visible]);


    if (actions.length === 0) return null;

    return (
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <motion.button
                ref={buttonRef}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleMenu}
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

            {menuPosition.visible && ReactDOM.createPortal(
                <AnimatePresence>
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10, transition: {duration: 0.15} }}
                        style={{
                            position: 'absolute',
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`,
                            zIndex: 1050, // High z-index
                            ...glassStyle,
                            padding: '0.5rem',
                            background: 'rgba(40, 50, 70, 0.98)', // More opaque for portal
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            minWidth: '180px', // Ensure a minimum width
                            boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
                        }}
                        onClick={e => e.stopPropagation()} // Prevent portal click from closing via body listener
                    >
                        {actions.map((action, index) => (
                            <motion.button
                                key={index}
                                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                                onClick={() => {
                                    action.onClick();
                                    setMenuPosition({ top: 0, left: 0, visible: false }); // Close menu on action
                                }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem', // Increased gap
                                    padding: '0.75rem 1rem', // Increased padding
                                    background: 'none',
                                    border: 'none',
                                    borderRadius: '6px', // Slightly more rounded
                                    color: action.color,
                                    cursor: 'pointer',
                                    fontSize: '0.875rem', // Standardized font size
                                    textAlign: 'left'
                                }}
                            >
                                <action.icon size={16} /> {/* Slightly larger icon */}
                                {action.label}
                            </motion.button>
                        ))}
                    </motion.div>
                </AnimatePresence>,
                document.body // Render portal content into document.body
            )}
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
        openTimeEntryModal // Assuming you'll use this for onLogTime
    } = useTaskStore();

    const getClientName = (clientId) => {
        if (!clientsData || !clientId) return "N/A";
        const client = clientsData.find(c => c.id === clientId);
        return client ? client.name : "Desconhecido";
    };
    
    const handleLogTime = useCallback((task) => {
        openTimeEntryModal(task); // Use the store action
    }, [openTimeEntryModal]);


    const headers = [
        { key: "title", label: "Título" },
        { key: "client_name", label: "Cliente" },
        { key: "priority", label: "Prioridade" },
        { key: "deadline", label: "Prazo" },
        { key: "status", label: "Status" },
        { key: null, label: "Atribuições" },
        { key: null, label: "Workflow" },
        { key: null, label: "Ações" }
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
        <div style={{ overflowX: 'auto' }} className="custom-scrollbar-dark">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' /* Ensure table is wide enough */ }}>
                <thead>
                    {/* ... (thead content remains the same) ... */}
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
                                    minWidth: header.label === 'Atribuições' ? '200px' : (header.label === 'Título' ? '250px' : 'auto')
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
                                <td style={{ padding: '1rem', maxWidth: '250px' }} onClick={() => openFormForEdit(task)}>
                                    <div style={{ 
                                        fontWeight: '600', 
                                        color: 'white', 
                                        fontSize: '0.875rem', 
                                        marginBottom: '0.25rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {task.title}
                                    </div>
                                    {task.description && (
                                        <div style={{ 
                                            color: 'rgba(255,255,255,0.6)', 
                                            fontSize: '0.75rem', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis', 
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical'
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
                                <td style={{ padding: '1rem' }} onClick={() => openFormForEdit(task)}>
                                    <span style={{ 
                                        color: 'rgba(255,255,255,0.8)', 
                                        fontSize: '0.875rem' 
                                    }}>
                                        {taskClientName}
                                    </span>
                                </td>

                                {/* Priority Column */}
                                <td style={{ padding: '1rem' }} onClick={() => openFormForEdit(task)}>
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
                                <td style={{ padding: '1rem' }} onClick={() => openFormForEdit(task)}>
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
                                <td style={{ padding: '1rem' }} onClick={() => openFormForEdit(task)}>
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
                                    />
                                </td>

                                {/* Workflow Column */}
                                <td style={{ padding: '1rem' }}>
                                    <WorkflowIndicator 
                                        task={task} 
                                        onViewWorkflow={openWorkflowView} 
                                    />
                                </td>

                                {/* Actions Column */}
                                <td style={{ padding: '1rem', textAlign: 'center'}} onClick={e => e.stopPropagation()}>
                                    <TaskActionsMenu
                                        task={task}
                                        permissions={permissions}
                                        onEdit={openFormForEdit}
                                        onDelete={onDelete}
                                        onUpdateStatus={onUpdateStatus}
                                        onViewWorkflow={openWorkflowView}
                                        onLogTime={handleLogTime}
                                    />
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
            <style jsx global>{`
                .custom-scrollbar-dark::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar-dark::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 3px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
            `}</style>
        </div>
    );
};

export default TaskTable;
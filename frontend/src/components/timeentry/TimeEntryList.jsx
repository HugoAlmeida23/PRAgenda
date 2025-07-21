// src/components/timeentry/TimeEntryList.jsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronUp, ChevronDown, Copy, Trash2, Loader2 } from 'lucide-react';
import { useTimeEntryStore } from '../../stores/useTimeEntryStore';
import TimeEntryCard from './TimeEntryCard'; // Import the card component

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 200, damping: 20 }
  }
};

const TimeEntryList = ({
    timeEntriesData,
    onDeleteEntry,
    onDuplicateEntry,
    permissions,
    formatMinutesFunc, // Renamed to avoid conflict
    isLoading
}) => {
    const { viewMode, groupBy, filters, setSortConfig } = useTimeEntryStore();

    const handleSort = (field) => {
        setSortConfig(field);
    };

    const displayedEntries = useMemo(() => {
        if (groupBy === 'none' || !timeEntriesData) return { 'Todos os registros': timeEntriesData || [] };
        return (timeEntriesData || []).reduce((groups, entry) => {
            const key = groupBy === 'date' ? entry.date : (entry.client_name || "Sem Cliente");
            if (!groups[key]) groups[key] = [];
            groups[key].push(entry);
            return groups;
        }, {});
    }, [timeEntriesData, groupBy]);

    if (isLoading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <Loader2 size={32} style={{ color: 'rgb(59,130,246)' }} />
                </motion.div>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>Carregando registos...</p>
            </div>
        );
    }

    if (!timeEntriesData || timeEntriesData.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                <Clock size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Nenhum registo encontrado</h4>
                <p style={{ margin: 0 }}>Tente ajustar os filtros ou crie um novo registo.</p>
            </div>
        );
    }

    const tableHeaders = [
        { field: "date", label: "Data" },
        { field: "client_name", label: "Cliente" },
        { field: "task_title", label: "Tarefa" },
        { field: "description", label: "Descrição" },
        { field: "minutes_spent", label: "Tempo" },
    ];
    
    return (
        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                 {/* Header can be simplified or moved to parent if it shows total counts */}
            </div>
             {viewMode === 'list' ? (
                Object.entries(displayedEntries).map(([groupName, entriesInGroup]) => (
                    <div key={groupName}>
                        {groupBy !== 'none' && (
                            <h3 style={{ margin: 0, padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600' }}>
                                {groupName} ({entriesInGroup.length} {entriesInGroup.length === 1 ? 'registo' : 'registos'})
                            </h3>
                        )}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ backgroundColor: groupBy === 'none' ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                                    <tr>
                                        {tableHeaders.map(header => (
                                            <th key={header.field} style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSort(header.field)}
                                                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}>
                                                    {header.label}
                                                    {filters.sortField === header.field ? (filters.sortDirection === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : (<ChevronDown size={16} style={{ opacity: 0.5 }} />)}
                                                </motion.button>
                                            </th>
                                        ))}
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entriesInGroup.map((entry, index) => (
                                        <motion.tr key={entry.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                                            style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{entry.date}</td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{entry.client_name || "N/A"}</td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{entry.task_title || "N/A"}</td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.description}>{entry.description}</td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{formatMinutesFunc(entry.minutes_spent)}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {(permissions.isOrgAdmin || permissions.canEditAllTime || (permissions.canEditOwnTime && entry.user === permissions.userId)) && (
                                                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDeleteEntry(entry.id)} title="Excluir" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(239,68,68)', cursor: 'pointer' }}><Trash2 size={16} /></motion.button>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            ) : ( // Grid View
                Object.entries(displayedEntries).map(([groupName, entriesInGroup]) => (
                    <div key={groupName} style={{ padding: '1.5rem' }}>
                        {groupBy !== 'none' && (
                            <h3 style={{ margin: '0 0 1rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '1rem', fontWeight: '600' }}>
                                {groupName} ({entriesInGroup.length} {entriesInGroup.length === 1 ? 'registo' : 'registos'})
                            </h3>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {entriesInGroup.map((entry) => (
                                <TimeEntryCard key={entry.id} entry={entry} onDelete={onDeleteEntry} onDuplicate={onDuplicateEntry} permissions={permissions} formatMinutes={formatMinutesFunc} />
                            ))}
                        </div>
                    </div>
                ))
            )}
        </motion.div>
    );
};

export default TimeEntryList;
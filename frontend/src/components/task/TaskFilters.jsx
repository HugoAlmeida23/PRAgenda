// src/components/task/TaskFilters.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, RotateCcw, SlidersHorizontal, Activity, Briefcase, Target, UserCheck, Tag as TagIcon } from 'lucide-react';
import { useTaskStore } from '../../stores/useTaskStore';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../pages/TaskManagement'; // Assuming TaskManagement exports these

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

const TaskFilters = ({ clients, users, categories }) => {
    const {
        searchTerm, setSearchTerm,
        filters, setFilter,
        showFiltersPanel, toggleShowFiltersPanel,
        resetFilters
    } = useTaskStore();

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilter(name, value);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    return (
        <motion.div
            variants={itemVariants}
            style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
        >
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
                        <SearchIcon style={{ color: 'rgb(147, 197, 253)' }} size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Pesquisa e Filtros</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>Encontre rapidamente as tarefas que procura</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <motion.button
                        whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                        onClick={toggleShowFiltersPanel}
                        style={{
                            ...glassStyle, padding: '0.75rem 1rem',
                            border: `1px solid rgba(59, 130, 246, ${showFiltersPanel ? 0.6 : 0.3})`,
                            background: `rgba(59, 130, 246, ${showFiltersPanel ? 0.3 : 0.2})`,
                            color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500'
                        }}
                    >
                        <SlidersHorizontal size={16} />
                        {showFiltersPanel ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                        onClick={resetFilters}
                        style={{
                            ...glassStyle, padding: '0.75rem 1rem',
                            border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.2)',
                            color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
                            gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500'
                        }}
                    >
                        <RotateCcw size={16} /> Limpar
                    </motion.button>
                </div>
            </div>

            <div style={{ marginBottom: showFiltersPanel ? '1.5rem' : '0' }}>
                <div style={{ position: 'relative' }}>
                    <SearchIcon size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.5)' }} />
                    <input
                        type="text" placeholder="Pesquisar tarefas por título, descrição, cliente..."
                        value={searchTerm} onChange={handleSearchChange}
                        style={{
                            width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', color: 'white', fontSize: '0.875rem'
                        }}
                    />
                </div>
            </div>

            <AnimatePresence>
                {showFiltersPanel && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}
                    >
                        {[
                            { name: "status", label: "Status", icon: Activity, options: STATUS_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })), data: filters.status },
                            { name: "client", label: "Cliente", icon: Briefcase, options: clients.map(c => ({ value: c.id, label: c.name })), data: filters.client },
                            { name: "priority", label: "Prioridade", icon: Target, options: PRIORITY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })), data: filters.priority },
                            { name: "assignedTo", label: "Atribuída a", icon: UserCheck, options: users.map(u => ({ value: u.user, label: u.username })), data: filters.assignedTo }, // Assuming u.user is the ID
                            { name: "category", label: "Categoria", icon: TagIcon, options: categories.map(cat => ({ value: cat.id, label: cat.name })), data: filters.category }
                        ].map(filterItem => (
                            <div key={filterItem.name}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                                    <filterItem.icon size={16} /> {filterItem.label}
                                </label>
                                <select
                                    name={filterItem.name} value={filterItem.data} onChange={handleFilterChange}
                                    style={{
                                        width: '100%', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: 'white', fontSize: '0.875rem'
                                    }}
                                >
                                    <option value="" style={{ background: '#1f2937', color: 'white' }}>Todos</option>
                                    {filterItem.options.map(option => (
                                        <option key={option.value} value={option.value} style={{ background: '#1f2937', color: 'white' }}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default TaskFilters;
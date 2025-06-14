// src/components/timeentry/TimeEntryListFilters.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, EyeOff, RotateCcw, Grid, List, Users, Calendar as CalendarIcon } from 'lucide-react';
import { useTimeEntryStore } from '../../stores/useTimeEntryStore';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const TimeEntryListFilters = ({ clientsData }) => {
    const {
        filters, setFilter, resetFilters,
        groupBy, setGroupBy,
        viewMode, setViewMode,
    } = useTimeEntryStore();
    const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);

    const handleInputChange = (e) => {
        setFilter(e.target.name, e.target.value);
    };
    
    const handleSearchChange = (e) => {
        setFilter('searchQuery', e.target.value); // Store searchQuery within filters
    };

    return (
        <motion.div
            variants={{ hidden: { y: -20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Filtros e Visualização</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>Ajuste a lista de registros</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}
                >
                    {showAdvancedFilters ? <EyeOff size={20} /> : <Eye size={20} />} Filtros Avançados
                </motion.button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
                        style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                        <option value="none" style={{ background: '#1f2937', color: 'white' }}>Sem Agrupamento</option>
                        <option value="date" style={{ background: '#1f2937', color: 'white' }}>Agrupar por Data</option>
                        <option value="client" style={{ background: '#1f2937', color: 'white' }}>Agrupar por Cliente</option>
                    </select>
                    <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setViewMode('grid')}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: viewMode === 'grid' ? 'rgba(59,130,246,0.3)' : 'transparent', color: 'white' }}>
                            <Grid size={16} /> Cartões
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setViewMode('list')}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: viewMode === 'list' ? 'rgba(59,130,246,0.3)' : 'transparent', color: 'white' }}>
                            <List size={16} /> Tabela
                        </motion.button>
                    </div>
                </div>
                <div style={{ position: 'relative', minWidth: '300px', flexGrow: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                    <input type="text" placeholder="Pesquisar descrição, tarefa..." value={filters.searchQuery} onChange={handleSearchChange}
                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} />
                </div>
            </div>

            <AnimatePresence>
                {showAdvancedFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}
                    >
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}><CalendarIcon size={14}/>Data Início</label>
                            <input type="date" name="startDate" value={filters.startDate} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', fontSize: '0.875rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}><CalendarIcon size={14}/>Data Fim</label>
                            <input type="date" name="endDate" value={filters.endDate} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', fontSize: '0.875rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}><Users size={14}/>Cliente</label>
                            <select name="client" value={filters.client} onChange={handleInputChange} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'white', fontSize: '0.875rem' }}>
                                <option value="" style={{ background: '#1f2937', color: 'white' }}>Todos</option>
                                {clientsData.map(client => (<option key={client.id} value={client.id} style={{ background: '#1f2937', color: 'white' }}>{client.name}</option>))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={resetFilters}
                                style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>Limpar Filtros</motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default TimeEntryListFilters;    
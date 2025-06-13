// src/components/client/ClientFilters.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, EyeOff, Euro, UserCheck, X, Mail } from 'lucide-react';
import { useClientStore } from '../../stores/useClientStore';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
};

const ClientFilters = ({ users }) => { // Still needs users for the dropdown
    const { 
        filters, 
        setFilter, 
        searchTerm, 
        setSearchTerm, 
        showFilters, 
        toggleShowFilters 
    } = useClientStore();  
        
    const handleFilterChange = (e) => {
        const { name, type, checked, value } = e.target;
        const finalValue = type === 'checkbox' ? checked : value === '' ? null : value;
        setFilter(name, finalValue);
    };
    
    return (
        <motion.div
            variants={{ hidden: { y: -20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showFilters ? '1.5rem' : 0 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Filtros e Pesquisa</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>Configure a visualização</p>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleShowFilters}
                    style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}>
                    {showFilters ? <EyeOff size={20} /> : <Eye size={20} />}
                </motion.button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: showFilters ? '1rem' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="active" name="active" checked={filters.active || false} onChange={(e) => setFilter('active', e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    <label htmlFor="active" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Mostrar apenas ativos</label>
                </div>
                <div style={{ position: 'relative', minWidth: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.5)' }} />
                    <input type="text" placeholder="Pesquisar clientes..." value={searchTerm || ''} onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} />
                </div>
            </div>
            
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                    >
                        {/* Filter Sections */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>Email</label>
                                <select name="hasEmail" value={filters.hasEmail === null ? '' : filters.hasEmail}
                                    onChange={(e) => handleFilterChange({ target: { name: 'hasEmail', value: e.target.value === '' ? null : e.target.value === 'true' } })}
                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}>
                                    <option value="">Todos</option><option value="true">Com Email</option><option value="false">Sem Email</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>Telefone</label>
                                <select name="hasPhone" value={filters.hasPhone === null ? '' : filters.hasPhone}
                                    onChange={(e) => handleFilterChange({ target: { name: 'hasPhone', value: e.target.value === '' ? null : e.target.value === 'true' } })}
                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}>
                                    <option value="">Todos</option><option value="true">Com Telefone</option><option value="false">Sem Telefone</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>NIF</label>
                                <select name="hasNif" value={filters.hasNif === null ? '' : filters.hasNif}
                                    onChange={(e) => handleFilterChange({ target: { name: 'hasNif', value: e.target.value === '' ? null : e.target.value === 'true' } })}
                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}>
                                    <option value="">Todos</option><option value="true">Com NIF</option><option value="false">Sem NIF</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>Avença Mensal</label>
                                <select name="hasMonthlyFee" value={filters.hasMonthlyFee === null ? '' : filters.hasMonthlyFee}
                                    onChange={(e) => handleFilterChange({ target: { name: 'hasMonthlyFee', value: e.target.value === '' ? null : e.target.value === 'true' } })}
                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}>
                                    <option value="">Todos</option><option value="true">Com Avença</option><option value="false">Sem Avença</option>
                                </select>
                            </div>
                        </div>

                        {/* Range Filters */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>Avença Mínima (€)</label>
                                <input 
                                    type="number" 
                                    name="minMonthlyFee" 
                                    value={filters.minMonthlyFee || ''} 
                                    onChange={handleFilterChange}
                                    placeholder="0.00"
                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>Avença Máxima (€)</label>
                                <input 
                                    type="number" 
                                    name="maxMonthlyFee" 
                                    value={filters.maxMonthlyFee || ''} 
                                    onChange={handleFilterChange}
                                    placeholder="999999.99"
                                    style={{ width: '100%', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}
                                />
                            </div>
                            {users && users.length > 0 && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '0.25rem' }}>Gestor de Conta</label>
                                    <select name="accountManager" value={filters.accountManager || ''} onChange={handleFilterChange}
                                        style={{ width: '100%', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}>
                                        <option value="">Todos os gestores</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>{user.name || user.email}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ClientFilters;
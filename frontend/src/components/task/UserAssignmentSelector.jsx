// src/components/task/UserAssignmentSelector.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, User, UserPlus, X, Search, Check 
} from 'lucide-react';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px'
};

const UserItem = ({ user, onSelect }) => {
    return (
        <motion.div
            whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
            onClick={onSelect}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem',
            }}
        >
            <span>{user.username} ({user.first_name || 'Utilizador'})</span>
            <UserPlus size={14} />
        </motion.div>
    );
};

const UserAssignmentSelector = ({
    users = [],
    primaryAssignee,
    collaborators = [],
    onPrimaryAssigneeChange,
    onAddCollaborator,
    onRemoveCollaborator,
    mode,
    onModeChange,
    className = ""
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const availableUsersForSelection = useMemo(() => {
        const selectedIds = new Set([
            primaryAssignee, 
            ...collaborators.map(c => c.id || c.user)
        ]);
        
        let available = (users || []).filter(u => !selectedIds.has(u.user || u.id));

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            available = available.filter(u => u.username.toLowerCase().includes(term));
        }
        return available;
    }, [users, primaryAssignee, collaborators, searchTerm]);

    // --- START OF FIX ---
    // This helper function makes the component robust.
    const getUserDisplayName = (collaborator) => {
        if (!collaborator) return 'Desconhecido';
        
        // If collaborator is an object with a username, use it.
        if (typeof collaborator === 'object' && collaborator.username) {
            return collaborator.username;
        }

        // If collaborator is just an ID (string or number), find the full user object.
        const collaboratorId = typeof collaborator === 'object' ? (collaborator.id || collaborator.user) : collaborator;
        const userObject = users.find(u => (u.user || u.id) === collaboratorId);
        
        return userObject ? userObject.username : 'Utilizador';
    };
    // --- END OF FIX ---

    return (
        <div className={className} style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} /> Atribuir a
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <motion.button type="button" whileHover={{ scale: 1.05 }} onClick={() => onModeChange('single')} style={{ ...glassStyle, padding: '0.5rem 0.75rem', fontSize: '0.75rem', background: mode === 'single' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)', border: `1px solid ${mode === 'single' ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.2)'}` }}>
                        <User size={14} style={{ marginRight: '0.25rem', display: 'inline' }} /> Individual
                    </motion.button>
                    <motion.button type="button" whileHover={{ scale: 1.05 }} onClick={() => onModeChange('multiple')} style={{ ...glassStyle, padding: '0.5rem 0.75rem', fontSize: '0.75rem', background: mode === 'multiple' ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)', border: `1px solid ${mode === 'multiple' ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.2)'}` }}>
                        <Users size={14} style={{ marginRight: '0.25rem', display: 'inline' }} /> Múltiplos
                    </motion.button>
                </div>
            </div>

            {mode === 'single' ? (
                <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>Responsável</label>
                    <select value={primaryAssignee || ""} onChange={(e) => onPrimaryAssigneeChange(e.target.value || null)} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                        <option value="" style={{ background: '#1f2937' }}>Ninguém selecionado</option>
                        {(users || []).map(u => <option key={u.user || u.id} value={u.user || u.id} style={{ background: '#1f2937' }}>{u.username}</option>)}
                    </select>
                </div>
            ) : (
                <div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>Colaboradores</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }}/>
                            <input type="text" placeholder="Pesquisar e adicionar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'white' }} />
                        </div>
                        {searchTerm && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(30,40,55,0.95)', borderRadius: '0 0 8px 8px', border: '1px solid rgba(255,255,255,0.2)', borderTop: 'none' }}>
                                {availableUsersForSelection.map(user => (
                                    <UserItem key={user.user || user.id} user={user} onSelect={() => { onAddCollaborator(user); setSearchTerm(''); }} />
                                ))}
                            </motion.div>
                        )}
                    </div>
                    {collaborators.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {collaborators.map((c, index) => ( // Added index for fallback key
                                <motion.div 
                                    key={c.id || c.user || `collab-${index}`} // Robust key
                                    initial={{ opacity: 0, scale: 0.8 }} 
                                    animate={{ opacity: 1, scale: 1 }} 
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', fontSize: '0.8rem' }}
                                >
                                    <User size={12} />
                                    {/* --- USE THE ROBUST HELPER FUNCTION --- */}
                                    {getUserDisplayName(c)}
                                    <motion.button 
                                        type="button" 
                                        onClick={() => onRemoveCollaborator(c.id || c.user)} 
                                        whileHover={{ scale: 1.2, color: '#f87171' }} 
                                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
                                    >
                                        <X size={12} />
                                    </motion.button>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UserAssignmentSelector;
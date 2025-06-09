// FiscalObligationManagement.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import api from "../api";
import FiscalObligationDefinitionDesigner from './FiscalObligationDefinitionDesigner'; // Ajuste o caminho
import { usePermissions } from '../contexts/PermissionsContext'; // Ajuste o caminho


import {
    ListChecks, Plus, Edit3, Trash2, Search, AlertTriangle, RotateCcw,
    ChevronDown, ChevronUp, Info, Package, Brain, Eye, CheckCircle, XCircle,
    Settings, FileText, CalendarDays, GitBranch
} from 'lucide-react';
import BackgroundElements from '../components/HeroSection/BackgroundElements'; // Ajuste o caminho
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 120, damping: 15 } }
};


const FiscalObligationManagement = () => {
    const queryClient = useQueryClient();
    const permissions = usePermissions(); // Supondo que 'canManageFiscalObligations' é uma permissão

    const [showDesigner, setShowDesigner] = useState(false);
    const [editingDefinition, setEditingDefinition] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    const {
        data: definitions = [],
        isLoading,
        isError,
        error,
        refetch
    } = useQuery({
        queryKey: ['fiscalObligationDefinitions'],
        queryFn: () => api.get('/fiscal-obligation-definitions/').then(res => res.data),
        staleTime: 5 * 60 * 1000,
    });

    const mutationOptions = (actionMessage) => ({
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fiscalObligationDefinitions'] });
            toast.success(`Definição fiscal ${actionMessage} com sucesso!`);
            setShowDesigner(false);
            setEditingDefinition(null);
        },
        onError: (err) => {
            console.error("Error:", err);
            toast.error(`Falha ao ${actionMessage.replace(/a$/, 'ar')} definição: ${err.response?.data?.detail || err.message}`);
        }
    });

    const createMutation = useMutation({
        mutationFn: (newData) => api.post('/fiscal-obligation-definitions/', newData),
        ...mutationOptions('criada')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updatedData }) => api.put(`/fiscal-obligation-definitions/${id}/`, updatedData),
        ...mutationOptions('atualizada')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/fiscal-obligation-definitions/${id}/`),
        ...mutationOptions('excluída')
    });

    const handleSave = (data) => {
        if (editingDefinition) {
            updateMutation.mutate({ id: editingDefinition.id, updatedData: data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (definition) => {
        setEditingDefinition(definition);
        setShowDesigner(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta definição fiscal? Tarefas já geradas não serão afetadas, mas novas não serão criadas.')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredAndSortedDefinitions = useMemo(() => {
        let result = [...definitions];
        if (searchTerm) {
            result = result.filter(def =>
                def.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (def.description && def.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        if (sortConfig.key) {
            result.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [definitions, searchTerm, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Simulação de permissões
    const canManage = permissions.isOrgAdmin; // ou permissions.canManageFiscalObligations

    if (isLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <Brain size={48} className="animate-spin text-purple-400" />
            <p className="ml-2 text-lg">Carregando definições fiscais...</p>
        </div>
    );
    if (isError) return (
        <div style={{ ...glassStyle, padding: '2rem', margin: '2rem', textAlign: 'center', color: 'rgb(239,68,68)' }}>
            <AlertTriangle size={48} className="mx-auto mb-2" />
            <p>Erro ao carregar definições: {error.message}</p>
            <button onClick={() => refetch()} style={{ /* ... */ }}>Tentar Novamente</button>
        </div>
    );
    
    if (!canManage && !permissions.loading) { // Adicionar verificação de permissions.loading
         return (
            <div style={{ ...glassStyle, padding: '2rem', margin: '2rem', textAlign: 'center', color: 'rgb(251,191,36)' }}>
                <AlertTriangle size={48} className="mx-auto mb-2" />
                <p>Você não tem permissão para gerir definições fiscais.</p>
            </div>
        );
    }


    const PERIODICITY_LABELS = { MONTHLY: 'Mensal', QUARTERLY: 'Trimestral', ANNUAL: 'Anual', BIANNUAL: 'Semestral', OTHER: 'Outra' };
    const CALCULATION_BASIS_LABELS = { END_OF_PERIOD: 'Fim do Período', SPECIFIC_DATE: 'Data Específica', EVENT_DRIVEN: 'Pós Evento' };


    return (
        <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
            <BackgroundElements businessStatus="optimal" />
            <ToastContainer position="top-right" autoClose={3000} theme="dark" style={{ zIndex: 99999 }} />

            <motion.div
                initial="hidden" animate="visible" variants={containerVariants}
                style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}
            >
                <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Definições de Obrigações Fiscais
                        </h1>
                        <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>Crie e gira os templates para geração automática de tarefas fiscais.</p>
                    </div>
                    {canManage && (
                        <motion.button
                            whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { setEditingDefinition(null); setShowDesigner(prev => !prev); }}
                            style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(59,130,246,0.3)', background: showDesigner ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {showDesigner ? <XCircle size={18} /> : <Plus size={18} />} {showDesigner ? 'Cancelar' : 'Nova Definição'}
                        </motion.button>
                    )}
                </motion.div>

                <AnimatePresence>
                    {showDesigner && canManage && (
                        <motion.div key="designer" variants={itemVariants} style={{ marginBottom: '2rem' }}>
                            <FiscalObligationDefinitionDesigner
                                existingDefinition={editingDefinition}
                                onSave={handleSave}
                                onCancel={() => { setShowDesigner(false); setEditingDefinition(null); }}
                                isSaving={createMutation.isPending || updateMutation.isPending}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {!showDesigner && (
                     <motion.div key="list" variants={itemVariants}>
                        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
                                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                                    <input
                                        type="text" placeholder="Pesquisar definições..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}
                                    />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '0.5rem', backgroundColor: 'rgba(52,211,153,0.2)', borderRadius: '12px' }}><ListChecks style={{ color: 'rgb(52,211,153)' }} size={20} /></div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Definições Criadas</h3>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>{filteredAndSortedDefinitions.length} definições encontradas</p>
                                </div>
                            </div>
                            {filteredAndSortedDefinitions.length === 0 ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                                    <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                    <p>{searchTerm ? "Nenhuma definição encontrada com os filtros aplicados." : "Nenhuma definição fiscal cadastrada. Crie a primeira!"}</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                            <tr>
                                                {['Nome', 'Periodicidade', 'Base Cálculo', 'Prazo', 'Organização', 'Status', 'Ações'].map(header => {
                                                    const keyMap = { 'Nome': 'name', 'Periodicidade': 'periodicity', 'Base Cálculo': 'calculation_basis', 'Prazo': 'deadline_day', 'Organização': 'organization_name', 'Status': 'is_active' };
                                                    const sortKey = keyMap[header];
                                                    return (
                                                        <th key={header} style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>
                                                            {sortKey ? (
                                                                <button onClick={() => handleSort(sortKey)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', padding:0, fontSize: 'inherit', fontWeight: 'inherit' }}>
                                                                    {header}
                                                                    {sortConfig.key === sortKey ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ChevronDown size={14} style={{ opacity: 0.3 }} />}
                                                                </button>
                                                            ) : header}
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAndSortedDefinitions.map((def, index) => (
                                                <motion.tr key={def.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }}
                                                    style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'white' }}>{def.name}</td>
                                                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{PERIODICITY_LABELS[def.periodicity] || def.periodicity}</td>
                                                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{CALCULATION_BASIS_LABELS[def.calculation_basis] || def.calculation_basis}</td>
                                                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>Dia {def.deadline_day}, Offset {def.deadline_month_offset}m</td>
                                                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{def.organization_name || <span style={{color: 'rgb(147,51,234)', fontWeight:'500'}}>Global</span>}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600',
                                                            background: def.is_active ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)',
                                                            border: `1px solid ${def.is_active ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                                            color: def.is_active ? 'rgb(110,231,183)' : 'rgb(252,165,165)'
                                                        }}>
                                                            {def.is_active ? 'Ativa' : 'Inativa'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        {canManage && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleEdit(def)} title="Editar" style={{ background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(147,51,234)', cursor: 'pointer' }}><Edit3 size={16} /></motion.button>
                                                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(def.id)} title="Excluir" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(239,68,68)', cursor: 'pointer' }} disabled={deleteMutation.isPending}><Trash2 size={16} /></motion.button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}


                {/* Painel de Dicas/Informações */}
                 {!showDesigner && (
                    <motion.div 
                        variants={itemVariants} 
                        style={{ ...glassStyle, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', padding: '1.5rem', marginTop: '2rem' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <Info style={{ color: 'rgb(139,194,255)', flexShrink: 0, marginTop: '0.125rem' }} size={20} />
                            <div>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600' }}>
                                    Como Funcionam as Definições Fiscais:
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <li>Crie templates para obrigações fiscais recorrentes (Ex: IVA Trimestral, DMR Mensal).</li>
                                    <li>Defina a periodicidade, regras de cálculo de prazo e a que tipo de clientes se aplica (usando tags).</li>
                                    <li>Associe uma categoria de tarefa, prioridade e workflow padrão para as tarefas geradas.</li>
                                    <li>O sistema irá gerar automaticamente as tarefas para os clientes aplicáveis com base nestas definições.</li>
                                    <li>Use o campo "Template Título da Tarefa" com variáveis como <code>{"{obligation_name}"}</code>, <code>{"{client_name}"}</code>, <code>{"{period_description}"}</code> para títulos dinâmicos.</li>
                                    <li>"Gerar Tarefa X Dias Antes do Deadline" controla a antecedência com que a tarefa aparece no sistema.</li>
                                    <li>Definições globais (sem organização associada) podem ser usadas por todos, enquanto definições de organização são específicas.</li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                 )}
            </motion.div>
        </div>
    );
};

export default FiscalObligationManagement;
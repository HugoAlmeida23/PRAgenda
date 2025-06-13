import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { toast, ToastContainer } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Search, Filter as FilterIcon, Loader2, AlertTriangle, Archive, Settings, Briefcase, Tag as TagIcon, Eye, EyeOff, RotateCcw, HelpCircle, Settings2, Link} from 'lucide-react'; // Added HelpCircle and Settings2
import BackgroundElements from '../../components/HeroSection/BackgroundElements';
import FiscalObligationDefinitionForm from '../../components/fiscal/FiscalObligationDefinitionForm';
import FiscalObligationCard from '../../components/fiscal/FiscalObligationCard'; // Import the new card
import { usePermissions } from '../../contexts/PermissionsContext';

// Glassmorphism style (can be moved to a shared styles file)
const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    color: 'white',
};

const FiscalObligationDefinitionsPage = () => {
    const queryClient = useQueryClient();
    const permissions = usePermissions();

    const [showFormModal, setShowFormModal] = useState(false);
    const [editingDefinition, setEditingDefinition] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        periodicity: '',
        isActive: true, 
        organization_scope: 'all', // 'all', 'global', 'my_org'
    });
    const [showFiltersPanel, setShowFiltersPanel] = useState(true); // Start with filters open

    // Fetch Fiscal Obligation Definitions
    const { data: definitions = [], isLoading, isError, error, refetch } = useQuery({
        queryKey: ['fiscalObligationDefinitions', filters], // Add filters to queryKey
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.periodicity) params.append('periodicity', filters.periodicity);
            if (filters.isActive !== null && filters.isActive !== undefined && filters.isActive !== 'all') {
                 params.append('is_active', filters.isActive);
            }
            // Backend needs to handle organization_scope if we want to filter by global/org-specific on frontend
            // For now, the backend get_queryset handles this based on user permissions.
            // We can add frontend filtering for 'organization_scope' if needed after fetching.
            const response = await api.get(`/fiscal-obligation-definitions/?${params.toString()}`);
            return response.data.results || response.data; 
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch related data for forms
    const { data: taskCategories = [] } = useQuery({
        queryKey: ['taskCategories'],
        queryFn: () => api.get('/task-categories/').then(res => res.data.results || res.data),
        staleTime: Infinity,
    });
    const { data: workflowDefinitions = [] } = useQuery({
        queryKey: ['workflowDefinitions'],
        queryFn: () => api.get('/workflow-definitions/?is_active=true').then(res => res.data.results || res.data),
        staleTime: Infinity,
    });
     const { data: organizations = [] } = useQuery({
        queryKey: ['organizationsList'],
        queryFn: () => api.get('/organizations/').then(res => res.data.results || res.data),
        enabled: permissions.isSuperuser,
        staleTime: Infinity,
    });


    // Mutations (keep as is)
     const createDefinitionMutation = useMutation({
        mutationFn: (newDefinition) => api.post('/fiscal-obligation-definitions/', newDefinition),
        onSuccess: () => {
            toast.success('Definição fiscal criada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['fiscalObligationDefinitions'] });
            setShowFormModal(false);
        },
        onError: (err) => {
            console.error("Error creating definition:", err.response?.data || err.message);
            toast.error(`Falha ao criar: ${err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(', ') || err.message}`);
        }
    });

    const updateDefinitionMutation = useMutation({
        mutationFn: ({ id, updatedData }) => api.put(`/fiscal-obligation-definitions/${id}/`, updatedData),
        onSuccess: () => {
            toast.success('Definição fiscal atualizada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['fiscalObligationDefinitions'] });
            setShowFormModal(false);
            setEditingDefinition(null);
        },
        onError: (err) => {
            console.error("Error updating definition:", err.response?.data || err.message);
            toast.error(`Falha ao atualizar: ${err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(', ') || err.message}`);
        }
    });

    const deleteDefinitionMutation = useMutation({
        mutationFn: (id) => api.delete(`/fiscal-obligation-definitions/${id}/`),
        onSuccess: () => {
            toast.success('Definição fiscal excluída com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['fiscalObligationDefinitions'] });
        },
        onError: (err) => {
            console.error("Error deleting definition:", err.response?.data || err.message);
            toast.error(`Falha ao excluir: ${err.response?.data?.detail || err.message}`);
        }
    });


    const handleOpenCreateForm = () => {
        if (!permissions.isOrgAdmin && !permissions.isSuperuser) {
            toast.warn("Apenas administradores podem criar definições.");
            return;
        }
        setEditingDefinition(null);
        setShowFormModal(true);
    };

    const handleOpenEditForm = (definition) => {
         if (!permissions.isOrgAdmin && !permissions.isSuperuser) {
            toast.warn("Apenas administradores podem editar definições.");
            return;
        }
        setEditingDefinition(definition);
        setShowFormModal(true);
    };

    const handleDeleteDefinition = (id) => {
        if (!permissions.isOrgAdmin && !permissions.isSuperuser) {
            toast.warn("Apenas administradores podem excluir definições.");
            return;
        }
        if (window.confirm('Tem certeza que deseja excluir esta definição fiscal? Tarefas geradas por ela não serão afetadas, mas novas não serão criadas.')) {
            deleteDefinitionMutation.mutate(id);
        }
    };
    
    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (value === 'all' ? null : value)
        }));
    };
    
    const resetFilters = () => {
        setFilters({ periodicity: '', isActive: true, organization_scope: 'all' });
        setSearchTerm('');
    };

    const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  
const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    }
  };
  
    const filteredDefinitions = useMemo(() => {
        if (!definitions) return [];
        let results = definitions;

        // Frontend filter for organization scope (if backend doesn't do it precisely)
        if (filters.organization_scope === 'global') {
            results = results.filter(def => !def.organization_name);
        } else if (filters.organization_scope === 'my_org' && permissions.organizationId) {
            results = results.filter(def => def.organization === permissions.organizationId);
        }
        // 'all' means no scope filtering here, backend handles visibility based on user

        return results.filter(def => 
            def.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (def.description && def.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (def.organization_name && def.organization_name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [definitions, searchTerm, filters.organization_scope, permissions.organizationId]);
    
    const PERIODICITY_OPTIONS = [
        { value: 'MONTHLY', label: 'Mensal' },
        { value: 'QUARTERLY', label: 'Trimestral' },
        { value: 'ANNUAL', label: 'Anual' },
        { value: 'BIANNUAL', label: 'Semestral' },
        { value: 'OTHER', label: 'Outra' },
    ];

    if (isLoading && definitions.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'white' }}>
                <Loader2 size={48} className="animate-spin" />
                <span style={{ marginLeft: '1rem' }}>Carregando definições...</span>
            </div>
        );
    }

    if (isError && definitions.length === 0) { // Show error only if no data was previously loaded
        return (
            <div style={{ ...glassStyle, padding: '2rem', margin: '2rem auto', maxWidth: '600px', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.5)' }}>
                <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
                <h2 style={{ margin: '0 0 1rem 0' }}>Erro ao Carregar Definições</h2>
                <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
                    {error?.response?.data?.detail || error?.message || "Não foi possível carregar os dados."}
                </p>
                <button onClick={() => refetch()} style={{ ...glassStyle, padding: '0.75rem 1.5rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)', cursor: 'pointer', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <RefreshCw size={16}/> Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', color: 'white', minHeight: '100vh', position: 'relative' }}>
            <BackgroundElements />
            <ToastContainer position="top-right" autoClose={3000} theme="dark" />

<motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '2rem',
          paddingTop: '1rem',
        }}
      >
                           <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{ padding: '0.75rem', background: 'rgba(52, 211, 153, 0.2)', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                        <Archive size={28} style={{color: 'rgb(52,211,153)'}}/>
                    </div>
                    <div>
                        <h1 style={{ color: 'rgb(255, 255, 255)',fontSize: '1.8rem', fontWeight: '700', margin: 0 }}>Definições de Obrigações Fiscais</h1>
                        <p style={{ color: 'rgba(191, 219, 254, 1)', margin: 0 }}>
                            Gerir as regras para a geração automática de obrigações fiscais.
                        </p>
                    </div>
                </div>
                 <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {(permissions.isOrgAdmin || permissions.isSuperuser) && (
                        <motion.button
                            onClick={handleOpenCreateForm}
                            whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
                            style={{ ...glassStyle, padding: '0.75rem 1.5rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}
                        >
                            <Plus size={18} /> Nova Definição
                        </motion.button>
                    )}
                </div>
                
            </motion.div>

            {/* Search and Filters */}
            <motion.div style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FilterIcon size={18}/>Filtros e Pesquisa</h3>
                    <button onClick={() => setShowFiltersPanel(!showFiltersPanel)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem' }}>
                        {showFiltersPanel ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flexGrow: 1, minWidth: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                        <input
                            type="text"
                            placeholder="Pesquisar por nome, descrição, organização..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 3rem', ...glassStyle, border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.875rem' }}
                        />
                    </div>
                </div>
                <AnimatePresence>
                    {showFiltersPanel && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}
                        >
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Periodicidade</label>
                                <select name="periodicity" value={filters.periodicity} onChange={handleFilterChange} style={{ width: '100%', padding: '0.75rem', ...glassStyle, border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                                    <option value="">Todas</option>
                                    {PERIODICITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>
                             <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Status</label>
                                <select name="isActive" value={filters.isActive === null ? "all" : String(filters.isActive)} onChange={handleFilterChange} style={{ width: '100%', padding: '0.75rem', ...glassStyle, border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                                    <option value="all">Todos</option>
                                    <option value="true">Ativas</option>
                                    <option value="false">Inativas</option>
                                </select>
                            </div>
                            {permissions.isSuperuser && ( // Only superusers see this filter for now
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Âmbito da Organização</label>
                                    <select name="organization_scope" value={filters.organization_scope} onChange={handleFilterChange} style={{ width: '100%', padding: '0.75rem', ...glassStyle, border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                                        <option value="all">Todas</option>
                                        <option value="global">Globais</option>
                                        <option value="my_org">Minha Organização (se aplicável)</option>
                                    </select>
                                </div>
                            )}
                             <button onClick={resetFilters} style={{ ...glassStyle, padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.25)', cursor: 'pointer', alignSelf: 'end', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
                                <RotateCcw size={16}/> Limpar
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
         

            {/* Definitions List/Grid */}
            {isLoading && filteredDefinitions.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Loader2 size={32} className="animate-spin" /></div>
            ) : filteredDefinitions.length === 0 ? (
                <div style={{ ...glassStyle, padding: '2rem', textAlign: 'center' }}>
                    <Archive size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                    Nenhuma definição fiscal encontrada com os filtros atuais.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
                    {filteredDefinitions.map(def => (
                        <FiscalObligationCard
                            key={def.id}
                            definition={def}
                            onEdit={handleOpenEditForm}
                            onDelete={handleDeleteDefinition}
                            permissions={permissions}
                        />
                    ))}
                </div>
            )}

            {/* Modal Form */}
            <AnimatePresence>
                {showFormModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
                        }}
                        onClick={(e) => { if (e.target === e.currentTarget) { setShowFormModal(false); setEditingDefinition(null); }}}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{ ...glassStyle, width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', background: 'rgba(25, 30, 39, 0.95)' }}
                            className="custom-scrollbar"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
                        >
                            <div style={{padding: '1.5rem'}}>
                                <FiscalObligationDefinitionForm
                                    initialData={editingDefinition}
                                    taskCategories={taskCategories}
                                    workflowDefinitions={workflowDefinitions}
                                    organizations={organizations} // Pass organizations list
                                    isSuperuser={permissions.isSuperuser}
                                    userOrganizationId={permissions.organizationId || null} // Pass user's org ID
                                    onSubmit={(data) => {
                                        if (editingDefinition) {
                                            updateDefinitionMutation.mutate({ id: editingDefinition.id, updatedData: data });
                                        } else {
                                            createDefinitionMutation.mutate(data);
                                        }
                                    }}
                                    onCancel={() => { setShowFormModal(false); setEditingDefinition(null); }}
                                    isLoading={createDefinitionMutation.isPending || updateDefinitionMutation.isPending}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style jsx global>{`
                /* Basic scrollbar for modal content */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.5);
                }
                select option {
                    background: #131722 !important; /* Dark background for options */
                    color: white !important;
                }
            `}</style>
               </motion.div>
        </div>
        
    );
};

export default FiscalObligationDefinitionsPage;
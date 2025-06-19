// src/pages/ReportsPage.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Search, Filter as FilterIcon, RotateCcw, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import BackgroundElements from '../components/HeroSection/BackgroundElements';
import ReportCard from '../components/reports/ReportCard';
import ReportCreationModal from '../components/reports/ReportCreationModal';
import { useReportStore } from '../stores/useReportStore';
import { usePermissions } from '../contexts/PermissionsContext';
import { ToastContainer } from 'react-toastify';
import "../styles/Home.css";

const glassStyle = {
    background: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    color: 'white',
};

const inputStyle = { 
    width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px',
    color: 'white', fontSize: '0.875rem', boxSizing: 'border-box',
};

const labelStyle = {
    display: 'block', fontSize: '0.875rem', fontWeight: '500', 
    marginBottom: '0.5rem', color: 'rgba(255,255,255,0.7)'
};


const ReportsPage = () => {
    const permissions = usePermissions();
    const { 
        generatedReportsFilters, 
        setGeneratedReportsFilter, 
        resetGeneratedReportsFilters,
        openReportCreationModal 
    } = useReportStore();
    
    const [showFiltersPanel, setShowFiltersPanel] = React.useState(false); // Start with filters hidden

    const { data: reportsFromQuery = [], isLoading, isError, error, refetch } = useQuery({ // Renamed to reportsFromQuery
        queryKey: ['generatedReports', generatedReportsFilters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (generatedReportsFilters.report_type) params.append('report_type', generatedReportsFilters.report_type);
            if (generatedReportsFilters.date_from) params.append('created_at__gte', generatedReportsFilters.date_from + 'T00:00:00');
            if (generatedReportsFilters.date_to) params.append('created_at__lte', generatedReportsFilters.date_to + 'T23:59:59');
            if (generatedReportsFilters.search_term) params.append('search', generatedReportsFilters.search_term); // Pass search to backend
            
            const response = await api.get(`/generated-reports/?${params.toString()}`);
            return response.data.results || response.data;
        },
        enabled: permissions.initialized && (permissions.isOrgAdmin || permissions.canViewAnalytics || permissions.canExportReports),
    });

    // Filtered reports for display - This now uses reportsFromQuery
    const filteredReports = React.useMemo(() => {
        if (!reportsFromQuery) return [];
        // If backend handles search, this frontend search might be redundant or a fallback
        if (!generatedReportsFilters.search_term) return reportsFromQuery;
        const term = generatedReportsFilters.search_term.toLowerCase();
        return reportsFromQuery.filter(report => 
            report.name.toLowerCase().includes(term) ||
            (report.description && report.description.toLowerCase().includes(term)) ||
            report.report_type_display.toLowerCase().includes(term)
        );
    }, [reportsFromQuery, generatedReportsFilters.search_term]);
    
    const REPORT_TYPE_CHOICES_FRONTEND = [
        { value: 'client_summary', label: 'Resumo de Cliente(s)' },
        { value: 'profitability_analysis', label: 'Análise de Rentabilidade' },
        { value: 'task_performance', label: 'Performance de Tarefas' }, // NEW
        { value: 'time_tracking_summary', label: 'Resumo de Registo de Tempos' },
        // { value: 'custom_report', label: 'Relatório Personalizado' }, // Keep if you want to show it as "coming soon"
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
    };
    const itemVariants = { hidden: { y: 15, opacity: 0 }, visible: { y: 0, opacity: 1 }};

    if (permissions.loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'white' }}><Loader2 size={48} className="animate-spin" /></div>;
    }

    if (!permissions.isOrgAdmin && !permissions.canViewAnalytics && !permissions.canExportReports) {
        return (
            <div style={{ ...glassStyle, padding: '2rem', margin: '2rem auto', maxWidth: '600px', textAlign: 'center' }}>
                <AlertTriangle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
                <h2>Acesso Restrito</h2>
                <p>Você não tem permissão para visualizar ou gerar relatórios.</p>
            </div>
        );
    }
    
    return (
        <div style={{ padding: '2rem', color: 'white', minHeight: '100vh', position: 'relative' }}>
            <BackgroundElements />
            <ToastContainer position="top-right" autoClose={3000} theme="dark" />

            <motion.div
                initial="hidden" animate="visible"
                variants={containerVariants}
                style={{ position: 'relative', zIndex: 10, maxWidth:'1400px', margin:'0 auto' }}
            >
                <motion.div 
                    variants={itemVariants}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                            <FileText size={28} style={{ color: 'rgb(96, 165, 250)' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0, color: 'white' }}>Central de Relatórios</h1>
                            <p style={{ color: 'rgba(191, 219, 254, 1)', margin: '0.25rem 0 0 0' }}>
                                Aceda e gira os seus relatórios ou crie novos.
                            </p>
                        </div>
                    </div>
                    {(permissions.isOrgAdmin || permissions.canExportReports || permissions.canCreateCustomReports) && (
                        <motion.button
                            onClick={() => openReportCreationModal()} 
                            whileHover={{ scale: 1.05, y: -2, boxShadow: '0 0 20px rgba(52, 211, 153, 0.3)' }} whileTap={{ scale: 0.95 }}
                            style={{ ...glassStyle, padding: '0.75rem 1.5rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}
                        >
                            <Plus size={18} /> Novo Relatório
                        </motion.button>
                    )}
                </motion.div>

                {/* Filters Section */}
                <motion.div 
                    variants={itemVariants}
                    style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FilterIcon size={18}/>Filtros e Pesquisa</h3>
                        <button onClick={() => setShowFiltersPanel(!showFiltersPanel)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '0.5rem' }}>
                            {showFiltersPanel ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <AnimatePresence>
                        {showFiltersPanel && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <div>
                                    <label htmlFor="search_term_report_page" style={labelStyle}>Pesquisar</label>
                                    <div style={{position:'relative'}}>
                                        <Search size={16} style={{position:'absolute', left:'0.75rem', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)'}}/>
                                        <input type="text" id="search_term_report_page" name="search_term" value={generatedReportsFilters.search_term} 
                                           onChange={(e) => setGeneratedReportsFilter('search_term', e.target.value)} 
                                           placeholder="Nome, tipo, descrição..." style={{...inputStyle, paddingLeft:'2.5rem'}} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="report_type_filter_page" style={labelStyle}>Tipo de Relatório</label>
                                    <select id="report_type_filter_page" name="report_type" value={generatedReportsFilters.report_type} 
                                            onChange={(e) => setGeneratedReportsFilter('report_type', e.target.value)} style={inputStyle}>
                                        <option value="">Todos os Tipos</option>
                                        {REPORT_TYPE_CHOICES_FRONTEND.map(opt => <option key={opt.value} value={opt.value} style={{ background: '#0f172a', color: '#e2e8f0' }}>{opt.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="date_from_filter_page" style={labelStyle}>Gerado Desde</label>
                                    <input type="date" id="date_from_filter_page" name="date_from" value={generatedReportsFilters.date_from} 
                                           onChange={(e) => setGeneratedReportsFilter('date_from', e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label htmlFor="date_to_filter_page" style={labelStyle}>Gerado Até</label>
                                    <input type="date" id="date_to_filter_page" name="date_to" value={generatedReportsFilters.date_to} 
                                           onChange={(e) => setGeneratedReportsFilter('date_to', e.target.value)} style={inputStyle} />
                                </div>
                                <div style={{alignSelf: 'flex-end'}}>
                                <button onClick={resetGeneratedReportsFilters} style={{ ...inputStyle, width:'100%', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.25)', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', fontWeight:'500' }}>
                                    <RotateCcw size={16}/> Limpar
                                </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Reports Grid/List */}
                {isLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader2 size={36} className="animate-spin" /></div>
                ) : isError ? (
                     <div style={{ ...glassStyle, padding: '2rem', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.5)' }}>
                        <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
                        <h2 style={{ margin: '0 0 1rem 0' }}>Erro ao Carregar Relatórios</h2>
                        <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
                            {error?.response?.data?.detail || error?.message || "Não foi possível carregar os dados."}
                        </p>
                     </div>
                ) : filteredReports.length === 0 ? ( // Use filteredReports here
                    <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '3rem', textAlign: 'center' }}>
                        <FileText size={48} style={{ opacity: 0.4, marginBottom: '1rem', color:'rgba(255,255,255,0.5)' }} />
                        <h3 style={{margin: '0 0 0.5rem 0', color:'rgba(255,255,255,0.8)'}}>Nenhum relatório encontrado.</h3>
                        <p style={{margin:0, color:'rgba(255,255,255,0.6)'}}>Tente ajustar os filtros ou gere um novo relatório.</p>
                    </motion.div>
                ) : (
                    <motion.div 
                        variants={containerVariants} initial="hidden" animate="visible"
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}
                    >
                        {filteredReports.map(report => ( // Use filteredReports here
                            <ReportCard key={report.id} report={report} />
                        ))}
                    </motion.div>
                )}
            </motion.div>
            
            {/* Modal de criação de relatórios */}
            <ReportCreationModal />
            
             <style jsx global>{`
                select option {
                    background: #0f172a !important; 
                    color: #e2e8f0 !important;
                }
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 4px; }
                ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
            `}</style>
        </div>
    );
};

export default ReportsPage;
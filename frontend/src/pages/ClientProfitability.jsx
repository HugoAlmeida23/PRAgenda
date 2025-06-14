import React, { useState, useMemo, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, Clock, Calendar, PieChart, Users, AlertTriangle,
  ChevronDown, ChevronUp, Download, RefreshCw, Loader2, CreditCard,
  Filter, Search, Eye, EyeOff, Sparkles, Brain, Target, Activity,
  BarChart3, TrendingDown, ExternalLink
} from "lucide-react";
import { usePermissions } from "../contexts/PermissionsContext";
import BackgroundElements from "../components/HeroSection/BackgroundElements";

const MONTHS = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" }, { value: 4, label: "Abril" },
  { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" }, { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const formatCurrency = (value) => {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value || 0);
};

const formatPercentage = (value) => {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return "0.00%";
  return `${numValue.toFixed(2)}%`;
};

const formatTime = (minutes) => {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return "0h 0m";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

const fetchProfitabilityData = async ({ queryKey }) => {
  const [_key, year, month, filters] = queryKey;
  if (!year || !month) throw new Error("Ano e mês são obrigatórios");

  const params = new URLSearchParams();
  params.append('year', year);
  params.append('month', month);
  if (filters.client) params.append('client', filters.client);
  if (filters.profitableOnly && !filters.unprofitableOnly) params.append('is_profitable', 'true');
  else if (!filters.profitableOnly && filters.unprofitableOnly) params.append('is_profitable', 'false');
  if (filters.searchTerm) params.append('search', filters.searchTerm); // Backend needs to support search

  // Add sorting to backend query if implemented
  // if (filters.sortConfig.key) params.append('ordering', `${filters.sortConfig.direction === 'desc' ? '-' : ''}${filters.sortConfig.key}`);

  const response = await api.get(`/client-profitability/?${params.toString()}`);
  return response.data.results || response.data || [];
};

const fetchClientsForFilter = async () => {
  const response = await api.get("/clients/?is_active=true");
  return response.data.results || response.data || [];
};

const glassStyle = {
  background: 'rgba(0, 0, 0, 0.1)', // Adjusted for potentially light theme
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px'
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

const ErrorView = ({ message, onRetry }) => (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', textAlign: 'center', color: 'white' }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...glassStyle, padding: '2rem', maxWidth: '500px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Ocorreu um erro!</h2>
        <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>{message || 'Falha ao carregar dados.'}</p>
        {onRetry && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onRetry}
            style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.2)', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500', marginTop: '1rem' }}>
            <RotateCcw size={18} /> Tentar novamente
          </motion.button>
        )}
      </motion.div>
    </div>
  );

const ClientProfitability = () => {
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [sortConfig, setSortConfig] = useState({ key: "profit_margin", direction: "desc" });
  const [filters, setFilters] = useState({
    client: "",
    profitableOnly: false,
    unprofitableOnly: false,
    searchTerm: "",
  });
  const [expandedClients, setExpandedClients] = useState({});
  const [showFilters, setShowFilters] = useState(true);

  const canViewPage = useMemo(() => {
    if (permissions.loading) return false;
    return permissions.isOrgAdmin ||
      permissions.canViewProfitability ||
      permissions.canViewTeamProfitability ||
      permissions.canViewOrganizationProfitability;
  }, [permissions]);

  const {
    data: profitabilityData = [],
    isLoading: isProfitabilityLoading,
    isFetching: isProfitabilityFetching,
    isError: isProfitabilityError,
    error: profitabilityError,
    refetch: refetchProfitabilityData,
  } = useQuery({
    queryKey: ['clientProfitability', selectedYear, selectedMonth, filters],
    queryFn: fetchProfitabilityData,
    staleTime: 5 * 60 * 1000,
    enabled: canViewPage && !permissions.loading,
    keepPreviousData: true,
  });

  const {
    data: clientsList = [],
    isLoading: isClientsLoading,
    isError: isClientsError,
  } = useQuery({
    queryKey: ['clientsForProfitabilityFilter'],
    queryFn: fetchClientsForFilter,
    staleTime: 15 * 60 * 1000,
    enabled: canViewPage && !permissions.loading,
  });

  const isInitialPageLoading = permissions.loading || (isClientsLoading && !clientsList.length);
  
  const processedData = useMemo(() => {
    let dataToProcess = profitabilityData; // Already filtered by backend via queryKey change
    if (sortConfig.key) {
      dataToProcess.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'string' && !isNaN(parseFloat(valA))) valA = parseFloat(valA);
        if (typeof valB === 'string' && !isNaN(parseFloat(valB))) valB = parseFloat(valB);
        if (typeof valA === 'number' && typeof valB === 'number') {
            return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
            return sortConfig.direction === "asc" 
                ? valA.localeCompare(valB) 
                : valB.localeCompare(valA);
        }
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return dataToProcess;
  }, [profitabilityData, sortConfig]);

  const summaryStats = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return { totalClients: 0, profitableClients: 0, unprofitableClients: 0, averageMargin: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 };
    }
    const totalClients = processedData.length;
    const profitableClients = processedData.filter(item => item.is_profitable).length;
    const unprofitableClients = totalClients - profitableClients;
    const totalRevenue = processedData.reduce((sum, item) => sum + (parseFloat(item.monthly_fee) || 0), 0);
    const totalCost = processedData.reduce((sum, item) => sum + (parseFloat(item.time_cost) || 0) + (parseFloat(item.total_expenses) || 0), 0);
    const totalProfit = processedData.reduce((sum, item) => sum + (parseFloat(item.profit) || 0), 0);
    const margins = processedData.map(item => parseFloat(item.profit_margin)).filter(margin => !isNaN(margin));
    const averageMargin = margins.length > 0 ? margins.reduce((sum, margin) => sum + margin, 0) / margins.length : 0;
    return { totalClients, profitableClients, unprofitableClients, averageMargin, totalRevenue, totalCost, totalProfit };
  }, [processedData]);

  const recalculateProfitabilityMutation = useMutation({
    mutationFn: async (monthsBack = 1) => { 
      const response = await api.post('/update-profitability/', { months_back: monthsBack });
      return response.data;
    },
    onSuccess: (data) => {
      toast.info(data.message || `Recálculo de rentabilidade iniciado! Os dados serão atualizados em breve.`);
      queryClient.invalidateQueries({ queryKey: ['clientProfitability', selectedYear, selectedMonth, filters] }); // To show new data after refetch
      setTimeout(() => {
        toast.info("A tentar atualizar os dados de rentabilidade...");
        refetchProfitabilityData();
      }, 15000); // 15 seconds delay
    },
    onError: (error) => {
      toast.error(`Falha ao iniciar recálculo: ${error.response?.data?.error || error.message}`);
    },
  });
  const isRecalculating = recalculateProfitabilityMutation.isPending;

  const handleFilterChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }, []);
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc" }));
  }, []);
  const resetFilters = useCallback(() => { setFilters({ client: "", profitableOnly: false, unprofitableOnly: false, searchTerm: "" }); }, []);
  const toggleClientDetails = useCallback((clientId) => { setExpandedClients(prev => ({ ...prev, [clientId]: !prev[clientId] })); }, []);
  const handleRecalculateAndRefresh = useCallback(() => { recalculateProfitabilityMutation.mutate(2); }, [recalculateProfitabilityMutation]);
  const generateExcelReport = async () => { /* ... (implementation as before) ... */ };

  if (permissions.loading) {
    return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 size={48} className="animate-spin" /></div>);
  }
  if (!canViewPage && !permissions.loading) {
    return (<ErrorView message="Acesso restrito à página de rentabilidade." />);
  }
  if (isInitialPageLoading && !profitabilityData.length && !clientsList.length) {
     return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Loader2 size={48} className="animate-spin" /></div>);
  }
  if ((isProfitabilityError && !profitabilityData.length) || (isClientsError && !clientsList.length)) {
    return <ErrorView message={profitabilityError?.message || "Falha ao carregar dados essenciais."} onRetry={() => { refetchProfitabilityData(); queryClient.invalidateQueries(['clientsForProfitabilityFilter']); }} />;
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
      <BackgroundElements />
      <ToastContainer position="top-right" autoClose={4000} theme="dark" />

      <motion.div
        initial="hidden" animate="visible" variants={containerVariants}
        style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}
      >
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Análise de Rentabilidade
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>
              Insights inteligentes sobre a performance dos seus clientes
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {permissions.isOrgAdmin && (
                <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={handleRecalculateAndRefresh} disabled={isRecalculating || isProfitabilityFetching} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(52, 211, 153, 0.3)', background: 'rgba(52, 211, 153, 0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    {isRecalculating ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    {isRecalculating ? 'Recalculando...' : 'Recalcular & Atualizar'}
                </motion.button>
            )}
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={generateExcelReport} disabled={isProfitabilityFetching || !processedData.length} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              <Download size={18} /> Exportar Relatório
            </motion.button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <motion.div animate={{rotate: [0, 360], scale: [1, 1.1, 1]}} transition={{rotate: { duration: 8, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity }}} style={{ padding: '0.5rem', backgroundColor: 'rgba(147, 51, 234, 0.2)', borderRadius: '12px' }}>
                    <Calendar style={{ color: 'rgb(196, 181, 253)' }} size={20} />
                </motion.div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Período e Filtros</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>Configure a análise</p>
                </div>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowFilters(!showFilters)} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.7)', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px' }}>
                {showFilters ? <EyeOff size={20} /> : <Eye size={20} />}
            </motion.button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>Ano</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                {YEARS.map(year => <option key={year} value={year} style={{ background: '#1f2937', color: 'white' }}>{year}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>Mês</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                {MONTHS.map(month => <option key={month.value} value={month.value} style={{ background: '#1f2937', color: 'white' }}>{month.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>Buscar Cliente</label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.5)' }} />
                <input type="text" name="searchTerm" value={filters.searchTerm} onChange={handleFilterChange} placeholder="Digite o nome..." style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} />
              </div>
            </div>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="profitableOnly" name="profitableOnly" checked={filters.profitableOnly} onChange={handleFilterChange} style={{ width: '18px', height: '18px' }} />
                  <label htmlFor="profitableOnly" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Apenas Rentáveis</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="unprofitableOnly" name="unprofitableOnly" checked={filters.unprofitableOnly} onChange={handleFilterChange} style={{ width: '18px', height: '18px' }} />
                  <label htmlFor="unprofitableOnly" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Apenas Não Rentáveis</label>
                </div>
                <select name="client" value={filters.client} onChange={handleFilterChange} style={{ padding: '0.5rem 1rem', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', minWidth: '150px' }}>
                  <option value="" style={{ background: '#1f2937', color: 'white' }}>Todos Clientes</option>
                  {clientsList.map(client => <option key={client.id} value={client.id} style={{ background: '#1f2937', color: 'white' }}>{client.name}</option>)}
                </select>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={resetFilters} style={{ padding: '0.5rem 1rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}>
                  Limpar Filtros
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Summary Stats Cards */}
        <motion.div variants={itemVariants} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Total Revenue Card */}
          <motion.div whileHover={{ scale: 1.02, y: -5 }} style={{ ...glassStyle, padding: '1.5rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(52, 211, 153, 0.2)', borderRadius: '12px', marginRight: '1rem' }}>
                    <DollarSign size={24} style={{ color: 'rgb(52, 211, 153)' }} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Receita Total</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: 'rgb(52, 211, 153)' }}>{formatCurrency(summaryStats.totalRevenue)}</p>
                </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>De {summaryStats.totalClients} clientes</p>
          </motion.div>

          {/* Total Profit Card */}
          <motion.div whileHover={{ scale: 1.02, y: -5 }} style={{ ...glassStyle, padding: '1.5rem', background: summaryStats.totalProfit >= 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: summaryStats.totalProfit >= 0 ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)' }}>
             <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: summaryStats.totalProfit >= 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)', borderRadius: '12px', marginRight: '1rem' }}>
                    {summaryStats.totalProfit >= 0 ? <TrendingUp size={24} style={{ color: 'rgb(59, 130, 246)' }} /> : <TrendingDown size={24} style={{ color: 'rgb(239, 68, 68)' }} />}
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Lucro Total</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: summaryStats.totalProfit >= 0 ? 'rgb(59, 130, 246)' : 'rgb(239, 68, 68)' }}>{formatCurrency(summaryStats.totalProfit)}</p>
                </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Custos: {formatCurrency(summaryStats.totalCost)}</p>
          </motion.div>

          {/* Average Margin Card */}
          <motion.div whileHover={{ scale: 1.02, y: -5 }} style={{ ...glassStyle, padding: '1.5rem', background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(147, 51, 234, 0.2)', borderRadius: '12px', marginRight: '1rem' }}>
                    <PieChart size={24} style={{ color: 'rgb(147, 51, 234)' }} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Margem Média</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: 'rgb(147, 51, 234)' }}>{formatPercentage(summaryStats.averageMargin)}</p>
                </div>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px', overflow: 'hidden' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, summaryStats.averageMargin))}%` }} transition={{ duration: 1, ease: "easeOut" }} style={{ height: '100%', background: 'linear-gradient(to right, rgb(147, 51, 234), rgb(196, 181, 253))', borderRadius: '2px' }} />
            </div>
          </motion.div>

          {/* Client Status Card */}
          <motion.div whileHover={{ scale: 1.02, y: -5 }} style={{ ...glassStyle, padding: '1.5rem', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(251, 191, 36, 0.2)', borderRadius: '12px', marginRight: '1rem' }}>
                    <Users size={24} style={{ color: 'rgb(251, 191, 36)' }} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Status dos Clientes</h3>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: 'rgb(251, 191, 36)' }}>{summaryStats.totalClients}</p>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '8px', height: '8px', backgroundColor: 'rgb(52, 211, 153)', borderRadius: '50%' }} /> <span style={{ color: 'rgba(255,255,255,0.8)'}}>{summaryStats.profitableClients} Rentáveis</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '8px', height: '8px', backgroundColor: 'rgb(239, 68, 68)', borderRadius: '50%' }} /> <span style={{ color: 'rgba(255,255,255,0.8)'}}>{summaryStats.unprofitableClients} Não Rentáveis</span></div>
            </div>
          </motion.div>
        </motion.div>
        
        {/* AI Insights (simplified) */}
        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem', background: 'rgba(147, 51, 234, 0.05)', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <motion.div animate={{rotate: [0, 360], scale: [1, 1.1, 1]}} transition={{rotate: { duration: 8, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity }}} style={{ padding: '0.5rem', backgroundColor: 'rgba(147, 51, 234, 0.2)', borderRadius: '12px' }}>
                <Brain style={{ color: 'rgb(196, 181, 253)' }} size={20} />
            </motion.div>
            <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>AI Insights</h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>Análise inteligente dos seus dados</p>
            </div>
            <Sparkles style={{ color: 'rgb(196, 181, 253)', marginLeft: 'auto' }} size={16} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {summaryStats.unprofitableClients > 0 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertTriangle size={20} style={{ color: 'rgb(239, 68, 68)', marginTop: '0.25rem', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>Clientes Não Rentáveis Detectados</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>{summaryStats.unprofitableClients} clientes estão gerando prejuízo. Considere revisar preços ou otimizar processos.</p>
                </div>
              </motion.div>
            )}
             {summaryStats.averageMargin > 30 && summaryStats.totalClients > 0 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} style={{ padding: '1rem', backgroundColor: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Target size={20} style={{ color: 'rgb(52, 211, 153)', marginTop: '0.25rem', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>Excelente Performance</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Margem de lucro média de {formatPercentage(summaryStats.averageMargin)}! Operação eficiente.</p>
                </div>
              </motion.div>
            )}
             {summaryStats.totalClients > 0 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <BarChart3 size={20} style={{ color: 'rgb(59, 130, 246)', marginTop: '0.25rem', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>Oportunidade de Crescimento</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>Com {summaryStats.profitableClients} clientes rentáveis, há potencial para escalar os serviços mais lucrativos.</p>
                </div>
              </motion.div>
            )}
            {summaryStats.totalClients === 0 && !isProfitabilityLoading && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', textAlign:'center' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Sem dados para apresentar insights. Selecione outro período ou verifique os filtros.</p>
                 </motion.div>
            )}
          </div>
        </motion.div>

        {/* Detailed Table */}
        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
                        <Activity style={{ color: 'rgb(59, 130, 246)' }} size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Análise Detalhada por Cliente</h3>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>{processedData.length} clientes encontrados</p>
                    </div>
                </div>
            </div>

            {isProfitabilityLoading && processedData.length === 0 ? ( // Show loader only if no data is already displayed
                <div style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={32} style={{ color: 'rgb(59, 130, 246)' }} className="animate-spin" />
                    <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)' }}>Carregando dados...</p>
                </div>
            ) : !processedData.length ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)' }}>
                    <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Nenhum cliente encontrado</h4>
                    <p style={{ margin: 0 }}>Ajuste os filtros ou período para ver os dados.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                                {['client_name', 'monthly_fee', 'time_cost', 'profit', 'profit_margin'].map(key => (
                                    <th key={key} style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
                                        <motion.button onClick={() => handleSort(key)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}>
                                            { {client_name: 'Cliente', monthly_fee: 'Receita', time_cost: 'Custos', profit: 'Lucro', profit_margin: 'Margem'}[key] }
                                            {sortConfig.key === key ? (sortConfig.direction === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : <ChevronDown size={16} style={{ opacity: 0.3 }} />}
                                        </motion.button>
                                    </th>
                                ))}
                                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedData.map((item, index) => (
                                <React.Fragment key={item.client}> {/* Assuming item.client is unique ID */}
                                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} style={{ backgroundColor: item.is_profitable ? 'rgba(52, 211, 153, 0.05)' : 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: item.is_profitable ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>{item.client_name.substring(0, 2).toUpperCase()}</div>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: '600', color: 'white', fontSize: '0.875rem' }}>{item.client_name}</p>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>{formatTime(item.total_time_minutes)} investidas</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}><span style={{ color: 'rgb(52, 211, 153)', fontWeight: '600'}}>{formatCurrency(item.monthly_fee)}</span></td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}><span style={{ color: 'rgb(251, 146, 60)', fontWeight: '600'}}>{formatCurrency((parseFloat(item.time_cost) || 0) + (parseFloat(item.total_expenses) || 0))}</span></td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem' }}><span style={{ fontWeight: '700', color: (parseFloat(item.profit) || 0) >= 0 ? 'rgb(52, 211, 153)' : 'rgb(239, 68, 68)' }}>{formatCurrency(item.profit)}</span></td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: (parseFloat(item.profit_margin) || 0) >= 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)', border: (parseFloat(item.profit_margin) || 0) >= 0 ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', color: (parseFloat(item.profit_margin) || 0) >= 0 ? 'rgb(110, 231, 183)' : 'rgb(252, 165, 165)' }}>{formatPercentage(item.profit_margin)}</div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', gap: '0.5rem', backgroundColor: item.is_profitable ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)', border: item.is_profitable ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', color: item.is_profitable ? 'rgb(110, 231, 183)' : 'rgb(252, 165, 165)' }}>
                                                {item.is_profitable ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {item.is_profitable ? "Rentável" : "Não Rentável"}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => toggleClientDetails(item.client)} style={{ ...glassStyle, padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.3)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '500' }}>
                                                {expandedClients[item.client] ? <><ChevronUp size={14} />Menos</> : <><ChevronDown size={14} />Detalhes</>}
                                            </motion.button>
                                        </td>
                                    </motion.tr>
                                    <AnimatePresence>
                                        {expandedClients[item.client] && (
                                            <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                                                <td colSpan="7" style={{ padding: 0, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                                    <div style={{ padding: '1.5rem' }}>
                                                        <div style={{ ...glassStyle, padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)' }}>
                                                            <h4 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: '600', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                <div style={{ width: '4px', height: '24px', background: 'linear-gradient(to bottom, rgb(59, 130, 246), rgb(147, 51, 234))', borderRadius: '2px' }} />
                                                                Análise Detalhada: {item.client_name}
                                                            </h4>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                                                {/* Time Analysis */}
                                                                <div style={{ ...glassStyle, padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}><Clock size={18} style={{ color: 'rgb(59, 130, 246)' }} /><h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>Análise de Tempo</h5></div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)'}}><span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)'}}>Total de Horas:</span><span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white'}}>{formatTime(item.total_time_minutes)}</span></div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)'}}><span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)'}}>Custo por Hora:</span><span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white'}}>{formatCurrency(item.total_time_minutes > 0 ? (parseFloat(item.time_cost) || 0) / (item.total_time_minutes / 60) : 0)}</span></div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)'}}>Última Atualização:</span><span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white'}}>{new Date(item.last_updated).toLocaleDateString('pt-PT')}</span></div>
                                                                    </div>
                                                                </div>
                                                                {/* Financial Breakdown */}
                                                                <div style={{ ...glassStyle, padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}><CreditCard size={18} style={{ color: 'rgb(52, 211, 153)' }} /><h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>Breakdown Financeiro</h5></div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)'}}><span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)'}}>Receita Mensal:</span><span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'rgb(52, 211, 153)'}}>{formatCurrency(item.monthly_fee)}</span></div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)'}}><span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)'}}>Custos Totais:</span><span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'rgb(251, 146, 60)'}}>{formatCurrency((parseFloat(item.time_cost) || 0) + (parseFloat(item.total_expenses) || 0))}</span></div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.5rem 0.75rem'}}><span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'white'}}>Lucro Final:</span><span style={{ fontSize: '1rem', fontWeight: '700', color: (parseFloat(item.profit) || 0) >= 0 ? 'rgb(52, 211, 153)' : 'rgb(239, 68, 68)'}}>{formatCurrency(item.profit)}</span></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* AI Recommendations */}
                                                            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} style={{ ...glassStyle, padding: '1rem', background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}><Brain size={18} style={{ color: 'rgb(196, 181, 253)' }} /><h5 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>Recomendações Inteligentes</h5><Sparkles size={14} style={{ color: 'rgb(196, 181, 253)' }}/></div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                                {!item.is_profitable ? (
                                                                    <>
                                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                                                        <AlertTriangle size={16} style={{ color: 'rgb(239, 68, 68)', marginTop: '0.125rem', flexShrink: 0 }} />
                                                                        <div><p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', fontWeight: '600', color: 'white' }}>Cliente Não Rentável</p><p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)'}}>Considere aumentar a avença ou otimizar processos para reduzir tempo gasto.</p></div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                                        <Target size={16} style={{ color: 'rgb(59, 130, 246)', marginTop: '0.125rem', flexShrink: 0 }} />
                                                                        <div><p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', fontWeight: '600', color: 'white' }}>Sugestão de Melhoria</p><p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)'}}>Avença sugerida: {formatCurrency(((parseFloat(item.time_cost) || 0) + (parseFloat(item.total_expenses) || 0)) * 1.3)} (margem de 30%)</p></div>
                                                                    </div>
                                                                    </>
                                                                ) : (
                                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                                                        <Target size={16} style={{ color: 'rgb(52, 211, 153)', marginTop: '0.125rem', flexShrink: 0 }} />
                                                                        <div><p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', fontWeight: '600', color: 'white' }}>Cliente Rentável</p><p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)'}}>Ótima performance! Considere expandir os serviços para este cliente.</p></div>
                                                                    </div>
                                                                )}
                                                                </div>
                                                            </motion.div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </motion.div>

        {/* Final Insights: Top/Problematic Clients */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
            <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}><TrendingUp size={20} style={{ color: 'rgb(52, 211, 153)' }} /><h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'white' }}>Top Clientes Rentáveis</h3></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {processedData.filter(item => item.is_profitable).sort((a, b) => (parseFloat(b.profit_margin) || 0) - (parseFloat(a.profit_margin) || 0)).slice(0, 3).map((item, index) => (
                        <motion.div key={item.client} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '600', color: 'white' }}>#{index + 1}</div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '600', color: 'white', fontSize: '0.875rem' }}>{item.client_name}</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{formatCurrency(item.monthly_fee)} receita</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ margin: 0, fontWeight: '700', color: 'rgb(52, 211, 153)', fontSize: '0.875rem' }}>{formatPercentage(item.profit_margin)}</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>margem</p>
                            </div>
                        </motion.div>
                    ))}
                    {processedData.filter(item => item.is_profitable).length === 0 && <div style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255,255,255,0.6)' }}><TrendingUp size={28} style={{ opacity:0.5, marginBottom:'0.5rem' }}/><p style={{margin:0, fontSize:'0.875rem'}}>Nenhum cliente rentável neste período.</p></div>}
                </div>
            </motion.div>
            <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}><AlertTriangle size={20} style={{ color: 'rgb(239, 68, 68)' }} /><h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'white' }}>Clientes Críticos</h3></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {processedData.filter(item => !item.is_profitable).sort((a, b) => (parseFloat(a.profit_margin) || 0) - (parseFloat(b.profit_margin) || 0)).slice(0, 3).map((item, index) => (
                        <motion.div key={item.client} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '600', color: 'white' }}>!</div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '600', color: 'white', fontSize: '0.875rem' }}>{item.client_name}</p>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{formatTime(item.total_time_minutes)} investidas</p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ margin: 0, fontWeight: '700', color: 'rgb(239, 68, 68)', fontSize: '0.875rem' }}>{formatPercentage(item.profit_margin)}</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>margem</p>
                            </div>
                        </motion.div>
                    ))}
                    {processedData.filter(item => !item.is_profitable).length === 0 && <div style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255,255,255,0.6)' }}><Target size={28} style={{ opacity:0.5, marginBottom:'0.5rem', color: 'rgb(52, 211, 153)' }}/><p style={{margin:0, fontSize:'0.875rem'}}>Excelente! Nenhum cliente crítico.</p></div>}
                </div>
            </motion.div>
        </div>

      </motion.div>

      {/* FAB */}
      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1, type: "spring", stiffness: 200 }} style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
        <motion.button whileHover={{ scale: 1.1, boxShadow: '0 0 30px rgba(147, 51, 234, 0.5)' }} whileTap={{ scale: 0.9 }} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, rgb(147, 51, 234), rgb(196, 181, 253))', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(147, 51, 234, 0.3)'}} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <motion.div animate={{ rotate: [0,360]}} transition={{ duration:8, repeat: Infinity, ease: "linear"}}><Brain size={24} /></motion.div>
        </motion.button>
      </motion.div>

      <style jsx global>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255, 255, 255, 0.5) !important; }
        select option { background: #1f2937 !important; color: white !important; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.5); }
      `}</style>
    </div>
  );
};

export default ClientProfitability;

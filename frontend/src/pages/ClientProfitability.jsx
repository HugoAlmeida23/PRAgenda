import React, { useState, useMemo, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api"; // Assuming api is configured for authenticated requests
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, Clock, Calendar, PieChart, Users, AlertTriangle,
  ChevronDown, ChevronUp, Download, RefreshCw, Loader2, CreditCard,
  Filter, Search, Eye, EyeOff, Sparkles, Brain, Target, Activity,
  BarChart3, TrendingDown
} from "lucide-react";
import { usePermissions } from "../contexts/PermissionsContext";
import BackgroundElements from "../components/HeroSection/BackgroundElements"; // Assuming this component exists

// --- Data Fetching Functions ---
const fetchProfitabilityData = async ({ queryKey }) => {
  const [_key, year, month] = queryKey;
  if (!year || !month) throw new Error("Year and month are required");
  const response = await api.get(`/client-profitability/?year=${year}&month=${month}`);
  return response.data;
};

const fetchClients = async () => {
  const response = await api.get("/clients/");
  return response.data;
};

// --- Constants ---
const MONTHS = [
  { value: 1, label: "Janeiro" }, { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" }, { value: 4, label: "Abril" },
  { value: 5, label: "Maio" }, { value: 6, label: "Junho" },
  { value: 7, label: "Julho" }, { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" }, { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" }, { value: 12, label: "Dezembro" },
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

// --- Helper Functions ---
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

// --- Main Component ---
const ClientProfitability = () => {
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  // --- State ---
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [sortConfig, setSortConfig] = useState({ key: "profit_margin", direction: "desc" });
  const [filters, setFilters] = useState({
    client: "",
    profitableOnly: false,
    unprofitableOnly: false,
    searchTerm: "",
  });
  const [expandedClients, setExpandedClients] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // --- Permissions ---
  const canViewProfitability = useMemo(() => {
    if (permissions.loading) return false;
    return permissions.isOrgAdmin ||
      permissions.canViewProfitability ||
      permissions.canViewTeamProfitability ||
      permissions.canViewOrganizationProfitability;
  }, [
    permissions.isOrgAdmin,
    permissions.canViewProfitability,
    permissions.canViewTeamProfitability,
    permissions.canViewOrganizationProfitability,
    permissions.loading
  ]);

  // --- React Query: Data Fetching ---
  const {
    data: profitabilityData = [],
    isLoading: isProfitabilityLoading,
    isError: isProfitabilityError,
    error: profitabilityError,
    refetch: refetchProfitability,
  } = useQuery({
    queryKey: ['profitability', selectedYear, selectedMonth],
    queryFn: fetchProfitabilityData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: canViewProfitability && !permissions.loading, // Enable only if user has permission and permissions are loaded
  });

  const {
    data: clientsList = [],
    isLoading: isClientsLoading,
  } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: canViewProfitability && !permissions.loading,
  });

  const isLoading = isProfitabilityLoading || isClientsLoading || permissions.loading;

  // --- Memoized Filtered and Sorted Data ---
  const processedData = useMemo(() => {
    if (!profitabilityData || profitabilityData.length === 0) return [];

    let filtered = [...profitabilityData];

    if (filters.searchTerm) {
      filtered = filtered.filter(item =>
        item.client_name.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }
    if (filters.client) {
      filtered = filtered.filter(item => item.client === parseInt(filters.client));
    }
    if (filters.profitableOnly && !filters.unprofitableOnly) {
      filtered = filtered.filter(item => item.is_profitable);
    } else if (!filters.profitableOnly && filters.unprofitableOnly) {
      filtered = filtered.filter(item => !item.is_profitable);
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Handle nulls: sort them to the bottom
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        
        // Attempt to parse if they look like numbers but are strings
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
        // Mixed types or other types: attempt direct comparison
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [profitabilityData, filters, sortConfig]);

  // --- Memoized Summary Statistics ---
  const summaryStats = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return {
        totalClients: 0, profitableClients: 0, unprofitableClients: 0,
        averageMargin: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0,
      };
    }
    const totalClients = processedData.length;
    const profitableClients = processedData.filter(item => item.is_profitable).length;
    const unprofitableClients = totalClients - profitableClients;
    const totalRevenue = processedData.reduce((sum, item) => sum + (parseFloat(item.monthly_fee) || 0), 0);
    const totalCost = processedData.reduce((sum, item) =>
      sum + (parseFloat(item.time_cost) || 0) + (parseFloat(item.total_expenses) || 0), 0);
    const totalProfit = processedData.reduce((sum, item) => sum + (parseFloat(item.profit) || 0), 0);
    
    const margins = processedData
      .map(item => parseFloat(item.profit_margin))
      .filter(margin => !isNaN(margin));
      
    const averageMargin = margins.length > 0 ? margins.reduce((sum, margin) => sum + margin, 0) / margins.length : 0;

    return {
      totalClients, profitableClients, unprofitableClients, averageMargin,
      totalRevenue, totalCost, totalProfit,
    };
  }, [processedData]);

  // --- Mutations ---
  const refreshDataMutation = useMutation({
    mutationFn: () => refetchProfitability(),
    onSuccess: () => {
      toast.success("Dados de rentabilidade atualizados!");
    },
    onError: (error) => {
      console.error("Error refreshing profitability data:", error);
      toast.error("Falha ao atualizar dados de rentabilidade.");
    },
  });
  const isRefreshing = refreshDataMutation.isPending;

  const recalculateProfitabilityMutation = useMutation({
    mutationFn: async (monthsBack = 3) => {
      const response = await api.post('/update-profitability/', { months_back: monthsBack });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Rentabilidade recalculada! ${data.total_clients_updated} registros atualizados.`);
      // Refresh the data after successful recalculation
      refetchProfitability();
    },
    onError: (error) => {
      console.error("Error recalculating profitability:", error);
      toast.error(`Falha ao recalcular rentabilidade: ${error.response?.data?.error || error.message}`);
    },
  });
  const isRecalculating = recalculateProfitabilityMutation.isPending;

  // --- Event Handlers ---
  const handleFilterChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ client: "", profitableOnly: false, unprofitableOnly: false, searchTerm: "" });
  }, []);

  const toggleClientDetails = useCallback((clientId) => {
    setExpandedClients(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  }, []);

  const handleRefresh = useCallback(() => {
    refreshDataMutation.mutate();
    recalculateProfitabilityMutation.mutate(2); // Recalculate profitability for the last 3 months
  }, [refreshDataMutation,recalculateProfitabilityMutation]);
  
  // --- Excel Report Generation ---
  const generateExcelReport = async () => {
    if (!processedData || processedData.length === 0) {
      toast.warn("Não há dados para gerar relatório");
      return;
    }

    try {
      toast.info("Gerando relatório de rentabilidade...", {
        autoClose: false, toastId: "generating-profitability-excel"
      });

      const XLSX = await import('xlsx'); // Dynamic import
      const wb = XLSX.utils.book_new();

      // Sheet 1: Executive Summary
      const summarySheetData = [
        ['RELATÓRIO DE RENTABILIDADE DE CLIENTES'],
        [`Período: ${MONTHS.find(m => m.value === selectedMonth)?.label} ${selectedYear}`],
        [`Data de Geração: ${new Date().toLocaleDateString('pt-PT')}`],
        [''],
        ['RESUMO EXECUTIVO'],
        ['Métrica', 'Valor'],
        ['Total de Clientes', summaryStats.totalClients],
        ['Clientes Rentáveis', summaryStats.profitableClients],
        ['Clientes Não Rentáveis', summaryStats.unprofitableClients],
        ['Taxa de Rentabilidade', summaryStats.totalClients > 0 ? formatPercentage((summaryStats.profitableClients / summaryStats.totalClients) * 100) : 'N/A'],
        ['Receita Total', formatCurrency(summaryStats.totalRevenue)],
        ['Custos Totais', formatCurrency(summaryStats.totalCost)],
        ['Lucro Total', formatCurrency(summaryStats.totalProfit)],
        ['Margem Média', formatPercentage(summaryStats.averageMargin)],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summarySheetData);
      summaryWs['!cols'] = [{ wch: 30 }, { wch: 20 }];
      summaryWs['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
      ];
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo Executivo');

      // Sheet 2: Detailed Data
      const detailedHeaders = [
        'Cliente', 'Receita Mensal (€)', 'Tempo Investido', 'Custo de Tempo (€)',
        'Outras Despesas (€)', 'Custos Totais (€)', 'Lucro (€)', 'Margem (%)', 'Status', 'Última Atualização'
      ];
      const detailedSheetData = [detailedHeaders];
      const sortedDataForReport = [...processedData].sort((a, b) => (parseFloat(b.profit_margin) || 0) - (parseFloat(a.profit_margin) || 0));

      sortedDataForReport.forEach(item => {
        const totalItemCosts = (parseFloat(item.time_cost) || 0) + (parseFloat(item.total_expenses) || 0);
        detailedSheetData.push([
          item.client_name,
          parseFloat(item.monthly_fee) || 0,
          formatTime(item.total_time_minutes),
          parseFloat(item.time_cost) || 0,
          parseFloat(item.total_expenses) || 0,
          totalItemCosts,
          parseFloat(item.profit) || 0,
          parseFloat(item.profit_margin) || 0,
          item.is_profitable ? 'Rentável' : 'Não Rentável',
          new Date(item.last_updated).toLocaleDateString('pt-PT')
        ]);
      });
      // Add totals row
      const overallMargin = summaryStats.totalRevenue > 0 ? ((summaryStats.totalProfit / summaryStats.totalRevenue) * 100) : 0;
      detailedSheetData.push([
        'TOTAL',
        summaryStats.totalRevenue,
        formatTime(processedData.reduce((sum, item) => sum + (item.total_time_minutes || 0), 0)),
        processedData.reduce((sum, item) => sum + (parseFloat(item.time_cost) || 0), 0),
        processedData.reduce((sum, item) => sum + (parseFloat(item.total_expenses) || 0), 0),
        summaryStats.totalCost,
        summaryStats.totalProfit,
        overallMargin, // This should be calculated from totals, not average of averages.
        '', ''
      ]);
      const detailedWs = XLSX.utils.aoa_to_sheet(detailedSheetData);
      detailedWs['!cols'] = [
        { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, detailedWs, 'Dados Detalhados');
      
      // Sheet 3: Top Performers
      const topProfitable = sortedDataForReport.filter(item => item.is_profitable).slice(0, 10);
      const topPerformersData = [['TOP 10 CLIENTES MAIS RENTÁVEIS'], [''], ['Posição', 'Cliente', 'Receita (€)', 'Lucro (€)', 'Margem (%)']];
      topProfitable.forEach((item, index) => {
        topPerformersData.push([
          index + 1, item.client_name, parseFloat(item.monthly_fee) || 0, parseFloat(item.profit) || 0, parseFloat(item.profit_margin) || 0
        ]);
      });
      const topPerformersWs = XLSX.utils.aoa_to_sheet(topPerformersData);
      topPerformersWs['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
      topPerformersWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
      XLSX.utils.book_append_sheet(wb, topPerformersWs, 'Top Performers');

      // Sheet 4: Problematic Clients
      const problematicClients = sortedDataForReport.filter(item => !item.is_profitable).slice(0, 10);
      if (problematicClients.length > 0) {
        const problematicData = [['CLIENTES PROBLEMÁTICOS (NÃO RENTÁVEIS)'], [''], ['Cliente', 'Receita (€)', 'Prejuízo (€)', 'Margem (%)', 'Tempo Investido', 'Sugestão Preço (€)']];
        problematicClients.forEach(item => {
          const totalCosts = (parseFloat(item.time_cost) || 0) + (parseFloat(item.total_expenses) || 0);
          const suggestedPrice = totalCosts * 1.3; // Assuming 30% target margin
          problematicData.push([
            item.client_name, parseFloat(item.monthly_fee) || 0, Math.abs(parseFloat(item.profit) || 0),
            parseFloat(item.profit_margin) || 0, formatTime(item.total_time_minutes), suggestedPrice
          ]);
        });
        const problematicWs = XLSX.utils.aoa_to_sheet(problematicData);
        problematicWs['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 }];
        problematicWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
        XLSX.utils.book_append_sheet(wb, problematicWs, 'Clientes Problemáticos');
      }

      // Generate and download
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Relatorio_Rentabilidade_${MONTHS.find(m => m.value === selectedMonth)?.label}_${selectedYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss("generating-profitability-excel");
      toast.success("Relatório gerado com sucesso!");

    } catch (error) {
      console.error("Erro ao gerar relatório Excel:", error);
      toast.dismiss("generating-profitability-excel");
      toast.error("Erro ao gerar o relatório Excel.");
    }
  };

  // --- UI Styles & Animations ---
  const glassStyle = {
    background: 'rgba(0, 0, 0, 0.1)',
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

  // --- Render Logic ---
  if (permissions.loading) { // Initial loading for permissions
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }}>
          <Brain size={48} style={{ color: 'rgb(147, 51, 234)' }} />
        </motion.div>
        <p style={{ marginLeft: '1rem', fontSize: '1rem' }}>Verificando permissões...</p>
      </div>
    );
  }

  if (!canViewProfitability) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...glassStyle, padding: '2rem', textAlign: 'center', maxWidth: '500px', color: 'white' }}>
          <AlertTriangle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Acesso Restrito</h2>
          <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>Você não possui permissões para visualizar dados de rentabilidade.</p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>Entre em contato com o administrador.</p>
        </motion.div>
      </div>
    );
  }

  if (isLoading && !profitabilityData.length) { // Loading actual data
     return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }}>
          <Brain size={48} style={{ color: 'rgb(147, 51, 234)' }} />
        </motion.div>
        <p style={{ marginLeft: '1rem', fontSize: '1rem' }}>Analisando dados de rentabilidade...</p>
      </div>
    );
  }

  if (isProfitabilityError) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'white' }}>
        <BackgroundElements businessStatus="error" />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...glassStyle, padding: '2rem', textAlign: 'center', maxWidth: '500px', color: 'white', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Erro ao Carregar Dados</h2>
          <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
            Não foi possível carregar os dados de rentabilidade.
            {profitabilityError?.message && ` Detalhe: ${profitabilityError.message}`}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={handleRefresh} disabled={isRefreshing}
            style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(52, 211, 153, 0.3)', background: 'rgba(52, 211, 153, 0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}
          >
            {isRefreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            Tentar Novamente
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
      <BackgroundElements businessStatus="optimal" />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 9999 }} theme="dark" />

      <motion.div
        initial="hidden" animate="visible" variants={containerVariants}
        style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}
      >
        {/* Header */}
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Análise de Rentabilidade
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>
              Insights inteligentes sobre a performance dos seus clientes
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={handleRefresh} disabled={isRefreshing} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(52, 211, 153, 0.3)', background: 'rgba(52, 211, 153, 0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              {isRefreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
            </motion.button>
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={generateExcelReport} style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
              <Download size={18} /> Exportar Relatório
            </motion.button>
          </div>
        </motion.div>

        {/* Filters and Period Selection */}
        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <motion.div animate={{ rotate: [0, 360], scale: [1, 1.1, 1]}} transition={{ rotate: { duration: 8, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity }}} style={{ padding: '0.5rem', backgroundColor: 'rgba(147, 51, 234, 0.2)', borderRadius: '12px' }}>
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

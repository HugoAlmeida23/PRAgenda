import React, { useState, useMemo, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Clock,
  Calendar,
  PieChart,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Download,
  RefreshCw,
  Briefcase,
  Loader2,
  CreditCard,
  Filter,
  Search,
  Eye,
  EyeOff,
  Sparkles,
  Brain,
  Target,
  Activity,
  BarChart3,
  TrendingDown
} from "lucide-react";
import { usePermissions } from "../contexts/PermissionsContext";
import { AlertCircle } from "lucide-react";
import BackgroundElements from "../components/HeroSection/BackgroundElements";


// Data fetching functions
const fetchProfitabilityData = async (year, month) => {
  const response = await api.get(`/client-profitability/?year=${year}&month=${month}`);
  return response.data;
};

const fetchClients = async () => {
  const response = await api.get("/clients/");
  return response.data;
};

// Dados mock para demonstração
const months = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const ClientProfitability = () => {
  const queryClient = useQueryClient();

  // Estados locais
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [sortConfig, setSortConfig] = useState({
    key: "profit_margin",
    direction: "desc",
  });
  const [filters, setFilters] = useState({
    client: "",
    profitableOnly: false,
    unprofitableOnly: false,
    searchTerm: ""
  });
  const [expandedClients, setExpandedClients] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Permissões
  const permissions = usePermissions();

  const canViewProfitability = useMemo(() => {
    return permissions.isOrgAdmin ||
      permissions.canViewProfitability ||
      permissions.canViewTeamProfitability ||
      permissions.canViewOrganizationProfitability;
  }, [
    permissions.isOrgAdmin,
    permissions.canViewProfitability,
    permissions.canViewTeamProfitability,
    permissions.canViewOrganizationProfitability
  ]);

  // React Query hooks - dados reais
  const {
    data: profitabilityData = [],
    isLoading: isProfitabilityLoading,
    isError: isProfitabilityError,
    error: profitabilityError,
    refetch: refetchProfitability
  } = useQuery({
    queryKey: ['profitability', selectedYear, selectedMonth],
    queryFn: () => fetchProfitabilityData(selectedYear, selectedMonth),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: canViewProfitability,
  });

  const {
    data: clients = [],
    isLoading: isClientsLoading
  } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    staleTime: 5 * 60 * 1000,
    enabled: canViewProfitability,
  });

  const isLoading = isProfitabilityLoading || isClientsLoading;
  // Dados filtrados
  const filteredData = useMemo(() => {
    if (!profitabilityData || profitabilityData.length === 0) return [];

    let filtered = [...profitabilityData];

    // Filtro por termo de busca
    if (filters.searchTerm) {
      filtered = filtered.filter(item =>
        item.client_name.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Filtro por cliente específico
    if (filters.client) {
      filtered = filtered.filter(item => item.client === parseInt(filters.client));
    }

    // Filtros de rentabilidade
    if (filters.profitableOnly && !filters.unprofitableOnly) {
      filtered = filtered.filter(item => item.is_profitable);
    } else if (!filters.profitableOnly && filters.unprofitableOnly) {
      filtered = filtered.filter(item => !item.is_profitable);
    }

    // Ordenação
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] === null) return 1;
        if (b[sortConfig.key] === null) return -1;

        const valA = typeof a[sortConfig.key] === "string" && !isNaN(parseFloat(a[sortConfig.key]))
          ? parseFloat(a[sortConfig.key])
          : a[sortConfig.key];
        const valB = typeof b[sortConfig.key] === "string" && !isNaN(parseFloat(b[sortConfig.key]))
          ? parseFloat(b[sortConfig.key])
          : b[sortConfig.key];

        if (valA < valB) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [profitabilityData, filters, sortConfig]);
  // Mutation para refresh de dados
  const refreshDataMutation = useMutation({
    mutationFn: () => api.get("/client-profitability/", {
      year: selectedYear,
      month: selectedMonth,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitability'] });
      toast.success("Dados de rentabilidade atualizados com sucesso!");
    },
    onError: (error) => {
      console.error("Error refreshing profitability data:", error);
      toast.error("Falha ao atualizar dados de rentabilidade");
    }
  });

  const isRefreshing = refreshDataMutation.isPending;

  // Estatísticas resumo
  const summaryStats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        totalClients: 0,
        profitableClients: 0,
        unprofitableClients: 0,
        averageMargin: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
      };
    }

    const profitableClients = filteredData.filter(item => item.is_profitable).length;
    const unprofitableClients = filteredData.filter(item => !item.is_profitable).length;
    const totalRevenue = filteredData.reduce((sum, item) => sum + (parseFloat(item.monthly_fee) || 0), 0);
    const totalCost = filteredData.reduce((sum, item) =>
      sum + (parseFloat(item.time_cost) || 0) + (parseFloat(item.total_expenses) || 0), 0);
    const totalProfit = filteredData.reduce((sum, item) => sum + (parseFloat(item.profit) || 0), 0);
    const margins = filteredData
      .filter(item => item.profit_margin !== null)
      .map(item => parseFloat(item.profit_margin) || 0);
    const averageMargin = margins.length > 0
      ? margins.reduce((sum, margin) => sum + margin, 0) / margins.length
      : 0;

    return {
      totalClients: filteredData.length,
      profitableClients,
      unprofitableClients,
      averageMargin,
      totalRevenue,
      totalCost,
      totalProfit,
    };
  }, [filteredData]);

  // useEffect DEPOIS das queries
  useEffect(() => {
    if (canViewProfitability && !permissions.loading) {
      refetchProfitability();
      queryClient.invalidateQueries(['clients']);
    }
  }, [canViewProfitability, queryClient, refetchProfitability, permissions.loading]);

  // Handlers
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters({
      ...filters,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const resetFilters = () => {
    setFilters({
      client: "",
      profitableOnly: false,
      unprofitableOnly: false,
      searchTerm: ""
    });
  };

  const toggleClientDetails = (clientId) => {
    setExpandedClients({
      ...expandedClients,
      [clientId]: !expandedClients[clientId],
    });
  };

  const refreshData = () => {
    refreshDataMutation.mutate();
  };

  const handlePeriodChange = () => {
    refetchProfitability();
  };


  // Funções auxiliares

  // 1. PRIMEIRO: Adicione esta função após as outras funções auxiliares (formatCurrency, formatPercentage, formatTime)

  const generateExcelReport = async () => {
    if (!filteredData || filteredData.length === 0) {
      toast.warn("Não há dados para gerar relatório");
      return;
    }

    try {
      toast.info("Gerando relatório de rentabilidade...", {
        autoClose: false,
        toastId: "generating-profitability-excel"
      });

      // Importa a biblioteca XLSX dinamicamente
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // === ABA 1: RESUMO EXECUTIVO ===
      const summaryData = [
        ['RELATÓRIO DE RENTABILIDADE DE CLIENTES'],
        [`Período: ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`],
        [`Data de Geração: ${new Date().toLocaleDateString('pt-PT')}`],
        [''],
        ['RESUMO EXECUTIVO'],
        ['Métrica', 'Valor'],
        ['Total de Clientes', summaryStats.totalClients],
        ['Clientes Rentáveis', summaryStats.profitableClients],
        ['Clientes Não Rentáveis', summaryStats.unprofitableClients],
        ['Taxa de Rentabilidade', `${((summaryStats.profitableClients / summaryStats.totalClients) * 100).toFixed(1)}%`],
        ['Receita Total', formatCurrency(summaryStats.totalRevenue)],
        ['Custos Totais', formatCurrency(summaryStats.totalCost)],
        ['Lucro Total', formatCurrency(summaryStats.totalProfit)],
        ['Margem Média', formatPercentage(summaryStats.averageMargin)],
        [''],
        ['DISTRIBUIÇÃO POR STATUS'],
        ['Status', 'Quantidade', 'Percentual'],
        [
          'Rentáveis',
          summaryStats.profitableClients,
          `${((summaryStats.profitableClients / summaryStats.totalClients) * 100).toFixed(1)}%`
        ],
        [
          'Não Rentáveis',
          summaryStats.unprofitableClients,
          `${((summaryStats.unprofitableClients / summaryStats.totalClients) * 100).toFixed(1)}%`
        ]
      ];

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);

      // Formatação da aba resumo
      summaryWs['!cols'] = [
        { wch: 30 }, // Coluna A - Métricas
        { wch: 20 }, // Coluna B - Valores
        { wch: 15 }  // Coluna C - Percentuais
      ];

      // Merge cells para o título
      summaryWs['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Título principal
        { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // Período
        { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }  // Data
      ];

      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo Executivo');

      // === ABA 2: DADOS DETALHADOS ===
      const detailedData = [
        [
          'Cliente',
          'Receita Mensal (€)',
          'Tempo Investido',
          'Custo de Tempo (€)',
          'Outras Despesas (€)',
          'Custos Totais (€)',
          'Lucro (€)',
          'Margem (%)',
          'Status',
          'Última Atualização'
        ]
      ];

      // Ordena os dados por margem de lucro (decrescente)
      const sortedData = [...filteredData].sort((a, b) =>
        parseFloat(b.profit_margin) - parseFloat(a.profit_margin)
      );

      sortedData.forEach(item => {
        const totalCosts = parseFloat(item.time_cost) + parseFloat(item.total_expenses);
        detailedData.push([
          item.client_name,
          parseFloat(item.monthly_fee),
          formatTime(item.total_time_minutes),
          parseFloat(item.time_cost),
          parseFloat(item.total_expenses),
          totalCosts,
          parseFloat(item.profit),
          parseFloat(item.profit_margin),
          item.is_profitable ? 'Rentável' : 'Não Rentável',
          new Date(item.last_updated).toLocaleDateString('pt-PT')
        ]);
      });

      // Adiciona linha de totais
      const totalRevenue = filteredData.reduce((sum, item) => sum + parseFloat(item.monthly_fee), 0);
      const totalTimeCost = filteredData.reduce((sum, item) => sum + parseFloat(item.time_cost), 0);
      const totalExpenses = filteredData.reduce((sum, item) => sum + parseFloat(item.total_expenses), 0);
      const totalCosts = totalTimeCost + totalExpenses;
      const totalProfit = filteredData.reduce((sum, item) => sum + parseFloat(item.profit), 0);
      const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

      detailedData.push([
        'TOTAL',
        totalRevenue,
        formatTime(filteredData.reduce((sum, item) => sum + item.total_time_minutes, 0)),
        totalTimeCost,
        totalExpenses,
        totalCosts,
        totalProfit,
        overallMargin,
        '',
        ''
      ]);

      const detailedWs = XLSX.utils.aoa_to_sheet(detailedData);

      // Formatação da aba detalhada
      detailedWs['!cols'] = [
        { wch: 25 }, // Cliente
        { wch: 18 }, // Receita
        { wch: 15 }, // Tempo
        { wch: 15 }, // Custo Tempo
        { wch: 15 }, // Despesas
        { wch: 15 }, // Custos Totais
        { wch: 12 }, // Lucro
        { wch: 12 }, // Margem
        { wch: 15 }, // Status
        { wch: 15 }  // Última Atualização
      ];

      XLSX.utils.book_append_sheet(wb, detailedWs, 'Dados Detalhados');

      // === ABA 3: TOP PERFORMERS ===
      const topProfitable = sortedData
        .filter(item => item.is_profitable)
        .slice(0, 10);

      const topPerformersData = [
        ['TOP 10 CLIENTES MAIS RENTÁVEIS'],
        [''],
        ['Posição', 'Cliente', 'Receita (€)', 'Lucro (€)', 'Margem (%)'],
      ];

      topProfitable.forEach((item, index) => {
        topPerformersData.push([
          index + 1,
          item.client_name,
          parseFloat(item.monthly_fee),
          parseFloat(item.profit),
          parseFloat(item.profit_margin)
        ]);
      });

      const topPerformersWs = XLSX.utils.aoa_to_sheet(topPerformersData);
      topPerformersWs['!cols'] = [
        { wch: 10 }, // Posição
        { wch: 30 }, // Cliente
        { wch: 15 }, // Receita
        { wch: 12 }, // Lucro
        { wch: 12 }  // Margem
      ];

      // Merge do título
      topPerformersWs['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }
      ];

      XLSX.utils.book_append_sheet(wb, topPerformersWs, 'Top Performers');

      // === ABA 4: CLIENTES PROBLEMÁTICOS ===
      const problematicClients = sortedData
        .filter(item => !item.is_profitable)
        .slice(0, 10);

      if (problematicClients.length > 0) {
        const problematicData = [
          ['CLIENTES PROBLEMÁTICOS (NÃO RENTÁVEIS)'],
          [''],
          ['Cliente', 'Receita (€)', 'Prejuízo (€)', 'Margem (%)', 'Tempo Investido', 'Sugestão Preço (€)'],
        ];

        problematicClients.forEach(item => {
          const totalCosts = parseFloat(item.time_cost) + parseFloat(item.total_expenses);
          const suggestedPrice = totalCosts * 1.3; // Margem de 30%

          problematicData.push([
            item.client_name,
            parseFloat(item.monthly_fee),
            Math.abs(parseFloat(item.profit)),
            parseFloat(item.profit_margin),
            formatTime(item.total_time_minutes),
            suggestedPrice
          ]);
        });

        const problematicWs = XLSX.utils.aoa_to_sheet(problematicData);
        problematicWs['!cols'] = [
          { wch: 30 }, // Cliente
          { wch: 15 }, // Receita
          { wch: 15 }, // Prejuízo
          { wch: 12 }, // Margem
          { wch: 15 }, // Tempo
          { wch: 18 }  // Sugestão
        ];

        // Merge do título
        problematicWs['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }
        ];

        XLSX.utils.book_append_sheet(wb, problematicWs, 'Clientes Problemáticos');
      }

      // === ABA 5: ANÁLISE POR TEMPO ===
      const timeAnalysisData = [
        ['ANÁLISE POR TEMPO INVESTIDO'],
        [''],
        ['Cliente', 'Tempo Total', 'Custo/Hora (€)', 'Receita/Hora (€)', 'Eficiência']
      ];

      sortedData.forEach(item => {
        const totalHours = item.total_time_minutes / 60;
        const costPerHour = totalHours > 0 ? parseFloat(item.time_cost) / totalHours : 0;
        const revenuePerHour = totalHours > 0 ? parseFloat(item.monthly_fee) / totalHours : 0;
        const efficiency = costPerHour > 0 ? (revenuePerHour / costPerHour).toFixed(2) : 'N/A';

        timeAnalysisData.push([
          item.client_name,
          formatTime(item.total_time_minutes),
          costPerHour.toFixed(2),
          revenuePerHour.toFixed(2),
          efficiency
        ]);
      });

      const timeAnalysisWs = XLSX.utils.aoa_to_sheet(timeAnalysisData);
      timeAnalysisWs['!cols'] = [
        { wch: 30 }, // Cliente
        { wch: 15 }, // Tempo
        { wch: 15 }, // Custo/Hora
        { wch: 15 }, // Receita/Hora
        { wch: 12 }  // Eficiência
      ];

      // Merge do título
      timeAnalysisWs['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }
      ];

      XLSX.utils.book_append_sheet(wb, timeAnalysisWs, 'Análise por Tempo');

      // Gera o arquivo Excel
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Download do arquivo
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Relatorio_Rentabilidade_${months.find(m => m.value === selectedMonth)?.label}_${selectedYear}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss("generating-profitability-excel");
      toast.success("Relatório de rentabilidade gerado com sucesso!");

    } catch (error) {
      console.error("Erro ao gerar relatório Excel:", error);
      toast.dismiss("generating-profitability-excel");
      toast.error("Ocorreu um erro ao gerar o relatório Excel");
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    const numValue = parseFloat(value) || 0;
    return `${numValue.toFixed(2)}%`;
  };

  const formatTime = (minutes) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Estilos glass
  const glassStyle = {
    background: 'rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
  };

  // Variantes de animação
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

  if (permissions.loading || isLoading) {
    return (
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1, repeat: Infinity }
          }}
        >
          <Brain size={48} style={{ color: 'rgb(147, 51, 234)' }} />
        </motion.div>
        <p style={{ marginLeft: '1rem', fontSize: '1rem' }}>
          Analisando dados de rentabilidade...
        </p>
      </div>
    );
  }

  if (!canViewProfitability) {
    return (
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            ...glassStyle,
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '500px',
            color: 'white'
          }}
        >
          <AlertTriangle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>
            Acesso Restrito
          </h2>
          <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
            Você não possui permissões para visualizar dados de rentabilidade.
          </p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            Entre em contato com o administrador da sua organização para solicitar acesso.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      color: 'white'
    }}>
      <BackgroundElements businessStatus="optimal" />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        style={{ zIndex: 9999 }}
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '2rem',
          paddingTop: '1rem'
        }}
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h1 style={{
              fontSize: '1.8rem',
              fontWeight: '700',
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Análise de Rentabilidade
            </h1>
            <p style={{
              fontSize: '1rem',
              color: 'rgba(191, 219, 254, 1)',
              margin: 0
            }}>
              Insights inteligentes sobre a performance dos seus clientes
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={refreshData}
              disabled={isRefreshing}
              style={{
                ...glassStyle,
                padding: '0.75rem 1.5rem',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                background: 'rgba(52, 211, 153, 0.2)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {isRefreshing ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <RefreshCw size={18} />
              )}
              {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={generateExcelReport}  // ou a função de export que tiveres
              style={{
                ...glassStyle,
                padding: '0.75rem 1.5rem',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                background: 'rgba(59, 130, 246, 0.2)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <Download size={18} />
              Exportar Relatório
            </motion.button>
          </div>
        </motion.div>

        {/* Período e Filtros */}
        <motion.div
          variants={itemVariants}
          style={{
            ...glassStyle,
            padding: '1.5rem',
            marginBottom: '2rem'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity }
                }}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'rgba(147, 51, 234, 0.2)',
                  borderRadius: '12px'
                }}
              >
                <Calendar style={{ color: 'rgb(196, 181, 253)' }} size={20} />
              </motion.div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                  Período e Filtros
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                  Configure a análise conforme necessário
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowFilters(!showFilters)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '8px'
              }}
            >
              {showFilters ? <EyeOff size={20} /> : <Eye size={20} />}
            </motion.button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Ano
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              >
                {years.map((year) => (
                  <option key={year} value={year} style={{ background: '#1f2937', color: 'white' }}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Mês
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value} style={{ background: '#1f2937', color: 'white' }}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                Buscar Cliente
              </label>
              <div style={{ position: 'relative' }}>
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}
                />
                <input
                  type="text"
                  name="searchTerm"
                  value={filters.searchTerm}
                  onChange={handleFilterChange}
                  placeholder="Digite o nome do cliente..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2rem',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="profitableOnly"
                    name="profitableOnly"
                    checked={filters.profitableOnly}
                    onChange={handleFilterChange}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="profitableOnly" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Apenas Rentáveis
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="unprofitableOnly"
                    name="unprofitableOnly"
                    checked={filters.unprofitableOnly}
                    onChange={handleFilterChange}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="unprofitableOnly" style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Apenas Não Rentáveis
                  </label>
                </div>

                <select
                  name="client"
                  value={filters.client}
                  onChange={handleFilterChange}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="" style={{ background: '#1f2937', color: 'white' }}>Todos os Clientes</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id} style={{ background: '#1f2937', color: 'white' }}>
                      {client.name}
                    </option>
                  ))}
                </select>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetFilters}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Limpar Filtros
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Cards de Estatísticas */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}
        >
          {/* Receita Total */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                padding: '0.75rem',
                backgroundColor: 'rgba(52, 211, 153, 0.2)',
                borderRadius: '12px',
                marginRight: '1rem'
              }}>
                <DollarSign size={24} style={{ color: 'rgb(52, 211, 153)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Receita Total
                </h3>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: 'rgb(52, 211, 153)' }}>
                  {formatCurrency(summaryStats.totalRevenue)}
                </p>
              </div>
            </div>
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'rgb(52, 211, 153)' }} />
                <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)' }}>Calculando...</span>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                De {summaryStats.totalClients} clientes ativos
              </p>
            )}
          </motion.div>

          {/* Lucro Total */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              background: summaryStats.totalProfit >= 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: summaryStats.totalProfit >= 0 ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                padding: '0.75rem',
                backgroundColor: summaryStats.totalProfit >= 0 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                marginRight: '1rem'
              }}>
                {summaryStats.totalProfit >= 0 ?
                  <TrendingUp size={24} style={{ color: 'rgb(59, 130, 246)' }} /> :
                  <TrendingDown size={24} style={{ color: 'rgb(239, 68, 68)' }} />
                }
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Lucro Total
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: summaryStats.totalProfit >= 0 ? 'rgb(59, 130, 246)' : 'rgb(239, 68, 68)'
                }}>
                  {formatCurrency(summaryStats.totalProfit)}
                </p>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              Custos: {formatCurrency(summaryStats.totalCost)}
            </p>
          </motion.div>

          {/* Margem Média */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              background: 'rgba(147, 51, 234, 0.1)',
              border: '1px solid rgba(147, 51, 234, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                padding: '0.75rem',
                backgroundColor: 'rgba(147, 51, 234, 0.2)',
                borderRadius: '12px',
                marginRight: '1rem'
              }}>
                <PieChart size={24} style={{ color: 'rgb(147, 51, 234)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Margem Média
                </h3>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: 'rgb(147, 51, 234)' }}>
                  {formatPercentage(summaryStats.averageMargin)}
                </p>
              </div>
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, summaryStats.averageMargin + 50))}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(to right, rgb(147, 51, 234), rgb(196, 181, 253))',
                  borderRadius: '2px'
                }}
              />
            </div>
          </motion.div>

          {/* Status dos Clientes */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                padding: '0.75rem',
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                borderRadius: '12px',
                marginRight: '1rem'
              }}>
                <Users size={24} style={{ color: 'rgb(251, 191, 36)' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Status dos Clientes
                </h3>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: 'rgb(251, 191, 36)' }}>
                  {summaryStats.totalClients}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'rgb(52, 211, 153)',
                  borderRadius: '50%'
                }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  {summaryStats.profitableClients} Rentáveis
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'rgb(239, 68, 68)',
                  borderRadius: '50%'
                }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  {summaryStats.unprofitableClients} Não Rentáveis
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Insights AI */}
        <motion.div
          variants={itemVariants}
          style={{
            ...glassStyle,
            padding: '1.5rem',
            marginBottom: '2rem',
            background: 'rgba(147, 51, 234, 0.05)',
            border: '1px solid rgba(147, 51, 234, 0.2)'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity }
              }}
              style={{
                padding: '0.5rem',
                backgroundColor: 'rgba(147, 51, 234, 0.2)',
                borderRadius: '12px'
              }}
            >
              <Brain style={{ color: 'rgb(196, 181, 253)' }} size={20} />
            </motion.div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                AI Insights
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                Análise inteligente dos seus dados
              </p>
            </div>
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ marginLeft: 'auto' }}
            >
              <Sparkles style={{ color: 'rgb(196, 181, 253)' }} size={16} />
            </motion.div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {summaryStats.unprofitableClients > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                <AlertTriangle size={20} style={{ color: 'rgb(239, 68, 68)', marginTop: '0.25rem', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>
                    Clientes Não Rentáveis Detectados
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    {summaryStats.unprofitableClients} clientes estão gerando prejuízo.
                    Considere revisar os preços ou otimizar os processos.
                  </p>
                </div>
              </motion.div>
            )}

            {summaryStats.averageMargin > 30 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(52, 211, 153, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(52, 211, 153, 0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                <Target size={20} style={{ color: 'rgb(52, 211, 153)', marginTop: '0.25rem', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>
                    Excelente Performance
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Margem de lucro acima de 30%! Sua operação está muito eficiente.
                  </p>
                </div>
              </motion.div>
            )}

            {summaryStats.totalClients > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                <BarChart3 size={20} style={{ color: 'rgb(59, 130, 246)', marginTop: '0.25rem', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>
                    Oportunidade de Crescimento
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Com {summaryStats.profitableClients} clientes rentáveis,
                    há potencial para escalar os serviços mais lucrativos.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Tabela de Rentabilidade */}
        <motion.div
          variants={itemVariants}
          style={{
            ...glassStyle,
            padding: 0,
            overflow: 'hidden'
          }}
        >
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderRadius: '12px'
              }}>
                <Activity style={{ color: 'rgb(59, 130, 246)' }} size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                  Análise Detalhada por Cliente
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                  {filteredData.length} clientes encontrados
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 size={32} style={{ color: 'rgb(59, 130, 246)' }} />
              </motion.div>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)' }}>
                Carregando dados de rentabilidade...
              </p>
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                Nenhum cliente encontrado
              </h4>
              <p style={{ margin: 0 }}>
                Ajuste os filtros para ver os dados de rentabilidade.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSort("client_name")}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: 'inherit',
                          fontWeight: 'inherit'
                        }}
                      >
                        Cliente
                        {sortConfig.key === "client_name" ? (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={16} /> :
                            <ChevronDown size={16} />
                        ) : (
                          <ChevronDown size={16} style={{ opacity: 0.5 }} />
                        )}
                      </motion.button>
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSort("monthly_fee")}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: 'inherit',
                          fontWeight: 'inherit'
                        }}
                      >
                        Receita
                        {sortConfig.key === "monthly_fee" ? (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={16} /> :
                            <ChevronDown size={16} />
                        ) : (
                          <ChevronDown size={16} style={{ opacity: 0.5 }} />
                        )}
                      </motion.button>
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSort("time_cost")}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: 'inherit',
                          fontWeight: 'inherit'
                        }}
                      >
                        Custos
                        {sortConfig.key === "time_cost" ? (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={16} /> :
                            <ChevronDown size={16} />
                        ) : (
                          <ChevronDown size={16} style={{ opacity: 0.5 }} />
                        )}
                      </motion.button>
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSort("profit")}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: 'inherit',
                          fontWeight: 'inherit'
                        }}
                      >
                        Lucro
                        {sortConfig.key === "profit" ? (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={16} /> :
                            <ChevronDown size={16} />
                        ) : (
                          <ChevronDown size={16} style={{ opacity: 0.5 }} />
                        )}
                      </motion.button>
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSort("profit_margin")}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: 'inherit',
                          fontWeight: 'inherit'
                        }}
                      >
                        Margem
                        {sortConfig.key === "profit_margin" ? (
                          sortConfig.direction === "asc" ?
                            <ChevronUp size={16} /> :
                            <ChevronDown size={16} />
                        ) : (
                          <ChevronDown size={16} style={{ opacity: 0.5 }} />
                        )}
                      </motion.button>
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'center',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      Status
                    </th>
                    <th style={{
                      padding: '1rem',
                      textAlign: 'center',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <motion.tr
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        style={{
                          backgroundColor: item.is_profitable ?
                            'rgba(52, 211, 153, 0.05)' :
                            'rgba(239, 68, 68, 0.05)',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: item.is_profitable ?
                                'rgba(52, 211, 153, 0.2)' :
                                'rgba(239, 68, 68, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: 'white'
                            }}>
                              {item.client_name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p style={{
                                margin: 0,
                                fontWeight: '600',
                                color: 'white',
                                fontSize: '0.875rem'
                              }}>
                                {item.client_name}
                              </p>
                              <p style={{
                                margin: 0,
                                fontSize: '0.75rem',
                                color: 'rgba(255, 255, 255, 0.6)'
                              }}>
                                {formatTime(item.total_time_minutes)} investidas
                              </p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <p style={{
                            margin: 0,
                            fontWeight: '600',
                            color: 'rgb(52, 211, 153)',
                            fontSize: '0.875rem'
                          }}>
                            {formatCurrency(item.monthly_fee)}
                          </p>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div>
                            <p style={{
                              margin: 0,
                              fontWeight: '600',
                              color: 'rgb(251, 146, 60)',
                              fontSize: '0.875rem'
                            }}>
                              {formatCurrency(parseFloat(item.time_cost) + parseFloat(item.total_expenses))}
                            </p>
                            <p style={{
                              margin: 0,
                              fontSize: '0.75rem',
                              color: 'rgba(255, 255, 255, 0.6)'
                            }}>
                              Tempo: {formatCurrency(item.time_cost)}
                            </p>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <p style={{
                            margin: 0,
                            fontWeight: '700',
                            color: parseFloat(item.profit) >= 0 ? 'rgb(52, 211, 153)' : 'rgb(239, 68, 68)',
                            fontSize: '0.875rem'
                          }}>
                            {formatCurrency(item.profit)}
                          </p>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: parseFloat(item.profit_margin) >= 0 ?
                              'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            border: parseFloat(item.profit_margin) >= 0 ?
                              '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                            color: parseFloat(item.profit_margin) >= 0 ?
                              'rgb(110, 231, 183)' : 'rgb(252, 165, 165)'
                          }}>
                            {formatPercentage(item.profit_margin)}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.5rem 1rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: item.is_profitable ?
                              'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            border: item.is_profitable ?
                              '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                            color: item.is_profitable ?
                              'rgb(110, 231, 183)' : 'rgb(252, 165, 165)',
                            gap: '0.5rem'
                          }}>
                            {item.is_profitable ? (
                              <TrendingUp size={12} />
                            ) : (
                              <TrendingDown size={12} />
                            )}
                            {item.is_profitable ? "Rentável" : "Não Rentável"}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleClientDetails(item.client)}
                            style={{
                              ...glassStyle,
                              padding: '0.5rem 1rem',
                              background: 'rgba(59, 130, 246, 0.2)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: 'white',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}
                          >
                            {expandedClients[item.client] ? (
                              <>
                                <ChevronUp size={14} />
                                Menos
                              </>
                            ) : (
                              <>
                                <ChevronDown size={14} />
                                Detalhes
                              </>
                            )}
                          </motion.button>
                        </td>
                      </motion.tr>

                      {/* Linha expandida com detalhes */}
                      <AnimatePresence>
                        {expandedClients[item.client] && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <td colSpan="7" style={{
                              padding: 0,
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              <div style={{ padding: '1.5rem' }}>
                                <div style={{
                                  ...glassStyle,
                                  padding: '1.5rem',
                                  background: 'rgba(255, 255, 255, 0.05)'
                                }}>
                                  <h4 style={{
                                    margin: '0 0 1.5rem 0',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                  }}>
                                    <div style={{
                                      width: '4px',
                                      height: '24px',
                                      background: 'linear-gradient(to bottom, rgb(59, 130, 246), rgb(147, 51, 234))',
                                      borderRadius: '2px'
                                    }} />
                                    Análise Detalhada: {item.client_name}
                                  </h4>

                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                    gap: '1.5rem',
                                    marginBottom: '1.5rem'
                                  }}>
                                    {/* Análise de Tempo */}
                                    <div style={{
                                      ...glassStyle,
                                      padding: '1rem',
                                      background: 'rgba(59, 130, 246, 0.1)',
                                      border: '1px solid rgba(59, 130, 246, 0.2)'
                                    }}>
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        marginBottom: '1rem'
                                      }}>
                                        <Clock size={18} style={{ color: 'rgb(59, 130, 246)' }} />
                                        <h5 style={{
                                          margin: 0,
                                          fontSize: '0.875rem',
                                          fontWeight: '600',
                                          color: 'white'
                                        }}>
                                          Análise de Tempo
                                        </h5>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          padding: '0.5rem 0',
                                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                          <span style={{
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.7)'
                                          }}>
                                            Total de Horas:
                                          </span>
                                          <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: 'white'
                                          }}>
                                            {formatTime(item.total_time_minutes)}
                                          </span>
                                        </div>
                                        <div style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          padding: '0.5rem 0',
                                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                          <span style={{
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.7)'
                                          }}>
                                            Custo por Hora:
                                          </span>
                                          <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: 'white'
                                          }}>
                                            {formatCurrency(
                                              item.total_time_minutes > 0
                                                ? item.time_cost / (item.total_time_minutes / 60)
                                                : 0
                                            )}
                                          </span>
                                        </div>
                                        <div style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          padding: '0.5rem 0'
                                        }}>
                                          <span style={{
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.7)'
                                          }}>
                                            Última Atualização:
                                          </span>
                                          <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: 'white'
                                          }}>
                                            {new Date(item.last_updated).toLocaleDateString('pt-PT')}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Análise Financeira */}
                                    <div style={{
                                      ...glassStyle,
                                      padding: '1rem',
                                      background: 'rgba(52, 211, 153, 0.1)',
                                      border: '1px solid rgba(52, 211, 153, 0.2)'
                                    }}>
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        marginBottom: '1rem'
                                      }}>
                                        <CreditCard size={18} style={{ color: 'rgb(52, 211, 153)' }} />
                                        <h5 style={{
                                          margin: 0,
                                          fontSize: '0.875rem',
                                          fontWeight: '600',
                                          color: 'white'
                                        }}>
                                          Breakdown Financeiro
                                        </h5>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          padding: '0.5rem 0',
                                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                          <span style={{
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.7)'
                                          }}>
                                            Receita Mensal:
                                          </span>
                                          <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: 'rgb(52, 211, 153)'
                                          }}>
                                            {formatCurrency(item.monthly_fee)}
                                          </span>
                                        </div>
                                        <div style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          padding: '0.5rem 0',
                                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                          <span style={{
                                            fontSize: '0.75rem',
                                            color: 'rgba(255, 255, 255, 0.7)'
                                          }}>
                                            Custos Totais:
                                          </span>
                                          <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: 'rgb(251, 146, 60)'
                                          }}>
                                            {formatCurrency(
                                              parseFloat(item.time_cost) + parseFloat(item.total_expenses)
                                            )}
                                          </span>
                                        </div>
                                        <div style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          padding: '0.5rem 0',
                                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                          borderRadius: '8px',
                                          paddingLeft: '0.75rem',
                                          paddingRight: '0.75rem'
                                        }}>
                                          <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            color: 'white'
                                          }}>
                                            Lucro Final:
                                          </span>
                                          <span style={{
                                            fontSize: '1rem',
                                            fontWeight: '700',
                                            color: parseFloat(item.profit) >= 0 ? 'rgb(52, 211, 153)' : 'rgb(239, 68, 68)'
                                          }}>
                                            {formatCurrency(item.profit)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Recomendações AI */}
                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    style={{
                                      ...glassStyle,
                                      padding: '1rem',
                                      background: 'rgba(147, 51, 234, 0.1)',
                                      border: '1px solid rgba(147, 51, 234, 0.2)'
                                    }}
                                  >
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.75rem',
                                      marginBottom: '1rem'
                                    }}>
                                      <motion.div
                                        animate={{ rotate: [0, 360] }}
                                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                      >
                                        <Brain size={18} style={{ color: 'rgb(196, 181, 253)' }} />
                                      </motion.div>
                                      <h5 style={{
                                        margin: 0,
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: 'white'
                                      }}>
                                        Recomendações Inteligentes
                                      </h5>
                                      <Sparkles size={14} style={{ color: 'rgb(196, 181, 253)' }} />
                                    </div>
                                    <div style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.75rem'
                                    }}>
                                      {!item.is_profitable ? (
                                        <>
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.5rem',
                                            padding: '0.75rem',
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(239, 68, 68, 0.2)'
                                          }}>
                                            <AlertTriangle size={16} style={{
                                              color: 'rgb(239, 68, 68)',
                                              marginTop: '0.125rem',
                                              flexShrink: 0
                                            }} />
                                            <div>
                                              <p style={{
                                                margin: '0 0 0.25rem 0',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                color: 'white'
                                              }}>
                                                Cliente Não Rentável
                                              </p>
                                              <p style={{
                                                margin: 0,
                                                fontSize: '0.75rem',
                                                color: 'rgba(255, 255, 255, 0.8)'
                                              }}>
                                                Considere aumentar a avença ou otimizar os processos para reduzir o tempo gasto.
                                              </p>
                                            </div>
                                          </div>
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '0.5rem',
                                            padding: '0.75rem',
                                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(59, 130, 246, 0.2)'
                                          }}>
                                            <Target size={16} style={{
                                              color: 'rgb(59, 130, 246)',
                                              marginTop: '0.125rem',
                                              flexShrink: 0
                                            }} />
                                            <div>
                                              <p style={{
                                                margin: '0 0 0.25rem 0',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                color: 'white'
                                              }}>
                                                Sugestão de Melhoria
                                              </p>
                                              <p style={{
                                                margin: 0,
                                                fontSize: '0.75rem',
                                                color: 'rgba(255, 255, 255, 0.8)'
                                              }}>
                                                Avença sugerida: {formatCurrency(
                                                  (parseFloat(item.time_cost) + parseFloat(item.total_expenses)) * 1.3
                                                )} (margem de 30%)
                                              </p>
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          gap: '0.5rem',
                                          padding: '0.75rem',
                                          backgroundColor: 'rgba(52, 211, 153, 0.1)',
                                          borderRadius: '8px',
                                          border: '1px solid rgba(52, 211, 153, 0.2)'
                                        }}>
                                          <Target size={16} style={{
                                            color: 'rgb(52, 211, 153)',
                                            marginTop: '0.125rem',
                                            flexShrink: 0
                                          }} />
                                          <div>
                                            <p style={{
                                              margin: '0 0 0.25rem 0',
                                              fontSize: '0.75rem',
                                              fontWeight: '600',
                                              color: 'white'
                                            }}>
                                              Cliente Rentável
                                            </p>
                                            <p style={{
                                              margin: 0,
                                              fontSize: '0.75rem',
                                              color: 'rgba(255, 255, 255, 0.8)'
                                            }}>
                                              Ótima performance! Considere expandir os serviços para este cliente.
                                            </p>
                                          </div>
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

        {/* Insights Finais */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Clientes Mais Rentáveis */}
          <motion.div
            variants={itemVariants}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              background: 'rgba(52, 211, 153, 0.05)',
              border: '1px solid rgba(52, 211, 153, 0.2)',
              marginTop: '1.5rem'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <TrendingUp size={20} style={{ color: 'rgb(52, 211, 153)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'white' }}>
                Top Clientes Rentáveis
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredData
                .filter(item => item.is_profitable)
                .sort((a, b) => parseFloat(b.profit_margin) - parseFloat(a.profit_margin))
                .slice(0, 3)
                .map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      backgroundColor: 'rgba(52, 211, 153, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(52, 211, 153, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(52, 211, 153, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'white'
                      }}>
                        #{index + 1}
                      </div>
                      <div>
                        <p style={{
                          margin: 0,
                          fontWeight: '600',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}>
                          {item.client_name}
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                          {formatCurrency(item.monthly_fee)} receita
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        margin: 0,
                        fontWeight: '700',
                        color: 'rgb(52, 211, 153)',
                        fontSize: '0.875rem'
                      }}>
                        {formatPercentage(item.profit_margin)}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>
                        margem
                      </p>
                    </div>
                  </motion.div>
                ))}

              {filteredData.filter(item => item.is_profitable).length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  <TrendingUp size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    Nenhum cliente rentável no período selecionado.
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Clientes Problemáticos */}
          <motion.div
            variants={itemVariants}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginTop: '1.5rem'

            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <AlertTriangle size={20} style={{ color: 'rgb(239, 68, 68)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'white' }}>
                Clientes Críticos
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredData
                .filter(item => !item.is_profitable)
                .sort((a, b) => parseFloat(a.profit_margin) - parseFloat(b.profit_margin))
                .slice(0, 3)
                .map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'white'
                      }}>
                        !
                      </div>
                      <div>
                        <p style={{
                          margin: 0,
                          fontWeight: '600',
                          color: 'white',
                          fontSize: '0.875rem'
                        }}>
                          {item.client_name}
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}>
                          {formatTime(item.total_time_minutes)} investidas
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{
                        margin: 0,
                        fontWeight: '700',
                        color: 'rgb(239, 68, 68)',
                        fontSize: '0.875rem'
                      }}>
                        {formatPercentage(item.profit_margin)}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}>
                        prejuízo
                      </p>
                    </div>
                  </motion.div>
                ))}

              {filteredData.filter(item => !item.is_profitable).length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'rgba(255, 255, 255, 0.6)'
                }}>
                  <Target size={32} style={{ marginBottom: '0.5rem', opacity: 0.5, color: 'rgb(52, 211, 153)' }} />
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    Excelente! Todos os clientes são rentáveis.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 100
        }}
      >
        <motion.button
          whileHover={{
            scale: 1.1,
            boxShadow: '0 0 30px rgba(147, 51, 234, 0.5)'
          }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgb(147, 51, 234), rgb(196, 181, 253))',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(147, 51, 234, 0.3)',
            backdropFilter: 'blur(12px)'
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Brain size={24} />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* CSS personalizado para animações */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        input::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }
        
        select option {
          background: #1f2937 !important;
          color: white !important;
        }
        
        /* Scrollbar personalizada */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        /* Smooth transitions para todos os elementos */
        * {
          transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease;
        }
        
        /* Efeito hover suave para botões */
        button:hover {
          transform: translateY(-1px);
        }
        
        /* Animação para loading states */
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        /* Melhores efeitos de glass morphism */
        .glass-effect {
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
        }
      `}</style>
    </div>
  );
};

export default ClientProfitability;

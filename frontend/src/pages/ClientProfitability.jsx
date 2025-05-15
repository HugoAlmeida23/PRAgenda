import React, { useState, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify";
import Header from "../components/Header";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import "../styles/Home.css";
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
} from "lucide-react";

// Animation variants remain the same
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      when: "beforeChildren",
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
  hover: {
    y: -5,
    boxShadow:
      "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
};

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

// Generate years for dropdown (current year and 5 years back)
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 6; i++) {
    years.push(currentYear - i);
  }
  return years;
};

const years = generateYears();

// Data fetching functions (outside component)
const fetchProfitabilityData  = async (year, month) => {
  // Then fetch updated data
  const response = await api.get(`/client-profitability/?year=${year}&month=${month}`);
  console.log("Dados de rentabilidade brutos:", response.data);
  return response.data;
};

const fetchTimeEntries = async () => {
  const response = await api.get("/time-entries/");
  return response.data;
};

const fetchClients = async () => {
  const response = await api.get("/clients/");
  return response.data;
};

const ClientProfitability = () => {
  const queryClient = useQueryClient();
  
  // Local state
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
  });
  const [expandedClients, setExpandedClients] = useState({});

  // React Query hooks
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
  });

  const {
    data: timeEntries = [],
    isLoading: isTimeEntriesLoading
  } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: fetchTimeEntries,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: clients = [],
    isLoading: isClientsLoading
  } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation for isRefreshing data
  const refreshDataMutation = useMutation({
    mutationFn: () => api.post("/client-profitability/", {
      year: selectedYear,
      month: selectedMonth,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profitability'] });
      toast.success("Dados de rentabilidade atualizados com sucesso!");
    },
    onError: (error) => {
      console.error("Error isRefreshing profitability data:", error);
      toast.error("Falha ao atualizar dados de rentabilidade");
    }
  });

  // Derived state using useMemo
  const filteredData = useMemo(() => {
    if (!profitabilityData || profitabilityData.length === 0) return [];
    
    // Start with all data
    let filtered = [...profitabilityData];

    // Apply client filter
    if (filters.client) {
      filtered = filtered.filter(
        (item) => item.client === filters.client
      );
    }

    // Apply profitability filters
    if (filters.profitableOnly && !filters.unprofitableOnly) {
      filtered = filtered.filter((item) => item.is_profitable);
    } else if (!filters.profitableOnly && filters.unprofitableOnly) {
      filtered = filtered.filter((item) => !item.is_profitable);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // Handle null values
        if (a[sortConfig.key] === null) return 1;
        if (b[sortConfig.key] === null) return -1;

        // Parse numerical values
        const valA =
          typeof a[sortConfig.key] === "string" &&
          !isNaN(parseFloat(a[sortConfig.key]))
            ? parseFloat(a[sortConfig.key])
            : a[sortConfig.key];
        const valB =
          typeof b[sortConfig.key] === "string" &&
          !isNaN(parseFloat(b[sortConfig.key]))
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

  // Calculate summary stats with useMemo
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

    const profitableClients = filteredData.filter((item) => item.is_profitable).length;
    const unprofitableClients = filteredData.filter(
      (item) => !item.is_profitable
    ).length;
    const totalRevenue = filteredData.reduce(
      (sum, item) => sum + (parseFloat(item.monthly_fee) || 0),
      0
    );
    const totalCost = filteredData.reduce(
      (sum, item) =>
        sum +
        (parseFloat(item.time_cost) || 0) +
        (parseFloat(item.total_expenses) || 0),
      0
    );
    const totalProfit = filteredData.reduce(
      (sum, item) => sum + (parseFloat(item.profit) || 0),
      0
    );
    const margins = filteredData
      .filter((item) => item.profit_margin !== null)
      .map((item) => parseFloat(item.profit_margin) || 0);
    const averageMargin =
      margins.length > 0
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

  // Event handlers
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

  const handlePeriodChange = () => {
    // Will automatically trigger a refetch due to query key dependencies
    refetchProfitability();
  };

  const resetFilters = () => {
    setFilters({
      client: "",
      profitableOnly: false,
      unprofitableOnly: false,
    });
  };

  const refreshData = () => {
    refreshDataMutation.mutate();
  };

  const toggleClientDetails = (clientId) => {
    setExpandedClients({
      ...expandedClients,
      [clientId]: !expandedClients[clientId],
    });
  };

  // Helper functions
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

  const getClientTimeEntries = (clientId) => {
    return timeEntries.filter((entry) => entry.client === clientId);
  };

  // Combined isLoading state
  const isLoading = isProfitabilityLoading || isTimeEntriesLoading || isClientsLoading;
  const isRefreshing = refreshDataMutation.isPending;


  return (
    <div className="bg-white main">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <Header className="bg-white">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="bg-white p-6 min-h-screen"
          style={{ marginLeft: "3%" }}
        >
          <div className="bg-white max-w-7xl mx-auto">
            <motion.div
              variants={itemVariants}
              className="bg-white flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
            >
              <h1 className="text-2xl font-bold">Análise de Rentabilidade</h1>
              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={refreshData}
                  disabled={isLoading || isRefreshing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={18} className="mr-2" />
                      Atualizar Dados
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={fetchProfitabilityData}
                  disabled={isLoading || isRefreshing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm"
                >
                  <Download size={18} className="mr-2" />
                  Exportar Relatório
                </motion.button>
              </div>
            </motion.div>

            {/* Period Selector */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold mb-4">Selecionar Período</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Ano</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Mês</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Total Revenue Card */}
              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="bg-white p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-green-100 text-green-700 mr-2">
                    <DollarSign size={24} strokeWidth={1.5} />
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-600 text-sm font-medium">
                      Receita Total
                    </p>
                    {isLoading ? (
                      <div className="flex items-center space-x-2 mt-4">
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                        <span className="text-sm text-gray-500"></span>
                      </div>
                    ) : (
                      <h3 className="text-2xl font-bold text-gray-900 mt-4">
                        {formatCurrency(summaryStats.totalRevenue)}
                      </h3>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Total Profit Card */}
              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="bg-white p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-blue-100 text-blue-700 mr-2">
                    <TrendingUp size={24} strokeWidth={1.5} />
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-600 text-sm font-medium">
                      Lucro Total
                    </p>
                    {isLoading ? (
                      <div className="flex items-center space-x-2 mt-4">
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                        <span className="text-sm text-gray-500"></span>
                      </div>
                    ) : (
                      <h3 className="text-2xl font-bold text-gray-900 mt-4">
                        {formatCurrency(summaryStats.totalProfit)}
                      </h3>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Average Margin Card */}
              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="bg-white p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-purple-100 text-purple-700 mr-2">
                    <PieChart size={24} strokeWidth={1.5} />
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-600 text-sm font-medium">
                      Margem Média
                    </p>
                    {isLoading ? (
                      <div className="flex items-center space-x-2 mt-4">
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                        <span className="text-sm text-gray-500"></span>
                      </div>
                    ) : (
                      <h3 className="text-2xl font-bold text-gray-900 mt-4">
                        {formatPercentage(summaryStats.averageMargin)}
                      </h3>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Client Status Card */}
              <motion.div
                variants={cardVariants}
                whileHover="hover"
                className="bg-white p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-all duration-300"
              >
                {" "}
                <div className="flex items-center">
                  <div className="p-3 rounded-lg bg-amber-100 text-amber-700 mr-2">
                    <Users size={24} strokeWidth={1.5} />
                  </div>
                  <div className="ml-4">
                    <p className="text-gray-600 text-sm font-medium">
                      Status de Clientes
                    </p>
                    {isLoading ? (
                      <div className="flex items-center space-x-2 mt-4">
                        <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                        <span className="text-sm text-gray-500"></span>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center space-x-4">
                        <div className="flex items-center">
                          <span className="h-3 w-3 bg-green-500 rounded-full mr-1"></span>
                          <span className="text-sm">
                            {summaryStats.profitableClients} Rentáveis
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="h-3 w-3 bg-red-500 rounded-full mr-1"></span>
                          <span className="text-sm">
                            {summaryStats.unprofitableClients} Não Rentáveis
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <h2 className="text-lg font-semibold mb-4 md:mb-0">Filtros</h2>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="profitableOnly"
                      name="profitableOnly"
                      checked={filters.profitableOnly}
                      onChange={handleFilterChange}
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                    <label htmlFor="profitableOnly" className="ml-2 mr-2">
                      Apenas Rentáveis
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="unprofitableOnly"
                      name="unprofitableOnly"
                      checked={filters.unprofitableOnly}
                      onChange={handleFilterChange}
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                    <label htmlFor="unprofitableOnly" className="ml-2">
                      Apenas Não Rentáveis
                    </label>
                  </div>
                </div>
                <div className="w-full md:w-1/3 mt-4 md:mt-0">
                  <div className="relative">
                    <select
                      name="client"
                      value={filters.client}
                      onChange={handleFilterChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Todos os Clientes</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    <Users
                      className="absolute left-3 top-2.5 text-gray-400"
                      size={18}
                    />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={resetFilters}
                  disabled={isLoading || isRefreshing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm"
                >
                  Limpar Filtros
                </motion.button>
              </div>
            </div>

            {/* Profitability Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="text-xl font-semibold p-6 border-b">
                Análise de Rentabilidade por Cliente
              </h2>

              {isLoading ? (
                <div className="p-6 flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : profitabilityData.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Nenhum dado de rentabilidade encontrado para o período
                  selecionado.
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white-50">
                        <tr>
                          <th className="px-6 py-4 border-b border-gray-200">
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleSort("client_name")}
                              disabled={isLoading || isRefreshing}
                              className="bg-blue-200 hover:bg-blue-700 text-white px-4 
                              py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm text-xs font-medium"
                            >
                              Cliente
                              <span className="ml-2">
                                {sortConfig.key === "client_name" ? (
                                  sortConfig.direction === "asc" ? (
                                    <ChevronUp
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  )
                                ) : (
                                  <ChevronDown
                                    size={14}
                                    className="text-gray-400"
                                  />
                                )}
                              </span>
                            </motion.button>
                          </th>
                          <th className="px-6 py-4 border-b border-gray-200">
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleSort("monthly_fee")}
                              disabled={isLoading || isRefreshing}
                              className="bg-blue-200 hover:bg-blue-700 text-white px-4 
                              py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm text-xs font-medium"
                            >
                              Avença Mensal
                              <span className="ml-2">
                                {sortConfig.key === "monthly_fee" ? (
                                  sortConfig.direction === "asc" ? (
                                    <ChevronUp
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  )
                                ) : (
                                  <ChevronDown
                                    size={14}
                                    className="text-gray-400"
                                  />
                                )}
                              </span>
                            </motion.button>
                          </th>
                          <th className="px-6 py-4 border-b border-gray-200">
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleSort("time_cost")}
                              disabled={isLoading || isRefreshing}
                              className="bg-blue-200 hover:bg-blue-700 text-white px-4 
                              py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm text-xs font-medium"
                            >
                              Custo do Tempo
                              <span className="ml-2">
                                {sortConfig.key === "time_cost" ? (
                                  sortConfig.direction === "asc" ? (
                                    <ChevronUp
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  )
                                ) : (
                                  <ChevronDown
                                    size={14}
                                    className="text-gray-400"
                                  />
                                )}
                              </span>
                            </motion.button>
                          </th>
                          <th className="px-6 py-4 border-b border-gray-200">
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleSort("total_expenses")}
                              disabled={isLoading || isRefreshing}
                              className="bg-blue-200 hover:bg-blue-700 text-white px-4 
                              py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm text-xs font-medium"
                            >
                              Despesas
                              <span className="ml-2">
                                {sortConfig.key === "total_expenses" ? (
                                  sortConfig.direction === "asc" ? (
                                    <ChevronUp
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  )
                                ) : (
                                  <ChevronDown
                                    size={14}
                                    className="text-gray-400"
                                  />
                                )}
                              </span>
                            </motion.button>
                          </th>
                          <th className="px-6 py-4 border-b border-gray-200">
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleSort("profit")}
                              disabled={isLoading || isRefreshing}
                              className="bg-blue-200 hover:bg-blue-700 text-white px-4 
                              py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm text-xs font-medium"
                            >
                              Lucro
                              <span className="ml-2">
                                {sortConfig.key === "profit" ? (
                                  sortConfig.direction === "asc" ? (
                                    <ChevronUp
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  )
                                ) : (
                                  <ChevronDown
                                    size={14}
                                    className="text-gray-400"
                                  />
                                )}
                              </span>
                            </motion.button>
                          </th>
                          <th className="px-6 py-4 border-b border-gray-200">
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleSort("profit_margin")}
                              disabled={isLoading || isRefreshing}
                              className="bg-blue-200 hover:bg-blue-700 text-white px-4 
                              py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm text-xs font-medium"
                            >
                              Margem
                              <span className="ml-2">
                                {sortConfig.key === "profit_margin" ? (
                                  sortConfig.direction === "asc" ? (
                                    <ChevronUp
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  ) : (
                                    <ChevronDown
                                      size={14}
                                      className="text-blue-600"
                                    />
                                  )
                                ) : (
                                  <ChevronDown
                                    size={14}
                                    className="text-gray-400"
                                  />
                                )}
                              </span>
                            </motion.button>
                          </th>
                          <th className="px-6 py-4 border-b border-gray-200">
                            <span className="text-xs font-medium text-gray-600">
                              Status
                            </span>
                          </th>
                          <th className="px-6 py-4 border-b border-gray-200">
                            <span className="text-xs font-medium text-gray-600">
                              Ações
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((item) => (
                          <React.Fragment key={item.id}>
                            <tr
                              className={`transition-colors hover:bg-white-50 ${
                                item.is_profitable ? "" : "bg-red-50"
                              }`}
                            >
                              <td className="px-6 py-4 border-b border-gray-100">
                                <div className="font-medium text-gray-900">
                                  {item.client_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 border-b border-gray-100">
                                <div className="font-medium">
                                  {formatCurrency(item.monthly_fee)}
                                </div>
                              </td>
                              <td className="px-6 py-4 border-b border-gray-100">
                                <div className="font-medium">
                                  {formatCurrency(item.time_cost)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {formatTime(item.total_time_minutes)}
                                </div>
                              </td>
                              <td className="px-6 py-4 border-b border-gray-100">
                                <div className="font-medium">
                                  {formatCurrency(item.total_expenses)}
                                </div>
                              </td>
                              <td className="px-6 py-4 border-b border-gray-100">
                                <span
                                  className={`font-medium ${
                                    parseFloat(item.profit) >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(item.profit)}
                                </span>
                              </td>
                              <td className="px-6 py-4 border-b border-gray-100">
                                <span
                                  className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    parseFloat(item.profit_margin) >= 0
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {formatPercentage(item.profit_margin)}
                                </span>
                              </td>
                              <td className="px-6 py-4 border-b border-gray-100">
                                <span
                                  className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    item.is_profitable
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {item.is_profitable
                                    ? "Rentável"
                                    : "Não Rentável"}
                                </span>
                              </td>
                              <td className="px-6 py-4 border-b border-gray-100">
                                <motion.button
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() =>
                                    toggleClientDetails(item.client)
                                  }
                                  disabled={isLoading || isRefreshing}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm"
                                >
                                  {expandedClients[item.client] ? (
                                    <>
                                      <ChevronUp size={16} className="mr-1" />
                                      <span className="text-sm">Esconder</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={16} className="mr-1" />
                                      <span className="text-sm">Detalhes</span>
                                    </>
                                  )}
                                </motion.button>
                              </td>
                            </tr>
                            {expandedClients[item.client] && (
                              <tr>
                                <td
                                  colSpan="8"
                                  className="px-6 py-4 border-b border-gray-100 bg-white-50"
                                >
                                  <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
                                    <h4 className="text-base font-medium text-gray-900 mb-4 flex items-center">
                                      <span className="w-1 h-6 bg-blue-600 rounded-full mr-3"></span>
                                      Detalhes de Rentabilidade:{" "}
                                      {item.client_name}
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                      <div className="bg-white-50 rounded-lg p-4">
                                        <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                          <Clock
                                            size={16}
                                            className="mr-2 text-blue-600"
                                          />
                                          Análise de Tempo
                                        </h5>
                                        <div className="space-y-3">
                                          <div className="flex justify-between border-b border-gray-200 pb-2">
                                            <span className="text-sm text-gray-600">
                                              Total de Horas:
                                            </span>
                                            <span className="text-sm font-medium">
                                              {formatTime(
                                                item.total_time_minutes
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex justify-between border-b border-gray-200 pb-2">
                                            <span className="text-sm text-gray-600">
                                              Custo Médio por Hora:
                                            </span>
                                            <span className="text-sm font-medium">
                                              {formatCurrency(
                                                item.total_time_minutes > 0
                                                  ? item.time_cost /
                                                      (item.total_time_minutes /
                                                        60)
                                                  : 0
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex justify-between pb-2">
                                            <span className="text-sm text-gray-600">
                                              Última Atualização:
                                            </span>
                                            <span className="text-sm font-medium">
                                              {new Date(
                                                item.last_updated
                                              ).toLocaleDateString()}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="bg-white-50 rounded-lg p-4">
                                        <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                          <CreditCard
                                            size={16}
                                            className="mr-2 text-blue-600"
                                          />
                                          Rentabilidade
                                        </h5>
                                        <div className="space-y-3">
                                          <div className="flex justify-between border-b border-gray-200 pb-2">
                                            <span className="text-sm text-gray-600">
                                              Receita Total:
                                            </span>
                                            <span className="text-sm font-medium">
                                              {formatCurrency(item.monthly_fee)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between border-b border-gray-200 pb-2">
                                            <span className="text-sm text-gray-600">
                                              Custos Totais:
                                            </span>
                                            <span className="text-sm font-medium">
                                              {formatCurrency(
                                                parseFloat(item.time_cost) +
                                                  parseFloat(
                                                    item.total_expenses
                                                  )
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex justify-between pb-2">
                                            <span className="text-sm text-gray-600">
                                              Lucro:
                                            </span>
                                            <span
                                              className={`text-sm font-medium ${
                                                parseFloat(item.profit) >= 0
                                                  ? "text-green-600"
                                                  : "text-red-600"
                                              }`}
                                            >
                                              {formatCurrency(item.profit)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="bg-white-50 rounded-lg p-4">
                                      <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                        <Calendar
                                          size={16}
                                          className="mr-2 text-blue-600"
                                        />
                                        Entradas de Tempo Recentes
                                      </h5>
                                      <div className="overflow-hidden rounded-lg border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                          <thead>
                                            <tr className="bg-white-100">
                                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                                                Data
                                              </th>
                                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                                                Descrição
                                              </th>
                                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                                                Tempo
                                              </th>
                                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                                                Usuário
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-white divide-y divide-gray-200">
                                            {getClientTimeEntries(item.client)
                                              .slice(0, 5)
                                              .map((entry) => (
                                                <tr
                                                  key={entry.id}
                                                  className="hover:bg-white-50 transition-colors"
                                                >
                                                  <td className="px-4 py-3 whitespace-nowrap">
                                                    {entry.date}
                                                  </td>
                                                  <td className="px-4 py-3">
                                                    <div className="truncate max-w-xs">
                                                      {entry.description}
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-3 whitespace-nowrap">
                                                    {formatTime(
                                                      entry.minutes_spent
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-3 whitespace-nowrap">
                                                    {entry.user_name}
                                                  </td>
                                                </tr>
                                              ))}
                                            {getClientTimeEntries(item.client)
                                              .length === 0 && (
                                              <tr>
                                                <td
                                                  colSpan="4"
                                                  className="px-4 py-3 text-center text-gray-500"
                                                >
                                                  Nenhuma entrada de tempo
                                                  encontrada
                                                </td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                      {getClientTimeEntries(item.client)
                                        .length > 5 && (
                                        <div className="mt-3 text-right">
                                          <a
                                            href={`/time-entries?client=${item.client}`}
                                            className="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center px-3 py-1 rounded-md hover:bg-blue-50 transition-colors"
                                          >
                                            Ver todas as entradas{" "}
                                            <ChevronRight
                                              size={14}
                                              className="ml-1"
                                            />
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Cards Section with Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Most Profitable Clients */}
              <div className="bg-white p-6 rounded-xl shadow-md border border-green-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp size={20} className="mr-2 text-green-600" />
                  Clientes Mais Rentáveis
                </h3>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    </div>
                  ) : (
                    filteredData
                      .filter((item) => item.is_profitable)
                      .sort(
                        (a, b) =>
                          parseFloat(b.profit_margin) -
                          parseFloat(a.profit_margin)
                      )
                      .slice(0, 5)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-white-50 rounded-lg"
                        >
                          <div className="flex items-center">
                            <div className="p-2 rounded-full bg-green-100 mr-3">
                              <Briefcase size={16} className="text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium">{item.client_name}</p>
                              <p className="text-xs text-gray-500">
                                {formatCurrency(item.monthly_fee)} de receita
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              {formatPercentage(item.profit_margin)}
                            </p>
                            <p className="text-xs text-gray-500">margem</p>
                          </div>
                        </div>
                      ))
                  )}

                  {!isLoading &&
                    profitabilityData.filter((item) => item.is_profitable)
                      .length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        Nenhum cliente rentável no período selecionado.
                      </div>
                    )}
                </div>
              </div>

              {/* Problematic Clients */}
              <div className="bg-white p-6 rounded-xl shadow-md border border-red-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertTriangle size={20} className="mr-2 text-red-600" />
                  Clientes Com Problemas de Rentabilidade
                </h3>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    </div>
                  ) : (
                    profitabilityData
                      .filter((item) => !item.is_profitable)
                      .sort(
                        (a, b) =>
                          parseFloat(a.profit_margin) -
                          parseFloat(b.profit_margin)
                      )
                      .slice(0, 5)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                        >
                          <div className="flex items-center">
                            <div className="p-2 rounded-full bg-red-100 mr-3">
                              <Briefcase size={16} className="text-red-600" />
                            </div>
                            <div>
                              <p className="font-medium">{item.client_name}</p>
                              <p className="text-xs text-gray-500">
                                {formatTime(item.total_time_minutes)} investidas
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600">
                              {formatPercentage(item.profit_margin)}
                            </p>
                            <p className="text-xs text-gray-500">margem</p>
                          </div>
                        </div>
                      ))
                  )}

                  {!isLoading &&
                    profitabilityData.filter((item) => !item.is_profitable)
                      .length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        Nenhum cliente não rentável no período selecionado.
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </Header>
    </div>
  );
};

export default ClientProfitability;

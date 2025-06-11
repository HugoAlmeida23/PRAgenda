import React, { useState, useMemo, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import api from "../api";
import {
  User,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Clock,
  FileText,
  DollarSign,
  AlertTriangle,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  BarChart2,
  ArrowRight,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Settings,
  Grid,
  List,
  SlidersHorizontal,
  Download,
  Phone,
  Mail,
  MapPin,
  Tag,
  Info,
  Loader2,
  RefreshCw,
  Brain,
  Sparkles,
  Activity,
  Target,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Building,
  Euro,
  UserCheck,
  X
} from "lucide-react";
import { usePermissions } from "../contexts/PermissionsContext";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundElements from "../components/HeroSection/BackgroundElements";
import TagManager from "../components/TagManager";
import ClientDetailsModal from "../components/ClientDetailsModel";

// Data fetching functions
const fetchClientsData = async () => {
  const [clientsRes, usersRes] = await Promise.all([
    api.get("/clients/"),
    api.get("/profiles/")
  ]);
  return {
    clients: clientsRes.data || [],
    users: usersRes.data || []
  };
};

// Componente para alternar entre visualizações
const ViewToggle = ({ activeView, onChange }) => {
  return (
    <div style={{
      display: 'inline-flex',
      borderRadius: '8px',
      overflow: 'hidden',
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onChange('grid')}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: activeView === 'grid' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
          color: 'white'
        }}
      >
        <Grid size={16} />
        Cartões
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onChange('list')}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: activeView === 'list' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
          color: 'white'
        }}
      >
        <List size={16} />
        Tabela
      </motion.button>
    </div>
  );
};

// Componente de Card de Cliente
const ClientCard = ({ client, onEdit, onToggleStatus, onDelete, permissions, onClick }) => {
  const { isOrgAdmin, canEditClients, canChangeClientStatus, canDeleteClients } = permissions;

  // Estilos glass
  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        ...glassStyle,
        padding: '1.5rem',
        cursor: 'pointer',
        opacity: client.is_active ? 1 : 0.7,
        background: client.is_active
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(239, 68, 68, 0.1)',
        border: client.is_active
          ? '1px solid rgba(255, 255, 255, 0.15)'
          : '1px solid rgba(239, 68, 68, 0.2)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '1rem',
          color: 'rgb(59, 130, 246)',
          fontWeight: '600'
        }}>
          <User size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white'
          }}>
            {client.name}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: '600',
              background: client.is_active
                ? 'rgba(52, 211, 153, 0.2)'
                : 'rgba(239, 68, 68, 0.2)',
              border: client.is_active
                ? '1px solid rgba(52, 211, 153, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.3)',
              color: client.is_active
                ? 'rgb(110, 231, 183)'
                : 'rgb(252, 165, 165)'
            }}>
              {client.is_active ? 'Ativo' : 'Inativo'}
            </span>
            {client.nif && (
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                background: 'rgba(147, 51, 234, 0.2)',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                color: 'rgb(196, 181, 253)'
              }}>
                NIF: {client.nif}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        {client.email && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.875rem'
          }}>
            <Mail size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
            <span>{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.875rem'
          }}>
            <Phone size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
            <span>{client.phone}</span>
          </div>
        )}
        {client.address && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.875rem'
          }}>
            <MapPin size={16} style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {client.address}
            </span>
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <span style={{
          fontSize: '0.875rem',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>
          Avença Mensal:
        </span>
        <span style={{
          fontSize: '1rem',
          fontWeight: '600',
          color: 'rgb(52, 211, 153)'
        }}>
          {client.monthly_fee ? `${client.monthly_fee} €` : 'Não definida'}
        </span>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href={`/tasks?client=${client.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              background: 'rgba(251, 191, 36, 0.2)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: '6px',
              color: 'rgb(251, 191, 36)',
              fontSize: '0.75rem',
              textDecoration: 'none'
            }}
          >
            <Clock size={12} />
            Tarefas
          </motion.a>
          <motion.a
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            href={`/timeentry?client=${client.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem',
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '6px',
              color: 'rgb(59, 130, 246)',
              fontSize: '0.75rem',
              textDecoration: 'none'
            }}
          >
            <FileText size={12} />
            Registros
          </motion.a>
        </div>

        <motion.a
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          href={`/clientprofitability?client=${client.id}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(52, 211, 153, 0.2)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            borderRadius: '8px',
            color: 'rgb(52, 211, 153)',
            fontSize: '0.875rem',
            fontWeight: '500',
            textDecoration: 'none'
          }}
        >
          <BarChart2 size={14} />
          Rentabilidade
        </motion.a>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          gap: '0.5rem'
        }}>
          {(isOrgAdmin || canEditClients) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(client);
              }}
              style={{
                background: 'rgba(147, 51, 234, 0.2)',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                borderRadius: '6px',
                padding: '0.5rem',
                color: 'rgb(147, 51, 234)',
                cursor: 'pointer'
              }}
              title="Editar cliente"
            >
              <Edit size={16} />
            </motion.button>
          )}

          {(isOrgAdmin || canChangeClientStatus) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(client);
              }}
              style={{
                background: client.is_active
                  ? 'rgba(251, 146, 60, 0.2)'
                  : 'rgba(52, 211, 153, 0.2)',
                border: client.is_active
                  ? '1px solid rgba(251, 146, 60, 0.3)'
                  : '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: '6px',
                padding: '0.5rem',
                color: client.is_active
                  ? 'rgb(251, 146, 60)'
                  : 'rgb(52, 211, 153)',
                cursor: 'pointer'
              }}
              title={client.is_active ? "Desativar" : "Ativar"}
            >
              {client.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
            </motion.button>
          )}

          {(isOrgAdmin || canDeleteClients) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(client.id);
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '0.5rem',
                color: 'rgb(239, 68, 68)',
                cursor: 'pointer'
              }}
              title="Excluir cliente"
            >
              <Trash2 size={16} />
            </motion.button>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          Detalhes <ArrowRight size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
};

// Componente principal
const ClientManagement = () => {
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  // Estados locais
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [filters, setFilters] = useState({
    active: true,
    hasEmail: null,
    hasPhone: null,
    hasNif: null,
    hasMonthlyFee: null,
    accountManager: '',
    minMonthlyFee: '',
    maxMonthlyFee: ''
  });
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    nif: "",
    email: "",
    phone: "",
    address: "",
    monthly_fee: "",
    notes: "",
    fiscal_tags: [],
    is_active: true
  });

  // React Query para buscar dados
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['clientsData'],
    queryFn: fetchClientsData,
    staleTime: 5 * 60 * 1000,
  });

  const clients = data?.clients || [];
  const users = data?.users || [];

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: (newClientData) => api.post("/clients/", newClientData),
    onSuccess: () => {
      toast.success("Cliente criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['clientsData'] });
      resetForm();
    },
    onError: (err) => {
      console.error("Error creating client:", err);
      toast.error("Falha ao criar cliente");
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, updatedData }) => api.put(`/clients/${id}/`, updatedData),
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['clientsData'] });
      setShowClientModal(false);
    },
    onError: (err) => {
      console.error("Error updating client:", err);
      toast.error("Falha ao atualizar cliente");
    }
  });

  const toggleClientStatusMutation = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/clients/${id}/`, { is_active }),
    onSuccess: () => {
      toast.success("Status do cliente atualizado");
      queryClient.invalidateQueries({ queryKey: ['clientsData'] });
    },
    onError: (err) => {
      console.error("Error toggling client status:", err);
      toast.error("Falha ao atualizar status do cliente");
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: (clientId) => api.delete(`/clients/${clientId}/`),
    onSuccess: () => {
      toast.success("Cliente excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ['clientsData'] });
    },
    onError: (err) => {
      console.error("Error deleting client:", err);
      toast.error("Falha ao excluir cliente");
    }
  });

  // Dados filtrados
  const filteredClients = useMemo(() => {
    if (!clients) return [];

    let result = [...clients];

    // Aplicar busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(client =>
        client.name?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.nif?.includes(term)
      );
    }

    // Aplicar filtros
    if (filters.active) {
      result = result.filter(client => client.is_active);
    }

    // Filtro por email
    if (filters.hasEmail === true) {
      result = result.filter(client => client.email && client.email.trim() !== '');
    } else if (filters.hasEmail === false) {
      result = result.filter(client => !client.email || client.email.trim() === '');
    }

    // Filtro por telefone
    if (filters.hasPhone === true) {
      result = result.filter(client => client.phone && client.phone.trim() !== '');
    } else if (filters.hasPhone === false) {
      result = result.filter(client => !client.phone || client.phone.trim() === '');
    }

    // Filtro por NIF
    if (filters.hasNif === true) {
      result = result.filter(client => client.nif && client.nif.trim() !== '');
    } else if (filters.hasNif === false) {
      result = result.filter(client => !client.nif || client.nif.trim() === '');
    }

    // Filtro por avença mensal
    if (filters.hasMonthlyFee === true) {
      result = result.filter(client => client.monthly_fee && parseFloat(client.monthly_fee) > 0);
    } else if (filters.hasMonthlyFee === false) {
      result = result.filter(client => !client.monthly_fee || parseFloat(client.monthly_fee) <= 0);
    }

    // Filtro por gestor de conta
    if (filters.accountManager) {
      result = result.filter(client => client.account_manager === parseInt(filters.accountManager));
    }

    // Filtro por valor mínimo da avença
    if (filters.minMonthlyFee) {
      const minValue = parseFloat(filters.minMonthlyFee);
      if (!isNaN(minValue)) {
        result = result.filter(client => {
          const clientFee = parseFloat(client.monthly_fee) || 0;
          return clientFee >= minValue;
        });
      }
    }

    // Filtro por valor máximo da avença
    if (filters.maxMonthlyFee) {
      const maxValue = parseFloat(filters.maxMonthlyFee);
      if (!isNaN(maxValue)) {
        result = result.filter(client => {
          const clientFee = parseFloat(client.monthly_fee) || 0;
          return clientFee <= maxValue;
        });
      }
    }

    // Aplicar ordenação
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] === null) return 1;
        if (b[sortConfig.key] === null) return -1;

        const valA = typeof a[sortConfig.key] === "string"
          ? a[sortConfig.key].toLowerCase()
          : a[sortConfig.key];
        const valB = typeof b[sortConfig.key] === "string"
          ? b[sortConfig.key].toLowerCase()
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

    return result;
  }, [clients, searchTerm, filters, sortConfig]);



  // Event handlers
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, type, checked, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }, []);

  const handleSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      nif: "",
      email: "",
      phone: "",
      address: "",
      monthly_fee: "",
      notes: "",
      is_active: true
    });
    setSelectedClient(null);
    setShowForm(false);
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (selectedClient) {
      if (!permissions.isOrgAdmin && !permissions.canEditClients) {
        toast.error("Você não tem permissão para editar clientes");
        return;
      }
      updateClientMutation.mutate({ id: selectedClient.id, updatedData: formData });
    } else {
      if (!permissions.isOrgAdmin && !permissions.canCreateClients) {
        toast.error("Você não tem permissão para criar clientes");
        return;
      }
      createClientMutation.mutate(formData);
    }
  }, [selectedClient, formData, createClientMutation, updateClientMutation, permissions]);

  const selectClientForEdit = useCallback((client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name || "",
      nif: client.nif || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      monthly_fee: client.monthly_fee || "",
      notes: client.notes || "",
      is_active: client.is_active
    });
    setShowForm(true);
  }, []);

  const handleViewClientDetails = useCallback((client) => {
    setSelectedClient(client);
    setShowClientModal(true);
  }, []);

  const toggleClientStatus = useCallback((client) => {
    if (!permissions.isOrgAdmin && !permissions.canChangeClientStatus) {
      toast.error("Você não tem permissão para alterar status de clientes");
      return;
    }
    toggleClientStatusMutation.mutate({
      id: client.id,
      is_active: !client.is_active
    });
  }, [toggleClientStatusMutation, permissions]);

  const confirmDelete = useCallback((clientId) => {
    if (!permissions.isOrgAdmin && !permissions.canDeleteClients) {
      toast.error("Você não tem permissão para excluir clientes");
      return;
    }
    if (window.confirm("Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.")) {
      deleteClientMutation.mutate(clientId);
    }
  }, [deleteClientMutation, permissions]);

  // Estilos glass
  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
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

  // In ClientManagement.jsx, update the permissions check section:

  // Replace this section (around line 1100):
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
          Carregando gestão de clientes...
        </p>
      </div>
    );
  }

  if (isError) {
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
          <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>
            Erro ao Carregar
          </h2>
          <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
            {error?.message || "Não foi possível carregar os dados dos clientes."}
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refetch}
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
              fontWeight: '500',
              margin: '0 auto'
            }}
          >
            <RefreshCw size={18} />
            Tentar Novamente
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Check permissions AFTER loading is complete
  const canViewClients = permissions.canManageClients || permissions.canViewAllClients || permissions.isOrgAdmin;

  if (!permissions.loading && !canViewClients) {
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
          <AlertCircle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>
            Acesso Restrito
          </h2>
          <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
            Você não possui permissões para visualizar clientes.
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
              Gestão de Clientes
            </h1>
            <p style={{
              fontSize: '1rem',
              color: 'rgba(191, 219, 254, 1)',
              margin: 0
            }}>
              Gerencie seus clientes e relacionamentos comerciais
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {(permissions.isOrgAdmin || permissions.canCreateClients) && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  resetForm();
                  setShowForm(!showForm);
                }}
                style={{
                  ...glassStyle,
                  padding: '0.75rem 1.5rem',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  background: showForm ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                <Plus size={18} />
                {showForm ? 'Cancelar' : 'Novo Cliente'}
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {/* Export functionality */ }}
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
              <Download size={18} />
              Exportar
            </motion.button>
          </div>
        </motion.div>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{
                ...glassStyle,
                padding: '1.5rem',
                marginBottom: '2rem'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  padding: '0.5rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  borderRadius: '12px'
                }}>
                  <User style={{ color: 'rgb(59, 130, 246)' }} size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                    {selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                    {selectedClient ? 'Atualize as informações do cliente' : 'Adicione um novo cliente ao sistema'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Nome *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Nome do cliente"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      NIF
                    </label>
                    <input
                      type="text"
                      name="nif"
                      value={formData.nif}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Número de contribuinte"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Telefone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Número de telefone"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Morada
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Morada completa"
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      marginBottom: '0.5rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      Avença Mensal (€)
                    </label>
                    <input
                      type="number"
                      name="monthly_fee"
                      value={formData.monthly_fee}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Observações
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                    placeholder="Notas adicionais sobre o cliente..."
                  />
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <label htmlFor="is_active" style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.8)'
                  }}>
                    Cliente Ativo
                  </label>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  justifyContent: 'flex-end'
                }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={resetForm}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={createClientMutation.isPending || updateClientMutation.isPending}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {(createClientMutation.isPending || updateClientMutation.isPending) && (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    )}
                    {selectedClient ? 'Atualizar' : 'Criar'} Cliente
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filtros e Pesquisa */}
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
            marginBottom: showFilters ? '1.5rem' : 0
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                Filtros e Pesquisa
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                Configure a visualização conforme necessário
              </p>
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: showFilters ? '1rem' : 0
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={filters.active}
                  onChange={handleFilterChange}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="active" style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  Mostrar apenas clientes ativos
                </label>
              </div>
            </div>

            <div style={{ position: 'relative', minWidth: '300px' }}>
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
                placeholder="Pesquisar clientes..."
                value={searchTerm}
                onChange={handleSearchChange}
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
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                {/* Filtros de Informações de Contacto */}
                <div>
                  <h4 style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Mail size={16} style={{ color: 'rgb(59, 130, 246)' }} />
                    Informações de Contacto
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '0.25rem'
                      }}>
                        Email
                      </label>
                      <select
                        name="hasEmail"
                        value={filters.hasEmail === null ? '' : filters.hasEmail}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          hasEmail: e.target.value === '' ? null : e.target.value === 'true'
                        }))}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      >
                        <option value="">Todos</option>
                        <option value="true">Com Email</option>
                        <option value="false">Sem Email</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '0.25rem'
                      }}>
                        Telefone
                      </label>
                      <select
                        name="hasPhone"
                        value={filters.hasPhone === null ? '' : filters.hasPhone}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          hasPhone: e.target.value === '' ? null : e.target.value === 'true'
                        }))}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      >
                        <option value="">Todos</option>
                        <option value="true">Com Telefone</option>
                        <option value="false">Sem Telefone</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '0.25rem'
                      }}>
                        NIF
                      </label>
                      <select
                        name="hasNif"
                        value={filters.hasNif === null ? '' : filters.hasNif}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          hasNif: e.target.value === '' ? null : e.target.value === 'true'
                        }))}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      >
                        <option value="">Todos</option>
                        <option value="true">Com NIF</option>
                        <option value="false">Sem NIF</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Filtros Financeiros */}
                <div>
                  <h4 style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Euro size={16} style={{ color: 'rgb(52, 211, 153)' }} />
                    Filtros Financeiros
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '0.25rem'
                      }}>
                        Avença Mensal
                      </label>
                      <select
                        name="hasMonthlyFee"
                        value={filters.hasMonthlyFee === null ? '' : filters.hasMonthlyFee}
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          hasMonthlyFee: e.target.value === '' ? null : e.target.value === 'true'
                        }))}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      >
                        <option value="">Todos</option>
                        <option value="true">Com Avença</option>
                        <option value="false">Sem Avença</option>
                      </select>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '0.25rem'
                      }}>
                        Valor Mínimo (€)
                      </label>
                      <input
                        type="number"
                        name="minMonthlyFee"
                        value={filters.minMonthlyFee}
                        onChange={handleFilterChange}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '0.25rem'
                      }}>
                        Valor Máximo (€)
                      </label>
                      <input
                        type="number"
                        name="maxMonthlyFee"
                        value={filters.maxMonthlyFee}
                        onChange={handleFilterChange}
                        placeholder="999.99"
                        step="0.01"
                        min="0"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Filtro por Gestor de Conta */}
                <div>
                  <h4 style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'rgba(255, 255, 255, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <UserCheck size={16} style={{ color: 'rgb(147, 51, 234)' }} />
                    Gestão
                  </h4>
                  <div style={{ maxWidth: '300px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      color: 'rgba(255, 255, 255, 0.7)',
                      marginBottom: '0.25rem'
                    }}>
                      Gestor de Conta
                    </label>
                    <select
                      name="accountManager"
                      value={filters.accountManager}
                      onChange={handleFilterChange}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '0.75rem'
                      }}
                    >
                      <option value="">Todos os Gestores</option>
                      {users && users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Botão para limpar filtros */}
                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '1rem',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilters({
                      active: true,
                      hasEmail: null,
                      hasPhone: null,
                      hasNif: null,
                      hasMonthlyFee: null,
                      accountManager: '',
                      minMonthlyFee: '',
                      maxMonthlyFee: ''
                    })}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <X size={14} />
                    Limpar Filtros
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Cards de Estatísticas */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}
        >
          {/* Total de Clientes */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'rgb(59, 130, 246)',
              marginBottom: '0.5rem'
            }}>
              {clients.length}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Total de Clientes
            </div>
          </motion.div>

          {/* Clientes Ativos */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.2)'
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'rgb(52, 211, 153)',
              marginBottom: '0.5rem'
            }}>
              {clients.filter(c => c.is_active).length}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Clientes Ativos
            </div>
          </motion.div>

          {/* Clientes Inativos */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'rgb(239, 68, 68)',
              marginBottom: '0.5rem'
            }}>
              {clients.filter(c => !c.is_active).length}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Clientes Inativos
            </div>
          </motion.div>

          {/* Receita Total */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            style={{
              ...glassStyle,
              padding: '1.5rem',
              textAlign: 'center',
              background: 'rgba(147, 51, 234, 0.1)',
              border: '1px solid rgba(147, 51, 234, 0.2)'
            }}
          >
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'rgb(147, 51, 234)',
              marginBottom: '0.5rem'
            }}>
              {new Intl.NumberFormat("pt-PT", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0
              }).format(
                clients
                  .filter(c => c.is_active && c.monthly_fee)
                  .reduce((sum, c) => sum + parseFloat(c.monthly_fee || 0), 0)
              )}
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Receita Mensal
            </div>
          </motion.div>
        </motion.div>

        {/* AI Insights */}
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
                Análise inteligente da sua carteira de clientes
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
            {clients.filter(c => !c.is_active).length > 0 && (
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
                    Clientes Inativos Detectados
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    {clients.filter(c => !c.is_active).length} clientes estão inativos.
                    Considere reativar ou remover da base de dados.
                  </p>
                </div>
              </motion.div>
            )}

            {clients.filter(c => c.is_active && c.monthly_fee).length > 0 && (
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
                    Base de Clientes Sólida
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    {clients.filter(c => c.is_active && c.monthly_fee).length} clientes com avenças definidas geram receita recorrente.
                  </p>
                </div>
              </motion.div>
            )}

            {clients.filter(c => c.is_active && !c.monthly_fee).length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(251, 191, 36, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(251, 191, 36, 0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}
              >
                <DollarSign size={20} style={{ color: 'rgb(251, 191, 36)', marginTop: '0.25rem', flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>
                    Oportunidade de Faturação
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    {clients.filter(c => c.is_active && !c.monthly_fee).length} clientes ativos ainda não têm avença definida.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Lista de Clientes */}
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
                backgroundColor: 'rgba(52, 211, 153, 0.2)',
                borderRadius: '12px'
              }}>
                <Activity style={{ color: 'rgb(52, 211, 153)' }} size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                  Lista de Clientes
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                  {filteredClients.length} clientes encontrados
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ViewToggle
                activeView={viewMode}
                onChange={setViewMode}
              />
            </div>
          </div>

          {filteredClients.length === 0 ? (
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
                {searchTerm
                  ? "Tente ajustar sua pesquisa."
                  : "Crie seu primeiro cliente!"}
              </p>
            </div>
          ) : (
            <div style={{ padding: '1.5rem' }}>
              {viewMode === 'grid' ? (
                // Visualização em Grid
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '1.5rem'
                }}>
                  {filteredClients.map((client, index) => (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ClientCard
                        client={client}
                        onEdit={selectClientForEdit}
                        onToggleStatus={toggleClientStatus}
                        onDelete={confirmDelete}
                        permissions={permissions}
                        onClick={() => handleViewClientDetails(client)}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                // Visualização em Lista/Tabela
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse'
                  }}>
                    <thead style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                      <tr>
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
                            onClick={() => handleSort("name")}
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
                            Nome
                            {sortConfig.key === "name" ? (
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
                          Contacto
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
                            Avença Mensal
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
                          Status
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
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
                      {filteredClients.map((client, index) => (
                        <motion.tr
                          key={client.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            cursor: 'pointer'
                          }}
                          whileHover={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
                          }}
                          onClick={() => handleViewClientDetails(client)}
                        >
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'rgba(59, 130, 246, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '1rem',
                                color: 'rgb(59, 130, 246)',
                                fontWeight: '600'
                              }}>
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{
                                  fontWeight: '500',
                                  color: 'white',
                                  fontSize: '0.875rem'
                                }}>
                                  {client.name}
                                </div>
                                <div style={{
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  fontSize: '0.75rem'
                                }}>
                                  {client.nif || "Sem NIF"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div>
                              <div style={{
                                color: 'white',
                                fontSize: '0.875rem'
                              }}>
                                {client.email || "Sem email"}
                              </div>
                              <div style={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                fontSize: '0.75rem'
                              }}>
                                {client.phone || "Sem telefone"}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              fontWeight: '600',
                              color: 'rgb(52, 211, 153)',
                              fontSize: '0.875rem'
                            }}>
                              {client.monthly_fee
                                ? `${client.monthly_fee} €`
                                : "Não definida"}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: client.is_active
                                ? 'rgba(52, 211, 153, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                              border: client.is_active
                                ? '1px solid rgba(52, 211, 153, 0.3)'
                                : '1px solid rgba(239, 68, 68, 0.3)',
                              color: client.is_active
                                ? 'rgb(110, 231, 183)'
                                : 'rgb(252, 165, 165)'
                            }}>
                              {client.is_active ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              {(permissions.isOrgAdmin || permissions.canEditClients) && (
                                <motion.button
                                  whileHover={{ scale: 1.1, y: -2 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => selectClientForEdit(client)}
                                  style={{
                                    background: 'rgba(147, 51, 234, 0.2)',
                                    border: '1px solid rgba(147, 51, 234, 0.3)',
                                    borderRadius: '6px',
                                    padding: '0.5rem',
                                    color: 'rgb(147, 51, 234)',
                                    cursor: 'pointer'
                                  }}
                                  title="Editar cliente"
                                >
                                  <Edit size={16} />
                                </motion.button>
                              )}

                              {(permissions.isOrgAdmin || permissions.canChangeClientStatus) && (
                                <motion.button
                                  whileHover={{ scale: 1.1, y: -2 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => toggleClientStatus(client)}
                                  style={{
                                    background: client.is_active
                                      ? 'rgba(251, 146, 60, 0.2)'
                                      : 'rgba(52, 211, 153, 0.2)',
                                    border: client.is_active
                                      ? '1px solid rgba(251, 146, 60, 0.3)'
                                      : '1px solid rgba(52, 211, 153, 0.3)',
                                    borderRadius: '6px',
                                    padding: '0.5rem',
                                    color: client.is_active
                                      ? 'rgb(251, 146, 60)'
                                      : 'rgb(52, 211, 153)',
                                    cursor: 'pointer'
                                  }}
                                  title={client.is_active ? "Desativar" : "Ativar"}
                                >
                                  {client.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                                </motion.button>
                              )}

                              {(permissions.isOrgAdmin || permissions.canDeleteClients) && (
                                <motion.button
                                  whileHover={{ scale: 1.1, y: -2 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => confirmDelete(client.id)}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '6px',
                                    padding: '0.5rem',
                                    color: 'rgb(239, 68, 68)',
                                    cursor: 'pointer'
                                  }}
                                  title="Excluir cliente"
                                >
                                  <Trash2 size={16} />
                                </motion.button>
                              )}

                              <motion.button
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleViewClientDetails(client)}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  borderRadius: '6px',
                                  padding: '0.5rem',
                                  color: 'white',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem'
                                }}
                                title="Ver detalhes"
                              >
                                <Eye size={14} />
                                Detalhes
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Modal de detalhes do cliente */}
      <AnimatePresence>
    {showClientModal && selectedClient && (
        <ClientDetailsModal
            client={{
                ...selectedClient,
                // Garantir que fiscal_tags é sempre um array no frontend
                fiscal_tags: Array.isArray(selectedClient.fiscal_tags) ? selectedClient.fiscal_tags : [] 
            }}
            users={users || []} // Passar users para o seletor de Account Manager
            onClose={() => {
                setShowClientModal(false);
                setSelectedClient(null);
            }}
            onSave={(updatedData) => {
                updateClientMutation.mutate({
                    id: selectedClient.id,
                    updatedData // updatedData agora inclui fiscal_tags
                });
            }}
            permissions={permissions}
        />
    )}
</AnimatePresence>

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
        
        input::placeholder, textarea::placeholder {
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

        /* Hover effects para tabelas */
        tbody tr:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }

        /* Focus states para acessibilidade */
        button:focus, input:focus, select:focus, textarea:focus {
          outline: 2px solid rgba(59, 130, 246, 0.5);
          outline-offset: 2px;
        }

        /* Animação suave para status badges */
        .status-badge {
          transition: all 0.3s ease;
        }

        .status-badge:hover {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
};

export default ClientManagement;                                
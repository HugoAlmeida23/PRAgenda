import React, { useState, useMemo, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Download, Grid, List, Loader2, Brain, AlertTriangle, RefreshCw, AlertCircle } from "lucide-react";

import api from "../api";
import { usePermissions } from "../contexts/PermissionsContext";
import BackgroundElements from "../components/HeroSection/BackgroundElements";
import ClientDetailsModal from "../components/ClientDetailsModel";

// Import the new decomposed components
import ClientStats from "../components/client/ClientStats";
import ClientFilters from "../components/client/ClientFilters";
import ClientForm from "../components/client/ClientForm";
import ClientGrid from "../components/client/ClientGrid";
import ClientTable from "../components/client/ClientTable";
import { useClientStore } from "../stores/useClientStore";

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
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

// Componente principal
const ClientManagement = () => {
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  // Get ALL UI state and actions from the Zustand store
  const {
    searchTerm, sortConfig, filters, viewMode, showFilters, showForm,
    selectedClient, showClientModal, formData,
    setSortConfig, setViewMode, toggleShowFilters, openFormForNew,
    closeForm, openDetailsModal, closeDetailsModal, openFormForEdit,
    setFormData
  } = useClientStore();

  // Data fetching and mutations remain here
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['clientsData'],
    queryFn: fetchClientsData,
    staleTime: 5 * 60 * 1000,
  });
  
  const clients = data?.clients || [];
  const users = data?.users || [];

  const createClientMutation = useMutation({
    mutationFn: (newClientData) => api.post("/clients/", newClientData),
    onSuccess: () => {
      toast.success("Cliente criado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['clientsData'] });
      closeForm();
    },
    onError: (err) => {
      toast.error(`Falha ao criar cliente: ${err.response?.data?.detail || err.message}`);
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, updatedData }) => api.put(`/clients/${id}/`, updatedData),
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['clientsData'] });
      closeDetailsModal();
      closeForm();
    },
    onError: (err) => {
      toast.error(`Falha ao atualizar cliente: ${err.response?.data?.detail || err.message}`);
    }
  });

  const toggleClientStatusMutation = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/clients/${id}/`, { is_active }),
    onSuccess: () => {
      toast.success("Status do cliente atualizado");
      queryClient.invalidateQueries({ queryKey: ['clientsData'] });
    },
    onError: (err) => {
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
      toast.error("Falha ao excluir cliente");
    }
  });

  // Dados filtrados
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    let result = [...clients];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(client =>
        client.name?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.nif?.includes(term)
      );
    }

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

    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] === null) return 1;
        if (b[sortConfig.key] === null) return -1;
        const valA = typeof a[sortConfig.key] === "string" ? a[sortConfig.key].toLowerCase() : a[sortConfig.key];
        const valB = typeof b[sortConfig.key] === "string" ? b[sortConfig.key].toLowerCase() : b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [clients, searchTerm, filters, sortConfig]);

  const handleSort = useCallback((key) => {
    setSortConfig(current => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  }, [setSortConfig]);

  const handleSubmit = useCallback((formData) => {
    if (selectedClient) {
      if (!permissions.isOrgAdmin && !permissions.canEditClients) { 
        toast.error("Sem permissão para editar clientes"); 
        return; 
      }
      updateClientMutation.mutate({ id: selectedClient.id, updatedData: formData });
    } else {
      if (!permissions.isOrgAdmin && !permissions.canCreateClients) { 
        toast.error("Sem permissão para criar clientes"); 
        return; 
      }
      createClientMutation.mutate(formData);
    }
  }, [selectedClient, createClientMutation, updateClientMutation, permissions]);

  const toggleClientStatus = useCallback((client) => {
    if (!permissions.isOrgAdmin && !permissions.canChangeClientStatus) { 
      toast.error("Sem permissão para alterar status de clientes"); 
      return; 
    }
    toggleClientStatusMutation.mutate({ id: client.id, is_active: !client.is_active });
  }, [toggleClientStatusMutation, permissions]);

  const confirmDelete = useCallback((clientId) => {
    if (!permissions.isOrgAdmin && !permissions.canDeleteClients) { 
      toast.error("Sem permissão para excluir clientes"); 
      return; 
    }
    if (window.confirm("Tem certeza que deseja excluir este cliente?")) { 
      deleteClientMutation.mutate(clientId); 
    }
  }, [deleteClientMutation, permissions]);
  
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
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
      <BackgroundElements/>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 9999 }} />

      <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}>
        {/* Header */}
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ color: 'rgb(255, 255, 255)',fontSize: '1.8rem', fontWeight: '700' }}>Gestão de Clientes</h1>
            <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)' }}>Gerencie seus clientes e relacionamentos</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <motion.button onClick={openFormForNew} whileHover={{ scale: 1.05 }} style={{ ...glassStyle, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', cursor: 'pointer' }}>
              <Plus size={18}/> Novo Cliente
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} style={{ ...glassStyle, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'white', cursor: 'pointer' }}>
              <Download size={18}/> Exportar
            </motion.button>
          </div>
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <ClientForm 
              onSubmit={handleSubmit}
              isSaving={createClientMutation.isPending || updateClientMutation.isPending}
            />
          )}
        </AnimatePresence>

        <ClientFilters users={users} />
        <ClientStats clients={clients} />

        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Lista de Clientes</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>{filteredClients.length} clientes encontrados</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? 'rgba(59, 130, 246, 0.3)' : 'transparent', border: 'none', padding: '0.5rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                <Grid size={16} />
              </button>
              <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'rgba(59, 130, 246, 0.3)' : 'transparent', border: 'none', padding: '0.5rem', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
                <List size={16} />
              </button>
            </div>
          </div>
          <div style={{ padding: '1.5rem' }}>
            {viewMode === 'grid' ? (
              <ClientGrid
                clients={filteredClients}
                onToggleStatus={toggleClientStatus}
                onDelete={confirmDelete}
                permissions={permissions}
              />
            ) : (
              <ClientTable
                clients={filteredClients}
                onSort={handleSort}
                sortConfig={sortConfig}
                onToggleStatus={toggleClientStatus}
                onDelete={confirmDelete}
                permissions={permissions}
              />
            )}
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showClientModal && (
          <ClientDetailsModal 
            client={selectedClient} 
            onClose={closeDetailsModal}
            onSave={(updatedData) => { updateClientMutation.mutate({ id: selectedClient.id, updatedData }); }}
            permissions={permissions}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientManagement;
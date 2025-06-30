// src/pages/ClientManagement.jsx (Corrected)

import React, { useState, useMemo, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from "framer-motion";
import styled from 'styled-components';
import { Plus, Download, Grid, List, Loader2, Brain, AlertTriangle, RefreshCw, AlertCircle } from "lucide-react";

import api from "../api";
import { usePermissions } from "../contexts/PermissionsContext";
import BackgroundElements from "../components/HeroSection/BackgroundElements";
import ClientDetailsModal from "../components/ClientDetailsModel";

import ClientStats from "../components/client/ClientStats";
import ClientFilters from "../components/client/ClientFilters";
import ClientForm from "../components/client/ClientForm";
import ClientGrid from "../components/client/ClientGrid";
import ClientTable from "../components/client/ClientTable";
import { useClientStore } from "../stores/useClientStore";

// Styled Components
const PageContainer = styled.div`
  position: relative;
  min-height: 100vh;
  color: ${({ theme }) => theme.text};
`;

const ContentWrapper = styled(motion.div)`
  position: relative;
  z-index: 10;
  padding: 2rem;
  padding-top: 1rem;
`;

const PageHeader = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const PageTitle = styled.h1`
  color: ${({ theme }) => theme.text};
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
`;

const PageSubtitle = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.textMuted};
  margin: 0.25rem 0 0 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const ActionButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  background: ${({ theme }) => theme.button.secondaryBg};
  border: 1px solid ${({ theme }) => theme.button.secondaryBorder};
  color: ${({ theme }) => theme.text};
`;

const TableContainer = styled(motion.div)`
  background: ${({ theme }) => theme.glassBg};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.glassBorder};
  border-radius: 16px;
  padding: 0;
  overflow: hidden;
`;

const TableHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.headerBorder};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ViewToggleButton = styled.button`
    // <-- FIX: Use the transient prop '$active' for styling logic
    background: ${({ theme, $active }) => $active ? theme.button.primaryBg : 'transparent'};
    border: none;
    padding: 0.5rem;
    border-radius: 8px;
    color: ${({ theme }) => theme.text};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
`;

// Helper for fetching data (no change needed)
const fetchClientsData = async () => {
  const [clientsRes, usersRes] = await Promise.all([
    api.get("/clients/"),
    api.get("/profiles/")
  ]);
  return {
    clients: clientsRes.data.results || clientsRes.data || [], // Handle pagination
    users: usersRes.data.results || usersRes.data || []
  };
};

const ClientManagement = () => {
    const queryClient = useQueryClient();
    const permissions = usePermissions();
    const {
        viewMode, setViewMode, showForm, selectedClient, showClientModal,
        openFormForNew, closeForm, openDetailsModal, closeDetailsModal, sortConfig,
        setSortConfig: setSortConfigInStore, filters, searchTerm
    } = useClientStore();

    const { data, isLoading, isError, error, refetch } = useQuery({ 
        queryKey: ['clientsData', filters, searchTerm], // Add searchTerm to queryKey
        queryFn: fetchClientsData 
    });
    
    // For brevity, assuming mutations and handlers exist as before
    const createClientMutation = useMutation({
        mutationFn: (formData) => api.post('/clients/', formData),
        onSuccess: () => { queryClient.invalidateQueries(['clientsData']); closeForm(); }
    });
    const updateClientMutation = useMutation({
        mutationFn: ({ id, ...formData }) => api.patch(`/clients/${id}/`, formData),
        onSuccess: () => { queryClient.invalidateQueries(['clientsData']); closeDetailsModal(); }
    });
    const toggleClientStatusMutation = useMutation({
        mutationFn: (clientId) => api.patch(`/clients/${clientId}/toggle_status/`),
        onSuccess: () => { queryClient.invalidateQueries(['clientsData']); }
    });
    const deleteClientMutation = useMutation({
        mutationFn: (clientId) => api.delete(`/clients/${clientId}/`),
        onSuccess: () => { queryClient.invalidateQueries(['clientsData']); }
    });

    const clients = data?.clients || [];
    const users = data?.users || [];
    
    // Debug logging
    console.log('ClientManagement Debug:', {
        totalClients: clients.length,
        filters,
        searchTerm,
        filteredClientsCount: 0, // Will be calculated below
        sortedClientsCount: 0    // Will be calculated below
    });
    
    // Memoize filtered clients based on store filters
    const filteredClients = useMemo(() => {
        const filtered = clients.filter(client => {
            // Search term filter
            const matchesSearch = !searchTerm || 
                client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (client.nif && client.nif.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()));
            
            // Active status filter
            const matchesActive = filters.active === null || 
                (filters.active === true ? client.is_active : !client.is_active);
            
            // Email filter
            const matchesEmail = filters.hasEmail === null || 
                (filters.hasEmail === true ? !!client.email : !client.email);
            
            // Phone filter
            const matchesPhone = filters.hasPhone === null || 
                (filters.hasPhone === true ? !!client.phone : !client.phone);
            
            // NIF filter
            const matchesNif = filters.hasNif === null || 
                (filters.hasNif === true ? !!client.nif : !client.nif);
            
            // Monthly fee filter
            const matchesMonthlyFee = filters.hasMonthlyFee === null || 
                (filters.hasMonthlyFee === true ? !!client.monthly_fee : !client.monthly_fee);
            
            // Account manager filter
            const matchesManager = !filters.accountManager || 
                client.account_manager === filters.accountManager;
            
            // Monthly fee range filter
            const monthlyFee = parseFloat(client.monthly_fee) || 0;
            const matchesMinFee = !filters.minMonthlyFee || monthlyFee >= parseFloat(filters.minMonthlyFee);
            const matchesMaxFee = !filters.maxMonthlyFee || monthlyFee <= parseFloat(filters.maxMonthlyFee);
            
            return matchesSearch && matchesActive && matchesEmail && matchesPhone && 
                   matchesNif && matchesMonthlyFee && matchesManager && matchesMinFee && matchesMaxFee;
        });
        
        console.log('Filtered clients:', filtered.length, 'out of', clients.length);
        return filtered;
    }, [clients, filters, searchTerm]);
    
    const sortedClients = useMemo(() => {
        let sortableClients = [...filteredClients];
        if (sortConfig.key) {
            sortableClients.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        console.log('Sorted clients:', sortableClients.length, 'out of', filteredClients.length);
        return sortableClients;
    }, [filteredClients, sortConfig]);

    const handleSort = useCallback((key) => {
        setSortConfigInStore(key);
    }, [setSortConfigInStore]);

    const handleSubmit = (formData) => {
        if (selectedClient && showForm) { // Editing existing
            updateClientMutation.mutate({ id: selectedClient.id, ...formData });
        } else { // Creating new
            createClientMutation.mutate(formData);
        }
    };

    const toggleClientStatus = (clientId) => toggleClientStatusMutation.mutate(clientId);
    const confirmDelete = (clientId) => {
        if (window.confirm("Tem a certeza que deseja excluir este cliente?")) {
            deleteClientMutation.mutate(clientId);
        }
    };
    
    if (isLoading) {
        return (
            <PageContainer>
                <BackgroundElements/>
                <ContentWrapper>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                        <div style={{ textAlign: 'center', color: 'white' }}>
                            <Loader2 size={48} className="animate-spin" style={{ marginBottom: '1rem' }} />
                            <p>Carregando clientes...</p>
                        </div>
                    </div>
                </ContentWrapper>
            </PageContainer>
        );
    }
    
    if (isError) {
        return (
            <PageContainer>
                <BackgroundElements/>
                <ContentWrapper>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                        <div style={{ textAlign: 'center', color: 'white' }}>
                            <AlertCircle size={48} style={{ marginBottom: '1rem', color: 'rgb(239, 68, 68)' }} />
                            <p>Erro ao carregar clientes: {error?.message || 'Erro desconhecido'}</p>
                            <button 
                                onClick={() => refetch()}
                                style={{ 
                                    marginTop: '1rem', 
                                    padding: '0.5rem 1rem', 
                                    background: 'rgba(59, 130, 246, 0.2)', 
                                    border: '1px solid rgba(59, 130, 246, 0.3)', 
                                    borderRadius: '8px', 
                                    color: 'white', 
                                    cursor: 'pointer' 
                                }}
                            >
                                Tentar novamente
                            </button>
                        </div>
                    </div>
                </ContentWrapper>
            </PageContainer>
        );
    }
    
    return (
        <PageContainer>
            <BackgroundElements/>
            <ToastContainer position="top-right" autoClose={3000} style={{ zIndex: 9999 }} />
            <ContentWrapper>
                <PageHeader>
                    <div>
                        <PageTitle>Gestão de Clientes</PageTitle>
                        <PageSubtitle>Gerencie seus clientes e relacionamentos</PageSubtitle>
                    </div>
                    <HeaderActions>
                        <ActionButton onClick={openFormForNew} whileHover={{ scale: 1.05 }}>
                            <Plus size={18}/> Novo Cliente
                        </ActionButton>
                        <ActionButton whileHover={{ scale: 1.05 }}>
                            <Download size={18}/> Exportar
                        </ActionButton>
                    </HeaderActions>
                </PageHeader>

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

                <TableContainer>
                    <TableHeader>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Lista de Clientes</h3>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'inherit', opacity: '0.7' }}>
                                {sortedClients.length} de {clients.length} clientes encontrados
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '0.25rem', borderRadius: '10px' }}>
                            {/* <-- FIX: Pass the transient prop '$active' instead of 'active' */}
                            <ViewToggleButton $active={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
                                <Grid size={16} />
                            </ViewToggleButton>
                            <ViewToggleButton $active={viewMode === 'list'} onClick={() => setViewMode('list')}>
                                <List size={16} />
                            </ViewToggleButton>
                        </div>
                    </TableHeader>
                    <div style={{ padding: '1.5rem' }}>
                        {viewMode === 'grid' ? (
                            <ClientGrid clients={sortedClients} onToggleStatus={toggleClientStatus} onDelete={confirmDelete} permissions={permissions} />
                        ) : (
                            <ClientTable clients={sortedClients} onSort={handleSort} sortConfig={sortConfig} onToggleStatus={toggleClientStatus} onDelete={confirmDelete} permissions={permissions} />
                        )}
                    </div>
                </TableContainer>
            </ContentWrapper>

            <AnimatePresence>
                {showClientModal && selectedClient && (
                    <ClientDetailsModal client={selectedClient} onClose={closeDetailsModal} onSave={(updatedData) => { updateClientMutation.mutate({ id: selectedClient.id, ...updatedData }); }} permissions={permissions} />
                )}
            </AnimatePresence>
        </PageContainer>
    );
};

export default ClientManagement;
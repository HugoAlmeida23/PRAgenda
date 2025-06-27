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
        setSortConfig: setSortConfigInStore, filters
    } = useClientStore();

    const { data, isLoading, isError, error, refetch } = useQuery({ 
        queryKey: ['clientsData', filters], // Add filters to queryKey
        queryFn: fetchClientsData 
    });
    
    // For brevity, assuming mutations and handlers exist as before
    const createClientMutation = useMutation({ mutationFn: () => {}, onSuccess: () => { queryClient.invalidateQueries(['clientsData']); closeForm(); } });
    const updateClientMutation = useMutation({ mutationFn: () => {}, onSuccess: () => { queryClient.invalidateQueries(['clientsData']); closeDetailsModal(); } });
    const toggleClientStatusMutation = useMutation({ mutationFn: () => {}, onSuccess: () => { queryClient.invalidateQueries(['clientsData']); } });
    const deleteClientMutation = useMutation({ mutationFn: () => {}, onSuccess: () => { queryClient.invalidateQueries(['clientsData']); } });

    const clients = data?.clients || [];
    const users = data?.users || [];
    
    // Memoize filtered clients based on store filters
    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            const matchesSearch = !filters.searchTerm || client.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
            const matchesStatus = filters.status === 'all' || (filters.status === 'active' ? client.is_active : !client.is_active);
            const matchesManager = !filters.accountManager || client.account_manager === filters.accountManager;
            return matchesSearch && matchesStatus && matchesManager;
        });
    }, [clients, filters]);
    
    const sortedClients = useMemo(() => {
        let sortableClients = [...filteredClients];
        if (sortConfig.key) {
            sortableClients.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
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
    
    if (isLoading) { /* return loading component */ }
    if (isError) { /* return error component */ }
    
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
                                {sortedClients.length} clientes encontrados
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
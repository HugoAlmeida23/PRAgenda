import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

// Criando o contexto para permissões
const PermissionsContext = createContext(null);

// Hook para utilizar permissões em qualquer componente
export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions deve ser usado dentro de um PermissionsProvider');
  }
  return context;
};

// Provider para permissões
export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState({
    // Permissões de administração
    isOrgAdmin: false,
    
    // Permissões para gestão de clientes
    canManageClients: false,
    canViewAllClients: false,
    canCreateClients: false,
    canEditClients: false,
    canDeleteClients: false,
    canChangeClientStatus: false,
    
    // Permissões para gestão de tarefas
    canAssignTasks: false,
    canCreateTasks: false,
    canEditAllTasks: false,
    canEditAssignedTasks: false,
    canDeleteTasks: false,
    canViewAllTasks: false,
    canApproveTasks: false,
    
    // Permissões para gestão de tempo
    canLogTime: false,
    canEditOwnTime: false,
    canEditAllTime: false,
    canViewTeamTime: false,
    
    // Permissões financeiras
    canViewClientFees: false,
    canEditClientFees: false,
    canManageExpenses: false,
    canViewProfitability: false,
    canViewTeamProfitability: false,
    canViewOrganizationProfitability: false,
    
    // Permissões de relatórios e análises
    canViewAnalytics: false,
    canExportReports: false,
    canCreateCustomReports: false,
    canScheduleReports: false,
    
    // Permissões de workflow
    canCreateWorkflows: false,
    canEditWorkflows: false,
    canAssignWorkflows: false,
    canManageWorkflows: false,
    
    // Informações do usuário e organização
    userId: null,
    username: '',
    organization: null,
    organizationName: '',
    role: '',
    
    // Carregamento e erros
    loading: true,
    error: null,
  });

  // Buscar permissões do usuário ao carregar o componente
  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        const response = await api.get('/profiles/');
        
        if (response.data && response.data.length > 0) {
          const profile = response.data[0];
          
          setPermissions({
            // Permissões de administração
            isOrgAdmin: profile.is_org_admin,
            
            // Permissões para gestão de clientes
            canManageClients: profile.can_manage_clients,
            canViewAllClients: profile.can_view_all_clients,
            canCreateClients: profile.can_create_clients,
            canEditClients: profile.can_edit_clients,
            canDeleteClients: profile.can_delete_clients,
            canChangeClientStatus: profile.can_change_client_status,
            
            // Permissões para gestão de tarefas
            canAssignTasks: profile.can_assign_tasks,
            canCreateTasks: profile.can_create_tasks,
            canEditAllTasks: profile.can_edit_all_tasks,
            canEditAssignedTasks: profile.can_edit_assigned_tasks,
            canDeleteTasks: profile.can_delete_tasks,
            canViewAllTasks: profile.can_view_all_tasks,
            canApproveTasks: profile.can_approve_tasks,
            
            // Permissões para gestão de tempo
            canLogTime: profile.can_log_time,
            canEditOwnTime: profile.can_edit_own_time,
            canEditAllTime: profile.can_edit_all_time,
            canViewTeamTime: profile.can_view_team_time,
            
            // Permissões financeiras
            canViewClientFees: profile.can_view_client_fees,
            canEditClientFees: profile.can_edit_client_fees,
            canManageExpenses: profile.can_manage_expenses,
            canViewProfitability: profile.can_view_profitability,
            canViewTeamProfitability: profile.can_view_team_profitability,
            canViewOrganizationProfitability: profile.can_view_organization_profitability,
            
            // Permissões de relatórios e análises
            canViewAnalytics: profile.can_view_analytics,
            canExportReports: profile.can_export_reports,
            canCreateCustomReports: profile.can_create_custom_reports,
            canScheduleReports: profile.can_schedule_reports,
            
            // Permissões de workflow
            canCreateWorkflows: profile.can_create_workflows,
            canEditWorkflows: profile.can_edit_workflows,
            canAssignWorkflows: profile.can_assign_workflows,
            canManageWorkflows: profile.can_manage_workflows,
            
            // Informações do usuário e organização
            userId: profile.user,
            username: profile.username,
            organization: profile.organization,
            organizationName: profile.organization_name,
            role: profile.role,
            
            // Estado de carregamento
            loading: false,
            error: null,
          });
        } else {
          setPermissions(prev => ({
            ...prev,
            loading: false,
            error: 'Não foi possível encontrar informações do perfil'
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar permissões do usuário:', error);
        setPermissions(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Erro ao buscar perfil do usuário'
        }));
      }
    };

    fetchUserPermissions();
  }, []);

  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
};

export default PermissionsProvider;
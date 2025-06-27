// frontend/src/contexts/PermissionsContext.jsx (Corrected Version)

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'; // <-- IMPORTANT: We need both token keys

const PermissionsContext = createContext(null);

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions deve ser usado dentro de um PermissionsProvider');
  }
  return context;
};

export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState({
    // Flags (ensure you have all your flags here with default false)
    isOrgAdmin: false,
    canManageClients: false,
    canViewAllClients: false,
    canCreateClients: false,
    canEditClients: false,
    canDeleteClients: false,
    canChangeClientStatus: false,
    canAssignTasks: false,
    canCreateTasks: false,
    canEditAllTasks: false,
    canEditAssignedTasks: false,
    canDeleteTasks: false,
    canViewAllTasks: false,
    canApproveTasks: false,
    canLogTime: false,
    canEditOwnTime: false,
    canEditAllTime: false,
    canViewTeamTime: false,
    canViewClientFees: false,
    canEditClientFees: false,
    canManageExpenses: false,
    canViewProfitability: false,
    canViewTeamProfitability: false,
    canViewOrganizationProfitability: false,
    canViewAnalytics: false,
    canExportReports: false,
    canCreateCustomReports: false,
    canScheduleReports: false,
    canCreateWorkflows: false,
    canEditWorkflows: false,
    canAssignWorkflows: false,
    canManageWorkflows: false,
    isSuperuser: false,
    // User and organization info
    userId: null,
    username: '',
    organization: null,
    organizationId: null, // Add organizationId for easier access
    organizationName: '',
    role: '',
    
    // State management
    loading: true,
    error: null,
    initialized: false,
  });

  const fetchUserPermissions = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (!token) {
      console.log('PermissionsContext: No token found, user is not logged in.');
      setPermissions(prev => ({ ...prev, loading: false, initialized: false }));
      return;
    }

    setPermissions(prev => ({ ...prev, loading: true }));

    try {
      console.log('PermissionsContext: Token found. Fetching user profile...');
      const response = await api.get('/profiles/');
      
      if (response.data && response.data.length > 0) {
        const profile = response.data[0];
        console.log('PermissionsContext: Profile loaded successfully.', profile);
        
        setPermissions({
          isOrgAdmin: profile.is_org_admin,
          canManageClients: profile.can_manage_clients,
          canViewAllClients: profile.can_view_all_clients,
          canCreateClients: profile.can_create_clients,
          canEditClients: profile.can_edit_clients,
          canDeleteClients: profile.can_delete_clients,
          canChangeClientStatus: profile.can_change_client_status,
          canAssignTasks: profile.can_assign_tasks,
          canCreateTasks: profile.can_create_tasks,
          canEditAllTasks: profile.can_edit_all_tasks,
          canEditAssignedTasks: profile.can_edit_assigned_tasks,
          canDeleteTasks: profile.can_delete_tasks,
          canViewAllTasks: profile.can_view_all_tasks,
          canApproveTasks: profile.can_approve_tasks,
          canLogTime: profile.can_log_time,
          canEditOwnTime: profile.can_edit_own_time,
          canEditAllTime: profile.can_edit_all_time,
          canViewTeamTime: profile.can_view_team_time,
          canViewClientFees: profile.can_view_client_fees,
          canEditClientFees: profile.can_edit_client_fees,
          canManageExpenses: profile.can_manage_expenses,
          canViewProfitability: profile.can_view_profitability,
          canViewTeamProfitability: profile.can_view_team_profitability,
          canViewOrganizationProfitability: profile.can_view_organization_profitability,
          canViewAnalytics: profile.can_view_analytics,
          canExportReports: profile.can_export_reports,
          canCreateCustomReports: profile.can_create_custom_reports,
          canScheduleReports: profile.can_schedule_reports,
          canCreateWorkflows: profile.can_create_workflows,
          canEditWorkflows: profile.can_edit_workflows,
          canAssignWorkflows: profile.can_assign_workflows,
          canManageWorkflows: profile.can_manage_workflows,
          isSuperuser: profile.is_superuser,
          // User and org info
          userId: profile.user,
          username: profile.username,
          organization: profile.organization,
          organizationId: profile.organization, // Set organizationId
          organizationName: profile.organization_name,
          role: profile.role,
          // State management
          loading: false,
          error: null,
          initialized: true,
        });
      } else {
        throw new Error('Profile data is empty, cannot set permissions.');
      }
    } catch (error) {
      console.error('PermissionsContext: Error fetching user permissions:', error);

      // --- THE KEY FIX IS HERE ---
      // Specifically handle the 401 Unauthorized error to break the loop.
      if (error.response && error.response.status === 401) {
        console.log('PermissionsContext: Received 401 Unauthorized. Token is invalid or expired. Logging out.');
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
        setPermissions(prev => ({
          ...prev,
          loading: false,
          error: 'Session expired. Please log in again.',
          initialized: false, // Mark as NOT initialized
        }));
        // DO NOT RETRY. The loop is broken. The user will be redirected by ProtectedRoute.
      } else {
        // For any other error (like 500 server error or network down)
        setPermissions(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'An unknown error occurred while fetching the user profile.',
          initialized: false,
        }));
      }
    }
  }, []);

  // This useEffect will run only once when the component mounts.
  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);
  
  const refreshPermissions = useCallback(() => {
    setPermissions(prev => ({ ...prev, loading: true, error: null }));
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  const contextValue = {
    ...permissions,
    refreshPermissions,
  };

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  );
};

export default PermissionsProvider;
// frontend/src/contexts/PermissionsContext.jsx (Corrected Version)

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';
import { ACCESS_TOKEN } from '../constants'; // <-- IMPORTANT: We need to import the key for the token

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
    // ... all your permission flags remain the same ...
    isOrgAdmin: false,
    canManageClients: false,
    // (etc...)

    // Informações do usuário e organização
    userId: null,
    username: '',
    organization: null,
    organizationName: '',
    role: '',
    
    // Carregamento e erros
    loading: true, // Start as true, but we will manage it carefully
    error: null,
    initialized: false,
  });

  const fetchUserPermissions = useCallback(async () => {
    // --- FIX #1: Check for a token BEFORE making any API call ---
    // If there's no token in localStorage, we know the user isn't logged in.
    // So, we stop right away and don't make a pointless API call.
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (!token) {
      console.log('No token found, skipping permissions fetch.');
      setPermissions(prev => ({ ...prev, loading: false, initialized: false }));
      return;
    }

    // If we have a token, proceed with fetching the profile.
    setPermissions(prev => ({ ...prev, loading: true }));

    try {
      console.log('Token found. Fetching user permissions...');
      const response = await api.get('/profiles/');
      
      if (response.data && response.data.length > 0) {
        const profile = response.data[0];
        console.log('Profile loaded:', profile);
        
        setPermissions({
          // ... all your permission mappings from the profile ...
          isOrgAdmin: profile.is_org_admin,
          canManageClients: profile.can_manage_clients,
          // (etc...)
          
          // Informações do usuário e organização
          userId: profile.user,
          username: profile.username,
          organization: profile.organization,
          organizationName: profile.organization_name,
          role: profile.role,
          
          // Estado de carregamento
          loading: false,
          error: null,
          initialized: true, // Mark as successfully initialized!
        });
      } else {
        throw new Error('Profile data is empty, cannot set permissions.');
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);

      // --- FIX #2: Specifically handle the 401 Unauthorized error ---
      // This is the most important change. If the error is 401, it's not a bug.
      // It just means our token is old or invalid. We should log the user out.
      if (error.response && error.response.status === 401) {
        console.log('Received 401 Unauthorized. Token is invalid or expired.');
        localStorage.removeItem(ACCESS_TOKEN); // Clear the bad token
        setPermissions(prev => ({
          ...prev,
          loading: false,
          error: 'Session expired.', // Set a user-friendly error
          initialized: false,
        }));
        // DO NOT RETRY. The loop stops here.
      } else {
        // For any other error (like 500 server error or network down), we can set a generic error.
        setPermissions(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'An unknown error occurred while fetching the user profile.',
          initialized: false,
        }));
      }
    }
  }, []); // <-- We removed retryCount from the dependencies

  // This useEffect will run only once when the component mounts.
  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);
  
  // The refresh function can still be used to manually trigger a fetch
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

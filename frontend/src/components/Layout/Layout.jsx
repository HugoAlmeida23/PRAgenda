import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, Users, Clock, CheckSquare, DollarSign, Settings,
  LogOut, User as UserIcon, Briefcase, ChevronDown, 
  Archive as ArchiveIcon, BarChart3, Settings2, Bot, Sun, Moon, 
  GitBranch, FileText, BellRing, ScanLine
} from 'lucide-react';
import { Outlet } from 'react-router-dom';

import api from '../../api';
import BackgroundElements from '../HeroSection/BackgroundElements';
import NotificationDropdown from '../NotificationDropdown';
import { useTheme } from '../../contexts/ThemeContext';
import './Layout.css';
import '../../styles/Home.css';

// ============================================================================
// HOOKS & DATA MANAGEMENT
// ============================================================================

const usePrefetchData = () => {
  useQuery({
    queryKey: ['clientsForDropdowns'],
    queryFn: () => api.get("/clients/?is_active=true").then(res => res.data.results || res.data),
    staleTime: 15 * 60 * 1000,
  });
  
  useQuery({
    queryKey: ['categoriesForDropdowns'],
    queryFn: () => api.get("/task-categories/").then(res => res.data.results || res.data),
    staleTime: Infinity,
  });
};

const useUserProfile = (locationKey) => {
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const response = await api.get('/profiles/');
        if (response.data && response.data.length > 0) {
          setUserProfile(response.data[0]);
        } else {
          console.warn("User profile not found. User might need to complete setup.");
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
      }
    };
    
    loadUserProfile();
  }, [locationKey]);

  return userProfile;
};

// ============================================================================
// NAVIGATION CONFIGURATION
// ============================================================================

const NAVIGATION_CONFIG = {
  standalone: [
    { name: 'Dashboard', icon: <Home size={16} />, path: "/" },
    { name: 'Consultor AI', icon: <Bot size={16} />, path: "/ai-advisor" },
  ],
  
  groups: [
    { 
      name: 'Gestão', 
      icon: <Users size={16} />, 
      items: [
        { path: "/clients", icon: <Users size={16} />, label: "Clientes" },
        { path: "/tasks", icon: <CheckSquare size={16} />, label: "Tarefas" },
        { path: "/timeentry", icon: <Clock size={16} />, label: "Registo de Tempos" },
      ]
    },
    { 
      name: 'Automação', 
      icon: <GitBranch size={16} />, 
      items: [
        { path: "/workflow-management", icon: <GitBranch size={16} />, label: "Workflows" },
        { path: "/fiscal-definitions", icon: <Settings size={16} />, label: "Obrigações Fiscais" },
        { path: "/fiscal-settings", icon: <Settings2 size={16} />, label: "Config. Fiscais" },
      ]
    },
    { 
      name: 'Documentos', 
      icon: <FileText size={16} />, 
      items: [
        { path: '/saft-management', icon: <FileText size={16} />, label: 'Ficheiros SAFT' },
        { path: '/invoice-processing', icon: <ScanLine size={16} />, label: 'Processar Faturas' },
      ]
    },
    { 
      name: 'Análise & Relatórios', 
      icon: <BarChart3 size={16} />, 
      items: [
        { path: "/fiscal-dashboard", icon: <BarChart3 size={16} />, label: "Dashboard Fiscal" },
        { path: "/clientprofitability", icon: <DollarSign size={16} />, label: "Rentabilidade" },
        { path: "/reports", icon: <FileText size={16} />, label: "Relatórios" },
      ]
    },
    { 
      name: 'Administração',
      icon: <ArchiveIcon size={16} />,
      items: [
        { path: "action-log", icon: <ArchiveIcon size={16} />, label: "Registo de Ações" }
      ]
    }
  ]
};

const getDropdownStyles = (theme) => ({
  container: {
    position: 'absolute',
    top: '100%',
    minWidth: '220px',
    background: theme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(20, 20, 30, 0.98)',
    backdropFilter: 'blur(15px)',
    borderRadius: '12px',
    border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
    padding: '0.5rem',
    zIndex: 1002,
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
  },
  
  item: (isActive) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: isActive ? (theme === 'light' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.2)') : 'transparent',
    border: 'none',
    color: isActive ? (theme === 'light' ? 'rgb(59,130,246)' : 'rgb(139, 194, 253)') : (theme === 'light' ? '#374151' : 'white'),
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.875rem',
    transition: 'background 0.2s ease'
  })
});

const getNavButtonStyles = (isActive, theme) => ({
  background: isActive ? (theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.1)') : 'transparent',
  border: 'none',
  color: theme === 'light' ? '#374151' : 'white',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 1rem',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background 0.2s ease'
});

// ============================================================================
// NAVIGATION COMPONENTS
// ============================================================================

const NavDropdown = ({ group, currentPath, onNavigate, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = group.items.some(item => item.path === currentPath);
  const dropdownStyles = getDropdownStyles(theme);

  return (
    <div 
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      style={{ position: 'relative' }}
    >
      <button style={getNavButtonStyles(isActive, theme)}>
        {React.cloneElement(group.icon, { color: theme === 'light' ? '#4b5563' : 'white' })}
        <span>{group.name}</span>
        <ChevronDown 
          size={16} 
          style={{ 
            opacity: 0.7, 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
            transition: 'transform 0.2s ease' 
          }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            style={{
              ...dropdownStyles.container,
              left: 0,
              marginTop: '0.5rem'
            }}
          >
            {group.items.map(item => (
              <button
                key={item.path}
                onClick={() => { 
                  onNavigate(item.path); 
                  setIsOpen(false); 
                }}
                style={dropdownStyles.item(currentPath === item.path)}
              >
                {React.cloneElement(item.icon, { 
                  size: 16, 
                  style: { 
                    opacity: 0.8, 
                    color: currentPath === item.path 
                      ? (theme === 'light' ? 'rgb(59,130,246)' : 'rgb(139, 194, 253)') 
                      : (theme === 'light' ? '#4b5563' : 'white') 
                  } 
                })}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NavItem = ({ item, currentPath, onNavigate, theme }) => {
  const isActive = currentPath === item.path;
  
  return (
    <button 
      onClick={() => onNavigate(item.path)}
      style={getNavButtonStyles(isActive, theme)}
    >
      {React.cloneElement(item.icon, { color: theme === 'light' ? '#4b5563' : 'white' })}
      <span>{item.name}</span>
    </button>
  );
};

const ProfileDropdown = ({ userProfile, onNavigate, theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownStyles = getDropdownStyles(theme);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const profileMenuItems = [
    { 
      path: '/profile', 
      icon: <UserIcon size={16} />, 
      label: 'Perfil', 
      action: () => onNavigate('/profile') 
    },
    { 
      path: '/organization', 
      icon: <Briefcase size={16} />, 
      label: 'Organização', 
      action: () => onNavigate('/organization') 
    },
    { 
      path: '/notifications-settings', 
      icon: <BellRing size={16} />, 
      label: 'Config. Notificações', 
      action: () => onNavigate('/notifications-settings') 
    },
    { 
      separator: true 
    },
    { 
      icon: <LogOut size={16} />, 
      label: 'Terminar Sessão', 
      action: handleLogout, 
      danger: true 
    }
  ];

  return (
    <div 
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      style={{ position: 'relative' }}
    >
      <button style={{
        background: theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255, 255, 255, 0.1)',
        border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '999px',
        padding: '0.25rem 1rem 0.25rem 0.25rem',
        color: theme === 'light' ? '#1f2937' : 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        transition: 'all 0.2s ease'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: theme === 'light' ? 'rgba(147, 51, 234, 0.2)' : 'rgba(147, 51, 234, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '600',
          color: theme === 'light' ? 'rgb(147,51,234)' : 'white'
        }}>
          {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 500 }}>
            {userProfile?.username || 'Utilizador'}
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
            {userProfile?.organization_name || 'Sem Organização'}
          </div>
        </div>
        
        <ChevronDown 
          size={16} 
          style={{ 
            opacity: 0.7, 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
            transition: 'transform 0.2s ease' 
          }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            style={{
              ...dropdownStyles.container,
              right: 0,
              marginTop: '0.5rem'
            }}
          >
            {profileMenuItems.map((item, index) => {
              if (item.separator) {
                return (
                  <div 
                    key={`separator-${index}`}
                    style={{
                      height: '1px',
                      background: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
                      margin: '0.5rem 0'
                    }}
                  />
                );
              }

              return (
                <button
                  key={item.path || `action-${index}`}
                  onClick={() => { 
                    item.action(); 
                    setIsOpen(false); 
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: 'transparent',
                    border: 'none',
                    color: item.danger ? 'rgb(239, 68, 68)' : (theme === 'light' ? '#374151' : 'white'),
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s ease'
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// HEADER COMPONENTS
// ============================================================================

const Logo = ({ theme }) => (
  <Link 
    to="/" 
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem', 
      textDecoration: 'none', 
      color: 'inherit' 
    }}
  >
    <div style={{
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      background: 'linear-gradient(135deg, rgb(147, 51, 234), rgb(129, 44, 207))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '700',
      color: 'white',
      boxShadow: '0 2px 8px rgba(147, 51, 234, 0.3)'
    }}>
      T
    </div>
    <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>
      FlowTask
    </span>
  </Link>
);

const Navigation = ({ currentPath, onNavigate, theme }) => (
  <nav style={{ display: 'flex', gap: '0.5rem' }}>
    {NAVIGATION_CONFIG.standalone.map(item => (
      <NavItem 
        key={item.path}
        item={item} 
        currentPath={currentPath} 
        onNavigate={onNavigate} 
        theme={theme} 
      />
    ))}
    
    {NAVIGATION_CONFIG.groups.map(group => (
      <NavDropdown 
        key={group.name} 
        group={group} 
        currentPath={currentPath} 
        onNavigate={onNavigate} 
        theme={theme} 
      />
    ))}
  </nav>
);

const HeaderActions = ({ userProfile, onNavigate, theme, toggleTheme }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
    {/* Placeholder for future AI Search Bar */}
    <div style={{ width: '250px' }} />
    
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <NotificationDropdown onNavigate={onNavigate} />
      
      <button
        onClick={toggleTheme}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme === 'light' ? '#4b5563' : '#9ca3af',
          transition: 'color 0.2s ease'
        }}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>
      
      <ProfileDropdown 
        userProfile={userProfile} 
        onNavigate={onNavigate} 
        theme={theme} 
      />
    </div>
  </div>
);

// ============================================================================
// MAIN LAYOUT COMPONENT
// ============================================================================

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  // Custom hooks for data management
  usePrefetchData();
  const userProfile = useUserProfile(location.key);

  const handleNavigation = (path) => navigate(path);

  const headerStyle = useMemo(() => ({
    position: 'sticky',
    top: 0,
    zIndex: 1001,
    background: theme === 'light' ? 'rgba(249, 250, 251, 0.85)' : 'rgba(17, 24, 39, 0.85)',
    backdropFilter: 'blur(16px)',
    borderBottom: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)',
    padding: '0.75rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: theme === 'light' ? '#111827' : 'white',
    transition: 'background 0.3s ease, border-color 0.3s ease, color 0.3s ease',
  }), [theme]);

  const containerStyle = useMemo(() => ({
    minHeight: '125vh',
    position: 'relative',
    fontFamily: 'Inter, sans-serif',
    background: theme === 'light' ? 'rgb(243, 244, 246)' : 'rgb(15, 23, 42)',
    transition: 'background 0.3s ease'
  }), [theme]);

  return (
    <div style={containerStyle}>
      <BackgroundElements />

      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Logo theme={theme} />
          
          <div style={{ 
            height: '24px', 
            width: '1px', 
            background: theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)' 
          }} />
          
          <Navigation 
            currentPath={location.pathname} 
            onNavigate={handleNavigation} 
            theme={theme} 
          />
        </div>

        <HeaderActions 
          userProfile={userProfile}
          onNavigate={handleNavigation}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      </header>

      <main style={{ 
        position: 'relative', 
        zIndex: 1, 
        minHeight: 'calc(100vh - 73px)', 
        padding: '2rem' 
      }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import {
  Home, Users, Clock, CheckSquare, DollarSign, Settings,
  LogOut, User as UserIcon, Briefcase, ChevronDown, 
  Archive as ArchiveIcon, BarChart3, Settings2, Bot, Sun, Moon, GitBranch, List, FileText,
  BellRing
} from 'lucide-react';
import { Outlet } from 'react-router-dom';
import api from '../../api';
import BackgroundElements from '../HeroSection/BackgroundElements';
import NotificationDropdown from '../NotificationDropdown';
import './Layout.css';
import { useTheme } from '../../contexts/ThemeContext';

// --- QUERIES PARA PRE-FETCHING ---
// Estas queries irão correr assim que o Layout for montado (após login)
// e os dados ficarão em cache para outras partes da aplicação usarem.

const usePrefetchData = () => {
  // Pré-carrega clientes. staleTime longo porque não mudam frequentemente.
  useQuery({
    queryKey: ['clientsForDropdowns'],
    queryFn: () => api.get("/clients/?is_active=true").then(res => res.data.results || res.data),
    staleTime: 15 * 60 * 1000, // 15 minutos
  });

  // Pré-carrega categorias. staleTime infinito porque mudam muito raramente.
  useQuery({
    queryKey: ['categoriesForDropdowns'],
    queryFn: () => api.get("/task-categories/").then(res => res.data.results || res.data),
    staleTime: Infinity,
  });
};


// Componentes de Navegação (NavDropdown, NavItem, ProfileDropdown) não foram alterados...
// ... (código dos sub-componentes permanece o mesmo) ...

const NavDropdown = ({ group, currentPath, onNavigate, theme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isActive = group.items.some(item => item.path === currentPath);
  
    return (
      <div 
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        style={{ position: 'relative' }}
      >
        <button style={{
            background: isActive ? (theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.1)') : 'transparent',
            border: 'none', 
            color: theme === 'light' ? '#374151' : 'white', // Adjusted for theme
            display: 'flex', alignItems: 'center',
            gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px',
            cursor: 'pointer', transition: 'background 0.2s'
        }}>
          {React.cloneElement(group.icon, {color: theme === 'light' ? '#4b5563' : 'white'})} {/* Icon color based on theme */}
          <span>{group.name}</span>
          <ChevronDown size={16} style={{ opacity: 0.7 }}/>
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem',
                minWidth: '220px', 
                background: theme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(20, 20, 30, 0.98)',
                backdropFilter: 'blur(15px)', borderRadius: '12px',
                border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
                padding: '0.5rem', zIndex: 1002,
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
              }}
            >
              {group.items.map(item => (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', 
                    background: currentPath === item.path ? (theme === 'light' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.2)') : 'transparent',
                    border: 'none', 
                    color: currentPath === item.path ? (theme === 'light' ? 'rgb(59,130,246)' : 'rgb(139, 194, 253)') : (theme === 'light' ? '#374151' : 'white'),
                    borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.875rem'
                  }}
                >
                  {React.cloneElement(item.icon, {size: 16, style: { opacity: 0.8, color: currentPath === item.path ? (theme === 'light' ? 'rgb(59,130,246)' : 'rgb(139, 194, 253)') : (theme === 'light' ? '#4b5563' : 'white') }})} 
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
            style={{
                background: isActive ? (theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.1)') : 'transparent',
                border: 'none', 
                color: theme === 'light' ? '#374151' : 'white', // Adjusted for theme
                display: 'flex', alignItems: 'center',
                gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px',
                cursor: 'pointer', transition: 'background 0.2s'
            }}
        >
            {React.cloneElement(item.icon, {color: theme === 'light' ? '#4b5563' : 'white'})} {/* Icon color based on theme */}
            <span>{item.name}</span>
        </button>
    );
};

const ProfileDropdown = ({ userProfile, onNavigate, theme }) => { // Added theme prop
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login'; // Consider using navigate from useNavigate for consistency if possible
    };

    return (
        <div 
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          style={{ position: 'relative' }}
        >
            <button style={{
                background: theme === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255, 255, 255, 0.1)', 
                border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '999px', padding: '0.25rem 1rem 0.25rem 0.25rem',
                color: theme === 'light' ? '#1f2937' : 'white', 
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', 
                    background: theme === 'light' ? 'rgba(147, 51, 234, 0.2)' : 'rgba(147, 51, 234, 0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600',
                    color: theme === 'light' ? 'rgb(147,51,234)' : 'white'
                }}>
                    {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div style={{textAlign: 'left'}}>
                    <div style={{fontWeight: 500}}>{userProfile?.username || 'Utilizador'}</div>
                    <div style={{fontSize: '0.75rem', opacity: 0.7}}>{userProfile?.organization_name || 'Sem Organização'}</div>
                </div>
                <ChevronDown size={16} style={{ opacity: 0.7 }}/>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      style={{
                          position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                          minWidth: '220px', 
                          background: theme === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(20, 20, 30, 0.98)',
                          backdropFilter: 'blur(15px)', borderRadius: '12px',
                          border: theme === 'light' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255, 255, 255, 0.2)',
                          padding: '0.5rem', zIndex: 1002,
                          boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                      }}
                    >
                        <button onClick={() => onNavigate('/profile')} style={{width: '100%', display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: theme === 'light' ? '#374151' : 'white', borderRadius: '8px', cursor: 'pointer', textAlign: 'left'}}>
                            <UserIcon size={16}/> Perfil
                        </button>
                         <button onClick={() => onNavigate('/organization')} style={{width: '100%', display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: theme === 'light' ? '#374151' : 'white', borderRadius: '8px', cursor: 'pointer', textAlign: 'left'}}>
                            <Briefcase size={16}/> Organização
                        </button>
                        <button onClick={() => onNavigate('/notifications-settings')} style={{width: '100%', display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: theme === 'light' ? '#374151' : 'white', borderRadius: '8px', cursor: 'pointer', textAlign: 'left'}}>
                            <BellRing size={16}/> Config. Notificações
                        </button>
                        <div style={{height: '1px', background: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)', margin: '0.5rem 0'}}/>
                        <button onClick={handleLogout} style={{width: '100%', display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'rgb(239, 68, 68)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left'}}>
                            <LogOut size={16}/> Terminar Sessão
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const { theme, toggleTheme } = useTheme();

  // --- CHAMADA AO HOOK DE PRE-FETCHING ---
  usePrefetchData();

  const dashboardItem = {
    name: 'Dashboard',
    icon: <Home size={16} />,
    path: "/"
  };

  const aiItem = {
    name: 'Consultor AI',
    icon: <Bot size={16} />,
    path: "/ai-advisor"
  };

  const workflowItem = {
    name: "Workflows", 
    icon: <GitBranch size={16} />,
    path: "/workflow-management"
  };

  const reportsItem = {
    name: "Relatórios", 
    icon: <FileText size={16} />,
    path: "/reports"
  };

  const navGroups = [
    {
        name: 'Operacional',
        icon: <Settings2 size={16} />,
        items: [
            { path: "/tasks", icon: <CheckSquare size={16} />, label: "Tarefas" },
            { path: "/clients", icon: <Users size={16} />, label: "Clientes" },
            { path: "/timeentry", icon: <Clock size={16} />, label: "Registo de Tempos" },
        ]
    },
    {
        name: 'Fiscal',
        icon: <ArchiveIcon size={16} />,
        items: [
          { path: "/fiscal-dashboard", icon: <BarChart3 size={16} />, label: "Dashboard Fiscal" },
          { path: "/fiscal-definitions", icon: <Settings size={16} />, label: "Definições Fiscais" },
          { path: "/fiscal-settings", icon: <Settings2 size={16} />, label: "Config. Sistema Fiscal" },
        ]
    },
    {
        name: 'Análise',
        icon: <BarChart3 size={16} />,
        items: [
            { path: "/clientprofitability", icon: <DollarSign size={16} />, label: "Rentabilidade" },
        ]
    }
  ];

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
  }, [location.key]);

  const handleNavigation = (path) => {
    navigate(path);
  };

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

  return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: 'Inter, sans-serif', 
                  background: theme === 'light' ? 'rgb(243, 244, 246)' : 'rgb(15, 23, 42)',
                  transition: 'background 0.3s ease'
               }}>
      <BackgroundElements />

      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={headerStyle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            textDecoration: 'none', 
            color: 'inherit'
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px', 
              background: 'linear-gradient(135deg, rgb(147, 51, 234), rgb(129, 44, 207))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700',
              color: 'white', boxShadow: '0 2px 8px rgba(147, 51, 234, 0.3)'
            }}>
              T
            </div>
            <span style={{fontWeight: '600', fontSize: '1.1rem'}}>TarefAI</span>
          </Link>
          
          <div style={{ height: '24px', width: '1px', background: theme === 'light' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)' }} />
          
          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            <NavItem item={dashboardItem} currentPath={location.pathname} onNavigate={handleNavigation} theme={theme} />
            <NavItem item={aiItem} currentPath={location.pathname} onNavigate={handleNavigation} theme={theme} />
            {navGroups.map(group => (
              <NavDropdown key={group.name} group={group} currentPath={location.pathname} onNavigate={handleNavigation} theme={theme} />
            ))}
            <NavItem item={workflowItem} currentPath={location.pathname} onNavigate={handleNavigation} theme={theme} />
            <NavItem item={reportsItem} currentPath={location.pathname} onNavigate={handleNavigation} theme={theme} />
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{width: '250px'}}> {/* Placeholder for AISearchBar */} </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <NotificationDropdown onNavigate={handleNavigation} />
            <motion.button
              onClick={toggleTheme}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '0.5rem', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: theme === 'light' ? '#4b5563' : '#9ca3af'
              }}
              whileHover={{ scale: 1.1, background: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.9 }}
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 15, opacity: 0 }} transition={{ duration: 0.15 }}
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
            <ProfileDropdown userProfile={userProfile} onNavigate={handleNavigation} theme={theme} />
          </div>
        </div>
      </motion.header>

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        style={{ 
          position: 'relative', 
          zIndex: 1, 
          minHeight: 'calc(100vh - 73px)',
          padding: '2rem'
        }}
      >
        <Outlet />
      </motion.main>
    </div>
  );
};

export default Layout;
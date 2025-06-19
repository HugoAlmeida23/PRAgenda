import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Home, Users, Clock, CheckSquare, DollarSign, Settings,
  LogOut, User as UserIcon, Briefcase, ChevronDown, 
  Archive as ArchiveIcon, BarChart3, Settings2, Bot, Sun, Moon, GitBranch ,List, PlusCircle
} from 'lucide-react';
import { Outlet } from 'react-router-dom';
import api from '../../api';
import BackgroundElements from '../HeroSection/BackgroundElements';
import NotificationDropdown from '../NotificationDropdown';
import './Layout.css';
import { useTheme } from '../../contexts/ThemeContext';

const NavDropdown = ({ group, currentPath, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isActive = group.items.some(item => item.path === currentPath);
  
    return (
      <div 
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        style={{ position: 'relative' }}
      >
        <button style={{
            background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            border: 'none', color: 'white', display: 'flex', alignItems: 'center',
            gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px',
            cursor: 'pointer', transition: 'background 0.2s'
        }}>
          {group.icon}
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
                minWidth: '220px', background: 'rgba(20, 20, 30, 0.9)',
                backdropFilter: 'blur(15px)', borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '0.5rem', zIndex: 1002
              }}
            >
              {group.items.map(item => (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', background: currentPath === item.path ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.875rem'
                  }}
                >
                  <item.icon size={16} style={{ opacity: 0.8 }}/> {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
};

const NavItem = ({ item, currentPath, onNavigate }) => {
    const isActive = currentPath === item.path;
    
    return (
        <button 
            onClick={() => onNavigate(item.path)}
            style={{
                background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                border: 'none', color: 'white', display: 'flex', alignItems: 'center',
                gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px',
                cursor: 'pointer', transition: 'background 0.2s'
            }}
        >
            {item.icon}
            <span>{item.name}</span>
        </button>
    );
};

const ProfileDropdown = ({ userProfile, onNavigate }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = '/login';
    };

    return (
        <div 
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          style={{ position: 'relative' }}
        >
            <button style={{
                background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '999px', padding: '0.25rem 1rem 0.25rem 0.25rem',
                color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem'
            }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(147, 51, 234, 0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600'
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
                          minWidth: '200px', background: 'rgba(20, 20, 30, 0.9)',
                          backdropFilter: 'blur(15px)', borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          padding: '0.5rem', zIndex: 1002
                      }}
                    >
                        <button onClick={() => onNavigate('/profile')} style={{width: '100%', display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', textAlign: 'left'}}>
                            <UserIcon size={16}/> Perfil
                        </button>
                         <button onClick={() => onNavigate('/organization')} style={{width: '100%', display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', textAlign: 'left'}}>
                            <Briefcase size={16}/> Organização
                        </button>
                        <div style={{height: '1px', background: 'rgba(255,255,255,0.1)', margin: '0.5rem 0'}}/>
                        <button onClick={handleLogout} style={{width: '100%', display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'rgb(239, 68, 68)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left'}}>
                            <LogOut size={16}/> Terminar Sessão
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const { theme, toggleTheme } = useTheme();

  // Navigation items
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

  const notificationSettings = {
    name: 'Gerir Notificações',
    icon: <Bot size={16} />,
    path: "/notifications-settings"
  };

  const workflow = {
    name: "Workflows", 
    icon: <List size={16} />,
    path: "/workflow-management"
  };


  // Navigation groups
  const navGroups = [
    {
        name: 'Operacional',
        icon: <Home size={16} />,
        items: [
            { path: "/tasks", icon: CheckSquare, label: "Tarefas" },
            { path: "/clients", icon: Users, label: "Clientes" },
            { path: "/timeentry", icon: Clock, label: "Registo de Tempos" },
        ]
    },
    {
        name: 'Fiscal',
        icon: <ArchiveIcon size={16} />,
        items: [
          { path: "/fiscal-dashboard", icon: BarChart3, label: "Dashboard Fiscal" },
          { path: "/fiscal-definitions", icon: Settings, label: "Definições" },
          { path: "/fiscal-settings", icon: Settings2, label: "Configurações" },
        ]
    },
    {
        name: 'Análise',
        icon: <BarChart3 size={16} />,
        items: [
            { path: "/clientprofitability", icon: DollarSign, label: "Rentabilidade" },
            { path: "/reports", icon: DollarSign, label: "Central de Relatórios" },
        ]
    }
  ];

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const response = await api.get('/profiles/');
        if (response.data && response.data.length > 0) {
          setUserProfile(response.data[0]);
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
        if (error.response?.status === 401) navigate('/login');
      }
    };
    loadUserProfile();
  }, [navigate]);

  const handleNavigation = (path) => {
    navigate(path);
  };

  // Header style based on theme
  const headerStyle = useMemo(() => ({
    position: 'sticky', 
    top: 0, 
    zIndex: 100,
    background: theme === 'light' ? 'rgba(249, 250, 251, 0.7)' : 'rgba(17, 24, 39, 0.8)',
    backdropFilter: 'blur(20px)',
    borderBottom: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(255, 255, 255, 0.1)',
    padding: '0.75rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: theme === 'light' ? '#111827' : 'white',
    transition: 'background 0.3s ease, border-color 0.3s ease, color 0.3s ease',
  }), [theme]);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
      <BackgroundElements />

      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={headerStyle}
      >
        {/* Left Side: Logo and Main Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            textDecoration: 'none', 
            color: theme === 'light' ? '#111827' : 'white' 
          }}>
            <div style={{
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              background: 'rgba(147, 51, 234, 0.8)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: '700',
              color: 'white'
            }}>
              T
            </div>
            <span style={{fontWeight: '600'}}>TarefAi</span>
          </Link>
          
          <div style={{
            height: '24px', 
            width: '1px', 
            background: theme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
          }} />
          
          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            <NavItem 
              item={dashboardItem} 
              currentPath={location.pathname} 
              onNavigate={handleNavigation} 
            />
            <NavItem 
              item={aiItem} 
              currentPath={location.pathname} 
              onNavigate={handleNavigation} 
            />
            {navGroups.map(group => (
              <NavDropdown 
                key={group.name} 
                group={group} 
                currentPath={location.pathname} 
                onNavigate={handleNavigation} 
              />
            ))}
            <NavItem 
              item={notificationSettings} 
              currentPath={location.pathname} 
              onNavigate={handleNavigation} 
            />
            <NavItem 
              item={workflow} 
              currentPath={location.pathname} 
              onNavigate={handleNavigation} 
            />
          </nav>
        </div>

        {/* Right Side: Search, Notifications, Theme Toggle, and Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Search area placeholder */}
          <div style={{width: '300px'}}>
            {/* AISearchBar component can go here */}
          </div>
          
          <div style={{
            height: '24px', 
            width: '1px', 
            background: theme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Notifications */}
            <NotificationDropdown onNavigate={handleNavigation} api={api} />
            
            {/* Theme Toggle */}
            <motion.button
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
                color: theme === 'light' ? '#4b5563' : '#d1d5db'
              }}
              whileHover={{ 
                scale: 1.1, 
                background: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' 
              }}
              whileTap={{ scale: 0.9 }}
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
            
            {/* Profile */}
            <ProfileDropdown userProfile={userProfile} onNavigate={handleNavigation} />
          </div>
        </div>
      </motion.header>

      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
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
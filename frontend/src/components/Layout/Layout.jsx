import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate, Link, Outlet } from 'react-router-dom';
import {
  Home, Users, Clock, CheckSquare, DollarSign, Settings,
  Bell, Search, Menu, X, LogOut, User,
  Briefcase, GitPullRequest, Sparkles, Zap, Brain,
  BarChart3, TrendingUp, Calendar, FileText, HelpCircle,User2
} from 'lucide-react';
import api from '../../api'; // Adjust the import based on your API setup

// Background Component (similar to BackgroundElements)
const UnifiedBackground = () => {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 4,
    size: 4 + Math.random() * 8
  }));

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflowY: 'hidden',
      zIndex: -1
    }}>
      {/* Main Gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgb(19, 41, 77) 0%, rgb(18, 7, 29) 50%, rgb(3, 53, 61) 100%)',

      }} />

      {/* Animated Overlay */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.4
        }}
        
        animate={{
          background: [
            'radial-gradient(circle at 20% 80%, rgb(19, 41, 77) 50%, transparent 50%)',
            'radial-gradient(circle at 80% 20%, rgb(18, 7, 29) 50%, transparent 50%)',
            'radial-gradient(circle at 40% 40%, rgb(3, 53, 61) 100%, transparent 50%)'
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />

      {/* Floating Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          style={{
            position: 'absolute',
            width: '6px',
            height: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            left: `${particle.x}%`,
            top: `${particle.y}%`
          }}
          animate={{
            y: [-particle.size, particle.size],
            x: [-particle.size / 2, particle.size / 2],
            opacity: [0.1, 0.4, 0.1],
            scale: [0.5, 1, 0.5]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            repeatType: "reverse",
            delay: particle.delay,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Grid Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.02,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }} />
    </div>
  );
};

// Navigation Component
const NavigationPanel = ({ isOpen, onClose, currentPath, userProfile }) => {
  const navigate = useNavigate();

  const menuItems = [
    
    { path: "/", icon: Home, label: "Dashboard", category: "main" },
    { path: "/clientprofitability", icon: DollarSign, label: "Rentabilidade", category: "analytics" },
    { path: "/tasks", icon: CheckSquare, label: "Tarefas", category: "main" },
    { path: "/timeentry", icon: Clock, label: "Registo de Tempos", category: "main" },
    { path: "/clients", icon: Users, label: "Clientes", category: "main" },
    { path: "/organization", icon: Briefcase, label: "Organização", category: "settings" },
    { path: "/workflow-designer", icon: GitPullRequest, label: "Workflow Designer", category: "advanced" },
    { path: "/workflow-management", icon: Settings, label: "Gerir Workflows", category: "advanced" },
    { path: "/profile", icon: User2, label: "Perfil", category: "main" }
  ];

  const handleMenuClick = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 998
            }}
          />

          {/* Navigation Panel */}
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              width: '320px',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.2)',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              color: 'white'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '2rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <motion.div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(147, 51, 234, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '1.2rem'
                  }}>
                    T
                  </div>
                  <span style={{
                    fontSize: '1.5rem',
                    fontWeight: '700'
                  }}>
                    TarefAi
                  </span>
                </motion.div>

                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '8px'
                  }}
                >
                  <X size={20} />
                </motion.button>
              </div>

              {/* User Info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(147, 51, 234, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  marginRight: '1rem'
                }}>
                  {userProfile?.username?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {userProfile?.username || 'Utilizador'}
                  </div>
                  <div style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}>
                    {userProfile?.organization_name || 'Organização'}
                  </div>
                </div>
              </div>
            </div>
            
            
            {/* Menu Items */}
            <div style={{
              flex: 1,
              padding: '1rem 0',
              overflowX: 'hidden',
              overflowY: 'auto',
              // Custom scrollbar styles
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
              // WebKit scrollbar styles
              WebkitScrollbar: {
                width: '6px'
              },
              WebkitScrollbarTrack: {
                background: 'transparent'
              },
              WebkitScrollbarThumb: {
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '3px',
                transition: 'background 0.2s ease'
              },
              WebkitScrollbarThumbHover: {
                background: 'rgba(255, 255, 255, 0.5)'
              }
            }}>
              {menuItems.map((item, index) => {
                const IconComponent = item.icon;
                const isActive = currentPath === item.path;

                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <motion.button
                      onClick={() => handleMenuClick(item.path)}
                      whileHover={{ scale: 1.02, x: 8 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '1rem 2rem',
                        background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                        border: 'none',
                        color: 'white',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        borderRadius: '0 24px 24px 0',
                        margin: '0.25rem 0',
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{
                        marginRight: '1rem',
                        padding: '0.5rem',
                        borderRadius: '8px',
                        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'
                      }}>
                        <IconComponent size={18} />
                      </div>
                      {item.label}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: '2rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'white',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
              >
                <LogOut size={18} style={{ marginRight: '0.75rem' }} />
                Terminar Sessão
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const fetchDashboardData = async () => {
  try {
    const response = await api.get("/profiles/");
    console.log("Dashboard data fetched:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return null;
  }
};


// Main Layout Component
const Layout = () => {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profileData = await fetchDashboardData();
        if (profileData && profileData.length > 0) {
          // Since the API returns an array, take the first item
          setUserProfile(profileData[0]);
        }
      } catch (error) {
        console.error("Failed to load user profile:", error);
      }
    };

    loadUserProfile();
  }, []);

  // Mock notifications
  const [notifications] = useState(2);

  const toggleNav = () => setNavOpen(!navOpen);

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <UnifiedBackground />

      {/* Top Navigation Bar */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'white'
        }}
      >
        {/* Left Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <motion.button
            onClick={toggleNav}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Menu size={20} />
          </motion.button>

          {/* Search Bar */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '24px',
              padding: '0.75rem 1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              minWidth: '300px'
            }}
          >
            <Search
              size={18}
              style={{
                marginRight: '0.75rem',
                color: 'rgba(255, 255, 255, 0.7)'
              }}
            />
            <input
              type="text"
              placeholder="Pesquisar ou descrever tarefa..."
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '0.9rem',
                outline: 'none',
                width: '100%'
              }}
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles
                size={16}
                style={{ color: 'rgb(196, 181, 253)' }}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Right Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem',
              color: 'white',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <Bell size={20} />
            {notifications > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {notifications}
              </motion.span>
            )}
          </motion.button>

          {/* AI Assistant Button */}
          {/* <motion.button
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 0 20px rgba(147, 51, 234, 0.5)'
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'rgba(147, 51, 234, 0.3)',
              border: '1px solid rgba(147, 51, 234, 0.5)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Brain size={18} />
            </motion.div>
            AI Assistant
          </motion.button> */}
        </div>
      </motion.header>

      {/* Navigation Panel */}
      <NavigationPanel
        isOpen={navOpen}
        onClose={() => setNavOpen(false)}
        currentPath={location.pathname}
        userProfile={userProfile}
      />

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: 'calc(100vh - 80px)'
        }}
      >
        <Outlet />
      </motion.main>

      {/* Bottom AI Suggestions (Optional) */}
      {/* <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          padding: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          fontSize: '0.875rem',
          maxWidth: '300px',
          zIndex: 50
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          <Zap size={16} style={{ color: 'rgb(251, 191, 36)' }} />
          <span style={{ fontWeight: '600' }}>Sugestão AI</span>
        </div>
        <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.8)' }}>
          Tem 3 tarefas pendentes para hoje. Quer que organize por prioridade?
        </p>
      </motion.div> */}
    </div>
  );
};

export default Layout;
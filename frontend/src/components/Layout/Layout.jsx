// src/components/Layout/Layout.jsx

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate, Link, Outlet } from "react-router-dom";
import simpleLogo from "../../assets/simplelogo.png"; // Make sure this path is correct from Layout.jsx
import {
  Home, Users, Clock, CheckSquare, DollarSign, Settings, HelpCircle, Bell, Search,
  ChevronDown, ChevronUp, LogOut, CreditCard, Menu, X, User as ProfileIcon, // Renamed User to avoid conflict with User model
  Briefcase, GitPullRequest
} from "lucide-react";
import "./Layout.css"; // Assuming you copied modernHeaderStyles.css to Layout.css
import api from '../../api'; // Make sure this path is correct

// --- Variants (Copied from your original Header.jsx) ---
const sidebarVariants = {
  open: {
    width: "240px",
    transition: { type: "spring", stiffness: 400, damping: 20, mass: 0.5, velocity: 2 }
  },
  closed: {
    width: "64px",
    transition: { type: "spring", stiffness: 400, damping: 20, mass: 0.8, velocity: 2 }
  }
};

const menuItemVariants = {
  open: { x: 0, opacity: 1, transition: { y: { stiffness: 1000, velocity: -100 } } },
  closed: { x: -20, opacity: 0, transition: { y: { stiffness: 1000 } } }
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.1 } },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 500, damping: 24 } }
};

// --- Menu Items Data (Copied from your original Header.jsx) ---
const menuItems = [
  { path: "/", icon: <Home size={20} />, label: "Dashboard" },
  { path: "/clientprofitability", icon: <DollarSign size={20} />, label: "Rentabilidade" },
  { path: "/tasks", icon: <CheckSquare size={20} />, label: "Tarefas" },
  { path: "/timeentry", icon: <Clock size={20} />, label: "Registo de Tempos" },
  { path: "/clients", icon: <Users size={20} />, label: "Clientes" },
  { path: "/organization", icon: <Briefcase size={20} />, label: "Organização" },
  { path: "/workflow-designer", icon: <GitPullRequest size={20} />, label: "Workflow Designer" },
  { path: "/workflow-management", icon: <Settings size={20} />, label: "Gerir Workflows" }
];

// --- API Call (Adapted from your original Header.jsx) ---
const fetchLayoutUserProfileData = async () => { // Renamed to avoid conflicts if imported elsewhere
  try {
    const response = await api.get("/profiles/"); // This endpoint returns an array of profiles
    if (response.data && response.data.length > 0) {
      // Assuming the first profile in the array is the logged-in user's
      return response.data[0];
    }
    console.warn("fetchLayoutUserProfileData: No profile data found or empty array returned.");
    return null;
  } catch (error) {
    console.error("Error fetching user profile data for layout:", error);
    return null;
  }
};

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State variables (from your original Header.jsx, adapted)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const storedState = localStorage.getItem('sidebarCollapsed');
    if (storedState !== null) return JSON.parse(storedState);
    return window.innerWidth <= 768; // Default collapse on mobile
  });
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activePath, setActivePath] = useState(location.pathname);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true); // Renamed from 'loading'

  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Fetch user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      setLoadingProfile(true);
      const profileData = await fetchLayoutUserProfileData();
      setUserProfile(profileData);
      setLoadingProfile(false);
    };
    loadUserProfile();
  }, []);

  // Update active path
  useEffect(() => {
    setActivePath(location.pathname);
  }, [location]);

  // Check mobile and persist sidebar state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile && !JSON.parse(localStorage.getItem('userManuallyToggledSidebarOnMobile'))) {
        // If becoming mobile and user hasn't explicitly toggled on mobile, collapse.
        setSidebarCollapsed(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []); // Removed sidebarCollapsed from deps to avoid loops with localStorage

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);


  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle functions
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    if(isMobile) {
        localStorage.setItem('userManuallyToggledSidebarOnMobile', JSON.stringify(!newState)); // Store if sidebar is open
    }
  };
  const toggleUserDropdown = () => setUserDropdownOpen(!userDropdownOpen);

  // Menu item click
  const handleMenuItemClick = (path, e) => {
    e.preventDefault();
    navigate(path);
    if (isMobile && !sidebarCollapsed) { // If mobile and sidebar is open, close it
      toggleSidebar();
    }
  };

  // Helper functions for user display (from your original Header.jsx)
  const getUserInitials = () => {
    if (loadingProfile || !userProfile || !userProfile.username) return "U";
    const names = userProfile.username.split(" ");
    if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase();
    return userProfile.username.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (loadingProfile) return "Carregando...";
    return userProfile?.username || "User";
  };

  const getUserSubtext = () => {
    if (loadingProfile) return "";
    return userProfile?.email || userProfile?.role || "";
  };

  // === THE JSX FROM YOUR ORIGINAL Header.jsx's return statement, with Outlet ===
  return (
    <div className="app-layout">
      {/* Top Header */}
      <header className="top-header">
        <div className="header-left">
          <motion.button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* On mobile, icon always reflects current OPEN state of sidebar.
                On desktop, icon reflects collapsed state to suggest action.
            */}
            {isMobile ? (sidebarCollapsed ? <Menu size={20} /> : <X size={20} />)
                      : (sidebarCollapsed ? <Menu size={20} /> : <X size={20} />)}
          </motion.button>

          <div className="brand">
            <motion.img
              src={simpleLogo}
              alt="TarefAi Logo"
              whileHover={{ rotate: 10, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            />
            {/* Hide brand name on mobile for space, or if sidebar is collapsed and it's not mobile (very narrow view) */}
            {(!isMobile || (isMobile && !sidebarCollapsed)) && (!sidebarCollapsed || isMobile) &&
                <motion.span
                className="brand-name"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                >
                TarefAi
                </motion.span>
            }
          </div>
        </div>

        <div className="header-actions">
          <motion.button
            className="action-button"
            aria-label="Ajuda"
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <HelpCircle size={20} />
          </motion.button>

          <motion.button
            className="action-button notification-btn"
            aria-label="Notificações"
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell size={20} />
            <span className="notification-badge">3</span>
          </motion.button>

          <div className="user-profile-wrapper" ref={dropdownRef}>
            <motion.div
              className="user-profile"
              onClick={toggleUserDropdown}
              whileHover={{ backgroundColor: "var(--hover-color)" }}
            >
              <motion.div
                className="avatar-circle"
                whileHover={{ scale: 1.05 }}
              >
                <span>{getUserInitials()}</span>
              </motion.div>

              {/* Hide user name/role text on mobile for space */}
              {!isMobile && (
                  <div className="user-info">
                    <span className="user-name">{getDisplayName()}</span>
                    <span className="user-role">{getUserSubtext()}</span>
                  </div>
              )}

              <motion.div
                animate={{ rotate: userDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={18} className="dropdown-icon" />
              </motion.div>
            </motion.div>

            <AnimatePresence>
              {userDropdownOpen && (
                <motion.div
                  className="user-dropdown"
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <div className="dropdown-header">
                    <div className="avatar-circle-large">
                      <span>{getUserInitials()}</span>
                    </div>
                    <div>
                      <p className="dropdown-name">{getDisplayName()}</p>
                      <p className="dropdown-email">{userProfile?.email || userProfile?.role || ""}</p>
                    </div>
                  </div>

                  <ul className="dropdown-menu">
                    <motion.li whileHover={{ x: 5, backgroundColor: 'var(--hover-color)' }}>
                      <Link to="/profile" onClick={() => setUserDropdownOpen(false)}> {/* Use Link for navigation */}
                        <ProfileIcon size={18} />
                        <span>Perfil</span>
                      </Link>
                    </motion.li>
                    <motion.li whileHover={{ x: 5, backgroundColor: 'var(--hover-color)' }}>
                      <Link to="/billing" onClick={() => setUserDropdownOpen(false)}>
                        <CreditCard size={18} />
                        <span>Subscrição</span>
                      </Link>
                    </motion.li>
                    <li className="divider"></li>
                    <motion.li whileHover={{ x: 5, backgroundColor: 'var(--hover-color)' }}>
                      <Link to="/help" onClick={() => setUserDropdownOpen(false)}>
                        <HelpCircle size={18} />
                        <span>Ajuda & Suporte</span>
                      </Link>
                    </motion.li>
                    <li className="divider"></li>
                    <motion.li
                      className="logout-item"
                      whileHover={{ x: 5, backgroundColor: 'rgba(255, 76, 81, 0.1)' }}
                    >
                      {/* For logout, you might want a function call instead of direct navigation */}
                      <button onClick={() => { console.log('Logout clicked'); setUserDropdownOpen(false); navigate('/logout'); }} style={{all: 'unset', display: 'flex', alignItems: 'center', width: '100%', padding: '10px 16px', cursor: 'pointer'}}>
                        <LogOut size={18} />
                        <span style={{marginLeft: '10px'}}>Sair</span>
                      </button>
                    </motion.li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar and Content */}
      {/* This div was called "main-layout" in your original Header, renaming to avoid class name collision */}
      <div className="main-body-content-wrapper">
        {/* Sidebar Navigation */}
        <motion.nav
          className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''}`}
          variants={sidebarVariants}
          initial={false} // Prevent animation on initial load if state is from localStorage
          animate={(isMobile && sidebarCollapsed) ? "closed" : (sidebarCollapsed ? "closed" : "open")}
        >
          {/* Content of sidebar: only render if not (mobile AND collapsed) */}
          { !(isMobile && sidebarCollapsed) && (
            <>
              <ul className="nav-menu">
                {menuItems.map((item) => ( // Removed index from key as item.path should be unique
                  <motion.li
                    key={item.path}
                    className={`nav-item ${activePath === item.path ? 'active' : ''}`}
                    whileHover={!sidebarCollapsed ? { // Only apply this hover if sidebar is open
                      x: 5,
                      backgroundColor: activePath === item.path ? 'var(--primary-color-light)' : 'var(--hover-color)'
                    } : {}}
                    transition={{ type: "spring", stiffness: 500, damping: 17 }}
                  >
                    <Link // Changed <a> to <Link>
                      to={item.path}
                      onClick={(e) => handleMenuItemClick(item.path, e)}
                      title={item.label} // Tooltip, useful when collapsed
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {/* Show text only if sidebar is NOT collapsed */}
                      {!sidebarCollapsed &&
                        <motion.span
                            className="nav-text"
                            variants={menuItemVariants} // These variants handle opacity/x for text
                            initial="closed"
                            animate="open"
                            exit="closed"
                        >
                            {item.label}
                        </motion.span>
                      }
                    </Link>
                  </motion.li>
                ))}
              </ul>

              {/* Show footer only if sidebar is NOT collapsed */}
              {!sidebarCollapsed &&
                <motion.div
                    className="sidebar-footer"
                    variants={menuItemVariants} // Use same variants for consistency
                    initial="closed"
                    animate="open"
                    exit="closed"
                >
                    <motion.div
                    className="workspace-info"
                    whileHover={{
                        backgroundColor: 'var(--hover-color)',
                        scale: 1.02
                    }}
                    >
                    <div className="workspace-icon">
                        {/* Use loadingProfile state here */}
                        {loadingProfile ? "" : (userProfile?.organization_name ? userProfile.organization_name[0].toUpperCase() : "W")}
                    </div>
                    {/* Text part of workspace info, also animates */}
                    <motion.div
                        className="workspace-details"
                        variants={menuItemVariants} // Re-use variants if applicable, or create new ones
                    >
                        <span className="workspace-name">
                        {loadingProfile ? "" : (userProfile?.organization_name || "Workspace")}
                        </span>
                    </motion.div>
                    </motion.div>
                </motion.div>
              }
            </>
          )}
        </motion.nav>

        {/* Mobile overlay: shown if mobile and sidebar is NOT collapsed (i.e., open) */}
        <AnimatePresence>
          {isMobile && !sidebarCollapsed && (
            <motion.div
              className="sidebar-overlay"
              onClick={toggleSidebar}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Main Content Area for Routed Pages */}
        <main className="page-content-area"> {/* Was "main-content bg-white" in original */}
          <Outlet /> {/* Renders the matched child route component */}
        </main>
      </div>
    </div>
  );
};

export default Layout;
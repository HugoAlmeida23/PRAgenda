import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/Header.css";
import simpleLogo from "../assets/simplelogo.png";
import {
  Home,
  Users,
  Clock,
  CheckSquare,
  DollarSign,
  Settings,
  HelpCircle,
  Bell,
  Search,
  ChevronDown,
  ChevronUp,
  LogOut,
  CreditCard,
  Menu,
  X,
  User,
  Briefcase,
  GitPullRequest
} from "lucide-react";
import "../styles/modernHeaderStyles.css";

// Variants for animations
const sidebarVariants = {
  open: { 
    width: "240px",
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 24 
    }
  },
  closed: { 
    width: "64px",
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 24 
    }
  }
};

const menuItemVariants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      y: { stiffness: 1000, velocity: -100 }
    }
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: {
      y: { stiffness: 1000 }
    }
  }
};

const dropdownVariants = {
  hidden: { 
    opacity: 0, 
    y: -10,
    scale: 0.95,
    transition: { 
      duration: 0.1 
    } 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 500,
      damping: 24 
    } 
  }
};

// Menu items data for easy iteration
const menuItems = [
  { path: "./", icon: <Home size={20} />, label: "Dashboard", active: true },
  { path: "./clientprofitability", icon: <DollarSign size={20} />, label: "Rentabilidade" },
  { path: "./tasks", icon: <CheckSquare size={20} />, label: "Tarefas" },
  { path: "./timeentry", icon: <Clock size={20} />, label: "Registo de Tempos" },
  { path: "./clients", icon: <Users size={20} />, label: "Clientes" },
  { path: "./organization", icon: <Briefcase size={20} />, label: "Organização" },
  { path: "./workflow-designer", icon: <GitPullRequest size={20} />, label: "Workflow Designer" },
  { path: "./workflow-management", icon: <Settings size={20} />, label: "Gerir Workflows" }
];

function Header({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Check if viewing on mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setSidebarCollapsed(true);
      }
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close dropdown when clicking outside
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, searchRef]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Toggle user dropdown
  const toggleUserDropdown = () => {
    setUserDropdownOpen(!userDropdownOpen);
  };

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
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </motion.button>
          
          <div className="brand">
            <motion.img 
              src={simpleLogo} 
              alt="TarefAi Logo" 
              whileHover={{ rotate: 10, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            />
            <motion.span 
              className="brand-name"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              TarefAi
            </motion.span>
          </div>
        </div>
        
        <div className="header-search" ref={searchRef}>
          <motion.div 
            className={`search-container ${searchFocused ? 'focused' : ''}`}
            initial={{ width: "240px" }}
            animate={{ width: searchFocused ? "320px" : "240px" }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              onFocus={() => setSearchFocused(true)}
            />
          </motion.div>
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
                <span>HA</span>
              </motion.div>
              
              <div className="user-info">
                <span className="user-name">Hugo Almeida</span>
                <span className="user-role">Administrator</span>
              </div>
              
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
                      <span>HA</span>
                    </div>
                    <div>
                      <p className="dropdown-name">Hugo Almeida</p>
                      <p className="dropdown-email">hugo@tarefai.com</p>
                    </div>
                  </div>
                  
                  <ul className="dropdown-menu">
                    <motion.li whileHover={{ x: 5, backgroundColor: 'var(--hover-color)' }}>
                      <a href="/profile">
                        <User size={18} />
                        <span>Perfil</span>
                      </a>
                    </motion.li>
                    <motion.li whileHover={{ x: 5, backgroundColor: 'var(--hover-color)' }}>
                      <a href="/billing">
                        <CreditCard size={18} />
                        <span>Subscrição</span>
                      </a>
                    </motion.li>
                    <li className="divider"></li>
                    <motion.li whileHover={{ x: 5, backgroundColor: 'var(--hover-color)' }}>
                      <a href="/help">
                        <HelpCircle size={18} />
                        <span>Ajuda & Suporte</span>
                      </a>
                    </motion.li>
                    <li className="divider"></li>
                    <motion.li 
                      className="logout-item"
                      whileHover={{ x: 5, backgroundColor: 'rgba(255, 76, 81, 0.1)' }}
                    >
                      <a href="/logout">
                        <LogOut size={18} />
                        <span>Sair</span>
                      </a>
                    </motion.li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar and Content */}
      <div className="main-layout">
        {/* Sidebar Navigation */}
        <motion.nav 
          className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}
          variants={sidebarVariants}
          initial={false}
          animate={sidebarCollapsed ? "closed" : "open"}
        >
          {isMobile && sidebarCollapsed ? null : (
            <>
              <ul className="nav-menu">
                {menuItems.map((item, index) => (
                  <motion.li 
                    key={index} 
                    className={`nav-item ${item.active ? 'active' : ''}`}
                    whileHover={{ 
                      x: 5,
                      backgroundColor: item.active ? 'var(--primary-color-light)' : 'var(--hover-color)' 
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 17 }}
                  >
                    <a href={item.path} onClick={isMobile ? toggleSidebar : undefined}>
                      <span className="nav-icon">{item.icon}</span>
                      <motion.span 
                        className="nav-text"
                        variants={menuItemVariants}
                      >
                        {item.label}
                      </motion.span>
                    </a>
                  </motion.li>
                ))}
              </ul>
              
              <motion.div 
                className="sidebar-footer"
                variants={menuItemVariants}
              >
                <motion.div 
                  className="workspace-info"
                  whileHover={{ 
                    backgroundColor: 'var(--hover-color)',
                    scale: 1.02
                  }}
                >
                  <div className="workspace-icon">T</div>
                  <motion.div 
                    className="workspace-details"
                    variants={menuItemVariants}
                  >
                    <span className="workspace-name">TarefAi</span>
                  </motion.div>
                </motion.div>
              </motion.div>
            </>
          )}
        </motion.nav>

        {/* Mobile overlay */}
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

        {/* Main Content */}
        <main className="bg-white main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Header;
import { useState, useEffect } from "react";
import "../styles/Header.css";
import simpleLogo from "../assets/simplelogo.png";
import "@fortawesome/fontawesome-free/css/all.min.css";

function Header({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="app-layout">
      {/* Top Header */}
      <header className="top-header">
        <div className="header-left">
          <button 
            className="sidebar-toggle" 
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i className="fas fa-bars"></i>
          </button>
          
          <div className="brand">
            <img src={simpleLogo} alt="PRAGENDA Logo" />
            <span className="brand-name">PRAGENDA</span>
          </div>
        </div>
        
        <div className="header-search">
          <div className="search-container">
            <i className="fas fa-search"></i>
            <input type="text" placeholder="Search..." />
          </div>
        </div>
        
        <div className="header-actions">
          <button className="action-button" aria-label="Help">
            <i className="fas fa-question-circle"></i>
          </button>
          
          <button className="action-button" aria-label="Notifications">
            <i className="fas fa-bell"></i>
            <span className="notification-badge">3</span>
          </button>
          
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">Hugo Almeida</span>
              <span className="user-role">Administrator</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar and Content */}
      <div className="main-layout">
        {/* Sidebar Navigation */}
        <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          {isMobile && sidebarCollapsed ? null : (
            <>
              <ul className="nav-menu">
                <li className="nav-item active">
                  <a href="./" onClick={isMobile ? toggleSidebar : undefined}>
                    <i className="fas fa-tachometer-alt"></i>
                    <span>Dashboard</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a href="./clientprofitability" onClick={isMobile ? toggleSidebar : undefined}>
                    <i className="fas fa-users"></i>
                    <span>Rentabilidade</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a href="./tasks" onClick={isMobile ? toggleSidebar : undefined}>
                    <i className="fas fa-tasks"></i>
                    <span>Tarefas</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a href="./timeentry" onClick={isMobile ? toggleSidebar : undefined}>
                    <i className="fas fa-clock"></i>
                    <span>Registo de Tempos</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a href="./clients" onClick={isMobile ? toggleSidebar : undefined}>
                    <i className="fas fa-users"></i>
                    <span>Clientes</span>
                  </a>
                </li>
                
                
                <li className="nav-section-title">
                  <span>ACCOUNT</span>
                </li>
                
                <li className="nav-item">
                  <a href="./profile" onClick={isMobile ? toggleSidebar : undefined}>
                    <i className="fas fa-user-circle"></i>
                    <span>Profile</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a href="./settings">
                    <i className="fas fa-cog"></i>
                    <span>Settings</span>
                  </a>
                </li>
                <li className="nav-item logout">
                  <a href="./logout" onClick={isMobile ? toggleSidebar : undefined}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Sair</span>
                  </a>
                </li>
              </ul>
              
              <div className="sidebar-footer">
                <div className="workspace-info">
                  <div className="workspace-icon">P</div>
                  <div className="workspace-details">
                    <span className="workspace-name">PRAGENDA Workspace</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </nav>

        {/* Mobile overlay */}
        {isMobile && !sidebarCollapsed && (
          <div className="sidebar-overlay" onClick={toggleSidebar}></div>
        )}

        {/* Main Content */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Header;
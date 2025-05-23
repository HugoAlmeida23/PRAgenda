import { motion } from "framer-motion";
import { useState, useEffect } from "react"; // Added useEffect
import DashboardPages from '../components/HeroSection/DashboardPages';
import api from '../api'; // Assuming api.js is in src
// import "../styles/Home.css"; // If this CSS is specific to Home page content

// Container for Home page content if needed
const homeContainerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 }
  }
};


const HomePage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDataBoard, setShowDataBoard] = useState(false);


  useEffect(() => {
    const fetchDashData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get("/dashboard-summary/"); // Your API endpoint
        setDashboardData(response.data);
        console.log("🔍 Dashboard Data Recebido HomePage.jsx:", response.data);
      } catch (err) {
        console.error("⚠️ Error fetching dashboard data in HomePage:", err);
        setError(err.message || "Failed to load dashboard data.");
        // Set some default/empty data structure if needed for components to not break
        setDashboardData({ /* ...default empty structure... */ });
      } finally {
        setLoading(false);
      }
    };

    fetchDashData();
  }, []);

  if (loading) {
    return (
      <div className="p-4 min-h-screen flex items-center justify-center" style={{width: '100%', height: 'calc(100vh - 60px)'}}> {/* Adjust height if topbar is 60px */}
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados da dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="p-4 min-h-screen flex items-center justify-center text-red-500">
            Erro ao carregar dados: {error}
        </div>
    );
  }

  if (!dashboardData) {
    return (
        <div className="p-4 min-h-screen flex items-center justify-center text-gray-500">
            Nenhum dado da dashboard disponível.
        </div>
    );
  }


  return (
    // This motion.div is now for the content of the Home page itself
    // The full page background (like the gradient in DashboardPages) should be handled
    // by DashboardPages directly, as it's designed for 100vh.
    // The 'page-content-area' from Layout.jsx will allow this.
    <motion.div
      // className="p-4" // Padding might be handled by DashboardPages or globally
      style={{ height: '100%', width: '100%'}} // Ensure it fills page-content-area
      variants={homeContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <DashboardPages dashboardData={dashboardData} />
      {showDataBoard && (
        <div style={{
            position: 'fixed', bottom: '70px', left: 'calc(64px + 20px)',
            width: 'calc(100% - 100px - 64px)', maxHeight: '300px', overflowY: 'auto',
            backgroundColor: 'rgba(30,40,50,0.9)', color: 'white',
            padding: '15px', borderRadius: '8px', zIndex: 1999,
            boxShadow: '0 0 15px rgba(0,0,0,0.5)', fontSize: '12px'
          }}>
          <h3 className="text-lg font-bold mb-2">Dados Brutos (Debug):</h3>
          <pre>{JSON.stringify(dashboardData, null, 2)}</pre>
        </div>
      )}
    </motion.div>
  );
};

export default HomePage;
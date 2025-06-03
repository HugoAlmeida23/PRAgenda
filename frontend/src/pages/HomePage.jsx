import { motion } from "framer-motion";
import DashboardPages from '../components/HeroSection/DashboardPages'; // Ensure this path is correct

const homeContainerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 }
  }
};

const HomePage = ({ dashboardData }) => {
  console.log("🏠 HomePage received dashboardData:", dashboardData);
  
  if (!dashboardData || !dashboardData.permissions) { // Check for permissions object too
    return (
      <div className="p-4 min-h-screen flex items-center justify-center text-white" style={{width: '100%', height: 'calc(100vh - 80px)'}}>
        <div className="text-center p-6 bg-gray-800_alpha_0.3 rounded-lg">
          <p className="text-gray-400">Dados da dashboard indisponíveis ou permissões em falta.</p>
          <p className="text-sm text-gray-500">A tentar carregar ou aguarde.</p>
        </div>
      </div>
    );
  }
  
  return (
    <motion.div
      style={{ height: '100%', width: '100%'}} 
      variants={homeContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Pass the entire dashboardData which now includes the permissions object */}
      <DashboardPages dashboardData={dashboardData} />
    </motion.div>
  );
};

export default HomePage;

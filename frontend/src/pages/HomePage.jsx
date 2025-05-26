import { motion } from "framer-motion";
import DashboardPages from '../components/HeroSection/DashboardPages';
// Alternative: import HeroSection from '../components/HeroSection/HeroSection';

// Container for Home page content if needed
const homeContainerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.1 }
  }
};

const HomePage = ({ dashboardData }) => {
  // Add some debugging to see what data we're receiving
  console.log("🔍 HomePage received dashboardData:", dashboardData);
  
  // Add safety check
  if (!dashboardData) {
    return (
      <div className="p-4 min-h-screen flex items-center justify-center" style={{width: '100%', height: 'calc(100vh - 60px)'}}>
        <div className="text-center">
          <p className="text-gray-600">No dashboard data available</p>
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
      <DashboardPages dashboardData={dashboardData} />
    </motion.div>
  );
};

export default HomePage;
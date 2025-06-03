import React from 'react';
import { usePermissions } from '../contexts/PermissionsContext';
import OrganizationManagement from './OrganizationManagement';
import OrganizationView from './OrganizationView';
import { Loader2, Brain } from 'lucide-react';
import BackgroundElements from '../components/HeroSection/BackgroundElements';
import { motion } from 'framer-motion';

const LoadingScreen = () => (
  <div style={{ 
    position: 'relative', 
    minHeight: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    color: 'white' 
  }}>
    <BackgroundElements businessStatus="optimal" />
    <motion.div 
      animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
      transition={{ 
        rotate: { duration: 2, repeat: Infinity, ease: "linear" }, 
        scale: { duration: 1, repeat: Infinity } 
      }}
    >
      <Brain size={48} style={{ color: 'rgb(147, 51, 234)' }} />
    </motion.div>
    <p style={{ marginLeft: '1rem', fontSize: '1rem' }}>
      Carregando informações de organização...
    </p>
  </div>
);

const OrganizationRouter = () => {
  const permissions = usePermissions();

  // Show loading while permissions are being loaded
  if (permissions.loading) {
    return <LoadingScreen />;
  }

  // Route based on admin status
  if (permissions.isOrgAdmin) {
    return <OrganizationManagement />;
  } else {
    return <OrganizationView />;
  }
};

export default OrganizationRouter;
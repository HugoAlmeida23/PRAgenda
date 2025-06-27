// frontend/src/components/saft/SAFTFileList.jsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Clock, Loader2, XCircle, Eye, AlertTriangle } from 'lucide-react';
import SAFTDetailsModal from './SAFTDetailsModal';
import SAFTFileListItem from './SAFTFileListItem';

const SAFTFileList = ({ files = [] }) => {
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleViewDetails = (fileId) => {
    console.log('handleViewDetails called with fileId:', fileId);
    setSelectedFileId(fileId);
    setShowDetailsModal(true);
    console.log('Modal state updated:', { selectedFileId: fileId, showDetailsModal: true });
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedFileId(null);
  };

  if (!files || files.length === 0) {
    return (
      <div style={{ 
        padding: '3rem', 
        textAlign: 'center', 
        color: 'rgba(255, 255, 255, 0.6)' 
      }}>
        <FileText size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
        <p style={{ margin: 0, fontSize: '1.1rem' }}>
          Nenhum ficheiro SAFT encontrado
        </p>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
          Envie o seu primeiro ficheiro SAFT-PT para começar
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem' 
      }}>
        {files.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <SAFTFileListItem 
              file={file} 
              onViewDetails={handleViewDetails}
            />
          </motion.div>
        ))}
      </div>

      {/* Modal de detalhes */}
      <SAFTDetailsModal
        isOpen={showDetailsModal}
        onClose={handleCloseModal}
        saftFileId={selectedFileId}
      />
    </div>
  );
};

export default SAFTFileList;
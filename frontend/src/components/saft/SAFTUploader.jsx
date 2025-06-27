// frontend/src/components/saft/SAFTUploader.jsx

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { UploadCloud, File, X, Loader2 } from 'lucide-react';

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '16px',
};

const SAFTUploader = ({ onFileUpload, isUploading }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError('');
    if (rejectedFiles && rejectedFiles.length > 0) {
      setError('Apenas ficheiros .xml são permitidos.');
      setFile(null);
      return;
    }
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/xml': ['.xml'], 'text/xml': ['.xml'] },
    multiple: false,
  });

  const handleUploadClick = () => {
    if (file) {
      onFileUpload(file);
      // Optionally clear file after upload starts
      // setFile(null); 
    }
  };
  
  const handleRemoveFile = () => {
    setFile(null);
    setError('');
  };

  return (
    <div style={{ ...glassStyle, padding: '1.5rem' }}>
      <div
        {...getRootProps()}
        style={{
          padding: '2rem',
          textAlign: 'center',
          cursor: 'pointer',
          border: `2px dashed ${isDragActive ? 'rgb(59, 130, 246)' : 'rgba(255, 255, 255, 0.3)'}`,
          borderRadius: '12px',
          transition: 'border-color 0.2s ease-in-out, background-color 0.2s ease-in-out',
          backgroundColor: isDragActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        }}
      >
        <input {...getInputProps()} />
        <UploadCloud size={48} style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0 auto 1rem auto' }} />
        <p style={{ margin: 0, fontWeight: '500' }}>
          Arraste e solte o ficheiro SAFT-PT aqui, ou clique para selecionar.
        </p>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
          Apenas ficheiros .xml são aceites.
        </p>
      </div>
      
      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#fca5a5', fontSize: '0.875rem', marginTop: '1rem', textAlign: 'center' }}>
          {error}
        </motion.p>
      )}

      {file && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ 
            marginTop: '1.5rem', 
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...glassStyle,
            background: 'rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <File size={24} style={{ color: 'rgb(59, 130, 246)' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>{file.name}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <motion.button
              onClick={handleUploadClick}
              disabled={isUploading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(52, 211, 153, 0.2)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: '8px',
                color: 'rgb(52, 211, 153)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {isUploading ? 'A Enviar...' : 'Enviar Ficheiro'}
            </motion.button>
            <motion.button
              onClick={handleRemoveFile}
              disabled={isUploading}
              whileHover={{ scale: 1.1 }}
              style={{
                background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '0.25rem'
              }}
            >
              <X size={18} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SAFTUploader;
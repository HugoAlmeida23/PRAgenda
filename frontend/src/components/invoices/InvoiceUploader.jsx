// frontend/src/components/invoices/InvoiceUploader.jsx

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { CloudUpload, File, X, Loader2, Text } from 'lucide-react';

const InvoiceUploader = ({ onUpload, isUploading }) => {
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    setError('');
    const newFiles = [...files, ...acceptedFiles];
    if (newFiles.length > 50) { // Limit to 50 files per batch
      setError('Pode enviar no máximo 50 ficheiros de cada vez.');
      return;
    }
    setFiles(newFiles);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
  });

  const handleRemoveFile = (fileName) => {
    setFiles(files.filter(f => f.name !== fileName));
  };
  
  const handleUploadClick = () => {
    if (files.length > 0) {
      onUpload(files, description);
      setFiles([]);
      setDescription('');
    }
  };

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px' }}>
      <div {...getRootProps()} style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', border: `2px dashed ${isDragActive ? 'rgb(52, 211, 153)' : 'rgba(255, 255, 255, 0.3)'}`, borderRadius: '12px' }}>
        <input {...getInputProps()} />
        <CloudUpload size={48} style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0 auto 1rem' }} />
        <p>Arraste e solte ficheiros de faturas (PDF, JPG, PNG) aqui, ou clique para selecionar.</p>
      </div>
      {error && <p style={{ color: '#fca5a5', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
      
      {files.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>Ficheiros Selecionados ({files.length})</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
            {files.map(file => (
              <div key={file.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><File size={16} /><span>{file.name}</span></div>
                <button onClick={() => handleRemoveFile(file.name)} disabled={isUploading} style={{ background: 'none', border: 'none', color: '#fca5a5' }}><X size={16} /></button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do Lote (opcional)"
              style={{ flexGrow: 1, padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white' }}
            />
            <motion.button onClick={handleUploadClick} disabled={isUploading} whileHover={{ scale: 1.05 }} style={{ padding: '0.75rem 1.5rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '8px', color: 'rgb(52, 211, 153)' }}>
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : 'Iniciar Processamento'}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceUploader;
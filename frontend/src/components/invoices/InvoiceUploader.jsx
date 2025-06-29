// frontend/src/components/invoices/InvoiceUploader.jsx

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudUpload, X, Loader2, FileText, Check, Trash2, Eye } from 'lucide-react';

// Componente para o Modal de Visualização (Lightbox)
const FileViewerModal = ({ file, onClose }) => {
    if (!file) return null;

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="relative w-full h-full max-w-6xl max-h-[90vh] bg-gray-900/50 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex-shrink-0 p-4 border-b border-white/10 flex justify-between items-center">
                    <p className="font-semibold text-white truncate">{file.name}</p>
                    <button onClick={onClose} className="p-2 -m-2 rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-grow p-4 overflow-hidden flex items-center justify-center">
                    {file.type.startsWith('image/') ? (
                        <img src={file.preview} alt={file.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                        <iframe src={file.preview} title={file.name} className="w-full h-full border-0 rounded-md" />
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

// Componente para cada item na grelha de pré-visualização - ESTILO ATUALIZADO
const StagedFilePreview = ({ file, onRemove, onView }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative group aspect-square bg-gray-800 rounded-lg overflow-hidden border border-white/10 shadow-md"
        >
            {/* Image/Icon background */}
            {file.preview && file.type.startsWith('image/') ? (
                <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2">
                    <FileText className="w-1/3 h-1/3 opacity-50" />
                </div>
            )}
            
            {/* Static Footer with File Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pointer-events-none group-hover:opacity-0 transition-opacity">
                <p className="text-xs font-medium truncate text-white">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>

            {/* Hover Overlay with Action Buttons */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.05, duration: 0.2, ease: "easeOut" }}
                    className="w-full p-2 flex justify-center items-center gap-3"
                >
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onView(file)}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 transition-colors shadow-lg border border-blue-500/30"
                        title="Ver ficheiro"
                    >
                        <Eye size={20} />
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.stopPropagation(); onRemove(file.path); }}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/20 text-red-300 hover:bg-red-500/40 transition-colors shadow-lg border border-red-500/30"
                        title="Remover ficheiro"
                    >
                        <Trash2 size={18} />
                    </motion.button>
                </motion.div>
            </div>
        </motion.div>
    );
};

const InvoiceUploader = ({ onUpload, isUploading }) => {
  const [stagedFiles, setStagedFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [viewingFile, setViewingFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    setError('');
    const newFiles = acceptedFiles.map(file => Object.assign(file, {
        preview: URL.createObjectURL(file)
    }));
    
    setStagedFiles(current => {
        const updatedFiles = [...current, ...newFiles];
        if (updatedFiles.length > 50) {
            setError('Pode enviar no máximo 50 ficheiros de cada vez.');
            return updatedFiles.slice(0, 50);
        }
        return updatedFiles;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
    },
  });

  const handleRemoveFile = (filePath) => {
    setStagedFiles(files => files.filter(f => f.path !== filePath));
  };
  
  const handleConfirmAndUpload = () => {
    if (stagedFiles.length > 0) {
      onUpload(stagedFiles, description);
      setStagedFiles([]);
      setDescription('');
    }
  };

  useEffect(() => {
    return () => stagedFiles.forEach(file => URL.revokeObjectURL(file.preview));
  }, [stagedFiles]);

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px' }}>
      <AnimatePresence>
        {viewingFile && <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />}
      </AnimatePresence>

      <div {...getRootProps()} style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', border: `2px dashed ${isDragActive ? 'rgb(52, 211, 153)' : 'rgba(255, 255, 255, 0.3)'}`, borderRadius: '12px' }}>
        <input {...getInputProps()} />
        <CloudUpload size={48} style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0 auto 1rem' }} />
        <p>Arraste e solte ficheiros de faturas (PDF, JPG, PNG) aqui, ou clique para selecionar.</p>
      </div>
      {error && <p style={{ color: '#fca5a5', textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
      
      {stagedFiles.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>Ficheiros para Envio ({stagedFiles.length})</h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 max-h-[400px] overflow-y-auto p-2 custom-scrollbar-dark rounded-lg bg-black/20">
            <AnimatePresence>
                {stagedFiles.map(file => (
                    <StagedFilePreview 
                        key={file.path} 
                        file={file} 
                        onRemove={handleRemoveFile}
                        onView={setViewingFile}
                    />
                ))}
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do Lote (opcional)"
              style={{ flexGrow: 1, padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', minWidth: '200px' }}
            />
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <motion.button 
                    onClick={() => setStagedFiles([])} 
                    disabled={isUploading} 
                    whileHover={{ scale: 1.05 }} 
                    className="flex items-center gap-2"
                    style={{ padding: '0.75rem 1.5rem', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: 'rgb(239, 68, 68)', cursor: 'pointer' }}>
                    <Trash2 size={16} /> Limpar
                </motion.button>
                <motion.button 
                    onClick={handleConfirmAndUpload} 
                    disabled={isUploading} 
                    whileHover={{ scale: 1.05 }} 
                    className="flex items-center gap-2"
                    style={{ padding: '0.75rem 1.5rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '8px', color: 'rgb(52, 211, 153)', cursor: 'pointer' }}>
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  {isUploading ? 'A Processar...' : 'Confirmar e Processar'}
                </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceUploader;
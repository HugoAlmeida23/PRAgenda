// frontend/src/pages/SAFTManagement.jsx

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Loader2, AlertTriangle, CloudUpload, List } from 'lucide-react';

import api from '../api';
import BackgroundElements from '../components/HeroSection/BackgroundElements';
import { useTaskStore } from '../stores/useTaskStore';
import SAFTUploader from '../components/saft/SAFTUploader';
import SAFTFileList from '../components/saft/SAFTFileList';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 120 } },
};

const SAFTManagementPage = () => {
    const queryClient = useQueryClient();
    const { showSuccessNotification, showErrorNotification } = useTaskStore();

    // Check if any files are in a pending or processing state
    const hasPendingFiles = (files) =>
        Array.isArray(files) && files.some(file => ['PENDING', 'PROCESSING'].includes(file.status));

    // In SAFTManagement.jsx - Simple fix for non-paginated response
    const { data: saftFiles = [], isLoading, isError, error } = useQuery({
        queryKey: ['saftFiles'],
        queryFn: async () => {
            try {
                const response = await api.get('/saft-files/');
                console.log('SAFT API Response:', response.data);

                // If response.data is an array, return it directly
                if (Array.isArray(response.data)) {
                    return response.data;
                }

                // If response.data has results property (paginated)
                if (response.data && response.data.results) {
                    return response.data.results;
                }

                // Fallback
                return [];
            } catch (error) {
                console.error('SAFT API Error:', error);
                throw error;
            }
        },
        refetchInterval: data => hasPendingFiles(data) ? 5000 : false,
    });
    
    // Mutation for uploading a new SAFT file
    const uploadMutation = useMutation({
        mutationFn: (file) => {
            const formData = new FormData();
            formData.append('file', file);
            return api.post('/saft-files/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: () => {
            showSuccessNotification('Upload Concluído', 'O seu ficheiro SAFT-PT está a ser processado em segundo plano.');
            queryClient.invalidateQueries({ queryKey: ['saftFiles'] });
        },
        onError: (err) => {
            const errorMessage = err.response?.data?.file?.[0] || err.response?.data?.error || 'Falha no upload do ficheiro.';
            showErrorNotification('Erro no Upload', errorMessage);
        },
    });

    const handleFileUpload = (file) => {
        if (file) {
            uploadMutation.mutate(file);
        }
    };

    const pageTitle = "Gestão de Ficheiros SAFT-PT";
    const pageSubtitle = "Envie e acompanhe o processamento dos seus ficheiros SAFT para análise.";

    return (
        <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
            <BackgroundElements />
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem', maxWidth: '1200px', margin: '0 auto' }}
            >
                <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.2)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.3)' }}>
                        <FileText size={28} style={{ color: 'rgb(59,130,246)' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0, color: 'white' }}>{pageTitle}</h1>
                        <p style={{ fontSize: '1rem', color: 'rgba(191,219,254,1)', margin: 0 }}>{pageSubtitle}</p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} style={{ marginBottom: '2rem' }}>
                    <SAFTUploader onFileUpload={handleFileUpload} isUploading={uploadMutation.isPending} />
                </motion.div>

                <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', backgroundColor: 'rgba(52,211,153,0.2)', borderRadius: '12px' }}>
                            <List style={{ color: 'rgb(52,211,153)' }} size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Histórico de Ficheiros</h3>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>{saftFiles.length} ficheiros encontrados</p>
                        </div>
                    </div>

                    {isLoading ? (
                        <div style={{ padding: '3rem', textAlign: 'center' }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59,130,246)' }} />
                        </div>
                    ) : isError ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#fca5a5' }}>
                            <AlertTriangle size={32} style={{ marginBottom: '0.5rem' }} />
                            <p>Erro ao carregar ficheiros: {error.message}</p>
                        </div>
                    ) : (
                        <SAFTFileList files={saftFiles} />
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
};

export default SAFTManagementPage;
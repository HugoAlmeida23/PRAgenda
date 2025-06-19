// src/components/reports/ReportCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, User, Info, FileSpreadsheet, FileType2 as FileTypeIcon } from 'lucide-react'; // FileType2 é um bom genérico

const glassStyle = {
    background: 'rgba(40, 50, 70, 0.7)', // Um pouco mais escuro e opaco
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    color: 'white',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
};

const ReportCard = ({ report }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('pt-PT', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getFileIcon = (format) => {
        switch (format?.toLowerCase()) {
            case 'pdf': return <FileTypeIcon size={24} style={{ color: 'rgb(239, 68, 68)' }} />;
            case 'csv': return <FileSpreadsheet size={24} style={{ color: 'rgb(52, 211, 153)' }} />;
            case 'xlsx': return <FileSpreadsheet size={24} style={{ color: 'rgb(34, 197, 94)' }} />;
            default: return <FileText size={24} style={{ color: 'rgb(59, 130, 246)' }} />;
        }
    };

    const fileSizeDisplay = report.file_size_kb 
        ? report.file_size_kb > 1024 
            ? `${(report.file_size_kb / 1024).toFixed(2)} MB` 
            : `${report.file_size_kb} KB`
        : 'N/A';

    return (
        <motion.div
            style={glassStyle}
            whileHover={{ scale: 1.02, y: -4, boxShadow: '0 8px 25px rgba(59, 130, 246, 0.25)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '0.6rem', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: '10px', border:'1px solid rgba(59,130,246,0.2)' }}>
                        {getFileIcon(report.report_format)}
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }} title={report.name}>{report.name}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'rgba(191, 219, 254, 1)', margin: '0.25rem 0 0 0' }}>
                            {report.report_type_display}
                        </p>
                    </div>
                </div>

                {report.description && (
                    <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', marginBottom: '1rem', minHeight: '2.6em', lineHeight: '1.4em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {report.description}
                    </p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> <strong>Gerado em:</strong> {formatDate(report.created_at)}</div>
                    {report.generated_by_username && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><User size={14} /> <strong>Por:</strong> {report.generated_by_username}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Info size={14} /> <strong>Formato:</strong> {report.report_format_display}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Info size={14} /> <strong>Tamanho:</strong> {fileSizeDisplay}</div>
                </div>
            </div>

            <a
                href={report.storage_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    background: 'rgba(52, 211, 153, 0.25)',
                    border: '1px solid rgba(52, 211, 153, 0.35)',
                    borderRadius: '8px',
                    color: 'rgb(110, 231, 183)',
                    textDecoration: 'none',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    marginTop: 'auto', 
                    transition: 'background-color 0.2s ease, transform 0.2s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 0.35)'; e.currentTarget.style.transform = 'translateY(-1px)';}}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(52, 211, 153, 0.25)'; e.currentTarget.style.transform = 'translateY(0px)';}}
            >
                <Download size={16} /> Baixar Relatório
            </a>
        </motion.div>
    );
};

export default ReportCard;
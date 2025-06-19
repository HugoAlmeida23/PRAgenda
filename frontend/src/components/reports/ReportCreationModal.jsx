// src/components/reports/ReportCreationModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, FileText, Users, Calendar, Filter, Settings, 
    Download, Loader2, AlertCircle, CheckCircle,
    PieChart, Clock, BarChart3
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { toast } from 'react-toastify';
import { useReportStore } from '../../stores/useReportStore';

const glassStyle = {
    background: 'rgba(30, 41, 59, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    color: 'white',
};

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
};

const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
    color: 'rgba(255,255,255,0.8)'
};

const ReportCreationModal = () => {
    const queryClient = useQueryClient();
    const { 
        showReportCreationModal, 
        currentReportTypeForCreation, 
        currentReportParams,
        closeReportCreationModal,
        updateCurrentReportParam 
    } = useReportStore();

    const [step, setStep] = useState(1); // 1: Tipo, 2: Configuração, 3: Geração
    const [selectedFormat, setSelectedFormat] = useState('pdf');
    const [isGenerating, setIsGenerating] = useState(false);

    // Buscar contexto para formulários
    const { data: context, isLoading: contextLoading } = useQuery({
        queryKey: ['reportGenerationContext'],
        queryFn: async () => {
            const response = await api.get('/reports/context/');
            return response.data;
        },
        enabled: showReportCreationModal,
    });

    // Mutation para gerar relatório
    const generateReportMutation = useMutation({
        mutationFn: async (reportData) => {
            const response = await api.post('/reports/generate/', reportData);
            return response.data;
        },
        onSuccess: (data) => {
            toast.success('Relatório gerado com sucesso!');
            queryClient.invalidateQueries(['generatedReports']);
            setIsGenerating(false);
            setStep(3);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.error || 'Erro ao gerar relatório');
            setIsGenerating(false);
        },
    });

    const resetModal = () => {
        setStep(1);
        setSelectedFormat('pdf');
        setIsGenerating(false);
        closeReportCreationModal();
    };

    const handleNext = () => {
        if (step === 1 && currentReportTypeForCreation) {
            setStep(2);
        } else if (step === 2) {
            handleGenerateReport();
        }
    };

    const handleGenerateReport = () => {
        setIsGenerating(true);
        
        const reportData = {
            report_type: currentReportTypeForCreation,
            format: selectedFormat,
            name: currentReportParams.name || `Relatório ${getReportTypeLabel(currentReportTypeForCreation)}`,
            parameters: {
                ...currentReportParams,
                description: currentReportParams.description || `Relatório ${getReportTypeLabel(currentReportTypeForCreation)} gerado automaticamente`
            }
        };

        generateReportMutation.mutate(reportData);
    };

    const getReportTypeLabel = (type) => {
        const types = {
            'client_summary': 'Resumo de Clientes',
            'profitability_analysis': 'Análise de Rentabilidade',
            'task_performance': 'Performance de Tarefas',
            'time_tracking_summary': 'Resumo de Registo de Tempos',
            'custom_report': 'Relatório Personalizado'
        };
        return types[type] || type;
    };

    const getReportIcon = (type) => {
        const icons = {
            'client_summary': <Users size={24} />,
            'profitability_analysis': <PieChart size={24} />,
            'task_performance': <BarChart3 size={24} />,
            'time_tracking_summary': <Clock size={24} />,
            'custom_report': <Settings size={24} />
        };
        return icons[type] || <FileText size={24} />;
    };

    if (!showReportCreationModal) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}
                onClick={(e) => e.target === e.currentTarget && !isGenerating && resetModal()}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    style={{
                        ...glassStyle,
                        width: '100%',
                        maxWidth: step === 2 ? '800px' : '600px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        padding: '2rem'
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px' }}>
                                <FileText size={24} style={{ color: 'rgb(96, 165, 250)' }} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
                                    {step === 1 ? 'Criar Novo Relatório' : 
                                     step === 2 ? 'Configurar Relatório' : 
                                     'Relatório Gerado'}
                                </h2>
                                <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                                    {step === 1 ? 'Escolha o tipo de relatório que deseja gerar' :
                                     step === 2 ? 'Configure os parâmetros do relatório' :
                                     'O seu relatório foi gerado com sucesso'}
                                </p>
                            </div>
                        </div>
                        {!isGenerating && (
                            <button
                                onClick={resetModal}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.7)',
                                    cursor: 'pointer',
                                    padding: '0.5rem'
                                }}
                            >
                                <X size={24} />
                            </button>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            {['Tipo', 'Configuração', 'Concluído'].map((label, index) => (
                                <span 
                                    key={label}
                                    style={{ 
                                        fontSize: '0.75rem', 
                                        color: step > index ? 'rgb(34, 197, 94)' : step === index + 1 ? 'white' : 'rgba(255,255,255,0.5)',
                                        fontWeight: step === index + 1 ? '600' : '400'
                                    }}
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: '33%' }}
                                animate={{ width: `${(step / 3) * 100}%` }}
                                style={{
                                    height: '100%',
                                    background: 'linear-gradient(90deg, rgb(59, 130, 246), rgb(34, 197, 94))',
                                    borderRadius: '2px'
                                }}
                            />
                        </div>
                    </div>

                    {/* Step 1: Tipo de Relatório */}
                    {step === 1 && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{ display: 'grid', gap: '1rem' }}
                        >
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>Selecione o Tipo de Relatório</h3>
                            
                            {context?.report_types?.map((type) => (
                                <motion.button
                                    key={type.value}
                                    onClick={() => updateCurrentReportParam('report_type', type.value)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        ...glassStyle,
                                        padding: '1.5rem',
                                        cursor: 'pointer',
                                        background: currentReportTypeForCreation === type.value 
                                            ? 'rgba(59, 130, 246, 0.25)' 
                                            : 'rgba(255,255,255,0.05)',
                                        border: currentReportTypeForCreation === type.value 
                                            ? '1px solid rgba(59, 130, 246, 0.5)' 
                                            : '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div style={{ 
                                        padding: '0.75rem', 
                                        background: 'rgba(59, 130, 246, 0.15)', 
                                        borderRadius: '8px',
                                        color: 'rgb(96, 165, 250)'
                                    }}>
                                        {getReportIcon(type.value)}
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{type.label}</h4>
                                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                                            {type.value === 'client_summary' && 'Relatório detalhado sobre clientes, tarefas e rentabilidade'}
                                            {type.value === 'profitability_analysis' && 'Análise de lucros e margens por cliente'}
                                            {type.value === 'task_performance' && 'Performance e estatísticas de tarefas'}
                                            {type.value === 'time_tracking_summary' && 'Resumo de registo de tempos por utilizador e cliente'}
                                            {type.value === 'custom_report' && 'Relatório personalizado com parâmetros avançados'}
                                        </p>
                                    </div>
                                </motion.button>
                            ))}
                        </motion.div>
                    )}

                    {/* Step 2: Configuração */}
                    {step === 2 && !contextLoading && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{ display: 'grid', gap: '1.5rem' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '8px' }}>
                                    {getReportIcon(currentReportTypeForCreation)}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                                        {getReportTypeLabel(currentReportTypeForCreation)}
                                    </h3>
                                    <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                                        Configure os parâmetros do relatório
                                    </p>
                                </div>
                            </div>

                            {/* Configurações Básicas */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={labelStyle}>Nome do Relatório</label>
                                    <input
                                        type="text"
                                        value={currentReportParams.name || ''}
                                        onChange={(e) => updateCurrentReportParam('name', e.target.value)}
                                        placeholder={`Relatório ${getReportTypeLabel(currentReportTypeForCreation)}`}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Formato</label>
                                    <select
                                        value={selectedFormat}
                                        onChange={(e) => setSelectedFormat(e.target.value)}
                                        style={inputStyle}
                                    >
                                        {context?.formats?.map(format => (
                                            <option key={format.value} value={format.value} style={{ background: '#0f172a', color: '#e2e8f0' }}>
                                                {format.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Descrição (opcional)</label>
                                <textarea
                                    value={currentReportParams.description || ''}
                                    onChange={(e) => updateCurrentReportParam('description', e.target.value)}
                                    placeholder="Descrição opcional do relatório..."
                                    style={{...inputStyle, minHeight: '80px', resize: 'vertical'}}
                                />
                            </div>

                            {/* Configurações Específicas por Tipo */}
                            {currentReportTypeForCreation === 'client_summary' && (
                                <ReportClientSummaryConfig context={context} />
                            )}

                            {currentReportTypeForCreation === 'profitability_analysis' && (
                                <ReportProfitabilityConfig context={context} />
                            )}

                            {currentReportTypeForCreation === 'time_tracking_summary' && (
                                <ReportTimeTrackingConfig context={context} />
                            )}

                            {(currentReportTypeForCreation === 'task_performance' || currentReportTypeForCreation === 'custom_report') && (
                                <div style={{ 
                                    padding: '1.5rem', 
                                    background: 'rgba(251, 191, 36, 0.1)', 
                                    border: '1px solid rgba(251, 191, 36, 0.3)', 
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <AlertCircle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'rgb(251, 191, 36)' }}>Em Desenvolvimento</h4>
                                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>
                                        Este tipo de relatório ainda está em desenvolvimento. Tente outros tipos disponíveis.
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Step 3: Sucesso */}
                    {step === 3 && generateReportMutation.isSuccess && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ textAlign: 'center', padding: '2rem 0' }}
                        >
                            <CheckCircle size={64} style={{ color: 'rgb(34, 197, 94)', marginBottom: '1.5rem' }} />
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: 'rgb(34, 197, 94)' }}>
                                Relatório Gerado com Sucesso!
                            </h3>
                            <p style={{ margin: '0 0 2rem 0', color: 'rgba(255,255,255,0.8)' }}>
                                O seu relatório foi gerado e está pronto para download.
                            </p>
                            
                            {generateReportMutation.data?.report && (
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <a
                                        href={generateReportMutation.data.report.storage_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.75rem 1.5rem',
                                            background: 'rgba(34, 197, 94, 0.2)',
                                            border: '1px solid rgba(34, 197, 94, 0.3)',
                                            borderRadius: '8px',
                                            color: 'rgb(110, 231, 183)',
                                            textDecoration: 'none',
                                            fontWeight: '500'
                                        }}
                                    >
                                        <Download size={18} />
                                        Baixar Relatório
                                    </a>
                                    
                                    <button
                                        onClick={resetModal}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Criar Outro Relatório
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Loading State */}
                    {isGenerating && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ textAlign: 'center', padding: '2rem 0' }}
                        >
                            <Loader2 size={48} className="animate-spin" style={{ color: 'rgb(59, 130, 246)', marginBottom: '1rem' }} />
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Gerando Relatório...</h3>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>
                                Aguarde enquanto o relatório está sendo processado.
                            </p>
                        </motion.div>
                    )}

                    {/* Actions */}
                    {step < 3 && !isGenerating && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <button
                                onClick={step === 1 ? resetModal : () => setStep(step - 1)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                {step === 1 ? 'Cancelar' : 'Voltar'}
                            </button>
                            
                            <button
                                onClick={handleNext}
                                disabled={
                                    (step === 1 && !currentReportTypeForCreation) ||
                                    (step === 2 && (currentReportTypeForCreation === 'task_performance' || currentReportTypeForCreation === 'custom_report'))
                                }
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: (
                                        (step === 1 && !currentReportTypeForCreation) ||
                                        (step === 2 && (currentReportTypeForCreation === 'task_performance' || currentReportTypeForCreation === 'custom_report'))
                                    ) ? 'rgba(107, 114, 128, 0.5)' : 'rgba(59, 130, 246, 0.8)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: (
                                        (step === 1 && !currentReportTypeForCreation) ||
                                        (step === 2 && (currentReportTypeForCreation === 'task_performance' || currentReportTypeForCreation === 'custom_report'))
                                    ) ? 'not-allowed' : 'pointer',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {step === 2 ? <><FileText size={18} /> Gerar Relatório</> : 'Próximo'}
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Componentes de configuração específicos
const ReportClientSummaryConfig = ({ context }) => {
    const { currentReportParams, updateCurrentReportParam } = useReportStore();

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'rgba(255,255,255,0.9)' }}>
                <Filter size={18} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Filtros do Relatório
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={labelStyle}>Data Desde</label>
                    <input
                        type="date"
                        value={currentReportParams.date_from || ''}
                        onChange={(e) => updateCurrentReportParam('date_from', e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Data Até</label>
                    <input
                        type="date"
                        value={currentReportParams.date_to || ''}
                        onChange={(e) => updateCurrentReportParam('date_to', e.target.value)}
                        style={inputStyle}
                    />
                </div>
            </div>

            <div>
                <label style={labelStyle}>Clientes (deixe vazio para incluir todos)</label>
                <select
                    multiple
                    value={currentReportParams.client_ids || []}
                    onChange={(e) => {
                        const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                        updateCurrentReportParam('client_ids', selectedIds);
                    }}
                    style={{...inputStyle, minHeight: '120px'}}
                >
                    {context?.clients?.map(client => (
                        <option key={client.id} value={client.id} style={{ background: '#0f172a', color: '#e2e8f0' }}>
                            {client.name} {client.account_manager && `(${client.account_manager})`}
                        </option>
                    ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: '0.5rem 0 0 0' }}>
                    Mantenha Ctrl/Cmd pressionado para selecionar múltiplos clientes
                </p>
            </div>
        </div>
    );
};

const ReportTimeTrackingConfig = ({ context }) => {
    const { currentReportParams, updateCurrentReportParam } = useReportStore();

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'rgba(255,255,255,0.9)' }}>
                <Clock size={18} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Filtros de Registo de Tempo
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={labelStyle}>Data Desde</label>
                    <input
                        type="date"
                        value={currentReportParams.date_from || ''}
                        onChange={(e) => updateCurrentReportParam('date_from', e.target.value)}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Data Até</label>
                    <input
                        type="date"
                        value={currentReportParams.date_to || ''}
                        onChange={(e) => updateCurrentReportParam('date_to', e.target.value)}
                        style={inputStyle}
                    />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={labelStyle}>Utilizadores (deixe vazio para incluir todos)</label>
                    <select
                        multiple
                        value={currentReportParams.user_ids || []}
                        onChange={(e) => {
                            const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                            updateCurrentReportParam('user_ids', selectedIds);
                        }}
                        style={{...inputStyle, minHeight: '120px'}}
                    >
                        {context?.users?.map(user => (
                            <option key={user.id} value={user.id} style={{ background: '#0f172a', color: '#e2e8f0' }}>
                                {user.first_name || user.last_name ? `${user.first_name} ${user.last_name}`.trim() : user.username}
                                {user.role && ` (${user.role})`}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Clientes (deixe vazio para incluir todos)</label>
                    <select
                        multiple
                        value={currentReportParams.client_ids || []}
                        onChange={(e) => {
                            const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                            updateCurrentReportParam('client_ids', selectedIds);
                        }}
                        style={{...inputStyle, minHeight: '120px'}}
                    >
                        {context?.clients?.map(client => (
                            <option key={client.id} value={client.id} style={{ background: '#0f172a', color: '#e2e8f0' }}>
                                {client.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: '0.5rem 0 0 0' }}>
                Mantenha Ctrl/Cmd pressionado para selecionar múltiplos itens. Se nenhum for selecionado, todos serão incluídos.
            </p>
        </div>
    );
};

export default ReportCreationModal;
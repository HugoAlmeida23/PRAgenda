// FiscalObligationDefinitionDesigner.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, XCircle, AlertTriangle, CalendarDays, Settings, Tag, Users, Info, ListChecks, Package, Brain } from 'lucide-react';
import { toast } from 'react-toastify';
import api from "../api";
import { useQuery } from '@tanstack/react-query';

const glassStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
};

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.875rem'
};

const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
    color: 'rgba(255,255,255,0.8)'
};

const FiscalObligationDefinitionDesigner = ({ existingDefinition, onSave, onCancel, isSaving }) => {
    const initialFormData = {
        name: '',
        description: '',
        periodicity: 'MONTHLY',
        calculation_basis: 'END_OF_PERIOD',
        deadline_day: 20,
        deadline_month_offset: 1,
        specific_month_reference: null,
        applies_to_client_tags: [], // Será uma string separada por vírgulas no input
        default_task_title_template: "{obligation_name} - {client_name} - {period_description}",
        default_task_category: null,
        default_priority: 2, // 'Alta'
        default_workflow: null,
        generation_trigger_offset_days: 30,
        is_active: true,
        organization: null, // Para superusuários poderem definir
    };

    const [formData, setFormData] = useState(initialFormData);

    // Buscar TaskCategories e WorkflowDefinitions para os dropdowns
    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['taskCategories'],
        queryFn: () => api.get('/task-categories/').then(res => res.data)
    });

    const { data: workflows = [], isLoading: isLoadingWorkflows } = useQuery({
        queryKey: ['workflowDefinitionsActive'],
        queryFn: () => api.get('/workflow-definitions/?is_active=true').then(res => res.data)
    });

    // Para superusuários poderem escolher a organização ou definir como global
    const { data: organizations = [], isLoading: isLoadingOrganizations } = useQuery({
        queryKey: ['organizationsList'], // Supondo que você tenha um endpoint para listar organizações
        queryFn: () => api.get('/organizations/').then(res => res.data),
        // enabled: currentUserIsSuperuser // Adicionar lógica de permissão aqui
    });


    useEffect(() => {
        if (existingDefinition) {
            setFormData({
                name: existingDefinition.name || '',
                description: existingDefinition.description || '',
                periodicity: existingDefinition.periodicity || 'MONTHLY',
                calculation_basis: existingDefinition.calculation_basis || 'END_OF_PERIOD',
                deadline_day: existingDefinition.deadline_day || 20,
                deadline_month_offset: existingDefinition.deadline_month_offset || 1,
                specific_month_reference: existingDefinition.specific_month_reference || null,
                applies_to_client_tags: Array.isArray(existingDefinition.applies_to_client_tags)
                    ? existingDefinition.applies_to_client_tags.join(', ')
                    : '',
                default_task_title_template: existingDefinition.default_task_title_template || "{obligation_name} - {client_name} - {period_description}",
                default_task_category: existingDefinition.default_task_category || null,
                default_priority: existingDefinition.default_priority || 2,
                default_workflow: existingDefinition.default_workflow || null,
                generation_trigger_offset_days: existingDefinition.generation_trigger_offset_days || 30,
                is_active: existingDefinition.is_active !== undefined ? existingDefinition.is_active : true,
                organization: existingDefinition.organization || null,
            });
        } else {
            setFormData(initialFormData);
        }
    }, [existingDefinition]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        let processedValue = type === 'checkbox' ? checked : value;
        if (type === 'number') {
            processedValue = value === '' ? null : parseInt(value, 10);
        }
         if (name === 'default_task_category' || name === 'default_workflow' || name === 'organization') {
            processedValue = value === "" ? null : value;
        }


        setFormData(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.warn('O nome da obrigação é obrigatório.');
            return;
        }
        if (formData.deadline_day < 1 || formData.deadline_day > 31) {
            toast.warn('O dia limite deve estar entre 1 e 31.');
            return;
        }

        const dataToSave = {
            ...formData,
            applies_to_client_tags: formData.applies_to_client_tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            // Assegurar que specific_month_reference é null se não for um número válido ou se não for aplicável
            specific_month_reference: (formData.calculation_basis === 'SPECIFIC_DATE' && formData.specific_month_reference)
                                       ? parseInt(formData.specific_month_reference, 10) || null
                                       : null,
            deadline_month_offset: parseInt(formData.deadline_month_offset, 10) || 0,
            generation_trigger_offset_days: parseInt(formData.generation_trigger_offset_days, 10) || 0,
        };
        
        onSave(dataToSave);
    };

    const PERIODICITY_CHOICES = [
        { value: 'MONTHLY', label: 'Mensal' },
        { value: 'QUARTERLY', label: 'Trimestral' },
        { value: 'ANNUAL', label: 'Anual' },
        { value: 'BIANNUAL', label: 'Semestral' },
        { value: 'OTHER', label: 'Outra' },
    ];

    const CALCULATION_BASIS_CHOICES = [
        { value: 'END_OF_PERIOD', label: 'Fim do Período de Referência' },
        { value: 'SPECIFIC_DATE', label: 'Data Específica no Ano' },
        // { value: 'EVENT_DRIVEN', label: 'Após um Evento' }, // Descomentar se implementar
    ];

    const PRIORITY_CHOICES = [ // Supondo que Task.PRIORITY_CHOICES é acessível ou definido aqui
        { value: 1, label: 'Urgente' },
        { value: 2, label: 'Alta' },
        { value: 3, label: 'Média' },
        { value: 4, label: 'Baixa' },
        { value: 5, label: 'Pode Esperar' },
    ];

    // Simular permissão de superusuário (substituir pela lógica real)
    const currentUserIsSuperuser = true; // Coloque a sua lógica de verificação aqui


    return (
        <motion.form
            onSubmit={handleSubmit}
            style={{ ...glassStyle, padding: '2rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                 <div style={{ padding: '0.5rem', backgroundColor: 'rgba(147,51,234,0.2)', borderRadius: '12px' }}>
                    <ListChecks style={{ color: 'rgb(147,51,234)' }} size={24} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                    {existingDefinition ? 'Editar Definição Fiscal' : 'Nova Definição Fiscal'}
                </h2>
            </div>

            {/* Informações Gerais */}
            <motion.div style={{ ...glassStyle, background: 'rgba(255,255,255,0.03)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'rgb(191,219,254)'}}><Info size={18} />Informações Gerais</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label htmlFor="name" style={labelStyle}>Nome da Obrigação *</label>
                        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} style={inputStyle} placeholder="Ex: Entrega IVA Trimestral" required />
                    </div>
                  
                        <div>
                            <label htmlFor="organization" style={labelStyle}>Organização</label>
                            <select id="organization" name="organization" value={formData.organization || ""} onChange={handleChange} style={inputStyle} disabled={isLoadingOrganizations}>
                                {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                            </select>
                        </div>
                   
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label htmlFor="description" style={labelStyle}>Descrição</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange} style={{ ...inputStyle, minHeight: '80px' }} placeholder="Detalhes sobre esta obrigação fiscal..." />
                </div>
                 <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} style={{ width: '18px', height: '18px', accentColor: 'rgb(52,211,153)' }} />
                    <label htmlFor="is_active" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>Definição Ativa</label>
                </div>
            </motion.div>

            {/* Configuração de Prazos */}
             <motion.div style={{ ...glassStyle, background: 'rgba(255,255,255,0.03)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'rgb(191,219,254)'}}><CalendarDays size={18} />Configuração de Prazos</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label htmlFor="periodicity" style={labelStyle}>Periodicidade</label>
                        <select id="periodicity" name="periodicity" value={formData.periodicity} onChange={handleChange} style={inputStyle}>
                            {PERIODICITY_CHOICES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="calculation_basis" style={labelStyle}>Base de Cálculo do Prazo</label>
                        <select id="calculation_basis" name="calculation_basis" value={formData.calculation_basis} onChange={handleChange} style={inputStyle}>
                            {CALCULATION_BASIS_CHOICES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="deadline_day" style={labelStyle}>Dia Limite (1-31) *</label>
                        <input id="deadline_day" name="deadline_day" type="number" min="1" max="31" value={formData.deadline_day} onChange={handleChange} style={inputStyle} required />
                    </div>
                    <div>
                        <label htmlFor="deadline_month_offset" style={labelStyle}>Offset de Meses para Deadline</label>
                        <input id="deadline_month_offset" name="deadline_month_offset" type="number" min="0" value={formData.deadline_month_offset} onChange={handleChange} style={inputStyle} placeholder="Ex: 1 para mês seguinte" />
                    </div>
                    {formData.calculation_basis === 'SPECIFIC_DATE' && (
                        <div>
                            <label htmlFor="specific_month_reference" style={labelStyle}>Mês de Referência (1-12)</label>
                            <input id="specific_month_reference" name="specific_month_reference" type="number" min="1" max="12" value={formData.specific_month_reference || ''} onChange={handleChange} style={inputStyle} placeholder="Ex: 7 para Julho" />
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Aplicação e Tarefas Padrão */}
             <motion.div style={{ ...glassStyle, background: 'rgba(255,255,255,0.03)', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'rgb(191,219,254)'}}><Settings size={18} />Aplicação e Tarefas Padrão</div>
                <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="applies_to_client_tags" style={labelStyle}>Aplicar a Clientes com Tags (separadas por vírgula)</label>
                    <input id="applies_to_client_tags" name="applies_to_client_tags" type="text" value={formData.applies_to_client_tags} onChange={handleChange} style={inputStyle} placeholder="Ex: EMPRESA, IVA_TRIMESTRAL, ALL" />
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>Se vazio ou 'ALL', aplica-se a todos os clientes elegíveis da organização.</p>
                </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label htmlFor="default_task_title_template" style={labelStyle}>Template Título da Tarefa</label>
                        <input id="default_task_title_template" name="default_task_title_template" type="text" value={formData.default_task_title_template} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="generation_trigger_offset_days" style={labelStyle}>Gerar Tarefa X Dias Antes do Deadline</label>
                        <input id="generation_trigger_offset_days" name="generation_trigger_offset_days" type="number" min="0" value={formData.generation_trigger_offset_days} onChange={handleChange} style={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="default_task_category" style={labelStyle}>Categoria Padrão da Tarefa</label>
                        <select id="default_task_category" name="default_task_category" value={formData.default_task_category || ""} onChange={handleChange} style={inputStyle} disabled={isLoadingCategories}>
                            <option value="">Nenhuma</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="default_priority" style={labelStyle}>Prioridade Padrão</label>
                        <select id="default_priority" name="default_priority" value={formData.default_priority} onChange={handleChange} style={inputStyle}>
                            {PRIORITY_CHOICES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="default_workflow" style={labelStyle}>Workflow Padrão</label>
                        <select id="default_workflow" name="default_workflow" value={formData.default_workflow || ""} onChange={handleChange} style={inputStyle} disabled={isLoadingWorkflows}>
                            <option value="">Nenhum</option>
                            {workflows.map(wf => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
                        </select>
                    </div>
                </div>
            </motion.div>

            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <motion.button
                    type="button"
                    onClick={onCancel}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ padding: '0.75rem 1.5rem', ...glassStyle, background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.3)', color: 'white', fontWeight: 500, cursor: 'pointer' }}
                >
                    <XCircle size={18} style={{ marginRight: '0.5rem' }} /> Cancelar
                </motion.button>
                <motion.button
                    type="submit"
                    disabled={isSaving}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ padding: '0.75rem 1.5rem', ...glassStyle, background: 'rgba(52,211,153,0.2)', borderColor: 'rgba(52,211,153,0.3)', color: 'white', fontWeight: 500, cursor: 'pointer', opacity: isSaving ? 0.7 : 1 }}
                >
                    {isSaving ? <Brain size={18} className="animate-spin" style={{ marginRight: '0.5rem' }} /> : <Save size={18} style={{ marginRight: '0.5rem' }} />}
                    {existingDefinition ? 'Salvar Alterações' : 'Criar Definição'}
                </motion.button>
            </div>
        </motion.form>
    );
};

export default FiscalObligationDefinitionDesigner;
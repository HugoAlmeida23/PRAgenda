import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Save, X, Settings, Info, Calendar, Clock, Target, Hash, FileText, Zap, Building } from 'lucide-react';
import TagInput from '../TagInput'; // Importando o componente TagInput
// --- Sub-componentes para um formulário limpo e reutilizável ---

const glassInputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};

const FormSection = ({ title, icon, children }) => (
    <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
        <h3 style={{
            margin: '0 0 1.5rem 0',
            fontSize: '1rem',
            fontWeight: '600',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
        }}>
            {icon}
            {title}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {children}
        </div>
    </div>
);

const FormField = ({ label, children, helperText }) => (
    <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.8)' }}>
            {label}
        </label>
        {children}
        {helperText && (
            <small style={{ fontSize: '0.7rem', opacity: 0.7, display: 'block', marginTop: '0.5rem' }}>
                {helperText}
            </small>
        )}
    </div>
);

// --- Componente Principal do Formulário ---

const FiscalObligationDefinitionForm = ({
    initialData,
    taskCategories = [],
    workflowDefinitions = [],
    organizations = [],
    isSuperuser,
    userOrganizationId,
    onSubmit,
    onCancel,
    isLoading
}) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        periodicity: 'MONTHLY',
        calculation_basis: 'END_OF_PERIOD',
        deadline_day: 20,
        deadline_month_offset: 1,
        specific_month_reference: null,
        applies_to_client_tags: [],
        default_task_title_template: '{obligation_name} - {client_name} - {period_description}',
        default_task_category: null,
        default_priority: 3,
        default_workflow: null,
        generation_trigger_offset_days: 30,
        is_active: true,
        organization: isSuperuser ? null : userOrganizationId,
    });
    
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        const defaults = {
            name: '', description: '', periodicity: 'MONTHLY', calculation_basis: 'END_OF_PERIOD',
            deadline_day: 20, deadline_month_offset: 1, specific_month_reference: null,
            applies_to_client_tags: [],
            default_task_title_template: '{obligation_name} - {client_name} - {period_description}',
            default_task_category: null, default_priority: 3, default_workflow: null,
            generation_trigger_offset_days: 30, is_active: true,
            organization: isSuperuser ? null : userOrganizationId,
        };

        if (initialData) {
            setFormData({
                ...defaults,
                ...initialData,
                applies_to_client_tags: Array.isArray(initialData.applies_to_client_tags) ? initialData.applies_to_client_tags : [],
                organization: initialData.organization ?? (isSuperuser ? null : userOrganizationId),
            });
        }
    }, [initialData, isSuperuser, userOrganizationId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;
        
        // Handle number inputs cleanly
        if (['deadline_day', 'deadline_month_offset', 'specific_month_reference', 'generation_trigger_offset_days', 'default_priority'].includes(name)) {
            val = value === '' ? null : parseInt(value, 10);
        }

        // Handle null for empty selects
        if (['default_task_category', 'default_workflow', 'organization'].includes(name) && val === "") {
            val = null;
        }

        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleTagsChange = (newTags) => {
        setFormData(prev => ({ ...prev, applies_to_client_tags: newTags }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // The data is already sanitized by handleChange, so we can submit directly
        onSubmit(formData);
    };
    
    // Memoized options for performance
    const { PERIODICITY_OPTIONS, CALCULATION_BASIS_OPTIONS, PRIORITY_OPTIONS_FORM } = useMemo(() => ({
        PERIODICITY_OPTIONS: [
            { value: 'MONTHLY', label: 'Mensal' }, { value: 'QUARTERLY', label: 'Trimestral' },
            { value: 'ANNUAL', label: 'Anual' }, { value: 'BIANNUAL', label: 'Semestral' },
            { value: 'OTHER', label: 'Outra' },
        ],
        CALCULATION_BASIS_OPTIONS: [
            { value: 'END_OF_PERIOD', label: 'Fim do Período de Referência' },
            { value: 'SPECIFIC_DATE', label: 'Data Específica no Ano' },
        ],
        PRIORITY_OPTIONS_FORM: [
            { value: 1, label: 'Urgente' }, { value: 2, label: 'Alta' },
            { value: 3, label: 'Média' }, { value: 4, label: 'Baixa' },
            { value: 5, label: 'Pode Esperar' },
        ]
    }), []);
    
    const isSpecificDateBasis = formData.calculation_basis === 'SPECIFIC_DATE';

    return (
        <form onSubmit={handleSubmit} style={{ color: 'white' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>{initialData ? 'Editar Definição Fiscal' : 'Nova Definição Fiscal'}</h2>
                <motion.button type="button" onClick={onCancel} whileHover={{scale: 1.1}} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}><X size={24} /></motion.button>
            </header>

            {/* Grid de Conteúdo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                <FormSection title="Definição Principal" icon={<FileText size={20} style={{ color: 'rgb(96, 165, 250)' }} />}>
                    <FormField label="Nome da Obrigação*">
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required style={glassInputStyle} placeholder="Ex: IVA Trimestral"/>
                    </FormField>
                    <FormField label="Periodicidade*">
                        <select name="periodicity" value={formData.periodicity} onChange={handleChange} style={glassInputStyle}>
                            {PERIODICITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </FormField>
                    {isSuperuser && (
                        <FormField label="Organização (Apenas Superuser)">
                            <select name="organization" value={formData.organization || ''} onChange={handleChange} style={glassInputStyle} disabled={!isSuperuser}>
                                <option value="">Global (para todas as organizações)</option>
                                {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                            </select>
                        </FormField>
                    )}
                </FormSection>

                <FormSection title="Cálculo do Prazo" icon={<Calendar size={20} style={{ color: 'rgb(52, 211, 153)' }} />}>
                    <FormField label="Base de Cálculo do Prazo*">
                        <select name="calculation_basis" value={formData.calculation_basis} onChange={handleChange} style={glassInputStyle}>
                            {CALCULATION_BASIS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </FormField>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <FormField label="Dia Limite*">
                            <input type="number" name="deadline_day" value={formData.deadline_day ?? ''} onChange={handleChange} required min="1" max="31" style={glassInputStyle} />
                        </FormField>
                        <FormField label="Offset Meses*" helperText="0 = mesmo mês, 1 = mês seguinte, etc.">
                            <input type="number" name="deadline_month_offset" value={formData.deadline_month_offset ?? ''} onChange={handleChange} required min="0" style={glassInputStyle} />
                        </FormField>
                    </div>
                     <FormField label="Mês de Referência Específico">
                        <input type="number" name="specific_month_reference" value={formData.specific_month_reference ?? ''} onChange={handleChange} min="1" max="12" style={glassInputStyle} placeholder="1-12" disabled={!isSpecificDateBasis} title={isSpecificDateBasis ? "Mês para Data Específica" : "Apenas para 'Data Específica no Ano'"}/>
                    </FormField>
                </FormSection>
                
                <FormSection title="Geração de Tarefas" icon={<Zap size={20} style={{ color: 'rgb(251, 191, 36)' }} />}>
                     <FormField label="Criar Tarefa (dias antes do prazo)*">
                        <input type="number" name="generation_trigger_offset_days" value={formData.generation_trigger_offset_days ?? ''} onChange={handleChange} required min="0" style={glassInputStyle} />
                    </FormField>
                    <FormField label="Prioridade Padrão*">
                        <select name="default_priority" value={formData.default_priority} onChange={handleChange} style={glassInputStyle}>
                            {PRIORITY_OPTIONS_FORM.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Categoria Padrão">
                        <select name="default_task_category" value={formData.default_task_category || ''} onChange={handleChange} style={glassInputStyle}>
                            <option value="">Nenhuma</option>
                            {taskCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Workflow Padrão">
                        <select name="default_workflow" value={formData.default_workflow || ''} onChange={handleChange} style={glassInputStyle}>
                            <option value="">Nenhum</option>
                            {workflowDefinitions.map(wf => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
                        </select>
                    </FormField>
                </FormSection>

                <FormSection title="Regras de Aplicação" icon={<Target size={20} style={{ color: 'rgb(147, 51, 234)' }} />}>
                    <FormField label="Descrição" helperText="Instruções ou notas para a tarefa gerada.">
                        <textarea name="description" value={formData.description} onChange={handleChange} style={{ ...glassInputStyle, minHeight: '80px', resize: 'vertical' }} />
                    </FormField>
                    <FormField label="Aplica-se a Clientes com Tags" helperText='Deixe vazio para aplicar a todos os clientes.'>
                        <TagInput tags={formData.applies_to_client_tags} onTagsChange={handleTagsChange} placeholder="Adicionar tag e Enter"/>
                    </FormField>
                </FormSection>

                {/* Bloco de Definições Avançadas e Ativação */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <details onToggle={(e) => setShowAdvanced(e.currentTarget.open)} style={{ cursor: 'pointer' }}>
                        <summary style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Settings size={16} /> Configurações Avançadas
                        </summary>
                        <div style={{ padding: '1rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                            <FormField label="Template do Título da Tarefa*" helperText="Variáveis: {obligation_name}, {client_name}, {period_description}, {year}, {month_name}, {quarter}">
                                <input type="text" name="default_task_title_template" value={formData.default_task_title_template} onChange={handleChange} required style={glassInputStyle} />
                            </FormField>
                        </div>
                    </details>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: '1 / -1' }}>
                    <input type="checkbox" name="is_active" id="is_active_def" checked={formData.is_active} onChange={handleChange} style={{width: '18px', height: '18px', accentColor: 'rgb(52, 211, 153)'}} />
                    <label htmlFor="is_active_def" style={{ fontWeight: '500' }}>Definição Ativa</label>
                </div>
            </div>

            {/* Footer */}
            <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <motion.button type="button" onClick={onCancel} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ ...glassInputStyle, width: 'auto', padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.15)', cursor: 'pointer' }}>Cancelar</motion.button>
                <motion.button type="submit" disabled={isLoading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ ...glassInputStyle, width: 'auto', padding: '0.75rem 1.5rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52,211,153,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {initialData ? 'Salvar Alterações' : 'Criar Definição'}
                </motion.button>
            </footer>
        </form>
    );
};

export default FiscalObligationDefinitionForm;
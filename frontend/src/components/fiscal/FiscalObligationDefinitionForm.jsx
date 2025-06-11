import React, { useState, useEffect } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import TagInput from '../TagInput'; // We'll create this or adapt existing

const glassInputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
};

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
        default_task_category: '',
        default_priority: 3, // Medium
        default_workflow: '',
        generation_trigger_offset_days: 30,
        is_active: true,
        organization: isSuperuser ? '' : userOrganizationId || '', 
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                periodicity: initialData.periodicity || 'MONTHLY',
                calculation_basis: initialData.calculation_basis || 'END_OF_PERIOD',
                deadline_day: initialData.deadline_day || 20,
                deadline_month_offset: initialData.deadline_month_offset === 0 ? 0 : (initialData.deadline_month_offset || 1),
                specific_month_reference: initialData.specific_month_reference || null,
                applies_to_client_tags: Array.isArray(initialData.applies_to_client_tags) ? initialData.applies_to_client_tags : [],
                default_task_title_template: initialData.default_task_title_template || '{obligation_name} - {client_name} - {period_description}',
                default_task_category: initialData.default_task_category || '',
                default_priority: initialData.default_priority || 3,
                default_workflow: initialData.default_workflow || '',
                generation_trigger_offset_days: initialData.generation_trigger_offset_days === 0 ? 0 : (initialData.generation_trigger_offset_days || 30),
                is_active: initialData.is_active !== undefined ? initialData.is_active : true,
                organization: initialData.organization || (isSuperuser ? '' : userOrganizationId || ''),
            });
        } else {
            // For new definitions, set organization based on user type
             setFormData(prev => ({ ...prev, organization: isSuperuser ? '' : userOrganizationId || '' }));
        }
    }, [initialData, isSuperuser, userOrganizationId]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let val = type === 'checkbox' ? checked : value;
        if (type === 'number') {
            val = value === '' ? null : parseInt(value, 10);
        }
         if (name === 'specific_month_reference' && val === '') {
            val = null; // Allow clearing specific_month_reference
        }
        if ((name === 'default_task_category' || name === 'default_workflow' || name === 'organization') && val === "") {
            val = null; // Ensure empty selection becomes null for ForeignKey fields
        }
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleTagsChange = (newTags) => {
        setFormData(prev => ({ ...prev, applies_to_client_tags: newTags }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const dataToSubmit = { ...formData };
        // Ensure null for optional fields if empty
        if (dataToSubmit.specific_month_reference === '') dataToSubmit.specific_month_reference = null;
        if (dataToSubmit.default_task_category === '') dataToSubmit.default_task_category = null;
        if (dataToSubmit.default_workflow === '') dataToSubmit.default_workflow = null;
        if (dataToSubmit.organization === '') dataToSubmit.organization = null;


        onSubmit(dataToSubmit);
    };
    
    const PERIODICITY_OPTIONS = [
        { value: 'MONTHLY', label: 'Mensal' },
        { value: 'QUARTERLY', label: 'Trimestral' },
        { value: 'ANNUAL', label: 'Anual' },
        { value: 'BIANNUAL', label: 'Semestral' },
        { value: 'OTHER', label: 'Outra' },
    ];

    const CALCULATION_BASIS_OPTIONS = [
        { value: 'END_OF_PERIOD', label: 'Fim do Período de Referência' },
        { value: 'SPECIFIC_DATE', label: 'Data Específica no Ano' },
        { value: 'EVENT_DRIVEN', label: 'Após um Evento (Não implementado)' }, // Placeholder
    ];

    const PRIORITY_OPTIONS_FORM = [
        { value: 1, label: 'Urgente' },
        { value: 2, label: 'Alta' },
        { value: 3, label: 'Média' },
        { value: 4, label: 'Baixa' },
        { value: 5, label: 'Pode Esperar' },
    ];


    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{initialData ? 'Editar' : 'Nova'} Definição Fiscal</h2>
                <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            {/* Grid for form fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div>
                    <label>Nome*</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required style={glassInputStyle} />
                </div>
                <div>
                    <label>Template Título Tarefa*</label>
                    <input type="text" name="default_task_title_template" value={formData.default_task_title_template} onChange={handleChange} required style={glassInputStyle} />
                    <small style={{fontSize:'0.7rem', opacity:0.7}}>Vars: {'{obligation_name}'}, {'{client_name}'}, {'{period_description}'}, {'{year}'}, {'{month_name}'}, {'{quarter}'}</small>
                </div>
                
                <div>
                    <label>Periodicidade*</label>
                    <select name="periodicity" value={formData.periodicity} onChange={handleChange} style={glassInputStyle}>
                        {PERIODICITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                <div>
                    <label>Base Cálculo Prazo*</label>
                    <select name="calculation_basis" value={formData.calculation_basis} onChange={handleChange} style={glassInputStyle}>
                         {CALCULATION_BASIS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>

                <div>
                    <label>Dia Limite Entrega*</label>
                    <input type="number" name="deadline_day" value={formData.deadline_day || ''} onChange={handleChange} required min="1" max="31" style={glassInputStyle} />
                </div>
                <div>
                    <label>Offset Meses Deadline*</label>
                    <input type="number" name="deadline_month_offset" value={formData.deadline_month_offset === 0 ? '0' : (formData.deadline_month_offset || '')} onChange={handleChange} required min="0" style={glassInputStyle} />
                </div>

                <div>
                    <label>Mês Referência Específico</label>
                    <input type="number" name="specific_month_reference" value={formData.specific_month_reference || ''} onChange={handleChange} min="1" max="12" style={glassInputStyle} placeholder="1-12 (opcional)" />
                </div>
                <div>
                    <label>Gatilho Geração (dias antes)*</label>
                    <input type="number" name="generation_trigger_offset_days" value={formData.generation_trigger_offset_days === 0 ? '0' : (formData.generation_trigger_offset_days || '')} onChange={handleChange} required min="0" style={glassInputStyle} />
                </div>

                <div>
                    <label>Categoria Padrão Tarefa</label>
                    <select name="default_task_category" value={formData.default_task_category || ''} onChange={handleChange} style={glassInputStyle}>
                        <option value="">Nenhuma</option>
                        {taskCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>
                <div>
                    <label>Prioridade Padrão Tarefa*</label>
                    <select name="default_priority" value={formData.default_priority} onChange={handleChange} style={glassInputStyle}>
                        {PRIORITY_OPTIONS_FORM.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>
                
                <div>
                    <label>Workflow Padrão</label>
                    <select name="default_workflow" value={formData.default_workflow || ''} onChange={handleChange} style={glassInputStyle}>
                        <option value="">Nenhum</option>
                        {workflowDefinitions.map(wf => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
                    </select>
                </div>

                {isSuperuser && (
                     <div>
                        <label>Organização (Superuser)</label>
                        <select name="organization" value={formData.organization || ''} onChange={handleChange} style={glassInputStyle} disabled={!isSuperuser}>
                            <option value="">Global (Nenhuma)</option>
                            {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                        </select>
                    </div>
                )}

            </div>
            
            {/* Spanning fields */}
            <div style={{ gridColumn: '1 / -1' }}>
                <label>Descrição</label>
                <textarea name="description" value={formData.description} onChange={handleChange} style={{ ...glassInputStyle, minHeight: '80px', resize: 'vertical' }} />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
                <label>Aplica-se a Clientes com Tags (deixe vazio para todos, ou use "ALL")</label>
                <TagInput tags={formData.applies_to_client_tags} onTagsChange={handleTagsChange} placeholder="Adicionar tag e pressionar Enter"/>
                <small style={{fontSize:'0.7rem', opacity:0.7}}>Ex: EMPRESA, IVA_TRIMESTRAL. Case-insensitive, serão guardadas em maiúsculas.</small>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: '1 / -1' }}>
                <input type="checkbox" name="is_active" id="is_active_def" checked={formData.is_active} onChange={handleChange} style={{width: '18px', height: '18px'}} />
                <label htmlFor="is_active_def">Definição Ativa</label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', gridColumn: '1 / -1' }}>
                <button type="button" onClick={onCancel} style={{ ...glassInputStyle, width: 'auto', padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.15)', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={isLoading} style={{ ...glassInputStyle, width: 'auto', padding: '0.75rem 1.5rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52,211,153,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {initialData ? 'Salvar Alterações' : 'Criar Definição'}
                </button>
            </div>
        </form>
    );
};

export default FiscalObligationDefinitionForm;
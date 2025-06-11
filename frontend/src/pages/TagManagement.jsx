import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Tag, Plus, X, Hash, Search, CheckCircle, AlertTriangle, 
    Building, FileText, Calendar, Users, Settings, Info,
    Clock, Target, TrendingUp, Filter, Download, Upload
} from 'lucide-react';

// Sistema de tags pré-definidas para contabilidade portuguesa
const FISCAL_TAG_CATEGORIES = {
    ENTITY_TYPE: {
        name: 'Tipo de Entidade',
        color: '#3B82F6',
        tags: [
            { name: 'EMPRESA', description: 'Empresa comercial', icon: '🏢' },
            { name: 'UNIPESSOAL', description: 'Sociedade unipessoal', icon: '👤' },
            { name: 'PROFISSIONAL_LIBERAL', description: 'Profissional liberal', icon: '💼' },
            { name: 'COMERCIANTE_INDIVIDUAL', description: 'Comerciante individual', icon: '🛍️' },
            { name: 'MICRO_EMPRESA', description: 'Micro empresa', icon: '🏪' },
            { name: 'PME', description: 'Pequena e média empresa', icon: '🏭' },
            { name: 'GRANDE_EMPRESA', description: 'Grande empresa', icon: '🏗️' }
        ]
    },
    IVA_REGIME: {
        name: 'Regime de IVA',
        color: '#10B981',
        tags: [
            { name: 'IVA_MENSAL', description: 'Entrega mensal de IVA', icon: '📅' },
            { name: 'IVA_TRIMESTRAL', description: 'Entrega trimestral de IVA', icon: '📊' },
            { name: 'IVA_ANUAL', description: 'Entrega anual de IVA', icon: '📋' },
            { name: 'ISENTO_IVA', description: 'Isento de IVA', icon: '🚫' },
            { name: 'REGIME_CASH', description: 'Regime de caixa', icon: '💰' }
        ]
    },
    IRC_REGIME: {
        name: 'Regime de IRC',
        color: '#8B5CF6',
        tags: [
            { name: 'REGIME_GERAL_IRC', description: 'Regime geral de IRC', icon: '📄' },
            { name: 'REGIME_SIMPLIFICADO_IRC', description: 'Regime simplificado de IRC', icon: '📝' },
            { name: 'DERRAMA_ESTADUAL', description: 'Sujeito a derrama estadual', icon: '🏛️' },
            { name: 'DERRAMA_MUNICIPAL', description: 'Sujeito a derrama municipal', icon: '🏙️' }
        ]
    },
    CONTABILIDADE: {
        name: 'Contabilidade',
        color: '#F59E0B',
        tags: [
            { name: 'CONTABILIDADE_ORGANIZADA', description: 'Contabilidade organizada', icon: '📚' },
            { name: 'CONTABILIDADE_SIMPLIFICADA', description: 'Contabilidade simplificada', icon: '📄' },
            { name: 'PLANO_CONTAS_SNC', description: 'SNC - Sistema de Normalização Contabilística', icon: '🧮' },
            { name: 'PLANO_CONTAS_SNC_PE', description: 'SNC-PE - Pequenas Entidades', icon: '📊' }
        ]
    },
    IRS_CATEGORIES: {
        name: 'Categorias IRS',
        color: '#EF4444',
        tags: [
            { name: 'IRS_CATEGORIA_A', description: 'Cat. A - Trabalho dependente', icon: '👔' },
            { name: 'IRS_CATEGORIA_B', description: 'Cat. B - Trabalho independente', icon: '💼' },
            { name: 'IRS_CATEGORIA_E', description: 'Cat. E - Capitais', icon: '💎' },
            { name: 'IRS_CATEGORIA_F', description: 'Cat. F - Prediais', icon: '🏠' },
            { name: 'IRS_CATEGORIA_G', description: 'Cat. G - Incrementos patrimoniais', icon: '📈' },
            { name: 'IRS_CATEGORIA_H', description: 'Cat. H - Pensões', icon: '👴' }
        ]
    },
    SPECIAL_REGIMES: {
        name: 'Regimes Especiais',
        color: '#06B6D4',
        tags: [
            { name: 'EXPORTADOR', description: 'Operador exportador', icon: '🚢' },
            { name: 'IMPORTADOR', description: 'Operador importador', icon: '📦' },
            { name: 'OPERADOR_INTRACOMUNITARIO', description: 'Operações intracomunitárias', icon: '🇪🇺' },
            { name: 'REGIME_FORFETARIO', description: 'Regime forfetário', icon: '🎯' },
            { name: 'ACTIVIDADE_AGRICOLA', description: 'Atividade agrícola', icon: '🌾' }
        ]
    },
    DECLARATIONS: {
        name: 'Declarações e Modelos',
        color: '#EC4899',
        tags: [
            { name: 'MODELO_22', description: 'Modelo 22 - IRC', icon: '📋' },
            { name: 'MODELO_10', description: 'Modelo 10 - IRS', icon: '📄' },
            { name: 'IES', description: 'Informação Empresarial Simplificada', icon: '📊' },
            { name: 'MAPAS_RECAPITULATIVOS', description: 'Mapas recapitulativos', icon: '📈' },
            { name: 'INTRASTAT', description: 'Declaração Intrastat', icon: '📋' },
            { name: 'ENI', description: 'Entrega de Dados por Meios Eletrónicos', icon: '💻' }
        ]
    },
    SOCIAL_SECURITY: {
        name: 'Segurança Social',
        color: '#84CC16',
        tags: [
            { name: 'SEGURANCA_SOCIAL', description: 'Obrigações Segurança Social', icon: '🛡️' },
            { name: 'FUNDO_COMPENSACAO', description: 'Fundo de Compensação do Trabalho', icon: '💰' },
            { name: 'DMRP', description: 'Declaração Mensal de Remunerações', icon: '📋' },
            { name: 'TAXA_SOCIAL_UNICA', description: 'Taxa Social Única', icon: '💼' }
        ]
    }
};

// Componente para cada tag individual
const FiscalTag = ({ tag, category, isSelected, onToggle, size = 'md', interactive = true }) => {
    const sizeClasses = {
        sm: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
        md: { padding: '0.5rem 0.75rem', fontSize: '0.875rem' },
        lg: { padding: '0.75rem 1rem', fontSize: '1rem' }
    };

    return (
        <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={interactive ? { scale: 1.05 } : {}}
            whileTap={interactive ? { scale: 0.95 } : {}}
            onClick={interactive ? () => onToggle(tag.name) : undefined}
            style={{
                ...sizeClasses[size],
                backgroundColor: isSelected ? `${category.color}40` : `${category.color}20`,
                border: `1px solid ${isSelected ? category.color : category.color + '50'}`,
                borderRadius: '9999px',
                color: category.color,
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                position: 'relative',
                cursor: interactive ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                margin: '0.25rem'
            }}
        >
            <span style={{ fontSize: '1.2em' }}>{tag.icon}</span>
            <span>{tag.name}</span>
            {isSelected && interactive && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{
                        backgroundColor: category.color,
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '0.25rem'
                    }}
                >
                    <CheckCircle size={12} color="white" />
                </motion.div>
            )}
        </motion.div>
    );
};

// Componente principal do sistema de tags
const FiscalTagSystem = ({ 
    selectedTags = [], 
    onChange, 
    disabled = false,
    showDescription = true,
    maxTags = null,
    organizationTags = []
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [showCustomTagDialog, setShowCustomTagDialog] = useState(false);
    const [customTag, setCustomTag] = useState('');
    const [activeTab, setActiveTab] = useState('predefined');

    // Combinar tags pré-definidas com tags da organização
    const allCategories = {
        ...FISCAL_TAG_CATEGORIES,
        ...(organizationTags.length > 0 ? {
            ORGANIZATION: {
                name: 'Tags da Organização',
                color: '#6366F1',
                tags: organizationTags.map(tag => ({
                    name: tag.name,
                    description: tag.description || 'Tag personalizada da organização',
                    icon: tag.icon || '🏷️'
                }))
            }
        } : {})
    };

    const categories = Object.keys(allCategories);

    // Filtrar tags baseado na pesquisa e categoria
    const filteredTags = () => {
        let allTags = [];
        
        Object.entries(allCategories).forEach(([categoryKey, category]) => {
            if (selectedCategory === 'ALL' || selectedCategory === categoryKey) {
                category.tags.forEach(tag => {
                    if (tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        tag.description.toLowerCase().includes(searchTerm.toLowerCase())) {
                        allTags.push({ ...tag, category });
                    }
                });
            }
        });
        
        return allTags;
    };

    const handleTagToggle = (tagName) => {
        if (disabled) return;
        
        const newSelectedTags = selectedTags.includes(tagName)
            ? selectedTags.filter(t => t !== tagName)
            : [...selectedTags, tagName];
        
        if (maxTags && newSelectedTags.length > maxTags) {
            return; // Não permite ultrapassar o limite
        }
        
        onChange(newSelectedTags);
    };

    const handleCustomTagAdd = () => {
        if (!customTag.trim() || disabled) return;
        
        const tagName = customTag.trim().toUpperCase().replace(/\s+/g, '_');
        if (!selectedTags.includes(tagName)) {
            handleTagToggle(tagName);
        }
        setCustomTag('');
        setShowCustomTagDialog(false);
    };

    const getTagStats = () => {
        const totalSelected = selectedTags.length;
        const byCategory = {};
        
        Object.entries(allCategories).forEach(([key, category]) => {
            const categoryTags = category.tags.filter(tag => selectedTags.includes(tag.name));
            if (categoryTags.length > 0) {
                byCategory[category.name] = categoryTags.length;
            }
        });
        
        return { totalSelected, byCategory };
    };

    const stats = getTagStats();

    if (disabled) {
        return (
            <div style={{ padding: '1rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.9)' }}>
                    Tags Fiscais ({selectedTags.length})
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {selectedTags.map(tagName => {
                        // Encontrar a tag e categoria
                        let foundTag = null;
                        let foundCategory = null;
                        
                        Object.values(allCategories).forEach(category => {
                            const tag = category.tags.find(t => t.name === tagName);
                            if (tag) {
                                foundTag = tag;
                                foundCategory = category;
                            }
                        });
                        
                        if (!foundTag) {
                            // Tag customizada
                            foundTag = { name: tagName, description: 'Tag personalizada', icon: '🏷️' };
                            foundCategory = { color: '#6B7280' };
                        }
                        
                        return (
                            <FiscalTag
                                key={tagName}
                                tag={foundTag}
                                category={foundCategory}
                                isSelected={false}
                                interactive={false}
                                size="sm"
                            />
                        );
                    })}
                </div>
                {selectedTags.length === 0 && (
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                        Nenhuma tag fiscal definida para este cliente.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '16px', 
            padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            {/* Header com estatísticas */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.25rem', fontWeight: '600' }}>
                        Sistema de Tags Fiscais
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ 
                            padding: '0.25rem 0.75rem', 
                            background: 'rgba(59,130,246,0.2)', 
                            borderRadius: '9999px',
                            color: 'rgb(147,197,253)',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                        }}>
                            {stats.totalSelected} {maxTags ? `/ ${maxTags}` : ''} selecionadas
                        </span>
                    </div>
                </div>
                
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    {['predefined', 'custom'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '0.5rem 1rem',
                                background: activeTab === tab ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            {tab === 'predefined' ? 'Tags Pré-definidas' : 'Tags Personalizadas'}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'predefined' && (
                <>
                    {/* Controles de pesquisa e filtro */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Search size={16} style={{
                                    position: 'absolute',
                                    left: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'rgba(255,255,255,0.5)'
                                }} />
                                <input
                                    type="text"
                                    placeholder="Pesquisar tags..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '0.875rem'
                                    }}
                                />
                            </div>
                            
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                style={{
                                    padding: '0.75rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.875rem',
                                    minWidth: '200px'
                                }}
                            >
                                <option value="ALL">Todas as categorias</option>
                                {categories.map(key => (
                                    <option key={key} value={key}>
                                        {allCategories[key].name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tags agrupadas por categoria */}
                    <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {categories.map(categoryKey => {
                            const category = allCategories[categoryKey];
                            const categoryTags = category.tags.filter(tag => {
                                if (selectedCategory !== 'ALL' && selectedCategory !== categoryKey) return false;
                                return tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       tag.description.toLowerCase().includes(searchTerm.toLowerCase());
                            });

                            if (categoryTags.length === 0) return null;

                            return (
                                <div key={categoryKey} style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ 
                                        margin: '0 0 0.75rem 0', 
                                        color: category.color,
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <div style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            backgroundColor: category.color
                                        }} />
                                        {category.name}
                                        <span style={{ 
                                            fontSize: '0.75rem', 
                                            color: 'rgba(255,255,255,0.6)',
                                            fontWeight: 'normal'
                                        }}>
                                            ({categoryTags.length})
                                        </span>
                                    </h4>
                                    
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {categoryTags.map(tag => (
                                            <FiscalTag
                                                key={tag.name}
                                                tag={tag}
                                                category={category}
                                                isSelected={selectedTags.includes(tag.name)}
                                                onToggle={handleTagToggle}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {activeTab === 'custom' && (
                <div style={{ padding: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem',
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                        }}>
                            Criar Tag Personalizada
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={customTag}
                                onChange={(e) => setCustomTag(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleCustomTagAdd();
                                    }
                                }}
                                placeholder="Ex: ATIVIDADE_ESPECIFICA"
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '0.875rem'
                                }}
                            />
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleCustomTagAdd}
                                disabled={!customTag.trim()}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: customTag.trim() ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)',
                                    border: '1px solid rgba(59,130,246,0.3)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: customTag.trim() ? 'pointer' : 'not-allowed',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                <Plus size={16} />
                            </motion.button>
                        </div>
                        <p style={{ 
                            fontSize: '0.75rem', 
                            color: 'rgba(255,255,255,0.6)',
                            marginTop: '0.5rem',
                            margin: '0.5rem 0 0 0'
                        }}>
                            Tags personalizadas são convertidas para MAIÚSCULAS e espaços são substituídos por underscores
                        </p>
                    </div>

                    {/* Tags personalizadas existentes */}
                    <div>
                        <h4 style={{ 
                            margin: '0 0 0.75rem 0',
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}>
                            Tags Personalizadas Selecionadas
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {selectedTags
                                .filter(tagName => !Object.values(allCategories).some(cat => 
                                    cat.tags.some(tag => tag.name === tagName)
                                ))
                                .map(tagName => (
                                    <motion.div
                                        key={tagName}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            backgroundColor: 'rgba(107,114,128,0.3)',
                                            border: '1px solid rgba(107,114,128,0.5)',
                                            borderRadius: '9999px',
                                            color: 'rgb(156,163,175)',
                                            fontWeight: '600',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        <span>🏷️</span>
                                        {tagName}
                                        <motion.button
                                            whileHover={{ scale: 1.2 }}
                                            whileTap={{ scale: 0.8 }}
                                            onClick={() => handleTagToggle(tagName)}
                                            style={{
                                                background: 'rgba(239,68,68,0.2)',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '18px',
                                                height: '18px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: 'rgb(248,113,113)'
                                            }}
                                        >
                                            <X size={12} />
                                        </motion.button>
                                    </motion.div>
                                ))}
                        </div>
                        {selectedTags.filter(tagName => !Object.values(allCategories).some(cat => 
                            cat.tags.some(tag => tag.name === tagName)
                        )).length === 0 && (
                            <p style={{ 
                                color: 'rgba(255,255,255,0.6)', 
                                fontStyle: 'italic',
                                fontSize: '0.875rem'
                            }}>
                                Nenhuma tag personalizada criada ainda.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Resumo das tags selecionadas */}
            {stats.totalSelected > 0 && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(59,130,246,0.1)',
                    borderRadius: '8px',
                    border: '1px solid rgba(59,130,246,0.2)'
                }}>
                    <h4 style={{ 
                        margin: '0 0 0.5rem 0',
                        color: 'rgb(147,197,253)',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                    }}>
                        Resumo das Tags Selecionadas:
                    </h4>
                    <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'rgba(255,255,255,0.8)',
                        lineHeight: 1.5
                    }}>
                        {Object.entries(stats.byCategory).map(([categoryName, count]) => (
                            <div key={categoryName}>
                                • {categoryName}: {count} tag{count !== 1 ? 's' : ''}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Informações adicionais */}
            <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'rgba(16,185,129,0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(16,185,129,0.2)',
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.5
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <Info size={16} style={{ color: 'rgb(52,211,153)', marginTop: '0.1rem', flexShrink: 0 }} />
                    <div>
                        <strong style={{ color: 'rgb(52,211,153)' }}>Como usar as tags fiscais:</strong>
                        <ul style={{ margin: '0.5rem 0 0 1rem', paddingLeft: 0 }}>
                            <li>Tags definem as obrigações fiscais aplicáveis ao cliente</li>
                            <li>O sistema criará automaticamente tarefas baseadas nas tags</li>
                            <li>Combine tags de diferentes categorias para personalização completa</li>
                            <li>Tags personalizadas podem ser criadas para necessidades específicas</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente principal de demonstração
const FiscalTagSystemDemo = () => {
    const [clientTags, setClientTags] = useState(['EMPRESA', 'IVA_TRIMESTRAL', 'REGIME_GERAL_IRC']);
    const [readOnlyTags] = useState(['PROFISSIONAL_LIBERAL', 'IRS_CATEGORIA_B']);
    const [selectedView, setSelectedView] = useState('manager');

    const organizationTags = [
        { name: 'CLIENTE_VIP', description: 'Cliente VIP da organização', icon: '⭐' },
        { name: 'SETOR_TURISTICO', description: 'Empresa do setor turístico', icon: '🏖️' },
        { name: 'CONSTRUCAO_CIVIL', description: 'Atividade de construção civil', icon: '🏗️' },
        { name: 'COMERCIO_ELETRONICO', description: 'Comércio eletrónico', icon: '🛒' }
    ];

    return (
        <div style={{
            padding: '2rem',
            background: 'linear-gradient(135deg, rgb(47, 106, 201) 0%, rgb(60, 21, 97) 50%, rgb(8, 134, 156) 100%)',
            minHeight: '100vh',
            color: 'white'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ 
                        marginBottom: '0.5rem', 
                        fontSize: '2.5rem', 
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Sistema de Tags Fiscais
                    </h1>
                    <p style={{ 
                        fontSize: '1.1rem', 
                        color: 'rgba(191, 219, 254, 1)', 
                        margin: 0,
                        maxWidth: '600px'
                    }}>
                        Gerencie tags fiscais para automatização inteligente de obrigações contábeis
                    </p>
                </div>

                {/* Seletor de vista */}
                <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    marginBottom: '2rem',
                    flexWrap: 'wrap'
                }}>
                    {[
                        { key: 'manager', label: 'Gestor de Tags', icon: Settings },
                        { key: 'readonly', label: 'Visualização', icon: Users },
                        { key: 'obligations', label: 'Obrigações Geradas', icon: FileText }
                    ].map(({ key, label, icon: Icon }) => (
                        <motion.button
                            key={key}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedView(key)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                background: selectedView === key 
                                    ? 'rgba(59,130,246,0.3)' 
                                    : 'rgba(255,255,255,0.1)',
                                border: `1px solid ${selectedView === key 
                                    ? 'rgba(59,130,246,0.5)' 
                                    : 'rgba(255,255,255,0.2)'}`,
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <Icon size={18} />
                            {label}
                        </motion.button>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {selectedView === 'manager' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '16px',
                                padding: '1.5rem'
                            }}
                        >
                            <h3 style={{ 
                                margin: '0 0 1rem 0', 
                                fontSize: '1.25rem', 
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Building size={20} style={{ color: 'rgb(59,130,246)' }} />
                                Empresa XYZ Lda - Gestão de Tags
                            </h3>
                            <FiscalTagSystem
                                selectedTags={clientTags}
                                onChange={setClientTags}
                                organizationTags={organizationTags}
                                maxTags={10}
                                showDescription={true}
                            />
                        </motion.div>
                    )}

                    {selectedView === 'readonly' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '16px',
                                padding: '1.5rem'
                            }}
                        >
                            <h3 style={{ 
                                margin: '0 0 1rem 0', 
                                fontSize: '1.25rem', 
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Users size={20} style={{ color: 'rgb(16,185,129)' }} />
                                João Silva (Profissional Liberal) - Visualização
                            </h3>
                            <FiscalTagSystem
                                selectedTags={readOnlyTags}
                                onChange={() => {}}
                                disabled={true}
                                organizationTags={organizationTags}
                            />
                        </motion.div>
                    )}

                    {selectedView === 'obligations' && (
                        <ObligationPreview selectedTags={clientTags} />
                    )}
                </div>

                {/* Estatísticas do sistema */}
                <SystemStats />
            </div>

            <style jsx>{`
                input::placeholder {
                    color: rgba(255, 255, 255, 0.5) !important;
                }
                
                select option {
                    background: rgb(31, 41, 55);
                    color: white;
                }
                
                ::-webkit-scrollbar {
                    width: 6px;
                }
                
                ::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 3px;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.5);
                }
            `}</style>
        </div>
    );
};

// Componente para preview das obrigações que serão geradas
const ObligationPreview = ({ selectedTags }) => {
    const [generatedObligations, setGeneratedObligations] = useState([]);

    // Simulação das obrigações baseadas nas tags
    useEffect(() => {
        const obligations = generateObligationsFromTags(selectedTags);
        setGeneratedObligations(obligations);
    }, [selectedTags]);

    const generateObligationsFromTags = (tags) => {
        const obligations = [];
        
        // Mapeamento de tags para obrigações
        const tagObligationMap = {
            'IVA_MENSAL': {
                name: 'Declaração Periódica de IVA',
                periodicity: 'MONTHLY',
                deadline: 'Dia 20 do mês seguinte',
                priority: 'Alta',
                description: 'Entrega mensal da declaração periódica de IVA',
                category: 'IVA',
                color: '#10B981'
            },
            'IVA_TRIMESTRAL': {
                name: 'Declaração Periódica de IVA Trimestral',
                periodicity: 'QUARTERLY',
                deadline: 'Dia 20 do mês seguinte ao trimestre',
                priority: 'Alta',
                description: 'Entrega trimestral da declaração periódica de IVA',
                category: 'IVA',
                color: '#10B981'
            },
            'REGIME_GERAL_IRC': {
                name: 'Modelo 22 - Declaração IRC',
                periodicity: 'ANNUAL',
                deadline: '31 de maio do ano seguinte',
                priority: 'Crítica',
                description: 'Declaração anual de rendimentos IRC',
                category: 'IRC',
                color: '#8B5CF6'
            },
            'EMPRESA': {
                name: 'IES - Informação Empresarial Simplificada',
                periodicity: 'ANNUAL',
                deadline: '15 de julho do ano seguinte',
                priority: 'Alta',
                description: 'Informação empresarial simplificada',
                category: 'Declarações',
                color: '#F59E0B'
            },
            'SEGURANCA_SOCIAL': {
                name: 'DMRP - Declaração Mensal Remunerações',
                periodicity: 'MONTHLY',
                deadline: 'Dia 10 do mês seguinte',
                priority: 'Alta',
                description: 'Declaração mensal de remunerações e prestações',
                category: 'Segurança Social',
                color: '#84CC16'
            },
            'PROFISSIONAL_LIBERAL': {
                name: 'Modelo 10 - Declaração IRS',
                periodicity: 'ANNUAL',
                deadline: '30 de junho do ano seguinte',
                priority: 'Alta',
                description: 'Declaração anual de IRS para profissionais liberais',
                category: 'IRS',
                color: '#EF4444'
            }
        };

        // Adicionar obrigações automáticas baseadas nas combinações de tags
        if (tags.includes('EMPRESA')) {
            obligations.push(tagObligationMap['EMPRESA']);
            
            if (tags.includes('IVA_MENSAL')) {
                obligations.push(tagObligationMap['IVA_MENSAL']);
            } else if (tags.includes('IVA_TRIMESTRAL')) {
                obligations.push(tagObligationMap['IVA_TRIMESTRAL']);
            }
            
            if (tags.includes('REGIME_GERAL_IRC')) {
                obligations.push(tagObligationMap['REGIME_GERAL_IRC']);
            }
        }
        
        if (tags.includes('PROFISSIONAL_LIBERAL')) {
            obligations.push(tagObligationMap['PROFISSIONAL_LIBERAL']);
        }
        
        // Obrigações condicionais
        if (tags.includes('SEGURANCA_SOCIAL') || tags.includes('EMPRESA')) {
            obligations.push(tagObligationMap['SEGURANCA_SOCIAL']);
        }

        return obligations;
    };

    const groupedObligations = generatedObligations.reduce((acc, obligation) => {
        if (!acc[obligation.category]) {
            acc[obligation.category] = [];
        }
        acc[obligation.category].push(obligation);
        return acc;
    }, {});

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '1.5rem'
            }}
        >
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                marginBottom: '1.5rem' 
            }}>
                <div style={{ 
                    padding: '0.5rem', 
                    backgroundColor: 'rgba(245,158,11,0.2)', 
                    borderRadius: '12px' 
                }}>
                    <FileText style={{ color: 'rgb(245,158,11)' }} size={24} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                        Obrigações Fiscais Automaticamente Geradas
                    </h3>
                    <p style={{ 
                        margin: 0, 
                        fontSize: '0.875rem', 
                        color: 'rgb(191,219,254)' 
                    }}>
                        {generatedObligations.length} obrigações baseadas nas tags selecionadas
                    </p>
                </div>
            </div>

            {generatedObligations.length === 0 ? (
                <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    color: 'rgba(255,255,255,0.6)' 
                }}>
                    <AlertTriangle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Selecione tags para ver as obrigações que serão geradas automaticamente</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {Object.entries(groupedObligations).map(([category, obligations]) => (
                        <div key={category}>
                            <h4 style={{ 
                                margin: '0 0 1rem 0',
                                fontSize: '1rem',
                                fontWeight: '600',
                                color: obligations[0].color,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: obligations[0].color
                                }} />
                                {category}
                                <span style={{ 
                                    fontSize: '0.75rem', 
                                    color: 'rgba(255,255,255,0.6)',
                                    fontWeight: 'normal'
                                }}>
                                    ({obligations.length})
                                </span>
                            </h4>
                            
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {obligations.map((obligation, index) => (
                                    <motion.div
                                        key={`${category}-${index}`}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        style={{
                                            padding: '1rem',
                                            background: `${obligation.color}15`,
                                            border: `1px solid ${obligation.color}30`,
                                            borderRadius: '12px',
                                            borderLeft: `4px solid ${obligation.color}`
                                        }}
                                    >
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            marginBottom: '0.75rem'
                                        }}>
                                            <h5 style={{ 
                                                margin: 0,
                                                fontSize: '1rem',
                                                fontWeight: '600',
                                                color: 'white'
                                            }}>
                                                {obligation.name}
                                            </h5>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                background: obligation.priority === 'Crítica' 
                                                    ? 'rgba(239,68,68,0.2)' 
                                                    : 'rgba(245,158,11,0.2)',
                                                color: obligation.priority === 'Crítica' 
                                                    ? 'rgb(248,113,113)' 
                                                    : 'rgb(251,191,36)',
                                                border: `1px solid ${obligation.priority === 'Crítica' 
                                                    ? 'rgba(239,68,68,0.3)' 
                                                    : 'rgba(245,158,11,0.3)'}`
                                            }}>
                                                {obligation.priority}
                                            </span>
                                        </div>
                                        
                                        <p style={{ 
                                            margin: '0 0 0.75rem 0',
                                            fontSize: '0.875rem',
                                            color: 'rgba(255,255,255,0.8)',
                                            lineHeight: 1.5
                                        }}>
                                            {obligation.description}
                                        </p>
                                        
                                        <div style={{ 
                                            display: 'flex',
                                            gap: '1rem',
                                            fontSize: '0.75rem',
                                            color: 'rgba(255,255,255,0.7)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Clock size={12} />
                                                <span>{obligation.periodicity === 'MONTHLY' ? 'Mensal' : obligation.periodicity === 'QUARTERLY' ? 'Trimestral' : 'Anual'}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Target size={12} />
                                                <span>{obligation.deadline}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                    
                    {/* Resumo */}
                    <div style={{
                        padding: '1rem',
                        background: 'rgba(59,130,246,0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(59,130,246,0.2)',
                        marginTop: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <TrendingUp size={16} style={{ color: 'rgb(147,197,253)' }} />
                            <span style={{ 
                                fontWeight: '600',
                                color: 'rgb(147,197,253)',
                                fontSize: '0.875rem'
                            }}>
                                Resumo Automático:
                            </span>
                        </div>
                        <ul style={{ 
                            margin: 0,
                            paddingLeft: '1.25rem',
                            fontSize: '0.75rem',
                            color: 'rgba(255,255,255,0.8)',
                            lineHeight: 1.6
                        }}>
                            <li>O sistema criará automaticamente {generatedObligations.length} tipos de tarefas recorrentes</li>
                            <li>Notificações serão enviadas com antecedência configurável</li>
                            <li>Deadlines são calculados automaticamente baseados na legislação</li>
                            <li>Workflows específicos podem ser atribuídos a cada tipo de obrigação</li>
                        </ul>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

// Componente de estatísticas do sistema
const SystemStats = () => {
    const stats = {
        totalTags: Object.values(FISCAL_TAG_CATEGORIES).reduce((total, category) => total + category.tags.length, 0),
        categories: Object.keys(FISCAL_TAG_CATEGORIES).length,
        clientsWithTags: 142,
        autoGeneratedTasks: 1847
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
                marginTop: '3rem',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '1.5rem'
            }}
        >
            <h3 style={{ 
                margin: '0 0 1.5rem 0', 
                fontSize: '1.25rem', 
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <TrendingUp size={20} style={{ color: 'rgb(52,211,153)' }} />
                Estatísticas do Sistema
            </h3>
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem' 
            }}>
                {[
                    { label: 'Tags Disponíveis', value: stats.totalTags, icon: Tag, color: '#3B82F6' },
                    { label: 'Categorias', value: stats.categories, icon: Hash, color: '#10B981' },
                    { label: 'Clientes com Tags', value: stats.clientsWithTags, icon: Users, color: '#F59E0B' },
                    { label: 'Tarefas Auto-geradas', value: stats.autoGeneratedTasks, icon: CheckCircle, color: '#8B5CF6' }
                ].map(({ label, value, icon: Icon, color }) => (
                    <div
                        key={label}
                        style={{
                            padding: '1rem',
                            background: `${color}15`,
                            border: `1px solid ${color}30`,
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}
                    >
                        <Icon size={24} style={{ color, marginBottom: '0.5rem' }} />
                        <div style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: '700',
                            color: 'white',
                            marginBottom: '0.25rem'
                        }}>
                            {value.toLocaleString()}
                        </div>
                        <div style={{ 
                            fontSize: '0.875rem',
                            color: 'rgba(255,255,255,0.7)'
                        }}>
                            {label}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default FiscalTagSystemDemo;
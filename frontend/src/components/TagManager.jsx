// src/components/TagManager.jsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const inputStyle = {
    padding: '0.5rem 0.75rem',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.875rem',
    marginRight: '0.5rem',
    flexGrow: 1
};

const buttonStyle = {
    padding: '0.5rem 0.75rem',
    background: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.875rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem'
};

const tagStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.75rem',
    margin: '0.25rem',
    background: 'rgba(147, 51, 234, 0.2)',
    border: '1px solid rgba(147, 51, 234, 0.3)',
    borderRadius: '9999px',
    color: 'rgb(196, 181, 253)',
    fontSize: '0.75rem',
    fontWeight: '500'
};

// Predefined fiscal tags common in Portuguese accounting
const DEFAULT_SUGGESTIONS = [
    'EMPRESA',
    'IVA_MENSAL',
    'IVA_TRIMESTRAL',
    'IVA_ANUAL',
    'REGIME_GERAL_IRC',
    'REGIME_SIMPLIFICADO_IRC',
    'CONTABILIDADE_ORGANIZADA',
    'CONTABILIDADE_SIMPLIFICADA',
    'PROFISSIONAL_LIBERAL',
    'MICRO_EMPRESA',
    'PME',
    'GRANDE_EMPRESA',
    'ISENTO_IVA',
    'IRS_CATEGORIA_A',
    'IRS_CATEGORIA_B',
    'IRS_CATEGORIA_E',
    'IRS_CATEGORIA_F',
    'IRS_CATEGORIA_G',
    'IRS_CATEGORIA_H',
    'MODELO_22',
    'MODELO_10',
    'IES',
    'MAPAS_RECAPITULATIVOS',
    'INTRASTAT',
    'ENI',
    'DMRP',
    'SEGURANCA_SOCIAL',
    'FUNDO_COMPENSACAO',
    'COMERCIANTE_INDIVIDUAL',
    'SOCIEDADE_UNIPESSOAL',
    'EXPORTADOR',
    'IMPORTADOR',
    'OPERADOR_INTRACOMUNITARIO'
];

const TagManager = ({ tags = [], onChange, suggestions = DEFAULT_SUGGESTIONS, disabled = false }) => {
    const [currentTags, setCurrentTags] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        // Ensure tags is always an array and update state
        const tagsArray = Array.isArray(tags) ? tags : [];
        setCurrentTags(tagsArray);
    }, [tags]);

    const handleAddTag = (tagValue) => {
        if (disabled) return;
        
        const newTag = tagValue.trim().toUpperCase().replace(/\s+/g, '_');
        if (newTag && !currentTags.includes(newTag)) {
            const updatedTags = [...currentTags, newTag];
            setCurrentTags(updatedTags);
            onChange(updatedTags);
        }
        setInputValue('');
        setShowSuggestions(false);
    };

    const handleRemoveTag = (tagToRemove) => {
        if (disabled) return;
        
        const updatedTags = currentTags.filter(tag => tag !== tagToRemove);
        setCurrentTags(updatedTags);
        onChange(updatedTags);
    };

    const handleInputChange = (e) => {
        if (disabled) return;
        
        setInputValue(e.target.value);
        setShowSuggestions(e.target.value.length > 0 && suggestions.length > 0);
    };
    
    const filteredSuggestions = suggestions.filter(
        suggestion => suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
                      !currentTags.includes(suggestion.toUpperCase().replace(/\s+/g, '_'))
    ).slice(0, 8);

    if (disabled) {
        return (
            <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {currentTags.map(tag => (
                        <div
                            key={tag}
                            style={{
                                ...tagStyle,
                                opacity: 0.8,
                                background: 'rgba(147, 51, 234, 0.15)',
                                border: '1px solid rgba(147, 51, 234, 0.25)'
                            }}
                        >
                            <TagIcon size={12} style={{ marginRight: '0.25rem' }} />
                            {tag}
                        </div>
                    ))}
                </div>
                {currentTags.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                        Nenhuma tag fiscal definida para este cliente.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            handleAddTag(inputValue);
                        }
                        if (e.key === 'Escape') {
                            setShowSuggestions(false);
                            setInputValue('');
                        }
                    }}
                    style={inputStyle}
                    placeholder="Adicionar tag fiscal (ex: IVA_MENSAL)"
                    onFocus={() => inputValue.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                />
                <motion.button
                    type="button"
                    onClick={() => handleAddTag(inputValue)}
                    style={buttonStyle}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!inputValue.trim()}
                >
                    <Plus size={16} /> Adicionar
                </motion.button>
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
                <motion.div 
                    initial={{opacity: 0, y: -5}} 
                    animate={{opacity:1, y:0}} 
                    exit={{opacity:0, y:-5}}
                    style={{
                        background: 'rgba(0,0,0,0.9)',
                        borderRadius: '6px',
                        padding: '0.5rem',
                        marginBottom: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        position: 'absolute',
                        zIndex: 1000,
                        width: 'calc(100% - 1rem)',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}
                >
                    {filteredSuggestions.map(suggestion => (
                        <div 
                            key={suggestion}
                            onClick={() => handleAddTag(suggestion)}
                            style={{
                                padding: '0.5rem',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                color: 'rgba(255,255,255,0.9)',
                                transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = 'rgba(147, 51, 234, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                            }}
                        >
                            #{suggestion}
                        </div>
                    ))}
                </motion.div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', position: 'relative' }}>
                <AnimatePresence>
                    {currentTags.map(tag => (
                        <motion.div
                            key={tag}
                            style={tagStyle}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            layout
                        >
                            <TagIcon size={12} style={{ marginRight: '0.25rem' }} />
                            {tag}
                            <motion.button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'inherit',
                                    cursor: 'pointer',
                                    marginLeft: '0.5rem',
                                    padding: '0.1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: '50%'
                                }}
                                whileHover={{ 
                                    scale: 1.2, 
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    color: 'rgb(239, 68, 68)' 
                                }}
                                title={`Remover tag ${tag}`}
                            >
                                <X size={14} />
                            </motion.button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            {currentTags.length === 0 && (
                <p style={{ 
                    fontSize: '0.8rem', 
                    color: 'rgba(255,255,255,0.6)', 
                    fontStyle: 'italic',
                    marginTop: '0.5rem'
                }}>
                    Nenhuma tag fiscal definida para este cliente.
                </p>
            )}
            
            {currentTags.length > 0 && (
                <div style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                    <p style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.8)',
                        margin: 0
                    }}>
                        💡 <strong>Dica:</strong> As tags fiscais são usadas para automatizar a criação de tarefas e obrigações específicas para este cliente.
                    </p>
                </div>
            )}
        </div>
    );
};

export default TagManager;
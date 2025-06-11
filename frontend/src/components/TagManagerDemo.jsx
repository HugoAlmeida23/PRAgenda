import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, X, Hash, Search } from 'lucide-react';

// Simulação de tags disponíveis - substitua pela sua API
const AVAILABLE_TAGS = [
  { id: 1, name: 'EMPRESA', description: 'Cliente é uma empresa', color: '#3B82F6' },
  { id: 2, name: 'IVA_TRIMESTRAL', description: 'Entrega IVA trimestral', color: '#10B981' },
  { id: 3, name: 'IVA_MENSAL', description: 'Entrega IVA mensal', color: '#F59E0B' },
  { id: 4, name: 'REGIME_GERAL_IRC', description: 'Regime geral de IRC', color: '#8B5CF6' },
  { id: 5, name: 'CONTABILIDADE_SIMPLIFICADA', description: 'Contabilidade simplificada', color: '#EF4444' },
  { id: 6, name: 'PROFISSIONAL_LIBERAL', description: 'Profissional liberal', color: '#06B6D4' },
  { id: 7, name: 'MICRO_EMPRESA', description: 'Micro empresa', color: '#84CC16' },
  { id: 8, name: 'PME', description: 'Pequena e média empresa', color: '#F97316' },
  { id: 9, name: 'GRANDE_EMPRESA', description: 'Grande empresa', color: '#EC4899' },
  { id: 10, name: 'ISENTO_IVA', description: 'Isento de IVA', color: '#6366F1' },
  { id: 11, name: 'IRS_CATEGORIA_A', description: 'IRS Categoria A', color: '#14B8A6' },
  { id: 12, name: 'IRS_CATEGORIA_B', description: 'IRS Categoria B', color: '#F43F5E' },
];

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '8px'
};

// Componente de Tag Individual
const TagComponent = ({ tag, onRemove, size = 'md', interactive = true }) => {
  const sizeClasses = {
    sm: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
    md: { padding: '0.5rem 0.75rem', fontSize: '0.875rem' },
    lg: { padding: '0.75rem 1rem', fontSize: '1rem' }
  };

  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={interactive ? { scale: 1.05 } : {}}
      style={{
        ...sizeClasses[size],
        backgroundColor: `${tag.color}20`,
        border: `1px solid ${tag.color}50`,
        borderRadius: '9999px',
        color: tag.color,
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        position: 'relative'
      }}
    >
      <Hash size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />
      {tag.name}
      {onRemove && interactive && (
        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag.name);
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginLeft: '0.25rem',
            color: tag.color
          }}
          title="Remover tag"
        >
          <X size={12} />
        </motion.button>
      )}
    </motion.span>
  );
};

// Componente principal TagManager
const TagManager = ({ 
  selectedTags = [], 
  onChange, 
  disabled = false,
  placeholder = "Clique para adicionar tags...",
  maxTags = null,
  showDescription = true,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableTags, setAvailableTags] = useState(AVAILABLE_TAGS);

  // Filtrar tags disponíveis
  const filteredTags = availableTags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tag.description.toLowerCase().includes(searchTerm.toLowerCase());
    const notSelected = !selectedTags.includes(tag.name);
    return matchesSearch && notSelected;
  });

  // Obter objetos de tag completos para as tags selecionadas
  const selectedTagObjects = selectedTags.map(tagName => 
    availableTags.find(tag => tag.name === tagName)
  ).filter(Boolean);

  const handleAddTag = (tagName) => {
    if (maxTags && selectedTags.length >= maxTags) {
      return;
    }
    
    const newTags = [...selectedTags, tagName];
    onChange(newTags);
    setSearchTerm('');
    
    if (!compact) {
      setIsOpen(false);
    }
  };

  const handleRemoveTag = (tagName) => {
    const newTags = selectedTags.filter(t => t !== tagName);
    onChange(newTags);
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('.tag-manager-container')) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="tag-manager-container" style={{ position: 'relative' }}>
      {/* Tags selecionadas */}
      <div style={{ marginBottom: selectedTagObjects.length > 0 ? '0.75rem' : 0 }}>
        <AnimatePresence>
          {selectedTagObjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}
            >
              {selectedTagObjects.map(tag => (
                <TagComponent
                  key={tag.name}
                  tag={tag}
                  onRemove={!disabled ? handleRemoveTag : null}
                  size={compact ? 'sm' : 'md'}
                  interactive={!disabled}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Botão para adicionar tags */}
      {!disabled && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(!isOpen)}
          style={{
            ...glassStyle,
            width: '100%',
            padding: '0.75rem',
            border: isOpen ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
            background: isOpen ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.3s ease'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            {selectedTagObjects.length > 0 ? 'Adicionar mais tags' : placeholder}
            {maxTags && (
              <span style={{ 
                fontSize: '0.75rem', 
                color: 'rgba(255, 255, 255, 0.6)',
                marginLeft: '0.5rem' 
              }}>
                ({selectedTags.length}/{maxTags})
              </span>
            )}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <Tag size={16} />
          </motion.div>
        </motion.button>
      )}

      {/* Dropdown de tags disponíveis */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              marginTop: '0.5rem',
              ...glassStyle,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              maxHeight: '300px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Campo de pesquisa */}
            <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ position: 'relative' }}>
                <Search 
                  size={16} 
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Pesquisar tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de tags */}
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              padding: '0.5rem'
            }}>
              {filteredTags.length === 0 ? (
                <div style={{
                  padding: '1rem',
                  textAlign: 'center',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '0.875rem'
                }}>
                  {searchTerm ? 'Nenhuma tag encontrada' : 'Todas as tags já foram adicionadas'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {filteredTags.map(tag => (
                    <motion.button
                      key={tag.id}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAddTag(tag.name)}
                      disabled={maxTags && selectedTags.length >= maxTags}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        cursor: maxTags && selectedTags.length >= maxTags ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        opacity: maxTags && selectedTags.length >= maxTags ? 0.5 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: tag.color,
                          marginTop: '0.25rem',
                          flexShrink: 0
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            marginBottom: showDescription && tag.description ? '0.25rem' : 0
                          }}>
                            #{tag.name}
                          </div>
                          {showDescription && tag.description && (
                            <div style={{
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.75rem',
                              lineHeight: 1.4
                            }}>
                              {tag.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Componente de demonstração
const TagManagerDemo = () => {
  const [clientTags, setClientTags] = useState(['EMPRESA', 'IVA_TRIMESTRAL']);
  const [readOnlyTags] = useState(['PROFISSIONAL_LIBERAL', 'IRS_CATEGORIA_A']);

  return (
    <div style={{
      padding: '2rem',
      background: 'linear-gradient(135deg, rgb(47, 106, 201) 0%, rgb(60, 21, 97) 50%, rgb(8, 134, 156) 100%)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: '700' }}>
          Demonstração do TagManager
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Exemplo editável */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
              Tags do Cliente (Editável)
            </h3>
            <TagManager
              selectedTags={clientTags}
              onChange={setClientTags}
              placeholder="Adicionar tags fiscais ao cliente..."
              showDescription={true}
              maxTags={6}
            />
            <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              Tags selecionadas: {clientTags.join(', ') || 'Nenhuma'}
            </div>
          </div>

          {/* Exemplo somente leitura */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
              Tags do Cliente (Somente Leitura)
            </h3>
            <TagManager
              selectedTags={readOnlyTags}
              onChange={() => {}}
              disabled={true}
              showDescription={false}
            />
          </div>

          {/* Exemplo compacto */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
              Versão Compacta
            </h3>
            <TagManager
              selectedTags={['MICRO_EMPRESA']}
              onChange={() => {}}
              compact={true}
              showDescription={false}
              maxTags={3}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        input::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
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

export default TagManagerDemo;
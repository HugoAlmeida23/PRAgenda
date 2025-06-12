import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag } from 'lucide-react';

const TagInput = ({ tags = [], onTagsChange, placeholder = "Adicionar...", disabled = false }) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      e.preventDefault();
      const newTag = inputValue.trim().toUpperCase();
      if (!tags.includes(newTag)) {
        onTagsChange([...tags, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove) => {
    if (disabled) return;
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const tagVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        padding: '0.5rem',
        minHeight: '44px',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
      }}>
        <AnimatePresence>
          {tags.map((tag) => (
            <motion.div
              key={tag}
              variants={tagVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              layout
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                background: 'rgba(147, 51, 234, 0.3)',
                color: 'rgb(196, 181, 253)',
                fontSize: '0.8rem',
                fontWeight: '500',
              }}
            >
              <span>{tag}</span>
              {!disabled && (
                <motion.button
                  whileHover={{ scale: 1.2 }}
                  onClick={() => removeTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'inherit',
                    display: 'flex'
                  }}
                  type="button"
                >
                  <X size={14} />
                </motion.button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {!disabled && (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ''}
            disabled={disabled}
            style={{
              flex: 1,
              minWidth: '120px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '0.875rem',
              padding: '0.25rem',
              outline: 'none',
            }}
          />
        )}
      </div>
      {!disabled && (
        <small style={{ fontSize: '0.7rem', opacity: 0.7, display: 'block', marginTop: '0.5rem' }}>
          Ex: EMPRESA, IVA_TRIMESTRAL. Case-insensitive, serão guardadas em maiúsculas.
        </small>
      )}
    </div>
  );
};

export default TagInput;
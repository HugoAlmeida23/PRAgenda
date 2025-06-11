import React, { useState } from 'react';
import { X } from 'lucide-react';

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

const TagInput = ({ tags = [], onTagsChange, placeholder = "Adicionar tag...", inputType = "text", validationRegex, validationMessage }) => {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
        if (error) setError(''); // Clear error on input change
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
            e.preventDefault();
            const newTag = inputValue.trim();
            if (newTag) {
                if (validationRegex && !validationRegex.test(newTag)) {
                    setError(validationMessage || "Formato inválido.");
                    return;
                }
                if (!tags.includes(newTag)) {
                    onTagsChange([...tags, newTag]);
                }
                setInputValue('');
                setError('');
            }
        }
    };

    const removeTag = (tagToRemove) => {
        onTagsChange(tags.filter(tag => tag !== tagToRemove));
    };

    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {tags.map((tag, index) => (
                    <span
                        key={index}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(59, 130, 246, 0.2)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: 'rgb(59, 130, 246)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: '500'
                        }}
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            style={{ background: 'none', border: 'none', color: 'inherit', marginLeft: '0.5rem', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
            </div>
            <input
                type={inputType}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                placeholder={placeholder}
                style={{...glassInputStyle, borderColor: error ? 'rgb(239, 68, 68)' : 'rgba(255, 255, 255, 0.2)'}}
            />
            {error && <small style={{ color: 'rgb(239, 68, 68)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{error}</small>}
        </div>
    );
};

export default TagInput;
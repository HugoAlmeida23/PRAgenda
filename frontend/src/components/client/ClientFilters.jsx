// src/components/client/ClientFilters.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { Search, Eye, EyeOff, Euro, UserCheck, X } from 'lucide-react';
import { useClientStore } from '../../stores/useClientStore';

// Styled Components
const FilterContainer = styled(motion.div)`
  background: ${({ theme }) => theme.glassBg};
  backdrop-filter: blur(12px);
  border: 1px solid ${({ theme }) => theme.glassBorder};
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  color: ${({ theme }) => theme.text};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ $showFilters }) => ($showFilters ? '1.5rem' : 0)};
  transition: margin-bottom 0.3s ease;
`;

const Title = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.textMuted};
`;

const ToggleButton = styled(motion.button)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
`;

const BasicFilters = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: ${({ $showFilters }) => ($showFilters ? '1rem' : 0)};
  transition: margin-bottom 0.3s ease;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
`;

const SearchWrapper = styled.div`
  position: relative;
  min-width: 300px;
  flex-grow: 1;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  background: ${({ theme }) => theme.input.bg};
  border: 1px solid ${({ theme }) => theme.input.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.text};
  font-size: 0.875rem;

  &::placeholder {
    color: ${({ theme }) => theme.input.placeholder};
  }
`;

const AdvancedPanel = styled(motion.div)`
  border-top: 1px solid ${({ theme }) => theme.headerBorder};
  padding-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const FieldWrapper = styled.div``;

const FieldLabel = styled.label`
  display: block;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.textMuted};
  margin-bottom: 0.25rem;
`;

const SelectInput = styled.select`
  width: 100%;
  padding: 0.75rem;
  background: ${({ theme }) => theme.input.bg};
  border: 1px solid ${({ theme }) => theme.input.border};
  border-radius: 6px;
  color: ${({ theme }) => theme.text};
  font-size: 0.875rem;
`;

const NumberInput = styled.input`
    width: 100%;
    padding: 0.75rem;
    background: ${({ theme }) => theme.input.bg};
    border: 1px solid ${({ theme }) => theme.input.border};
    border-radius: 6px;
    color: ${({ theme }) => theme.text};
    font-size: 0.875rem;
`;

const ClientFilters = ({ users }) => {
    const { 
        filters, setFilter, searchTerm, setSearchTerm, 
        showFilters, toggleShowFilters 
    } = useClientStore();

    const handleFilterChange = (e) => {
        const { name, type, checked, value } = e.target;
        let finalValue = type === 'checkbox' ? checked : value === '' ? null : value;
        if (type === 'number' && value !== '') finalValue = parseFloat(value);
        if (value === 'true' || value === 'false') finalValue = value === 'true';
        setFilter(name, finalValue);
    };

    return (
        <FilterContainer>
            <Header $showFilters={showFilters}>
                <div>
                    <Title>Filtros e Pesquisa</Title>
                    <Subtitle>Configure a visualização</Subtitle>
                </div>
                <ToggleButton whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleShowFilters}>
                    {showFilters ? <EyeOff size={20} /> : <Eye size={20} />}
                </ToggleButton>
            </Header>
            
            <BasicFilters $showFilters={showFilters}>
                <CheckboxLabel htmlFor="active">
                    <input 
                        type="checkbox" id="active" name="active" 
                        checked={filters.active === true}
                        onChange={(e) => setFilter('active', e.target.checked ? true : null )}
                        style={{ width: '18px', height: '18px' }} 
                    />
                    Mostrar apenas ativos
                </CheckboxLabel>
                <SearchWrapper>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    <SearchInput type="text" placeholder="Pesquisar clientes..." value={searchTerm || ''} onChange={(e) => setSearchTerm(e.target.value)} />
                </SearchWrapper>
            </BasicFilters>
            
            <AnimatePresence>
                {showFilters && (
                    <AdvancedPanel
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Grid>
                            {[
                                { name: "hasEmail", label: "Email", options: [{ v: "true", l: "Com Email" }, { v: "false", l: "Sem Email" }] },
                                { name: "hasPhone", label: "Telefone", options: [{ v: "true", l: "Com Telefone" }, { v: "false", l: "Sem Telefone" }] },
                                { name: "hasNif", label: "NIF", options: [{ v: "true", l: "Com NIF" }, { v: "false", l: "Sem NIF" }] },
                                { name: "hasMonthlyFee", label: "Avença", options: [{ v: "true", l: "Com Avença" }, { v: "false", l: "Sem Avença" }] }
                            ].map(filter => (
                                <FieldWrapper key={filter.name}>
                                    <FieldLabel>{filter.label}</FieldLabel>
                                    <SelectInput name={filter.name} value={filters[filter.name] === null ? '' : String(filters[filter.name])} onChange={handleFilterChange}>
                                        <option value="">Todos</option>
                                        {filter.options.map(opt => <option key={opt.v} value={opt.v}>{opt.l}</option>)}
                                    </SelectInput>
                                </FieldWrapper>
                            ))}
                        </Grid>
                        <Grid>
                            <FieldWrapper>
                                <FieldLabel>Avença Mínima (€)</FieldLabel>
                                <NumberInput type="number" name="minMonthlyFee" value={filters.minMonthlyFee || ''} onChange={handleFilterChange} placeholder="0.00" />
                            </FieldWrapper>
                            <FieldWrapper>
                                <FieldLabel>Avença Máxima (€)</FieldLabel>
                                <NumberInput type="number" name="maxMonthlyFee" value={filters.maxMonthlyFee || ''} onChange={handleFilterChange} placeholder="999999.99" />
                            </FieldWrapper>
                            {users && users.length > 0 && (
                                <FieldWrapper>
                                    <FieldLabel>Gestor de Conta</FieldLabel>
                                    <SelectInput name="accountManager" value={filters.accountManager || ''} onChange={handleFilterChange}>
                                        <option value="">Todos os gestores</option>
                                        {users.map(userProfile => (
                                            <option key={userProfile.user} value={userProfile.user}>{userProfile.username}</option>
                                        ))}
                                    </SelectInput>
                                </FieldWrapper>
                            )}
                        </Grid>
                    </AdvancedPanel>
                )}
            </AnimatePresence>
        </FilterContainer>
    );
};

export default ClientFilters;
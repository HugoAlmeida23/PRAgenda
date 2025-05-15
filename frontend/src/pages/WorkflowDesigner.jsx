import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Save,
  Trash2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Settings,
  HelpCircle,
  Users,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';
import { useQuery } from '@tanstack/react-query';

// Componente principal para desenho e gestão de workflows
const WorkflowDesigner = ({ 
  existingWorkflow = null, 
  users = [], 
  onSave, 
  onCancel 
}) => {
  const navigate = useNavigate();
  
  // Adicione esta consulta para buscar usuários se não forem fornecidos como prop
  const { data: fetchedUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (users && users.length > 0) return users;
      const response = await api.get('/profiles/');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  
  // Use os usuários fornecidos como prop ou os buscados da API
  const effectiveUsers = users.length > 0 ? users : fetchedUsers;
  
  // Estado para o workflow atual
  const [workflowData, setWorkflowData] = useState({
    name: '',
    description: '',
    is_active: true,
    steps: []
  });
  
  // Estado para controlar o passo que está sendo editado
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  
  // Estado para novo passo sendo adicionado
  const [newStep, setNewStep] = useState({
    name: '',
    description: '',
    order: 0,
    requires_approval: false,
    approver_role: '',
    assign_to: '',
    next_steps: []
  });

  // Carregar dados de workflow existente
  useEffect(() => {
    if (existingWorkflow) {
      setWorkflowData({
        name: existingWorkflow.name || '',
        description: existingWorkflow.description || '',
        is_active: existingWorkflow.is_active !== false,
        steps: existingWorkflow.steps || []
      });
    }
  }, [existingWorkflow]);

  // Função para atualizar o workflow
  const handleWorkflowChange = (e) => {
    const { name, value, type, checked } = e.target;
    setWorkflowData({
      ...workflowData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Função para adicionar um novo passo
  const handleAddStep = () => {
    if (!newStep.name.trim()) {
      alert('O nome do passo é obrigatório');
      return;
    }

    const updatedSteps = [...workflowData.steps];
    const stepToAdd = {
      ...newStep,
      order: workflowData.steps.length + 1,
      id: `temp-${Date.now()}` // ID temporário até salvar no backend
    };
    
    updatedSteps.push(stepToAdd);
    
    setWorkflowData({
      ...workflowData,
      steps: updatedSteps
    });
    
    // Resetar o formulário de novo passo
    setNewStep({
      name: '',
      description: '',
      order: workflowData.steps.length + 1,
      requires_approval: false,
      approver_role: '',
      assign_to: '',
      next_steps: []
    });
  };

  // Função para atualizar um passo
  const handleStepChange = (index, field, value) => {
    const updatedSteps = [...workflowData.steps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      [field]: value
    };
    
    setWorkflowData({
      ...workflowData,
      steps: updatedSteps
    });
  };

  // Função para remover um passo
  const handleRemoveStep = (index) => {
    if (window.confirm('Tem certeza que deseja remover este passo?')) {
      const updatedSteps = workflowData.steps.filter((_, i) => i !== index);
      
      // Reordenar os passos restantes
      updatedSteps.forEach((step, i) => {
        step.order = i + 1;
      });
      
      setWorkflowData({
        ...workflowData,
        steps: updatedSteps
      });
      
      if (editingStepIndex === index) {
        setEditingStepIndex(null);
      }
    }
  };

  // Função para mover um passo para cima
  const moveStepUp = (index) => {
    if (index === 0) return; // Já está no topo
    
    const updatedSteps = [...workflowData.steps];
    const temp = updatedSteps[index];
    updatedSteps[index] = updatedSteps[index - 1];
    updatedSteps[index - 1] = temp;
    
    // Atualizar a ordem
    updatedSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    
    setWorkflowData({
      ...workflowData,
      steps: updatedSteps
    });
    
    if (editingStepIndex === index) {
      setEditingStepIndex(index - 1);
    } else if (editingStepIndex === index - 1) {
      setEditingStepIndex(index);
    }
  };

  // Função para mover um passo para baixo
  const moveStepDown = (index) => {
    if (index === workflowData.steps.length - 1) return; // Já está embaixo
    
    const updatedSteps = [...workflowData.steps];
    const temp = updatedSteps[index];
    updatedSteps[index] = updatedSteps[index + 1];
    updatedSteps[index + 1] = temp;
    
    // Atualizar a ordem
    updatedSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    
    setWorkflowData({
      ...workflowData,
      steps: updatedSteps
    });
    
    if (editingStepIndex === index) {
      setEditingStepIndex(index + 1);
    } else if (editingStepIndex === index + 1) {
      setEditingStepIndex(index);
    }
  };

  // Função para atualizar as conexões entre passos
  const updateStepConnections = (stepIndex, nextStepIds) => {
    const updatedSteps = [...workflowData.steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      next_steps: nextStepIds
    };
    
    setWorkflowData({
      ...workflowData,
      steps: updatedSteps
    });
  };

  // Função para salvar o workflow
  const handleSaveWorkflow = async () => {
    if (!workflowData.name.trim()) {
      alert('O nome do workflow é obrigatório');
      return;
    }

    if (workflowData.steps.length === 0) {
      alert('O workflow precisa ter pelo menos um passo');
      return;
    }

    // Formatar dados para salvar
    const workflowToSave = {
      ...workflowData,
      // Garantir que cada passo tenha os campos corretos para o backend
      steps: workflowData.steps.map(step => ({
        ...step,
        next_steps: Array.isArray(step.next_steps) ? step.next_steps : [],
        workflow: existingWorkflow?.id // Associar ao workflow
      }))
    };
    
    // Se onSave foi fornecido como prop, use-o
    if (typeof onSave === 'function') {
      onSave(workflowToSave);
    } else {
      // Caso contrário, salve diretamente usando a API
      try {
        // Primeiro, criar o workflow principal
        const response = await api.post('/workflow-definitions/', {
          name: workflowToSave.name,
          description: workflowToSave.description,
          is_active: workflowToSave.is_active
        });
        
        const workflowId = response.data.id;
        
        // Depois, criar cada passo do workflow
        for (const step of workflowToSave.steps) {
          await api.post('/workflow-steps/', {
            ...step,
            workflow: workflowId,
            next_steps: JSON.stringify(step.next_steps) // Serializar para JSON
          });
        }
        
        toast.success('Workflow criado com sucesso!');
        navigate('/workflow-management'); // Redirecionar para a página de gerenciamento
      } catch (error) {
        console.error('Erro ao salvar workflow:', error);
        toast.error('Falha ao salvar workflow. Por favor tente novamente.');
      }
    }
  };

  // Da mesma forma, modifique onCancel
  const handleCancel = () => {
    if (typeof onCancel === 'function') {
      onCancel();
    } else {
      navigate('/workflow-management'); // Voltar para a página de gerenciamento
    }
  };

  // Calculando possíveis próximos passos para conexões
  const getPossibleNextSteps = (currentStepIndex) => {
    return workflowData.steps.filter((step, index) => 
      index !== currentStepIndex && index > currentStepIndex
    );
  };

  // Função para alternar a edição de um passo
  const toggleEditStep = (index) => {
    setEditingStepIndex(editingStepIndex === index ? null : index);
  };

  // Função para atualizar o novo passo
  const handleNewStepChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewStep({
      ...newStep,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="main">
      <Header>
        <div className="p-6 bg-white-100 min-h-screen" style={{ marginLeft: "3%" }}>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Settings className="mr-2 text-blue-600" size={22} />
              {existingWorkflow ? 'Editar Workflow' : 'Criar Novo Workflow'}
            </h2>
            
            {/* Detalhes básicos do workflow */}
            <div className="mb-6 bg-white-50 p-4 rounded-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2">Nome do Workflow *</label>
                  <input
                    type="text"
                    name="name"
                    value={workflowData.name}
                    onChange={handleWorkflowChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ex: Declaração IVA Mensal"
                    required
                  />
                </div>
                <div className="flex items-center mt-8">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={workflowData.is_active}
                    onChange={handleWorkflowChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-gray-700">
                    Workflow Ativo
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Descrição</label>
                <textarea
                  name="description"
                  value={workflowData.description}
                  onChange={handleWorkflowChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Descreva o propósito deste workflow"
                  rows="2"
                />
              </div>
            </div>
            
            {/* Lista de passos existentes */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <ArrowRight className="mr-2 text-blue-600" size={20} />
                Passos do Workflow
              </h3>
              
              {workflowData.steps.length === 0 ? (
                <div className="text-center py-8 bg-white-50 rounded-lg border border-dashed border-gray-300">
                  <p className="text-gray-500 mb-2">Nenhum passo definido</p>
                  <p className="text-sm text-gray-400">
                    Adicione passos para construir seu workflow
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workflowData.steps.map((step, index) => (
                    <div key={step.id || index} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Cabeçalho do passo */}
                      <div className="bg-white-50 p-4 flex justify-between items-center border-b border-gray-200">
                        <div className="flex items-center">
                          <div className="bg-blue-100 text-blue-800 h-7 w-7 rounded-full flex items-center justify-center mr-3 font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium">{step.name}</h4>
                            {step.description && (
                              <p className="text-sm text-gray-500">{step.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => moveStepUp(index)}
                            disabled={index === 0}
                            className={`p-1 rounded ${index === 0 ? 'text-gray-300' : 'text-gray-600 hover:bg-white-100'}`}
                            title="Mover para cima"
                          >
                            <ChevronUp size={18} />
                          </button>
                          <button
                            onClick={() => moveStepDown(index)}
                            disabled={index === workflowData.steps.length - 1}
                            className={`p-1 rounded ${index === workflowData.steps.length - 1 ? 'text-gray-300' : 'text-gray-600 hover:bg-white-100'}`}
                            title="Mover para baixo"
                          >
                            <ChevronDown size={18} />
                          </button>
                          <button
                            onClick={() => toggleEditStep(index)}
                            className="p-1 rounded text-blue-600 hover:bg-blue-50"
                            title="Editar passo"
                          >
                            <Settings size={18} />
                          </button>
                          <button
                            onClick={() => handleRemoveStep(index)}
                            className="p-1 rounded text-red-600 hover:bg-red-50"
                            title="Remover passo"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Detalhes do passo (expandido/colapsado) */}
                      <AnimatePresence>
                        {editingStepIndex === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-white">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <label className="block text-gray-700 mb-2">Nome do Passo</label>
                                  <input
                                    type="text"
                                    value={step.name}
                                    onChange={(e) => handleStepChange(index, 'name', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-gray-700 mb-2">Atribuir a</label>
                                  <select
                                    value={step.assign_to || ''}
                                    onChange={(e) => handleStepChange(index, 'assign_to', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                  >
                                    <option value="">Selecione um responsável (opcional)</option>
                                    {effectiveUsers.map(user => (
                                      <option key={user.id} value={user.id}>
                                        {user.username}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              
                              <div className="mb-4">
                                <label className="block text-gray-700 mb-2">Descrição</label>
                                <textarea
                                  value={step.description || ''}
                                  onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded-md"
                                  rows="2"
                                />
                              </div>
                              
                              <div className="flex items-center mb-4">
                                <input
                                  type="checkbox"
                                  id={`requires_approval_${index}`}
                                  checked={step.requires_approval || false}
                                  onChange={(e) => handleStepChange(index, 'requires_approval', e.target.checked)}
                                  className="h-4 w-4 text-blue-600 rounded"
                                />
                                <label htmlFor={`requires_approval_${index}`} className="ml-2 text-gray-700">
                                  Requer aprovação
                                </label>
                              </div>
                              
                              {step.requires_approval && (
                                <div className="mb-4 ml-6">
                                  <label className="block text-gray-700 mb-2">Papel do Aprovador</label>
                                  <input
                                    type="text"
                                    value={step.approver_role || ''}
                                    onChange={(e) => handleStepChange(index, 'approver_role', e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    placeholder="Ex: Gestor, Sócio, Revisor"
                                  />
                                </div>
                              )}
                              
                              {/* Próximos passos possíveis */}
                              <div className="mt-4">
                                <h5 className="font-medium text-gray-700 mb-2">Próximos Passos Possíveis</h5>
                                <div className="bg-white-50 p-3 rounded-md">
                                  {getPossibleNextSteps(index).length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                      Não há passos subsequentes disponíveis.
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      {getPossibleNextSteps(index).map(nextStep => (
                                        <div key={nextStep.id} className="flex items-center">
                                          <input
                                            type="checkbox"
                                            id={`next_${index}_${nextStep.id}`}
                                            checked={(step.next_steps || []).includes(nextStep.id)}
                                            onChange={(e) => {
                                              const currentNextSteps = [...(step.next_steps || [])];
                                              if (e.target.checked) {
                                                currentNextSteps.push(nextStep.id);
                                              } else {
                                                const stepIndex = currentNextSteps.indexOf(nextStep.id);
                                                if (stepIndex !== -1) {
                                                  currentNextSteps.splice(stepIndex, 1);
                                                }
                                              }
                                              updateStepConnections(index, currentNextSteps);
                                            }}
                                            className="h-4 w-4 text-blue-600 rounded"
                                          />
                                          <label htmlFor={`next_${index}_${nextStep.id}`} className="ml-2 text-gray-700">
                                            {nextStep.order}. {nextStep.name}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Formulário para adicionar novo passo */}
            <div className="mb-6 bg-blue-50 p-4 rounded-md border border-blue-100">
              <h3 className="text-lg font-medium mb-4 flex items-center text-blue-800">
                <PlusCircle className="mr-2 text-blue-600" size={20} />
                Adicionar Novo Passo
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2">Nome do Passo *</label>
                  <input
                    type="text"
                    name="name"
                    value={newStep.name}
                    onChange={handleNewStepChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ex: Preparação da Declaração"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Atribuir a</label>
                  <select
                    name="assign_to"
                    value={newStep.assign_to}
                    onChange={handleNewStepChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecione um responsável (opcional)</option>
                    {effectiveUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Descrição</label>
                <textarea
                  name="description"
                  value={newStep.description}
                  onChange={handleNewStepChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Descreva o que deve ser feito neste passo"
                  rows="2"
                />
              </div>
              
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="requires_approval_new"
                  name="requires_approval"
                  checked={newStep.requires_approval}
                  onChange={handleNewStepChange}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="requires_approval_new" className="ml-2 text-gray-700">
                  Requer aprovação
                </label>
              </div>
              
              {newStep.requires_approval && (
                <div className="mb-4 ml-6">
                  <label className="block text-gray-700 mb-2">Papel do Aprovador</label>
                  <input
                    type="text"
                    name="approver_role"
                    value={newStep.approver_role}
                    onChange={handleNewStepChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ex: Gestor, Sócio, Revisor"
                  />
                </div>
              )}
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                >
                  <PlusCircle size={18} className="mr-2" />
                  Adicionar Passo
                </button>
              </div>
            </div>
            
            {/* Visualização do fluxo */}
            {workflowData.steps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Visualização do Fluxo</h3>
                <div className="p-4 bg-white-50 rounded-lg overflow-x-auto">
                  <div className="flex items-center min-w-max">
                    {workflowData.steps.map((step, index) => (
                      <React.Fragment key={step.id || index}>
                        <div className="flex flex-col items-center">
                          <div className={`p-3 rounded-lg border ${step.requires_approval ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'} min-w-[150px]`}>
                            <div className="font-medium text-gray-800">{step.name}</div>
                            {step.assign_to && (
                              <div className="text-xs text-gray-500 flex items-center mt-1">
                                <Users size={12} className="mr-1" />
                                {effectiveUsers.find(u => u.id === step.assign_to)?.username || 'Assignee'}
                              </div>
                            )}
                            {step.requires_approval && (
                              <div className="text-xs text-yellow-700 flex items-center mt-1">
                                <AlertTriangle size={12} className="mr-1" />
                                Requer aprovação
                              </div>
                            )}
                          </div>
                          
                          {/* Exibir conexões para próximos passos */}
                          {(step.next_steps || []).length > 0 && (
                            <div className="mt-2 text-xs text-gray-500">
                              Próximos: {(step.next_steps || []).map(nextId => {
                                const nextStep = workflowData.steps.find(s => s.id === nextId);
                                return nextStep ? nextStep.name : '';
                              }).filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                        
                        {index < workflowData.steps.length - 1 && (
                          <div className="mx-4 text-gray-400">
                            <ArrowRight size={20} />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Botões de ação */}
            <div className="flex justify-end space-x-3 mt-8">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-white-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveWorkflow}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md flex items-center"
              >
                <Save size={18} className="mr-2" />
                Salvar Workflow
              </button>
            </div>
            
            {/* Dica de uso */}
            <div className="mt-6 bg-blue-50 p-3 rounded-lg flex items-start border border-blue-100">
              <HelpCircle className="text-blue-500 mr-2 mt-0.5" size={18} />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Dicas para criar um bom workflow:</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Comece definindo todos os passos necessários em ordem cronológica</li>
                  <li>Identifique onde aprovações são necessárias e quem deve aprovar</li>
                  <li>Defina caminhos alternativos para casos de rejeição ou exceções</li>
                  <li>Atribua responsáveis para cada etapa sempre que possível</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Header>
    </div>
  );
};

export default WorkflowDesigner;
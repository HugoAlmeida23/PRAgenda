import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  List,
  Plus,
  Trash2,
  Edit,
  Settings,
  CheckSquare,
  AlertTriangle,
  Copy,
  RotateCcw,
  Search,
  Filter,
  Loader2,
  Eye,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import WorkflowDesigner from './WorkflowDesigner';
import { usePermissions } from "../contexts/PermissionsContext";
import { AlertCircle } from "lucide-react";

// Componente para visualizar workflows
const WorkflowViewer = ({ workflow, onClose }) => {
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSteps = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/workflow-steps/?workflow=${workflow.id}`);
        // Ordenar os passos pela ordem
        const sortedSteps = response.data.sort((a, b) => a.order - b.order);
        setWorkflowSteps(sortedSteps);
      } catch (error) {
        console.error('Error fetching workflow steps:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [workflow.id]);

  // Obter permissões do contexto
  const permissions = usePermissions();

  // Verificar permissões para mostrar mensagem de acesso restrito
  if (permissions.loading) {
    return (
      <div className="main">
        <Header>
          <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          </div>
        </Header>
      </div>
    );
  }

  // Verificar se usuário pode gerenciar workflows
  const canManageWorkflows = permissions.isOrgAdmin ||
    permissions.canCreateWorkflows ||
    permissions.canEditWorkflows;

  if (!canManageWorkflows) {
    return (
      <div className="main">
        <Header>
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 max-w-lg">
              <div className="flex items-start">
                <AlertCircle className="h-6 w-6 mr-2" />
                <div>
                  <p className="font-bold">Acesso Restrito</p>
                  <p>Você não possui permissões para gerenciar workflows.</p>
                </div>
              </div>
            </div>
            <p className="text-gray-600">
              Entre em contato com o administrador da sua organização para solicitar acesso.
            </p>
          </div>
        </Header>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <Eye className="mr-2 text-blue-600" size={22} />
          Visualizar Workflow: {workflow.name}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <div className="mb-6 bg-white-50 p-4 rounded-md">
            <h3 className="font-medium text-gray-700 mb-2">Detalhes do Workflow</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nome:</p>
                <p className="font-medium">{workflow.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status:</p>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${workflow.is_active ? 'bg-green-100 text-green-800' : 'bg-white-100 text-gray-800'}`}>
                  {workflow.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              {workflow.description && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Descrição:</p>
                  <p>{workflow.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Criado por:</p>
                <p>{workflow.created_by_name || 'Não especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data de criação:</p>
                <p>{new Date(workflow.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-medium mb-4">Passos do Workflow</h3>

          {/* Visualização do fluxo */}
          <div className="p-4 bg-white-50 rounded-lg overflow-x-auto mb-6">
            <div className="flex items-center min-w-max">
              {workflowSteps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div className={`p-3 rounded-lg border ${step.requires_approval ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'} min-w-[150px]`}>
                      <div className="font-medium text-gray-800">{step.name}</div>
                      {step.assign_to_name && (
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <span>Responsável: {step.assign_to_name}</span>
                        </div>
                      )}
                      {step.requires_approval && (
                        <div className="text-xs text-yellow-700 flex items-center mt-1">
                          <AlertTriangle size={12} className="mr-1" />
                          Aprovação: {step.approver_role || 'Necessária'}
                        </div>
                      )}
                    </div>
                  </div>

                  {index < workflowSteps.length - 1 && (
                    <div className="mx-4 text-gray-400">
                      <ChevronRight size={20} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Lista detalhada de passos */}
          <div className="space-y-3">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <div className="bg-blue-100 text-blue-800 h-7 w-7 rounded-full flex items-center justify-center mr-3 font-semibold">
                    {step.order}
                  </div>
                  <h4 className="font-medium">{step.name}</h4>
                </div>

                {step.description && (
                  <p className="text-gray-600 ml-10 mb-3">{step.description}</p>
                )}

                <div className="ml-10 space-y-2">
                  {step.assign_to_name && (
                    <div className="text-sm">
                      <span className="text-gray-500">Responsável:</span> {step.assign_to_name}
                    </div>
                  )}

                  {step.requires_approval && (
                    <div className="text-sm">
                      <span className="text-gray-500">Requer aprovação de:</span> {step.approver_role || 'Não especificado'}
                    </div>
                  )}

                  {step.next_steps && step.next_steps.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-500">Próximos passos possíveis:</span>
                      <div className="ml-4 mt-1">
                        {/* Renderizar os próximos passos possíveis */}
                        {Array.isArray(step.next_steps)
                          ? step.next_steps.map(nextStepId => {
                            const nextStep = workflowSteps.find(s => s.id === nextStepId);
                            return nextStep ? (
                              <div key={nextStepId} className="text-sm text-blue-600">
                                {nextStep.order}. {nextStep.name}
                              </div>
                            ) : null;
                          })
                          : typeof step.next_steps === 'string' && step.next_steps.startsWith('[')
                            ? JSON.parse(step.next_steps).map(nextStepId => {
                              const nextStep = workflowSteps.find(s => s.id === nextStepId);
                              return nextStep ? (
                                <div key={nextStepId} className="text-sm text-blue-600">
                                  {nextStep.order}. {nextStep.name}
                                </div>
                              ) : null;
                            })
                            : <div className="text-sm text-gray-500">Nenhum passo subsequente definido</div>
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Componente principal de gerenciamento de workflows
const WorkflowManagement = () => {
  const queryClient = useQueryClient();

  // Estados locais
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [viewingWorkflow, setViewingWorkflow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    isActive: true,
  });

  // Consultas React Query
  const {
    data: workflows = [],
    isLoading: isWorkflowsLoading,
    isError: isWorkflowsError,
    error: workflowsError,
    refetch: refetchWorkflows
  } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      try {
        const response = await api.get('/workflow-definitions/');
        return response.data;
      } catch (error) {
        console.error('Error fetching workflows:', error);
        throw new Error('Failed to load workflows');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const {
    data: users = [],
    isLoading: isUsersLoading
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await api.get('/profiles/');
        return response.data;
      } catch (error) {
        console.error('Error fetching users:', error);
        throw new Error('Failed to load users');
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  // Mutações React Query
  const createWorkflowMutation = useMutation({
    mutationFn: async (newWorkflow) => {
      // Primeiro, criar o workflow principal
      const response = await api.post('/workflow-definitions/', {
        name: newWorkflow.name,
        description: newWorkflow.description,
        is_active: newWorkflow.is_active
      });

      const workflowId = response.data.id;

      // Depois, criar cada passo do workflow
      for (const step of newWorkflow.steps) {
        await api.post('/workflow-steps/', {
          ...step,
          workflow: workflowId,
          next_steps: JSON.stringify(step.next_steps) // Serializar para JSON
        });
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setShowCreateForm(false);
    },
    onError: (error) => {
      console.error('Error creating workflow:', error);
      alert('Falha ao criar workflow. Por favor, tente novamente.');
    }
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async (updatedWorkflow) => {
      // Primeiro, atualizar o workflow principal
      await api.put(`/workflow-definitions/${updatedWorkflow.id}/`, {
        name: updatedWorkflow.name,
        description: updatedWorkflow.description,
        is_active: updatedWorkflow.is_active
      });

      // Obter os passos existentes
      const stepsResponse = await api.get(`/workflow-steps/?workflow=${updatedWorkflow.id}`);
      const existingSteps = stepsResponse.data;

      // Para cada passo no workflow atualizado...
      for (const step of updatedWorkflow.steps) {
        if (step.id && existingSteps.some(s => s.id === step.id)) {
          // Atualizar passo existente
          await api.put(`/workflow-steps/${step.id}/`, {
            ...step,
            workflow: updatedWorkflow.id,
            next_steps: JSON.stringify(step.next_steps)
          });
        } else {
          // Criar novo passo
          await api.post('/workflow-steps/', {
            ...step,
            workflow: updatedWorkflow.id,
            next_steps: JSON.stringify(step.next_steps)
          });
        }
      }

      // Excluir passos que não estão mais presentes
      for (const existingStep of existingSteps) {
        if (!updatedWorkflow.steps.some(s => s.id === existingStep.id)) {
          await api.delete(`/workflow-steps/${existingStep.id}/`);
        }
      }

      return updatedWorkflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setEditingWorkflow(null);
    },
    onError: (error) => {
      console.error('Error updating workflow:', error);
      alert('Falha ao atualizar workflow. Por favor, tente novamente.');
    }
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (workflowId) => {
      await api.delete(`/workflow-definitions/${workflowId}/`);
      return workflowId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (error) => {
      console.error('Error deleting workflow:', error);
      alert('Falha ao excluir workflow. Por favor, tente novamente.');
    }
  });

  // Função para filtragem de workflows
  const filteredWorkflows = workflows.filter(workflow => {
    // Aplicar filtro de pesquisa
    const matchesSearch =
      !searchTerm ||
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workflow.description && workflow.description.toLowerCase().includes(searchTerm.toLowerCase()));

    // Aplicar filtro de status
    const matchesStatus =
      !filters.isActive || workflow.is_active === true;

    return matchesSearch && matchesStatus;
  });

  // Manipuladores de eventos
  const handleSaveWorkflow = (workflowData) => {
    if (editingWorkflow) {
      updateWorkflowMutation.mutate({
        ...workflowData,
        id: editingWorkflow.id
      });
    } else {
      createWorkflowMutation.mutate(workflowData);
    }
  };

  const handleDeleteWorkflow = (workflowId) => {
    if (window.confirm('Tem certeza que deseja excluir este workflow? Esta ação não pode ser desfeita.')) {
      deleteWorkflowMutation.mutate(workflowId);
    }
  };

  const handleEditWorkflow = async (workflow) => {
    try {
      // Buscar os passos do workflow para edição
      const response = await api.get(`/workflow-steps/?workflow=${workflow.id}`);
      const steps = response.data.map(step => ({
        ...step,
        next_steps: Array.isArray(step.next_steps)
          ? step.next_steps
          : (typeof step.next_steps === 'string' && step.next_steps.startsWith('['))
            ? JSON.parse(step.next_steps)
            : []
      }));

      // Configurar o workflow para edição com seus passos
      setEditingWorkflow({
        ...workflow,
        steps
      });
    } catch (error) {
      console.error('Error fetching workflow steps for editing:', error);
      alert('Falha ao carregar passos do workflow. Por favor, tente novamente.');
    }
  };

  const handleViewWorkflow = (workflow) => {
    setViewingWorkflow(workflow);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.checked
    });
  };

  // Verificar estado de carregamento global
  const isLoading = isWorkflowsLoading || isUsersLoading ||
    createWorkflowMutation.isPending ||
    updateWorkflowMutation.isPending ||
    deleteWorkflowMutation.isPending;

    const permissions = usePermissions();

  // Verificar permissões para mostrar mensagem de acesso restrito
  if (permissions.loading) {
    return (
      <div className="main">
        <Header>
          <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          </div>
        </Header>
      </div>
    );
  }

  // Verificar se usuário pode ver dados de rentabilidade
  const canManageWorkflows = permissions.canManageWorkflows;
  console.log("Permissões do usuário:", permissions);

  if (!canManageWorkflows) {
    return (
      <div className="main">
        <Header>
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 max-w-lg">
              <div className="flex items-start">
                <AlertCircle className="h-6 w-6 mr-2" />
                <div>
                  <p className="font-bold">Acesso Restrito</p>
                  <p>Você não possui permissões para gerir os workflows!</p>
                </div>
              </div>
            </div>
            <p className="text-gray-600">
              Entre em contato com o administrador da sua organização para solicitar acesso.
            </p>
          </div>
        </Header>
      </div>
    );
  }
  return (
    <div className="main">
      <Header>
        <div className="p-6 bg-white-100 min-h-screen" style={{ marginLeft: "3%" }}>
          <div className="max-w-6xl mx-auto">
            {/* Cabeçalho da página */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Gestão de Workflows</h1>

              {!showCreateForm && !editingWorkflow && !viewingWorkflow &&
                (permissions.isOrgAdmin || permissions.canCreateWorkflows) && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                    disabled={isLoading}
                  >
                    <Plus size={18} className="mr-2" />
                    Novo Workflow
                  </button>
                )}
            </div>

            {/* Formulário de designer de workflow (criação/edição) */}
            {(showCreateForm || editingWorkflow) && (
              <WorkflowDesigner
                existingWorkflow={editingWorkflow}
                users={users}
                onSave={handleSaveWorkflow}
                onCancel={() => {
                  setShowCreateForm(false);
                  setEditingWorkflow(null);
                }}
              />
            )}

            {/* Visualizador de workflow */}
            {viewingWorkflow && (
              <WorkflowViewer
                workflow={viewingWorkflow}
                onClose={() => setViewingWorkflow(null)}
              />
            )}

            {/* Filtros e pesquisa */}
            {!showCreateForm && !editingWorkflow && !viewingWorkflow && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                  <h2 className="text-lg font-semibold mb-4 md:mb-0">Workflows</h2>

                  <div className="w-full md:w-1/3 mb-4 md:mb-0">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Pesquisar workflows..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                      />
                      <Search
                        className="absolute left-3 top-2.5 text-gray-400"
                        size={18}
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={filters.isActive}
                        onChange={handleFilterChange}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="ml-2 text-gray-700">
                        Mostrar apenas ativos
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de workflows */}
            {!showCreateForm && !editingWorkflow && !viewingWorkflow && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <h2 className="text-xl font-semibold p-6 border-b">Lista de Workflows</h2>

                {isWorkflowsLoading ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : isWorkflowsError ? (
                  <div className="p-6 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-500">Erro ao carregar workflows</p>
                    <button
                      onClick={() => refetchWorkflows()}
                      className="mt-2 text-blue-600 hover:text-blue-800 flex items-center mx-auto"
                    >
                      <RotateCcw size={16} className="mr-1" />
                      Tentar novamente
                    </button>
                  </div>
                ) : filteredWorkflows.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    {searchTerm || !filters.isActive
                      ? "Nenhum workflow encontrado com os filtros aplicados."
                      : "Nenhum workflow cadastrado. Crie o primeiro!"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-white-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nome
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Descrição
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Criado por
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data de Criação
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredWorkflows.map((workflow) => (
                          <tr key={workflow.id} className="hover:bg-white-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">
                                {workflow.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-gray-500 truncate max-w-xs">
                                {workflow.description || "Sem descrição"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${workflow.is_active ? 'bg-green-100 text-green-800' : 'bg-white-100 text-gray-800'}`}>
                                {workflow.is_active ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {workflow.created_by_name || "Não especificado"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {new Date(workflow.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleViewWorkflow(workflow)}
                                  className="text-blue-600 hover:text-blue-900 flex items-center"
                                  title="Visualizar workflow"
                                >
                                  <Eye size={18} />
                                </button>
                                <button
                                  onClick={() => handleEditWorkflow(workflow)}
                                  className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                  title="Editar workflow"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteWorkflow(workflow.id)}
                                  className="text-red-600 hover:text-red-900 flex items-center"
                                  title="Excluir workflow"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Dicas e informações sobre workflows */}
            {!showCreateForm && !editingWorkflow && !viewingWorkflow && (
              <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-medium text-blue-800 mb-2">Sobre Workflows</h3>
                <p className="text-blue-700 mb-2">
                  Workflows permitem padronizar processos do escritório, definindo:
                </p>
                <ul className="list-disc ml-6 text-blue-700 space-y-1">
                  <li>Sequência de passos para cada tipo de processo</li>
                  <li>Responsáveis por cada etapa</li>
                  <li>Requisitos de aprovação</li>
                  <li>Fluxos alternativos para casos específicos</li>
                </ul>
                <p className="text-blue-700 mt-2">
                  Uma vez definidos, os workflows podem ser aplicados às tarefas para garantir consistência e qualidade.
                </p>
              </div>
            )}
          </div>
        </div>
      </Header>
    </div>
  );
};

export default WorkflowManagement;
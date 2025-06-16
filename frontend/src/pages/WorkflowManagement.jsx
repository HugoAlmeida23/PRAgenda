import React, { useState, useEffect,useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ListChecks,
  Plus,
  Trash2,
  Edit3,
  Settings2,
  Eye,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Filter as FilterIcon,
  Loader2,
  ChevronRight,
  Brain,
  Network,
  Info,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import WorkflowDesigner from './WorkflowDesigner';
import { usePermissions } from "../contexts/PermissionsContext";
import { AlertCircle } from "lucide-react";
import BackgroundElements from "../components/HeroSection/BackgroundElements";
import { toast, ToastContainer } from 'react-toastify';

const glassStyle = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 120, damping: 15 }
  }
};

const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalContentVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20 } },
  exit: { scale: 0.9, opacity: 0, transition: { duration: 0.2 } }
};


const WorkflowViewerModal = ({ workflow, onClose }) => {
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [loadingSteps, setLoadingSteps] = useState(true);

  useEffect(() => {
    const fetchSteps = async () => {
      if (!workflow?.id) return;
      try {
        setLoadingSteps(true);
        const response = await api.get(`/workflow-steps/?workflow=${workflow.id}`);
        const sortedSteps = response.data.sort((a, b) => a.order - b.order);
        setWorkflowSteps(sortedSteps);
      } catch (error) {
        console.error('Error fetching workflow steps:', error);
        toast.error("Falha ao carregar passos do workflow.");
      } finally {
        setLoadingSteps(false);
      }
    };
    fetchSteps();
  }, [workflow?.id]);

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000, padding: '1rem'
      }}
      variants={modalOverlayVariants} initial="hidden" animate="visible" exit="exit"
    >
      <motion.div
        style={{ ...glassStyle, width: '100%', maxWidth: '4xl', maxHeight: '90vh', display: 'flex', flexDirection: 'column', color: 'white', padding: 0 }}
        variants={modalContentVariants}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Eye size={24} style={{ color: 'rgb(59,130,246)' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
              Visualizar Workflow: {workflow.name}
            </h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
            aria-label="Fechar modal"
          >
            <XCircle size={24} />
          </motion.button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {loadingSteps ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59,130,246)' }} />
            </div>
          ) : (
            <>
              <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={18} />Detalhes do Workflow</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                  <div><strong style={{ color: 'rgba(255,255,255,0.7)' }}>Nome:</strong> {workflow.name}</div>
                  <div><strong style={{ color: 'rgba(255,255,255,0.7)' }}>Status:</strong>
                    <span style={{
                      padding: '0.25rem 0.75rem', marginLeft: '0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600',
                      background: workflow.is_active ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)',
                      border: workflow.is_active ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(239,68,68,0.3)',
                      color: workflow.is_active ? 'rgb(110,231,183)' : 'rgb(252,165,165)'
                    }}>
                      {workflow.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {workflow.description && <div style={{ gridColumn: '1 / -1' }}><strong style={{ color: 'rgba(255,255,255,0.7)' }}>Descrição:</strong> {workflow.description}</div>}
                  <div><strong style={{ color: 'rgba(255,255,255,0.7)' }}>Criado por:</strong> {workflow.created_by_name || 'N/A'}</div>
                  <div><strong style={{ color: 'rgba(255,255,255,0.7)' }}>Data de Criação:</strong> {new Date(workflow.created_at).toLocaleDateString('pt-PT')}</div>
                </div>
              </motion.div>

              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRightLeft size={20}/>Passos do Workflow</h3>
              
              <div style={{ ...glassStyle, padding: '1rem', background: 'rgba(0,0,0,0.1)', marginBottom: '1.5rem', overflowX: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content' }}>
                  {workflowSteps.map((step, index) => (
                    <React.Fragment key={`flow-${step.id}`}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{
                           padding: '0.75rem 1rem', borderRadius: '8px',
                           border: `1px solid ${step.requires_approval ? 'rgba(251,191,36,0.3)' : 'rgba(59,130,246,0.3)'}`,
                           background: step.requires_approval ? 'rgba(251,191,36,0.1)' : 'rgba(59,130,246,0.1)',
                           minWidth: '150px', color: 'white'
                        }}>
                          <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{step.name}</div>
                          {step.assign_to_name && <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>Resp: {step.assign_to_name}</div>}
                          {step.requires_approval && <div style={{ fontSize: '0.75rem', color: 'rgb(251,191,36)', marginTop: '0.25rem' }}><AlertTriangle size={12} style={{display: 'inline', marginRight: '0.25rem'}}/>Aprovação: {step.approver_role || 'Necessária'}</div>}
                        </div>
                      </div>
                      {index < workflowSteps.length - 1 && (
                        <div style={{ margin: '0 1rem', color: 'rgba(255,255,255,0.4)' }}>
                          <ChevronRight size={24} />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                   {workflowSteps.length === 0 && <p style={{color: 'rgba(255,255,255,0.6)'}}>Nenhum passo definido para este workflow.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};


const WorkflowManagement = () => {
  const queryClient = useQueryClient();
  const permissions = usePermissions();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [viewingWorkflow, setViewingWorkflow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ isActive: true });

  const {
    data: workflows = [], isLoading: isWorkflowsLoading, isError: isWorkflowsError,
    error: workflowsError, refetch: refetchWorkflows
  } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => api.get('/workflow-definitions/').then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => api.get('/profiles/').then(res => res.data),
    staleTime: 10 * 60 * 1000,
  });

  const mutationOptions = (action) => ({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success(`Workflow ${action} com sucesso!`);
      if (action === "criado") setShowCreateForm(false);
      if (action === "atualizado") setEditingWorkflow(null);
    },
    onError: (error) => {
      console.error(`Error ${action} workflow:`, error);
      toast.error(`Falha ao ${action.replace(/o$/, 'ar')} workflow: ${error.response?.data?.detail || error.message}`);
    }
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (newWorkflowPayload) => {
      const definitionPayload = {
        name: newWorkflowPayload.name,
        description: newWorkflowPayload.description,
        is_active: newWorkflowPayload.is_active,
      };
      const definitionResponse = await api.post('/workflow-definitions/', definitionPayload);
      const workflowDefinition = definitionResponse.data;
      const workflowId = workflowDefinition.id;
  
      const tempIdToRealIdMap = {};
      const createdStepsWithClientData = [];
  
      for (const clientStep of newWorkflowPayload.steps) {
        const { id: tempStepId, next_steps: clientOriginalNextSteps, previous_steps, ...stepBasicData } = clientStep;
        const stepCreationPayload = {
          ...stepBasicData,
          workflow: workflowId,
          next_steps: [],
        };
  
        try {
          const stepResponse = await api.post('/workflow-steps/', stepCreationPayload);
          const serverStep = stepResponse.data;
          if (tempStepId) {
            tempIdToRealIdMap[tempStepId] = serverStep.id;
          }
          createdStepsWithClientData.push({ serverStepData: serverStep, clientOriginalNextSteps });
        } catch (error) {
          console.error(`Error creating step "${stepBasicData.name}":`, error.response?.data || error.message);
          toast.error(`Falha ao criar o passo "${stepBasicData.name}". Tentando reverter workflow.`);
          try {
            await api.delete(`/workflow-definitions/${workflowId}/`);
            toast.info("Definição de workflow revertida devido a erro na criação de passo.");
          } catch (rollbackError) {
            console.error("Failed to rollback workflow definition:", rollbackError);
            toast.error("Falha crítica. Workflow parcialmente criado. Por favor, verifique no sistema.");
          }
          throw error;
        }
      }
  
      for (const { serverStepData, clientOriginalNextSteps } of createdStepsWithClientData) {
        let realNextStepIds = [];
        if (clientOriginalNextSteps && clientOriginalNextSteps.length > 0) {
          realNextStepIds = clientOriginalNextSteps.map(tempNextId => {
            const mappedId = tempIdToRealIdMap[tempNextId] || tempNextId;
            if (!createdStepsWithClientData.some(cs => cs.serverStepData.id === mappedId)) {
              console.warn(`During next_steps update for step ${serverStepData.id}: Temp ID ${tempNextId} mapped to ${mappedId}, which was not found in created steps. Skipping.`);
              return null;
            }
            return mappedId;
          }).filter(id => id !== null);
        }
  
        if (realNextStepIds.length > 0) {
          try {
            await api.patch(`/workflow-steps/${serverStepData.id}/`, { next_steps: realNextStepIds });
          } catch (error) {
            console.error(`Error updating next_steps for step ${serverStepData.id}:`, error.response?.data || error.message);
            toast.warn(`Falha ao conectar os próximos passos para "${serverStepData.name}". Verifique manualmente.`);
          }
        }
      }
      return workflowDefinition;
    },
    ...mutationOptions("criado")
  });

const updateWorkflowMutation = useMutation({
    mutationFn: async (workflowToUpdate) => {
      const { id: workflowId, steps: clientStepsFromPayload, ...definitionData } = workflowToUpdate;
  
      await api.put(`/workflow-definitions/${workflowId}/`, definitionData);
  
      const serverStepsResponse = await api.get(`/workflow-steps/?workflow=${workflowId}`);
      const existingServerSteps = serverStepsResponse.data;
  
      const tempIdToRealIdMap = {};
      const finalStepsCollection = [];
  
      const clientStepIdsPresent = new Set();
  
      for (const clientStep of clientStepsFromPayload) {
        const { id: clientStepId, next_steps: clientOriginalNextSteps, previous_steps, ...stepBasicData } = clientStep;
        if(clientStepId) clientStepIdsPresent.add(clientStepId);
  
        const stepPayloadForSave = { ...stepBasicData, workflow: workflowId, next_steps: [] };
  
        if (clientStepId && String(clientStepId).startsWith('temp-')) {
          try {
            const createdServerStep = await api.post('/workflow-steps/', stepPayloadForSave);
            tempIdToRealIdMap[clientStepId] = createdServerStep.data.id;
            finalStepsCollection.push({ serverDataAfterUpdate: createdServerStep.data, clientOriginalNextSteps });
            clientStepIdsPresent.add(createdServerStep.data.id);
          } catch (e) { console.error("Error creating new step during update:", e); toast.error(`Erro ao criar passo ${stepBasicData.name}.`); throw e; }
        } else if (clientStepId) {
          const serverMatch = existingServerSteps.find(ss => ss.id === clientStepId);
          if (serverMatch) {
            try {
              const updatedServerStep = await api.put(`/workflow-steps/${clientStepId}/`, stepPayloadForSave);
              finalStepsCollection.push({ serverDataAfterUpdate: updatedServerStep.data, clientOriginalNextSteps });
            } catch (e) { console.error("Error updating existing step:", e); toast.error(`Erro ao atualizar passo ${stepBasicData.name}.`); throw e; }
          } else {
             console.warn(`Step ID ${clientStepId} (non-temp) from client not found on server. Attempting to create.`);
             try {
              const createdAsNewServerStep = await api.post('/workflow-steps/', stepPayloadForSave);
              finalStepsCollection.push({ serverDataAfterUpdate: createdAsNewServerStep.data, clientOriginalNextSteps });
              clientStepIdsPresent.add(createdAsNewServerStep.data.id);
            } catch (e) { console.error("Error creating step that client thought was existing:", e); toast.error(`Erro ao (re)criar passo ${stepBasicData.name}.`); throw e; }
          }
        } else {
           console.error("Client step found without an ID during update process:", clientStep);
           toast.error("Erro interno: Passo sem ID encontrado durante a atualização.");
        }
      }
  
      for (const serverStep of existingServerSteps) {
        const isStillPresent = finalStepsCollection.some(fsc => fsc.serverDataAfterUpdate.id === serverStep.id);
        if (!isStillPresent) {
          try {
            await api.delete(`/workflow-steps/${serverStep.id}/`);
          } catch (e) { console.error("Error deleting step:", e); toast.warn(`Erro ao deletar passo ${serverStep.name}.`); }
        }
      }
      
      for (const { serverDataAfterUpdate, clientOriginalNextSteps } of finalStepsCollection) {
        let realNextStepIds = [];
        if (clientOriginalNextSteps && clientOriginalNextSteps.length > 0) {
          realNextStepIds = clientOriginalNextSteps.map(tempOrRealNextId => {
            const mappedId = tempIdToRealIdMap[tempOrRealNextId] || tempOrRealNextId;
            if (!finalStepsCollection.some(fsc => fsc.serverDataAfterUpdate.id === mappedId)) {
              console.warn(`During next_steps update for step ${serverDataAfterUpdate.id}: ID ${tempOrRealNextId} mapped to ${mappedId}, which is not in the final step list. Skipping.`);
              return null;
            }
            return mappedId;
          }).filter(id => id !== null);
        }
  
        const existingNextStepsOnServer = serverDataAfterUpdate.next_steps || [];
        const sortedRealNextStepIds = [...realNextStepIds].sort();
        const sortedExistingNextStepsOnServer = [...existingNextStepsOnServer].sort();
  
        if (JSON.stringify(sortedRealNextStepIds) !== JSON.stringify(sortedExistingNextStepsOnServer)) {
          try {
            await api.patch(`/workflow-steps/${serverDataAfterUpdate.id}/`, { next_steps: realNextStepIds });
          } catch (error) {
            console.error(`Error updating next_steps for step ${serverDataAfterUpdate.id}:`, error.response?.data || error.message);
            toast.warn(`Falha ao conectar os próximos passos para "${serverDataAfterUpdate.name}". Verifique manualmente.`);
          }
        }
      }
      
      const updatedDefinition = await api.get(`/workflow-definitions/${workflowId}/`);
      const updatedSteps = await api.get(`/workflow-steps/?workflow=${workflowId}`);
      return { ...updatedDefinition.data, steps: updatedSteps.data };
    },
    ...mutationOptions("atualizado")
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: (workflowId) => api.delete(`/workflow-definitions/${workflowId}/`),
    ...mutationOptions("excluído")
  });

  const filteredWorkflows = useMemo(() => workflows.filter(workflow => {
    const matchesSearch = !searchTerm ||
      workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workflow.description && workflow.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filters.isActive ? workflow.is_active === true : true;
    return matchesSearch && matchesStatus;
  }), [workflows, searchTerm, filters.isActive]);

  const handleSaveWorkflow = useCallback((workflowData) => {
    if (editingWorkflow) {
      updateWorkflowMutation.mutate({ ...workflowData, id: editingWorkflow.id });
    } else {
      createWorkflowMutation.mutate(workflowData);
    }
  }, [editingWorkflow, createWorkflowMutation, updateWorkflowMutation]);

  const handleDeleteWorkflow = useCallback((workflowId) => {
    if (window.confirm('Tem certeza que deseja excluir este workflow? Esta ação não pode ser desfeita.')) {
      deleteWorkflowMutation.mutate(workflowId);
    }
  }, [deleteWorkflowMutation]);

  const handleEditWorkflow = useCallback(async (workflowDefinitionToEdit) => {
    try {
      const stepsResponse = await api.get(`/workflow-steps/?workflow=${workflowDefinitionToEdit.id}`);
      const stepsFromServer = stepsResponse.data;
      
      setEditingWorkflow({ ...workflowDefinitionToEdit, steps: stepsFromServer });
      setShowCreateForm(false);
      setViewingWorkflow(null);
    } catch (error) {
      console.error('Error fetching workflow steps for editing:', error);
      toast.error('Falha ao carregar passos do workflow para edição.');
    }
  }, []);

  const handleViewWorkflow = useCallback((workflow) => {
    setViewingWorkflow(workflow);
    setShowCreateForm(false);
    setEditingWorkflow(null);
  }, []);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.checked });

  const isLoadingOverall = isWorkflowsLoading || isUsersLoading;

  if (permissions.loading || isLoadingOverall) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }}>
          <Brain size={48} style={{ color: 'rgb(147, 51, 234)' }} />
        </motion.div>
        <p style={{ marginLeft: '1rem', fontSize: '1rem' }}>A carregar gestão de workflows...</p>
      </div>
    );
  }
  
  const canManageWorkflows = permissions.isOrgAdmin || permissions.canManageWorkflows || permissions.canCreateWorkflows || permissions.canEditWorkflows;

  if (!canManageWorkflows) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'white' }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ ...glassStyle, padding: '2rem', textAlign: 'center', maxWidth: '500px' }}>
          <AlertTriangle size={48} style={{ color: 'rgb(251, 191, 36)', marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Acesso Restrito</h2>
          <p style={{ margin: '0 0 1rem 0', color: 'rgba(255,255,255,0.8)' }}>Você não possui permissões para gerir workflows.</p>
        </motion.div>
      </div>
    );
  }

  const currentActionText = showCreateForm ? "Criar Novo Workflow" : editingWorkflow ? "Editar Workflow" : "Gestão de Workflows";

  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
      <BackgroundElements businessStatus="optimal" />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 9999 }} theme="dark" />

      <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}>
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {currentActionText}
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>Crie, edite e gira os fluxos de trabalho da sua organização.</p>
          </div>
          {!showCreateForm && !editingWorkflow && (permissions.isOrgAdmin || permissions.canCreateWorkflows) && (
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setShowCreateForm(true); setEditingWorkflow(null); setViewingWorkflow(null); }}
              style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}
              disabled={createWorkflowMutation.isPending || updateWorkflowMutation.isPending}
            >
              <Plus size={18} /> Novo Workflow
            </motion.button>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {showCreateForm || editingWorkflow ? (
            <motion.div key="designer" variants={itemVariants}>
              <WorkflowDesigner
                existingWorkflow={editingWorkflow}
                users={users}
                onSave={handleSaveWorkflow}
                onCancel={() => { setShowCreateForm(false); setEditingWorkflow(null); }}
                isSaving={createWorkflowMutation.isPending || updateWorkflowMutation.isPending}
              />
            </motion.div>
          ) : (
            <motion.div key="list" variants={itemVariants}>
              <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                    <input
                      type="text" placeholder="Pesquisar workflows..." value={searchTerm} onChange={handleSearchChange}
                      style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                    <input type="checkbox" name="isActive" checked={filters.isActive} onChange={handleFilterChange} style={{ width: '18px', height: '18px', accentColor: 'rgb(59,130,246)' }} />
                    Mostrar apenas ativos
                  </label>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: 'rgba(52,211,153,0.2)', borderRadius: '12px' }}><ListChecks style={{ color: 'rgb(52,211,153)' }} size={20} /></div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Workflows Definidos</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>{filteredWorkflows.length} workflows encontrados</p>
                  </div>
                </div>
                {isWorkflowsLoading ? (
                  <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59,130,246)' }} /></div>
                ) : isWorkflowsError ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'rgb(239,68,68)' }}>
                    <AlertTriangle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Erro ao carregar workflows: {workflowsError?.message}</p>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => refetchWorkflows()}
                      style={{ ...glassStyle, padding: '0.5rem 1rem', marginTop: '1rem', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.2)', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <RotateCcw size={16} /> Tentar Novamente
                    </motion.button>
                  </div>
                ) : filteredWorkflows.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                    <Network size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>{searchTerm || !filters.isActive ? "Nenhum workflow encontrado com os filtros aplicados." : "Nenhum workflow cadastrado. Crie o primeiro!"}</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        <tr>
                          {['Nome', 'Status', 'Criado por', 'Data de Criação', 'Ações'].map(header => (
                            <th key={header} style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWorkflows.map((workflow, index) => (
                          <motion.tr key={workflow.id} initial={{ opacity: 0, y:10 }} animate={{ opacity:1, y:0 }} transition={{delay: index * 0.03}}
                            style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{workflow.name}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600',
                                background: workflow.is_active ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)',
                                border: workflow.is_active ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(239,68,68,0.3)',
                                color: workflow.is_active ? 'rgb(110,231,183)' : 'rgb(252,165,165)'
                              }}>
                                {workflow.is_active ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{workflow.created_by_name || 'N/A'}</td>
                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{new Date(workflow.created_at).toLocaleDateString('pt-PT')}</td>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleViewWorkflow(workflow)} title="Visualizar" style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(59,130,246)', cursor: 'pointer' }}><Eye size={16} /></motion.button>
                                {(permissions.isOrgAdmin || permissions.canEditWorkflows) &&
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleEditWorkflow(workflow)} title="Editar" style={{ background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(147,51,234)', cursor: 'pointer' }}><Edit3 size={16} /></motion.button>
                                }
                                {(permissions.isOrgAdmin || permissions.canDeleteWorkflows) &&
                                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteWorkflow(workflow.id)} title="Excluir" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(239,68,68)', cursor: 'pointer' }} disabled={deleteWorkflowMutation.isPending}><Trash2 size={16} /></motion.button>
                                }
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {viewingWorkflow && (
          <WorkflowViewerModal
            workflow={viewingWorkflow}
            onClose={() => setViewingWorkflow(null)}
          />
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        input::placeholder { color: rgba(255,255,255,0.5) !important; }
        select option { background: #1f2937 !important; color: white !important; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
        * { transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease; }
        button:focus, input:focus, select:focus, textarea:focus { outline: 2px solid rgba(59,130,246,0.5); outline-offset: 2px; }
      `}</style>
    </div>
  );
};

export default WorkflowManagement;
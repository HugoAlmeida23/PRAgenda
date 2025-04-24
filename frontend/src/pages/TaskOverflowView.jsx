import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import api from '../api';

const TaskWorkflowView = ({ taskId, onWorkflowUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [nextSteps, setNextSteps] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [comment, setComment] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState([]);

  useEffect(() => {
    if (taskId) {
      fetchTaskAndWorkflow();
    }
  }, [taskId]);

  const fetchTaskAndWorkflow = async () => {
    try {
      setLoading(true);
      
      // Fetch task details
      const taskResponse = await api.get(`/tasks/${taskId}/`);
      setTask(taskResponse.data);
      
      // If task has a workflow, fetch the workflow steps
      if (taskResponse.data.workflow) {
        const workflowResponse = await api.get(`/workflow-steps/?workflow=${taskResponse.data.workflow}`);
        // Sort steps by order
        const sortedSteps = workflowResponse.data.sort((a, b) => a.order - b.order);
        setWorkflowSteps(sortedSteps);
        
        // Determine current step
        const current = sortedSteps.find(
          step => step.id === taskResponse.data.current_workflow_step
        );
        setCurrentStep(current);
        
        // Get next possible steps based on current step
        if (current) {
          let nextStepIds = [];
          
          // Handle next_steps stored as JSON string or array
          if (typeof current.next_steps === 'string') {
            try {
              nextStepIds = JSON.parse(current.next_steps);
            } catch (e) {
              console.error("Error parsing next_steps JSON:", e);
              nextStepIds = [];
            }
          } else if (Array.isArray(current.next_steps)) {
            nextStepIds = current.next_steps;
          }
          
          // Find details for next steps
          const nextStepsData = sortedSteps.filter(
            step => nextStepIds.includes(step.id)
          );
          setNextSteps(nextStepsData);
        }
        
        // Fetch approval history
        try {
          const approvalsResponse = await api.get(`/task-approvals/?task=${taskId}`);
          setApprovalHistory(approvalsResponse.data);
        } catch (error) {
          console.error("Error fetching approval history:", error);
        }
      }
      
      // Fetch users who can approve
      const usersResponse = await api.get("/profiles/");
      setApprovers(usersResponse.data);
      
    } catch (error) {
      console.error("Error fetching task workflow:", error);
      toast.error("Falha ao carregar informações do workflow");
    } finally {
      setLoading(false);
    }
  };

  const advanceWorkflow = async (nextStepId) => {
    try {
      setLoading(true);
      
      // Update the task with the new workflow step
      await api.patch(`/tasks/${taskId}/`, {
        current_workflow_step: nextStepId,
        workflow_comment: comment
      });
      
      toast.success("Tarefa avançada para o próximo passo do workflow");
      setComment("");
      
      // Refresh the task and workflow data
      await fetchTaskAndWorkflow();
      
      // Notify parent component
      if (onWorkflowUpdate) {
        onWorkflowUpdate();
      }
      
    } catch (error) {
      console.error("Error advancing workflow:", error);
      toast.error("Falha ao avançar no workflow");
    } finally {
      setLoading(false);
    }
  };

  const approveCurrentStep = async () => {
    if (!currentStep) {
      toast.error("Não há passo atual para aprovar");
      return;
    }
    
    try {
      setLoading(true);
      
      // Create an approval record
      await api.post(`/task-approvals/`, {
        task: taskId,
        workflow_step: currentStep.id,
        approved: true,
        comment: comment
      });
      
      toast.success("Passo aprovado com sucesso");
      setComment("");
      
      // Refresh the task and workflow data
      await fetchTaskAndWorkflow();
      
      // Notify parent component
      if (onWorkflowUpdate) {
        onWorkflowUpdate();
      }
      
    } catch (error) {
      console.error("Error approving step:", error);
      toast.error("Falha ao aprovar passo");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!task || !task.workflow) {
    return (
      <div className="bg-gray-100 p-4 rounded-md">
        <p className="text-gray-500 text-sm">Esta tarefa não possui um workflow associado.</p>
      </div>
    );
  }

  // Check if step has been approved
  const isCurrentStepApproved = () => {
    return approvalHistory.some(
      approval => approval.workflow_step === currentStep?.id && approval.approved
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Progresso do Workflow</h3>
      
      {/* Current step information */}
      {currentStep && (
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-3">
              {workflowSteps.findIndex(step => step.id === currentStep.id) + 1}
            </div>
            <div>
              <h4 className="font-medium">{currentStep.name}</h4>
              <p className="text-sm text-gray-500">Passo Atual</p>
            </div>
          </div>
          
          {currentStep.description && (
            <p className="text-sm text-gray-600 ml-11 mb-3">{currentStep.description}</p>
          )}
          
          {currentStep.requires_approval && (
            <div className="ml-11 p-3 bg-yellow-50 rounded-md mb-3">
              <div className="flex items-center text-yellow-800 text-sm mb-1">
                <AlertTriangle size={16} className="mr-2" />
                <span className="font-medium">Este passo requer aprovação</span>
              </div>
              {currentStep.approver_role && (
                <p className="text-sm text-yellow-700">
                  Deve ser aprovado por: {currentStep.approver_role}
                </p>
              )}
              
              {isCurrentStepApproved() ? (
                <div className="mt-2 flex items-center text-green-700">
                  <CheckCircle size={16} className="mr-2" />
                  <span>Este passo já foi aprovado</span>
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    onClick={approveCurrentStep}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
                    disabled={loading}
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Aprovar Este Passo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Next possible steps */}
      {nextSteps.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-3">Avançar para o Próximo Passo</h4>
          
          <div className="mb-3">
            <label className="block text-gray-700 mb-2 text-sm">
              Comentários (Opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              rows={2}
              placeholder="Adicione observações sobre esta transição do workflow"
            />
          </div>
          
          <div className="space-y-3">
            {nextSteps.map((step) => (
              <div key={step.id} className="p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <h5 className="font-medium">{step.name}</h5>
                    {step.description && (
                      <p className="text-sm text-gray-600">{step.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => advanceWorkflow(step.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md flex items-center self-start"
                    disabled={loading}
                  >
                    <ArrowRight size={16} className="mr-1" />
                    Avançar
                  </button>
                </div>
                
                {step.assign_to_name && (
                  <div className="flex items-center text-gray-600 text-sm mt-2">
                    <Users size={14} className="mr-1" />
                    <span>Será atribuído a: {step.assign_to_name}</span>
                  </div>
                )}
                
                {step.requires_approval && (
                  <div className="flex items-center text-yellow-600 text-sm mt-1">
                    <AlertTriangle size={14} className="mr-1" />
                    <span>Requer aprovação por {step.approver_role || 'aprovador'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Workflow visualization */}
      <div className="mt-6">
        <h4 className="font-medium mb-3">Passos do Workflow</h4>
        <div className="flex overflow-x-auto pb-3">
          {workflowSteps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className={`flex flex-col items-center ${
                step.id === currentStep?.id 
                  ? 'scale-110 transform transition-transform' 
                  : ''
              }`}>
                <div 
                  className={`p-2 rounded-md text-sm font-medium ${
                    step.id === currentStep?.id
                      ? "bg-blue-100 text-blue-800 border border-blue-300"
                      : approvalHistory.some(a => a.workflow_step === step.id && a.approved)
                        ? "bg-green-100 text-green-800 border border-green-300"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {index + 1}. {step.name}
                </div>
                
                {approvalHistory.some(a => a.workflow_step === step.id && a.approved) && (
                  <div className="mt-1">
                    <CheckCircle size={12} className="text-green-500" />
                  </div>
                )}
              </div>
              {index < workflowSteps.length - 1 && (
                <ArrowRight
                  size={16}
                  className={`mx-2 self-center ${
                    currentStep && 
                    index >= workflowSteps.findIndex(s => s.id === currentStep.id)
                      ? 'text-gray-300'
                      : 'text-blue-500'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Approval History */}
      {approvalHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center text-blue-600 text-sm"
          >
            {showHistory ? (
              <ChevronUp size={16} className="mr-1" />
            ) : (
              <ChevronDown size={16} className="mr-1" />
            )}
            {showHistory ? "Ocultar Histórico de Aprovações" : "Mostrar Histórico de Aprovações"}
          </button>
          
          {showHistory && (
            <div className="mt-3 space-y-2">
              {approvalHistory.map((approval) => {
                const step = workflowSteps.find(s => s.id === approval.workflow_step);
                return (
                  <div key={approval.id} className="p-2 bg-gray-50 rounded-md border border-gray-200 text-sm">
                    <div className="flex items-center">
                      <CheckCircle size={14} className="text-green-500 mr-2" />
                      <span className="font-medium">{step?.name || 'Passo'}</span>
                      <span className="mx-2">•</span>
                      <span>Aprovado por {approval.approved_by_name}</span>
                      <span className="mx-2">•</span>
                      <span className="text-gray-500">
                        {new Date(approval.approved_at).toLocaleString()}
                      </span>
                    </div>
                    {approval.comment && (
                      <p className="mt-1 text-gray-600 ml-6">{approval.comment}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskWorkflowView;
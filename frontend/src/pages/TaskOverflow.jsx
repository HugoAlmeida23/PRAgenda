import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { ArrowRight, CheckCircle, AlertTriangle, Users, FileText } from "lucide-react";
import api from "../api";

const TaskWorkflow = ({ taskId, onWorkflowUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [nextSteps, setNextSteps] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [comment, setComment] = useState("");

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
      
      // Fetch workflow definition and steps (assuming these endpoints exist)
      if (taskResponse.data.workflow) {
        const workflowResponse = await api.get(`/workflow-steps/?workflow=${taskResponse.data.workflow}`);
        setWorkflowSteps(workflowResponse.data);
        
        // Determine current step and next possible steps
        const current = workflowResponse.data.find(
          step => step.id === taskResponse.data.current_workflow_step
        );
        setCurrentStep(current);
        
        if (current && current.next_steps) {
          let nextStepsArray = [];
          try {
            nextStepsArray = JSON.parse(current.next_steps);
          } catch (e) {
            console.error("Error parsing next_steps JSON:", e);
          }
          
          // Fetch details for next steps
          const nextStepsData = workflowResponse.data.filter(
            step => nextStepsArray.includes(step.id)
          );
          setNextSteps(nextStepsData);
        }
      }
      
      // Fetch users who can approve (if needed)
      const usersResponse = await api.get("/profiles/");
      setApprovers(usersResponse.data);
      
    } catch (error) {
      console.error("Error fetching task workflow:", error);
      toast.error("Failed to load workflow information");
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
        workflow_comment: comment,
      });
      
      toast.success("Task advanced to next workflow step");
      setComment("");
      
      // Refresh the task and workflow data
      await fetchTaskAndWorkflow();
      
      // Notify parent component
      if (onWorkflowUpdate) {
        onWorkflowUpdate();
      }
      
    } catch (error) {
      console.error("Error advancing workflow:", error);
      toast.error("Failed to advance workflow");
    } finally {
      setLoading(false);
    }
  };

  const approveCurrentStep = async () => {
    try {
      setLoading(true);
      
      // Update the task approval status
      await api.post(`/task-approvals/`, {
        task: taskId,
        workflow_step: currentStep.id,
        approved: true,
        comment: comment,
      });
      
      toast.success("Step approved successfully");
      setComment("");
      
      // Refresh the task and workflow data
      await fetchTaskAndWorkflow();
      
      // Notify parent component
      if (onWorkflowUpdate) {
        onWorkflowUpdate();
      }
      
    } catch (error) {
      console.error("Error approving step:", error);
      toast.error("Failed to approve step");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!task || !task.workflow) {
    return (
      <div className="bg-gray-100 p-4 rounded-md">
        <p className="text-gray-500 text-sm">This task is not part of a workflow.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Workflow Progress</h3>
      
      {/* Current step information */}
      {currentStep && (
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mr-3">
              {workflowSteps.findIndex(step => step.id === currentStep.id) + 1}
            </div>
            <div>
              <h4 className="font-medium">{currentStep.name}</h4>
              <p className="text-sm text-gray-500">Current Step</p>
            </div>
          </div>
          
          {currentStep.description && (
            <p className="text-sm text-gray-600 ml-11 mb-3">{currentStep.description}</p>
          )}
          
          {currentStep.requires_approval && (
            <div className="ml-11 p-3 bg-yellow-50 rounded-md mb-3">
              <div className="flex items-center text-yellow-800 text-sm mb-1">
                <AlertTriangle size={16} className="mr-2" />
                <span className="font-medium">This step requires approval</span>
              </div>
              {currentStep.approver_role && (
                <p className="text-sm text-yellow-700">
                  Must be approved by: {currentStep.approver_role}
                </p>
              )}
            </div>
          )}
          
          {/* Check if user has appropriate role to approve */}
          {currentStep.requires_approval && (
            <div className="ml-11 mt-3">
              <button
                onClick={approveCurrentStep}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
                disabled={loading}
              >
                <CheckCircle size={16} className="mr-2" />
                Approve This Step
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Next possible steps */}
      {nextSteps.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-3">Advance to Next Step</h4>
          
          <div className="mb-3">
            <label className="block text-gray-700 mb-2 text-sm">
              Comments (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              rows={2}
              placeholder="Add any notes about this workflow transition"
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
                    Advance
                  </button>
                </div>
                
                {step.assign_to && (
                  <div className="flex items-center text-gray-600 text-sm mt-2">
                    <User size={14} className="mr-1" />
                    <span>Will be assigned to: {
                      approvers.find(user => user.user === step.assign_to)?.username || 'Unknown'
                    }</span>
                  </div>
                )}
                
                {step.requires_approval && (
                  <div className="flex items-center text-yellow-600 text-sm mt-1">
                    <AlertTriangle size={14} className="mr-1" />
                    <span>Requires approval by {step.approver_role}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Workflow visualization */}
      <div className="mt-6">
        <h4 className="font-medium mb-3">Workflow Steps</h4>
        <div className="flex flex-wrap items-center">
          {workflowSteps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div
                className={`rounded-md p-2 text-sm font-medium ${
                  step.id === currentStep?.id
                    ? "bg-blue-100 text-blue-800 border border-blue-300"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {index + 1}. {step.name}
              </div>
              {index < workflowSteps.length - 1 && (
                <ArrowRight
                  size={16}
                  className="mx-2 text-gray-400"
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TaskWorkflow;
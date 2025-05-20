import React, { useState, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import Header from "../components/Header";
import api from "../api";
import "../styles/Home.css";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Settings,
} from "lucide-react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import TaskWorkflowView from './TaskOverflowView';
import { usePermissions } from "../contexts/PermissionsContext";
import { AlertCircle } from "lucide-react";
import { Loader2 } from 'lucide-react';


const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: "Urgent", color: "text-red-600" }, // Simplified color for example
  { value: 2, label: "High", color: "text-orange-600" },
  { value: 3, label: "Medium", color: "text-yellow-600" },
  { value: 4, label: "Low", color: "text-blue-600" },
  { value: 5, label: "Can Wait", color: "text-gray-500" },
];

// --- Helper Components (Simplified Loading/Error for Tailwind) ---
const LoadingView = () => (
  <div className="flex justify-center items-center min-h-screen">
    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
  </div>
);

const ErrorView = ({ message, onRetry }) => (
  <div className="flex flex-col justify-center items-center min-h-[300px] p-4 text-center">
    <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-lg" role="alert">
      <strong className="font-bold block sm:inline">Oops! Something went wrong.</strong>
      <span className="block sm:inline"> {message || 'Failed to load data.'}</span>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-white-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Retry
      </button>
    )}
  </div>
);


// --- Data Fetching Function (Outside Component) ---
const fetchTaskManagementData = async () => {
  console.log("Fetching task management data...");
  const [tasksRes, clientsRes, usersRes, categoriesRes] = await Promise.all([
    api.get("/tasks/"),
    api.get("/clients/?is_active=true"), // Fetch only active clients for dropdowns
    api.get("/profiles/"), // Assuming profiles are users
    api.get("/task-categories/")
  ]);
  console.log("Data fetched:", { tasks: tasksRes.data.length, clients: clientsRes.data.length, users: usersRes.data.length, categories: categoriesRes.data.length });
  return {
    tasks: tasksRes.data || [],
    clients: clientsRes.data || [],
    users: usersRes.data || [],
    categories: categoriesRes.data || [],
  };
};

// --- Main Component ---
const TaskManagement = () => {
  // Function to initialize or reset form data
  const getInitialFormData = () => ({
    title: "", description: "", client: "", category: "", assigned_to: "",
    status: "pending", priority: 3, deadline: "", estimated_time_minutes: "",
  });

  // --- React Query Client ---
  const queryClient = useQueryClient();

  // --- Local UI State ---
  const [selectedTask, setSelectedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showNaturalLanguageForm, setShowNaturalLanguageForm] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "deadline", direction: "asc" });
  const [filters, setFilters] = useState({ status: "", client: "", priority: "", assignedTo: "", category: "" });
  const [selectedTaskForWorkflow, setSelectedTaskForWorkflow] = useState(null);
  const [formData, setFormData] = useState(getInitialFormData());

  // --- Data Fetching using React Query ---
  const { data, isLoading: isLoadingData, isError, error, refetch } = useQuery({
    queryKey: ['taskManagementData'], // Unique key for this data set
    queryFn: fetchTaskManagementData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Keep previous data while refetching for smoother UX
    // keepPreviousData: true, // Consider enabling if pagination/infinite scroll is added
  });

  // Extracted data lists (provide defaults)
  const tasks = data?.tasks ?? [];
  const clients = data?.clients ?? [];
  const users = data?.users ?? [];
  const categories = data?.categories ?? [];


  // --- Mutations using React Query ---

  // Base mutation options for invalidation
  const mutationOptions = {
    onSuccess: () => {
      console.log("Mutation successful, invalidating taskManagementData query");
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] });
      resetForm(); // Close form and reset fields after success
    },
    onError: (err, variables, context) => {
      console.error("Mutation failed:", err);
      const errorMessage = err.response?.data?.detail || err.message || "An error occurred";
      toast.error(`Failed: ${errorMessage}`);
    },
  };

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: (newTaskData) => api.post("/tasks/", newTaskData),
    ...mutationOptions,
    onSuccess: () => {
      toast.success("Task created successfully");
      mutationOptions.onSuccess(); // Call base onSuccess
    }
  });

  // Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updatedData }) => api.put(`/tasks/${id}/`, updatedData),
    ...mutationOptions,
    onSuccess: () => {
      toast.success("Task updated successfully");
      mutationOptions.onSuccess();
    }
  });

  // Update Task Status Mutation (using PATCH)
  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}/`, { status }),
    onSuccess: (data, variables) => { // variables contains { id, status }
      toast.success(`Task marked as ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] }); // Only invalidate, don't reset form
    },
    onError: (err) => {
      console.error("Error updating task status:", err);
      toast.error("Failed to update task status");
    }
  });


  // Delete Task Mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}/`),
    onSuccess: () => {
      toast.success("Task deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['taskManagementData'] }); // Only invalidate
    },
    onError: (err) => {
      console.error("Error deleting task:", err);
      toast.error("Failed to delete task");
    }
  });

  // Natural Language Task Creation Mutation (Example)
  const createNlpTaskMutation = useMutation({
    mutationFn: (nlpData) => api.post("/tasks/", nlpData), // Assuming same endpoint
    ...mutationOptions, // Use base options
    onSuccess: () => {
      toast.success("Task created from text");
      setNaturalLanguageInput(""); // Clear input
      setShowNaturalLanguageForm(false); // Close NL form
      mutationOptions.onSuccess(); // Invalidate and reset main form (if open)
    },
    onError: (err) => {
      console.error("Error creating NLP task:", err);
      toast.error("Failed to create task from text");
    }
  });


  // --- Client-Side Filtering and Sorting using useMemo ---
  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks) return []; // Guard against initial undefined state
    console.log(`Memo: Filtering/Sorting ${tasks.length} tasks. Filters:`, filters, `Search:`, searchTerm, `Sort:`, sortConfig);

    let result = [...tasks];

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(task =>
        task.title?.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term) ||
        clients.find(c => c.id === task.client)?.name.toLowerCase().includes(term) || // Search client name
        users.find(u => u.id === task.assigned_to)?.username.toLowerCase().includes(term) // Search assignee username
      );
    }

    // Apply filters
    if (filters.status) result = result.filter(task => task.status === filters.status);
    if (filters.client) result = result.filter(task => task.client === filters.client);
    if (filters.priority) result = result.filter(task => task.priority === parseInt(filters.priority));
    if (filters.assignedTo) result = result.filter(task => task.assigned_to === filters.assignedTo);
    if (filters.category) result = result.filter(task => task.category === filters.category);

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Handle nulls consistently (e.g., nulls last)
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        // Specific handling for dates
        if (sortConfig.key === "deadline") {
          valA = new Date(valA);
          valB = new Date(valB);
          return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        }

        // Specific handling for related fields (client name, assignee username) - requires lookup
        if (sortConfig.key === "client") {
          valA = clients.find(c => c.id === valA)?.name?.toLowerCase() || '';
          valB = clients.find(c => c.id === valB)?.name?.toLowerCase() || '';
        } else if (sortConfig.key === "assigned_to") {
          valA = users.find(u => u.id === valA)?.username?.toLowerCase() || '';
          valB = users.find(u => u.id === valB)?.username?.toLowerCase() || '';
        } else if (typeof valA === 'string') {
          // Default string comparison (case-insensitive)
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        // General comparison
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    console.log(`Memo Result: ${result.length} tasks`);
    return result;
  }, [tasks, clients, users, searchTerm, filters, sortConfig]); // Dependencies for re-calculation


  // --- Event Handlers ---

  // useCallback for stable function references where needed (e.g., passed as props)
  const handleSort = useCallback((key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }, []); // Empty dependency array as it doesn't depend on component state/props

  const handleInputChange = useCallback((e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? (value ? parseInt(value, 10) : "") : value,
    }));
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ status: "", client: "", priority: "", assignedTo: "", category: "" });
    setSearchTerm("");
    setSortConfig({ key: "deadline", direction: "asc" }); // Optionally reset sort
  }, []);


  const handleNaturalLanguageInputChange = useCallback((e) => {
    setNaturalLanguageInput(e.target.value);
  }, []);

  // Reset form function
  const resetForm = useCallback(() => {
    setSelectedTask(null);
    setFormData(getInitialFormData());
    setShowForm(false);
    setShowNaturalLanguageForm(false);
    setNaturalLanguageInput("");
    setSelectedTaskForWorkflow(null);
  }, []);

  // Handle submission from the main form
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const permissions = usePermissions();
    
    if (selectedTask) {
      const canEdit = permissions.isOrgAdmin ||
        permissions.canEditAllTasks ||
        (permissions.canEditAssignedTasks && selectedTask.assigned_to === permissions.userId);

      if (!canEdit) {
        toast.error("Você não tem permissão para editar esta tarefa");
        return;
      }
      // Update
      updateTaskMutation.mutate({ id: selectedTask.id, updatedData: formData });
    } else {
      if (!permissions.isOrgAdmin && !permissions.canCreateTasks) {
        toast.error("Você não tem permissão para criar tarefas");
        return;
      }
      // Create
      createTaskMutation.mutate(formData);
    }
  }, [selectedTask, formData, createTaskMutation, updateTaskMutation]); 

  // Handle NLP form submission
  const handleNaturalLanguageSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!naturalLanguageInput.trim()) {
      toast.error("Please enter some text to create a task.");
      return;
    }

    // --- Basic NLP Placeholder ---
    // This section should ideally call a dedicated backend NLP service
    // Extract dates (very basic regex, needs improvement or library like 'chrono-node')
    const deadlineMatch = naturalLanguageInput.match(/by (\d{4}-\d{2}-\d{2})/i); // Simple YYYY-MM-DD match
    let deadline = deadlineMatch ? deadlineMatch[1] : null;

    // Extract priority
    let priority = 3; // Default Medium
    if (/urgent/i.test(naturalLanguageInput)) priority = 1;
    else if (/high priority/i.test(naturalLanguageInput)) priority = 2;
    else if (/low priority/i.test(naturalLanguageInput)) priority = 4;

    // Extract client (very basic)
    let clientId = null;
    for (const client of clients) {
      // Use word boundaries for better matching
      const clientRegex = new RegExp(`\\b${client.name}\\b`, 'i');
      if (clientRegex.test(naturalLanguageInput)) {
        clientId = client.id;
        break;
      }
    }
    // --- End Basic NLP Placeholder ---

    const nlpTaskData = {
      title: naturalLanguageInput.substring(0, 100), // Use first 100 chars as title example
      description: naturalLanguageInput,
      client: clientId, // Use matched client if found
      status: "pending",
      priority: priority,
      deadline: deadline,
    };

    createNlpTaskMutation.mutate(nlpTaskData);

  }, [naturalLanguageInput, clients, createNlpTaskMutation]);


  // Prepare a task for editing
  const selectTaskForEdit = useCallback((task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      client: task.client || "",
      category: task.category || "",
      assigned_to: task.assigned_to || "",
      status: task.status || "pending",
      priority: task.priority || 3,
      deadline: task.deadline ? task.deadline.split("T")[0] : "", // Format for date input
      estimated_time_minutes: task.estimated_time_minutes || "",
    });
    setShowForm(true);
    setShowNaturalLanguageForm(false); // Close NLP form if open
  }, []);

  // Handle view workflow
  const handleViewWorkflow = useCallback((task) => {
    setSelectedTaskForWorkflow(task);
  }, []);

  // Confirm and trigger delete
  const confirmDelete = useCallback((taskId) => {
    const permissions = usePermissions();
    if (!permissions.isOrgAdmin && !permissions.canDeleteTasks) {
      toast.error("Você não tem permissão para excluir tarefas");
      return;
    }
    // Could use a modal here instead of window.confirm
    if (window.confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      deleteTaskMutation.mutate(taskId);
    }
  }, [deleteTaskMutation]);

  // Trigger status update
  const updateTaskStatusHandler = useCallback((task, newStatus) => {
    const permissions = usePermissions();
    const canUpdate = permissions.isOrgAdmin ||
      permissions.canEditAllTasks ||
      (permissions.canEditAssignedTasks && task.assigned_to === permissions.userId);

    if (!canUpdate) {
      toast.error("Você não tem permissão para atualizar esta tarefa");
      return;
    }
    updateTaskStatusMutation.mutate({ id: task.id, status: newStatus });
  }, [updateTaskStatusMutation]);

  // --- Helper Functions (can be moved outside if not using component state) ---
  const formatDate = (dateString) => {
    if (!dateString) return "No deadline";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isOverdue = (deadline) => {
    if (!deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of day for fair comparison
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  const getPriorityInfo = (priorityValue) => {
    const priority = PRIORITY_OPTIONS.find(p => p.value === priorityValue) || PRIORITY_OPTIONS[2]; // Default to Medium if not found
    return {
      label: priority.label,
      color: priority.color
    };
  };

  const {
    data: workflowDefinitions = [],
    isLoading: isLoadingWorkflows
  } = useQuery({
    queryKey: ['workflowDefinitions'],
    queryFn: async () => {
      try {
        const response = await api.get('/workflow-definitions/?is_active=true');
        return response.data;
      } catch (error) {
        console.error('Error fetching workflows:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000
  });

  // --- Render Logic ---

  // Show loading indicator while initial data is loading
  if (isLoadingData) {
    return <Header><LoadingView /></Header>;
  }

  // Show error message if initial data fetching failed
  if (isError) {
    return <Header><ErrorView message={error?.message || "Could not load task data."} onRetry={refetch} /></Header>;
  }

  // Obter permissões do contexto
  const permissions = usePermissions();

  // Verificar permissões para mostrar mensagem de acesso restrito
  if (permissions.loading) {
    return <Header><LoadingView /></Header>;
  }

  // Verificar se usuário pode ver tarefas
  const canViewTasks = permissions.canViewAllTasks || permissions.isOrgAdmin;

  // Se não tiver permissões, mostrar mensagem de acesso restrito
  if (!canViewTasks && !permissions.canEditAssignedTasks) {
    return (
      <Header>
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 max-w-lg">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 mr-2" />
              <div>
                <p className="font-bold">Acesso Restrito</p>
                <p>Você não possui permissões para visualizar ou gerenciar tarefas.</p>
              </div>
            </div>
          </div>
          <p className="text-gray-600">
            Entre em contato com o administrador da sua organização para solicitar acesso.
          </p>
        </div>
      </Header>
    );
  }


  return (
    <div className="main">
      <Header>
        <div
          className="p-6 bg-white-100 min-h-screen"
          style={{ marginLeft: "3%" }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Task Management</h1>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowNaturalLanguageForm(!showNaturalLanguageForm);
                    if (showForm) setShowForm(false);
                    if (showNaturalLanguageForm) setNaturalLanguageInput("");
                  }}
                  className={`${showNaturalLanguageForm
                    ? "bg-white-600"
                    : "bg-purple-600 hover:bg-purple-700"
                    } text-white px-4 py-2 rounded-md flex items-center`}
                >
                  <FileText size={18} className="mr-2" />
                  {showNaturalLanguageForm ? "Cancel" : "Natural Language Input"}
                </button>
                {/* Botão de Nova Tarefa */}
                {(permissions.isOrgAdmin || permissions.canCreateTasks) && (
                  <button
                    onClick={() => {
                      resetForm();
                      setShowForm(!showForm);
                      if (showNaturalLanguageForm)
                        setShowNaturalLanguageForm(false);
                    }}
                    className={`${showForm ? "bg-white-600" : "bg-blue-600 hover:bg-blue-700"
                      } text-white px-4 py-2 rounded-md flex items-center`}
                  >
                    <Plus size={18} className="mr-2" />
                    {showForm ? "Cancel" : "New Task"}
                  </button>
                )}
              </div>
            </div>

            {/* Natural Language Form */}
            {showNaturalLanguageForm && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  Create Tasks Using Natural Language
                </h2>
                <form onSubmit={handleNaturalLanguageSubmit}>
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">
                      Describe Your Tasks
                    </label>
                    <textarea
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={naturalLanguageInput}
                      onChange={handleNaturalLanguageInputChange}
                      placeholder="Example: Deliver the IVA declaration for client ABC by Friday, review bank statements for XYZ with medium priority, and prepare payroll for DEF by the 10th."
                      rows={4}
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      The system will extract clients, deadlines, and priorities
                      from your text.
                    </p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2">
                      Default Client (if not specified in text)
                    </label>
                    <select
                      name="client"
                      value={formData.client}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Default Client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
                    >
                    </button>
                  </div>
                </form>
              </div>
            )}

            {selectedTaskForWorkflow && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Workflow da Tarefa: {selectedTaskForWorkflow.title}</h2>
                  <button
                    onClick={() => setSelectedTaskForWorkflow(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <TaskWorkflowView
                  taskId={selectedTaskForWorkflow.id}
                  onWorkflowUpdate={() => {
                    // Recarregar a lista de tarefas após atualização do workflow
                    refetch();
                  }}
                />
              </div>
            )}

            {/* Task Form */}
            {showForm && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  {selectedTask ? "Edit Task" : "Create New Task"}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 mb-2">Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Client *</label>
                      <select
                        name="client"
                        value={formData.client}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Select Client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Category</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">
                        Assigned To
                      </label>
                      <select
                        name="assigned_to"
                        value={formData.assigned_to}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Assignee</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.user}>
                            {user.username}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Priority</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">Deadline</label>
                      <input
                        type="date"
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 mb-2">
                        Estimated Time (minutes)
                      </label>
                      <input
                        type="number"
                        name="estimated_time_minutes"
                        value={formData.estimated_time_minutes}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        min="1"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Workflow</label>
                    <select
                      name="workflow"
                      value={formData.workflow || ""}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Selecionar Workflow (Opcional)</option>
                      {workflowDefinitions?.map((workflow) => (
                        <option key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="bg-white-500 hover:bg-white-600 text-white px-4 py-2 rounded-md mr-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"

                    >

                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <h2 className="text-lg font-semibold mb-4 md:mb-0">Filters</h2>
                <div className="w-full md:w-1/3 mb-4 md:mb-0">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tasks..."
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
                <button
                  onClick={resetFilters}
                  className="bg-white-500 hover:bg-white-600 text-white px-4 py-2 rounded-md"
                >
                  Reset Filters
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2 text-sm">
                    Status
                  </label>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Statuses</option>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm">
                    Client
                  </label>
                  <select
                    name="client"
                    value={filters.client}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Clients</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={filters.priority}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Priorities</option>
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm">
                    Assigned To
                  </label>
                  <select
                    name="assignedTo"
                    value={filters.assignedTo}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Assignees</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.user}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm">
                    Category
                  </label>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Task List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="text-xl font-semibold p-6 border-b">
                Tasks ({filteredAndSortedTasks.length})
              </h2>

              {filteredAndSortedTasks.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No tasks found. {searchTerm || Object.values(filters).some(val => val)
                    ? "Try adjusting your filters."
                    : "Create your first task!"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            className="flex items-center"
                            onClick={() => handleSort("title")}
                          >
                            Title
                            {sortConfig.key === "title" ? (
                              sortConfig.direction === "asc" ? (
                                <ChevronUp size={16} className="ml-1" />
                              ) : (
                                <ChevronDown size={16} className="ml-1" />
                              )
                            ) : (
                              <ChevronDown size={16} className="ml-1 opacity-30" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            className="flex items-center"
                            onClick={() => handleSort("client_name")}
                          >
                            Client
                            {sortConfig.key === "client_name" ? (
                              sortConfig.direction === "asc" ? (
                                <ChevronUp size={16} className="ml-1" />
                              ) : (
                                <ChevronDown size={16} className="ml-1" />
                              )
                            ) : (
                              <ChevronDown size={16} className="ml-1 opacity-30" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            className="flex items-center"
                            onClick={() => handleSort("priority")}
                          >
                            Priority
                            {sortConfig.key === "priority" ? (
                              sortConfig.direction === "asc" ? (
                                <ChevronUp size={16} className="ml-1" />
                              ) : (
                                <ChevronDown size={16} className="ml-1" />
                              )
                            ) : (
                              <ChevronDown size={16} className="ml-1 opacity-30" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            className="flex items-center"
                            onClick={() => handleSort("deadline")}
                          >
                            Deadline
                            {sortConfig.key === "deadline" ? (
                              sortConfig.direction === "asc" ? (
                                <ChevronUp size={16} className="ml-1" />
                              ) : (
                                <ChevronDown size={16} className="ml-1" />
                              )
                            ) : (
                              <ChevronDown size={16} className="ml-1 opacity-30" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            className="flex items-center"
                            onClick={() => handleSort("status")}
                          >
                            Status
                            {sortConfig.key === "status" ? (
                              sortConfig.direction === "asc" ? (
                                <ChevronUp size={16} className="ml-1" />
                              ) : (
                                <ChevronDown size={16} className="ml-1" />
                              )
                            ) : (
                              <ChevronDown size={16} className="ml-1 opacity-30" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned To
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-white-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-gray-500 text-sm truncate max-w-xs">
                                {task.description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {task.client_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityInfo(task.priority).color
                                }`}
                            >
                              {getPriorityInfo(task.priority).label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div
                              className={`flex items-center ${isOverdue(task.deadline) && task.status !== 'completed'
                                ? "text-red-600"
                                : ""
                                }`}
                            >
                              <Calendar
                                size={16}
                                className={`mr-2 ${isOverdue(task.deadline) && task.status !== 'completed'
                                  ? "text-red-600"
                                  : "text-gray-400"
                                  }`}
                              />
                              {formatDate(task.deadline)}
                              {isOverdue(task.deadline) && task.status !== 'completed' && (
                                <span className="ml-2 text-red-600">
                                  <AlertTriangle size={16} />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${task.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : task.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : task.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-white-100 text-gray-800"
                                }`}
                            >
                              {
                                STATUS_OPTIONS.find(
                                  (option) => option.value === task.status
                                )?.label
                              }
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User
                                size={16}
                                className="mr-2 text-gray-400"
                              />
                              {task.assigned_to_name || "Unassigned"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <div className="flex items-center space-x-2">
                              {task.status !== "completed" && (
                                <button
                                  onClick={() => updateTaskStatusHandler(task, "completed")}
                                  className="text-green-600 hover:text-green-900"
                                  title="Mark as completed"
                                >
                                  <CheckCircle size={18} />
                                </button>
                              )}
                              {task.status === "pending" && (
                                <button
                                  onClick={() => updateTaskStatusHandler(task, "in_progress")}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Mark as in progress"
                                >
                                  <Clock size={18} />
                                </button>
                              )}
                              <button
                                onClick={() => selectTaskForEdit(task)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleViewWorkflow(task)}
                                className="text-purple-600 hover:text-purple-900 mr-2"
                                title="Ver workflow"
                              >
                                <Settings size={18} />
                              </button>
                              <button
                                onClick={() => confirmDelete(task.id)}
                                className="text-red-600 hover:text-red-900"
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
          </div>

        </div>
      </Header>
    </div>
  );
};

export default TaskManagement;
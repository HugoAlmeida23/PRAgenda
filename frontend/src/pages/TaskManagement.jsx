import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Header from "../components/Header";
import api from "../api";
import "../styles/Home.css";
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
  Tag,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const TaskManagement = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showNaturalLanguageForm, setShowNaturalLanguageForm] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "deadline",
    direction: "asc",
  });
  const [filters, setFilters] = useState({
    status: "",
    client: "",
    priority: "",
    assignedTo: "",
    category: "",
  });
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    client: "",
    category: "",
    assigned_to: "",
    status: "pending",
    priority: 3,
    deadline: "",
    estimated_time_minutes: "",
  });

  const STATUS_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const PRIORITY_OPTIONS = [
    { value: 1, label: "Urgent", color: "bg-red-100 text-red-800" },
    { value: 2, label: "High", color: "bg-orange-100 text-orange-800" },
    { value: 3, label: "Medium", color: "bg-yellow-100 text-yellow-800" },
    { value: 4, label: "Low", color: "bg-blue-100 text-blue-800" },
    { value: 5, label: "Can Wait", color: "bg-gray-100 text-gray-800" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      applyFiltersAndSort();
    }
  }, [searchTerm, filters, sortConfig, tasks]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch tasks
      const tasksResponse = await api.get("/tasks/");
      setTasks(tasksResponse.data);
      setFilteredTasks(tasksResponse.data);

      // Fetch clients for dropdown
      const clientsResponse = await api.get("/clients/");
      setClients(clientsResponse.data);

      // Fetch users for dropdown
      const usersResponse = await api.get("/profiles/");
      setUsers(usersResponse.data);

      // Fetch categories for dropdown
      const categoriesResponse = await api.get("/task-categories/");
      setCategories(categoriesResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load task data");
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...tasks];

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(term) ||
          (task.description && task.description.toLowerCase().includes(term))
      );
    }

    // Apply filters
    if (filters.status) {
      result = result.filter((task) => task.status === filters.status);
    }
    if (filters.client) {
      result = result.filter((task) => task.client === filters.client);
    }
    if (filters.priority) {
      result = result.filter(
        (task) => task.priority === parseInt(filters.priority)
      );
    }
    if (filters.assignedTo) {
      result = result.filter((task) => task.assigned_to === filters.assignedTo);
    }
    if (filters.category) {
      result = result.filter((task) => task.category === filters.category);
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] === null) return 1;
        if (b[sortConfig.key] === null) return -1;
        
        if (sortConfig.key === "deadline") {
          // For deadline, we need to convert to Date objects
          const dateA = a.deadline ? new Date(a.deadline) : null;
          const dateB = b.deadline ? new Date(b.deadline) : null;
          
          if (!dateA) return 1;
          if (!dateB) return -1;
          
          return sortConfig.direction === "asc" 
            ? dateA - dateB 
            : dateB - dateA;
        }
        
        // For other fields, compare directly
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredTasks(result);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === "number" ? (value ? parseInt(value) : "") : value,
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleNaturalLanguageInputChange = (e) => {
    setNaturalLanguageInput(e.target.value);
  };

  const handleNaturalLanguageSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // In a real implementation, this would call your NLPProcessor backend
      // For now, we'll create a simple task based on the text
      
      // Extract dates using a simple regex - this is a placeholder for real NLP
      const deadlineMatch = naturalLanguageInput.match(/(by|until|before|till)\s(\d{1,2}(st|nd|rd|th)?\s\w+|\w+\s\d{1,2}(st|nd|rd|th)?|\d{4}-\d{2}-\d{2})/i);
      
      // Extract priority based on keywords
      let priority = 3; // Default is medium
      if (naturalLanguageInput.toLowerCase().includes("urgent")) {
        priority = 1;
      } else if (naturalLanguageInput.toLowerCase().includes("high priority")) {
        priority = 2;
      } else if (naturalLanguageInput.toLowerCase().includes("low priority")) {
        priority = 4;
      }
      
      // Extract client based on client list (very simplified)
      let clientId = null;
      for (const client of clients) {
        if (naturalLanguageInput.toLowerCase().includes(client.name.toLowerCase())) {
          clientId = client.id;
          break;
        }
      }
      
      // Create a simple task with extracted information
      const response = await api.post("/tasks/", {
        title: naturalLanguageInput.split(".")[0], // Use first sentence as title
        description: naturalLanguageInput,
        client: clientId || formData.client, // Use matched client or selected default
        status: "pending",
        priority: priority,
        deadline: deadlineMatch ? new Date().toISOString() : null // Just a placeholder
      });

      toast.success("Task created from natural language input");
      setNaturalLanguageInput("");
      setShowNaturalLanguageForm(false);
      await fetchData();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task from text");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (selectedTask) {
        // Update existing task
        await api.put(`/tasks/${selectedTask.id}/`, formData);
        toast.success("Task updated successfully");
      } else {
        // Create new task
        await api.post("/tasks/", formData);
        toast.success("Task created successfully");
      }

      // Reset form and refresh data
      resetForm();
      await fetchData();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const selectTaskForEdit = (task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      client: task.client || "",
      category: task.category || "",
      assigned_to: task.assigned_to || "",
      status: task.status || "pending",
      priority: task.priority || 3,
      deadline: task.deadline ? task.deadline.split("T")[0] : "",
      estimated_time_minutes: task.estimated_time_minutes || "",
    });
    setShowForm(true);
    setShowNaturalLanguageForm(false);
  };

  const confirmDelete = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await api.delete(`/tasks/${taskId}/`);
        toast.success("Task deleted successfully");
        await fetchData();
      } catch (error) {
        console.error("Error deleting task:", error);
        toast.error("Failed to delete task");
      }
    }
  };

  const resetForm = () => {
    setSelectedTask(null);
    setFormData({
      title: "",
      description: "",
      client: "",
      category: "",
      assigned_to: "",
      status: "pending",
      priority: 3,
      deadline: "",
      estimated_time_minutes: "",
    });
    setShowForm(false);
  };

  const updateTaskStatus = async (task, newStatus) => {
    try {
      await api.patch(`/tasks/${task.id}/`, {
        status: newStatus,
      });
      toast.success(`Task marked as ${newStatus}`);
      await fetchData();
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    }
  };

  const resetFilters = () => {
    setFilters({
      status: "",
      client: "",
      priority: "",
      assignedTo: "",
      category: "",
    });
    setSearchTerm("");
  };

  // Format date to display
  const formatDate = (dateString) => {
    if (!dateString) return "No deadline";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Check if a deadline is passed
  const isOverdue = (deadline) => {
    if (!deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(deadline);
    return taskDate < today;
  };

  // Get the priority label and color
  const getPriorityInfo = (priorityValue) => {
    const priorityOption = PRIORITY_OPTIONS.find(
      (option) => option.value === priorityValue
    );
    return priorityOption || PRIORITY_OPTIONS[2]; // Default to Medium if not found
  };

  return (
    <div className="main">
      <Header>
      <div
        className="p-6 bg-gray-100 min-h-screen"
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
                className={`${
                  showNaturalLanguageForm
                    ? "bg-gray-600"
                    : "bg-purple-600 hover:bg-purple-700"
                } text-white px-4 py-2 rounded-md flex items-center`}
              >
                <FileText size={18} className="mr-2" />
                {showNaturalLanguageForm ? "Cancel" : "Natural Language Input"}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(!showForm);
                  if (showNaturalLanguageForm)
                    setShowNaturalLanguageForm(false);
                }}
                className={`${
                  showForm ? "bg-gray-600" : "bg-blue-600 hover:bg-blue-700"
                } text-white px-4 py-2 rounded-md flex items-center`}
              >
                <Plus size={18} className="mr-2" />
                {showForm ? "Cancel" : "New Task"}
              </button>
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
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Process Text"}
                  </button>
                </div>
              </form>
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

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md mr-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                    disabled={loading}
                  >
                    {loading
                      ? "Saving..."
                      : selectedTask
                      ? "Update Task"
                      : "Create Task"}
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
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
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
              Tasks ({filteredTasks.length})
            </h2>

            {loading ? (
              <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No tasks found. {searchTerm || Object.values(filters).some(val => val)
                  ? "Try adjusting your filters."
                  : "Create your first task!"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
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
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
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
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              getPriorityInfo(task.priority).color
                            }`}
                          >
                            {getPriorityInfo(task.priority).label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div
                            className={`flex items-center ${
                              isOverdue(task.deadline) && task.status !== 'completed'
                                ? "text-red-600"
                                : ""
                            }`}
                          >
                            <Calendar
                              size={16}
                              className={`mr-2 ${
                                isOverdue(task.deadline) && task.status !== 'completed'
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
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              task.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : task.status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : task.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
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
                                onClick={() => updateTaskStatus(task, "completed")}
                                className="text-green-600 hover:text-green-900"
                                title="Mark as completed"
                              >
                                <CheckCircle size={18} />
                              </button>
                            )}
                            {task.status === "pending" && (
                              <button
                                onClick={() => updateTaskStatus(task, "in_progress")}
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
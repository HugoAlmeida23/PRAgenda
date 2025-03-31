import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Header from "../components/Header";
import api from "../api";
import "../styles/Home.css";
import { Clock, Calendar, Search, Plus, Filter } from "lucide-react";
import AutoTimeTracking from "../components/AutoTimeTracking";

const TimeEntry = () => {
  const [loading, setLoading] = useState(true);
  const [timeEntries, setTimeEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [taskCategories, setTaskCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [formData, setFormData] = useState({
    client: "",
    task: "",
    category: "",
    description: "",
    minutes_spent: 0,
    date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    original_text: "",
  });
  const [isNaturalLanguageMode, setIsNaturalLanguageMode] = useState(false);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showAutoTracking, setShowAutoTracking] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    client: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch time entries
      const entriesResponse = await api.get("/time-entries/");
      setTimeEntries(entriesResponse.data);
      
      // Fetch clients for dropdown
      const clientsResponse = await api.get("/clients/");
      setClients(clientsResponse.data);
      
      // Fetch task categories for dropdown
      const categoriesResponse = await api.get("/task-categories/");
      setTaskCategories(categoriesResponse.data);
      
      // Fetch tasks for dropdown
      const tasksResponse = await api.get("/tasks/");
      setTasks(tasksResponse.data);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleNaturalLanguageInputChange = (e) => {
    setNaturalLanguageInput(e.target.value);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      let url = "/time-entries/?";
      
      if (filters.startDate && filters.endDate) {
        url += `start_date=${filters.startDate}&end_date=${filters.endDate}`;
      }
      
      if (filters.client) {
        url += `&client=${filters.client}`;
      }
      
      const response = await api.get(url);
      setTimeEntries(response.data);
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error("Failed to filter time entries");
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      client: "",
    });
    fetchData();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (isNaturalLanguageMode) {
        if (!naturalLanguageInput) {
          toast.error("Please enter a description of your activity");
          return;
        }
        
        if (!formData.client) {
          toast.error("Please select a client");
          return;
        }
        
        // Format times properly if provided
        let timeData = {};
        if (formData.start_time) {
          // Ensure time is in the correct format (HH:MM:SS)
          const formattedStartTime = formatTimeForAPI(formData.start_time);
          timeData.start_time = formattedStartTime;
        }
        
        if (formData.end_time) {
          const formattedEndTime = formatTimeForAPI(formData.end_time);
          timeData.end_time = formattedEndTime;
        }
        
        // In a real implementation, you would send this to your NLP processor
        // For now, we'll create a basic time entry with the provided text
        const response = await api.post("/time-entries/", {
          client: formData.client,
          description: naturalLanguageInput,
          minutes_spent: 60, // Default or estimate from text in real implementation
          date: formData.date,
          original_text: naturalLanguageInput,
          ...timeData
        });
        
        toast.success("Time entry created from natural language input");
      } else {
        // Validate required fields
        if (!formData.client || !formData.description || !formData.minutes_spent) {
          toast.error("Please fill in all required fields");
          return;
        }
        
        // Format times properly if provided
        if (formData.start_time) {
          formData.start_time = formatTimeForAPI(formData.start_time);
        }
        
        if (formData.end_time) {
          formData.end_time = formatTimeForAPI(formData.end_time);
        }
        
        // Regular form submission
        const response = await api.post("/time-entries/", formData);
        toast.success("Time entry created successfully");
      }
      
      // Reset form and refresh data
      setFormData({
        client: "",
        task: "",
        category: "",
        description: "",
        minutes_spent: 0,
        date: new Date().toISOString().split("T")[0],
        start_time: "",
        end_time: "",
        original_text: "",
      });
      setNaturalLanguageInput("");
      setShowForm(false);
      await fetchData();
      
    } catch (error) {
      console.error("Error submitting time entry:", error);
      // More detailed error logging
      if (error.response) {
        console.error("Response data:", error.response.data);
        const errorMessages = [];
        
        // Format error messages for user
        for (const field in error.response.data) {
          const messages = error.response.data[field].join(', ');
          errorMessages.push(`${field}: ${messages}`);
        }
        
        if (errorMessages.length > 0) {
          toast.error(`Failed to create time entry: ${errorMessages.join('; ')}`);
        } else {
          toast.error("Failed to create time entry");
        }
      } else {
        toast.error("Failed to create time entry");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to format time for API
  const formatTimeForAPI = (timeString) => {
    // If the time is already in the correct format (HH:MM:SS), return it
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // If it's in HH:MM format, add seconds
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return `${timeString}:00`;
    }
    
    // Try to parse the input and format it correctly
    try {
      // For inputs like "9:30", convert to "09:30:00"
      const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    } catch (e) {
      console.error("Error formatting time:", e);
      return timeString; // Return original and let the API handle the error
    }
  };

  // Helper to format minutes as hours and minutes
  const formatMinutes = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleDeleteEntry = async (entryId) => {
    if (window.confirm("Are you sure you want to delete this time entry?")) {
      try {
        setLoading(true);
        await api.delete(`/time-entries/${entryId}/`);
        toast.success("Time entry deleted successfully");
        await fetchData();
      } catch (error) {
        console.error("Error deleting time entry:", error);
        toast.error("Failed to delete time entry");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="main">
      <Header>
      <div className="p-6 bg-gray-100 min-h-screen" style={{ marginLeft: "3%" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Time Entries</h1>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAutoTracking(!showAutoTracking);
                  if (showForm) setShowForm(false);
                }}
                className={`${showAutoTracking ? "bg-gray-600" : "bg-indigo-600 hover:bg-indigo-700"} text-white px-4 py-2 rounded-md flex items-center`}
              >
                <Clock size={18} className="mr-2" />
                {showAutoTracking ? "Hide Auto Tracking" : "Auto Tracking"}
              </button>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  if (showAutoTracking) setShowAutoTracking(false);
                }}
                className={`${showForm ? "bg-gray-600" : "bg-blue-600 hover:bg-blue-700"} text-white px-4 py-2 rounded-md flex items-center`}
              >
                <Plus size={18} className="mr-2" />
                {showForm ? "Cancel" : "Manual Entry"}
              </button>
            </div>
          </div>

          {/* Auto Time Tracking Component */}
          {showAutoTracking && (
            <div className="mb-6">
              <AutoTimeTracking onTimeEntryCreated={fetchData} />
            </div>
          )}

          {/* Manual Entry Form */}
          {showForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Record Time Manually</h2>
                <div className="flex items-center">
                  <span className="mr-2">Natural Language</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={isNaturalLanguageMode}
                      onChange={() => setIsNaturalLanguageMode(!isNaturalLanguageMode)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {isNaturalLanguageMode ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-gray-700 mb-2">Client</label>
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
                    
                    <div className="mb-4">
                      <label className="block text-gray-700 mb-2">
                        Describe your activity
                      </label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={naturalLanguageInput}
                        onChange={handleNaturalLanguageInputChange}
                        placeholder="Example: Spent 2 hours on tax declaration for client ABC and 30 minutes in a meeting with XYZ"
                        rows={3}
                        required
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        The system will extract the time spent and categorize your activity.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Date</label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Client</label>
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
                        <label className="block text-gray-700 mb-2">Task</label>
                        <select
                          name="task"
                          value={formData.task}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select Task (Optional)</option>
                          {tasks
                            .filter(task => !formData.client || task.client === formData.client)
                            .map((task) => (
                              <option key={task.id} value={task.id}>
                                {task.title}
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
                          <option value="">Select Category (Optional)</option>
                          {taskCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">Date</label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">
                          Minutes Spent
                        </label>
                        <input
                          type="number"
                          name="minutes_spent"
                          value={formData.minutes_spent}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                          min="1"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-700 mb-2">
                            Start Time (Optional)
                          </label>
                          <input
                            type="time"
                            name="start_time"
                            value={formData.start_time}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 mb-2">
                            End Time (Optional)
                          </label>
                          <input
                            type="time"
                            name="end_time"
                            value={formData.end_time}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
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
                          rows={2}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Time Entry"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Client</label>
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

              <div className="flex items-end space-x-2">
                <button
                  onClick={applyFilters}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                >
                  <Filter size={18} className="mr-2" />
                  Apply Filters
                </button>
                <button
                  onClick={resetFilters}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h2 className="text-xl font-semibold p-6 border-b">Time Entry Records</h2>
            
            {loading ? (
              <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : timeEntries.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No time entries found. Create your first one!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timeEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar size={16} className="mr-2 text-gray-400" />
                            {entry.date}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.client_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.task_title || (
                            <span className="text-gray-400">No task</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs truncate">{entry.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Clock size={16} className="mr-2 text-gray-400" />
                            {formatMinutes(entry.minutes_spent)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
                            Delete
                          </button>
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

export default TimeEntry;
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Clock, Play, Square, CheckCircle, AlertTriangle } from "lucide-react";
import api from "../api";

const AutoTimeTracking = ({ onTimeEntryCreated }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [suggestedData, setSuggestedData] = useState({
    client: "",
    task: "",
    category: "",
    description: "",
  });
  const [clients, setClients] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const intervalRef = useRef(null);
  const activityDataRef = useRef([]);

  useEffect(() => {
    fetchDropdownData();
    
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const fetchDropdownData = async () => {
    try {
      const clientsResponse = await api.get("/clients/");
      setClients(clientsResponse.data);
      
      const tasksResponse = await api.get("/tasks/");
      setTasks(tasksResponse.data);
      
      const categoriesResponse = await api.get("/task-categories/");
      setCategories(categoriesResponse.data);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
      toast.error("Failed to load data for time tracking");
    }
  };

  const startTracking = async () => {
    try {
      setLoading(true);
      
      // Create AutoTimeTracking record
      const response = await api.post("/auto-time-tracking/", {
        start_time: new Date().toISOString(),
        activity_data: JSON.stringify([]),
        processed: false
      });
      
      setTrackingData(response.data);
      setIsTracking(true);
      
      // Start timer for UI
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        
        // Collect activity data (in a real implementation, this would track actual user activity)
        const activitySample = {
          timestamp: new Date().toISOString(),
          active_window: "Accounting System",
          keyboard_activity: Math.random() > 0.7, // Simulated activity
          mouse_activity: Math.random() > 0.5, // Simulated activity
        };
        
        activityDataRef.current.push(activitySample);
      }, 1000);
      
    } catch (error) {
      console.error("Error starting time tracking:", error);
      toast.error("Failed to start time tracking");
    } finally {
      setLoading(false);
    }
  };

  const stopTracking = async () => {
    try {
      setLoading(true);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      if (trackingData && trackingData.id) {
        // Update the AutoTimeTracking record
        await api.patch(`/auto-time-tracking/${trackingData.id}/`, {
          end_time: new Date().toISOString(),
          activity_data: JSON.stringify(activityDataRef.current)
        });
        
        // In a real implementation, this would call the NLPProcessor API
        // For demo purposes, we'll simulate it with a delay
        setTimeout(() => {
          analyzeSuggestedValues();
          setShowConfirmation(true);
        }, 1000);
      }
      
    } catch (error) {
      console.error("Error stopping time tracking:", error);
      toast.error("Failed to stop time tracking");
      setIsTracking(false);
    } finally {
      setLoading(false);
    }
  };

  const analyzeSuggestedValues = () => {
    // Simulate NLP analysis based on activity data
    // In a real implementation, this would come from the backend NLPProcessor
    
    // Find a random client (for demo purposes)
    const randomClient = clients[Math.floor(Math.random() * clients.length)];
    
    // Find tasks for this client (or a random one if none)
    const clientTasks = tasks.filter(task => task.client === randomClient?.id) || [];
    const suggestedTask = clientTasks.length > 0 
      ? clientTasks[Math.floor(Math.random() * clientTasks.length)]
      : null;
    
    // Pick a random category
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    // Create a description based on activity
    const descriptions = [
      "Client document review",
      "Financial statement preparation",
      "Tax declaration processing",
      "Expense categorization",
      "Client meeting preparation"
    ];
    
    setSuggestedData({
      client: randomClient?.id || "",
      client_name: randomClient?.name || "",
      task: suggestedTask?.id || "",
      task_title: suggestedTask?.title || "",
      category: randomCategory?.id || "",
      category_name: randomCategory?.name || "",
      description: descriptions[Math.floor(Math.random() * descriptions.length)]
    });
  };

  const confirmTimeEntry = async () => {
    try {
      setLoading(true);
      
      if (!suggestedData.client) {
        toast.error("Please select a client for this time entry");
        return;
      }
      
      // Create the TimeEntry
      const entryData = {
        client: suggestedData.client,
        task: suggestedData.task || null,
        category: suggestedData.category || null,
        description: suggestedData.description,
        minutes_spent: Math.ceil(elapsedTime / 60), // Convert seconds to minutes
        date: new Date().toISOString().split("T")[0],
        original_text: `Auto-tracked: ${suggestedData.description}`
      };
      
      const response = await api.post("/time-entries/", entryData);
      
      // Mark AutoTimeTracking as processed
      if (trackingData && trackingData.id) {
        await api.patch(`/auto-time-tracking/${trackingData.id}/`, {
          processed: true,
          converted_to_entries: JSON.stringify([response.data.id])
        });
      }
      
      toast.success("Time entry created from tracking data");
      
      // Reset state
      setIsTracking(false);
      setTrackingData(null);
      setElapsedTime(0);
      setSuggestedData({
        client: "",
        task: "",
        category: "",
        description: "",
      });
      setShowConfirmation(false);
      activityDataRef.current = [];
      
      // Notify parent component
      if (onTimeEntryCreated) {
        onTimeEntryCreated();
      }
      
    } catch (error) {
      console.error("Error creating time entry:", error);
      toast.error("Failed to create time entry from tracking data");
      if (error.response) {
        console.error("Response data:", error.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSuggestedData({
      ...suggestedData,
      [name]: value
    });
  };

  // Format seconds to MM:SS display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <Clock size={20} className="mr-2 text-blue-600" />
        Automatic Time Tracking
      </h2>
      
      {!isTracking && !showConfirmation ? (
        <div className="text-center">
          <p className="mb-3 text-gray-700">
            Start tracking your work time automatically. The system will analyze your activity and suggest time entries.
          </p>
          <button
            onClick={startTracking}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md flex items-center mx-auto"
          >
            <Play size={18} className="mr-2" />
            Start Tracking
          </button>
        </div>
      ) : showConfirmation ? (
        <div>
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-700 mb-2">Suggested Time Entry</h3>
            <p className="text-sm mb-1">
              <span className="font-medium">Time tracked:</span> {formatTime(elapsedTime)} ({Math.ceil(elapsedTime / 60)} minutes)
            </p>
            <p className="text-sm mb-1">
              <span className="font-medium">Client:</span> {suggestedData.client_name || "None"}
            </p>
            {suggestedData.task_title && (
              <p className="text-sm mb-1">
                <span className="font-medium">Task:</span> {suggestedData.task_title}
              </p>
            )}
            {suggestedData.category_name && (
              <p className="text-sm mb-1">
                <span className="font-medium">Category:</span> {suggestedData.category_name}
              </p>
            )}
            <p className="text-sm">
              <span className="font-medium">Description:</span> {suggestedData.description}
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 text-sm font-medium">
              Edit Description (if needed)
            </label>
            <textarea
              name="description"
              value={suggestedData.description}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Client
              </label>
              <select
                name="client"
                value={suggestedData.client}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
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
              <label className="block text-gray-700 mb-2 text-sm font-medium">
                Task (Optional)
              </label>
              <select
                name="task"
                value={suggestedData.task}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select Task</option>
                {tasks
                  .filter(task => !suggestedData.client || task.client === suggestedData.client)
                  .map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowConfirmation(false);
                setIsTracking(false);
                setTrackingData(null);
                setElapsedTime(0);
                activityDataRef.current = [];
              }}
              className="bg-white-500 hover:bg-white-600 text-white px-4 py-2 rounded-md text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={confirmTimeEntry}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center text-sm"
              disabled={loading}
            >
              <CheckCircle size={16} className="mr-2" />
              Confirm Time Entry
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm text-gray-500">Tracking time:</span>
              <div className="text-2xl font-mono font-bold">{formatTime(elapsedTime)}</div>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm font-medium">Recording Activity</span>
            </div>
          </div>
          
          <p className="text-sm mb-3 text-gray-600">
            The system is tracking your work activity. When you stop tracking, the AI will suggest
            a time entry based on your activity pattern.
          </p>
          
          <button
            onClick={stopTracking}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Square size={16} className="mr-2" />
            Stop Tracking
          </button>
        </div>
      )}
    </div>
  );
};

export default AutoTimeTracking;    
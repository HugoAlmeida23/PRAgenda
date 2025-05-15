import React from 'react';
import Home from './Home';
import LimitedDashboard from './LimitedDashboard';
import Header from '../components/Header';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { Loader2 } from 'lucide-react';

// Define fetchDashboardPermissions function
const fetchDashboardPermissions = async () => {
  // You might need to call a specific endpoint to check permissions
  // For now, we'll use the fetchDashboardData function to both get data and permissions
  return fetchDashboardData();
};

const fetchDashboardData = async () => {
  // --- Date calculations ---
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split("T")[0];
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  // --- Fetch data in parallel ---
  const [
    tasksPendingResponse,
    tasksInProgressResponse,
    clientsResponse,
    timeEntriesResponse,
    profitabilityResponse,
    completedTasksResponse,
  ] = await Promise.all([
    api.get("/tasks/?status=pending"),
    api.get("/tasks/?status=in_progress"),
    api.get("/clients/?is_active=true"),
    api.get(
      `/time-entries/?start_date=${sevenDaysAgoStr}&end_date=${todayStr}`
    ),
    api.get("/client-profitability/?is_profitable=false"),
    api.get(`/tasks/?status=completed&completed_after=${sevenDaysAgoISO}`),
  ]);

  // --- Process fetched data ---
  const tasks = [...tasksPendingResponse.data, ...tasksInProgressResponse.data];
  const clients = clientsResponse.data;
  const timeEntries = timeEntriesResponse.data;
  const unprofitableClients = profitabilityResponse.data;
  const completedTasks = completedTasksResponse.data;

  // --- Process tasks ---
  let overdueTasks = [];
  let todayTasks = [];
  let thisWeekTasks = [];
  let upcomingTasks = [];

  tasks.forEach((task) => {
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      const deadlineStr = task.deadline.split("T")[0];

      if (deadlineStr < todayStr) {
        overdueTasks.push(task);
      } else if (deadlineStr === todayStr) {
        todayTasks.push(task);
        upcomingTasks.push(task);
      } else {
        upcomingTasks.push(task);
        if (deadlineDate <= thisWeekEnd) {
          thisWeekTasks.push(task);
        }
      }
    }
  });

  upcomingTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const nextFiveUpcomingTasks = upcomingTasks.slice(0, 5);

  // --- Process Time Entries ---
  const recentTimeEntries = [...timeEntries]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const todayTimeEntries = timeEntries.filter(
    (entry) => entry.date === todayStr
  );
  const timeTrackedToday = todayTimeEntries.reduce(
    (total, entry) => total + (entry.minutes_spent || 0),
    0
  );

  const timeTrackedThisWeek = timeEntries.reduce(
    (total, entry) => total + (entry.minutes_spent || 0),
    0
  );

  // --- Compile Stats ---
  const stats = {
    activeTasks: tasks.length,
    activeClients: clients.length,
    overdueTasksCount: overdueTasks.length,
    todayTasksCount: todayTasks.length,
    thisWeekTasksCount: thisWeekTasks.length,
    recentTimeEntries,
    upcomingTasks: nextFiveUpcomingTasks,
    unprofitableClientsCount: unprofitableClients.length,
    timeTrackedToday,
    timeTrackedThisWeek,
    tasksCompletedThisWeek: completedTasks.length,
    overdueTasksList: overdueTasks,
    todayTasksList: todayTasks,
    // Add a permission flag (modify as needed based on your actual permission logic)
    has_full_access: true  // Or implement actual permission logic
  };

  console.log("Dashboard Stats:", stats);
  return stats; // Return the processed data with permissions
};

const DashboardRouter = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboardPermissions'],
    queryFn: fetchDashboardPermissions, // Now this function is defined
    staleTime: 5 * 60 * 1000,
  });

  // Somente para estados de loading e error, aplicamos o Header aqui
  if (isLoading) {
    return (
      <div className="bg-white main">
        <Header>
          <div className="bg-white flex justify-center items-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        </Header>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="bg-white main">
        <Header>
          <div className="bg-white flex justify-center items-center min-h-screen">
            <div className="text-red-500">Error loading dashboard data</div>
          </div>
        </Header>
      </div>
    );
  }
  
  // Quando dados são carregados, delegamos para os componentes completos
  return data.has_full_access 
    ? <Home dashboardData={data} /> 
    : <LimitedDashboard dashboardData={data} />;
};

export default DashboardRouter;
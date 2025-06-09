import React from 'react';
import HomePage from './HomePage';
// import LimitedDashboard from './LimitedDashboard'; // Not currently used, can be removed if intended
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { Loader2 } from 'lucide-react';

const fetchDashboardData = async () => {
  // Step 1: Fetch the core summary data first. This is necessary to get user permissions.
  const summaryResponse = await api.get("/dashboard-summary/");
  const dashboardSummary = summaryResponse.data;
  console.log("📄 Raw /dashboard-summary/ response:", JSON.stringify(dashboardSummary, null, 2));

  const userPermissions = dashboardSummary.permissions || {};
  const canViewAnyTasks = userPermissions.can_view_all_tasks || userPermissions.can_edit_assigned_tasks;
  const canViewAnyTime = userPermissions.can_view_team_time || userPermissions.can_edit_own_time;

  // Prepare date strings needed for API calls
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  const todayStr = today.toISOString().split("T")[0];
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  // Step 2: Create an array of promises for the secondary data fetches.
  const dataPromises = [];

  // If the user can view tasks, add the tasks API call to the promises array.
  if (canViewAnyTasks) {
    dataPromises.push(
      api.get("/tasks/?status=pending,in_progress")
        .catch(error => {
          console.error("Error fetching tasks for dashboard:", error);
          return { data: [] }; // On failure, return a default value to not break Promise.all
        })
    );
  } else {
    dataPromises.push(Promise.resolve({ data: [] })); // If no permission, push a resolved promise.
  }

  // If the user can view time entries, add the time entries API call to the promises array.
  if (canViewAnyTime) {
    dataPromises.push(
      api.get(`/time-entries/?start_date=${sevenDaysAgoStr}&end_date=${todayStr}`)
        .catch(error => {
          console.error("Error fetching time entries for dashboard:", error);
          return { data: [] }; // On failure, return a default value.
        })
    );
  } else {
    dataPromises.push(Promise.resolve({ data: [] })); // If no permission, push a resolved promise.
  }

  // Step 3: Execute the secondary fetches in parallel and wait for them all to complete.
  const [tasksResult, timeEntriesResult] = await Promise.all(dataPromises);
  
  const tasks = tasksResult.data || [];
  const timeEntries = timeEntriesResult.data || [];

  // Step 4: Process the fetched data. This logic runs after the parallel fetches are complete.
  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(today.getDate() + (6 - today.getDay()));

  let overdueTasksList = [];
  let todayTasksList = [];
  let thisWeekTasksList = [];
  let upcomingTasksRaw = [];

  tasks.forEach((task) => {
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline.split("T")[0]);
      const normalizedToday = new Date(todayStr);

      if (deadlineDate < normalizedToday && task.status !== 'completed' && task.status !== 'cancelled') {
        overdueTasksList.push(task);
      } else if (deadlineDate.getTime() === normalizedToday.getTime() && task.status !== 'completed' && task.status !== 'cancelled') {
        todayTasksList.push(task);
        upcomingTasksRaw.push(task);
      } else if (deadlineDate > normalizedToday && task.status !== 'completed' && task.status !== 'cancelled') {
        upcomingTasksRaw.push(task);
        if (deadlineDate <= thisWeekEnd) {
          thisWeekTasksList.push(task);
        }
      }
    }
  });

  upcomingTasksRaw.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const nextFiveUpcomingTasks = upcomingTasksRaw.slice(0, 5);

  const recentTimeEntries = [...timeEntries]
    .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
    .slice(0, 5);
  
  // Step 5: Compile the final data object for the component.
  const processedData = {
    permissions: userPermissions,
    active_tasks: dashboardSummary.active_tasks || 0,
    active_clients: dashboardSummary.active_clients || 0,
    overdue_tasks: dashboardSummary.overdue_tasks || 0,
    today_tasks: dashboardSummary.today_tasks || 0,
    unprofitable_clients: userPermissions.can_view_profitability ? (dashboardSummary.unprofitable_clients || 0) : 0,
    time_tracked_today: dashboardSummary.time_tracked_today || 0,
    time_tracked_week: dashboardSummary.time_tracked_week || 0,
    completed_tasks_week: dashboardSummary.completed_tasks_week || 0,
    total_revenue: dashboardSummary.total_revenue || 0,
    total_cost: dashboardSummary.total_cost || 0,
    average_profit_margin: dashboardSummary.average_profit_margin || 0,
    active_workflows: dashboardSummary.active_workflows || 0,
    tasks_with_workflows: dashboardSummary.tasks_with_workflows || 0,
    tasks_needing_approval: dashboardSummary.tasks_needing_approval || 0,
    recent_time_entries: recentTimeEntries,
    upcoming_tasks_list: nextFiveUpcomingTasks,
    overdue_tasks_list: overdueTasksList,
    today_tasks_list: todayTasksList,
    this_week_tasks_count: thisWeekTasksList.length,
  };

  console.log("✅ DashboardRouter final processed data:", JSON.stringify(processedData, null, 2));
  return processedData;
};

const DashboardRouter = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,   
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });

  if (isLoading) {
    return (
      <div className="p-4 min-h-screen flex items-center justify-center" style={{width: '100%', height: 'calc(100vh - 80px)'}}>
        <div className="text-center text-white">
          <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-300">Carregando dados da dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="p-4 min-h-screen flex items-center justify-center" style={{width: '100%', height: 'calc(100vh - 80px)'}}>
        <div className="text-center text-red-400 bg-red-900_alpha_0.2 p-6 rounded-lg">
          <p className="font-semibold">Erro ao carregar dados da dashboard:</p>
          <p>{error?.response?.data?.error || error?.message || 'Erro desconhecido.'}</p>
          <p className="text-sm text-gray-500 mt-2">Por favor, tente recarregar a página ou contacte o suporte.</p>
        </div>
      </div>
    );
  }
  
  return <HomePage dashboardData={data} />;
};

export default DashboardRouter;
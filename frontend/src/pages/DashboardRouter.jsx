import React from 'react';
import HomePage from './HomePage';
// import LimitedDashboard from './LimitedDashboard'; // Not currently used, can be removed if intended
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { Loader2 } from 'lucide-react';

const fetchDashboardData = async () => {
  const response = await api.get("/dashboard-summary/");
  const dashboardSummary = response.data; // This now has a 'permissions' key
  
  console.log("📄 Raw /dashboard-summary/ response:", JSON.stringify(dashboardSummary, null, 2));

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thisWeekEnd = new Date(today); // Defines end of current week for 'thisWeekTasks'
  thisWeekEnd.setDate(today.getDate() + (6 - today.getDay())); // Assuming Sunday is 0, Saturday is 6

  const todayStr = today.toISOString().split("T")[0];
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
  
  // Fetch complementary data for detailed lists only if user has basic task viewing permissions
  let tasks = [];
  let timeEntries = [];

  // Use permission flags from the dashboardSummary.permissions object
  const userPermissions = dashboardSummary.permissions || {};
  const canViewAnyTasks = userPermissions.can_view_all_tasks || userPermissions.can_edit_assigned_tasks; // Or a more general task viewing perm
  const canViewAnyTime = userPermissions.can_view_team_time || userPermissions.can_edit_own_time; // Or a more general time viewing perm

  if (canViewAnyTasks) {
    try {
      const tasksResponse = await api.get("/tasks/?status=pending,in_progress"); // Fetch only relevant tasks
      tasks = tasksResponse.data || [];
    } catch (error) {
      console.error("Error fetching tasks for dashboard:", error);
      tasks = [];
    }
  }

  if (canViewAnyTime) {
    try {
      const timeEntriesResponse = await api.get(`/time-entries/?start_date=${sevenDaysAgoStr}&end_date=${todayStr}`);
      timeEntries = timeEntriesResponse.data || [];
    } catch (error) {
      console.error("Error fetching time entries for dashboard:", error);
      timeEntries = [];
    }
  }


  // Process tasks
  let overdueTasksList = [];
  let todayTasksList = [];
  let thisWeekTasksList = []; // For counting tasks due this week
  let upcomingTasksRaw = []; // All tasks that are not overdue and not for today

  tasks.forEach((task) => {
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline.split("T")[0]); // Normalize to just date part for comparison
      const normalizedToday = new Date(todayStr);

      if (deadlineDate < normalizedToday && task.status !== 'completed' && task.status !== 'cancelled') {
        overdueTasksList.push(task);
      } else if (deadlineDate.getTime() === normalizedToday.getTime() && task.status !== 'completed' && task.status !== 'cancelled') {
        todayTasksList.push(task);
        upcomingTasksRaw.push(task); // Today's tasks are also upcoming
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

  // Process Time Entries
  const recentTimeEntries = [...timeEntries]
    .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date)) // Use date if created_at is missing
    .slice(0, 5);

  // Compile Stats
  const processedData = {
    // Pass the whole permissions object
    permissions: userPermissions, 
    
    // Stats from dashboardSummary (use defaults if not present)
    active_tasks: dashboardSummary.active_tasks || 0,
    active_clients: dashboardSummary.active_clients || 0,
    overdue_tasks: dashboardSummary.overdue_tasks || 0, // This is count from summary
    today_tasks: dashboardSummary.today_tasks || 0,     // This is count from summary
    unprofitable_clients: userPermissions.can_view_profitability ? (dashboardSummary.unprofitable_clients || 0) : 0,
    time_tracked_today: dashboardSummary.time_tracked_today || 0,
    time_tracked_week: dashboardSummary.time_tracked_week || 0,
    completed_tasks_week: dashboardSummary.completed_tasks_week || 0,
    
    // Direct pass-throughs (ensure these exist in summary or handle undefined)
    total_revenue: dashboardSummary.total_revenue || 0,
    total_cost: dashboardSummary.total_cost || 0,
    average_profit_margin: dashboardSummary.average_profit_margin || 0,
    active_workflows: dashboardSummary.active_workflows || 0, // From summary if available
    tasks_with_workflows: dashboardSummary.tasks_with_workflows || 0, // From summary if available
    tasks_needing_approval: dashboardSummary.tasks_needing_approval || 0, // From summary if available

    // Additional processed data for detailed lists
    recent_time_entries: recentTimeEntries,
    upcoming_tasks_list: nextFiveUpcomingTasks, // Renamed for clarity
    overdue_tasks_list: overdueTasksList,
    today_tasks_list: todayTasksList,
    this_week_tasks_count: thisWeekTasksList.length, // Count of tasks due this week
  };

  console.log("✅ DashboardRouter final processed data:", JSON.stringify(processedData, null, 2));
  return processedData;
};

const DashboardRouter = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    staleTime: 1 * 60 * 1000, // 1 minute for more frequent updates if needed
    gcTime: 5 * 60 * 1000,   
    retry: 1, // Reduce retries if endpoint is sensitive
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });

  if (isLoading) {
    return (
      <div className="p-4 min-h-screen flex items-center justify-center" style={{width: '100%', height: 'calc(100vh - 80px)'}}> {/* Adjusted height */}
        <div className="text-center text-white"> {/* Ensure text is visible */}
          <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" /> {/* Lucide icon */}
          <p className="text-gray-300">Carregando dados da dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="p-4 min-h-screen flex items-center justify-center" style={{width: '100%', height: 'calc(100vh - 80px)'}}>
        <div className="text-center text-red-400 bg-red-900_alpha_0.2 p-6 rounded-lg"> {/* Improved error display */}
          <p className="font-semibold">Erro ao carregar dados da dashboard:</p>
          <p>{error?.response?.data?.error || error?.message || 'Erro desconhecido.'}</p>
          <p className="text-sm text-gray-500 mt-2">Por favor, tente recarregar a página ou contacte o suporte.</p>
        </div>
      </div>
    );
  }
  
  // The choice between HomePage and LimitedDashboard can be based on a more specific permission
  // For now, HomePage will handle displaying content based on the detailed permissions within `data.permissions`
  return <HomePage dashboardData={data} />;
};

export default DashboardRouter;
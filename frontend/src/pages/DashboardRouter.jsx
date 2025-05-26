import React from 'react';
import HomePage from './HomePage';
import LimitedDashboard from './LimitedDashboard';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { Loader2 } from 'lucide-react';

const fetchDashboardData = async () => {
  const response = await api.get("/dashboard-summary/");
  const dashboardSummary = response.data;
  
  // Date calculations
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split("T")[0];
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
  
  // Fetch complementary data for detailed lists
  const [tasksResponse, timeEntriesResponse] = await Promise.all([
    api.get("/tasks/?status=pending,in_progress"),
    api.get(`/time-entries/?start_date=${sevenDaysAgoStr}&end_date=${todayStr}`),
  ]);

  const tasks = tasksResponse.data;
  const timeEntries = timeEntriesResponse.data;

  // Process tasks
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

  // Process Time Entries
  const recentTimeEntries = [...timeEntries]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Compile Stats - Make sure this matches what DashboardPages expects
  const processedData = {
    // Original dashboard summary data
    ...dashboardSummary,
    
    // Additional processed data
    recent_time_entries: recentTimeEntries,
    upcoming_tasks: nextFiveUpcomingTasks,
    overdue_tasks_list: overdueTasks,
    today_tasks_list: todayTasks,
    this_week_tasks_count: thisWeekTasks.length,
    
    // Keep the original structure that DashboardPages expects
    active_tasks: dashboardSummary.active_tasks,
    active_clients: dashboardSummary.active_clients,
    overdue_tasks: dashboardSummary.overdue_tasks,
    today_tasks: dashboardSummary.today_tasks,
    unprofitable_clients: dashboardSummary.can_view_profitability ? dashboardSummary.unprofitable_clients : 0,
    time_tracked_today: dashboardSummary.time_tracked_today,
    time_tracked_week: dashboardSummary.time_tracked_week,
    completed_tasks_week: dashboardSummary.completed_tasks_week,
    has_full_access: dashboardSummary.has_full_access,
    can_view_analytics: dashboardSummary.can_view_analytics,
    can_view_profitability: dashboardSummary.can_view_profitability,
    total_revenue: dashboardSummary.total_revenue || 0,
    total_cost: dashboardSummary.total_cost || 0,
    average_profit_margin: dashboardSummary.average_profit_margin || 0
  };

  console.log("🔍 DashboardRouter processed data:", processedData);
  return processedData;
};

const DashboardRouter = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  if (isLoading) {
    return (
      <div className="p-4 min-h-screen flex items-center justify-center" style={{width: '100%', height: 'calc(100vh - 60px)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados da dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="bg-white main">
        <div className="bg-white flex justify-center items-center min-h-screen">
          <div className="text-red-500">
            Error loading dashboard data: {error?.message || 'Unknown error'}
          </div>
        </div>
      </div>
    );
  }
  
  return data?.has_full_access 
    ? <HomePage dashboardData={data} /> 
    : <LimitedDashboard dashboardData={data} />;
};

export default DashboardRouter;
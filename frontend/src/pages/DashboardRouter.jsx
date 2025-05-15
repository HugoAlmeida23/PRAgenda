import React from 'react';
import Home from './Home';
import LimitedDashboard from './LimitedDashboard';
import Header from '../components/Header';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import { Loader2 } from 'lucide-react';

const fetchDashboardData = async () => {
  // Fetch data from the single dashboard-summary endpoint
  const response = await api.get("/dashboard-summary/");
  const dashboardSummary = response.data;
  
  // --- Date calculations ---
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split("T")[0];
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
  
  // --- Fetch complementary data for detailed lists ---
  // We still need to fetch these lists since the summary endpoint only returns counts
  const [
    tasksResponse,
    timeEntriesResponse,
  ] = await Promise.all([
    api.get("/tasks/?status=pending,in_progress"),
    api.get(`/time-entries/?start_date=${sevenDaysAgoStr}&end_date=${todayStr}`),
  ]);

  const tasks = tasksResponse.data;
  const timeEntries = timeEntriesResponse.data;

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

  // --- Compile Stats ---
  // This maintains the same format as the original code
  const stats = {
    activeTasks: dashboardSummary.active_tasks,
    activeClients: dashboardSummary.active_clients,
    overdueTasksCount: dashboardSummary.overdue_tasks,
    todayTasksCount: dashboardSummary.today_tasks,
    thisWeekTasksCount: thisWeekTasks.length,
    recentTimeEntries,
    upcomingTasks: nextFiveUpcomingTasks,
    unprofitableClientsCount: dashboardSummary.can_view_profitability ? dashboardSummary.unprofitable_clients : 0,
    timeTrackedToday: dashboardSummary.time_tracked_today,
    timeTrackedThisWeek: dashboardSummary.time_tracked_week,
    tasksCompletedThisWeek: dashboardSummary.completed_tasks_week,
    overdueTasksList: overdueTasks,
    todayTasksList: todayTasks,
    has_full_access: dashboardSummary.has_full_access,
    can_view_analytics: dashboardSummary.can_view_analytics,
    can_view_profitability: dashboardSummary.can_view_profitability
  };

  console.log("Dashboard Stats:", stats);
  return stats;
};

const DashboardRouter = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000,
  });

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
  
  return data.has_full_access 
    ? <Home dashboardData={data} /> 
    : <LimitedDashboard dashboardData={data} />;
};

export default DashboardRouter;
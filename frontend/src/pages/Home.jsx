import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  FileText,
  BarChart2,
  DollarSign,
  Activity,
  ChevronRight,
  Plus,
  ArrowUp,
  ArrowDown,
  Timer,
  Briefcase,
  ExternalLink,
  TrendingUp,
  Clipboard,
  CheckSquare,
} from "lucide-react";
import { Loader2 } from 'lucide-react';

import Header from "../components/Header";
import api from "../api";
import "../styles/Home.css";

// Task Priority Color Map
const priorityColors = {
  1: "bg-red-100 text-red-800 border border-red-200", // Urgent
  2: "bg-orange-100 text-orange-800 border border-orange-200", // High
  3: "bg-yellow-100 text-yellow-800 border border-yellow-200", // Medium
  4: "bg-blue-100 text-blue-800 border border-blue-200", // Low
  5: "bg-gray-100 text-gray-800 border border-gray-200", // Can Wait
};

const priorityLabels = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Can Wait",
};

// Task Status Color Map
const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 border border-blue-200",
  completed: "bg-green-100 text-green-800 border border-green-200",
  cancelled: "bg-gray-100 text-gray-800 border border-gray-200",
};

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeTasks: 0,
    activeClients: 0,
    overdueTasksCount: 0,
    todayTasksCount: 0,
    thisWeekTasksCount: 0,
    recentTimeEntries: [],
    upcomingTasks: [],
    unprofitableClientsCount: 0,
    timeTrackedToday: 0, // Added for enhanced dashboard
    timeTrackedThisWeek: 0, // Added for enhanced dashboard
    tasksCompletedThisWeek: 0, // Added for enhanced dashboard
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch tasks with status pending or in_progress
      const tasksResponse = await api.get("/tasks/?status=pending");
      const inProgressResponse = await api.get("/tasks/?status=in_progress");

      // Combine pending and in_progress tasks
      const tasks = [...tasksResponse.data, ...inProgressResponse.data];

      // Fetch active clients
      const clientsResponse = await api.get("/clients/?is_active=true");
      const clients = clientsResponse.data;

      // Fetch recent time entries (last 7 days)
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);

      const timeEntriesResponse = await api.get(
        `/time-entries/?start_date=${
          sevenDaysAgo.toISOString().split("T")[0]
        }&end_date=${today.toISOString().split("T")[0]}`
      );
      const timeEntries = timeEntriesResponse.data;

      // Check for unprofitable clients
      const profitabilityResponse = await api.get(
        "/client-profitability/?is_profitable=false"
      );
      const unprofitableClients = profitabilityResponse.data;

      // Process tasks to find overdue, today and this week
      let overdueTasks = [];
      let todayTasks = [];
      let thisWeekTasks = [];
      let upcomingTasks = [];

      const todayStr = today.toISOString().split("T")[0];
      const thisWeekEnd = new Date(today);
      thisWeekEnd.setDate(today.getDate() + 7);

      tasks.forEach((task) => {
        if (task.deadline) {
          const deadlineDate = new Date(task.deadline)
            .toISOString()
            .split("T")[0];

          // Check if task is overdue
          if (deadlineDate < todayStr) {
            overdueTasks.push(task);
          }
          // Check if task is due today
          else if (deadlineDate === todayStr) {
            todayTasks.push(task);
          }
          // Check if task is due this week
          else if (new Date(task.deadline) <= thisWeekEnd) {
            thisWeekTasks.push(task);
          }

          // Add to upcoming tasks (next 5 tasks by deadline)
          if (deadlineDate >= todayStr) {
            upcomingTasks.push(task);
          }
        }
      });

      // Sort upcoming tasks by deadline and take only 5
      upcomingTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      upcomingTasks = upcomingTasks.slice(0, 5);

      // Get most recent 5 time entries
      const recentTimeEntries = timeEntries
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      // Calculate time tracked today
      const todayTimeEntries = timeEntries.filter(
        (entry) => new Date(entry.date).toISOString().split("T")[0] === todayStr
      );
      const timeTrackedToday = todayTimeEntries.reduce(
        (total, entry) => total + entry.minutes_spent,
        0
      );

      // Calculate time tracked this week
      const timeTrackedThisWeek = timeEntries.reduce(
        (total, entry) => total + entry.minutes_spent,
        0
      );

      // Fetch completed tasks this week
      const completedTasksResponse = await api.get(
        `/tasks/?status=completed&completed_after=${sevenDaysAgo.toISOString()}`
      );
      const tasksCompletedThisWeek = completedTasksResponse.data.length;

      setStats({
        activeTasks: tasks.length,
        activeClients: clients.length,
        overdueTasksCount: overdueTasks.length,
        todayTasksCount: todayTasks.length,
        thisWeekTasksCount: thisWeekTasks.length,
        recentTimeEntries,
        upcomingTasks,
        unprofitableClientsCount: unprofitableClients.length,
        timeTrackedToday,
        timeTrackedThisWeek,
        tasksCompletedThisWeek,
      });

      console.log("All active tasks:", tasks);
      console.log("Tasks with future deadlines:", upcomingTasks);
      console.log(
        "Final upcoming tasks after sorting and limiting:",
        upcomingTasks.slice(0, 5)
      );
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format minutes into hours and minutes
  const formatMinutes = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Format date to display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Calculate days remaining until deadline
  const getDaysRemaining = (deadlineStr) => {
    if (!deadlineStr) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Get appropriate label for days remaining
  const getDaysRemainingLabel = (days) => {
    if (days === null) return "";
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `${days}d remaining`;
  };

  return (
    <div className="main">
      <Header>
        <div
          className="p-6 bg-gray-100 min-h-screen"
          style={{ marginLeft: "3%" }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-300 text-gray-700 font-medium">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>

            {/* {loading ? (
            <div className="flex flex-col items-center justify-center my-12 space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
              <p className="text-gray-700 font-medium">
                Loading dashboard data...
              </p>
            </div>
          ) : ( */}
            <>
              {/* Stats Overview - Enhanced Design with Better Contrast */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Active Tasks Card */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-blue-100 text-blue-700 mr-2">
                      <Clipboard size={24} strokeWidth={1.5} />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-600 text-sm font-medium">
                        Tarefas Ativas
                      </p>
                      {loading ? (
                        <div className="flex items-center space-x-2 mt-4">
                          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                          <span className="text-sm text-gray-500"></span>
                        </div>
                      ) : (
                        <div className="flex items-center mt-4">
                          <h3 className="text-2xl font-bold text-gray-900">
                            {stats.activeTasks}
                          </h3>
                          <div className="ml-2 flex items-center text-xs text-blue-700">
                            <svg
                              className="mr-1 h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                            <span>3%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      to="/tasks"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <span>Ver todas as tarefas</span>
                      <ChevronRight size={16} className="ml-1" />
                    </Link>
                  </div>
                </div>

                {/* Active Clients Card */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-green-100 text-green-700 mr-2">
                      <Users size={24} strokeWidth={1.5} />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-600 text-sm font-medium">
                        Clientes Ativos
                      </p>
                      {loading ? (
                        <div className="flex items-center space-x-2 mt-4">
                          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                          <span className="text-sm text-gray-500"></span>
                        </div>
                      ) : (
                      <div className="flex items-center mt-4">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {stats.activeClients}
                        </h3>
                        <div className="ml-2 flex items-center text-xs text-green-700">
                          <ArrowUp size={14} className="mr-1" />
                          <span>2%</span>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      to="/clients"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <span>Ver todos os clientes</span>
                      <ChevronRight size={16} className="ml-1" />
                    </Link>
                  </div>
                </div>

                {/* Overdue Tasks Card */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-red-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-red-100 text-red-700 mr-2">
                      <AlertTriangle size={24} strokeWidth={1.5} />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-600 text-sm font-medium">
                        Tarefas fora de prazo
                      </p>
                      {loading ? (
                        <div className="flex items-center space-x-2 mt-4">
                          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                          <span className="text-sm text-gray-500"></span>
                        </div>
                      ) : (
                      <div className="flex items-center mt-4">
                        <h3 className="text-2xl font-bold text-red-700">
                          {stats.overdueTasksCount}
                        </h3>
                        {stats.overdueTasksCount > 0 && (
                          <div className="ml-2 px-2 py-1 rounded-full bg-red-100 text-xs text-red-700 border border-red-200">
                            Atenção necessária
                          </div>
                        )}
                      </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      to="/tasks?status=pending&overdue=true"
                      className="text-red-600 hover:text-red-800 text-sm flex items-center"
                    >
                      <span>Resolver tarefas fora de prazo</span>
                      <ChevronRight size={16} className="ml-1" />
                    </Link>
                  </div>
                </div>

                {/* Unprofitable Clients Card */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-yellow-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-yellow-100 text-yellow-700 mr-2">
                      <DollarSign size={24} strokeWidth={1.5} />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-600 text-sm font-medium">
                        Clientes não rentáveis
                      </p>
                      {loading ? (
                        <div className="flex items-center space-x-2 mt-4">
                          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                          <span className="text-sm text-gray-500"></span>
                        </div>
                      ) : (
                      <div className="flex items-center mt-4">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {stats.unprofitableClientsCount}
                        </h3>
                        <div className="ml-2 flex items-center text-xs text-yellow-700">
                          <span>
                            {Math.round(
                              (stats.unprofitableClientsCount /
                                Math.max(stats.activeClients, 1)) *
                                100
                            )}
                            %
                          </span>
                        </div>
                      </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      to="/profitability"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <span>Ver relatório de rentabilidade</span>
                      <ChevronRight size={16} className="ml-1" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Time & Productivity Stats - Improved Contrast */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Time Tracked Today Card */}
                <div className="bg-gradient p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="relative z-10">
                    <div className="flex items-center">
                      <Timer
                        size={24}
                        className="mr-2 text-blue-600"
                        strokeWidth={1.5}
                      />
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        Hoje
                      </h3>
                    </div>
                    <div className="mt-3">
                      <p className="text-3xl font-bold text-green-700">
                        {formatMinutes(stats.timeTrackedToday)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Total de tempo monitorado hoje
                    </p>
                    <div className="mt-4 ">
                      <Link
                        to="/timeentry"
                        className="bg-white text-blue-700 hover:bg-gray-100 transition-colors px-4 py-2 rounded-lg text-sm inline-flex items-center font-medium"
                      >
                        <Clock size={16} className="mr-2" />
                        <span>Tempo de registro</span>
                      </Link>
                    </div>
                  </div>
                </div>
                {/* Weekly Activity Card */}
                <div className="bg-gradient p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="relative z-10">
                    <div className="flex items-center">
                      <Activity
                        className="mr-2 text-blue-600"
                        size={24}
                        strokeWidth={1.5}
                      />
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        Atividade Semanal
                      </h3>
                    </div>

                    <p className="text-3xl font-bold text-green-700">
                      {formatMinutes(stats.timeTrackedThisWeek)}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      Últimos 7 dias de tempo monitorado
                    </p>

                    <div className="mt-4">
                      <Link
                        to="/reports/time"
                        className="bg-white text-purple-700 hover:bg-gray-100 transition-colors px-4 py-2 rounded-lg text-sm inline-flex items-center font-medium"
                      >
                        <BarChart2 size={16} className="mr-2" />
                        <span>Ver relatório de tempo</span>
                      </Link>
                    </div>
                  </div>
                </div>
                {/* Tasks Completed Card */}
                <div className="bg-gradient p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="relative z-10">
                    <div className="flex items-center">
                      <CheckSquare
                        size={24}
                        className="mr-2 text-blue-600"
                        strokeWidth={1.5}
                      />
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                        Tarefas concluídas
                      </h3>
                    </div>
                    <div className="mt-3">
                      <p className="text-3xl font-bold text-green-700">
                        {stats.tasksCompletedThisWeek}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        últimos 7 dias
                      </p>
                    </div>
                    <div className="mt-4">
                      <Link
                        to="/tasks?status=completed"
                        className="bg-white text-green-700 hover:bg-gray-100 transition-colors px-4 py-2 rounded-lg text-sm inline-flex items-center font-medium"
                      >
                        <CheckCircle size={16} className="mr-2" />
                        <span>Ver tarefas concluídas</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Upcoming Tasks - Enhanced */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200">
                  <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Clipboard
                        size={20}
                        className="mr-2 text-blue-600"
                        strokeWidth={1.5}
                      />
                      Próximas tarefas
                    </h2>
                    <Link
                      to="/tasks"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      Ver todas <ChevronRight size={16} />
                    </Link>
                  </div>
                  <div className="p-6">
                    {stats.upcomingTasks.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <CheckCircle
                          size={40}
                          className="mx-auto mb-4 text-gray-400"
                        />
                        <p className="text-gray-600 mb-2">
                          Nenhuma tarefa futura
                        </p>
                        <Link
                          to="/tasks"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center"
                        >
                          <Plus size={16} className="mr-1" />
                          Criar nova tarefa
                        </Link>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {stats.upcomingTasks.map((task) => (
                          <li
                            key={task.id}
                            className="py-4 first:pt-0 last:pb-0"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <div
                                    className={`h-2 w-2 rounded-full ${
                                      task.status === "in_progress"
                                        ? "bg-blue-600"
                                        : "bg-yellow-600"
                                    } mr-2`}
                                  ></div>
                                  <h4 className="font-medium text-gray-800">
                                    {task.title}
                                  </h4>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center text-sm text-gray-600 gap-3">
                                  <span className="flex items-center">
                                    <Briefcase size={14} className="mr-1" />
                                    {task.client_name || "No client"}
                                  </span>
                                  <span className="flex items-center">
                                    <Calendar size={14} className="mr-1" />
                                    {formatDate(task.deadline)}
                                  </span>
                                  {task.estimated_time_minutes && (
                                    <span className="flex items-center">
                                      <Clock size={14} className="mr-1" />
                                      {formatMinutes(
                                        task.estimated_time_minutes
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end ml-4">
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[
                                    task.priority
                                  ]
                                    .replace(
                                      "bg-red-100",
                                      "bg-red-100 border-red-200"
                                    )
                                    .replace(
                                      "bg-orange-100",
                                      "bg-orange-100 border-orange-200"
                                    )
                                    .replace(
                                      "bg-yellow-100",
                                      "bg-yellow-100 border-yellow-200"
                                    )
                                    .replace(
                                      "bg-blue-100",
                                      "bg-blue-100 border-blue-200"
                                    )
                                    .replace(
                                      "bg-gray-100",
                                      "bg-gray-100 border-gray-200"
                                    )}`}
                                >
                                  {priorityLabels[task.priority]}
                                </span>
                                {task.deadline && (
                                  <span
                                    className={`mt-2 text-xs font-medium ${
                                      getDaysRemaining(task.deadline) < 0
                                        ? "text-red-700"
                                        : getDaysRemaining(task.deadline) === 0
                                        ? "text-orange-700"
                                        : getDaysRemaining(task.deadline) <= 2
                                        ? "text-yellow-700"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    {getDaysRemainingLabel(
                                      getDaysRemaining(task.deadline)
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Recent Activity - Enhanced */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200">
                  <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Clock
                        size={20}
                        className="mr-2 text-green-600"
                        strokeWidth={1.5}
                      />
                      Entradas de tempo recentes
                    </h2>
                    <Link
                      to="/time-entries"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      Ver todas <ChevronRight size={16} />
                    </Link>
                  </div>
                  <div className="p-6">
                    {stats.recentTimeEntries.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <Clock
                          size={40}
                          className="mx-auto mb-4 text-gray-400"
                        />
                        <p className="text-gray-600 mb-2">
                          Nenhuma entrada de horário recente
                        </p>
                        <Link
                          to="/time-entries"
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center"
                        >
                          <Plus size={16} className="mr-1" />
                          Registrar nova entrada de horário
                        </Link>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {stats.recentTimeEntries.map((entry) => (
                          <li
                            key={entry.id}
                            className="py-4 first:pt-0 last:pb-0"
                          >
                            <div className="flex items-start">
                              <div className="p-2 bg-green-50 rounded-lg mr-4 border border-green-100">
                                <Clock size={20} className="text-green-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-gray-800">
                                    {formatMinutes(entry.minutes_spent)}
                                    <span className="mx-2 text-gray-400">
                                      —
                                    </span>
                                    <span className="text-gray-700">
                                      {entry.client_name}
                                    </span>
                                  </h4>
                                  <span className="text-sm text-gray-600">
                                    {formatDate(entry.date)}
                                  </span>
                                </div>
                                <p className="mt-1 text-gray-700 text-sm line-clamp-2">
                                  {entry.description}
                                </p>
                                <div className="mt-2 flex items-center gap-3">
                                  {entry.task_title && (
                                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">
                                      {entry.task_title}
                                    </span>
                                  )}
                                  {entry.category_name && (
                                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-100">
                                      {entry.category_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Task Timelines - Enhanced & Responsive */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
                <div className="bg-white p-6 rounded-xl shadow-md border border-red-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center mb-4">
                    <AlertTriangle
                      size={20}
                      className="text-red-600 mr-2"
                      strokeWidth={1.5}
                    />
                    <h3 className="font-semibold text-gray-900">Atrasada</h3>
                  </div>
                  <div className="text-3xl font-bold text-red-700">
                    {stats.overdueTasksCount}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    tarefas precisam de atenção imediata
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      to="/tasks?status=pending&overdue=true"
                      className="text-red-600 hover:text-red-800 text-sm flex items-center"
                    >
                      <span>Resolver tarefas atrasadas</span>
                      <ChevronRight size={16} className="ml-1" />
                    </Link>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-blue-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center mb-4">
                    <Calendar
                      size={20}
                      className="text-blue-600 mr-2"
                      strokeWidth={1.5}
                    />
                    <h3 className="font-semibold text-gray-900">Hoje</h3>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">
                    {stats.todayTasksCount}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">tarefas hoje</div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      to="/tasks?due=today"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <span>Ver as tarefas de hoje</span>
                      <ChevronRight size={16} className="ml-1" />
                    </Link>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center mb-4">
                    <Activity
                      size={20}
                      className="text-green-600 mr-2"
                      strokeWidth={1.5}
                    />
                    <h3 className="font-semibold text-gray-900">Esta semana</h3>
                  </div>
                  <div className="text-3xl font-bold text-green-700">
                    {stats.thisWeekTasksCount}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    tarefas que virão esta semana
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      to="/tasks?due=this-week"
                      className="text-green-600 hover:text-green-800 text-sm flex items-center"
                    >
                      <span>Veja as tarefas desta semana</span>
                      <ChevronRight size={16} className="ml-1" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Quick Actions - Enhanced */}
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <ExternalLink
                    size={20}
                    className="mr-2 text-indigo-600"
                    strokeWidth={1.5}
                  />
                  Ações rápidas
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Link
                    to="/tasks"
                    className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
                  >
                    <div className="p-3 rounded-lg bg-blue-100 text-blue-700 mr-4">
                      <Plus size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="font-medium text-blue-900">
                        Nova tarefa
                      </span>
                      <p className="text-xs text-blue-700 mt-1">Criar tarefa</p>
                    </div>
                  </Link>

                  <Link
                    to="/timeentry"
                    className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-200"
                  >
                    <div className="p-3 rounded-lg bg-green-100 text-green-700 mr-4">
                      <Clock size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="font-medium text-green-900">
                        Log Time
                      </span>
                      <p className="text-xs text-green-700 mt-1">
                        Record your work
                      </p>
                    </div>
                  </Link>

                  <Link
                    to="/clients"
                    className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-200"
                  >
                    <div className="p-3 rounded-lg bg-purple-100 text-purple-700 mr-4">
                      <Users size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="font-medium text-purple-900">
                        New Client
                      </span>
                      <p className="text-xs text-purple-700 mt-1">
                        Add a client
                      </p>
                    </div>
                  </Link>

                  <Link
                    to="/reports"
                    className="flex items-center p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200"
                  >
                    <div className="p-3 rounded-lg bg-amber-100 text-amber-700 mr-4">
                      <BarChart2 size={18} strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="font-medium text-amber-900">
                        Reports
                      </span>
                      <p className="text-xs text-amber-700 mt-1">
                        View analytics
                      </p>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Profitability Insights - Enhanced */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mt-6">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <TrendingUp
                      size={20}
                      className="mr-2 text-indigo-600"
                      strokeWidth={1.5}
                    />
                    Profitability Insights
                  </h2>
                  <Link
                    to="/profitability"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    View Details <ChevronRight size={16} />
                  </Link>
                </div>
                <div className="p-6">
                  {stats.unprofitableClientsCount > 0 ? (
                    <div className="flex items-start p-5 bg-red-50 rounded-xl border border-red-200">
                      <div className="p-3 rounded-full bg-red-100 text-red-700 mr-4">
                        <AlertTriangle size={24} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-medium text-red-900 text-lg">
                          {stats.unprofitableClientsCount}{" "}
                          {stats.unprofitableClientsCount === 1
                            ? "client is"
                            : "clients are"}{" "}
                          currently unprofitable
                        </h3>
                        <p className="text-red-800 mt-2">
                          Check the profitability report to see detailed
                          information on time costs versus monthly fees and take
                          corrective action.
                        </p>
                        <div className="mt-4">
                          <Link
                            to="/profitability"
                            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
                          >
                            <span>View Profitability Report</span>
                            <ChevronRight size={16} className="ml-1" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start p-5 bg-green-50 rounded-xl border border-green-200">
                      <div className="p-3 rounded-full bg-green-100 text-green-700 mr-4">
                        <CheckCircle size={24} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="font-medium text-green-900 text-lg">
                          All active clients are currently profitable
                        </h3>
                        <p className="text-green-800 mt-2">
                          Great job! Continue monitoring time entries and
                          expenses to maintain profitability. Regular reviews
                          help ensure your business stays on the right track.
                        </p>
                        <div className="mt-4">
                          <Link
                            to="/profitability"
                            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg"
                          >
                            <span>View Profitability Report</span>
                            <ChevronRight size={16} className="ml-1" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
            {/* )} */}
          </div>
        </div>
      </Header>
    </div>
  );
};

export default Home;

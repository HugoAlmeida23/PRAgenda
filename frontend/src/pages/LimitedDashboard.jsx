import React from "react"; // Removed useState, useEffect
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  BarChart2,
  DollarSign,
  Activity,
  ChevronRight,
  Plus,
  ArrowUp,
  Timer,
  Briefcase,
  ExternalLink,
  TrendingUp,
  Clipboard,
  CheckSquare,
  Loader2, // Keep Loader2 for loading state
} from "lucide-react";
// Removed react-bootstrap imports as they seem unused in the main return block
// import { Container, Spinner, Card, Alert } from 'react-bootstrap';
import Header from "../components/Header";
import api from "../api";
import "../styles/Home.css"; // Ensure this contains necessary styles

// --- Constants (Keep outside) ---
const priorityColors = {
  1: "bg-red-100 text-red-800 border border-red-200", // Urgent
  2: "bg-orange-100 text-orange-800 border border-orange-200", // High
  3: "bg-yellow-100 text-yellow-800 border border-yellow-200", // Medium
  4: "bg-blue-100 text-blue-800 border border-blue-200", // Low
  5: "bg-white-100 text-gray-800 border border-gray-200", // Can Wait
};

const priorityLabels = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Can Wait",
};


const LimitedDashboard = ({ dashboardData, delay }) => {
  console.log("sou limitada");
  // Variants for Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 } // Adjusted stagger
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 } // Simplified transition
    },
  };

  // Combined card variant for motion
   const cardMotionProps = {
    variants: itemVariants, // Use item variant for consistency
    whileHover:{
      y: -5,
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      transition: { type: "spring", stiffness: 300, damping: 20 },
    }
  };
  // --- Data is Ready ---
  // Alias dashboardStats for easier use, default to empty object if somehow null/undefined
  const stats = dashboardData || {};
console.log("stats", stats);
  // Helper functions (Keep inside or move outside if reused)
  const formatMinutes = (minutes = 0) => { /* ... as before ... */ };
  const formatDate = (dateString) => { /* ... as before ... */ };
  const getDaysRemaining = (deadlineStr) => { /* ... as before ... */ };
  const getDaysRemainingLabel = (days) => { /* ... as before ... */ };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: delay * 0.15 // Stagger effect
      }
    }
  };

  return (
    <div className="bg-white main">
      <Header className="bg-white">
        <motion.div
          className="bg-white p-6 min-h-screen"
          style={{ marginLeft: "3%" }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="bg-white max-w-7xl mx-auto">
            <motion.div
              className="bg-white flex justify-between items-center mb-6"
              variants={itemVariants}
            >
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-300 text-gray-700 font-medium">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </motion.div>

            <>
              {/* Stats Overview - Enhanced Design with Better Contrast */}
              <motion.div
                className="bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
                variants={containerVariants}
              >
                {/* Active Tasks Card */}
                <motion.div
                  className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300"
                  {...cardMotionProps}
                >
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-blue-100 text-blue-700 mr-2">
                      <Clipboard size={24} strokeWidth={1.5} />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-600 text-sm font-medium">
                        Tarefas Ativas
                      </p>

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
                </motion.div>

                {/* Active Clients Card */}
                <motion.div
                  className="bg-white p-6 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300"
                  {...cardMotionProps}
                >
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-green-100 text-green-700 mr-2">
                      <Users size={24} strokeWidth={1.5} />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-600 text-sm font-medium">
                        Clientes Ativos
                      </p>

                      <div className="flex items-center mt-4">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {stats.activeClients}
                        </h3>
                        <div className="ml-2 flex items-center text-xs text-green-700">
                          <ArrowUp size={14} className="mr-1" />
                          <span>2%</span>
                        </div>
                      </div>
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
                </motion.div>

                {/* Overdue Tasks Card */}
                <motion.div
                  className="bg-white p-6 rounded-xl shadow-md border border-red-200 hover:shadow-lg transition-shadow duration-300"
                  {...cardMotionProps}
                >
                  {/* Card content remains the same */}
                  <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-red-100 text-red-700 mr-2">
                      <AlertTriangle size={24} strokeWidth={1.5} />
                    </div>
                    <div className="ml-4">
                      <p className="text-gray-600 text-sm font-medium">
                        Tarefas fora de prazo
                      </p>

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
                </motion.div>
                <motion.div
                  className="bg-white p-6 rounded-xl shadow-md border border-red-200 hover:shadow-lg transition-shadow duration-300"
                  {...cardMotionProps}
                >
                  {/* Content remains the same */}
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
                        className="bg-white text-green-700 hover:bg-white-100 transition-colors px-4 py-2 rounded-lg text-sm inline-flex items-center font-medium"
                      >
                        <CheckCircle size={16} className="mr-2" />
                        <span>Ver tarefas concluídas</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>

              </motion.div>

              {/* Time & Productivity Stats */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
                variants={containerVariants}
              >
                {/* Time cards with motion */}
                <motion.div
                  className="bg-white p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-shadow duration-300"
                  {...cardMotionProps}
                >
                  {/* Content remains the same */}
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
                        className="bg-white text-blue-700 hover:bg-white-100 transition-colors px-4 py-2 rounded-lg text-sm inline-flex items-center font-medium"
                      >
                        <Clock size={16} className="mr-2" />
                        <span>Tempo de registro</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  className="bg-white p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-shadow duration-300"
                  {...cardMotionProps}
                >
                  {/* Content remains the same */}
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
                </motion.div>
                {/* Weekly Activity Card */}
                <motion.div
                  className="bg-white p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-shadow duration-300"
                  {...cardMotionProps}
                >
                  {/* Content remains the same */}
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
                        className="bg-white text-purple-700 hover:bg-white-100 transition-colors px-4 py-2 rounded-lg text-sm inline-flex items-center font-medium"
                      >
                        <BarChart2 size={16} className="mr-2" />
                        <span>Ver relatório de tempo</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  className="bg-white p-6 rounded-xl shadow-md border border-blue-200 hover:shadow-lg transition-shadow duration-300"
                  {...cardMotionProps}
                >
                  {/* Content remains the same */}
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
                </motion.div>
              </motion.div>
              {/* Tasks and Time Entries Sections */}
              <motion.div
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
                variants={containerVariants}
              >
                {/* Upcoming Tasks - Enhanced */}
                <motion.div
                  className="bg-white rounded-xl shadow-md border border-gray-200"
                  variants={cardVariants}
                >
                  {/* Content remains the same */}
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
                      <div className="text-center py-8 bg-white-50 rounded-lg border border-dashed border-gray-300">
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
                          <motion.li
                            key={task.id}
                            className="py-4 first:pt-0 last:pb-0"
                            variants={itemVariants}
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
                                      "bg-white-100",
                                      "bg-white-100 border-gray-200"
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
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>

                {/* Recent Activity - Enhanced */}
                <motion.div
                  className="bg-white rounded-xl shadow-md border border-gray-200"
                  variants={cardVariants}
                >
                  {/* Content remains the same */}
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
                      to="/timeentry"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      Ver todas <ChevronRight size={16} />
                    </Link>
                  </div>
                  <div className="p-6">
                    {stats.recentTimeEntries.length === 0 ? (
                      <div className="text-center py-8 bg-white-50 rounded-lg border border-dashed border-gray-300">
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
                          <motion.li
                            key={entry.id}
                            className="py-4 first:pt-0 last:pb-0"
                            variants={itemVariants}
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
                          </motion.li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              </motion.div>
              {/* Quick Actions */}
              <motion.div
                className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8"
                variants={cardVariants}
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                  <ExternalLink
                    size={20}
                    className="mr-2 text-indigo-600"
                    strokeWidth={1.5}
                  />
                  Ações rápidas
                </h2>
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-4 gap-4"
                  variants={containerVariants}
                >
                  {/* First Action - Log Time */}
                  <motion.div variants={itemVariants} className="w-full">
                    <Link
                      to="/timeentry"
                      className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-200 h-full"
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
                  </motion.div>

                  {/* Second Action - New Task */}
                  <motion.div variants={itemVariants} className="w-full">
                    <Link
                      to="/tasks"
                      className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 h-full"
                    >
                      <div className="p-3 rounded-lg bg-blue-100 text-blue-700 mr-4">
                        <Plus size={18} strokeWidth={1.5} />
                      </div>
                      <div>
                        <span className="font-medium text-blue-900">
                          Nova tarefa
                        </span>
                        <p className="text-xs text-blue-700 mt-1">
                          Criar tarefa
                        </p>
                      </div>
                    </Link>
                  </motion.div>

                  {/* Third Action - New Client */}
                  <motion.div variants={itemVariants} className="w-full">
                    <Link
                      to="/clients"
                      className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-200 h-full"
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
                  </motion.div>

                  {/* Fourth Action - Reports */}
                  <motion.div variants={itemVariants} className="w-full">
                    <Link
                      to="/reports"
                      className="flex items-center p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200 h-full"
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
                  </motion.div>
                </motion.div>
              </motion.div>
            </>
            {/* )} */}
          </div>
        </motion.div>
      </Header>
    </div>
  );
};

export default LimitedDashboard;

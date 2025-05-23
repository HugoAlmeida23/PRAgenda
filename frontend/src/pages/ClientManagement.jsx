import React, { useState, useEffect, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify";
import api from "../api";
import "../styles/Home.css";
import {
  User,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Clock,
  FileText,
  DollarSign,
  AlertTriangle,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  BarChart2,
  ArrowRight,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Settings,
  Grid,
  List,
  SlidersHorizontal,
  Download,
  Phone,
  Mail,
  MapPin,
  Tag,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { usePermissions } from "../contexts/PermissionsContext";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Componentes reutilizáveis
const LoadingView = () => (
  <div className="flex justify-center items-center min-h-screen">
    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
  </div>
);

// Variants de animação
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

// Componente para alternar entre visualizações
const ViewToggle = ({ activeView, onChange }) => {
  return (
    <div className="inline-flex rounded-md overflow-hidden shadow-sm">
      <button
        className={`px-4 py-2 text-sm font-medium ${activeView === 'grid'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        onClick={() => onChange('grid')}
      >
        <Grid size={16} className="inline-block ml-2 mr-1" />
        Cartões
      </button>
      <button
        className={`px-4 py-2 text-sm font-medium ${activeView === 'list'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        onClick={() => onChange('list')}
      >
        <List size={16} className="inline-block ml-2 mr-1" />
        Tabela
      </button>
    </div>
  );
};

// Componente de Card de Cliente
// Update your ClientCard component
const ClientCard = ({ client, onEdit, onToggleStatus, onDelete, permissions }) => {
  const { isOrgAdmin, canEditClients, canChangeClientStatus, canDeleteClients } = permissions;

  return (
    <div className={`client-card ${!client.is_active ? 'client-inactive' : ''}`}>
      <div className="client-card-header">
        <div className="client-avatar">
          <User size={20} className="text-blue-700" />
        </div>
        <div className="client-info">
          <h3>{client.name}</h3>
          <div>
            <span className={`status-badge ${client.is_active ? 'status-active' : 'status-inactive'}`}>
              {client.is_active ? 'Ativo' : 'Inativo'}
            </span>
            {client.nif && (
              <span className="nif-badge">NIF: {client.nif}</span>
            )}
          </div>
        </div>
      </div>

      <div className="client-contact">
        {client.email && (
          <div className="contact-item">
            <Mail size={16} />
            <span>{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div className="contact-item">
            <Phone size={16} />
            <span>{client.phone}</span>
          </div>
        )}
        {client.address && (
          <div className="contact-item">
            <MapPin size={16} />
            <span>{client.address}</span>
          </div>
        )}
      </div>

      <div className="client-fee">
        <span>Avença Mensal:</span>
        <span className="fee-value">
          {client.monthly_fee ? `${client.monthly_fee} €` : 'Não definida'}
        </span>
      </div>

      <div className="client-actions">
        <div className="action-links">
          <a href={`/tasks?client=${client.id}`} className="action-link">
            <Clock size={14} />
            Tarefas
          </a>
          <a href={`/timeentry?client=${client.id}`} className="action-link">
            <FileText size={14} />
            Registros
          </a>
          <a href={`/clientprofitability?client=${client.id}`} className="action-link">
            <BarChart2 size={14} />
            Rentabilidade
          </a>
        </div>

        <a href={`/clients/${client.id}`} className="details-link">
          Detalhes <ArrowRight size={14} className="ml-1" />
        </a>
      </div>
    </div>
  );
};

// Modal de detalhes do cliente
const ClientDetailsModal = ({ client, onClose, onSave, permissions }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [timeEntries, setTimeEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profitabilityData, setProfitabilityData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ ...client });

  useEffect(() => {
    const fetchClientDetails = async () => {
      setLoading(true);
      try {
        // Buscar dados em paralelo para melhor performance
        const [timeEntriesRes, tasksRes, profitabilityRes] = await Promise.all([
          api.get(`/time-entries/?client=${client.id}&limit=5`),
          api.get(`/tasks/?client=${client.id}&limit=5`),
          api.get(`/client-profitability/?client=${client.id}&limit=1`)
        ]);

        setTimeEntries(timeEntriesRes.data || []);
        setTasks(tasksRes.data || []);
        setProfitabilityData(profitabilityRes.data.length > 0 ? profitabilityRes.data[0] : null);
      } catch (error) {
        console.error("Erro ao buscar detalhes do cliente:", error);
        toast.error("Falha ao carregar detalhes do cliente");
      } finally {
        setLoading(false);
      }
    };

    fetchClientDetails();
  }, [client.id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSave = () => {
    onSave(formData);
    setEditMode(false);
  };

  const { isOrgAdmin, canEditClients } = permissions;
  const canEdit = isOrgAdmin || canEditClients;

  // Funções auxiliares para formatação
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (minutes) => {
    if (!minutes) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <User size={20} className="text-blue-700" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{client.name}</h2>
              <div className="flex space-x-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${client.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-800'
                  }`}>
                  {client.is_active ? 'Ativo' : 'Inativo'}
                </span>
                {client.nif && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    NIF: {client.nif}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle size={20} />
          </button>
        </div>

        {/* Navegação */}
        <div className="border-b">
          <nav className="flex overflow-x-auto">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              onClick={() => setActiveTab('overview')}
            >
              Visão Geral
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'tasks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              onClick={() => setActiveTab('tasks')}
            >
              Tarefas
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'time'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              onClick={() => setActiveTab('time')}
            >
              Tempo
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'profitability'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              onClick={() => setActiveTab('profitability')}
            >
              Rentabilidade
            </button>
          </nav>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              {/* Tab de Visão Geral */}
              {activeTab === 'overview' && (
                <>
                  {editMode ? (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <h3 className="text-lg font-semibold">Editar Cliente</h3>
                        <div className="space-x-2">
                          <button
                            onClick={() => setEditMode(false)}
                            className="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSave}
                            className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">NIF</label>
                          <input
                            type="text"
                            name="nif"
                            value={formData.nif || ''}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email || ''}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone || ''}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Morada</label>
                          <input
                            type="text"
                            name="address"
                            value={formData.address || ''}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Avença Mensal (€)</label>
                          <input
                            type="number"
                            name="monthly_fee"
                            value={formData.monthly_fee || ''}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            step="0.01"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                          <textarea
                            name="notes"
                            value={formData.notes || ''}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            rows={3}
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="is_active"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600"
                          />
                          <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                            Cliente Ativo
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Informações do Cliente</h3>
                        {canEdit && (
                          <button
                            onClick={() => setEditMode(true)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 flex items-center"
                          >
                            <Edit size={14} className="mr-1" />
                            Editar
                          </button>
                        )}
                      </div>

                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <dl>
                          <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-gray-200">
                            <dt className="text-sm font-medium text-gray-500">Nome</dt>
                            <dd className="text-sm text-gray-900 col-span-2">{client.name}</dd>
                          </div>
                          {client.nif && (
                            <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-gray-200">
                              <dt className="text-sm font-medium text-gray-500">NIF</dt>
                              <dd className="text-sm text-gray-900 col-span-2">{client.nif}</dd>
                            </div>
                          )}
                          {client.email && (
                            <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-gray-200">
                              <dt className="text-sm font-medium text-gray-500">Email</dt>
                              <dd className="text-sm text-gray-900 col-span-2">
                                <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                                  {client.email}
                                </a>
                              </dd>
                            </div>
                          )}
                          {client.phone && (
                            <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-gray-200">
                              <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                              <dd className="text-sm text-gray-900 col-span-2">
                                <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                                  {client.phone}
                                </a>
                              </dd>
                            </div>
                          )}
                          {client.address && (
                            <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-gray-200">
                              <dt className="text-sm font-medium text-gray-500">Morada</dt>
                              <dd className="text-sm text-gray-900 col-span-2">{client.address}</dd>
                            </div>
                          )}
                          <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-gray-200">
                            <dt className="text-sm font-medium text-gray-500">Avença Mensal</dt>
                            <dd className="text-sm text-gray-900 col-span-2 font-medium">
                              {client.monthly_fee ? `${client.monthly_fee} €` : 'Não definida'}
                            </dd>
                          </div>
                          {client.account_manager_name && (
                            <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-gray-200">
                              <dt className="text-sm font-medium text-gray-500">Gestor de Conta</dt>
                              <dd className="text-sm text-gray-900 col-span-2">{client.account_manager_name}</dd>
                            </div>
                          )}
                          <div className="px-4 py-3 grid grid-cols-3 gap-4 border-b border-gray-200">
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="text-sm col-span-2">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${client.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-200 text-gray-800'
                                }`}>
                                {client.is_active ? 'Ativo' : 'Inativo'}
                              </span>
                            </dd>
                          </div>
                          {client.notes && (
                            <div className="px-4 py-3 grid grid-cols-3 gap-4">
                              <dt className="text-sm font-medium text-gray-500">Observações</dt>
                              <dd className="text-sm text-gray-900 col-span-2 whitespace-pre-wrap">{client.notes}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      {/* Resumo de Rentabilidade */}
                      {profitabilityData && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h4 className="text-base font-medium mb-3 flex items-center">
                            <BarChart2 size={18} className="mr-2 text-blue-600" />
                            Resumo de Rentabilidade
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-center">
                              <span className="text-xs text-gray-600 block mb-1">Avença Mensal</span>
                              <span className="text-lg font-bold text-green-700">{formatCurrency(profitabilityData.monthly_fee)}</span>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-center">
                              <span className="text-xs text-gray-600 block mb-1">Tempo Registrado</span>
                              <span className="text-lg font-bold text-blue-700">{formatTime(profitabilityData.total_time_minutes)}</span>
                            </div>
                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-center">
                              <span className="text-xs text-gray-600 block mb-1">Custo Total</span>
                              <span className="text-lg font-bold text-amber-700">
                                {formatCurrency(parseFloat(profitabilityData.time_cost) + parseFloat(profitabilityData.total_expenses))}
                              </span>
                            </div>
                            <div className="p-3 rounded-lg border text-center"
                              style={{
                                backgroundColor: profitabilityData.is_profitable ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderColor: profitabilityData.is_profitable ? 'rgba(52, 211, 153, 0.5)' : 'rgba(239, 68, 68, 0.5)'
                              }}
                            >
                              <span className="text-xs text-gray-600 block mb-1">Margem de Lucro</span>
                              <span className={`text-lg font-bold ${profitabilityData.is_profitable ? 'text-green-700' : 'text-red-700'}`}>
                                {profitabilityData.profit_margin.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 text-right">
                            <a
                              href={`/clientprofitability?client=${client.id}`}
                              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
                            >
                              Ver relatório completo <ArrowRight size={14} className="ml-1" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Resumo de Atividades Recentes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tarefas Recentes */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h4 className="text-base font-medium mb-3 flex items-center">
                            <Clock size={18} className="mr-2 text-blue-600" />
                            Tarefas Recentes
                          </h4>
                          {tasks.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                              {tasks.slice(0, 3).map(task => (
                                <li key={task.id} className="py-2">
                                  <div className="flex items-start">
                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'completed' ? 'bg-green-500' :
                                        task.status === 'in_progress' ? 'bg-blue-500' :
                                          'bg-amber-500'
                                      }`}></div>
                                    <div className="ml-3">
                                      <p className="text-sm font-medium">{task.title}</p>
                                      <p className="text-xs text-gray-500">
                                        Status: {
                                          task.status === 'pending' ? 'Pendente' :
                                            task.status === 'in_progress' ? 'Em Progresso' :
                                              task.status === 'completed' ? 'Concluída' : 'Cancelada'
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-3">
                              Nenhuma tarefa encontrada
                            </p>
                          )}
                          <div className="mt-2 text-right">
                            <a
                              href={`/tasks?client=${client.id}`}
                              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
                            >
                              Ver todas as tarefas <ArrowRight size={14} className="ml-1" />
                            </a>
                          </div>
                        </div>

                        {/* Entradas de Tempo Recentes */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h4 className="text-base font-medium mb-3 flex items-center">
                            <Calendar size={18} className="mr-2 text-blue-600" />
                            Tempo Registrado
                          </h4>
                          {timeEntries.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                              {timeEntries.slice(0, 3).map(entry => (
                                <li key={entry.id} className="py-2">
                                  <div className="flex justify-between">
                                    <div>
                                      <p className="text-sm font-medium truncate max-w-[200px]">{entry.description}</p>
                                      <p className="text-xs text-gray-500">
                                        {formatDate(entry.date)} • {entry.user_name}
                                      </p>
                                    </div>
                                    <span className="text-sm font-semibold">
                                      {formatTime(entry.minutes_spent)}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-3">
                              Nenhum registro de tempo encontrado
                            </p>
                          )}
                          <div className="mt-2 text-right">
                            <a
                              href={`/timeentry?client=${client.id}`}
                              className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
                            >
                              Ver todos os registros <ArrowRight size={14} className="ml-1" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Tab de Tarefas */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Tarefas do Cliente</h3>
                    <a
                      href={`/tasks?client=${client.id}`}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 flex items-center"
                    >
                      <Plus size={14} className="mr-1" />
                      Nova Tarefa
                    </a>
                  </div>

                  {tasks.length > 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prazo</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tasks.map(task => (
                            <tr key={task.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{task.title}</div>
                                {task.description && (
                                  <div className="text-xs text-gray-500 truncate max-w-xs">{task.description}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatDate(task.deadline)}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                      task.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                        'bg-gray-100 text-gray-800'
                                  }`}>
                                  {task.status === 'pending' ? 'Pendente' :
                                    task.status === 'in_progress' ? 'Em Progresso' :
                                      task.status === 'completed' ? 'Concluída' : 'Cancelada'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{task.assigned_to_name || 'Não atribuído'}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                      <Clock size={40} className="mx-auto text-gray-400 mb-3" />
                      <h4 className="text-lg font-medium text-gray-900 mb-1">Sem tarefas</h4>
                      <p className="text-gray-500 mb-4">Este cliente ainda não possui tarefas atribuídas.</p>
                      <a
                        href={`/tasks?client=${client.id}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus size={14} className="mr-1" />
                        Criar Nova Tarefa
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Tab de Tempo */}
              {activeTab === 'time' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Registros de Tempo</h3>
                    <a
                      href={`/timeentry?client=${client.id}`}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 flex items-center"
                    >
                      <Plus size={14} className="mr-1" />
                      Novo Registro
                    </a>
                  </div>

                  {timeEntries.length > 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tempo</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {timeEntries.map(entry => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{formatDate(entry.date)}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-900 truncate max-w-xs">{entry.description}</div>
                                {entry.task_title && (
                                  <div className="text-xs text-gray-500">Tarefa: {entry.task_title}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{entry.user_name}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{formatTime(entry.minutes_spent)}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                      <Clock size={40} className="mx-auto text-gray-400 mb-3" />
                      <h4 className="text-lg font-medium text-gray-900 mb-1">Sem registros de tempo</h4>
                      <p className="text-gray-500 mb-4">Este cliente ainda não possui registros de tempo.</p>
                      <a
                        href={`/timeentry?client=${client.id}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus size={14} className="mr-1" />
                        Registrar Tempo
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Tab de Rentabilidade */}
              {activeTab === 'profitability' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Rentabilidade</h3>
                    <a
                      href={`/clientprofitability?client=${client.id}`}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 flex items-center"
                    >
                      <ExternalLink size={14} className="mr-1" />
                      Relatório Completo
                    </a>
                  </div>

                  {profitabilityData ? (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                            <DollarSign size={16} className="mr-1 text-blue-600" />
                            Resumo Financeiro
                          </h4>

                          <div className="space-y-4">
                            <div className="flex justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                              <span className="text-sm text-gray-700">Avença Mensal</span>
                              <span className="font-medium">{formatCurrency(profitabilityData.monthly_fee)}</span>
                            </div>

                            <div className="flex justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                              <span className="text-sm text-gray-700">Custo do Tempo</span>
                              <span className="font-medium">{formatCurrency(profitabilityData.time_cost)}</span>
                            </div>

                            <div className="flex justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                              <span className="text-sm text-gray-700">Despesas</span>
                              <span className="font-medium">{formatCurrency(profitabilityData.total_expenses)}</span>
                            </div>

                            <div className="flex justify-between p-3 rounded-lg border"
                              style={{
                                backgroundColor: profitabilityData.is_profitable ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderColor: profitabilityData.is_profitable ? 'rgba(52, 211, 153, 0.5)' : 'rgba(239, 68, 68, 0.5)'
                              }}
                            >
                              <span className="text-sm text-gray-700">Lucro</span>
                              <span className={`font-medium ${profitabilityData.is_profitable ? 'text-green-700' : 'text-red-700'}`}>
                                {formatCurrency(profitabilityData.profit)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
                            <BarChart2 size={16} className="mr-1 text-blue-600" />
                            Métricas de Desempenho
                          </h4>

                          <div className="space-y-4">
                            <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <span className="text-sm text-gray-700">Tempo Total Registrado</span>
                              <span className="font-medium">{formatTime(profitabilityData.total_time_minutes)}</span>
                            </div>

                            <div className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <span className="text-sm text-gray-700">Custo Médio por Hora</span>
                              <span className="font-medium">
                                {formatCurrency(
                                  profitabilityData.total_time_minutes > 0
                                    ? (profitabilityData.time_cost / (profitabilityData.total_time_minutes / 60))
                                    : 0
                                )}
                              </span>
                            </div>

                            <div className="flex justify-between p-3 rounded-lg border"
                              style={{
                                backgroundColor: profitabilityData.is_profitable ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderColor: profitabilityData.is_profitable ? 'rgba(52, 211, 153, 0.5)' : 'rgba(239, 68, 68, 0.5)'
                              }}
                            >
                              <span className="text-sm text-gray-700">Margem de Lucro</span>
                              <span className={`font-medium ${profitabilityData.is_profitable ? 'text-green-700' : 'text-red-700'}`}>
                                {profitabilityData.profit_margin.toFixed(2)}%
                              </span>
                            </div>

                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <span className="text-sm text-gray-700">Status</span>
                              <span className={`px-2 py-0.5 text-xs leading-5 font-semibold rounded-full ${profitabilityData.is_profitable
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                                }`}>
                                {profitabilityData.is_profitable ? 'Rentável' : 'Não Rentável'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {!profitabilityData.is_profitable && (
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200 mb-4">
                          <div className="flex items-start">
                            <AlertTriangle size={20} className="text-red-600 mr-3 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-medium text-red-800">Alerta de Rentabilidade</h4>
                              <p className="text-sm text-red-700 mt-1">
                                Este cliente está gerando um prejuízo de {formatCurrency(Math.abs(profitabilityData.profit))}.
                                Recomenda-se revisar a avença mensal ou otimizar o tempo gasto nas tarefas.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-2">Última atualização: {formatDate(profitabilityData.last_updated)}</p>
                        <a
                          href={`/clientprofitability?client=${client.id}`}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <BarChart2 size={14} className="mr-1" />
                          Ver Relatório Detalhado
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
                      <BarChart2 size={40} className="mx-auto text-gray-400 mb-3" />
                      <h4 className="text-lg font-medium text-gray-900 mb-1">Sem dados de rentabilidade</h4>
                      <p className="text-gray-500 mb-4">Não há dados de rentabilidade disponíveis para este cliente.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ClientManagement = () => {
  // Estados
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [filters, setFilters] = useState({
    active: true,
    search: "",
  });
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  // React Query
  const queryClient = useQueryClient();

  // Obter permissões do contexto
  const permissions = usePermissions();

  // Fetch de clientes e usuários usando React Query
  const {
    data: clients = [],
    isLoading: isClientsLoading,
    isError: isClientsError,
    error: clientsError,
    refetch: refetchClients
  } = useQuery({
    queryKey: ['clients', filters.active],
    queryFn: async () => {
      const response = await api.get(`/clients/?is_active=${filters.active}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const {
    data: users = [],
    isLoading: isUsersLoading
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get("/profiles/");
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  // Mutações
  const createClientMutation = useMutation({
    mutationFn: (newClient) => api.post("/clients/", newClient),
    onSuccess: () => {
      toast.success("Cliente criado com sucesso");
      setShowForm(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) => {
      console.error("Erro ao criar cliente:", error);
      toast.error("Falha ao criar cliente");
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, updatedData }) => api.put(`/clients/${id}/`, updatedData),
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso");
      setShowForm(false);
      setSelectedClient(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar cliente:", error);
      toast.error("Falha ao atualizar cliente");
    }
  });

  const toggleClientStatusMutation = useMutation({
    mutationFn: (client) => api.patch(`/clients/${client.id}/`, { is_active: !client.is_active }),
    onSuccess: (data) => {
      const statusText = data.is_active ? "ativado" : "desativado";
      toast.success(`Cliente ${statusText} com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) => {
      console.error("Erro ao alterar status do cliente:", error);
      toast.error("Falha ao atualizar status do cliente");
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: (clientId) => api.delete(`/clients/${clientId}/`),
    onSuccess: () => {
      toast.success("Cliente excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) => {
      console.error("Erro ao excluir cliente:", error);
      toast.error("Falha ao excluir cliente");
    }
  });

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: "",
    nif: "",
    email: "",
    phone: "",
    address: "",
    account_manager: "",
    monthly_fee: "",
    is_active: true,
    notes: "",
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      nif: "",
      email: "",
      phone: "",
      address: "",
      account_manager: "",
      monthly_fee: "",
      is_active: true,
      notes: "",
    });
    setSelectedClient(null);
  };

  // Filtragem e Ordenação
  const filteredClients = useMemo(() => {
    if (!clients || clients.length === 0) return [];

    let result = [...clients];

    // Aplicar filtro de pesquisa
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (client) =>
          client.name.toLowerCase().includes(term) ||
          (client.nif && client.nif.toLowerCase().includes(term)) ||
          (client.email && client.email.toLowerCase().includes(term))
      );
    }

    // Aplicar ordenação
    if (sortConfig.key) {
      result.sort((a, b) => {
        // Tratamento para valores nulos
        if (!a[sortConfig.key]) return 1;
        if (!b[sortConfig.key]) return -1;

        // Ordenação de strings
        if (typeof a[sortConfig.key] === 'string') {
          const valA = a[sortConfig.key].toLowerCase();
          const valB = b[sortConfig.key].toLowerCase();

          if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
          if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        }

        // Ordenação numérica
        return sortConfig.direction === "asc"
          ? a[sortConfig.key] - b[sortConfig.key]
          : b[sortConfig.key] - a[sortConfig.key];
      });
    }

    return result;
  }, [clients, searchTerm, sortConfig]);

  // Handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    const { name, checked } = e.target;
    setFilters({
      ...filters,
      [name]: checked,
    });
  };

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Verificar permissões
    if (selectedClient) {
      if (!permissions.canEditClients) {
        toast.error("Você não tem permissão para editar clientes");
        return;
      }
      // Atualizar cliente existente
      updateClientMutation.mutate({
        id: selectedClient.id,
        updatedData: formData
      });
    } else {
      if (!permissions.canCreateClients) {
        toast.error("Você não tem permissão para criar clientes");
        return;
      }
      // Criar novo cliente
      createClientMutation.mutate(formData);
    }
  };

  const selectClientForEdit = (client) => {
    if (!permissions.canEditClients) {
      toast.error("Você não tem permissão para editar clientes");
      return;
    }

    setSelectedClient(client);
    setFormData({
      name: client.name,
      nif: client.nif || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      account_manager: client.account_manager || "",
      monthly_fee: client.monthly_fee ? client.monthly_fee.toString() : "",
      is_active: client.is_active,
      notes: client.notes || "",
    });
    setShowForm(true);
  };

  const handleViewClientDetails = (client) => {
    setSelectedClient(client);
    setShowClientModal(true);
  };

  const confirmDelete = (clientId) => {
    if (!permissions.canDeleteClients) {
      toast.error("Você não tem permissão para excluir clientes");
      return;
    }

    if (window.confirm("Tem certeza que deseja excluir este cliente? Esta ação não poderá ser desfeita.")) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const toggleClientStatus = (client) => {
    if (!permissions.canChangeClientStatus) {
      toast.error("Você não tem permissão para ativar/desativar clientes");
      return;
    }

    toggleClientStatusMutation.mutate(client);
  };

  const closeClientModal = () => {
    setShowClientModal(false);
    setSelectedClient(null);
  };

  const saveClientFromModal = (updatedClient) => {
    updateClientMutation.mutate({
      id: updatedClient.id,
      updatedData: updatedClient
    });

    // Não fechamos o modal aqui porque queremos que o usuário veja que os dados foram salvos
    // O modal será fechado com a navegação para outra aba ou explicitamente pelo usuário
  };

  // Verificação de estado de carregamento
  const isLoading =
    isClientsLoading ||
    isUsersLoading ||
    createClientMutation.isPending ||
    updateClientMutation.isPending ||
    toggleClientStatusMutation.isPending ||
    deleteClientMutation.isPending;

  // Verificar se usuário pode gerenciar clientes ou ver clientes
  const canViewClients =
    permissions.canManageClients ||
    permissions.canViewAllClients;

  if (permissions.loading) {
    return <Header><LoadingView /></Header>;
  }

  if (!canViewClients) {
    return (
      <div className="main">
        <Header>
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 max-w-lg">
              <div className="flex items-start">
                <AlertCircle className="h-6 w-6 mr-2" />
                <div>
                  <p className="font-bold">Acesso Restrito</p>
                  <p>Você não possui permissões para visualizar ou gerenciar clientes.</p>
                </div>
              </div>
            </div>
            <p className="text-gray-600">
              Entre em contato com o administrador da sua organização para solicitar acesso.
            </p>
          </div>
        </Header>
      </div>
    );
  }

  return (
    <div className="main">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />

      <Header>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="p-6 bg-white min-h-screen"
          style={{ marginLeft: "3%" }}
        >
          <div className="client-management-header">
            <h1 className="text-2xl font-bold">Gestão de Clientes</h1>
            <div className="flex space-x-3">
              {(permissions.isOrgAdmin || permissions.canCreateClients) && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    resetForm();
                    setShowForm(!showForm);
                  }}
                  className={`${showForm
                      ? "bg-gray-600 hover:bg-gray-700"
                      : "bg-blue-600 hover:bg-blue-700"
                    } text-white px-4 py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm`}
                  disabled={isLoading}
                >
                  {showForm ? (
                    "Cancelar"
                  ) : (
                    <>
                      <Plus size={18} className="mr-2" />
                      Novo Cliente
                    </>
                  )}
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => refetchClients()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <RefreshCw size={18} />
                )}
              </motion.button>

              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                href="/clientprofitability"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-300 shadow-sm"
              >
                <BarChart2 size={18} className="mr-2" />
                Relatório de Rentabilidade
              </motion.a>
            </div>


            {/* Formulário de Cliente */}
            <AnimatePresence>
              {showForm && (
                <motion.div
                  key="client-form"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white p-6 rounded-lg shadow mb-6"
                >
                  <h2 className="text-xl font-semibold mb-4">
                    {selectedClient ? "Editar Cliente" : "Adicionar Novo Cliente"}
                  </h2>
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 mb-2">Nome *</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">
                          NIF/NIPC
                        </label>
                        <input
                          type="text"
                          name="nif"
                          value={formData.nif}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">Telefone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">Morada</label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">
                          Gestor de Conta
                        </label>
                        <select
                          name="account_manager"
                          value={formData.account_manager}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Selecionar Gestor</option>
                          {users.map((user) => (
                            <option key={user.user} value={user.user}>
                              {user.username}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 mb-2">
                          Avença Mensal (€)
                        </label>
                        <input
                          type="number"
                          name="monthly_fee"
                          value={formData.monthly_fee}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          step="0.01"
                          min="0"
                        />
                      </div>

                      <div className="flex items-center mt-6">
                        <input
                          type="checkbox"
                          id="is_active"
                          name="is_active"
                          checked={formData.is_active}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600"
                        />
                        <label htmlFor="is_active" className="ml-2 text-gray-700">
                          Cliente Ativo
                        </label>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-gray-700 mb-2">Observações</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 mr-2"
                        disabled={isLoading}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center">
                            <Loader2 className="animate-spin h-5 w-5 mr-2" />
                            <span>Processando...</span>
                          </div>
                        ) : (
                          <span>{selectedClient ? "Atualizar Cliente" : "Adicionar Cliente"}</span>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
</div><div>
            {/* Filtros e Pesquisa */}
            <motion.div
              variants={itemVariants}
              className="bg-white p-6 rounded-lg shadow mb-6"
            >
              <div className="filters-bar">
                <div className="flex items-center mb-4 md:mb-0">
                  <div className="flex items-center mr-4">
                    <input
                      type="checkbox"
                      id="active"
                      name="active"
                      checked={filters.active}
                      onChange={handleFilterChange}
                      className="h-4 w-4 text-blue-600"
                    />
                    <label htmlFor="active" className="ml-2 text-gray-700">
                      Mostrar apenas clientes ativos
                    </label>
                  </div>

                  <ViewToggle
                    activeView={viewMode}
                    onChange={setViewMode}
                  />
                </div>

                <div className="w-full md:w-1/3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pesquisar clientes..."
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
              </div>
            </motion.div>
          </div>
          <div>
            {/* Lista de Clientes */}
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-lg shadow"
            >
              <div className="client-list-header">
                <h2 className="text-xl font-semibold">Lista de Clientes ({filteredClients.length})</h2>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>

              {isLoading && filteredClients.length === 0 ? (
                <div className="p-6 flex justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Nenhum cliente encontrado.{" "}
                  {searchTerm
                    ? "Tente ajustar sua pesquisa."
                    : "Crie seu primeiro cliente!"}
                </div>
              ) : (
                <div className="p-6">
                  {viewMode === 'grid' ? (
                    // Visualização em Grid
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredClients.map((client) => (
                        <ClientCard
                          key={client.id}
                          client={client}
                          onEdit={selectClientForEdit}
                          onToggleStatus={toggleClientStatus}
                          onDelete={confirmDelete}
                          permissions={permissions}
                          onClick={() => handleViewClientDetails(client)}
                        />
                      ))}
                    </div>
                  ) : (
                    // Visualização em Lista/Tabela
                    <div className="overflow-x-auto">
                      <table className="client-table">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <button
                                onClick={() => handleSort("name")}
                                className="flex items-center"
                              >
                                Nome
                                {sortConfig.key === "name" ? (
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
                              Contacto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <button
                                onClick={() => handleSort("account_manager_name")}
                                className="flex items-center"
                              >
                                Gestor de Conta
                                {sortConfig.key === "account_manager_name" ? (
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
                                onClick={() => handleSort("monthly_fee")}
                                className="flex items-center"
                              >
                                Avença Mensal
                                {sortConfig.key === "monthly_fee" ? (
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
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredClients.map((client) => (
                            <tr key={client.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewClientDetails(client)}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-gray-600 font-medium">
                                      {client.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="ml-4">
                                    <div className="font-medium text-gray-900">
                                      {client.name}
                                    </div>
                                    <div className="text-gray-500 text-sm">
                                      {client.nif || "Sem NIF"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-gray-900">
                                  {client.email || "Sem email"}
                                </div>
                                <div className="text-gray-500 text-sm">
                                  {client.phone || "Sem telefone"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {client.account_manager_name || "Não atribuído"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="font-medium">
                                  {client.monthly_fee
                                    ? `${client.monthly_fee} €`
                                    : "Não definida"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                  ${client.is_active
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                    }`}
                                >
                                  {client.is_active ? "Ativo" : "Inativo"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center space-x-2">
                                  {(permissions.isOrgAdmin || permissions.canEditClients) && (
                                    <button
                                      onClick={() => selectClientForEdit(client)}
                                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                      title="Editar cliente"
                                    >
                                      <Edit size={18} />
                                    </button>
                                  )}

                                  {(permissions.isOrgAdmin || permissions.canChangeClientStatus) && (
                                    <button
                                      onClick={() => toggleClientStatus(client)}
                                      className={`p-1 rounded ${client.is_active
                                          ? "text-amber-600 hover:text-amber-900 hover:bg-amber-50"
                                          : "text-green-600 hover:text-green-900 hover:bg-green-50"
                                        }`}
                                      title={client.is_active ? "Desativar" : "Ativar"}
                                    >
                                      {client.is_active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                    </button>
                                  )}

                                  <a
                                    href={`/clientprofitability?client=${client.id}`}
                                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                    title="Ver relatório de rentabilidade"
                                  >
                                    <BarChart2 size={18} />
                                  </a>

                                  {(permissions.isOrgAdmin || permissions.canDeleteClients) && (
                                    <button
                                      onClick={() => confirmDelete(client.id)}
                                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                      title="Excluir cliente"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </Header>

      {/* Modal de Detalhes do Cliente */}
      {showClientModal && selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={closeClientModal}
          onSave={saveClientFromModal}
          permissions={permissions}
        />
      )}
    </div>
  );
};

export default ClientManagement;
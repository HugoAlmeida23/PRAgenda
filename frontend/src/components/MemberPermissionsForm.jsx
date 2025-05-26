import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building,
  Users,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Settings,
  UserMinus,
  Shield,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Search,
  Info,
  Save,
  ExternalLink,
  Loader,
  CheckSquare,
  User,
  Briefcase,
  Eye,
  EyeOff,
  Filter,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  Clock,
  DollarSign,
  BarChart,
  Settings as LucideSettings,
  Trash,
  PlusCircle,
} from "lucide-react";
import "../styles/Home.css";

// Member permissions form component
const MemberPermissionsForm = ({ member, onSave, onCancel, clients = [] }) => {
  const [formData, setFormData] = useState({
    user_id: member?.user || "",
    role: member?.role || "Colaborador",
    access_level: member?.access_level || "Standard",
    hourly_rate: member?.hourly_rate || 0,
    phone: member?.phone || "",
    
    // Admin permissions
    is_admin: member?.is_org_admin || false,
    
    // Client management permissions
    can_manage_clients: member?.can_manage_clients || false,
    can_view_all_clients: member?.can_view_all_clients || false,
    can_create_clients: member?.can_create_clients || false,
    can_edit_clients: member?.can_edit_clients || false,
    can_delete_clients: member?.can_delete_clients || false,
    can_change_client_status: member?.can_change_client_status || false,
    
    // Task management permissions
    can_assign_tasks: member?.can_assign_tasks || false,
    can_create_tasks: member?.can_create_tasks || false,
    can_edit_all_tasks: member?.can_edit_all_tasks || false,
    can_edit_assigned_tasks: member?.can_edit_assigned_tasks || false,
    can_delete_tasks: member?.can_delete_tasks || false,
    can_view_all_tasks: member?.can_view_all_tasks || false,
    can_approve_tasks: member?.can_approve_tasks || false,
    
    // Time management permissions
    can_log_time: member?.can_log_time || true,
    can_edit_own_time: member?.can_edit_own_time || true,
    can_edit_all_time: member?.can_edit_all_time || false,
    can_view_team_time: member?.can_view_team_time || false,
    
    // Financial permissions
    can_view_client_fees: member?.can_view_client_fees || false,
    can_edit_client_fees: member?.can_edit_client_fees || false,
    can_manage_expenses: member?.can_manage_expenses || false,
    can_view_profitability: member?.can_view_profitability || false,
    can_view_team_profitability: member?.can_view_team_profitability || false,
    can_view_organization_profitability: member?.can_view_organization_profitability || false,
    
    // Report permissions
    can_view_analytics: member?.can_view_analytics || false,
    can_export_reports: member?.can_export_reports || false,
    can_create_custom_reports: member?.can_create_custom_reports || false,
    can_schedule_reports: member?.can_schedule_reports || false,
    
    // Workflow permissions
    can_create_workflows: member?.can_create_workflows || false,
    can_edit_workflows: member?.can_edit_workflows || false,
    can_assign_workflows: member?.can_assign_workflows || false,
    can_manage_workflows: member?.can_manage_workflows || false,
  });
  
  // State for client permissions
  const [selectedClients, setSelectedClients] = useState(
    member?.visible_clients || []
  );
  
  // Current active section in the form
  const [activeSection, setActiveSection] = useState("basic");
  
  // Role presets for quick setup
  const rolePresets = [
    { value: "administrador", label: "Administrador" },
    { value: "gerente_contabilidade", label: "Gerente de Contabilidade" },
    { value: "contador_senior", label: "Contador Sênior" },
    { value: "contador", label: "Contador" },
    { value: "assistente_contabil", label: "Assistente Contábil" },
    { value: "financeiro", label: "Financeiro" },
    { value: "recursos_humanos", label: "Recursos Humanos" },
    { value: "administrativo", label: "Administrativo" }
  ];
  
  // Effect to initialize selected clients
  useEffect(() => {
    if (member && member.visible_clients_info) {
      setSelectedClients(member.visible_clients_info.map(client => client.id));
    }
  }, [member]);
  
  // Handle input change for form fields
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // For checkbox inputs, use the checked property
    if (type === "checkbox") {
      // Special case: Admin role should enable all permissions
      if (name === "is_admin" && checked) {
        setFormData({
          ...formData,
          is_admin: true,
          can_manage_clients: true,
          can_view_all_clients: true,
          can_create_clients: true,
          can_edit_clients: true,
          can_delete_clients: true,
          can_change_client_status: true,
          can_assign_tasks: true,
          can_create_tasks: true,
          can_edit_all_tasks: true,
          can_edit_assigned_tasks: true,
          can_delete_tasks: true,
          can_view_all_tasks: true,
          can_approve_tasks: true,
          can_log_time: true,
          can_edit_own_time: true,
          can_edit_all_time: true,
          can_view_team_time: true,
          can_view_client_fees: true,
          can_edit_client_fees: true,
          can_manage_expenses: true,
          can_view_profitability: true,
          can_view_team_profitability: true,
          can_view_organization_profitability: true,
          can_view_analytics: true,
          can_export_reports: true,
          can_create_custom_reports: true,
          can_schedule_reports: true,
          can_create_workflows: true,
          can_edit_workflows: true,
          can_assign_workflows: true,
          can_manage_workflows: true
        });
      } 
      // View all clients clears the selected clients list
      else if (name === "can_view_all_clients" && checked) {
        setSelectedClients([]);
        setFormData({ ...formData, [name]: checked });
      } 
      // Regular checkbox handling
      else {
        setFormData({ ...formData, [name]: checked });
      }
    } 
    // For non-checkbox inputs, use the value property
    else {
      // For hourly rate, ensure it's a number
      if (name === "hourly_rate") {
        const numberValue = parseFloat(value) || 0;
        setFormData({ ...formData, [name]: numberValue });
      } else {
        setFormData({ ...formData, [name]: value });
      }
    }
  };

  
  // Handle client selection
  const handleClientSelection = (clientId) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare data for submission
    const dataToSubmit = {
      ...formData,
      visible_clients: selectedClients
    };
    
    // Call the onSave callback with the form data
    onSave(dataToSubmit);
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-semibold">
          {/* MODIFIED: Title can be more dynamic */}
          {member?.user ? "Editar Permissões do Membro" : "Configurar Permissões Detalhadas (Passo 2 de 2)"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <XCircle size={24} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Navigation tabs for form sections */}
        <div className="flex overflow-x-auto space-x-2 mb-6 pb-2 border-b">
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              activeSection === "basic"
                ? "bg-blue-100 text-blue-800 font-medium"
                : "text-gray-600 hover:bg-white-100"
            }`}
            onClick={() => setActiveSection("basic")}
          >
            <User size={16} className="inline mr-2" />
            Básico
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              activeSection === "clients"
                ? "bg-blue-100 text-blue-800 font-medium"
                : "text-gray-600 hover:bg-white-100"
            }`}
            onClick={() => setActiveSection("clients")}
          >
            <Briefcase size={16} className="inline mr-2" />
            Clientes
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              activeSection === "tasks"
                ? "bg-blue-100 text-blue-800 font-medium"
                : "text-gray-600 hover:bg-white-100"
            }`}
            onClick={() => setActiveSection("tasks")}
          >
            <CheckSquare size={16} className="inline mr-2" />
            Tarefas
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              activeSection === "time"
                ? "bg-blue-100 text-blue-800 font-medium"
                : "text-gray-600 hover:bg-white-100"
            }`}
            onClick={() => setActiveSection("time")}
          >
            <Clock size={16} className="inline mr-2" />
            Tempo
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              activeSection === "financial"
                ? "bg-blue-100 text-blue-800 font-medium"
                : "text-gray-600 hover:bg-white-100"
            }`}
            onClick={() => setActiveSection("financial")}
          >
            <DollarSign size={16} className="inline mr-2" />
            Financeiro
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              activeSection === "reports"
                ? "bg-blue-100 text-blue-800 font-medium"
                : "text-gray-600 hover:bg-white-100"
            }`}
            onClick={() => setActiveSection("reports")}
          >
            <BarChart size={16} className="inline mr-2" />
            Relatórios
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md ${
              activeSection === "workflows"
                ? "bg-blue-100 text-blue-800 font-medium"
                : "text-gray-600 hover:bg-white-100"
            }`}
            onClick={() => setActiveSection("workflows")}
          >
            <Settings size={16} className="inline mr-2" />
            Workflows
          </button>
        </div>
        
        {/* Basic information section */}
        {activeSection === "basic" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Função</label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Ex: Contador, Gestor, Assistente"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Nível de Acesso</label>
                <input
                  type="text"
                  name="access_level"
                  value={formData.access_level}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Ex: Standard, Premium, Limited"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Preço à Hora (€)</label>
                <input
                  type="number"
                  name="hourly_rate"
                  value={formData.hourly_rate}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  step="0.01"
                  min="0"
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
                  placeholder="Número de telefone"
                />
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    type="checkbox"
                    name="is_admin"
                    checked={formData.is_admin}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="is_admin" className="font-medium text-purple-800">
                    Administrador da Organização
                  </label>
                  <p className="text-purple-700">
                    Administradores têm acesso completo a todas as funções do sistema e podem gerenciar outros membros.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Client permissions section */}
        {activeSection === "clients" && (
          <div className="space-y-6">
            <div className="bg-white-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-3">Permissões de Clientes</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      type="checkbox"
                      name="can_manage_clients"
                      checked={formData.can_manage_clients}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="can_manage_clients" className="font-medium text-gray-700">
                      Gerir Clientes
                    </label>
                    <p className="text-gray-500">
                      Pode gerenciar informações de clientes e configurações.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      type="checkbox"
                      name="can_view_all_clients"
                      checked={formData.can_view_all_clients}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="can_view_all_clients" className="font-medium text-gray-700">
                      Ver Todos os Clientes
                    </label>
                    <p className="text-gray-500">
                      Pode visualizar todos os clientes da organização.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      type="checkbox"
                      name="can_create_clients"
                      checked={formData.can_create_clients}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="can_create_clients" className="font-medium text-gray-700">
                      Criar Clientes
                    </label>
                    <p className="text-gray-500">
                      Pode adicionar novos clientes ao sistema.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      type="checkbox"
                      name="can_edit_clients"
                      checked={formData.can_edit_clients}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="can_edit_clients" className="font-medium text-gray-700">
                      Editar Clientes
                    </label>
                    <p className="text-gray-500">
                      Pode modificar detalhes de clientes existentes.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      type="checkbox"
                      name="can_delete_clients"
                      checked={formData.can_delete_clients}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="can_delete_clients" className="font-medium text-gray-700">
                      Excluir Clientes
                    </label>
                    <p className="text-gray-500">
                      Pode remover clientes do sistema.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      type="checkbox"
                      name="can_change_client_status"
                      checked={formData.can_change_client_status}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="can_change_client_status" className="font-medium text-gray-700">
                      Ativar/Desativar Clientes
                    </label>
                    <p className="text-gray-500">
                      Pode alterar o status de ativo/inativo dos clientes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Client visibility section - only if can_view_all_clients is false */}
            {!formData.can_view_all_clients && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-medium text-blue-800 mb-3 flex items-center">
                  <Eye size={18} className="mr-2" />
                  Clientes Visíveis
                </h3>
                
                <p className="text-blue-700 mb-4">
                 Selecione quais clientes este membro poderá visualizar. Se nenhum cliente for selecionado, ele não poderá ver nenhum cliente.
                </p>
                
                {clients && clients.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto border border-blue-200 rounded-lg mt-3">
                    <div className="space-y-1 p-2">
                      {clients.map((client) => (
                        <label 
                          key={client.id} 
                          className="flex items-center p-2 hover:bg-blue-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedClients.includes(client.id)}
                            onChange={() => handleClientSelection(client.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="ml-3 text-sm">
                            <div className="font-medium text-gray-700">{client.name}</div>
                            {client.email && <div className="text-gray-500">{client.email}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center mt-3">
                    <p className="text-gray-500">Não há clientes disponíveis para seleção.</p>
                  </div>
                )}
                
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-blue-700">
                    {selectedClients.length} {selectedClients.length === 1 ? 'cliente' : 'clientes'} selecionado(s)
                  </span>
                  <div className="space-x-3">
                    <button
                      type="button"
                      onClick={() => setSelectedClients(clients.map(c => c.id))}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      Selecionar todos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedClients([])}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      Limpar seleção
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
   
        {activeSection === "tasks" && (
          <div className="space-y-6">
              <div className="bg-white-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-3">Permissões de Tarefas</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_assign_tasks"
                        checked={formData.can_assign_tasks}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_assign_tasks" className="font-medium text-gray-700">
                        Atribuir Tarefas
                      </label>
                      <p className="text-gray-500">
                        Pode atribuir tarefas a outros membros.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_create_tasks"
                        checked={formData.can_create_tasks}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_create_tasks" className="font-medium text-gray-700">
                        Criar Tarefas
                      </label>
                      <p className="text-gray-500">
                        Pode criar novas tarefas.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_edit_all_tasks"
                        checked={formData.can_edit_all_tasks}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_edit_all_tasks" className="font-medium text-gray-700">
                        Editar Todas as Tarefas
                      </label>
                      <p className="text-gray-500">
                        Pode editar qualquer tarefa no sistema.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_edit_assigned_tasks"
                        checked={formData.can_edit_assigned_tasks}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_edit_assigned_tasks" className="font-medium text-gray-700">
                        Editar Tarefas Atribuídas
                      </label>
                      <p className="text-gray-500">
                        Pode editar tarefas atribuídas a si.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_delete_tasks"
                        checked={formData.can_delete_tasks}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_delete_tasks" className="font-medium text-gray-700">
                        Excluir Tarefas
                      </label>
                      <p className="text-gray-500">
                        Pode excluir tarefas do sistema.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_view_all_tasks"
                        checked={formData.can_view_all_tasks}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_view_all_tasks" className="font-medium text-gray-700">
                        Ver Todas as Tarefas
                      </label>
                      <p className="text-gray-500">
                        Pode visualizar todas as tarefas no sistema.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_approve_tasks"
                        checked={formData.can_approve_tasks}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_approve_tasks" className="font-medium text-gray-700">
                        Aprovar Tarefas
                      </label>
                      <p className="text-gray-500">
                        Pode aprovar etapas ou conclusão de tarefas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Time management permissions section */}
          {activeSection === "time" && (
            <div className="space-y-6">
              <div className="bg-white-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-3">Permissões de Gerenciamento de Tempo</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_log_time"
                        checked={formData.can_log_time}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_log_time" className="font-medium text-gray-700">
                        Registrar Tempo
                      </label>
                      <p className="text-gray-500">
                        Pode registrar tempo para tarefas.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_edit_own_time"
                        checked={formData.can_edit_own_time}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_edit_own_time" className="font-medium text-gray-700">
                        Editar Próprio Tempo
                      </label>
                      <p className="text-gray-500">
                        Pode editar registros de tempo próprios.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_edit_all_time"
                        checked={formData.can_edit_all_time}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_edit_all_time" className="font-medium text-gray-700">
                        Editar Todo o Tempo
                      </label>
                      <p className="text-gray-500">
                        Pode editar registros de tempo de qualquer membro.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_view_team_time"
                        checked={formData.can_view_team_time}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_view_team_time" className="font-medium text-gray-700">
                        Ver Tempo da Equipe
                      </label>
                      <p className="text-gray-500">
                        Pode visualizar registros de tempo de toda a equipe.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Financial permissions section */}
          {activeSection === "financial" && (
            <div className="space-y-6">
              <div className="bg-white-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-3">Permissões Financeiras</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_view_client_fees"
                        checked={formData.can_view_client_fees}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_view_client_fees" className="font-medium text-gray-700">
                        Ver Taxas de Clientes
                      </label>
                      <p className="text-gray-500">
                        Pode visualizar informações sobre valores pagos por clientes.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_edit_client_fees"
                        checked={formData.can_edit_client_fees}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_edit_client_fees" className="font-medium text-gray-700">
                        Editar Taxas de Clientes
                      </label>
                      <p className="text-gray-500">
                        Pode alterar valores pagos por clientes.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_manage_expenses"
                        checked={formData.can_manage_expenses}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_manage_expenses" className="font-medium text-gray-700">
                        Gerenciar Despesas
                      </label>
                      <p className="text-gray-500">
                        Pode adicionar, editar e excluir despesas.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_view_profitability"
                        checked={formData.can_view_profitability}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_view_profitability" className="font-medium text-gray-700">
                        Ver Rentabilidade
                      </label>
                      <p className="text-gray-500">
                        Pode visualizar relatórios de rentabilidade de clientes.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_view_team_profitability"
                        checked={formData.can_view_team_profitability}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_view_team_profitability" className="font-medium text-gray-700">
                        Ver Rentabilidade da Equipe
                      </label>
                      <p className="text-gray-500">
                        Pode visualizar relatórios de rentabilidade da equipe.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_view_organization_profitability"
                        checked={formData.can_view_organization_profitability}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_view_organization_profitability" className="font-medium text-gray-700">
                        Ver Rentabilidade da Organização
                      </label>
                      <p className="text-gray-500">
                        Pode visualizar relatórios de rentabilidade de toda a organização.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Reports permissions section */}
          {activeSection === "reports" && (
            <div className="space-y-6">
              <div className="bg-white-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-3">Permissões de Relatórios</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_view_analytics"
                        checked={formData.can_view_analytics}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_view_analytics" className="font-medium text-gray-700">
                        Ver Análises
                      </label>
                      <p className="text-gray-500">
                        Pode visualizar painéis de análise e dashboards.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_export_reports"
                        checked={formData.can_export_reports}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_export_reports" className="font-medium text-gray-700">
                        Exportar Relatórios
                      </label>
                      <p className="text-gray-500">
                        Pode exportar relatórios em vários formatos.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_create_custom_reports"
                        checked={formData.can_create_custom_reports}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_create_custom_reports" className="font-medium text-gray-700">
                        Criar Relatórios Personalizados
                      </label>
                      <p className="text-gray-500">
                        Pode criar relatórios personalizados.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_schedule_reports"
                        checked={formData.can_schedule_reports}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_schedule_reports" className="font-medium text-gray-700">
                        Agendar Relatórios
                      </label>
                      <p className="text-gray-500">
                        Pode configurar relatórios para execução agendada.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Workflow permissions section */}
          {activeSection === "workflows" && (
            <div className="space-y-6">
              <div className="bg-white-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-3">Permissões de Fluxos de Trabalho</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_create_workflows"
                        checked={formData.can_create_workflows}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_create_workflows" className="font-medium text-gray-700">
                        Criar Fluxos de Trabalho
                      </label>
                      <p className="text-gray-500">
                        Pode criar novos fluxos de trabalho.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_edit_workflows"
                        checked={formData.can_edit_workflows}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_edit_workflows" className="font-medium text-gray-700">
                        Editar Fluxos de Trabalho
                      </label>
                      <p className="text-gray-500">
                        Pode modificar fluxos de trabalho existentes.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_assign_workflows"
                        checked={formData.can_assign_workflows}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_assign_workflows" className="font-medium text-gray-700">
                        Atribuir Fluxos de Trabalho
                      </label>
                      <p className="text-gray-500">
                        Pode associar fluxos de trabalho a tarefas.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        name="can_manage_workflows"
                        checked={formData.can_manage_workflows}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="can_manage_workflows" className="font-medium text-gray-700">
                        Gerenciar Fluxos de Trabalho
                      </label>
                      <p className="text-gray-500">
                        Pode aprovar, rejeitar e gerenciar etapas de fluxos de trabalho.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
            >
              <Save size={18} className="inline mr-2" />
              Salvar Permissões
            </button>
          </div>
        </form>
      </div>
    );
  };
  
  export default MemberPermissionsForm;
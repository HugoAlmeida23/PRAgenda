import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import Header from "../components/Header";
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
  ExternalLink
} from "lucide-react";
import api from "../api";
import "../styles/Home.css";

// Componentes auxiliares de carregamento e erro
const LoadingView = () => (
  <div className="flex justify-center items-center min-h-screen">
    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
  </div>
);

const ErrorView = ({ message, onRetry }) => (
  <div className="flex flex-col justify-center items-center min-h-[300px] p-4 text-center">
    <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-lg" role="alert">
      <strong className="font-bold block sm:inline">Ocorreu um erro!</strong>
      <span className="block sm:inline"> {message || 'Falha ao carregar dados.'}</span>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <RotateCcw className="h-4 w-4 mr-2"/>
        Tentar novamente
      </button>
    )}
  </div>
);

// Funções para buscar dados
const fetchOrganization = async () => {
  const response = await api.get("/organizations/");
  // Como um usuário só deve ter uma organização, pegamos a primeira
  return response.data.length > 0 ? response.data[0] : null;
};

const fetchOrganizationMembers = async (organizationId) => {
  if (!organizationId) return [];
  const response = await api.get(`/organizations/${organizationId}/members/`);
  return response.data;
};

const fetchUsers = async () => {
  const response = await api.get("/profiles/");
  return response.data;
};

const OrganizationManagement = () => {
  const queryClient = useQueryClient();
  
  // Estados locais
  const [showOrganizationForm, setShowOrganizationForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [organizationFormData, setOrganizationFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    subscription_plan: "Básico",
    max_users: 5,
    logo: ""
  });
  const [memberFormData, setMemberFormData] = useState({
    user_id: "",
    role: "Colaborador",
    is_admin: false,
    can_assign_tasks: false,
    can_manage_clients: false
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [editingOrganization, setEditingOrganization] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Consultas React Query
  const { 
    data: organization,
    isLoading: isLoadingOrganization,
    isError: isErrorOrganization,
    error: organizationError,
    refetch: refetchOrganization
  } = useQuery({
    queryKey: ['organization'],
    queryFn: fetchOrganization,
    staleTime: 5 * 60 * 1000,
  });

  const { 
    data: members = [],
    isLoading: isLoadingMembers,
    isError: isErrorMembers,
    refetch: refetchMembers
  } = useQuery({
    queryKey: ['organizationMembers', organization?.id],
    queryFn: () => fetchOrganizationMembers(organization?.id),
    staleTime: 5 * 60 * 1000,
    enabled: !!organization?.id,
  });

  const { 
    data: users = [],
    isLoading: isLoadingUsers
  } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 10 * 60 * 1000,
  });

  // Mutações React Query
  const createOrganizationMutation = useMutation({
    mutationFn: (data) => api.post("/organizations/", data),
    onSuccess: () => {
      toast.success("Organização criada com sucesso");
      setShowOrganizationForm(false);
      resetOrganizationForm();
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error) => {
      console.error("Erro ao criar organização:", error);
      toast.error("Falha ao criar organização");
    }
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: (data) => api.put(`/organizations/${organization.id}/`, data),
    onSuccess: () => {
      toast.success("Organização atualizada com sucesso");
      setShowOrganizationForm(false);
      setEditingOrganization(false);
      resetOrganizationForm();
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar organização:", error);
      toast.error("Falha ao atualizar organização");
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: (data) => api.post(`/organizations/${organization.id}/add_member/`, data),
    onSuccess: () => {
      toast.success("Membro adicionado com sucesso");
      setShowMemberForm(false);
      resetMemberForm();
      queryClient.invalidateQueries({ queryKey: ['organizationMembers'] });
    },
    onError: (error) => {
      console.error("Erro ao adicionar membro:", error);
      toast.error("Falha ao adicionar membro");
    }
  });

  const updateMemberMutation = useMutation({
    mutationFn: (data) => api.post(`/organizations/${organization.id}/update_member/`, data),
    onSuccess: () => {
      toast.success("Permissões de membro atualizadas com sucesso");
      setSelectedMember(null);
      queryClient.invalidateQueries({ queryKey: ['organizationMembers'] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar permissões do membro:", error);
      toast.error("Falha ao atualizar permissões");
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (profileId) => api.post(`/organizations/${organization.id}/remove_member/`, { profile_id: profileId }),
    onSuccess: () => {
      toast.success("Membro removido com sucesso");
      queryClient.invalidateQueries({ queryKey: ['organizationMembers'] });
    },
    onError: (error) => {
      console.error("Erro ao remover membro:", error);
      toast.error("Falha ao remover membro");
    }
  });

  // Manipuladores de eventos
  const handleOrganizationInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOrganizationFormData({
      ...organizationFormData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleMemberInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMemberFormData({
      ...memberFormData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const resetOrganizationForm = () => {
    setOrganizationFormData({
      name: "",
      description: "",
      address: "",
      phone: "",
      email: "",
      subscription_plan: "Básico",
      max_users: 5,
      logo: ""
    });
  };

  const resetMemberForm = () => {
    setMemberFormData({
      user_id: "",
      role: "Colaborador",
      is_admin: false,
      can_assign_tasks: false,
      can_manage_clients: false
    });
  };

  const handleOrganizationSubmit = (e) => {
    e.preventDefault();
    
    if (editingOrganization && organization) {
      updateOrganizationMutation.mutate(organizationFormData);
    } else {
      createOrganizationMutation.mutate(organizationFormData);
    }
  };

  const handleMemberSubmit = (e) => {
    e.preventDefault();
    
    if (!memberFormData.user_id) {
      toast.error("Por favor selecione um utilizador");
      return;
    }
    
    if (selectedMember) {
      // Update existing member
      updateMemberMutation.mutate({
        profile_id: selectedMember.id,
        role: memberFormData.role,
        is_admin: memberFormData.is_admin,
        can_assign_tasks: memberFormData.can_assign_tasks,
        can_manage_clients: memberFormData.can_manage_clients
      });
    } else {
      // Add new member
      addMemberMutation.mutate(memberFormData);
    }
  };

  const handleEditOrganization = () => {
    if (organization) {
      setOrganizationFormData({
        name: organization.name || "",
        description: organization.description || "",
        address: organization.address || "",
        phone: organization.phone || "",
        email: organization.email || "",
        subscription_plan: organization.subscription_plan || "Básico",
        max_users: organization.max_users || 5,
        logo: organization.logo || ""
      });
      setEditingOrganization(true);
      setShowOrganizationForm(true);
    }
  };

  const handleEditMember = (member) => {
    setMemberFormData({
      user_id: member.user,
      role: member.role || "Colaborador",
      is_admin: member.is_org_admin || false,
      can_assign_tasks: member.can_assign_tasks || false,
      can_manage_clients: member.can_manage_clients || false
    });
    setSelectedMember(member);
    setShowMemberForm(true);
  };

  const handleRemoveMember = (profileId) => {
    if (window.confirm("Tem certeza que deseja remover este membro da organização?")) {
      removeMemberMutation.mutate(profileId);
    }
  };

  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      member.username?.toLowerCase().includes(term) ||
      member.role?.toLowerCase().includes(term) ||
      member.email?.toLowerCase().includes(term)
    );
  });

  // Verificar se o utilizador atual é admin da organização
  const currentUser = users.find(user => user.user === localStorage.getItem('userId'));
  const isOrgAdmin = currentUser?.is_org_admin || false;

  // Estado de carregamento global
  const isLoading = isLoadingOrganization || isLoadingMembers || isLoadingUsers ||
                   createOrganizationMutation.isPending || updateOrganizationMutation.isPending ||
                   addMemberMutation.isPending || removeMemberMutation.isPending ||
                   updateMemberMutation.isPending;

  // Se ocorrer um erro ao carregar dados essenciais
  if (isErrorOrganization) {
    return <Header><ErrorView message={organizationError?.message || "Erro ao carregar dados da organização"} onRetry={refetchOrganization} /></Header>;
  }

  return (
    <div className="main">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <Header>
        <div className="p-6 bg-gray-100 min-h-screen" style={{ marginLeft: "3%" }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Gestão da Organização</h1>
              <div className="flex space-x-3">
                {!organization && (
                  <button
                    onClick={() => setShowOrganizationForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                    disabled={isLoading}
                  >
                    <Building size={18} className="mr-2" />
                    Criar Organização
                  </button>
                )}
                {organization && isOrgAdmin && (
                  <button
                    onClick={handleEditOrganization}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
                    disabled={isLoading}
                  >
                    <Edit size={18} className="mr-2" />
                    Editar Organização
                  </button>
                )}
                {organization && isOrgAdmin && (
                  <button
                    onClick={() => {
                      setSelectedMember(null);
                      resetMemberForm();
                      setShowMemberForm(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
                    disabled={isLoading}
                  >
                    <UserPlus size={18} className="mr-2" />
                    Adicionar Membro
                  </button>
                )}
              </div>
            </div>

            {/* Formulário de Organização */}
            {showOrganizationForm && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  {editingOrganization ? "Editar Organização" : "Criar Nova Organização"}
                </h2>
                <form onSubmit={handleOrganizationSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 mb-2">Nome da Organização *</label>
                      <input
                        type="text"
                        name="name"
                        value={organizationFormData.name}
                        onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Email de Contacto</label>
                      <input
                        type="email"
                        name="email"
                        value={organizationFormData.email}
                        onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Telefone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={organizationFormData.phone}
                        onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Morada</label>
                      <input
                        type="text"
                        name="address"
                        value={organizationFormData.address}
                        onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Plano de Subscrição</label>
                      <select
                        name="subscription_plan"
                        value={organizationFormData.subscription_plan}
                        onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="Básico">Básico</option>
                        <option value="Premium">Premium</option>
                        <option value="Enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Máximo de Utilizadores</label>
                      <input
                        type="number"
                        name="max_users"
                        value={organizationFormData.max_users}
                        onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        min="1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 mb-2">Descrição</label>
                      <textarea
                        name="description"
                        value={organizationFormData.description}
                        onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOrganizationForm(false);
                        setEditingOrganization(false);
                        resetOrganizationForm();
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      disabled={isLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin h-5 w-5 mr-2" />
                          A processar...
                        </>
                      ) : (
                        <>
                          <Save size={18} className="mr-2" />
                          {editingOrganization ? "Atualizar" : "Criar"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Detalhes da Organização */}
            {organization && !showOrganizationForm && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold">{organization.name}</h2>
                    <p className="text-gray-600 mt-1">{organization.description}</p>
                  </div>
                  {isOrgAdmin && (
                    <button
                      onClick={handleEditOrganization}
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <Edit size={16} className="mr-1" />
                      Editar
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Contacto</h3>
                    <div className="space-y-2">
                      {organization.email && (
                        <p className="text-gray-700">Email: {organization.email}</p>
                      )}
                      {organization.phone && (
                        <p className="text-gray-700">Telefone: {organization.phone}</p>
                      )}
                      {organization.address && (
                        <p className="text-gray-700">Morada: {organization.address}</p>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Plano</h3>
                    <div className="space-y-2">
                      <p className="text-gray-700">
                        Subscrição: <span className="font-medium">{organization.subscription_plan || "Básico"}</span>
                      </p>
                      <p className="text-gray-700">
                        Utilizadores: <span className="font-medium">{organization.member_count || 0}</span> de <span className="font-medium">{organization.max_users}</span>
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Clientes</h3>
                    <div className="space-y-2">
                      <p className="text-gray-700">
                        Total de Clientes: <span className="font-medium">{organization.client_count || 0}</span>
                      </p>
                      <a href="/clients" className="text-blue-600 hover:text-blue-800 flex items-center text-sm mt-2">
                        Ver todos os clientes <ExternalLink size={14} className="ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Formulário de Membro */}
            {showMemberForm && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  {selectedMember ? "Editar Membro" : "Adicionar Novo Membro"}
                </h2>
                <form onSubmit={handleMemberSubmit}>
                  {!selectedMember && (
                    <div className="mb-4">
                      <label className="block text-gray-700 mb-2">Utilizador *</label>
                      <select
                        name="user_id"
                        value={memberFormData.user_id}
                        onChange={handleMemberInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Selecionar Utilizador</option>
                        {users
                          .filter(user => !members.some(member => member.user === user.user)) // Mostrar apenas utilizadores que não são membros
                          .map(user => (
                            <option key={user.user} value={user.user}>
                              {user.username} ({user.email})
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 mb-2">Função na Organização</label>
                      <input
                        type="text"
                        name="role"
                        value={memberFormData.role}
                        onChange={handleMemberInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-700 mb-3">Permissões</h3>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="is_admin"
                          checked={memberFormData.is_admin}
                          onChange={handleMemberInputChange}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="ml-2">Administrador da Organização</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="can_assign_tasks"
                          checked={memberFormData.can_assign_tasks}
                          onChange={handleMemberInputChange}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="ml-2">Pode Atribuir Tarefas</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="can_manage_clients"
                          checked={memberFormData.can_manage_clients}
                          onChange={handleMemberInputChange}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="ml-2">Pode Gerir Clientes</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMemberForm(false);
                        setSelectedMember(null);
                        resetMemberForm();
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      disabled={isLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin h-5 w-5 mr-2" />
                          A processar...
                        </>
                      ) : (
                        <>
                          {selectedMember ? (
                            <>
                              <CheckCircle size={18} className="mr-2" />
                              Atualizar
                            </>
                          ) : (
                            <>
                              <UserPlus size={18} className="mr-2" />
                              Adicionar
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de Membros */}
            {organization && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Users size={20} className="mr-2 text-blue-600" />
                    Membros da Organização
                  </h2>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pesquisar membros..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  </div>
                </div>
                
                {isLoadingMembers ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 mb-4">Ainda não existem membros nesta organização.</p>
                    {isOrgAdmin && (
                      <button
                        onClick={() => {
                          setSelectedMember(null);
                          resetMemberForm();
                          setShowMemberForm(true);
                        }}
                        className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                      >
                        <UserPlus size={18} className="mr-2" />
                        Adicionar o Primeiro Membro
                      </button>
                    )}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">Nenhum membro encontrado para a pesquisa: "{searchTerm}"</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Utilizador
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Função
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Permissões
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-gray-600 font-medium">
                                    {member.username?.charAt(0).toUpperCase() || "U"}
                                  </span>
                                </div>
                                <div className="ml-4">
                                  <div className="font-medium text-gray-900">{member.username}</div>
                                  <div className="text-gray-500 text-sm">{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-gray-900">{member.role || "Membro"}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {member.is_org_admin && (
                                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                    Admin
                                  </span>
                                )}
                                {member.can_assign_tasks && (
                                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Atribuir Tarefas
                                  </span>
                                )}
                                {member.can_manage_clients && (
                                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Gerir Clientes
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              {isOrgAdmin && (
                                <div className="flex space-x-3">
                                  <button
                                    onClick={() => handleEditMember(member)}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    <Edit size={16} className="mr-1 inline" />
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <UserMinus size={16} className="mr-1 inline" />
                                    Remover
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Mensagem caso não tenha organização e não esteja criando uma */}
            {!organization && !showOrganizationForm && (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <Building size={64} className="mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Sem Organização</h2>
                <p className="text-gray-600 mb-6">
                  Parece que ainda não está associado a nenhuma organização. Crie uma agora para começar a gerir equipas e clientes.
                </p>
                <button
                  onClick={() => setShowOrganizationForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md flex items-center mx-auto"
                  disabled={isLoading}
                >
                  <Building size={18} className="mr-2" />
                  Criar Minha Organização
                </button>
              </div>
            )}

            {/* Explicação Informativa */}
            <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start">
                <Info size={24} className="text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800 mb-1">Sobre Organizações</h3>
                  <p className="text-blue-700 text-sm">
                    Uma organização é um grupo de utilizadores que trabalham em conjunto. Os membros da organização podem colaborar em tarefas e partilhar clientes. 
                    Os administradores da organização podem gerir membros, definir permissões e configurar as definições da organização.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Header>
    </div>
  );
};

export default OrganizationManagement;
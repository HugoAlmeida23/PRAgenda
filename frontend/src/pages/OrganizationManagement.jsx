import React, { useState } from "react";
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
  Briefcase
} from "lucide-react";
import api from "../api";
import "../styles/Home.css";
import InvitationCodeDisplay from "../components/InvitationCodeDisplay";
import InvitationCodeForm from "../components/InvitationForm"; // Ensure this path is correct
import MemberPermissionsForm from "../components/MemberPermissionsForm"; // Ensure this path is correct


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
        className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-white-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Tentar novamente
      </button>
    )}
  </div>
);

// Funções para buscar dados
const fetchOrganizationClients = async (organizationId) => {
  if (!organizationId) return [];
  const response = await api.get(`/organizations/${organizationId}/clients/`);
  return response.data;
};


const fetchOrganization = async () => {
  const response = await api.get("/organizations/");
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

  // --- STATE FOR TWO-STEP MEMBER ADDITION ---
  const [memberCreationStep, setMemberCreationStep] = useState(null); // null, 'invitation', 'permissions'
  const [newMemberDataFromInvitation, setNewMemberDataFromInvitation] = useState(null);
  const [editingMember, setEditingMember] = useState(null); // Replaces selectedMember for clarity

  // --- ORIGINAL STATE ---
  const [showOrganizationForm, setShowOrganizationForm] = useState(false);
  // const [showMemberForm, setShowMemberForm] = useState(false); // Now controlled by memberCreationStep
  // const [showInvitationForm, setShowInvitationForm] = useState(false); // Now controlled by memberCreationStep

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
  // const [memberFormData, setMemberFormData] = useState({...}); // This was for the old direct member form, can be removed
  const [searchTerm, setSearchTerm] = useState("");
  const [editingOrganization, setEditingOrganization] = useState(false);
  // const [selectedMember, setSelectedMember] = useState(null); // Replaced by editingMember

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
    data: clients = [],
    isLoading: isLoadingClients
  } = useQuery({
    queryKey: ['organizationClients', organization?.id],
    queryFn: () => fetchOrganizationClients(organization?.id),
    staleTime: 5 * 60 * 1000,
    enabled: !!organization?.id,
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
  const manageVisibleClientsMutation = useMutation({
    mutationFn: (data) => api.post(`/organizations/${organization.id}/manage_visible_clients/`, data),
    onSuccess: () => {
      toast.success("Clientes visíveis atualizados com sucesso");
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organization?.id] }); // More specific invalidation
    }
  });

  const createOrganizationMutation = useMutation({
    mutationFn: (data) => api.post("/organizations/", data),
    onSuccess: () => {
      toast.success("Organização criada com sucesso");
      setShowOrganizationForm(false);
      resetOrganizationForm();
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
    onError: (error) => {
      console.error("Erro ao criar organização:", error.response?.data || error.message);
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
      console.error("Erro ao atualizar organização:", error.response?.data || error.message);
      toast.error("Falha ao atualizar organização");
    }
  });

  // const addMemberMutation = useMutation({...}); // Old mutation, can be removed if createNewMember... replaces it

  const updateMemberMutation = useMutation({
    mutationFn: (data) => api.post(`/organizations/${organization.id}/update_member/`, data),
    onSuccess: () => {
      toast.success("Permissões de membro atualizadas com sucesso");
      setEditingMember(null); // Clear editing state
      setMemberCreationStep(null); // Close forms
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organization?.id] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar permissões do membro:", error.response?.data || error.message);
      toast.error("Falha ao atualizar permissões");
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId) => {
      const requestBody = { user_id: userId };
      return api.post(`/organizations/${organization.id}/remove_member/`, requestBody);
    },
    onSuccess: () => {
      toast.success("Membro removido com sucesso");
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organization?.id] });
    },
    onError: (error) => {
      console.error("Erro ao remover membro:", error.response?.data || error.message);
      toast.error("Falha ao remover membro");
    }
  });

  // --- NEW MUTATION FOR 2-STEP MEMBER ADDITION ---
  const createNewMemberAndSetPermissionsMutation = useMutation({
    mutationFn: async ({ invitationData, fullPermissionsData }) => {
      const addMemberPayload = {
        invitation_code: invitationData.invitation_code,
        role: fullPermissionsData.role,
        is_admin: fullPermissionsData.is_admin, // This is is_org_admin from MemberPermissionsForm, API likely expects is_admin
        can_assign_tasks: fullPermissionsData.can_assign_tasks,
        can_manage_clients: fullPermissionsData.can_manage_clients,
        can_view_analytics: fullPermissionsData.can_view_analytics,
        can_view_profitability: fullPermissionsData.can_view_profitability,
      };
      const addResponse = await api.post(`/organizations/${organization.id}/add_member_by_code/`, addMemberPayload);
      console.log("Add Member Response:", addResponse.data);
      const newMemberProfile = addResponse.data;
      const newUserId = newMemberProfile.user;
     
      const updatePayload = { user_id: newUserId, ...fullPermissionsData }; 
      updatePayload.user_id = newUserId; // Ensure user_id is set for the update
      console.log("Update Member Payload:", updatePayload);
      const response = await api.post(`/organizations/${organization.id}/update_member/?user_id=${newUserId}`, updatePayload);
      console.log("Update Member Response:", response.data);
      if (!fullPermissionsData.can_view_all_clients && fullPermissionsData.visible_clients?.length >= 0) {
        await api.post(`/organizations/${organization.id}/manage_visible_clients/`, {
          user_id: newUserId, // API might expect profile_id here
          client_ids: fullPermissionsData.visible_clients,
          action: 'add'
        });
      } else if (fullPermissionsData.can_view_all_clients) {
        await api.post(`/organizations/${organization.id}/manage_visible_clients/`, {
          user_id: newUserId, client_ids: [], action: 'add'
        });
      }
      return newMemberProfile;
    },
    onSuccess: () => {
      toast.success("Novo membro adicionado e permissões configuradas com sucesso!");
      setMemberCreationStep(null);
      setNewMemberDataFromInvitation(null);
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organization?.id] });
      refetchMembers();
    },
    onError: (error) => {
      console.error("Erro ao criar novo membro:", error.response?.data || error.message);
      let errorMessage = "Falha ao adicionar novo membro.";
       if (error.response?.data) {
        const errors = error.response.data;
        if (typeof errors === 'string') errorMessage = errors;
        else if (errors.detail) errorMessage = errors.detail;
        else if (errors.error) errorMessage = errors.error;
        else if (Array.isArray(errors) && errors.length > 0) errorMessage = errors.join(", ");
        else if (typeof errors === 'object') errorMessage = Object.values(errors).flat().join(", ");
      }
      toast.error(errorMessage);
    }
  });


  // --- HANDLERS ---
  const handleOrganizationInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOrganizationFormData({ ...organizationFormData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);

  const resetOrganizationForm = () => {
    setOrganizationFormData({ name: "", description: "", address: "", phone: "", email: "", subscription_plan: "Básico", max_users: 5, logo: "" });
  };

  const handleOrganizationSubmit = (e) => {
    e.preventDefault();
    if (editingOrganization && organization) {
      updateOrganizationMutation.mutate(organizationFormData);
    } else {
      createOrganizationMutation.mutate(organizationFormData);
    }
  };

  const handleStartAddMember = () => {
    setEditingMember(null);
    setNewMemberDataFromInvitation(null);
    setMemberCreationStep('invitation');
    setShowOrganizationForm(false); // Close other forms
  };

  const handleInvitationFormNext = (dataFromInvitationStep) => {
    console.log("Data from Invitation Step (OM):", dataFromInvitationStep);
    setNewMemberDataFromInvitation(dataFromInvitationStep);
    setMemberCreationStep('permissions');
  };

  const handlePermissionsFormCancel = () => {
    setMemberCreationStep(null);
    setNewMemberDataFromInvitation(null);
    setEditingMember(null);
  };

  const handleSavePermissions = (fullPermissionsData) => {
    if (editingMember) {
      updateMemberMutation.mutate({ user_id: editingMember.user, ...fullPermissionsData });
      if (!fullPermissionsData.can_view_all_clients && fullPermissionsData.visible_clients?.length >= 0) {
        return;
      } else if (fullPermissionsData.can_view_all_clients) {
return;      }
    } else if (newMemberDataFromInvitation) {
      createNewMemberAndSetPermissionsMutation.mutate({
        invitationData: newMemberDataFromInvitation,
        fullPermissionsData: fullPermissionsData,
      });
    }
  };

  const handleEditOrganization = () => {
    if (organization) {
      setOrganizationFormData({
        name: organization.name || "", description: organization.description || "", address: organization.address || "",
        phone: organization.phone || "", email: organization.email || "", subscription_plan: organization.subscription_plan || "Básico",
        max_users: organization.max_users || 5, logo: organization.logo || ""
      });
      setEditingOrganization(true);
      setShowOrganizationForm(true);
      setMemberCreationStep(null); // Close member forms
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setNewMemberDataFromInvitation(null);
    setMemberCreationStep('permissions');
    setShowOrganizationForm(false);
  };

  const handleRemoveMember = (userId) => {
    if (window.confirm("Tem certeza que deseja remover este membro da organização?")) {
      removeMemberMutation.mutate(userId);
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

  const isOrgAdmin = users.length > 0 && users[0].is_org_admin === true;
  const isLoading = isLoadingOrganization || isLoadingMembers || isLoadingUsers ||
    createOrganizationMutation.isPending || updateOrganizationMutation.isPending ||
    createNewMemberAndSetPermissionsMutation.isPending || // Use new mutation's pending state
    removeMemberMutation.isPending || updateMemberMutation.isPending; // updateMember is for edit

  if (isErrorOrganization) {
    return <ErrorView message={organizationError?.message || "Erro ao carregar dados da organização"} onRetry={refetchOrganization} />;
  }

  return (
    <div className="main">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Gestão da Organização</h1>
              <div className="flex space-x-3">
                {!organization && isOrgAdmin && (
                  <button
                    onClick={() => { setShowOrganizationForm(true); setMemberCreationStep(null); }}
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
                    onClick={handleStartAddMember} // Use this to start the 2-step flow
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
                    disabled={isLoading}
                  >
                    <UserPlus size={18} className="mr-2" />
                    Adicionar Membro
                  </button>
                )}
                {/* ... InvitationCodeDisplay for non-admin ... */}
              </div>
            </div>

            {/* Formulário de Organização */}
            {showOrganizationForm && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">
                  {editingOrganization ? "Editar Organização" : "Criar Nova Organização"}
                </h2>
                <form onSubmit={handleOrganizationSubmit}>
                  {/* ... organization form fields ... */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-700 mb-2">Nome da Organização *</label>
                      <input
                        type="text" name="name" value={organizationFormData.name} onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md" required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Email de Contacto</label>
                      <input
                        type="email" name="email" value={organizationFormData.email} onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Telefone</label>
                      <input
                        type="tel" name="phone" value={organizationFormData.phone} onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Morada</label>
                      <input
                        type="text" name="address" value={organizationFormData.address} onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Plano de Subscrição</label>
                      <select
                        name="subscription_plan" value={organizationFormData.subscription_plan} onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="Básico">Básico</option> <option value="Premium">Premium</option> <option value="Enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Máximo de Utilizadores</label>
                      <input
                        type="number" name="max_users" value={organizationFormData.max_users} onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md" min="1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 mb-2">Descrição</label>
                      <textarea
                        name="description" value={organizationFormData.description} onChange={handleOrganizationInputChange}
                        className="w-full p-2 border border-gray-300 rounded-md" rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => { setShowOrganizationForm(false); setEditingOrganization(false); resetOrganizationForm(); }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-white-50"
                      disabled={isLoading}
                    > Cancelar </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                      disabled={isLoading}
                    >
                      { (createOrganizationMutation.isPending || updateOrganizationMutation.isPending) ? ( // Check specific mutation
                        <><Loader2 className="animate-spin h-5 w-5 mr-2" /> A processar...</>
                      ) : (
                        <><Save size={18} className="mr-2" /> {editingOrganization ? "Atualizar" : "Criar"} </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
            {/* Organization Details Display */}
            {organization && !showOrganizationForm && !memberCreationStep && (
                 <div className="bg-white p-6 rounded-lg shadow mb-6">
                    {/* ... organization details display ... */}
                 </div>
            )}


            {/* Step 1: Invitation Code Form for New Member */}
            {memberCreationStep === 'invitation' && organization && !showOrganizationForm && (
              <InvitationCodeForm
                onNext={handleInvitationFormNext}
                isProcessing={createNewMemberAndSetPermissionsMutation.isPending}
              />
            )}

            {/* Step 2 (New Member) or Edit Member Form (MemberPermissionsForm) */}
            {memberCreationStep === 'permissions' && organization && !showOrganizationForm && (
              <MemberPermissionsForm
                member={
                  editingMember ? editingMember :
                  newMemberDataFromInvitation ? { // Construct partial member for pre-filling MemberPermissionsForm
                    role: newMemberDataFromInvitation.role,
                    is_admin: newMemberDataFromInvitation.is_admin, // For MemberPermissionsForm is_org_admin
                    is_org_admin: newMemberDataFromInvitation.is_admin,
                    can_assign_tasks: newMemberDataFromInvitation.can_assign_tasks,
                    can_manage_clients: newMemberDataFromInvitation.can_manage_clients,
                    can_view_analytics: newMemberDataFromInvitation.can_view_analytics,
                    can_view_profitability: newMemberDataFromInvitation.can_view_profitability,
                    // Default other fields for a new member in step 2
                    hourly_rate: 0, phone: '', access_level: "Standard",
                    can_view_all_clients: false, can_create_clients: false, can_edit_clients: false,
                    can_delete_clients: false, can_change_client_status: false, can_create_tasks: false,
                    can_edit_all_tasks: false, can_edit_assigned_tasks: false, can_delete_tasks: false,
                    can_view_all_tasks: false, can_approve_tasks: false, can_log_time: true,
                    can_edit_own_time: true, can_edit_all_time: false, can_view_team_time: false,
                    can_view_client_fees: false, can_edit_client_fees: false, can_manage_expenses: false,
                    can_view_team_profitability: false, can_view_organization_profitability: false,
                    can_export_reports: false, can_create_custom_reports: false, can_schedule_reports: false,
                    can_create_workflows: false, can_edit_workflows: false, can_assign_workflows: false,
                    can_manage_workflows: false, visible_clients: [],
                  } : null
                }
                clients={clients}
                onSave={handleSavePermissions}
                onCancel={handlePermissionsFormCancel}
              />
            )}

            {/* Lista de Membros - Hide if any form is active */}
            {organization && !showOrganizationForm && !memberCreationStep && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Users size={20} className="mr-2 text-blue-600" />
                    Membros da Organização
                  </h2>
                  <div className="relative">
                    <input
                      type="text" placeholder="Pesquisar membros..." value={searchTerm} onChange={handleSearchChange}
                      className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  </div>
                </div>

                {isLoadingMembers ? (
                  <div className="p-6 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
                ) : members.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 mb-4">Ainda não existem membros nesta organização.</p>
                    {isOrgAdmin && (
                      <button
                        onClick={handleStartAddMember} // To start 2-step flow
                        className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                      > <UserPlus size={18} className="mr-2" /> Adicionar o Primeiro Membro </button>
                    )}
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">Nenhum membro encontrado para a pesquisa: "{searchTerm}"</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      {/* ... table head ... */}
                      <thead className="bg-white-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilizador</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                          {isOrgAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissões</th>}
                          {isOrgAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-white-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0 bg-white-200 rounded-full flex items-center justify-center">
                                  <span className="text-gray-600 font-medium">{member.username?.charAt(0).toUpperCase() || "U"}</span>
                                </div>
                                <div className="ml-4">
                                  <div className="font-medium text-gray-900">{member.username}</div>
                                  <div className="text-gray-500 text-sm">{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4"><div className="text-gray-900">{member.role || "Membro"}</div></td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {member.is_org_admin && (<span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Admin</span>)}
                                {member.can_assign_tasks && (<span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Atribuir Tarefas</span>)}
                                {member.can_manage_clients && (<span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Gerir Clientes</span>)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              {isOrgAdmin && (
                                <div className="flex space-x-3">
                                  <button onClick={() => handleEditMember(member)} className="text-indigo-600 hover:text-indigo-900">
                                    <Edit size={16} className="mr-1 inline" /> Editar
                                  </button>
                                  <button onClick={() => handleRemoveMember(member.user)} className="text-red-600 hover:text-red-900">
                                    <UserMinus size={16} className="mr-1 inline" /> Remover
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
            {!organization && !showOrganizationForm && !memberCreationStep && (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <Building size={64} className="mx-auto text-gray-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Sem Organização</h2>
                <p className="text-gray-600 mb-6">
                  Parece que ainda não está associado a nenhuma organização. Crie uma agora para começar a gerir equipas e clientes.
                </p>
                <button
                  onClick={() => { setShowOrganizationForm(true); setMemberCreationStep(null); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md flex items-center mx-auto"
                  disabled={isLoading}
                > <Building size={18} className="mr-2" /> Criar Minha Organização </button>
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
          );
};

export default OrganizationManagement;
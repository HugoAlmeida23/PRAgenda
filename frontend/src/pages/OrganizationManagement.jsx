import React, { useState, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building,
  Users,
  Edit,
  UserPlus,
  UserMinus,
  Shield,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Search,
  Info,
  Save,
  Brain,
} from "lucide-react";
import api from "../api";
// Removed "../styles/Home.css"; as styles will be inline or via <style jsx>
import InvitationCodeDisplay from "../components/InvitationCodeDisplay";
import InvitationCodeForm from "../components/InvitationForm";
import MemberPermissionsForm from "../components/MemberPermissionsForm";
import { motion, AnimatePresence } from "framer-motion";
import BackgroundElements from "../components/HeroSection/BackgroundElements";
import { usePermissions } from "../contexts/PermissionsContext";
// Estilos glass
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px'
};

// Variantes de animação
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 200, damping: 20 }
  }
};

const ThemedErrorView = ({ message, onRetry }) => (
  <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'white' }}>
    <BackgroundElements businessStatus="optimal" />
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{ ...glassStyle, padding: '2rem', textAlign: 'center', maxWidth: '500px' }}
    >
      <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>Erro ao Carregar</h2>
      <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
        {message || 'Falha ao carregar dados.'}
      </p>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          style={{
            ...glassStyle, padding: '0.75rem 1.5rem',
            border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.2)',
            color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            fontSize: '0.875rem', fontWeight: '500', marginTop: '1rem'
          }}
        >
          <RotateCcw size={18} /> Tentar Novamente
        </motion.button>
      )}
    </motion.div>
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

  const permissions = usePermissions();
  
  const [memberCreationStep, setMemberCreationStep] = useState(null);
  const [newMemberDataFromInvitation, setNewMemberDataFromInvitation] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  const [showOrganizationForm, setShowOrganizationForm] = useState(false);

  const [organizationFormData, setOrganizationFormData] = useState({
    name: "", description: "", address: "", phone: "", email: "",
    subscription_plan: "Básico", max_users: 5, logo: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [editingOrganization, setEditingOrganization] = useState(false);

  const {
    data: organization, isLoading: isLoadingOrganization, isError: isErrorOrganization,
    error: organizationError, refetch: refetchOrganization
  } = useQuery({ queryKey: ['organization'], queryFn: fetchOrganization, staleTime: 5 * 60 * 1000 });

  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['organizationClients', organization?.id],
    queryFn: () => fetchOrganizationClients(organization?.id),
    staleTime: 5 * 60 * 1000, enabled: !!organization?.id,
  });

  const { data: members = [], isLoading: isLoadingMembers, isError: isErrorMembers, refetch: refetchMembers } = useQuery({
    queryKey: ['organizationMembers', organization?.id],
    queryFn: () => fetchOrganizationMembers(organization?.id),
    staleTime: 5 * 60 * 1000, enabled: !!organization?.id,
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'], queryFn: fetchUsers, staleTime: 10 * 60 * 1000,
  });

  // Mutações
  const manageVisibleClientsMutation = useMutation({
    mutationFn: (data) => api.post(`/organizations/${organization.id}/manage_visible_clients/`, data),
    onSuccess: () => {
      toast.success("Clientes visíveis atualizados com sucesso");
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organization?.id] });
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

  const updateMemberMutation = useMutation({
    mutationFn: (data) => api.post(`/organizations/${organization.id}/update_member/`, data),
    onSuccess: () => {
      toast.success("Permissões de membro atualizadas com sucesso");
      setEditingMember(null);
      setMemberCreationStep(null);
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organization?.id] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar permissões do membro:", error.response?.data || error.message);
      toast.error("Falha ao atualizar permissões");
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId) => api.post(`/organizations/${organization.id}/remove_member/`, { user_id: userId }),
    onSuccess: () => {
      toast.success("Membro removido com sucesso");
      queryClient.invalidateQueries({ queryKey: ['organizationMembers', organization?.id] });
    },
    onError: (error) => {
      console.error("Erro ao remover membro:", error.response?.data || error.message);
      toast.error("Falha ao remover membro");
    }
  });

  const createNewMemberAndSetPermissionsMutation = useMutation({
    mutationFn: async ({ invitationData, fullPermissionsData }) => {
      const addMemberPayload = {
        invitation_code: invitationData.invitation_code,
        role: fullPermissionsData.role, is_admin: fullPermissionsData.is_admin,
        can_assign_tasks: fullPermissionsData.can_assign_tasks, can_manage_clients: fullPermissionsData.can_manage_clients,
        can_view_analytics: fullPermissionsData.can_view_analytics, can_view_profitability: fullPermissionsData.can_view_profitability,
      };
      const addResponse = await api.post(`/organizations/${organization.id}/add_member_by_code/`, addMemberPayload);
      const newMemberProfile = addResponse.data;
      const newUserId = newMemberProfile.user;
      const updatePayload = { user_id: newUserId, ...fullPermissionsData };
      await api.post(`/organizations/${organization.id}/update_member/?user_id=${newUserId}`, updatePayload);
      if (!fullPermissionsData.can_view_all_clients && fullPermissionsData.visible_clients?.length >= 0) {
        await api.post(`/organizations/${organization.id}/manage_visible_clients/`, {
          user_id: newUserId, client_ids: fullPermissionsData.visible_clients, action: 'add'
        });
      } else if (fullPermissionsData.can_view_all_clients) {
        await api.post(`/organizations/${organization.id}/manage_visible_clients/`, {
          user_id: newUserId, client_ids: [], action: 'add'
        });
      }
      return newMemberProfile;
    },
    onSuccess: () => {
      toast.success("Novo membro adicionado e permissões configuradas!");
      setMemberCreationStep(null); setNewMemberDataFromInvitation(null);
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

  const handleOrganizationInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setOrganizationFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }, []);

  const handleSearchChange = useCallback((e) => setSearchTerm(e.target.value), []);

  const resetOrganizationForm = useCallback(() => {
    setOrganizationFormData({ name: "", description: "", address: "", phone: "", email: "", subscription_plan: "Básico", max_users: 5, logo: "" });
  }, []);

  const handleOrganizationSubmit = useCallback((e) => {
    e.preventDefault();
    if (editingOrganization && organization) {
      updateOrganizationMutation.mutate(organizationFormData);
    } else {
      createOrganizationMutation.mutate(organizationFormData);
    }
  }, [editingOrganization, organization, organizationFormData, updateOrganizationMutation, createOrganizationMutation]);

  const handleStartAddMember = useCallback(() => {
    setEditingMember(null); setNewMemberDataFromInvitation(null);
    setMemberCreationStep('invitation'); setShowOrganizationForm(false);
  }, []);

  const handleInvitationFormNext = useCallback((dataFromInvitationStep) => {
    setNewMemberDataFromInvitation(dataFromInvitationStep);
    setMemberCreationStep('permissions');
  }, []);

  const handlePermissionsFormCancel = useCallback(() => {
    setMemberCreationStep(null); setNewMemberDataFromInvitation(null); setEditingMember(null);
  }, []);

  const handleSavePermissions = useCallback((fullPermissionsData) => {
    if (editingMember) {
      updateMemberMutation.mutate({ user_id: editingMember.user, ...fullPermissionsData });
    } else if (newMemberDataFromInvitation) {
      createNewMemberAndSetPermissionsMutation.mutate({
        invitationData: newMemberDataFromInvitation, fullPermissionsData: fullPermissionsData,
      });
    }
  }, [editingMember, newMemberDataFromInvitation, updateMemberMutation, createNewMemberAndSetPermissionsMutation]);

  const handleEditOrganization = useCallback(() => {
    if (organization) {
      setOrganizationFormData({
        name: organization.name || "", description: organization.description || "", address: organization.address || "",
        phone: organization.phone || "", email: organization.email || "", subscription_plan: organization.subscription_plan || "Básico",
        max_users: organization.max_users || 5, logo: organization.logo || ""
      });
      setEditingOrganization(true); setShowOrganizationForm(true); setMemberCreationStep(null);
    }
  }, [organization]);

  const handleEditMember = useCallback((member) => {
    setEditingMember(member); setNewMemberDataFromInvitation(null);
    setMemberCreationStep('permissions'); setShowOrganizationForm(false);
  }, []);

  const handleRemoveMember = useCallback((userId) => {
    if (window.confirm("Tem certeza que deseja remover este membro da organização?")) {
      removeMemberMutation.mutate(userId);
    }
  }, [removeMemberMutation]);

  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (member.username?.toLowerCase().includes(term) || member.role?.toLowerCase().includes(term) || member.email?.toLowerCase().includes(term));
  });

  const isOrgAdminUser = permissions.isOrgAdmin;

  console.log("isOrgAdminUser:", isOrgAdminUser);

  const isLoadingOverall = isLoadingOrganization || isLoadingMembers || isLoadingUsers ||
    createOrganizationMutation.isPending || updateOrganizationMutation.isPending ||
    createNewMemberAndSetPermissionsMutation.isPending || removeMemberMutation.isPending || updateMemberMutation.isPending;

  if (isLoadingOrganization || isLoadingUsers) { // Initial essential data loading
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <BackgroundElements businessStatus="optimal" />        
        <motion.div animate={{ rotate: 360, scale: [1, 1.1, 1] }} transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1, repeat: Infinity } }}>
          <Brain size={48} style={{ color: 'rgb(147, 51, 234)' }} />
        </motion.div>
        <p style={{ marginLeft: '1rem', fontSize: '1rem' }}>Carregando gestão da organização...</p>
      </div>
    );
  }

  if (isErrorOrganization) {
    return <ThemedErrorView message={organizationError?.message || "Erro ao carregar dados da organização"} onRetry={refetchOrganization} />;
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
      <BackgroundElements businessStatus="optimal" />      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 9999 }} />

      <motion.div initial="hidden" animate="visible" variants={containerVariants} style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}>
        <motion.div variants={itemVariants} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Gestão da Organização
            </h1>
            <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>Configure sua organização e gerencie membros.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {!organization && isOrgAdminUser && (
              <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => { setShowOrganizationForm(true); setMemberCreationStep(null); }}
                style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}
                disabled={isLoadingOverall}>
                <Building size={18} /> Criar Organização
              </motion.button>
            )}
            {organization && isOrgAdminUser && (
              <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={handleEditOrganization}
                style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(147,51,234,0.3)', background: 'rgba(147,51,234,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}
                disabled={isLoadingOverall}>
                <Edit size={18} /> Editar Organização
              </motion.button>
            )}
            {organization && isOrgAdminUser && (
              <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={handleStartAddMember}
                style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}
                disabled={isLoadingOverall}>
                <UserPlus size={18} /> Adicionar Membro
              </motion.button>
            )}
            {organization && !isOrgAdminUser && <InvitationCodeDisplay organizationId={organization.id} />}
          </div>
        </motion.div>

        {/* Organization Form */}
        <AnimatePresence>
          {showOrganizationForm && (
            <motion.div initial={{ opacity: 0, height: 0, y: -20 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3 }} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: '12px' }}><Building style={{ color: 'rgb(59,130,246)' }} size={20} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{editingOrganization ? "Editar Organização" : "Nova Organização"}</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>{editingOrganization ? "Atualize os detalhes da sua organização." : "Crie uma nova organização."}</p>
                </div>
              </div>
              <form onSubmit={handleOrganizationSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Name, Email, Phone, Address, Subscription, Max Users */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>Nome *</label>
                    <input type="text" name="name" value={organizationFormData.name} onChange={handleOrganizationInputChange} required style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} placeholder="Nome da Organização" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>Email</label>
                    <input type="email" name="email" value={organizationFormData.email} onChange={handleOrganizationInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} placeholder="Email de contacto" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>Telefone</label>
                    <input type="tel" name="phone" value={organizationFormData.phone} onChange={handleOrganizationInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} placeholder="Número de telefone" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>Morada</label>
                    <input type="text" name="address" value={organizationFormData.address} onChange={handleOrganizationInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} placeholder="Morada completa" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>Plano</label>
                    <select name="subscription_plan" value={organizationFormData.subscription_plan} onChange={handleOrganizationInputChange} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }}>
                      <option value="Básico" style={{ background: '#1f2937', color: 'white' }}>Básico</option>
                      <option value="Premium" style={{ background: '#1f2937', color: 'white' }}>Premium</option>
                      <option value="Enterprise" style={{ background: '#1f2937', color: 'white' }}>Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>Máx. Utilizadores</label>
                    <input type="number" name="max_users" value={organizationFormData.max_users} onChange={handleOrganizationInputChange} min="1" style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>Descrição</label>
                  <textarea name="description" value={organizationFormData.description} onChange={handleOrganizationInputChange} rows={3} style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', resize: 'vertical' }} placeholder="Breve descrição da organização..." />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="button" onClick={() => { setShowOrganizationForm(false); setEditingOrganization(false); resetOrganizationForm(); }} style={{ padding: '0.75rem 1.5rem', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }} disabled={isLoadingOverall}>Cancelar</motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" style={{ padding: '0.75rem 1.5rem', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', color: 'white', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={isLoadingOverall}>
                    {(createOrganizationMutation.isPending || updateOrganizationMutation.isPending) ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
                    {editingOrganization ? "Atualizar" : "Criar"} Organização
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Member Invitation Form (Step 1) */}
        <AnimatePresence>
          {memberCreationStep === 'invitation' && organization && !showOrganizationForm && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'rgba(52,211,153,0.2)', borderRadius: '12px' }}><UserPlus style={{ color: 'rgb(52,211,153)' }} size={20} /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Adicionar Novo Membro (Passo 1/2)</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>Insira o código de convite do utilizador.</p>
                </div>
              </div>
              <InvitationCodeForm
                onNext={handleInvitationFormNext}
                isProcessing={createNewMemberAndSetPermissionsMutation.isPending}
                onCancel={handlePermissionsFormCancel}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Member Permissions Form (Step 2 or Edit) */}
        <AnimatePresence>
          {memberCreationStep === 'permissions' && organization && !showOrganizationForm && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: editingMember ? 'rgba(147,51,234,0.2)' : 'rgba(52,211,153,0.2)', borderRadius: '12px' }}>
                  {editingMember ? <Edit style={{ color: 'rgb(147,51,234)' }} size={20} /> : <Shield style={{ color: 'rgb(52,211,153)' }} size={20} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{editingMember ? `Editar Permissões de ${editingMember.username}` : 'Definir Permissões (Passo 2/2)'}</h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>Configure o acesso e as permissões do membro.</p>
                </div>
              </div>
              <MemberPermissionsForm
                member={editingMember || (newMemberDataFromInvitation ? { ...newMemberDataFromInvitation, is_org_admin: newMemberDataFromInvitation.is_admin /* map form field */ } : null)}
                clients={clients}
                onSave={handleSavePermissions}
                onCancel={handlePermissionsFormCancel}
                isProcessing={updateMemberMutation.isPending || createNewMemberAndSetPermissionsMutation.isPending}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Organization Details & Members List */}
        {organization && !showOrganizationForm && !memberCreationStep && (
          <>
            <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'rgba(147,51,234,0.2)', borderRadius: '12px' }}><Building style={{ color: 'rgb(147,51,234)' }} size={20} /></div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>{organization.name}</h2>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem' }}>{organization.description || "Sem descrição."}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                <p><strong>Email:</strong> {organization.email || "N/A"}</p>
                <p><strong>Telefone:</strong> {organization.phone || "N/A"}</p>
                <p><strong>Morada:</strong> {organization.address || "N/A"}</p>
                <p><strong>Plano:</strong> {organization.subscription_plan || "N/A"}</p>
                <p><strong>Utilizadores:</strong> {members.length} / {organization.max_users || "N/A"}</p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} style={{ ...glassStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', backgroundColor: 'rgba(52,211,153,0.2)', borderRadius: '12px' }}><Users style={{ color: 'rgb(52,211,153)' }} size={20} /></div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Membros da Organização</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>{filteredMembers.length} membros encontrados</p>
                  </div>
                </div>
                <div style={{ position: 'relative', minWidth: '250px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                  <input type="text" placeholder="Pesquisar membros..." value={searchTerm} onChange={handleSearchChange}
                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: 'white', fontSize: '0.875rem' }} />
                </div>
              </div>
              {isLoadingMembers ? (
                <div style={{ padding: '3rem', textAlign: 'center' }}><Loader2 size={32} className="animate-spin" style={{ color: 'rgb(59,130,246)' }} /></div>
              ) : members.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                  <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p>Nenhum membro nesta organização.</p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                  <Search size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p>Nenhum membro encontrado para: "{searchTerm}"</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                      <tr>
                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>Utilizador</th>
                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>Função</th>
                        {isOrgAdminUser && <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>Permissões Chave</th>}
                        {isOrgAdminUser && <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem', fontWeight: '600', color: 'rgba(255,255,255,0.9)' }}>Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((member, index) => (
                        <motion.tr key={member.id || member.user} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                          style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1rem', color: 'rgb(59,130,246)', fontWeight: '600', fontSize: '0.875rem' }}>
                                {member.username?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <div>
                                <div style={{ fontWeight: '500', color: 'white', fontSize: '0.875rem' }}>{member.username}</div>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{member.role || "Membro"}</td>
                          {isOrgAdminUser && (
                            <td style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {member.is_org_admin && (<span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.3)', color: 'rgb(147,51,234)' }}>Admin</span>)}
                                {member.can_manage_clients && (<span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', color: 'rgb(52,211,153)' }}>Gerir Clientes</span>)}
                                {member.can_assign_tasks && (<span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', color: 'rgb(59,130,246)' }}>Atribuir Tarefas</span>)}
                              </div>
                            </td>
                          )}
                          {isOrgAdminUser && (
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleEditMember(member)} title="Editar Permissões" style={{ background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(147,51,234)', cursor: 'pointer' }}><Edit size={16} /></motion.button>
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleRemoveMember(member.user)} title="Remover Membro" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '0.5rem', color: 'rgb(239,68,68)', cursor: 'pointer' }} disabled={removeMemberMutation.isPending}><UserMinus size={16} /></motion.button>
                              </div>
                            </td>
                          )}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* No Organization Message */}
        {!organization && !showOrganizationForm && !memberCreationStep && !isLoadingOrganization && (
          <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
            <Building size={48} style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1rem', margin: 'auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>Nenhuma Organização Encontrada</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>
              Parece que não está associado a nenhuma organização ou ainda não criou uma.
            </p>
            {isOrgAdminUser && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setShowOrganizationForm(true); setMemberCreationStep(null); }}
                style={{ ...glassStyle, padding: '0.75rem 1.5rem', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.2)', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}
                disabled={isLoadingOverall}>
                <Building size={18} /> Criar Organização
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Info Box */}
        <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginTop: '2rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <Info size={24} style={{ color: 'rgb(59,130,246)', marginTop: '0.125rem', flexShrink: 0 }} />
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: 'white' }}>Sobre Organizações</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
                Uma organização permite agrupar utilizadores, clientes e tarefas. Administradores podem gerir membros, definir permissões detalhadas e configurar as definições gerais da organização. Utilize códigos de convite para adicionar novos membros de forma segura.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.5) !important; }
        select option { background: #1f2937 !important; color: white !important; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.5); }
        * { transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease; }
        button:hover { transform: translateY(-1px); }
        button:focus, input:focus, select:focus, textarea:focus { outline: 2px solid rgba(59,130,246,0.5); outline-offset: 2px; }
      `}</style>
    </div>
  );
};

export default OrganizationManagement;
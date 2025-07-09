import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast, ToastContainer } from "react-toastify";
import {
  Building,
  Users,
  Shield,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Loader2,
  Brain,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  Info,
  CheckCircle,
  XCircle,
  Crown,
  User,
  Plus,
  Save,
} from "lucide-react";
import api from "../api";
import BackgroundElements from "../components/HeroSection/BackgroundElements";
import { motion, AnimatePresence } from "framer-motion";
import InvitationCodeDisplay from "../components/InvitationCodeDisplay";
import { usePermissions } from "../contexts/PermissionsContext";

// Glass styling
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '16px'
};

// Animation variants
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

// Error component
const ThemedErrorView = ({ message, onRetry }) => (
  <div style={{
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    color: 'white'
  }}>
    <BackgroundElements businessStatus="optimal" />
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        ...glassStyle,
        padding: '2rem',
        textAlign: 'center',
        maxWidth: '500px'
      }}
    >
      <AlertTriangle size={48} style={{ color: 'rgb(239, 68, 68)', marginBottom: '1rem' }} />
      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: '600' }}>
        Erro ao Carregar
      </h2>
      <p style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.8)' }}>
        {message || 'Falha ao carregar dados.'}
      </p>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRetry}
          style={{
            ...glassStyle,
            padding: '0.75rem 1.5rem',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            background: 'rgba(59, 130, 246, 0.2)',
            color: 'white',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginTop: '1rem'
          }}
        >
          <RotateCcw size={18} /> Tentar Novamente
        </motion.button>
      )}
    </motion.div>
  </div>
);

// Data fetching functions
const fetchOrganization = async () => {
  const response = await api.get("/organizations/");
  return response.data.length > 0 ? response.data[0] : null;
};

const fetchOrganizationMembers = async (organizationId) => {
  if (!organizationId) return [];
  const response = await api.get(`/organizations/${organizationId}/members/`);
  return response.data;
};

const fetchUserProfile = async () => {
  const response = await api.get("/profiles/");
  return response.data.length > 0 ? response.data[0] : null;
};

const OrganizationView = () => {
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  const [showAllPermissions, setShowAllPermissions] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
    enabled: permissions.initialized // Só faz fetch quando as permissões estão carregadas
  });

  const {
    data: members = [],
    isLoading: isLoadingMembers
  } = useQuery({
    queryKey: ['organizationMembers', organization?.id],
    queryFn: () => fetchOrganizationMembers(organization?.id),
    staleTime: 5 * 60 * 1000,
    enabled: permissions.initialized && !!organization?.id, // Só faz fetch quando as permissões e a organização estão carregadas
  });

  const {
    data: userProfile,
    isLoading: isLoadingProfile
  } = useQuery({
    queryKey: ['userProfile'],
    queryFn: fetchUserProfile,
    staleTime: 5 * 60 * 1000,
    enabled: permissions.initialized // Só faz fetch quando as permissões estão carregadas
  });

  // Mutation for creating organization
  const createOrganizationMutation = useMutation({
    mutationFn: (data) => api.post("/organizations/", data),
    onSuccess: () => {
      toast.success("Organização criada com sucesso! Você foi definido como administrador.");
      setShowCreateForm(false);
      resetOrganizationForm();
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      // Reload permissions context
      window.location.reload();
    },
    onError: (error) => {
      console.error("Erro ao criar organização:", error.response?.data || error.message);
      const errorMessage = error.response?.data?.detail ||
        error.response?.data?.error ||
        "Falha ao criar organização";
      toast.error(errorMessage);
    }
  });

  const handleOrganizationInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setOrganizationFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }, []);

  const resetOrganizationForm = useCallback(() => {
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
  }, []);

  const handleOrganizationSubmit = useCallback((e) => {
    e.preventDefault();
    createOrganizationMutation.mutate(organizationFormData);
  }, [organizationFormData, createOrganizationMutation]);

  // Loading state
  if (isLoadingOrganization || isLoadingProfile) {
    return (
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <BackgroundElements businessStatus="optimal" />
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1, repeat: Infinity }
          }}
        >
          <Brain size={48} style={{ color: 'rgb(147, 51, 234)' }} />
        </motion.div>
        <p style={{ marginLeft: '1rem', fontSize: '1rem' }}>
          Carregando informações da organização...
        </p>
      </div>
    );
  }

  // Error state
  if (isErrorOrganization) {
    return (
      <ThemedErrorView
        message={organizationError?.message || "Erro ao carregar dados da organização"}
        onRetry={refetchOrganization}
      />
    );
  }

  // Find admin members
  const adminMembers = members.filter(member => member.is_org_admin);
  console.log("inviation_code: ", userProfile);
  // Permission categorization
  const clientPermissions = [
    { key: 'can_view_all_clients', label: 'Ver Todos os Clientes', value: permissions.canViewAllClients || false },
    { key: 'can_create_clients', label: 'Criar Clientes', value: permissions.canCreateClients || false },
    { key: 'can_edit_clients', label: 'Editar Clientes', value: permissions.canEditClients || false },
    { key: 'can_delete_clients', label: 'Excluir Clientes', value: permissions.canDeleteClients || false },
    { key: 'can_change_client_status', label: 'Alterar Status de Clientes', value: permissions.canChangeClientStatus || false },
  ];

  const taskPermissions = [
    { key: 'can_view_all_tasks', label: 'Ver Todas as Tarefas', value: permissions.canViewAllTasks || false },
    { key: 'can_create_tasks', label: 'Criar Tarefas', value: permissions.canCreateTasks || false },
    { key: 'can_assign_tasks', label: 'Atribuir Tarefas', value: permissions.canAssignTasks || false },
    { key: 'can_edit_all_tasks', label: 'Editar Todas as Tarefas', value: permissions.canEditAllTasks || false },
    { key: 'can_edit_assigned_tasks', label: 'Editar Tarefas Atribuídas', value: permissions.canEditAssignedTasks || false },
    { key: 'can_delete_tasks', label: 'Excluir Tarefas', value: permissions.canDeleteTasks || false },
    { key: 'can_approve_tasks', label: 'Aprovar Tarefas', value: permissions.canApproveTasks || false },
  ];

  const timePermissions = [
    { key: 'can_log_time', label: 'Registrar Tempo', value: permissions.canLogTime || false },
    { key: 'can_edit_own_time', label: 'Editar Próprio Tempo', value: permissions.canEditOwnTime || false },
    { key: 'can_edit_all_time', label: 'Editar Tempo de Todos', value: permissions.canEditAllTime || false },
    { key: 'can_view_team_time', label: 'Ver Tempo da Equipe', value: permissions.canViewTeamTime || false },
  ];

  const financialPermissions = [
    { key: 'can_view_client_fees', label: 'Ver Taxas de Clientes', value: permissions.canViewClientFees || false },
    { key: 'can_edit_client_fees', label: 'Editar Taxas de Clientes', value: permissions.canEditClientFees || false },
    { key: 'can_manage_expenses', label: 'Gerir Despesas', value: permissions.canManageExpenses || false },
    { key: 'can_view_profitability', label: 'Ver Rentabilidade', value: permissions.canViewProfitability || false },
    { key: 'can_view_team_profitability', label: 'Ver Rentabilidade da Equipe', value: permissions.canViewTeamProfitability || false },
    { key: 'can_view_organization_profitability', label: 'Ver Rentabilidade da Organização', value: permissions.canViewOrganizationProfitability || false },
  ];

  const reportPermissions = [
    { key: 'can_view_analytics', label: 'Ver Análises', value: permissions.canViewAnalytics || false },
    { key: 'can_export_reports', label: 'Exportar Relatórios', value: permissions.canExportReports || false },
    { key: 'can_create_custom_reports', label: 'Criar Relatórios Personalizados', value: permissions.canCreateCustomReports || false },
    { key: 'can_schedule_reports', label: 'Agendar Relatórios', value: permissions.canScheduleReports || false },
  ];

  const workflowPermissions = [
    { key: 'can_create_workflows', label: 'Criar Workflows', value: permissions.canCreateWorkflows || false },
    { key: 'can_edit_workflows', label: 'Editar Workflows', value: permissions.canEditWorkflows || false },
    { key: 'can_assign_workflows', label: 'Atribuir Workflows', value: permissions.canAssignWorkflows || false },
    { key: 'can_manage_workflows', label: 'Gerir Workflows', value: permissions.canManageWorkflows || false },
  ];

  const PermissionBadge = ({ permission }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.75rem 1rem',
      background: permission.value
        ? 'rgba(34, 197, 94, 0.1)'
        : 'rgba(239, 68, 68, 0.1)',
      border: permission.value
        ? '1px solid rgba(34, 197, 94, 0.3)'
        : '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '8px',
    }}>
      <span style={{ fontSize: '0.875rem', color: 'white' }}>
        {permission.label}
      </span>
      {permission.value ? (
        <CheckCircle size={18} style={{ color: 'rgb(34, 197, 94)' }} />
      ) : (
        <XCircle size={18} style={{ color: 'rgb(239, 68, 68)' }} />
      )}
    </div>
  );

  const PermissionSection = ({ title, permissions, icon }) => (
    <div style={{ ...glassStyle, padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{
          padding: '0.5rem',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderRadius: '12px'
        }}>
          {icon}
        </div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{title}</h3>
      </div>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {permissions.map((permission) => (
          <PermissionBadge key={permission.key} permission={permission} />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'relative', minHeight: '100vh', color: 'white' }}>
      <BackgroundElements businessStatus="optimal" />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} style={{ zIndex: 9999 }} />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        style={{ position: 'relative', zIndex: 10, padding: '2rem', paddingTop: '1rem' }}
      >
        {/* Header */}
<motion.div
  variants={itemVariants}
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  }}
>
  <div>
    <h1 style={{
      fontSize: '1.8rem',
      fontWeight: '700',
      margin: '0 0 0.5rem 0',
      background: 'linear-gradient(135deg, white, rgba(255,255,255,0.8))',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    }}>
      Minha Organização
    </h1>
    <p style={{ fontSize: '1rem', color: 'rgba(191, 219, 254, 1)', margin: 0 }}>
      Informações da sua organização e suas permissões.
    </p>
  </div>
  
  {/* Right side controls - grouped together */}
  {!organization && (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '1rem',
      flexWrap: 'wrap'
    }}>
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowCreateForm(true)}
        style={{
          ...glassStyle,
          padding: '0.75rem 1.5rem',
          border: '1px solid rgba(59,130,246,0.3)',
          background: 'rgba(59,130,246,0.2)',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          marginRight: '1rem'
        }}
        disabled={createOrganizationMutation.isPending}
      >
        <Plus size={18} /> Criar Organização
      </motion.button>
      
      <InvitationCodeDisplay invitation_code={userProfile?.invitation_code} />
    </div>
  )}
  
  {/* Show invitation code for existing organizations too */}
  {organization && (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '1rem' 
    }}>
      <InvitationCodeDisplay invitation_code={userProfile?.invitation_code} />
    </div>
  )}
</motion.div>

        {/* Organization Creation Form */}
        <AnimatePresence>
          {showCreateForm && !organization && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: '12px' }}>
                  <Building style={{ color: 'rgb(59,130,246)' }} size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                    Criar Nova Organização
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191,219,254)' }}>
                    Crie uma organização para começar a gerir clientes e tarefas.
                  </p>
                </div>
              </div>
              <form onSubmit={handleOrganizationSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                      Nome *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={organizationFormData.name}
                      onChange={handleOrganizationInputChange}
                      required
                      style={{
                        width: '100%', padding: '0.75rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px', color: 'white', fontSize: '0.875rem'
                      }}
                      placeholder="Nome da Organização"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={organizationFormData.email}
                      onChange={handleOrganizationInputChange}
                      style={{
                        width: '100%', padding: '0.75rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px', color: 'white', fontSize: '0.875rem'
                      }}
                      placeholder="Email de contacto"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                      Telefone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={organizationFormData.phone}
                      onChange={handleOrganizationInputChange}
                      style={{
                        width: '100%', padding: '0.75rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px', color: 'white', fontSize: '0.875rem'
                      }}
                      placeholder="Número de telefone"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                      Morada
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={organizationFormData.address}
                      onChange={handleOrganizationInputChange}
                      style={{
                        width: '100%', padding: '0.75rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px', color: 'white', fontSize: '0.875rem'
                      }}
                      placeholder="Morada completa"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                      Plano
                    </label>
                    <select
                      name="subscription_plan"
                      value={organizationFormData.subscription_plan}
                      onChange={handleOrganizationInputChange}
                      style={{
                        width: '100%', padding: '0.75rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px', color: 'white', fontSize: '0.875rem'
                      }}
                    >
                      <option value="Básico" style={{ background: '#1f2937', color: 'white' }}>Básico</option>
                      <option value="Premium" style={{ background: '#1f2937', color: 'white' }}>Premium</option>
                      <option value="Enterprise" style={{ background: '#1f2937', color: 'white' }}>Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                      Máx. Utilizadores
                    </label>
                    <input
                      type="number"
                      name="max_users"
                      value={organizationFormData.max_users}
                      onChange={handleOrganizationInputChange}
                      min="1"
                      style={{
                        width: '100%', padding: '0.75rem',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px', color: 'white', fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)' }}>
                    Descrição
                  </label>
                  <textarea
                    name="description"
                    value={organizationFormData.description}
                    onChange={handleOrganizationInputChange}
                    rows={3}
                    style={{
                      width: '100%', padding: '0.75rem',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px', color: 'white', fontSize: '0.875rem', resize: 'vertical'
                    }}
                    placeholder="Breve descrição da organização..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      resetOrganizationForm();
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'rgba(239,68,68,0.2)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '8px', color: 'white',
                      fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer'
                    }}
                    disabled={createOrganizationMutation.isPending}
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'rgba(59,130,246,0.2)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      borderRadius: '8px', color: 'white',
                      fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                    disabled={createOrganizationMutation.isPending}
                  >
                    {createOrganizationMutation.isPending ?
                      <Loader2 size={16} className="animate-spin" /> : <Save size={18} />
                    }
                    Criar Organização
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {organization ? (
          <>
            {/* Organization Details */}
            <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{
                  padding: '0.5rem',
                  backgroundColor: 'rgba(147, 51, 234, 0.2)',
                  borderRadius: '12px'
                }}>
                  <Building style={{ color: 'rgb(147, 51, 234)' }} size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '600', margin: 0 }}>
                    {organization.name}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                    {organization.description || "Sem descrição disponível."}
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem'
              }}>
                {organization.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Mail size={20} style={{ color: 'rgb(59, 130, 246)' }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        Email
                      </p>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
                        {organization.email}
                      </p>
                    </div>
                  </div>
                )}

                {organization.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Phone size={20} style={{ color: 'rgb(52, 211, 153)' }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        Telefone
                      </p>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
                        {organization.phone}
                      </p>
                    </div>
                  </div>
                )}

                {organization.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <MapPin size={20} style={{ color: 'rgb(245, 158, 11)' }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                        Morada
                      </p>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
                        {organization.address}
                      </p>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CreditCard size={20} style={{ color: 'rgb(168, 85, 247)' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Plano
                    </p>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
                      {organization.subscription_plan || "Básico"}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Users size={20} style={{ color: 'rgb(239, 68, 68)' }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                      Membros
                    </p>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
                      {members.length} / {organization.max_users || "∞"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Administrators */}
            {adminMembers.length > 0 && (
              <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderRadius: '12px'
                  }}>
                    <Crown style={{ color: 'rgb(245, 158, 11)' }} size={20} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                    Administradores
                  </h3>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: 'rgb(245, 158, 11)'
                  }}>
                    {adminMembers.length}
                  </span>
                </div>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {adminMembers.map((admin) => (
                    <div
                      key={admin.id || admin.user}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgb(245, 158, 11)',
                        fontWeight: '600',
                        fontSize: '0.875rem'
                      }}>
                        {admin.username?.charAt(0).toUpperCase() || "A"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', color: 'white', fontSize: '0.875rem' }}>
                          {admin.username}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>
                          {admin.email} • {admin.role || "Administrador"}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {admin.email && (
                          <a
                            href={`mailto:${admin.email}`}
                            style={{
                              padding: '0.5rem',
                              background: 'rgba(59, 130, 246, 0.2)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '6px',
                              color: 'rgb(59, 130, 246)',
                              textDecoration: 'none'
                            }}
                            title="Enviar email"
                          >
                            <Mail size={16} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* User Permissions */}
            <motion.div variants={itemVariants} style={{ ...glassStyle, padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    padding: '0.5rem',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    borderRadius: '12px'
                  }}>
                    <Shield style={{ color: 'rgb(34, 197, 94)' }} size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                      As Minhas Permissões
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgb(191, 219, 254)' }}>
                      {userProfile?.role || "Membro"} • {userProfile?.username}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAllPermissions(!showAllPermissions)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    color: 'rgb(59, 130, 246)',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {showAllPermissions ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showAllPermissions ? 'Ocultar Detalhes' : 'Ver Detalhes'}
                </motion.button>
              </div>

              {/* Basic permissions summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                marginBottom: showAllPermissions ? '1.5rem' : '0'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: permissions.isOrgAdmin
                    ? 'rgba(147, 51, 234, 0.1)'
                    : 'rgba(107, 114, 128, 0.1)',
                  border: permissions.isOrgAdmin
                    ? '1px solid rgba(147, 51, 234, 0.3)'
                    : '1px solid rgba(107, 114, 128, 0.3)',
                  borderRadius: '8px',
                }}>
                  <span style={{ fontSize: '0.875rem', color: 'white' }}>
                    Administrador
                  </span>
                  {permissions.isOrgAdmin ? (
                    <Crown size={18} style={{ color: 'rgb(147, 51, 234)' }} />
                  ) : (
                    <User size={18} style={{ color: 'rgb(107, 114, 128)' }} />
                  )}
                </div>

                <PermissionBadge permission={{
                  label: 'Registrar Tempo',
                  value: permissions.canLogTime
                }} />
                <PermissionBadge permission={{
                  label: 'Ver Todos os Clientes',
                  value: permissions.canViewAllClients
                }} />
                <PermissionBadge permission={{
                  label: 'Criar Tarefas',
                  value: permissions.canCreateTasks
                }} />
                <PermissionBadge permission={{
                  label: 'Ver Análises',
                  value: permissions.canViewAnalytics
                }} />
              </div>

              {/* Detailed permissions sections */}
              <AnimatePresence>
                {showAllPermissions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem' }}>
                      <PermissionSection
                        title="Gestão de Clientes"
                        permissions={clientPermissions}
                        icon={<Users style={{ color: 'rgb(59, 130, 246)' }} size={20} />}
                      />
                      <PermissionSection
                        title="Gestão de Tarefas"
                        permissions={taskPermissions}
                        icon={<Shield style={{ color: 'rgb(59, 130, 246)' }} size={20} />}
                      />
                      <PermissionSection
                        title="Gestão de Tempo"
                        permissions={timePermissions}
                        icon={<User style={{ color: 'rgb(59, 130, 246)' }} size={20} />}
                      />
                      <PermissionSection
                        title="Permissões Financeiras"
                        permissions={financialPermissions}
                        icon={<CreditCard style={{ color: 'rgb(59, 130, 246)' }} size={20} />}
                      />
                      <PermissionSection
                        title="Relatórios e Análises"
                        permissions={reportPermissions}
                        icon={<Brain style={{ color: 'rgb(59, 130, 246)' }} size={20} />}
                      />
                      <PermissionSection
                        title="Gestão de Workflows"
                        permissions={workflowPermissions}
                        icon={<Building style={{ color: 'rgb(59, 130, 246)' }} size={20} />}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Info Box */}
            <motion.div
              variants={itemVariants}
              style={{
                ...glassStyle,
                padding: '1.5rem',
                marginTop: '2rem',
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Info size={24} style={{ color: 'rgb(59, 130, 246)', marginTop: '0.125rem', flexShrink: 0 }} />
                <div>
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'white'
                  }}>
                    Precisa de Mais Permissões?
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    lineHeight: 1.6
                  }}>
                    Se precisar de permissões adicionais para realizar suas funções, entre em contacto com um dos administradores listados acima. Eles podem ajustar suas permissões conforme necessário para sua função na organização.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        ) : (
          /* No Organization Message with Create Option */
          <motion.div
            variants={itemVariants}
            style={{
              ...glassStyle,
              padding: '2rem',
              textAlign: 'center',
              marginTop: '2rem'
            }}
          >
            <Building size={64} style={{
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '1.5rem',
              margin: 'auto'
            }} />
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              marginBottom: '0.5rem'
            }}>
              Nenhuma Organização Encontrada
            </h2>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              marginBottom: '1.5rem',
              maxWidth: '600px',
              margin: '0 auto 1.5rem auto',
              lineHeight: 1.6
            }}>
              Ainda não está associado a nenhuma organização. Pode criar uma nova organização para começar a gerir clientes e tarefas, ou aguardar que um administrador o adicione a uma organização existente.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateForm(true)}
                style={{
                  ...glassStyle,
                  padding: '1rem 2rem',
                  border: '1px solid rgba(59,130,246,0.3)',
                  background: 'rgba(59,130,246,0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}
                disabled={createOrganizationMutation.isPending}
              >
                <Plus size={20} /> Criar Nova Organização
              </motion.button>
            </div>
            <div style={{
              marginTop: '2rem',
              padding: '1rem',
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '8px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                💡 <strong>Dica:</strong> Ao criar uma organização, será automaticamente definido como administrador com todas as permissões necessárias para gerir a organização.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>

      <style jsx>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
        .animate-spin { 
          animation: spin 1s linear infinite; 
        }
        input::placeholder, textarea::placeholder { 
          color: rgba(255,255,255,0.5) !important; 
        }
        select option { 
          background: #1f2937 !important; 
          color: white !important; 
        }
        ::-webkit-scrollbar { 
          width: 8px; 
          height: 8px; 
        }
        ::-webkit-scrollbar-track { 
          background: rgba(255,255,255,0.1); 
          border-radius: 4px; 
        }
        ::-webkit-scrollbar-thumb { 
          background: rgba(255,255,255,0.3); 
          border-radius: 4px; 
        }
        ::-webkit-scrollbar-thumb:hover { 
          background: rgba(255,255,255,0.5); 
        }
        * { 
          transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease; 
        }
        button:hover { 
          transform: translateY(-1px); 
        }
        button:focus, input:focus, select:focus, textarea:focus { 
          outline: 2px solid rgba(59,130,246,0.5); 
          outline-offset: 2px; 
        }
        a:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};

export default OrganizationView;
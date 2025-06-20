import React, { useState, useEffect } from "react";
import {
  XCircle,
  User,
  Briefcase,
  CheckSquare,
  Clock,
  DollarSign,
  BarChart,
  Settings,
  Eye,
  Save,
} from "lucide-react";

// Member permissions form component
const MemberPermissionsForm = ({ member, onSave, onCancel, clients = [] }) => {
  // Style definitions for a consistent "glassmorphism" look
  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.875rem'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
    color: 'rgba(255, 255, 255, 0.8)'
  };

  const primaryButtonStyle = {
    padding: '0.75rem 1.5rem',
    background: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const cancelButtonStyle = {
    padding: '0.75rem 1.5rem',
    background: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const sectionContainerStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const purpleBoxStyle = {
    background: 'rgba(147, 51, 234, 0.1)',
    padding: '1rem',
    borderRadius: '12px',
    border: '1px solid rgba(147, 51, 234, 0.2)',
  };

  const blueBoxStyle = {
      background: 'rgba(59,130,246,0.1)',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '1px solid rgba(59,130,246,0.2)'
  };

  const tabButtonStyle = (isActive) => ({
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    border: `1px solid ${isActive ? 'rgba(59, 130, 246, 0.3)' : 'transparent'}`,
    fontSize: '0.875rem',
    fontWeight: '500',
    background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
    color: isActive ? 'white' : 'rgba(255, 255, 255, 0.8)',
  });

  const [formData, setFormData] = useState({
    user_id: member?.user || "",
    role: member?.role || "Colaborador",
    access_level: member?.access_level || "Standard",
    hourly_rate: member?.hourly_rate || 0,
    phone: member?.phone || "",
    is_admin: member?.is_org_admin || false,
    can_manage_clients: member?.can_manage_clients || false,
    can_view_all_clients: member?.can_view_all_clients || false,
    can_create_clients: member?.can_create_clients || false,
    can_edit_clients: member?.can_edit_clients || false,
    can_delete_clients: member?.can_delete_clients || false,
    can_change_client_status: member?.can_change_client_status || false,
    can_assign_tasks: member?.can_assign_tasks || false,
    can_create_tasks: member?.can_create_tasks || false,
    can_edit_all_tasks: member?.can_edit_all_tasks || false,
    can_edit_assigned_tasks: member?.can_edit_assigned_tasks || false,
    can_delete_tasks: member?.can_delete_tasks || false,
    can_view_all_tasks: member?.can_view_all_tasks || false,
    can_approve_tasks: member?.can_approve_tasks || false,
    can_log_time: member?.can_log_time || true,
    can_edit_own_time: member?.can_edit_own_time || true,
    can_edit_all_time: member?.can_edit_all_time || false,
    can_view_team_time: member?.can_view_team_time || false,
    can_view_client_fees: member?.can_view_client_fees || false,
    can_edit_client_fees: member?.can_edit_client_fees || false,
    can_manage_expenses: member?.can_manage_expenses || false,
    can_view_profitability: member?.can_view_profitability || false,
    can_view_team_profitability: member?.can_view_team_profitability || false,
    can_view_organization_profitability: member?.can_view_organization_profitability || false,
    can_view_analytics: member?.can_view_analytics || false,
    can_export_reports: member?.can_export_reports || false,
    can_create_custom_reports: member?.can_create_custom_reports || false,
    can_schedule_reports: member?.can_schedule_reports || false,
    can_create_workflows: member?.can_create_workflows || false,
    can_edit_workflows: member?.can_edit_workflows || false,
    can_assign_workflows: member?.can_assign_workflows || false,
    can_manage_workflows: member?.can_manage_workflows || false,
  });

  const [selectedClients, setSelectedClients] = useState(
    member?.visible_clients || []
  );

  const [activeSection, setActiveSection] = useState("basic");

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

  useEffect(() => {
    if (member && member.visible_clients_info) {
      setSelectedClients(member.visible_clients_info.map(client => client.id));
    }
  }, [member]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      if (name === "is_admin" && checked) {
        setFormData({
          ...formData,
          is_admin: true,
          can_manage_clients: true, can_view_all_clients: true, can_create_clients: true,
          can_edit_clients: true, can_delete_clients: true, can_change_client_status: true,
          can_assign_tasks: true, can_create_tasks: true, can_edit_all_tasks: true,
          can_edit_assigned_tasks: true, can_delete_tasks: true, can_view_all_tasks: true,
          can_approve_tasks: true, can_log_time: true, can_edit_own_time: true,
          can_edit_all_time: true, can_view_team_time: true, can_view_client_fees: true,
          can_edit_client_fees: true, can_manage_expenses: true, can_view_profitability: true,
          can_view_team_profitability: true, can_view_organization_profitability: true,
          can_view_analytics: true, can_export_reports: true, can_create_custom_reports: true,
          can_schedule_reports: true, can_create_workflows: true, can_edit_workflows: true,
          can_assign_workflows: true, can_manage_workflows: true
        });
      } else if (name === "can_view_all_clients" && checked) {
        setSelectedClients([]);
        setFormData({ ...formData, [name]: checked });
      } else {
        setFormData({ ...formData, [name]: checked });
      }
    } else {
      if (name === "hourly_rate") {
        const numberValue = parseFloat(value) || 0;
        setFormData({ ...formData, [name]: numberValue });
      } else {
        setFormData({ ...formData, [name]: value });
      }
    }
  };

  const handleClientSelection = (clientId) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      visible_clients: selectedClients
    };
    onSave(dataToSubmit);
  };

  const renderPermissionCheckbox = (name, label, description) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ display: 'flex', height: '1.25rem', alignItems: 'center' }}>
            <input
                type="checkbox"
                name={name}
                id={name}
                checked={formData[name]}
                onChange={handleInputChange}
                style={{ height: '1rem', width: '1rem', accentColor: 'rgb(147, 51, 234)' }}
            />
        </div>
        <div>
            <label htmlFor={name} style={{ fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)', cursor: 'pointer' }}>
                {label}
            </label>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem', margin: 0 }}>
                {description}
            </p>
        </div>
    </div>
  );

  return (
    <div style={{ color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
         <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: 'white' }}>
          {member?.user ? "Editar Permissões do Membro" : "Configurar Permissões Detalhadas (Passo 2 de 2)"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          style={{ color: 'rgba(255, 255, 255, 0.7)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <XCircle size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
          <button type="button" style={tabButtonStyle(activeSection === "basic")} onClick={() => setActiveSection("basic")}>
            <User size={16} /> Básico
          </button>
          <button type="button" style={tabButtonStyle(activeSection === "clients")} onClick={() => setActiveSection("clients")}>
            <Briefcase size={16} /> Clientes
          </button>
          <button type="button" style={tabButtonStyle(activeSection === "tasks")} onClick={() => setActiveSection("tasks")}>
            <CheckSquare size={16} /> Tarefas
          </button>
          <button type="button" style={tabButtonStyle(activeSection === "time")} onClick={() => setActiveSection("time")}>
            <Clock size={16} /> Tempo
          </button>
          <button type="button" style={tabButtonStyle(activeSection === "financial")} onClick={() => setActiveSection("financial")}>
            <DollarSign size={16} /> Financeiro
          </button>
          <button type="button" style={tabButtonStyle(activeSection === "reports")} onClick={() => setActiveSection("reports")}>
            <BarChart size={16} /> Relatórios
          </button>
          <button type="button" style={tabButtonStyle(activeSection === "workflows")} onClick={() => setActiveSection("workflows")}>
            <Settings size={16} /> Workflows
          </button>
        </div>

        {activeSection === "basic" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Função</label>
                <input type="text" name="role" value={formData.role} onChange={handleInputChange} style={inputStyle} placeholder="Ex: Contador, Gestor, Assistente" />
              </div>
              <div>
                <label style={labelStyle}>Nível de Acesso</label>
                <input type="text" name="access_level" value={formData.access_level} onChange={handleInputChange} style={inputStyle} placeholder="Ex: Standard, Premium, Limited" />
              </div>
              <div>
                <label style={labelStyle}>Preço à Hora (€)</label>
                <input type="number" name="hourly_rate" value={formData.hourly_rate} onChange={handleInputChange} style={inputStyle} step="0.01" min="0" />
              </div>
              <div>
                <label style={labelStyle}>Telefone</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} style={inputStyle} placeholder="Número de telefone" />
              </div>
            </div>
            
            <div style={purpleBoxStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ display: 'flex', height: '1.25rem', alignItems: 'center' }}>
                  <input type="checkbox" id="is_admin" name="is_admin" checked={formData.is_admin} onChange={handleInputChange} style={{ height: '1rem', width: '1rem', accentColor: 'rgb(147, 51, 234)' }} />
                </div>
                <div>
                  <label htmlFor="is_admin" style={{ fontWeight: '600', color: 'rgb(199, 161, 255)', cursor: 'pointer' }}>
                    Administrador da Organização
                  </label>
                  <p style={{ color: 'rgba(216, 180, 254, 0.9)', fontSize: '0.875rem', margin: 0 }}>
                    Administradores têm acesso completo a todas as funções do sistema e podem gerenciar outros membros.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "clients" && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={sectionContainerStyle}>
              <h3 style={{ fontWeight: '600', color: 'white', marginBottom: '1rem', fontSize: '1rem' }}>Permissões de Clientes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {renderPermissionCheckbox("can_manage_clients", "Gerir Clientes", "Pode gerenciar informações de clientes e configurações.")}
                {renderPermissionCheckbox("can_view_all_clients", "Ver Todos os Clientes", "Pode visualizar todos os clientes da organização.")}
                {renderPermissionCheckbox("can_create_clients", "Criar Clientes", "Pode adicionar novos clientes ao sistema.")}
                {renderPermissionCheckbox("can_edit_clients", "Editar Clientes", "Pode modificar detalhes de clientes existentes.")}
                {renderPermissionCheckbox("can_delete_clients", "Excluir Clientes", "Pode remover clientes do sistema.")}
                {renderPermissionCheckbox("can_change_client_status", "Ativar/Desativar Clientes", "Pode alterar o status de ativo/inativo dos clientes.")}
              </div>
            </div>
            
            {!formData.can_view_all_clients && (
              <div style={blueBoxStyle}>
                <h3 style={{ fontWeight: '600', color: 'rgb(147, 197, 253)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                  <Eye size={18} /> Clientes Visíveis
                </h3>
                <p style={{ color: 'rgba(147, 197, 253, 0.9)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                 Selecione quais clientes este membro poderá visualizar. Se nenhum cliente for selecionado, ele não poderá ver nenhum cliente.
                </p>
                
                {clients && clients.length > 0 ? (
                  <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem' }}>
                      {clients.map((client) => (
                        <label key={client.id} className="client-item-label" style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', borderRadius: '6px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={selectedClients.includes(client.id)} onChange={() => handleClientSelection(client.id)} style={{ height: '1rem', width: '1rem', marginRight: '0.75rem', accentColor: 'rgb(59, 130, 246)' }}/>
                          <div>
                            <div style={{ fontWeight: '500', color: 'rgba(255, 255, 255, 0.9)' }}>{client.name}</div>
                            {client.email && <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>{client.email}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ ...sectionContainerStyle, textAlign: 'center', marginTop: '0.75rem' }}>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Não há clientes disponíveis para seleção.</p>
                  </div>
                )}
                
                <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'rgb(147, 197, 253)' }}>
                    {selectedClients.length} {selectedClients.length === 1 ? 'cliente' : 'clientes'} selecionado(s)
                  </span>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" onClick={() => setSelectedClients(clients.map(c => c.id))} className="action-button-link" style={{ color: 'rgb(147, 197, 253)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                      Selecionar todos
                    </button>
                    <button type="button" onClick={() => setSelectedClients([])} className="action-button-link" style={{ color: 'rgb(147, 197, 253)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>
                      Limpar seleção
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
   
        {activeSection === "tasks" && (
          <div style={sectionContainerStyle}>
            <h3 style={{ fontWeight: '600', color: 'white', marginBottom: '1rem', fontSize: '1rem' }}>Permissões de Tarefas</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {renderPermissionCheckbox("can_assign_tasks", "Atribuir Tarefas", "Pode atribuir tarefas a outros membros.")}
              {renderPermissionCheckbox("can_create_tasks", "Criar Tarefas", "Pode criar novas tarefas.")}
              {renderPermissionCheckbox("can_edit_all_tasks", "Editar Todas as Tarefas", "Pode editar qualquer tarefa no sistema.")}
              {renderPermissionCheckbox("can_edit_assigned_tasks", "Editar Tarefas Atribuídas", "Pode editar tarefas atribuídas a si.")}
              {renderPermissionCheckbox("can_delete_tasks", "Excluir Tarefas", "Pode excluir tarefas do sistema.")}
              {renderPermissionCheckbox("can_view_all_tasks", "Ver Todas as Tarefas", "Pode visualizar todas as tarefas no sistema.")}
              {renderPermissionCheckbox("can_approve_tasks", "Aprovar Tarefas", "Pode aprovar etapas ou conclusão de tarefas.")}
            </div>
          </div>
        )}
          
        {activeSection === "time" && (
          <div style={sectionContainerStyle}>
            <h3 style={{ fontWeight: '600', color: 'white', marginBottom: '1rem', fontSize: '1rem' }}>Permissões de Gerenciamento de Tempo</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {renderPermissionCheckbox("can_log_time", "Registrar Tempo", "Pode registrar tempo para tarefas.")}
                {renderPermissionCheckbox("can_edit_own_time", "Editar Próprio Tempo", "Pode editar registros de tempo próprios.")}
                {renderPermissionCheckbox("can_edit_all_time", "Editar Todo o Tempo", "Pode editar registros de tempo de qualquer membro.")}
                {renderPermissionCheckbox("can_view_team_time", "Ver Tempo da Equipe", "Pode visualizar registros de tempo de toda a equipe.")}
            </div>
          </div>
        )}
          
        {activeSection === "financial" && (
            <div style={sectionContainerStyle}>
                <h3 style={{ fontWeight: '600', color: 'white', marginBottom: '1rem', fontSize: '1rem' }}>Permissões Financeiras</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {renderPermissionCheckbox("can_view_client_fees", "Ver Taxas de Clientes", "Pode visualizar informações sobre valores pagos por clientes.")}
                    {renderPermissionCheckbox("can_edit_client_fees", "Editar Taxas de Clientes", "Pode alterar valores pagos por clientes.")}
                    {renderPermissionCheckbox("can_manage_expenses", "Gerenciar Despesas", "Pode adicionar, editar e excluir despesas.")}
                    {renderPermissionCheckbox("can_view_profitability", "Ver Rentabilidade", "Pode visualizar relatórios de rentabilidade de clientes.")}
                    {renderPermissionCheckbox("can_view_team_profitability", "Ver Rentabilidade da Equipe", "Pode visualizar relatórios de rentabilidade da equipe.")}
                    {renderPermissionCheckbox("can_view_organization_profitability", "Ver Rentabilidade da Organização", "Pode visualizar relatórios de rentabilidade de toda a organização.")}
                </div>
            </div>
        )}
          
        {activeSection === "reports" && (
            <div style={sectionContainerStyle}>
                <h3 style={{ fontWeight: '600', color: 'white', marginBottom: '1rem', fontSize: '1rem' }}>Permissões de Relatórios</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {renderPermissionCheckbox("can_view_analytics", "Ver Análises", "Pode visualizar painéis de análise e dashboards.")}
                    {renderPermissionCheckbox("can_export_reports", "Exportar Relatórios", "Pode exportar relatórios em vários formatos.")}
                    {renderPermissionCheckbox("can_create_custom_reports", "Criar Relatórios Personalizados", "Pode criar relatórios personalizados.")}
                    {renderPermissionCheckbox("can_schedule_reports", "Agendar Relatórios", "Pode configurar relatórios para execução agendada.")}
                </div>
            </div>
        )}
          
        {activeSection === "workflows" && (
            <div style={sectionContainerStyle}>
                <h3 style={{ fontWeight: '600', color: 'white', marginBottom: '1rem', fontSize: '1rem' }}>Permissões de Fluxos de Trabalho</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {renderPermissionCheckbox("can_create_workflows", "Criar Fluxos de Trabalho", "Pode criar novos fluxos de trabalho.")}
                    {renderPermissionCheckbox("can_edit_workflows", "Editar Fluxos de Trabalho", "Pode modificar fluxos de trabalho existentes.")}
                    {renderPermissionCheckbox("can_assign_workflows", "Atribuir Fluxos de Trabalho", "Pode associar fluxos de trabalho a tarefas.")}
                    {renderPermissionCheckbox("can_manage_workflows", "Gerenciar Fluxos de Trabalho", "Pode aprovar, rejeitar e gerenciar etapas de fluxos de trabalho.")}
                </div>
            </div>
        )}
          
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
            <button type="button" onClick={onCancel} style={cancelButtonStyle}>
              Cancelar
            </button>
            <button type="submit" style={primaryButtonStyle}>
              <Save size={18} style={{ marginRight: '0.5rem' }} />
              Salvar Permissões
            </button>
        </div>
      </form>
      <style jsx>{`
        .client-item-label:hover {
          background-color: rgba(59, 130, 246, 0.1);
        }
        .action-button-link:hover {
          text-decoration: underline;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        ::placeholder {
          color: rgba(255, 255, 255, 0.5);
          opacity: 1;
        }
      `}</style>
    </div>
  );
};
  
export default MemberPermissionsForm;
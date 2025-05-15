import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2, UserPlus, Save, Users, Eye, CheckSquare } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api';

const InvitationCodeForm = ({ organizationId, onSuccess }) => {
  const queryClient = useQueryClient();

  // Form state
  const [invitationCode, setInvitationCode] = useState('');
  const [formData, setFormData] = useState({
    role: 'Colaborador',
    is_admin: false,
    can_assign_tasks: false,
    can_manage_clients: false,
    can_view_all_clients: false,
    can_view_analytics: false,
    can_view_profitability: false
  });
  
  // State for client permissions
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Mutations
  const addMemberMutation = useMutation({
    mutationFn: (data) => api.post(`/organizations/${organizationId}/add_member_by_code/`, data),
    onSuccess: (response) => {
      // If the user shouldn't view all clients, and we have selected clients, update them
      if (!formData.can_view_all_clients && selectedClients.length > 0) {
        // Get the profile ID from the response data
        console.log(response.data);
        const user_id = response.data.user;
        
        // Call the mutation to manage visible clients
        manageVisibleClientsMutation.mutate({
          user_id: user_id,
          client_ids: selectedClients,
          action: 'add'
        });
        console.log("Profile ID:", user_id);
        console.log("Selected Clients:", selectedClients);
      } else {
        // Otherwise just show success and invalidate queries
        toast.success('Membro adicionado com sucesso');
        queryClient.invalidateQueries(['organizationMembers']);
        
        // Call the onSuccess callback if provided
        if (onSuccess) onSuccess();
        
        // Reset form
        resetForm();
      }
    },
    onError: (error) => {
      console.error('Erro ao adicionar membro:', error);
      toast.error('Falha ao adicionar membro. ' + (error.response?.data?.error || ''));
    }
  });
  
  const manageVisibleClientsMutation = useMutation({
    mutationFn: (data) => api.post(`/organizations/${organizationId}/manage_visible_clients/`, data),
    onSuccess: () => {
      toast.success('Membro adicionado com sucesso');
      queryClient.invalidateQueries(['organizationMembers']);
      
      // Call the onSuccess callback if provided
      if (onSuccess) onSuccess();
      
      // Reset form
      resetForm();
    },
    onError: (error) => {
      console.error('Erro ao definir clientes visíveis:', error);
      toast.error('Membro adicionado, mas ocorreu um erro ao definir clientes visíveis.');
      
      // Still invalidate queries and reset form
      queryClient.invalidateQueries(['organizationMembers']);
      resetForm();
    }
  });

  // Load clients when the form is shown
  React.useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const response = await api.get(`/organizations/${organizationId}/clients/`);
        setClients(response.data);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, [organizationId]);

  // Reset form
  const resetForm = () => {
    setInvitationCode('');
    setFormData({
      role: 'Colaborador',
      is_admin: false,
      can_assign_tasks: false,
      can_manage_clients: false,
      can_view_all_clients: false,
      can_view_analytics: false,
      can_view_profitability: false
    });
    setSelectedClients([]);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
      
      // If can_view_all_clients is checked, clear selected clients
      if (name === 'can_view_all_clients' && checked) {
        setSelectedClients([]);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!invitationCode.trim()) {
      toast.error('O código de convite é obrigatório');
      return;
    }
    
    // Prepare data for submission
    const data = {
      invitation_code: invitationCode,
      ...formData
    };
    
    // Submit data
    addMemberMutation.mutate(data);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <UserPlus size={22} className="mr-2 text-green-600" />
        Adicionar Membro por Código de Convite
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2">Código de Convite *</label>
            <input
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Digite o código de 4 dígitos"
              required
              maxLength={4}
            />
            <p className="text-sm text-gray-500 mt-1">
              Cada utilizador tem um código único de 4 dígitos em seu perfil
            </p>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Função no Escritório</label>
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Ex: Contabilista, Gestor, Assistente"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="font-medium text-gray-700 mb-2">Permissões</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <label className="flex items-center p-2 border border-gray-200 rounded-md hover:bg-white-50">
              <input
                type="checkbox"
                name="is_admin"
                checked={formData.is_admin}
                onChange={handleInputChange}
                className="mr-2"
              />
              <div>
                <span className="text-gray-800">Administrador</span>
                <p className="text-xs text-gray-500">Gerenciar organização e membros</p>
              </div>
            </label>
            
            <label className="flex items-center p-2 border border-gray-200 rounded-md hover:bg-white-50">
              <input
                type="checkbox"
                name="can_assign_tasks"
                checked={formData.can_assign_tasks}
                onChange={handleInputChange}
                className="mr-2"
              />
              <div>
                <span className="text-gray-800">Atribuir Tarefas</span>
                <p className="text-xs text-gray-500">Criar e atribuir tarefas</p>
              </div>
            </label>
            
            <label className="flex items-center p-2 border border-gray-200 rounded-md hover:bg-white-50">
              <input
                type="checkbox"
                name="can_manage_clients"
                checked={formData.can_manage_clients}
                onChange={handleInputChange}
                className="mr-2"
              />
              <div>
                <span className="text-gray-800">Gerir Clientes</span>
                <p className="text-xs text-gray-500">Adicionar e editar clientes</p>
              </div>
            </label>
            
            <label className="flex items-center p-2 border border-gray-200 rounded-md hover:bg-white-50">
              <input
                type="checkbox"
                name="can_view_analytics"
                checked={formData.can_view_analytics}
                onChange={handleInputChange}
                className="mr-2"
              />
              <div>
                <span className="text-gray-800">Ver Análises</span>
                <p className="text-xs text-gray-500">Acesso a relatórios e estatísticas</p>
              </div>
            </label>
            
            <label className="flex items-center p-2 border border-gray-200 rounded-md hover:bg-white-50">
              <input
                type="checkbox"
                name="can_view_profitability"
                checked={formData.can_view_profitability}
                onChange={handleInputChange}
                className="mr-2"
              />
              <div>
                <span className="text-gray-800">Ver Rentabilidade</span>
                <p className="text-xs text-gray-500">Acesso a dados financeiros</p>
              </div>
            </label>
          </div>
        </div>
        
        {/* Client Visibility Section */}
        <div className="mb-6 mt-6 border-t pt-4">
          <h3 className="font-medium text-gray-700 mb-3 flex items-center">
            <Eye size={18} className="mr-2 text-blue-600" />
            Visibilidade de Clientes
          </h3>
          
          <div className="mb-4">
            <label className="flex items-center p-2 bg-blue-50 rounded-md border border-blue-100">
              <input
                type="checkbox"
                name="can_view_all_clients"
                checked={formData.can_view_all_clients}
                onChange={handleInputChange}
                className="mr-2"
              />
              <div>
                <span className="text-blue-800 font-medium">Ver todos os clientes da organização</span>
                <p className="text-xs text-blue-600">
                  Quando ativado, o membro terá acesso a todos os clientes da organização
                </p>
              </div>
            </label>
          </div>
          
          {!formData.can_view_all_clients && (
            <div>
              <label className="block text-gray-700 mb-2">
                Selecione os clientes que este membro pode ver:
              </label>
              
              {loadingClients ? (
                <div className="p-4 bg-white-50 rounded flex justify-center">
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                </div>
              ) : clients.length === 0 ? (
                <div className="p-4 bg-white-50 rounded text-center">
                  <p className="text-gray-500">Nenhum cliente disponível na organização.</p>
                </div>
              ) : (
                <>
                  <div className="border border-gray-300 rounded-md p-2 max-h-60 overflow-y-auto">
                    <div className="space-y-1">
                      {clients.map((client) => (
                        <label key={client.id} className="flex items-center p-2 hover:bg-white-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedClients.includes(client.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClients([...selectedClients, client.id]);
                              } else {
                                setSelectedClients(selectedClients.filter(id => id !== client.id));
                              }
                            }}
                            className="mr-2"
                          />
                          <div>
                            <div className="text-gray-900">{client.name}</div>
                            {client.email && (
                              <div className="text-xs text-gray-500">{client.email}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {selectedClients.length} de {clients.length} clientes selecionados
                    </span>
                    
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedClients(clients.map(c => c.id))}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Selecionar todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedClients([])}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Limpar seleção
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
            disabled={addMemberMutation.isPending || manageVisibleClientsMutation.isPending}
          >
            {(addMemberMutation.isPending || manageVisibleClientsMutation.isPending) ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                A processar...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Adicionar Membro
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvitationCodeForm;
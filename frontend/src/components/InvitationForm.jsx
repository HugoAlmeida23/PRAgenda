import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2, UserPlus, ArrowRight } from 'lucide-react';
// Removed: Save, Users, Eye, CheckSquare, useMutation, useQueryClient, api

// CHANGED Props: removed organizationId, onSuccess. Added onNext, isProcessing (passed from parent)
const InvitationCodeForm = ({ onNext, isProcessing: parentIsProcessing }) => {
  // Form state
  const [invitationCode, setInvitationCode] = useState('');
  const [formData, setFormData] = useState({
    role: 'Colaborador',
    is_admin: false,
    can_assign_tasks: false,
    can_manage_clients: false,
    can_view_analytics: false,
    can_view_profitability: false
  });

  // Local processing state for this form's own actions, if any, before calling onNext.
  // However, the main processing (API calls) is handled by the parent.
  // So, we'll primarily rely on `parentIsProcessing`.
  // const [isProcessing, setIsProcessing] = useState(false); // Can be removed if parent handles all processing display

  // Reset form - Parent might handle full reset, but good for internal use if needed.
  const resetForm = () => {
    setInvitationCode('');
    setFormData({
      role: 'Colaborador',
      is_admin: false,
      can_assign_tasks: false,
      can_manage_clients: false,
      // can_view_all_clients: false, // Removed
      can_view_analytics: false,
      can_view_profitability: false
    });
    // setSelectedClients([]); // Removed
  };

  // Handle input changes
   const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
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
    
    const dataToPass = {
      invitation_code: invitationCode,
      ...formData
    };

    // Call onNext if it's provided
    if (typeof onNext === 'function') {
      onNext(dataToPass);
    } else {
      console.error("onNext prop is not a function or not provided to InvitationCodeForm");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <UserPlus size={22} className="mr-2 text-green-600" />
        Adicionar Membro (Passo 1 de 2): Código e Funções Básicas
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
          <h3 className="font-medium text-gray-700 mb-2">Permissões Iniciais</h3>
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
        
        <div className="flex justify-end mt-6">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            disabled={parentIsProcessing} 
          >
            {parentIsProcessing ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                A processar...
              </>
            ) : (
              <>
                <ArrowRight size={18} className="mr-2" />
                Continuar para Permissões Detalhadas
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InvitationCodeForm;
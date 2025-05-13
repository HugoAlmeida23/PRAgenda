import React, { useState } from "react";
import { toast } from "react-toastify";
import { UserPlus, CheckCircle, XCircle, Loader2 } from "lucide-react";
import api from "../api";

const InvitationCodeForm = ({ organizationId, onSuccess }) => {
  const [invitationCode, setInvitationCode] = useState("");
  const [role, setRole] = useState("Colaborador");
  const [isAdmin, setIsAdmin] = useState(false);
  const [canAssignTasks, setCanAssignTasks] = useState(false);
  const [canManageClients, setCanManageClients] = useState(false);
  const [canViewAllClients, setCanViewAllClients] = useState(false);
  const [canViewAnalytics, setCanViewAnalytics] = useState(false);
  const [canViewProfitability, setCanViewProfitability] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post(`/organizations/${organizationId}/add_member_by_code/`, {
        invitation_code: invitationCode,
        role: role,
        is_admin: isAdmin,
        can_assign_tasks: canAssignTasks,
        can_manage_clients: canManageClients,
        can_view_all_clients: canViewAllClients,
        can_view_analytics: canViewAnalytics,
        can_view_profitability: canViewProfitability
      });

      toast.success("Membro adicionado com sucesso!");
      setInvitationCode("");
      setRole("Colaborador");
      setIsAdmin(false);
      setCanAssignTasks(false);
      setCanManageClients(false);
      setCanViewAllClients(false);
      setCanViewAnalytics(false);
      setCanViewProfitability(false);
      
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (err) {
      console.error("Erro ao adicionar membro:", err);
      setError(err.response?.data?.error || "Erro ao adicionar membro");
      toast.error(err.response?.data?.error || "Erro ao adicionar membro");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-4">Adicionar Membro por Código de Convite</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          <div className="flex items-center">
            <XCircle size={18} className="mr-2 text-red-600" />
            {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2">
              Código de Convite do Colaborador *
            </label>
            <input
              type="text"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Digite o código de 4 dígitos"
              required
              maxLength={4}
              minLength={4}
              pattern="[0-9]{4}"
              title="O código deve ter 4 dígitos numéricos"
            />
            <p className="text-sm text-gray-500 mt-1">
              Este é um código de 4 dígitos fornecido pelo colaborador
            </p>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Função na Organização</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Ex: Gestor, Contabilista, etc."
            />
          </div>
        </div>

        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-700 mb-3">Permissões</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2">Administrador da Organização</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={canAssignTasks}
                onChange={(e) => setCanAssignTasks(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2">Pode Atribuir Tarefas</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={canManageClients}
                onChange={(e) => setCanManageClients(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2">Pode Gerir Clientes</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={canViewAllClients}
                onChange={(e) => setCanViewAllClients(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2">Pode Ver Todos os Clientes</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={canViewAnalytics}
                onChange={(e) => setCanViewAnalytics(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2">Pode Ver Análises</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={canViewProfitability}
                onChange={(e) => setCanViewProfitability(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2">Pode Ver Rentabilidade</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                A processar...
              </>
            ) : (
              <>
                <UserPlus size={18} className="mr-2" />
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
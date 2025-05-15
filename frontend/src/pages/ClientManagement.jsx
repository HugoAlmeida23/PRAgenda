import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Header from "../components/Header";
import api from "../api";
import "../styles/Home.css";import {
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
} from "lucide-react";

const ClientManagement = () => {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState(true);
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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (clients.length > 0) {
      applyFilters();
    }
  }, [searchTerm, filterActive, clients]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch clients
      const clientsResponse = await api.get("/clients/");
      setClients(clientsResponse.data);
      setFilteredClients(clientsResponse.data);

      // Fetch users for account manager dropdown
      const usersResponse = await api.get("/profiles/");
      setUsers(usersResponse.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...clients];

    // Apply active filter
    if (filterActive) {
      result = result.filter((client) => client.is_active);
    }

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (client) =>
          client.name.toLowerCase().includes(term) ||
          (client.nif && client.nif.toLowerCase().includes(term)) ||
          (client.email && client.email.toLowerCase().includes(term))
      );
    }

    setFilteredClients(result);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Format data for API
      const clientData = {
        ...formData,
        monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : 0
      };
  
      // Remove account_manager if it's an empty string to avoid validation errors
      if (clientData.account_manager === "") {
        delete clientData.account_manager;
      }
      
      console.log("Sending client data:", clientData); // Add this for debugging
      
      if (selectedClient) {
        // Update existing client
        await api.put(`/clients/${selectedClient.id}/`, clientData);
        toast.success("Client updated successfully");
      } else {
        // Create new client
        await api.post("/clients/", clientData);
        toast.success("Client created successfully");
      }
      
      // Reset form and refresh data
      resetForm();
      await fetchData();
      
    } catch (error) {
      console.error("Error saving client:", error);
      // More detailed error logging
      if (error.response) {
        console.error("Response data:", error.response.data);
      }
      toast.error("Failed to save client");
    } finally {
      setLoading(false);
    }
  };

  const selectClientForEdit = (client) => {
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

  const confirmDelete = async (clientId) => {
    if (window.confirm("Are you sure you want to delete this client?")) {
      try {
        await api.delete(`/clients/${clientId}/`);
        toast.success("Client deleted successfully");
        await fetchData();
      } catch (error) {
        console.error("Error deleting client:", error);
        toast.error("Failed to delete client");
      }
    }
  };

  const resetForm = () => {
    setSelectedClient(null);
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
    setShowForm(false);
  };

  const toggleClientStatus = async (client) => {
    try {
      await api.patch(`/clients/${client.id}/`, {
        is_active: !client.is_active,
      });
      toast.success(
        `Client ${!client.is_active ? "activated" : "deactivated"} successfully`
      );
      await fetchData();
    } catch (error) {
      console.error("Error toggling client status:", error);
      toast.error("Failed to update client status");
    }
  };

  return (
    <div className="main">
      <Header>
      <div
        className="p-6 bg-white-100 min-h-screen"
        style={{ marginLeft: "3%" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Client Management</h1>
            <button
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
            >
              {showForm ? (
                "Cancel"
              ) : (
                <>
                  <Plus size={18} className="mr-2" />
                  New Client
                </>
              )}
            </button>
          </div>

          {showForm && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-xl font-semibold mb-4">
                {selectedClient ? "Edit Client" : "Add New Client"}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Name *</label>
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
                      NIF/VAT Number
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
                    <label className="block text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Address</label>
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
                      Account Manager
                    </label>
                    <select
                      name="account_manager"
                      value={formData.account_manager}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Account Manager</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.user}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">
                      Monthly Fee (€)
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
                      Active Client
                    </label>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Notes</label>
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
                    className="bg-white-500 hover:bg-white-600 text-white px-4 py-2 rounded-md mr-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                    disabled={loading}
                  >
                    {loading
                      ? "Saving..."
                      : selectedClient
                      ? "Update Client"
                      : "Add Client"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4">
              <div className="w-full md:w-1/3 mb-4 md:mb-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search clients..."
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
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer mr-4">
                  <input
                    type="checkbox"
                    checked={filterActive}
                    onChange={() => setFilterActive(!filterActive)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">
                    Show active clients only
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h2 className="text-xl font-semibold p-6 border-b">Client List</h2>

            {loading ? (
              <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No clients found.{" "}
                {searchTerm
                  ? "Try adjusting your search."
                  : "Create your first one!"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monthly Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-white-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User size={20} className="mr-6 text-gray-400" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {client.name}
                              </div>
                              <div className="text-gray-500 text-sm">
                                {client.nif || "No NIF"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900">
                            {client.email || "No email"}
                          </div>
                          <div className="text-gray-500 text-sm">
                            {client.phone || "No phone"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {client.account_manager_name || "Not assigned"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium">
                            {client.monthly_fee
                              ? `${client.monthly_fee} €`
                              : "Not set"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${
                              client.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {client.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => selectClientForEdit(client)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            <Edit size={16} className="inline mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => toggleClientStatus(client)}
                            className={`mr-3 ${
                              client.is_active
                                ? "text-amber-600 hover:text-amber-900"
                                : "text-green-600 hover:text-green-900"
                            }`}
                          >
                            {client.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => confirmDelete(client.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={16} className="inline mr-1" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      </Header>
    </div>
  );
};

export default ClientManagement;

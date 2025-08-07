// Unified Client Management Service
// Works for both Circle and Vendor tenants
import api from "./api";

export interface Client {
  id: string;
  client_tenant: string; // Just the ID
  client_tenant_data: {
    id: string;
    organization_name: string;
    business_registration_number?: string;
    primary_contact_name?: string;
    primary_contact_email?: string;
    primary_contact_phone?: string;
    registration_status: string;
    activation_status: string;
    is_active: boolean;
    registered_at?: string;
    activated_at?: string;
    service_capabilities: string[];
    coverage_areas: string[];
    certifications: string[];
  };
  vendor_code: string;
  contact_person_name?: string;
  relationship_type: string;
  relationship_status: string;
  vendor_verification_status: string;
  performance_rating?: number;
  vendor_permissions: Record<string, any>;
  communication_allowed: boolean;
  contact_access_level: string;
  approved_by?: string;
  approved_at?: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientPortfolio {
  total_clients: number;
  active_clients: number;
  recent_clients: number;
  tenant_type: string;
  clients: Client[];
}

export interface ClientAnalytics {
  total_relationships: number;
  active_relationships: number;
  monthly_growth: number;
  top_clients: Client[];
  tenant_type: string;
}

export interface ClientForm {
  client_name: string;
  client_code: string;
  client_email: string;
  contact_person_name?: string;
  contact_access_level: string;
  invitation_expires_at?: string;
  notes?: string;
}

class ClientService {
  /**
   * Get unified client portfolio for both Circle and Vendor tenants
   */
  async getClients(): Promise<{ clients: Client[]; count: number; tenant_type: string }> {
    try {
      const response = await api.get("/client-management/");

      return response.data;
    } catch (error) {
      console.error("Error in getClients:", error);
      throw error;
    }
  }

  /**
   * Get client portfolio with analytics
   */
  async getClientPortfolio(): Promise<ClientPortfolio> {
    const response = await api.get("/client-management/portfolio/");
    return response.data;
  }

  /**
   * Get client analytics and performance metrics
   */
  async getClientAnalytics(): Promise<ClientAnalytics> {
    const response = await api.get("/client-management/analytics/");
    return response.data;
  }

  /**
   * Get a specific client relationship by ID
   */
  async getClient(id: string): Promise<Client> {
    const response = await api.get(`/client-management/${id}/`);
    return response.data;
  }

  /**
   * Create a new client relationship
   */
  async createClient(clientData: ClientForm): Promise<Client> {
    const response = await api.post("/client-management/", clientData);
    return response.data;
  }

  /**
   * Update an existing client relationship
   */
  async updateClient(id: string, updateData: Partial<ClientForm>): Promise<Client> {
    const response = await api.put(`/client-management/${id}/`, updateData);
    return response.data;
  }

  /**
   * Delete a client relationship
   */
  async deleteClient(id: string): Promise<void> {
    await api.delete(`/client-management/${id}/`);
  }

  /**
   * Approve a client relationship
   */
  async approveClient(id: string): Promise<Client> {
    const response = await api.post(`/clients/${id}/approve/`);
    return response.data;
  }

  /**
   * Reject a client relationship
   */
  async rejectClient(id: string, reason?: string): Promise<Client> {
    const response = await api.post(`/clients/${id}/reject/`, { reason });
    return response.data;
  }

  /**
   * Suspend a client relationship
   */
  async suspendClient(id: string, reason?: string): Promise<Client> {
    const response = await api.post(`/clients/${id}/suspend/`, { reason });
    return response.data;
  }

  /**
   * Terminate a client relationship
   */
  async terminateClient(id: string, reason?: string): Promise<Client> {
    const response = await api.post(`/clients/${id}/terminate/`, { reason });
    return response.data;
  }

  /**
   * Update performance rating for a client
   */
  async updatePerformanceRating(id: string, rating: number): Promise<Client> {
    const response = await api.put(`/clients/${id}/`, { performance_rating: rating });
    return response.data;
  }

  /**
   * Get client statistics
   */
  async getClientStats(): Promise<{
    total_clients: number;
    active_clients: number;
    pending_approvals: number;
    verified_clients: number;
    average_performance: number;
  }> {
    const clientsData = await this.getClients();
    const clients = clientsData.clients;

    const stats = {
      total_clients: clients.length,
      active_clients: clients.filter((c) => c.relationship_status === "Active").length,
      pending_approvals: clients.filter((c) => c.relationship_status === "Pending").length,
      verified_clients: clients.filter((c) => c.vendor_verification_status === "Verified").length,
      average_performance: clients.length > 0 ? clients.reduce((sum, client) => sum + (client.performance_rating || 0), 0) / clients.length : 0,
    };

    return stats;
  }

  /**
   * Search clients by name or organization
   */
  async searchClients(query: string): Promise<Client[]> {
    const response = await api.get("/client-management/", { params: { search: query } });
    return response.data.clients || response.data;
  }

  /**
   * Filter clients by status
   */
  async filterClientsByStatus(status: string): Promise<Client[]> {
    const response = await api.get("/client-management/", { params: { status } });
    return response.data.clients || response.data;
  }

  /**
   * Filter clients by relationship type
   */
  async filterClientsByType(type: string): Promise<Client[]> {
    const response = await api.get("/client-management/", { params: { relationship_type: type } });
    return response.data.clients || response.data;
  }

  /**
   * Create a new vendor-created client (manual client creation)
   * @param clientData The data for the new vendor client
   * @returns A promise that resolves to the created client object
   */
  async createVendorClient(clientData: {
    client_name: string;
    primary_contact_name: string;
    primary_contact_email: string;
    primary_contact_phone: string;
    headquarters_address?: string;
  }): Promise<any> {
    try {
      const response = await api.post("/vendor-clients/", clientData);
      return response.data;
    } catch (error) {
      console.error("Error creating vendor client:", error);
      throw error;
    }
  }
}

export default new ClientService();

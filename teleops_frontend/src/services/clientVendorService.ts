// Client Vendor Management Service
import api from "./api";

export interface VendorRelationship {
  id: string;
  client_tenant?: string;
  vendor_tenant?: string | null;
  vendor_organization_name?: string | null;
  vendor_email?: string | null;
  vendor_code: string;
  contact_person_name?: string;
  relationship_type: string;
  relationship_status: string;
  vendor_verification_status: string;
  performance_rating?: number;
  vendor_permissions: Record<string, any>;
  communication_allowed: boolean;
  contact_access_level: string;
  vendor_tenant_data?: {
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
    service_capabilities?: string[];
    coverage_areas?: string[];
    certifications?: string[];
  } | null;
  invitation_data?: {
    id: string;
    token: string;
    status: string;
    expires_at?: string;
    invited_at?: string;
    invited_by?: string;
  } | null;
  // Removed fields now handled by TenantInvitation and Tenant tables:
  // - service_areas, service_capabilities (→ Tenant table)
  // - billing_rate, payment_terms, currency, billing_frequency (→ removed for now)
  approved_by?: string;
  approved_at?: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorInviteRequest {
  vendor_name: string; // Used for TenantInvitation, not stored in ClientVendorRelationship
  vendor_code: string;
  vendor_email: string; // Used for TenantInvitation, not stored in ClientVendorRelationship
  contact_person_name?: string;
  contact_access_level: string;
  invitation_expires_at?: string;
  notes?: string;
}

export interface VendorUpdateRequest extends Partial<VendorInviteRequest> {
  relationship_status?: string;
  vendor_verification_status?: string;
  performance_rating?: number;
  approved_at?: string;
  // Note: billing, service, and contract fields can be added back later if needed
  // billing_rate?: number;
  // payment_terms?: string;
  // service_areas?: string[];
  // service_capabilities?: string[];
  // contract_start_date?: string;
  // contract_end_date?: string;
}

class ClientVendorService {
  /**
   * Get all vendor relationships for the current client
   */
  async getVendorRelationships(): Promise<VendorRelationship[]> {
    const response = await api.get("/client-vendor-relationships/");
    return response.data.results || response.data;
  }

  /**
   * Get a specific vendor relationship by ID
   */
  async getVendorRelationship(id: string): Promise<VendorRelationship> {
    const response = await api.get(`/client-vendor-relationships/${id}/`);
    return response.data;
  }

  /**
   * Invite a new vendor to the client
   */
  async inviteVendor(vendorData: VendorInviteRequest): Promise<VendorRelationship> {
    const response = await api.post("/client-vendor-relationships/", {
      vendor_name: vendorData.vendor_name,
      vendor_code: vendorData.vendor_code,
      vendor_email: vendorData.vendor_email,
      contact_person_name: vendorData.contact_person_name,
      contact_access_level: vendorData.contact_access_level,
      invitation_expires_at: vendorData.invitation_expires_at,
      // Removed redundant fields - now handled by TenantInvitation system
    });
    return response.data;
  }

  /**
   * Update an existing vendor relationship
   */
  async updateVendorRelationship(id: string, updateData: VendorUpdateRequest): Promise<VendorRelationship> {
    const response = await api.patch(`/client-vendor-relationships/${id}/`, updateData);
    return response.data;
  }

  /**
   * Approve a vendor relationship (change verification status)
   */
  async approveVendor(id: string): Promise<VendorRelationship> {
    const response = await api.patch(`/client-vendor-relationships/${id}/`, {
      vendor_verification_status: "Verified",
      relationship_status: "Active",
      approved_at: new Date().toISOString(),
    });
    return response.data;
  }

  /**
   * Reject a vendor relationship
   */
  async rejectVendor(id: string, reason?: string): Promise<VendorRelationship> {
    const response = await api.patch(`/client-vendor-relationships/${id}/`, {
      vendor_verification_status: "Verification_Rejected",
      relationship_status: "Terminated",
      notes: reason ? `Rejection reason: ${reason}` : "",
    });
    return response.data;
  }

  /**
   * Suspend a vendor relationship
   */
  async suspendVendor(id: string, reason?: string): Promise<VendorRelationship> {
    const response = await api.patch(`/client-vendor-relationships/${id}/`, {
      relationship_status: "Suspended",
      notes: reason ? `Suspension reason: ${reason}` : "",
    });
    return response.data;
  }

  /**
   * Terminate a vendor relationship
   */
  async terminateVendor(id: string, reason?: string): Promise<VendorRelationship> {
    const response = await api.patch(`/client-vendor-relationships/${id}/`, {
      relationship_status: "Terminated",
      is_active: false,
      notes: reason ? `Termination reason: ${reason}` : "",
    });
    return response.data;
  }

  /**
   * Update vendor performance rating
   */
  async updatePerformanceRating(id: string, rating: number): Promise<VendorRelationship> {
    if (rating < 1 || rating > 5) {
      throw new Error("Performance rating must be between 1 and 5");
    }

    const response = await api.patch(`/client-vendor-relationships/${id}/`, {
      performance_rating: rating,
    });
    return response.data;
  }

  /**
   * Get vendor relationship statistics for the client
   */
  async getVendorStats(): Promise<{
    total_vendors: number;
    active_vendors: number;
    pending_invitations: number;
    verified_vendors: number;
    average_performance: number;
  }> {
    try {
      const vendors = await this.getVendorRelationships();

      const stats = {
        total_vendors: vendors.length,
        active_vendors: vendors.filter((v) => v.relationship_status === "Active").length,
        pending_invitations: vendors.filter((v) => v.relationship_status === "Client_Invitation_Sent").length,
        verified_vendors: vendors.filter((v) => v.vendor_verification_status === "Verified").length,
        average_performance: 0,
      };

      // Calculate average performance rating
      const vendorsWithRating = vendors.filter((v) => v.performance_rating);
      if (vendorsWithRating.length > 0) {
        stats.average_performance = vendorsWithRating.reduce((sum, v) => sum + (v.performance_rating || 0), 0) / vendorsWithRating.length;
      }

      return stats;
    } catch (error) {
      console.error("Failed to calculate vendor stats:", error);
      return {
        total_vendors: 0,
        active_vendors: 0,
        pending_invitations: 0,
        verified_vendors: 0,
        average_performance: 0,
      };
    }
  }

  /**
   * Search vendors by name or code
   */
  async searchVendors(query: string): Promise<VendorRelationship[]> {
    const response = await api.get("/client-vendor-relationships/", {
      params: { search: query },
    });
    return response.data.results || response.data;
  }

  /**
   * Filter vendors by status
   */
  async filterVendorsByStatus(status: string): Promise<VendorRelationship[]> {
    const response = await api.get("/client-vendor-relationships/", {
      params: { relationship_status: status },
    });
    return response.data.results || response.data;
  }

  /**
   * Resend invitation to a vendor
   */
  async resendInvitation(invitationId: string, data: { expires_at: string }): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await api.post(`/tenant-invitations/${invitationId}/resend/`, {
        expires_at: data.expires_at,
      });
      return { success: true, message: response.data.message };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Failed to resend invitation" };
    }
  }

  /**
   * Cancel invitation to a vendor
   */
  async cancelInvitation(invitationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await api.post(`/tenant-invitations/${invitationId}/cancel/`);
      return { success: true, message: response.data.message };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Failed to cancel invitation" };
    }
  }

  /**
   * Delete invitation to a vendor
   */
  async deleteInvitation(invitationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await api.delete(`/tenant-invitations/${invitationId}/`);
      return { success: true, message: "Invitation deleted successfully" };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Failed to delete invitation" };
    }
  }

  /**
   * Revoke cancellation of a vendor invitation
   */
  async revokeCancellation(invitationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await api.post(`/tenant-invitations/${invitationId}/revoke-cancellation/`);
      return { success: true, message: response.data.message || "Cancellation revoked successfully" };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || "Failed to revoke cancellation" };
    }
  }
}

// Export singleton instance
export const clientVendorService = new ClientVendorService();
export default clientVendorService;

// Vendor Service for Task Allocation
import api from "./api";
import type { Vendor } from "../types/task";

// Backend vendor relationship interface
interface BackendVendorRelationship {
  id: string;
  vendor_tenant: string;
  client_tenant: string;
  vendor_organization_name: string;
  vendor_email: string;
  vendor_tenant_data?: {
    id: string;
    organization_name: string;
    business_registration_number: string;
    primary_contact_name: string;
    primary_contact_email: string;
    primary_contact_phone: string;
    registration_status: string;
    activation_status: string;
    is_active: boolean;
    registered_at: string;
    activated_at: string;
    service_capabilities: string[];
    coverage_areas: string[];
    certifications: string[];
  };
  client_tenant_data?: {
    id: string;
    organization_name: string;
    business_registration_number: string;
    primary_contact_name: string;
    primary_contact_email: string;
    primary_contact_phone: string;
    registration_status: string;
    activation_status: string;
    is_active: boolean;
    registered_at: string;
    activated_at: string;
    service_capabilities: string[];
    coverage_areas: string[];
    certifications: string[];
  };
  invitation_data?: any;
  vendor_code: string;
  contact_person_name: string;
  performance_rating: number | null;
  relationship_type: string;
  relationship_status: string;
  vendor_verification_status: string;
  vendor_permissions: any;
  communication_allowed: boolean;
  contact_access_level: string;
  approved_at: string | null;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
}

interface BackendProjectVendor {
  id: number;
  project: number;
  relationship_id: number;
  relationship_vendor_code: string;
  relationship_vendor_organization_name: string;
  scope_notes: string;
  start_at: string | null;
  end_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

// Backend API response structure
interface BackendVendorResponse {
  results?: BackendVendorRelationship[];
  count?: number;
}

class VendorService {
  /**
   * Get all available vendors for task allocation
   */
  async getVendors(): Promise<Vendor[]> {
    try {
      const response = await api.get("/client-vendor-relationships/");
      const data: BackendVendorResponse = response.data;

      // Extract vendor relationships from the response
      const vendorRelationships: BackendVendorRelationship[] = data.results || [];

      // Map backend data to frontend Vendor interface
      return vendorRelationships
        .filter((rel: BackendVendorRelationship) => rel.is_active && rel.relationship_status === "Active")
        .map((rel: BackendVendorRelationship) => this.mapBackendToFrontend(rel));
    } catch (error) {
      console.error("Error fetching vendors:", error);
      throw new Error("Failed to fetch vendors");
    }
  }

  /**
   * Get a specific vendor by ID
   */
  async getVendorById(id: string): Promise<Vendor | null> {
    try {
      const response = await api.get(`/client-vendor-relationships/${id}/`);
      const vendorRel: BackendVendorRelationship = response.data;

      if (!vendorRel.is_active) {
        return null;
      }

      return this.mapBackendToFrontend(vendorRel);
    } catch (error) {
      console.error("Error fetching vendor:", error);
      return null;
    }
  }

  /**
   * Search vendors by name or code
   */
  async searchVendors(query: string): Promise<Vendor[]> {
    try {
      const response = await api.get("/client-vendor-relationships/", {
        params: {
          search: query,
        },
      });
      const data: BackendVendorResponse = response.data;

      const vendorRelationships: BackendVendorRelationship[] = data.results || [];

      return vendorRelationships
        .filter((rel: BackendVendorRelationship) => rel.is_active && rel.relationship_status === "Active")
        .map((rel: BackendVendorRelationship) => this.mapBackendToFrontend(rel));
    } catch (error) {
      console.error("Error searching vendors:", error);
      return [];
    }
  }

  /**
   * Map backend vendor relationship data to frontend Vendor interface
   */
  private mapBackendToFrontend(backendVendor: BackendVendorRelationship): Vendor {
    // Determine vendor name
    let vendorName = backendVendor.vendor_organization_name || "Unknown Vendor";
    if (backendVendor.vendor_tenant_data?.organization_name) {
      vendorName = backendVendor.vendor_tenant_data.organization_name;
    }

    // Determine vendor type based on service capabilities or verification status
    let vendorType = "General Service";
    if (backendVendor.vendor_tenant_data?.service_capabilities?.length) {
      const capabilities = backendVendor.vendor_tenant_data.service_capabilities;
      if (capabilities.some((cap) => cap.toLowerCase().includes("dismantling"))) {
        vendorType = "Dismantling Specialist";
      } else if (capabilities.some((cap) => cap.toLowerCase().includes("installation"))) {
        vendorType = "Installation & Commissioning";
      } else if (capabilities.some((cap) => cap.toLowerCase().includes("transport"))) {
        vendorType = "Transportation";
      } else if (capabilities.some((cap) => cap.toLowerCase().includes("logistics"))) {
        vendorType = "Logistics";
      }
    }

    // Determine contact person information
    let contactPersonName = backendVendor.contact_person_name || "Contact Person";
    let contactEmail = backendVendor.vendor_email || "contact@vendor.com";
    let contactPhone = "+1-555-0000";

    if (backendVendor.vendor_tenant_data) {
      if (backendVendor.vendor_tenant_data.primary_contact_name) {
        contactPersonName = backendVendor.vendor_tenant_data.primary_contact_name;
      }
      if (backendVendor.vendor_tenant_data.primary_contact_email) {
        contactEmail = backendVendor.vendor_tenant_data.primary_contact_email;
      }
      if (backendVendor.vendor_tenant_data.primary_contact_phone) {
        contactPhone = backendVendor.vendor_tenant_data.primary_contact_phone;
      }
    }

    return {
      id: parseInt(backendVendor.id),
      name: vendorName,
      vendor_code: backendVendor.vendor_code,
      type: vendorType,
      contact_person: {
        name: contactPersonName,
        email: contactEmail,
        phone: contactPhone,
      },
      contact_info: {
        email: contactEmail,
        phone: contactPhone,
      },
      specializations: backendVendor.vendor_tenant_data?.service_capabilities || [],
      rating: 4.5, // Default rating - can be enhanced later
      status: backendVendor.is_active ? "active" : "inactive",
    };
  }

  private mapProjectVendorToFrontend(projectVendor: BackendProjectVendor): Vendor {
    // For project vendors, we need to fetch additional details from the relationship
    // For now, we'll use the basic information available
    return {
      id: projectVendor.id,
      name: projectVendor.relationship_vendor_organization_name || "Unknown Vendor",
      vendor_code: projectVendor.relationship_vendor_code,
      type: "Project Vendor", // Default type for project vendors
      contact_person: {
        name: "Contact Person", // Will need to be fetched from relationship details
        email: "contact@vendor.com", // Will need to be fetched from relationship details
        phone: "+1-555-0000", // Will need to be fetched from relationship details
      },
      contact_info: {
        email: "contact@vendor.com", // Will need to be fetched from relationship details
        phone: "+1-555-0000", // Will need to be fetched from relationship details
      },
      specializations: [], // Will need to be fetched from relationship details
      rating: 4.5, // Default rating
      status: projectVendor.status === "active" ? "active" : "inactive",
    };
  }

  /**
   * Get vendors by type/category
   */
  async getVendorsByType(type: string): Promise<Vendor[]> {
    const allVendors = await this.getVendors();
    return allVendors.filter((vendor) => vendor.type.toLowerCase().includes(type.toLowerCase()));
  }

  /**
   * Get active vendors only
   */
  async getActiveVendors(): Promise<Vendor[]> {
    try {
      const response = await api.get("/client-vendor-relationships/");
      const data: BackendVendorResponse = response.data;

      const vendorRelationships: BackendVendorRelationship[] = data.results || [];

      return vendorRelationships.filter((rel: BackendVendorRelationship) => rel.is_active).map((rel: BackendVendorRelationship) => this.mapBackendToFrontend(rel));
    } catch (error) {
      console.error("Error fetching active vendors:", error);
      return [];
    }
  }

  async getProjectVendors(projectId: string | number): Promise<Vendor[]> {
    try {
      console.log(`Fetching project vendors for project ID: ${projectId}`);

      // First, get the project vendors list
      const projectResponse = await api.get(`/projects/${projectId}/vendors/`);
      const projectData = projectResponse.data;

      console.log("Project vendors response:", projectData);

      if (!projectData.results || !Array.isArray(projectData.results)) {
        console.log("No project vendors found");
        return [];
      }

      console.log(`Found ${projectData.results.length} project vendors`);

      // Alternative approach: Get all vendors and filter by project
      try {
        console.log("Trying alternative approach: fetch all vendors and filter by project");
        const allVendorsResponse = await api.get("/client-vendor-relationships/");
        const allVendorsData = allVendorsResponse.data;
        console.log("All vendors data:", allVendorsData);

        // Filter vendors that are linked to this project
        const projectVendorIds = projectData.results.map((pv: BackendProjectVendor) => pv.relationship_id);
        console.log("Project vendor relationship IDs:", projectVendorIds);

        const filteredVendors = allVendorsData.results.filter((vendor: any) => projectVendorIds.includes(parseInt(vendor.id)));

        console.log("Filtered vendors for project:", filteredVendors);

        if (filteredVendors.length > 0) {
          const vendors = filteredVendors.map((vendor: any) => this.mapBackendToFrontend(vendor));
          console.log("Mapped vendors using alternative approach:", vendors);
          return vendors;
        }
      } catch (altError: any) {
        console.error("Alternative approach failed:", altError);
      }

      // For each project vendor, fetch the full vendor relationship details
      const vendors: Vendor[] = [];

      for (const projectVendor of projectData.results) {
        try {
          console.log(`Fetching full details for vendor relationship ID: ${projectVendor.relationship_id}`);
          console.log(`Project vendor data:`, projectVendor);

          // Fetch the full vendor relationship details using the relationship_id
          const vendorResponse = await api.get(`/api/v1/client-vendor-relationships/${projectVendor.relationship_id}/`);
          const vendorData = vendorResponse.data;

          console.log("Full vendor data:", vendorData);

          // Map the full vendor data to frontend format
          const vendor = this.mapBackendToFrontend(vendorData);
          vendors.push(vendor);

          console.log("Mapped vendor:", vendor);
        } catch (vendorError: any) {
          console.error(`Error fetching vendor ${projectVendor.relationship_id}:`, vendorError);
          console.error(`Error details:`, {
            status: vendorError.response?.status,
            statusText: vendorError.response?.statusText,
            data: vendorError.response?.data,
            url: vendorError.config?.url,
          });

          // Fallback to basic project vendor data
          const fallbackVendor = this.mapProjectVendorToFrontend(projectVendor);
          console.log(`Using fallback vendor data:`, fallbackVendor);
          vendors.push(fallbackVendor);
        }
      }

      console.log(`Final vendors array:`, vendors);
      return vendors;
    } catch (error) {
      console.error("Error fetching project vendors:", error);
      return [];
    }
  }
}

// Export singleton instance
const vendorService = new VendorService();
export default vendorService;

// Unified Client Management Types
// Works for both Circle and Vendor tenants

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

export interface ClientStats {
  total_clients: number;
  active_clients: number;
  pending_approvals: number;
  verified_clients: number;
  average_performance: number;
}

export interface ClientFilters {
  status?: string;
  relationship_type?: string;
  search?: string;
  performance_rating?: number;
  verification_status?: string;
}

export type RelationshipType = "Primary" | "Secondary" | "Prospect";
export type RelationshipStatus = "Active" | "Inactive" | "Pending" | "Suspended" | "Terminated";
export type VerificationStatus = "Pending" | "Verified" | "Rejected";
export type ContactAccessLevel = "Full" | "Limited" | "ReadOnly";

// Client display interface for UI
export interface ClientDisplay {
  id: string;
  name: string;
  organization_code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  relationship_type: RelationshipType;
  status: RelationshipStatus;
  total_projects: number;
  active_projects: number;
  total_revenue: number;
  last_activity: string;
  created_at: string;
  performance_rating?: number;
  verification_status: VerificationStatus;
}

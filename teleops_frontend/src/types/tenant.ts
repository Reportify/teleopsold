// Tenant Types for Circle-Based Multi-Tenant Platform
import { User, UserProfile } from "./user";

export type TenantType = "Corporate" | "Circle" | "Vendor";

export interface Tenant {
  id: string;
  tenant_type: TenantType;
  parent_tenant_id?: string;
  organization_name: string;
  organization_code: string;
  business_registration_number?: string;
  industry_sector: string;
  country: string;
  primary_business_address: string;
  website?: string;

  // Circle-specific fields
  circle_code?: string;
  circle_name?: string;

  // Platform configuration
  subdomain: string;
  subscription_plan: string;
  billing_cycle: string;

  // Contact information
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  secondary_contact_name?: string;
  secondary_contact_email?: string;
  secondary_contact_phone?: string;

  // Status
  registration_status: string;
  activation_status: string;
  is_active: boolean;

  // Business operational settings
  operates_independently: boolean;
  shared_vendor_pool: boolean;
  cross_circle_reporting: boolean;

  // Vendor-specific fields
  coverage_areas?: string[];
  service_capabilities?: string[];
  certifications?: string[];

  // Timestamp fields
  registered_at?: string;
  activated_at?: string;
  deactivated_at?: string;
  last_login?: string;

  // Backend-specific fields for tenant details
  user_count?: number;
  usage_statistics?: {
    projects_count?: number;
    sites_count?: number;
    equipment_count?: number;
    tasks_count?: number;
  };

  // Audit fields
  created_at: string;
  updated_at: string;
}

export interface CorporateCircleRelationship {
  id: number;
  corporate_tenant_id: string;
  circle_tenant_id: string;
  relationship_type: string;
  governance_level: "Autonomous" | "Managed" | "Controlled";
  separate_billing: boolean;
  cost_center_code?: string;
  budget_authority_level?: number;
  independent_vendor_management: boolean;
  independent_employee_management: boolean;
  shared_technology_access: boolean;
  reports_to_corporate: boolean;
  data_sharing_level: "None" | "Aggregated" | "Full";
  is_active: boolean;
  effective_from: string;
  effective_to?: string;
  created_at: string;
  updated_at: string;
}

export interface CircleVendorRelationship {
  id: number;
  circle_tenant_id: string;
  vendor_tenant_id: string;
  vendor_code: string;
  relationship_status: "Circle_Invitation_Sent" | "Active" | "Suspended" | "Terminated" | "Expired";
  vendor_verification_status: "Independent" | "Pending_Verification" | "Verified" | "Verification_Rejected";
  contract_start_date?: string;
  contract_end_date?: string;
  service_areas: string[];
  service_capabilities: string[];
  performance_rating?: number;
  payment_terms?: string;
  currency: string;
  billing_frequency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantContext {
  currentTenant: Tenant | null;
  accessibleCircles: Tenant[];
  primaryCircle: Tenant | null;
  corporateAccess: boolean;
  crossCirclePermissions: string[];
  userPermissions: string[];
  user: User | null;
  userProfile: UserProfile | null;
}

export interface TenantOnboardingData {
  corporate: {
    organization_name: string;
    business_registration_number: string;
    primary_contact_name: string;
    primary_contact_email: string;
    primary_contact_phone: string;
  };
  circles: Array<{
    circle_code: string;
    circle_name: string;
    operates_independently: boolean;
    subscription_plan: string;
  }>;
}

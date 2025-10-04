// User Types for Circle-Based Multi-Tenant Platform
import { Tenant, TenantContext } from "./tenant";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login?: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  circle_tenant_id: string;
  employee_id: string;
  phone_number: string;
  designation_id: number;
  circle_employee_code: string;
  circle_joining_date: string;
  circle_exit_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  user?: User;
  designation?: Designation;
  circle_tenant?: Tenant;
}

export interface Designation {
  id: number;
  designation_name: string;
  designation_code: string;
  designation_level: number;
  department: string;
  department_name: string;
  description: string;
  is_active: boolean;
  designation_type: "field" | "non_field";
  certifications_required: {
    fat: boolean;
    medical: boolean;
    farmtocli: boolean;
  };
  permissions: any[];
  feature_access: any;
  data_access_level: string;
  custom_capabilities: any;
  geographic_scope: any[];
  functional_scope: any[];
  cross_functional_access: boolean;
  multi_location_access: boolean;
  can_manage_users: boolean;
  can_create_projects: boolean;
  can_assign_tasks: boolean;
  can_approve_expenses: boolean;
  can_access_reports: boolean;
  expense_approval_limit: string;
  is_system_role: boolean;
  is_template: boolean;
  user_count: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  department_name: string;
  department_code: string;
  department_level: number;
  description: string;
  is_active: boolean;
  is_operational: boolean;
  requires_safety_training: boolean;
  parent_department?: number;
  parent_department_name?: string;
  can_manage_subordinates: boolean;
  max_subordinates?: number;
  hierarchy_path: string;
  can_manage_users: boolean;
  can_create_projects: boolean;
  can_assign_tasks: boolean;
  can_approve_expenses: boolean;
  can_access_reports: boolean;
  expense_approval_limit: string;
  is_system_department: boolean;
  is_template: boolean;
  user_count: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  codename: string;
  description?: string;
  is_custom: boolean;
  created_at: string;
}

export interface DesignationPermission {
  id: number;
  designation_id: number;
  permission_id: number;
  is_active: boolean;
  granted_at: string;
  granted_by: number;

  // Related data
  designation?: Designation;
  permission?: Permission;
}

export interface CirclePermission {
  id: number;
  user_id: number;
  circle_tenant_id: string;
  permission_scope: "Circle_Only" | "Cross_Circle" | "Corporate";

  // Circle-specific permissions
  can_manage_circle_users: boolean;
  can_manage_circle_vendors: boolean;
  can_view_circle_billing: boolean;
  can_create_circle_projects: boolean;
  can_access_circle_reports: boolean;

  // Cross-circle permissions (for corporate users)
  can_view_all_circles: boolean;
  can_manage_circle_relationships: boolean;
  can_access_corporate_reports: boolean;

  is_active: boolean;
  granted_at: string;
  granted_by: number;
}

export interface AuthContext {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
  user_profile: UserProfile;
  tenant_context: TenantContext;
}

export interface UserCreateData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  employee_id: string;
  phone_number: string;
  designation_id?: number; // Making optional for initial setup when no designations exist
  department_id?: number; // Adding department_id field
  circle_tenant_id: string;
}

export interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  designation_id?: number;
  is_active?: boolean;
  employee_id?: string;
  email?: string;
}

// =====================================================
// ENHANCED USER MANAGEMENT TYPES - NEW ADDITIONS
// =====================================================

// Team Management Types
export interface Team {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  tenant: string;
  created_by: string;
  created_by_name?: string;
  member_count?: number;
  members?: TeamMember[];
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: number;
  user_full_name: string;
  user_email: string;
  role: string;
  role_display: string;
  joined_at: string;
}

export interface TeamMembership {
  id: string;
  team: number;
  team_name?: string;
  user: string;
  user_full_name?: string;
  user_email?: string;
  role: "leader" | "member" | "coordinator" | "observer";
  is_active: boolean;
  joined_at: string;
  left_at?: string;
  added_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Cross-Tenant Access Types
export interface CrossTenantAccess {
  id: string;
  user: string;
  user_full_name?: string;
  user_email?: string;
  source_tenant: string;
  source_tenant_name?: string;
  target_tenant: string;
  target_tenant_name?: string;
  access_type: "vendor_operations" | "circle_collaboration" | "corporate_oversight" | "project_specific";
  access_level: "read_only" | "limited_write" | "full_access";
  status: "pending" | "active" | "suspended" | "revoked";
  granted_by: string;
  granted_by_name?: string;
  granted_at: string;
  expires_at?: string;
  revoked_at?: string;
  revoked_by?: string;
  access_scope?: {
    projects?: string[];
    sites?: string[];
    features?: string[];
  };
  created_at: string;
  updated_at: string;
}

// User Activity Log Types
export interface UserActivityLog {
  id: string;
  user: string;
  user_full_name?: string;
  activity_type: "login" | "logout" | "password_change" | "profile_update" | "permission_change" | "project_access" | "site_access" | "bulk_operation" | "data_export" | "admin_action";
  description: string;
  ip_address?: string;
  user_agent?: string;
  tenant: string;
  session_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

// User Registration/Invitation Types
export interface UserRegistration {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  employee_id?: string;
  designation_id?: number;
  designation_name?: string;
  tenant: string;
  tenant_name?: string;
  invited_by: string;
  invited_by_name?: string;
  invitation_token: string;
  status: "pending" | "sent" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}

// Enhanced User Profile for User Management
export interface EnhancedUserProfile extends UserProfile {
  full_name: string;
  display_name: string;
  all_designations: Designation[];
  teams: Team[];
  active_team_memberships: TeamMembership[];
  cross_tenant_access: CrossTenantAccess[];
  last_activity?: string;
  activity_count?: number;
  projects_count?: number;
  sites_count?: number;
}

// API Response Types
export interface UserListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: EnhancedUserProfile[];
}

export interface TeamListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Team[];
}

export interface UserActivityListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: UserActivityLog[];
}

// API Request Types
export interface UserSearchFilters {
  search?: string;
  designation?: string;
  department?: string;
  is_active?: boolean;
  employment_type?: string;
  team?: string;
  has_cross_tenant_access?: boolean;
  last_activity_days?: number;
  created_after?: string;
  created_before?: string;
  date_joined_after?: string;
  date_joined_before?: string;
  last_login_after?: string;
  last_login_before?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface TeamSearchFilters {
  search?: string;
  is_active?: boolean;
  created_by?: string;
  members_count_min?: number;
  members_count_max?: number;
}

export interface ActivityLogFilters {
  user?: string;
  user_id?: number;
  activity_type?: string;
  date_from?: string;
  date_to?: string;
  ip_address?: string;
  page?: number;
  page_size?: number;
}

// Bulk Operations Types
export interface BulkUserOperation {
  operation: "activate" | "deactivate" | "delete" | "assign_designation" | "add_to_team" | "remove_from_team";
  user_ids: string[];
  parameters?: {
    designation_id?: number;
    team_id?: string;
    reason?: string;
  };
}

export interface BulkOperationResponse {
  success: boolean;
  processed_count: number;
  failed_count: number;
  results: {
    success: Array<{
      user_id: string;
      user_email: string;
      message: string;
    }>;
    failed: Array<{
      user_id: string;
      user_email: string;
      error: string;
    }>;
  };
}

// Team Management Request Types
export interface TeamCreateData {
  name: string;
  description?: string;
  team_leader_id?: string;
  team_member_ids?: string[];
}

export interface TeamUpdateData {
  name?: string;
  description?: string;
  is_active?: boolean;
  team_leader_id?: string;
  team_member_ids?: string[];
}

export interface TeamMemberAddData {
  user_id: string;
  role: "leader" | "member" | "coordinator" | "observer";
  notes?: string;
}

// Cross-Tenant Access Request Types
export interface CrossTenantAccessCreateData {
  user_id: string;
  target_tenant_id: string;
  access_type: "vendor_operations" | "circle_collaboration" | "corporate_oversight" | "project_specific";
  access_level: "read_only" | "limited_write" | "full_access";
  expires_at?: string;
  access_scope?: {
    projects?: string[];
    sites?: string[];
    features?: string[];
  };
}

// User Invitation Types
export interface UserInvitationData {
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  employee_id?: string;
  designation_id: number;
  send_email?: boolean;
  custom_message?: string;
}

// Statistics and Analytics Types
export interface UserManagementStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  pending_invitations: number;
  total_teams: number;
  active_teams: number;
  cross_tenant_access_count: number;
  recent_activity_count: number;

  // User distribution by designation
  designation_distribution: Array<{
    designation_id: number;
    designation_name: string;
    user_count: number;
  }>;

  // Activity trends (last 7 days)
  activity_trends: Array<{
    date: string;
    login_count: number;
    activity_count: number;
  }>;

  // Team metrics
  team_metrics: {
    average_team_size: number;
    largest_team_size: number;
    teams_by_type: Record<string, number>;
  };
}

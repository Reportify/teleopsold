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
  tenant_id: string;
  name: string;
  description?: string;
  is_predefined: boolean;
  is_active: boolean;
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
  designation_id: number;
  circle_tenant_id: string;
}

export interface UserUpdateData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  designation_id?: number;
  is_active?: boolean;
}

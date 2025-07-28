/**
 * RBAC API Service
 * Provides API integration for Role-Based Access Control operations
 */

import api from "./api";

// RBAC Types
export interface Permission {
  id: number;
  tenant: string;
  permission_name: string;
  permission_code: string;
  permission_category: string;
  description?: string;
  permission_type: "action" | "access" | "data" | "administrative" | "system";
  business_template: "view_only" | "contributor" | "creator_only" | "full_access" | "custom";
  is_system_permission: boolean;
  requires_scope: boolean;
  is_delegatable: boolean;
  risk_level: "low" | "medium" | "high" | "critical";
  resource_type?: string;
  effect: "allow" | "deny";
  is_active: boolean;
  is_auditable: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface GroupPermission {
  id: number;
  permission: number;
  permission_name: string;
  permission_code: string;
  permission_category: string;
  risk_level: "low" | "medium" | "high" | "critical";
  permission_level: "granted" | "denied" | "conditional";
  scope_configuration: Record<string, any>;
  is_mandatory: boolean;
  is_active: boolean;
  added_at: string;
}

export interface PermissionGroup {
  id: number;
  tenant?: string;
  group_name: string;
  group_code: string;
  description?: string;
  group_type: "functional" | "project" | "temporary" | "administrative" | "basic" | "operational";
  is_system_group: boolean;
  is_assignable: boolean;
  auto_assign_conditions: Record<string, any>;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
  group_permissions?: GroupPermission[]; // Actual API field name
  user_count?: number;
  permission_count?: number;
  permissions?: Permission[] | number[]; // Allow both Permission objects and IDs (for compatibility)
}

export interface CreatePermissionGroupData {
  group_name: string;
  group_code: string;
  description?: string;
  group_type: "functional" | "project" | "temporary" | "administrative" | "basic" | "operational";
  is_assignable: boolean;
  auto_assign_conditions?: Record<string, any>;
  permissions: number[]; // For create/update, we send permission IDs
}

export interface UpdatePermissionGroupData extends Partial<CreatePermissionGroupData> {
  // All fields are optional for updates
}

export interface UserPermissionOverride {
  id: number;
  user_profile_id: number;
  permission_id: number;
  override_type: "addition" | "restriction" | "modification" | "scope_change";
  permission_level: "granted" | "denied" | "conditional";
  override_reason?: string;
  business_justification?: string;
  scope_override: Record<string, any>;
  geographic_scope_override: string[];
  functional_scope_override: string[];
  temporal_scope_override: Record<string, any>;
  conditions: Record<string, any>;
  approval_required: boolean;
  requires_mfa: boolean;
  effective_from: string;
  effective_to?: string;
  is_temporary: boolean;
  auto_expire: boolean;
  approval_status: "pending" | "approved" | "rejected" | "expired";
  is_active: boolean;
  granted_by?: number;
  created_at: string;
  updated_at: string;
}

export interface EffectivePermission {
  permission_code: string;
  permission_level: string;
  source: "designation" | "user_override" | "group" | "user_addition";
  source_id: number;
  source_name?: string;
  geographic_scope: string[];
  functional_scope: string[];
  temporal_scope: Record<string, any>;
  conditions: Record<string, any>;
  is_temporary: boolean;
  restriction_applied?: boolean;
  modification_details?: any;
}

export interface UserEffectivePermissions {
  permissions: Record<string, EffectivePermission>;
  scope_limitations: {
    geographic_scope: string[];
    functional_scope: string[];
    temporal_scope: Record<string, any>;
    global_restrictions: string[];
  };
  permission_summary: {
    total_permissions: number;
    by_category: Record<string, number>;
    by_risk_level: Record<string, number>;
    by_permission_type: Record<string, number>;
    requires_mfa: string[];
    conditional_permissions: string[];
    administrative_access: boolean;
    system_permissions: string[];
  };
  metadata: {
    cached?: boolean;
    calculation_time: string;
    sources?: {
      designation_count: number;
      group_count: number;
      override_count: number;
    };
    conflicts_resolved?: number;
    cache_version?: number;
  };
}

export interface PermissionAuditTrail {
  id: number;
  tenant: string;
  action_type: "grant" | "revoke" | "modify" | "restrict" | "escalate" | "expire";
  entity_type: "user" | "designation" | "group" | "system";
  entity_id: number;
  permission?: number;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  change_reason?: string;
  business_context?: string;
  performed_by: number;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  request_id?: string;
  additional_context: Record<string, any>;
  change_summary?: string[];
  entity_name?: string;
  action_description?: string;
  performed_by_name?: string;
  performed_by_email?: string;
}

export interface PermissionCheckRequest {
  permission_code: string;
  user_id?: number;
  scope_context?: Record<string, any>;
}

export interface PermissionCheckResponse {
  has_permission: boolean;
  permission_code: string;
  user_id: number;
  details: {
    permission_level?: string;
    source?: string;
    requires_mfa?: boolean;
    reason?: string;
    error?: string;
  };
  checked_at: string;
}

// Permission Dashboard interfaces
export interface PermissionDashboardData {
  user_summary: {
    user_id: number;
    name: string;
    email: string;
    employee_id?: string;
    job_title?: string;
    department?: string;
    is_active: boolean;
    last_login?: string;
  };
  effective_permissions: {
    permissions: Record<string, any>;
    scope_limitations: Record<string, any>;
    permission_summary: Record<string, any>;
    metadata: Record<string, any>;
  };
  permission_sources: {
    designation_permissions: PermissionSource[];
    group_permissions: PermissionSource[];
    override_permissions: PermissionSource[];
  };
  assignment_history: AssignmentHistoryItem[];
  conflicts: any[];
  risk_analysis: Record<string, any>;
  statistics: {
    total_permissions: number;
    designation_permissions: number;
    group_permissions: number;
    override_permissions: number;
    conflicts_count: number;
    high_risk_permissions: number;
  };
}

export interface PermissionSource {
  permission_id: number;
  permission_code: string;
  permission_name: string;
  permission_level: string;
  source_type: "designation" | "group" | "override";
  source_name: string;
  source_id: number;
  risk_level: "low" | "medium" | "high" | "critical";
  effective_from?: string;
  effective_to?: string;
  is_temporary?: boolean;
  assignment_reason?: string;
  override_reason?: string;
}

export interface AssignmentHistoryItem {
  action_type: string;
  entity_type: string;
  entity_name: string;
  performed_by: string;
  performed_at: string;
  change_reason?: string;
}

// RBAC API Service Class
class RBACAPIService {
  private baseURL = "tenants/rbac";

  // Permission Registry Management
  async getPermissions(params?: {
    category?: string;
    permission_type?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: Permission[]; count: number; next?: string; previous?: string }> {
    const response = await api.get(`${this.baseURL}/permissions/`, { params });
    return response.data;
  }

  async getPermission(id: number): Promise<Permission> {
    const response = await api.get(`${this.baseURL}/permissions/${id}/`);
    return response.data;
  }

  async createPermission(data: Partial<Permission>): Promise<Permission> {
    const response = await api.post(`${this.baseURL}/permissions/`, data);
    return response.data;
  }

  async updatePermission(id: number, data: Partial<Permission>): Promise<Permission> {
    const response = await api.put(`${this.baseURL}/permissions/${id}/`, data);
    return response.data;
  }

  async deletePermission(id: number): Promise<void> {
    await api.delete(`${this.baseURL}/permissions/${id}/`);
  }

  // Permission Groups Management
  async getPermissionGroups(params?: {
    group_type?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: PermissionGroup[]; count: number; next?: string; previous?: string }> {
    const response = await api.get(`${this.baseURL}/groups/`, { params });
    return response.data;
  }

  async getPermissionGroup(id: number): Promise<PermissionGroup> {
    const response = await api.get(`${this.baseURL}/groups/${id}/`);
    return response.data;
  }

  async createPermissionGroup(data: CreatePermissionGroupData): Promise<PermissionGroup> {
    const response = await api.post(`${this.baseURL}/groups/`, data);
    return response.data;
  }

  async updatePermissionGroup(id: number, data: UpdatePermissionGroupData): Promise<PermissionGroup> {
    const response = await api.put(`${this.baseURL}/groups/${id}/`, data);
    return response.data;
  }

  async deletePermissionGroup(id: number): Promise<void> {
    await api.delete(`${this.baseURL}/groups/${id}/`);
  }

  async assignPermissionsToGroup(groupId: number, permissionIds: number[]): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`${this.baseURL}/groups/${groupId}/assign_permissions/`, {
      permission_ids: permissionIds,
    });
    return response.data;
  }

  async assignUsersToGroup(groupId: number, userIds: number[]): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`${this.baseURL}/groups/${groupId}/assign_users/`, {
      user_ids: userIds,
    });
    return response.data;
  }

  // User to Designation Assignment
  async assignUsersToDesignation(
    designationId: number,
    userIds: number[],
    assignmentData?: {
      assignment_reason?: string;
      is_primary?: boolean;
      is_temporary?: boolean;
      effective_from?: string;
      effective_to?: string;
    }
  ): Promise<{ success: boolean; message: string; assignments: any[] }> {
    const response = await api.post(`${this.baseURL}/designations/${designationId}/assign_users/`, {
      user_ids: userIds,
      ...assignmentData,
    });
    return response.data;
  }

  // Permission to Designation Assignment
  async assignPermissionsToDesignation(
    designationId: number,
    permissionIds: number[],
    assignmentData?: {
      assignment_reason?: string;
      permission_level?: string;
      requires_approval?: boolean;
      is_temporary?: boolean;
      effective_from?: string;
      effective_to?: string;
    }
  ): Promise<{ success: boolean; message: string; assignments: any[] }> {
    const response = await api.post(`${this.baseURL}/designations/${designationId}/assign_permissions/`, {
      permission_ids: permissionIds,
      ...assignmentData,
    });
    return response.data;
  }

  // User Permission Management
  async getUserEffectivePermissions(userId?: number, forceRefresh?: boolean): Promise<UserEffectivePermissions> {
    const params: Record<string, any> = {};
    if (userId) params.user_id = userId;
    if (forceRefresh) params.force_refresh = true;

    const response = await api.get(`${this.baseURL}/user-permissions/effective_permissions/`, { params });
    return response.data;
  }

  async checkUserPermission(data: PermissionCheckRequest): Promise<PermissionCheckResponse> {
    const response = await api.post(`${this.baseURL}/user-permissions/check_permission/`, data);
    return response.data;
  }

  async createUserPermissionOverride(data: Partial<UserPermissionOverride>): Promise<UserPermissionOverride> {
    const response = await api.post(`${this.baseURL}/user-permissions/create_override/`, data);
    return response.data;
  }

  async getUserPermissionOverrides(userId: number): Promise<UserPermissionOverride[]> {
    const response = await api.get(`${this.baseURL}/user-permissions/`, {
      params: { user_id: userId, override_type: "all" },
    });
    return response.data.results || response.data;
  }

  async updateUserPermissionOverride(id: number, data: Partial<UserPermissionOverride>): Promise<UserPermissionOverride> {
    const response = await api.put(`${this.baseURL}/user-permissions/${id}/`, data);
    return response.data;
  }

  async deleteUserPermissionOverride(id: number): Promise<void> {
    await api.delete(`${this.baseURL}/user-permissions/${id}/`);
  }

  // Permission Audit Trail
  async getPermissionAuditTrail(params?: {
    entity_type?: string;
    entity_id?: number;
    action_type?: string;
    performed_by?: number;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: PermissionAuditTrail[]; count: number; next?: string; previous?: string }> {
    const response = await api.get(`${this.baseURL}/audit/`, { params });
    return response.data;
  }

  // Bulk Operations
  async bulkGrantPermissions(data: {
    permission_ids: number[];
    target_type: "users" | "designations" | "groups";
    target_ids: number[];
    reason?: string;
  }): Promise<{ success: boolean; message: string; results: any[] }> {
    const response = await api.post(`${this.baseURL}/permissions/bulk-grant/`, data);
    return response.data;
  }

  async bulkRevokePermissions(data: {
    permission_ids: number[];
    target_type: "users" | "designations" | "groups";
    target_ids: number[];
    reason?: string;
  }): Promise<{ success: boolean; message: string; results: any[] }> {
    const response = await api.post(`${this.baseURL}/permissions/bulk-revoke/`, data);
    return response.data;
  }

  // Analytics and Reporting
  async getPermissionMatrix(): Promise<{
    users: any[];
    permissions: Permission[];
    matrix: Record<string, Record<string, boolean>>;
  }> {
    const response = await api.get(`${this.baseURL}/permissions/matrix/`);
    return response.data;
  }

  async getPermissionUsageAnalytics(params?: { start_date?: string; end_date?: string; permission_category?: string }): Promise<{
    usage_by_permission: Record<string, number>;
    usage_by_user: Record<string, number>;
    usage_trends: Array<{ date: string; count: number }>;
    risk_analysis: Record<string, number>;
  }> {
    const response = await api.get(`${this.baseURL}/permissions/usage-analytics/`, { params });
    return response.data;
  }

  async getComplianceReport(params?: { report_type?: "overview" | "detailed" | "violations"; start_date?: string; end_date?: string }): Promise<{
    compliance_score: number;
    violations: any[];
    recommendations: string[];
    audit_summary: Record<string, number>;
  }> {
    const response = await api.get(`${this.baseURL}/permissions/compliance-report/`, { params });
    return response.data;
  }

  // Department Management (RBAC-related)
  async getDepartments(): Promise<any[]> {
    const response = await api.get(`${this.baseURL}/departments/`);
    return response.data.departments || response.data.results || response.data;
  }

  async createDepartment(data: any): Promise<any> {
    const response = await api.post(`${this.baseURL}/departments/`, data);
    return response.data;
  }

  // Designation Management (RBAC-related)
  async getDesignations(): Promise<any[]> {
    const response = await api.get(`${this.baseURL}/designations/`);
    return response.data.designations || response.data.results || response.data;
  }

  async createDesignation(data: any): Promise<any> {
    const response = await api.post(`${this.baseURL}/designations/`, data);
    return response.data;
  }

  async updateDesignation(id: number, data: any): Promise<any> {
    const response = await api.put(`${this.baseURL}/designations/${id}/`, data);
    return response.data;
  }

  async deleteDesignation(id: number): Promise<void> {
    await api.delete(`${this.baseURL}/designations/${id}/`);
  }

  // Designation Permission Management
  async getDesignationPermissions(designationId: number): Promise<Permission[]> {
    const response = await api.get(`${this.baseURL}/designations/${designationId}/permissions/`);
    return response.data;
  }

  async grantDesignationPermission(
    designationId: number,
    permissionCode: string,
    data: {
      permission_level?: "granted" | "denied" | "conditional";
      scope_configuration?: Record<string, any>;
      geographic_scope?: string[];
      functional_scope?: string[];
      temporal_scope?: Record<string, any>;
      is_inherited?: boolean;
      is_mandatory?: boolean;
      priority_level?: number;
      reason?: string;
    }
  ): Promise<any> {
    const response = await api.post(`${this.baseURL}/designations/${designationId}/permissions/`, {
      permission_code: permissionCode,
      ...data,
    });
    return response.data;
  }

  async revokeDesignationPermission(designationId: number, permissionId: number): Promise<void> {
    await api.delete(`${this.baseURL}/designations/${designationId}/permissions/${permissionId}/`);
  }

  // Utility Methods
  async validatePermissionAssignment(data: { permission_id: number; target_type: "user" | "designation" | "group"; target_id: number; assignment_type: "grant" | "restrict" }): Promise<{
    is_valid: boolean;
    conflicts: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    const response = await api.post(`${this.baseURL}/permissions/validate/`, data);
    return response.data;
  }

  async simulatePermissionChanges(data: {
    changes: Array<{
      permission_id: number;
      target_type: "user" | "designation" | "group";
      target_id: number;
      action: "grant" | "revoke" | "modify";
    }>;
  }): Promise<{
    simulated_results: any[];
    potential_conflicts: string[];
    affected_users: number[];
  }> {
    const response = await api.post(`${this.baseURL}/permissions/simulate/`, data);
    return response.data;
  }

  // Comprehensive Dashboard APIs
  async getComprehensiveDashboard(viewType: "overview" | "user_analysis" | "permission_analysis" | "analytics", params?: any): Promise<any> {
    const queryParams = new URLSearchParams({ view_type: viewType });
    if (params?.user_id) queryParams.append("user_id", params.user_id.toString());
    if (params?.permission_id) queryParams.append("permission_id", params.permission_id.toString());

    const response = await api.get(`${this.baseURL}/groups/comprehensive_dashboard/?${queryParams}`);
    return response.data;
  }

  async searchUsersByPermission(permissionCode: string, sourceType?: "designation" | "group" | "override"): Promise<any> {
    const queryParams = new URLSearchParams({ permission_code: permissionCode });
    if (sourceType) queryParams.append("source_type", sourceType);

    const response = await api.get(`${this.baseURL}/groups/search_users_by_permission/?${queryParams}`);
    return response.data;
  }

  async getUserPermissionsDetailed(userId: number, includeInactive?: boolean, categoryFilter?: string): Promise<any> {
    const queryParams = new URLSearchParams({ user_id: userId.toString() });
    if (includeInactive) queryParams.append("include_inactive", "true");
    if (categoryFilter) queryParams.append("category_filter", categoryFilter);

    const response = await api.get(`${this.baseURL}/groups/user_permissions_detailed/?${queryParams}`);
    return response.data;
  }

  async getPermissionOverview(): Promise<any> {
    return this.getComprehensiveDashboard("overview");
  }

  async getUserAnalysis(userId?: number): Promise<any> {
    return this.getComprehensiveDashboard("user_analysis", userId ? { user_id: userId } : undefined);
  }

  async getPermissionAnalysis(permissionId?: number): Promise<any> {
    return this.getComprehensiveDashboard("permission_analysis", permissionId ? { permission_id: permissionId } : undefined);
  }

  async getPermissionAnalytics(): Promise<any> {
    return this.getComprehensiveDashboard("analytics");
  }

  // === User Profile and Designation Methods ===

  async getCurrentUserProfile(): Promise<any> {
    const response = await api.get(`${this.baseURL}/user-permissions/current_profile/`);
    return response.data;
  }

  async getUserDesignations(userId: number): Promise<any[]> {
    const response = await api.get(`${this.baseURL}/user-permissions/designations/?user_id=${userId}`);
    return response.data;
  }

  // === Permission Assignment Methods ===
}

// Permission Categories
export const getPermissionCategories = async () => {
  const response = await api.get("/tenants/rbac/categories/");
  return response.data;
};

export const createPermissionCategory = async (data: { category_name: string; category_code: string; description?: string; sort_order?: number }) => {
  const response = await api.post("/tenants/rbac/categories/", data);
  return response.data;
};

export const updatePermissionCategory = async (
  id: number,
  data: Partial<{
    category_name: string;
    category_code: string;
    description: string;
    sort_order: number;
    is_active: boolean;
  }>
) => {
  const response = await api.put(`/tenants/rbac/categories/${id}/`, data);
  return response.data;
};

export const deletePermissionCategory = async (id: number) => {
  const response = await api.delete(`/tenants/rbac/categories/${id}/`);
  return response.data;
};

// Permissions
export const getPermissions = async () => {
  const response = await api.get("/tenants/rbac/permissions/");
  return response.data;
};

/**
 * Get permission dashboard data for a user
 */
export const getPermissionDashboard = async (userId?: number): Promise<PermissionDashboardData> => {
  const queryParams = userId ? `?user_id=${userId}` : "";
  const response = await api.get(`/tenants/rbac/user-permissions/permission_dashboard/${queryParams}`);
  return response.data;
};

/**
 * Assign permission to user
 */
export const assignPermissionToUser = async (data: {
  user_id: number;
  permission_id: number;
  permission_level: string;
  assignment_reason?: string;
  effective_from?: string;
  effective_to?: string;
}): Promise<any> => {
  const response = await api.post("/tenants/rbac/user-permissions/assign/", data);
  return response.data;
};

/**
 * Revoke permission from user
 */
export const revokePermissionFromUser = async (data: { user_id: number; permission_id: number; revocation_reason?: string }): Promise<any> => {
  const response = await api.post("/tenants/rbac/user-permissions/revoke/", data);
  return response.data;
};

/**
 * Create user permission override
 */
export const createUserPermissionOverride = async (data: {
  user_profile_id: number;
  permission_id: number;
  override_type: "grant" | "restrict";
  permission_level: string;
  override_reason: string;
  business_justification: string;
  effective_from?: string;
  effective_to?: string;
  is_temporary?: boolean;
  requires_mfa?: boolean;
}): Promise<any> => {
  const response = await api.post("/tenants/rbac/user-permissions/create_override/", data);
  return response.data;
};

// Export singleton instance
export const rbacAPI = new RBACAPIService();
export default rbacAPI;

// User Management API Service for Circle Portal
import api, { errorHandler } from "./api";
import {
  // Core Types
  EnhancedUserProfile,
  UserCreateData,
  UserUpdateData,
  UserListResponse,
  UserSearchFilters,

  // Team Types
  Team,
  TeamMembership,
  TeamCreateData,
  TeamUpdateData,
  TeamMemberAddData,
  TeamListResponse,

  // Operations Types
  BulkUserOperation,
  BulkOperationResponse,

  // Invitations & Registration
  UserInvitationData,
  UserRegistration,

  // Analytics
  UserManagementStats,
  UserActivityLog,
  UserActivityListResponse,
  ActivityLogFilters,

  // Cross-tenant Access
  CrossTenantAccess,
  CrossTenantAccessCreateData,

  // Designation Types
  Designation,
  Department,
} from "../types/user";

// ====================================================
// API RESPONSE INTERFACES
// ====================================================

interface DesignationsResponse {
  designations: Designation[];
  statistics: {
    total: number;
    field: number;
    non_field: number;
    departments_count: number;
  };
}

interface DepartmentsResponse {
  departments: Department[];
  statistics: {
    total: number;
    operational: number;
    non_operational: number;
  };
}

// ====================================================
// API ENDPOINTS CONFIGURATION
// ====================================================

export const USER_MANAGEMENT_ENDPOINTS = {
  // User Management
  users: {
    list: "/tenant/users/",
    detail: (id: string) => `/tenant/users/${id}/`,
    create: "/tenant/users/",
    update: (id: string) => `/tenant/users/${id}/`,
    patch: (id: string) => `/tenant/users/${id}/`,
    delete: (id: string) => `/tenant/users/${id}/`,
    activate: (id: string) => `/tenant/users/${id}/activate/`,
    deactivate: (id: string) => `/tenant/users/${id}/deactivate/`,
    stats: "/tenant/users/stats/",
    export: "/tenant/users/export/",
  },

  // Bulk Operations
  bulkOperations: {
    execute: "/tenant/users/bulk/",
    activate: "/tenant/users/bulk/activate/",
    deactivate: "/tenant/users/bulk/deactivate/",
    assignDesignation: "/tenant/users/bulk/assign-designation/",
    addToTeam: "/tenant/users/bulk/add-to-team/",
  },

  // Team Management
  teams: {
    list: "/tenant/teams/",
    detail: (id: string) => `/tenant/teams/${id}/`,
    create: "/tenant/teams/",
    update: (id: string) => `/tenant/teams/${id}/`,
    delete: (id: string) => `/tenant/teams/${id}/`,
    members: (id: string) => `/tenant/teams/${id}/members/`,
    addMember: (id: string) => `/tenant/teams/${id}/add-member/`,
    removeMember: (id: string) => `/tenant/teams/${id}/remove-member/`,
    stats: "/tenant/teams/stats/",
  },

  // Cross-tenant Access
  crossTenantAccess: {
    list: "/tenant/cross-tenant-access/",
    detail: (id: string) => `/tenant/cross-tenant-access/${id}/`,
    create: "/tenant/cross-tenant-access/",
    update: (id: string) => `/tenant/cross-tenant-access/${id}/`,
    revoke: (id: string) => `/tenant/cross-tenant-access/${id}/revoke/`,
    approve: (id: string) => `/tenant/cross-tenant-access/${id}/approve/`,
  },

  // Activity Logs
  activityLogs: {
    list: "/tenant/activity-logs/",
    detail: (id: string) => `/tenant/activity-logs/${id}/`,
    userActivities: (userId: string) => `/tenant/users/${userId}/activities/`,
    export: "/tenant/activity-logs/export/",
  },

  // User Invitations
  invitations: {
    list: "/tenant/invitations/",
    detail: (id: string) => `/tenant/invitations/${id}/`,
    create: "/tenant/invitations/",
    resend: (id: string) => `/tenant/invitations/${id}/resend/`,
    cancel: (id: string) => `/tenant/invitations/${id}/cancel/`,
    accept: (token: string) => `/tenant/invitations/accept/${token}/`,
    validateToken: (token: string) => `/tenant/invitations/validate/${token}/`,
  },

  // Designations
  designations: {
    list: "/tenant/designations/",
    detail: (id: string) => `/tenant/designations/${id}/`,
  },

  // Departments
  departments: {
    list: "/tenant/departments/",
    detail: (id: string) => `/tenant/departments/${id}/`,
  },
} as const;

// ====================================================
// USER MANAGEMENT API
// ====================================================

export const userManagementAPI = {
  // ==================
  // USER OPERATIONS
  // ==================
  users: {
    // List users with filtering and pagination
    list: async (filters: UserSearchFilters = {}): Promise<UserListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.designation) params.append("designation", filters.designation);
      if (filters.department) params.append("department", filters.department);
      if (filters.is_active !== undefined) params.append("is_active", filters.is_active.toString());
      if (filters.employment_type) params.append("employment_type", filters.employment_type);
      if (filters.date_joined_after) params.append("date_joined_after", filters.date_joined_after);
      if (filters.date_joined_before) params.append("date_joined_before", filters.date_joined_before);
      if (filters.last_login_after) params.append("last_login_after", filters.last_login_after);
      if (filters.last_login_before) params.append("last_login_before", filters.last_login_before);
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.page_size) params.append("page_size", filters.page_size.toString());
      if (filters.ordering) params.append("ordering", filters.ordering);

      const url = `${USER_MANAGEMENT_ENDPOINTS.users.list}?${params.toString()}`;
      const response = await api.get(url);
      return response.data;
    },

    // Get single user
    get: async (id: string): Promise<EnhancedUserProfile> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.users.detail(id));
      return response.data;
    },

    // Create new user
    create: async (userData: UserCreateData): Promise<EnhancedUserProfile> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.users.create, userData);
      return response.data;
    },

    // Update user (full update)
    update: async (id: string, userData: UserUpdateData): Promise<EnhancedUserProfile> => {
      const response = await api.put(USER_MANAGEMENT_ENDPOINTS.users.update(id), userData);
      return response.data;
    },

    // Partial update user
    patch: async (id: string, userData: Partial<UserUpdateData>): Promise<EnhancedUserProfile> => {
      const response = await api.patch(USER_MANAGEMENT_ENDPOINTS.users.patch(id), userData);
      return response.data;
    },

    // Delete user
    delete: async (id: string): Promise<void> => {
      await api.delete(USER_MANAGEMENT_ENDPOINTS.users.delete(id));
    },

    // Activate user
    activate: async (id: string): Promise<EnhancedUserProfile> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.users.activate(id));
      return response.data;
    },

    // Deactivate user
    deactivate: async (id: string): Promise<EnhancedUserProfile> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.users.deactivate(id));
      return response.data;
    },

    // Get user statistics
    getStats: async (): Promise<UserManagementStats> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.users.stats);
      return response.data;
    },

    // Export users
    export: async (filters: UserSearchFilters = {}): Promise<Blob> => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const url = `${USER_MANAGEMENT_ENDPOINTS.users.export}?${params.toString()}`;
      const response = await api.get(url, { responseType: "blob" });
      return response.data;
    },
  },

  // ==================
  // BULK OPERATIONS
  // ==================
  bulkOperations: {
    // Execute bulk operation
    execute: async (operation: BulkUserOperation): Promise<BulkOperationResponse> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.bulkOperations.execute, operation);
      return response.data;
    },

    // Bulk activate users
    activate: async (userIds: number[]): Promise<BulkOperationResponse> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.bulkOperations.activate, { user_ids: userIds });
      return response.data;
    },

    // Bulk deactivate users
    deactivate: async (userIds: number[]): Promise<BulkOperationResponse> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.bulkOperations.deactivate, { user_ids: userIds });
      return response.data;
    },

    // Bulk assign designation
    assignDesignation: async (userIds: number[], designationId: number): Promise<BulkOperationResponse> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.bulkOperations.assignDesignation, {
        user_ids: userIds,
        designation_id: designationId,
      });
      return response.data;
    },

    // Bulk add to team
    addToTeam: async (userIds: number[], teamId: string): Promise<BulkOperationResponse> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.bulkOperations.addToTeam, {
        user_ids: userIds,
        team_id: teamId,
      });
      return response.data;
    },
  },

  // ==================
  // TEAM MANAGEMENT
  // ==================
  teams: {
    // List teams
    list: async (): Promise<TeamListResponse> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.teams.list);
      return response.data;
    },

    // Get single team
    get: async (id: string): Promise<Team> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.teams.detail(id));
      return response.data;
    },

    // Create team
    create: async (teamData: TeamCreateData): Promise<Team> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.teams.create, teamData);
      return response.data;
    },

    // Update team
    update: async (id: string, teamData: TeamUpdateData): Promise<Team> => {
      const response = await api.put(USER_MANAGEMENT_ENDPOINTS.teams.update(id), teamData);
      return response.data;
    },

    // Delete team
    delete: async (id: string): Promise<void> => {
      await api.delete(USER_MANAGEMENT_ENDPOINTS.teams.delete(id));
    },

    // Get team members
    getMembers: async (id: string): Promise<TeamMembership[]> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.teams.members(id));
      return response.data;
    },

    // Add team member
    addMember: async (id: string, memberData: TeamMemberAddData): Promise<TeamMembership> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.teams.addMember(id), memberData);
      return response.data;
    },

    // Remove team member
    removeMember: async (id: string, userId: number): Promise<void> => {
      await api.delete(USER_MANAGEMENT_ENDPOINTS.teams.removeMember(id), {
        data: { user_id: userId },
      });
    },

    // Get team statistics
    getStats: async (): Promise<any> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.teams.stats);
      return response.data;
    },
  },

  // ==================
  // CROSS-TENANT ACCESS
  // ==================
  crossTenantAccess: {
    // List cross-tenant access
    list: async (): Promise<CrossTenantAccess[]> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.crossTenantAccess.list);
      return response.data;
    },

    // Get single cross-tenant access
    get: async (id: string): Promise<CrossTenantAccess> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.crossTenantAccess.detail(id));
      return response.data;
    },

    // Create cross-tenant access
    create: async (accessData: CrossTenantAccessCreateData): Promise<CrossTenantAccess> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.crossTenantAccess.create, accessData);
      return response.data;
    },

    // Update cross-tenant access
    update: async (id: string, accessData: Partial<CrossTenantAccessCreateData>): Promise<CrossTenantAccess> => {
      const response = await api.put(USER_MANAGEMENT_ENDPOINTS.crossTenantAccess.update(id), accessData);
      return response.data;
    },

    // Revoke cross-tenant access
    revoke: async (id: string): Promise<CrossTenantAccess> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.crossTenantAccess.revoke(id));
      return response.data;
    },

    // Approve cross-tenant access
    approve: async (id: string): Promise<CrossTenantAccess> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.crossTenantAccess.approve(id));
      return response.data;
    },
  },

  // ==================
  // ACTIVITY LOGS
  // ==================
  activityLogs: {
    // List activity logs
    list: async (filters: ActivityLogFilters = {}): Promise<UserActivityListResponse> => {
      const params = new URLSearchParams();

      if (filters.user_id) params.append("user_id", filters.user_id.toString());
      if (filters.activity_type) params.append("activity_type", filters.activity_type);
      if (filters.date_from) params.append("date_from", filters.date_from);
      if (filters.date_to) params.append("date_to", filters.date_to);
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.page_size) params.append("page_size", filters.page_size.toString());

      const url = `${USER_MANAGEMENT_ENDPOINTS.activityLogs.list}?${params.toString()}`;
      const response = await api.get(url);
      return response.data;
    },

    // Get single activity log
    get: async (id: string): Promise<UserActivityLog> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.activityLogs.detail(id));
      return response.data;
    },

    // Get user activities
    getUserActivities: async (userId: string, filters: ActivityLogFilters = {}): Promise<UserActivityListResponse> => {
      const params = new URLSearchParams();

      if (filters.activity_type) params.append("activity_type", filters.activity_type);
      if (filters.date_from) params.append("date_from", filters.date_from);
      if (filters.date_to) params.append("date_to", filters.date_to);
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.page_size) params.append("page_size", filters.page_size.toString());

      const url = `${USER_MANAGEMENT_ENDPOINTS.activityLogs.userActivities(userId)}?${params.toString()}`;
      const response = await api.get(url);
      return response.data;
    },

    // Export activity logs
    export: async (filters: ActivityLogFilters = {}): Promise<Blob> => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const url = `${USER_MANAGEMENT_ENDPOINTS.activityLogs.export}?${params.toString()}`;
      const response = await api.get(url, { responseType: "blob" });
      return response.data;
    },
  },

  // ==================
  // USER INVITATIONS
  // ==================
  invitations: {
    // List invitations
    list: async (): Promise<UserRegistration[]> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.invitations.list);
      return response.data;
    },

    // Get single invitation
    get: async (id: string): Promise<UserRegistration> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.invitations.detail(id));
      return response.data;
    },

    // Create invitation
    create: async (invitationData: UserInvitationData): Promise<UserRegistration> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.invitations.create, invitationData);
      return response.data;
    },

    // Resend invitation
    resend: async (id: string): Promise<UserRegistration> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.invitations.resend(id));
      return response.data;
    },

    // Cancel invitation
    cancel: async (id: string): Promise<void> => {
      await api.delete(USER_MANAGEMENT_ENDPOINTS.invitations.cancel(id));
    },

    // Accept invitation
    accept: async (token: string, userData: any): Promise<EnhancedUserProfile> => {
      const response = await api.post(USER_MANAGEMENT_ENDPOINTS.invitations.accept(token), userData);
      return response.data;
    },

    // Validate invitation token
    validateToken: async (token: string): Promise<{ valid: boolean; invitation?: UserRegistration }> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.invitations.validateToken(token));
      return response.data;
    },
  },

  // ==================
  // DESIGNATIONS
  // ==================
  designations: {
    // List designations
    list: async (): Promise<DesignationsResponse> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.designations.list);
      return response.data;
    },

    // Get single designation
    get: async (id: string): Promise<Designation> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.designations.detail(id));
      return response.data;
    },
  },

  // ==================
  // DEPARTMENTS
  // ==================
  departments: {
    // List departments
    list: async (): Promise<DepartmentsResponse> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.departments.list);
      return response.data;
    },

    // Get single department
    get: async (id: string): Promise<Department> => {
      const response = await api.get(USER_MANAGEMENT_ENDPOINTS.departments.detail(id));
      return response.data;
    },
  },
};

// ====================================================
// UTILITY FUNCTIONS
// ====================================================

// Get user full name
export const getUserFullName = (user: EnhancedUserProfile): string => {
  if (user.display_name) return user.display_name;
  if (user.full_name) return user.full_name;
  if (user.user) {
    return `${user.user.first_name} ${user.user.last_name}`.trim() || user.user.email;
  }
  return "Unknown User";
};

// Get user display name
export const getUserDisplayName = (user: EnhancedUserProfile): string => {
  return user.display_name || getUserFullName(user);
};

// Check if user is active
export const isUserActive = (user: EnhancedUserProfile): boolean => {
  return user.is_active && (user.user?.last_login ? true : false);
};

// Format activity type for display
export const formatActivityType = (activityType: string): string => {
  return activityType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

// Get team role display name
export const getTeamRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    leader: "Team Leader",
    member: "Team Member",
    supervisor: "Supervisor",
    coordinator: "Coordinator",
  };
  return roleMap[role] || role;
};

// Get cross-tenant access status color
export const getCrossTenantAccessStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
  const colorMap: Record<string, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
    pending: "warning",
    approved: "success",
    rejected: "error",
    revoked: "default",
    expired: "error",
  };
  return colorMap[status] || "default";
};

export default userManagementAPI;

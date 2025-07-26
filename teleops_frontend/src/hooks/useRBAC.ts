/**
 * useRBAC Hook
 * Provides comprehensive RBAC state management and operations
 */

import { useState, useCallback, useEffect } from "react";
import rbacAPI, {
  Permission,
  PermissionGroup,
  CreatePermissionGroupData,
  UpdatePermissionGroupData,
  UserEffectivePermissions,
  UserPermissionOverride,
  PermissionAuditTrail,
  PermissionCheckRequest,
  PermissionCheckResponse,
} from "../services/rbacAPI";

interface RBACState {
  permissions: Permission[];
  permissionGroups: PermissionGroup[];
  userPermissions: Record<string | number, UserEffectivePermissions>;
  auditTrail: PermissionAuditTrail[];
  totalPermissions: number; // Add total count from API
  totalGroups: number; // Add total count from API
  totalAuditEntries: number; // Add total count from API
  loading: boolean;
  error: string | null;
}

interface UseRBACReturn {
  // State
  state: RBACState;

  // Permission Registry Operations
  loadPermissions: (params?: any) => Promise<Permission[]>;
  createPermission: (data: Partial<Permission>) => Promise<Permission>;
  updatePermission: (id: number, data: Partial<Permission>) => Promise<Permission>;
  deletePermission: (id: number) => Promise<void>;

  // Permission Group Operations
  loadPermissionGroups: (params?: any) => Promise<PermissionGroup[]>;
  createPermissionGroup: (data: CreatePermissionGroupData) => Promise<PermissionGroup>;
  updatePermissionGroup: (id: number, data: UpdatePermissionGroupData) => Promise<PermissionGroup>;
  deletePermissionGroup: (id: number) => Promise<void>;
  assignPermissionsToGroup: (groupId: number, permissionIds: number[]) => Promise<void>;
  assignUsersToGroup: (groupId: number, userIds: number[]) => Promise<void>;

  // User Permission Operations
  loadUserEffectivePermissions: (userId?: number, forceRefresh?: boolean) => Promise<UserEffectivePermissions>;
  checkUserPermission: (request: PermissionCheckRequest) => Promise<PermissionCheckResponse>;
  createUserPermissionOverride: (data: Partial<UserPermissionOverride>) => Promise<UserPermissionOverride>;
  deleteUserPermissionOverride: (id: number) => Promise<void>;

  // Audit Trail Operations
  loadAuditTrail: (params?: any) => Promise<PermissionAuditTrail[]>;

  // Bulk Operations
  bulkGrantPermissions: (data: any) => Promise<any>;
  bulkRevokePermissions: (data: any) => Promise<any>;

  // Analytics
  getPermissionMatrix: () => Promise<any>;
  getPermissionUsageAnalytics: (params?: any) => Promise<any>;
  getComplianceReport: (params?: any) => Promise<any>;

  // Utility functions
  hasPermission: (permissionCode: string, userId?: number) => boolean;
  getUserPermissionSummary: (userId?: number) => any;
  clearCache: () => void;
  refreshAll: () => Promise<void>;
}

export const useRBAC = (): UseRBACReturn => {
  const [state, setState] = useState<RBACState>({
    permissions: [],
    permissionGroups: [],
    userPermissions: {},
    auditTrail: [],
    totalPermissions: 0,
    totalGroups: 0,
    totalAuditEntries: 0,
    loading: false,
    error: null,
  });

  // Helper function to update state
  const updateState = useCallback((updates: Partial<RBACState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Helper function to handle errors
  const handleError = useCallback(
    (error: any, operation: string) => {
      const errorMessage = error?.response?.data?.message || error?.message || `Failed to ${operation}`;
      updateState({ error: errorMessage, loading: false });
      throw new Error(errorMessage);
    },
    [updateState]
  );

  // Permission Registry Operations
  const loadPermissions = useCallback(
    async (params?: any): Promise<Permission[]> => {
      try {
        updateState({ loading: true, error: null });
        const response = await rbacAPI.getPermissions(params);
        const permissions = response.results || response;
        const totalPermissions = response.count || permissions.length;
        updateState({
          permissions,
          totalPermissions,
          loading: false,
        });
        return permissions;
      } catch (error) {
        return handleError(error, "load permissions");
      }
    },
    [updateState, handleError]
  );

  const createPermission = useCallback(
    async (data: Partial<Permission>): Promise<Permission> => {
      try {
        updateState({ loading: true, error: null });
        const newPermission = await rbacAPI.createPermission(data);
        updateState({
          permissions: [...state.permissions, newPermission],
          loading: false,
        });
        return newPermission;
      } catch (error) {
        return handleError(error, "create permission");
      }
    },
    [state.permissions, updateState, handleError]
  );

  const updatePermission = useCallback(
    async (id: number, data: Partial<Permission>): Promise<Permission> => {
      try {
        updateState({ loading: true, error: null });
        const updatedPermission = await rbacAPI.updatePermission(id, data);
        updateState({
          permissions: state.permissions.map((p) => (p.id === id ? updatedPermission : p)),
          loading: false,
        });
        return updatedPermission;
      } catch (error) {
        return handleError(error, "update permission");
      }
    },
    [state.permissions, updateState, handleError]
  );

  const deletePermission = useCallback(
    async (id: number): Promise<void> => {
      try {
        updateState({ loading: true, error: null });
        await rbacAPI.deletePermission(id);
        updateState({
          permissions: state.permissions.filter((p) => p.id !== id),
          loading: false,
        });
      } catch (error) {
        return handleError(error, "delete permission");
      }
    },
    [state.permissions, updateState, handleError]
  );

  // Permission Group Operations
  const loadPermissionGroups = useCallback(
    async (params?: any): Promise<PermissionGroup[]> => {
      try {
        updateState({ loading: true, error: null });
        const response = await rbacAPI.getPermissionGroups(params);
        const groups = response.results || response;
        const totalGroups = response.count || groups.length;
        updateState({
          permissionGroups: groups,
          totalGroups,
          loading: false,
        });
        return groups;
      } catch (error) {
        return handleError(error, "load permission groups");
      }
    },
    [updateState, handleError]
  );

  const createPermissionGroup = useCallback(
    async (data: CreatePermissionGroupData): Promise<PermissionGroup> => {
      try {
        updateState({ loading: true, error: null });
        const newGroup = await rbacAPI.createPermissionGroup(data);
        updateState({
          permissionGroups: [...state.permissionGroups, newGroup],
          loading: false,
        });
        return newGroup;
      } catch (error) {
        return handleError(error, "create permission group");
      }
    },
    [state.permissionGroups, updateState, handleError]
  );

  const updatePermissionGroup = useCallback(
    async (id: number, data: UpdatePermissionGroupData): Promise<PermissionGroup> => {
      try {
        updateState({ loading: true, error: null });
        const updatedGroup = await rbacAPI.updatePermissionGroup(id, data);
        updateState({
          permissionGroups: state.permissionGroups.map((g) => (g.id === id ? updatedGroup : g)),
          loading: false,
        });
        return updatedGroup;
      } catch (error) {
        return handleError(error, "update permission group");
      }
    },
    [state.permissionGroups, updateState, handleError]
  );

  const deletePermissionGroup = useCallback(
    async (id: number): Promise<void> => {
      try {
        updateState({ loading: true, error: null });
        await rbacAPI.deletePermissionGroup(id);
        updateState({
          permissionGroups: state.permissionGroups.filter((g) => g.id !== id),
          loading: false,
        });
      } catch (error) {
        return handleError(error, "delete permission group");
      }
    },
    [state.permissionGroups, updateState, handleError]
  );

  const assignPermissionsToGroup = useCallback(
    async (groupId: number, permissionIds: number[]): Promise<void> => {
      try {
        updateState({ loading: true, error: null });
        await rbacAPI.assignPermissionsToGroup(groupId, permissionIds);
        // Refresh the specific group
        const updatedGroup = await rbacAPI.getPermissionGroup(groupId);
        updateState({
          permissionGroups: state.permissionGroups.map((g) => (g.id === groupId ? updatedGroup : g)),
          loading: false,
        });
      } catch (error) {
        return handleError(error, "assign permissions to group");
      }
    },
    [state.permissionGroups, updateState, handleError]
  );

  const assignUsersToGroup = useCallback(
    async (groupId: number, userIds: number[]): Promise<void> => {
      try {
        updateState({ loading: true, error: null });
        await rbacAPI.assignUsersToGroup(groupId, userIds);
        // Clear affected user permissions cache
        const updatedUserPermissions = { ...state.userPermissions };
        userIds.forEach((userId) => {
          delete updatedUserPermissions[userId];
        });
        updateState({ userPermissions: updatedUserPermissions, loading: false });
      } catch (error) {
        return handleError(error, "assign users to group");
      }
    },
    [state.userPermissions, updateState, handleError]
  );

  // User Permission Operations
  const loadUserEffectivePermissions = useCallback(
    async (userId?: number, forceRefresh?: boolean): Promise<UserEffectivePermissions> => {
      try {
        updateState({ loading: true, error: null });
        const userPerms = await rbacAPI.getUserEffectivePermissions(userId, forceRefresh);

        // Cache the result using actual user ID from response or current user
        const effectiveUserId = userId || "current";

        updateState({
          userPermissions: {
            ...state.userPermissions,
            [effectiveUserId]: userPerms,
          },
          loading: false,
        });
        return userPerms;
      } catch (error) {
        return handleError(error, "load user effective permissions");
      }
    },
    [state.userPermissions, updateState, handleError]
  );

  const checkUserPermission = useCallback(
    async (request: PermissionCheckRequest): Promise<PermissionCheckResponse> => {
      try {
        const response = await rbacAPI.checkUserPermission(request);
        return response;
      } catch (error) {
        return handleError(error, "check user permission");
      }
    },
    [handleError]
  );

  const createUserPermissionOverride = useCallback(
    async (data: Partial<UserPermissionOverride>): Promise<UserPermissionOverride> => {
      try {
        updateState({ loading: true, error: null });
        const override = await rbacAPI.createUserPermissionOverride(data);

        // Clear the affected user's permissions cache
        if (data.user_profile_id) {
          const updatedUserPermissions = { ...state.userPermissions };
          delete updatedUserPermissions[data.user_profile_id];
          updateState({ userPermissions: updatedUserPermissions });
        }

        updateState({ loading: false });
        return override;
      } catch (error) {
        return handleError(error, "create user permission override");
      }
    },
    [state.userPermissions, updateState, handleError]
  );

  const deleteUserPermissionOverride = useCallback(
    async (id: number): Promise<void> => {
      try {
        updateState({ loading: true, error: null });
        await rbacAPI.deleteUserPermissionOverride(id);
        updateState({ loading: false });
      } catch (error) {
        return handleError(error, "delete user permission override");
      }
    },
    [updateState, handleError]
  );

  // Audit Trail Operations
  const loadAuditTrail = useCallback(
    async (params?: any): Promise<PermissionAuditTrail[]> => {
      try {
        updateState({ loading: true, error: null });
        const response = await rbacAPI.getPermissionAuditTrail(params);
        const auditTrail = response.results || response;
        const totalAuditEntries = response.count || auditTrail.length;
        updateState({
          auditTrail,
          totalAuditEntries,
          loading: false,
        });
        return auditTrail;
      } catch (error) {
        return handleError(error, "load audit trail");
      }
    },
    [updateState, handleError]
  );

  // Bulk Operations
  const bulkGrantPermissions = useCallback(
    async (data: any): Promise<any> => {
      try {
        updateState({ loading: true, error: null });
        const result = await rbacAPI.bulkGrantPermissions(data);

        // Clear affected users' permissions cache
        if (data.target_type === "users" && data.target_ids) {
          const updatedUserPermissions = { ...state.userPermissions };
          data.target_ids.forEach((userId: number) => {
            delete updatedUserPermissions[userId];
          });
          updateState({ userPermissions: updatedUserPermissions });
        }

        updateState({ loading: false });
        return result;
      } catch (error) {
        return handleError(error, "bulk grant permissions");
      }
    },
    [state.userPermissions, updateState, handleError]
  );

  const bulkRevokePermissions = useCallback(
    async (data: any): Promise<any> => {
      try {
        updateState({ loading: true, error: null });
        const result = await rbacAPI.bulkRevokePermissions(data);

        // Clear affected users' permissions cache
        if (data.target_type === "users" && data.target_ids) {
          const updatedUserPermissions = { ...state.userPermissions };
          data.target_ids.forEach((userId: number) => {
            delete updatedUserPermissions[userId];
          });
          updateState({ userPermissions: updatedUserPermissions });
        }

        updateState({ loading: false });
        return result;
      } catch (error) {
        return handleError(error, "bulk revoke permissions");
      }
    },
    [state.userPermissions, updateState, handleError]
  );

  // Analytics
  const getPermissionMatrix = useCallback(async (): Promise<any> => {
    try {
      return await rbacAPI.getPermissionMatrix();
    } catch (error) {
      return handleError(error, "get permission matrix");
    }
  }, [handleError]);

  const getPermissionUsageAnalytics = useCallback(
    async (params?: any): Promise<any> => {
      try {
        return await rbacAPI.getPermissionUsageAnalytics(params);
      } catch (error) {
        return handleError(error, "get permission usage analytics");
      }
    },
    [handleError]
  );

  const getComplianceReport = useCallback(
    async (params?: any): Promise<any> => {
      try {
        return await rbacAPI.getComplianceReport(params);
      } catch (error) {
        return handleError(error, "get compliance report");
      }
    },
    [handleError]
  );

  // Utility Functions
  const hasPermission = useCallback(
    (permissionCode: string, userId?: number): boolean => {
      const userKey = userId?.toString() || "current";
      const userPerms = state.userPermissions[userKey];

      if (!userPerms?.permissions) {
        return false;
      }

      const permission = userPerms.permissions[permissionCode];
      return permission && permission.permission_level === "granted";
    },
    [state.userPermissions]
  );

  const getUserPermissionSummary = useCallback(
    (userId?: number) => {
      const userKey = userId?.toString() || "current";
      const userPerms = state.userPermissions[userKey];
      return userPerms?.permission_summary || null;
    },
    [state.userPermissions]
  );

  const clearCache = useCallback(() => {
    updateState({ userPermissions: {} });
  }, [updateState]);

  const refreshAll = useCallback(async (): Promise<void> => {
    try {
      updateState({ loading: true, error: null });
      await Promise.all([loadPermissions(), loadPermissionGroups(), loadAuditTrail()]);
      // Clear user permissions cache to force refresh
      updateState({ userPermissions: {}, loading: false });
    } catch (error) {
      updateState({ loading: false });
      console.error("Failed to refresh RBAC data:", error);
    }
  }, [loadPermissions, loadPermissionGroups, loadAuditTrail, updateState]);

  // Auto-load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([loadPermissions(), loadPermissionGroups()]);
      } catch (error) {
        console.error("Failed to load initial RBAC data:", error);
      }
    };

    loadInitialData();
  }, []); // Only run once on mount

  return {
    state,

    // Permission Registry Operations
    loadPermissions,
    createPermission,
    updatePermission,
    deletePermission,

    // Permission Group Operations
    loadPermissionGroups,
    createPermissionGroup,
    updatePermissionGroup,
    deletePermissionGroup,
    assignPermissionsToGroup,
    assignUsersToGroup,

    // User Permission Operations
    loadUserEffectivePermissions,
    checkUserPermission,
    createUserPermissionOverride,
    deleteUserPermissionOverride,

    // Audit Trail Operations
    loadAuditTrail,

    // Bulk Operations
    bulkGrantPermissions,
    bulkRevokePermissions,

    // Analytics
    getPermissionMatrix,
    getPermissionUsageAnalytics,
    getComplianceReport,

    // Utility functions
    hasPermission,
    getUserPermissionSummary,
    clearCache,
    refreshAll,
  };
};

export default useRBAC;

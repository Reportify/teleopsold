/**
 * RBAC Helper Utilities
 * Provides utility functions for RBAC type conversions and data handling
 */

import { Permission, PermissionGroup, CreatePermissionGroupData, UpdatePermissionGroupData } from "../services/rbacAPI";

/**
 * Converts a PermissionGroup object to CreatePermissionGroupData format
 */
export function toCreatePermissionGroupData(group: Partial<PermissionGroup>, selectedPermissions: number[]): CreatePermissionGroupData {
  return {
    group_name: group.group_name || "",
    group_code: group.group_code || "",
    description: group.description,
    group_type: group.group_type || "functional",
    is_assignable: group.is_assignable ?? true,
    auto_assign_conditions: group.auto_assign_conditions || {},
    permissions: selectedPermissions,
  };
}

/**
 * Converts a PermissionGroup object to UpdatePermissionGroupData format
 */
export function toUpdatePermissionGroupData(group: Partial<PermissionGroup>, selectedPermissions?: number[]): UpdatePermissionGroupData {
  const data: UpdatePermissionGroupData = {};

  if (group.group_name) data.group_name = group.group_name;
  if (group.group_code) data.group_code = group.group_code;
  if (group.description !== undefined) data.description = group.description;
  if (group.group_type) data.group_type = group.group_type;
  if (group.is_assignable !== undefined) data.is_assignable = group.is_assignable;
  if (group.auto_assign_conditions) data.auto_assign_conditions = group.auto_assign_conditions;
  if (selectedPermissions) data.permissions = selectedPermissions;

  return data;
}

/**
 * Extracts permission IDs from a permissions array that might contain Permission objects or IDs
 */
export function extractPermissionIds(permissions?: (Permission | number)[]): number[] {
  if (!permissions) return [];
  return permissions.map((p) => (typeof p === "number" ? p : p.id));
}

/**
 * Validates required fields for permission group creation
 */
export function validatePermissionGroupData(data: Partial<PermissionGroup>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!data.group_name?.trim()) {
    errors.group_name = "Group name is required";
  }

  if (!data.group_code?.trim()) {
    errors.group_code = "Group code is required";
  }

  if (!data.group_type) {
    errors.group_type = "Group type is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Feature-based permission checking hook
 * Maps UI components to specific permission requirements
 */

import React, { useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";

// Permission Level to Actions Mapping
const PERMISSION_ACTIONS = {
  view_only: ["read"],
  creator_only: ["read", "create"],
  contributor: ["read", "create", "update"],
  full_access: ["read", "create", "update", "delete"],
  custom: [] as string[],
};

// Feature definitions that map to backend registry
interface FeatureDefinition {
  featureId: string;
  featureName: string;
  resourceType: string;
  requiredActions: string[];
  description: string;
}

// Frontend feature registry - keep in sync with backend
const FRONTEND_FEATURES: Record<string, FeatureDefinition> = {
  // Deviation Management
  deviation_view: {
    featureId: "deviation_view",
    featureName: "View Deviations",
    resourceType: "deviation",
    requiredActions: ["read"],
    description: "View deviation records and reports",
  },
  deviation_edit: {
    featureId: "deviation_edit",
    featureName: "Edit Deviations",
    resourceType: "deviation",
    requiredActions: ["update"],
    description: "Modify existing deviation records",
  },
  deviation_create: {
    featureId: "deviation_create",
    featureName: "Create Deviations",
    resourceType: "deviation",
    requiredActions: ["create"],
    description: "Create new deviation records",
  },
  deviation_approve: {
    featureId: "deviation_approve",
    featureName: "Approve Deviations",
    resourceType: "deviation",
    requiredActions: ["update"],
    description: "Approve or reject deviation requests",
  },

  // Project Management
  project_view: {
    featureId: "project_view",
    featureName: "View Projects",
    resourceType: "project",
    requiredActions: ["read"],
    description: "View project information and status",
  },

  // Site Management
  site_view: {
    featureId: "site_view",
    featureName: "View Sites",
    resourceType: "site",
    requiredActions: ["read"],
    description: "View site information and locations",
  },

  // User Management
  user_view: {
    featureId: "user_view",
    featureName: "View Users",
    resourceType: "user",
    requiredActions: ["read"],
    description: "View user profiles and information",
  },
  user_create: {
    featureId: "user_create",
    featureName: "Create Users",
    resourceType: "user",
    requiredActions: ["create"],
    description: "Add new users to the system",
  },
  user_edit: {
    featureId: "user_edit",
    featureName: "Edit Users",
    resourceType: "user",
    requiredActions: ["update"],
    description: "Modify user profiles and settings",
  },
  user_deactivate: {
    featureId: "user_deactivate",
    featureName: "Deactivate Users",
    resourceType: "user",
    requiredActions: ["delete"],
    description: "Deactivate or suspend user accounts",
  },

  // Vendor Management
  vendor_view: {
    featureId: "vendor_view",
    featureName: "View Vendors",
    resourceType: "vendor",
    requiredActions: ["read"],
    description: "View vendor information and relationships",
  },
  vendor_create: {
    featureId: "vendor_create",
    featureName: "Create Vendors",
    resourceType: "vendor",
    requiredActions: ["create"],
    description: "Add new vendors and establish relationships",
  },
  vendor_edit: {
    featureId: "vendor_edit",
    featureName: "Edit Vendors",
    resourceType: "vendor",
    requiredActions: ["update"],
    description: "Modify vendor information and contracts",
  },
  vendor_delete: {
    featureId: "vendor_delete",
    featureName: "Delete Vendors",
    resourceType: "vendor",
    requiredActions: ["delete"],
    description: "Remove vendors from the system",
  },
  vendor_oversight: {
    featureId: "vendor_oversight",
    featureName: "Vendor Oversight",
    resourceType: "vendor",
    requiredActions: ["read"],
    description: "Monitor vendor performance and compliance",
  },

  // Task Management
  task_view: {
    featureId: "task_view",
    featureName: "View Tasks",
    resourceType: "task",
    requiredActions: ["read"],
    description: "View task assignments and progress",
  },
  task_create: {
    featureId: "task_create",
    featureName: "Create Tasks",
    resourceType: "task",
    requiredActions: ["create"],
    description: "Create new tasks and assignments",
  },
  task_edit: {
    featureId: "task_edit",
    featureName: "Edit Tasks",
    resourceType: "task",
    requiredActions: ["update"],
    description: "Assign and modify task details",
  },

  // RBAC Management
  rbac_permissions_view: {
    featureId: "rbac_permissions_view",
    featureName: "View RBAC Permissions",
    resourceType: "rbac",
    requiredActions: ["read"],
    description: "View permission system dashboard",
  },
  rbac_permissions_create: {
    featureId: "rbac_permissions_create",
    featureName: "Create RBAC Permissions",
    resourceType: "rbac",
    requiredActions: ["create"],
    description: "Create new permissions in the system",
  },
  rbac_permissions_edit: {
    featureId: "rbac_permissions_edit",
    featureName: "Edit RBAC Permissions",
    resourceType: "rbac",
    requiredActions: ["update"],
    description: "Edit existing permissions",
  },
  rbac_permissions_delete: {
    featureId: "rbac_permissions_delete",
    featureName: "Delete RBAC Permissions",
    resourceType: "rbac",
    requiredActions: ["delete"],
    description: "Delete permissions from the system",
  },
  rbac_permissions_grant: {
    featureId: "rbac_permissions_grant",
    featureName: "Grant Permissions",
    resourceType: "rbac",
    requiredActions: ["update"],
    description: "Grant permissions to users, groups, or designations",
  },
  rbac_permissions_revoke: {
    featureId: "rbac_permissions_revoke",
    featureName: "Revoke Permissions",
    resourceType: "rbac",
    requiredActions: ["update"],
    description: "Revoke permissions from users, groups, or designations",
  },
  rbac_audit_trail: {
    featureId: "rbac_audit_trail",
    featureName: "View Audit Trail",
    resourceType: "rbac",
    requiredActions: ["read"],
    description: "View audit logs for permission changes",
  },
  rbac_groups_manage: {
    featureId: "rbac_groups_manage",
    featureName: "Manage Permission Groups",
    resourceType: "rbac",
    requiredActions: ["update"],
    description: "Create and manage permission groups",
  },
  rbac_designations_manage: {
    featureId: "rbac_designations_manage",
    featureName: "Manage Designation Permissions",
    resourceType: "rbac",
    requiredActions: ["update"],
    description: "Manage permissions assigned to designations",
  },
};

interface UseFeaturePermissionsReturn {
  // Feature-based checks
  hasFeatureAccess: (featureId: string) => boolean;
  getAccessibleFeatures: () => FeatureDefinition[];

  // Resource-based checks
  hasResourcePermission: (resourceType: string, action?: string) => boolean;
  getResourcePermissions: (resourceType: string) => string[];

  // Legacy permission checks (backward compatibility)
  hasPermission: (permission: string) => boolean;

  // Component helpers
  canViewComponent: (componentName: string) => boolean;
  getComponentPermissions: (componentName: string) => string[];

  // Permission metadata
  getPermissionInfo: (permissionCode: string) => {
    isMapped: boolean;
    features: FeatureDefinition[];
    resourceType?: string;
  };
}

// Component to feature mapping
const COMPONENT_FEATURE_MAP: Record<string, string[]> = {
  DeviationManagementPage: ["deviation_view", "deviation_edit", "deviation_create"],
  DeviationApprovalPage: ["deviation_approve"],
  ProjectManagementPage: ["project_view"],
  SitesPage: ["site_view"],
  ComprehensivePermissionDashboard: ["rbac_permissions_view"],
  PermissionRegistryPage: ["rbac_permissions_view"],
  // Add more component mappings as needed
};

export const useFeaturePermissions = (): UseFeaturePermissionsReturn => {
  const { hasPermission: authHasPermission, getUserPermissions } = useAuth();

  // Helper function to determine business template from permission code
  const getBusinessTemplateFromCode = useCallback((permissionCode: string): string => {
    // Map permission codes to business templates based on action patterns
    if (permissionCode.endsWith(".read")) return "view_only";
    if (permissionCode.endsWith(".read_create")) return "creator_only";
    if (permissionCode.endsWith(".read_create_update")) return "contributor";
    if (permissionCode.endsWith(".read_create_update_delete")) return "full_access";

    // Legacy patterns
    if (permissionCode.includes(".view") && !permissionCode.includes(".edit") && !permissionCode.includes(".create") && !permissionCode.includes(".delete")) return "view_only";
    if (permissionCode.includes(".create") && !permissionCode.includes(".edit") && !permissionCode.includes(".delete")) return "creator_only";
    if (permissionCode.includes(".edit") && !permissionCode.includes(".delete")) return "contributor";
    if (permissionCode.includes(".delete") || permissionCode.includes(".manage")) return "full_access";

    // Default to custom for unknown patterns
    return "custom";
  }, []);

  // Helper function to check if user has required actions for a resource type
  const hasResourceActions = useCallback(
    (resourceType: string, requiredActions: string[]): boolean => {
      const userPermissions = getUserPermissions();
      if (!userPermissions || userPermissions.length === 0) return false;

      // Find permissions for this resource type and check their business templates
      const resourcePermissions = userPermissions.filter((permission: string) => {
        return permission.toLowerCase().includes(resourceType.toLowerCase());
      });

      // Check if any of the user's permissions for this resource type provide the required actions
      return resourcePermissions.some((permissionCode: string) => {
        const businessTemplate = getBusinessTemplateFromCode(permissionCode);
        const availableActions = PERMISSION_ACTIONS[businessTemplate as keyof typeof PERMISSION_ACTIONS] || [];

        // Check if all required actions are available in this permission's business template
        return requiredActions.every((action) => availableActions.includes(action));
      });
    },
    [getUserPermissions, getBusinessTemplateFromCode]
  );

  const hasFeatureAccess = useCallback(
    (featureId: string): boolean => {
      const feature = FRONTEND_FEATURES[featureId];
      if (!feature) {
        console.warn(`Feature ${featureId} not found in registry`);
        return false;
      }

      // Check if user has required actions for this resource type
      return hasResourceActions(feature.resourceType, feature.requiredActions);
    },
    [hasResourceActions]
  );

  const getAccessibleFeatures = useCallback((): FeatureDefinition[] => {
    return Object.values(FRONTEND_FEATURES).filter((feature) => hasFeatureAccess(feature.featureId));
  }, [hasFeatureAccess]);

  const hasResourcePermission = useCallback(
    (resourceType: string, action?: string): boolean => {
      if (action) {
        // Check for specific action
        return hasResourceActions(resourceType, [action]);
      }

      // Check if user has ANY permission for this resource type (default to read)
      return hasResourceActions(resourceType, ["read"]);
    },
    [hasResourceActions]
  );

  const getResourcePermissions = useCallback(
    (resourceType: string): string[] => {
      const relevantFeatures = Object.values(FRONTEND_FEATURES).filter((feature) => feature.resourceType === resourceType && hasFeatureAccess(feature.featureId));

      const permissions = new Set<string>();
      relevantFeatures.forEach((feature) => {
        feature.requiredActions.forEach((action) => permissions.add(action));
      });

      return Array.from(permissions);
    },
    [hasFeatureAccess]
  );

  const canViewComponent = useCallback(
    (componentName: string): boolean => {
      const featureIds = COMPONENT_FEATURE_MAP[componentName];
      if (!featureIds) {
        console.warn(`Component ${componentName} not mapped to any features`);
        return true; // Default to allowing if not mapped
      }

      // User needs access to ANY of the component's features
      return featureIds.some((featureId) => hasFeatureAccess(featureId));
    },
    [hasFeatureAccess]
  );

  const getComponentPermissions = useCallback(
    (componentName: string): string[] => {
      const featureIds = COMPONENT_FEATURE_MAP[componentName] || [];
      const permissions = new Set<string>();

      featureIds.forEach((featureId) => {
        const feature = FRONTEND_FEATURES[featureId];
        if (feature && hasFeatureAccess(featureId)) {
          feature.requiredActions.forEach((action) => permissions.add(action));
        }
      });

      return Array.from(permissions);
    },
    [hasFeatureAccess]
  );

  const getPermissionInfo = useCallback((permissionCode: string) => {
    const relatedFeatures = Object.values(FRONTEND_FEATURES).filter((feature) => feature.requiredActions.includes(permissionCode));

    return {
      isMapped: relatedFeatures.length > 0,
      features: relatedFeatures,
      resourceType: relatedFeatures[0]?.resourceType,
    };
  }, []);

  // Memoized values
  const accessibleFeatures = useMemo(() => getAccessibleFeatures(), [getAccessibleFeatures]);

  return {
    hasFeatureAccess,
    getAccessibleFeatures,
    hasResourcePermission,
    getResourcePermissions,
    hasPermission: authHasPermission, // Legacy compatibility
    canViewComponent,
    getComponentPermissions,
    getPermissionInfo,
  };
};

// HOC for protecting components based on features
export const withFeaturePermission = <P extends object>(WrappedComponent: React.ComponentType<P>, requiredFeatureId: string, fallbackComponent?: React.ComponentType) => {
  return (props: P) => {
    const { hasFeatureAccess } = useFeaturePermissions();

    if (!hasFeatureAccess(requiredFeatureId)) {
      if (fallbackComponent) {
        const FallbackComponent = fallbackComponent;
        return React.createElement(FallbackComponent);
      }
      return null;
    }

    return React.createElement(WrappedComponent, props);
  };
};

// Component for conditional rendering based on features
interface FeatureGateProps {
  featureId: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ featureId, fallback, children }) => {
  const { hasFeatureAccess } = useFeaturePermissions();

  if (!hasFeatureAccess(featureId)) {
    return React.createElement(React.Fragment, null, fallback);
  }

  return React.createElement(React.Fragment, null, children);
};

// Hook for managing feature-based navigation items
export const useFeatureNavigation = () => {
  const { hasFeatureAccess, hasResourcePermission, hasPermission } = useFeaturePermissions();

  const filterNavigationItems = useCallback(
    (items: any[]) => {
      return items.filter((item) => {
        // Skip items without permission requirements
        if (!item.permission && !item.featureId && !item.resourceType) {
          return true;
        }

        // Check by feature ID (preferred)
        if (item.featureId) {
          return hasFeatureAccess(item.featureId);
        }

        // Check by resource type
        if (item.resourceType) {
          return hasResourcePermission(item.resourceType);
        }

        // Legacy permission check
        if (item.permission) {
          return hasPermission(item.permission);
        }

        return true;
      });
    },
    [hasFeatureAccess, hasResourcePermission, hasPermission]
  );

  return { filterNavigationItems };
};

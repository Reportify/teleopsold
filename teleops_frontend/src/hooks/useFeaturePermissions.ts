/**
 * Feature-based permission checking hook
 * Maps UI components to specific permission requirements
 */

import React, { useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";

// Feature definitions that map to backend registry
interface FeatureDefinition {
  featureId: string;
  featureName: string;
  resourceType: string;
  requiredPermissions: string[];
  description: string;
}

// Frontend feature registry - keep in sync with backend
const FRONTEND_FEATURES: Record<string, FeatureDefinition> = {
  // Deviation Management
  deviation_view: {
    featureId: "deviation_view",
    featureName: "View Deviations",
    resourceType: "deviation",
    requiredPermissions: ["deviation.view"],
    description: "View deviation records and reports",
  },
  deviation_edit: {
    featureId: "deviation_edit",
    featureName: "Edit Deviations",
    resourceType: "deviation",
    requiredPermissions: ["deviation.edit"],
    description: "Modify existing deviation records",
  },
  deviation_create: {
    featureId: "deviation_create",
    featureName: "Create Deviations",
    resourceType: "deviation",
    requiredPermissions: ["deviation.create"],
    description: "Create new deviation records",
  },
  deviation_approve: {
    featureId: "deviation_approve",
    featureName: "Approve Deviations",
    resourceType: "deviation",
    requiredPermissions: ["deviation.approve"],
    description: "Approve or reject deviation requests",
  },

  // Project Management
  project_view: {
    featureId: "project_view",
    featureName: "View Projects",
    resourceType: "project",
    requiredPermissions: ["project.view", "project_management.view_projects"],
    description: "View project information and status",
  },

  // Site Management
  site_view: {
    featureId: "site_view",
    featureName: "View Sites",
    resourceType: "site",
    requiredPermissions: ["site.view", "site_management.view_sites"],
    description: "View site information and locations",
  },

  // RBAC Management
  rbac_permissions_view: {
    featureId: "rbac_permissions_view",
    featureName: "View RBAC Permissions",
    resourceType: "system",
    requiredPermissions: ["rbac_management.view_permissions"],
    description: "View permission system dashboard",
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
  const { hasPermission: authHasPermission } = useAuth();

  const hasFeatureAccess = useCallback(
    (featureId: string): boolean => {
      const feature = FRONTEND_FEATURES[featureId];
      if (!feature) {
        console.warn(`Feature ${featureId} not found in registry`);
        return false;
      }

      // User needs ANY of the required permissions
      return feature.requiredPermissions.some((permission) => authHasPermission(permission));
    },
    [authHasPermission]
  );

  const getAccessibleFeatures = useCallback((): FeatureDefinition[] => {
    return Object.values(FRONTEND_FEATURES).filter((feature) => hasFeatureAccess(feature.featureId));
  }, [hasFeatureAccess]);

  const hasResourcePermission = useCallback(
    (resourceType: string, action?: string): boolean => {
      const relevantFeatures = Object.values(FRONTEND_FEATURES).filter((feature) => feature.resourceType === resourceType);

      if (action) {
        // Filter by action if specified (e.g., 'view', 'edit', 'create')
        const actionFeatures = relevantFeatures.filter((feature) => feature.requiredPermissions.some((perm) => perm.endsWith(`.${action}`)));
        return actionFeatures.some((feature) => hasFeatureAccess(feature.featureId));
      }

      // Check if user has ANY permission for this resource type
      return relevantFeatures.some((feature) => hasFeatureAccess(feature.featureId));
    },
    [hasFeatureAccess]
  );

  const getResourcePermissions = useCallback(
    (resourceType: string): string[] => {
      const relevantFeatures = Object.values(FRONTEND_FEATURES).filter((feature) => feature.resourceType === resourceType && hasFeatureAccess(feature.featureId));

      const permissions = new Set<string>();
      relevantFeatures.forEach((feature) => {
        feature.requiredPermissions.forEach((perm) => permissions.add(perm));
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
          feature.requiredPermissions.forEach((perm) => permissions.add(perm));
        }
      });

      return Array.from(permissions);
    },
    [hasFeatureAccess]
  );

  const getPermissionInfo = useCallback((permissionCode: string) => {
    const relatedFeatures = Object.values(FRONTEND_FEATURES).filter((feature) => feature.requiredPermissions.includes(permissionCode));

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

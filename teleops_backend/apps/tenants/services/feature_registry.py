"""
Feature Registry Service
Maps permissions to actual application functionality
"""

from typing import Dict, List, Set
from dataclasses import dataclass
from django.conf import settings
from apps.tenants.constants import BUSINESS_TEMPLATE_ACTIONS

@dataclass
class FeatureDefinition:
    """Defines a specific application feature"""
    feature_id: str
    feature_name: str
    resource_type: str
    component_path: str  # Frontend component path
    api_endpoints: List[str]  # Backend API endpoints
    required_actions: List[str]  # Actions needed (read, create, update, delete)
    description: str

@dataclass 
class PermissionMapping:
    """Maps permission codes to required checks"""
    permission_code: str
    resource_type: str
    action_type: str  # view, create, edit, delete, approve, etc.
    feature_ids: List[str]  # Which features this permission controls

class FeatureRegistry:
    """Registry of application features and their permission requirements"""
    
    def __init__(self):
        self._features: Dict[str, FeatureDefinition] = {}
        self._permission_mappings: Dict[str, PermissionMapping] = {}
        self._initialize_features()
    
    def _initialize_features(self):
        """Initialize all application features"""
        
        # ==========================================
        # DEVIATION MANAGEMENT FEATURES
        # ==========================================
        self.register_feature(FeatureDefinition(
            feature_id="deviation_view",
            feature_name="View Deviations", 
            resource_type="deviation",
            component_path="pages/DeviationManagementPage",
            api_endpoints=[
                "/api/v1/deviations/",
                "/api/v1/deviations/{id}/",
            ],
            required_actions=["read"],
            description="View deviation records and reports"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="deviation_edit",
            feature_name="Edit Deviations",
            resource_type="deviation", 
            component_path="pages/DeviationManagementPage",
            api_endpoints=[
                "/api/v1/deviations/{id}/",
                "/api/v1/deviations/{id}/update/",
            ],
            required_actions=["update"],
            description="Modify existing deviation records"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="deviation_create",
            feature_name="Create Deviations",
            resource_type="deviation",
            component_path="pages/DeviationManagementPage",
            api_endpoints=[
                "/api/v1/deviations/",
                "/api/v1/deviations/create/",
            ],
            required_actions=["create"],
            description="Create new deviation records"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="deviation_approve",
            feature_name="Approve Deviations",
            resource_type="deviation",
            component_path="pages/DeviationApprovalPage", 
            api_endpoints=[
                "/api/v1/deviations/{id}/approve/",
                "/api/v1/deviations/{id}/reject/",
            ],
            required_actions=["update"],
            description="Approve or reject deviation requests"
        ))
        
        
        # ==========================================
        # VENDOR MANAGEMENT FEATURES
        # ==========================================
        self.register_feature(FeatureDefinition(
            feature_id="vendor_view",
            feature_name="View Vendors",
            resource_type="vendor",
            component_path="pages/VendorOperationsManagementPage",
            api_endpoints=["/api/v1/vendor-operations/", "/api/v1/circle-vendor-relationships/"],
            required_actions=["read"],
            description="View vendor information and relationships"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="vendor_edit",
            feature_name="Edit Vendors",
            resource_type="vendor",
            component_path="pages/VendorOperationsManagementPage",
            api_endpoints=["/api/v1/vendor-operations/{id}/", "/api/v1/circle-vendor-relationships/{id}/"],
            required_actions=["update"],
            description="Modify vendor information and contracts"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="vendor_create",
            feature_name="Create Vendors",
            resource_type="vendor",
            component_path="pages/VendorOperationsManagementPage",
            api_endpoints=["/api/v1/vendor-operations/", "/api/v1/circle-vendor-relationships/"],
            required_actions=["create"],
            description="Add new vendors and establish relationships"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="vendor_delete",
            feature_name="Delete Vendors",
            resource_type="vendor",
            component_path="pages/VendorOperationsManagementPage",
            api_endpoints=["/api/v1/vendor-operations/{id}/delete/"],
            required_actions=["delete"],
            description="Remove vendors from the system"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="vendor_oversight",
            feature_name="Vendor Oversight",
            resource_type="vendor",
            component_path="pages/VendorOversightPage",
            api_endpoints=["/api/v1/vendor-operations/oversight/", "/api/v1/vendor-operations/analytics/"],
            required_actions=["read"],
            description="Monitor vendor performance and compliance"
        ))

        # ==========================================
        # USER MANAGEMENT FEATURES
        # ==========================================
        self.register_feature(FeatureDefinition(
            feature_id="user_view",
            feature_name="View Users",
            resource_type="user",
            component_path="pages/CircleUserManagementPage",
            api_endpoints=["/api/v1/tenant/users/", "/api/v1/tenant/profile/"],
            required_actions=["read"],
            description="View user profiles and information"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="user_edit",
            feature_name="Edit Users",
            resource_type="user",
            component_path="pages/CircleUserManagementPage",
            api_endpoints=["/api/v1/tenant/users/{id}/", "/api/v1/tenant/profile/"],
            required_actions=["update"],
            description="Modify user profiles and settings"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="user_create",
            feature_name="Create Users",
            resource_type="user",
            component_path="pages/CircleUserManagementPage",
            api_endpoints=["/api/v1/tenant/users/", "/api/v1/auth/register/"],
            required_actions=["create"],
            description="Add new users to the system"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="user_deactivate",
            feature_name="Deactivate Users",
            resource_type="user",
            component_path="pages/CircleUserManagementPage",
            api_endpoints=["/api/v1/tenant/users/{id}/deactivate/"],
            required_actions=["delete"],
            description="Deactivate or suspend user accounts"
        ))

        # ==========================================
        # SITE MANAGEMENT FEATURES  
        # ==========================================
        self.register_feature(FeatureDefinition(
            feature_id="site_view",
            feature_name="View Sites",
            resource_type="site",
            component_path="pages/SitesPage",
            api_endpoints=["/api/v1/sites/"],
            required_actions=["read"],
            description="View site information and locations"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="site_edit",
            feature_name="Edit Sites",
            resource_type="site",
            component_path="pages/SitesPage",
            api_endpoints=["/api/v1/sites/{id}/"],
            required_actions=["update"],
            description="Modify site details and configurations"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="site_create",
            feature_name="Create Sites",
            resource_type="site",
            component_path="pages/SitesPage",
            api_endpoints=["/api/v1/sites/"],
            required_actions=["create"],
            description="Add new sites to the system"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="site_bulk_upload",
            feature_name="Bulk Upload Sites",
            resource_type="site",
            component_path="pages/SitesPage",
            api_endpoints=["/api/v1/sites/bulk-upload/"],
            required_actions=["create"],
            description="Upload multiple sites via bulk operations"
        ))

        # ==========================================
        # PROJECT MANAGEMENT FEATURES
        # ==========================================
        self.register_feature(FeatureDefinition(
            feature_id="project_view",
            feature_name="View Projects",
            resource_type="project",
            component_path="pages/ProjectsPage",
            api_endpoints=["/api/v1/projects/"],
            required_actions=["read"],
            description="View project information and status"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="project_edit",
            feature_name="Edit Projects",
            resource_type="project",
            component_path="pages/ProjectsPage",
            api_endpoints=["/api/v1/projects/{id}/"],
            required_actions=["update"],
            description="Modify project details and configurations"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="project_create",
            feature_name="Create Projects",
            resource_type="project",
            component_path="pages/ProjectsPage",
            api_endpoints=["/api/v1/projects/"],
            required_actions=["create"],
            description="Create new projects and initiatives"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="project_team_manage",
            feature_name="Manage Project Teams",
            resource_type="project",
            component_path="pages/ProjectsPage",
            api_endpoints=["/api/v1/team-members/"],
            required_actions=["update"],
            description="Add and manage project team members"
        ))

        # ==========================================
        # TASK MANAGEMENT FEATURES
        # ==========================================
        self.register_feature(FeatureDefinition(
            feature_id="task_view",
            feature_name="View Tasks",
            resource_type="task",
            component_path="pages/TasksPage",
            api_endpoints=["/api/v1/tasks/"],
            required_actions=["read"],
            description="View task lists and details"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="task_edit",
            feature_name="Edit Tasks",
            resource_type="task",
            component_path="pages/TasksPage",
            api_endpoints=["/api/v1/tasks/{id}/"],
            required_actions=["update"],
            description="Modify task details and status"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="task_create",
            feature_name="Create Tasks",
            resource_type="task",
            component_path="pages/TasksPage",
            api_endpoints=["/api/v1/tasks/"],
            required_actions=["create"],
            description="Create new tasks and assignments"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="task_assign",
            feature_name="Assign Tasks",
            resource_type="task",
            component_path="pages/TasksPage",
            api_endpoints=["/api/v1/tasks/{id}/assign/"],
            required_actions=["update"],
            description="Assign tasks to team members"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="task_comment",
            feature_name="Comment on Tasks",
            resource_type="task",
            component_path="pages/TasksPage",
            api_endpoints=["/api/v1/task-comments/"],
            required_actions=["create"],
            description="Add comments and updates to tasks"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="task_template",
            feature_name="Manage Task Templates",
            resource_type="task",
            component_path="pages/TasksPage",
            api_endpoints=["/api/v1/task-templates/"],
            required_actions=["update"],
            description="Create and manage task templates"
        ))

        # ==========================================
        # RBAC MANAGEMENT FEATURES
        # ==========================================
        self.register_feature(FeatureDefinition(
            feature_id="rbac_permissions_view",
            feature_name="View RBAC Permissions",
            resource_type="rbac",
            component_path="pages/ComprehensivePermissionDashboard",
            api_endpoints=["/api/v1/tenants/rbac/groups/comprehensive_dashboard/"],
            required_actions=["read"],
            description="View permission system dashboard"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_permissions_create",
            feature_name="Create RBAC Permissions",
            resource_type="rbac",
            component_path="pages/PermissionRegistryPage",
            api_endpoints=["/api/v1/tenants/rbac/permissions/"],
            required_actions=["create"],
            description="Create new permissions in the system"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_permissions_edit",
            feature_name="Edit RBAC Permissions", 
            resource_type="rbac",
            component_path="pages/PermissionRegistryPage",
            api_endpoints=["/api/v1/tenants/rbac/permissions/"],
            required_actions=["update"],
            description="Edit existing permissions"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_permissions_delete",
            feature_name="Delete RBAC Permissions",
            resource_type="rbac", 
            component_path="pages/PermissionRegistryPage",
            api_endpoints=["/api/v1/tenants/rbac/permissions/"],
            required_actions=["delete"],
            description="Delete permissions from the system"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_permissions_grant",
            feature_name="Grant Permissions",
            resource_type="rbac",
            component_path="pages/ComprehensivePermissionDashboard", 
            api_endpoints=["/api/v1/tenants/rbac/groups/bulk_grant/"],
            required_actions=["update"],
            description="Grant permissions to users, groups, or designations"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_permissions_revoke",
            feature_name="Revoke Permissions",
            resource_type="rbac",
            component_path="pages/ComprehensivePermissionDashboard",
            api_endpoints=["/api/v1/tenants/rbac/groups/bulk_revoke/"],
            required_actions=["update"],
            description="Revoke permissions from users, groups, or designations"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_audit_trail",
            feature_name="View Audit Trail",
            resource_type="rbac",
            component_path="pages/ComprehensivePermissionDashboard",
            api_endpoints=["/api/v1/tenants/rbac/audit/"],
            required_actions=["read"],
            description="View audit logs for permission changes"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_groups_manage", 
            feature_name="Manage Permission Groups",
            resource_type="rbac",
            component_path="pages/PermissionGroupsPage",
            api_endpoints=["/api/v1/tenants/rbac/groups/"],
            required_actions=["update"],
            description="Create and manage permission groups"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_designations_manage",
            feature_name="Manage Designation Permissions", 
            resource_type="rbac",
            component_path="pages/DesignationPermissionPage",
            api_endpoints=["/api/v1/tenants/rbac/designations/"],
            required_actions=["update"],
            description="Manage permissions assigned to designations"
        ))
    
    def register_feature(self, feature: FeatureDefinition):
        """Register a new feature"""
        self._features[feature.feature_id] = feature
    
    def get_features_for_resource_type(self, resource_type: str) -> List[FeatureDefinition]:
        """Get all features for a specific resource type"""
        return [feature for feature in self._features.values() if feature.resource_type == resource_type]
    
    def user_has_resource_access(self, user_permissions: Dict, resource_type: str, required_actions: List[str] = None) -> bool:
        """
        Check if user has access to a resource type with specific actions
        
        Args:
            user_permissions: Dict of user's permissions from RBAC service
            resource_type: The resource type to check (e.g., 'vendor', 'user', etc.)
            required_actions: List of actions needed (e.g., ['read', 'create'])
        
        Returns:
            bool: True if user has access, False otherwise
        """
        if required_actions is None:
            required_actions = ["read"]  # Default to read access
            
        # Get all permissions for this resource type
        from apps.tenants.models import PermissionRegistry
        resource_permissions = PermissionRegistry.objects.filter(
            resource_type=resource_type,
            is_active=True
        )
        
        # Check if user has any permission with required actions
        for perm in resource_permissions:
            perm_code = perm.permission_code
            if perm_code in user_permissions:
                # Get actions for this permission's business template
                user_actions = BUSINESS_TEMPLATE_ACTIONS.get(perm.business_template, [])
                
                # Check if user's actions cover all required actions
                if all(action in user_actions for action in required_actions):
                    return True
        
        return False
    
    def get_features_user_can_access(self, user_permissions: Dict, resource_type: str = None) -> List[FeatureDefinition]:
        """
        Get all features a user can access based on their permissions
        
        Args:
            user_permissions: Dict of user's permissions from RBAC service
            resource_type: Optional filter by resource type
        
        Returns:
            List of features the user can access
        """
        accessible_features = []
        
        features_to_check = self._features.values()
        if resource_type:
            features_to_check = self.get_features_for_resource_type(resource_type)
        
        for feature in features_to_check:
            if self.user_has_resource_access(user_permissions, feature.resource_type, feature.required_actions):
                accessible_features.append(feature)
        
        return accessible_features
    
    def get_features_for_permission(self, permission_code: str) -> List[FeatureDefinition]:
        """Get all features controlled by a permission"""
        if permission_code not in self._permission_mappings:
            return []
        
        mapping = self._permission_mappings[permission_code]
        return [self._features[fid] for fid in mapping.feature_ids if fid in self._features]
    
    def get_permissions_for_resource(self, resource_type: str) -> List[str]:
        """Get all permission codes for a resource type"""
        return [
            mapping.permission_code 
            for mapping in self._permission_mappings.values()
            if mapping.resource_type == resource_type
        ]
    
    def get_api_endpoints_for_permission(self, permission_code: str) -> List[str]:
        """Get API endpoints that require a specific permission"""
        features = self.get_features_for_permission(permission_code)
        endpoints = []
        for feature in features:
            endpoints.extend(feature.api_endpoints)
        return endpoints
    
    def get_frontend_components_for_permission(self, permission_code: str) -> List[str]:
        """Get frontend components that should check for a permission"""
        features = self.get_features_for_permission(permission_code)
        return [feature.component_path for feature in features]
    
    def is_permission_mapped(self, permission_code: str) -> bool:
        """Check if a permission is mapped to any features"""
        return permission_code in self._permission_mappings
    
    def get_resource_types(self) -> List[str]:
        """Get all available resource types"""
        return list(set(mapping.resource_type for mapping in self._permission_mappings.values()))
    
    def get_unmapped_permissions(self, all_permissions: List[str]) -> List[str]:
        """Find permissions that aren't mapped to any features"""
        return [perm for perm in all_permissions if not self.is_permission_mapped(perm)]

# Global registry instance
feature_registry = FeatureRegistry()

def get_feature_registry() -> FeatureRegistry:
    """Get the global feature registry instance"""
    return feature_registry
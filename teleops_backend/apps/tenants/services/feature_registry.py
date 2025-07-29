"""
Feature Registry Service
Maps permissions to actual application functionality
"""

from typing import Dict, List, Set
from dataclasses import dataclass
from django.conf import settings

@dataclass
class FeatureDefinition:
    """Defines a specific application feature"""
    feature_id: str
    feature_name: str
    resource_type: str
    component_path: str  # Frontend component path
    api_endpoints: List[str]  # Backend API endpoints
    required_permissions: List[str]  # Permission codes needed
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
            required_permissions=["deviation.view"],
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
            required_permissions=["deviation.edit"],
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
            required_permissions=["deviation.create"],
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
            required_permissions=["deviation.approve"],
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
            required_permissions=["vendor_management.view_vendors"],
            description="View vendor information and relationships"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="vendor_edit",
            feature_name="Edit Vendors",
            resource_type="vendor",
            component_path="pages/VendorOperationsManagementPage",
            api_endpoints=["/api/v1/vendor-operations/{id}/", "/api/v1/circle-vendor-relationships/{id}/"],
            required_permissions=["vendor.edit", "vendor_management.edit_vendors"],
            description="Modify vendor information and contracts"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="vendor_create",
            feature_name="Create Vendors",
            resource_type="vendor",
            component_path="pages/VendorOperationsManagementPage",
            api_endpoints=["/api/v1/vendor-operations/", "/api/v1/circle-vendor-relationships/"],
            required_permissions=["vendor.create", "vendor_management.create_vendors"],
            description="Add new vendors and establish relationships"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="vendor_oversight",
            feature_name="Vendor Oversight",
            resource_type="vendor",
            component_path="pages/VendorOversightPage",
            api_endpoints=["/api/v1/vendor-operations/oversight/", "/api/v1/vendor-operations/analytics/"],
            required_permissions=["vendor.oversight", "vendor_management.oversight"],
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
            required_permissions=["user.view", "user_management.view_users"],
            description="View user profiles and information"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="user_edit",
            feature_name="Edit Users",
            resource_type="user",
            component_path="pages/CircleUserManagementPage",
            api_endpoints=["/api/v1/tenant/users/{id}/", "/api/v1/tenant/profile/"],
            required_permissions=["user.edit", "user_management.edit_users"],
            description="Modify user profiles and settings"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="user_create",
            feature_name="Create Users",
            resource_type="user",
            component_path="pages/CircleUserManagementPage",
            api_endpoints=["/api/v1/tenant/users/", "/api/v1/auth/register/"],
            required_permissions=["user.create", "user_management.create_users"],
            description="Add new users to the system"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="user_deactivate",
            feature_name="Deactivate Users",
            resource_type="user",
            component_path="pages/CircleUserManagementPage",
            api_endpoints=["/api/v1/tenant/users/{id}/deactivate/"],
            required_permissions=["user.deactivate", "user_management.deactivate_users"],
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
            required_permissions=["site_management.view_sites"],
            description="View site information and locations"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="site_edit",
            feature_name="Edit Sites",
            resource_type="site",
            component_path="pages/SitesPage",
            api_endpoints=["/api/v1/sites/{id}/"],
            required_permissions=["site_management.edit_sites"],
            description="Modify site details and configurations"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="site_create",
            feature_name="Create Sites",
            resource_type="site",
            component_path="pages/SitesPage",
            api_endpoints=["/api/v1/sites/"],
            required_permissions=["site_management.create_sites"],
            description="Add new sites to the system"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="site_bulk_upload",
            feature_name="Bulk Upload Sites",
            resource_type="site",
            component_path="pages/SitesPage",
            api_endpoints=["/api/v1/sites/bulk-upload/"],
            required_permissions=["site_management.bulk_operations", "site_management.bulk_upload_sites"],
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
            required_permissions=["project_management.view_projects"],
            description="View project information and status"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="project_edit",
            feature_name="Edit Projects",
            resource_type="project",
            component_path="pages/ProjectsPage",
            api_endpoints=["/api/v1/projects/{id}/"],
            required_permissions=["project_management.edit_projects", "project_management.archive_projects"],
            description="Modify project details and configurations"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="project_create",
            feature_name="Create Projects",
            resource_type="project",
            component_path="pages/ProjectsPage",
            api_endpoints=["/api/v1/projects/"],
            required_permissions=["project_management.create_projects"],
            description="Create new projects and initiatives"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="project_team_manage",
            feature_name="Manage Project Teams",
            resource_type="project",
            component_path="pages/ProjectsPage",
            api_endpoints=["/api/v1/team-members/"],
            required_permissions=["project_management.manage_teams"],
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
            required_permissions=["task_management.view_tasks"],
            description="View task lists and details"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="task_edit",
            feature_name="Edit Tasks",
            resource_type="task",
            component_path="pages/TasksPage",
            api_endpoints=["/api/v1/tasks/{id}/"],
            required_permissions=["task.edit", "task_management.edit_tasks", "task_management.update_status"],
            description="Modify task details and status"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="task_create",
            feature_name="Create Tasks",
            resource_type="task",
            component_path="pages/TasksPage",
            api_endpoints=["/api/v1/tasks/"],
            required_permissions=["task.create", "task_management.create_tasks"],
            description="Create new tasks and assignments"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="task_assign",
            feature_name="Assign Tasks",
            resource_type="task",
            component_path="pages/TasksPage",
            api_endpoints=["/api/v1/tasks/{id}/assign/"],
            required_permissions=["task.assign", "task_management.assign_tasks"],
            description="Assign tasks to team members"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="task_comment",
            feature_name="Comment on Tasks",
            resource_type="task",
            component_path="pages/TasksPage",
            api_endpoints=["/api/v1/task-comments/"],
            required_permissions=["task.comment", "task_management.comment"],
            description="Add comments and updates to tasks"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="task_template",
            feature_name="Manage Task Templates",
            resource_type="task",
            component_path="pages/TasksPage",
            api_endpoints=["/api/v1/task-templates/"],
            required_permissions=["task.manage_templates", "task_management.manage_templates"],
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
            required_permissions=["rbac_management.view_permissions"],
            description="View permission system dashboard"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_permissions_create",
            feature_name="Create RBAC Permissions",
            resource_type="rbac",
            component_path="pages/PermissionRegistryPage",
            api_endpoints=["/api/v1/tenants/rbac/permissions/"],
            required_permissions=["rbac_management.create_permissions"],
            description="Create new permissions in the system"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_permissions_edit",
            feature_name="Edit RBAC Permissions", 
            resource_type="rbac",
            component_path="pages/PermissionRegistryPage",
            api_endpoints=["/api/v1/tenants/rbac/permissions/"],
            required_permissions=["rbac_management.edit_permissions", "rbac_management.manage_permissions"],
            description="Edit existing permissions"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_permissions_delete",
            feature_name="Delete RBAC Permissions",
            resource_type="rbac", 
            component_path="pages/PermissionRegistryPage",
            api_endpoints=["/api/v1/tenants/rbac/permissions/"],
            required_permissions=["rbac_management.delete_permissions"],
            description="Delete permissions from the system"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_permissions_grant",
            feature_name="Grant Permissions",
            resource_type="rbac",
            component_path="pages/ComprehensivePermissionDashboard", 
            api_endpoints=["/api/v1/tenants/rbac/groups/bulk_grant/"],
            required_permissions=["rbac_management.grant_permissions"],
            description="Grant permissions to users, groups, or designations"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_permissions_revoke",
            feature_name="Revoke Permissions",
            resource_type="rbac",
            component_path="pages/ComprehensivePermissionDashboard",
            api_endpoints=["/api/v1/tenants/rbac/groups/bulk_revoke/"],
            required_permissions=["rbac_management.revoke_permissions"],
            description="Revoke permissions from users, groups, or designations"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_audit_trail",
            feature_name="View Audit Trail",
            resource_type="rbac",
            component_path="pages/ComprehensivePermissionDashboard",
            api_endpoints=["/api/v1/tenants/rbac/audit/"],
            required_permissions=["rbac_management.view_audit_trail"],
            description="View audit logs for permission changes"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_groups_manage", 
            feature_name="Manage Permission Groups",
            resource_type="rbac",
            component_path="pages/PermissionGroupsPage",
            api_endpoints=["/api/v1/tenants/rbac/groups/"],
            required_permissions=["rbac_management.manage_groups"],
            description="Create and manage permission groups"
        ))
        
        self.register_feature(FeatureDefinition(
            feature_id="rbac_designations_manage",
            feature_name="Manage Designation Permissions", 
            resource_type="rbac",
            component_path="pages/DesignationPermissionPage",
            api_endpoints=["/api/v1/tenants/rbac/designations/"],
            required_permissions=["rbac_management.manage_designations"],
            description="Manage permissions assigned to designations"
        ))
    
    def register_feature(self, feature: FeatureDefinition):
        """Register a new feature"""
        self._features[feature.feature_id] = feature
        
        # Create permission mappings
        for permission_code in feature.required_permissions:
            if permission_code not in self._permission_mappings:
                # Extract action from permission code (e.g., "deviation.edit" -> "edit")
                action = permission_code.split('.')[-1] if '.' in permission_code else 'unknown'
                
                self._permission_mappings[permission_code] = PermissionMapping(
                    permission_code=permission_code,
                    resource_type=feature.resource_type,
                    action_type=action,
                    feature_ids=[feature.feature_id]
                )
            else:
                # Add feature to existing mapping
                self._permission_mappings[permission_code].feature_ids.append(feature.feature_id)
    
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
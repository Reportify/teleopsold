"""
Tenant-scoped permissions for multi-tenant platform
"""

import logging
from rest_framework.permissions import BasePermission
from django.core.exceptions import PermissionDenied
from apps.tenants.models import Tenant

logger = logging.getLogger(__name__)


class TenantScopedPermission(BasePermission):
    """
    Permission class that ensures users can only access resources within their tenant scope.
    This is the foundation permission for multi-tenant isolation.
    """
    
    def has_permission(self, request, view):
        """Check if user has permission to access the resource"""
        if not request.user.is_authenticated:
            return False
        
        # Super users have access to all tenants
        if request.user.is_superuser:
            return True
        
        # Check if user has a tenant context
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            logger.warning(f"No tenant context found for user {request.user.email}")
            return False
        
        # Verify user belongs to this tenant
        if hasattr(request.user, 'tenant_user_profile'):
            profile = request.user.tenant_user_profile
            if profile and profile.tenant_id == tenant.id:
                return True
        
        # Check if user email matches tenant contact
        if tenant.primary_contact_email == request.user.email:
            return True
        
        logger.warning(f"User {request.user.email} does not belong to tenant {tenant.organization_name}")
        return False
    
    def has_object_permission(self, request, view, obj):
        """Check if user has permission to access specific object"""
        if not request.user.is_authenticated:
            return False
        
        # Super users have access to all objects
        if request.user.is_superuser:
            return True
        
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return False
        
        # Check if object belongs to user's tenant
        if hasattr(obj, 'tenant'):
            return obj.tenant.id == tenant.id
        
        # For objects without direct tenant relationship, check through related fields
        if hasattr(obj, 'project') and hasattr(obj.project, 'tenant'):
            return obj.project.tenant.id == tenant.id
        
        if hasattr(obj, 'site') and hasattr(obj.site, 'tenant'):
            return obj.site.tenant.id == tenant.id
        
        return False


class IsTenantAdmin(BasePermission):
    """Permission for tenant administrators"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Check if user has admin role in their tenant
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return False
        
        # Check if user is the primary contact (admin) for the tenant
        if tenant.primary_contact_email == request.user.email:
            return True
        
        # Check user permissions/designations for admin access
        if hasattr(request.user, 'tenant_user_profile'):
            profile = request.user.tenant_user_profile
            if profile and profile.tenant_id == tenant.id:
                # Check if user has admin designation or permissions
                designations = profile.all_designations
                for designation in designations:
                    if designation.can_manage_users or designation.approval_authority_level > 0:
                        return True
        
        return False


class IsTenantMember(BasePermission):
    """Permission for tenant members (any user within the tenant)"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return False
        
        # Check if user belongs to this tenant
        if hasattr(request.user, 'tenant_user_profile'):
            profile = request.user.tenant_user_profile
            if profile and profile.tenant_id == tenant.id and profile.is_active:
                return True
        
        # Check if user email matches tenant contact
        if tenant.primary_contact_email == request.user.email:
            return True
        
        return False


class CanViewRBACDashboard(BasePermission):
    """Permission for viewing RBAC dashboard - checks for rbac_management.view_permissions or admin access"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return False
        
        # Check if user is the primary contact (admin) for the tenant
        if tenant.primary_contact_email == request.user.email:
            return True
        
        # Check if user has specific RBAC view permission
        if hasattr(request.user, 'tenant_user_profile'):
            profile = request.user.tenant_user_profile
            if profile and profile.tenant_id == tenant.id:
                # Import here to avoid circular imports
                from apps.tenants.services import get_rbac_service
                
                rbac_service = get_rbac_service()
                has_view_permission = rbac_service.check_permission(
                    user=request.user,
                    tenant=tenant,
                    permission_code='rbac_management.view_permissions'
                )
                
                if has_view_permission:
                    return True
                
                # Also check if user has admin designation or permissions
                designations = profile.all_designations
                for designation in designations:
                    if designation.can_manage_users or designation.approval_authority_level > 0:
                        return True
        
        return False


class CrossTenantPermission(BasePermission):
    """
    Permission for cross-tenant operations (e.g., corporate accessing circles)
    Used for vendor relationships and corporate oversight
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Get user's primary tenant
        user_tenant = self._get_user_tenant(request.user)
        if not user_tenant:
            return False
        
        # Allow corporate tenants to access their circle tenants
        if user_tenant.tenant_type == 'Corporate':
            return True
        
        # Allow circle tenants to access vendor relationships
        if user_tenant.tenant_type == 'Circle':
            return True
        
        # Allow vendors to access their client relationships
        if user_tenant.tenant_type == 'Vendor':
            return True
        
        return False
    
    def _get_user_tenant(self, user):
        """Get user's primary tenant"""
        if hasattr(user, 'tenant_user_profile'):
            profile = user.tenant_user_profile
            if profile:
                return profile.tenant
        
        # Fallback: find tenant by email
        from apps.tenants.models import Tenant
        return Tenant.objects.filter(primary_contact_email=user.email).first()


class ProjectPermission(BasePermission):
    """Permission class specifically for project operations"""
    
    def has_permission(self, request, view):
        # First check basic tenant scope
        tenant_permission = TenantScopedPermission()
        if not tenant_permission.has_permission(request, view):
            return False
        
        # Check specific project permissions
        if view.action in ['create']:
            return self._can_create_projects(request)
        elif view.action in ['update', 'partial_update', 'destroy']:
            return self._can_manage_projects(request)
        elif view.action in ['list', 'retrieve']:
            return self._can_view_projects(request)
        
        return True
    
    def _can_create_projects(self, request):
        """Check if user can create projects"""
        if request.user.is_superuser:
            return True
        
        # Check user designations and permissions
        if hasattr(request.user, 'tenant_user_profile'):
            profile = request.user.tenant_user_profile
            if profile:
                designations = profile.all_designations
                for designation in designations:
                    if designation.can_create_projects:
                        return True
        
        return False
    
    def _can_manage_projects(self, request):
        """Check if user can manage projects"""
        if request.user.is_superuser:
            return True
        
        # Check user designations and permissions
        if hasattr(request.user, 'tenant_user_profile'):
            profile = request.user.tenant_user_profile
            if profile:
                designations = profile.all_designations
                for designation in designations:
                    if designation.can_create_projects or designation.can_manage_users:
                        return True
        
        return False
    
    def _can_view_projects(self, request):
        """Check if user can view projects"""
        # All tenant members can view projects
        return True
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions"""
        # First check tenant scope
        tenant_permission = TenantScopedPermission()
        if not tenant_permission.has_object_permission(request, view, obj):
            return False
        
        # Project managers and team members can always access their projects
        if obj.project_manager == request.user:
            return True
        
        if request.user in obj.team_members.all():
            return True
        
        return True  # Allow all tenant members to view projects


class TaskPermission(BasePermission):
    """Permission class specifically for task operations"""
    
    def has_permission(self, request, view):
        # First check basic tenant scope
        tenant_permission = TenantScopedPermission()
        if not tenant_permission.has_permission(request, view):
            return False
        
        # Check specific task permissions
        if view.action in ['create']:
            return self._can_create_tasks(request)
        elif view.action in ['update', 'partial_update', 'destroy']:
            return self._can_manage_tasks(request)
        elif view.action in ['list', 'retrieve']:
            return self._can_view_tasks(request)
        
        return True
    
    def _can_create_tasks(self, request):
        """Check if user can create tasks"""
        if request.user.is_superuser:
            return True
        
        # Check user designations and permissions
        if hasattr(request.user, 'tenant_user_profile'):
            profile = request.user.tenant_user_profile
            if profile:
                designations = profile.all_designations
                for designation in designations:
                    if designation.can_assign_tasks or designation.can_create_projects:
                        return True
        
        return False
    
    def _can_manage_tasks(self, request):
        """Check if user can manage tasks"""
        if request.user.is_superuser:
            return True
        
        # Check user designations and permissions
        if hasattr(request.user, 'tenant_user_profile'):
            profile = request.user.tenant_user_profile
            if profile:
                designations = profile.all_designations
                for designation in designations:
                    if designation.can_assign_tasks or designation.can_manage_users:
                        return True
        
        return False
    
    def _can_view_tasks(self, request):
        """Check if user can view tasks"""
        # All tenant members can view tasks
        return True
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions"""
        # First check tenant scope
        tenant_permission = TenantScopedPermission()
        if not tenant_permission.has_object_permission(request, view, obj):
            return False
        
        # Task assignees and supervisors can always access their tasks
        if obj.assigned_to == request.user:
            return True
        
        if obj.supervisor == request.user:
            return True
        
        if request.user in obj.assigned_team.all():
            return True
        
        # Project managers can access project tasks
        if obj.project and obj.project.project_manager == request.user:
            return True
        
        return True  # Allow all tenant members to view tasks


class SitePermission(BasePermission):
    """Permission class specifically for site operations"""
    
    def has_permission(self, request, view):
        # First check basic tenant scope
        tenant_permission = TenantScopedPermission()
        return tenant_permission.has_permission(request, view)
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions"""
        # First check tenant scope
        tenant_permission = TenantScopedPermission()
        return tenant_permission.has_object_permission(request, view, obj)


class EquipmentVerificationPermission(BasePermission):
    """Permission for equipment verification operations"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Check if user has equipment verification permissions
        if hasattr(request.user, 'tenant_user_profile'):
            profile = request.user.tenant_user_profile
            if profile:
                designations = profile.all_designations
                for designation in designations:
                    # Check if designation is field-capable and has verification permissions
                    if designation.designation_type == 'field':
                        return True
                    
                    # Check for supervisor or quality control roles
                    if 'supervisor' in designation.designation_name.lower():
                        return True
                    
                    if 'quality' in designation.designation_name.lower():
                        return True
        
        return False


class VendorRelationshipPermission(BasePermission):
    """Permission for vendor relationship management"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return False
        
        # Only Circle and Corporate tenants can manage vendor relationships
        if tenant.tenant_type in ['Circle', 'Corporate']:
            return True
        
        # Vendors can view their relationships but not create new ones
        if tenant.tenant_type == 'Vendor' and view.action in ['list', 'retrieve']:
            return True
        
        return False


class ReportingPermission(BasePermission):
    """Permission for accessing reports and analytics"""
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Check if user has reporting permissions
        if hasattr(request.user, 'tenant_user_profile'):
            profile = request.user.tenant_user_profile
            if profile:
                designations = profile.all_designations
                for designation in designations:
                    if designation.can_access_reports:
                        return True
                    
                    # Managers and supervisors typically have reporting access
                    if designation.can_manage_users or designation.approval_authority_level > 0:
                        return True
        
        return False 
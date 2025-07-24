"""
Tenant-scoped permissions for multi-tenant platform
"""

import logging
from rest_framework import permissions
from django.core.exceptions import PermissionDenied
from apps.tenants.models import Tenant

logger = logging.getLogger(__name__)


class TenantPermission(permissions.BasePermission):
    """
    Base permission class that requires tenant context
    """
    
    def has_permission(self, request, view):
        """
        Check if user has permission for the tenant
        """
        if not hasattr(request, 'tenant') or request.tenant is None:
            logger.warning("Tenant context required but not found")
            return False
        
        return self.check_tenant_permission(request, view)
    
    def check_tenant_permission(self, request, view):
        """
        Override this method to implement specific tenant permission logic
        """
        return True


class TenantObjectPermission(permissions.BasePermission):
    """
    Object-level permission class that requires tenant context
    """
    
    def has_permission(self, request, view):
        """
        Check if user has permission for the tenant
        """
        if not hasattr(request, 'tenant') or request.tenant is None:
            return False
        
        return True
    
    def has_object_permission(self, request, view, obj):
        """
        Check if user has permission for the specific object
        """
        if not hasattr(request, 'tenant') or request.tenant is None:
            return False
        
        return self.check_object_tenant_permission(request, view, obj)
    
    def check_object_tenant_permission(self, request, view, obj):
        """
        Override this method to implement specific object tenant permission logic
        """
        # Check if object belongs to the tenant
        if hasattr(obj, 'tenant'):
            return obj.tenant == request.tenant
        
        return True


class CorporatePermission(TenantPermission):
    """
    Permission class for corporate-level operations
    """
    
    def check_tenant_permission(self, request, view):
        """
        Check if user has corporate-level permissions
        """
        tenant = request.tenant
        
        # Only corporate tenants can access
        if tenant.tenant_type != 'CORPORATE':
            logger.warning(f"Corporate permission denied for tenant type: {tenant.tenant_type}")
            return False
        
        # Check user role within corporate
        return self.check_corporate_user_permission(request, view)
    
    def check_corporate_user_permission(self, request, view):
        """
        Check if user has appropriate corporate role
        """
        user = request.user
        
        # Super users have all permissions
        if user.is_superuser:
            return True
        
        # Check user's corporate role
        # This depends on your role/permission system
        return True


class CirclePermission(TenantPermission):
    """
    Permission class for circle-level operations
    """
    
    def check_tenant_permission(self, request, view):
        """
        Check if user has circle-level permissions
        """
        tenant = request.tenant
        
        # Only circle tenants can access
        if tenant.tenant_type != 'CIRCLE':
            logger.warning(f"Circle permission denied for tenant type: {tenant.tenant_type}")
            return False
        
        # Check user role within circle
        return self.check_circle_user_permission(request, view)
    
    def check_circle_user_permission(self, request, view):
        """
        Check if user has appropriate circle role
        """
        user = request.user
        
        # Super users have all permissions
        if user.is_superuser:
            return True
        
        # Check user's circle role
        # This depends on your role/permission system
        return True


class VendorPermission(TenantPermission):
    """
    Permission class for vendor-level operations
    """
    
    def check_tenant_permission(self, request, view):
        """
        Check if user has vendor-level permissions
        """
        tenant = request.tenant
        
        # Only vendor tenants can access
        if tenant.tenant_type != 'VENDOR':
            logger.warning(f"Vendor permission denied for tenant type: {tenant.tenant_type}")
            return False
        
        # Check user role within vendor
        return self.check_vendor_user_permission(request, view)
    
    def check_vendor_user_permission(self, request, view):
        """
        Check if user has appropriate vendor role
        """
        user = request.user
        
        # Super users have all permissions
        if user.is_superuser:
            return True
        
        # Check user's vendor role
        # This depends on your role/permission system
        return True


class CrossTenantPermission(TenantPermission):
    """
    Permission class for cross-tenant operations (e.g., corporate viewing circles)
    """
    
    def check_tenant_permission(self, request, view):
        """
        Check if user has cross-tenant permissions
        """
        user = request.user
        tenant = request.tenant
        
        # Super users have all permissions
        if user.is_superuser:
            return True
        
        # Corporate users can access their circles
        if tenant.tenant_type == 'Corporate':
            return self.check_corporate_cross_tenant_permission(request, view)
        
        # Circle users can access their vendor relationships
        if tenant.tenant_type == 'Circle':
            return self.check_circle_cross_tenant_permission(request, view)
        
        # Vendor users can access their circle relationships
        if tenant.tenant_type == 'Vendor':
            return self.check_vendor_cross_tenant_permission(request, view)
        
        return False
    
    def check_corporate_cross_tenant_permission(self, request, view):
        """
        Check if corporate user can access cross-tenant data
        """
        # Corporate users can access their circles
        return True
    
    def check_circle_cross_tenant_permission(self, request, view):
        """
        Check if circle user can access cross-tenant data
        """
        # Circle users can access their vendor relationships
        return True
    
    def check_vendor_cross_tenant_permission(self, request, view):
        """
        Check if vendor user can access cross-tenant data
        """
        # Vendor users can access their circle relationships
        return True


class TenantObjectPermission(TenantObjectPermission):
    """
    Object-level permission class for tenant-scoped objects
    """
    
    def check_object_tenant_permission(self, request, view, obj):
        """
        Check if object belongs to the tenant
        """
        tenant = request.tenant
        
        # Check if object has tenant field
        if hasattr(obj, 'tenant'):
            return obj.tenant == tenant
        
        # Check if object has project field (for project-scoped objects)
        if hasattr(obj, 'project') and hasattr(obj.project, 'tenant'):
            return obj.project.tenant == tenant
        
        # Check if object has site field (for site-scoped objects)
        if hasattr(obj, 'site') and hasattr(obj.site, 'project') and hasattr(obj.site.project, 'tenant'):
            return obj.site.project.tenant == tenant
        
        # Default to True for objects without tenant association
        return True


class RoleBasedPermission(TenantPermission):
    """
    Permission class based on user roles within tenant
    """
    
    required_roles = []
    required_permissions = []
    
    def check_tenant_permission(self, request, view):
        """
        Check if user has required roles and permissions
        """
        user = request.user
        tenant = request.tenant
        
        # Super users have all permissions
        if user.is_superuser:
            return True
        
        # Check user roles
        if self.required_roles and not self.has_required_roles(user, tenant):
            return False
        
        # Check user permissions
        if self.required_permissions and not self.has_required_permissions(user, tenant):
            return False
        
        return True
    
    def has_required_roles(self, user, tenant):
        """
        Check if user has required roles
        """
        # This depends on your role system
        # For now, return True
        return True
    
    def has_required_permissions(self, user, tenant):
        """
        Check if user has required permissions
        """
        # This depends on your permission system
        # For now, return True
        return True


class IsTenantOwner(TenantPermission):
    """
    Permission class for tenant owner operations
    """
    
    def check_tenant_permission(self, request, view):
        """
        Check if user is the tenant owner
        """
        user = request.user
        tenant = request.tenant
        
        # Super users have all permissions
        if user.is_superuser:
            return True
        
        # Check if user is tenant owner
        # This depends on your tenant ownership model
        return True


class IsTenantAdmin(TenantPermission):
    """
    Permission class for tenant admin operations
    """
    
    def check_tenant_permission(self, request, view):
        """
        Check if user is a tenant admin
        """
        user = request.user
        tenant = request.tenant
        
        # Super users have all permissions
        if user.is_superuser:
            return True
        
        # Check if user is tenant admin
        # This depends on your admin role system
        return True


class IsTenantMember(TenantPermission):
    """
    Permission class for tenant member operations
    """
    
    def check_tenant_permission(self, request, view):
        """
        Check if user is a member of the tenant
        """
        user = request.user
        tenant = request.tenant
        
        # Super users have all permissions
        if user.is_superuser:
            return True
        
        # Check if user belongs to this tenant
        try:
            from apps.tenants.models import TenantUserProfile
            profile = TenantUserProfile.objects.get(user=user, tenant=tenant, is_active=True)
            return True
        except TenantUserProfile.DoesNotExist:
            return False 
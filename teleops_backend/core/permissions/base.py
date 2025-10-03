"""
Base permission classes for Teleops Backend
"""

from rest_framework.permissions import BasePermission
from .tenant_permissions import TenantScopedPermission, IsTenantMember


class TenantBasedPermission(TenantScopedPermission):
    """
    Alias for TenantScopedPermission to maintain consistency
    across the application. This ensures users can only access
    resources within their tenant scope.
    """
    pass


class TeamPermission(BasePermission):
    """
    Permission class specifically for team operations
    """
    
    def has_permission(self, request, view):
        # First check basic tenant scope
        tenant_permission = TenantBasedPermission()
        if not tenant_permission.has_permission(request, view):
            return False
        
        # For team operations, any authenticated tenant member can view
        if view.action in ['list', 'retrieve', 'members', 'stats']:
            return True
        
        # For team creation and management, check if user can manage teams
        if view.action in ['create', 'update', 'partial_update', 'destroy', 
                          'add_member', 'remove_member', 'update_member_role', 'bulk_add_members']:
            return self._can_manage_teams(request)
        
        return True
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permissions for teams"""
        # First check tenant scope
        tenant_permission = TenantBasedPermission()
        if not tenant_permission.has_object_permission(request, view, obj):
            return False
        
        # Team leaders can manage their teams
        if hasattr(obj, 'teammember_set'):
            team_member = obj.teammember_set.filter(
                user=request.user, 
                role='leader'
            ).first()
            if team_member:
                return True
        
        # Check if user can manage teams in general
        return self._can_manage_teams(request)
    
    def _can_manage_teams(self, request):
        """Check if user can manage teams"""
        if request.user.is_superuser:
            return True
        
        # Check if user has team management permissions
        if hasattr(request.user, 'profile') and request.user.profile:
            profile = request.user.profile
            
            # Check if user has admin designation or permissions
            if hasattr(profile, 'all_designations'):
                designations = profile.all_designations
                for designation in designations:
                    if (designation.can_manage_users or 
                        designation.approval_authority_level > 0 or
                        'manager' in designation.designation_name.lower() or
                        'admin' in designation.designation_name.lower() or
                        'supervisor' in designation.designation_name.lower()):
                        return True
        
        # Check if user is a team leader of any team
        from apps.teams.models import TeamMember
        is_team_leader = TeamMember.objects.filter(
            user=request.user,
            role='leader'
        ).exists()
        
        return is_team_leader
"""
Simple, Stateless RBAC Service
A clean implementation that works reliably for both individual and batch operations.
"""

import logging
from typing import Dict, List, Any
from django.utils import timezone
from django.db.models import Q

from ..models import (
    Tenant, TenantUserProfile, PermissionRegistry, DesignationBasePermission,
    UserPermissionOverride, PermissionGroup, PermissionGroupPermission,
    UserPermissionGroupAssignment, TenantDesignation
)

logger = logging.getLogger(__name__)


class SimpleRBACService:
    """
    Simple, stateless RBAC service that always calculates permissions fresh.
    No caching, no state - just reliable permission calculation.
    """
    
    @staticmethod
    def get_user_permissions(user_profile: TenantUserProfile) -> Dict[str, Any]:
        """
        Get user permissions using simple, reliable logic.
        This is stateless and always calculates fresh.
        """
        
        # Check if user is administrator
        if SimpleRBACService._is_administrator(user_profile):
            return SimpleRBACService._get_all_permissions(user_profile.tenant)
        
        # Get permissions from all sources
        all_permissions = {}
        
        # 1. Get designation permissions
        designation_perms = SimpleRBACService._get_designation_permissions(user_profile)
        all_permissions.update(designation_perms)
        
        # 2. Get group permissions  
        group_perms = SimpleRBACService._get_group_permissions(user_profile)
        all_permissions.update(group_perms)
        
        # 3. Apply user overrides
        user_overrides = SimpleRBACService._get_user_overrides(user_profile)
        for perm_code, override_data in user_overrides.items():
            if override_data['override_type'] == 'restriction' and override_data['permission_level'] == 'denied':
                # Remove permission if explicitly denied
                all_permissions.pop(perm_code, None)
            else:
                # Add or modify permission
                all_permissions[perm_code] = override_data
        
        return {
            'permissions': all_permissions,
            'scope_limitations': {},
            'permission_summary': {
                'total_permissions': len(all_permissions),
                'designation_permissions': len(designation_perms),
                'group_permissions': len(group_perms),
                'user_overrides': len(user_overrides)
            },
            'metadata': {
                'calculation_time': timezone.now().isoformat(),
                'sources': {
                    'designation_count': len(designation_perms),
                    'group_count': len(group_perms),
                    'override_count': len(user_overrides)
                },
                'service_type': 'simple_rbac'
            }
        }
    
    @staticmethod
    def _is_administrator(user_profile: TenantUserProfile) -> bool:
        """Check if user is administrator."""
        return user_profile.designation_assignments.filter(
            is_active=True,
            designation__designation_code__icontains='admin'
        ).exists()
    
    @staticmethod
    def _get_all_permissions(tenant: Tenant) -> Dict[str, Any]:
        """Get all permissions for administrators."""
        all_permissions = {}
        
        permissions = PermissionRegistry.objects.filter(
            tenant=tenant,
            is_active=True
        )
        
        for permission in permissions:
            all_permissions[permission.permission_code] = {
                'permission': {
                    'id': permission.id,
                    'code': permission.permission_code,
                    'name': permission.permission_name,
                    'category': permission.permission_category,
                    'risk_level': permission.risk_level,
                    'is_active': permission.is_active
                },
                'level': 'granted',
                'source': 'administrator',
                'scope_configuration': {},
                'is_mandatory': True
            }
        
        return {
            'permissions': all_permissions,
            'scope_limitations': {},
            'permission_summary': {
                'total_permissions': len(all_permissions),
                'administrator_mode': True
            },
            'metadata': {
                'calculation_time': timezone.now().isoformat(),
                'administrator_bypass': True,
                'service_type': 'simple_rbac'
            }
        }
    
    @staticmethod
    def _get_designation_permissions(user_profile: TenantUserProfile) -> Dict[str, Any]:
        """Get permissions from user designations."""
        permissions = {}
        
        # Get active designation assignments
        assignments = user_profile.designation_assignments.filter(
            is_active=True,
            assignment_status='Active',
            effective_from__lte=timezone.now().date()
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=timezone.now().date())
        )
        
        for assignment in assignments:
            # Get permissions for this designation
            base_perms = DesignationBasePermission.objects.filter(
                designation=assignment.designation,
                is_active=True,
                permission__is_active=True,
                permission__tenant=user_profile.tenant
            ).select_related('permission')
            
            for base_perm in base_perms:
                permission = base_perm.permission
                permissions[permission.permission_code] = {
                    'permission': {
                        'id': permission.id,
                        'code': permission.permission_code,
                        'name': permission.permission_name,
                        'category': permission.permission_category,
                        'risk_level': permission.risk_level,
                        'is_active': permission.is_active
                    },
                    'level': base_perm.permission_level,
                    'source': f'designation_{assignment.designation.designation_code}',
                    'scope_configuration': base_perm.scope_configuration,
                    'is_mandatory': base_perm.is_mandatory
                }
        
        return permissions
    
    @staticmethod
    def _get_group_permissions(user_profile: TenantUserProfile) -> Dict[str, Any]:
        """Get permissions from permission groups."""
        permissions = {}
        
        # Get active group assignments
        group_assignments = user_profile.permission_group_assignments.filter(
            is_active=True,
            effective_from__lte=timezone.now()
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gt=timezone.now())
        )
        
        for assignment in group_assignments:
            # Get permissions for this group
            group_perms = assignment.group.group_permissions.filter(
                is_active=True,
                permission__is_active=True,
                permission__tenant=user_profile.tenant
            ).select_related('permission')
            
            for group_perm in group_perms:
                permission = group_perm.permission
                permissions[permission.permission_code] = {
                    'permission': {
                        'id': permission.id,
                        'code': permission.permission_code,
                        'name': permission.permission_name,
                        'category': permission.permission_category,
                        'risk_level': permission.risk_level,
                        'is_active': permission.is_active
                    },
                    'level': group_perm.permission_level,
                    'source': f'group_{assignment.group.group_name}',
                    'scope_configuration': group_perm.scope_configuration,
                    'is_mandatory': group_perm.is_mandatory
                }
        
        return permissions
    
    @staticmethod
    def _get_user_overrides(user_profile: TenantUserProfile) -> Dict[str, Any]:
        """Get user permission overrides."""
        overrides = {}
        
        # Get active user overrides
        user_overrides = user_profile.permission_overrides.filter(
            is_active=True,
            approval_status='approved',
            effective_from__lte=timezone.now()
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gt=timezone.now())
        ).select_related('permission')
        
        for override in user_overrides:
            permission = override.permission
            overrides[permission.permission_code] = {
                'permission': {
                    'id': permission.id,
                    'code': permission.permission_code,
                    'name': permission.permission_name,
                    'category': permission.permission_category,
                    'risk_level': permission.risk_level,
                    'is_active': permission.is_active
                },
                'override_type': override.override_type,
                'level': override.permission_level,
                'source': f'user_override',
                'scope_override': override.scope_override,
                'requires_mfa': override.requires_mfa
            }
        
        return overrides


def get_simple_rbac_service() -> SimpleRBACService:
    """Factory function for simple RBAC service."""
    return SimpleRBACService()
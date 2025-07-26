"""
Permission Management Service
Handles creation, modification, and management of permissions, groups, and assignments.
"""

import logging
from typing import Dict, List, Optional, Any
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from ..models import (
    Tenant, TenantUserProfile, PermissionRegistry, PermissionGroup,
    PermissionGroupPermission, UserPermissionGroupAssignment,
    UserPermissionOverride, DesignationBasePermission,
    PermissionAuditTrail, TenantDesignation
)
from .rbac_service import TenantRBACService

User = get_user_model()
logger = logging.getLogger(__name__)


class PermissionManagementService:
    """
    Service for managing tenant permissions, groups, and assignments.
    
    Provides high-level methods for permission management that can be used
    by APIs and administrative interfaces.
    """
    
    def __init__(self, tenant: Tenant, admin_user: User):
        self.tenant = tenant
        self.admin_user = admin_user
        self.rbac_service = TenantRBACService(tenant)
    
    # === Permission Registry Management ===
    
    def create_permission(self, permission_data: Dict[str, Any]) -> PermissionRegistry:
        """
        Create a new permission in the tenant's registry.
        
        Args:
            permission_data: Dict containing permission details
            
        Returns:
            Created PermissionRegistry instance
        """
        try:
            with transaction.atomic():
                # Validate permission data
                self._validate_permission_data(permission_data)
                
                # Check for duplicates
                if PermissionRegistry.objects.filter(
                    tenant=self.tenant,
                    permission_code=permission_data['permission_code']
                ).exists():
                    raise ValidationError(f"Permission with code '{permission_data['permission_code']}' already exists")
                
                # Create permission
                permission = PermissionRegistry.objects.create(
                    tenant=self.tenant,
                    created_by=self.admin_user,
                    **permission_data
                )
                
                # Log creation
                self._log_permission_action(
                    'create_permission',
                    permission.id,
                    {'permission_code': permission.permission_code}
                )
                
                logger.info(f"Created permission {permission.permission_code} for tenant {self.tenant.id}")
                return permission
                
        except Exception as e:
            logger.error(f"Error creating permission: {str(e)}")
            raise
    
    def update_permission(self, permission_id: int, update_data: Dict[str, Any]) -> PermissionRegistry:
        """Update an existing permission."""
        try:
            with transaction.atomic():
                permission = PermissionRegistry.objects.get(
                    id=permission_id,
                    tenant=self.tenant
                )
                
                # Validate update data
                if 'permission_code' in update_data:
                    self._validate_permission_code_unique(
                        update_data['permission_code'], 
                        exclude_id=permission_id
                    )
                
                # Store old values for audit
                old_values = {
                    'permission_name': permission.permission_name,
                    'permission_code': permission.permission_code,
                    'is_active': permission.is_active
                }
                
                # Update fields
                for field, value in update_data.items():
                    if hasattr(permission, field):
                        setattr(permission, field, value)
                
                permission.save()
                
                # Log update
                self._log_permission_action(
                    'update_permission',
                    permission.id,
                    {'old_values': old_values, 'new_values': update_data}
                )
                
                # Invalidate caches if permission was deactivated
                if 'is_active' in update_data and not update_data['is_active']:
                    self.rbac_service.invalidate_tenant_permissions()
                
                return permission
                
        except PermissionRegistry.DoesNotExist:
            raise ValidationError("Permission not found")
        except Exception as e:
            logger.error(f"Error updating permission: {str(e)}")
            raise
    
    def delete_permission(self, permission_id: int) -> bool:
        """
        Soft delete a permission (deactivate it).
        
        Args:
            permission_id: ID of permission to delete
            
        Returns:
            True if successful
        """
        try:
            with transaction.atomic():
                permission = PermissionRegistry.objects.get(
                    id=permission_id,
                    tenant=self.tenant
                )
                
                # Check if permission is in use
                usage_count = self._get_permission_usage_count(permission)
                if usage_count > 0:
                    raise ValidationError(
                        f"Cannot delete permission '{permission.permission_code}' - "
                        f"it is assigned to {usage_count} entities"
                    )
                
                # Soft delete (deactivate)
                permission.is_active = False
                permission.save()
                
                # Log deletion
                self._log_permission_action(
                    'delete_permission',
                    permission.id,
                    {'permission_code': permission.permission_code}
                )
                
                # Invalidate caches
                self.rbac_service.invalidate_tenant_permissions()
                
                return True
                
        except PermissionRegistry.DoesNotExist:
            raise ValidationError("Permission not found")
        except Exception as e:
            logger.error(f"Error deleting permission: {str(e)}")
            raise
    
    # === Permission Group Management ===
    
    def create_permission_group(self, group_data: Dict[str, Any]) -> PermissionGroup:
        """Create a new permission group."""
        try:
            with transaction.atomic():
                # Validate group data
                self._validate_group_data(group_data)
                
                # Check for duplicates
                if PermissionGroup.objects.filter(
                    tenant=self.tenant,
                    group_code=group_data['group_code']
                ).exists():
                    raise ValidationError(f"Group with code '{group_data['group_code']}' already exists")
                
                # Create group
                group = PermissionGroup.objects.create(
                    tenant=self.tenant,
                    created_by=self.admin_user,
                    **group_data
                )
                
                # Log creation
                self._log_permission_action(
                    'create_group',
                    group.id,
                    {'group_code': group.group_code}
                )
                
                return group
                
        except Exception as e:
            logger.error(f"Error creating permission group: {str(e)}")
            raise
    
    def assign_permissions_to_group(
        self, 
        group_id: int, 
        permission_assignments: List[Dict[str, Any]]
    ) -> List[PermissionGroupPermission]:
        """
        Assign multiple permissions to a group.
        
        Args:
            group_id: ID of the permission group
            permission_assignments: List of permission assignment data
            
        Returns:
            List of created PermissionGroupPermission instances
        """
        try:
            with transaction.atomic():
                group = PermissionGroup.objects.get(
                    id=group_id,
                    tenant=self.tenant
                )
                
                created_assignments = []
                
                for assignment_data in permission_assignments:
                    permission_id = assignment_data['permission_id']
                    
                    # Check if permission belongs to tenant
                    permission = PermissionRegistry.objects.get(
                        id=permission_id,
                        tenant=self.tenant,
                        is_active=True
                    )
                    
                    # Check if assignment already exists
                    existing = PermissionGroupPermission.objects.filter(
                        group=group,
                        permission=permission
                    ).first()
                    
                    if not existing:
                        assignment = PermissionGroupPermission.objects.create(
                            group=group,
                            permission=permission,
                            added_by=self.admin_user,
                            permission_level=assignment_data.get('permission_level', 'granted'),
                            scope_configuration=assignment_data.get('scope_configuration', {}),
                            is_mandatory=assignment_data.get('is_mandatory', False)
                        )
                        created_assignments.append(assignment)
                
                # Log group update
                self._log_permission_action(
                    'assign_permissions_to_group',
                    group.id,
                    {
                        'group_code': group.group_code,
                        'assigned_permissions': [a.permission.permission_code for a in created_assignments]
                    }
                )
                
                # Invalidate caches for users in this group
                self._invalidate_group_user_caches(group)
                
                return created_assignments
                
        except PermissionGroup.DoesNotExist:
            raise ValidationError("Permission group not found")
        except PermissionRegistry.DoesNotExist:
            raise ValidationError("One or more permissions not found")
        except Exception as e:
            logger.error(f"Error assigning permissions to group: {str(e)}")
            raise
    
    def assign_user_to_group(
        self, 
        user_profile_id: int, 
        group_id: int,
        assignment_data: Optional[Dict[str, Any]] = None
    ) -> UserPermissionGroupAssignment:
        """Assign a user to a permission group."""
        try:
            with transaction.atomic():
                user_profile = TenantUserProfile.objects.get(
                    id=user_profile_id,
                    tenant=self.tenant
                )
                
                group = PermissionGroup.objects.get(
                    id=group_id,
                    tenant=self.tenant,
                    is_active=True
                )
                
                # Check if assignment already exists
                existing = UserPermissionGroupAssignment.objects.filter(
                    user_profile=user_profile,
                    group=group,
                    is_active=True
                ).first()
                
                if existing:
                    raise ValidationError("User is already assigned to this group")
                
                # Create assignment
                assignment = UserPermissionGroupAssignment.objects.create(
                    user_profile=user_profile,
                    group=group,
                    assigned_by=self.admin_user,
                    assignment_reason=assignment_data.get('assignment_reason', '') if assignment_data else '',
                    scope_override=assignment_data.get('scope_override', {}) if assignment_data else {},
                    effective_from=assignment_data.get('effective_from', timezone.now()) if assignment_data else timezone.now(),
                    effective_to=assignment_data.get('effective_to') if assignment_data else None,
                    is_temporary=assignment_data.get('is_temporary', False) if assignment_data else False
                )
                
                # Log assignment
                self._log_permission_action(
                    'assign_user_to_group',
                    group.id,
                    {
                        'user_id': user_profile.user.id,
                        'group_code': group.group_code,
                        'assignment_reason': assignment.assignment_reason
                    }
                )
                
                # Invalidate user's permission cache
                self.rbac_service.invalidate_user_permissions(user_profile)
                
                return assignment
                
        except (TenantUserProfile.DoesNotExist, PermissionGroup.DoesNotExist):
            raise ValidationError("User profile or group not found")
        except Exception as e:
            logger.error(f"Error assigning user to group: {str(e)}")
            raise
    
    # === User Permission Override Management ===
    
    def create_user_permission_override(
        self, 
        user_profile_id: int, 
        override_data: Dict[str, Any]
    ) -> UserPermissionOverride:
        """Create a user-specific permission override."""
        try:
            with transaction.atomic():
                user_profile = TenantUserProfile.objects.get(
                    id=user_profile_id,
                    tenant=self.tenant
                )
                
                permission = PermissionRegistry.objects.get(
                    id=override_data['permission_id'],
                    tenant=self.tenant,
                    is_active=True
                )
                
                # Check for existing override
                existing = UserPermissionOverride.objects.filter(
                    user_profile=user_profile,
                    permission=permission,
                    override_type=override_data['override_type'],
                    is_active=True
                ).first()
                
                if existing:
                    raise ValidationError("Similar override already exists for this user and permission")
                
                # Create override
                override = UserPermissionOverride.objects.create(
                    user_profile=user_profile,
                    permission=permission,
                    granted_by=self.admin_user,
                    override_type=override_data['override_type'],
                    permission_level=override_data.get('permission_level', 'granted'),
                    override_reason=override_data.get('override_reason', ''),
                    business_justification=override_data.get('business_justification', ''),
                    scope_override=override_data.get('scope_override', {}),
                    geographic_scope_override=override_data.get('geographic_scope_override', []),
                    functional_scope_override=override_data.get('functional_scope_override', []),
                    temporal_scope_override=override_data.get('temporal_scope_override', {}),
                    conditions=override_data.get('conditions', {}),
                    approval_required=override_data.get('approval_required', False),
                    requires_mfa=override_data.get('requires_mfa', False),
                    effective_from=override_data.get('effective_from', timezone.now()),
                    effective_to=override_data.get('effective_to'),
                    is_temporary=override_data.get('is_temporary', False),
                    auto_expire=override_data.get('auto_expire', False),
                    approval_status='approved'  # Auto-approve for now, can add workflow later
                )
                
                # Log override creation
                self._log_permission_action(
                    'create_user_override',
                    permission.id,
                    {
                        'user_id': user_profile.user.id,
                        'permission_code': permission.permission_code,
                        'override_type': override.override_type,
                        'override_reason': override.override_reason
                    }
                )
                
                # Invalidate user's permission cache
                self.rbac_service.invalidate_user_permissions(user_profile)
                
                return override
                
        except (TenantUserProfile.DoesNotExist, PermissionRegistry.DoesNotExist):
            raise ValidationError("User profile or permission not found")
        except Exception as e:
            logger.error(f"Error creating user permission override: {str(e)}")
            raise
    
    # === Designation Permission Management ===
    
    def assign_permissions_to_designation(
        self, 
        designation_id: int, 
        permission_assignments: List[Dict[str, Any]]
    ) -> List[DesignationBasePermission]:
        """Assign permissions to a designation."""
        try:
            with transaction.atomic():
                designation = TenantDesignation.objects.get(
                    id=designation_id,
                    tenant=self.tenant
                )
                
                created_assignments = []
                
                for assignment_data in permission_assignments:
                    permission_id = assignment_data['permission_id']
                    
                    permission = PermissionRegistry.objects.get(
                        id=permission_id,
                        tenant=self.tenant,
                        is_active=True
                    )
                    
                    # Check if assignment already exists
                    existing = DesignationBasePermission.objects.filter(
                        designation=designation,
                        permission=permission
                    ).first()
                    
                    if not existing:
                        assignment = DesignationBasePermission.objects.create(
                            designation=designation,
                            permission=permission,
                            granted_by=self.admin_user,
                            permission_level=assignment_data.get('permission_level', 'granted'),
                            scope_configuration=assignment_data.get('scope_configuration', {}),
                            geographic_scope=assignment_data.get('geographic_scope', []),
                            functional_scope=assignment_data.get('functional_scope', []),
                            temporal_scope=assignment_data.get('temporal_scope', {}),
                            conditions=assignment_data.get('conditions', {}),
                            is_inherited=assignment_data.get('is_inherited', True),
                            is_mandatory=assignment_data.get('is_mandatory', False),
                            priority_level=assignment_data.get('priority_level', 0)
                        )
                        created_assignments.append(assignment)
                
                # Log designation update
                self._log_permission_action(
                    'assign_permissions_to_designation',
                    designation.id,
                    {
                        'designation_name': designation.designation_name,
                        'assigned_permissions': [a.permission.permission_code for a in created_assignments]
                    }
                )
                
                # Invalidate caches for users with this designation
                self._invalidate_designation_user_caches(designation)
                
                return created_assignments
                
        except TenantDesignation.DoesNotExist:
            raise ValidationError("Designation not found")
        except PermissionRegistry.DoesNotExist:
            raise ValidationError("One or more permissions not found")
        except Exception as e:
            logger.error(f"Error assigning permissions to designation: {str(e)}")
            raise
    
    # === Helper Methods ===
    
    def _validate_permission_data(self, data: Dict[str, Any]):
        """Validate permission creation data."""
        required_fields = ['permission_name', 'permission_code', 'permission_category']
        
        for field in required_fields:
            if field not in data or not data[field]:
                raise ValidationError(f"Field '{field}' is required")
        
        # Validate permission code format
        if not data['permission_code'].replace('_', '').replace('.', '').isalnum():
            raise ValidationError("Permission code must contain only letters, numbers, underscores, and dots")
    
    def _validate_group_data(self, data: Dict[str, Any]):
        """Validate permission group creation data."""
        required_fields = ['group_name', 'group_code']
        
        for field in required_fields:
            if field not in data or not data[field]:
                raise ValidationError(f"Field '{field}' is required")
    
    def _validate_permission_code_unique(self, permission_code: str, exclude_id: Optional[int] = None):
        """Validate that permission code is unique within tenant."""
        query = PermissionRegistry.objects.filter(
            tenant=self.tenant,
            permission_code=permission_code
        )
        
        if exclude_id:
            query = query.exclude(id=exclude_id)
        
        if query.exists():
            raise ValidationError(f"Permission code '{permission_code}' already exists")
    
    def _get_permission_usage_count(self, permission: PermissionRegistry) -> int:
        """Get count of how many places this permission is used."""
        usage_count = 0
        
        # Count designation assignments
        usage_count += DesignationBasePermission.objects.filter(
            permission=permission,
            is_active=True
        ).count()
        
        # Count group assignments
        usage_count += PermissionGroupPermission.objects.filter(
            permission=permission,
            is_active=True
        ).count()
        
        # Count user overrides
        usage_count += UserPermissionOverride.objects.filter(
            permission=permission,
            is_active=True
        ).count()
        
        return usage_count
    
    def _invalidate_group_user_caches(self, group: PermissionGroup):
        """Invalidate permission caches for all users in a group."""
        user_profiles = TenantUserProfile.objects.filter(
            permission_group_assignments__group=group,
            permission_group_assignments__is_active=True
        ).distinct()
        
        for user_profile in user_profiles:
            self.rbac_service.invalidate_user_permissions(user_profile)
    
    def _invalidate_designation_user_caches(self, designation: TenantDesignation):
        """Invalidate permission caches for all users with a designation."""
        user_profiles = TenantUserProfile.objects.filter(
            designation_assignments__designation=designation,
            designation_assignments__is_active=True
        ).distinct()
        
        for user_profile in user_profiles:
            self.rbac_service.invalidate_user_permissions(user_profile)
    
    def _log_permission_action(self, action: str, entity_id: int, details: Dict[str, Any]):
        """Log permission management action to audit trail."""
        try:
            PermissionAuditTrail.objects.create(
                tenant=self.tenant,
                entity_type='permission_management',
                entity_id=str(entity_id),
                action=action,
                details=details,
                performed_by=self.admin_user,
                performed_at=timezone.now()
            )
        except Exception as e:
            logger.error(f"Error logging permission action: {str(e)}")


# === Utility Functions ===

def get_permission_management_service(tenant: Tenant, admin_user: User) -> PermissionManagementService:
    """Factory function to get permission management service."""
    return PermissionManagementService(tenant, admin_user) 
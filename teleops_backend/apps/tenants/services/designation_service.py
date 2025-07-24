"""
Designation Management Service

This service handles all business logic for tenant-driven designation management,
including creation, hierarchy management, permission assignment, and user assignments.
"""

from django.db import models, transaction
from django.core.exceptions import ValidationError, PermissionDenied
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date, datetime
from typing import Dict, List, Optional, Any, Union
import logging

from ..models import (
    Tenant, 
    TenantDesignation, 
    PermissionCategory, 
    CustomPermission, 
    DesignationPermission,
    UserDesignationAssignment, 
    TenantUserProfile, 
    DesignationTemplate
)

logger = logging.getLogger(__name__)


class DesignationService:
    """
    Core business logic service for tenant-driven designation management.
    
    This service provides complete tenant autonomy in creating and managing
    organizational hierarchies, permissions, and user assignments.
    """

    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")

    # ========================================================================
    # Designation Management
    # ========================================================================

    @transaction.atomic
    def create_designation(
        self, 
        tenant_id: str, 
        designation_data: Dict[str, Any], 
        creating_user: User
    ) -> TenantDesignation:
        """
        Create a new tenant-specific designation.
        
        Args:
            tenant_id: UUID of the tenant
            designation_data: Dictionary containing designation configuration
            creating_user: User creating the designation
            
        Returns:
            Created TenantDesignation instance
            
        Raises:
            ValidationError: If designation data is invalid
            PermissionDenied: If user lacks permission to create designations
        """
        # Validate user permissions
        if not self._can_manage_designations(creating_user, tenant_id):
            raise PermissionDenied("Insufficient permissions to create designations")

        # Validate designation data
        self._validate_designation_data(designation_data, tenant_id)

        # Validate hierarchy if parent specified
        if designation_data.get('parent_designation_id'):
            self._validate_hierarchy_assignment(
                designation_data['parent_designation_id'],
                designation_data['designation_level'],
                tenant_id
            )

        try:
            # Create designation
            designation = TenantDesignation.objects.create(
                tenant_id=tenant_id,
                designation_name=designation_data['designation_name'],
                designation_code=designation_data['designation_code'],
                designation_level=designation_data['designation_level'],
                department=designation_data.get('department'),
                description=designation_data.get('description'),
                parent_designation_id=designation_data.get('parent_designation_id'),
                can_manage_subordinates=designation_data.get('can_manage_subordinates', False),
                approval_authority_level=designation_data.get('approval_authority_level', 0),
                delegation_allowed=designation_data.get('delegation_allowed', False),
                max_subordinates=designation_data.get('max_subordinates'),
                permissions=designation_data.get('permissions', []),
                feature_access=designation_data.get('feature_access', {}),
                data_access_level=designation_data.get('data_access_level', 'View_Only'),
                custom_capabilities=designation_data.get('custom_capabilities', {}),
                geographic_scope=designation_data.get('geographic_scope', []),
                functional_scope=designation_data.get('functional_scope', []),
                cross_functional_access=designation_data.get('cross_functional_access', False),
                multi_location_access=designation_data.get('multi_location_access', False),
                can_manage_users=designation_data.get('can_manage_users', False),
                can_create_projects=designation_data.get('can_create_projects', False),
                can_assign_tasks=designation_data.get('can_assign_tasks', False),
                can_approve_expenses=designation_data.get('can_approve_expenses', False),
                can_access_reports=designation_data.get('can_access_reports', False),
                expense_approval_limit=designation_data.get('expense_approval_limit', 0.00),
                is_system_role=False,  # Only system can create system roles
                created_by=creating_user,
                updated_by=creating_user
            )

            # Assign custom permissions if specified
            if designation_data.get('permission_assignments'):
                self._assign_permissions_to_designation(
                    designation.id,
                    designation_data['permission_assignments'],
                    creating_user
                )

            self.logger.info(
                f"Created designation {designation.designation_name} for tenant {tenant_id} "
                f"by user {creating_user.username}"
            )

            return designation

        except Exception as e:
            self.logger.error(f"Failed to create designation: {str(e)}")
            raise

    @transaction.atomic
    def update_designation(
        self, 
        designation_id: int, 
        update_data: Dict[str, Any], 
        updating_user: User
    ) -> TenantDesignation:
        """
        Update an existing designation.
        
        Args:
            designation_id: ID of the designation to update
            update_data: Dictionary containing fields to update
            updating_user: User performing the update
            
        Returns:
            Updated TenantDesignation instance
        """
        try:
            designation = TenantDesignation.objects.select_for_update().get(
                id=designation_id,
                is_active=True
            )
        except TenantDesignation.DoesNotExist:
            raise ValidationError("Designation not found")

        # Validate user permissions
        if not self._can_manage_designations(updating_user, str(designation.tenant_id)):
            raise PermissionDenied("Insufficient permissions to update designations")

        # Don't allow updating system roles
        if designation.is_system_role:
            raise PermissionDenied("Cannot modify system roles")

        # Validate hierarchy changes
        if 'parent_designation_id' in update_data or 'designation_level' in update_data:
            parent_id = update_data.get('parent_designation_id', designation.parent_designation_id)
            level = update_data.get('designation_level', designation.designation_level)
            
            if parent_id:
                self._validate_hierarchy_assignment(parent_id, level, str(designation.tenant_id))

        # Update fields
        for field, value in update_data.items():
            if hasattr(designation, field) and field not in ['id', 'tenant', 'created_by', 'created_at']:
                setattr(designation, field, value)

        designation.updated_by = updating_user
        designation.save()

        self.logger.info(
            f"Updated designation {designation.designation_name} by user {updating_user.username}"
        )

        return designation

    @transaction.atomic 
    def delete_designation(self, designation_id: int, deleting_user: User) -> bool:
        """
        Soft delete a designation.
        
        Args:
            designation_id: ID of the designation to delete
            deleting_user: User performing the deletion
            
        Returns:
            True if deletion was successful
        """
        try:
            designation = TenantDesignation.objects.get(id=designation_id, is_active=True)
        except TenantDesignation.DoesNotExist:
            raise ValidationError("Designation not found")

        # Validate user permissions
        if not self._can_manage_designations(deleting_user, str(designation.tenant_id)):
            raise PermissionDenied("Insufficient permissions to delete designations")

        # Don't allow deleting system roles
        if designation.is_system_role:
            raise PermissionDenied("Cannot delete system roles")

        # Check if designation has active users
        active_assignments = UserDesignationAssignment.objects.filter(
            designation=designation,
            is_active=True,
            assignment_status='Active'
        ).count()

        if active_assignments > 0:
            raise ValidationError(
                f"Cannot delete designation with {active_assignments} active user assignments"
            )

        # Soft delete
        designation.is_active = False
        designation.deleted_at = timezone.now()
        designation.updated_by = deleting_user
        designation.save()

        self.logger.info(
            f"Deleted designation {designation.designation_name} by user {deleting_user.username}"
        )

        return True

    def get_designation_hierarchy(self, tenant_id: str, user: User) -> List[Dict]:
        """
        Get the complete designation hierarchy for a tenant.
        
        Args:
            tenant_id: UUID of the tenant
            user: User requesting the hierarchy
            
        Returns:
            List of designations organized in hierarchy
        """
        if not self._can_view_designations(user, tenant_id):
            raise PermissionDenied("Insufficient permissions to view designations")

        designations = TenantDesignation.objects.filter(
            tenant_id=tenant_id,
            is_active=True
        ).select_related('parent_designation').order_by('designation_level', 'designation_name')

        # Build hierarchy tree
        hierarchy = []
        designation_map = {}

        for designation in designations:
            designation_data = {
                'id': designation.id,
                'designation_name': designation.designation_name,
                'designation_code': designation.designation_code,
                'designation_level': designation.designation_level,
                'department': designation.department,
                'can_manage_subordinates': designation.can_manage_subordinates,
                'subordinates': []
            }
            
            designation_map[designation.id] = designation_data
            
            if designation.parent_designation_id:
                parent = designation_map.get(designation.parent_designation_id)
                if parent:
                    parent['subordinates'].append(designation_data)
            else:
                hierarchy.append(designation_data)

        return hierarchy

    # ========================================================================
    # Super Admin Management
    # ========================================================================

    @transaction.atomic
    def create_super_admin_designation(self, tenant_id: str) -> TenantDesignation:
        """
        Create Super Admin designation for a new tenant.
        
        Args:
            tenant_id: UUID of the tenant
            
        Returns:
            Created Super Admin designation
        """
        # Check if Super Admin already exists for tenant
        existing_admin = TenantDesignation.objects.filter(
            tenant_id=tenant_id,
            is_system_role=True,
            designation_code='SUPER_ADMIN'
        ).first()

        if existing_admin:
            return existing_admin

        # Create Super Admin designation
        super_admin = TenantDesignation.objects.create(
            tenant_id=tenant_id,
            designation_name='Super Administrator',
            designation_code='SUPER_ADMIN',
            designation_level=1,
            department='Administration',
            description='Platform administration with full tenant management capabilities',
            permissions=['*'],  # All permissions
            feature_access={'all': 'full'},
            data_access_level='Full',
            can_manage_subordinates=True,
            approval_authority_level=999999,  # Unlimited approval authority
            delegation_allowed=True,
            can_manage_users=True,
            can_create_projects=True,
            can_assign_tasks=True,
            can_approve_expenses=True,
            can_access_reports=True,
            expense_approval_limit=999999999.99,  # Unlimited expense approval
            cross_functional_access=True,
            multi_location_access=True,
            is_system_role=True,
            is_active=True
        )

        self.logger.info(f"Created Super Admin designation for tenant {tenant_id}")
        return super_admin

    def get_or_create_super_admin_designation(self, tenant_id: str) -> TenantDesignation:
        """Get existing or create new Super Admin designation"""
        super_admin = TenantDesignation.objects.filter(
            tenant_id=tenant_id,
            is_system_role=True,
            designation_code='SUPER_ADMIN'
        ).first()

        if not super_admin:
            super_admin = self.create_super_admin_designation(tenant_id)

        return super_admin

    # ========================================================================
    # Permission Management
    # ========================================================================

    @transaction.atomic
    def create_permission_category(
        self, 
        tenant_id: str, 
        category_data: Dict[str, Any], 
        creating_user: User
    ) -> PermissionCategory:
        """Create a custom permission category for tenant"""
        if not self._can_manage_permissions(creating_user, tenant_id):
            raise PermissionDenied("Insufficient permissions to create permission categories")

        category = PermissionCategory.objects.create(
            tenant_id=tenant_id,
            category_name=category_data['category_name'],
            category_code=category_data['category_code'],
            description=category_data.get('description'),
            is_system_category=False,
            sort_order=category_data.get('sort_order', 0),
            created_by=creating_user
        )

        self.logger.info(f"Created permission category {category.category_name} for tenant {tenant_id}")
        return category

    @transaction.atomic
    def create_custom_permission(
        self, 
        tenant_id: str, 
        permission_data: Dict[str, Any], 
        creating_user: User
    ) -> CustomPermission:
        """Create a custom permission for tenant"""
        if not self._can_manage_permissions(creating_user, tenant_id):
            raise PermissionDenied("Insufficient permissions to create permissions")

        permission = CustomPermission.objects.create(
            tenant_id=tenant_id,
            category_id=permission_data['category_id'],
            permission_name=permission_data['permission_name'],
            permission_code=permission_data['permission_code'],
            description=permission_data.get('description'),
            permission_type=permission_data.get('permission_type', 'action'),
            requires_approval=permission_data.get('requires_approval', False),
            is_delegatable=permission_data.get('is_delegatable', True),
            scope_required=permission_data.get('scope_required', False),
            sort_order=permission_data.get('sort_order', 0),
            created_by=creating_user
        )

        self.logger.info(f"Created custom permission {permission.permission_name} for tenant {tenant_id}")
        return permission

    # ========================================================================
    # User Assignment Management
    # ========================================================================

    @transaction.atomic
    def assign_designation_to_user(
        self, 
        user_profile_id: int, 
        designation_id: int, 
        assignment_data: Dict[str, Any], 
        assigned_by: User
    ) -> UserDesignationAssignment:
        """Assign tenant-created designation to user"""
        # Get user profile and designation
        try:
            user_profile = TenantUserProfile.objects.get(id=user_profile_id)
            designation = TenantDesignation.objects.get(
                id=designation_id,
                tenant=user_profile.tenant,
                is_active=True
            )
        except (TenantUserProfile.DoesNotExist, TenantDesignation.DoesNotExist):
            raise ValidationError("User profile or designation not found")

        # Check assignment permissions
        if not self._can_assign_designation(assigned_by, designation, user_profile):
            raise PermissionDenied("Insufficient permissions to assign this designation")

        # Check if user already has this designation
        existing_assignment = UserDesignationAssignment.objects.filter(
            user_profile=user_profile,
            designation=designation,
            is_active=True
        ).first()

        if existing_assignment:
            raise ValidationError("User already has this designation")

        # Create assignment
        assignment = UserDesignationAssignment.objects.create(
            user_profile=user_profile,
            designation=designation,
            is_primary_designation=assignment_data.get('is_primary', False),
            is_temporary=assignment_data.get('is_temporary', False),
            assignment_reason=assignment_data.get('reason'),
            geographic_scope_override=assignment_data.get('geographic_scope_override', {}),
            functional_scope_override=assignment_data.get('functional_scope_override', {}),
            permission_overrides=assignment_data.get('permission_overrides', {}),
            effective_from=assignment_data.get('effective_from', date.today()),
            effective_to=assignment_data.get('effective_to'),
            auto_expire=assignment_data.get('auto_expire', False),
            assigned_by=assigned_by,
            approval_required=assignment_data.get('approval_required', False)
        )

        # Update primary designation if specified
        if assignment.is_primary_designation:
            UserDesignationAssignment.objects.filter(
                user_profile=user_profile,
                is_primary_designation=True,
                is_active=True
            ).exclude(id=assignment.id).update(is_primary_designation=False)

        self.logger.info(
            f"Assigned designation {designation.designation_name} to user {user_profile.user.username}"
        )

        return assignment

    def get_user_effective_permissions(self, user_profile: TenantUserProfile) -> Dict[str, Any]:
        """Calculate effective permissions for user based on all active designations"""
        # Get active designation assignments
        assignments = UserDesignationAssignment.objects.filter(
            user_profile=user_profile,
            is_active=True,
            assignment_status='Active',
            effective_from__lte=date.today()
        ).filter(
            models.Q(effective_to__isnull=True) | models.Q(effective_to__gte=date.today())
        ).select_related('designation')

        if not assignments.exists():
            return self._get_default_permissions()

        # Aggregate permissions from all assignments
        all_permissions = set()
        feature_access = {}
        geographic_scope = set()
        functional_scope = set()
        custom_capabilities = {}
        highest_data_access = 'View_Only'
        max_approval_limit = 0.00

        # Boolean capabilities (OR logic)
        can_manage_users = False
        can_create_projects = False
        can_assign_tasks = False
        can_approve_expenses = False
        can_access_reports = False
        cross_functional_access = False
        multi_location_access = False

        for assignment in assignments:
            designation = assignment.designation

            # Collect permissions
            all_permissions.update(designation.permissions or [])

            # Apply permission overrides from assignment
            if assignment.permission_overrides:
                additional_perms = assignment.permission_overrides.get('additional', [])
                restricted_perms = assignment.permission_overrides.get('restricted', [])
                all_permissions.update(additional_perms)
                all_permissions.difference_update(restricted_perms)

            # Merge feature access (take highest level)
            for feature, access_level in (designation.feature_access or {}).items():
                if feature not in feature_access or self._is_higher_access_level(access_level, feature_access[feature]):
                    feature_access[feature] = access_level

            # Aggregate geographic scope
            designation_geo = designation.geographic_scope or []
            override_geo = assignment.geographic_scope_override or []
            if override_geo:
                geographic_scope.update(override_geo)
            else:
                geographic_scope.update(designation_geo)

            # Aggregate functional scope
            designation_func = designation.functional_scope or []
            override_func = assignment.functional_scope_override or []
            if override_func:
                functional_scope.update(override_func)
            else:
                functional_scope.update(designation_func)

            # Merge custom capabilities
            custom_capabilities.update(designation.custom_capabilities or {})

            # Take highest data access level
            if self._is_higher_data_access_level(designation.data_access_level, highest_data_access):
                highest_data_access = designation.data_access_level

            # Take highest approval limit
            if designation.expense_approval_limit > max_approval_limit:
                max_approval_limit = designation.expense_approval_limit

            # Boolean capabilities (OR logic)
            can_manage_users = can_manage_users or designation.can_manage_users
            can_create_projects = can_create_projects or designation.can_create_projects
            can_assign_tasks = can_assign_tasks or designation.can_assign_tasks
            can_approve_expenses = can_approve_expenses or designation.can_approve_expenses
            can_access_reports = can_access_reports or designation.can_access_reports
            cross_functional_access = cross_functional_access or designation.cross_functional_access
            multi_location_access = multi_location_access or designation.multi_location_access

        return {
            'permissions': list(all_permissions),
            'feature_access': feature_access,
            'geographic_scope': list(geographic_scope),
            'functional_scope': list(functional_scope),
            'custom_capabilities': custom_capabilities,
            'data_access_level': highest_data_access,
            'can_manage_users': can_manage_users,
            'can_create_projects': can_create_projects,
            'can_assign_tasks': can_assign_tasks,
            'can_approve_expenses': can_approve_expenses,
            'can_access_reports': can_access_reports,
            'cross_functional_access': cross_functional_access,
            'multi_location_access': multi_location_access,
            'expense_approval_limit': max_approval_limit
        }

    # ========================================================================
    # Template Management
    # ========================================================================

    @transaction.atomic
    def create_designation_template(
        self, 
        tenant_id: str, 
        template_data: Dict[str, Any], 
        creating_user: User
    ) -> DesignationTemplate:
        """Create designation template for reuse"""
        if not self._can_manage_designations(creating_user, tenant_id):
            raise PermissionDenied("Insufficient permissions to create templates")

        template = DesignationTemplate.objects.create(
            tenant_id=tenant_id,
            template_name=template_data['template_name'],
            template_description=template_data.get('template_description'),
            industry_category=template_data.get('industry_category'),
            designation_data=template_data['designation_data'],
            permission_set=template_data['permission_set'],
            hierarchy_suggestions=template_data.get('hierarchy_suggestions', {}),
            is_public=template_data.get('is_public', False),
            created_by=creating_user
        )

        self.logger.info(f"Created designation template {template.template_name}")
        return template

    @transaction.atomic
    def create_designation_from_template(
        self, 
        tenant_id: str, 
        template_id: int, 
        customizations: Dict[str, Any], 
        creating_user: User
    ) -> TenantDesignation:
        """Create designation from template with customizations"""
        template = DesignationTemplate.objects.get(
            id=template_id,
            is_active=True
        )

        # Validate template access (public or tenant-owned)
        if not template.is_public and str(template.tenant_id) != tenant_id:
            raise PermissionDenied("Cannot access this template")

        # Merge template data with customizations
        designation_data = template.designation_data.copy()
        designation_data.update(customizations)

        # Create designation
        designation = self.create_designation(tenant_id, designation_data, creating_user)

        # Update template usage count
        template.usage_count += 1
        template.save()

        return designation

    # ========================================================================
    # Validation Methods
    # ========================================================================

    def _validate_designation_data(self, designation_data: Dict[str, Any], tenant_id: str) -> bool:
        """Validate designation data before creation"""
        # Check required fields
        required_fields = ['designation_name', 'designation_code', 'designation_level']
        for field in required_fields:
            if not designation_data.get(field):
                raise ValidationError(f"Required field missing: {field}")

        # Check unique designation code within tenant
        if TenantDesignation.objects.filter(
            tenant_id=tenant_id,
            designation_code=designation_data['designation_code'],
            is_active=True
        ).exists():
            raise ValidationError("Designation code must be unique within tenant")

        # Validate designation level
        if designation_data['designation_level'] < 1:
            raise ValidationError("Designation level must be positive")

        # Validate approval authority level
        approval_level = designation_data.get('approval_authority_level', 0)
        if approval_level < 0:
            raise ValidationError("Approval authority level cannot be negative")

        # Validate expense approval limit
        expense_limit = designation_data.get('expense_approval_limit', 0)
        if expense_limit < 0:
            raise ValidationError("Expense approval limit cannot be negative")

        return True

    def _validate_hierarchy_assignment(self, parent_id: int, child_level: int, tenant_id: str):
        """Validate that hierarchy assignment is valid"""
        try:
            parent = TenantDesignation.objects.get(id=parent_id, tenant_id=tenant_id, is_active=True)
        except TenantDesignation.DoesNotExist:
            raise ValidationError("Parent designation not found")

        if child_level <= parent.designation_level:
            raise ValidationError("Child designation level must be higher (greater number) than parent")

    # ========================================================================
    # Permission Check Methods
    # ========================================================================

    def _can_manage_designations(self, user: User, tenant_id: str) -> bool:
        """Check if user can manage designations"""
        try:
            user_profile = TenantUserProfile.objects.get(user=user, tenant_id=tenant_id)
            permissions = self.get_user_effective_permissions(user_profile)
            return (
                'designation.manage' in permissions.get('permissions', []) or
                '*' in permissions.get('permissions', [])
            )
        except TenantUserProfile.DoesNotExist:
            return False

    def _can_view_designations(self, user: User, tenant_id: str) -> bool:
        """Check if user can view designations"""
        try:
            user_profile = TenantUserProfile.objects.get(user=user, tenant_id=tenant_id)
            permissions = self.get_user_effective_permissions(user_profile)
            return (
                'designation.view' in permissions.get('permissions', []) or
                'designation.manage' in permissions.get('permissions', []) or
                '*' in permissions.get('permissions', [])
            )
        except TenantUserProfile.DoesNotExist:
            return False

    def _can_manage_permissions(self, user: User, tenant_id: str) -> bool:
        """Check if user can manage permissions"""
        try:
            user_profile = TenantUserProfile.objects.get(user=user, tenant_id=tenant_id)
            permissions = self.get_user_effective_permissions(user_profile)
            return (
                'permission.manage' in permissions.get('permissions', []) or
                '*' in permissions.get('permissions', [])
            )
        except TenantUserProfile.DoesNotExist:
            return False

    def _can_assign_designation(self, assigning_user: User, designation: TenantDesignation, target_user: TenantUserProfile) -> bool:
        """Check if user can assign designation to another user"""
        try:
            assigner_profile = TenantUserProfile.objects.get(
                user=assigning_user, 
                tenant=target_user.tenant
            )
        except TenantUserProfile.DoesNotExist:
            return False

        assigner_permissions = self.get_user_effective_permissions(assigner_profile)

        # Check basic permission
        can_assign = (
            'user.manage_designations' in assigner_permissions.get('permissions', []) or
            '*' in assigner_permissions.get('permissions', [])
        )

        if not can_assign:
            return False

        # Check hierarchy rules (can only assign equal or lower level designations)
        assigner_designations = UserDesignationAssignment.objects.filter(
            user_profile=assigner_profile,
            is_active=True
        ).values_list('designation__designation_level', flat=True)

        if assigner_designations:
            min_assigner_level = min(assigner_designations)
            if designation.designation_level < min_assigner_level:
                return False

        return True

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _assign_permissions_to_designation(
        self, 
        designation_id: int, 
        permission_assignments: List[Dict], 
        granting_user: User
    ):
        """Assign permissions to a designation"""
        for assignment in permission_assignments:
            DesignationPermission.objects.create(
                designation_id=designation_id,
                permission_id=assignment['permission_id'],
                permission_level=assignment.get('permission_level', 'granted'),
                scope_restriction=assignment.get('scope_restriction', {}),
                conditions=assignment.get('conditions', {}),
                approval_required=assignment.get('approval_required', False),
                effective_from=assignment.get('effective_from', date.today()),
                effective_to=assignment.get('effective_to'),
                is_temporary=assignment.get('is_temporary', False),
                granted_by=granting_user
            )

    def _is_higher_access_level(self, level1: str, level2: str) -> bool:
        """Compare access levels"""
        levels = {'basic': 1, 'standard': 2, 'advanced': 3, 'full': 4}
        return levels.get(level1.lower(), 0) > levels.get(level2.lower(), 0)

    def _is_higher_data_access_level(self, level1: str, level2: str) -> bool:
        """Compare data access levels"""
        levels = {'View_Only': 1, 'Restricted': 2, 'Limited': 3, 'Full': 4}
        return levels.get(level1, 0) > levels.get(level2, 0)

    def _get_default_permissions(self) -> Dict[str, Any]:
        """Get default permissions for users with no designations"""
        return {
            'permissions': ['platform.access'],
            'feature_access': {'basic': 'standard'},
            'geographic_scope': [],
            'functional_scope': [],
            'custom_capabilities': {},
            'data_access_level': 'View_Only',
            'can_manage_users': False,
            'can_create_projects': False,
            'can_assign_tasks': False,
            'can_approve_expenses': False,
            'can_access_reports': False,
            'cross_functional_access': False,
            'multi_location_access': False,
            'expense_approval_limit': 0.00
        }


# ============================================================================
# Service Factory and Utility Functions
# ============================================================================

def get_designation_service() -> DesignationService:
    """Factory function to get designation service instance"""
    return DesignationService()


def create_super_admin_for_tenant(tenant_id: str) -> TenantDesignation:
    """Utility function to create Super Admin designation for a tenant"""
    service = get_designation_service()
    return service.create_super_admin_designation(tenant_id)


def get_user_permissions(user_profile: TenantUserProfile) -> Dict[str, Any]:
    """Utility function to get user's effective permissions"""
    service = get_designation_service()
    return service.get_user_effective_permissions(user_profile)


def check_user_permission(user_profile: TenantUserProfile, permission_code: str) -> bool:
    """Utility function to check if user has specific permission"""
    permissions = get_user_permissions(user_profile)
    return permission_code in permissions.get('permissions', []) or '*' in permissions.get('permissions', []) 
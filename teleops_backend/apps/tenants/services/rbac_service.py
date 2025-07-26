"""
RBAC (Role-Based Access Control) Service
Handles tenant-scoped permission management, calculation, and enforcement.
"""

import logging
from typing import Dict, List, Optional, Set, Tuple, Any
from datetime import datetime, timedelta
from django.utils import timezone
from django.db import transaction
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.db.models import Q, Prefetch

from ..models import (
    Tenant, TenantUserProfile, PermissionRegistry, DesignationBasePermission,
    UserPermissionOverride, PermissionGroup, PermissionGroupPermission,
    UserPermissionGroupAssignment, UserEffectivePermissionsCache,
    PermissionAuditTrail, TenantDesignation
)

User = get_user_model()
logger = logging.getLogger(__name__)


class TenantRBACService:
    """
    Comprehensive RBAC service for tenant permission management.
    
    Handles:
    - Permission calculation and inheritance
    - Effective permission resolution
    - Cache management for performance
    - Audit trail logging
    """
    
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        self.cache_prefix = f"rbac_tenant_{tenant.id}"
        self.cache_timeout = 3600  # 1 hour default
    
    def get_user_effective_permissions(
        self, 
        user_profile: TenantUserProfile,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Get the effective permissions for a user, combining designation-based 
        permissions, group permissions, and user-specific overrides.
        
        Returns:
            Dict containing:
            - permissions: Dict of permission_code -> permission_details
            - scope_limitations: Combined scope restrictions
            - permission_summary: High-level summary of access levels
            - metadata: Calculation metadata (sources, conflicts, etc.)
        """
        cache_key = f"{self.cache_prefix}_user_perms_{user_profile.id}"
        
        # Check cache first unless forced refresh
        if not force_refresh:
            cached_result = self._get_cached_permissions(user_profile)
            if cached_result:
                return cached_result
        
        try:
            # Calculate effective permissions
            effective_permissions = self._calculate_effective_permissions(user_profile)
            
            # Cache the result
            self._cache_permissions(user_profile, effective_permissions)
            
            # Log the permission calculation
            self._log_permission_calculation(user_profile, effective_permissions)
            
            return effective_permissions
            
        except Exception as e:
            logger.error(
                f"Error calculating permissions for user {user_profile.user.id} "
                f"in tenant {self.tenant.id}: {str(e)}"
            )
            # Return minimal permissions on error
            return self._get_minimal_permissions()
    
    def _calculate_effective_permissions(self, user_profile: TenantUserProfile) -> Dict[str, Any]:
        """Calculate the effective permissions by combining all sources."""
        
        # Get all permission sources
        designation_permissions = self._get_designation_permissions(user_profile)
        group_permissions = self._get_group_permissions(user_profile)
        user_overrides = self._get_user_overrides(user_profile)
        
        # Combine permissions with conflict resolution
        combined_permissions = self._resolve_permission_conflicts(
            designation_permissions, group_permissions, user_overrides
        )
        
        # Calculate scope limitations
        scope_limitations = self._calculate_scope_limitations(
            designation_permissions, group_permissions, user_overrides
        )
        
        # Generate permission summary
        permission_summary = self._generate_permission_summary(combined_permissions)
        
        # Create metadata
        metadata = {
            'calculation_time': timezone.now().isoformat(),
            'sources': {
                'designation_count': len(designation_permissions),
                'group_count': len(group_permissions),
                'override_count': len(user_overrides)
            },
            'conflicts_resolved': getattr(self, '_conflicts_resolved', 0),
            'cache_version': self._get_cache_version()
        }
        
        return {
            'permissions': combined_permissions,
            'scope_limitations': scope_limitations,
            'permission_summary': permission_summary,
            'metadata': metadata
        }
    
    def _get_designation_permissions(self, user_profile: TenantUserProfile) -> Dict[str, Any]:
        """Get permissions from user's designations."""
        designation_permissions = {}
        
        # Get user's current designation assignments
        current_assignments = user_profile.designation_assignments.filter(
            is_active=True,
            effective_from__lte=timezone.now()
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gt=timezone.now())
        ).select_related('designation').prefetch_related(
            'designation__base_permissions__permission'
        )
        
        for assignment in current_assignments:
            designation = assignment.designation
            
            # Get base permissions for this designation
            base_permissions = designation.base_permissions.filter(
                is_active=True,
                permission__is_active=True,
                permission__tenant=self.tenant
            ).select_related('permission')
            
            for base_perm in base_permissions:
                permission = base_perm.permission
                perm_code = permission.permission_code
                
                # Handle permission inheritance
                if base_perm.is_inherited and perm_code not in designation_permissions:
                    designation_permissions[perm_code] = {
                        'permission': permission,
                        'level': base_perm.permission_level,
                        'source': f'designation_{designation.id}',
                        'scope_configuration': base_perm.scope_configuration,
                        'geographic_scope': base_perm.geographic_scope,
                        'functional_scope': base_perm.functional_scope,
                        'temporal_scope': base_perm.temporal_scope,
                        'is_mandatory': base_perm.is_mandatory,
                        'priority_level': base_perm.priority_level,
                        'conditions': base_perm.conditions
                    }
        
        return designation_permissions
    
    def _get_group_permissions(self, user_profile: TenantUserProfile) -> Dict[str, Any]:
        """Get permissions from user's permission groups."""
        group_permissions = {}
        
        # Get user's active group assignments
        group_assignments = user_profile.permission_group_assignments.filter(
            is_active=True,
            effective_from__lte=timezone.now()
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gt=timezone.now())
        ).select_related('group').prefetch_related(
            'group__group_permissions__permission'
        )
        
        for assignment in group_assignments:
            group = assignment.group
            
            # Get permissions for this group
            group_perms = group.group_permissions.filter(
                is_active=True,
                permission__is_active=True,
                permission__tenant=self.tenant
            ).select_related('permission')
            
            for group_perm in group_perms:
                permission = group_perm.permission
                perm_code = permission.permission_code
                
                # Add or update permission from group
                if perm_code not in group_permissions or group_perm.is_mandatory:
                    group_permissions[perm_code] = {
                        'permission': permission,
                        'level': group_perm.permission_level,
                        'source': f'group_{group.id}',
                        'scope_configuration': group_perm.scope_configuration,
                        'is_mandatory': group_perm.is_mandatory,
                        'scope_override': assignment.scope_override
                    }
        
        return group_permissions
    
    def _get_user_overrides(self, user_profile: TenantUserProfile) -> Dict[str, Any]:
        """Get user-specific permission overrides."""
        user_overrides = {}
        
        # Get active user overrides
        overrides = user_profile.permission_overrides.filter(
            is_active=True,
            approval_status='approved',
            effective_from__lte=timezone.now()
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gt=timezone.now())
        ).select_related('permission')
        
        for override in overrides:
            permission = override.permission
            perm_code = permission.permission_code
            
            user_overrides[perm_code] = {
                'permission': permission,
                'override_type': override.override_type,
                'level': override.permission_level,
                'source': f'user_override_{override.id}',
                'scope_override': override.scope_override,
                'geographic_scope_override': override.geographic_scope_override,
                'functional_scope_override': override.functional_scope_override,
                'temporal_scope_override': override.temporal_scope_override,
                'conditions': override.conditions,
                'requires_mfa': override.requires_mfa,
                'business_justification': override.business_justification
            }
        
        return user_overrides
    
    def _resolve_permission_conflicts(
        self, 
        designation_perms: Dict, 
        group_perms: Dict, 
        user_overrides: Dict
    ) -> Dict[str, Any]:
        """
        Resolve conflicts between different permission sources.
        
        Priority order:
        1. User overrides (highest priority)
        2. Mandatory group permissions
        3. Designation permissions
        4. Non-mandatory group permissions
        """
        resolved_permissions = {}
        self._conflicts_resolved = 0
        
        # Get all unique permission codes
        all_perm_codes = set()
        all_perm_codes.update(designation_perms.keys())
        all_perm_codes.update(group_perms.keys())
        all_perm_codes.update(user_overrides.keys())
        
        for perm_code in all_perm_codes:
            sources = []
            
            # Collect all sources for this permission
            if perm_code in designation_perms:
                sources.append(('designation', designation_perms[perm_code]))
            
            if perm_code in group_perms:
                sources.append(('group', group_perms[perm_code]))
            
            if perm_code in user_overrides:
                sources.append(('override', user_overrides[perm_code]))
            
            # Resolve conflicts
            if len(sources) > 1:
                self._conflicts_resolved += 1
                resolved_perm = self._resolve_single_permission_conflict(sources)
            else:
                resolved_perm = sources[0][1]
            
            resolved_permissions[perm_code] = resolved_perm
        
        return resolved_permissions
    
    def _resolve_single_permission_conflict(self, sources: List[Tuple[str, Dict]]) -> Dict:
        """Resolve conflict for a single permission using priority rules."""
        
        # Priority 1: User overrides
        for source_type, perm_data in sources:
            if source_type == 'override':
                if perm_data['override_type'] == 'restriction':
                    # Restrictions take precedence
                    return perm_data
                elif perm_data['override_type'] == 'addition':
                    # Additions also take precedence
                    return perm_data
        
        # Priority 2: Mandatory group permissions
        for source_type, perm_data in sources:
            if source_type == 'group' and perm_data.get('is_mandatory', False):
                return perm_data
        
        # Priority 3: Designation permissions with highest priority level
        designation_sources = [
            perm_data for source_type, perm_data in sources 
            if source_type == 'designation'
        ]
        if designation_sources:
            return max(designation_sources, key=lambda x: x.get('priority_level', 0))
        
        # Priority 4: Any remaining group permissions
        for source_type, perm_data in sources:
            if source_type == 'group':
                return perm_data
        
        # Fallback: first available
        return sources[0][1]
    
    def _calculate_scope_limitations(
        self, 
        designation_perms: Dict, 
        group_perms: Dict, 
        user_overrides: Dict
    ) -> Dict[str, Any]:
        """Calculate combined scope limitations from all sources."""
        
        scope_limitations = {
            'geographic_scope': set(),
            'functional_scope': set(),
            'temporal_scope': {},
            'global_restrictions': []
        }
        
        # Combine scopes from all sources (most restrictive wins)
        all_perms = {**designation_perms, **group_perms, **user_overrides}
        
        for perm_data in all_perms.values():
            # Geographic scope
            if perm_data.get('geographic_scope'):
                scope_limitations['geographic_scope'].update(perm_data['geographic_scope'])
            
            # Functional scope
            if perm_data.get('functional_scope'):
                scope_limitations['functional_scope'].update(perm_data['functional_scope'])
            
            # Temporal scope (combine time restrictions)
            if perm_data.get('temporal_scope'):
                temporal = perm_data['temporal_scope']
                if 'working_hours' in temporal:
                    scope_limitations['temporal_scope']['working_hours'] = temporal['working_hours']
                if 'valid_days' in temporal:
                    scope_limitations['temporal_scope']['valid_days'] = temporal['valid_days']
        
        # Convert sets to lists for JSON serialization
        scope_limitations['geographic_scope'] = list(scope_limitations['geographic_scope'])
        scope_limitations['functional_scope'] = list(scope_limitations['functional_scope'])
        
        return scope_limitations
    
    def _generate_permission_summary(self, permissions: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a high-level summary of user's permissions."""
        
        summary = {
            'total_permissions': len(permissions),
            'by_category': {},
            'by_risk_level': {},
            'by_permission_type': {},
            'requires_mfa': [],
            'conditional_permissions': [],
            'administrative_access': False,
            'system_permissions': []
        }
        
        for perm_code, perm_data in permissions.items():
            permission = perm_data['permission']
            
            # Count by category
            category = permission.permission_category
            summary['by_category'][category] = summary['by_category'].get(category, 0) + 1
            
            # Count by risk level
            risk_level = permission.risk_level
            summary['by_risk_level'][risk_level] = summary['by_risk_level'].get(risk_level, 0) + 1
            
            # Count by permission type
            perm_type = permission.permission_type
            summary['by_permission_type'][perm_type] = summary['by_permission_type'].get(perm_type, 0) + 1
            
            # Check for special conditions
            if perm_data.get('requires_mfa', False):
                summary['requires_mfa'].append(perm_code)
            
            if perm_data.get('conditions'):
                summary['conditional_permissions'].append(perm_code)
            
            if permission.permission_type == 'administrative':
                summary['administrative_access'] = True
            
            if permission.is_system_permission:
                summary['system_permissions'].append(perm_code)
        
        return summary
    
    def _get_cached_permissions(self, user_profile: TenantUserProfile) -> Optional[Dict[str, Any]]:
        """Get cached permissions if valid."""
        try:
            cached_data = UserEffectivePermissionsCache.objects.filter(
                user_profile=user_profile,
                is_valid=True
            ).filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
            ).first()
            
            if cached_data:
                return {
                    'permissions': cached_data.effective_permissions,
                    'scope_limitations': cached_data.scope_limitations,
                    'permission_summary': cached_data.permission_summary,
                    'metadata': {
                        'cached': True,
                        'calculated_at': cached_data.calculated_at.isoformat(),
                        'cache_version': cached_data.cache_version
                    }
                }
        except Exception as e:
            logger.warning(f"Error retrieving cached permissions: {str(e)}")
        
        return None
    
    def _cache_permissions(self, user_profile: TenantUserProfile, permissions: Dict[str, Any]):
        """Cache the calculated permissions."""
        try:
            # Invalidate existing cache
            UserEffectivePermissionsCache.objects.filter(
                user_profile=user_profile
            ).update(is_valid=False)
            
            # Create new cache entry
            cache_entry = UserEffectivePermissionsCache.objects.create(
                user_profile=user_profile,
                effective_permissions=permissions['permissions'],
                permission_summary=permissions['permission_summary'],
                scope_limitations=permissions['scope_limitations'],
                cache_version=self._get_cache_version(),
                calculated_at=timezone.now(),
                expires_at=timezone.now() + timedelta(seconds=self.cache_timeout),
                designation_version=self._get_designation_version(user_profile),
                override_version=self._get_override_version(user_profile),
                is_valid=True
            )
            
            logger.info(f"Cached permissions for user {user_profile.user.id}")
            
        except Exception as e:
            logger.error(f"Error caching permissions: {str(e)}")
    
    def _log_permission_calculation(self, user_profile: TenantUserProfile, permissions: Dict[str, Any]):
        """Log permission calculation for audit trail."""
        try:
            PermissionAuditTrail.objects.create(
                tenant=self.tenant,
                entity_type='user_permission_calculation',
                entity_id=str(user_profile.id),
                action='calculate_effective_permissions',
                details={
                    'user_id': user_profile.user.id,
                    'permission_count': len(permissions['permissions']),
                    'sources': permissions['metadata']['sources'],
                    'conflicts_resolved': permissions['metadata'].get('conflicts_resolved', 0)
                },
                performed_by=None,  # System action
                performed_at=timezone.now()
            )
        except Exception as e:
            logger.error(f"Error logging permission calculation: {str(e)}")
    
    def _get_cache_version(self) -> int:
        """Get current cache version for invalidation."""
        return int(timezone.now().timestamp())
    
    def _get_designation_version(self, user_profile: TenantUserProfile) -> Optional[int]:
        """Get version of user's designation assignments."""
        try:
            latest_assignment = user_profile.designation_assignments.filter(
                is_active=True
            ).order_by('-updated_at').first()
            
            if latest_assignment:
                return int(latest_assignment.updated_at.timestamp())
        except Exception:
            pass
        return None
    
    def _get_override_version(self, user_profile: TenantUserProfile) -> Optional[int]:
        """Get version of user's permission overrides."""
        try:
            latest_override = user_profile.permission_overrides.filter(
                is_active=True
            ).order_by('-updated_at').first()
            
            if latest_override:
                return int(latest_override.updated_at.timestamp())
        except Exception:
            pass
        return None
    
    def _get_minimal_permissions(self) -> Dict[str, Any]:
        """Return minimal permissions for error cases."""
        return {
            'permissions': {},
            'scope_limitations': {
                'geographic_scope': [],
                'functional_scope': [],
                'temporal_scope': {},
                'global_restrictions': ['error_mode']
            },
            'permission_summary': {
                'total_permissions': 0,
                'by_category': {},
                'by_risk_level': {},
                'by_permission_type': {},
                'requires_mfa': [],
                'conditional_permissions': [],
                'administrative_access': False,
                'system_permissions': []
            },
            'metadata': {
                'error': True,
                'calculation_time': timezone.now().isoformat()
            }
        }
    
    # === Permission Checking Methods ===
    
    def check_permission(
        self, 
        user_profile: TenantUserProfile, 
        permission_code: str,
        scope_context: Optional[Dict] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if user has a specific permission with optional scope context.
        
        Args:
            user_profile: The user to check
            permission_code: Permission code to check
            scope_context: Optional context for scope validation
            
        Returns:
            Tuple of (has_permission, permission_details)
        """
        try:
            effective_permissions = self.get_user_effective_permissions(user_profile)
            permissions = effective_permissions['permissions']
            
            if permission_code not in permissions:
                return False, {'reason': 'permission_not_granted'}
            
            perm_data = permissions[permission_code]
            
            # Check permission level
            if perm_data['level'] == 'denied':
                return False, {'reason': 'permission_denied'}
            
            # Check scope if provided
            if scope_context:
                scope_valid = self._validate_permission_scope(
                    perm_data, 
                    scope_context, 
                    effective_permissions['scope_limitations']
                )
                if not scope_valid:
                    return False, {'reason': 'scope_restriction'}
            
            # Check conditions
            if perm_data.get('conditions'):
                conditions_met = self._check_permission_conditions(
                    perm_data['conditions'], 
                    user_profile, 
                    scope_context
                )
                if not conditions_met:
                    return False, {'reason': 'conditions_not_met'}
            
            return True, {
                'permission_level': perm_data['level'],
                'source': perm_data['source'],
                'requires_mfa': perm_data.get('requires_mfa', False)
            }
            
        except Exception as e:
            logger.error(f"Error checking permission {permission_code}: {str(e)}")
            return False, {'reason': 'error', 'error': str(e)}
    
    def _validate_permission_scope(
        self, 
        perm_data: Dict, 
        scope_context: Dict, 
        global_limitations: Dict
    ) -> bool:
        """Validate permission scope against context and limitations."""
        
        # Check geographic scope
        if perm_data.get('geographic_scope'):
            user_location = scope_context.get('location')
            if user_location and user_location not in perm_data['geographic_scope']:
                return False
        
        # Check functional scope
        if perm_data.get('functional_scope'):
            requested_function = scope_context.get('function')
            if requested_function and requested_function not in perm_data['functional_scope']:
                return False
        
        # Check temporal scope
        if perm_data.get('temporal_scope'):
            current_time = timezone.now()
            temporal_scope = perm_data['temporal_scope']
            
            if 'working_hours' in temporal_scope:
                working_hours = temporal_scope['working_hours']
                current_hour = current_time.hour
                if not (working_hours['start'] <= current_hour <= working_hours['end']):
                    return False
            
            if 'valid_days' in temporal_scope:
                valid_days = temporal_scope['valid_days']
                current_day = current_time.weekday()  # 0=Monday, 6=Sunday
                if current_day not in valid_days:
                    return False
        
        return True
    
    def _check_permission_conditions(
        self, 
        conditions: Dict, 
        user_profile: TenantUserProfile, 
        scope_context: Optional[Dict]
    ) -> bool:
        """Check if permission conditions are met."""
        
        # Check user-based conditions
        if 'min_tenure_days' in conditions:
            user_tenure = (timezone.now().date() - user_profile.created_at.date()).days
            if user_tenure < conditions['min_tenure_days']:
                return False
        
        if 'required_designation_level' in conditions:
            user_designations = user_profile.designation_assignments.filter(
                is_active=True
            ).select_related('designation')
            
            max_level = max(
                (assignment.designation.hierarchy_level for assignment in user_designations),
                default=0
            )
            
            if max_level < conditions['required_designation_level']:
                return False
        
        # Check context-based conditions
        if scope_context and 'required_approval' in conditions:
            if not scope_context.get('has_approval', False):
                return False
        
        return True
    
    # === Cache Management ===
    
    def invalidate_user_permissions(self, user_profile: TenantUserProfile):
        """Invalidate cached permissions for a user."""
        try:
            UserEffectivePermissionsCache.objects.filter(
                user_profile=user_profile
            ).update(is_valid=False)
            
            # Also clear any Redis cache entries
            cache_key = f"{self.cache_prefix}_user_perms_{user_profile.id}"
            cache.delete(cache_key)
            
            logger.info(f"Invalidated permissions cache for user {user_profile.user.id}")
            
        except Exception as e:
            logger.error(f"Error invalidating user permissions cache: {str(e)}")
    
    def invalidate_tenant_permissions(self):
        """Invalidate all cached permissions for this tenant."""
        try:
            UserEffectivePermissionsCache.objects.filter(
                user_profile__tenant=self.tenant
            ).update(is_valid=False)
            
            # Clear Redis cache patterns
            cache_pattern = f"{self.cache_prefix}_*"
            # Note: This requires Redis-specific implementation
            
            logger.info(f"Invalidated all permissions cache for tenant {self.tenant.id}")
            
        except Exception as e:
            logger.error(f"Error invalidating tenant permissions cache: {str(e)}")


# === Utility Functions ===

def get_rbac_service(tenant: Tenant) -> TenantRBACService:
    """Factory function to get RBAC service for a tenant."""
    return TenantRBACService(tenant)


def check_user_permission(
    user_profile: TenantUserProfile, 
    permission_code: str,
    scope_context: Optional[Dict] = None
) -> Tuple[bool, Dict[str, Any]]:
    """
    Convenience function to check a single permission.
    
    Args:
        user_profile: The user to check
        permission_code: Permission code to check
        scope_context: Optional scope context
        
    Returns:
        Tuple of (has_permission, permission_details)
    """
    rbac_service = get_rbac_service(user_profile.tenant)
    return rbac_service.check_permission(user_profile, permission_code, scope_context)


def get_user_permissions(user_profile: TenantUserProfile) -> Dict[str, Any]:
    """
    Convenience function to get all effective permissions for a user.
    
    Args:
        user_profile: The user profile
        
    Returns:
        Dict containing effective permissions
    """
    rbac_service = get_rbac_service(user_profile.tenant)
    return rbac_service.get_user_effective_permissions(user_profile) 
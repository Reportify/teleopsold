"""
RBAC Serializers
Serializers for tenant RBAC API endpoints.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging

from ..models import (
    PermissionRegistry, PermissionGroup, PermissionGroupPermission,
    UserPermissionGroupAssignment, UserPermissionOverride,
    DesignationBasePermission, PermissionAuditTrail,
    TenantUserProfile, TenantDesignation, TenantDepartment,
    PermissionCategory
)
from ..services.feature_registry import get_feature_registry
from ..constants import RESOURCE_TYPES

User = get_user_model()
logger = logging.getLogger(__name__)


class PermissionCategorySerializer(serializers.ModelSerializer):
    """Serializer for permission categories."""
    
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    permission_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PermissionCategory
        fields = [
            'id', 'category_name', 'category_code', 'description', 
            'is_system_category', 'is_active', 'sort_order',
            'created_by_name', 'created_at', 'updated_at', 'permission_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name']
    
    def get_permission_count(self, obj):
        """Get count of permissions in this category."""
        return PermissionRegistry.objects.filter(
            tenant=obj.tenant,
            permission_category=obj.category_name,
            is_active=True
        ).count()
    
    def create(self, validated_data):
        """Create a new permission category."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
            if hasattr(request.user, 'tenant_user_profile'):
                validated_data['tenant'] = request.user.tenant_user_profile.tenant
        return super().create(validated_data)


class PermissionRegistrySerializer(serializers.ModelSerializer):
    """Serializer for permission registry entries."""
    
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    usage_count = serializers.SerializerMethodField()
    features = serializers.SerializerMethodField()
    
    class Meta:
        model = PermissionRegistry
        fields = [
            'id', 'permission_name', 'permission_code', 'permission_category',
            'description', 'permission_type', 'business_template', 'is_system_permission',
            'requires_scope', 'is_delegatable', 'risk_level', 'resource_type',
            'effect', 'is_active', 'is_auditable',
            'created_by_name', 'created_at', 'updated_at', 'usage_count', 'features'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name', 'usage_count', 'features']
    
    def get_usage_count(self, obj):
        """Get total usage count for this permission."""
        try:
            designation_count = obj.designation_assignments.filter(is_active=True).count()
            group_count = obj.group_assignments.filter(is_active=True).count()
            override_count = obj.user_overrides.filter(is_active=True).count()
            return designation_count + group_count + override_count
        except:
            return 0
    
    def get_features(self, obj):
        """Get features mapped to this permission."""
        try:
            # If resource_type is manually set and differs from permission_code pattern, 
            # prioritize manual selection over automatic mapping
            if obj.resource_type:
                # Check if this looks like a manual override (resource_type differs from permission_code pattern)
                permission_prefix = obj.permission_code.split('.')[0] if '.' in obj.permission_code else ''
                expected_resource_from_code = permission_prefix.replace('_management', '') if permission_prefix.endswith('_management') else permission_prefix
                
                # If user manually selected a different resource type, use that
                if obj.resource_type != expected_resource_from_code:
                    module_name = RESOURCE_TYPES.get(obj.resource_type, obj.resource_type.title())
                    return [
                        {
                            'feature_id': f'module_{module_name.lower().replace(" ", "_")}',
                            'feature_name': module_name,
                            'resource_type': module_name.lower().replace(" ", "_"),
                            'description': f'{module_name} functionality'
                        }
                    ]
            
            # Fall back to explicit feature mappings from permission_code
            feature_registry = get_feature_registry()
            features = feature_registry.get_features_for_permission(obj.permission_code)
            
            # If still no mappings, use resource_type as fallback
            if not features and obj.resource_type:
                module_name = RESOURCE_TYPES.get(obj.resource_type, obj.resource_type.title())
                return [
                    {
                        'feature_id': f'module_{module_name.lower().replace(" ", "_")}',
                        'feature_name': module_name,
                        'resource_type': module_name.lower().replace(" ", "_"),
                        'description': f'{module_name} functionality'
                    }
                ]
            
            # Group features by resource type and return module names (for explicit mappings)
            modules = set()
            for feature in features:
                module_name = RESOURCE_TYPES.get(feature.resource_type, feature.resource_type.title())
                modules.add(module_name)
            
            return [
                {
                    'feature_id': f'module_{module.lower().replace(" ", "_")}',
                    'feature_name': module,
                    'resource_type': module.lower().replace(" ", "_"),
                    'description': f'{module} functionality'
                }
                for module in sorted(modules)
            ]
        except Exception as e:
            logger.warning(f"Error getting features for permission {obj.permission_code}: {str(e)}")
            return []
    
    def validate_permission_code(self, value):
        """Validate permission code format."""
        if not value.replace('_', '').replace('.', '').isalnum():
            raise serializers.ValidationError(
                "Permission code must contain only letters, numbers, underscores, and dots"
            )
        return value

    def create(self, validated_data):
        """Create a new permission with audit logging."""
        request = self.context.get('request')
        
        # Set created_by to the current user
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
            
            # Set tenant from user's profile
            if hasattr(request.user, 'tenant_user_profile'):
                validated_data['tenant'] = request.user.tenant_user_profile.tenant
        
        # Create the permission
        permission = super().create(validated_data)
        
        # Log audit trail for permission creation
        try:
            if request and hasattr(request, 'user') and hasattr(request.user, 'tenant_user_profile'):
                PermissionAuditTrail.objects.create(
                    tenant=permission.tenant,
                    user_profile=request.user.tenant_user_profile,
                    action_type='permission_created',
                    resource_type='permission',
                    resource_id=str(permission.id),
                    resource_name=permission.permission_name,
                    action_details={
                        'permission_code': permission.permission_code,
                        'permission_category': permission.permission_category,
                        'risk_level': permission.risk_level,
                        'permission_type': permission.permission_type,
                        'is_system_permission': permission.is_system_permission
                    },
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                )
        except Exception as e:
            # Don't fail the operation if audit logging fails
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to log permission creation audit trail: {e}")
        
        return permission


class PermissionGroupPermissionSerializer(serializers.ModelSerializer):
    """Serializer for permissions within a group."""
    
    permission_name = serializers.CharField(source='permission.permission_name', read_only=True)
    permission_code = serializers.CharField(source='permission.permission_code', read_only=True)
    permission_category = serializers.CharField(source='permission.permission_category', read_only=True)
    risk_level = serializers.CharField(source='permission.risk_level', read_only=True)
    
    class Meta:
        model = PermissionGroupPermission
        fields = [
            'id', 'permission', 'permission_name', 'permission_code',
            'permission_category', 'risk_level', 'permission_level',
            'scope_configuration', 'is_mandatory', 'is_active',
            'added_at'
        ]
        read_only_fields = ['id', 'added_at']


class PermissionGroupSerializer(serializers.ModelSerializer):
    """Serializer for permission groups."""
    
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    group_permissions = PermissionGroupPermissionSerializer(many=True, read_only=True)
    permissions = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of permission IDs to assign to this group"
    )
    user_count = serializers.SerializerMethodField()
    permission_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PermissionGroup
        fields = [
            'id', 'group_name', 'group_code', 'description', 'group_type',
            'is_system_group', 'is_assignable', 'auto_assign_conditions',
            'is_active', 'created_by_name', 'created_at', 'updated_at',
            'group_permissions', 'permissions', 'user_count', 'permission_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name']
    
    def get_user_count(self, obj):
        """Get count of users assigned to this group."""
        return obj.user_assignments.filter(is_active=True).count()
    
    def get_permission_count(self, obj):
        """Get count of permissions in this group."""
        return obj.group_permissions.filter(is_active=True).count()

    def _log_audit_trail(self, group, action, request, details=None):
        """Log audit trail for group operations."""
        try:
            if request and hasattr(request, 'user') and hasattr(request.user, 'tenant_user_profile'):
                PermissionAuditTrail.objects.create(
                    tenant=group.tenant,
                    user_profile=request.user.tenant_user_profile,
                    action_type=action,
                    resource_type='permission_group',
                    resource_id=str(group.id),
                    resource_name=group.group_name,
                    action_details=details or {},
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                )
        except Exception as e:
            # Don't fail the operation if audit logging fails
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to log audit trail: {e}")

    def create(self, validated_data):
        """Create a new permission group with permissions."""
        permissions_data = validated_data.pop('permissions', [])
        
        # Set created_by to the current user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
            
            # Set tenant from user's profile
            if hasattr(request.user, 'tenant_user_profile'):
                validated_data['tenant'] = request.user.tenant_user_profile.tenant
        
        # Create the group
        group = super().create(validated_data)
        
        # Assign permissions to the group
        self._update_group_permissions(group, permissions_data, request)
        
        # Log audit trail for group creation
        self._log_audit_trail(
            group, 
            'group_created', 
            request,
            {
                'group_type': group.group_type,
                'permissions_assigned': len(permissions_data),
                'is_system_group': group.is_system_group
            }
        )
        
        return group

    def update(self, instance, validated_data):
        """Update permission group with permissions."""
        permissions_data = validated_data.pop('permissions', None)
        request = self.context.get('request')
        
        # Track changes for audit trail
        changes = {}
        old_permissions = set(instance.group_permissions.filter(is_active=True).values_list('permission_id', flat=True))
        
        # Update basic fields
        for attr, value in validated_data.items():
            if getattr(instance, attr) != value:
                changes[attr] = {
                    'old': getattr(instance, attr),
                    'new': value
                }
                setattr(instance, attr, value)
        
        instance.save()
        
        # Update permissions if provided
        if permissions_data is not None:
            self._update_group_permissions(instance, permissions_data, request)
            
            # Track permission changes
            new_permissions = set(permissions_data)
            added_permissions = new_permissions - old_permissions
            removed_permissions = old_permissions - new_permissions
            
            if added_permissions or removed_permissions:
                changes['permissions'] = {
                    'added': list(added_permissions),
                    'removed': list(removed_permissions),
                    'total_before': len(old_permissions),
                    'total_after': len(new_permissions)
                }
        
        # Log audit trail for group update
        if changes:
            self._log_audit_trail(
                instance, 
                'group_updated', 
                request,
                {
                    'changes': changes,
                    'fields_changed': list(changes.keys())
                }
            )
        
        return instance

    def _log_group_activity(self, group, action_type, request, details):
        """Log group activity to audit trail."""
        if not request or not hasattr(request.user, 'tenant_user_profile'):
            return
            
        try:
            from ..models import PermissionAuditTrail
            
            PermissionAuditTrail.objects.create(
                tenant=group.tenant,
                action_type=action_type,
                entity_type='group',
                entity_id=group.id,
                old_value=details.get('old_values'),
                new_value=details.get('new_values', {
                    'group_name': group.group_name,
                    'group_type': group.group_type
                }),
                change_reason=f'Permission group {action_type}',
                performed_by=request.user,
                additional_context=details
            )
        except Exception as e:
            # Don't fail the main operation if logging fails
            logger.error(f"Failed to log group activity: {str(e)}")

    def _update_group_permissions(self, group, permission_ids, request):
        """Update group permissions."""
        from ..models import PermissionRegistry, PermissionGroupPermission
        
        # Get current user for audit trail
        current_user = request.user if request else None
        
        # Get the tenant
        tenant = group.tenant
        
        # Clear existing permissions
        PermissionGroupPermission.objects.filter(group=group).delete()
        
        # Add new permissions
        for permission_id in permission_ids:
            try:
                permission = PermissionRegistry.objects.get(
                    id=permission_id, 
                    tenant=tenant
                )
                
                PermissionGroupPermission.objects.create(
                    group=group,
                    permission=permission,
                    permission_level='granted',
                    added_by=current_user,
                    is_active=True
                )
            except PermissionRegistry.DoesNotExist:
                # Skip invalid permission IDs
                continue


class UserPermissionGroupAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for user-group assignments."""
    
    user_name = serializers.CharField(source='user_profile.user.full_name', read_only=True)
    user_email = serializers.CharField(source='user_profile.user.email', read_only=True)
    group_name = serializers.CharField(source='group.group_name', read_only=True)
    group_code = serializers.CharField(source='group.group_code', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    
    class Meta:
        model = UserPermissionGroupAssignment
        fields = [
            'id', 'user_profile', 'user_name', 'user_email',
            'group', 'group_name', 'group_code', 'assignment_reason',
            'scope_override', 'effective_from', 'effective_to',
            'is_temporary', 'is_active', 'assigned_by_name',
            'approved_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user_name', 'user_email', 'group_name', 'group_code',
            'assigned_by_name', 'approved_by_name', 'created_at', 'updated_at'
        ]


class UserPermissionOverrideSerializer(serializers.ModelSerializer):
    """Serializer for user permission overrides."""
    
    user_name = serializers.CharField(source='user_profile.user.full_name', read_only=True)
    user_email = serializers.CharField(source='user_profile.user.email', read_only=True)
    permission_name = serializers.CharField(source='permission.permission_name', read_only=True)
    permission_code = serializers.CharField(source='permission.permission_code', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    
    user_profile_id = serializers.IntegerField(write_only=True)
    permission_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = UserPermissionOverride
        fields = [
            'id', 'user_profile_id', 'user_name', 'user_email',
            'permission_id', 'permission_name', 'permission_code',
            'override_type', 'permission_level', 'override_reason',
            'business_justification', 'scope_override',
            'geographic_scope_override', 'functional_scope_override',
            'temporal_scope_override', 'conditions', 'approval_required',
            'requires_mfa', 'effective_from', 'effective_to',
            'is_temporary', 'auto_expire', 'approval_status',
            'approved_at', 'rejection_reason', 'granted_by_name',
            'approved_by_name', 'created_at', 'updated_at', 'is_active'
        ]
        read_only_fields = [
            'id', 'user_name', 'user_email', 'permission_name',
            'permission_code', 'granted_by_name', 'approved_by_name',
            'created_at', 'updated_at', 'approved_at'
        ]
    
    def validate(self, data):
        """Validate override data."""
        if data.get('is_temporary', False) and not data.get('effective_to'):
            raise serializers.ValidationError(
                "effective_to is required for temporary overrides"
            )
        
        if data.get('effective_to') and data.get('effective_from'):
            if data['effective_to'] <= data['effective_from']:
                raise serializers.ValidationError(
                    "effective_to must be after effective_from"
                )
        
        return data


class DesignationBasePermissionSerializer(serializers.ModelSerializer):
    """Serializer for designation base permissions."""
    
    designation_name = serializers.CharField(source='designation.designation_name', read_only=True)
    permission_name = serializers.CharField(source='permission.permission_name', read_only=True)
    permission_code = serializers.CharField(source='permission.permission_code', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.full_name', read_only=True)
    
    class Meta:
        model = DesignationBasePermission
        fields = [
            'id', 'designation', 'designation_name', 'permission',
            'permission_name', 'permission_code', 'permission_level',
            'scope_configuration', 'conditions', 'geographic_scope',
            'functional_scope', 'temporal_scope', 'is_inherited',
            'is_mandatory', 'priority_level', 'granted_by_name',
            'granted_at', 'is_active'
        ]
        read_only_fields = [
            'id', 'designation_name', 'permission_name', 'permission_code',
            'granted_by_name', 'granted_at'
        ]


class UserEffectivePermissionsSerializer(serializers.Serializer):
    """Serializer for user effective permissions response."""
    
    permissions = serializers.DictField()
    scope_limitations = serializers.DictField()
    permission_summary = serializers.DictField()
    metadata = serializers.DictField()


class PermissionCheckRequestSerializer(serializers.Serializer):
    """Serializer for permission check requests."""
    
    permission_code = serializers.CharField(max_length=100)
    scope_context = serializers.DictField(required=False, allow_null=True)
    user_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_permission_code(self, value):
        """Validate permission code exists."""
        if not value.strip():
            raise serializers.ValidationError("Permission code cannot be empty")
        return value


class PermissionCheckResponseSerializer(serializers.Serializer):
    """Serializer for permission check responses."""
    
    has_permission = serializers.BooleanField()
    permission_code = serializers.CharField()
    user_id = serializers.IntegerField()
    details = serializers.DictField()
    checked_at = serializers.DateTimeField()


class PermissionAuditTrailSerializer(serializers.ModelSerializer):
    """Serializer for permission audit trail."""
    
    performed_by_name = serializers.CharField(source='performed_by.full_name', read_only=True)
    performed_by_email = serializers.CharField(source='performed_by.email', read_only=True)
    permission_name = serializers.SerializerMethodField()
    change_summary = serializers.SerializerMethodField()
    entity_name = serializers.SerializerMethodField()
    action_description = serializers.SerializerMethodField()
    
    class Meta:
        model = PermissionAuditTrail
        fields = [
            'id', 'entity_type', 'entity_id', 'action_type', 'additional_context',
            'performed_by', 'performed_by_name', 'performed_by_email',
            'performed_at', 'permission_name', 'change_summary', 'entity_name', 'action_description'
        ]
        read_only_fields = ['id', 'performed_by_name', 'performed_by_email']
    
    def get_permission_name(self, obj):
        """Get permission name if this is a permission-related audit entry."""
        try:
            if obj.entity_type == 'permission_management' and 'permission_code' in obj.additional_context:
                return obj.additional_context['permission_code']
            return None
        except:
            return None
    
    def get_business_template_display(self, business_template):
        """Get human-readable business template name."""
        template_map = {
            'view_only': 'View-Only Access',
            'contributor': 'Contributor/Editor',
            'creator_only': 'Creator Only',
            'full_access': 'Full Access/Administrator',
            'custom': 'Custom Permission'
        }
        return template_map.get(business_template, business_template)

    def get_entity_name(self, obj):
        """Get a human-readable entity name instead of just the ID."""
        try:
            # First check if entity name is in additional_context
            context = obj.additional_context or {}
            if obj.entity_type == 'group' and context.get('group_name'):
                return context['group_name']
            elif obj.entity_type == 'user' and context.get('user_name'):
                return context['user_name']
            elif obj.entity_type == 'permission' and context.get('permission_name'):
                return context['permission_name']
            elif obj.entity_type == 'system' and context.get('permission_name'):
                return context['permission_name']
            elif obj.entity_type == 'designation' and context.get('designation_name'):
                return context['designation_name']
            
            # Fallback to database lookup
            from ..models import PermissionGroup, PermissionRegistry, TenantUserProfile, TenantDesignation
            
            if obj.entity_type == 'group':
                try:
                    group = PermissionGroup.objects.get(id=obj.entity_id, tenant=obj.tenant)
                    return group.group_name
                except PermissionGroup.DoesNotExist:
                    return f"Deleted Group (ID: {obj.entity_id})"
            
            elif obj.entity_type == 'user':
                try:
                    user_profile = TenantUserProfile.objects.select_related('user').get(
                        id=obj.entity_id, tenant=obj.tenant
                    )
                    return user_profile.user.full_name or user_profile.user.email
                except TenantUserProfile.DoesNotExist:
                    return f"Unknown User (ID: {obj.entity_id})"
             
            elif obj.entity_type == 'permission':
                try:
                    permission = PermissionRegistry.objects.get(id=obj.entity_id, tenant=obj.tenant)
                    return permission.permission_name
                except PermissionRegistry.DoesNotExist:
                    return f"Unknown Permission (ID: {obj.entity_id})"
             
            elif obj.entity_type == 'system':
                try:
                    permission = PermissionRegistry.objects.get(id=obj.entity_id, tenant=obj.tenant)
                    return permission.permission_name
                except PermissionRegistry.DoesNotExist:
                    return f"Unknown Permission (ID: {obj.entity_id})"
            
            elif obj.entity_type == 'designation':
                try:
                    designation = TenantDesignation.objects.get(id=obj.entity_id, tenant=obj.tenant)
                    return designation.designation_name
                except:
                    return f"Unknown Designation (ID: {obj.entity_id})"
            
            return f"{obj.entity_type.title()} (ID: {obj.entity_id})"
        except Exception:
            return f"{obj.entity_type.title()} (ID: {obj.entity_id})"

    def get_action_description(self, obj):
        """Generate a more descriptive action based on entity type and action type."""
        entity_name = self.get_entity_name(obj)
        
        action_descriptions = {
            'group': {
                'modify': f"Group Updated",
                'grant': f"Group Created",
                'revoke': f"Group Deleted",
                'restrict': f"Group Restricted",
                'escalate': f"Group Permissions Escalated",
                'expire': f"Group Expired"
            },
            'user': {
                'modify': f"User Permissions Updated",
                'grant': f"Permissions Granted to User",
                'revoke': f"Permissions Revoked from User",
                'restrict': f"User Permissions Restricted",
                'escalate': f"User Permissions Escalated",
                'expire': f"User Permissions Expired"
            },
            'permission': {
                'modify': f"Permission Updated",
                'grant': f"Permission Created",
                'revoke': f"Permission Deleted",
                'restrict': f"Permission Restricted",
                'escalate': f"Permission Escalated",
                'expire': f"Permission Expired"
            },
            'system': {
                'modify': f"Permission Updated",
                'grant': f"Permission Created",
                'revoke': f"Permission Deleted",
                'restrict': f"Permission Restricted",
                'escalate': f"Permission Escalated",
                'expire': f"Permission Expired"
            },
            'designation': {
                'modify': f"Designation Updated",
                'grant': f"Permissions Assigned to Designation",
                'revoke': f"Permissions Removed from Designation",
                'restrict': f"Designation Restricted",
                'escalate': f"Designation Permissions Escalated",
                'expire': f"Designation Permissions Expired"
            }
        }
        
        entity_actions = action_descriptions.get(obj.entity_type, {})
        return entity_actions.get(obj.action_type, f"{obj.action_type.title()} {obj.entity_type.title()}")

    def get_change_summary(self, obj):
        """Generate a human-readable summary of what changed."""
        summary = []
        old = obj.old_value or {}
        new = obj.new_value or {}
        context = obj.additional_context or {}
        
        # Check if this is a new creation (old values are empty/null)
        is_new_creation = (
            not old or 
            (isinstance(old, dict) and not any(old.values())) or
            context.get('is_new_creation') == True or
            context.get('operation') == 'create'
        )
        
        # Handle new creation cases with friendly messages
        if is_new_creation:
            if obj.entity_type == 'group':
                return ["🆕 Added new Permission Group"]
            elif obj.entity_type == 'user':
                if obj.action_type == 'grant':
                    return ["🆕 Added new Permission"]
                else:
                    return ["🆕 Added new User Permission"]
            elif obj.entity_type == 'designation':
                return ["🆕 Added new Designation Permission"]
            elif obj.entity_type == 'permission':
                return ["🆕 Added new Permission"]
            elif obj.entity_type == 'system':
                if 'permission' in context.get('entity_name', '').lower():
                    return ["🆕 Added new Permission"]
                else:
                    return ["🆕 Added new System Entity"]
            else:
                # Generic fallback for other entity types
                entity_name = obj.entity_type.replace('_', ' ').title()
                return [f"🆕 Added new {entity_name}"]
        
        # Use changed_fields if available (more accurate)
        if context.get('changed_fields'):
            changed_fields = context['changed_fields']
            for field, changes in changed_fields.items():
                old_val = changes.get('old')
                new_val = changes.get('new')
                
                if field == 'is_active':
                    if new_val:
                        summary.append("✅ Activated")
                    else:
                        summary.append("❌ Deactivated")
                elif field == 'group_name':
                    summary.append(f"📝 Name: '{old_val}' → '{new_val}'")
                elif field == 'group_type':
                    summary.append(f"🏷️ Type: {old_val.title()} → {new_val.title()}")
                elif field == 'description':
                    summary.append("📄 Description updated")
                elif field == 'business_template':
                    old_display = self.get_business_template_display(old_val)
                    new_display = self.get_business_template_display(new_val)
                    summary.append(f"🎯 Template: {old_display} → {new_display}")
                elif field == 'permission_type':
                    summary.append(f"⚙️ Type: {old_val.title()} → {new_val.title()}")
                elif field == 'group_code':
                    summary.append(f"🔗 Code: '{old_val}' → '{new_val}'")
                elif field == 'is_assignable':
                    if new_val:
                        summary.append("🔓 Made assignable to users")
                    else:
                        summary.append("🔒 Made non-assignable to users")
                elif field == 'permissions':
                    # Handle permissions changes
                    old_perms = set(old_val) if isinstance(old_val, list) else set()
                    new_perms = set(new_val) if isinstance(new_val, list) else set()
                    
                    added_perms = new_perms - old_perms
                    removed_perms = old_perms - new_perms
                    
                    if added_perms:
                        summary.append(f"➕ Added {len(added_perms)} permission(s)")
                    if removed_perms:
                        summary.append(f"➖ Removed {len(removed_perms)} permission(s)")
                    
                    # If no additions or removals but lists are different, it means reordering
                    if not added_perms and not removed_perms and old_perms != new_perms:
                        summary.append("🔄 Permissions reordered")
                elif field == 'auto_assign_conditions':
                    if new_val and not old_val:
                        summary.append("🎯 Auto-assignment conditions added")
                    elif old_val and not new_val:
                        summary.append("🎯 Auto-assignment conditions removed")
                    elif old_val != new_val:
                        summary.append("🎯 Auto-assignment conditions updated")
                else:
                    field_name = field.replace('_', ' ').title()
                    summary.append(f"📋 {field_name}: '{old_val}' → '{new_val}'")
        else:
            # Fallback to old logic for backward compatibility
            if 'old_values' in old and 'new_values' in new:
                old_values = old['old_values']
                new_values = new['new_values']
            else:
                old_values = old
                new_values = new
            
            # Only show fields that actually changed
            for key in set(old_values.keys()).union(new_values.keys()):
                old_val = old_values.get(key)
                new_val = new_values.get(key)
                if old_val != new_val:
                    if key == 'is_active':
                        if new_val:
                            summary.append("✅ Activated")
                        else:
                            summary.append("❌ Deactivated")
                    elif key == 'group_name':
                        summary.append(f"📝 Name: '{old_val}' → '{new_val}'")
                    elif key == 'group_type':
                        summary.append(f"🏷️ Type: {old_val.title()} → {new_val.title()}")
                    elif key == 'description':
                        summary.append("📄 Description updated")
                    elif key == 'group_code':
                        summary.append(f"🔗 Code: '{old_val}' → '{new_val}'")
                    elif key == 'is_assignable':
                        if new_val:
                            summary.append("🔓 Made assignable to users")
                        else:
                            summary.append("🔒 Made non-assignable to users")
                    elif key == 'permissions':
                        # Handle permissions changes
                        old_perms = set(old_val) if isinstance(old_val, list) else set()
                        new_perms = set(new_val) if isinstance(new_val, list) else set()
                        
                        added_perms = new_perms - old_perms
                        removed_perms = old_perms - new_perms
                        
                        if added_perms:
                            summary.append(f"➕ Added {len(added_perms)} permission(s)")
                        if removed_perms:
                            summary.append(f"➖ Removed {len(removed_perms)} permission(s)")
                    else:
                        field_name = key.replace('_', ' ').title()
                        summary.append(f"📋 {field_name}: '{old_val}' → '{new_val}'")
        
        # Show added/removed permissions if present in additional context
        if context.get('permissions_added'):
            added_perms = context['permissions_added']
            if isinstance(added_perms, list):
                summary.append(f"➕ Added permissions: {', '.join(added_perms[:3])}{'...' if len(added_perms) > 3 else ''}")
            else:
                summary.append(f"➕ Added permissions: {added_perms}")
                
        if context.get('permissions_removed'):
            removed_perms = context['permissions_removed']
            if isinstance(removed_perms, list):
                summary.append(f"➖ Removed permissions: {', '.join(removed_perms[:3])}{'...' if len(removed_perms) > 3 else ''}")
            else:
                summary.append(f"➖ Removed permissions: {removed_perms}")
        
        # Show change reason if present
        if obj.change_reason and obj.change_reason.strip():
            summary.append(f"💬 Reason: {obj.change_reason}")
        
        return summary if summary else ["No specific changes recorded"]


class PermissionSummarySerializer(serializers.Serializer):
    """Serializer for permission summary statistics."""
    
    total_permissions = serializers.IntegerField()
    active_permissions = serializers.IntegerField()
    by_category = serializers.DictField()
    by_risk_level = serializers.DictField()
    by_permission_type = serializers.DictField()
    recent_changes = serializers.IntegerField()


class GroupSummarySerializer(serializers.Serializer):
    """Serializer for group summary statistics."""
    
    total_groups = serializers.IntegerField()
    active_groups = serializers.IntegerField()
    by_group_type = serializers.DictField()
    total_assignments = serializers.IntegerField()
    recent_assignments = serializers.IntegerField()


class UserPermissionSummarySerializer(serializers.Serializer):
    """Serializer for user permission summary."""
    
    user_id = serializers.IntegerField()
    user_name = serializers.CharField()
    user_email = serializers.CharField()
    total_permissions = serializers.IntegerField()
    direct_assignments = serializers.IntegerField()
    group_assignments = serializers.IntegerField()
    designation_permissions = serializers.IntegerField()
    override_count = serializers.IntegerField()
    last_calculated = serializers.DateTimeField()
    requires_mfa_count = serializers.IntegerField()
    administrative_access = serializers.BooleanField()


class BulkPermissionAssignmentSerializer(serializers.Serializer):
    """Serializer for bulk permission assignments."""
    
    target_type = serializers.ChoiceField(choices=[
        ('designation', 'Designation'),
        ('group', 'Permission Group'),
        ('user', 'User')
    ])
    target_id = serializers.IntegerField()
    permissions = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    assignment_reason = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    def validate_permissions(self, value):
        """Validate permission assignment data."""
        for perm_data in value:
            if 'permission_id' not in perm_data:
                raise serializers.ValidationError(
                    "Each permission must have a permission_id"
                )
            
            if 'permission_level' not in perm_data:
                perm_data['permission_level'] = 'granted'
            
            if perm_data['permission_level'] not in ['granted', 'denied', 'conditional']:
                raise serializers.ValidationError(
                    f"Invalid permission_level: {perm_data['permission_level']}"
                )
        
        return value


class PermissionConflictSerializer(serializers.Serializer):
    """Serializer for permission conflicts."""
    
    permission_code = serializers.CharField()
    user_id = serializers.IntegerField()
    conflict_sources = serializers.ListField(
        child=serializers.DictField()
    )
    resolution = serializers.DictField()
    resolved_at = serializers.DateTimeField()


class PermissionTemplateSerializer(serializers.Serializer):
    """Serializer for permission templates."""
    
    template_name = serializers.CharField(max_length=100)
    template_description = serializers.CharField(max_length=500, required=False, allow_blank=True)
    template_type = serializers.ChoiceField(choices=[
        ('designation', 'Designation Template'),
        ('group', 'Group Template'),
        ('role', 'Role Template')
    ])
    permissions = serializers.ListField(
        child=serializers.DictField()
    )
    metadata = serializers.DictField(required=False)


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for department management."""
    
    class Meta:
        model = TenantDepartment
        fields = [
            'id', 'department_name', 'department_code', 'description', 'parent_department',
            'is_operational', 'requires_safety_training', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_department_name(self, value):
        """Validate department name uniqueness within tenant."""
        tenant = self.context['request'].user.tenant_user_profile.tenant
        if self.instance:
            # Update case - exclude current instance
            if TenantDepartment.objects.filter(
                tenant=tenant, 
                department_name__iexact=value
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("Department with this name already exists.")
        else:
            # Create case
            if TenantDepartment.objects.filter(tenant=tenant, department_name__iexact=value).exists():
                raise serializers.ValidationError("Department with this name already exists.")
        return value


class TenantDesignationSerializer(serializers.ModelSerializer):
    """Serializer for tenant designation management."""
    
    user_count = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = TenantDesignation
        fields = [
            'id', 'designation_name', 'designation_code', 'designation_level',
            'department', 'department_name', 'description', 'is_active',
            'designation_type', 'certifications_required',
            'permissions', 'feature_access', 'data_access_level',
            'custom_capabilities', 'geographic_scope', 'functional_scope',
            'cross_functional_access', 'multi_location_access',
            'can_manage_users', 'can_create_projects', 'can_assign_tasks',
            'can_approve_expenses', 'can_access_reports', 'expense_approval_limit',
            'is_system_role', 'is_template', 'user_count', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'designation_code', 'created_at', 'updated_at', 
            'user_count', 'department_name', 'created_by_name'
        ]
    
    def get_user_count(self, obj):
        """Get number of users assigned to this designation."""
        try:
            from ..models import UserDesignationAssignment
            return UserDesignationAssignment.objects.filter(
                designation=obj,
                is_active=True,
                assignment_status='Active'
            ).count()
        except Exception:
            return 0
    
    def validate_designation_name(self, value):
        """Validate designation name uniqueness within tenant."""
        tenant = self.context['request'].user.tenant_user_profile.tenant
        if self.instance:
            # Update case - exclude current instance
            if TenantDesignation.objects.filter(
                tenant=tenant, 
                designation_name__iexact=value
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("Designation with this name already exists.")
        else:
            # Create case
            if TenantDesignation.objects.filter(tenant=tenant, designation_name__iexact=value).exists():
                raise serializers.ValidationError("Designation with this name already exists.")
        return value
    
    def validate_certifications_required(self, value):
        """Validate certifications format."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Certifications must be a dictionary.")
        
        valid_certifications = ['farmtocli', 'fat', 'medical']
        for cert in value.keys():
            if cert not in valid_certifications:
                raise serializers.ValidationError(
                    f"Invalid certification '{cert}'. Valid options: {valid_certifications}"
                )
        
        for cert, required in value.items():
            if not isinstance(required, bool):
                raise serializers.ValidationError(
                    f"Certification '{cert}' value must be boolean."
                )
        
        return value
    
    def validate(self, attrs):
        """Validate designation data."""
        # If designation type is non_field, reset certifications
        if attrs.get('designation_type') == 'non_field':
            attrs['certifications_required'] = {
                'farmtocli': False,
                'fat': False,
                'medical': False
            }
        
        # Ensure certifications_required has default structure
        if 'certifications_required' not in attrs:
            attrs['certifications_required'] = {
                'farmtocli': False,
                'fat': False,
                'medical': False
            }
        else:
            # Ensure all required keys are present
            required_certs = ['farmtocli', 'fat', 'medical']
            for cert in required_certs:
                if cert not in attrs['certifications_required']:
                    attrs['certifications_required'][cert] = False
        
        return attrs
    
    def create(self, validated_data):
        """Create designation with auto-generated code."""
        tenant = self.context['request'].user.tenant_user_profile.tenant
        user = self.context['request'].user
        
        # Auto-generate designation code
        validated_data['designation_code'] = validated_data['designation_name'].lower().replace(' ', '_')
        validated_data['tenant'] = tenant
        validated_data['created_by'] = user
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update designation."""
        user = self.context['request'].user
        validated_data['updated_by'] = user
        
        return super().update(instance, validated_data)


class TenantDepartmentSerializer(serializers.ModelSerializer):
    """Serializer for tenant department management."""
    
    user_count = serializers.SerializerMethodField()
    parent_department_name = serializers.CharField(source='parent_department.department_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = TenantDepartment
        fields = [
            'id', 'department_name', 'department_code', 'department_level',
            'description', 'is_active', 'is_operational', 'requires_safety_training',
            'parent_department', 'parent_department_name', 'can_manage_subordinates',
            'max_subordinates', 'hierarchy_path', 'can_manage_users', 'can_create_projects',
            'can_assign_tasks', 'can_approve_expenses', 'can_access_reports',
            'expense_approval_limit', 'is_system_department', 'is_template',
            'user_count', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'department_code', 'created_at', 'updated_at', 
            'user_count', 'parent_department_name', 'created_by_name'
        ]
    
    def get_user_count(self, obj):
        """Get number of users in this department."""
        try:
            return obj.tenant_user_profiles.filter(is_active=True).count()
        except Exception:
            return 0
    
    def validate_department_name(self, value):
        """Validate department name uniqueness within tenant."""
        tenant = self.context['request'].user.tenant_user_profile.tenant
        if self.instance:
            # Update case - exclude current instance
            if TenantDepartment.objects.filter(
                tenant=tenant,
                department_name__iexact=value
            ).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("Department with this name already exists.")
        else:
            # Create case
            if TenantDepartment.objects.filter(tenant=tenant, department_name__iexact=value).exists():
                raise serializers.ValidationError("Department with this name already exists.")
        return value
    
    def create(self, validated_data):
        """Create department with auto-generated code."""
        tenant = self.context['request'].user.tenant_user_profile.tenant
        user = self.context['request'].user
        
        # Auto-generate department code
        validated_data['department_code'] = validated_data['department_name'].lower().replace(' ', '_')
        validated_data['tenant'] = tenant
        validated_data['created_by'] = user
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update department."""
        user = self.context['request'].user
        validated_data['updated_by'] = user
        
        return super().update(instance, validated_data) 
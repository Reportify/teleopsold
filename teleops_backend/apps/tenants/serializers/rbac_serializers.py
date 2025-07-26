"""
RBAC Serializers
Serializers for tenant RBAC API endpoints.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from ..models import (
    PermissionRegistry, PermissionGroup, PermissionGroupPermission,
    UserPermissionGroupAssignment, UserPermissionOverride,
    DesignationBasePermission, PermissionAuditTrail,
    TenantUserProfile, TenantDesignation, TenantDepartment
)

User = get_user_model()


class PermissionRegistrySerializer(serializers.ModelSerializer):
    """Serializer for permission registry entries."""
    
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    usage_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PermissionRegistry
        fields = [
            'id', 'permission_name', 'permission_code', 'permission_category',
            'description', 'permission_type', 'is_system_permission',
            'requires_scope', 'is_delegatable', 'risk_level', 'resource_type',
            'action_type', 'effect', 'is_active', 'is_auditable',
            'created_by_name', 'created_at', 'updated_at', 'usage_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name', 'usage_count']
    
    def get_usage_count(self, obj):
        """Get total usage count for this permission."""
        try:
            designation_count = obj.designation_assignments.filter(is_active=True).count()
            group_count = obj.group_assignments.filter(is_active=True).count()
            override_count = obj.user_overrides.filter(is_active=True).count()
            return designation_count + group_count + override_count
        except:
            return 0
    
    def validate_permission_code(self, value):
        """Validate permission code format."""
        if not value.replace('_', '').replace('.', '').isalnum():
            raise serializers.ValidationError(
                "Permission code must contain only letters, numbers, underscores, and dots"
            )
        return value


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
    user_count = serializers.SerializerMethodField()
    permission_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PermissionGroup
        fields = [
            'id', 'group_name', 'group_code', 'description', 'group_type',
            'is_system_group', 'is_assignable', 'auto_assign_conditions',
            'is_active', 'created_by_name', 'created_at', 'updated_at',
            'group_permissions', 'user_count', 'permission_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by_name']
    
    def get_user_count(self, obj):
        """Get count of users assigned to this group."""
        return obj.user_assignments.filter(is_active=True).count()
    
    def get_permission_count(self, obj):
        """Get count of permissions in this group."""
        return obj.group_permissions.filter(is_active=True).count()


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
    
    class Meta:
        model = PermissionAuditTrail
        fields = [
            'id', 'entity_type', 'entity_id', 'action', 'details',
            'performed_by', 'performed_by_name', 'performed_by_email',
            'performed_at', 'permission_name'
        ]
        read_only_fields = ['id', 'performed_by_name', 'performed_by_email']
    
    def get_permission_name(self, obj):
        """Get permission name if this is a permission-related audit entry."""
        try:
            if obj.entity_type == 'permission_management' and 'permission_code' in obj.details:
                return obj.details['permission_code']
            return None
        except:
            return None


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
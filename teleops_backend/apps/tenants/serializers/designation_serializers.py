"""
Designation Management Serializers

Serializers for tenant-driven designation management API endpoints.
Handles data validation, serialization, and complex nested relationships.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from datetime import date
from typing import Dict, Any

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


# ============================================================================
# Core Designation Serializers
# ============================================================================

class DesignationSerializer(serializers.ModelSerializer):
    """
    Serializer for TenantDesignation model with full field support
    """
    
    # Read-only computed fields
    hierarchy_path = serializers.CharField(read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    parent_designation_name = serializers.CharField(source='parent_designation.designation_name', read_only=True)
    subordinate_count = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    
    # Optional nested relationships
    subordinate_designations = serializers.SerializerMethodField()
    
    class Meta:
        model = TenantDesignation
        fields = [
            'id', 'tenant', 'designation_name', 'designation_code', 'designation_level',
            'department', 'description', 'parent_designation', 'parent_designation_name',
            'can_manage_subordinates', 'approval_authority_level', 'delegation_allowed',
            'max_subordinates', 'hierarchy_path', 'permissions', 'feature_access',
            'data_access_level', 'custom_capabilities', 'geographic_scope',
            'functional_scope', 'cross_functional_access', 'multi_location_access',
            'can_manage_users', 'can_create_projects', 'can_assign_tasks',
            'can_approve_expenses', 'can_access_reports', 'expense_approval_limit',
            'is_system_role', 'is_active', 'is_template', 'created_by', 'created_by_name',
            'created_at', 'updated_by', 'updated_by_name', 'updated_at', 'deleted_at',
            'subordinate_count', 'user_count', 'subordinate_designations'
        ]
        read_only_fields = [
            'id', 'tenant', 'hierarchy_path', 'is_system_role', 'created_by', 
            'created_at', 'updated_by', 'updated_at', 'deleted_at'
        ]

    def get_subordinate_count(self, obj):
        """Get count of direct subordinate designations"""
        return obj.subordinate_designations.filter(is_active=True).count()

    def get_user_count(self, obj):
        """Get count of users assigned to this designation"""
        return UserDesignationAssignment.objects.filter(
            designation=obj,
            is_active=True,
            assignment_status='Active'
        ).count()

    def get_subordinate_designations(self, obj):
        """Get simplified subordinate designations if requested"""
        request = self.context.get('request')
        if request and request.query_params.get('include_subordinates'):
            subordinates = obj.subordinate_designations.filter(is_active=True)
            return DesignationListSerializer(subordinates, many=True).data
        return None

    def validate_designation_code(self, value):
        """Validate designation code uniqueness within tenant"""
        tenant = self.context['tenant']
        
        # Check for existing designation with same code (excluding current instance)
        existing = TenantDesignation.objects.filter(
            tenant=tenant,
            designation_code=value,
            is_active=True
        )
        
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
            
        if existing.exists():
            raise serializers.ValidationError("Designation code must be unique within tenant")
        
        return value

    def validate_designation_level(self, value):
        """Validate designation level"""
        if value < 1:
            raise serializers.ValidationError("Designation level must be positive")
        return value

    def validate_expense_approval_limit(self, value):
        """Validate expense approval limit"""
        if value < 0:
            raise serializers.ValidationError("Expense approval limit cannot be negative")
        return value

    def validate(self, attrs):
        """Cross-field validation"""
        # Validate parent designation relationship
        parent_designation = attrs.get('parent_designation')
        designation_level = attrs.get('designation_level')
        
        if parent_designation and designation_level:
            if designation_level <= parent_designation.designation_level:
                raise serializers.ValidationError({
                    'designation_level': 'Designation level must be higher than parent level'
                })
        
        return attrs

    def create(self, validated_data):
        """Create designation with tenant context"""
        validated_data['tenant'] = self.context['tenant']
        validated_data['created_by'] = self.context['request'].user
        validated_data['updated_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Update designation with audit info"""
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class DesignationListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for designation lists and nested relationships
    """
    
    parent_designation_name = serializers.CharField(source='parent_designation.designation_name', read_only=True)
    subordinate_count = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TenantDesignation
        fields = [
            'id', 'designation_name', 'designation_code', 'designation_level',
            'department', 'parent_designation', 'parent_designation_name',
            'can_manage_subordinates', 'approval_authority_level', 'data_access_level',
            'is_system_role', 'is_active', 'subordinate_count', 'user_count',
            'created_at', 'updated_at'
        ]

    def get_subordinate_count(self, obj):
        return obj.subordinate_designations.filter(is_active=True).count()

    def get_user_count(self, obj):
        return UserDesignationAssignment.objects.filter(
            designation=obj,
            is_active=True,
            assignment_status='Active'
        ).count()


class DesignationCreateSerializer(serializers.ModelSerializer):
    """
    Specialized serializer for creating designations with validation
    """
    
    class Meta:
        model = TenantDesignation
        fields = [
            'designation_name', 'designation_code', 'designation_level', 'department',
            'description', 'parent_designation', 'can_manage_subordinates',
            'approval_authority_level', 'delegation_allowed', 'max_subordinates',
            'permissions', 'feature_access', 'data_access_level', 'custom_capabilities',
            'geographic_scope', 'functional_scope', 'cross_functional_access',
            'multi_location_access', 'can_manage_users', 'can_create_projects',
            'can_assign_tasks', 'can_approve_expenses', 'can_access_reports',
            'expense_approval_limit'
        ]

    def validate_designation_code(self, value):
        """Ensure designation code is unique within tenant"""
        tenant = self.context['tenant']
        if TenantDesignation.objects.filter(tenant=tenant, designation_code=value, is_active=True).exists():
            raise serializers.ValidationError("Designation code must be unique within tenant")
        return value


# ============================================================================
# Permission Management Serializers
# ============================================================================

class PermissionCategorySerializer(serializers.ModelSerializer):
    """
    Serializer for tenant permission categories
    """
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    permission_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PermissionCategory
        fields = [
            'id', 'tenant', 'category_name', 'category_code', 'description',
            'is_system_category', 'is_active', 'sort_order', 'created_by',
            'created_by_name', 'created_at', 'updated_at', 'permission_count'
        ]
        read_only_fields = ['id', 'tenant', 'is_system_category', 'created_by', 'created_at', 'updated_at']

    def get_permission_count(self, obj):
        """Get count of permissions in this category"""
        return obj.permissions.filter(is_active=True).count()

    def validate_category_code(self, value):
        """Validate category code uniqueness within tenant"""
        tenant = self.context['tenant']
        existing = PermissionCategory.objects.filter(tenant=tenant, category_code=value)
        
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
            
        if existing.exists():
            raise serializers.ValidationError("Category code must be unique within tenant")
        
        return value

    def create(self, validated_data):
        """Create category with tenant context"""
        validated_data['tenant'] = self.context['tenant']
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class CustomPermissionSerializer(serializers.ModelSerializer):
    """
    Serializer for tenant custom permissions
    """
    
    category_name = serializers.CharField(source='category.category_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    usage_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomPermission
        fields = [
            'id', 'tenant', 'category', 'category_name', 'permission_name',
            'permission_code', 'description', 'permission_type', 'requires_approval',
            'is_delegatable', 'scope_required', 'is_active', 'sort_order',
            'created_by', 'created_by_name', 'created_at', 'updated_at', 'usage_count'
        ]
        read_only_fields = ['id', 'tenant', 'created_by', 'created_at', 'updated_at']

    def get_usage_count(self, obj):
        """Get count of designations using this permission"""
        return DesignationPermission.objects.filter(permission=obj, is_active=True).count()

    def validate_permission_code(self, value):
        """Validate permission code uniqueness within tenant"""
        tenant = self.context['tenant']
        existing = CustomPermission.objects.filter(tenant=tenant, permission_code=value)
        
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
            
        if existing.exists():
            raise serializers.ValidationError("Permission code must be unique within tenant")
        
        return value

    def validate_category(self, value):
        """Validate category belongs to same tenant"""
        tenant = self.context['tenant']
        if value.tenant != tenant:
            raise serializers.ValidationError("Category must belong to same tenant")
        return value

    def create(self, validated_data):
        """Create permission with tenant context"""
        validated_data['tenant'] = self.context['tenant']
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class DesignationPermissionSerializer(serializers.ModelSerializer):
    """
    Serializer for designation permission assignments
    """
    
    designation_name = serializers.CharField(source='designation.designation_name', read_only=True)
    permission_name = serializers.CharField(source='permission.permission_name', read_only=True)
    permission_code = serializers.CharField(source='permission.permission_code', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.get_full_name', read_only=True)
    is_currently_effective = serializers.SerializerMethodField()
    
    class Meta:
        model = DesignationPermission
        fields = [
            'id', 'designation', 'designation_name', 'permission', 'permission_name',
            'permission_code', 'permission_level', 'scope_restriction', 'conditions',
            'approval_required', 'effective_from', 'effective_to', 'is_temporary',
            'granted_by', 'granted_by_name', 'granted_at', 'revoked_by', 'revoked_at',
            'is_active', 'is_currently_effective'
        ]
        read_only_fields = ['id', 'granted_by', 'granted_at', 'revoked_by', 'revoked_at']

    def get_is_currently_effective(self, obj):
        """Check if permission assignment is currently effective"""
        return obj.is_currently_effective()

    def validate(self, attrs):
        """Cross-field validation"""
        effective_from = attrs.get('effective_from')
        effective_to = attrs.get('effective_to')
        
        if effective_from and effective_to and effective_from >= effective_to:
            raise serializers.ValidationError({
                'effective_to': 'Effective to date must be after effective from date'
            })
        
        return attrs

    def create(self, validated_data):
        """Create permission assignment with audit info"""
        validated_data['granted_by'] = self.context['request'].user
        return super().create(validated_data)


# ============================================================================
# User Assignment Serializers
# ============================================================================

class UserDesignationAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for user designation assignments
    """
    
    user_name = serializers.CharField(source='user_profile.user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user_profile.user.email', read_only=True)
    designation_name = serializers.CharField(source='designation.designation_name', read_only=True)
    designation_code = serializers.CharField(source='designation.designation_code', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    is_currently_effective = serializers.SerializerMethodField()
    
    class Meta:
        model = UserDesignationAssignment
        fields = [
            'id', 'user_profile', 'user_name', 'user_email', 'designation',
            'designation_name', 'designation_code', 'is_primary_designation',
            'is_temporary', 'assignment_reason', 'geographic_scope_override',
            'functional_scope_override', 'permission_overrides', 'effective_from',
            'effective_to', 'auto_expire', 'assigned_by', 'assigned_by_name',
            'approved_by', 'approved_by_name', 'approval_required', 'assignment_status',
            'is_active', 'created_at', 'updated_at', 'is_currently_effective'
        ]
        read_only_fields = ['id', 'assigned_by', 'approved_by', 'created_at', 'updated_at']

    def get_is_currently_effective(self, obj):
        """Check if assignment is currently effective"""
        return obj.is_currently_effective()

    def validate(self, attrs):
        """Cross-field validation"""
        user_profile = attrs.get('user_profile')
        designation = attrs.get('designation')
        effective_from = attrs.get('effective_from')
        effective_to = attrs.get('effective_to')
        
        # Validate user and designation belong to same tenant
        if user_profile and designation and user_profile.tenant != designation.tenant:
            raise serializers.ValidationError("User and designation must belong to same tenant")
        
        # Validate date range
        if effective_from and effective_to and effective_from >= effective_to:
            raise serializers.ValidationError({
                'effective_to': 'Effective to date must be after effective from date'
            })
        
        return attrs

    def create(self, validated_data):
        """Create assignment with audit info"""
        validated_data['assigned_by'] = self.context['request'].user
        return super().create(validated_data)


class UserEffectivePermissionsSerializer(serializers.Serializer):
    """
    Serializer for user's effective permissions response
    """
    
    permissions = serializers.ListField(child=serializers.CharField())
    feature_access = serializers.DictField()
    geographic_scope = serializers.ListField(child=serializers.CharField())
    functional_scope = serializers.ListField(child=serializers.CharField())
    custom_capabilities = serializers.DictField()
    data_access_level = serializers.CharField()
    can_manage_users = serializers.BooleanField()
    can_create_projects = serializers.BooleanField()
    can_assign_tasks = serializers.BooleanField()
    can_approve_expenses = serializers.BooleanField()
    can_access_reports = serializers.BooleanField()
    cross_functional_access = serializers.BooleanField()
    multi_location_access = serializers.BooleanField()
    expense_approval_limit = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    # Additional context
    designation_sources = serializers.ListField(child=serializers.DictField(), required=False)
    permission_conflicts = serializers.ListField(child=serializers.DictField(), required=False)
    last_calculated = serializers.DateTimeField(required=False)


# ============================================================================
# Template Serializers
# ============================================================================

class DesignationTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for designation templates
    """
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = DesignationTemplate
        fields = [
            'id', 'tenant', 'template_name', 'template_description', 'industry_category',
            'designation_data', 'permission_set', 'hierarchy_suggestions', 'usage_count',
            'is_public', 'is_verified', 'is_active', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'tenant', 'usage_count', 'is_verified', 'created_by', 'created_at', 'updated_at']

    def validate_template_name(self, value):
        """Validate template name uniqueness within tenant"""
        tenant = self.context['tenant']
        existing = DesignationTemplate.objects.filter(tenant=tenant, template_name=value)
        
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
            
        if existing.exists():
            raise serializers.ValidationError("Template name must be unique within tenant")
        
        return value

    def create(self, validated_data):
        """Create template with tenant context"""
        validated_data['tenant'] = self.context['tenant']
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


# ============================================================================
# Specialized Request/Response Serializers
# ============================================================================

class DesignationHierarchySerializer(serializers.Serializer):
    """
    Serializer for designation hierarchy response
    """
    
    id = serializers.IntegerField()
    designation_name = serializers.CharField()
    designation_code = serializers.CharField()
    designation_level = serializers.IntegerField()
    department = serializers.CharField(source='department.department_name', allow_null=True)
    can_manage_subordinates = serializers.BooleanField()
    subordinates = serializers.ListField(child=serializers.DictField(), required=False)
    user_count = serializers.IntegerField(required=False)
    parent_designation_id = serializers.IntegerField(allow_null=True, required=False)


class BulkDesignationCreateSerializer(serializers.Serializer):
    """
    Serializer for bulk designation creation
    """
    
    designations = DesignationCreateSerializer(many=True)
    
    def validate_designations(self, value):
        """Validate bulk designation data"""
        if not value:
            raise serializers.ValidationError("At least one designation must be provided")
        
        if len(value) > 100:  # Reasonable limit for bulk operations
            raise serializers.ValidationError("Cannot create more than 100 designations at once")
        
        # Check for duplicate codes within the batch
        codes = [d.get('designation_code') for d in value if d.get('designation_code')]
        if len(codes) != len(set(codes)):
            raise serializers.ValidationError("Duplicate designation codes found in batch")
        
        return value


class DesignationUsageReportSerializer(serializers.Serializer):
    """
    Serializer for designation usage analytics
    """
    
    designation_id = serializers.IntegerField()
    designation_name = serializers.CharField()
    designation_code = serializers.CharField()
    active_users = serializers.IntegerField()
    total_users = serializers.IntegerField()
    subordinate_designations = serializers.IntegerField()
    permission_count = serializers.IntegerField()
    created_date = serializers.DateField()
    last_assignment = serializers.DateTimeField(allow_null=True)


class PermissionAssignmentRequestSerializer(serializers.Serializer):
    """
    Serializer for permission assignment requests
    """
    
    permission_ids = serializers.ListField(child=serializers.IntegerField())
    permission_level = serializers.ChoiceField(
        choices=['granted', 'denied', 'conditional', 'approval_required'],
        default='granted'
    )
    scope_restriction = serializers.DictField(required=False, default=dict)
    conditions = serializers.DictField(required=False, default=dict)
    effective_from = serializers.DateField(default=date.today)
    effective_to = serializers.DateField(required=False, allow_null=True)
    is_temporary = serializers.BooleanField(default=False)


class DesignationAssignmentRequestSerializer(serializers.Serializer):
    """
    Serializer for designation assignment requests
    """
    
    user_profile_id = serializers.IntegerField()
    designation_id = serializers.IntegerField()
    is_primary = serializers.BooleanField(default=False)
    is_temporary = serializers.BooleanField(default=False)
    reason = serializers.CharField(required=False, allow_blank=True)
    geographic_scope_override = serializers.DictField(required=False, default=dict)
    functional_scope_override = serializers.DictField(required=False, default=dict)
    permission_overrides = serializers.DictField(required=False, default=dict)
    effective_from = serializers.DateField(default=date.today)
    effective_to = serializers.DateField(required=False, allow_null=True)
    approval_required = serializers.BooleanField(default=False) 
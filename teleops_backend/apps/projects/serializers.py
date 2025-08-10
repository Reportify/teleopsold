from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import models

from .models import Project, ProjectDesign, ProjectDesignVersion, DesignItem
from apps.tenants.models import Tenant

User = get_user_model()


class ProjectSerializer(serializers.ModelSerializer):
    """Basic project serializer for list views (Phase 1)"""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    client_tenant = serializers.PrimaryKeyRelatedField(read_only=True)
    client_tenant_name = serializers.CharField(source='client_tenant.organization_name', read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'project_type', 'status',
            'client_tenant', 'client_tenant_name', 'customer_name', 'circle', 'activity',
            'start_date', 'end_date', 'scope',
            'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectDetailSerializer(ProjectSerializer):
    """Detailed project serializer for individual project views (Phase 1)"""
    
    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields
    


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new projects (Phase 1)"""
    client_id = serializers.PrimaryKeyRelatedField(source='client_tenant', queryset=Tenant.objects.all(), write_only=True, required=False, allow_null=True)
    is_tenant_owner = serializers.BooleanField(write_only=True, required=False, default=False)
    customer_is_tenant_owner = serializers.BooleanField(write_only=True, required=False, default=False)
    # Make optional so we can populate from tenant when toggle is ON
    customer_name = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Project
        fields = [
            'name', 'description', 'project_type',
            'client_id', 'is_tenant_owner',
            'customer_is_tenant_owner', 'customer_name',
            'circle', 'activity',
            'start_date', 'end_date', 'scope'
        ]

    # queryset restricted at runtime by tenant scoping in view/middleware
    
    def validate_name(self, value):
        """Validate project name uniqueness within tenant"""
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        
        if tenant:
            if Project.objects.filter(tenant=tenant, name=value).exists():
                raise serializers.ValidationError(
                    "A project with this name already exists in your organization."
                )
        
        return value
    
    def validate(self, data):
        """Validate project data"""
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None

        # Ownership toggles validation
        is_owner = data.pop('is_tenant_owner', False)
        customer_is_owner = data.pop('customer_is_tenant_owner', False)

        client_value = data.get('client_tenant', None)
        if is_owner:
            # client will be set to current tenant later
            pass
        elif not client_value:
            raise serializers.ValidationError("Either set is_tenant_owner=true or provide client_id")

        # Customer validation
        customer_name = data.get('customer_name')
        if customer_is_owner:
            # Set customer_name from tenant organization name
            organization_name = getattr(tenant, 'organization_name', None)
            if organization_name:
                data['customer_name'] = organization_name
            else:
                raise serializers.ValidationError("Tenant organization name not found")
        elif not customer_name:
            raise serializers.ValidationError("Customer name is required unless customer_is_tenant_owner=true")

        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                "Start date cannot be after end date."
            )
        
        # Store toggles in context for use in create
        self._is_tenant_owner = is_owner
        self._customer_is_tenant_owner = customer_is_owner
        self._current_tenant = tenant
        return data
    
    def create(self, validated_data):
        """Create project (no team members in Phase 1)"""
        # Apply ownership toggles
        if getattr(self, '_is_tenant_owner', False):
            validated_data['client_tenant'] = self._current_tenant
        return Project.objects.create(**validated_data)


class ProjectUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating projects (Phase 1)"""
    
    class Meta:
        model = Project
        fields = [
            'name', 'description', 'project_type', 'status',
            'start_date', 'end_date', 'scope'
        ]
    
    def validate_name(self, value):
        """Validate project name uniqueness within tenant (excluding current)"""
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        
        if tenant and self.instance:
            existing = Project.objects.filter(
                tenant=tenant, 
                name=value
            ).exclude(id=self.instance.id)
            
            if existing.exists():
                raise serializers.ValidationError(
                    "A project with this name already exists in your organization."
                )
        
        return value
    
    def validate(self, data):
        """Validate project update data"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                "Start date cannot be after end date."
            )
        
        return data


    # Team member APIs removed for Phase 1


class ProjectStatsSerializer(serializers.Serializer):
    """Serializer for project statistics"""
    total_projects = serializers.IntegerField()
    active_projects = serializers.IntegerField()
    completed_projects = serializers.IntegerField()
    planning_projects = serializers.IntegerField()
    on_hold_projects = serializers.IntegerField()
    cancelled_projects = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    project_types = serializers.ListField(child=serializers.DictField())
    recent_projects = ProjectSerializer(many=True)
    
    class Meta:
        fields = [
            'total_projects', 'active_projects', 'completed_projects',
            'planning_projects', 'on_hold_projects', 'cancelled_projects',
            'completion_rate', 'project_types', 'recent_projects'
        ]


class ProjectBulkUpdateSerializer(serializers.Serializer):
    """Serializer for bulk project updates"""
    project_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text="List of project IDs to update"
    )
    status = serializers.ChoiceField(
        choices=Project.PROJECT_STATUS,
        help_text="New status for all selected projects"
    )
    
    def validate_project_ids(self, value):
        """Validate that all project IDs exist and belong to the tenant"""
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        
        if tenant:
            existing_ids = Project.objects.filter(
                id__in=value,
                tenant=tenant
            ).values_list('id', flat=True)
            
            invalid_ids = set(value) - set(existing_ids)
            if invalid_ids:
                raise serializers.ValidationError(
                    f"Invalid project IDs: {list(invalid_ids)}"
                )
        
        return value


class ProjectSearchSerializer(serializers.Serializer):
    """Serializer for project search parameters"""
    search = serializers.CharField(required=False)
    status = serializers.MultipleChoiceField(
        choices=Project.PROJECT_STATUS,
        required=False
    )
    project_type = serializers.MultipleChoiceField(
        choices=Project.PROJECT_TYPE,
        required=False
    )
    project_manager_id = serializers.IntegerField(required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    budget_min = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False
    )
    budget_max = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False
    )
    
    def validate(self, data):
        """Validate search parameters"""
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError(
                "Date from cannot be after date to."
            )
        
        budget_min = data.get('budget_min')
        budget_max = data.get('budget_max')
        
        if budget_min and budget_max and budget_min > budget_max:
            raise serializers.ValidationError(
                "Minimum budget cannot be greater than maximum budget."
            )
        
        return data


class ProjectDuplicateSerializer(serializers.Serializer):
    """Serializer for project duplication"""
    name = serializers.CharField(
        max_length=255,
        help_text="Name for the duplicated project"
    )
    include_team_members = serializers.BooleanField(
        default=True,
        help_text="Whether to copy team members to the new project"
    )
    
    def validate_name(self, value):
        """Validate new project name"""
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        
        if tenant:
            if Project.objects.filter(tenant=tenant, name=value).exists():
                raise serializers.ValidationError(
                    "A project with this name already exists in your organization."
                )
        
        return value 


# -----------------------------
# Phase 2 - Project Design Serializers
# -----------------------------


class DesignItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignItem
        fields = [
            'id', 'item_name', 'equipment_code', 'category', 'model',
            'manufacturer', 'attributes', 'remarks', 'sort_order', 'is_category'
        ]
        read_only_fields = ['id']


class ProjectDesignVersionSerializer(serializers.ModelSerializer):
    items = DesignItemSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectDesignVersion
        fields = [
            'id', 'design', 'version_number', 'title', 'notes', 'status', 'is_locked',
            'items_count', 'published_at', 'created_at', 'items'
        ]
        read_only_fields = ['id', 'design', 'version_number', 'status', 'is_locked', 'items_count', 'published_at', 'created_at']


class CreateDesignVersionRequestSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    copy_from_version_id = serializers.IntegerField(required=False, allow_null=True)


class CreateDesignItemRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = DesignItem
        fields = [
            'item_name', 'equipment_code', 'category', 'model', 'manufacturer', 'attributes', 'remarks', 'sort_order', 'is_category'
        ]

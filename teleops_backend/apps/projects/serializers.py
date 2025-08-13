from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import models

from .models import (
    Project,
    ProjectDesign,
    ProjectDesignVersion,
    DesignItem,
    ProjectSite,
    ProjectInventoryPlan,
    ProjectSiteInventory,
)
from apps.equipment.models import EquipmentInventoryItem
from apps.tenants.models import ClientVendorRelationship, TenantInvitation
from .models import ProjectVendor, VendorInvitation
from apps.sites.models import Site
from apps.tenants.models import Tenant

User = get_user_model()


class ProjectSerializer(serializers.ModelSerializer):
    """Basic project serializer for list views (Phase 1)"""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    client_tenant = serializers.PrimaryKeyRelatedField(read_only=True)
    client_tenant_name = serializers.CharField(source='client_tenant.organization_name', read_only=True)
    site_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'project_type', 'status',
            'client_tenant', 'client_tenant_name', 'customer_name', 'circle', 'activity',
            'start_date', 'end_date', 'scope',
            'created_by_name', 'created_at', 'updated_at', 'site_count'
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

# -----------------------------
# Phase 3 - Project ↔ Site Association Serializers
# -----------------------------


class ProjectSiteSerializer(serializers.ModelSerializer):
    site_details = serializers.SerializerMethodField()

    class Meta:
        model = ProjectSite
        fields = ['id', 'project', 'site', 'alias_name', 'is_active', 'created_at', 'updated_at', 'site_details']
        read_only_fields = ['id', 'created_at', 'updated_at', 'project']

    def get_site_details(self, obj):
        return {
            'id': obj.site.id,
            'site_id': obj.site.site_id,
            'global_id': obj.site.global_id,
            'site_name': obj.site.site_name,
            'town': obj.site.town,
            'cluster': obj.site.cluster,
            'latitude': float(obj.site.latitude) if obj.site.latitude is not None else None,
            'longitude': float(obj.site.longitude) if obj.site.longitude is not None else None,
            'status': obj.site.status,
        }


class LinkSitesRequestSerializer(serializers.Serializer):
    site_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    alias_name = serializers.CharField(required=False, allow_blank=True)

    def validate_site_ids(self, value):
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None)
        existing = Site.objects.filter(id__in=value, tenant=tenant, deleted_at__isnull=True).values_list('id', flat=True)
        missing = set(value) - set(existing)
        if missing:
            raise serializers.ValidationError(f"Invalid site IDs for tenant: {sorted(missing)}")
        return value


class ImportProjectSitesUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        name = value.name.lower()
        if not name.endswith(('.xlsx', '.xls', '.csv')):
            raise serializers.ValidationError('Only .xlsx, .xls, .csv supported')
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('File size cannot exceed 10MB')
        return value


# -----------------------------
# Phase 3 - Project Inventory (Dismantle) Serializers
# -----------------------------


class ProjectInventoryPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectInventoryPlan
        fields = ['id', 'tenant', 'project', 'project_type', 'notes', 'created_by', 'created_at', 'updated_at']
        read_only_fields = ['id', 'tenant', 'project', 'created_by', 'created_at', 'updated_at']


class CreateProjectInventoryPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectInventoryPlan
        fields = ['project_type', 'notes']


class ProjectSiteInventorySerializer(serializers.ModelSerializer):
    equipment_item_name = serializers.CharField(source='equipment_item.name', read_only=True)
    equipment_category = serializers.CharField(source='equipment_item.category', read_only=True)
    project_site_id = serializers.IntegerField(source='project_site.id', read_only=True)

    class Meta:
        model = ProjectSiteInventory
        fields = [
            'id', 'plan', 'project_site', 'project_site_id', 'equipment_item', 'equipment_item_name', 'equipment_category',
            'serial_number', 'serial_normalized', 'equipment_name', 'equipment_model', 'site_id_business',
            'remarks', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'serial_normalized', 'equipment_name', 'equipment_model', 'site_id_business', 'created_at', 'updated_at']


class DismantleBulkUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        name = value.name.lower()
        if not name.endswith(('.xlsx', '.xls', '.csv')):
            raise serializers.ValidationError('Only .xlsx, .xls, .csv supported')
        if value.size > 20 * 1024 * 1024:
            raise serializers.ValidationError('File size cannot exceed 20MB')
        return value


# -----------------------------
# Phase 4 - Project Vendor serializers
# -----------------------------


class ProjectVendorSerializer(serializers.ModelSerializer):
    relationship_id = serializers.IntegerField(source='relationship.id', read_only=True)
    relationship_vendor_code = serializers.CharField(source='relationship.vendor_code', read_only=True)
    vendor_tenant_id = serializers.IntegerField(source='vendor_tenant.id', read_only=True)

    class Meta:
        model = ProjectVendor
        fields = [
            'id', 'project', 'relationship_id', 'relationship_vendor_code', 'vendor_tenant_id',
            'scope_notes', 'start_at', 'end_at', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'project']


class CreateProjectVendorSerializer(serializers.ModelSerializer):
    relationship_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ProjectVendor
        fields = ['relationship_id', 'scope_notes', 'start_at', 'end_at']

    def validate_relationship_id(self, value: int):
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        rel = ClientVendorRelationship.objects.filter(id=value, client_tenant=tenant).first()
        if not rel:
            raise serializers.ValidationError('Invalid relationship for this tenant')
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        project = self.context.get('project')
        tenant = getattr(request, 'tenant', None) if request else None
        rel_id = validated_data.pop('relationship_id')
        relationship = ClientVendorRelationship.objects.get(id=rel_id)
        project_vendor = ProjectVendor.objects.create(
            tenant=tenant, project=project, relationship=relationship, created_by=request.user, **validated_data
        )
        return project_vendor


class VendorStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ProjectVendor.STATUS_CHOICES)


class VendorInvitationSerializer(serializers.ModelSerializer):
    relationship_id = serializers.IntegerField(source='relationship.id', read_only=True)
    relationship = serializers.SerializerMethodField()
    project_details = serializers.SerializerMethodField()

    class Meta:
        model = VendorInvitation
        fields = [
            'id', 'project', 'project_details', 'relationship_id', 'relationship', 'invite_email', 'token', 'expires_at',
            'status', 'invited_at', 'responded_at'
        ]
        read_only_fields = ['id', 'project', 'token', 'status', 'invited_at', 'responded_at']

    def get_relationship(self, obj):
        if obj.relationship:
            return {
                'id': obj.relationship.id,
                'vendor_code': obj.relationship.vendor_code,
                'vendor_organization_name': obj.relationship.vendor_tenant.organization_name if obj.relationship.vendor_tenant else None,
            }
        return None

    def get_project_details(self, obj):
        if obj.project:
            return {
                'id': obj.project.id,
                'name': obj.project.name,
                'description': obj.project.description,
                'project_type': obj.project.project_type,
                'client_name': obj.project.client_tenant.organization_name if obj.project.client_tenant else None,
                'customer_name': obj.project.customer_name,
                # 'circle' is a CharField on Project, not a FK
                'circle': obj.project.circle,
                'scope': obj.project.scope,
            }
        return None


class CreateVendorInvitationSerializer(serializers.ModelSerializer):
    relationship_id = serializers.IntegerField(write_only=True)
    expires_in_days = serializers.IntegerField(required=False, min_value=1, max_value=90)

    class Meta:
        model = VendorInvitation
        fields = ['relationship_id', 'expires_in_days']

    def validate_relationship_id(self, value: int):
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        rel = ClientVendorRelationship.objects.filter(id=value, client_tenant=tenant).first()
        if not rel:
            raise serializers.ValidationError('Invalid relationship for this tenant')
        return value

    def create(self, validated_data):
        from datetime import timedelta
        from django.utils import timezone
        import secrets

        request = self.context.get('request')
        project = self.context.get('project')
        tenant = getattr(request, 'tenant', None) if request else None
        rel_id = validated_data.pop('relationship_id')
        expires_in_days = validated_data.pop('expires_in_days', None)
        relationship = ClientVendorRelationship.objects.get(id=rel_id)
        token = secrets.token_urlsafe(32)
        expires_at = None
        if expires_in_days:
            expires_at = timezone.now() + timedelta(days=expires_in_days)
        # Get vendor email from relationship - either from vendor tenant or from invitation
        vendor_email = ''
        if relationship.vendor_tenant:
            vendor_email = relationship.vendor_tenant.primary_contact_email
        else:
            # Try to get from TenantInvitation if vendor is not yet onboarded
            try:
                invitation_obj = TenantInvitation.objects.filter(
                    client_tenant=tenant,
                    vendor_code=relationship.vendor_code
                ).first()
                if invitation_obj:
                    vendor_email = invitation_obj.email
            except:
                pass
        
        invitation = VendorInvitation.objects.create(
            tenant=tenant, project=project, relationship=relationship, token=token,
            invited_by=request.user, expires_at=expires_at, invite_email=vendor_email,
        )
        return invitation

from django.contrib import admin
from django.utils.html import format_html
from .models import TelecomCircle, Tenant, CorporateCircleRelationship, ClientVendorRelationship, TenantInvitation


@admin.register(TelecomCircle)
class TelecomCircleAdmin(admin.ModelAdmin):
    list_display = ['circle_code', 'circle_name', 'region', 'is_active', 'created_at']
    list_filter = ['region', 'is_active']
    search_fields = ['circle_code', 'circle_name']
    ordering = ['circle_code']
    
    fieldsets = (
        ('Circle Information', {
            'fields': ('circle_code', 'circle_name', 'region', 'state_coverage')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = [
        'organization_name', 'tenant_type', 'circle_code', 
        'registration_status', 'activation_status', 
        'is_active', 'created_at'
    ]
    list_filter = [
        'tenant_type', 'registration_status', 'activation_status', 
        'is_active', 'subscription_plan', 'country'
    ]
    search_fields = ['organization_name', 'circle_code', 'primary_contact_email']
    ordering = ['organization_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'registered_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'tenant_type', 'parent_tenant', 'organization_name')
        }),
        ('Circle Information', {
            'fields': ('circle', 'circle_code', 'circle_name'),
            'classes': ('collapse',)
        }),
        ('Business Details', {
            'fields': (
                'business_registration_number', 'industry_sector', 'country', 
                'primary_business_address', 'website'
            )
        }),
        ('Platform Configuration', {
            'fields': ('subdomain', 'subscription_plan', 'subscription_features', 'resource_limits')
        }),
        ('Contact Information', {
            'fields': (
                'primary_contact_name', 'primary_contact_email', 'primary_contact_phone',
                'secondary_contact_name', 'secondary_contact_email', 'secondary_contact_phone',
                'administrative_contact_email'
            )
        }),
        ('Vendor Details', {
            'fields': (
                'vendor_license_number', 'specialization', 'coverage_areas', 
                'service_capabilities', 'years_in_business', 'employee_count',
                'equipment_capabilities', 'certifications'
            ),
            'classes': ('collapse',)
        }),
        ('Operational Settings', {
            'fields': ('operates_independently', 'shared_vendor_pool', 'cross_circle_reporting')
        }),
        ('Status', {
            'fields': ('registration_status', 'activation_status', 'is_active')
        }),
        ('Approval', {
            'fields': ('approved_by', 'approved_at', 'rejection_reason'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('registered_at', 'activated_at', 'deactivated_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('parent_tenant', 'circle', 'approved_by')
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # Editing an existing object
            return self.readonly_fields + ('tenant_type', 'parent_tenant', 'circle')
        return self.readonly_fields


@admin.register(CorporateCircleRelationship)
class CorporateCircleRelationshipAdmin(admin.ModelAdmin):
    list_display = [
        'corporate_tenant', 'circle_tenant', 'governance_level', 
        'separate_billing', 'is_active', 'created_at'
    ]
    list_filter = ['governance_level', 'separate_billing', 'is_active', 'data_sharing_level']
    search_fields = ['corporate_tenant__organization_name', 'circle_tenant__organization_name']
    ordering = ['corporate_tenant__organization_name', 'circle_tenant__organization_name']
    
    fieldsets = (
        ('Relationship', {
            'fields': ('corporate_tenant', 'circle_tenant', 'relationship_type', 'governance_level')
        }),
        ('Financial Configuration', {
            'fields': ('separate_billing', 'cost_center_code', 'budget_authority_level')
        }),
        ('Operational Configuration', {
            'fields': (
                'independent_vendor_management', 'independent_employee_management', 
                'shared_technology_access'
            )
        }),
        ('Reporting Configuration', {
            'fields': ('reports_to_corporate', 'data_sharing_level')
        }),
        ('Status', {
            'fields': ('is_active', 'effective_from', 'effective_to')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('corporate_tenant', 'circle_tenant')


@admin.register(ClientVendorRelationship)
class ClientVendorRelationshipAdmin(admin.ModelAdmin):
    list_display = [
        'client_tenant', 'vendor_tenant', 'vendor_code', 'relationship_status',
        'vendor_verification_status', 'is_active', 'created_at'
    ]
    list_filter = [
        'relationship_type', 'relationship_status', 'vendor_verification_status',
        'contact_access_level', 'communication_allowed', 'is_active'
    ]
    search_fields = [
        'client_tenant__organization_name', 'vendor_tenant__organization_name',
        'vendor_code', 'contact_person_name'
    ]
    ordering = ['client_tenant__organization_name', 'vendor_code']
    
    fieldsets = (
        ('Relationship', {
            'fields': ('client_tenant', 'vendor_tenant', 'vendor_code', 'contact_person_name', 'relationship_type')
        }),
        ('Status and Performance', {
            'fields': ('relationship_status', 'vendor_verification_status', 'performance_rating')
        }),
        ('Permissions and Access', {
            'fields': ('vendor_permissions', 'communication_allowed', 'contact_access_level')
        }),
        ('Approval Management', {
            'fields': ('approved_by', 'approved_at'),
            'classes': ('collapse',)
        }),
        ('Notes and Status', {
            'fields': ('is_active', 'notes')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'client_tenant', 'vendor_tenant', 'invited_by', 'approved_by'
        )


@admin.register(TenantInvitation)
class TenantInvitationAdmin(admin.ModelAdmin):
    list_display = ['email', 'contact_name', 'tenant_type', 'status', 'invited_by', 'expires_at', 'invited_at']
    list_filter = ['status', 'tenant_type', 'invited_at']
    search_fields = ['email', 'contact_name', 'invited_by__email']
    ordering = ['-invited_at']
    
    fieldsets = (
        ('Invitation Details', {
            'fields': ('email', 'contact_name', 'tenant_type', 'status')
        }),
        ('Token Management', {
            'fields': ('invitation_token', 'expires_at'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('invited_at', 'accepted_at'),
            'classes': ('collapse',)
        }),
        ('User Information', {
            'fields': ('invited_by', 'created_tenant')
        }),
        ('Additional Information', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['invitation_token', 'invited_at', 'accepted_at', 'created_tenant']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('invited_by', 'created_tenant') 
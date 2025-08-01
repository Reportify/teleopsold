"""
Tenant Management Serializers

Serializers for tenant-related models and operations.
"""
import uuid
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

from ..models import (
    Tenant, TenantUserProfile, TelecomCircle, ClientVendorRelationship,
    TenantInvitation, TenantDesignation, VendorCreatedClient,
    VendorClientBilling, TenantDepartment
)

User = get_user_model()

class ClientVendorRelationshipSerializer(serializers.ModelSerializer):
    vendor_tenant = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(),
        required=False,
        allow_null=True
    )
    vendor_organization_name = serializers.SerializerMethodField()
    vendor_email = serializers.SerializerMethodField()
    vendor_tenant_data = serializers.SerializerMethodField()
    invitation_data = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientVendorRelationship
        fields = '__all__'
        # Note: invitation management fields removed (now handled by TenantInvitation)
    
    def get_vendor_organization_name(self, obj):
        """Return the vendor tenant's organization name or invitation organization name"""
        # If vendor is already onboarded, get from tenant
        if obj.vendor_tenant:
            return obj.vendor_tenant.organization_name
        
        # If still in invitation stage, get from TenantInvitation
        invitation = self._get_related_invitation(obj)
        if invitation:
            return invitation.organization_name
        return None
    
    def get_vendor_email(self, obj):
        """Return the vendor email from invitation or tenant"""
        # If vendor is already onboarded, get from tenant
        if obj.vendor_tenant:
            return obj.vendor_tenant.primary_contact_email
        
        # If still in invitation stage, get from TenantInvitation
        invitation = self._get_related_invitation(obj)
        if invitation:
            return invitation.email
        return None
    
    def get_vendor_tenant_data(self, obj):
        """Return detailed vendor tenant information including registration status"""
        if obj.vendor_tenant:
            return {
                'id': str(obj.vendor_tenant.id),
                'organization_name': obj.vendor_tenant.organization_name,
                'business_registration_number': obj.vendor_tenant.business_registration_number,
                'primary_contact_name': obj.vendor_tenant.primary_contact_name,
                'primary_contact_email': obj.vendor_tenant.primary_contact_email,
                'primary_contact_phone': obj.vendor_tenant.primary_contact_phone,
                'registration_status': obj.vendor_tenant.registration_status,
                'activation_status': obj.vendor_tenant.activation_status,
                'is_active': obj.vendor_tenant.is_active,
                'registered_at': obj.vendor_tenant.registered_at.isoformat() if obj.vendor_tenant.registered_at else None,
                'activated_at': obj.vendor_tenant.activated_at.isoformat() if obj.vendor_tenant.activated_at else None,
                'service_capabilities': obj.vendor_tenant.service_capabilities,
                'coverage_areas': obj.vendor_tenant.coverage_areas,
                'certifications': obj.vendor_tenant.certifications,
            }
        return None
    
    def get_invitation_data(self, obj):
        """Return invitation data if still in invitation stage"""
        invitation = self._get_related_invitation(obj)
        if invitation:
            return {
                'id': str(invitation.id),
                'token': invitation.invitation_token,
                'status': invitation.status,
                'expires_at': invitation.expires_at.isoformat() if invitation.expires_at else None,
                'invited_at': invitation.invited_at.isoformat() if invitation.invited_at else None,
                'invited_by': invitation.invited_by.email if invitation.invited_by else None,
            }
        return None
    
    def _get_related_invitation(self, obj):
        """Helper method to find related TenantInvitation"""
        from ..models import TenantInvitation
        
        # Look for invitation based on contact person and vendor code
        # This is a heuristic since we don't have a direct FK relationship
        try:
            # Try to extract invitation token from notes
            if 'invitation' in obj.notes.lower():
                import re
                token_match = re.search(r'invitation\s+([a-f0-9-]+)', obj.notes)
                if token_match:
                    token = token_match.group(1)
                    invitation = TenantInvitation.objects.filter(
                        invitation_token=token,
                        tenant_type='Vendor'
                    ).first()
                    
                    # If invitation is completed and vendor_tenant is null, try to link it
                    if invitation and invitation.status == 'Completed' and not obj.vendor_tenant and invitation.created_tenant:
                        self._link_vendor_tenant(obj, invitation.created_tenant)
                    
                    return invitation
            
            # Fallback: search by contact person name and recent invitations
            if obj.contact_person_name:
                invitation = TenantInvitation.objects.filter(
                    contact_name=obj.contact_person_name,
                    tenant_type='Vendor',
                    status__in=['Pending', 'Accepted', 'Completed']
                ).order_by('-invited_at').first()
                
                # If invitation is completed and vendor_tenant is null, try to link it
                if invitation and invitation.status == 'Completed' and not obj.vendor_tenant and invitation.created_tenant:
                    self._link_vendor_tenant(obj, invitation.created_tenant)
                
                return invitation
                
        except Exception:
            pass
        
        return None

    def _link_vendor_tenant(self, obj, created_tenant):
        """Helper method to link vendor_tenant when invitation is completed"""
        try:
            obj.vendor_tenant = created_tenant
            # Only set as active if the tenant is actually approved/active
            obj.relationship_status = 'Active' if created_tenant.is_active else 'Pending_Approval'
            obj.is_active = created_tenant.is_active
            obj.save()
        except Exception as e:
            # Log error but don't break the serialization
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to link vendor_tenant for ClientVendorRelationship {obj.id}: {e}")
            pass

class CorporateOnboardingSerializer(serializers.Serializer):
    organization_name = serializers.CharField(max_length=255)
    business_registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    primary_contact_name = serializers.CharField(max_length=255)
    primary_contact_email = serializers.EmailField()
    primary_contact_phone = serializers.CharField(max_length=20)
    subdomain = serializers.CharField(max_length=100)
    circles = serializers.ListField(
        child=serializers.CharField(max_length=20),
        help_text="List of circle codes to create as child tenants"
    )

    def validate_circles(self, value):
        if not value:
            raise serializers.ValidationError("At least one circle must be selected.")
        if not TelecomCircle.objects.filter(circle_code__in=value).count() == len(value):
            raise serializers.ValidationError("One or more circle codes are invalid.")
        return value

    def create(self, validated_data):
        # Create corporate tenant
        corporate = Tenant.objects.create(
            tenant_type='Corporate',
            organization_name=validated_data['organization_name'],
            business_registration_number=validated_data['business_registration_number'],
            subdomain=validated_data['subdomain'],
            primary_contact_name=validated_data['primary_contact_name'],
            primary_contact_email=validated_data['primary_contact_email'],
            primary_contact_phone=validated_data['primary_contact_phone'],
            registration_status='Pending',
            activation_status='Inactive',
            is_active=False,
        )
        # Create circle tenants
        circles = []
        for code in validated_data['circles']:
            circle_info = TelecomCircle.objects.get(circle_code=code)
            circle = Tenant.objects.create(
                tenant_type='Circle',
                parent_tenant=corporate,
                organization_name=f"{corporate.organization_name} {circle_info.circle_name}",
                circle=circle_info,
                circle_code=code,
                circle_name=circle_info.circle_name,
                business_registration_number=corporate.business_registration_number,
                subdomain=f"{corporate.organization_name.lower()}-{code.lower()}-teleops",
                primary_contact_name=corporate.primary_contact_name,
                primary_contact_email=corporate.primary_contact_email,
                primary_contact_phone=corporate.primary_contact_phone,
                registration_status='Pending',
                activation_status='Inactive',
                is_active=False,
            )
            circles.append(circle)
        return corporate, circles

    def save(self, **kwargs):
        return self.create(self.validated_data) 

class TenantInvitationSerializer(serializers.ModelSerializer):
    """Serializer for tenant invitations"""
    verification_token = serializers.SerializerMethodField()

    class Meta:
        model = TenantInvitation
        fields = [
            'id', 'email', 'contact_name', 'tenant_type', 'status',
            'invited_at', 'expires_at', 'accepted_at', 'invited_by',
            'created_tenant', 'notes', 'invitation_token',
            'verification_token', 'organization_name', 'contact_phone',
        ]
        read_only_fields = [
            'id', 'invitation_token', 'status', 'invited_at', 
            'accepted_at', 'invited_by', 'created_tenant'
        ]

    def get_verification_token(self, obj):
        # Only for accepted invitations with a created tenant
        if obj.status == 'Accepted' and obj.created_tenant:
            from apps.users.models import UserVerificationToken, User
            # Find the primary contact user for the created tenant
            user = User.objects.filter(email=obj.created_tenant.primary_contact_email).first()
            if user:
                token_obj = UserVerificationToken.objects.filter(user=user, is_used=False).order_by('-created_at').first()
                if token_obj:
                    return token_obj.token
        return None
    
    def create(self, validated_data):
        """Create invitation with current user as inviter and custom expires_at if provided"""
        validated_data['invited_by'] = self.context['request'].user
        expires_at = validated_data.pop('expires_at', None)
        if not expires_at:
            from django.utils import timezone
            from datetime import timedelta
            expires_at = timezone.now() + timedelta(days=1)
        invitation = TenantInvitation.objects.create(expires_at=expires_at, **validated_data)
        return invitation
    
    def validate_email(self, value):
        """Check if email already has a pending invitation"""
        if TenantInvitation.objects.filter(
            email=value, 
            status='Pending'
        ).exists():
            raise serializers.ValidationError(
                "An invitation has already been sent to this email address."
            )
        return value

class TenantInvitationAcceptSerializer(serializers.Serializer):
    """Serializer for accepting tenant invitations with dynamic fields based on tenant type"""
    
    invitation_token = serializers.CharField()
    
    # Common fields for all tenant types
    organization_name = serializers.CharField(max_length=255)
    business_registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    primary_contact_name = serializers.CharField(max_length=255)
    primary_contact_email = serializers.EmailField()
    primary_contact_phone = serializers.CharField(max_length=20)
    subdomain = serializers.CharField(max_length=100)
    
    # Corporate-specific fields
    circles = serializers.ListField(
        child=serializers.CharField(max_length=20),
        required=False,
        help_text="List of circle codes (for Corporate tenants)"
    )
    
    # Circle-specific fields
    parent_tenant_id = serializers.UUIDField(required=False, help_text="Parent tenant ID (for Circle tenants)")
    parent_subdomain = serializers.CharField(max_length=100, required=False, help_text="Parent subdomain (for Circle tenants)")
    circle_id = serializers.IntegerField(required=False, help_text="Circle ID (for Circle tenants)")
    circle_code = serializers.CharField(max_length=20, required=False, help_text="Circle code (for Circle tenants)")
    invitation_type = serializers.CharField(max_length=50, required=False, help_text="Invitation type (for Circle tenants)")
    
    # Vendor-specific fields
    specialization = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        help_text="List of vendor specializations"
    )
    coverage_areas = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        help_text="List of coverage areas"
    )
    service_capabilities = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        help_text="List of service capabilities"
    )
    equipment_capabilities = serializers.CharField(required=False, allow_blank=True)
    certifications = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        help_text="List of certifications"
    )
    
    def validate_invitation_token(self, value):
        """Validate invitation token"""
        try:
            invitation = TenantInvitation.objects.get(invitation_token=value)
            if not invitation.is_valid:
                raise serializers.ValidationError("Invitation is invalid or has expired.")
            return value
        except TenantInvitation.DoesNotExist:
            raise serializers.ValidationError("Invalid invitation token.")
    
    def validate(self, data):
        """Validate tenant type specific requirements"""
        invitation = TenantInvitation.objects.get(invitation_token=data['invitation_token'])
        
        # Remove circles requirement for Corporate tenants
        # if invitation.tenant_type == 'Corporate':
        #     if not data.get('circles'):
        #         raise serializers.ValidationError("Circles are required for Corporate tenants.")
        
        if invitation.tenant_type == 'Circle':
            # Check if parent_tenant_id is provided in data or can be extracted from invitation notes
            parent_tenant_id = data.get('parent_tenant_id')
            if not parent_tenant_id and invitation.notes and 'Circle Data:' in invitation.notes:
                try:
                    import json
                    circle_data_str = invitation.notes.split('Circle Data: ')[1]
                    circle_data = json.loads(circle_data_str)
                    parent_tenant_id = circle_data.get('parent_tenant_id')
                except (IndexError, json.JSONDecodeError):
                    pass
            
            if not parent_tenant_id:
                raise serializers.ValidationError("Parent tenant ID is required for Circle tenants.")
        
        elif invitation.tenant_type == 'Vendor':
            pass
        
        return data
    
    def create(self, validated_data):
        """Create tenant based on invitation type"""
        invitation = TenantInvitation.objects.get(invitation_token=validated_data['invitation_token'])
        
        # Common tenant data
        tenant_data = {
            'tenant_type': invitation.tenant_type,
            'organization_name': validated_data['organization_name'],
            'business_registration_number': validated_data['business_registration_number'],
            'subdomain': validated_data['subdomain'],
            'primary_contact_name': validated_data['primary_contact_name'],
            'primary_contact_email': validated_data['primary_contact_email'],
            'primary_contact_phone': validated_data['primary_contact_phone'],
            'registration_status': 'Pending',
            'activation_status': 'Inactive',
            'is_active': False,
        }
        
        # Add vendor-specific fields if applicable
        if invitation.tenant_type == 'Vendor':
            tenant_data.update({
                'coverage_areas': validated_data.get('coverage_areas', []),
                'service_capabilities': validated_data.get('service_capabilities', []),
                'certifications': validated_data.get('certifications', []),
            })
        
        # Create the tenant
        tenant = Tenant.objects.create(**tenant_data)
        
        # Handle corporate-specific logic (create circles)
        if invitation.tenant_type == 'Corporate':
            circles = []
            for code in validated_data.get('circles', []):
                circle_info = TelecomCircle.objects.get(circle_code=code)
                circle = Tenant.objects.create(
                    tenant_type='Circle',
                    parent_tenant=tenant,
                    organization_name=f"{tenant.organization_name} {circle_info.circle_name}",
                    circle=circle_info,
                    circle_code=code,
                    circle_name=circle_info.circle_name,
                    business_registration_number=tenant.business_registration_number,
                    subdomain=f"{tenant.organization_name.lower()}-{code.lower()}-teleops",
                    primary_contact_name=tenant.primary_contact_name,
                    primary_contact_email=tenant.primary_contact_email,
                    primary_contact_phone=tenant.primary_contact_phone,
                    registration_status='Pending',
                    activation_status='Inactive',
                    is_active=False,
                )
                circles.append(circle)
        
        # Mark invitation as accepted
        invitation.accept(tenant)
        
        return tenant 

class TelecomCircleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelecomCircle
        fields = ['id', 'circle_code', 'circle_name', 'region'] 

class TenantSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)  # Ensure UUID is properly serialized
    
    class Meta:
        model = Tenant
        fields = '__all__'  # You can specify fields if you want to limit the output


# Dual-Mode Vendor Operations Serializers

class VendorCreatedClientSerializer(serializers.ModelSerializer):
    """Serializer for vendor-created clients (independent clients)"""
    
    id = serializers.UUIDField(read_only=True)
    vendor_tenant_name = serializers.CharField(source='vendor_tenant.organization_name', read_only=True)
    conversion_readiness_score = serializers.ReadOnlyField()
    is_high_value_client = serializers.ReadOnlyField()
    months_since_last_activity = serializers.ReadOnlyField()
    
    class Meta:
        model = VendorCreatedClient
        fields = [
            'id', 'vendor_tenant', 'vendor_tenant_name', 'client_name', 'client_code', 
            'client_type', 'primary_contact_name', 'primary_contact_email', 
            'primary_contact_phone', 'secondary_contact_name', 'secondary_contact_email',
            'secondary_contact_phone', 'headquarters_address', 'regional_offices',
            'business_sectors', 'company_size', 'branding_logo', 'primary_color',
            'secondary_color', 'platform_interest_level', 'conversion_status',
            'conversion_probability', 'platform_demo_date', 'conversion_notes',
            'total_sites', 'total_projects', 'active_projects', 'monthly_activity_level',
            'last_project_date', 'total_revenue_generated', 'average_project_value',
            'payment_terms', 'currency', 'relationship_start_date', 'relationship_status',
            'contract_end_date', 'client_satisfaction_rating', 'vendor_performance_rating',
            'internal_notes', 'tags', 'platform_onboarding_interest', 
            'estimated_platform_value', 'created_at', 'updated_at', 'last_activity_date',
            'conversion_readiness_score', 'is_high_value_client', 'months_since_last_activity'
        ]
        read_only_fields = [
            'id', 'vendor_tenant', 'vendor_tenant_name', 'relationship_start_date',
            'created_at', 'updated_at', 'conversion_readiness_score', 
            'is_high_value_client', 'months_since_last_activity'
        ]

    def validate_client_name(self, value):
        """Validate client name against business rules"""
        if not value or not value.strip():
            raise serializers.ValidationError("Client name cannot be empty")
        
        # If this is an update, get the current instance
        if self.instance:
            vendor_tenant_id = str(self.instance.vendor_tenant.id)
            current_name = self.instance.client_name
            
            # Skip validation if name hasn't changed
            if value.strip() == current_name:
                return value
        else:
            # For new instances, get vendor from context
            vendor_tenant_id = self.context.get('vendor_tenant_id')
            
        if vendor_tenant_id:
            from ..services import DualModeVendorService
            service = DualModeVendorService()
            validation_result = service.validate_client_name_rules(vendor_tenant_id, value)
            
            if not validation_result['is_valid']:
                error_msg = validation_result['validation_result']
                if error_msg == 'EXACT_MATCH_BLOCKED':
                    conflicting_client = validation_result['conflicting_client']
                    raise serializers.ValidationError(
                        f"Client name '{value}' already exists as associated client "
                        f"({conflicting_client['name']}). Please use a different name."
                    )
                elif error_msg == 'DUPLICATE_INDEPENDENT_CLIENT':
                    raise serializers.ValidationError(
                        f"You already have an independent client named '{value}'"
                    )
                else:
                    raise serializers.ValidationError(f"Invalid client name: {error_msg}")
        
        return value.strip()

    def validate_conversion_probability(self, value):
        """Validate conversion probability is between 0 and 100"""
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Conversion probability must be between 0 and 100")
        return value

    def validate_primary_color(self, value):
        """Validate hex color format"""
        if value:
            import re
            if not re.match(r'^#[0-9A-Fa-f]{6}$', value):
                raise serializers.ValidationError("Must be a valid hex color code (e.g., #1976d2)")
        return value

    def validate_secondary_color(self, value):
        """Validate hex color format"""
        if value:
            import re
            if not re.match(r'^#[0-9A-Fa-f]{6}$', value):
                raise serializers.ValidationError("Must be a valid hex color code (e.g., #424242)")
        return value


class VendorClientBillingSerializer(serializers.ModelSerializer):
    """Serializer for vendor client billing records"""
    
    id = serializers.UUIDField(read_only=True)
    vendor_tenant_name = serializers.CharField(source='vendor_tenant.organization_name', read_only=True)
    client_name = serializers.CharField(source='vendor_created_client.client_name', read_only=True)
    billing_month_display = serializers.SerializerMethodField()
    is_profitable = serializers.ReadOnlyField()
    days_overdue = serializers.ReadOnlyField()
    platform_cost_per_project = serializers.ReadOnlyField()
    revenue_per_project = serializers.ReadOnlyField()
    
    class Meta:
        model = VendorClientBilling
        fields = [
            'id', 'vendor_tenant', 'vendor_tenant_name', 'vendor_created_client', 
            'client_name', 'billing_period_start', 'billing_period_end', 'billing_month',
            'billing_month_display', 'base_client_management_fee', 'site_management_fee',
            'project_transaction_fee', 'data_storage_fee', 'support_fee', 
            'total_platform_cost', 'client_project_value', 'recurring_service_revenue',
            'additional_service_revenue', 'total_client_revenue', 'gross_profit',
            'profit_margin_percentage', 'projects_completed', 'sites_managed',
            'total_transactions', 'billing_status', 'payment_status', 'invoice_number',
            'due_date', 'paid_date', 'payment_method', 'payment_reference', 'currency',
            'tax_rate', 'tax_amount', 'billing_notes', 'adjustments', 'adjustment_reason',
            'created_at', 'updated_at', 'generated_at', 'is_profitable', 'days_overdue',
            'platform_cost_per_project', 'revenue_per_project'
        ]
        read_only_fields = [
            'id', 'vendor_tenant', 'vendor_tenant_name', 'client_name', 
            'total_platform_cost', 'total_client_revenue', 'gross_profit',
            'profit_margin_percentage', 'tax_amount', 'invoice_number',
            'created_at', 'updated_at', 'generated_at', 'billing_month_display',
            'is_profitable', 'days_overdue', 'platform_cost_per_project', 'revenue_per_project'
        ]

    def get_billing_month_display(self, obj):
        """Format billing month for display"""
        return obj.billing_month.strftime('%B %Y')

    def validate_billing_period(self, attrs):
        """Validate billing period dates"""
        start_date = attrs.get('billing_period_start')
        end_date = attrs.get('billing_period_end')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                "Billing period start date must be before end date"
            )
        
        return attrs

    def validate_tax_rate(self, value):
        """Validate tax rate is between 0 and 100"""
        if not (0 <= value <= 100):
            raise serializers.ValidationError("Tax rate must be between 0 and 100 percent")
        return value


class AssociatedClientSerializer(serializers.Serializer):
    """Serializer for associated clients (from vendor relationships)"""
    
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    type = serializers.CharField(read_only=True)
    circle_code = serializers.CharField(read_only=True)
    relationship_type = serializers.CharField(read_only=True)
    vendor_code = serializers.CharField(read_only=True)
    is_associated = serializers.BooleanField(read_only=True)
    is_read_only = serializers.BooleanField(read_only=True)
    contract_start_date = serializers.DateField(read_only=True)
    contract_end_date = serializers.DateField(read_only=True)
    performance_rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class IndependentClientSerializer(serializers.Serializer):
    """Serializer for independent clients (from vendor created clients)"""
    
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    client_code = serializers.CharField(read_only=True)
    client_type = serializers.CharField(read_only=True)
    primary_contact_name = serializers.CharField(read_only=True)
    primary_contact_email = serializers.EmailField(read_only=True)
    total_sites = serializers.IntegerField(read_only=True)
    total_projects = serializers.IntegerField(read_only=True)
    monthly_activity_level = serializers.CharField(read_only=True)
    platform_interest_level = serializers.CharField(read_only=True)
    conversion_status = serializers.CharField(read_only=True)
    conversion_readiness_score = serializers.IntegerField(read_only=True)
    total_revenue_generated = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    is_high_value_client = serializers.BooleanField(read_only=True)
    is_associated = serializers.BooleanField(read_only=True)
    is_read_only = serializers.BooleanField(read_only=True)
    can_edit = serializers.BooleanField(read_only=True)
    can_delete = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    last_activity_date = serializers.DateTimeField(read_only=True)


class VendorClientPortfolioSerializer(serializers.Serializer):
    """Serializer for complete vendor client portfolio response"""
    
    associated_clients = AssociatedClientSerializer(many=True, read_only=True)
    independent_clients = IndependentClientSerializer(many=True, read_only=True)
    portfolio_summary = serializers.DictField(read_only=True)
    client_categorization = serializers.CharField(read_only=True)
    vendor_info = serializers.DictField(read_only=True)


class ClientNameValidationSerializer(serializers.Serializer):
    """Serializer for client name validation requests"""
    
    client_name = serializers.CharField(required=True)
    
    def validate_client_name(self, value):
        """Validate client name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Client name cannot be empty")
        return value.strip()


class ClientNameValidationResponseSerializer(serializers.Serializer):
    """Serializer for client name validation responses"""
    
    is_valid = serializers.BooleanField(read_only=True)
    validation_result = serializers.CharField(read_only=True)
    conflicting_client = serializers.DictField(read_only=True, allow_null=True)
    suggestions = serializers.ListField(child=serializers.CharField(), read_only=True)


class VendorBillingSummarySerializer(serializers.Serializer):
    """Serializer for vendor billing summary"""
    
    summary_period = serializers.CharField(read_only=True)
    totals = serializers.DictField(read_only=True)
    monthly_breakdown = serializers.DictField(read_only=True)
    vendor_info = serializers.DictField(read_only=True)


class ConversionAnalyticsSerializer(serializers.Serializer):
    """Serializer for conversion analytics data"""
    
    funnel_statistics = serializers.DictField(read_only=True)
    top_conversion_opportunities = serializers.ListField(read_only=True)


class DualModeVendorSerializer(serializers.Serializer):
    """Serializer for dual-mode vendor operations"""
    
    vendor_info = serializers.DictField(read_only=True)
    associated_clients = AssociatedClientSerializer(many=True, read_only=True)
    independent_clients = IndependentClientSerializer(many=True, read_only=True)
    portfolio_summary = serializers.DictField(read_only=True)
    conversion_metrics = serializers.DictField(read_only=True)


class VendorClientRelationshipSerializer(serializers.Serializer):
    """Serializer for vendor-client relationships"""
    
    vendor_tenant = TenantSerializer(read_only=True)
    relationship_type = serializers.CharField(read_only=True)
    client_data = serializers.DictField(read_only=True)
    portfolio_summary = serializers.DictField(read_only=True)


class VendorClientSerializer(serializers.Serializer):
    """Serializer for vendor clients (both associated and independent)"""
    
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    type = serializers.CharField(read_only=True)
    is_associated = serializers.BooleanField(read_only=True)
    client_data = serializers.DictField(read_only=True)


class VendorManagementSummarySerializer(serializers.Serializer):
    """Serializer for vendor management summary"""
    
    vendor_info = serializers.DictField(read_only=True)
    client_summary = serializers.DictField(read_only=True)
    revenue_summary = serializers.DictField(read_only=True)
    conversion_summary = serializers.DictField(read_only=True)
    recent_activity = serializers.ListField(read_only=True)


class CircleVendorSummarySerializer(serializers.Serializer):
    """Serializer for circle-vendor relationship summary"""
    
    circle_info = serializers.DictField(read_only=True)
    vendor_relationships = serializers.ListField(read_only=True)
    performance_metrics = serializers.DictField(read_only=True)


class CircleRelationshipMetricsSerializer(serializers.Serializer):
    """Serializer for circle relationship metrics"""
    
    total_vendors = serializers.IntegerField(read_only=True)
    active_vendors = serializers.IntegerField(read_only=True)
    pending_vendors = serializers.IntegerField(read_only=True)
    vendor_performance = serializers.DictField(read_only=True)
    relationship_health = serializers.DictField(read_only=True)


class DesignationSerializer(serializers.ModelSerializer):
    """Serializer for tenant designations"""
    
    class Meta:
        model = TenantDesignation
        fields = [
            'id', 'designation_name', 'designation_code', 'designation_level', 'department', 
            'tenant', 'can_manage_users', 'can_create_projects', 'can_assign_tasks',
            'can_approve_expenses', 'can_access_reports', 'geographic_scope', 
            'functional_scope', 'is_active', 'is_system_role', 'description',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class TenantDesignationSerializer(DesignationSerializer):
    """Alias for backward compatibility"""
    pass


class TenantUserProfileSerializer(serializers.ModelSerializer):
    """Serializer for tenant user profiles"""
    
    designations = DesignationSerializer(many=True, read_only=True)
    primary_designation = DesignationSerializer(read_only=True)
    effective_permissions = serializers.ReadOnlyField()
    
    class Meta:
        model = TenantUserProfile
        fields = [
            'id', 'user', 'tenant', 'display_name', 'phone_number', 
            'secondary_phone', 'employee_id', 'profile_photo', 'job_title', 
            'designation', 'department', 'employment_type', 'designations',
            'primary_designation', 'effective_permissions', 'is_active',
            'last_login', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'primary_designation', 'effective_permissions'] 

class TenantUserCreateSerializer(serializers.Serializer):
    """
    Serializer for creating tenant users with proper User and TenantUserProfile creation
    """
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    password = serializers.CharField(min_length=8, write_only=True)
    employee_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    designation_id = serializers.IntegerField()
    department_id = serializers.IntegerField(required=False, allow_null=True)
    employment_type = serializers.CharField(max_length=50, default='Full-time')
    circle_tenant_id = serializers.UUIDField()
    
    def validate_password(self, value):
        """Validate password using Django's password validators"""
        validate_password(value)
        return value
    
    def validate_email(self, value):
        """Check if email already exists"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate_designation_id(self, value):
        """Validate designation exists for the tenant"""
        tenant_id = self.initial_data.get('circle_tenant_id')
        if tenant_id and not TenantDesignation.objects.filter(
            id=value, 
            tenant_id=tenant_id, 
            is_active=True
        ).exists():
            raise serializers.ValidationError("Invalid designation for this tenant.")
        return value
    
    def validate_department_id(self, value):
        """Validate department exists for the tenant if provided"""
        if value is None or value == '' or value == 0:
            return None
        
        # Convert string to int if needed
        try:
            value = int(value)
        except (ValueError, TypeError):
            return None
        
        tenant_id = self.initial_data.get('circle_tenant_id')
        if tenant_id and not TenantDepartment.objects.filter(
            id=value, 
            tenant_id=tenant_id, 
            is_active=True
        ).exists():
            raise serializers.ValidationError("Invalid department for this tenant.")
        return value
    
    def create(self, validated_data):
        """Create User and TenantUserProfile"""
        # Extract data
        circle_tenant_id = validated_data.pop('circle_tenant_id')
        designation_id = validated_data.pop('designation_id')
        department_id = validated_data.pop('department_id', None)
        password = validated_data.pop('password')
        
        # Get tenant
        try:
            tenant = Tenant.objects.get(id=circle_tenant_id)
        except Tenant.DoesNotExist:
            raise serializers.ValidationError("Invalid tenant ID.")
        
        # Create User
        user_data = {
            'email': validated_data['email'],
            'first_name': validated_data['first_name'],
            'last_name': validated_data['last_name'],
            'user_type': 'circle',  # Set appropriate user type
            'is_active': True,  # User is active by default
        }
        user = User.objects.create_user(password=password, **user_data)
        
        # Create TenantUserProfile
        profile_data = {
            'user': user,
            'tenant': tenant,
            'employee_id': validated_data.get('employee_id', ''),
            'phone_number': validated_data.get('phone_number', ''),
            'employment_type': validated_data.get('employment_type', 'Full-time'),
            'is_active': True,  # Profile is active by default
        }
        
        # Add department if provided
        if department_id and str(department_id).strip() and department_id != 0:
            try:
                department = TenantDepartment.objects.get(id=department_id, tenant=tenant)
                profile_data['department'] = department.department_name
            except (TenantDepartment.DoesNotExist, ValueError):
                pass  # Department is optional
        
        tenant_profile = TenantUserProfile.objects.create(**profile_data)
        
        # Assign designation to user
        try:
            from ..models import UserDesignationAssignment
            designation = TenantDesignation.objects.get(
                id=designation_id, 
                tenant=tenant
            )
            UserDesignationAssignment.objects.create(
                user_profile=tenant_profile,
                designation=designation,
                is_primary_designation=True,
                assignment_reason="Initial user setup",
                assigned_by=self.context['request'].user if self.context.get('request') else None
            )
        except TenantDesignation.DoesNotExist:
            pass  # Handle error appropriately
        
        # Send email with login credentials
        self.send_login_credentials_email(user, password, tenant)
        
        return {
            'user': user,
            'tenant_profile': tenant_profile,
            'tenant': tenant
        }
    
    def send_login_credentials_email(self, user, password, tenant):
        """Send email with login credentials to the new user"""
        try:
            subject = f"Welcome to {tenant.organization_name} - Your Login Credentials"
            
            # Create email context
            context = {
                'user': user,
                'tenant': tenant,
                'email': user.email,
                'password': password,
                'login_url': f"{settings.FRONTEND_URL}/login",
                'organization_name': tenant.organization_name
            }
            
            # Simple email message (you can create HTML templates later)
            message = f"""
Dear {user.full_name},

Welcome to {tenant.organization_name}!

Your account has been created successfully. Here are your login credentials:

Email: {user.email}
Password: {password}

Please log in at: {settings.FRONTEND_URL}/login

For security reasons, we recommend changing your password after your first login.

If you have any questions, please contact your administrator.

Best regards,
{tenant.organization_name} Team
            """.strip()
            
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@teleops.com',
                [user.email],
                fail_silently=False,
            )
            
        except Exception as e:
            # Log the error but don't fail user creation
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")

class TenantUserSerializer(serializers.ModelSerializer):
    """Serializer for tenant user display"""
    user = serializers.SerializerMethodField()
    designation = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TenantUserProfile
        fields = [
            'id', 'user', 'full_name', 'display_name', 'phone_number', 
            'employee_id', 'department', 'employment_type', 'designation',
            'is_active', 'created_at', 'updated_at'
        ]
    
    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'email': obj.user.email,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'last_login': obj.user.last_login,
            'is_active': obj.user.is_active
        }
    
    def get_full_name(self, obj):
        return obj.user.full_name
    
    def get_designation(self, obj):
        primary_designation = obj.primary_designation
        if primary_designation:
            return {
                'id': primary_designation.id,
                'name': primary_designation.designation_name,
                'level': primary_designation.designation_level
            }
        return None 
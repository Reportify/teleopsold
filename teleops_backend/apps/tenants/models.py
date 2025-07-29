import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.conf import settings
from datetime import date
from django.db.models import Q
from .constants import RESOURCE_TYPE_CHOICES


class TelecomCircle(models.Model):
    """Master data for Indian telecom circles"""
    circle_code = models.CharField(max_length=20, unique=True, help_text="e.g., MPCG, UPE, GJ")
    circle_name = models.CharField(max_length=100, help_text="e.g., Madhya Pradesh & Chhattisgarh")
    region = models.CharField(max_length=50, blank=True, help_text="North, South, East, West, etc.")
    state_coverage = models.JSONField(default=list, help_text="Array of states covered by this circle")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'telecom_circles'
        verbose_name = _('Telecom Circle')
        verbose_name_plural = _('Telecom Circles')
        ordering = ['circle_code']

    def __str__(self):
        return f"{self.circle_code} - {self.circle_name}"


class Tenant(models.Model):
    """Enhanced tenant model with Corporate → Circle → Vendor hierarchy"""
    
    # Tenant Types
    TENANT_TYPE_CHOICES = [
        ('Corporate', 'Corporate'),
        ('Circle', 'Circle'),
        ('Vendor', 'Vendor'),
    ]
    
    # Registration Status
    REGISTRATION_STATUS_CHOICES = [
        ('Pending', 'Pending Review'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Expired', 'Expired'),
        ('Warnings_Raised', 'Warnings Raised'),
        ('Clarification_Required', 'Clarification Required'),
        ('Under_Review', 'Under Review'),
    ]
    
    # Activation Status
    ACTIVATION_STATUS_CHOICES = [
        ('Inactive', 'Inactive'),
        ('Active', 'Active'),
        ('Suspended', 'Suspended'),
        ('Terminated', 'Terminated'),
    ]
    
    # Subscription Plans
    SUBSCRIPTION_PLAN_CHOICES = [
        ('Basic', 'Basic'),
        ('Professional', 'Professional'),
        ('Enterprise', 'Enterprise'),
        ('Custom', 'Custom'),
    ]

    # Primary Fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Tenant Hierarchy
    tenant_type = models.CharField(max_length=30, choices=TENANT_TYPE_CHOICES)
    parent_tenant = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, 
                                     related_name='child_tenants', help_text="Corporate parent for circles")
    
    # Organization Information
    organization_name = models.CharField(max_length=255)
    business_registration_number = models.CharField(max_length=100, blank=True, null=True)
    industry_sector = models.CharField(max_length=100, default='Telecommunications')
    country = models.CharField(max_length=100, default='India')
    primary_business_address = models.TextField()
    website = models.URLField(blank=True)
    
    # Circle Information (for Circle tenants)
    circle = models.ForeignKey(TelecomCircle, on_delete=models.SET_NULL, null=True, blank=True, 
                              related_name='tenants', help_text="Reference to telecom circle master data")
    circle_code = models.CharField(max_length=20, blank=True, help_text="e.g., MPCG, UPE, GJ")
    circle_name = models.CharField(max_length=100, blank=True, help_text="e.g., Madhya Pradesh & Chhattisgarh")
    
    # Platform Configuration
    subdomain = models.CharField(max_length=100, unique=True, help_text="e.g., vodafone-mpcg-teleops")
    subscription_plan = models.CharField(max_length=50, choices=SUBSCRIPTION_PLAN_CHOICES, default='Professional')
    
    # Contact Information
    primary_contact_name = models.CharField(max_length=255)
    primary_contact_email = models.EmailField(unique=True)
    primary_contact_phone = models.CharField(max_length=20)
    secondary_contact_name = models.CharField(max_length=255, blank=True)
    secondary_contact_email = models.EmailField(blank=True)
    secondary_contact_phone = models.CharField(max_length=20, blank=True)
    administrative_contact_email = models.EmailField(blank=True)
    
    # Business Details (for vendors)
    coverage_areas = models.JSONField(default=list, help_text="Array of circle IDs/regions")
    service_capabilities = models.JSONField(default=list, help_text="Array of service types")
    certifications = models.JSONField(default=list, help_text="Array of certifications")
    
    # Business Operational Settings
    operates_independently = models.BooleanField(default=True, help_text="Circle independence flag")
    shared_vendor_pool = models.BooleanField(default=False, help_text="Can share vendors with parent")
    cross_circle_reporting = models.BooleanField(default=True, help_text="Allow parent reporting")
    
    # Tenant Status
    registration_status = models.CharField(max_length=50, choices=REGISTRATION_STATUS_CHOICES, default='Pending')
    activation_status = models.CharField(max_length=50, choices=ACTIVATION_STATUS_CHOICES, default='Inactive')
    is_active = models.BooleanField(default=False)
    
    # Approval Information
    # approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, 
                                #    related_name='approved_tenants')
    # approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Subscription Configuration
    subscription_features = models.JSONField(default=dict)
    resource_limits = models.JSONField(default=dict)
    
    # Timestamps
    registered_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenants'
        verbose_name = _('Tenant')
        verbose_name_plural = _('Tenants')
        ordering = ['organization_name']
        indexes = [
            models.Index(fields=['tenant_type']),
            models.Index(fields=['parent_tenant']),
            models.Index(fields=['circle_code']),
            models.Index(fields=['registration_status', 'activation_status']),
            models.Index(fields=['subdomain']),
        ]

    def __str__(self):
        if self.tenant_type == 'Circle':
            return f"{self.organization_name} ({self.circle_code})"
        return self.organization_name

    def clean(self):
        """Validate tenant hierarchy and circle information"""
        from django.core.exceptions import ValidationError
        
        # Circle tenants must have parent and circle information
        if self.tenant_type == 'Circle':
            if not self.parent_tenant:
                raise ValidationError("Circle tenants must have a corporate parent")
            if not self.circle_code:
                raise ValidationError("Circle tenants must have a circle code")
            if not self.circle:
                raise ValidationError("Circle tenants must reference a telecom circle")
        
        # Corporate tenants cannot have parent
        if self.tenant_type == 'Corporate' and self.parent_tenant:
            raise ValidationError("Corporate tenants cannot have a parent tenant")
        
        # Vendor tenants can be independent or have circle relationships
        if self.tenant_type == 'Vendor' and self.parent_tenant:
            if self.parent_tenant.tenant_type != 'Circle':
                raise ValidationError("Vendor tenants can only have circle parents")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def is_corporate(self):
        return self.tenant_type == 'Corporate'

    @property
    def is_circle(self):
        return self.tenant_type == 'Circle'

    @property
    def is_vendor(self):
        return self.tenant_type == 'Vendor'

    @property
    def corporate_parent(self):
        """Get the corporate parent for circle tenants"""
        if self.tenant_type == 'Circle':
            return self.parent_tenant
        return None

    @property
    def circle_children(self):
        """Get circle children for corporate tenants"""
        if self.tenant_type == 'Corporate':
            return self.child_tenants.filter(tenant_type='Circle')
        return Tenant.objects.none()

    @property
    def vendor_relationships(self):
        """Get vendor relationships for circle tenants"""
        if self.tenant_type == 'Circle':
            return self.circle_vendor_relationships.filter(is_active=True)
        return CircleVendorRelationship.objects.none()


class CorporateCircleRelationship(models.Model):
    """Corporate oversight of circle operations"""
    
    # Relationship Types
    RELATIONSHIP_TYPE_CHOICES = [
        ('Parent_Circle', 'Parent Circle'),
    ]
    
    # Governance Levels
    GOVERNANCE_LEVEL_CHOICES = [
        ('Autonomous', 'Autonomous'),
        ('Managed', 'Managed'),
        ('Controlled', 'Controlled'),
    ]
    
    # Data Sharing Levels
    DATA_SHARING_LEVEL_CHOICES = [
        ('None', 'None'),
        ('Aggregated', 'Aggregated'),
        ('Full', 'Full'),
    ]

    corporate_tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, 
                                        related_name='corporate_relationships')
    circle_tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, 
                                     related_name='circle_relationships')
    
    # Relationship Configuration
    relationship_type = models.CharField(max_length=30, choices=RELATIONSHIP_TYPE_CHOICES, 
                                        default='Parent_Circle')
    governance_level = models.CharField(max_length=30, choices=GOVERNANCE_LEVEL_CHOICES, 
                                       default='Autonomous')
    
    # Financial Configuration
    separate_billing = models.BooleanField(default=True)
    cost_center_code = models.CharField(max_length=50, blank=True)
    budget_authority_level = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Operational Configuration
    independent_vendor_management = models.BooleanField(default=True)
    independent_employee_management = models.BooleanField(default=True)
    shared_technology_access = models.BooleanField(default=True)
    
    # Reporting Configuration
    reports_to_corporate = models.BooleanField(default=True)
    data_sharing_level = models.CharField(max_length=30, choices=DATA_SHARING_LEVEL_CHOICES, 
                                         default='Aggregated')
    
    # Status
    is_active = models.BooleanField(default=True)
    effective_from = models.DateField(auto_now_add=True)
    effective_to = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'corporate_circle_relationships'
        verbose_name = _('Corporate Circle Relationship')
        verbose_name_plural = _('Corporate Circle Relationships')
        unique_together = ['corporate_tenant', 'circle_tenant']
        indexes = [
            models.Index(fields=['corporate_tenant']),
            models.Index(fields=['circle_tenant']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.corporate_tenant.organization_name} → {self.circle_tenant.organization_name}"

    def clean(self):
        """Validate relationship types"""
        from django.core.exceptions import ValidationError
        
        if self.corporate_tenant.tenant_type != 'Corporate':
            raise ValidationError("Corporate tenant must be of type 'Corporate'")
        
        if self.circle_tenant.tenant_type != 'Circle':
            raise ValidationError("Circle tenant must be of type 'Circle'")


class CircleVendorRelationship(models.Model):
    """Circle-specific vendor relationships and permissions"""
    
    # Relationship Types
    RELATIONSHIP_TYPE_CHOICES = [
        ('Circle_Vendor', 'Circle Vendor'),
        ('Partnership', 'Partnership'),
        ('Subcontractor', 'Subcontractor'),
    ]
    
    # Relationship Status
    RELATIONSHIP_STATUS_CHOICES = [
        ('Circle_Invitation_Sent', 'Circle Invitation Sent'),
        ('Active', 'Active'),
        ('Suspended', 'Suspended'),
        ('Terminated', 'Terminated'),
        ('Expired', 'Expired'),
    ]
    
    # Vendor Verification Status (per circle)
    VENDOR_VERIFICATION_STATUS_CHOICES = [
        ('Independent', 'Independent'),
        ('Pending_Verification', 'Pending Verification'),
        ('Verified', 'Verified'),
        ('Verification_Rejected', 'Verification Rejected'),
    ]
    
    # Contact Access Levels
    CONTACT_ACCESS_LEVEL_CHOICES = [
        ('Basic', 'Basic'),
        ('Full', 'Full'),
        ('Restricted', 'Restricted'),
        ('None', 'None'),
    ]

    circle_tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, 
                                     related_name='circle_vendor_relationships')
    vendor_tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, 
                                     related_name='vendor_circle_relationships', null=True, blank=True)
    
    # Vendor Information (minimal for invitation process)
    vendor_code = models.CharField(max_length=100, help_text="Client-generated vendor code (from client's existing vendor management system)")
    contact_person_name = models.CharField(max_length=255, blank=True, help_text="Contact person name for vendor invitation")
    
    # Circle-Specific Details
    performance_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    
    # Relationship Details
    relationship_type = models.CharField(max_length=50, choices=RELATIONSHIP_TYPE_CHOICES, 
                                        default='Circle_Vendor')
    relationship_status = models.CharField(max_length=50, choices=RELATIONSHIP_STATUS_CHOICES, 
                                          default='Circle_Invitation_Sent')
    
    # Vendor Verification Status (circle-specific)
    vendor_verification_status = models.CharField(
        max_length=50,
        choices=VENDOR_VERIFICATION_STATUS_CHOICES,
        default='Independent',
        help_text="Vendor verification status for this circle relationship"
    )
    
    # Permissions and Access
    vendor_permissions = models.JSONField(default=dict, help_text="Permissions vendor has for circle data")
    communication_allowed = models.BooleanField(default=True)
    contact_access_level = models.CharField(max_length=50, choices=CONTACT_ACCESS_LEVEL_CHOICES, 
                                           default='Basic')
    
    # Relationship Management (invitation management moved to TenantInvitation table)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, 
                                   related_name='approved_circle_vendor_relationships')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Status and Notes
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'circle_vendor_relationships'
        verbose_name = _('Circle Vendor Relationship')
        verbose_name_plural = _('Circle Vendor Relationships')
        unique_together = [
            ['circle_tenant', 'vendor_code'],  # Client-generated vendor codes (unique per client)
            ['circle_tenant', 'vendor_tenant'],  # One relationship per circle-vendor pair
        ]
        indexes = [
            models.Index(fields=['circle_tenant']),
            models.Index(fields=['vendor_tenant']),
            models.Index(fields=['vendor_code']),
            models.Index(fields=['relationship_status']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.circle_tenant.organization_name} → {self.vendor_name or self.vendor_tenant.organization_name}"

    def clean(self):
        """Validate relationship types"""
        from django.core.exceptions import ValidationError
        
        if self.circle_tenant.tenant_type != 'Circle':
            raise ValidationError("Circle tenant must be of type 'Circle'")
        
        if self.vendor_tenant and self.vendor_tenant.tenant_type != 'Vendor':
            raise ValidationError("Vendor tenant must be of type 'Vendor'")


class VendorRelationship(models.Model):
    """
    Enhanced vendor relationship model supporting multi-level hierarchies
    and any-to-any tenant relationships (Corporate→Corporate, Circle→Circle, etc.)
    
    Examples:
    - Vodafone MPCG → vedag (Circle hires Vendor)
    - vedag → Verveland (Vendor sub-contracts to another Vendor)  
    - Verveland → Vodafone MPCG (Vendor works directly for Circle)
    - Ericsson MPCG → Vodafone MPCG (Corporate Circle serves as vendor to another Corporate Circle)
    """
    
    # Relationship Types
    RELATIONSHIP_TYPE_CHOICES = [
        ('Primary_Vendor', 'Primary Vendor'),           # Direct client-vendor relationship
        ('Subcontractor', 'Subcontractor'),             # Vendor hires another vendor
        ('Partnership', 'Partnership'),                 # Equal partnership
        ('Service_Provider', 'Service Provider'),       # Corporate providing services to another
        ('Preferred_Vendor', 'Preferred Vendor'),       # Preferred vendor status
        ('Backup_Vendor', 'Backup Vendor'),            # Backup/secondary vendor
    ]
    
    # Relationship Status
    RELATIONSHIP_STATUS_CHOICES = [
        ('Invitation_Sent', 'Invitation Sent'),
        ('Pending_Approval', 'Pending Approval'),
        ('Active', 'Active'),
        ('Suspended', 'Suspended'),
        ('Terminated', 'Terminated'),
        ('Expired', 'Expired'),
        ('Under_Review', 'Under Review'),
    ]
    
    # Verification Status
    VERIFICATION_STATUS_CHOICES = [
        ('Independent', 'Independent'),
        ('Pending_Verification', 'Pending Verification'),
        ('Verified', 'Verified'),
        ('Verification_Rejected', 'Verification Rejected'),
        ('Requires_Update', 'Requires Update'),
    ]
    
    # Service Scope
    SERVICE_SCOPE_CHOICES = [
        ('Circle_Wide', 'Circle Wide'),
        ('Regional', 'Regional'),
        ('District_Specific', 'District Specific'),
        ('Project_Based', 'Project Based'),
        ('Task_Specific', 'Task Specific'),
        ('On_Demand', 'On Demand'),
    ]

    # Core Relationship
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client_tenant = models.ForeignKey(
        Tenant, 
        on_delete=models.CASCADE, 
        related_name='vendor_relationships_as_client',
        help_text="The tenant that hires/contracts the vendor"
    )
    vendor_tenant = models.ForeignKey(
        Tenant, 
        on_delete=models.CASCADE, 
        related_name='vendor_relationships_as_vendor', 
        null=True, 
        blank=True,
        help_text="The tenant providing services (null during invitation process)"
    )
    
    # Vendor Information (for invitation/pre-registration)
    vendor_name = models.CharField(max_length=255, blank=True, help_text="Vendor name before registration")
    vendor_code = models.CharField(
        max_length=100, 
        help_text="Client-generated vendor code (unique within client's vendor management system)"
    )
    vendor_email = models.EmailField(blank=True, help_text="Vendor email for invitation")
    
    # Relationship Details
    relationship_type = models.CharField(
        max_length=50, 
        choices=RELATIONSHIP_TYPE_CHOICES, 
        default='Primary_Vendor'
    )
    relationship_status = models.CharField(
        max_length=50, 
        choices=RELATIONSHIP_STATUS_CHOICES, 
        default='Invitation_Sent'
    )
    verification_status = models.CharField(
        max_length=50,
        choices=VERIFICATION_STATUS_CHOICES,
        default='Independent'
    )
    
    # Hierarchy Support
    parent_relationship = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='sub_relationships',
        help_text="Parent relationship for sub-contracting scenarios"
    )
    hierarchy_level = models.PositiveIntegerField(
        default=1,
        help_text="1=Direct vendor, 2=Sub-vendor, 3=Sub-sub-vendor, etc."
    )
    
    # Service Details
    service_scope = models.CharField(
        max_length=50,
        choices=SERVICE_SCOPE_CHOICES,
        default='Circle_Wide'
    )
    service_areas = models.JSONField(
        default=list, 
        help_text="Geographic areas: districts, regions, or specific locations"
    )
    service_capabilities = models.JSONField(
        default=list, 
        help_text="Service types: Dismantling, Installation, Maintenance, Survey, etc."
    )
    
    # Performance & Rating
    performance_rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Overall performance rating (1.00 - 5.00)"
    )
    quality_score = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    delivery_score = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    
    # Financial Terms
    billing_rate = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Rate per unit/hour/project"
    )
    billing_unit = models.CharField(
        max_length=50, 
        default='Per_Project',
        help_text="Per_Hour, Per_Day, Per_Project, Per_Site, etc."
    )
    payment_terms = models.CharField(max_length=100, blank=True)
    currency = models.CharField(max_length=10, default='INR')
    billing_frequency = models.CharField(max_length=20, default='Monthly')
    
    # Revenue Sharing (for sub-contractor scenarios)
    revenue_share_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Percentage of revenue shared with parent vendor"
    )
    
    # Permissions and Access
    vendor_permissions = models.JSONField(
        default=dict, 
        help_text="Permissions vendor has for client data access"
    )
    data_access_level = models.CharField(
        max_length=50,
        choices=[
            ('None', 'No Access'),
            ('Basic', 'Basic Info Only'),
            ('Project_Specific', 'Project Specific Data'),
            ('Circle_Data', 'Circle Level Data'),
            ('Full_Access', 'Full Access'),
        ],
        default='Basic'
    )
    communication_allowed = models.BooleanField(default=True)
    
    # Contract Details
    contract_start_date = models.DateField(null=True, blank=True)
    contract_end_date = models.DateField(null=True, blank=True)
    auto_renewal = models.BooleanField(default=False)
    notice_period_days = models.PositiveIntegerField(default=30)
    
    # Invitation Management
    invitation_token = models.CharField(max_length=255, blank=True)
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    invitation_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Approval Workflow
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_vendor_relationships'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='approved_vendor_relationships'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    # Status and Metadata
    notes = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True, help_text="Internal notes not visible to vendor")
    is_active = models.BooleanField(default=True)
    is_preferred = models.BooleanField(default=False)
    is_critical = models.BooleanField(default=False, help_text="Critical vendor requiring special attention")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_activity_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'vendor_relationships'
        verbose_name = _('Vendor Relationship')
        verbose_name_plural = _('Vendor Relationships')
        unique_together = [
            ['client_tenant', 'vendor_code'],  # Client-generated vendor codes (unique per client)
            ['client_tenant', 'vendor_tenant', 'relationship_type'],  # Prevent duplicate relationships of same type
        ]
        indexes = [
            models.Index(fields=['client_tenant', 'relationship_status']),
            models.Index(fields=['vendor_tenant', 'relationship_status']),
            models.Index(fields=['vendor_code']),
            models.Index(fields=['relationship_type', 'is_active']),
            models.Index(fields=['hierarchy_level']),
            models.Index(fields=['parent_relationship']),
            models.Index(fields=['verification_status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        vendor_name = self.vendor_tenant.organization_name if self.vendor_tenant else (self.vendor_name or 'Unknown Vendor')
        return f"{self.client_tenant.organization_name} → {vendor_name} ({self.relationship_type})"

    def clean(self):
        """Validate relationship business rules"""
        from django.core.exceptions import ValidationError
        
        # Prevent self-referencing relationships
        if self.vendor_tenant == self.client_tenant:
            raise ValidationError("A tenant cannot be a vendor to itself")
        
        # Validate hierarchy level consistency
        if self.parent_relationship:
            if self.hierarchy_level <= self.parent_relationship.hierarchy_level:
                raise ValidationError("Hierarchy level must be greater than parent relationship")
            
            # Check for circular references
            parent = self.parent_relationship
            while parent:
                if parent.vendor_tenant == self.client_tenant:
                    raise ValidationError("Circular vendor relationship detected")
                parent = parent.parent_relationship
        
        # Revenue sharing validation
        if self.revenue_share_percentage and (self.revenue_share_percentage < 0 or self.revenue_share_percentage > 100):
            raise ValidationError("Revenue share percentage must be between 0 and 100")

    def save(self, *args, **kwargs):
        # Set hierarchy level based on parent
        if self.parent_relationship:
            self.hierarchy_level = self.parent_relationship.hierarchy_level + 1
        else:
            self.hierarchy_level = 1
            
        # Generate invitation token if needed
        if not self.invitation_token and self.relationship_status == 'Invitation_Sent':
            self.invitation_token = str(uuid.uuid4())
            
        super().save(*args, **kwargs)

    @property
    def is_subcontractor(self):
        """Check if this is a sub-contracting relationship"""
        return self.parent_relationship is not None

    @property
    def has_subcontractors(self):
        """Check if this vendor has sub-contractors"""
        return self.sub_relationships.exists()

    @property
    def hierarchy_path(self):
        """Get the full hierarchy path"""
        path = []
        current = self
        while current:
            client_name = current.client_tenant.organization_name
            vendor_name = current.vendor_tenant.organization_name if current.vendor_tenant else current.vendor_name
            path.append(f"{client_name} → {vendor_name}")
            current = current.parent_relationship
        return " | ".join(reversed(path))

    def get_all_subcontractors(self):
        """Get all sub-contractors recursively"""
        subcontractors = []
        for sub_rel in self.sub_relationships.all():
            subcontractors.append(sub_rel)
            subcontractors.extend(sub_rel.get_all_subcontractors())
        return subcontractors

    def can_access_data(self, data_type):
        """Check if vendor can access specific data type"""
        permissions = self.vendor_permissions
        return permissions.get(data_type, False)


class TenantInvitation(models.Model):
    """Model for tenant invitations sent by admins"""
    
    TENANT_TYPE_CHOICES = [
        ('Corporate', 'Corporate'),
        ('Circle', 'Circle'),
        ('Vendor', 'Vendor'),
    ]
    
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Accepted', 'Accepted'),
        ('Completed', 'Completed'),
        ('Expired', 'Expired'),
        ('Cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Invitation details
    email = models.EmailField()
    contact_name = models.CharField(max_length=255, default="Unknown Contact")
    tenant_type = models.CharField(max_length=20, choices=TENANT_TYPE_CHOICES, default='Corporate')
    organization_name = models.CharField(max_length=255, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    
    # Invitation management
    invitation_token = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    
    # Timestamps
    invited_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    
    # Admin tracking
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Created tenant (if accepted)
    created_tenant = models.ForeignKey('Tenant', on_delete=models.SET_NULL, null=True, blank=True, related_name='invitations')
    
    # Additional context
    notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'tenant_invitations'
        ordering = ['-invited_at']
    
    def __str__(self):
        return f"Invitation for {self.email} ({self.tenant_type})"
    
    def save(self, *args, **kwargs):
        if not self.invitation_token:
            self.invitation_token = str(uuid.uuid4())
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)  # 7 days expiry
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        return timezone.now() > self.expires_at
    
    @property
    def is_valid(self):
        return self.status == 'Pending' and not self.is_expired
    
    def accept(self, tenant=None):
        """Accept the invitation and optionally link to tenant"""
        self.status = 'Accepted'
        self.accepted_at = timezone.now()
        if tenant:
            self.created_tenant = tenant
        self.save()
    
    def expire(self):
        """Mark invitation as expired"""
        self.status = 'Expired'
        self.save()
    
    def cancel(self):
        """Cancel the invitation"""
        self.status = 'Cancelled'
        self.save()

    def complete_verification(self):
        """Complete the verification process and mark as completed (keeping audit trail)"""
        if self.status != 'Accepted':
            raise ValueError("Only accepted invitations can be completed")
        
        if not self.created_tenant:
            raise ValueError("No tenant associated with this invitation")
        
        # Log the completion
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Completing verification for invitation {self.id}, tenant {self.created_tenant.id} is now active")
        
        # Mark as completed instead of deleting (preserves audit trail)
        self.status = 'Completed'
        self.save()


class TenantUserProfile(models.Model):
    """
    Enhanced user profile model that integrates with the new designation system
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='tenant_user_profile'
    )
    tenant = models.ForeignKey(
        Tenant, 
        on_delete=models.CASCADE, 
        related_name='user_profiles', 
        null=True, 
        blank=True
    )
    
    # Basic Information
    display_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    secondary_phone = models.CharField(max_length=20, blank=True)
    employee_id = models.CharField(max_length=50, blank=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    
    # Job Information
    job_title = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    employment_type = models.CharField(
        max_length=50, 
        default='Full-time', 
        help_text="Employment type (Full-time, Part-time, Contract, etc.)"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_user_profiles'
        unique_together = ['user', 'tenant']
        indexes = [
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['user', 'tenant']),
            models.Index(fields=['employee_id']),
            models.Index(fields=['created_at']),
        ]
        
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} @ {self.tenant.organization_name if self.tenant else 'No Tenant'}"
    
    @property
    def primary_designation(self):
        """Get the user's primary designation"""
        assignment = UserDesignationAssignment.objects.filter(
            user_profile=self,
            is_primary_designation=True,
            is_active=True,
            assignment_status='Active'
        ).select_related('designation').first()
        
        return assignment.designation if assignment else None
    
    @property
    def all_designations(self):
        """Get all active designations for this user"""
        assignments = UserDesignationAssignment.objects.filter(
            user_profile=self,
            is_active=True,
            assignment_status='Active'
        ).select_related('designation')
        
        return [assignment.designation for assignment in assignments if assignment.is_currently_effective()]
    
    @property
    def effective_permissions(self):
        """Calculate effective permissions from all active designations"""
        from apps.tenants.services.designation_service import DesignationService
        designation_service = DesignationService()
        return designation_service.get_user_effective_permissions(self)
    
    def has_permission(self, permission_code):
        """Check if user has a specific permission"""
        permissions = self.effective_permissions
        return permission_code in permissions.get('permissions', []) or '*' in permissions.get('permissions', [])
    
    def can_manage_user(self, other_user_profile):
        """Check if this user can manage another user"""
        if not self.has_permission('user.manage') and not self.has_permission('*'):
            return False
        
        # Check if any of user's designations can manage the other user's designations
        user_designations = self.all_designations
        other_designations = other_user_profile.all_designations
        
        for user_designation in user_designations:
            for other_designation in other_designations:
                if user_designation.can_manage_designation(other_designation):
                    return True
        
        return False
    
    def get_subordinate_users(self):
        """Get all users that this user can manage"""
        if not self.has_permission('user.manage') and not self.has_permission('*'):
            return TenantUserProfile.objects.none()
        
        # Get all subordinate designations
        subordinate_designation_ids = []
        for designation in self.all_designations:
            subordinate_designations = designation.get_subordinate_designations()
            subordinate_designation_ids.extend([d.id for d in subordinate_designations])
        
        if not subordinate_designation_ids:
            return TenantUserProfile.objects.none()
        
        # Get users with those designations
        subordinate_user_ids = UserDesignationAssignment.objects.filter(
            designation_id__in=subordinate_designation_ids,
            is_active=True,
            assignment_status='Active'
        ).values_list('user_profile_id', flat=True)
        
        return TenantUserProfile.objects.filter(
            id__in=subordinate_user_ids,
            tenant=self.tenant,
            is_active=True
        )


class TenantComplianceIssue(models.Model):
    """Track compliance issues, warnings, and clarification requests"""
    
    ISSUE_TYPE_CHOICES = [
        ('Warning', 'Warning'),
        ('Clarification_Required', 'Clarification Required'),
        ('Documentation_Missing', 'Documentation Missing'),
        ('Business_Verification', 'Business Verification'),
        ('Compliance_Review', 'Compliance Review'),
        ('Legal_Review', 'Legal Review'),
        ('Financial_Verification', 'Financial Verification'),
    ]
    
    SEVERITY_CHOICES = [
        ('Low', 'Low Priority'),
        ('Medium', 'Medium Priority'),
        ('High', 'High Priority'),
        ('Critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('Open', 'Open'),
        ('In_Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
        ('Escalated', 'Escalated'),
        ('Closed', 'Closed'),
    ]
    
    # Core Fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant, 
        on_delete=models.CASCADE, 
        related_name='compliance_issues'
    )
    
    # Issue Classification
    issue_type = models.CharField(max_length=30, choices=ISSUE_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    
    # Issue Details
    title = models.CharField(max_length=255)
    description = models.TextField()
    required_action = models.TextField(
        help_text="Clear description of what tenant needs to do to resolve this issue"
    )
    
    # Documentation Requirements
    required_documents = models.JSONField(
        default=list, 
        help_text="List of documents required to resolve this issue"
    )
    submitted_documents = models.JSONField(
        default=list, 
        help_text="List of documents submitted by tenant"
    )
    
    # Tracking and Assignment
    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='raised_compliance_issues'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_compliance_issues'
    )
    
    # Timeline
    due_date = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Expected resolution date"
    )
    raised_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Resolution
    resolution_notes = models.TextField(
        blank=True,
        help_text="Notes about how the issue was resolved"
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='resolved_compliance_issues'
    )
    
    # Tenant Response
    tenant_response = models.TextField(
        blank=True,
        help_text="Tenant's response or clarification"
    )
    tenant_response_at = models.DateTimeField(null=True, blank=True)
    
    # Internal Notes
    internal_notes = models.TextField(
        blank=True,
        help_text="Internal notes not visible to tenant"
    )
    
    # Auto-generated fields
    is_blocking = models.BooleanField(
        default=False,
        help_text="Whether this issue blocks tenant operations"
    )
    
    class Meta:
        db_table = 'tenant_compliance_issues'
        verbose_name = _('Tenant Compliance Issue')
        verbose_name_plural = _('Tenant Compliance Issues')
        ordering = ['-raised_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['severity', 'status']),
            models.Index(fields=['issue_type']),
            models.Index(fields=['raised_at']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.title}"

    def save(self, *args, **kwargs):
        # Set default due date if not provided
        if not self.due_date and self.severity:
            from datetime import timedelta
            days_map = {
                'Critical': 1,
                'High': 3,
                'Medium': 7,
                'Low': 14
            }
            self.due_date = timezone.now() + timedelta(days=days_map.get(self.severity, 7))
        
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        """Check if issue is overdue"""
        if not self.due_date:
            return False
        return self.status == 'Open' and timezone.now() > self.due_date

    @property
    def days_until_due(self):
        """Get days until due date"""
        if not self.due_date:
            return None
        delta = self.due_date - timezone.now()
        return delta.days if delta.days > 0 else 0

    def mark_resolved(self, resolved_by, resolution_notes=""):
        """Mark issue as resolved"""
        self.status = 'Resolved'
        self.resolved_by = resolved_by
        self.resolved_at = timezone.now()
        self.resolution_notes = resolution_notes
        self.save()

    def add_tenant_response(self, response):
        """Add tenant response to issue"""
        self.tenant_response = response
        self.tenant_response_at = timezone.now()
        self.status = 'In_Progress'
        self.save()


class TenantComplianceDocument(models.Model):
    """Documents uploaded for compliance issues"""
    
    DOCUMENT_TYPE_CHOICES = [
        ('Business_Registration', 'Business Registration'),
        ('GST_Certificate', 'GST Certificate'),
        ('PAN_Card', 'PAN Card'),
        ('Address_Proof', 'Address Proof'),
        ('Bank_Statement', 'Bank Statement'),
        ('Audited_Financials', 'Audited Financials'),
        ('Insurance_Certificate', 'Insurance Certificate'),
        ('License_Certificate', 'License Certificate'),
        ('Other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('Pending_Review', 'Pending Review'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Requires_Clarification', 'Requires Clarification'),
    ]
    
    # Core Fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    compliance_issue = models.ForeignKey(
        TenantComplianceIssue,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    
    # Document Details
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES)
    document_name = models.CharField(max_length=255)
    document_file = models.FileField(upload_to='compliance_documents/')
    document_description = models.TextField(blank=True)
    
    # Review Status
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending_Review')
    review_notes = models.TextField(blank=True)
    
    # Tracking
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_compliance_documents'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_compliance_documents'
    )
    
    # Timestamps
    uploaded_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'tenant_compliance_documents'
        verbose_name = _('Tenant Compliance Document')
        verbose_name_plural = _('Tenant Compliance Documents')
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.document_name} - {self.compliance_issue.title}"


class VendorCreatedClient(models.Model):
    """
    Client entities created by vendors for non-integrated client management.
    
    This model supports dual-mode vendor operations where vendors can:
    1. Work with associated clients (from vendor_relationships) - Read-only
    2. Create independent clients (this model) - Full CRUD
    
    Business Rules:
    - Exact name matching prevents duplication of associated clients
    - Same corporate family but different circles allowed
    - Conversion tracking for future platform adoption
    """
    
    # Client Type Choices
    CLIENT_TYPE_CHOICES = [
        ('Non_Integrated', 'Non-Integrated Client'),
        ('Potential_Platform_User', 'Potential Platform User'),
        ('Legacy_Client', 'Legacy Client'),
        ('Competitor_Client', 'Competitor Client'),
    ]
    
    # Platform Interest Levels
    PLATFORM_INTEREST_CHOICES = [
        ('Unknown', 'Unknown'),
        ('Not_Interested', 'Not Interested'),
        ('Slightly_Interested', 'Slightly Interested'),
        ('Moderately_Interested', 'Moderately Interested'),
        ('Highly_Interested', 'Highly Interested'),
        ('Ready_to_Onboard', 'Ready to Onboard'),
    ]
    
    # Conversion Status
    CONVERSION_STATUS_CHOICES = [
        ('None', 'No Conversion Activity'),
        ('Initial_Contact', 'Initial Contact Made'),
        ('Demo_Scheduled', 'Demo Scheduled'),
        ('Demo_Completed', 'Demo Completed'),
        ('Proposal_Sent', 'Proposal Sent'),
        ('Negotiation', 'In Negotiation'),
        ('Conversion_Approved', 'Conversion Approved'),
        ('Conversion_Rejected', 'Conversion Rejected'),
    ]
    
    # Monthly Activity Levels
    ACTIVITY_LEVEL_CHOICES = [
        ('Low', 'Low Activity (1-5 projects/month)'),
        ('Medium', 'Medium Activity (6-15 projects/month)'),
        ('High', 'High Activity (16-30 projects/month)'),
        ('Very_High', 'Very High Activity (30+ projects/month)'),
    ]

    # Core Fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_tenant = models.ForeignKey(
        Tenant, 
        on_delete=models.CASCADE, 
        related_name='created_clients',
        help_text="Vendor who created this client entry"
    )
    
    # Client Organization Information
    client_name = models.CharField(
        max_length=255, 
        help_text="Full organization name (e.g., 'Airtel UP East', 'BSNL Maharashtra')"
    )
    client_code = models.CharField(
        max_length=50, 
        help_text="Vendor's internal reference code for this client"
    )
    client_type = models.CharField(
        max_length=30, 
        choices=CLIENT_TYPE_CHOICES, 
        default='Non_Integrated'
    )
    
    # Contact Information
    primary_contact_name = models.CharField(max_length=255)
    primary_contact_email = models.EmailField()
    primary_contact_phone = models.CharField(max_length=20)
    secondary_contact_name = models.CharField(max_length=255, blank=True)
    secondary_contact_email = models.EmailField(blank=True)
    secondary_contact_phone = models.CharField(max_length=20, blank=True)
    
    # Business Details
    headquarters_address = models.TextField()
    regional_offices = models.JSONField(
        default=list, 
        help_text="Array of regional office locations"
    )
    business_sectors = models.JSONField(
        default=list, 
        help_text="Array of business sectors (e.g., ['Telecom', 'Infrastructure'])"
    )
    company_size = models.CharField(
        max_length=50, 
        blank=True,
        help_text="Employee count range (e.g., '1000-5000', '5000+')"
    )
    
    # Platform Configuration & Branding
    branding_logo = models.CharField(
        max_length=255, 
        blank=True,
        help_text="URL or path to client's logo for vendor portal branding"
    )
    primary_color = models.CharField(
        max_length=10, 
        default='#1976d2',
        help_text="Hex color code for client branding in vendor portal"
    )
    secondary_color = models.CharField(
        max_length=10, 
        default='#424242',
        help_text="Secondary hex color for client branding"
    )
    
    # Platform Interest & Conversion Tracking
    platform_interest_level = models.CharField(
        max_length=30, 
        choices=PLATFORM_INTEREST_CHOICES, 
        default='Unknown'
    )
    conversion_status = models.CharField(
        max_length=30, 
        choices=CONVERSION_STATUS_CHOICES, 
        default='None'
    )
    conversion_probability = models.IntegerField(
        default=0,
        help_text="Probability percentage (0-100) of client adopting platform"
    )
    platform_demo_date = models.DateField(null=True, blank=True)
    conversion_notes = models.TextField(
        blank=True,
        help_text="Internal notes about platform conversion efforts"
    )
    
    # Business Metrics & Activity
    total_sites = models.IntegerField(
        default=0,
        help_text="Total number of sites managed for this client"
    )
    total_projects = models.IntegerField(
        default=0,
        help_text="Total number of projects completed for this client"
    )
    active_projects = models.IntegerField(
        default=0,
        help_text="Currently active projects for this client"
    )
    monthly_activity_level = models.CharField(
        max_length=20, 
        choices=ACTIVITY_LEVEL_CHOICES, 
        default='Low'
    )
    last_project_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Date of most recent project for this client"
    )
    
    # Financial Tracking
    total_revenue_generated = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=0,
        help_text="Total revenue generated from this client (INR)"
    )
    average_project_value = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        help_text="Average value per project for this client (INR)"
    )
    payment_terms = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Standard payment terms for this client"
    )
    currency = models.CharField(max_length=10, default='INR')
    
    # Relationship Management
    relationship_start_date = models.DateField(
        auto_now_add=True,
        help_text="Date when vendor started working with this client"
    )
    relationship_status = models.CharField(
        max_length=50,
        choices=[
            ('Active', 'Active'),
            ('Inactive', 'Inactive'),
            ('On_Hold', 'On Hold'),
            ('Terminated', 'Terminated'),
        ],
        default='Active'
    )
    contract_end_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Contract expiration date (if applicable)"
    )
    
    # Performance Metrics
    client_satisfaction_rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Client satisfaction rating (1.00 - 5.00)"
    )
    vendor_performance_rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Vendor's self-assessed performance rating (1.00 - 5.00)"
    )
    
    # Internal Notes & Metadata
    internal_notes = models.TextField(
        blank=True,
        help_text="Internal vendor notes about this client relationship"
    )
    tags = models.JSONField(
        default=list,
        help_text="Array of tags for categorization (e.g., ['High-Value', 'Telecom'])"
    )
    
    # Future Enhancement Fields
    platform_onboarding_interest = models.BooleanField(
        default=False,
        help_text="Whether client has expressed interest in platform onboarding"
    )
    estimated_platform_value = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Estimated monthly platform value if client onboards (INR)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_activity_date = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Date of last recorded activity with this client"
    )

    class Meta:
        db_table = 'vendor_created_clients'
        verbose_name = _('Vendor Created Client')
        verbose_name_plural = _('Vendor Created Clients')
        ordering = ['-created_at']
        unique_together = [
            ['vendor_tenant', 'client_code'],  # Vendor's internal codes must be unique
            ['vendor_tenant', 'client_name'],  # Client names must be unique per vendor
        ]
        indexes = [
            models.Index(fields=['vendor_tenant', 'client_name']),
            models.Index(fields=['vendor_tenant', 'relationship_status']),
            models.Index(fields=['conversion_status']),
            models.Index(fields=['platform_interest_level']),
            models.Index(fields=['monthly_activity_level']),
            models.Index(fields=['created_at']),
            models.Index(fields=['last_activity_date']),
        ]

    def __str__(self):
        return f"{self.client_name} (Vendor: {self.vendor_tenant.organization_name})"

    def clean(self):
        """Validate business rules for vendor-created clients"""
        from django.core.exceptions import ValidationError
        
        # Validate vendor tenant type
        if self.vendor_tenant.tenant_type != 'Vendor':
            raise ValidationError("Only Vendor tenants can create independent clients")
        
        # Validate conversion probability range
        if not (0 <= self.conversion_probability <= 100):
            raise ValidationError("Conversion probability must be between 0 and 100")
        
        # Validate color codes
        import re
        if self.primary_color and not re.match(r'^#[0-9A-Fa-f]{6}$', self.primary_color):
            raise ValidationError("Primary color must be a valid hex color code")
        if self.secondary_color and not re.match(r'^#[0-9A-Fa-f]{6}$', self.secondary_color):
            raise ValidationError("Secondary color must be a valid hex color code")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def is_high_value_client(self):
        """Determine if this is a high-value client based on revenue and activity"""
        return (
            self.total_revenue_generated > 500000 or  # 5L+ revenue
            self.monthly_activity_level in ['High', 'Very_High'] or
            self.average_project_value > 50000  # 50K+ average project value
        )

    @property
    def conversion_readiness_score(self):
        """Calculate conversion readiness score (0-100)"""
        score = 0
        
        # Base conversion probability
        score += self.conversion_probability * 0.4
        
        # Interest level scoring
        interest_scores = {
            'Unknown': 0, 'Not_Interested': 10, 'Slightly_Interested': 20,
            'Moderately_Interested': 40, 'Highly_Interested': 70, 'Ready_to_Onboard': 100
        }
        score += interest_scores.get(self.platform_interest_level, 0) * 0.3
        
        # Activity level scoring
        activity_scores = {'Low': 10, 'Medium': 30, 'High': 60, 'Very_High': 100}
        score += activity_scores.get(self.monthly_activity_level, 0) * 0.2
        
        # High-value client bonus
        if self.is_high_value_client:
            score += 10
        
        return min(int(score), 100)

    @property
    def months_since_last_activity(self):
        """Calculate months since last recorded activity"""
        if not self.last_activity_date:
            return None
        
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta
        
        delta = timezone.now().date() - self.last_activity_date
        return delta.days // 30

    def update_activity_metrics(self, project_value=None):
        """Update activity metrics when new project is added"""
        self.total_projects += 1
        self.last_activity_date = timezone.now().date()
        
        if project_value:
            self.total_revenue_generated += project_value
            # Recalculate average project value
            if self.total_projects > 0:
                self.average_project_value = self.total_revenue_generated / self.total_projects
        
        self.save()

    def calculate_monthly_platform_cost(self):
        """Calculate estimated monthly platform cost if client onboards"""
        # Base calculation based on activity level and site count
        base_cost = {
            'Low': 15000,    # ₹15K/month for low activity
            'Medium': 35000, # ₹35K/month for medium activity  
            'High': 60000,   # ₹60K/month for high activity
            'Very_High': 100000  # ₹1L/month for very high activity
        }
        
        activity_cost = base_cost.get(self.monthly_activity_level, 15000)
        
        # Site-based additional cost (₹500 per site/month)
        site_cost = self.total_sites * 500
        
        return activity_cost + site_cost


class VendorClientBilling(models.Model):
    """
    Billing records for vendor-managed client operations.
    
    This model tracks:
    1. Platform costs (what vendor pays for managing independent clients)
    2. Client revenue (what vendor receives from client projects)
    3. Profitability analysis for dual-mode operations
    """
    
    # Billing Status
    BILLING_STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Generated', 'Generated'),
        ('Sent', 'Sent to Vendor'),
        ('Paid', 'Paid'),
        ('Overdue', 'Overdue'),
        ('Disputed', 'Disputed'),
        ('Cancelled', 'Cancelled'),
    ]
    
    # Payment Status
    PAYMENT_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Partial', 'Partial Payment'),
        ('Paid', 'Fully Paid'),
        ('Failed', 'Payment Failed'),
        ('Refunded', 'Refunded'),
    ]

    # Core Fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_tenant = models.ForeignKey(
        Tenant, 
        on_delete=models.CASCADE, 
        related_name='client_billing_records'
    )
    vendor_created_client = models.ForeignKey(
        VendorCreatedClient, 
        on_delete=models.CASCADE, 
        related_name='billing_records'
    )
    
    # Billing Period
    billing_period_start = models.DateField()
    billing_period_end = models.DateField()
    billing_month = models.DateField(
        help_text="Month being billed (YYYY-MM-01 format)"
    )
    
    # Platform Costs (What vendor pays to platform)
    base_client_management_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Base monthly fee for managing this client on platform"
    )
    site_management_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Fee per site managed (sites × rate)"
    )
    project_transaction_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Transaction fee for projects created (projects × rate)"
    )
    data_storage_fee = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        default=0,
        help_text="Fee for data storage and backup services"
    )
    support_fee = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        default=0,
        help_text="Customer support and maintenance fee"
    )
    total_platform_cost = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        help_text="Total amount vendor pays to platform (auto-calculated)"
    )
    
    # Client Revenue (What vendor receives from client)
    client_project_value = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=0,
        help_text="Total value of projects completed for client this month"
    )
    recurring_service_revenue = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        help_text="Monthly recurring revenue from ongoing services"
    )
    additional_service_revenue = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        help_text="Additional services revenue (consulting, training, etc.)"
    )
    total_client_revenue = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        help_text="Total revenue received from client (auto-calculated)"
    )
    
    # Profitability Analysis (Auto-calculated)
    gross_profit = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        help_text="Client revenue minus platform costs"
    )
    profit_margin_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        help_text="Profit margin as percentage of client revenue"
    )
    
    # Activity Metrics
    projects_completed = models.IntegerField(
        default=0,
        help_text="Number of projects completed this billing period"
    )
    sites_managed = models.IntegerField(
        default=0,
        help_text="Number of sites actively managed this billing period"
    )
    total_transactions = models.IntegerField(
        default=0,
        help_text="Total platform transactions for this client this period"
    )
    
    # Billing Management
    billing_status = models.CharField(
        max_length=20, 
        choices=BILLING_STATUS_CHOICES, 
        default='Draft'
    )
    payment_status = models.CharField(
        max_length=20, 
        choices=PAYMENT_STATUS_CHOICES, 
        default='Pending'
    )
    invoice_number = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Platform-generated invoice number"
    )
    due_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Payment due date"
    )
    paid_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Date payment was received"
    )
    
    # Payment Details
    payment_method = models.CharField(
        max_length=50, 
        blank=True,
        help_text="Payment method used (Bank Transfer, UPI, etc.)"
    )
    payment_reference = models.CharField(
        max_length=255, 
        blank=True,
        help_text="Payment reference number or transaction ID"
    )
    
    # Currency and Tax
    currency = models.CharField(max_length=10, default='INR')
    tax_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=18.00,
        help_text="GST/tax rate percentage"
    )
    tax_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Tax amount calculated on platform costs"
    )
    
    # Notes and Adjustments
    billing_notes = models.TextField(
        blank=True,
        help_text="Notes about this billing period"
    )
    adjustments = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Manual adjustments (credits/debits)"
    )
    adjustment_reason = models.CharField(
        max_length=255, 
        blank=True,
        help_text="Reason for billing adjustments"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    generated_at = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="When the bill was generated and finalized"
    )

    class Meta:
        db_table = 'vendor_client_billing'
        verbose_name = _('Vendor Client Billing')
        verbose_name_plural = _('Vendor Client Billing')
        ordering = ['-billing_month']
        unique_together = [
            ['vendor_tenant', 'vendor_created_client', 'billing_month'],
        ]
        indexes = [
            models.Index(fields=['vendor_tenant', 'billing_month']),
            models.Index(fields=['vendor_created_client', 'billing_month']),
            models.Index(fields=['billing_status', 'payment_status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.vendor_created_client.client_name} - {self.billing_month.strftime('%B %Y')}"

    def clean(self):
        """Validate billing record business rules"""
        from django.core.exceptions import ValidationError
        
        # Validate billing period
        if self.billing_period_start > self.billing_period_end:
            raise ValidationError("Billing period start must be before end date")
        
        # Validate vendor tenant type
        if self.vendor_tenant.tenant_type != 'Vendor':
            raise ValidationError("Billing records can only be created for Vendor tenants")
        
        # Validate tax rate
        if not (0 <= self.tax_rate <= 100):
            raise ValidationError("Tax rate must be between 0 and 100 percent")

    def save(self, *args, **kwargs):
        # Auto-calculate derived fields before saving
        self.calculate_totals()
        self.clean()
        
        # Generate invoice number if billing status changes to 'Generated'
        if self.billing_status == 'Generated' and not self.invoice_number:
            self.generate_invoice_number()
        
        # Set due date if not provided
        if not self.due_date and self.billing_status == 'Generated':
            from datetime import timedelta
            self.due_date = self.billing_period_end + timedelta(days=30)
        
        super().save(*args, **kwargs)

    def calculate_totals(self):
        """Calculate auto-derived totals and profit margins"""
        # Calculate total platform cost
        self.total_platform_cost = (
            self.base_client_management_fee +
            self.site_management_fee +
            self.project_transaction_fee +
            self.data_storage_fee +
            self.support_fee +
            self.adjustments
        )
        
        # Calculate tax amount
        self.tax_amount = (self.total_platform_cost * self.tax_rate) / 100
        
        # Calculate total client revenue
        self.total_client_revenue = (
            self.client_project_value +
            self.recurring_service_revenue +
            self.additional_service_revenue
        )
        
        # Calculate profitability
        self.gross_profit = self.total_client_revenue - (self.total_platform_cost + self.tax_amount)
        
        # Calculate profit margin percentage
        if self.total_client_revenue > 0:
            self.profit_margin_percentage = (self.gross_profit / self.total_client_revenue) * 100
        else:
            self.profit_margin_percentage = 0

    def generate_invoice_number(self):
        """Generate unique invoice number"""
        from datetime import datetime
        
        # Format: VCB-YYYYMM-VENDOR_ID_SHORT-SEQUENCE
        month_str = self.billing_month.strftime('%Y%m')
        vendor_short = str(self.vendor_tenant.id)[:8].upper()
        
        # Find next sequence number for this vendor and month
        last_invoice = VendorClientBilling.objects.filter(
            vendor_tenant=self.vendor_tenant,
            billing_month=self.billing_month,
            invoice_number__isnull=False
        ).exclude(id=self.id).order_by('-invoice_number').first()
        
        if last_invoice and last_invoice.invoice_number:
            try:
                last_seq = int(last_invoice.invoice_number.split('-')[-1])
                next_seq = last_seq + 1
            except (ValueError, IndexError):
                next_seq = 1
        else:
            next_seq = 1
        
        self.invoice_number = f"VCB-{month_str}-{vendor_short}-{next_seq:03d}"

    @property
    def is_profitable(self):
        """Check if this billing period was profitable"""
        return self.gross_profit > 0

    @property
    def days_overdue(self):
        """Calculate days overdue if payment is pending past due date"""
        if not self.due_date or self.payment_status == 'Paid':
            return 0
        
        from django.utils import timezone
        if timezone.now().date() > self.due_date:
            return (timezone.now().date() - self.due_date).days
        return 0

    @property
    def platform_cost_per_project(self):
        """Calculate platform cost per project for this period"""
        if self.projects_completed > 0:
            return self.total_platform_cost / self.projects_completed
        return 0

    @property
    def revenue_per_project(self):
        """Calculate average revenue per project for this period"""
        if self.projects_completed > 0:
            return self.total_client_revenue / self.projects_completed
        return 0

    def mark_as_paid(self, payment_date=None, payment_method=None, payment_reference=None):
        """Mark billing record as paid"""
        from django.utils import timezone
        
        self.payment_status = 'Paid'
        self.paid_date = payment_date or timezone.now().date()
        
        if payment_method:
            self.payment_method = payment_method
        if payment_reference:
            self.payment_reference = payment_reference
            
        self.save()

    def calculate_platform_roi(self):
        """Calculate ROI on platform investment for this period"""
        if self.total_platform_cost > 0:
            return ((self.gross_profit / self.total_platform_cost) * 100)
        return 0

    @classmethod
    def generate_monthly_bills(cls, vendor_tenant, billing_month):
        """Generate billing records for all vendor's clients for a given month"""
        from django.db import transaction
        
        bills_created = []
        
        with transaction.atomic():
            # Get all active clients for the vendor
            active_clients = VendorCreatedClient.objects.filter(
                vendor_tenant=vendor_tenant,
                relationship_status='Active'
            )
            
            for client in active_clients:
                # Check if bill already exists for this month
                existing_bill = cls.objects.filter(
                    vendor_tenant=vendor_tenant,
                    vendor_created_client=client,
                    billing_month=billing_month
                ).first()
                
                if not existing_bill:
                    # Calculate platform costs based on client activity
                    platform_cost = client.calculate_monthly_platform_cost()
                    
                    # Create billing record
                    bill = cls.objects.create(
                        vendor_tenant=vendor_tenant,
                        vendor_created_client=client,
                        billing_month=billing_month,
                        billing_period_start=billing_month,
                        billing_period_end=billing_month.replace(day=28) + timedelta(days=4) - timedelta(days=billing_month.day),
                        base_client_management_fee=platform_cost * 0.6,  # 60% of cost is base fee
                        site_management_fee=client.total_sites * 500,    # ₹500 per site
                        project_transaction_fee=client.active_projects * 200,  # ₹200 per active project
                        data_storage_fee=1000,  # Fixed ₹1K for data storage
                        support_fee=500,        # Fixed ₹500 for support
                        sites_managed=client.total_sites,
                        projects_completed=0,   # To be updated when projects are completed
                    )
                    bills_created.append(bill)
        
        return bills_created


# =============================================================================
# DESIGNATION MANAGEMENT SYSTEM
# =============================================================================

class TenantDesignation(models.Model):
    """
    Tenant-scoped designation model with proper department relationship.
    Each tenant can define their own designations independently.
    """

    DATA_ACCESS_LEVEL_CHOICES = [
        ('View_Only', 'View Only'),
        ('Edit_Own', 'Edit Own Records'),
        ('Edit_Department', 'Edit Department Records'),
        ('Edit_All', 'Edit All Records'),
        ('Admin', 'Administrative Access'),
    ]

    DESIGNATION_TYPE_CHOICES = [
        ('field', 'Field'),
        ('non_field', 'Non-Field'),
    ]

    # Core Designation Fields
    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tenant_designations')

    # Required Fields
    designation_name = models.CharField(max_length=255, help_text="Role title - tenant defined")
    designation_code = models.CharField(max_length=100, help_text="Unique identifier within tenant")
    designation_level = models.IntegerField(default=10, help_text="Hierarchy level, 1=highest")
    
    # FIXED: Use Foreign Key instead of CharField for department
    department = models.ForeignKey(
        'TenantDepartment', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='designations',
        db_column='department',
        help_text="Department this designation belongs to"
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    # Designation Type and Certifications
    designation_type = models.CharField(
        max_length=20, 
        choices=DESIGNATION_TYPE_CHOICES, 
        default='non_field',
        help_text="Whether this is a field or non-field designation"
    )
    certifications_required = models.JSONField(
        default=dict,
        help_text="Required certifications for field positions: {farmtocli: true, fat: false, medical: true}"
    )

    # Tenant-Defined Hierarchy
    parent_designation = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='child_designations', help_text="Hierarchical parent"
    )
    can_manage_subordinates = models.BooleanField(default=False, help_text="Manage lower hierarchy")
    approval_authority_level = models.IntegerField(default=0, help_text="Approval limits - tenant defined")
    delegation_allowed = models.BooleanField(default=False, help_text="Can delegate permissions")
    max_subordinates = models.IntegerField(null=True, blank=True, help_text="Team size limits")
    hierarchy_path = models.TextField(blank=True, help_text="Materialized path for efficient queries")

    # Custom Permissions
    permissions = models.JSONField(default=list, help_text="Tenant-defined permissions")
    feature_access = models.JSONField(default=dict, help_text="Tenant-defined feature access")
    data_access_level = models.CharField(
        max_length=50, choices=DATA_ACCESS_LEVEL_CHOICES, default='View_Only'
    )
    custom_capabilities = models.JSONField(default=dict, help_text="Tenant-specific capabilities")

    # Geographic & Functional Scope
    geographic_scope = models.JSONField(default=list, help_text="Circles, regions - tenant defined")
    functional_scope = models.JSONField(default=list, help_text="Departments, functions - tenant defined")
    cross_functional_access = models.BooleanField(default=False, help_text="Can work across functions")
    multi_location_access = models.BooleanField(default=False, help_text="Can work across locations")

    # Business Rules
    can_manage_users = models.BooleanField(default=False, help_text="User management permission")
    can_create_projects = models.BooleanField(default=False, help_text="Project creation permission")
    can_assign_tasks = models.BooleanField(default=False, help_text="Task assignment permission")
    can_approve_expenses = models.BooleanField(default=False, help_text="Expense approval authority")
    can_access_reports = models.BooleanField(default=False, help_text="Reporting access level")
    expense_approval_limit = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00, help_text="Tenant-defined limits"
    )

    # System Fields
    is_system_role = models.BooleanField(default=False, help_text="True only for Super Admin")
    is_template = models.BooleanField(default=False, help_text="For tenant-created templates")

    # Audit Fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_designations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='updated_designations'
    )
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tenant_designations'
        verbose_name = _('Tenant Designation')
        verbose_name_plural = _('Tenant Designations')
        unique_together = [('tenant', 'designation_code')]
        ordering = ['designation_level', 'designation_name']
        indexes = [
            models.Index(fields=['tenant']),
            models.Index(fields=['tenant', 'designation_code']),
            models.Index(fields=['designation_level']),
            models.Index(fields=['parent_designation']),
            models.Index(fields=['is_active']),
            models.Index(fields=['is_system_role']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.designation_name}"

    def clean(self):
        """Validate designation data"""
        from django.core.exceptions import ValidationError
        
        if self.designation_level < 1:
            raise ValidationError("Designation level must be positive")
        
        if self.approval_authority_level < 0:
            raise ValidationError("Approval authority level cannot be negative")
        
        if self.expense_approval_limit < 0:
            raise ValidationError("Expense approval limit cannot be negative")
        
        if self.max_subordinates is not None and self.max_subordinates <= 0:
            raise ValidationError("Max subordinates must be positive")

    def save(self, *args, **kwargs):
        # Update hierarchy path
        if self.parent_designation:
            parent_path = self.parent_designation.hierarchy_path or str(self.parent_designation.id)
            self.hierarchy_path = f"{parent_path}/{self.id or 'new'}"
        else:
            self.hierarchy_path = str(self.id or 'new')
        
        super().save(*args, **kwargs)
        
        # Update hierarchy path after save if it was 'new'
        if 'new' in self.hierarchy_path:
            if self.parent_designation:
                parent_path = self.parent_designation.hierarchy_path or str(self.parent_designation.id)
                self.hierarchy_path = f"{parent_path}/{self.id}"
            else:
                self.hierarchy_path = str(self.id)
            TenantDesignation.objects.filter(id=self.id).update(hierarchy_path=self.hierarchy_path)


class PermissionCategory(models.Model):
    """Tenant-defined permission categories"""
    
    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='permission_categories')

    # Category Information
    category_name = models.CharField(max_length=100)
    category_code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    is_system_category = models.BooleanField(default=False, help_text="Core platform categories")

    # Category Configuration
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    # Audit Fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'permission_categories'
        verbose_name = _('Permission Category')
        verbose_name_plural = _('Permission Categories')
        unique_together = [('tenant', 'category_code')]
        ordering = ['sort_order', 'category_name']
        indexes = [
            models.Index(fields=['tenant']),
            models.Index(fields=['tenant', 'category_code']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.category_name}"


class CustomPermission(models.Model):
    """Tenant-defined permissions"""
    
    PERMISSION_TYPE_CHOICES = [
        ('action', 'Action'),
        ('access', 'Access'),
        ('approval', 'Approval'),
        ('management', 'Management'),
        ('reporting', 'Reporting'),
        ('custom', 'Custom'),
    ]

    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='custom_permissions')
    category = models.ForeignKey(PermissionCategory, on_delete=models.CASCADE, related_name='permissions')

    # Permission Information
    permission_name = models.CharField(max_length=100)
    permission_code = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Permission Configuration
    permission_type = models.CharField(max_length=50, choices=PERMISSION_TYPE_CHOICES, default='action')
    requires_approval = models.BooleanField(default=False)
    is_delegatable = models.BooleanField(default=True)
    scope_required = models.BooleanField(default=False, help_text="Requires geographic/functional scope")

    # Status
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    # Audit Fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'custom_permissions'
        verbose_name = _('Custom Permission')
        verbose_name_plural = _('Custom Permissions')
        unique_together = [('tenant', 'permission_code')]
        ordering = ['category', 'sort_order', 'permission_name']
        indexes = [
            models.Index(fields=['tenant']),
            models.Index(fields=['category']),
            models.Index(fields=['tenant', 'permission_code']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.permission_name}"


class DesignationPermission(models.Model):
    """Designation permission assignments (tenant-configured)"""
    
    PERMISSION_LEVEL_CHOICES = [
        ('granted', 'Granted'),
        ('denied', 'Denied'),
        ('conditional', 'Conditional'),
        ('approval_required', 'Approval Required'),
    ]

    id = models.BigAutoField(primary_key=True)
    designation = models.ForeignKey(
        TenantDesignation, on_delete=models.CASCADE, related_name='permission_assignments'
    )
    permission = models.ForeignKey(
        CustomPermission, on_delete=models.CASCADE, related_name='designation_assignments'
    )

    # Assignment Configuration
    permission_level = models.CharField(max_length=20, choices=PERMISSION_LEVEL_CHOICES, default='granted')
    scope_restriction = models.JSONField(default=dict, help_text="Geographic/functional restrictions")
    conditions = models.JSONField(default=dict, help_text="Conditional permissions")
    approval_required = models.BooleanField(default=False)

    # Time-based Permissions
    effective_from = models.DateField(auto_now_add=True)
    effective_to = models.DateField(null=True, blank=True)
    is_temporary = models.BooleanField(default=False)

    # Audit Fields
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='granted_legacy_designation_permissions'
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='revoked_legacy_designation_permissions'
    )
    revoked_at = models.DateTimeField(null=True, blank=True)

    # Status
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'designation_permissions'
        verbose_name = _('Designation Permission')
        verbose_name_plural = _('Designation Permissions')
        unique_together = [('designation', 'permission')]
        indexes = [
            models.Index(fields=['designation']),
            models.Index(fields=['permission']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.designation.designation_name} - {self.permission.permission_name}"


class UserDesignationAssignment(models.Model):
    """User designation assignments (updated for flexibility)"""
    
    ASSIGNMENT_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Active', 'Active'),
        ('Suspended', 'Suspended'),
        ('Expired', 'Expired'),
        ('Revoked', 'Revoked'),
    ]

    id = models.BigAutoField(primary_key=True)
    user_profile = models.ForeignKey(
        'TenantUserProfile', on_delete=models.CASCADE, related_name='designation_assignments'
    )
    designation = models.ForeignKey(
        TenantDesignation, on_delete=models.CASCADE, related_name='user_assignments'
    )

    # Assignment Details
    is_primary_designation = models.BooleanField(default=True)
    is_temporary = models.BooleanField(default=False)
    assignment_reason = models.CharField(max_length=255, blank=True)

    # Scope Overrides (Tenant-Defined)
    geographic_scope_override = models.JSONField(default=dict)
    functional_scope_override = models.JSONField(default=dict)
    permission_overrides = models.JSONField(default=dict, help_text="Additional or restricted permissions")

    # Time Period
    effective_from = models.DateField(auto_now_add=True)
    effective_to = models.DateField(null=True, blank=True)
    auto_expire = models.BooleanField(default=False)

    # Approval and Assignment
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_user_designations'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_user_designations'
    )
    approval_required = models.BooleanField(default=False)

    # Status
    assignment_status = models.CharField(max_length=50, choices=ASSIGNMENT_STATUS_CHOICES, default='Active')
    is_active = models.BooleanField(default=True)

    # Audit Fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_designation_assignments'
        verbose_name = _('User Designation Assignment')
        verbose_name_plural = _('User Designation Assignments')
        unique_together = [('user_profile', 'designation', 'effective_from')]
        indexes = [
            models.Index(fields=['user_profile']),
            models.Index(fields=['designation']),
            models.Index(fields=['is_active']),
            models.Index(fields=['is_primary_designation']),
        ]

    def __str__(self):
        return f"{self.user_profile.user.full_name} - {self.designation.designation_name}"


class DesignationTemplate(models.Model):
    """Tenant designation templates (tenant-created)"""
    
    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='designation_templates')

    # Template Information
    template_name = models.CharField(max_length=100)
    template_description = models.TextField(blank=True)
    industry_category = models.CharField(max_length=100, blank=True, help_text="e.g., Technology, Construction")

    # Template Configuration
    designation_data = models.JSONField(help_text="Complete designation configuration")
    permission_set = models.JSONField(help_text="Associated permissions")
    hierarchy_suggestions = models.JSONField(default=dict, help_text="Suggested hierarchy relationships")

    # Usage Tracking
    usage_count = models.IntegerField(default=0)
    is_public = models.BooleanField(default=False, help_text="Can be shared with other tenants")
    is_verified = models.BooleanField(default=False, help_text="Verified by platform")

    # Status
    is_active = models.BooleanField(default=True)

    # Audit Fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'designation_templates'
        verbose_name = _('Designation Template')
        verbose_name_plural = _('Designation Templates')
        unique_together = [('tenant', 'template_name')]
        indexes = [
            models.Index(fields=['tenant']),
            models.Index(fields=['industry_category']),
            models.Index(fields=['is_public']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.template_name}"


class SystemRole(models.Model):
    """Super Admin role (system-defined)"""
    
    id = models.BigAutoField(primary_key=True)

    # Role Information
    role_name = models.CharField(max_length=100, unique=True)
    role_code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    # Role Configuration
    system_permissions = models.JSONField(help_text="Platform-level permissions")
    is_tenant_scoped = models.BooleanField(default=True)
    can_access_all_tenants = models.BooleanField(default=False)

    # Status
    is_active = models.BooleanField(default=True)

    # Audit Fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'system_roles'
        verbose_name = _('System Role')
        verbose_name_plural = _('System Roles')

    def __str__(self):
        return self.role_name


# Legacy designation compatibility code removed - replaced with tenant designation system


# =============================================================================
# COMPREHENSIVE RBAC (ROLE-BASED ACCESS CONTROL) SYSTEM
# =============================================================================

class PermissionRegistry(models.Model):
    """Tenant-defined permission registry"""
    
    PERMISSION_TYPE_CHOICES = [
        ('action', 'Action'),
        ('access', 'Access'),
        ('data', 'Data'),
        ('administrative', 'Administrative'),
        ('system', 'System'),
    ]
    
    RISK_LEVEL_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    EFFECT_CHOICES = [
        ('allow', 'Allow'),
        ('deny', 'Deny'),
    ]
    
    BUSINESS_TEMPLATE_CHOICES = [
        ('view_only', 'View-Only Access'),
        ('contributor', 'Contributor/Editor'),
        ('creator_only', 'Creator Only'),
        ('full_access', 'Full Access/Administrator'),
        ('custom', 'Custom Permission'),
    ]
    
    # Using centralized resource type choices

    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='permission_registry')

    # Permission Information
    permission_name = models.CharField(max_length=100)
    permission_code = models.CharField(max_length=100)
    permission_category = models.CharField(max_length=50)
    description = models.TextField(blank=True)

    # Permission Configuration
    permission_type = models.CharField(max_length=50, choices=PERMISSION_TYPE_CHOICES, default='action')
    business_template = models.CharField(max_length=50, choices=BUSINESS_TEMPLATE_CHOICES, default='custom', 
                                       help_text="Business-friendly template used to create this permission")
    is_system_permission = models.BooleanField(default=False)
    requires_scope = models.BooleanField(default=False)
    is_delegatable = models.BooleanField(default=True)
    risk_level = models.CharField(max_length=20, choices=RISK_LEVEL_CHOICES, default='low')

    # Permission Metadata
    resource_type = models.CharField(
        max_length=50, 
        choices=RESOURCE_TYPE_CHOICES,
        blank=True, 
        help_text="Application feature/module this permission controls"
    )
    # action_type field removed - redundant with business_template and permission_type
    effect = models.CharField(max_length=20, choices=EFFECT_CHOICES, default='allow')

    # Status
    is_active = models.BooleanField(default=True)
    is_auditable = models.BooleanField(default=True)

    # Audit Fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_permissions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'permission_registry'
        verbose_name = _('Permission Registry')
        verbose_name_plural = _('Permission Registry')
        unique_together = [('tenant', 'permission_code')]
        ordering = ['permission_category', 'permission_name']
        indexes = [
            models.Index(fields=['tenant']),
            models.Index(fields=['tenant', 'permission_code']),
            models.Index(fields=['permission_category']),
            models.Index(fields=['permission_type']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.permission_name}"


class DesignationBasePermission(models.Model):
    """Base permissions assigned to designations"""
    
    PERMISSION_LEVEL_CHOICES = [
        ('granted', 'Granted'),
        ('denied', 'Denied'),
        ('conditional', 'Conditional'),
    ]

    id = models.BigAutoField(primary_key=True)
    designation = models.ForeignKey(
        TenantDesignation, on_delete=models.CASCADE, related_name='base_permissions'
    )
    permission = models.ForeignKey(
        PermissionRegistry, on_delete=models.CASCADE, related_name='designation_assignments'
    )

    # Permission Configuration
    permission_level = models.CharField(max_length=20, choices=PERMISSION_LEVEL_CHOICES, default='granted')
    scope_configuration = models.JSONField(default=dict, help_text="Permission scope settings")
    conditions = models.JSONField(default=dict, help_text="Conditional permission requirements")

    # Permission Scope
    geographic_scope = models.JSONField(default=list, help_text="Geographic limitations")
    functional_scope = models.JSONField(default=list, help_text="Functional limitations")
    temporal_scope = models.JSONField(default=dict, help_text="Time-based limitations")

    # Permission Metadata
    is_inherited = models.BooleanField(default=True, help_text="Whether users inherit this permission")
    is_mandatory = models.BooleanField(default=False, help_text="Cannot be removed by user overrides")
    priority_level = models.IntegerField(default=0, help_text="For conflict resolution")

    # Audit Fields
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='granted_designation_base_permissions'
    )
    granted_at = models.DateTimeField(auto_now_add=True)

    # Status
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'designation_base_permissions'
        verbose_name = _('Designation Base Permission')
        verbose_name_plural = _('Designation Base Permissions')
        unique_together = [('designation', 'permission')]
        indexes = [
            models.Index(fields=['designation']),
            models.Index(fields=['permission']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.designation.designation_name} - {self.permission.permission_name}"


class UserPermissionOverride(models.Model):
    """User-specific permission overrides (additions/restrictions)"""
    
    OVERRIDE_TYPE_CHOICES = [
        ('addition', 'Addition'),
        ('restriction', 'Restriction'),
        ('modification', 'Modification'),
        ('scope_change', 'Scope Change'),
    ]
    
    PERMISSION_LEVEL_CHOICES = [
        ('granted', 'Granted'),
        ('denied', 'Denied'),
        ('conditional', 'Conditional'),
    ]
    
    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]

    id = models.BigAutoField(primary_key=True)
    user_profile = models.ForeignKey(
        'TenantUserProfile', on_delete=models.CASCADE, related_name='permission_overrides'
    )
    permission = models.ForeignKey(
        PermissionRegistry, on_delete=models.CASCADE, related_name='user_overrides'
    )

    # Override Configuration
    override_type = models.CharField(max_length=20, choices=OVERRIDE_TYPE_CHOICES)
    permission_level = models.CharField(max_length=20, choices=PERMISSION_LEVEL_CHOICES, default='granted')
    override_reason = models.CharField(max_length=255, blank=True)
    business_justification = models.TextField(blank=True)

    # Scope Configuration
    scope_override = models.JSONField(default=dict)
    geographic_scope_override = models.JSONField(default=list)
    functional_scope_override = models.JSONField(default=list)
    temporal_scope_override = models.JSONField(default=dict)

    # Override Conditions
    conditions = models.JSONField(default=dict)
    approval_required = models.BooleanField(default=False)
    requires_mfa = models.BooleanField(default=False)

    # Time Constraints
    effective_from = models.DateTimeField(default=timezone.now)
    effective_to = models.DateTimeField(null=True, blank=True)
    is_temporary = models.BooleanField(default=False)
    auto_expire = models.BooleanField(default=False)

    # Approval Workflow
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='approved')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_permission_overrides'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    # Audit Fields
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='granted_permission_overrides'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Status
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'user_permission_overrides'
        verbose_name = _('User Permission Override')
        verbose_name_plural = _('User Permission Overrides')
        unique_together = [('user_profile', 'permission', 'override_type')]
        indexes = [
            models.Index(fields=['user_profile']),
            models.Index(fields=['permission']),
            models.Index(fields=['override_type']),
            models.Index(fields=['is_active']),
            models.Index(fields=['effective_from', 'effective_to']),
        ]

    def __str__(self):
        return f"{self.user_profile.user.get_full_name()} - {self.permission.permission_name} ({self.override_type})"


class PermissionGroup(models.Model):
    """Permission groups for easier management"""
    
    GROUP_TYPE_CHOICES = [
        ('functional', 'Functional'),
        ('project', 'Project'),
        ('temporary', 'Temporary'),
        ('administrative', 'Administrative'),
    ]

    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='permission_groups')

    # Group Information
    group_name = models.CharField(max_length=100)
    group_code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    group_type = models.CharField(max_length=50, choices=GROUP_TYPE_CHOICES, default='functional')

    # Group Configuration
    is_system_group = models.BooleanField(default=False)
    is_assignable = models.BooleanField(default=True)
    auto_assign_conditions = models.JSONField(default=dict)

    # Status
    is_active = models.BooleanField(default=True)

    # Audit Fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'permission_groups'
        verbose_name = _('Permission Group')
        verbose_name_plural = _('Permission Groups')
        unique_together = [('tenant', 'group_code')]
        indexes = [
            models.Index(fields=['tenant']),
            models.Index(fields=['tenant', 'group_code']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.group_name}"


class PermissionGroupPermission(models.Model):
    """Permissions assigned to permission groups"""
    
    PERMISSION_LEVEL_CHOICES = [
        ('granted', 'Granted'),
        ('denied', 'Denied'),
        ('conditional', 'Conditional'),
    ]

    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(PermissionGroup, on_delete=models.CASCADE, related_name='group_permissions')
    permission = models.ForeignKey(PermissionRegistry, on_delete=models.CASCADE, related_name='group_assignments')

    # Permission Configuration in Group
    permission_level = models.CharField(max_length=20, choices=PERMISSION_LEVEL_CHOICES, default='granted')
    scope_configuration = models.JSONField(default=dict)
    is_mandatory = models.BooleanField(default=False)

    # Audit Fields
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    added_at = models.DateTimeField(auto_now_add=True)

    # Status
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'permission_group_permissions'
        verbose_name = _('Permission Group Permission')
        verbose_name_plural = _('Permission Group Permissions')
        unique_together = [('group', 'permission')]

    def __str__(self):
        return f"{self.group.group_name} - {self.permission.permission_name}"


class UserPermissionGroupAssignment(models.Model):
    """User assignments to permission groups"""

    id = models.BigAutoField(primary_key=True)
    user_profile = models.ForeignKey(
        'TenantUserProfile', on_delete=models.CASCADE, related_name='permission_group_assignments'
    )
    group = models.ForeignKey(PermissionGroup, on_delete=models.CASCADE, related_name='user_assignments')

    # Assignment Configuration
    assignment_reason = models.CharField(max_length=255, blank=True)
    scope_override = models.JSONField(default=dict)

    # Time Constraints
    effective_from = models.DateTimeField(default=timezone.now)
    effective_to = models.DateTimeField(null=True, blank=True)
    is_temporary = models.BooleanField(default=False)

    # Approval
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_group_assignments'
    )

    # Status
    is_active = models.BooleanField(default=True)

    # Audit Fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_permission_group_assignments'
        verbose_name = _('User Permission Group Assignment')
        verbose_name_plural = _('User Permission Group Assignments')
        unique_together = [('user_profile', 'group')]

    def __str__(self):
        return f"{self.user_profile.user.full_name} - {self.group.group_name}"


class PermissionAuditTrail(models.Model):
    """Audit trail for permission changes"""
    
    ACTION_TYPE_CHOICES = [
        ('grant', 'Grant'),
        ('revoke', 'Revoke'),
        ('modify', 'Modify'),
        ('restrict', 'Restrict'),
        ('escalate', 'Escalate'),
        ('expire', 'Expire'),
    ]
    
    ENTITY_TYPE_CHOICES = [
        ('user', 'User'),
        ('designation', 'Designation'),
        ('group', 'Group'),
        ('system', 'System'),
    ]

    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='permission_audit_trail')

    # Audit Information
    action_type = models.CharField(max_length=50, choices=ACTION_TYPE_CHOICES)
    entity_type = models.CharField(max_length=50, choices=ENTITY_TYPE_CHOICES)
    entity_id = models.BigIntegerField()
    permission = models.ForeignKey(
        PermissionRegistry, on_delete=models.SET_NULL, null=True, blank=True
    )

    # Change Details
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    change_reason = models.CharField(max_length=255, blank=True)
    business_context = models.TextField(blank=True)

    # Actor Information
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    performed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Additional Context
    session_id = models.CharField(max_length=255, blank=True)
    request_id = models.CharField(max_length=255, blank=True)
    additional_context = models.JSONField(default=dict)

    class Meta:
        db_table = 'permission_audit_trail'
        verbose_name = _('Permission Audit Trail')
        verbose_name_plural = _('Permission Audit Trail')
        ordering = ['-performed_at']
        indexes = [
            models.Index(fields=['tenant']),
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['performed_by']),
            models.Index(fields=['performed_at']),
        ]

    def __str__(self):
        return f"{self.action_type} - {self.entity_type}({self.entity_id}) by {self.performed_by.full_name}"


class UserEffectivePermissionsCache(models.Model):
    """Cache for calculated effective permissions (performance optimization)"""

    id = models.BigAutoField(primary_key=True)
    user_profile = models.OneToOneField(
        'TenantUserProfile', on_delete=models.CASCADE, related_name='permission_cache'
    )

    # Cached Permission Data
    effective_permissions = models.JSONField()
    permission_summary = models.JSONField(default=dict)
    scope_limitations = models.JSONField(default=dict)

    # Cache Metadata
    cache_version = models.IntegerField(default=1)
    calculated_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # Cache Dependencies
    designation_version = models.IntegerField(null=True, blank=True)
    override_version = models.IntegerField(null=True, blank=True)

    # Status
    is_valid = models.BooleanField(default=True)

    class Meta:
        db_table = 'user_effective_permissions_cache'
        verbose_name = _('User Effective Permissions Cache')
        verbose_name_plural = _('User Effective Permissions Cache')
        indexes = [
            models.Index(fields=['user_profile']),
            models.Index(fields=['is_valid']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"Cache for {self.user_profile.user.full_name}"


# ============================================================================
# Designation Management Models
# ============================================================================

class DesignationQuerySet(models.QuerySet):
    """Custom QuerySet for Designation model"""
    
    def active(self):
        """Filter active designations"""
        return self.filter(is_active=True, deleted_at__isnull=True)
    
    def for_tenant(self, tenant_id):
        """Filter designations for specific tenant"""
        return self.filter(tenant_id=tenant_id)
    
    def system_roles(self):
        """Filter system roles only"""
        return self.filter(is_system_role=True)
    
    def custom_roles(self):
        """Filter custom tenant-created roles"""
        return self.filter(is_system_role=False)
    
    def by_level(self, level):
        """Filter by designation level"""
        return self.filter(designation_level=level)
    
    def managers(self):
        """Filter designations that can manage subordinates"""
        return self.filter(can_manage_subordinates=True)





class PermissionCategory(models.Model):
    """
    Tenant-defined permission categories for organizing custom permissions
    """
    
    tenant = models.ForeignKey(
        'Tenant',
        on_delete=models.CASCADE,
        related_name='permission_categories',
        help_text="Tenant that owns this permission category"
    )
    category_name = models.CharField(
        max_length=100,
        help_text="Human-readable category name"
    )
    category_code = models.CharField(
        max_length=50,
        help_text="Unique code for this category within the tenant"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Detailed description of this permission category"
    )
    is_system_category = models.BooleanField(
        default=False,
        help_text="True for core platform categories"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this category is currently active"
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Display order for this category"
    )
    
    # Audit Fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_permission_categories'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'permission_categories'
        ordering = ['tenant_id', 'sort_order', 'category_name']
        unique_together = [['tenant', 'category_code']]
        verbose_name = 'Permission Category'
        verbose_name_plural = 'Permission Categories'
        indexes = [
            models.Index(fields=['tenant', 'category_code']),
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['is_system_category']),
        ]
    
    def __str__(self):
        return f"{self.tenant.organization_name} - {self.category_name}"


class CustomPermission(models.Model):
    """
    Tenant-defined custom permissions for their specific business needs
    """
    
    PERMISSION_TYPE_CHOICES = [
        ('action', 'Action'),
        ('access', 'Access'),
        ('approval', 'Approval'),
        ('management', 'Management'),
        ('reporting', 'Reporting'),
        ('custom', 'Custom')
    ]
    
    tenant = models.ForeignKey(
        'Tenant',
        on_delete=models.CASCADE,
        related_name='custom_permissions',
        help_text="Tenant that owns this permission"
    )
    category = models.ForeignKey(
        PermissionCategory,
        on_delete=models.CASCADE,
        related_name='permissions',
        help_text="Category this permission belongs to"
    )
    permission_name = models.CharField(
        max_length=100,
        help_text="Human-readable permission name"
    )
    permission_code = models.CharField(
        max_length=100,
        help_text="Unique code for this permission within the tenant"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Detailed description of what this permission allows"
    )
    permission_type = models.CharField(
        max_length=50,
        choices=PERMISSION_TYPE_CHOICES,
        default='action',
        help_text="Type of permission"
    )
    requires_approval = models.BooleanField(
        default=False,
        help_text="Whether using this permission requires approval"
    )
    is_delegatable = models.BooleanField(
        default=True,
        help_text="Whether this permission can be delegated to others"
    )
    scope_required = models.BooleanField(
        default=False,
        help_text="Whether this permission requires geographic/functional scope"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this permission is currently active"
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Display order within category"
    )
    
    # Audit Fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_custom_permissions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'custom_permissions'
        ordering = ['tenant_id', 'category__sort_order', 'sort_order', 'permission_name']
        unique_together = [['tenant', 'permission_code']]
        indexes = [
            models.Index(fields=['tenant', 'permission_code']),
            models.Index(fields=['tenant', 'category']),
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['permission_type']),
        ]
    
    def __str__(self):
        return f"{self.tenant.organization_name} - {self.permission_name}"


class DesignationPermission(models.Model):
    """
    Assignment of permissions to designations with conditions and scope
    """
    
    PERMISSION_LEVEL_CHOICES = [
        ('granted', 'Granted'),
        ('denied', 'Denied'),
        ('conditional', 'Conditional'),
        ('approval_required', 'Approval Required')
    ]
    
    designation = models.ForeignKey(
        TenantDesignation,
        on_delete=models.CASCADE,
        related_name='permission_assignments',
        help_text="Designation receiving the permission"
    )
    permission = models.ForeignKey(
        CustomPermission,
        on_delete=models.CASCADE,
        related_name='designation_assignments',
        help_text="Permission being assigned"
    )
    permission_level = models.CharField(
        max_length=20,
        choices=PERMISSION_LEVEL_CHOICES,
        default='granted',
        help_text="Level of permission assignment"
    )
    scope_restriction = models.JSONField(
        default=dict,
        blank=True,
        help_text="Geographic/functional scope restrictions"
    )
    conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Conditional requirements for this permission"
    )
    approval_required = models.BooleanField(
        default=False,
        help_text="Whether this permission assignment requires approval"
    )
    
    # Time-based Permissions
    effective_from = models.DateField(
        default=date.today,
        help_text="Date when this permission becomes effective"
    )
    effective_to = models.DateField(
        null=True,
        blank=True,
        help_text="Date when this permission expires (null = permanent)"
    )
    is_temporary = models.BooleanField(
        default=False,
        help_text="Whether this is a temporary permission assignment"
    )
    
    # Audit Fields
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='granted_designation_permissions_new',
        help_text="User who granted this permission"
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revoked_designation_permissions_new',
        help_text="User who revoked this permission"
    )
    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this permission was revoked"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this permission assignment is currently active"
    )
    
    class Meta:
        db_table = 'designation_permissions'
        ordering = ['designation', 'permission']
        unique_together = [['designation', 'permission']]
        indexes = [
            models.Index(fields=['designation', 'is_active']),
            models.Index(fields=['permission', 'is_active']),
            models.Index(fields=['effective_from', 'effective_to']),
            models.Index(fields=['granted_at']),
        ]
    
    def __str__(self):
        return f"{self.designation} - {self.permission.permission_name}"
    
    def is_currently_effective(self):
        """Check if this permission is currently effective"""
        if not self.is_active:
            return False
        
        today = date.today()
        if self.effective_from > today:
            return False
        
        if self.effective_to and self.effective_to < today:
            return False
        
        return True


class UserDesignationAssignment(models.Model):
    """
    Assignment of users to designations with scope overrides and conditions
    """
    
    ASSIGNMENT_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Active', 'Active'),
        ('Suspended', 'Suspended'),
        ('Expired', 'Expired'),
        ('Revoked', 'Revoked')
    ]
    
    user_profile = models.ForeignKey(
        'TenantUserProfile',
        on_delete=models.CASCADE,
        related_name='designation_assignments',
        help_text="User being assigned the designation"
    )
    designation = models.ForeignKey(
        TenantDesignation,
        on_delete=models.CASCADE,
        related_name='user_assignments',
        help_text="Designation being assigned to the user"
    )
    is_primary_designation = models.BooleanField(
        default=True,
        help_text="Whether this is the user's primary designation"
    )
    is_temporary = models.BooleanField(
        default=False,
        help_text="Whether this is a temporary assignment"
    )
    assignment_reason = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Reason for this designation assignment"
    )
    
    # Scope Overrides
    geographic_scope_override = models.JSONField(
        default=dict,
        blank=True,
        help_text="Override for geographic scope restrictions"
    )
    functional_scope_override = models.JSONField(
        default=dict,
        blank=True,
        help_text="Override for functional scope restrictions"
    )
    permission_overrides = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional or restricted permissions for this user"
    )
    
    # Time Period
    effective_from = models.DateField(
        default=date.today,
        help_text="Date when this assignment becomes effective"
    )
    effective_to = models.DateField(
        null=True,
        blank=True,
        help_text="Date when this assignment expires (null = permanent)"
    )
    auto_expire = models.BooleanField(
        default=False,
        help_text="Whether this assignment should auto-expire"
    )
    
    # Approval and Assignment
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_designations',
        help_text="User who made this assignment"
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_designation_assignments',
        help_text="User who approved this assignment"
    )
    approval_required = models.BooleanField(
        default=False,
        help_text="Whether this assignment requires approval"
    )
    
    # Status
    assignment_status = models.CharField(
        max_length=50,
        choices=ASSIGNMENT_STATUS_CHOICES,
        default='Active',
        help_text="Current status of this assignment"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this assignment is currently active"
    )
    
    # Audit Fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_designation_assignments'
        ordering = ['user_profile', 'designation']
        unique_together = [['user_profile', 'designation', 'effective_from']]
        indexes = [
            models.Index(fields=['user_profile', 'is_active']),
            models.Index(fields=['designation', 'is_active']),
            models.Index(fields=['user_profile', 'is_primary_designation']),
            models.Index(fields=['effective_from', 'effective_to']),
            models.Index(fields=['assignment_status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.user_profile} - {self.designation.designation_name}"
    
    def is_currently_effective(self):
        """Check if this assignment is currently effective"""
        if not self.is_active or self.assignment_status != 'Active':
            return False
        
        today = date.today()
        if self.effective_from > today:
            return False
        
        if self.effective_to and self.effective_to < today:
            return False
        
        return True


class DesignationTemplate(models.Model):
    """
    Templates for creating designations, can be tenant-specific or public
    """
    
    tenant = models.ForeignKey(
        'Tenant',
        on_delete=models.CASCADE,
        related_name='designation_templates',
        help_text="Tenant that owns this template"
    )
    template_name = models.CharField(
        max_length=100,
        help_text="Name of this designation template"
    )
    template_description = models.TextField(
        blank=True,
        null=True,
        help_text="Description of this template"
    )
    industry_category = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Industry category this template is designed for"
    )
    designation_data = models.JSONField(
        help_text="Complete designation configuration data"
    )
    permission_set = models.JSONField(
        help_text="Associated permissions for this designation template"
    )
    hierarchy_suggestions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Suggested hierarchy relationships"
    )
    
    # Usage Tracking
    usage_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times this template has been used"
    )
    is_public = models.BooleanField(
        default=False,
        help_text="Whether this template can be shared with other tenants"
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether this template has been verified by the platform"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this template is currently active"
    )
    
    # Audit Fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_designation_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'designation_templates'
        ordering = ['tenant_id', 'template_name']
        unique_together = [['tenant', 'template_name']]
        indexes = [
            models.Index(fields=['tenant', 'template_name']),
            models.Index(fields=['industry_category']),
            models.Index(fields=['is_public', 'is_verified']),
            models.Index(fields=['usage_count']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.tenant.organization_name} - {self.template_name}"


class TenantDepartment(models.Model):
    """
    Tenant-scoped department model for organizational structure.
    Each tenant can define their own departments independently.
    """
    
    # Core Department Fields
    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tenant_departments')

    # Required Fields
    department_name = models.CharField(max_length=255, help_text="Department name - tenant defined")
    department_code = models.CharField(max_length=100, help_text="Unique identifier within tenant")
    department_level = models.IntegerField(default=1, help_text="Hierarchy level, 1=highest")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    # Department Configuration
    is_operational = models.BooleanField(
        default=True, 
        help_text="Whether this department handles field operations"
    )
    requires_safety_training = models.BooleanField(
        default=False,
        help_text="Whether employees in this department need safety training"
    )
    
    # Hierarchy Support
    parent_department = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='child_departments', help_text="Hierarchical parent"
    )
    can_manage_subordinates = models.BooleanField(default=False, help_text="Manage lower hierarchy")
    max_subordinates = models.IntegerField(null=True, blank=True, help_text="Team size limits")
    hierarchy_path = models.TextField(blank=True, help_text="Materialized path for efficient queries")

    # Business Rules
    can_manage_users = models.BooleanField(default=False, help_text="User management permission")
    can_create_projects = models.BooleanField(default=False, help_text="Project creation permission")
    can_assign_tasks = models.BooleanField(default=False, help_text="Task assignment permission")
    can_approve_expenses = models.BooleanField(default=False, help_text="Expense approval authority")
    can_access_reports = models.BooleanField(default=False, help_text="Reporting access level")
    expense_approval_limit = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00, help_text="Tenant-defined limits"
    )

    # System Fields
    is_system_department = models.BooleanField(default=False, help_text="True only for system departments")
    is_template = models.BooleanField(default=False, help_text="For tenant-created templates")

    # Audit Fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_tenant_departments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='updated_tenant_departments'
    )
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tenant_departments'
        verbose_name = _('Tenant Department')
        verbose_name_plural = _('Tenant Departments')
        unique_together = [('tenant', 'department_code')]
        ordering = ['department_level', 'department_name']
        indexes = [
            models.Index(fields=['tenant']),
            models.Index(fields=['tenant', 'department_code']),
            models.Index(fields=['department_level']),
            models.Index(fields=['parent_department']),
            models.Index(fields=['is_active']),
            models.Index(fields=['is_system_department']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.department_name}"

    def clean(self):
        """Validate department data"""
        from django.core.exceptions import ValidationError
        
        if self.parent_department and self.parent_department.tenant != self.tenant:
            raise ValidationError("Parent department must belong to the same tenant")
        
        if self.department_level < 1:
            raise ValidationError("Department level must be at least 1")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        """Get full department name including parent"""
        if self.parent_department:
            return f"{self.parent_department.department_name} > {self.department_name}"
        return self.department_name

    def get_child_departments(self):
        """Get all child departments"""
        return TenantDepartment.objects.filter(
            parent_department=self,
            is_active=True
        ).order_by('department_level', 'department_name')

    def get_all_subordinates(self):
        """Get all subordinate departments recursively"""
        subordinates = []
        children = self.get_child_departments()
        for child in children:
            subordinates.append(child)
            subordinates.extend(child.get_all_subordinates())
        return subordinates





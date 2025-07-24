from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Site(models.Model):
    """Site model for telecom infrastructure locations"""
    SITE_TYPE = (
        ('tower', 'Tower'),
        ('data_center', 'Data Center'),
        ('exchange', 'Exchange'),
        ('substation', 'Substation'),
        ('office', 'Office'),
        ('warehouse', 'Warehouse'),
        ('other', 'Other'),
    )

    SITE_STATUS = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('maintenance', 'Under Maintenance'),
        ('decommissioned', 'Decommissioned'),
    )

    # Core relationships - Multi-tenant isolation
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='sites')
    
    # Required Site Master Data Fields (as per specification)
    site_id = models.CharField(max_length=100, help_text="Business identifier, unique within tenant")
    global_id = models.CharField(max_length=100, help_text="Globally unique identifier within tenant")
    site_name = models.CharField(max_length=255, help_text="Human-readable site name")
    town = models.CharField(max_length=100, help_text="City/town location")
    cluster = models.CharField(max_length=100, help_text="Operational grouping/region")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, help_text="Geographic coordinate")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, help_text="Geographic coordinate")
    
    # Optional Location Fields
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='India')
    district = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    elevation = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Elevation in meters")
    
    # Optional Site Details
    site_type = models.CharField(max_length=20, choices=SITE_TYPE, default='tower')
    status = models.CharField(max_length=20, choices=SITE_STATUS, default='active')
    access_instructions = models.TextField(blank=True, help_text="Instructions for accessing the site")
    safety_requirements = models.TextField(blank=True, help_text="Safety requirements and precautions")
    contact_person = models.CharField(max_length=255, blank=True, help_text="On-site contact person")
    contact_phone = models.CharField(max_length=20, blank=True, help_text="Contact phone number")
    landmark_description = models.TextField(blank=True, help_text="Nearby landmarks for navigation")
    
    # Legacy fields (for backward compatibility)
    name = models.CharField(max_length=255, blank=True)  # Deprecated: use site_name instead
    address = models.TextField(blank=True)  # Deprecated: derived from other fields
    city = models.CharField(max_length=100, blank=True)  # Deprecated: use town instead
    description = models.TextField(blank=True)  # Deprecated: use landmark_description instead
    site_code = models.CharField(max_length=50, blank=True)  # Auto-generated from site_id
    contact_email = models.EmailField(blank=True)  # Optional additional contact
    
    # Contact information
    contact_person = models.CharField(max_length=255, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(blank=True)
    
    # Soft delete support
    deleted_at = models.DateTimeField(null=True, blank=True, help_text="Soft delete timestamp")
    
    # Audit fields
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='created_sites'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sites'
        verbose_name = _('Site')
        verbose_name_plural = _('Sites')
        ordering = ['site_name']
        
        # Unique constraints per tenant (master data principles)
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'site_id'], 
                condition=models.Q(deleted_at__isnull=True),
                name='unique_site_id_per_tenant'
            ),
            models.UniqueConstraint(
                fields=['tenant', 'global_id'], 
                condition=models.Q(deleted_at__isnull=True),
                name='unique_global_id_per_tenant'
            ),
        ]
        
        indexes = [
            models.Index(fields=['tenant', 'status', 'deleted_at']),
            models.Index(fields=['site_type', 'status']),
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['town', 'state']),
            models.Index(fields=['cluster']),
            models.Index(fields=['site_id']),
            models.Index(fields=['global_id']),
            models.Index(fields=['deleted_at']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.site_name}"

    @property
    def full_address(self):
        """Generate full address from location components"""
        address_parts = []
        
        if self.town:
            address_parts.append(self.town)
        if self.district:
            address_parts.append(self.district)
        if self.state:
            address_parts.append(self.state)
        if self.postal_code:
            address_parts.append(self.postal_code)
        if self.country:
            address_parts.append(self.country)
        
        return ", ".join(address_parts) if address_parts else "Address not available"

    def clean(self):
        """Validate site data"""
        from django.core.exceptions import ValidationError
        
        if self.latitude is not None and not (-90 <= self.latitude <= 90):
            raise ValidationError("Latitude must be between -90 and 90 degrees")
        
        if self.longitude is not None and not (-180 <= self.longitude <= 180):
            raise ValidationError("Longitude must be between -180 and 180 degrees") 
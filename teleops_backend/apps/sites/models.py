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
    town = models.CharField(max_length=100, help_text="Town/city location")
    cluster = models.CharField(max_length=100, help_text="Zone/operational cluster")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, help_text="Geographic coordinate")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, help_text="Geographic coordinate")
    
    # Optional Site Fields
    address = models.TextField(blank=True, help_text="Site address")
    site_type = models.CharField(max_length=20, choices=SITE_TYPE, default='tower', help_text="Type of site")
    contact_person = models.CharField(max_length=255, blank=True, help_text="On-site contact person")
    contact_phone = models.CharField(max_length=20, blank=True, help_text="Contact phone number")
    
    # System fields
    status = models.CharField(max_length=20, choices=SITE_STATUS, default='active')
    
    # Legacy fields (keep for backward compatibility with existing database)
    name = models.CharField(max_length=255, blank=True, help_text="Legacy: use site_name instead")
    city = models.CharField(max_length=100, blank=True, help_text="Legacy: use town instead")
    site_code = models.CharField(max_length=50, blank=True, help_text="Legacy site code")
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default='India')
    postal_code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
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
            models.Index(fields=['town', 'cluster']),
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
        
        if self.address:
            address_parts.append(self.address)
        if self.town:
            address_parts.append(self.town)
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
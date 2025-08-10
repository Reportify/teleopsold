from django.db import models
from django.utils.translation import gettext_lazy as _


class Equipment(models.Model):
    """Equipment model for telecom infrastructure equipment"""
    EQUIPMENT_TYPE = (
        ('antenna', 'Antenna'),
        ('transmitter', 'Transmitter'),
        ('receiver', 'Receiver'),
        ('amplifier', 'Amplifier'),
        ('filter', 'Filter'),
        ('power_supply', 'Power Supply'),
        ('battery', 'Battery'),
        ('cable', 'Cable'),
        ('connector', 'Connector'),
        ('other', 'Other'),
    )

    EQUIPMENT_STATUS = (
        ('operational', 'Operational'),
        ('maintenance', 'Under Maintenance'),
        ('faulty', 'Faulty'),
        ('decommissioned', 'Decommissioned'),
        ('spare', 'Spare'),
    )

    # Core relationships - FIXED REFERENCES
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='equipment')
    site = models.ForeignKey('sites.Site', on_delete=models.CASCADE, related_name='equipment')
    
    # Equipment details
    name = models.CharField(max_length=255)
    equipment_type = models.CharField(max_length=20, choices=EQUIPMENT_TYPE)
    status = models.CharField(max_length=20, choices=EQUIPMENT_STATUS, default='operational')
    
    # Equipment information
    model = models.CharField(max_length=255, blank=True)
    serial_number = models.CharField(max_length=255, blank=True)
    manufacturer = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    
    # Specifications
    specifications = models.JSONField(default=dict, blank=True)
    
    # Installation details
    installation_date = models.DateField(null=True, blank=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    last_maintenance = models.DateField(null=True, blank=True)
    next_maintenance = models.DateField(null=True, blank=True)
    
    # Location within site
    location_details = models.CharField(max_length=255, blank=True)
    
    # Audit fields - FIXED REFERENCE
    created_by = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.CASCADE, 
        related_name='created_equipment'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # This table represents equipment installed at sites.
        # Managed externally (pre-existing); Django should not create/alter it.
        managed = False
        db_table = 'site_equipments'
        verbose_name = _('Equipment')
        verbose_name_plural = _('Equipment')
        ordering = ['name']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['site', 'equipment_type']),
            models.Index(fields=['serial_number']),
            models.Index(fields=['equipment_type', 'status']),
        ]

    def __str__(self):
        return f"{self.site.name} - {self.name}"

    def clean(self):
        """Validate equipment data"""
        from django.core.exceptions import ValidationError
        
        if self.warranty_expiry and self.installation_date:
            if self.warranty_expiry < self.installation_date:
                raise ValidationError("Warranty expiry cannot be before installation date")


class EquipmentMaintenance(models.Model):
    """Maintenance records for equipment"""
    MAINTENANCE_TYPE = (
        ('preventive', 'Preventive'),
        ('corrective', 'Corrective'),
        ('emergency', 'Emergency'),
        ('upgrade', 'Upgrade'),
    )

    MAINTENANCE_STATUS = (
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    equipment = models.ForeignKey(
        Equipment, 
        on_delete=models.CASCADE, 
        related_name='maintenance_records'
    )
    maintenance_type = models.CharField(max_length=20, choices=MAINTENANCE_TYPE)
    status = models.CharField(max_length=20, choices=MAINTENANCE_STATUS, default='scheduled')
    
    # Maintenance details
    description = models.TextField()
    scheduled_date = models.DateField()
    completed_date = models.DateField(null=True, blank=True)
    
    # Personnel - FIXED REFERENCE
    assigned_technician = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_maintenance'
    )
    
    # Cost and notes
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    
    # Audit fields - FIXED REFERENCE
    created_by = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.CASCADE, 
        related_name='created_maintenance'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Historical data for maintenance; table already exists.
        managed = False
        db_table = 'equipment_maintenance'
        verbose_name = _('Equipment Maintenance')
        verbose_name_plural = _('Equipment Maintenance')
        ordering = ['-scheduled_date']
        indexes = [
            models.Index(fields=['equipment', 'status']),
            models.Index(fields=['maintenance_type', 'status']),
            models.Index(fields=['scheduled_date']),
            models.Index(fields=['assigned_technician', 'status']),
        ]

    def __str__(self):
        return f"{self.equipment.name} - {self.get_maintenance_type_display()} on {self.scheduled_date}"

    def clean(self):
        """Validate maintenance data"""
        from django.core.exceptions import ValidationError
        
        if self.completed_date and self.scheduled_date:
            if self.completed_date < self.scheduled_date:
                raise ValidationError("Completed date cannot be before scheduled date") 


# ============================================================================
# Equipment Inventory (Tenant-scoped master list with optional taxonomy)
# ============================================================================


class TechnologyTag(models.Model):
    """Tenant-scoped technology tag (e.g., 2G, 3G, 4G, 5G, MW).

    Kept intentionally lightweight and flexible. Names are unique per tenant.
    """

    id = models.BigAutoField(primary_key=True)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='technology_tags')

    # Tag information
    name = models.CharField(max_length=50)
    description = models.CharField(max_length=255, blank=True)

    # Status and audit
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey('apps_users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_technology_tags')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'technology_tags'
        verbose_name = _('Technology Tag')
        verbose_name_plural = _('Technology Tags')
        unique_together = [('tenant', 'name')]
        ordering = ['name']
        indexes = [
            models.Index(fields=['tenant', 'name']),
            models.Index(fields=['tenant', 'is_active']),
        ]

    def __str__(self) -> str:
        return f"{self.tenant.organization_name} - {self.name}"


class EquipmentInventoryItem(models.Model):
    """Tenant master inventory record for an equipment item.

    All fields such as material_code, category, sub_category, manufacturer are optional.
    Technology is modeled as tags (many-to-many to TechnologyTag) so a single item
    can be associated with multiple technologies.
    """

    UNIT_CHOICES = (
        ('Unit', 'Unit'),
        ('Meter', 'Meter'),
        ('Kilogram', 'Kilogram'),
        ('Liter', 'Liter'),
        ('Square Meter', 'Square Meter'),
    )

    id = models.BigAutoField(primary_key=True)

    # Tenant scope and audit
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='equipment_inventory_items')
    created_by = models.ForeignKey('apps_users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_equipment_inventory_items')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Core identity
    name = models.CharField(max_length=255, help_text="Primary item name or material description")
    description = models.TextField(blank=True)

    # Optional classification & references
    material_code = models.CharField(max_length=100, blank=True)
    category = models.CharField(max_length=100, blank=True)
    sub_category = models.CharField(max_length=100, blank=True)
    manufacturer = models.CharField(max_length=255, blank=True)

    # UOM: default Unit; an item may override category defaults if any
    unit_of_measurement = models.CharField(max_length=20, choices=UNIT_CHOICES, default='Unit')

    # Additional details
    specifications = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    # Technology tags (many-to-many)
    technologies = models.ManyToManyField(TechnologyTag, blank=True, related_name='equipment_items')

    class Meta:
        db_table = 'equipment_inventory'
        verbose_name = _('Equipment Inventory Item')
        verbose_name_plural = _('Equipment Inventory Items')
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['tenant', 'material_code'],
                condition=~models.Q(material_code=''),
                name='uniq_tenant_material_code_not_blank'
            )
        ]
        unique_together = []
        indexes = [
            models.Index(fields=['tenant', 'name']),
            models.Index(fields=['tenant', 'material_code']),
            models.Index(fields=['tenant', 'category']),
            models.Index(fields=['tenant', 'manufacturer']),
            models.Index(fields=['tenant', 'is_active']),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.material_code})" if self.material_code else self.name

    def clean(self):
        # No strict validation; keep flexible. But trim whitespace and normalize casing for category/sub_category
        self.category = (self.category or '').strip()
        self.sub_category = (self.sub_category or '').strip()
        self.material_code = (self.material_code or '').strip()
        self.manufacturer = (self.manufacturer or '').strip()

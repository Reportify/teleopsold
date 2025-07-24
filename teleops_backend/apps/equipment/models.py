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
        db_table = 'equipment'
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
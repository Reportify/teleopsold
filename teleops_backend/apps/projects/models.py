from django.db import models
from django.utils.translation import gettext_lazy as _


## Note: Phase 1 uses existing client management APIs; no local Client/Customer tables


class Project(models.Model):
    """Project model for managing telecom infrastructure projects (Phase 1)"""
    PROJECT_STATUS = (
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    PROJECT_TYPE = (
        ('dismantle', 'Dismantle'),
        ('other', 'Other'),
    )

    # Core fields
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    project_type = models.CharField(max_length=20, choices=PROJECT_TYPE, default='other')
    status = models.CharField(max_length=20, choices=PROJECT_STATUS, default='planning')

    # Business context
    client_tenant = models.ForeignKey('tenants.Tenant', on_delete=models.PROTECT, related_name='as_client_projects')
    customer_name = models.CharField(max_length=255)
    circle = models.CharField(max_length=100)
    activity = models.TextField()

    # Project details
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    scope = models.TextField(blank=True)

    # Audit fields
    created_by = models.ForeignKey(
        'apps_users.User',
        on_delete=models.CASCADE,
        related_name='created_projects'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'projects'
        verbose_name = _('Project')
        verbose_name_plural = _('Projects')
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'name'], name='unique_project_name_per_tenant'),
        ]
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['project_type']),
            models.Index(fields=['circle']),
            models.Index(fields=['client_tenant']),
            models.Index(fields=['created_at']),
            models.Index(fields=['deleted_at']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.name}"

    def clean(self):
        """Validate project data"""
        from django.core.exceptions import ValidationError
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date")

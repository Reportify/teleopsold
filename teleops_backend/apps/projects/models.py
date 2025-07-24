from django.db import models
from django.utils.translation import gettext_lazy as _


class Project(models.Model):
    """Project model for managing telecom infrastructure projects"""
    PROJECT_STATUS = (
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    PROJECT_TYPE = (
        ('installation', 'Installation'),
        ('maintenance', 'Maintenance'),
        ('upgrade', 'Upgrade'),
        ('decommission', 'Decommission'),
        ('audit', 'Audit'),
    )

    # Core fields
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    project_type = models.CharField(max_length=20, choices=PROJECT_TYPE)
    status = models.CharField(max_length=20, choices=PROJECT_STATUS, default='planning')
    
    # Project details
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Project team - FIXED REFERENCES
    project_manager = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='managed_projects'
    )
    team_members = models.ManyToManyField(
        'apps_users.User', 
        through='ProjectTeamMember', 
        related_name='project_assignments'
    )
    
    # Location and scope
    location = models.CharField(max_length=255, blank=True)
    scope = models.TextField(blank=True)
    
    # Audit fields - FIXED REFERENCE
    created_by = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.CASCADE, 
        related_name='created_projects'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        verbose_name = _('Project')
        verbose_name_plural = _('Projects')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['project_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.name}"

    def clean(self):
        """Validate project data"""
        from django.core.exceptions import ValidationError
        
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date")


class ProjectTeamMember(models.Model):
    """Through model for project team members with roles"""
    ROLE_CHOICES = (
        ('manager', 'Project Manager'),
        ('engineer', 'Engineer'),
        ('technician', 'Technician'),
        ('supervisor', 'Supervisor'),
        ('consultant', 'Consultant'),
    )

    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    user = models.ForeignKey('apps_users.User', on_delete=models.CASCADE)  # FIXED REFERENCE
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    assigned_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'project_team_members'
        unique_together = ['project', 'user']
        indexes = [
            models.Index(fields=['project', 'is_active']),
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_role_display()} on {self.project.name}" 
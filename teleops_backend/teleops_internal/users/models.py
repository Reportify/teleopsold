from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from apps.users.models import User


class InternalProfile(models.Model):
    """Internal profile for teleops staff members"""
    
    ROLE_CHOICES = [
        ('super_admin', 'Super Administrator'),
        ('operations_manager', 'Operations Manager'),
        ('support_staff', 'Support Staff'),
        ('', 'None'),
    ]
    
    ACCESS_LEVEL_CHOICES = [
        ('read_only', 'Read Only'),
        ('standard', 'Standard'),
        ('admin', 'Admin'),
        ('', 'None'),
    ]
    
    # Core relationship
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='internal_profile',
        help_text=_('Associated user account')
    )
    
    # Profile information
    display_name = models.CharField(
        max_length=150, 
        blank=True,
        help_text=_('Display name for internal portal')
    )
    phone_number = models.CharField(
        max_length=20, 
        blank=True,
        help_text=_('Contact phone number')
    )
    employee_id = models.CharField(
        max_length=50, 
        unique=True, 
        null=True, 
        blank=True,
        help_text=_('Employee identification number')
    )
    profile_photo = models.ImageField(
        upload_to='profile_photos/', 
        blank=True, 
        null=True,
        help_text=_('Profile photo for internal portal')
    )
    
    # Role and access
    role = models.CharField(
        max_length=50, 
        choices=ROLE_CHOICES, 
        blank=True, 
        default='',
        help_text=_('Internal role designation')
    )
    access_level = models.CharField(
        max_length=20, 
        choices=ACCESS_LEVEL_CHOICES, 
        default='', 
        blank=True,
        help_text=_('Access level for internal portal')
    )
    
    # Organization details
    department = models.CharField(
        max_length=100, 
        blank=True,
        help_text=_('Department or team')
    )
    reporting_manager = models.ForeignKey(
        'self', 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='subordinates',
        help_text=_('Direct reporting manager')
    )
    
    # Activity tracking
    last_login = models.DateTimeField(
        null=True, 
        blank=True,
        help_text=_('Last login timestamp')
    )
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'internal_profile'
        verbose_name = _('Internal Profile')
        verbose_name_plural = _('Internal Profiles')
        ordering = ['display_name', 'user__email']
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['access_level']),
            models.Index(fields=['department']),
            models.Index(fields=['employee_id']),
            models.Index(fields=['created_at']),
            models.Index(fields=['last_login']),
        ]

    def __str__(self):
        return f"InternalProfile for {self.user.email}"

    def clean(self):
        """Validate internal profile data"""
        errors = {}
        
        # Validate employee ID format if provided
        if self.employee_id:
            import re
            if not re.match(r'^[A-Z0-9]{3,20}$', self.employee_id):
                errors['employee_id'] = _('Employee ID must be 3-20 characters containing only letters and numbers')
        
        # Validate phone number if provided
        if self.phone_number:
            import re
            if not re.match(r'^\+?[\d\s\-\(\)]{10,20}$', self.phone_number):
                errors['phone_number'] = _('Invalid phone number format')
        
        # Validate display name
        if self.display_name and len(self.display_name.strip()) < 2:
            errors['display_name'] = _('Display name must be at least 2 characters')
        
        # Validate role consistency
        if self.role and self.access_level:
            valid_combinations = {
                'super_admin': ['admin'],
                'operations_manager': ['standard', 'admin'],
                'support_staff': ['read_only', 'standard'],
            }
            if self.access_level not in valid_combinations.get(self.role, []):
                errors['access_level'] = _('Access level not compatible with selected role')
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """Override save to perform validation"""
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        """Get full name from user or display name"""
        if self.display_name:
            return self.display_name
        return f"{self.user.first_name} {self.user.last_name}".strip() or self.user.email

    @property
    def role_display(self):
        """Get human-readable role"""
        return dict(self.ROLE_CHOICES).get(self.role, 'No Role')

    @property
    def access_level_display(self):
        """Get human-readable access level"""
        return dict(self.ACCESS_LEVEL_CHOICES).get(self.access_level, 'No Access')

    @property
    def is_admin(self):
        """Check if user has admin privileges"""
        return self.role in ['super_admin'] or self.access_level == 'admin'

    @property
    def can_manage_tenants(self):
        """Check if user can manage tenants"""
        return self.role in ['super_admin', 'operations_manager']

    @property
    def can_suspend_tenants(self):
        """Check if user can suspend/reactivate tenants"""
        return self.role in ['super_admin', 'operations_manager']

    @property
    def can_access_support(self):
        """Check if user can access support features"""
        return self.role in ['super_admin', 'operations_manager', 'support_staff']

    @property
    def can_view_analytics(self):
        """Check if user can view analytics"""
        return self.role in ['super_admin', 'operations_manager']

    def get_permissions(self):
        """Get all permissions for this profile"""
        from ..constants import ROLE_PERMISSIONS
        return ROLE_PERMISSIONS.get(self.role, {})

    def has_permission(self, permission):
        """Check if profile has specific permission"""
        permissions = self.get_permissions()
        return permissions.get(permission, False)

    def get_subordinate_count(self):
        """Get count of direct subordinates"""
        return self.subordinates.count()

    def get_team_hierarchy(self):
        """Get team hierarchy starting from this profile"""
        hierarchy = {
            'profile': self,
            'subordinates': []
        }
        
        for subordinate in self.subordinates.all():
            hierarchy['subordinates'].append(subordinate.get_team_hierarchy())
        
        return hierarchy 
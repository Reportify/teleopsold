from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser, PermissionsMixin, BaseUserManager
)
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.core.validators import MinValueValidator
from datetime import date
import uuid

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, user_type='tenant', **extra_fields):
        """
        Create and save a regular user with the given email and password.
        """
        if not email:
            raise ValueError('The Email field must be set')
        
        email = self.normalize_email(email)
        user = self.model(email=email, user_type=user_type, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and save a superuser with the given email and password.
        """
        extra_fields.setdefault('user_type', 'teleops')
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
            
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    USER_TYPE_CHOICES = [
        ('teleops', 'Teleops Internal'),
        ('corporate', 'Corporate'),
        ('circle', 'Circle'),
        ('vendor', 'Vendor'),
        ('tenant', 'Tenant'),  # Generic tenant type
    ]
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='tenant')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    id = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    objects = UserManager()

    class Meta:
        db_table = 'users'
        verbose_name = _('User')
        verbose_name_plural = _('Users')

    def __str__(self):
        return f"{self.email} ({self.get_user_type_display()})"

    def clean(self):
        """Model validation"""
        super().clean()
        if not self.email:
            raise ValidationError('Email is required')
            
    def save(self, *args, **kwargs):
        """Override save to ensure email is normalized"""
        self.email = self.__class__.objects.normalize_email(self.email)
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        """Return full name or email if name is not available"""
        return f"{self.first_name} {self.last_name}".strip() or self.email

    @property
    def is_teleops_user(self):
        """Check if user is Teleops internal staff"""
        return self.user_type == 'teleops'

    @property
    def is_corporate_user(self):
        """Check if user belongs to corporate tenant"""
        return self.user_type == 'corporate'

    @property
    def is_circle_user(self):
        """Check if user belongs to circle tenant"""
        return self.user_type == 'circle'

    @property
    def is_vendor_user(self):
        """Check if user belongs to vendor tenant"""
        return self.user_type == 'vendor'

    @property
    def is_tenant_user(self):
        """Check if user is a generic tenant user"""
        return self.user_type == 'tenant'

class UserVerificationToken(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='verification_tokens')
    token = models.CharField(max_length=128, unique=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.expires_at or self.is_used

    def mark_used(self):
        self.is_used = True
        self.save()

    @staticmethod
    def generate_token(user, expiry_hours=24):
        token = str(uuid.uuid4())
        expires_at = timezone.now() + timezone.timedelta(hours=expiry_hours)
        return UserVerificationToken.objects.create(user=user, token=token, expires_at=expires_at) 


class TeleopsUserProfile(models.Model):
    user = models.OneToOneField('User', on_delete=models.CASCADE, related_name='teleops_profile')
    display_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    employee_id = models.CharField(max_length=50, blank=True)
    profile_photo = models.ImageField(upload_to='profile_photos/', blank=True, null=True)
    role = models.CharField(max_length=50)
    access_level = models.CharField(max_length=50)
    department = models.CharField(max_length=100, blank=True)
    reporting_manager = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


# ============================================================================
# Vendor Operations Management Models
# ============================================================================

class Department(models.Model):
    """Custom departments for vendor operations"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        'tenants.Tenant', 
        on_delete=models.CASCADE, 
        related_name='vendor_departments'
    )
    
    # Department Information
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    parent_department = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='sub_departments'
    )
    
    # Department Configuration
    is_operational = models.BooleanField(
        default=True, 
        help_text="Whether this department handles field operations"
    )
    requires_safety_training = models.BooleanField(
        default=False,
        help_text="Whether employees in this department need safety training"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Audit Fields
    created_by = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_departments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendor_departments'
        verbose_name = _('Department')
        verbose_name_plural = _('Departments')
        unique_together = [('tenant', 'code')]
        ordering = ['name']
        indexes = [
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['tenant', 'code']),
            models.Index(fields=['parent_department']),
        ]
    
    def __str__(self):
        return f"{self.tenant.organization_name} - {self.name}"
    
    @property
    def full_name(self):
        """Get full department name including parent"""
        if self.parent_department:
            return f"{self.parent_department.name} > {self.name}"
        return self.name


class CertificationType(models.Model):
    """Certification types for vendor employees"""
    
    # Predefined certifications
    PREDEFINED_CERTIFICATIONS = [
        ('FARMTocli', 'Fall Arrest, Rescue, Medical Training, Climbing'),
        ('FAT', 'Factory Acceptance Test'),
        ('Medical', 'Medical Fitness Certificate'),
        ('Safety_Officer', 'Safety Officer Certification'),
        ('First_Aid', 'First Aid Training'),
        ('Height_Safety', 'Working at Height Safety'),
        ('Equipment_Operation', 'Equipment Operation License'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        'tenants.Tenant', 
        on_delete=models.CASCADE, 
        related_name='certification_types'
    )
    
    # Certification Information
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=50, 
        default='Custom',
        help_text="Category of certification (Safety, Technical, Medical, etc.)"
    )
    
    # Certification Configuration
    is_predefined = models.BooleanField(
        default=False,
        help_text="Whether this is a system-predefined certification"
    )
    is_mandatory_for_field = models.BooleanField(
        default=False,
        help_text="Whether this certification is mandatory for field work"
    )
    validity_period_days = models.IntegerField(
        null=True, 
        blank=True,
        help_text="Number of days this certification is valid (null = no expiry)"
    )
    renewal_required = models.BooleanField(
        default=True,
        help_text="Whether this certification requires renewal"
    )
    advance_notification_days = models.IntegerField(
        default=30,
        help_text="Days before expiry to send notification"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Audit Fields
    created_by = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_certification_types'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'certification_types'
        verbose_name = _('Certification Type')
        verbose_name_plural = _('Certification Types')
        unique_together = [('tenant', 'code')]
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['tenant', 'code']),
            models.Index(fields=['category']),
            models.Index(fields=['is_mandatory_for_field']),
        ]
    
    def __str__(self):
        return f"{self.tenant.organization_name} - {self.name}"


class VendorOperationalDesignation(models.Model):
    """Vendor operational designations for site dismantling and I&C operations"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        'tenants.Tenant', 
        on_delete=models.CASCADE, 
        related_name='vendor_operational_designations'
    )
    
    # Basic Information
    name = models.CharField(max_length=255, help_text="Designation title (e.g., Site Engineer, Safety Officer)")
    code = models.CharField(max_length=100, help_text="Unique identifier within tenant")
    description = models.TextField(blank=True)
    department = models.ForeignKey(
        Department, 
        on_delete=models.CASCADE, 
        related_name='designations'
    )
    
    # Operational Configuration
    is_field_designation = models.BooleanField(
        default=True,
        help_text="Whether this designation involves field operations"
    )
    requires_supervision = models.BooleanField(
        default=False,
        help_text="Whether employees with this designation need supervision"
    )
    can_supervise_others = models.BooleanField(
        default=False,
        help_text="Whether this designation can supervise other employees"
    )
    max_team_size = models.IntegerField(
        null=True, 
        blank=True,
        help_text="Maximum team size this designation can manage"
    )
    
    # Required Certifications
    required_certifications = models.ManyToManyField(
        CertificationType,
        blank=True,
        related_name='required_for_designations',
        help_text="Certifications required for this designation"
    )
    
    # RBAC Integration
    rbac_permissions = models.JSONField(
        default=list,
        help_text="RBAC permissions associated with this designation"
    )
    
    # Hierarchy
    parent_designation = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='subordinate_designations'
    )
    hierarchy_level = models.IntegerField(
        default=1,
        help_text="Hierarchy level (1=highest)"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Audit Fields
    created_by = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_operational_designations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendor_operational_designations'
        verbose_name = _('Vendor Operational Designation')
        verbose_name_plural = _('Vendor Operational Designations')
        unique_together = [('tenant', 'code')]
        ordering = ['hierarchy_level', 'name']
        indexes = [
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['tenant', 'code']),
            models.Index(fields=['department']),
            models.Index(fields=['is_field_designation']),
            models.Index(fields=['hierarchy_level']),
        ]
    
    def __str__(self):
        return f"{self.tenant.organization_name} - {self.name}"
    
    def clean(self):
        """Validate designation data"""
        if self.hierarchy_level < 1:
            raise ValidationError("Hierarchy level must be positive")
        
        if self.max_team_size is not None and self.max_team_size <= 0:
            raise ValidationError("Max team size must be positive")
        
        # Validate parent hierarchy
        if self.parent_designation:
            if self.hierarchy_level <= self.parent_designation.hierarchy_level:
                raise ValidationError("Hierarchy level must be greater than parent level")
    
    @property
    def required_certification_count(self):
        """Count of required certifications"""
        return self.required_certifications.count()
    
    @property
    def subordinate_count(self):
        """Count of subordinate designations"""
        return self.subordinate_designations.filter(is_active=True).count()


class VendorEmployee(models.Model):
    """Vendor employees for operational management"""
    
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Suspended', 'Suspended'),
        ('Terminated', 'Terminated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        'tenants.Tenant', 
        on_delete=models.CASCADE, 
        related_name='vendor_employees'
    )
    
    # Basic Information
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    employee_id = models.CharField(
        max_length=50,
        help_text="Vendor's internal employee ID"
    )
    
    # Employment Information
    designation = models.ForeignKey(
        VendorOperationalDesignation,
        on_delete=models.CASCADE,
        related_name='employees'
    )
    date_of_joining = models.DateField(default=date.today)
    employment_type = models.CharField(
        max_length=50,
        default='Full-time',
        help_text="Full-time, Part-time, Contract, etc."
    )
    
    # Field Readiness
    is_field_ready = models.BooleanField(
        default=False,
        help_text="Whether employee has all required certifications for field work"
    )
    last_certification_check = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Last time certification status was checked"
    )
    
    # Additional Information
    address = models.TextField(blank=True)
    emergency_contact_name = models.CharField(max_length=255, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    
    # Status
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='Active'
    )
    
    # Audit Fields
    created_by = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_vendor_employees'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'vendor_employees'
        verbose_name = _('Vendor Employee')
        verbose_name_plural = _('Vendor Employees')
        unique_together = [
            ('tenant', 'employee_id'),
            ('tenant', 'email'),
        ]
        ordering = ['name']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['tenant', 'employee_id']),
            models.Index(fields=['designation']),
            models.Index(fields=['is_field_ready']),
            models.Index(fields=['date_of_joining']),
        ]
    
    def __str__(self):
        return f"{self.tenant.organization_name} - {self.name} ({self.employee_id})"
    
    def update_field_readiness(self):
        """Update field readiness based on current certifications"""
        if not self.designation.is_field_designation:
            self.is_field_ready = True
        else:
            required_certs = self.designation.required_certifications.filter(
                is_mandatory_for_field=True
            )
            
            # Check if employee has all required certifications that are not expired
            current_valid_certs = self.certifications.filter(
                certification_type__in=required_certs,
                is_active=True
            ).filter(
                models.Q(expiry_date__isnull=True) | 
                models.Q(expiry_date__gte=date.today())
            )
            
            self.is_field_ready = current_valid_certs.count() >= required_certs.count()
        
        self.last_certification_check = timezone.now()
        self.save(update_fields=['is_field_ready', 'last_certification_check'])
    
    @property
    def certification_compliance_rate(self):
        """Calculate certification compliance rate"""
        if not self.designation.is_field_designation:
            return 100.0
        
        required_count = self.designation.required_certifications.count()
        if required_count == 0:
            return 100.0
        
        valid_count = self.certifications.filter(
            certification_type__in=self.designation.required_certifications.all(),
            is_active=True
        ).filter(
            models.Q(expiry_date__isnull=True) | 
            models.Q(expiry_date__gte=date.today())
        ).count()
        
        return (valid_count / required_count) * 100


class EmployeeCertification(models.Model):
    """Employee certifications tracking"""
    
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Expired', 'Expired'),
        ('Suspended', 'Suspended'),
        ('Revoked', 'Revoked'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        VendorEmployee,
        on_delete=models.CASCADE,
        related_name='certifications'
    )
    certification_type = models.ForeignKey(
        CertificationType,
        on_delete=models.CASCADE,
        related_name='employee_certifications'
    )
    
    # Certification Details
    certificate_number = models.CharField(max_length=100, blank=True)
    issuing_authority = models.CharField(max_length=255, blank=True)
    issue_date = models.DateField()
    expiry_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Leave blank if certification doesn't expire"
    )
    
    # Status and Validation
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='Active'
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether certification has been verified by supervisor"
    )
    verified_by = models.ForeignKey(
        'User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_certifications'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Notifications
    expiry_notification_sent = models.BooleanField(default=False)
    last_reminder_sent = models.DateTimeField(null=True, blank=True)
    
    # Additional Information
    notes = models.TextField(blank=True)
    renewal_required = models.BooleanField(default=True)
    
    # Audit Fields
    created_by = models.ForeignKey(
        'User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_employee_certifications'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'employee_certifications'
        verbose_name = _('Employee Certification')
        verbose_name_plural = _('Employee Certifications')
        unique_together = [('employee', 'certification_type')]
        ordering = ['-issue_date']
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['certification_type']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['status']),
            models.Index(fields=['is_verified']),
        ]
    
    def __str__(self):
        return f"{self.employee.name} - {self.certification_type.name}"
    
    def clean(self):
        """Validate certification data"""
        if self.expiry_date and self.issue_date and self.expiry_date <= self.issue_date:
            raise ValidationError("Expiry date must be after issue date")
    
    @property
    def is_active(self):
        """Check if certification is currently active and valid"""
        if self.status != 'Active':
            return False
        
        if self.expiry_date and self.expiry_date < date.today():
            return False
        
        return True
    
    @property
    def days_to_expiry(self):
        """Calculate days until expiry"""
        if not self.expiry_date:
            return None
        
        delta = self.expiry_date - date.today()
        return delta.days if delta.days > 0 else 0
    
    @property
    def is_expiring_soon(self):
        """Check if certification is expiring soon"""
        if not self.expiry_date:
            return False
        
        days_to_expiry = self.days_to_expiry
        if days_to_expiry is None:
            return False
        
        notification_days = self.certification_type.advance_notification_days
        return 0 <= days_to_expiry <= notification_days
    
    def mark_expired(self):
        """Mark certification as expired"""
        self.status = 'Expired'
        self.save(update_fields=['status', 'updated_at'])
    
    def verify_certification(self, verifying_user):
        """Mark certification as verified"""
        self.is_verified = True
        self.verified_by = verifying_user
        self.verified_at = timezone.now()
        self.save(update_fields=['is_verified', 'verified_by', 'verified_at', 'updated_at']) 
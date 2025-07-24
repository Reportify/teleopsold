"""
Validators for tenant management
"""

import re
from typing import Any, Dict, List
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator, RegexValidator
from django.utils.translation import gettext_lazy as _

from .constants import VALIDATION_PATTERNS, INDIAN_TELECOM_CIRCLES


class TenantDataValidator:
    """Comprehensive validator for tenant data"""
    
    def __init__(self):
        self.email_validator = EmailValidator()
        self.phone_validator = RegexValidator(
            regex=VALIDATION_PATTERNS['PHONE'],
            message=_('Enter a valid phone number')
        )
        self.subdomain_validator = RegexValidator(
            regex=VALIDATION_PATTERNS['SUBDOMAIN'],
            message=_('Subdomain can only contain lowercase letters, numbers, and hyphens')
        )
    
    def validate_invitation_data(self, data: Dict[str, Any]) -> None:
        """
        Validate invitation data
        
        Args:
            data: Dictionary containing invitation data
            
        Raises:
            ValidationError: If validation fails
        """
        errors = {}
        
        # Required fields
        required_fields = ['email', 'contact_name', 'tenant_type']
        for field in required_fields:
            if not data.get(field):
                errors[field] = _('This field is required')
        
        # Email validation
        if 'email' in data:
            try:
                self.email_validator(data['email'])
            except ValidationError:
                errors['email'] = _('Enter a valid email address')
        
        # Contact name validation
        if 'contact_name' in data:
            contact_name = data['contact_name'].strip()
            if len(contact_name) < 2:
                errors['contact_name'] = _('Contact name must be at least 2 characters')
            elif len(contact_name) > 100:
                errors['contact_name'] = _('Contact name cannot exceed 100 characters')
        
        # Tenant type validation
        if 'tenant_type' in data:
            valid_types = ['Corporate', 'Circle', 'Vendor']
            if data['tenant_type'] not in valid_types:
                errors['tenant_type'] = _('Invalid tenant type')
        
        if errors:
            raise ValidationError(errors)
    
    def validate_onboarding_data(self, data: Dict[str, Any], tenant_type: str) -> None:
        """
        Validate onboarding data based on tenant type
        
        Args:
            data: Dictionary containing onboarding data
            tenant_type: Type of tenant being onboarded
            
        Raises:
            ValidationError: If validation fails
        """
        errors = {}
        
        # Common validation
        self._validate_common_fields(data, errors)
        
        # Type-specific validation
        if tenant_type == 'Corporate':
            self._validate_corporate_fields(data, errors)
        elif tenant_type == 'Circle':
            self._validate_circle_fields(data, errors)
        elif tenant_type == 'Vendor':
            self._validate_vendor_fields(data, errors)
        
        if errors:
            raise ValidationError(errors)
    
    def _validate_common_fields(self, data: Dict[str, Any], errors: Dict[str, str]) -> None:
        """Validate common fields for all tenant types"""
        # Organization name
        if not data.get('organization_name'):
            errors['organization_name'] = _('Organization name is required')
        elif len(data['organization_name']) < 2:
            errors['organization_name'] = _('Organization name must be at least 2 characters')
        elif len(data['organization_name']) > 255:
            errors['organization_name'] = _('Organization name cannot exceed 255 characters')
        
        # Primary contact fields
        if not data.get('primary_contact_name'):
            errors['primary_contact_name'] = _('Primary contact name is required')
        
        if not data.get('primary_contact_email'):
            errors['primary_contact_email'] = _('Primary contact email is required')
        else:
            try:
                self.email_validator(data['primary_contact_email'])
            except ValidationError:
                errors['primary_contact_email'] = _('Enter a valid email address')
        
        if not data.get('primary_contact_phone'):
            errors['primary_contact_phone'] = _('Primary contact phone is required')
        else:
            try:
                self.phone_validator(data['primary_contact_phone'])
            except ValidationError:
                errors['primary_contact_phone'] = _('Enter a valid phone number')
        
        # Subdomain validation
        if 'subdomain' in data:
            try:
                self.subdomain_validator(data['subdomain'])
            except ValidationError:
                errors['subdomain'] = _('Invalid subdomain format')
    
    def _validate_corporate_fields(self, data: Dict[str, Any], errors: Dict[str, str]) -> None:
        """Validate corporate-specific fields"""
        # Business registration number
        if not data.get('business_registration_number'):
            errors['business_registration_number'] = _('Business registration number is required')
        
        # Circles validation
        if 'circles' in data and data['circles']:
            valid_circles = [circle['code'] for circle in INDIAN_TELECOM_CIRCLES]
            for circle_code in data['circles']:
                if circle_code not in valid_circles:
                    errors['circles'] = _('Invalid circle code: {}').format(circle_code)
                    break
    
    def _validate_circle_fields(self, data: Dict[str, Any], errors: Dict[str, str]) -> None:
        """Validate circle-specific fields"""
        # Parent tenant ID
        if not data.get('parent_tenant_id'):
            errors['parent_tenant_id'] = _('Parent tenant ID is required for circle tenants')
        
        # Circle code
        if not data.get('circle_code'):
            errors['circle_code'] = _('Circle code is required')
        else:
            valid_circles = [circle['code'] for circle in INDIAN_TELECOM_CIRCLES]
            if data['circle_code'] not in valid_circles:
                errors['circle_code'] = _('Invalid circle code')
    
    def _validate_vendor_fields(self, data: Dict[str, Any], errors: Dict[str, str]) -> None:
        """Validate vendor-specific fields"""
        # Specialization
        if 'specialization' in data and data['specialization']:
            if not isinstance(data['specialization'], list):
                errors['specialization'] = _('Specialization must be a list')
        
        # Coverage areas
        if 'coverage_areas' in data and data['coverage_areas']:
            if not isinstance(data['coverage_areas'], list):
                errors['coverage_areas'] = _('Coverage areas must be a list')
            else:
                valid_circles = [circle['code'] for circle in INDIAN_TELECOM_CIRCLES]
                for area in data['coverage_areas']:
                    if area not in valid_circles:
                        errors['coverage_areas'] = _('Invalid coverage area: {}').format(area)
                        break
        
        # Service capabilities
        if 'service_capabilities' in data and data['service_capabilities']:
            if not isinstance(data['service_capabilities'], list):
                errors['service_capabilities'] = _('Service capabilities must be a list')


class SubdomainValidator:
    """Specialized validator for subdomains"""
    
    @staticmethod
    def validate_availability(subdomain: str, exclude_tenant_id: str = None) -> bool:
        """
        Check if subdomain is available
        
        Args:
            subdomain: Subdomain to check
            exclude_tenant_id: Tenant ID to exclude from check (for updates)
            
        Returns:
            bool: True if available
            
        Raises:
            ValidationError: If subdomain is not available
        """
        from .models import Tenant
        
        query = Tenant.objects.filter(subdomain=subdomain)
        if exclude_tenant_id:
            query = query.exclude(id=exclude_tenant_id)
        
        if query.exists():
            raise ValidationError(_('Subdomain is already taken'))
        
        return True
    
    @staticmethod
    def validate_format(subdomain: str) -> bool:
        """
        Validate subdomain format
        
        Args:
            subdomain: Subdomain to validate
            
        Returns:
            bool: True if valid format
            
        Raises:
            ValidationError: If format is invalid
        """
        if not subdomain:
            raise ValidationError(_('Subdomain is required'))
        
        if len(subdomain) > 63:
            raise ValidationError(_('Subdomain cannot exceed 63 characters'))
        
        if not re.match(VALIDATION_PATTERNS['SUBDOMAIN'], subdomain):
            raise ValidationError(
                _('Subdomain can only contain lowercase letters, numbers, and hyphens. '
                  'It cannot start or end with a hyphen.')
            )
        
        # Reserved subdomains
        reserved = ['www', 'api', 'admin', 'mail', 'ftp', 'test', 'dev', 'staging']
        if subdomain in reserved:
            raise ValidationError(_('This subdomain is reserved'))
        
        return True


class CircleValidator:
    """Validator for circle-related data"""
    
    @staticmethod
    def validate_circle_codes(circle_codes: List[str]) -> bool:
        """
        Validate list of circle codes
        
        Args:
            circle_codes: List of circle codes to validate
            
        Returns:
            bool: True if all codes are valid
            
        Raises:
            ValidationError: If any code is invalid
        """
        if not circle_codes:
            return True
        
        valid_codes = [circle['code'] for circle in INDIAN_TELECOM_CIRCLES]
        invalid_codes = [code for code in circle_codes if code not in valid_codes]
        
        if invalid_codes:
            raise ValidationError(
                _('Invalid circle codes: {}').format(', '.join(invalid_codes))
            )
        
        return True
    
    @staticmethod
    def validate_circle_hierarchy(corporate_id: str, circle_code: str) -> bool:
        """
        Validate circle hierarchy - ensure circle doesn't already exist for corporate
        
        Args:
            corporate_id: ID of corporate tenant
            circle_code: Circle code to validate
            
        Returns:
            bool: True if valid
            
        Raises:
            ValidationError: If circle already exists
        """
        from .models import Tenant
        
        if Tenant.objects.filter(
            parent_tenant_id=corporate_id,
            circle_code=circle_code,
            is_active=True
        ).exists():
            raise ValidationError(
                _('Circle {} already exists for this corporate').format(circle_code)
            )
        
        return True


def validate_business_registration_number(value: str) -> None:
    """
    Validate business registration number format
    
    Args:
        value: Registration number to validate
        
    Raises:
        ValidationError: If format is invalid
    """
    if not value:
        return
    
    # Remove spaces and convert to uppercase
    clean_value = value.replace(' ', '').upper()
    
    # Basic length check
    if len(clean_value) < 5 or len(clean_value) > 20:
        raise ValidationError(_('Business registration number must be between 5 and 20 characters'))
    
    # Must contain alphanumeric characters
    if not clean_value.isalnum():
        raise ValidationError(_('Business registration number can only contain letters and numbers'))


def validate_phone_number(value: str) -> None:
    """
    Enhanced phone number validation
    
    Args:
        value: Phone number to validate
        
    Raises:
        ValidationError: If format is invalid
    """
    if not value:
        return
    
    # Remove all non-digit characters except +
    clean_value = re.sub(r'[^\d+]', '', value)
    
    # Check format
    if not re.match(VALIDATION_PATTERNS['PHONE'], value):
        raise ValidationError(_('Enter a valid phone number with country code'))
    
    # Check length
    digits_only = re.sub(r'[^\d]', '', clean_value)
    if len(digits_only) < 10 or len(digits_only) > 15:
        raise ValidationError(_('Phone number must be between 10 and 15 digits')) 
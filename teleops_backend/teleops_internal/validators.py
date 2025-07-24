"""
Validators for teleops_internal management
"""

import re
from typing import Any, Dict
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from django.utils.translation import gettext_lazy as _

from .constants import VALIDATION_PATTERNS, INTERNAL_ROLES, ACCESS_LEVELS


class InternalProfileValidator:
    """Validator for internal profile data"""
    
    def __init__(self):
        self.email_validator = EmailValidator()
    
    def validate_profile_data(self, data: Dict[str, Any]) -> None:
        """
        Validate internal profile data
        
        Args:
            data: Dictionary containing profile data
            
        Raises:
            ValidationError: If validation fails
        """
        errors = {}
        
        # Display name validation
        if 'display_name' in data and data['display_name']:
            self._validate_display_name(data['display_name'], errors)
        
        # Phone number validation
        if 'phone_number' in data and data['phone_number']:
            self._validate_phone_number(data['phone_number'], errors)
        
        # Employee ID validation
        if 'employee_id' in data and data['employee_id']:
            self._validate_employee_id(data['employee_id'], errors)
        
        # Role validation
        if 'role' in data and data['role']:
            self._validate_role(data['role'], errors)
        
        # Access level validation
        if 'access_level' in data and data['access_level']:
            self._validate_access_level(data['access_level'], errors)
        
        # Department validation
        if 'department' in data and data['department']:
            self._validate_department(data['department'], errors)
        
        if errors:
            raise ValidationError(errors)
    
    def _validate_display_name(self, display_name: str, errors: Dict[str, str]) -> None:
        """Validate display name"""
        if len(display_name.strip()) < 2:
            errors['display_name'] = _('Display name must be at least 2 characters')
        elif len(display_name) > 100:
            errors['display_name'] = _('Display name cannot exceed 100 characters')
        elif not re.match(VALIDATION_PATTERNS['DISPLAY_NAME'], display_name):
            errors['display_name'] = _('Display name can only contain letters and spaces')
    
    def _validate_phone_number(self, phone_number: str, errors: Dict[str, str]) -> None:
        """Validate phone number"""
        if not re.match(VALIDATION_PATTERNS['PHONE'], phone_number):
            errors['phone_number'] = _('Invalid phone number format')
        elif len(phone_number.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')) < 10:
            errors['phone_number'] = _('Phone number must be at least 10 digits')
    
    def _validate_employee_id(self, employee_id: str, errors: Dict[str, str]) -> None:
        """Validate employee ID"""
        if not re.match(VALIDATION_PATTERNS['EMPLOYEE_ID'], employee_id):
            errors['employee_id'] = _('Employee ID must be 3-20 characters containing only letters and numbers')
    
    def _validate_role(self, role: str, errors: Dict[str, str]) -> None:
        """Validate role"""
        valid_roles = list(INTERNAL_ROLES.values())
        if role not in valid_roles:
            errors['role'] = _('Invalid role selected')
    
    def _validate_access_level(self, access_level: str, errors: Dict[str, str]) -> None:
        """Validate access level"""
        valid_levels = list(ACCESS_LEVELS.values())
        if access_level not in valid_levels:
            errors['access_level'] = _('Invalid access level selected')
    
    def _validate_department(self, department: str, errors: Dict[str, str]) -> None:
        """Validate department"""
        if len(department.strip()) < 2:
            errors['department'] = _('Department name must be at least 2 characters')
        elif len(department) > 100:
            errors['department'] = _('Department name cannot exceed 100 characters')


class AuthenticationValidator:
    """Validator for authentication data"""
    
    def __init__(self):
        self.email_validator = EmailValidator()
    
    def validate_login_data(self, data: Dict[str, Any]) -> None:
        """
        Validate login data
        
        Args:
            data: Dictionary containing login data
            
        Raises:
            ValidationError: If validation fails
        """
        errors = {}
        
        # Email validation
        if not data.get('email'):
            errors['email'] = _('Email is required')
        else:
            try:
                self.email_validator(data['email'])
            except ValidationError:
                errors['email'] = _('Enter a valid email address')
        
        # Password validation
        if not data.get('password'):
            errors['password'] = _('Password is required')
        elif len(data['password']) < 6:
            errors['password'] = _('Password must be at least 6 characters')
        
        if errors:
            raise ValidationError(errors)


class TenantManagementValidator:
    """Validator for tenant management operations"""
    
    def validate_tenant_update_data(self, data: Dict[str, Any]) -> None:
        """
        Validate tenant update data
        
        Args:
            data: Dictionary containing tenant update data
            
        Raises:
            ValidationError: If validation fails
        """
        errors = {}
        
        # Contact name validation
        if 'primary_contact_name' in data and data['primary_contact_name']:
            if len(data['primary_contact_name'].strip()) < 2:
                errors['primary_contact_name'] = _('Contact name must be at least 2 characters')
            elif len(data['primary_contact_name']) > 255:
                errors['primary_contact_name'] = _('Contact name cannot exceed 255 characters')
        
        # Email validation
        if 'primary_contact_email' in data and data['primary_contact_email']:
            try:
                EmailValidator()(data['primary_contact_email'])
            except ValidationError:
                errors['primary_contact_email'] = _('Enter a valid email address')
        
        # Phone validation
        if 'primary_contact_phone' in data and data['primary_contact_phone']:
            if not re.match(VALIDATION_PATTERNS['PHONE'], data['primary_contact_phone']):
                errors['primary_contact_phone'] = _('Enter a valid phone number')
        
        # Website validation
        if 'website' in data and data['website']:
            if not self._is_valid_url(data['website']):
                errors['website'] = _('Enter a valid website URL')
        
        if errors:
            raise ValidationError(errors)
    
    def validate_suspension_data(self, data: Dict[str, Any]) -> None:
        """
        Validate tenant suspension data
        
        Args:
            data: Dictionary containing suspension data
            
        Raises:
            ValidationError: If validation fails
        """
        errors = {}
        
        # Reason validation
        if 'reason' in data and data['reason']:
            if len(data['reason'].strip()) < 10:
                errors['reason'] = _('Suspension reason must be at least 10 characters')
            elif len(data['reason']) > 500:
                errors['reason'] = _('Suspension reason cannot exceed 500 characters')
        
        if errors:
            raise ValidationError(errors)
    
    def _is_valid_url(self, url: str) -> bool:
        """Validate URL format"""
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        return url_pattern.match(url) is not None


class FileUploadValidator:
    """Validator for file uploads"""
    
    def validate_profile_photo(self, file) -> None:
        """
        Validate profile photo upload
        
        Args:
            file: Uploaded file object
            
        Raises:
            ValidationError: If validation fails
        """
        from .constants import UPLOAD_SETTINGS
        
        if not file:
            return
        
        settings = UPLOAD_SETTINGS['PROFILE_PHOTO']
        
        # Check file size
        if file.size > settings['MAX_SIZE_MB'] * 1024 * 1024:
            raise ValidationError(
                _('File size cannot exceed {size}MB').format(size=settings['MAX_SIZE_MB'])
            )
        
        # Check file extension
        file_extension = file.name.split('.')[-1].lower()
        if file_extension not in settings['ALLOWED_EXTENSIONS']:
            raise ValidationError(
                _('Invalid file type. Allowed types: {types}').format(
                    types=', '.join(settings['ALLOWED_EXTENSIONS'])
                )
            )
        
        # Check if it's actually an image
        try:
            from PIL import Image
            image = Image.open(file)
            image.verify()
            
            # Check dimensions
            if image.size[0] > settings['MAX_DIMENSIONS'][0] or image.size[1] > settings['MAX_DIMENSIONS'][1]:
                raise ValidationError(
                    _('Image dimensions cannot exceed {width}x{height} pixels').format(
                        width=settings['MAX_DIMENSIONS'][0],
                        height=settings['MAX_DIMENSIONS'][1]
                    )
                )
        except Exception:
            raise ValidationError(_('Invalid image file'))


class PaginationValidator:
    """Validator for pagination parameters"""
    
    def validate_pagination_params(self, page: str, page_size: str) -> Dict[str, int]:
        """
        Validate and normalize pagination parameters
        
        Args:
            page: Page number as string
            page_size: Page size as string
            
        Returns:
            Dict: Validated pagination parameters
            
        Raises:
            ValidationError: If validation fails
        """
        errors = {}
        
        # Validate page number
        try:
            page_num = int(page) if page else 1
            if page_num < 1:
                errors['page'] = _('Page number must be positive')
        except (ValueError, TypeError):
            errors['page'] = _('Invalid page number')
            page_num = 1
        
        # Validate page size
        try:
            size = int(page_size) if page_size else 20
            if size < 1:
                errors['page_size'] = _('Page size must be positive')
            elif size > 100:
                errors['page_size'] = _('Page size cannot exceed 100')
        except (ValueError, TypeError):
            errors['page_size'] = _('Invalid page size')
            size = 20
        
        if errors:
            raise ValidationError(errors)
        
        return {
            'page': page_num,
            'page_size': size,
        }


class SearchValidator:
    """Validator for search parameters"""
    
    def validate_search_params(self, data: Dict[str, Any]) -> None:
        """
        Validate search parameters
        
        Args:
            data: Dictionary containing search data
            
        Raises:
            ValidationError: If validation fails
        """
        errors = {}
        
        # Search term validation
        if 'search' in data and data['search']:
            search_term = data['search'].strip()
            if len(search_term) < 2:
                errors['search'] = _('Search term must be at least 2 characters')
            elif len(search_term) > 100:
                errors['search'] = _('Search term cannot exceed 100 characters')
        
        # Filter validation
        if 'tenant_type' in data and data['tenant_type']:
            valid_types = ['Corporate', 'Circle', 'Vendor']
            if data['tenant_type'] not in valid_types:
                errors['tenant_type'] = _('Invalid tenant type')
        
        if 'activation_status' in data and data['activation_status']:
            valid_statuses = ['Active', 'Inactive', 'Suspended', 'Terminated']
            if data['activation_status'] not in valid_statuses:
                errors['activation_status'] = _('Invalid activation status')
        
        if errors:
            raise ValidationError(errors)


def validate_uuid(value) -> None:
    """
    Validate UUID format
    
    Args:
        value: UUID string or UUID object to validate
        
    Raises:
        ValidationError: If UUID format is invalid
    """
    import uuid
    
    try:
        # If it's already a UUID object, it's valid
        if isinstance(value, uuid.UUID):
            return
        # If it's a string, try to convert it
        uuid.UUID(str(value))
    except (ValueError, TypeError):
        raise ValidationError(_('Invalid UUID format'))


def validate_json_field(value: Any) -> None:
    """
    Validate JSON field data
    
    Args:
        value: Value to validate as JSON
        
    Raises:
        ValidationError: If JSON is invalid
    """
    import json
    
    if value is None:
        return
    
    try:
        if isinstance(value, str):
            json.loads(value)
    except (json.JSONDecodeError, TypeError):
        raise ValidationError(_('Invalid JSON format')) 
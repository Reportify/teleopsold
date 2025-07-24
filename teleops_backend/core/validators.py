"""
Custom validators for Teleops Backend
"""

import re
from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils.translation import gettext_lazy as _


def validate_phone_number(value):
    """
    Validate Indian phone numbers
    Supports: +91XXXXXXXXXX, 91XXXXXXXXXX, XXXXXXXXXX
    """
    if not value:
        return
    
    # Remove spaces, hyphens, and parentheses
    cleaned = re.sub(r'[\s\-\(\)]', '', str(value))
    
    # Check Indian phone number patterns
    patterns = [
        r'^\+91[6-9]\d{9}$',  # +91XXXXXXXXXX
        r'^91[6-9]\d{9}$',    # 91XXXXXXXXXX
        r'^[6-9]\d{9}$',      # XXXXXXXXXX
    ]
    
    if not any(re.match(pattern, cleaned) for pattern in patterns):
        raise ValidationError(
            _('Enter a valid Indian phone number. Format: +91XXXXXXXXXX or XXXXXXXXXX'),
            code='invalid_phone'
        )


def validate_circle_code(value):
    """
    Validate Indian telecom circle codes
    """
    if not value:
        return
        
    # Convert to uppercase
    value = str(value).upper()
    
    # Valid Indian telecom circle codes
    valid_circles = {
        'MPCG', 'UPE', 'UPW', 'GJ', 'MH', 'KA', 'TN', 'AP', 'TG', 'KL',
        'DL', 'HR', 'PB', 'RJ', 'BR', 'JH', 'OR', 'WB', 'AS', 'NE',
        'SK', 'TR', 'ML', 'MN', 'GA', 'AN', 'CH', 'DN', 'LD', 'PY'
    }
    
    if value not in valid_circles:
        raise ValidationError(
            _('Enter a valid Indian telecom circle code.'),
            code='invalid_circle_code'
        )


def validate_gps_coordinate(latitude, longitude, accuracy=None):
    """
    Validate GPS coordinates for Indian geography
    """
    try:
        lat = float(latitude)
        lng = float(longitude)
    except (ValueError, TypeError):
        raise ValidationError(
            _('GPS coordinates must be valid numbers.'),
            code='invalid_gps_format'
        )
    
    # India geographical bounds (approximate)
    if not (6.0 <= lat <= 37.0):
        raise ValidationError(
            _('Latitude must be between 6.0 and 37.0 for Indian locations.'),
            code='invalid_latitude'
        )
    
    if not (68.0 <= lng <= 97.0):
        raise ValidationError(
            _('Longitude must be between 68.0 and 97.0 for Indian locations.'),
            code='invalid_longitude'
        )
    
    # Validate accuracy if provided
    if accuracy is not None:
        try:
            acc = float(accuracy)
            if acc < 0:
                raise ValidationError(
                    _('GPS accuracy cannot be negative.'),
                    code='invalid_accuracy'
                )
            if acc > 100:  # More than 100 meters is too inaccurate
                raise ValidationError(
                    _('GPS accuracy is too low. Must be within 100 meters.'),
                    code='accuracy_too_low'
                )
        except (ValueError, TypeError):
            raise ValidationError(
                _('GPS accuracy must be a valid number.'),
                code='invalid_accuracy_format'
            )


def validate_tenant_subdomain(value):
    """
    Validate tenant subdomain format
    """
    if not value:
        return
    
    # Convert to lowercase
    value = str(value).lower()
    
    # Check format: only alphanumeric and hyphens, must start/end with alphanumeric
    pattern = r'^[a-z0-9][a-z0-9\-]*[a-z0-9]$|^[a-z0-9]$'
    
    if not re.match(pattern, value):
        raise ValidationError(
            _('Subdomain must contain only lowercase letters, numbers, and hyphens. '
              'Must start and end with alphanumeric characters.'),
            code='invalid_subdomain'
        )
    
    # Length constraints
    if len(value) < 3:
        raise ValidationError(
            _('Subdomain must be at least 3 characters long.'),
            code='subdomain_too_short'
        )
    
    if len(value) > 63:
        raise ValidationError(
            _('Subdomain cannot be longer than 63 characters.'),
            code='subdomain_too_long'
        )
    
    # Reserved subdomains
    reserved = {
        'www', 'api', 'admin', 'mail', 'ftp', 'localhost', 'teleops',
        'internal', 'system', 'root', 'support', 'help', 'docs'
    }
    
    if value in reserved:
        raise ValidationError(
            _('This subdomain is reserved and cannot be used.'),
            code='subdomain_reserved'
        )


def validate_organization_code(value):
    """
    Validate organization code format
    """
    if not value:
        return
    
    # Convert to uppercase
    value = str(value).upper()
    
    # Format: 3-20 characters, alphanumeric and underscores only
    pattern = r'^[A-Z0-9_]{3,20}$'
    
    if not re.match(pattern, value):
        raise ValidationError(
            _('Organization code must be 3-20 characters long and contain only '
              'uppercase letters, numbers, and underscores.'),
            code='invalid_org_code'
        )


def validate_file_size(file, max_size_mb=10):
    """
    Validate uploaded file size
    """
    if file and hasattr(file, 'size'):
        max_size_bytes = max_size_mb * 1024 * 1024
        if file.size > max_size_bytes:
            raise ValidationError(
                _('File size cannot exceed %(max_size)s MB.') % {'max_size': max_size_mb},
                code='file_too_large'
            )


def validate_image_file(file):
    """
    Validate uploaded image file
    """
    if not file:
        return
    
    # Check file size (max 5MB for images)
    validate_file_size(file, max_size_mb=5)
    
    # Check file extension
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_extension = file.name.lower().split('.')[-1] if file.name else ''
    
    if f'.{file_extension}' not in allowed_extensions:
        raise ValidationError(
            _('Only image files are allowed (JPG, PNG, GIF, WebP).'),
            code='invalid_image_type'
        )


def validate_equipment_serial_number(value):
    """
    Validate equipment serial number format
    """
    if not value:
        return
    
    # Remove spaces and convert to uppercase
    cleaned = re.sub(r'\s+', '', str(value)).upper()
    
    # Format: 6-30 characters, alphanumeric and specific special characters
    pattern = r'^[A-Z0-9\-_/\.]{6,30}$'
    
    if not re.match(pattern, cleaned):
        raise ValidationError(
            _('Serial number must be 6-30 characters long and contain only '
              'letters, numbers, hyphens, underscores, slashes, and dots.'),
            code='invalid_serial_number'
        )


def validate_currency_amount(value, min_amount=0, max_amount=None):
    """
    Validate currency amount (Indian Rupees)
    """
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(
            _('Enter a valid amount.'),
            code='invalid_amount'
        )
    
    if amount < min_amount:
        raise ValidationError(
            _('Amount cannot be less than %(min_amount)s.') % {'min_amount': min_amount},
            code='amount_too_low'
        )
    
    if max_amount is not None and amount > max_amount:
        raise ValidationError(
            _('Amount cannot exceed %(max_amount)s.') % {'max_amount': max_amount},
            code='amount_too_high'
        )
    
    # Check decimal places (max 2 for currency)
    if amount.as_tuple().exponent < -2:
        raise ValidationError(
            _('Amount cannot have more than 2 decimal places.'),
            code='too_many_decimal_places'
        )


def validate_project_code(value):
    """
    Validate project code format
    """
    if not value:
        return
    
    # Convert to uppercase
    value = str(value).upper()
    
    # Format: PROJECT_YYYYMMDD_XXX or similar patterns
    pattern = r'^[A-Z0-9_\-]{6,50}$'
    
    if not re.match(pattern, value):
        raise ValidationError(
            _('Project code must be 6-50 characters long and contain only '
              'uppercase letters, numbers, underscores, and hyphens.'),
            code='invalid_project_code'
        )


def validate_indian_pincode(value):
    """
    Validate Indian postal PIN codes
    """
    if not value:
        return
    
    # Convert to string and remove spaces
    cleaned = re.sub(r'\s+', '', str(value))
    
    # Indian PIN code format: 6 digits
    pattern = r'^[1-9][0-9]{5}$'
    
    if not re.match(pattern, cleaned):
        raise ValidationError(
            _('Enter a valid Indian PIN code (6 digits, cannot start with 0).'),
            code='invalid_pincode'
        )


class ValidationMixin:
    """
    Mixin class to add validation methods to serializers
    """
    
    def validate_phone_number(self, value):
        validate_phone_number(value)
        return value
    
    def validate_circle_code(self, value):
        validate_circle_code(value)
        return value
    
    def validate_subdomain(self, value):
        validate_tenant_subdomain(value)
        return value
    
    def validate_organization_code(self, value):
        validate_organization_code(value)
        return value 
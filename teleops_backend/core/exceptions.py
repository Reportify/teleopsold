"""
Custom exception classes for Teleops Backend
"""

from django.utils.translation import gettext_lazy as _
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class TeleopsBaseException(Exception):
    """Base exception class for all Teleops-specific exceptions"""
    default_message = "An error occurred"
    default_code = "TELEOPS_ERROR"
    
    def __init__(self, message=None, code=None, details=None):
        self.message = message or self.default_message
        self.code = code or self.default_code
        self.details = details or {}
        super().__init__(self.message)


class TenantException(TeleopsBaseException):
    """Exceptions related to tenant operations"""
    default_message = "Tenant error occurred"
    default_code = "TENANT_ERROR"


class TenantNotFound(TenantException):
    """Raised when tenant is not found"""
    default_message = "Tenant not found"
    default_code = "TENANT_NOT_FOUND"


class TenantInactive(TenantException):
    """Raised when tenant is inactive"""
    default_message = "Tenant is inactive"
    default_code = "TENANT_INACTIVE"


class TenantPermissionDenied(TenantException):
    """Raised when user doesn't have permission for tenant operation"""
    default_message = "Permission denied for tenant operation"
    default_code = "TENANT_PERMISSION_DENIED"


class CircleException(TeleopsBaseException):
    """Exceptions related to circle operations"""
    default_message = "Circle error occurred"
    default_code = "CIRCLE_ERROR"


class CircleNotFound(CircleException):
    """Raised when circle is not found"""
    default_message = "Circle not found"
    default_code = "CIRCLE_NOT_FOUND"


class InvalidCircleOperation(CircleException):
    """Raised when invalid circle operation is attempted"""
    default_message = "Invalid circle operation"
    default_code = "INVALID_CIRCLE_OPERATION"


class VendorException(TeleopsBaseException):
    """Exceptions related to vendor operations"""
    default_message = "Vendor error occurred"
    default_code = "VENDOR_ERROR"


class VendorNotAuthorized(VendorException):
    """Raised when vendor is not authorized for operation"""
    default_message = "Vendor not authorized for this operation"
    default_code = "VENDOR_NOT_AUTHORIZED"


class AuthenticationException(TeleopsBaseException):
    """Exceptions related to authentication"""
    default_message = "Authentication error"
    default_code = "AUTH_ERROR"


class InvalidCredentials(AuthenticationException):
    """Raised when credentials are invalid"""
    default_message = "Invalid credentials"
    default_code = "INVALID_CREDENTIALS"


class TokenExpired(AuthenticationException):
    """Raised when JWT token is expired"""
    default_message = "Token has expired"
    default_code = "TOKEN_EXPIRED"


class ValidationException(TeleopsBaseException):
    """Exceptions related to data validation"""
    default_message = "Validation error"
    default_code = "VALIDATION_ERROR"


class GPSException(TeleopsBaseException):
    """Exceptions related to GPS operations"""
    default_message = "GPS error occurred"
    default_code = "GPS_ERROR"


class InvalidGPSCoordinates(GPSException):
    """Raised when GPS coordinates are invalid"""
    default_message = "Invalid GPS coordinates"
    default_code = "INVALID_GPS_COORDINATES"


class GPSAccuracyTooLow(GPSException):
    """Raised when GPS accuracy is below threshold"""
    default_message = "GPS accuracy is too low"
    default_code = "GPS_ACCURACY_TOO_LOW"


class FileUploadException(TeleopsBaseException):
    """Exceptions related to file uploads"""
    default_message = "File upload error"
    default_code = "FILE_UPLOAD_ERROR"


class UnsupportedFileType(FileUploadException):
    """Raised when file type is not supported"""
    default_message = "File type not supported"
    default_code = "UNSUPPORTED_FILE_TYPE"


class FileSizeExceeded(FileUploadException):
    """Raised when file size exceeds limit"""
    default_message = "File size exceeds limit"
    default_code = "FILE_SIZE_EXCEEDED"


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF that handles our custom exceptions
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # If it's one of our custom exceptions
    if isinstance(exc, TeleopsBaseException):
        custom_response_data = {
            'error': {
                'code': exc.code,
                'message': exc.message,
                'details': exc.details
            }
        }
        
        # Log the error
        logger.error(f"Custom exception: {exc.code} - {exc.message}", 
                    extra={'details': exc.details, 'context': context})
        
        # Determine status code based on exception type
        if isinstance(exc, (TenantNotFound, CircleNotFound)):
            status_code = status.HTTP_404_NOT_FOUND
        elif isinstance(exc, (TenantPermissionDenied, VendorNotAuthorized)):
            status_code = status.HTTP_403_FORBIDDEN
        elif isinstance(exc, (InvalidCredentials, TokenExpired)):
            status_code = status.HTTP_401_UNAUTHORIZED
        elif isinstance(exc, (ValidationException, InvalidGPSCoordinates, UnsupportedFileType)):
            status_code = status.HTTP_400_BAD_REQUEST
        elif isinstance(exc, TenantInactive):
            status_code = status.HTTP_410_GONE
        else:
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            
        return Response(custom_response_data, status=status_code)
    
    # For other exceptions, add standard error format
    if response is not None:
        custom_response_data = {
            'error': {
                'code': 'GENERIC_ERROR',
                'message': 'An error occurred',
                'details': response.data if response.data else {}
            }
        }
        response.data = custom_response_data
    
    return response 
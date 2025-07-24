"""
Custom exceptions for teleops_internal management
"""


class TeleopsInternalException(Exception):
    """Base exception for all Teleops Internal-related errors"""
    pass


class AuthenticationError(TeleopsInternalException):
    """Base exception for authentication-related errors"""
    pass


class InvalidCredentialsError(AuthenticationError):
    """Raised when login credentials are invalid"""
    pass


class InternalProfileNotFoundError(AuthenticationError):
    """Raised when internal profile cannot be found"""
    pass


class InactiveAccountError(AuthenticationError):
    """Raised when trying to authenticate with inactive account"""
    pass


class InsufficientPermissionsError(TeleopsInternalException):
    """Raised when user lacks required permissions"""
    pass


class AdminOperationError(TeleopsInternalException):
    """Base exception for admin operation errors"""
    pass


class TenantManagementError(AdminOperationError):
    """Raised when tenant management operations fail"""
    pass


class BillingOperationError(AdminOperationError):
    """Raised when billing operations fail"""
    pass


class SupportOperationError(AdminOperationError):
    """Raised when support operations fail"""
    pass


class ProfileUpdateError(TeleopsInternalException):
    """Raised when profile update operations fail"""
    pass


class ValidationError(TeleopsInternalException):
    """Raised when data validation fails"""
    pass


class ServiceUnavailableError(TeleopsInternalException):
    """Raised when service is temporarily unavailable"""
    pass 
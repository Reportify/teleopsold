"""
Custom exceptions for tenant management
"""


class TeleopsException(Exception):
    """Base exception for all Teleops-related errors"""
    pass


class TenantNotFoundError(TeleopsException):
    """Raised when a tenant cannot be found"""
    pass


class InvitationError(TeleopsException):
    """Base exception for invitation-related errors"""
    pass


class InvalidInvitationTokenError(InvitationError):
    """Raised when an invitation token is invalid or expired"""
    pass


class InvitationAlreadyAcceptedError(InvitationError):
    """Raised when trying to accept an already accepted invitation"""
    pass


class EmailDeliveryError(TeleopsException):
    """Raised when email delivery fails"""
    pass


class TenantValidationError(TeleopsException):
    """Raised when tenant data validation fails"""
    pass


class CircleValidationError(TeleopsException):
    """Raised when circle-related validation fails"""
    pass


class OnboardingError(TeleopsException):
    """Raised when onboarding process fails"""
    pass 
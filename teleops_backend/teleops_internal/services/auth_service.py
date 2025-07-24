"""
Authentication service for teleops_internal
"""

import logging
from typing import Dict, Any, Tuple
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from ..users.models import InternalProfile
from ..exceptions import (
    InvalidCredentialsError,
    InternalProfileNotFoundError,
    InactiveAccountError,
    AuthenticationError
)

logger = logging.getLogger(__name__)


class AuthService:
    """Service for handling teleops internal authentication"""
    
    def authenticate_internal_user(self, email: str, password: str) -> Tuple[User, InternalProfile, Dict[str, str]]:
        """
        Authenticate internal user and return user, profile, and tokens
        
        Args:
            email: User email address
            password: User password
            
        Returns:
            Tuple[User, InternalProfile, Dict]: User instance, profile instance, and token dict
            
        Raises:
            InvalidCredentialsError: If credentials are invalid
            InactiveAccountError: If account is inactive
            InternalProfileNotFoundError: If internal profile doesn't exist
        """
        try:
            # Authenticate user
            user = authenticate(username=email, password=password)
            
            if user is None:
                logger.warning(f"Authentication failed for email: {email}")
                raise InvalidCredentialsError("Invalid email or password")
            
            if not user.is_active:
                logger.warning(f"Inactive account login attempt: {email}")
                raise InactiveAccountError("Account is inactive")
            
            # Get internal profile
            try:
                profile = InternalProfile.objects.get(user=user)
            except InternalProfile.DoesNotExist:
                logger.error(f"Internal profile not found for user: {email}")
                raise InternalProfileNotFoundError("Internal profile not found")
            
            # Generate tokens
            tokens = self._generate_tokens(user)
            
            # Update last login
            profile.last_login = timezone.now()
            profile.save(update_fields=['last_login'])
            
            logger.info(f"Internal user authenticated successfully: {email}")
            return user, profile, tokens
            
        except (InvalidCredentialsError, InactiveAccountError, InternalProfileNotFoundError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error during authentication: {e}", exc_info=True)
            raise AuthenticationError("Authentication failed due to system error")
    
    def _generate_tokens(self, user: User) -> Dict[str, str]:
        """
        Generate JWT tokens for user
        
        Args:
            user: User instance
            
        Returns:
            Dict[str, str]: Dictionary containing access and refresh tokens
        """
        try:
            refresh = RefreshToken.for_user(user)
            return {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        except Exception as e:
            logger.error(f"Token generation failed for user {user.email}: {e}", exc_info=True)
            raise AuthenticationError("Failed to generate authentication tokens")
    
    def blacklist_token(self, refresh_token: str) -> bool:
        """
        Blacklist a refresh token (logout)
        
        Args:
            refresh_token: Refresh token to blacklist
            
        Returns:
            bool: True if successfully blacklisted
        """
        try:
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
                logger.info("Token blacklisted successfully")
                return True
            return False
        except Exception as e:
            logger.warning(f"Failed to blacklist token: {e}")
            # Don't raise exception for logout - graceful degradation
            return False
    
    def validate_internal_access(self, user: User) -> bool:
        """
        Validate that user has internal access permissions
        
        Args:
            user: User instance to validate
            
        Returns:
            bool: True if user has internal access
            
        Raises:
            InternalProfileNotFoundError: If internal profile doesn't exist
        """
        try:
            if not user.is_active:
                return False
            
            # Check if user has internal profile
            if not hasattr(user, 'internal_profile'):
                raise InternalProfileNotFoundError("User does not have internal access")
            
            profile = user.internal_profile
            
            # Check if profile has valid role
            valid_roles = ['super_admin', 'operations_manager', 'support_staff']
            if profile.role not in valid_roles:
                return False
            
            return True
            
        except InternalProfile.DoesNotExist:
            raise InternalProfileNotFoundError("Internal profile not found")
    
    def get_user_permissions(self, profile: InternalProfile) -> Dict[str, bool]:
        """
        Get user permissions based on role and access level
        
        Args:
            profile: InternalProfile instance
            
        Returns:
            Dict[str, bool]: Dictionary of permissions
        """
        base_permissions = {
            'can_view_tenants': False,
            'can_manage_tenants': False,
            'can_suspend_tenants': False,
            'can_manage_billing': False,
            'can_access_support': False,
            'can_view_analytics': False,
            'can_manage_users': False,
            'can_manage_system': False,
        }
        
        # Super Admin - all permissions
        if profile.role == 'super_admin':
            return {key: True for key in base_permissions}
        
        # Operations Manager - most permissions except system management
        elif profile.role == 'operations_manager':
            base_permissions.update({
                'can_view_tenants': True,
                'can_manage_tenants': True,
                'can_suspend_tenants': True,
                'can_manage_billing': True,
                'can_access_support': True,
                'can_view_analytics': True,
            })
        
        # Support Staff - limited permissions
        elif profile.role == 'support_staff':
            base_permissions.update({
                'can_view_tenants': True,
                'can_access_support': True,
            })
        
        return base_permissions
    
    def check_permission(self, user: User, permission: str) -> bool:
        """
        Check if user has specific permission
        
        Args:
            user: User instance
            permission: Permission to check
            
        Returns:
            bool: True if user has permission
        """
        try:
            if not self.validate_internal_access(user):
                return False
            
            permissions = self.get_user_permissions(user.internal_profile)
            return permissions.get(permission, False)
            
        except Exception as e:
            logger.error(f"Permission check failed: {e}")
            return False 
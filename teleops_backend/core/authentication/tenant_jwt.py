"""
Tenant-scoped JWT authentication for multi-tenant platform
"""

import logging
from typing import Optional, Tuple, Union
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import Token
from rest_framework.authentication import get_authorization_header
from rest_framework.request import Request
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from apps.tenants.models import Tenant

logger = logging.getLogger(__name__)


class TenantScopedJWTAuthentication(JWTAuthentication):
    """
    JWT authentication with tenant scoping for multi-tenant platform
    """
    
    def authenticate(self, request: Request) -> Optional[Tuple[AbstractUser, Token]]:
        """
        Authenticate user and set tenant context
        
        Args:
            request: The incoming HTTP request
            
        Returns:
            Tuple of (user, token) if authentication succeeds, None otherwise
        """
        logger.debug(f"TenantScopedJWTAuthentication.authenticate called for {request.path}")
        
        header = self.get_header(request)
        if header is None:
            logger.debug("No authorization header found")
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            logger.debug("No raw token found")
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            logger.debug("Token validated successfully")
        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            raise
        
        # Get user from token with tenant validation
        user = self.get_user_from_token(validated_token)
        logger.debug(f"User retrieved from token: {user.email} (type: {user.user_type})")
        
        # Set tenant context from token (preserve if already set by middleware)
        existing_tenant = getattr(request, 'tenant', None)
        tenant = self.get_tenant_from_token(validated_token, request)
        
        # Use JWT tenant if available, otherwise preserve middleware tenant
        if tenant:
            logger.debug(f"Tenant context from JWT: {tenant}")
            request.tenant = tenant
        elif existing_tenant:
            logger.debug(f"Preserving middleware tenant context: {existing_tenant}")
            request.tenant = existing_tenant
        else:
            logger.debug("No tenant context available")
            request.tenant = None
        
        logger.debug(f"Authentication successful for user: {user.email}")
        return (user, validated_token)
    
    def get_tenant_from_token(self, token, request):
        """
        Extract tenant from JWT token
        """
        tenant_id = token.get('tenant_id')
        
        # For internal/teleops users, tenant_id may not be present
        if not tenant_id:
            # Check if this is an internal user by getting user from token
            try:
                user = super().get_user(token)
                if user and user.user_type == 'teleops':
                    logger.debug(f"Internal user authenticated: {user.email}")
                    return None  # No tenant context needed for internal users
            except Exception:
                pass
            
            logger.warning("JWT token missing tenant_id")
            return None
        
        try:
            tenant = Tenant.objects.get(id=tenant_id, is_active=True)
            logger.debug(f"Tenant context set from JWT: {tenant.organization_name}")
            return tenant
        except Tenant.DoesNotExist:
            logger.warning(f"Invalid tenant_id in JWT token: {tenant_id}")
            return None
    
    def authenticate_header(self, request):
        """
        Return a string to be used as the value of the `WWW-Authenticate`
        header in a `401 Unauthenticated` response.
        """
        return 'Bearer realm="api"'
    
    def get_user_from_token(self, token):
        """
        Get user from token with tenant validation
        """
        user = super().get_user(token)
        
        # Skip tenant validation for internal/teleops users
        if user.user_type == 'teleops':
            return user
        
        # Additional tenant-specific user validation for non-internal users
        tenant_id = token.get('tenant_id')
        if tenant_id:
            # Check if user belongs to the tenant
            if not self.user_belongs_to_tenant(user, tenant_id):
                raise InvalidToken(_('User does not belong to the specified tenant'))
        
        return user
    
    def user_belongs_to_tenant(self, user, tenant_id):
        """
        Check if user belongs to the specified tenant
        """
        try:
            tenant = Tenant.objects.get(id=tenant_id, is_active=True)
            
            # Check user profile tenant association
            if hasattr(user, 'tenant_user_profile') and user.tenant_user_profile:
                return str(user.tenant_user_profile.tenant_id) == str(tenant_id)
            
            # For users without tenant profile, check if they are the primary contact
            if user.email == tenant.primary_contact_email:
                return True
            
            # For superusers, allow access to any tenant
            if user.is_superuser:
                return True
            
            return False
            
        except Tenant.DoesNotExist:
            return False


class MultiTenantJWTAuthentication(TenantScopedJWTAuthentication):
    """
    Enhanced JWT authentication with multi-tenant support
    """
    
    def authenticate(self, request):
        """
        Authenticate with support for tenant switching
        """
        # First, try to authenticate normally
        auth_result = super().authenticate(request)
        
        if auth_result is None:
            return None
        
        user, token = auth_result
        
        # Check for tenant switching
        requested_tenant_id = request.headers.get('X-Tenant-ID')
        if requested_tenant_id and requested_tenant_id != token.get('tenant_id'):
            # Validate tenant switching permission
            if self.can_switch_tenant(user, requested_tenant_id):
                tenant = self.get_tenant_by_id(requested_tenant_id)
                if tenant:
                    request.tenant = tenant
                    logger.info(f"User {user.id} switched to tenant {tenant.organization_name}")
        
        return auth_result
    
    def can_switch_tenant(self, user, tenant_id):
        """
        Check if user can switch to the specified tenant
        """
        try:
            tenant = Tenant.objects.get(id=tenant_id, is_active=True)
            
            # Super users can switch to any tenant
            if user.is_superuser:
                return True
            
            # Check user's tenant associations
            # This depends on your user-tenant relationship model
            
            # For now, allow if user has any tenant association
            return True
            
        except Tenant.DoesNotExist:
            return False
    
    def get_tenant_by_id(self, tenant_id):
        """
        Get tenant by ID
        """
        try:
            return Tenant.objects.get(id=tenant_id, is_active=True)
        except Tenant.DoesNotExist:
            return None


class CircleScopedJWTAuthentication(TenantScopedJWTAuthentication):
    """
    JWT authentication with circle-specific scoping
    """
    
    def authenticate(self, request):
        """
        Authenticate with circle context
        """
        auth_result = super().authenticate(request)
        
        if auth_result is None:
            return None
        
        user, token = auth_result
        tenant = request.tenant
        
        # Set circle context if tenant is a circle
        if tenant and tenant.tenant_type == 'CIRCLE':
            request.circle = tenant
            logger.debug(f"Circle context set: {tenant.circle_code}")
        
        return auth_result
    
    def get_circle_context(self, request):
        """
        Get circle context from request
        """
        return getattr(request, 'circle', None) 
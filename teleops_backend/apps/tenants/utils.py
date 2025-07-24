"""
Utility functions for tenant management
"""

from typing import Any, Dict, Optional
from rest_framework.response import Response
from rest_framework import status


class APIResponseBuilder:
    """Builder for standardized API responses"""
    
    @staticmethod
    def success(data: Any = None, message: str = None, status_code: int = status.HTTP_200_OK) -> Response:
        """
        Build a successful response
        
        Args:
            data: Response data
            message: Success message
            status_code: HTTP status code
            
        Returns:
            Response: Standardized success response
        """
        response_data = {
            'success': True,
            'data': data,
        }
        
        if message:
            response_data['message'] = message
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def error(
        error: str, 
        details: Dict[str, Any] = None, 
        status_code: int = status.HTTP_400_BAD_REQUEST
    ) -> Response:
        """
        Build an error response
        
        Args:
            error: Error message
            details: Additional error details
            status_code: HTTP status code
            
        Returns:
            Response: Standardized error response
        """
        response_data = {
            'success': False,
            'error': error,
        }
        
        if details:
            response_data['details'] = details
            
        return Response(response_data, status=status_code)
    
    @staticmethod
    def validation_error(errors: Dict[str, Any]) -> Response:
        """
        Build a validation error response
        
        Args:
            errors: Validation errors dictionary
            
        Returns:
            Response: Standardized validation error response
        """
        return APIResponseBuilder.error(
            error="Validation failed",
            details=errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    @staticmethod
    def not_found(resource: str = "Resource") -> Response:
        """
        Build a not found response
        
        Args:
            resource: Name of the resource that was not found
            
        Returns:
            Response: Standardized not found response
        """
        return APIResponseBuilder.error(
            error=f"{resource} not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    @staticmethod
    def server_error(message: str = "An unexpected error occurred") -> Response:
        """
        Build a server error response
        
        Args:
            message: Error message
            
        Returns:
            Response: Standardized server error response
        """
        return APIResponseBuilder.error(
            error=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def generate_subdomain(organization_name: str, tenant_type: str = None, circle_code: str = None) -> str:
    """
    Generate a subdomain for tenant
    
    Args:
        organization_name: Name of the organization
        tenant_type: Type of tenant (Corporate, Circle, Vendor)
        circle_code: Circle code for circle tenants
        
    Returns:
        str: Generated subdomain
    """
    # Sanitize organization name
    base_name = organization_name.lower()
    base_name = ''.join(c if c.isalnum() else '-' for c in base_name)
    base_name = '-'.join(part for part in base_name.split('-') if part)  # Remove empty parts
    
    # Add circle code for circle tenants
    if tenant_type == 'Circle' and circle_code:
        base_name = f"{base_name}-{circle_code.lower()}"
    
    # Add suffix
    subdomain = f"{base_name}-teleops"
    
    # Ensure it's not too long
    if len(subdomain) > 63:  # DNS subdomain limit
        subdomain = subdomain[:60] + "..."
    
    return subdomain


def validate_subdomain(subdomain: str) -> bool:
    """
    Validate subdomain format
    
    Args:
        subdomain: Subdomain to validate
        
    Returns:
        bool: True if valid
    """
    if not subdomain:
        return False
    
    # Check length
    if len(subdomain) > 63:
        return False
    
    # Check format (alphanumeric and hyphens only)
    if not all(c.isalnum() or c == '-' for c in subdomain):
        return False
    
    # Cannot start or end with hyphen
    if subdomain.startswith('-') or subdomain.endswith('-'):
        return False
    
    return True


def mask_sensitive_data(data: Dict[str, Any], sensitive_fields: list = None) -> Dict[str, Any]:
    """
    Mask sensitive data in dictionary
    
    Args:
        data: Dictionary containing data
        sensitive_fields: List of fields to mask
        
    Returns:
        Dict: Dictionary with masked sensitive data
    """
    if sensitive_fields is None:
        sensitive_fields = ['password', 'token', 'secret', 'key']
    
    masked_data = data.copy()
    
    for field in sensitive_fields:
        if field in masked_data:
            masked_data[field] = "***masked***"
    
    return masked_data


def get_client_ip(request) -> str:
    """
    Get client IP address from request
    
    Args:
        request: Django request object
        
    Returns:
        str: Client IP address
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip or 'unknown'


def extract_tenant_context(request) -> Dict[str, Any]:
    """
    Extract tenant context from request
    
    Args:
        request: Django request object
        
    Returns:
        Dict: Tenant context information
    """
    tenant = getattr(request, 'tenant', None)
    
    if not tenant:
        return {}
    
    context = {
        'tenant_id': str(tenant.id),
        'tenant_type': tenant.tenant_type,
        'organization_name': tenant.organization_name,
    }
    
    # Add circle-specific context
    if tenant.tenant_type == 'Circle':
        context.update({
            'circle_code': tenant.circle_code,
            'circle_name': tenant.circle_name,
            'corporate_parent_id': str(tenant.parent_tenant.id) if tenant.parent_tenant else None,
        })
    
    # Add corporate context
    elif tenant.tenant_type == 'Corporate':
        context.update({
            'circle_count': tenant.child_tenants.filter(tenant_type='Circle', is_active=True).count(),
        })
    
    return context 
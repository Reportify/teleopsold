"""
Utility functions for teleops_internal management
"""

from typing import Any, Dict, Optional
from rest_framework.response import Response
from rest_framework import status


class InternalAPIResponseBuilder:
    """Builder for standardized internal portal API responses"""
    
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
        return InternalAPIResponseBuilder.error(
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
        return InternalAPIResponseBuilder.error(
            error=f"{resource} not found",
            status_code=status.HTTP_404_NOT_FOUND
        )
    
    @staticmethod
    def unauthorized(message: str = "Unauthorized access") -> Response:
        """
        Build an unauthorized response
        
        Args:
            message: Error message
            
        Returns:
            Response: Standardized unauthorized response
        """
        return InternalAPIResponseBuilder.error(
            error=message,
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    @staticmethod
    def forbidden(message: str = "Insufficient permissions") -> Response:
        """
        Build a forbidden response
        
        Args:
            message: Error message
            
        Returns:
            Response: Standardized forbidden response
        """
        return InternalAPIResponseBuilder.error(
            error=message,
            status_code=status.HTTP_403_FORBIDDEN
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
        return InternalAPIResponseBuilder.error(
            error=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


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
        sensitive_fields = ['password', 'token', 'secret', 'key', 'access', 'refresh']
    
    masked_data = data.copy()
    
    for field in sensitive_fields:
        if field in masked_data:
            masked_data[field] = "***masked***"
    
    return masked_data


def extract_internal_user_context(request) -> Dict[str, Any]:
    """
    Extract internal user context from request
    
    Args:
        request: Django request object
        
    Returns:
        Dict: Internal user context information
    """
    user = getattr(request, 'user', None)
    
    if not user or not user.is_authenticated:
        return {}
    
    context = {
        'user_id': str(user.id),
        'email': user.email,
        'user_type': user.user_type,
    }
    
    # Add internal profile context if exists
    if hasattr(user, 'internal_profile'):
        profile = user.internal_profile
        context.update({
            'profile_id': str(profile.id),
            'display_name': profile.display_name,
            'role': profile.role,
            'access_level': profile.access_level,
            'department': profile.department,
            'employee_id': profile.employee_id,
        })
    
    return context


def format_tenant_summary(tenant) -> Dict[str, Any]:
    """
    Format tenant data for summary display
    
    Args:
        tenant: Tenant instance
        
    Returns:
        Dict: Formatted tenant summary
    """
    return {
        'id': str(tenant.id),
        'organization_name': tenant.organization_name,
        'tenant_type': tenant.tenant_type,
        'status': tenant.activation_status,
        'is_active': tenant.is_active,
        'contact_email': tenant.primary_contact_email,
        'created_date': tenant.created_at.strftime('%Y-%m-%d'),
        'subdomain': tenant.subdomain,
    }


def validate_pagination_params(page: str, page_size: str) -> Dict[str, int]:
    """
    Validate and normalize pagination parameters
    
    Args:
        page: Page number as string
        page_size: Page size as string
        
    Returns:
        Dict: Validated pagination parameters
    """
    try:
        page_num = int(page) if page else 1
        page_num = max(1, page_num)  # Ensure page is at least 1
    except (ValueError, TypeError):
        page_num = 1
    
    try:
        size = int(page_size) if page_size else 20
        size = max(1, min(100, size))  # Ensure page_size is between 1 and 100
    except (ValueError, TypeError):
        size = 20
    
    return {
        'page': page_num,
        'page_size': size,
    }


def format_error_response(exception) -> Dict[str, Any]:
    """
    Format exception for error response
    
    Args:
        exception: Exception instance
        
    Returns:
        Dict: Formatted error data
    """
    from .exceptions import TeleopsInternalException
    
    if isinstance(exception, TeleopsInternalException):
        return {
            'error_type': exception.__class__.__name__,
            'message': str(exception),
        }
    
    # For non-custom exceptions, provide generic error
    return {
        'error_type': 'SystemError',
        'message': 'An unexpected error occurred',
    }


def generate_audit_log_entry(action: str, user, target_type: str, target_id: str, changes: Dict = None) -> Dict[str, Any]:
    """
    Generate audit log entry for admin actions
    
    Args:
        action: Action performed (e.g., 'suspend_tenant', 'update_profile')
        user: User performing the action
        target_type: Type of target (e.g., 'tenant', 'user')
        target_id: ID of the target
        changes: Dictionary of changes made
        
    Returns:
        Dict: Audit log entry
    """
    from django.utils import timezone
    
    log_entry = {
        'timestamp': timezone.now(),
        'action': action,
        'user_id': str(user.id),
        'user_email': user.email,
        'target_type': target_type,
        'target_id': target_id,
    }
    
    if changes:
        log_entry['changes'] = changes
    
    return log_entry


def calculate_platform_metrics() -> Dict[str, Any]:
    """
    Calculate basic platform metrics for dashboard
    
    Returns:
        Dict: Platform metrics
    """
    try:
        from apps.tenants.models import Tenant
        from apps.users.models import User
        from django.utils import timezone
        from datetime import timedelta
        
        # Basic counts
        total_tenants = Tenant.objects.count()
        active_tenants = Tenant.objects.filter(is_active=True).count()
        
        # Tenants by type
        corporate_count = Tenant.objects.filter(tenant_type='Corporate').count()
        circle_count = Tenant.objects.filter(tenant_type='Circle').count()
        vendor_count = Tenant.objects.filter(tenant_type='Vendor').count()
        
        # Recent activity (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        new_tenants_30d = Tenant.objects.filter(created_at__gte=thirty_days_ago).count()
        
        # User metrics
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        
        return {
            'tenant_metrics': {
                'total_tenants': total_tenants,
                'active_tenants': active_tenants,
                'suspended_tenants': total_tenants - active_tenants,
                'corporate_tenants': corporate_count,
                'circle_tenants': circle_count,
                'vendor_tenants': vendor_count,
                'new_tenants_30d': new_tenants_30d,
            },
            'user_metrics': {
                'total_users': total_users,
                'active_users': active_users,
                'inactive_users': total_users - active_users,
            },
            'growth_metrics': {
                'tenant_growth_30d': new_tenants_30d,
                'activation_rate': (active_tenants / total_tenants * 100) if total_tenants > 0 else 0,
            }
        }
        
    except Exception as e:
        # Return empty metrics if calculation fails
        return {
            'tenant_metrics': {},
            'user_metrics': {},
            'growth_metrics': {},
            'error': 'Failed to calculate metrics'
        } 
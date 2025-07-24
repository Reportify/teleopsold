"""
RBAC Middleware
Middleware for automatic permission checking in tenant-aware applications.
"""

import logging
import json
from typing import Optional, Dict, Any
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
from django.conf import settings

from apps.tenants.services import get_rbac_service, check_user_permission

User = get_user_model()
logger = logging.getLogger(__name__)


class TenantPermissionMiddleware(MiddlewareMixin):
    """
    Middleware that automatically checks tenant permissions for API requests.
    
    This middleware:
    1. Identifies requests that need permission checking
    2. Extracts permission requirements from view metadata
    3. Checks user permissions using the RBAC service
    4. Blocks unauthorized requests
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Skip permission checking for these paths
        self.exempt_paths = getattr(settings, 'RBAC_EXEMPT_PATHS', [
            '/admin/',
            '/api/auth/',
            '/api/health/',
            '/static/',
            '/media/',
            '/docs/',
            '/api/v1/tenants/rbac/health/',
        ])
        
        # Methods that don't need permission checking
        self.exempt_methods = ['OPTIONS', 'HEAD']
        
        super().__init__(get_response)
    
    def process_request(self, request):
        """
        Process the request before it reaches the view.
        Check permissions here to short-circuit unauthorized requests.
        """
        # Skip if request is exempt
        if self._is_exempt_request(request):
            return None
        
        # Skip if user is not authenticated
        if not request.user.is_authenticated:
            return None  # Let authentication middleware handle this
        
        # Skip if user doesn't have tenant profile
        if not hasattr(request.user, 'tenant_profile'):
            return None
        
        # Get permission requirements from URL/view
        permission_requirements = self._get_permission_requirements(request)
        if not permission_requirements:
            return None  # No specific permissions required
        
        # Check permissions
        permission_check_result = self._check_request_permissions(
            request, 
            permission_requirements
        )
        
        if not permission_check_result['allowed']:
            return JsonResponse(
                {
                    'error': 'Permission denied',
                    'message': permission_check_result['message'],
                    'required_permissions': permission_requirements,
                    'details': permission_check_result['details']
                },
                status=403
            )
        
        # Add permission context to request for view use
        request.permission_context = permission_check_result
        
        return None
    
    def _is_exempt_request(self, request) -> bool:
        """Check if request is exempt from permission checking."""
        
        # Check method exemption
        if request.method in self.exempt_methods:
            return True
        
        # Check path exemption
        request_path = request.path
        for exempt_path in self.exempt_paths:
            if request_path.startswith(exempt_path):
                return True
        
        return False
    
    def _get_permission_requirements(self, request) -> Optional[Dict[str, Any]]:
        """
        Extract permission requirements from the request/view.
        
        This can be done through:
        1. URL pattern metadata
        2. View class attributes
        3. Request headers
        4. Configuration mapping
        """
        
        # Method 1: Check for explicit permission requirements in request
        if hasattr(request, 'permission_required'):
            return request.permission_required
        
        # Method 2: Map URL patterns to permissions
        permission_map = self._get_url_permission_map()
        request_path = request.path
        method = request.method.lower()
        
        for pattern, permissions in permission_map.items():
            if pattern in request_path:
                if method in permissions:
                    return {
                        'required_permissions': permissions[method],
                        'scope_context': self._extract_scope_context(request)
                    }
        
        # Method 3: Default permissions based on HTTP method
        default_permissions = self._get_default_permissions_for_method(request)
        if default_permissions:
            return {
                'required_permissions': default_permissions,
                'scope_context': self._extract_scope_context(request)
            }
        
        return None
    
    def _get_url_permission_map(self) -> Dict[str, Dict[str, list]]:
        """
        Define mapping between URL patterns and required permissions.
        
        Returns:
            Dict mapping URL patterns to HTTP methods and their required permissions
        """
        return {
            '/api/v1/tenants/rbac/permissions/': {
                'get': ['rbac.view_permissions'],
                'post': ['rbac.create_permissions'],
                'put': ['rbac.modify_permissions'],
                'patch': ['rbac.modify_permissions'],
                'delete': ['rbac.delete_permissions']
            },
            '/api/v1/tenants/rbac/groups/': {
                'get': ['rbac.view_groups'],
                'post': ['rbac.create_groups'],
                'put': ['rbac.modify_groups'],
                'patch': ['rbac.modify_groups'],
                'delete': ['rbac.delete_groups']
            },
            '/api/v1/tenants/rbac/user-permissions/': {
                'get': ['rbac.view_user_permissions'],
                'post': ['rbac.modify_user_permissions']
            },
            '/api/v1/tenants/rbac/audit/': {
                'get': ['rbac.view_audit_trail']
            },
            # Add more URL patterns as needed
        }
    
    def _get_default_permissions_for_method(self, request) -> Optional[list]:
        """Get default permissions based on HTTP method."""
        
        # Only apply default permissions to API endpoints
        if not request.path.startswith('/api/'):
            return None
        
        method_permissions = {
            'GET': ['api.read_access'],
            'POST': ['api.write_access'],
            'PUT': ['api.write_access'],
            'PATCH': ['api.write_access'],
            'DELETE': ['api.delete_access']
        }
        
        return method_permissions.get(request.method)
    
    def _extract_scope_context(self, request) -> Dict[str, Any]:
        """Extract scope context from request for permission checking."""
        
        scope_context = {}
        
        # Extract from query parameters
        if 'location' in request.GET:
            scope_context['location'] = request.GET['location']
        
        if 'function' in request.GET:
            scope_context['function'] = request.GET['function']
        
        # Extract from request headers
        if 'X-User-Location' in request.headers:
            scope_context['location'] = request.headers['X-User-Location']
        
        if 'X-User-Function' in request.headers:
            scope_context['function'] = request.headers['X-User-Function']
        
        # Extract from URL parameters (you might need URL resolver for this)
        # This is a simplified example
        path_parts = request.path.strip('/').split('/')
        if len(path_parts) > 3 and path_parts[3] == 'circles':
            scope_context['circle_context'] = True
        
        # Add request metadata
        scope_context['request_method'] = request.method
        scope_context['request_path'] = request.path
        scope_context['user_agent'] = request.headers.get('User-Agent', '')
        
        return scope_context
    
    def _check_request_permissions(
        self, 
        request, 
        permission_requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check if user has required permissions for the request."""
        
        try:
            user_profile = request.user.tenant_profile
            required_permissions = permission_requirements.get('required_permissions', [])
            scope_context = permission_requirements.get('scope_context', {})
            
            # Check each required permission
            denied_permissions = []
            permission_details = {}
            
            for permission_code in required_permissions:
                has_permission, details = check_user_permission(
                    user_profile,
                    permission_code,
                    scope_context
                )
                
                permission_details[permission_code] = {
                    'has_permission': has_permission,
                    'details': details
                }
                
                if not has_permission:
                    denied_permissions.append(permission_code)
            
            # Determine if request is allowed
            if denied_permissions:
                return {
                    'allowed': False,
                    'message': f"Missing required permissions: {', '.join(denied_permissions)}",
                    'denied_permissions': denied_permissions,
                    'details': permission_details
                }
            else:
                return {
                    'allowed': True,
                    'message': 'All required permissions granted',
                    'granted_permissions': required_permissions,
                    'details': permission_details
                }
        
        except Exception as e:
            logger.error(f"Error checking permissions: {str(e)}")
            return {
                'allowed': False,
                'message': 'Permission check failed due to system error',
                'error': str(e),
                'details': {}
            }


class PermissionCacheMiddleware(MiddlewareMixin):
    """
    Middleware for managing permission cache headers.
    
    This middleware adds appropriate cache headers for permission-sensitive responses
    to ensure proper caching behavior.
    """
    
    def process_response(self, request, response):
        """Add permission-aware cache headers to response."""
        
        # Skip for non-API requests
        if not request.path.startswith('/api/'):
            return response
        
        # Skip for exempt requests
        if getattr(request, '_permission_exempt', False):
            return response
        
        # Add cache headers for permission-sensitive responses
        if hasattr(request, 'permission_context'):
            # Add headers to indicate permission-sensitive content
            response['X-Permission-Checked'] = 'true'
            response['X-Permission-Context'] = 'tenant-aware'
            
            # Set cache control for permission-sensitive content
            response['Cache-Control'] = 'private, max-age=300'  # 5 minutes
            
            # Add permission hash for cache validation
            permission_hash = self._generate_permission_hash(request.permission_context)
            response['X-Permission-Hash'] = permission_hash
        
        return response
    
    def _generate_permission_hash(self, permission_context: Dict[str, Any]) -> str:
        """Generate a hash of the permission context for cache validation."""
        try:
            import hashlib
            context_str = json.dumps(permission_context, sort_keys=True)
            return hashlib.md5(context_str.encode()).hexdigest()[:16]
        except Exception:
            return 'unknown'


# Utility function for views to require specific permissions
def require_permissions(*permission_codes):
    """
    Decorator for views that require specific permissions.
    
    Usage:
        @require_permissions('rbac.create_permissions', 'rbac.modify_permissions')
        def my_view(request):
            # View code here
            pass
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            request.permission_required = {
                'required_permissions': list(permission_codes),
                'scope_context': {}
            }
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


# Utility function for checking permissions in views
def check_view_permission(request, permission_code: str, scope_context: Optional[Dict] = None) -> bool:
    """
    Check permission within a view.
    
    Args:
        request: Django request object
        permission_code: Permission code to check
        scope_context: Optional scope context
        
    Returns:
        True if user has permission, False otherwise
    """
    try:
        if not request.user.is_authenticated:
            return False
        
        if not hasattr(request.user, 'tenant_profile'):
            return False
        
        has_permission, _ = check_user_permission(
            request.user.tenant_profile,
            permission_code,
            scope_context
        )
        
        return has_permission
        
    except Exception as e:
        logger.error(f"Error checking view permission: {str(e)}")
        return False 
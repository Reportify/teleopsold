"""
Tenant middleware for Circle-Based Multi-Tenant request scoping
"""

import logging
from django.http import Http404
from django.conf import settings
from apps.tenants.models import Tenant

logger = logging.getLogger(__name__)


class TenantMiddleware:
    """
    Middleware to handle tenant context for Circle-Based Multi-Tenant requests
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Set tenant context for the request
        self.set_tenant_context(request)
        
        response = self.get_response(request)
        return response
    
    def set_tenant_context(self, request):
        """
        Set tenant context based on various methods:
        1. X-Tenant-ID header (primary method for API requests)
        2. Subdomain (for web interface)
        3. URL path (for API endpoints)
        
        Note: JWT token tenant_id is handled by TenantScopedJWTAuthentication
        """
        tenant = None
        
        # Method 1: From X-Tenant-ID header (primary for API requests)
        tenant_id = request.headers.get('X-Tenant-ID')
        if tenant_id:
            try:
                tenant = Tenant.objects.select_related('circle').get(id=tenant_id, is_active=True)
        
            except ValueError as e:
                logger.warning(f"Invalid tenant ID format in header: {tenant_id} - {e}")
                # Set error context for better debugging
                request.tenant_error = f"Invalid tenant ID format: {tenant_id}"
            except Tenant.DoesNotExist:
                logger.warning(f"Tenant not found or inactive: {tenant_id}")
                request.tenant_error = f"Tenant not found: {tenant_id}"
            except Exception as e:
                logger.error(f"Unexpected error fetching tenant {tenant_id}: {e}")
                request.tenant_error = f"Error fetching tenant: {str(e)}"
        
        # Method 2: From subdomain (for web interface)
        if not tenant:
            tenant = self.get_tenant_from_subdomain(request)
            if tenant:
                pass
        
        
        # Method 3: From URL path (for API endpoints)
        if not tenant:
            tenant = self.get_tenant_from_path(request)
            if tenant:
                pass
        
        # Set tenant context
        request.tenant = tenant
        
        if tenant:
            pass
        else:
            pass
    
    def get_tenant_from_subdomain(self, request):
        """
        Extract tenant from subdomain
        """
        host = request.get_host().split(':')[0]
        subdomain = host.split('.')[0]
        
        if subdomain in ['www', 'api', 'admin', 'localhost', '127']:
            return None
        
        try:
            return Tenant.objects.get(
                subdomain=subdomain,
                is_active=True
            )
        except Tenant.DoesNotExist:
            logger.warning(f"Tenant not found for subdomain: {subdomain}")
            return None
    
    def get_tenant_from_path(self, request):
        """
        Extract tenant from URL path
        """
        path = request.path
        
        # Skip certain paths
        if path.startswith(('/admin/', '/api/docs/', '/swagger/', '/redoc/', '/health/')):
            return None
        
        # Extract tenant from API path: /api/v1/tenants/{tenant_id}/...
        if path.startswith('/api/v1/'):
            parts = path.split('/')
            if len(parts) > 4 and parts[3] == 'tenants':
                tenant_id = parts[4]
                
                # Skip RBAC paths - they get tenant from authenticated user
                if tenant_id == 'rbac':
                    return None
                    
                try:
                    return Tenant.objects.get(id=tenant_id, is_active=True)
                except (ValueError, Tenant.DoesNotExist):
                    pass
        
        return None


class TenantRequiredMiddleware:
    """
    Middleware to ensure tenant context is available for protected endpoints
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Skip for certain paths
        if self.should_skip_tenant_check(request):
            return self.get_response(request)
        
        # Check if tenant context is required
        if self.requires_tenant_context(request) and not hasattr(request, 'tenant'):
            raise Http404("Tenant context required but not found")
        
        response = self.get_response(request)
        return response
    
    def should_skip_tenant_check(self, request):
        """
        Determine if tenant check should be skipped
        """
        skip_paths = [
            '/admin/',
            '/api/docs/',
            '/swagger/',
            '/redoc/',
            '/health/',
            '/api/auth/',
            '/api/teleops-admin/',  # Teleops admin portal
        ]
        
        return any(request.path.startswith(path) for path in skip_paths)
    
    def requires_tenant_context(self, request):
        """
        Determine if the request requires tenant context
        """
        # All API endpoints except auth and admin require tenant context
        if request.path.startswith('/api/v1/'):
            return True
        
        return False


class CircleBasedAccessMiddleware:
    """
    Middleware to handle Circle-Based access control
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Add circle-based context to request
        self.set_circle_context(request)
        
        response = self.get_response(request)
        return response
    
    def set_circle_context(self, request):
        """
        Set circle context for Circle-Based operations
        """
        if hasattr(request, 'tenant') and request.tenant:
            # Set circle context for circle tenants
            if request.tenant.tenant_type == 'Circle':
                request.circle_context = {
                    'circle_tenant': request.tenant,
                    'corporate_parent': request.tenant.corporate_parent,
                    'circle_code': request.tenant.circle_code,
                    'circle_name': request.tenant.circle_name,
                }
            # Set corporate context for corporate tenants
            elif request.tenant.tenant_type == 'Corporate':
                request.corporate_context = {
                    'corporate_tenant': request.tenant,
                    'circle_children': request.tenant.circle_children,
                }
            # Set vendor context for vendor tenants
            elif request.tenant.tenant_type == 'Vendor':
                request.vendor_context = {
                    'vendor_tenant': request.tenant,
                    'circle_relationships': request.tenant.vendor_circle_relationships.filter(is_active=True),
                } 
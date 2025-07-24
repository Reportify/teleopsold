import logging
from django.http import HttpResponse
from django.conf import settings

logger = logging.getLogger(__name__)

class CustomCorsMiddleware:
    """
    Custom CORS middleware with security-compliant origin handling
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Get allowed origins from settings
        self.allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        self.allow_all_origins = getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False)
    
    def __call__(self, request):
        origin = request.META.get('HTTP_ORIGIN')
        
        # Handle preflight requests
        if request.method == 'OPTIONS':
            response = HttpResponse()
            self._add_cors_headers(response, origin)
            return response

        # Process the request
        response = self.get_response(request)
        
        # Add CORS headers to all responses
        self._add_cors_headers(response, origin)
        
        return response
    
    def _add_cors_headers(self, response, origin):
        """Add CORS headers to response with security checks"""
        # Determine allowed origin
        allowed_origin = self._get_allowed_origin(origin)
        
        if allowed_origin:
            response['Access-Control-Allow-Origin'] = allowed_origin
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response['Access-Control-Allow-Headers'] = (
                'Content-Type, Authorization, X-Tenant-ID, X-Circle-Code, '
                'X-Requested-With, Accept, Origin'
            )
            response['Access-Control-Max-Age'] = '86400'
            
            # Only allow credentials for specific origins, not wildcard
            if allowed_origin != '*':
                response['Access-Control-Allow-Credentials'] = 'true'
            
            # Security headers
            response['Vary'] = 'Origin'
    
    def _get_allowed_origin(self, origin):
        """Determine if origin is allowed and return appropriate value"""
        if not origin:
            return None
        
        # In development, allow all origins
        if self.allow_all_origins and settings.DEBUG:
            return origin
        
        # Check against allowed origins list
        if origin in self.allowed_origins:
            return origin
        
        # Check for localhost variants in development
        if settings.DEBUG and self._is_localhost_origin(origin):
            return origin
        
        # Log rejected origins for security monitoring
        logger.warning(f"CORS request from unauthorized origin: {origin}")
        return None
    
    def _is_localhost_origin(self, origin):
        """Check if origin is a localhost variant for development"""
        localhost_patterns = [
            'http://localhost',
            'http://127.0.0.1',
            'https://localhost',
            'https://127.0.0.1',
        ]
        return any(origin.startswith(pattern) for pattern in localhost_patterns) 
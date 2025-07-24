"""
Audit middleware for tracking user actions and system events
"""

import logging
import json
import hashlib
from datetime import datetime
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# Sensitive fields that should not be logged
SENSITIVE_FIELDS = {
    'password', 'token', 'secret', 'api_key', 'access_token', 
    'refresh_token', 'authorization', 'x-api-key', 'csrf_token'
}

class AuditMiddleware:
    """
    Modern audit middleware for tracking user actions and system events
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.audit_logger = logging.getLogger('teleops.audit')
        self.max_log_size = getattr(settings, 'AUDIT_MAX_LOG_SIZE', 1000)
    
    def __call__(self, request):
        # Log request if needed
        if self.should_audit_request(request):
            self.log_request(request)
        
        # Process request
        response = self.get_response(request)
        
        # Log response if needed
        if self.should_audit_response(request, response):
            self.log_response(request, response)
            
        return response
    
    def process_exception(self, request, exception):
        """Log exceptions"""
        if self.should_audit_exception(request, exception):
            self.log_exception(request, exception)
    
    def should_audit_request(self, request):
        """Determine if request should be audited"""
        # Skip certain paths
        skip_paths = [
            '/health/',
            '/static/',
            '/media/',
            '/admin/jsi18n/',
        ]
        
        if any(request.path.startswith(path) for path in skip_paths):
            return False
        
        # Only audit API requests
        return request.path.startswith('/api/')
    
    def should_audit_response(self, request, response):
        """Determine if response should be audited"""
        return self.should_audit_request(request)
    
    def should_audit_exception(self, request, exception):
        """Determine if exception should be audited"""
        return self.should_audit_request(request)
    
    def log_request(self, request):
        """Log incoming request details with data sanitization"""
        try:
            audit_data = {
                'timestamp': timezone.now().isoformat(),
                'type': 'request',
                'method': request.method,
                'path': request.path,
                'query_params': self._sanitize_data(dict(request.GET)),
                'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') and request.user.is_authenticated else None,
                'tenant_id': str(getattr(request.tenant, 'id', None)) if hasattr(request, 'tenant') and getattr(request.tenant, 'id', None) else None,
                'ip_address': self._get_client_ip(request),
                'user_agent': self._truncate_string(request.META.get('HTTP_USER_AGENT', ''), 200),
                'headers': self._sanitize_headers(dict(request.headers)),
                'session_key': self._hash_session_key(request),
            }
            
            # Log request body for write operations (with sanitization)
            if request.method in ['POST', 'PUT', 'PATCH']:
                audit_data['content_type'] = request.content_type
                if request.content_type and 'application/json' in request.content_type:
                    try:
                        body_data = json.loads(request.body.decode('utf-8'))
                        audit_data['body'] = self._sanitize_data(body_data)
                    except (json.JSONDecodeError, UnicodeDecodeError):
                        audit_data['body'] = '[Unable to decode request body]'
                elif request.content_type and 'multipart/form-data' in request.content_type:
                    audit_data['body'] = '[File upload - content not logged]'
                else:
                    audit_data['body'] = '[Non-JSON content not logged]'
            
            # Truncate the log message if too large
            log_message = json.dumps(audit_data, default=str)
            if len(log_message) > self.max_log_size:
                audit_data['body'] = '[Content too large - truncated]'
                log_message = json.dumps(audit_data, default=str)
            
            self.audit_logger.info(log_message)
            
        except Exception as e:
            logger.error(f"Error logging request audit: {e}")
    
    def log_response(self, request, response):
        """Log response details"""
        audit_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'type': 'response',
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
            'tenant_id': str(getattr(request.tenant, 'id', None)) if hasattr(request, 'tenant') and getattr(request.tenant, 'id', None) else None,
        }
        
        self.audit_logger.info(f"Response: {json.dumps(audit_data)}")
    
    def log_exception(self, request, exception):
        """Log exception details"""
        audit_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'type': 'exception',
            'method': request.method,
            'path': request.path,
            'exception_type': type(exception).__name__,
            'exception_message': str(exception),
            'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None,
            'tenant_id': str(getattr(request.tenant, 'id', None)) if hasattr(request, 'tenant') and getattr(request.tenant, 'id', None) else None,
            'ip_address': self._get_client_ip(request),
        }
        
        self.audit_logger.error(f"Exception: {json.dumps(audit_data)}")
    
    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _sanitize_data(self, data):
        """Sanitize data by removing or masking sensitive fields"""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                if isinstance(key, str) and key.lower() in SENSITIVE_FIELDS:
                    sanitized[key] = '[REDACTED]'
                elif isinstance(value, (dict, list)):
                    sanitized[key] = self._sanitize_data(value)
                else:
                    sanitized[key] = self._truncate_string(str(value), 500) if value else value
            return sanitized
        elif isinstance(data, list):
            return [self._sanitize_data(item) for item in data]
        else:
            return data
    
    def _sanitize_headers(self, headers):
        """Sanitize HTTP headers"""
        sanitized = {}
        for key, value in headers.items():
            if isinstance(key, str) and key.lower() in SENSITIVE_FIELDS:
                sanitized[key] = '[REDACTED]'
            elif key.lower() == 'authorization':
                # Only show the auth type, not the token
                sanitized[key] = value.split(' ')[0] + ' [REDACTED]' if ' ' in value else '[REDACTED]'
            else:
                sanitized[key] = self._truncate_string(str(value), 200)
        return sanitized
    
    def _hash_session_key(self, request):
        """Create a hash of session key for tracking without exposing actual key"""
        if hasattr(request, 'session') and request.session.session_key:
            return hashlib.sha256(request.session.session_key.encode()).hexdigest()[:16]
        return None
    
    def _truncate_string(self, text, max_length):
        """Truncate string to maximum length"""
        if isinstance(text, str) and len(text) > max_length:
            return text[:max_length] + '...'
        return text


class SecurityAuditMiddleware:
    """
    Modern middleware to audit security-related events
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.security_logger = logging.getLogger('teleops.security')
    
    def __call__(self, request):
        # Log security events before processing
        self.log_security_events(request)
        
        # Process request
        response = self.get_response(request)
        
        return response
    
    def log_security_events(self, request):
        """Log security-related events"""
        # Log authentication attempts
        if request.path.startswith('/api/auth/'):
            self.log_auth_attempt(request)
        
        # Log potential security issues
        if self.detect_suspicious_activity(request):
            self.log_suspicious_activity(request)
    
    def log_auth_attempt(self, request):
        """Log authentication attempts"""
        security_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'type': 'auth_attempt',
            'path': request.path,
            'method': request.method,
            'ip_address': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        }
        
        self.security_logger.info(f"Auth Attempt: {json.dumps(security_data)}")
    
    def log_suspicious_activity(self, request):
        """Log suspicious activity"""
        security_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'type': 'suspicious_activity',
            'path': request.path,
            'method': request.method,
            'ip_address': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'reason': 'Multiple failed requests or unusual patterns',
        }
        
        self.security_logger.warning(f"Suspicious Activity: {json.dumps(security_data)}")
    
    def detect_suspicious_activity(self, request):
        """Detect suspicious activity patterns"""
        # This is a simplified implementation
        # In production, you'd want more sophisticated detection
        
        # Check for rapid requests from same IP
        # Check for unusual user agents
        # Check for SQL injection attempts
        # Check for XSS attempts
        
        return False
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip 
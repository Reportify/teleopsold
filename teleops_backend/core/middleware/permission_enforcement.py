"""
Permission Enforcement Middleware
Automatically enforces permission checks based on feature registry
"""

import logging
from django.http import JsonResponse
from django.urls import resolve
from apps.tenants.services.feature_registry import get_feature_registry
from apps.tenants.services import get_rbac_service

logger = logging.getLogger(__name__)

class PermissionEnforcementMiddleware:
    """Automatically enforce permission checks for mapped API endpoints"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.feature_registry = get_feature_registry()
    
    def __call__(self, request):
        # Check permissions before processing request
        permission_check = self._check_endpoint_permissions(request)
        if permission_check:
            return permission_check
        
        response = self.get_response(request)
        return response
    
    def _check_endpoint_permissions(self, request):
        """Check if user has permissions for the requested endpoint"""
        
        # Skip non-API requests
        if not request.path.startswith('/api/'):
            return None
        
        # Skip if user is not authenticated
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        
        # Skip if no tenant profile
        if not hasattr(request.user, 'tenant_user_profile'):
            return None
        
        # Get current URL pattern
        try:
            resolved = resolve(request.path)
            endpoint_pattern = request.path
        except:
            return None
        
        # Find features required for this endpoint
        required_features = self._get_required_permissions_for_endpoint(endpoint_pattern)
        
        if not required_features:
            # No mapped features for this endpoint
            return None
        
        # Check if user has required permissions
        tenant = request.user.tenant_user_profile.tenant
        rbac_service = get_rbac_service(tenant)
        user_profile = request.user.tenant_user_profile
        
        try:
            effective_perms = rbac_service.get_user_effective_permissions(user_profile)
            user_permission_codes = set(effective_perms.get('permissions', {}).keys())
            
            # Check if user has permission for ANY of the required features
            has_permission = False
            for feature in required_features:
                # Check if user has permission for this feature's resource and actions
                has_permission = self._check_feature_permission(
                    user_permission_codes, feature.resource_type, feature.required_actions
                )
                if has_permission:
                    break
            
            if not has_permission:
                feature_names = [f.feature_name for f in required_features]
                logger.warning(
                    f"User {request.user.id} denied access to {endpoint_pattern}. "
                    f"Required features: {feature_names}, Has permissions: {list(user_permission_codes)}"
                )
                
                return JsonResponse({
                    'error': {
                        'code': 'PERMISSION_DENIED',
                        'message': 'You do not have permission to access this resource',
                        'required_features': feature_names
                    }
                }, status=403)
        
        except Exception as e:
            logger.error(f"Error checking permissions for {endpoint_pattern}: {str(e)}")
            # Don't block on permission check errors
            return None
        
        return None
    
    def _check_feature_permission(self, user_permission_codes, resource_type, required_actions):
        """Check if user has the required actions for a resource type"""
        # Check for specific action permissions (exact match)
        for action in required_actions:
            permission_code = f"{resource_type}.{action}"
            if permission_code in user_permission_codes:
                return True
        
        # Check for compound permissions (e.g., site.read_create for create action)
        for code in user_permission_codes:
            if code.startswith(f"{resource_type}."):
                # Extract actions from permission code
                if '.' in code:
                    actions_part = code.split('.', 1)[1]  # Get part after 'resource.'
                    user_actions = actions_part.split('_')
                    # Check if all required actions are covered
                    if all(action in user_actions for action in required_actions):
                        return True
        
        return False
    
    def _get_required_permissions_for_endpoint(self, endpoint_pattern):
        """Get required permissions for an API endpoint"""
        required_features = []
        
        # Check all registered features
        for feature in self.feature_registry._features.values():
            for api_endpoint in feature.api_endpoints:
                if self._endpoint_matches_pattern(endpoint_pattern, api_endpoint):
                    required_features.append(feature)
        
        return required_features
    
    def _endpoint_matches_pattern(self, actual_endpoint, pattern):
        """Check if an endpoint matches a pattern (supports {id} placeholders)"""
        
        # Simple exact match
        if actual_endpoint == pattern:
            return True
        
        # Pattern matching for parametrized URLs
        import re
        
        # Convert pattern like "/api/v1/deviations/{id}/" to regex
        regex_pattern = pattern.replace('{id}', r'\d+').replace('{', '').replace('}', '')
        regex_pattern = f"^{regex_pattern}$"
        
        try:
            return bool(re.match(regex_pattern, actual_endpoint))
        except:
            return False

class PermissionValidationUtils:
    """Utility functions for permission validation"""
    
    @staticmethod
    def check_feature_permission(user, feature_id: str) -> bool:
        """Check if user has permission for a specific feature"""
        feature_registry = get_feature_registry()
        
        if feature_id not in feature_registry._features:
            return False
        
        feature = feature_registry._features[feature_id]
        
        if not hasattr(user, 'tenant_user_profile'):
            return False
        
        tenant = user.tenant_user_profile.tenant
        rbac_service = get_rbac_service(tenant)
        
        try:
            effective_perms = rbac_service.get_user_effective_permissions(user.tenant_user_profile)
            user_permission_codes = set(effective_perms.get('permissions', {}).keys())
            
            # Use the feature registry's method for checking resource access
            return feature_registry.user_has_resource_access(
                effective_perms.get('permissions', {}), 
                feature.resource_type, 
                feature.required_actions
            )
        except:
            return False
    
    @staticmethod
    def get_accessible_features(user) -> list:
        """Get list of features user has access to"""
        feature_registry = get_feature_registry()
        accessible_features = []
        
        for feature_id, feature in feature_registry._features.items():
            if PermissionValidationUtils.check_feature_permission(user, feature_id):
                accessible_features.append(feature)
        
        return accessible_features
    
    @staticmethod
    def validate_permission_mapping(permission_code: str) -> dict:
        """Validate if a permission is properly mapped to features"""
        feature_registry = get_feature_registry()
        
        features = feature_registry.get_features_for_permission(permission_code)
        api_endpoints = feature_registry.get_api_endpoints_for_permission(permission_code)
        components = feature_registry.get_frontend_components_for_permission(permission_code)
        
        return {
            'permission_code': permission_code,
            'is_mapped': len(features) > 0,
            'mapped_features': [f.feature_name for f in features],
            'api_endpoints': api_endpoints,
            'frontend_components': components
        }
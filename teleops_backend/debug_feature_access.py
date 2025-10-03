#!/usr/bin/env python
import os
import sys
import django

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import TenantUserProfile, PermissionRegistry
from apps.tenants.services.rbac_service import SimpleRBACService
from apps.tenants.services.feature_registry import get_feature_registry

User = get_user_model()

def debug_feature_access():
    try:
        # Get user with ID 8 (from JWT token)
        user = User.objects.get(id=8)
        print(f'User: {user.email}')

        # Get user's tenant profile
        profile = TenantUserProfile.objects.get(user=user, is_active=True)
        print(f'Tenant: {profile.tenant.organization_name}')
        
        # Get user permissions from RBAC service
        rbac_service = SimpleRBACService()
        user_permissions = rbac_service.get_user_permissions(profile)
        print(f'\nUser permissions from RBAC service:')
        for perm_code, details in user_permissions.items():
            if 'team' in perm_code:
                print(f'  {perm_code}: {details}')
        
        # Get feature registry
        feature_registry = get_feature_registry()
        
        # Check team features
        print(f'\nTeam features in registry:')
        team_features = feature_registry.get_features_for_resource_type('team')
        for feature in team_features:
            print(f'  {feature.feature_id}: {feature.feature_name}')
            print(f'    Required actions: {feature.required_actions}')
            print(f'    API endpoints: {feature.api_endpoints}')
        
        # Check if user has access to team features
        print(f'\nChecking user access to team features:')
        accessible_team_features = feature_registry.get_features_user_can_access(user_permissions, 'team')
        print(f'Accessible team features: {len(accessible_team_features)}')
        for feature in accessible_team_features:
            print(f'  ✓ {feature.feature_name}')
        
        # Check team permissions in PermissionRegistry
        print(f'\nTeam permissions in PermissionRegistry:')
        team_perms = PermissionRegistry.objects.filter(
            tenant=profile.tenant,
            permission_code__icontains='team'
        )
        for perm in team_perms:
            print(f'  {perm.permission_code}: {perm.business_template}')
            
        # Check specific resource access
        print(f'\nChecking specific resource access:')
        has_read = feature_registry.user_has_resource_access(user_permissions, 'team', ['read'])
        has_create = feature_registry.user_has_resource_access(user_permissions, 'team', ['create'])
        print(f'  Has team read access: {has_read}')
        print(f'  Has team create access: {has_create}')
        
        # Check business template actions
        from apps.tenants.services.feature_registry import BUSINESS_TEMPLATE_ACTIONS
        print(f'\nBusiness template actions:')
        for template, actions in BUSINESS_TEMPLATE_ACTIONS.items():
            print(f'  {template}: {actions}')
            
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    debug_feature_access()
#!/usr/bin/env python3

import os
import sys
import django

# Add the parent directory to Python path
project_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import TenantUserProfile, Tenant
from apps.tenants.services import get_rbac_service

def test_user_analysis():
    try:
        # Get the tenant
        tenant = Tenant.objects.get(id='d7ab45d9-6e85-40aa-a1f3-896582995c6f')
        print(f'Tenant: {tenant.organization_name}')

        # Check if user 5 exists and their status
        print("\n=== Testing User 5 ===")
        try:
            user = TenantUserProfile.objects.get(user_id=5, tenant=tenant)
            print(f'User found: {user.user.first_name} {user.user.last_name} ({user.user.email})')
            print(f'User is_active: {user.is_active}')
            
            # Test permission calculation
            rbac_service = get_rbac_service(tenant)
            effective_perms = rbac_service.get_user_effective_permissions(user)
            perms_dict = effective_perms.get('permissions', {})
            print(f'Permissions count: {len(perms_dict)}')
            print(f'Effective permissions structure: {list(effective_perms.keys())}')
            if perms_dict:
                print(f'Sample permissions: {list(perms_dict.keys())[:5]}')
            else:
                print('No permissions found!')
            
            # Check if user is being looked up correctly
            print(f'\n=== User lookup tests ===')
            # Test old way (without is_active filter)
            try:
                user_old = TenantUserProfile.objects.get(user_id=5, tenant=tenant)
                print(f'Old lookup (no is_active filter): Found {user_old.user.email}')
            except:
                print('Old lookup failed')
                
            # Test new way (with is_active filter)
            try:
                user_new = TenantUserProfile.objects.get(user_id=5, tenant=tenant, is_active=True)
                print(f'New lookup (with is_active=True filter): Found {user_new.user.email}')
            except:
                print('New lookup failed - user might be inactive!')
                
        except TenantUserProfile.DoesNotExist:
            print('User 5 not found')
            # Try without filters
            users = TenantUserProfile.objects.filter(user_id=5, tenant=tenant)
            print(f'Users found without filters: {users.count()}')
            for u in users:
                print(f'  - {u.user.email} (is_active: {u.is_active})')

        # Let's also test user 6 (from the screenshot)
        print("\n=== Testing User 6 ===")
        try:
            user = TenantUserProfile.objects.get(user_id=6, tenant=tenant)
            print(f'User found: {user.user.first_name} {user.user.last_name} ({user.user.email})')
            print(f'User is_active: {user.is_active}')
            
            # Test permission calculation
            rbac_service = get_rbac_service(tenant)
            effective_perms = rbac_service.get_user_effective_permissions(user)
            perms_dict = effective_perms.get('permissions', {})
            print(f'Permissions count: {len(perms_dict)}')
            if perms_dict:
                print(f'Sample permissions: {list(perms_dict.keys())[:5]}')
            else:
                print('No permissions found!')
                
        except TenantUserProfile.DoesNotExist:
            print('User 6 not found')
            
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_user_analysis()
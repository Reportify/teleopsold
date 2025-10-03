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

User = get_user_model()

def fix_team_permissions():
    try:
        # Get user with ID 8 (from JWT token)
        user = User.objects.get(id=8)
        print(f'User: {user.email}')

        # Get user's tenant profile
        profile = TenantUserProfile.objects.get(user=user, is_active=True)
        print(f'Tenant: {profile.tenant.organization_name}')
        
        # Get team permissions
        team_perms = PermissionRegistry.objects.filter(
            tenant=profile.tenant,
            permission_code__icontains='team'
        )
        
        print(f'\nFixing {team_perms.count()} team permissions...')
        
        # Define the correct business template for each permission
        permission_templates = {
            'team.read': 'view_only',      # read only
            'team.create': 'creator_only', # read, create
            'team.update': 'contributor',  # read, create, update
            'team.delete': 'full_access',  # read, create, update, delete
            'team.manage_members': 'contributor'  # read, create, update
        }
        
        updated_count = 0
        for perm in team_perms:
            old_template = perm.business_template
            old_resource_type = perm.resource_type
            
            # Set the correct business template and resource type
            perm.business_template = permission_templates.get(perm.permission_code, 'full_access')
            perm.resource_type = 'team'
            perm.save()
            
            print(f'  Updated {perm.permission_code}:')
            print(f'    business_template: {old_template} -> {perm.business_template}')
            print(f'    resource_type: "{old_resource_type}" -> "{perm.resource_type}"')
            updated_count += 1
        
        print(f'\nSuccessfully updated {updated_count} team permissions!')
        
        # Verify the changes
        print(f'\nVerification:')
        team_perms = PermissionRegistry.objects.filter(
            tenant=profile.tenant,
            permission_code__icontains='team'
        )
        
        for perm in team_perms:
            print(f'  {perm.permission_code}: business_template={perm.business_template}, resource_type={perm.resource_type}')
            
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    fix_team_permissions()
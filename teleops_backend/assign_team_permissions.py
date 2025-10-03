#!/usr/bin/env python
"""
Script to assign team permissions to a user
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import TenantUserProfile, PermissionGroup, UserPermissionGroupAssignment, PermissionRegistry, PermissionGroupPermission
from apps.tenants.services.rbac_service import TenantRBACService

User = get_user_model()

def assign_team_permissions():
    try:
        # Get user with ID 8 (from JWT token)
        user = User.objects.get(id=8)
        print(f'User: {user.email}')

        # Get user's tenant profile
        profile = TenantUserProfile.objects.get(user=user, is_active=True)
        print(f'Tenant: {profile.tenant.organization_name}')
        
        # Get or create a team management permission group
        team_group, created = PermissionGroup.objects.get_or_create(
            tenant=profile.tenant,
            group_code='team_managers',
            defaults={
                'group_name': 'Team Managers',
                'group_type': 'functional',
                'description': 'Users who can manage teams',
                'is_active': True
            }
        )
        print(f'Team group: {team_group.group_name} (created: {created})')
        
        # Add team permissions to the group
        team_permissions = ['team.read', 'team.create', 'team.update', 'team.delete', 'team.manage_members']
        for perm_code in team_permissions:
            try:
                # Filter by tenant to avoid duplicates
                permission = PermissionRegistry.objects.filter(
                    permission_code=perm_code,
                    tenant=profile.tenant
                ).first()
                
                if permission:
                    group_perm, created = PermissionGroupPermission.objects.get_or_create(
                        group=team_group,
                        permission=permission,
                        defaults={'permission_level': 'granted'}
                    )
                    print(f'Added {perm_code} to group (created: {created})')
                else:
                    print(f'Permission {perm_code} not found in registry for tenant {profile.tenant.organization_name}')
            except Exception as e:
                print(f'Error adding permission {perm_code}: {e}')
        
        # Assign user to team management group
        assignment, created = UserPermissionGroupAssignment.objects.get_or_create(
            user_profile=profile,
            group=team_group,
            defaults={
                'assigned_by': user,
                'is_active': True
            }
        )
        print(f'User assigned to team group (created: {created})')
        
        # Check user's effective permissions
        rbac_service = TenantRBACService(profile.tenant)
        effective_perms = rbac_service.get_user_effective_permissions(profile, force_refresh=True)
        user_permissions = list(effective_perms.get('permissions', {}).keys())
        print(f'User permissions: {user_permissions}')
        
        # Check if team.create permission is present
        if 'team.create' in user_permissions:
            print('SUCCESS: User now has team.create permission!')
        else:
            print('WARNING: team.create permission not found in user permissions')
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    assign_team_permissions()
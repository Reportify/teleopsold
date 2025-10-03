#!/usr/bin/env python
"""
Script to setup team permissions for the correct tenant (Vodafone Idea Limited (MPCG))
"""
import os
import sys
import django

# Add the project root to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import (
    Tenant, TenantDesignation, PermissionRegistry, 
    DesignationBasePermission, PermissionGroup
)

def setup_team_permissions():
    try:
        # Get the correct tenant where admin user is assigned
        tenant = Tenant.objects.get(organization_name="Vodafone Idea Limited (MPCG)")
        print(f"🏢 Working with tenant: {tenant.organization_name}")
        
        # Create or get Team Management permission group
        team_group, created = PermissionGroup.objects.get_or_create(
            tenant=tenant,
            group_name="Team Management",
            defaults={
                'group_code': 'team_management',
                'description': 'Permissions related to team management operations',
                'group_type': 'functional'
            }
        )
        if created:
            print(f"✅ Created permission group: {team_group.group_name}")
        else:
            print(f"📋 Using existing permission group: {team_group.group_name}")
        
        # Define team permissions
        team_permissions = [
            {
                'permission_code': 'team.read',
                'permission_name': 'View Teams',
                'description': 'Permission to view teams and team information'
            },
            {
                'permission_code': 'team.create',
                'permission_name': 'Create Teams',
                'description': 'Permission to create new teams'
            },
            {
                'permission_code': 'team.update',
                'permission_name': 'Edit Teams',
                'description': 'Permission to edit existing teams'
            },
            {
                'permission_code': 'team.delete',
                'permission_name': 'Delete Teams',
                'description': 'Permission to delete teams'
            },
            {
                'permission_code': 'team.manage_members',
                'permission_name': 'Manage Team Members',
                'description': 'Permission to add/remove team members'
            }
        ]
        
        # Create permissions in PermissionRegistry
        created_permissions = []
        for perm_data in team_permissions:
            permission, created = PermissionRegistry.objects.get_or_create(
                tenant=tenant,
                permission_code=perm_data['permission_code'],
                defaults={
                    'permission_name': perm_data['permission_name'],
                    'description': perm_data['description'],
                    'permission_category': 'Team Management',
                    'is_active': True
                }
            )
            created_permissions.append(permission)
            if created:
                print(f"✅ Created permission: {permission.permission_code} - {permission.permission_name}")
            else:
                print(f"📋 Using existing permission: {permission.permission_code} - {permission.permission_name}")
        
        # Get Administrator designation for the correct tenant
        try:
            admin_designation = TenantDesignation.objects.get(
                tenant=tenant,
                designation_name='Administrator'
            )
            print(f"👤 Found Administrator designation: {admin_designation.designation_name}")
        except TenantDesignation.DoesNotExist:
            print(f"❌ Administrator designation not found for tenant: {tenant.organization_name}")
            return
        
        # Assign all team permissions to Administrator designation
        assigned_count = 0
        for permission in created_permissions:
            assignment, created = DesignationBasePermission.objects.get_or_create(
                designation=admin_designation,
                permission=permission,
                defaults={'permission_level': 'granted'}
            )
            if created:
                print(f"✅ Assigned permission {permission.permission_code} to {admin_designation.designation_name}")
                assigned_count += 1
            else:
                # Update existing assignment to ensure it's granted
                if assignment.permission_level != 'granted':
                    assignment.permission_level = 'granted'
                    assignment.save()
                    print(f"🔄 Updated permission {permission.permission_code} for {admin_designation.designation_name}")
                    assigned_count += 1
                else:
                    print(f"📋 Permission {permission.permission_code} already assigned to {admin_designation.designation_name}")
        
        print(f"\n🎉 Team permissions setup completed!")
        print(f"📊 Summary:")
        print(f"  - Tenant: {tenant.organization_name}")
        print(f"  - Designation: {admin_designation.designation_name}")
        print(f"  - Permissions created/updated: {len(created_permissions)}")
        print(f"  - Assignments created/updated: {assigned_count}")
        
        # Verify assignments
        print(f"\n🔍 Verification:")
        base_permissions = DesignationBasePermission.objects.filter(
            designation=admin_designation,
            permission__permission_code__startswith='team.'
        )
        print(f"Total team permissions assigned: {base_permissions.count()}")
        for bp in base_permissions:
            print(f"  - {bp.permission.permission_code}: {'✅ granted' if bp.permission_level == 'granted' else '❌ denied'}")
        
    except Exception as e:
        print(f"❌ Error setting up team permissions: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    setup_team_permissions()
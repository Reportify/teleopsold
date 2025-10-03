#!/usr/bin/env python
"""
Script to create team permissions and assign them to the Administrator designation
"""
import os
import sys
import django

# Add the project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import (
    Tenant, TenantDesignation, PermissionRegistry, 
    DesignationBasePermission, PermissionCategory
)
from apps.users.models import User

def setup_team_permissions():
    """Create team permissions and assign them to Administrator designation"""
    try:
        # Get the first tenant
        tenant = Tenant.objects.first()
        if not tenant:
            print("❌ No tenant found")
            return
        
        print(f"🏢 Working with tenant: {tenant.organization_name}")
        
        # Get or create permission category for teams
        team_category, created = PermissionCategory.objects.get_or_create(
            tenant=tenant,
            category_name='Team Management',
            defaults={
                'category_code': 'team_management',
                'description': 'Permissions related to team management',
                'sort_order': 10,
                'is_active': True
            }
        )
        print(f"📂 Permission category: {team_category.category_name} (created: {created})")
        
        # Define team permissions
        team_permissions = [
            {
                'permission_name': 'View Teams',
                'permission_code': 'team.read',
                'description': 'Ability to view team information',
                'permission_type': 'access'
            },
            {
                'permission_name': 'Create Teams',
                'permission_code': 'team.create',
                'description': 'Ability to create new teams',
                'permission_type': 'action'
            },
            {
                'permission_name': 'Update Teams',
                'permission_code': 'team.update',
                'description': 'Ability to update team information',
                'permission_type': 'action'
            },
            {
                'permission_name': 'Delete Teams',
                'permission_code': 'team.delete',
                'description': 'Ability to delete teams',
                'permission_type': 'action'
            },
            {
                'permission_name': 'Manage Team Members',
                'permission_code': 'team.manage_members',
                'description': 'Ability to add/remove team members',
                'permission_type': 'management'
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
                    'permission_category': 'team_management',
                    'description': perm_data['description'],
                    'permission_type': perm_data['permission_type'],
                    'business_template': 'full_access',
                    'is_system_permission': False,
                    'requires_scope': False,
                    'is_delegatable': True,
                    'risk_level': 'medium',
                    'resource_type': 'team',
                    'effect': 'allow',
                    'is_active': True,
                    'is_auditable': True
                }
            )
            if created:
                created_permissions.append(permission)
            print(f"✅ Permission: {permission.permission_name} (created: {created})")
        
        # Get the Administrator designation
        admin_designation = TenantDesignation.objects.filter(
            tenant=tenant,
            designation_code='ADMIN'
        ).first()
        
        if not admin_designation:
            print("❌ Administrator designation not found")
            return
        
        print(f"👑 Found designation: {admin_designation.designation_name}")
        
        # Assign permissions to Administrator designation
        assigned_permissions = []
        for permission in PermissionRegistry.objects.filter(
            tenant=tenant,
            permission_code__startswith='team.'
        ):
            designation_permission, created = DesignationBasePermission.objects.get_or_create(
                designation=admin_designation,
                permission=permission,
                defaults={
                    'permission_level': 'granted',
                    'scope_configuration': {},
                    'conditions': {},
                    'geographic_scope': [],
                    'functional_scope': [],
                    'temporal_scope': {},
                    'is_inherited': True,
                    'is_mandatory': False,
                    'priority_level': 0,
                    'is_active': True
                }
            )
            if created:
                assigned_permissions.append(designation_permission)
            print(f"🔗 Assigned: {permission.permission_name} to {admin_designation.designation_name} (created: {created})")
        
        print(f"✅ Successfully set up {len(created_permissions)} permissions and assigned {len(assigned_permissions)} to Administrator designation!")
        
    except Exception as e:
        print(f"❌ Error setting up team permissions: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    setup_team_permissions()
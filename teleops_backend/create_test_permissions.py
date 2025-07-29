#!/usr/bin/env python3
"""
Script to create basic permissions and assign them to non-admin users for testing.
This will help verify that the permission system works when users actually have permissions.
"""

import os
import sys
import django

# Add the project path
sys.path.append('/i%3A/teleops/teleops_backend')
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

django.setup()

from django.utils import timezone
from apps.tenants.models import (
    Tenant, TenantUserProfile, UserDesignationAssignment, 
    TenantDesignation, DesignationBasePermission, PermissionRegistry
)

def create_test_permissions():
    """Create basic permissions and assign them to users for testing."""
    print("🔧 SETTING UP TEST PERMISSIONS")
    print("=" * 50)
    
    try:
        # Get the first tenant
        tenant = Tenant.objects.filter(is_active=True).first()
        if not tenant:
            print("❌ No active tenant found")
            return
            
        print(f"✅ Working with tenant: {tenant.organization_name}")
        
        # Get all users
        users = TenantUserProfile.objects.filter(
            tenant=tenant,
            is_active=True
        ).select_related('user')
        
        print(f"✅ Found {len(users)} users")
        
        # Check existing data
        print(f"\n📊 CURRENT DATA:")
        total_permissions = PermissionRegistry.objects.filter(tenant=tenant, is_active=True).count()
        total_designations = TenantDesignation.objects.filter(tenant=tenant, is_active=True).count()
        total_assignments = UserDesignationAssignment.objects.filter(
            user_profile__tenant=tenant, is_active=True
        ).count()
        
        print(f"   - Permissions in registry: {total_permissions}")
        print(f"   - Designations: {total_designations}")
        print(f"   - User assignments: {total_assignments}")
        
        # Create a basic permission if none exist
        if total_permissions == 0:
            print("\n🔨 Creating basic permissions...")
            
            basic_perms = [
                ('site_management.view_sites', 'View Sites', 'Site Management'),
                ('project_management.view_projects', 'View Projects', 'Project Management'),
                ('user_management.view_users', 'View Users', 'User Management'),
            ]
            
            for perm_code, perm_name, category in basic_perms:
                permission, created = PermissionRegistry.objects.get_or_create(
                    tenant=tenant,
                    permission_code=perm_code,
                    defaults={
                        'permission_name': perm_name,
                        'permission_category': category,
                        'permission_type': 'access',
                        'risk_level': 'low',
                        'is_active': True
                    }
                )
                if created:
                    print(f"   ✅ Created permission: {perm_name}")
        
        # Create a basic designation if none exist
        if total_designations == 0:
            print("\n🔨 Creating basic designations...")
            
            basic_designations = [
                ('basic_user', 'Basic User', 'Standard user with basic permissions'),
                ('project_viewer', 'Project Viewer', 'Can view projects and sites'),
            ]
            
            for code, name, desc in basic_designations:
                designation, created = TenantDesignation.objects.get_or_create(
                    tenant=tenant,
                    designation_code=code,
                    defaults={
                        'designation_name': name,
                        'description': desc,
                        'is_active': True
                    }
                )
                if created:
                    print(f"   ✅ Created designation: {name}")
        
        # Get non-admin users without assignments
        non_admin_users = []
        for user in users:
            is_admin = UserDesignationAssignment.objects.filter(
                user_profile=user,
                is_active=True,
                designation__designation_code__icontains='admin'
            ).exists()
            
            has_assignments = UserDesignationAssignment.objects.filter(
                user_profile=user,
                is_active=True
            ).exists()
            
            if not is_admin and not has_assignments:
                non_admin_users.append(user)
        
        if non_admin_users:
            print(f"\n🔨 Assigning basic designation to {len(non_admin_users)} users...")
            
            # Get basic designation
            basic_designation = TenantDesignation.objects.filter(
                tenant=tenant,
                designation_code='basic_user',
                is_active=True
            ).first()
            
            if basic_designation:
                for user in non_admin_users:
                    assignment, created = UserDesignationAssignment.objects.get_or_create(
                        user_profile=user,
                        designation=basic_designation,
                        defaults={
                            'is_active': True,
                            'assignment_status': 'Active',
                            'effective_from': timezone.now().date()
                        }
                    )
                    if created:
                        print(f"   ✅ Assigned {user.user.email} to Basic User designation")
        
        # Assign permissions to basic designation
        basic_designation = TenantDesignation.objects.filter(
            tenant=tenant,
            designation_code='basic_user',
            is_active=True
        ).first()
        
        if basic_designation:
            basic_permissions = PermissionRegistry.objects.filter(
                tenant=tenant,
                permission_code__in=[
                    'site_management.view_sites',
                    'project_management.view_projects'
                ],
                is_active=True
            )
            
            print(f"\n🔨 Assigning permissions to Basic User designation...")
            for permission in basic_permissions:
                assignment, created = DesignationBasePermission.objects.get_or_create(
                    designation=basic_designation,
                    permission=permission,
                    defaults={
                        'permission_level': 'granted',
                        'is_active': True
                    }
                )
                if created:
                    print(f"   ✅ Assigned {permission.permission_name} to Basic User")
        
        print(f"\n🎉 Setup complete! Now test the permission dashboard.")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_test_permissions()
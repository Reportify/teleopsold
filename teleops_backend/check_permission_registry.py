#!/usr/bin/env python
"""
Script to check what permissions exist in PermissionRegistry and assignments
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
    DesignationBasePermission, PermissionCategory
)

def check_permission_registry():
    try:
        # Get the first tenant
        tenant = Tenant.objects.first()
        if not tenant:
            print("❌ No tenant found")
            return
        
        print(f"🏢 Checking permissions for tenant: {tenant.organization_name}")
        
        # Check PermissionRegistry
        print("\n📋 PermissionRegistry entries:")
        permissions = PermissionRegistry.objects.filter(tenant=tenant)
        print(f"Total permissions: {permissions.count()}")
        
        team_permissions = permissions.filter(permission_code__startswith='team.')
        print(f"Team permissions: {team_permissions.count()}")
        
        for perm in team_permissions:
            print(f"  - {perm.permission_code}: {perm.permission_name} (active: {perm.is_active})")
        
        # Check Administrator designation
        print("\n👑 Administrator designation:")
        admin_designation = TenantDesignation.objects.filter(
            tenant=tenant,
            designation_code='ADMIN'
        ).first()
        
        if not admin_designation:
            print("❌ Administrator designation not found")
            return
        
        print(f"Found: {admin_designation.designation_name}")
        
        # Check base permission assignments
        print("\n🔗 DesignationBasePermission assignments:")
        base_permissions = DesignationBasePermission.objects.filter(
            designation=admin_designation
        )
        print(f"Total base permissions: {base_permissions.count()}")
        
        team_base_permissions = base_permissions.filter(
            permission__permission_code__startswith='team.'
        )
        print(f"Team base permissions: {team_base_permissions.count()}")
        
        for base_perm in team_base_permissions:
            print(f"  - {base_perm.permission.permission_code}: {base_perm.permission_level} (active: {base_perm.is_active})")
        
        # Check all base permissions for this designation
        print(f"\nAll base permissions for {admin_designation.designation_name}:")
        for base_perm in base_permissions:
            print(f"  - {base_perm.permission.permission_code}: {base_perm.permission_level}")
        
        print("\n✅ Permission registry check completed!")
        
    except Exception as e:
        print(f"❌ Error checking permission registry: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_permission_registry()
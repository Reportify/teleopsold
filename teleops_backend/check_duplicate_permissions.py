#!/usr/bin/env python
"""
Script to check for duplicate permissions in PermissionRegistry
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

from apps.tenants.models import PermissionRegistry
from collections import Counter

def check_duplicate_permissions():
    try:
        # Get all permissions
        permissions = PermissionRegistry.objects.all()
        print(f"📋 Total permissions in registry: {permissions.count()}")
        
        # Check for duplicates by permission_code
        permission_codes = [p.permission_code for p in permissions]
        code_counts = Counter(permission_codes)
        
        print(f"\n🔍 Checking for duplicate permission codes:")
        duplicates_found = False
        
        for code, count in code_counts.items():
            if count > 1:
                duplicates_found = True
                print(f"❌ Duplicate: {code} appears {count} times")
                
                # Show details of duplicates
                duplicate_perms = PermissionRegistry.objects.filter(permission_code=code)
                for perm in duplicate_perms:
                    print(f"   - ID: {perm.id}, Name: {perm.permission_name}, Category: {perm.permission_category}, Tenant: {perm.tenant.organization_name}")
        
        if not duplicates_found:
            print("✅ No duplicate permission codes found")
        
        # Check team permissions specifically
        print(f"\n🏀 Team permissions:")
        team_perms = PermissionRegistry.objects.filter(permission_code__startswith='team.')
        for perm in team_perms:
            print(f"  - {perm.permission_code}: {perm.permission_name} (ID: {perm.id})")
        
        print(f"\n✅ Permission check completed!")
        
    except Exception as e:
        print(f"❌ Error checking permissions: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_duplicate_permissions()
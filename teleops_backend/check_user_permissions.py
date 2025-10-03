#!/usr/bin/env python
"""
Script to check current permissions for the admin user
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

from apps.users.models import User
from apps.tenants.models import TenantUserProfile
from apps.tenants.services.rbac_service import get_rbac_service

def check_user_permissions():
    try:
        # Get admin user
        admin_user = User.objects.get(email='admin@teleops.com')
        print(f"🔍 Checking permissions for user: {admin_user.email}")
        
        # Get tenant profile
        profile = admin_user.tenant_user_profile
        if not profile:
            print("❌ No tenant profile found for admin user")
            return
            
        print(f"📋 Tenant: {profile.tenant.organization_name}")
        
        # Get RBAC service
        rbac_service = get_rbac_service(profile.tenant)
        
        # Get effective permissions
        effective_perms = rbac_service.get_user_effective_permissions(profile)
        
        print("\n📊 Effective Permissions:")
        permissions = effective_perms.get('permissions', {})
        
        if not permissions:
            print("❌ No permissions found")
        else:
            print(f"✅ Found {len(permissions)} permissions:")
            for perm_code, perm_data in permissions.items():
                print(f"  - {perm_code}: {perm_data}")
        
        # Check specifically for team permissions
        print("\n🏆 Team-related permissions:")
        team_perms = {k: v for k, v in permissions.items() if 'team' in k.lower()}
        if team_perms:
            for perm_code, perm_data in team_perms.items():
                print(f"  ✅ {perm_code}: {perm_data}")
        else:
            print("  ❌ No team permissions found")
        
        # Check designations
        print("\n👤 User Designations:")
        designations = profile.designation_assignments.all()
        for assignment in designations:
            designation = assignment.designation
            print(f"  - {designation.designation_name} ({designation.designation_code})")
            
            # Check designation permissions
            print(f"    Base permissions: {designation.base_permissions.count()}")
            for base_perm in designation.base_permissions.all():
                print(f"      - {base_perm.permission.permission_code}")
            
            print(f"    Permission assignments: {designation.permission_assignments.count()}")
            for perm_assignment in designation.permission_assignments.all():
                print(f"      - {perm_assignment.permission.permission_code} ({perm_assignment.permission_level})")
        
        print("\n✅ Permission check completed!")
        
    except Exception as e:
        print(f"❌ Error checking permissions: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_user_permissions()
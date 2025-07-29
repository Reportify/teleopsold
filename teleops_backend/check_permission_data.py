#!/usr/bin/env python3
"""
Quick diagnostic script to check permission data state
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.append('.')
django.setup()

from apps.tenants.models import (
    Tenant, TenantUserProfile, UserDesignationAssignment, 
    TenantDesignation, DesignationBasePermission, PermissionRegistry
)

def check_data():
    print("🔍 CHECKING PERMISSION DATA STATE")
    print("=" * 50)
    
    # Get first tenant
    tenant = Tenant.objects.filter(is_active=True).first()
    if not tenant:
        print("❌ No active tenant found")
        return
        
    print(f"✅ Tenant: {tenant.organization_name}")
    
    # Check counts
    users_count = TenantUserProfile.objects.filter(tenant=tenant, is_active=True).count()
    permissions_count = PermissionRegistry.objects.filter(tenant=tenant, is_active=True).count()
    designations_count = TenantDesignation.objects.filter(tenant=tenant, is_active=True).count()
    assignments_count = UserDesignationAssignment.objects.filter(user_profile__tenant=tenant, is_active=True).count()
    designation_perms_count = DesignationBasePermission.objects.filter(designation__tenant=tenant, is_active=True).count()
    
    print(f"📊 DATA COUNTS:")
    print(f"   Users: {users_count}")
    print(f"   Permissions: {permissions_count}")
    print(f"   Designations: {designations_count}")
    print(f"   User-Designation Assignments: {assignments_count}")
    print(f"   Designation-Permission Assignments: {designation_perms_count}")
    
    # Check specific users
    print(f"\n👥 USER DETAILS:")
    users = TenantUserProfile.objects.filter(tenant=tenant, is_active=True).select_related('user')
    for user in users:
        assignments = UserDesignationAssignment.objects.filter(user_profile=user, is_active=True).count()
        print(f"   {user.user.email}: {assignments} designation assignments")
    
    # Check what's missing
    print(f"\n🚨 ISSUES DETECTED:")
    if permissions_count == 0:
        print("   ❌ No permissions in registry")
    if designations_count == 0:
        print("   ❌ No designations exist")
    if assignments_count == 0:
        print("   ❌ No users assigned to designations")
    if designation_perms_count == 0:
        print("   ❌ No permissions assigned to designations")
    
    if permissions_count > 0 and designations_count > 0 and assignments_count > 0 and designation_perms_count > 0:
        print("   ✅ All data structures exist - issue might be elsewhere")

if __name__ == "__main__":
    check_data()
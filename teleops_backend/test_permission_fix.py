#!/usr/bin/env python3
"""
Test script to validate the permission bleeding fix.
Run this script to verify that non-administrator users now get their correct permissions.
"""

import os
import sys
import django

# Add the project path
sys.path.append('/i%3A/teleops/teleops_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

django.setup()

from apps.tenants.models import Tenant, TenantUserProfile
from apps.tenants.services import get_rbac_service

def test_permission_fix():
    """Test that permission bleeding is fixed."""
    print("🔍 Testing Permission Bleeding Fix")
    print("=" * 50)
    
    try:
        # Get the first tenant
        tenant = Tenant.objects.filter(is_active=True).first()
        if not tenant:
            print("❌ No active tenant found")
            return
            
        print(f"✅ Testing with tenant: {tenant.organization_name}")
        
        # Get RBAC service
        rbac_service = get_rbac_service(tenant)
        
        # Get all users
        users = TenantUserProfile.objects.filter(
            tenant=tenant,
            is_active=True
        ).select_related('user')[:5]  # Test first 5 users
        
        print(f"✅ Found {len(users)} users to test")
        
        results = []
        for user in users:
            print(f"\n🔎 Testing user: {user.user.get_full_name()} ({user.user.email})")
            
            # Test with force_refresh=True (the fix)
            effective_perms = rbac_service.get_user_effective_permissions(user, force_refresh=True)
            perm_count = len(effective_perms.get('permissions', {}))
            is_admin = rbac_service._is_administrator(user)
            
            results.append({
                'user': user.user.get_full_name(),
                'email': user.user.email,
                'permission_count': perm_count,
                'is_admin': is_admin
            })
            
            print(f"   📊 Permission count: {perm_count}")
            print(f"   👑 Is administrator: {is_admin}")
            
        print("\n📋 SUMMARY RESULTS:")
        print("-" * 30)
        for result in results:
            status = "✅ FIXED" if result['permission_count'] > 0 or result['is_admin'] else "❌ STILL BROKEN"
            print(f"{result['user']}: {result['permission_count']} permissions {status}")
            
        # Check if non-admin users have permissions
        non_admin_users = [r for r in results if not r['is_admin']]
        users_with_perms = [r for r in non_admin_users if r['permission_count'] > 0]
        
        if len(users_with_perms) > 0:
            print(f"\n🎉 SUCCESS! {len(users_with_perms)}/{len(non_admin_users)} non-admin users have permissions")
        else:
            print(f"\n❌ ISSUE: No non-admin users have permissions")
            
    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_permission_fix()
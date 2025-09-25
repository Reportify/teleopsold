#!/usr/bin/env python
"""
Test script to verify that site_code is now tenant-specific
and multiple tenants can have sites with the same site_code
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.sites.models import Site
from apps.tenants.models import Tenant
from django.db import transaction, IntegrityError

User = get_user_model()

def test_site_tenant_isolation():
    """Test that multiple tenants can have sites with the same site_code"""
    
    print("=== TESTING SITE TENANT ISOLATION ===")
    
    try:
        # Get existing tenants
        tenants = Tenant.objects.all()[:2]  # Get first 2 tenants
        
        if len(tenants) < 2:
            print("ERROR: Need at least 2 tenants for testing")
            return
            
        tenant1, tenant2 = tenants[0], tenants[1]
        print(f"Found tenants:")
        print(f"  - Tenant 1: {tenant1.organization_name} (ID: {tenant1.id})")
        print(f"  - Tenant 2: {tenant2.organization_name} (ID: {tenant2.id})")
        
        # Get a test user
        test_user = User.objects.first()
        if not test_user:
            print("ERROR: No users found in database")
            return
            
        # Test site code that should be allowed for both tenants
        test_site_code = "TEST_COMMON_SITE"
        
        print(f"\n=== TESTING COMMON SITE CODE: {test_site_code} ===")
        
        # Create site for tenant 1
        try:
            site1 = Site.objects.create(
                tenant=tenant1,
                created_by=test_user,
                site_id=f"T1_{test_site_code}",
                global_id=f"GLOBAL_T1_{test_site_code}",
                site_name=f"Tenant1 {test_site_code}",
                town="Mumbai",
                cluster="West Zone",
                latitude=19.0760,
                longitude=72.8777,
                site_code=test_site_code,  # Same site_code
                site_type="tower",
                status="active"
            )
            print(f"✓ Successfully created site for Tenant 1: {site1.site_name}")
            
        except IntegrityError as e:
            print(f"✗ Failed to create site for Tenant 1: {e}")
            return
            
        # Create site for tenant 2 with SAME site_code
        try:
            site2 = Site.objects.create(
                tenant=tenant2,
                created_by=test_user,
                site_id=f"T2_{test_site_code}",
                global_id=f"GLOBAL_T2_{test_site_code}",
                site_name=f"Tenant2 {test_site_code}",
                town="Delhi",
                cluster="North Zone",
                latitude=28.7041,
                longitude=77.1025,
                site_code=test_site_code,  # Same site_code as Tenant 1
                site_type="tower",
                status="active"
            )
            print(f"✓ Successfully created site for Tenant 2: {site2.site_name}")
            
        except IntegrityError as e:
            print(f"✗ Failed to create site for Tenant 2: {e}")
            return
            
        # Verify both sites exist
        tenant1_sites = Site.objects.filter(tenant=tenant1, site_code=test_site_code)
        tenant2_sites = Site.objects.filter(tenant=tenant2, site_code=test_site_code)
        
        print(f"\n=== VERIFICATION ===")
        print(f"Tenant 1 sites with code '{test_site_code}': {tenant1_sites.count()}")
        print(f"Tenant 2 sites with code '{test_site_code}': {tenant2_sites.count()}")
        
        if tenant1_sites.count() == 1 and tenant2_sites.count() == 1:
            print("✓ SUCCESS: Both tenants can have sites with the same site_code!")
            print("✓ The site upload functionality should now work for multiple tenants!")
        else:
            print("✗ FAILURE: Site isolation not working correctly")
            
        # Test that duplicate site_code within same tenant is still prevented
        print(f"\n=== TESTING DUPLICATE PREVENTION WITHIN TENANT ===")
        try:
            duplicate_site = Site.objects.create(
                tenant=tenant1,  # Same tenant
                created_by=test_user,
                site_id=f"T1_DUP_{test_site_code}",
                global_id=f"GLOBAL_T1_DUP_{test_site_code}",
                site_name=f"Tenant1 Duplicate {test_site_code}",
                town="Pune",
                cluster="West Zone",
                latitude=18.5204,
                longitude=73.8567,
                site_code=test_site_code,  # Duplicate within same tenant
                site_type="tower",
                status="active"
            )
            print(f"✗ FAILURE: Duplicate site_code within same tenant was allowed!")
            
        except IntegrityError as e:
            print(f"✓ SUCCESS: Duplicate site_code within same tenant correctly prevented")
            
        print(f"\n=== TEST COMPLETE ===")
        print("Note: Test sites created with site_code 'TEST_COMMON_SITE' can be manually cleaned up if needed.")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_site_tenant_isolation()
#!/usr/bin/env python3
"""
Direct comparison between working individual analysis and broken batch analysis
This will help us identify the exact difference causing the issue.
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.append('.')
django.setup()

from apps.tenants.models import Tenant, TenantUserProfile
from apps.tenants.services import get_rbac_service

def compare_working_vs_broken():
    print("🔍 COMPARING WORKING vs BROKEN PERMISSION CALCULATIONS")
    print("=" * 70)
    
    # Get tenant and users
    tenant = Tenant.objects.filter(is_active=True).first()
    if not tenant:
        print("❌ No active tenant found")
        return
        
    print(f"✅ Tenant: {tenant.organization_name}")
    
    # Get a non-admin user for testing
    users = TenantUserProfile.objects.filter(tenant=tenant, is_active=True).select_related('user')
    test_user = None
    
    rbac_service = get_rbac_service(tenant)
    
    for user in users:
        if not rbac_service._is_administrator(user):
            test_user = user
            break
    
    if not test_user:
        print("❌ No non-admin user found for testing")
        return
        
    print(f"🧪 Testing with user: {test_user.user.email}")
    
    # METHOD 1: Individual Analysis (WORKING) - Exact copy from _get_user_analysis
    print(f"\n1️⃣ INDIVIDUAL ANALYSIS (WORKING):")
    try:
        rbac_service_individual = get_rbac_service(tenant)
        effective_permissions_individual = rbac_service_individual.get_user_effective_permissions(test_user)
        
        print(f"   Raw permissions count: {len(effective_permissions_individual.get('permissions', {}))}")
        print(f"   Sample permissions: {list(effective_permissions_individual.get('permissions', {}).keys())[:3]}")
        print(f"   Metadata: {effective_permissions_individual.get('metadata', {})}")
        
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # METHOD 2: Batch Analysis (BROKEN) - Exact copy from _get_permission_overview  
    print(f"\n2️⃣ BATCH ANALYSIS (BROKEN):")
    try:
        rbac_service_batch = get_rbac_service(tenant)
        
        # Simulate the batch loop
        for user in [test_user]:  # Single user in batch context
            user_effective_perms_batch = rbac_service_batch.get_user_effective_permissions(user)
            
            print(f"   Raw permissions count: {len(user_effective_perms_batch.get('permissions', {}))}")
            print(f"   Sample permissions: {list(user_effective_perms_batch.get('permissions', {}).keys())[:3]}")
            print(f"   Metadata: {user_effective_perms_batch.get('metadata', {})}")
    
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    
    # METHOD 3: Deep comparison
    print(f"\n3️⃣ DEEP COMPARISON:")
    
    # Compare raw effective permissions objects
    if 'effective_permissions_individual' in locals() and 'user_effective_perms_batch' in locals():
        print(f"   Individual == Batch: {effective_permissions_individual == user_effective_perms_batch}")
        
        # Compare each component
        ind_perms = effective_permissions_individual.get('permissions', {})
        batch_perms = user_effective_perms_batch.get('permissions', {})
        
        print(f"   Permissions dict equal: {ind_perms == batch_perms}")
        print(f"   Individual keys: {len(ind_perms)} - {list(ind_perms.keys())[:2]}")
        print(f"   Batch keys: {len(batch_perms)} - {list(batch_perms.keys())[:2]}")
        
        if ind_perms != batch_perms:
            print(f"   🔍 DIFFERENCE FOUND IN PERMISSIONS DICT!")
            
    # METHOD 4: Test different RBAC service instances
    print(f"\n4️⃣ RBAC SERVICE INSTANCE TEST:")
    
    service1 = get_rbac_service(tenant)
    service2 = get_rbac_service(tenant)
    
    print(f"   Same service instance: {service1 is service2}")
    print(f"   Service1 tenant: {service1.tenant.id}")
    print(f"   Service2 tenant: {service2.tenant.id}")
    
    perms1 = service1.get_user_effective_permissions(test_user)
    perms2 = service2.get_user_effective_permissions(test_user)
    
    print(f"   Service1 permissions: {len(perms1.get('permissions', {}))}")
    print(f"   Service2 permissions: {len(perms2.get('permissions', {}))}")
    print(f"   Same results: {perms1 == perms2}")

if __name__ == "__main__":
    compare_working_vs_broken()
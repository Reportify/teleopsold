#!/usr/bin/env python
import os
import sys
import django

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant, TenantUserProfile
from apps.tasks.allocation_models import TaskAllocation

User = get_user_model()

print("🧪 Simple Authentication Test")
print("=" * 40)

# Check database data
print("\n1. Database Check:")
all_allocations = TaskAllocation.objects.all()
print(f"   Total task allocations: {all_allocations.count()}")

vendor_allocations = TaskAllocation.objects.filter(vendor_relationship_id=1)
print(f"   Allocations with vendor_relationship_id=1: {vendor_allocations.count()}")

# Check users and tenants
print("\n2. User/Tenant Check:")
users_with_profiles = User.objects.filter(tenant_profiles__isnull=False, is_active=True)
print(f"   Users with tenant profiles: {users_with_profiles.count()}")

if users_with_profiles.exists():
    user = users_with_profiles.first()
    tenant_profile = user.tenant_profiles.first()
    tenant = tenant_profile.tenant
    print(f"   Sample user: {user.email}")
    print(f"   User's tenant: {tenant.organization_name}")
    
    # Check tenant-specific allocations
    tenant_allocations = TaskAllocation.objects.filter(task__tenant=tenant)
    print(f"   Allocations for this tenant: {tenant_allocations.count()}")
    
    tenant_vendor_allocations = tenant_allocations.filter(vendor_relationship_id=1)
    print(f"   Tenant allocations with vendor_relationship_id=1: {tenant_vendor_allocations.count()}")
    
    # Test Django client
    print("\n3. Django Client Test:")
    from django.test import Client
    client = Client()
    client.force_login(user)
    
    response = client.get('/api/v1/tasks/task-allocations/?vendor_id=1')
    print(f"   API Response Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   API Results Count: {data.get('count', 0)}")
    else:
        print(f"   API Error: {response.content.decode()[:200]}")
else:
    print("   No users with tenant profiles found!")

print("\n✅ Test completed!")
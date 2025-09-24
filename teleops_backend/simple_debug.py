#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tasks.models import TaskAllocation
from apps.users.models import User
from apps.tenants.models import Tenant

print("🔍 Simple Tenant Debug")
print("=" * 40)

# Check task allocations with vendor_relationship_id=1
allocations = TaskAllocation.objects.filter(vendor_relationship_id=1)
print(f"Task allocations with vendor_relationship_id=1: {allocations.count()}")

for allocation in allocations:
    print(f"\nAllocation ID: {allocation.id}")
    print(f"Task (TaskFromFlow) ID: {allocation.task.id}")
    print(f"Task tenant_id: {allocation.task.tenant_id}")
    print(f"Task tenant name: {allocation.task.tenant.organization_name}")
    print(f"Vendor relationship ID: {allocation.vendor_relationship_id}")
    
    # Check vendor relationship tenant
    if allocation.vendor_relationship:
        print(f"Vendor relationship client_tenant_id: {allocation.vendor_relationship.client_tenant_id}")
        print(f"Vendor relationship client_tenant name: {allocation.vendor_relationship.client_tenant.organization_name}")
        if allocation.vendor_relationship.vendor_tenant:
            print(f"Vendor relationship vendor_tenant_id: {allocation.vendor_relationship.vendor_tenant_id}")
            print(f"Vendor relationship vendor_tenant name: {allocation.vendor_relationship.vendor_tenant.organization_name}")
        else:
            print("No vendor_tenant in relationship (invitation stage)")
    else:
        print("No vendor relationship found")

# Check users and their tenants
print(f"\n📋 Users in system: {User.objects.count()}")
users = User.objects.all()[:3]  # First 3 users
for user in users:
    print(f"\nUser: {user.email}")
    print(f"User ID: {user.id}")
    
    # Check tenant profile
    if hasattr(user, 'tenant_profile') and user.tenant_profile:
        print(f"User tenant_id: {user.tenant_profile.tenant_id}")
        print(f"User tenant name: {user.tenant_profile.tenant.organization_name}")
    else:
        print("No tenant profile")

# Check tenants
print(f"\n🏢 Tenants in system: {Tenant.objects.count()}")
tenants = Tenant.objects.all()[:3]  # First 3 tenants
for tenant in tenants:
    print(f"\nTenant: {tenant.organization_name}")
    print(f"Tenant ID: {tenant.id}")

print("\n✅ Debug completed!")
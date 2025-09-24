#!/usr/bin/env python
"""
Test API access after fixing tenant profiles
"""

import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import TenantUserProfile
from apps.tasks.models import TaskAllocation
from apps.tasks.views import TaskAllocationViewSet
from django.test import RequestFactory
from unittest.mock import Mock

User = get_user_model()

def test_task_allocation_access():
    print("🧪 Testing Task Allocation API Access")
    print("=" * 50)
    
    # Get a user with the correct tenant profile
    try:
        user = User.objects.get(email='ravi@vodafone.com')
        print(f"✅ Found test user: {user.email}")
        
        # Check their tenant profile
        profile = user.tenant_user_profile
        print(f"✅ User tenant: {profile.tenant.organization_name}")
        print(f"✅ User tenant ID: {profile.tenant.id}")
        
    except User.DoesNotExist:
        print("❌ Test user not found")
        return
    except Exception as e:
        print(f"❌ Error getting user profile: {str(e)}")
        return
    
    # Check task allocations for this tenant
    tenant_allocations = TaskAllocation.objects.filter(
        task__tenant=profile.tenant
    )
    print(f"📋 Task allocations for tenant: {tenant_allocations.count()}")
    
    # Test the viewset filtering
    print("\n🔍 Testing ViewSet Filtering:")
    print("-" * 30)
    
    # Create a mock request
    factory = RequestFactory()
    request = factory.get('/api/task-allocations/')
    request.user = user
    
    # Create viewset instance
    viewset = TaskAllocationViewSet()
    viewset.request = request
    
    # Get queryset
    queryset = viewset.get_queryset()
    print(f"✅ ViewSet queryset count: {queryset.count()}")
    
    # List the allocations
    for allocation in queryset:
        print(f"  - Allocation ID: {allocation.id}")
        print(f"    Task: {allocation.task.task_name}")
        print(f"    Tenant: {allocation.task.tenant.organization_name}")
        print(f"    Vendor Relationship ID: {allocation.vendor_relationship_id}")
    
    print(f"\n🎉 Test completed! User can now access {queryset.count()} task allocations")

if __name__ == "__main__":
    test_task_allocation_access()
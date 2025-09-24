#!/usr/bin/env python
"""
Script to test the API filtering logic directly
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tasks.models import TaskAllocation
from apps.tenants.models import Tenant

def test_filtering():
    print("=== Testing API Filtering Logic ===")
    
    # Get the correct tenant
    correct_tenant_id = 'd7ab45d9-6e85-40aa-a1f3-896582995c6f'
    wrong_tenant_id = '0c99e1ac-e19b-47bb-99b2-c16a33440ecf'
    
    print(f"Correct tenant ID: {correct_tenant_id}")
    print(f"Wrong tenant ID (from API request): {wrong_tenant_id}")
    
    # Test with correct tenant
    print("\n1. Testing with CORRECT tenant ID:")
    correct_tenant = Tenant.objects.filter(id=correct_tenant_id).first()
    if correct_tenant:
        print(f"   Tenant found: {correct_tenant.organization_name}")
        
        # Simulate the API filtering logic
        queryset = TaskAllocation.objects.filter(task__tenant=correct_tenant)
        vendor_id = 1
        queryset = queryset.filter(vendor_relationship_id=vendor_id)
        
        print(f"   Task allocations found: {queryset.count()}")
        for allocation in queryset:
            print(f"   - Allocation ID: {allocation.id}")
            print(f"     Task: {allocation.task.task_name}")
            print(f"     Vendor Relationship ID: {allocation.vendor_relationship_id}")
    else:
        print("   Tenant not found!")
    
    # Test with wrong tenant
    print("\n2. Testing with WRONG tenant ID:")
    wrong_tenant = Tenant.objects.filter(id=wrong_tenant_id).first()
    if wrong_tenant:
        print(f"   Tenant found: {wrong_tenant.organization_name}")
        
        # Simulate the API filtering logic
        queryset = TaskAllocation.objects.filter(task__tenant=wrong_tenant)
        vendor_id = 1
        queryset = queryset.filter(vendor_relationship_id=vendor_id)
        
        print(f"   Task allocations found: {queryset.count()}")
        for allocation in queryset:
            print(f"   - Allocation ID: {allocation.id}")
            print(f"     Task: {allocation.task.task_name}")
            print(f"     Vendor Relationship ID: {allocation.vendor_relationship_id}")
    else:
        print("   Tenant not found!")
    
    # Show all tenants for reference
    print("\n3. All tenants in database:")
    for tenant in Tenant.objects.all():
        print(f"   - ID: {tenant.id}")
        print(f"     Name: {tenant.organization_name}")

if __name__ == "__main__":
    test_filtering()
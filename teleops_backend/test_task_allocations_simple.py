#!/usr/bin/env python
import os
import sys
import django
from django.conf import settings

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tasks.models import TaskAllocation

def test_task_allocations():
    print("=== Testing Task Allocations Query ===")
    
    # Test 1: Get all task allocations
    print("\n1. All task allocations:")
    all_allocations = TaskAllocation.objects.all()
    print(f"Total allocations: {all_allocations.count()}")
    
    for allocation in all_allocations:
        print(f"  - ID: {allocation.id}")
        print(f"    Task: {allocation.task.task_name if allocation.task else 'N/A'}")
        print(f"    Vendor Relationship ID: {allocation.vendor_relationship.id if allocation.vendor_relationship else 'N/A'}")
        print(f"    Vendor Name: {allocation.vendor_relationship.vendor_tenant.organization_name if allocation.vendor_relationship and allocation.vendor_relationship.vendor_tenant else 'N/A'}")
        print(f"    Status: {allocation.status}")
        print()
    
    # Test 2: Filter by vendor_relationship_id = 1
    print("\n2. Allocations for vendor_relationship_id = 1:")
    verveland_allocations = TaskAllocation.objects.filter(vendor_relationship_id=1)
    print(f"Verveland allocations: {verveland_allocations.count()}")
    
    for allocation in verveland_allocations:
        print(f"  - ID: {allocation.id}")
        print(f"    Task: {allocation.task.task_name if allocation.task else 'N/A'}")
        print(f"    Vendor Relationship ID: {allocation.vendor_relationship.id}")
        print(f"    Status: {allocation.status}")
        print()
    
    # Test 3: Check what the API endpoint should return
    print("\n3. API endpoint simulation:")
    print("URL: /api/v1/tasks/task-allocations/?vendor_id=1")
    
    # This is what the API should filter by
    api_allocations = TaskAllocation.objects.filter(vendor_relationship_id=1)
    print(f"Expected API results: {api_allocations.count()}")
    
    if api_allocations.exists():
        print("API should return:")
        for allocation in api_allocations:
            print(f"  - Task: {allocation.task.task_name}")
            print(f"    Project: {allocation.task.project.name if allocation.task and allocation.task.project else 'N/A'}")
            print(f"    Status: {allocation.status}")
            print(f"    Vendor: {allocation.vendor_relationship.vendor_tenant.organization_name if allocation.vendor_relationship.vendor_tenant else 'N/A'}")
    else:
        print("API should return empty results")

if __name__ == "__main__":
    test_task_allocations()
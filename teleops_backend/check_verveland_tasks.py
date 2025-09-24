#!/usr/bin/env python
"""
Script to check task allocations for Verveland vendor
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
from apps.tenants.models import ClientVendorRelationship

def main():
    print("=== Checking Verveland Task Allocations ===")
    
    # First, check if Verveland exists in vendor relationships
    print("\n1. Checking Verveland vendor relationships...")
    verveland_relationships = ClientVendorRelationship.objects.filter(
        vendor_tenant__organization_name__icontains="verveland"
    )
    
    print(f"Found {verveland_relationships.count()} Verveland relationships:")
    for rel in verveland_relationships:
        print(f"  - ID: {rel.id}")
        print(f"    Vendor: {rel.vendor_tenant.organization_name if rel.vendor_tenant else 'No vendor tenant'}")
        print(f"    Client: {rel.client_tenant.organization_name}")
        print(f"    Status: {rel.relationship_status}")
        print(f"    Active: {rel.is_active}")
        print(f"    Vendor Code: {rel.vendor_code}")
        print()
    
    # Check task allocations for Verveland
    print("\n2. Checking task allocations...")
    if verveland_relationships.exists():
        verveland_rel_ids = list(verveland_relationships.values_list('id', flat=True))
        print(f"Looking for allocations with vendor_id in: {verveland_rel_ids}")
        
        allocations = TaskAllocation.objects.filter(
            vendor_relationship_id__in=verveland_rel_ids
        )
        
        print(f"Found {allocations.count()} task allocations for Verveland:")
        for allocation in allocations:
            print(f"  - Allocation ID: {allocation.id}")
            print(f"    Task: {allocation.task.task_name if allocation.task else 'No task'}")
            print(f"    Task ID: {allocation.task.id if allocation.task else 'No task'}")
            print(f"    Task Tenant ID: {allocation.task.tenant.id if allocation.task and allocation.task.tenant else 'No tenant'}")
            print(f"    Task Tenant Name: {allocation.task.tenant.organization_name if allocation.task and allocation.task.tenant else 'No tenant'}")
            print(f"    Status: {allocation.status}")
            print(f"    Vendor Relationship ID: {allocation.vendor_relationship_id}")
            print(f"    Project: {allocation.task.project.name if allocation.task and allocation.task.project else 'No project'}")
            print(f"    Created: {allocation.created_at}")
            print()
    else:
        print("No Verveland relationships found - cannot check allocations")
    
    # Check all task allocations (for debugging)
    print("\n3. Checking all task allocations...")
    all_allocations = TaskAllocation.objects.all()
    print(f"Total task allocations in database: {all_allocations.count()}")
    
    if all_allocations.count() > 0:
        print("Sample allocations:")
        for allocation in all_allocations[:5]:
            task_name = allocation.task.task_name if allocation.task else 'No task'
            print(f"  - ID: {allocation.id}, Task: {task_name}, Vendor Relationship ID: {allocation.vendor_relationship_id}")
    
    # Check all vendor relationships
    print("\n4. Checking all vendor relationships...")
    all_relationships = ClientVendorRelationship.objects.all()
    print(f"Total vendor relationships: {all_relationships.count()}")
    
    if all_relationships.count() > 0:
        print("All vendor relationships:")
        for rel in all_relationships:
            vendor_name = rel.vendor_tenant.organization_name if rel.vendor_tenant else 'No vendor tenant'
            print(f"  - ID: {rel.id}, Vendor: {vendor_name}, Active: {rel.is_active}, Status: {rel.relationship_status}")

if __name__ == "__main__":
    main()
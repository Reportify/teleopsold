#!/usr/bin/env python
"""
Debug script to trace API filtering logic step by step
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
from apps.tenants.models import ClientVendorRelationship, Tenant
from apps.users.models import User
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken

def debug_api_filtering():
    print("=== DEBUGGING API FILTERING LOGIC ===")
    
    # Step 1: Verify data exists
    print("\n1. Verifying base data...")
    verveland_rel = ClientVendorRelationship.objects.filter(id=1).first()
    if verveland_rel:
        print(f"✅ Verveland relationship exists: ID={verveland_rel.id}")
        print(f"   Vendor: {verveland_rel.vendor_tenant.organization_name}")
        print(f"   Client: {verveland_rel.client_tenant.organization_name}")
        print(f"   Active: {verveland_rel.is_active}")
    else:
        print("❌ Verveland relationship not found")
        return
    
    # Step 2: Check task allocations
    print("\n2. Checking task allocations...")
    allocations = TaskAllocation.objects.filter(vendor_relationship_id=1)
    print(f"Found {allocations.count()} allocations for vendor_relationship_id=1")
    
    for alloc in allocations:
        print(f"  - Allocation ID: {alloc.id}")
        print(f"    Task: {alloc.task.task_name if alloc.task else 'No task'}")
        print(f"    Task Tenant: {alloc.task.tenant.organization_name if alloc.task and alloc.task.tenant else 'No tenant'}")
        print(f"    Status: {alloc.status}")
    
    # Step 3: Simulate the API ViewSet filtering logic
    print("\n3. Simulating API ViewSet filtering...")
    
    # Get the tenant (Vodafone MPCG)
    vodafone = Tenant.objects.get(organization_name="Vodafone Idea Limited (MPCG)")
    print(f"Using tenant: {vodafone.organization_name} (ID: {vodafone.id})")
    
    # Step 3a: Start with base queryset
    base_queryset = TaskAllocation.objects.all()
    print(f"Base queryset count: {base_queryset.count()}")
    
    # Step 3b: Apply tenant filtering (this is what TenantScopedPermission does)
    tenant_filtered = base_queryset.filter(task__tenant=vodafone)
    print(f"After tenant filtering: {tenant_filtered.count()}")
    
    # Step 3c: Apply vendor filtering
    vendor_filtered = tenant_filtered.filter(vendor_relationship_id=1)
    print(f"After vendor filtering: {vendor_filtered.count()}")
    
    # Step 4: Check if the task belongs to the correct tenant
    print("\n4. Checking task-tenant relationships...")
    for alloc in allocations:
        if alloc.task:
            task_tenant = alloc.task.tenant
            print(f"Task '{alloc.task.task_name}' belongs to tenant: {task_tenant.organization_name if task_tenant else 'None'}")
            print(f"Expected tenant: {vodafone.organization_name}")
            print(f"Match: {task_tenant == vodafone if task_tenant else False}")
        else:
            print("Allocation has no task")
    
    # Step 5: Test the actual ViewSet logic
    print("\n5. Testing actual ViewSet logic...")
    
    # Import the ViewSet
    from apps.tasks.views import TaskAllocationViewSet
    
    # Create a mock request
    factory = APIRequestFactory()
    request = factory.get('/api/v1/tasks/task-allocations/?vendor_id=1')
    
    # Set up authentication and tenant context
    user = User.objects.filter(
        tenant_user_profile__tenant=vodafone,
        is_active=True
    ).first()
    
    if user:
        request.user = user
        request.tenant = vodafone
        
        # Create ViewSet instance
        viewset = TaskAllocationViewSet()
        viewset.request = request
        
        # Get the queryset
        queryset = viewset.get_queryset()
        print(f"ViewSet queryset count: {queryset.count()}")
        
        # Print the actual query
        print(f"SQL Query: {queryset.query}")
        
        # Show results
        for alloc in queryset:
            print(f"  - Result: {alloc.id} - {alloc.task.task_name if alloc.task else 'No task'}")
    else:
        print("❌ No user found for testing")
    
    # Step 6: Check for any additional filtering
    print("\n6. Checking for additional filtering conditions...")
    
    # Check if there are any other conditions in the get_queryset method
    print("Checking TaskAllocationViewSet.get_queryset() method...")
    
    # Let's also check if the vendor relationship is active
    print(f"Vendor relationship active: {verveland_rel.is_active}")
    print(f"Vendor relationship status: {verveland_rel.relationship_status}")

if __name__ == "__main__":
    debug_api_filtering()
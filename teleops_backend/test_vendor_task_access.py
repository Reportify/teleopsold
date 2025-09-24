"""
Django management command to test vendor task allocation access.
Run with: python manage.py shell < test_vendor_task_access.py
"""

from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant, ClientVendorRelationship
from apps.tasks.allocation_models import TaskAllocation
from apps.tasks.views import TaskAllocationViewSet
from django.test import RequestFactory
from unittest.mock import Mock

User = get_user_model()

def test_vendor_task_access():
    """Test that vendors can see tasks allocated to them"""
    
    print("=== Testing Vendor Task Allocation Access ===\n")
    
    # Get Verveland tenant
    try:
        verveland_tenant = Tenant.objects.get(id='0c99e1ac-e19b-47bb-99b2-c16a33440ecf')
        print(f"✓ Found Verveland tenant: {verveland_tenant.name}")
        print(f"  - Tenant Type: {verveland_tenant.tenant_type}")
        print(f"  - Tenant ID: {verveland_tenant.id}")
    except Tenant.DoesNotExist:
        print("✗ Verveland tenant not found!")
        return
    
    # Get Vodafone tenant (the client)
    try:
        vodafone_tenant = Tenant.objects.get(id='d7ab45d9-6e85-40aa-a1f3-896582995c6f')
        print(f"✓ Found Vodafone tenant: {vodafone_tenant.name}")
        print(f"  - Tenant Type: {vodafone_tenant.tenant_type}")
        print(f"  - Tenant ID: {vodafone_tenant.id}")
    except Tenant.DoesNotExist:
        print("✗ Vodafone tenant not found!")
        return
    
    print()
    
    # Check vendor relationship
    try:
        relationship = ClientVendorRelationship.objects.get(
            vendor_tenant=verveland_tenant,
            relationship_status='Active'
        )
        print(f"✓ Found active vendor relationship:")
        print(f"  - Relationship ID: {relationship.id}")
        print(f"  - Client: {relationship.client_tenant.name}")
        print(f"  - Vendor: {relationship.vendor_tenant.name}")
        print(f"  - Status: {relationship.relationship_status}")
    except ClientVendorRelationship.DoesNotExist:
        print("✗ No active vendor relationship found!")
        return
    
    print()
    
    # Test the new filtering logic directly
    print("=== Testing New Filtering Logic ===")
    
    # Simulate a request from Verveland tenant
    factory = RequestFactory()
    request = factory.get('/api/v1/tasks/task-allocations/')
    request.tenant = verveland_tenant
    request.user = Mock()  # Mock user for testing
    
    # Create viewset instance and test queryset
    viewset = TaskAllocationViewSet()
    viewset.request = request
    
    # Get queryset using the new logic
    queryset = viewset.get_queryset()
    
    print(f"✓ Queryset generated for Verveland tenant")
    print(f"  - Total task allocations found: {queryset.count()}")
    
    # List the allocations
    for allocation in queryset:
        print(f"  - Allocation ID: {allocation.id}")
        print(f"    Task: {allocation.task.task_name}")
        print(f"    Task Tenant: {allocation.task.tenant.name}")
        print(f"    Vendor Relationship ID: {allocation.vendor_relationship_id}")
        print(f"    Status: {allocation.status}")
        print()
    
    # Test with Vodafone tenant (should only see their own tasks)
    print("=== Testing Client Tenant Access (Vodafone) ===")
    
    request.tenant = vodafone_tenant
    viewset.request = request
    vodafone_queryset = viewset.get_queryset()
    
    print(f"✓ Queryset generated for Vodafone tenant")
    print(f"  - Total task allocations found: {vodafone_queryset.count()}")
    
    for allocation in vodafone_queryset:
        print(f"  - Allocation ID: {allocation.id}")
        print(f"    Task: {allocation.task.task_name}")
        print(f"    Task Tenant: {allocation.task.tenant.name}")
        print(f"    Vendor Relationship ID: {allocation.vendor_relationship_id}")
        print(f"    Status: {allocation.status}")
        print()
    
    # Verify security: Verveland should only see tasks allocated to them
    print("=== Security Verification ===")
    
    verveland_allocations = list(queryset)
    for allocation in verveland_allocations:
        if allocation.vendor_relationship.vendor_tenant != verveland_tenant:
            print(f"✗ SECURITY ISSUE: Verveland can see allocation not assigned to them!")
            print(f"  - Allocation ID: {allocation.id}")
            print(f"  - Actual vendor: {allocation.vendor_relationship.vendor_tenant.name}")
        else:
            print(f"✓ Security OK: Allocation {allocation.id} correctly assigned to Verveland")
    
    print("\n=== Test Complete ===")

# Run the test
test_vendor_task_access()
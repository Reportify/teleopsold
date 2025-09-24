from django.core.management.base import BaseCommand
from apps.tenants.models import Tenant, ClientVendorRelationship
from apps.tasks.allocation_models import TaskAllocation
from django.db.models import Q


class Command(BaseCommand):
    help = 'Test vendor task allocation access after modification'

    def handle(self, *args, **options):
        self.stdout.write("=== Testing Vendor Task Allocation Access ===")
        
        # Get tenants
        try:
            verveland_tenant = Tenant.objects.get(id='0c99e1ac-e19b-47bb-99b2-c16a33440ecf')
            self.stdout.write(f"✓ Found Verveland tenant: {verveland_tenant.organization_name}")
            self.stdout.write(f"  - Tenant Type: {verveland_tenant.tenant_type}")
            self.stdout.write(f"  - Tenant ID: {verveland_tenant.id}")
        except Tenant.DoesNotExist:
            self.stdout.write("✗ Verveland tenant not found")
            return

        try:
            vodafone_tenant = Tenant.objects.get(id='d7ab45d9-6e85-40aa-a1f3-896582995c6f')
            self.stdout.write(f"✓ Found Vodafone tenant: {vodafone_tenant.organization_name}")
            self.stdout.write(f"  - Tenant Type: {vodafone_tenant.tenant_type}")
            self.stdout.write(f"  - Tenant ID: {vodafone_tenant.id}")
        except Tenant.DoesNotExist:
            self.stdout.write("✗ Vodafone tenant not found")
            return

        self.stdout.write()

        # Check vendor relationship
        try:
            relationship = ClientVendorRelationship.objects.get(
                client_tenant=vodafone_tenant,
                vendor_tenant=verveland_tenant,
                relationship_status='Active'
            )
            self.stdout.write(f"✓ Found active vendor relationship:")
            self.stdout.write(f"  - Relationship ID: {relationship.id}")
            self.stdout.write(f"  - Client: {relationship.client_tenant.organization_name}")
            self.stdout.write(f"  - Vendor: {relationship.vendor_tenant.organization_name}")
            self.stdout.write(f"  - Status: {relationship.relationship_status}")
        except ClientVendorRelationship.DoesNotExist:
            self.stdout.write("✗ No active vendor relationship found")
            return

        self.stdout.write()

        # Test the new filtering logic directly
        self.stdout.write("=== Testing New Filtering Logic ===")
        
        # Test 1: Verveland (Vendor) should see tasks allocated to them
        self.stdout.write("1. Testing Verveland (Vendor) access:")
        
        # Get vendor relationships for Verveland
        vendor_relationships = ClientVendorRelationship.objects.filter(
            vendor_tenant=verveland_tenant,
            relationship_status='Active'
        ).values_list('id', flat=True)
        
        # Filter task allocations by vendor relationships
        verveland_allocations = TaskAllocation.objects.filter(
            vendor_relationship_id__in=vendor_relationships
        )
        
        self.stdout.write(f"  - Found {verveland_allocations.count()} task allocations for Verveland")
        for allocation in verveland_allocations:
            self.stdout.write(f"  - Allocation ID: {allocation.id}")
            self.stdout.write(f"    Task: {allocation.task.task_name}")
            self.stdout.write(f"    Task Tenant: {allocation.task.tenant.organization_name}")
            self.stdout.write(f"    Vendor Relationship ID: {allocation.vendor_relationship_id}")
            self.stdout.write(f"    Status: {allocation.status}")

        self.stdout.write()

        # Test 2: Vodafone (Client) should see tasks that belong to their tenant
        self.stdout.write("2. Testing Vodafone (Client) access:")
        
        vodafone_allocations = TaskAllocation.objects.filter(task__tenant=vodafone_tenant)
        
        self.stdout.write(f"  - Found {vodafone_allocations.count()} task allocations for Vodafone")
        for allocation in vodafone_allocations:
            self.stdout.write(f"  - Allocation ID: {allocation.id}")
            self.stdout.write(f"    Task: {allocation.task.task_name}")
            self.stdout.write(f"    Task Tenant: {allocation.task.tenant.organization_name}")
            self.stdout.write(f"    Vendor Relationship ID: {allocation.vendor_relationship_id}")
            self.stdout.write(f"    Status: {allocation.status}")

        self.stdout.write()

        # Test 3: Security check - Verveland should only see allocations assigned to them
        self.stdout.write("3. Security Check:")
        for allocation in verveland_allocations:
            if allocation.vendor_relationship.vendor_tenant != verveland_tenant:
                self.stdout.write(f"✗ SECURITY ISSUE: Verveland can see allocation not assigned to them!")
                self.stdout.write(f"  - Allocation ID: {allocation.id}")
                self.stdout.write(f"  - Actual vendor: {allocation.vendor_relationship.vendor_tenant.organization_name}")
            else:
                self.stdout.write(f"✓ Security OK: Allocation {allocation.id} correctly assigned to Verveland")

        self.stdout.write()

        # Test 4: Verify the fix works - Verveland should now see the MW Dismantle task
        self.stdout.write("4. Verification Test:")
        mw_dismantle_allocations = verveland_allocations.filter(task__task_name__icontains="MW Dismantle")
        
        if mw_dismantle_allocations.exists():
            self.stdout.write("✓ SUCCESS: Verveland can now see MW Dismantle task allocations!")
            for allocation in mw_dismantle_allocations:
                self.stdout.write(f"  - Task: {allocation.task.task_name}")
                self.stdout.write(f"  - Task ID: {allocation.task.id}")
                self.stdout.write(f"  - Allocation ID: {allocation.id}")
        else:
            self.stdout.write("✗ ISSUE: Verveland still cannot see MW Dismantle task allocations")

        self.stdout.write()
        self.stdout.write("=== Test Complete ===")
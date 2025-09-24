#!/usr/bin/env python
"""
Create task allocations for Verveland Technologies tenant
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import Tenant, ClientVendorRelationship
from apps.tasks.models import TaskAllocation, TaskFromFlow, TaskSubActivity
from apps.projects.models import Project
from apps.users.models import User
from apps.sites.models import Site
from django.utils import timezone
import uuid

def create_verveland_allocations():
    print("=== CREATING VERVELAND TASK ALLOCATIONS ===")
    
    # Get tenants
    verveland = Tenant.objects.get(organization_name="Verveland Technologies")
    vodafone = Tenant.objects.get(organization_name="Vodafone Idea Limited (MPCG)")
    
    print(f"Verveland tenant: {verveland.id}")
    print(f"Vodafone tenant: {vodafone.id}")
    
    # Get or create the vendor relationship (Vodafone as client, Verveland as vendor)
    vendor_relationship, created = ClientVendorRelationship.objects.get_or_create(
        client_tenant=vodafone,
        vendor_tenant=verveland,
        defaults={
            'relationship_status': 'active',
            'is_active': True,
            'vendor_code': 'VRV001',
            'communication_allowed': True,
            'contact_access_level': 'full',
            'notes': 'Primary vendor for MW dismantling operations'
        }
    )
    
    if created:
        print(f"✅ Created vendor relationship: ID={vendor_relationship.id}")
    else:
        print(f"✅ Using existing vendor relationship: ID={vendor_relationship.id}")
    
    # Get a user for creating records
    vodafone_user = User.objects.filter(tenant_user_profile__tenant=vodafone).first()
    
    # Get or create a site for the task
    site, created = Site.objects.get_or_create(
        tenant=vodafone,
        site_id="VDF_MW_001",
        defaults={
            'site_name': 'MW Site 001',
            'global_id': 'VDF_MW_001_GLOBAL',
            'town': 'Delhi',
            'cluster': 'North Zone',
            'latitude': 28.6139,
            'longitude': 77.2090,
            'address': 'Delhi, India',
            'status': 'active',
            'created_by': vodafone_user
        }
    )
    
    if created:
        print(f"✅ Created site: {site.site_name}")
    else:
        print(f"✅ Using existing site: {site.site_name}")

    # Get or create a project for Vodafone
    project, created = Project.objects.get_or_create(
        tenant=vodafone,
        name="MW Dismantle Operations",
        defaults={
            'description': 'Microwave dismantling operations across multiple sites',
            'status': 'active',
            'created_by': vodafone_user
        }
    )
    
    if created:
        print(f"✅ Created project: {project.name}")
    else:
        print(f"✅ Using existing project: {project.name}")
    
    # Get or create a task for Vodafone tenant
    task, created = TaskFromFlow.objects.get_or_create(
        tenant=vodafone,
        task_name="MW Site Dismantling - Batch 1",
        defaults={
            'task_id': f'VDF_{timezone.now().year}_MW_001',
            'description': 'Dismantling of microwave equipment at multiple sites',
            'status': 'active',
            'priority': 'high',
            'project': project,
            'created_by': vodafone_user
        }
    )
    
    if created:
        print(f"✅ Created task: {task.task_name}")
    else:
        print(f"✅ Using existing task: {task.task_name}")
    
    # Create task allocation for Verveland
    allocation, created = TaskAllocation.objects.get_or_create(
        task=task,
        vendor_relationship=vendor_relationship,
        defaults={
            'allocation_type': 'vendor',
            'status': 'pending',
            'allocated_by': vodafone_user,
            'allocated_at': timezone.now(),
            'notes': 'Allocated to Verveland Technologies for MW dismantling'
        }
    )
    
    if created:
        print(f"✅ Created task allocation: ID={allocation.id}")
    else:
        print(f"✅ Using existing task allocation: ID={allocation.id}")
    
    # Create some sub-activities
    sub_activities = [
        {
            'name': 'Site Survey and Assessment',
            'description': 'Initial site survey and equipment assessment',
            'activity_type': 'survey'
        },
        {
            'name': 'Equipment Disconnection',
            'description': 'Safely disconnect microwave equipment',
            'activity_type': 'dismantling'
        },
        {
            'name': 'Equipment Removal',
            'description': 'Physical removal of equipment from site',
            'activity_type': 'dismantling'
        },
        {
            'name': 'Site Cleanup',
            'description': 'Clean up site after equipment removal',
            'activity_type': 'cleanup'
        },
        {
            'name': 'Documentation and Reporting',
            'description': 'Complete documentation and submit reports',
            'activity_type': 'documentation'
        }
    ]
    
    print("\n📋 Creating sub-activities...")
    for sub_activity_data in sub_activities:
        sub_activity, created = TaskSubActivity.objects.get_or_create(
            task_from_flow=task,
            activity_name=sub_activity_data['name'],
            defaults={
                'description': sub_activity_data['description'],
                'activity_type': sub_activity_data['activity_type'],
                'status': 'pending',
                'sequence_order': sub_activities.index(sub_activity_data) + 1,
                'assigned_site': site,
                'site_alias': 'MAIN'
            }
        )
        
        if created:
            print(f"  ✅ Created sub-activity: {sub_activity.activity_name}")
        else:
            print(f"  ✅ Using existing sub-activity: {sub_activity.activity_name}")
    
    # Verify the allocation can be seen from Verveland's perspective
    print("\n🔍 Verifying from Verveland's perspective...")
    
    # Check allocations where Verveland is the vendor
    verveland_allocations = TaskAllocation.objects.filter(
        vendor_relationship__vendor_tenant=verveland
    )
    
    print(f"Total allocations for Verveland as vendor: {verveland_allocations.count()}")
    
    for alloc in verveland_allocations:
        print(f"  - Allocation ID: {alloc.id}")
        print(f"    Task: {alloc.task.task_name}")
        print(f"    Client: {alloc.vendor_relationship.client_tenant.organization_name}")
        print(f"    Status: {alloc.status}")
        print(f"    Vendor Relationship ID: {alloc.vendor_relationship.id}")
    
    print(f"\n✅ Setup complete! Verveland should now see task allocations with vendor_id={vendor_relationship.id}")

if __name__ == "__main__":
    create_verveland_allocations()
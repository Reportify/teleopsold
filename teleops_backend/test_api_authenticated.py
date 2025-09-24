#!/usr/bin/env python
"""
Test script for task allocation API with proper authentication
"""

import os
import sys
import django
import requests
import json

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant, TenantUserProfile
from apps.tasks.allocation_models import TaskAllocation

User = get_user_model()

def get_or_create_test_user():
    """Get or create a test user with proper tenant context"""
    try:
        # Try to find an existing user with tenant profile
        user = User.objects.filter(
            tenant_profiles__isnull=False,
            is_active=True
        ).first()
        
        if user:
            print(f"✅ Found existing user: {user.email}")
            tenant_profile = user.tenant_profiles.first()
            tenant = tenant_profile.tenant
            print(f"✅ User belongs to tenant: {tenant.organization_name}")
            return user, tenant
        
        # If no user found, create one
        print("❌ No existing user with tenant profile found")
        print("Please create a user through Django admin or use existing credentials")
        return None, None
        
    except Exception as e:
        print(f"❌ Error finding user: {e}")
        return None, None

def test_with_django_client():
    """Test using Django's test client (bypasses authentication)"""
    print("\n🔧 Testing with Django Test Client (bypasses auth)")
    print("=" * 60)
    
    from django.test import Client
    from django.urls import reverse
    
    client = Client()
    
    # Get a user and tenant
    user, tenant = get_or_create_test_user()
    if not user or not tenant:
        return
    
    # Force login
    client.force_login(user)
    
    # Test the API endpoint
    try:
        # Test without vendor_id
        print("\n1. Testing without vendor_id...")
        response = client.get('/api/v1/tasks/task-allocations/')
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Results count: {data.get('count', 0)}")
            if data.get('results'):
                print(f"   First result: {data['results'][0]}")
        else:
            print(f"   Error: {response.content.decode()}")
        
        # Test with vendor_id=1
        print("\n2. Testing with vendor_id=1...")
        response = client.get('/api/v1/tasks/task-allocations/?vendor_id=1')
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Results count: {data.get('count', 0)}")
            if data.get('results'):
                print(f"   First result: {data['results'][0]}")
            else:
                print("   No results found")
        else:
            print(f"   Error: {response.content.decode()}")
            
    except Exception as e:
        print(f"❌ Error testing with Django client: {e}")

def test_direct_database_query():
    """Test direct database query to verify data exists"""
    print("\n🗄️ Testing Direct Database Query")
    print("=" * 40)
    
    try:
        # Get all task allocations
        all_allocations = TaskAllocation.objects.all()
        print(f"Total task allocations in database: {all_allocations.count()}")
        
        # Get allocations with vendor_relationship_id=1
        vendor_allocations = TaskAllocation.objects.filter(vendor_relationship_id=1)
        print(f"Task allocations with vendor_relationship_id=1: {vendor_allocations.count()}")
        
        if vendor_allocations.exists():
            allocation = vendor_allocations.first()
            print(f"Sample allocation:")
            print(f"  - ID: {allocation.id}")
            print(f"  - Task: {allocation.task.title if allocation.task else 'N/A'}")
            print(f"  - Vendor Relationship ID: {allocation.vendor_relationship_id}")
            print(f"  - Status: {allocation.status}")
            print(f"  - Task Tenant: {allocation.task.tenant.organization_name if allocation.task and allocation.task.tenant else 'N/A'}")
        
        # Check tenant context
        user, tenant = get_or_create_test_user()
        if user and tenant:
            tenant_allocations = TaskAllocation.objects.filter(task__tenant=tenant)
            print(f"Task allocations for tenant '{tenant.organization_name}': {tenant_allocations.count()}")
            
            tenant_vendor_allocations = tenant_allocations.filter(vendor_relationship_id=1)
            print(f"Task allocations for tenant '{tenant.organization_name}' with vendor_relationship_id=1: {tenant_vendor_allocations.count()}")
            
    except Exception as e:
        print(f"❌ Error in database query: {e}")

def main():
    print("🧪 Task Allocation API Authentication Test")
    print("=" * 50)
    
    # Test direct database access first
    test_direct_database_query()
    
    # Test with Django client
    test_with_django_client()
    
    print("\n✅ Test completed!")

if __name__ == "__main__":
    main()
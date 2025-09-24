#!/usr/bin/env python
import os
import sys
import django
import requests
import json

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant, TenantUserProfile
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def setup_user():
    """Setup user and get authentication token"""
    print("=== Setting up user authentication ===")
    
    try:
        # Try to get the Verveland user first
        user = User.objects.filter(email='hasan@verveland.in').first()
        
        if not user:
            # Fallback to admin user
            user = User.objects.filter(email='admin@vodafone.com').first()
            
        if not user:
            # Fallback to any superuser
            user = User.objects.filter(is_superuser=True).first()
            
        if not user:
            print("No suitable user found!")
            return None, None, None
        
        print(f"Using user: {user.email} (ID: {user.id})")
        
        # Get user's tenant
        tenant = None
        try:
            profile = TenantUserProfile.objects.filter(user=user).first()
            if profile:
                tenant = profile.tenant
                print(f"User tenant: {tenant.organization_name}")
            else:
                print("No tenant profile found")
        except Exception as e:
            print(f"Error getting tenant profile: {e}")
        
        # Generate JWT token
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        print("JWT token generated for user")
        
        return user, tenant, access_token
        
    except Exception as e:
        print(f"Error setting up user: {e}")
        return None, None, None

def test_task_allocation_api():
    """Test the task allocation API with proper tenant context"""
    print("=== Testing Task Allocation API with Tenant Context ===")
    
    user, tenant, token = setup_user()
    if not user or not tenant or not token:
        print("Failed to setup user authentication")
        return
    
    base_url = "http://localhost:8000"
    endpoint = "/api/v1/tasks/task-allocations/"
    
    # Headers with authentication and tenant context
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'X-Tenant-ID': str(tenant.id)  # This is crucial for tenant context
    }
    
    print(f"Using tenant ID: {tenant.id} ({tenant.organization_name})")
    
    # Test 1: Get all task allocations
    print(f"\n1. Testing: {base_url}{endpoint}")
    try:
        response = requests.get(f"{base_url}{endpoint}", headers=headers)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Success! Found {len(data.get('results', []))} task allocations")
            
            # Print first few allocations for verification
            results = data.get('results', [])
            for i, allocation in enumerate(results[:3]):
                print(f"   Allocation {i+1}: {allocation.get('task_from_flow', {}).get('task_name', 'N/A')} - Status: {allocation.get('status', 'N/A')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Request failed: {e}")
    
    # Test 2: Get task allocations filtered by vendor_id
    print(f"\n2. Testing: {base_url}{endpoint}?vendor_id=1")
    try:
        response = requests.get(f"{base_url}{endpoint}?vendor_id=1", headers=headers)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Success! Found {len(data.get('results', []))} task allocations for vendor_id=1")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Request failed: {e}")
    
    # Test 3: Get task allocations filtered by status
    print(f"\n3. Testing: {base_url}{endpoint}?status=pending")
    try:
        response = requests.get(f"{base_url}{endpoint}?status=pending", headers=headers)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Success! Found {len(data.get('results', []))} pending task allocations")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Request failed: {e}")

if __name__ == "__main__":
    test_task_allocation_api()
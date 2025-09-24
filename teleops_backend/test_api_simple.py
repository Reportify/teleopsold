#!/usr/bin/env python
"""
Simple API test script to check task allocations endpoint
"""
import os
import sys
import django
import requests

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def setup_user():
    """Setup user and get auth token"""
    try:
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Try to get the Verveland user first
        user = User.objects.filter(email='hasan@verveland.in').first()
        if not user:
            # Fallback to admin@vodafone.com
            user = User.objects.filter(email='admin@vodafone.com').first()
        if not user:
            # Fallback to any superuser
            user = User.objects.filter(is_superuser=True).first()
        
        if not user:
            print("No suitable user found")
            return None, None
            
        print(f"Using user: {user.email} (ID: {user.id})")
        
        # Check if user has tenant relationship through TenantUserProfile
        try:
            from apps.tenants.models import TenantUserProfile
            user_profile = TenantUserProfile.objects.filter(user=user).first()
            if user_profile:
                tenant = user_profile.tenant
                print(f"User tenant: {tenant.organization_name}")
            else:
                print(f"No tenant profile found for user {user.username}")
        except Exception as e:
            print(f"Error finding user tenant: {e}")
        
        # Generate JWT token
        try:
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            print(f"JWT token generated for user")
            return user, access_token
        except Exception as e:
            print(f"Error generating JWT token: {e}")
            return user, None
            
    except Exception as e:
        print(f"Error setting up user: {e}")
        return None, None

def test_api():
    print("=== Testing Task Allocation API ===")
    
    # Setup user and get token
    user, token_key = setup_user()
    if not user or not token_key:
        print("Failed to setup user or get token")
        return
    
    # Test API endpoints
    import requests
    
    base_url = "http://localhost:8000"
    endpoint = "/api/v1/tasks/task-allocations/"
    headers = {
        'Authorization': f'Bearer {token_key}',
        'Content-Type': 'application/json'
    }
    
    # Test 1: All allocations
    print(f"\n1. Testing: {base_url}{endpoint}")
    try:
        response = requests.get(f"{base_url}{endpoint}", headers=headers)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response Type: {type(data)}")
            
            if isinstance(data, dict) and 'results' in data:
                results = data['results']
                print(f"   Results Count: {len(results)}")
                
                if results:
                    print("\n   Task Allocations Found:")
                    for i, allocation in enumerate(results):
                        print(f"     {i+1}. ID: {allocation.get('id', 'N/A')}")
                        print(f"        Task: {allocation.get('task_name', 'N/A')}")
                        print(f"        Status: {allocation.get('status', 'N/A')}")
                        print(f"        Vendor: {allocation.get('vendor_name', 'N/A')}")
                        print(f"        Project: {allocation.get('project_name', 'N/A')}")
                else:
                    print("   No allocations found")
            else:
                print(f"   Unexpected response format: {data}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Test 2: Filter by vendor_id=1
    print(f"\n2. Testing: {base_url}{endpoint}?vendor_id=1")
    try:
        response = requests.get(f"{base_url}{endpoint}?vendor_id=1", headers=headers)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, dict) and 'results' in data:
                results = data['results']
                print(f"   Results Count: {len(results)}")
                
                if results:
                    print("\n   Verveland Allocations Found:")
                    for i, allocation in enumerate(results):
                        print(f"     {i+1}. ID: {allocation.get('id', 'N/A')}")
                        print(f"        Task: {allocation.get('task_name', 'N/A')}")
                        print(f"        Status: {allocation.get('status', 'N/A')}")
                        print(f"        Vendor: {allocation.get('vendor_name', 'N/A')}")
                        print(f"        Project: {allocation.get('project_name', 'N/A')}")
                else:
                    print("   No Verveland allocations found")
            else:
                print(f"   Unexpected response format: {data}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")

if __name__ == "__main__":
    test_api()
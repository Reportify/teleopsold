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

from apps.users.models import User
from apps.tenants.models import Tenant
from rest_framework_simplejwt.tokens import RefreshToken

def get_or_create_test_user():
    """Get or create a test user for API testing"""
    try:
        # Try to get Vodafone MPCG tenant
        vodafone = Tenant.objects.get(organization_name="Vodafone Idea Limited (MPCG)")
        
        # Try to get an existing user for this tenant
        user = User.objects.filter(
            tenant_user_profile__tenant=vodafone,
            is_active=True
        ).first()
        
        if user:
            print(f"Using existing user: {user.email}")
            return user, vodafone
        
        # Create a test user if none exists
        user = User.objects.create_user(
            email='test@vodafone.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            user_type='tenant'
        )
        
        # Create tenant user profile
        from apps.tenants.models import TenantUserProfile
        TenantUserProfile.objects.create(
            user=user,
            tenant=vodafone,
            is_active=True
        )
        
        print(f"Created test user: {user.email}")
        return user, vodafone
        
    except Exception as e:
        print(f"Error creating test user: {e}")
        return None, None

def generate_jwt_token(user):
    """Generate JWT token for user"""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }

def test_api_with_auth():
    """Test the API with proper authentication"""
    print("=== SETTING UP AUTHENTICATION ===")
    
    # Get test user and tenant
    user, tenant = get_or_create_test_user()
    if not user or not tenant:
        print("Failed to get test user and tenant")
        return
    
    # Generate JWT token
    tokens = generate_jwt_token(user)
    access_token = tokens['access']
    
    print(f"Generated JWT token for user: {user.email}")
    print(f"Tenant: {tenant.organization_name} (ID: {tenant.id})")
    
    print("\n=== TESTING API CALLS ===")
    
    # Test with vendor_id=1
    print(f"Testing with vendor_id=1")
    url = "http://localhost:8000/api/v1/tasks/task-allocations/?vendor_id=1"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'X-Tenant-ID': str(tenant.id),
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            if data.get('results'):
                print(f"✅ SUCCESS: Found {len(data['results'])} task allocations")
            else:
                print("⚠️  No task allocations found (empty results)")
        else:
            print(f"❌ ERROR: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    # Also test without vendor_id to see all allocations
    print(f"\nTesting without vendor_id (all allocations)")
    url = "http://localhost:8000/api/v1/tasks/task-allocations/"
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Total allocations: {data.get('count', 0)}")
            
            if data.get('results'):
                print("Sample allocation:")
                print(json.dumps(data['results'][0], indent=2))
        else:
            print(f"❌ ERROR: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_api_with_auth()
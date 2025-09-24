#!/usr/bin/env python
"""
Test the actual API endpoint properly using Django's test client
"""
import os
import sys
import django
import json

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from apps.tenants.models import Tenant

User = get_user_model()

def test_api_properly():
    print("=== TESTING API PROPERLY ===")
    
    # Get Vodafone tenant
    vodafone = Tenant.objects.get(organization_name="Vodafone Idea Limited (MPCG)")
    print(f"Using tenant: {vodafone.organization_name}")
    
    # Get or create a test user for this tenant
    user = User.objects.filter(
        tenant_user_profile__tenant=vodafone,
        is_active=True
    ).first()
    
    if not user:
        print("❌ No user found for Vodafone tenant")
        return
    
    print(f"Using user: {user.email}")
    
    # Generate JWT token
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    
    # Create test client
    client = Client()
    
    # Test the API endpoint
    print("\n🧪 Testing API endpoint...")
    
    headers = {
        'HTTP_AUTHORIZATION': f'Bearer {access_token}',
        'HTTP_X_TENANT_ID': str(vodafone.id),
        'HTTP_CONTENT_TYPE': 'application/json',
    }
    
    # Test without vendor_id filter
    print("\n1. Testing without vendor_id filter:")
    response = client.get('/api/v1/tasks/task-allocations/', **headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Count: {data.get('count', 0)}")
        print(f"Results: {len(data.get('results', []))}")
        print(f"Raw response: {json.dumps(data, indent=2)[:500]}...")
        
        # Show first few results
        results = data.get('results', [])
        if isinstance(results, list):
            for i, result in enumerate(results[:3]):
                if isinstance(result, dict):
                    print(f"  - Result {i+1}: ID={result.get('id')}, Task={result.get('task', {}).get('task_name', 'N/A')}")
                else:
                    print(f"  - Result {i+1}: {result}")
        else:
            print(f"Results is not a list: {type(results)}")
    else:
        print(f"Error: {response.content.decode()}")
    
    # Test with vendor_id=1 filter
    print("\n2. Testing with vendor_id=1 filter:")
    response = client.get('/api/v1/tasks/task-allocations/?vendor_id=1', **headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Count: {data.get('count', 0)}")
        print(f"Results: {len(data.get('results', []))}")
        
        # Show results
        for i, result in enumerate(data.get('results', [])):
            print(f"  - Result {i+1}: ID={result.get('id')}, Task={result.get('task', {}).get('task_name', 'N/A')}")
            print(f"    Vendor Relationship ID: {result.get('vendor_relationship_id')}")
    else:
        print(f"Error: {response.content.decode()}")
    
    # Test with different vendor_id values
    print("\n3. Testing with different vendor_id values:")
    for vendor_id in [2, 3, 4]:
        response = client.get(f'/api/v1/tasks/task-allocations/?vendor_id={vendor_id}', **headers)
        if response.status_code == 200:
            data = response.json()
            print(f"vendor_id={vendor_id}: {data.get('count', 0)} results")
        else:
            print(f"vendor_id={vendor_id}: Error {response.status_code}")

if __name__ == "__main__":
    test_api_properly()
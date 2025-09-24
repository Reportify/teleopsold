#!/usr/bin/env python
"""
Test specifically the vendor_id=1 filter
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

def test_vendor_filter():
    print("=== TESTING VENDOR_ID=1 FILTER ===")
    
    # Get Vodafone tenant
    vodafone = Tenant.objects.get(organization_name="Vodafone Idea Limited (MPCG)")
    print(f"Using tenant: {vodafone.organization_name}")
    
    # Get user
    user = User.objects.filter(
        tenant_user_profile__tenant=vodafone,
        is_active=True
    ).first()
    
    print(f"Using user: {user.email}")
    
    # Generate JWT token
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    
    # Create test client
    client = Client()
    
    headers = {
        'HTTP_AUTHORIZATION': f'Bearer {access_token}',
        'HTTP_X_TENANT_ID': str(vodafone.id),
        'HTTP_CONTENT_TYPE': 'application/json',
    }
    
    # Test with vendor_id=1 filter
    print("\n🧪 Testing with vendor_id=1 filter:")
    response = client.get('/api/v1/tasks/task-allocations/?vendor_id=1', **headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"Count: {data.get('count', 0)}")
            print(f"Results length: {len(data.get('results', []))}")
            
            # Print the full response
            print(f"\nFull response:")
            print(json.dumps(data, indent=2))
            
        except Exception as e:
            print(f"Error parsing JSON: {e}")
            print(f"Raw content: {response.content.decode()}")
    else:
        print(f"Error: {response.content.decode()}")

if __name__ == "__main__":
    test_vendor_filter()
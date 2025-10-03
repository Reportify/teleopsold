#!/usr/bin/env python
"""
Script to test team API endpoint using Django test client
"""
import os
import sys
import django
import json

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from apps.tenants.models import TenantUserProfile

User = get_user_model()

def test_team_api():
    # Get a user and their tenant profile
    user = User.objects.first()
    if not user:
        print("No users found in the database")
        return
    
    tenant_profile = TenantUserProfile.objects.filter(user=user).first()
    if not tenant_profile:
        print(f"No tenant profile found for user {user.email}")
        return
    
    print(f"Testing with user: {user.email}")
    print(f"Tenant: {tenant_profile.tenant.organization_name}")
    print(f"Tenant ID: {tenant_profile.tenant.id}")
    
    # Create a test client
    client = Client()
    
    # Force login the user
    client.force_login(user)
    
    # Test data for team creation
    team_data = {
        'name': 'API Test Team',
        'description': 'Team created via API test'
    }
    
    # Headers to set tenant context
    headers = {
        'HTTP_X_TENANT_ID': str(tenant_profile.tenant.id),
        'HTTP_ACCEPT': 'application/json',
        'HTTP_CONTENT_TYPE': 'application/json'
    }
    
    # Test POST request to create team
    print("\nTesting POST /api/v1/teams/")
    response = client.post(
        '/api/v1/teams/',
        data=json.dumps(team_data),
        content_type='application/json',
        **headers
    )
    
    print(f"POST Response Status: {response.status_code}")
    if response.status_code == 401:
        print("Authentication failed - credentials not provided")
    elif response.status_code == 403:
        print("Permission denied")
        print(f"Response: {response.content.decode()}")
    elif response.status_code == 201:
        print("Team created successfully!")
        print(f"Response: {response.content.decode()}")
    else:
        print(f"Unexpected response: {response.content.decode()}")
    
    # Test GET request to list teams
    print("\nTesting GET /api/v1/teams/")
    response = client.get('/api/v1/teams/', **headers)
    print(f"GET Response Status: {response.status_code}")
    if response.status_code == 200:
        print("Teams retrieved successfully!")
        print(f"Response: {response.content.decode()}")
    else:
        print(f"Response: {response.content.decode()}")
    
    # Test OPTIONS request to see allowed methods
    print("\nTesting OPTIONS /api/v1/teams/")
    response = client.options('/api/v1/teams/', **headers)
    print(f"OPTIONS Response Status: {response.status_code}")
    if 'Allow' in response:
        print(f"Allowed methods: {response['Allow']}")

if __name__ == "__main__":
    test_team_api()
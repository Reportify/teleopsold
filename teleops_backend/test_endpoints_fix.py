#!/usr/bin/env python
import os
import sys
import django
from django.conf import settings

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.tasks.models import TaskFromFlow
from apps.tenants.models import Tenant

def test_endpoints():
    """Test both task allocation and timeline endpoints"""
    
    # Get or create a superuser
    User = get_user_model()
    try:
        user = User.objects.get(email='admin@test.com')
        print(f"Using existing user: {user.email}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            email='admin@test.com',
            password='admin123',
            first_name='Admin',
            last_name='User',
            is_superuser=True,
            is_staff=True,
            is_active=True
        )
        print(f"Created superuser: {user.email}")
    
    # Get or create a tenant
    tenant, created = Tenant.objects.get_or_create(
        organization_name='Test Tenant',
        defaults={
            'tenant_type': 'Vendor',
            'primary_contact_name': 'Test Contact',
            'primary_contact_email': 'test@tenant.com',
            'primary_contact_phone': '1234567890',
            'primary_business_address': 'Test Address',
            'subdomain': 'test-tenant'
        }
    )
    if created:
        print(f"Created tenant: {tenant.organization_name}")
    
    # Set user tenant
    user.tenant = tenant
    user.save()
    
    # Use dummy task ID for testing (proper UUID format)
    task_id_for_test = '12345678-1234-5678-9012-123456789012'
    print(f"Testing with task ID: {task_id_for_test}")
    
    # Create API client and authenticate
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    
    # Test task allocation endpoint
    print("\n=== Testing Task Allocation Endpoint ===")
    allocation_url = f'/api/v1/tasks/task-allocations/?task_id={task_id_for_test}'
    try:
        response = client.get(allocation_url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("✅ Task allocation endpoint is working correctly!")
        elif response.status_code == 500:
            print("❌ Task allocation endpoint has server error")
        else:
            print(f"⚠️ Task allocation endpoint returned: {response.status_code}")
    except Exception as e:
        print(f"❌ Task allocation endpoint failed with exception: {e}")
    
    # Test task timeline endpoint
    print("\n=== Testing Task Timeline Endpoint ===")
    timeline_url = f'/api/v1/tasks/task-timeline/?task_id={task_id_for_test}'
    try:
        response = client.get(timeline_url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("✅ Task timeline endpoint is working correctly!")
        elif response.status_code == 500:
            print("❌ Task timeline endpoint has server error")
        else:
            print(f"⚠️ Task timeline endpoint returned: {response.status_code}")
    except Exception as e:
        print(f"❌ Task timeline endpoint failed with exception: {e}")
    
    # Test task timeline by_task action
    print("\n=== Testing Task Timeline by_task Action ===")
    by_task_url = f'/api/v1/tasks/task-timeline/by_task/?task_id={task_id_for_test}'
    try:
        response = client.get(by_task_url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("✅ Task timeline by_task action is working correctly!")
        elif response.status_code == 500:
            print("❌ Task timeline by_task action has server error")
        else:
            print(f"⚠️ Task timeline by_task action returned: {response.status_code}")
    except Exception as e:
        print(f"❌ Task timeline by_task action failed with exception: {e}")

if __name__ == '__main__':
    test_endpoints()
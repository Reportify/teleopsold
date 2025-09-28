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
    # First try to get a superuser for full access
    superuser = User.objects.filter(is_superuser=True, is_active=True).first()
    if superuser:
        print(f"Using superuser: {superuser.email}")
        # Get any tenant for the superuser (they can access all)
        try:
            verveland = Tenant.objects.get(organization_name="Verveland Technologies")
            return superuser, verveland
        except Tenant.DoesNotExist:
            tenant = Tenant.objects.first()
            return superuser, tenant
    
    try:
        # Try to get Verveland Technologies tenant (where the tasks are)
        verveland = Tenant.objects.get(organization_name="Verveland Technologies")
        
        # Try to get an existing user for this tenant
        user = User.objects.filter(
            tenant_user_profile__tenant=verveland,
            is_active=True
        ).first()
        
        if user:
            print(f"Using existing user: {user.email} from {verveland.organization_name}")
            return user, verveland
        
        print("No existing user found for Verveland tenant")
        return None, verveland
        
    except Tenant.DoesNotExist:
        print("Verveland tenant not found")
        # Fallback to any tenant with tasks
        try:
            from apps.tasks.models import TaskFromFlow
            task_with_tenant = TaskFromFlow.objects.first()
            if task_with_tenant:
                tenant = task_with_tenant.tenant
                user = User.objects.filter(
                    tenant_user_profile__tenant=tenant,
                    is_active=True
                ).first()
                if user:
                    print(f"Using fallback user: {user.email} from {tenant.organization_name}")
                    return user, tenant
        except:
            pass
        return None, None

def generate_jwt_token(user):
    """Generate JWT token for the user"""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh)
    }

def test_tasks_api():
    """Test the tasks API to verify site_groups field"""
    user, tenant = get_or_create_test_user()
    
    if not user:
        print("No test user available")
        return
    
    # Generate JWT token
    tokens = generate_jwt_token(user)
    
    # Test tasks endpoint
    headers = {
        'Authorization': f'Bearer {tokens["access"]}',
        'Content-Type': 'application/json',
        'X-Tenant-ID': str(tenant.id)  # Add tenant context header
    }
    
    print("\n=== Testing Tasks API ===")
    
    # Test tasks-from-flow endpoint (this is the main endpoint with site_groups)
    print("\n=== Testing Tasks From Flow API ===")
    try:
        response = requests.get('http://localhost:8000/api/v1/tasks/tasks-from-flow/', headers=headers)
        print(f"Tasks From Flow Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Number of flow tasks: {len(data.get('results', []))}")
            
            if data.get('results'):
                first_task = data['results'][0]
                print(f"\nFirst flow task fields: {list(first_task.keys())}")
                
                if 'site_groups' in first_task:
                    print(f"✅ site_groups field found in flow tasks!")
                    print(f"site_groups value: {first_task['site_groups']}")
                    
                    # Show detailed site_groups structure
                    if first_task['site_groups']:
                        print(f"\nDetailed site_groups structure:")
                        for i, site_group in enumerate(first_task['site_groups']):
                            print(f"  Site Group {i+1}: {json.dumps(site_group, indent=4)}")
                else:
                    print("❌ site_groups field NOT found in flow task response")
                    
                # Show a sample task structure (limited fields for readability)
                print(f"\nSample task structure (key fields):")
                key_fields = ['id', 'task_id', 'task_name', 'status', 'site_groups']
                sample_task = {k: v for k, v in first_task.items() if k in key_fields}
                print(json.dumps(sample_task, indent=2))
            else:
                print("No flow tasks found in response")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error testing tasks from flow API: {e}")
    
    # Also test the regular tasks endpoint to see if it has site_groups
    print("\n=== Testing Regular Tasks API ===")
    try:
        response = requests.get('http://localhost:8000/api/v1/tasks/', headers=headers)
        print(f"Tasks List Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Number of tasks: {len(data.get('results', []))}")
            
            # Check if any tasks have site_groups field
            if data.get('results'):
                first_task = data['results'][0]
                print(f"\nFirst task fields: {list(first_task.keys())}")
                
                if 'site_groups' in first_task:
                    print(f"✅ site_groups field found!")
                    print(f"site_groups value: {first_task['site_groups']}")
                else:
                    print("❌ site_groups field NOT found in task response")
            else:
                print("No tasks found in response")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error testing tasks API: {e}")

if __name__ == "__main__":
    test_tasks_api()
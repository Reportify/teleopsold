#!/usr/bin/env python
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
from django.test import Client
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token

User = get_user_model()

def test_task_allocation_endpoints():
    print("=== Testing Task Allocation API Endpoints ===\n")
    
    # Create API client
    client = APIClient()
    
    # Get or create a test user
    try:
        user = User.objects.filter(is_superuser=True).first()
        if not user:
            user = User.objects.create_superuser('testuser', 'test@example.com', 'testpass123')
        
        # Get or create token for authentication
        token, created = Token.objects.get_or_create(user=user)
        client.credentials(HTTP_AUTHORIZATION='Token ' + token.key)
        
        print(f"Using user: {user.username} (ID: {user.id})")
        print(f"Token: {token.key[:10]}...")
        print()
        
    except Exception as e:
        print(f"Error setting up authentication: {e}")
        return
    
    # Test 1: Get all task allocations
    print("1. Testing GET /api/v1/tasks/task-allocations/")
    try:
        response = client.get('/api/v1/tasks/task-allocations/')
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response type: {type(data)}")
            if isinstance(data, dict) and 'results' in data:
                allocations = data['results']
                print(f"Found {len(allocations)} allocations")
                for allocation in allocations:
                    print(f"  - ID: {allocation.get('id')}")
                    print(f"    Task: {allocation.get('task_name', 'N/A')}")
                    print(f"    Type: {allocation.get('allocation_type', 'N/A')}")
                    print(f"    Status: {allocation.get('status', 'N/A')}")
                    print(f"    Vendor: {allocation.get('vendor_name', 'N/A')}")
                    print()
            elif isinstance(data, list):
                print(f"Found {len(data)} allocations")
                for allocation in data:
                    print(f"  - ID: {allocation.get('id')}")
                    print(f"    Task: {allocation.get('task_name', 'N/A')}")
                    print(f"    Type: {allocation.get('allocation_type', 'N/A')}")
                    print(f"    Status: {allocation.get('status', 'N/A')}")
                    print(f"    Vendor: {allocation.get('vendor_name', 'N/A')}")
                    print()
        else:
            print(f"Error: {response.content.decode()}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 2: Filter by vendor
    print("2. Testing GET /api/v1/tasks/task-allocations/?allocation_type=vendor")
    try:
        response = client.get('/api/v1/tasks/task-allocations/?allocation_type=vendor')
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'results' in data:
                allocations = data['results']
            elif isinstance(data, list):
                allocations = data
            else:
                allocations = []
            
            print(f"Found {len(allocations)} vendor allocations")
            for allocation in allocations:
                print(f"  - ID: {allocation.get('id')}")
                print(f"    Task: {allocation.get('task_name', 'N/A')}")
                print(f"    Vendor: {allocation.get('vendor_name', 'N/A')}")
                print(f"    Status: {allocation.get('status', 'N/A')}")
                print()
        else:
            print(f"Error: {response.content.decode()}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 3: Filter by vendor relationship ID
    print("3. Testing GET /api/v1/tasks/task-allocations/?vendor_id=1")
    try:
        response = client.get('/api/v1/tasks/task-allocations/?vendor_id=1')
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'results' in data:
                allocations = data['results']
            elif isinstance(data, list):
                allocations = data
            else:
                allocations = []
            
            print(f"Found {len(allocations)} allocations for vendor ID 1")
            for allocation in allocations:
                print(f"  - ID: {allocation.get('id')}")
                print(f"    Task: {allocation.get('task_name', 'N/A')}")
                print(f"    Vendor: {allocation.get('vendor_name', 'N/A')}")
                print(f"    Vendor Relationship ID: {allocation.get('vendor_relationship', 'N/A')}")
                print(f"    Status: {allocation.get('status', 'N/A')}")
                print()
        else:
            print(f"Error: {response.content.decode()}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 4: Get specific allocation
    print("4. Testing GET /api/v1/tasks/task-allocations/1a678bea-c344-4136-a1bc-9fcd17a4e889/")
    try:
        response = client.get('/api/v1/tasks/task-allocations/1a678bea-c344-4136-a1bc-9fcd17a4e889/')
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            allocation = response.json()
            print("Allocation details:")
            print(f"  - ID: {allocation.get('id')}")
            print(f"  - Task: {allocation.get('task_name', 'N/A')}")
            print(f"  - Project: {allocation.get('project_name', 'N/A')}")
            print(f"  - Type: {allocation.get('allocation_type', 'N/A')}")
            print(f"  - Status: {allocation.get('status', 'N/A')}")
            print(f"  - Vendor: {allocation.get('vendor_name', 'N/A')}")
            print(f"  - Vendor Code: {allocation.get('vendor_code', 'N/A')}")
            print(f"  - Vendor Relationship ID: {allocation.get('vendor_relationship', 'N/A')}")
            print(f"  - Allocated At: {allocation.get('allocated_at', 'N/A')}")
            print(f"  - Created At: {allocation.get('created_at', 'N/A')}")
        else:
            print(f"Error: {response.content.decode()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_task_allocation_endpoints()
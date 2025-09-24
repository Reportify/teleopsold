#!/usr/bin/env python
import os
import sys
import django
import requests
import json

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

def test_api_endpoint():
    print("=== Testing API Endpoint Directly ===")
    
    # Test the actual API endpoint that frontend calls
    base_url = "http://localhost:8000"  # Adjust if different
    endpoint = "/api/v1/tasks/task-allocations/"
    
    # Test with vendor_id=1 (Verveland)
    params = {"vendor_id": 1}
    
    print(f"\n1. Testing: {base_url}{endpoint}")
    print(f"   Parameters: {params}")
    
    try:
        response = requests.get(f"{base_url}{endpoint}", params=params)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response Type: {type(data)}")
            print(f"   Response Keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
            
            if isinstance(data, dict) and 'results' in data:
                results = data['results']
                print(f"   Results Count: {len(results)}")
                
                if results:
                    print("\n   Task Allocations Found:")
                    for i, allocation in enumerate(results):
                        print(f"     {i+1}. ID: {allocation.get('id', 'N/A')}")
                        print(f"        Task: {allocation.get('task', {}).get('task_name', 'N/A')}")
                        print(f"        Status: {allocation.get('status', 'N/A')}")
                        print(f"        Vendor Relationship ID: {allocation.get('vendor_relationship', 'N/A')}")
                        print()
                else:
                    print("   No task allocations found in results")
            elif isinstance(data, list):
                print(f"   Direct List Results Count: {len(data)}")
                if data:
                    print("\n   Task Allocations Found:")
                    for i, allocation in enumerate(data):
                        print(f"     {i+1}. ID: {allocation.get('id', 'N/A')}")
                        print(f"        Task: {allocation.get('task', {}).get('task_name', 'N/A')}")
                        print(f"        Status: {allocation.get('status', 'N/A')}")
                        print(f"        Vendor Relationship ID: {allocation.get('vendor_relationship', 'N/A')}")
                        print()
            else:
                print(f"   Unexpected response format: {data}")
                
        else:
            print(f"   Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("   Error: Could not connect to API server")
        print("   Make sure Django development server is running on localhost:8000")
    except Exception as e:
        print(f"   Error: {e}")

    # Test without vendor_id to see all allocations
    print(f"\n2. Testing without vendor_id filter:")
    try:
        response = requests.get(f"{base_url}{endpoint}")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'results' in data:
                results = data['results']
                print(f"   Total Results Count: {len(results)}")
            elif isinstance(data, list):
                print(f"   Total Direct List Count: {len(data)}")
            else:
                print(f"   Response: {data}")
        else:
            print(f"   Error: {response.status_code}")
            
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    test_api_endpoint()
#!/usr/bin/env python
import json
from django.test import Client
from tenants.models import Tenant
from users.models import User

def test_vendor_api():
    """Test the vendor task allocations API endpoint"""
    
    print("=== Testing Vendor Task Allocations API ===\n")
    
    # Create a test client
    client = Client()
    
    # Get Verveland tenant and a user
    try:
        verveland_tenant = Tenant.objects.get(id='0c99e1ac-e19b-47bb-99b2-c16a33440ecf')
        print(f"✓ Found Verveland tenant: {verveland_tenant.name}")
        
        # Get a user from Verveland tenant
        verveland_user = User.objects.filter(tenant=verveland_tenant).first()
        if verveland_user:
            print(f"✓ Found Verveland user: {verveland_user.email}")
            
            # Login as the user
            client.force_login(verveland_user)
            print("✓ Logged in as Verveland user")
            
            # Test the API endpoint
            print("\nTesting API endpoint: /api/v1/tasks/task-allocations/?vendor_id=1")
            response = client.get('/api/v1/tasks/task-allocations/?vendor_id=1')
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response type: {type(data)}")
                
                if isinstance(data, dict) and 'results' in data:
                    allocations = data['results']
                    print(f"Found {len(allocations)} allocations")
                    
                    for i, allocation in enumerate(allocations):
                        print(f"\n--- Allocation {i+1} ---")
                        print(f"ID: {allocation.get('id')}")
                        print(f"Task Name: {allocation.get('task_name')}")
                        print(f"Project Name: {allocation.get('project_name')}")
                        print(f"Status: {allocation.get('status')}")
                        
                        # Check sub_activity_allocations
                        sub_allocations = allocation.get('sub_activity_allocations', [])
                        print(f"Sub-activity allocations: {len(sub_allocations)}")
                        
                        for j, sub_alloc in enumerate(sub_allocations):
                            print(f"  Sub-activity {j+1}:")
                            print(f"    ID: {sub_alloc.get('id')}")
                            print(f"    Activity Name: {sub_alloc.get('sub_activity_name')}")
                            print(f"    Site Name: {sub_alloc.get('site_name')}")
                            print(f"    Site Global ID: {sub_alloc.get('site_global_id')}")
                            print(f"    Site Business ID: {sub_alloc.get('site_business_id')}")
                            print(f"    Site Alias: {sub_alloc.get('site_alias', 'NOT FOUND')}")
                            print(f"    Status: {sub_alloc.get('status')}")
                            
                        if i >= 1:  # Limit to first 2 allocations for readability
                            break
                            
                else:
                    print("Unexpected response format")
                    print(json.dumps(data, indent=2))
                    
            else:
                print(f"Error: {response.content.decode()}")
                
        else:
            print("✗ No users found in Verveland tenant")
            
    except Tenant.DoesNotExist:
        print("✗ Verveland tenant not found!")
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    test_vendor_api()
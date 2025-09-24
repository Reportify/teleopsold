#!/usr/bin/env python
import os
import sys
import django
import requests

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import Tenant, VendorRelationship, ClientVendorRelationship

def test_api_calls():
    print("=== CHECKING RELATIONSHIPS ===")
    
    # Check VendorRelationship
    vendor_rels = VendorRelationship.objects.all()
    print(f"VendorRelationship count: {vendor_rels.count()}")
    for rel in vendor_rels:
        print(f"  - ID: {rel.id}")
        print(f"    Client: {rel.client_tenant.organization_name}")
        print(f"    Vendor: {rel.vendor_tenant.organization_name}")
        print(f"    Status: {rel.relationship_status}")
        print()
    
    # Check ClientVendorRelationship
    client_vendor_rels = ClientVendorRelationship.objects.all()
    print(f"ClientVendorRelationship count: {client_vendor_rels.count()}")
    for rel in client_vendor_rels:
        print(f"  - ID: {rel.id}")
        print(f"    Client: {rel.client_tenant.organization_name}")
        print(f"    Vendor: {rel.vendor_tenant.organization_name if rel.vendor_tenant else 'None'}")
        print(f"    Status: {rel.relationship_status}")
        print()
    
    print("=== TESTING API CALLS ===")
    
    # Test with vendor_id=1 (should be ClientVendorRelationship ID)
    if client_vendor_rels.exists():
        first_rel_id = client_vendor_rels.first().id
        print(f"Testing with vendor_id={first_rel_id}")
        
        url = f"http://localhost:8000/api/v1/tasks/task-allocations/?vendor_id={first_rel_id}"
        headers = {
            'X-Tenant-ID': 'd7ab45d9-6e85-40aa-a1f3-896582995c6f',  # Vodafone MPCG
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(url, headers=headers)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.json()}")
        except Exception as e:
            print(f"Error: {e}")
    
    # Also test with vendor_id=1 (hardcoded)
    print(f"\nTesting with vendor_id=1")
    url = "http://localhost:8000/api/v1/tasks/task-allocations/?vendor_id=1"
    headers = {
        'X-Tenant-ID': 'd7ab45d9-6e85-40aa-a1f3-896582995c6f',  # Vodafone MPCG
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api_calls()
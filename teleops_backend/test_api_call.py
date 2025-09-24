#!/usr/bin/env python
"""
Script to test the correct API call for task allocations
"""
import os
import sys
import django
import requests

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import ClientVendorRelationship

def test_api_calls():
    print("=== Testing Task Allocation API Calls ===")
    
    # First, get the correct vendor relationship ID for Verveland
    print("\n1. Finding Verveland vendor relationship...")
    verveland_relationships = ClientVendorRelationship.objects.filter(
        vendor_tenant__organization_name__icontains="verveland"
    )
    
    if not verveland_relationships.exists():
        print("❌ No Verveland relationships found!")
        return
    
    verveland_rel = verveland_relationships.first()
    print(f"✅ Found Verveland relationship:")
    print(f"   - Relationship ID: {verveland_rel.id}")
    print(f"   - Vendor Tenant ID: {verveland_rel.vendor_tenant.id}")
    print(f"   - Vendor Name: {verveland_rel.vendor_tenant.organization_name}")
    
    # Test API calls
    base_url = "http://localhost:8000"
    
    print(f"\n2. Testing API calls...")
    
    # Test 1: Using vendor_relationship_id (integer)
    print(f"\n   Test 1: Using vendor_relationship_id = {verveland_rel.id}")
    url1 = f"{base_url}/api/v1/tasks/task-allocations/?vendor_id={verveland_rel.id}"
    print(f"   URL: {url1}")
    
    # Test 2: Using vendor_tenant_id (UUID)
    print(f"\n   Test 2: Using vendor_tenant_id = {verveland_rel.vendor_tenant.id}")
    url2 = f"{base_url}/api/v1/tasks/task-allocations/?vendor_id={verveland_rel.vendor_tenant.id}"
    print(f"   URL: {url2}")
    
    print(f"\n3. Correct API calls to use:")
    print(f"   ✅ CORRECT: {url1}")
    print(f"   ❌ INCORRECT: {url2}")
    
    print(f"\n4. Summary:")
    print(f"   - Your current call uses vendor_tenant_id (UUID): 0c99e1ac-e19b-47bb-99b2-c16a33440ecf")
    print(f"   - You should use vendor_relationship_id (integer): {verveland_rel.id}")
    print(f"   - The API expects the relationship ID, not the tenant ID")

if __name__ == "__main__":
    test_api_calls()
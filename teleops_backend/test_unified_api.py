#!/usr/bin/env python3
"""
Test script for unified client management API
"""
import requests
import json

def test_unified_client_api():
    base_url = "http://localhost:8000/api/v1"
    
    print("Testing unified client management API...")
    print()
    
    # Test without authentication (should fail)
    print("Testing without authentication...")
    response = requests.get(f"{base_url}/client-management/")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}...")
    print()
    
    # Test with authentication (you'll need to get a valid token)
    print("Testing with authentication...")
    # You'll need to replace this with a valid token
    headers = {
        "Authorization": "Bearer YOUR_TOKEN_HERE",
        "X-Tenant-ID": "0c99e1ac-e19b-47bb-99b2-c16a33440ecf",  # Vendor tenant ID
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{base_url}/client-management/", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Response: {json.dumps(data, indent=2)}")
    else:
        print(f"Response: {response.text}")

if __name__ == "__main__":
    test_unified_client_api() 
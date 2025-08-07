#!/usr/bin/env python3
"""
Simple test script to verify the client-management API is working
"""
import requests
import json

# Test the client-management API
def test_client_management_api():
    base_url = "http://localhost:8000/api/v1"
    
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
        "X-Tenant-ID": "0c99e1ac-e19b-47bb-99b2-c16a33440ecf",
        "Content-Type": "application/json"
    }
    
    response = requests.get(f"{base_url}/client-management/", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
    else:
        print(f"Response: {response.text}")

if __name__ == "__main__":
    test_client_management_api() 
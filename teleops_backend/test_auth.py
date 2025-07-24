#!/usr/bin/env python
"""
Test script for authentication endpoints
Run this script to test the authentication API endpoints
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

def test_auth_endpoints():
    """Test authentication endpoints"""
    
    print("🔐 Testing Authentication Endpoints")
    print("=" * 50)
    
    # Test 1: Login endpoint (should fail without valid credentials)
    print("\n1. Testing Login Endpoint (invalid credentials)...")
    login_data = {
        "email": "test@example.com",
        "password": "wrongpassword"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/login/", json=login_data)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection failed - Make sure Django server is running on localhost:8000")
        return
    
    # Test 2: Verify endpoint (should fail without token)
    print("\n2. Testing Verify Endpoint (no token)...")
    try:
        response = requests.get(f"{API_BASE}/auth/verify/")
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection failed")
        return
    
    # Test 3: Profile endpoint (should fail without token)
    print("\n3. Testing Profile Endpoint (no token)...")
    try:
        response = requests.get(f"{API_BASE}/auth/profile/")
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection failed")
        return
    
    # Test 4: Forgot password endpoint
    print("\n4. Testing Forgot Password Endpoint...")
    forgot_data = {
        "email": "test@example.com"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/forgot-password/", json=forgot_data)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection failed")
        return
    
    print("\n✅ Authentication endpoints are accessible!")
    print("\n📝 Next Steps:")
    print("   1. Create a superuser: python manage.py createsuperuser")
    print("   2. Create test tenants and users")
    print("   3. Test login with valid credentials")
    print("   4. Test token-based authentication")

def test_api_documentation():
    """Test API documentation endpoints"""
    
    print("\n📚 Testing API Documentation")
    print("=" * 50)
    
    # Test Swagger UI
    print("\n1. Testing Swagger UI...")
    try:
        response = requests.get(f"{BASE_URL}/swagger/")
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Swagger UI is accessible")
        else:
            print("   ❌ Swagger UI not accessible")
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection failed")
    
    # Test ReDoc
    print("\n2. Testing ReDoc...")
    try:
        response = requests.get(f"{BASE_URL}/redoc/")
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ ReDoc is accessible")
        else:
            print("   ❌ ReDoc not accessible")
    except requests.exceptions.ConnectionError:
        print("   ❌ Connection failed")

if __name__ == "__main__":
    print("🚀 Teleops Authentication API Test")
    print("=" * 50)
    
    test_auth_endpoints()
    test_api_documentation()
    
    print("\n🎉 Test completed!")
    print("\n📖 API Documentation URLs:")
    print(f"   Swagger UI: {BASE_URL}/swagger/")
    print(f"   ReDoc: {BASE_URL}/redoc/")
    print(f"   API Schema: {BASE_URL}/swagger.json") 
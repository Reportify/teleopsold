#!/usr/bin/env python
"""
Test script for new RBAC implementation
Tests all view types with the new clean endpoints
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Add the project directory to the Python path  
project_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_dir)
sys.path.append(os.path.dirname(project_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant, TenantUserProfile

User = get_user_model()

def test_new_rbac_endpoints():
    """Test the new RBAC implementation endpoints"""
    
    print("🧪 Testing New RBAC Implementation")
    print("=" * 50)
    
    # Base URL for new implementation
    base_url = "http://localhost:8000/api/v1/tenants/rbac/new/groups"
    
    # Test cases
    test_cases = [
        {
            "name": "Overview Dashboard",
            "url": f"{base_url}/comprehensive_dashboard/?view_type=overview",
            "expected_fields": ["view_type", "summary", "permission_matrix", "user_summaries", "permission_summaries"]
        },
        {
            "name": "User Analysis (All Users)",
            "url": f"{base_url}/comprehensive_dashboard/?view_type=user_analysis",
            "expected_fields": ["view_type", "user_analyses", "generated_at"]
        },
        {
            "name": "Permission Analysis (All Permissions)",
            "url": f"{base_url}/comprehensive_dashboard/?view_type=permission_analysis",
            "expected_fields": ["view_type", "permission_analyses", "generated_at"]
        },
        {
            "name": "Analytics Dashboard",
            "url": f"{base_url}/comprehensive_dashboard/?view_type=analytics",
            "expected_fields": ["view_type", "permission_usage", "risk_analysis", "user_analytics", "trends"]
        },
        {
            "name": "Search Users by Permission",
            "url": f"{base_url}/search_users_by_permission/?permission_code=site_management.view_sites",
            "expected_fields": ["permission_details", "search_criteria", "results", "breakdown_by_source"]
        }
    ]
    
    # Get authentication token (you'll need to modify this based on your auth setup)
    auth_token = get_test_auth_token()
    
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    } if auth_token else {}
    
    results = []
    
    for test_case in test_cases:
        print(f"\n🔍 Testing: {test_case['name']}")
        print(f"URL: {test_case['url']}")
        
        try:
            response = requests.get(test_case['url'], headers=headers, timeout=30)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if expected fields are present
                missing_fields = []
                for field in test_case['expected_fields']:
                    if field not in data:
                        missing_fields.append(field)
                
                if not missing_fields:
                    print("✅ SUCCESS: All expected fields present")
                    
                    # Additional validation based on view type
                    validate_response_structure(test_case['name'], data)
                    
                    results.append({
                        'test': test_case['name'],
                        'status': 'PASS',
                        'data_sample': get_data_sample(data)
                    })
                else:
                    print(f"❌ MISSING FIELDS: {missing_fields}")
                    results.append({
                        'test': test_case['name'],
                        'status': 'FAIL',
                        'error': f'Missing fields: {missing_fields}'
                    })
            
            elif response.status_code == 401:
                print("🔐 AUTHENTICATION REQUIRED")
                results.append({
                    'test': test_case['name'],
                    'status': 'AUTH_REQUIRED',
                    'error': 'Authentication credentials needed'
                })
            
            else:
                print(f"❌ ERROR: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"Error details: {error_data}")
                except:
                    print(f"Raw response: {response.text[:200]}...")
                
                results.append({
                    'test': test_case['name'],
                    'status': 'FAIL',
                    'error': f'HTTP {response.status_code}: {response.text[:100]}'
                })
                
        except Exception as e:
            print(f"❌ EXCEPTION: {str(e)}")
            results.append({
                'test': test_case['name'],
                'status': 'ERROR',
                'error': str(e)
            })
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for r in results if r['status'] == 'PASS')
    total = len(results)
    
    for result in results:
        status_icon = {
            'PASS': '✅',
            'FAIL': '❌', 
            'ERROR': '💥',
            'AUTH_REQUIRED': '🔐'
        }.get(result['status'], '❓')
        
        print(f"{status_icon} {result['test']}: {result['status']}")
        if 'error' in result:
            print(f"   Error: {result['error']}")
        elif 'data_sample' in result:
            print(f"   Sample: {result['data_sample']}")
    
    print(f"\n🎯 OVERALL: {passed}/{total} tests passed")
    
    return results

def get_test_auth_token():
    """Get authentication token for testing"""
    # This is a simplified version - you'd need to implement proper auth
    # For now, return None to test without auth
    return None

def validate_response_structure(test_name, data):
    """Validate the response structure matches frontend expectations"""
    
    if "Overview" in test_name:
        summary = data.get('summary', {})
        if summary:
            print(f"   Users: {summary.get('total_users', 0)}")
            print(f"   Permissions: {summary.get('total_permissions', 0)}")
            print(f"   Assignments: {summary.get('total_assignments', 0)}")
    
    elif "User Analysis" in test_name:
        analyses = data.get('user_analyses', [])
        if analyses:
            print(f"   Found {len(analyses)} user analyses")
            sample_user = analyses[0] if analyses else {}
            print(f"   Sample user permissions: {sample_user.get('total_permissions', 0)}")
    
    elif "Permission Analysis" in test_name:
        analyses = data.get('permission_analyses', [])
        if analyses:
            print(f"   Found {len(analyses)} permission analyses")
    
    elif "Analytics" in test_name:
        usage = data.get('permission_usage', {})
        top_perms = usage.get('top_permissions', [])
        if top_perms:
            print(f"   Top permissions found: {len(top_perms)}")
    
    elif "Search" in test_name:
        results = data.get('results', {})
        users_found = results.get('total_users_found', 0)
        print(f"   Users found with permission: {users_found}")

def get_data_sample(data):
    """Get a small sample of the data for display"""
    if isinstance(data, dict):
        if 'summary' in data:
            return f"summary: {data['summary']}"
        elif 'results' in data:
            return f"results: {data['results'].get('total_users_found', 'N/A')} users"
        elif 'user_analyses' in data:
            return f"user_analyses: {len(data['user_analyses'])} users"
        elif 'permission_analyses' in data:
            return f"permission_analyses: {len(data['permission_analyses'])} permissions"
        else:
            return f"keys: {list(data.keys())[:3]}"
    return str(data)[:50]

def test_database_data():
    """Check if we have test data in the database"""
    print("\n🗄️  DATABASE CHECK")
    print("=" * 30)
    
    try:
        from apps.tenants.models import PermissionRegistry, TenantUserProfile
        
        # Check tenants
        tenants = Tenant.objects.filter(is_active=True)
        print(f"Active tenants: {tenants.count()}")
        
        if tenants.exists():
            tenant = tenants.first()
            print(f"Testing with tenant: {tenant.organization_name}")
            
            # Check users
            users = TenantUserProfile.objects.filter(tenant=tenant, is_active=True)
            print(f"Active users in tenant: {users.count()}")
            
            # Check permissions
            permissions = PermissionRegistry.objects.filter(tenant=tenant, is_active=True)
            print(f"Active permissions in tenant: {permissions.count()}")
            
            return tenant if users.exists() and permissions.exists() else None
        
        return None
        
    except Exception as e:
        print(f"❌ Database check failed: {e}")
        return None

if __name__ == "__main__":
    print("🚀 Starting RBAC Test Suite")
    print("=" * 50)
    
    # Check database first
    test_tenant = test_database_data()
    
    if test_tenant:
        print(f"✅ Database has test data for tenant: {test_tenant.organization_name}")
        
        # Run API tests
        results = test_new_rbac_endpoints()
        
        # Summary
        success_count = sum(1 for r in results if r['status'] == 'PASS')
        
        if success_count == len(results):
            print("\n🎉 ALL TESTS PASSED! New RBAC implementation is working correctly.")
        elif success_count > 0:
            print(f"\n⚠️  PARTIAL SUCCESS: {success_count}/{len(results)} tests passed.")
            print("Check authentication and endpoint configuration.")
        else:
            print("\n💥 ALL TESTS FAILED. Check server status and configuration.")
    
    else:
        print("❌ No test data found. Please ensure:")
        print("   1. At least one active tenant exists")
        print("   2. Tenant has active users")
        print("   3. Tenant has active permissions")
        print("   4. Run the test data creation scripts first")
#!/usr/bin/env python
"""
Debug the tenant mismatch issue between frontend and backend
"""
import os
import sys
import django
import json

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import Tenant, ClientVendorRelationship
from apps.tasks.models import TaskAllocation
from apps.users.models import User
from rest_framework_simplejwt.tokens import RefreshToken
import jwt

def debug_tenant_mismatch():
    print("=== DEBUGGING TENANT MISMATCH ===")
    
    # Frontend tenant ID from curl request
    frontend_tenant_id = "0c99e1ac-e19b-47bb-99b2-c16a33440ecf"
    
    # Backend tenant ID we tested with
    backend_tenant_id = "d7ab45d9-6e85-40aa-a1f3-896582995c6f"
    
    print(f"Frontend tenant ID: {frontend_tenant_id}")
    print(f"Backend tenant ID: {backend_tenant_id}")
    
    # Check if both tenants exist
    print("\n1. Checking tenant existence...")
    
    try:
        frontend_tenant = Tenant.objects.get(id=frontend_tenant_id)
        print(f"✅ Frontend tenant exists: {frontend_tenant.organization_name}")
    except Tenant.DoesNotExist:
        print(f"❌ Frontend tenant {frontend_tenant_id} does not exist")
        frontend_tenant = None
    
    try:
        backend_tenant = Tenant.objects.get(id=backend_tenant_id)
        print(f"✅ Backend tenant exists: {backend_tenant.organization_name}")
    except Tenant.DoesNotExist:
        print(f"❌ Backend tenant {backend_tenant_id} does not exist")
        backend_tenant = None
    
    # Check task allocations for both tenants
    print("\n2. Checking task allocations...")
    
    if frontend_tenant:
        frontend_allocations = TaskAllocation.objects.filter(task__tenant=frontend_tenant)
        print(f"Frontend tenant allocations: {frontend_allocations.count()}")
        
        # Check vendor relationships for frontend tenant
        frontend_vendor_rels = ClientVendorRelationship.objects.filter(client_tenant=frontend_tenant)
        print(f"Frontend vendor relationships: {frontend_vendor_rels.count()}")
        
        for rel in frontend_vendor_rels:
            print(f"  - Vendor: {rel.vendor_tenant.organization_name}, ID: {rel.id}")
    
    if backend_tenant:
        backend_allocations = TaskAllocation.objects.filter(task__tenant=backend_tenant)
        print(f"Backend tenant allocations: {backend_allocations.count()}")
        
        # Check vendor relationships for backend tenant
        backend_vendor_rels = ClientVendorRelationship.objects.filter(client_tenant=backend_tenant)
        print(f"Backend vendor relationships: {backend_vendor_rels.count()}")
        
        for rel in backend_vendor_rels:
            print(f"  - Vendor: {rel.vendor_tenant.organization_name}, ID: {rel.id}")
    
    # Decode the JWT token to see which user it belongs to
    print("\n3. Analyzing JWT token...")
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzU4NjQ3NTA0LCJpYXQiOjE3NTg1NjExMDQsImp0aSI6ImQ0YTk3ODdkZGM1NDQzYzQ5ZjRiNTVmOTM4MDJmZTc1IiwidXNlcl9pZCI6OH0.welkWQXBd-0UVWXph-_eUdoj_JbwEP2YmBcQBA8XWAQ"
    
    try:
        # Decode without verification to see the payload
        decoded = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded.get('user_id')
        print(f"Token user ID: {user_id}")
        
        # Get the user
        user = User.objects.get(id=user_id)
        print(f"User: {user.email}")
        
        # Check user's tenant
        if hasattr(user, 'tenant_user_profile'):
            user_tenant = user.tenant_user_profile.tenant
            print(f"User's tenant: {user_tenant.organization_name} ({user_tenant.id})")
            
            # Check if user's tenant matches frontend or backend tenant
            if str(user_tenant.id) == frontend_tenant_id:
                print("✅ User's tenant matches frontend tenant")
            elif str(user_tenant.id) == backend_tenant_id:
                print("✅ User's tenant matches backend tenant")
            else:
                print(f"❌ User's tenant doesn't match either frontend or backend tenant")
                print(f"   User tenant: {user_tenant.id}")
                print(f"   Frontend: {frontend_tenant_id}")
                print(f"   Backend: {backend_tenant_id}")
        else:
            print("❌ User has no tenant profile")
            
    except Exception as e:
        print(f"❌ Error decoding token: {e}")
    
    # List all tenants to understand the setup
    print("\n4. All tenants in system...")
    all_tenants = Tenant.objects.all()
    for tenant in all_tenants:
        print(f"  - {tenant.organization_name}: {tenant.id}")
        
        # Check if this tenant has task allocations
        allocations = TaskAllocation.objects.filter(task__tenant=tenant)
        vendor_rels = ClientVendorRelationship.objects.filter(client_tenant=tenant)
        print(f"    Allocations: {allocations.count()}, Vendor relationships: {vendor_rels.count()}")
    
    # Check if we need to create data for the frontend tenant
    print("\n5. Recommendations...")
    
    if frontend_tenant and frontend_allocations.count() == 0:
        print("🔧 Frontend tenant exists but has no task allocations")
        print("   Recommendation: Create test data for frontend tenant")
    
    if not frontend_tenant:
        print("🔧 Frontend tenant doesn't exist")
        print("   Recommendation: Check frontend configuration or create tenant")
    
    # Check if Verveland relationship exists for frontend tenant
    if frontend_tenant:
        verveland_rel = ClientVendorRelationship.objects.filter(
            client_tenant=frontend_tenant,
            vendor_tenant__organization_name__icontains="Verveland"
        ).first()
        
        if verveland_rel:
            print(f"✅ Verveland relationship exists for frontend tenant: ID={verveland_rel.id}")
        else:
            print("❌ No Verveland relationship for frontend tenant")

if __name__ == "__main__":
    debug_tenant_mismatch()
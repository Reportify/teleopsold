#!/usr/bin/env python
"""
Debug script to understand tenant filtering issues in TeamViewSet
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.teams.models import Team
from apps.tenants.models import Tenant

User = get_user_model()

def debug_tenant_filtering():
    print("🔍 Debugging Tenant Filtering...")
    
    # Get the test user
    try:
        user = User.objects.get(email='test@example.com')
        print(f"✅ Found test user: {user.email} (ID: {user.id})")
    except User.DoesNotExist:
        print("❌ Test user not found")
        return
    
    # Check user's tenant relationships
    print(f"\n📋 User Tenant Relationships:")
    print(f"  - hasattr(user, 'tenant_user_profile'): {hasattr(user, 'tenant_user_profile')}")
    
    if hasattr(user, 'tenant_user_profile'):
        try:
            tenant_profile = user.tenant_user_profile
            print(f"  - user.tenant_user_profile: {tenant_profile}")
            if tenant_profile:
                print(f"  - user.tenant_user_profile.tenant: {tenant_profile.tenant}")
                print(f"  - user.tenant_user_profile.tenant.id: {tenant_profile.tenant.id}")
        except Exception as e:
            print(f"  - Error accessing tenant_user_profile: {e}")
    
    # Check all tenants
    print(f"\n🏢 All Tenants:")
    tenants = Tenant.objects.all()
    for tenant in tenants:
        print(f"  - {tenant.organization_name} (ID: {tenant.id})")
    
    # Check all teams
    print(f"\n👥 All Teams:")
    teams = Team.objects.all().select_related('tenant')
    for team in teams:
        print(f"  - {team.name} (ID: {team.id})")
        print(f"    Tenant: {team.tenant.organization_name} (ID: {team.tenant.id})")
    
    # Try to filter teams like the ViewSet does
    print(f"\n🔍 Testing ViewSet Filtering Logic:")
    
    # Method 1: Using tenant_user_profile
    tenant = None
    if hasattr(user, 'tenant_user_profile') and user.tenant_user_profile:
        tenant = user.tenant_user_profile.tenant
        print(f"  Method 1 - tenant_user_profile: {tenant}")
        if tenant:
            filtered_teams = Team.objects.filter(tenant=tenant)
            print(f"    Teams found: {filtered_teams.count()}")
            for team in filtered_teams:
                print(f"      - {team.name} (ID: {team.id})")
    
    # Check if there's a specific tenant we should be using
    print(f"\n🎯 Expected Tenant ID from test: 5076ff5b-2074-4bb5-b5d3-5071a1ea4474")
    try:
        expected_tenant = Tenant.objects.get(id='5076ff5b-2074-4bb5-b5d3-5071a1ea4474')
        print(f"  Expected tenant found: {expected_tenant.organization_name}")
        
        # Check teams for this specific tenant
        expected_teams = Team.objects.filter(tenant=expected_tenant)
        print(f"  Teams for expected tenant: {expected_teams.count()}")
        for team in expected_teams:
            print(f"    - {team.name} (ID: {team.id})")
            
    except Tenant.DoesNotExist:
        print(f"  ❌ Expected tenant not found")

if __name__ == "__main__":
    debug_tenant_filtering()
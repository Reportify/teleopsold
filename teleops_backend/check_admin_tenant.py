#!/usr/bin/env python
"""
Script to check which tenant the admin user is assigned to
"""
import os
import sys
import django

# Add the project root to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.users.models import User
from apps.tenants.models import Tenant, TenantUserProfile

def check_admin_tenant():
    try:
        # Get admin user
        admin_user = User.objects.get(email='admin@teleops.com')
        print(f"🔍 Admin user: {admin_user.email}")
        
        # Check all tenants
        print("\n🏢 All tenants:")
        tenants = Tenant.objects.all()
        for tenant in tenants:
            print(f"  - {tenant.organization_name} (ID: {tenant.id})")
        
        # Check admin user's tenant profile
        print(f"\n👤 Admin user's tenant profile:")
        try:
            profile = admin_user.tenant_user_profile
            print(f"  - Tenant: {profile.tenant.organization_name}")
            print(f"  - Tenant ID: {profile.tenant.id}")
            print(f"  - Profile ID: {profile.id}")
        except Exception as e:
            print(f"  ❌ Error getting tenant profile: {str(e)}")
        
        # Check all tenant user profiles for admin
        print(f"\n📋 All tenant profiles for admin user:")
        profiles = TenantUserProfile.objects.filter(user=admin_user)
        print(f"Total profiles: {profiles.count()}")
        
        for profile in profiles:
            print(f"  - Tenant: {profile.tenant.organization_name}")
            print(f"    Tenant ID: {profile.tenant.id}")
            print(f"    Profile ID: {profile.id}")
            print(f"    Is active: {profile.is_active}")
            
            # Check designations for this profile
            designations = profile.designation_assignments.all()
            print(f"    Designations: {designations.count()}")
            for assignment in designations:
                print(f"      - {assignment.designation.designation_name} (active: {assignment.assignment_status})")
        
        print("\n✅ Admin tenant check completed!")
        
    except Exception as e:
        print(f"❌ Error checking admin tenant: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_admin_tenant()
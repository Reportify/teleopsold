#!/usr/bin/env python
"""
Script to enable team features for a tenant
"""
import os
import sys
import django

# Add the project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import Tenant, TenantUserProfile
from apps.users.models import User

def enable_team_features():
    """Enable team features for the tenant"""
    try:
        # Get the tenant (assuming there's only one for testing)
        tenant = Tenant.objects.first()
        if not tenant:
            print("❌ No tenant found")
            return
        
        print(f"📋 Enabling team features for tenant: {tenant.organization_name}")
        
        # Check current subscription features
        print(f"Current subscription_features: {tenant.subscription_features}")
        
        # Enable team features
        if not tenant.subscription_features:
            tenant.subscription_features = {}
        
        # Enable team-related features
        team_features = {
            'team_view': True,
            'team_create': True,
            'team_edit': True,
            'team_delete': True,
            'team_manage_members': True
        }
        
        tenant.subscription_features.update(team_features)
        tenant.save()
        
        print(f"✅ Updated subscription_features: {tenant.subscription_features}")
        
        # Also check the admin user's permissions
        admin_user = User.objects.filter(email='admin@teleops.com').first()
        if admin_user and hasattr(admin_user, 'tenant_user_profile'):
            profile = admin_user.tenant_user_profile
            print(f"👤 Admin user: {admin_user.email}")
            print(f"🏢 Tenant: {profile.tenant.organization_name}")
            
            # Check if user has any designations
            designations = profile.designation_assignments.all()
            print(f"📝 User designations: {[d.designation.designation_name for d in designations]}")
            
        print("✅ Team features enabled successfully!")
        
    except Exception as e:
        print(f"❌ Error enabling team features: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    enable_team_features()
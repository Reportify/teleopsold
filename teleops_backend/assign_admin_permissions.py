#!/usr/bin/env python
"""
Script to assign admin user to a designation with team management permissions
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

from apps.tenants.models import Tenant, TenantUserProfile, TenantDesignation, UserDesignationAssignment
from apps.users.models import User

def assign_admin_permissions():
    """Assign admin user to a designation with team management permissions"""
    try:
        # Get the admin user
        admin_user = User.objects.filter(email='admin@teleops.com').first()
        if not admin_user:
            print("❌ Admin user not found")
            return
        
        # Get the tenant user profile
        if not hasattr(admin_user, 'tenant_user_profile'):
            print("❌ Admin user has no tenant profile")
            return
        
        tenant_profile = admin_user.tenant_user_profile
        tenant = tenant_profile.tenant
        
        print(f"👤 Admin user: {admin_user.email}")
        print(f"🏢 Tenant: {tenant.organization_name}")
        
        # Check if admin designation exists
        admin_designation = TenantDesignation.objects.filter(
            tenant=tenant,
            designation_code='ADMIN'
        ).first()
        
        if not admin_designation:
            print("📝 Creating Administrator designation...")
            admin_designation = TenantDesignation.objects.create(
                tenant=tenant,
                designation_name='Administrator',
                designation_code='ADMIN',
                designation_level=1,
                description='System Administrator with full access rights',
                designation_type='non_field',
                is_system_role=True,
                can_manage_users=True,
                can_create_projects=True,
                can_assign_tasks=True,
                can_approve_expenses=True,
                can_access_reports=True,
                permissions=['*'],  # Full permissions
                feature_access={'all': True},
                data_access_level='Admin',
                is_active=True
            )
            print(f"✅ Created designation: {admin_designation.designation_name}")
        else:
            print(f"📝 Found existing designation: {admin_designation.designation_name}")
        
        # Check if user is already assigned to this designation
        existing_assignment = UserDesignationAssignment.objects.filter(
            user_profile=tenant_profile,
            designation=admin_designation,
            is_active=True
        ).first()
        
        if not existing_assignment:
            print("🔗 Assigning user to Administrator designation...")
            assignment = UserDesignationAssignment.objects.create(
                user_profile=tenant_profile,
                designation=admin_designation,
                is_primary_designation=True,
                assignment_status='Active',
                assigned_by=admin_user  # Self-assigned for admin
            )
            print(f"✅ User assigned to designation: {assignment.designation.designation_name}")
        else:
            print(f"✅ User already assigned to designation: {existing_assignment.designation.designation_name}")
        
        # List all user designations
        designations = UserDesignationAssignment.objects.filter(
            user_profile=tenant_profile,
            is_active=True
        )
        print(f"📋 User designations: {[d.designation.designation_name for d in designations]}")
        
        print("✅ Admin permissions assigned successfully!")
        
    except Exception as e:
        print(f"❌ Error assigning admin permissions: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    assign_admin_permissions()
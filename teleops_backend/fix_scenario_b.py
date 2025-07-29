#!/usr/bin/env python3
"""
Fix Scenario B: Assign permissions to existing designations
Run this if debug_info shows designation_assignments_count > 0 but raw_permissions_count: 0
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.append('.')
django.setup()

from django.utils import timezone
from apps.tenants.models import *

def fix_scenario_b():
    print("🔧 FIXING SCENARIO B: Assigning Permissions to Designations")
    print("=" * 60)
    
    # Get tenant
    tenant = Tenant.objects.filter(is_active=True).first()
    print(f"✅ Working with tenant: {tenant.organization_name}")
    
    # 1. Create basic permissions if they don't exist
    print("\n1️⃣ Ensuring basic permissions exist...")
    permissions_data = [
        ('site_management.view_sites', 'View Sites', 'Site Management'),
        ('project_management.view_projects', 'View Projects', 'Project Management'),
        ('task_management.view_tasks', 'View Tasks', 'Task Management'),
        ('user_management.view_users', 'View Users', 'User Management'),
    ]
    
    for code, name, category in permissions_data:
        perm, created = PermissionRegistry.objects.get_or_create(
            tenant=tenant,
            permission_code=code,
            defaults={
                'permission_name': name,
                'permission_category': category,
                'permission_type': 'access',
                'risk_level': 'low',
                'is_active': True
            }
        )
        if created:
            print(f"   ✅ Created permission: {name}")
    
    # 2. Get all existing designations
    print("\n2️⃣ Finding existing designations...")
    designations = TenantDesignation.objects.filter(tenant=tenant, is_active=True)
    
    for designation in designations:
        print(f"   📋 Found: {designation.designation_name} ({designation.designation_code})")
        
        # Check current permission count
        current_perms = DesignationBasePermission.objects.filter(
            designation=designation, is_active=True
        ).count()
        print(f"      Current permissions: {current_perms}")
    
    # 3. Assign basic permissions to each designation
    print("\n3️⃣ Assigning permissions to designations...")
    
    basic_permissions = PermissionRegistry.objects.filter(
        tenant=tenant,
        permission_code__in=['site_management.view_sites', 'project_management.view_projects'],
        is_active=True
    )
    
    for designation in designations:
        if 'admin' not in designation.designation_code.lower():
            # Assign basic permissions to non-admin designations
            for permission in basic_permissions:
                assignment, created = DesignationBasePermission.objects.get_or_create(
                    designation=designation,
                    permission=permission,
                    defaults={
                        'permission_level': 'granted',
                        'is_active': True
                    }
                )
                if created:
                    print(f"   ✅ Assigned {permission.permission_name} to {designation.designation_name}")
    
    # 4. Verify the fix
    print("\n4️⃣ Verification...")
    for designation in designations:
        perm_count = DesignationBasePermission.objects.filter(
            designation=designation, is_active=True
        ).count()
        print(f"   {designation.designation_name}: {perm_count} permissions")
    
    print(f"\n🎉 Scenario B fix complete! Test the API again.")

if __name__ == "__main__":
    fix_scenario_b()
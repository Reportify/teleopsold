#!/usr/bin/env python3
"""
Fix Scenario A: Create designations and assign users
Run this if debug_info shows designation_assignments_count: 0
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
sys.path.append('.')
django.setup()

from django.utils import timezone
from apps.tenants.models import *

def fix_scenario_a():
    print("🔧 FIXING SCENARIO A: Creating Designations and Assignments")
    print("=" * 60)
    
    # Get tenant
    tenant = Tenant.objects.filter(is_active=True).first()
    print(f"✅ Working with tenant: {tenant.organization_name}")
    
    # 1. Create basic permissions
    print("\n1️⃣ Creating basic permissions...")
    permissions_data = [
        ('site_management.view_sites', 'View Sites', 'Site Management', 'low'),
        ('project_management.view_projects', 'View Projects', 'Project Management', 'low'),
        ('user_management.view_users', 'View Users', 'User Management', 'medium'),
        ('task_management.view_tasks', 'View Tasks', 'Task Management', 'low'),
        ('report.view_reports', 'View Reports', 'Reporting', 'low'),
    ]
    
    created_permissions = []
    for code, name, category, risk in permissions_data:
        perm, created = PermissionRegistry.objects.get_or_create(
            tenant=tenant,
            permission_code=code,
            defaults={
                'permission_name': name,
                'permission_category': category,
                'permission_type': 'access',
                'risk_level': risk,
                'is_active': True
            }
        )
        if created:
            print(f"   ✅ Created: {name}")
        created_permissions.append(perm)
    
    # 2. Create basic designations
    print("\n2️⃣ Creating basic designations...")
    designations_data = [
        ('basic_user', 'Basic User', 'Standard user with basic viewing permissions'),
        ('project_viewer', 'Project Viewer', 'Can view projects and related data'),
        ('site_manager', 'Site Manager', 'Can manage site operations'),
    ]
    
    created_designations = []
    for code, name, desc in designations_data:
        desig, created = TenantDesignation.objects.get_or_create(
            tenant=tenant,
            designation_code=code,
            defaults={
                'designation_name': name,
                'description': desc,
                'is_active': True
            }
        )
        if created:
            print(f"   ✅ Created: {name}")
        created_designations.append(desig)
    
    # 3. Assign permissions to designations
    print("\n3️⃣ Assigning permissions to designations...")
    
    # Basic User gets basic permissions
    basic_user = TenantDesignation.objects.get(tenant=tenant, designation_code='basic_user')
    basic_permissions = PermissionRegistry.objects.filter(
        tenant=tenant,
        permission_code__in=['site_management.view_sites', 'project_management.view_projects']
    )
    
    for perm in basic_permissions:
        assignment, created = DesignationBasePermission.objects.get_or_create(
            designation=basic_user,
            permission=perm,
            defaults={'permission_level': 'granted', 'is_active': True}
        )
        if created:
            print(f"   ✅ Assigned {perm.permission_name} to Basic User")
    
    # Project Viewer gets more permissions
    project_viewer = TenantDesignation.objects.get(tenant=tenant, designation_code='project_viewer')
    project_permissions = PermissionRegistry.objects.filter(
        tenant=tenant,
        permission_code__in=['site_management.view_sites', 'project_management.view_projects', 'task_management.view_tasks']
    )
    
    for perm in project_permissions:
        assignment, created = DesignationBasePermission.objects.get_or_create(
            designation=project_viewer,
            permission=perm,
            defaults={'permission_level': 'granted', 'is_active': True}
        )
        if created:
            print(f"   ✅ Assigned {perm.permission_name} to Project Viewer")
    
    # 4. Assign users to designations
    print("\n4️⃣ Assigning non-admin users to designations...")
    
    users = TenantUserProfile.objects.filter(tenant=tenant, is_active=True)
    
    for user in users:
        # Check if user is admin
        is_admin = UserDesignationAssignment.objects.filter(
            user_profile=user,
            designation__designation_code__icontains='admin'
        ).exists()
        
        # Check if user already has assignments
        has_assignments = UserDesignationAssignment.objects.filter(
            user_profile=user,
            is_active=True
        ).exists()
        
        if not is_admin and not has_assignments:
            # Assign to basic_user designation
            assignment = UserDesignationAssignment.objects.create(
                user_profile=user,
                designation=basic_user,
                is_active=True,
                assignment_status='Active',
                effective_from=timezone.now().date()
            )
            print(f"   ✅ Assigned {user.user.email} to Basic User")
    
    print(f"\n🎉 Scenario A fix complete! Test the API again.")

if __name__ == "__main__":
    fix_scenario_a()
#!/usr/bin/env python3
"""
Debug script to investigate RBAC service permission retrieval
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q
from apps.tenants.models import (
    TenantUserProfile, DesignationBasePermission, 
    UserDesignationAssignment, PermissionRegistry
)
from apps.tenants.services.simple_rbac_service import SimpleRBACService

User = get_user_model()

def debug_rbac_service():
    """Debug the RBAC service permission retrieval"""
    
    try:
        # Get admin user
        admin_user = User.objects.get(email='admin@teleops.com')
        user_profile = admin_user.tenant_user_profile
        
        print(f"🔍 Debugging RBAC Service for user: {admin_user.email}")
        print(f"📋 User tenant: {user_profile.tenant.organization_name}")
        print(f"🆔 User tenant ID: {user_profile.tenant.id}")
        print()
        
        # Check designation assignments
        print("👤 User Designation Assignments:")
        assignments = user_profile.designation_assignments.filter(
            is_active=True,
            assignment_status='Active',
            effective_from__lte=timezone.now().date()
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=timezone.now().date())
        )
        
        for assignment in assignments:
            print(f"  - {assignment.designation.designation_name} ({assignment.designation.designation_code})")
            print(f"    Status: {assignment.assignment_status}")
            print(f"    Active: {assignment.is_active}")
            print(f"    Effective from: {assignment.effective_from}")
            print(f"    Effective to: {assignment.effective_to}")
            print()
            
            # Check base permissions for this designation
            print(f"  📋 Base Permissions for {assignment.designation.designation_name}:")
            base_perms = DesignationBasePermission.objects.filter(
                designation=assignment.designation,
                is_active=True,
                permission__is_active=True
            ).select_related('permission')
            
            print(f"    Total base permissions found: {base_perms.count()}")
            
            for base_perm in base_perms:
                permission = base_perm.permission
                print(f"    - {permission.permission_code}: {permission.permission_name}")
                print(f"      Permission tenant: {permission.tenant.organization_name}")
                print(f"      Permission tenant ID: {permission.tenant.id}")
                print(f"      User tenant ID: {user_profile.tenant.id}")
                print(f"      Tenant match: {permission.tenant.id == user_profile.tenant.id}")
                print(f"      Permission active: {permission.is_active}")
                print(f"      Base perm active: {base_perm.is_active}")
                print(f"      Permission level: {base_perm.permission_level}")
                print()
            
            # Now test the RBAC service filtering
            print(f"  🔍 RBAC Service Filtering Test:")
            rbac_filtered_perms = DesignationBasePermission.objects.filter(
                designation=assignment.designation,
                is_active=True,
                permission__is_active=True,
                permission__tenant=user_profile.tenant  # This is the key filter
            ).select_related('permission')
            
            print(f"    RBAC filtered permissions count: {rbac_filtered_perms.count()}")
            for perm in rbac_filtered_perms:
                print(f"    - {perm.permission.permission_code}")
            print()
        
        # Test the actual RBAC service
        print("🎯 Testing SimpleRBACService:")
        permissions = SimpleRBACService.get_user_permissions(user_profile)
        print(f"Total permissions returned: {len(permissions.get('permissions', {}))}")
        
        team_perms = {k: v for k, v in permissions.get('permissions', {}).items() if k.startswith('team.')}
        print(f"Team permissions returned: {len(team_perms)}")
        
        for perm_code, perm_data in team_perms.items():
            print(f"  - {perm_code}: {perm_data.get('level', 'unknown')}")
        
        print()
        print("🔍 All team permissions in PermissionRegistry:")
        all_team_perms = PermissionRegistry.objects.filter(
            permission_code__startswith='team.',
            is_active=True
        )
        
        for perm in all_team_perms:
            print(f"  - {perm.permission_code} (Tenant: {perm.tenant.organization_name})")
        
    except Exception as e:
        print(f"❌ Error during debug: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_rbac_service()
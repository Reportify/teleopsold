#!/usr/bin/env python3
"""
Debug script to understand why non-administrator users have zero permissions.
This will help identify the root cause of the permission issue.
"""

import os
import sys
import django
from datetime import date

# Add the project path
sys.path.append('/i%3A/teleops/teleops_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

django.setup()

from django.utils import timezone
from apps.tenants.models import (
    Tenant, TenantUserProfile, UserDesignationAssignment, 
    TenantDesignation, DesignationBasePermission, PermissionRegistry
)
from apps.tenants.services import get_rbac_service

def debug_permissions():
    """Debug permission system to understand why users have zero permissions."""
    print("🔍 DEBUGGING PERMISSION SYSTEM")
    print("=" * 60)
    
    try:
        # Get the first tenant
        tenant = Tenant.objects.filter(is_active=True).first()
        if not tenant:
            print("❌ No active tenant found")
            return
            
        print(f"✅ Debugging tenant: {tenant.organization_name}")
        
        # Get RBAC service
        rbac_service = get_rbac_service(tenant)
        
        # Get all users
        users = TenantUserProfile.objects.filter(
            tenant=tenant,
            is_active=True
        ).select_related('user')
        
        print(f"✅ Found {len(users)} active users")
        
        # Check each user in detail
        for user in users:
            print(f"\n🔍 DETAILED ANALYSIS FOR: {user.user.get_full_name()} ({user.user.email})")
            print("-" * 50)
            
            # 1. Check if user is administrator
            is_admin = rbac_service._is_administrator(user)
            print(f"1️⃣ Is Administrator: {is_admin}")
            
            # 2. Check designation assignments
            assignments = UserDesignationAssignment.objects.filter(
                user_profile=user,
                is_active=True
            ).select_related('designation')
            
            print(f"2️⃣ Designation Assignments: {assignments.count()}")
            for assignment in assignments:
                print(f"   📋 {assignment.designation.designation_name} (Code: {assignment.designation.designation_code})")
                print(f"      Status: {assignment.assignment_status}")
                print(f"      Effective: {assignment.effective_from} to {assignment.effective_to or 'No end date'}")
                print(f"      Currently Effective: {assignment.is_currently_effective()}")
                
                # Check if this designation has permissions
                designation_perms = DesignationBasePermission.objects.filter(
                    designation=assignment.designation,
                    is_active=True
                ).select_related('permission')
                
                print(f"      🔑 Permissions on this designation: {designation_perms.count()}")
                for perm in designation_perms[:3]:  # Show first 3 permissions
                    print(f"         - {perm.permission.permission_name} ({perm.permission.permission_code})")
                if designation_perms.count() > 3:
                    print(f"         ... and {designation_perms.count() - 3} more")
            
            # 3. Calculate effective permissions using the RBAC service
            print(f"3️⃣ RBAC Service Calculation:")
            try:
                effective_perms = rbac_service.get_user_effective_permissions(user, force_refresh=True)
                perm_count = len(effective_perms.get('permissions', {}))
                print(f"   📊 Total Effective Permissions: {perm_count}")
                
                if perm_count > 0:
                    print(f"   🎯 Sample permissions:")
                    sample_perms = list(effective_perms.get('permissions', {}).keys())[:3]
                    for perm_code in sample_perms:
                        print(f"      - {perm_code}")
                else:
                    print(f"   ❌ NO PERMISSIONS FOUND")
                    
                # Show metadata
                metadata = effective_perms.get('metadata', {})
                sources = metadata.get('sources', {})
                print(f"   📈 Sources: Designation={sources.get('designation_count', 0)}, "
                      f"Group={sources.get('group_count', 0)}, Override={sources.get('override_count', 0)}")
                
            except Exception as e:
                print(f"   ❌ Error calculating permissions: {str(e)}")
            
            # 4. Manual check of designation permissions
            print(f"4️⃣ Manual Designation Permission Check:")
            designation_permissions = rbac_service._get_designation_permissions(user)
            print(f"   📊 Manual designation permissions count: {len(designation_permissions)}")
            
            print("")
        
        # 5. Check overall tenant permission data
        print(f"\n📊 TENANT PERMISSION OVERVIEW")
        print("-" * 40)
        
        total_permissions = PermissionRegistry.objects.filter(tenant=tenant, is_active=True).count()
        print(f"Total Active Permissions in Registry: {total_permissions}")
        
        total_designations = TenantDesignation.objects.filter(tenant=tenant, is_active=True).count()
        print(f"Total Active Designations: {total_designations}")
        
        total_designation_perms = DesignationBasePermission.objects.filter(
            designation__tenant=tenant,
            is_active=True
        ).count()
        print(f"Total Designation-Permission Assignments: {total_designation_perms}")
        
        total_user_assignments = UserDesignationAssignment.objects.filter(
            user_profile__tenant=tenant,
            is_active=True
        ).count()
        print(f"Total User-Designation Assignments: {total_user_assignments}")
        
        # Check for specific issues
        print(f"\n🚨 POTENTIAL ISSUES:")
        
        # Check if there are permissions but no designation assignments
        if total_permissions > 0 and total_designation_perms == 0:
            print("❌ Permissions exist but none are assigned to designations")
            
        # Check if there are designations but no user assignments
        if total_designations > 0 and total_user_assignments == 0:
            print("❌ Designations exist but no users are assigned to them")
            
        # Check if designation assignments exist but are not effective
        effective_assignments = UserDesignationAssignment.objects.filter(
            user_profile__tenant=tenant,
            is_active=True,
            assignment_status='Active'
        ).count()
        
        if total_user_assignments > effective_assignments:
            print(f"⚠️ {total_user_assignments - effective_assignments} user assignments are not active/effective")
            
    except Exception as e:
        print(f"❌ Error during debugging: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_permissions()
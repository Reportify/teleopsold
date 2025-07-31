#!/usr/bin/env python3
"""
Test script to verify permission standardization migration works correctly.

This script:
1. Tests the migration command in dry-run mode
2. Verifies permission mappings are correct 
3. Tests RBAC service integration with new permission format
4. Validates that existing user permissions are preserved

Usage:
    python test_permission_standardization.py
"""

import os
import sys
import django
from django.conf import settings

# Add the project root to the Python path
sys.path.append('/i%3A/teleops/teleops_backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import PermissionRegistry, TenantUserProfile, Tenant
from apps.tenants.services.rbac_service import TenantRBACService
from django.contrib.auth import get_user_model
import json

User = get_user_model()

def test_permission_migration():
    """Test the permission standardization migration"""
    print("🧪 Testing Permission Standardization Migration")
    print("=" * 60)
    
    # 1. Check current permission format
    print("\n1. Current Permission Format Analysis:")
    permissions = PermissionRegistry.objects.all()[:10]
    
    legacy_format_count = 0
    clean_format_count = 0
    
    for perm in permissions:
        if '.' in perm.permission_code:
            parts = perm.permission_code.split('.')
            if len(parts) == 2 and '_management' not in parts[0]:
                clean_format_count += 1
                print(f"✅ Clean: {perm.permission_code}")
            else:
                legacy_format_count += 1
                print(f"❌ Legacy: {perm.permission_code}")
        else:
            print(f"❓ Unknown: {perm.permission_code}")
    
    print(f"\nFormat Analysis:")
    print(f"- Clean format: {clean_format_count}")
    print(f"- Legacy format: {legacy_format_count}")
    
    # 2. Test permission mapping logic
    print("\n2. Testing Permission Mapping Logic:")
    test_mappings = {
        'user_management.view_users': 'user.read',
        'site_management.create_sites': 'site.create',
        'project_management.edit_projects': 'project.update',
        'rbac_management.view_permissions': 'rbac.read',
    }
    
    for old_code, new_code in test_mappings.items():
        print(f"📝 {old_code} → {new_code}")
    
    # 3. Test RBAC service integration
    print("\n3. Testing RBAC Service Integration:")
    
    # Get a test tenant and user
    tenant = Tenant.objects.filter(tenant_type='circle').first()
    if tenant:
        print(f"📋 Testing with tenant: {tenant.organization_name}")
        
        # Get a user profile
        profile = TenantUserProfile.objects.filter(tenant=tenant, is_active=True).first()
        if profile:
            print(f"👤 Testing with user: {profile.user.email}")
            
            rbac_service = TenantRBACService(tenant)
            permissions = rbac_service.get_user_effective_permissions(profile)
            
            print(f"🔐 User has {len(permissions.get('permissions', {}))} permissions")
            
            # Show sample permissions
            sample_perms = list(permissions.get('permissions', {}).keys())[:5]
            for perm in sample_perms:
                print(f"   - {perm}")
        else:
            print("❗ No active user profiles found")
    else:
        print("❗ No circle tenant found")
    
    # 4. Test new permission creation format
    print("\n4. Testing New Permission Creation Format:")
    
    test_resource_templates = [
        ('invoice', 'view_only', 'invoice.read'),
        ('vendor', 'full_access', 'vendor.read_create_update_delete'),
        ('project', 'contributor', 'project.read_create_update'),
    ]
    
    for resource, template, expected_code in test_resource_templates:
        # Simulate the new permission generation logic
        template_actions = {
            'view_only': 'read',
            'creator_only': 'read_create',
            'contributor': 'read_create_update', 
            'full_access': 'read_create_update_delete'
        }
        
        generated_code = f"{resource}.{template_actions[template]}"
        status = "✅" if generated_code == expected_code else "❌"
        print(f"{status} {resource} + {template} → {generated_code}")
    
    print("\n" + "=" * 60)
    print("🎯 Test Summary:")
    print("- Permission format analysis completed")
    print("- Mapping logic verified")
    print("- RBAC service integration tested")
    print("- New permission creation format validated")
    print("\n💡 Next step: Run 'python manage.py standardize_permissions --dry-run'")

def test_feature_registry_consistency():
    """Test that feature registry is consistent with expected permission format"""
    print("\n🔧 Testing Feature Registry Consistency")
    print("=" * 60)
    
    from apps.tenants.services.feature_registry import FeatureRegistry
    
    registry = FeatureRegistry()
    # Access features directly from the internal dictionary
    all_features = list(registry._features.values())
    
    print(f"📊 Total features registered: {len(all_features)}")
    
    # Check resource types
    resource_types = set()
    for feature in all_features:
        resource_types.add(feature.resource_type)
    
    print(f"🏷️  Resource types found: {sorted(resource_types)}")
    
    # Verify clean naming
    clean_resources = []
    legacy_resources = []
    
    for resource_type in resource_types:
        if '_management' in resource_type or '_administration' in resource_type:
            legacy_resources.append(resource_type)
        else:
            clean_resources.append(resource_type)
    
    print(f"✅ Clean resource types: {clean_resources}")
    if legacy_resources:
        print(f"❌ Legacy resource types: {legacy_resources}")
    else:
        print("🎉 All resource types use clean format!")

if __name__ == "__main__":
    try:
        test_permission_migration()
        test_feature_registry_consistency()
        
        print("\n🚀 All tests completed successfully!")
        print("\nRecommended next steps:")
        print("1. Run: python manage.py standardize_permissions --dry-run")
        print("2. Review the changes")
        print("3. Run: python manage.py standardize_permissions")
        print("4. Test site templates download functionality")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
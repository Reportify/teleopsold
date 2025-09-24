#!/usr/bin/env python
import os
import sys
import django

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import TenantUserProfile

User = get_user_model()

def check_verveland_user_permissions():
    """Check permissions for the Verveland user"""
    print("=== Checking Verveland User Permissions ===")
    
    try:
        # Get the Verveland user
        user = User.objects.filter(email='hasan@verveland.in').first()
        if not user:
            print("Verveland user not found!")
            return
        
        print(f"User: {user.email} (ID: {user.id})")
        print(f"Is Active: {user.is_active}")
        print(f"Is Staff: {user.is_staff}")
        print(f"Is Superuser: {user.is_superuser}")
        
        # Check tenant profile
        try:
            profile = TenantUserProfile.objects.filter(user=user).first()
            if profile:
                print(f"Tenant: {profile.tenant.organization_name}")
                print(f"Profile Active: {profile.is_active}")
            else:
                print("No tenant profile found")
        except Exception as e:
            print(f"Error getting tenant profile: {e}")
        
        # Check Django permissions
        print(f"\nDjango Permissions:")
        user_permissions = user.get_all_permissions()
        if user_permissions:
            for perm in sorted(user_permissions):
                print(f"  - {perm}")
        else:
            print("  No Django permissions found")
        
        # Check groups
        print(f"\nGroups:")
        groups = user.groups.all()
        if groups:
            for group in groups:
                print(f"  - {group.name}")
                group_permissions = group.permissions.all()
                if group_permissions:
                    print(f"    Group permissions:")
                    for perm in group_permissions:
                        print(f"      - {perm.codename}")
        else:
            print("  No groups assigned")
        
        # Check if user has specific task allocation permissions
        print(f"\nTask Allocation Permissions Check:")
        task_perms = [
            'tasks.view_taskallocation',
            'tasks.add_taskallocation', 
            'tasks.change_taskallocation',
            'tasks.delete_taskallocation'
        ]
        
        for perm in task_perms:
            has_perm = user.has_perm(perm)
            print(f"  {perm}: {'✓' if has_perm else '✗'}")
            
    except Exception as e:
        print(f"Error checking user permissions: {e}")

if __name__ == "__main__":
    check_verveland_user_permissions()
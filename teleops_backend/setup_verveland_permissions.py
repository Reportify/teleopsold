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
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from apps.tenants.models import TenantUserProfile

User = get_user_model()

def setup_verveland_permissions():
    """Setup permissions for the Verveland user"""
    print("=== Setting up Verveland User Permissions ===")
    
    try:
        # Get the Verveland user
        user = User.objects.filter(email='hasan@verveland.in').first()
        if not user:
            print("Verveland user not found!")
            return
        
        print(f"User: {user.email} (ID: {user.id})")
        
        # Check available groups
        print("\nAvailable Groups:")
        groups = Group.objects.all()
        for group in groups:
            print(f"  - {group.name}")
            
        # Check task-related permissions
        print("\nTask-related Permissions:")
        task_permissions = Permission.objects.filter(
            content_type__app_label='tasks'
        ).order_by('codename')
        
        for perm in task_permissions:
            print(f"  - {perm.codename}: {perm.name}")
        
        # Try to find or create a suitable group for task management
        task_group, created = Group.objects.get_or_create(
            name='Task Managers',
            defaults={'name': 'Task Managers'}
        )
        
        if created:
            print(f"\nCreated new group: {task_group.name}")
        else:
            print(f"\nUsing existing group: {task_group.name}")
        
        # Add task allocation permissions to the group
        task_allocation_perms = Permission.objects.filter(
            content_type__app_label='tasks',
            codename__in=['view_taskallocation', 'add_taskallocation', 'change_taskallocation']
        )
        
        for perm in task_allocation_perms:
            task_group.permissions.add(perm)
            print(f"Added permission {perm.codename} to {task_group.name}")
        
        # Add user to the group
        user.groups.add(task_group)
        print(f"\nAdded user {user.email} to group {task_group.name}")
        
        # Verify permissions
        print(f"\nVerifying permissions for {user.email}:")
        task_perms = [
            'tasks.view_taskallocation',
            'tasks.add_taskallocation', 
            'tasks.change_taskallocation',
            'tasks.delete_taskallocation'
        ]
        
        for perm in task_perms:
            has_perm = user.has_perm(perm)
            print(f"  {perm}: {'✓' if has_perm else '✗'}")
            
        print("\nSetup completed successfully!")
            
    except Exception as e:
        print(f"Error setting up permissions: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    setup_verveland_permissions()
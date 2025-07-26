"""
Management command to assign administrator permissions to existing users.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.tenants.models import (
    Tenant, PermissionGroup, UserPermissionGroupAssignment, 
    TenantUserProfile
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Assign administrator permissions to existing users'

    def handle(self, *args, **options):
        try:
            # Get first tenant
            tenant = Tenant.objects.first()
            if not tenant:
                self.stdout.write(self.style.ERROR('No tenant found'))
                return
                
            self.stdout.write(f'Using tenant: {tenant.organization_name}')
            
            # Find the administrators group
            try:
                admin_group = PermissionGroup.objects.get(
                    tenant=tenant,
                    group_code='administrators'
                )
                self.stdout.write(f'Found administrators group: {admin_group.group_name}')
            except PermissionGroup.DoesNotExist:
                self.stdout.write(self.style.ERROR('Administrators group not found. Run init_rbac_permissions first.'))
                return
            
            # Get all users and assign them to admin group
            users = User.objects.all()
            self.stdout.write(f'Found {users.count()} users')
            
            for user in users:
                self.stdout.write(f'Processing user: {user.email}')
                
                # Find or create user profile for this tenant
                user_profile, created = TenantUserProfile.objects.get_or_create(
                    user=user,
                    tenant=tenant,
                    defaults={
                        'display_name': f'{user.first_name} {user.last_name}'.strip() or user.email,
                        'is_active': True,
                        'job_title': 'Administrator'
                    }
                )
                
                if created:
                    self.stdout.write(f'  Created user profile for {user.email}')
                
                # Assign user to administrators group
                _, assignment_created = UserPermissionGroupAssignment.objects.get_or_create(
                    user_profile=user_profile,
                    group=admin_group,
                    defaults={
                        'assigned_by': user,  # Self-assigned for initial setup
                        'assignment_reason': 'Initial administrator setup',
                        'is_active': True
                    }
                )
                
                if assignment_created:
                    self.stdout.write(f'  ✓ Assigned {user.email} to administrators group')
                else:
                    self.stdout.write(f'  - {user.email} already in administrators group')
            
            # Show assigned permissions
            self.stdout.write('\nAdministrator permissions include:')
            group_permissions = admin_group.group_permissions.filter(is_active=True)
            for gp in group_permissions:
                self.stdout.write(f'  ✓ {gp.permission.permission_name} ({gp.permission.permission_code})')
                
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nAll users now have administrator access to {tenant.organization_name}'
                )
            )
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}')) 
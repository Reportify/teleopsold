"""
Management command to assign administrator permissions to a user.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.tenants.models import (
    Tenant, PermissionGroup, UserPermissionGroupAssignment, 
    TenantUserProfile
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Assign administrator permissions to a user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-email',
            type=str,
            help='Email of the user to make administrator',
            required=True
        )
        parser.add_argument(
            '--tenant-id',
            type=str,
            help='Tenant ID (optional, uses first tenant if not specified)',
        )

    def handle(self, *args, **options):
        user_email = options['user_email']
        tenant_id = options.get('tenant_id')
        
        try:
            # Find the user
            user = User.objects.get(email=user_email)
            self.stdout.write(f'Found user: {user.email}')
            
            # Find tenant
            if tenant_id:
                tenant = Tenant.objects.get(id=tenant_id)
            else:
                tenant = Tenant.objects.first()
                
            if not tenant:
                self.stdout.write(self.style.ERROR('No tenant found'))
                return
                
            self.stdout.write(f'Using tenant: {tenant.organization_name}')
            
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
                self.stdout.write(f'Created user profile for {user.email} in {tenant.organization_name}')
            else:
                self.stdout.write(f'User profile already exists for {user.email} in {tenant.organization_name}')
            
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
            
            # Assign user to administrators group
            _, created = UserPermissionGroupAssignment.objects.get_or_create(
                user_profile=user_profile,
                group=admin_group,
                defaults={
                    'assigned_by': user,  # Self-assigned for initial setup
                    'assignment_reason': 'Initial administrator setup',
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Successfully assigned {user.email} to administrators group'
                    )
                )
            else:
                self.stdout.write(f'User {user.email} is already in administrators group')
            
            # Show assigned permissions
            self.stdout.write('\nAdministrator permissions assigned:')
            group_permissions = admin_group.group_permissions.filter(is_active=True)
            for gp in group_permissions:
                self.stdout.write(f'  ✓ {gp.permission.permission_name} ({gp.permission.permission_code})')
                
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n{user.email} now has administrator access to {tenant.organization_name}'
                )
            )
                
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with email {user_email} not found'))
        except Tenant.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Tenant with ID {tenant_id} not found'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}')) 
"""
Management command to initialize basic RBAC permissions for testing.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.tenants.models import (
    Tenant, PermissionRegistry, PermissionGroup, 
    PermissionGroupPermission, TenantUserProfile
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Initialize basic RBAC permissions for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant-id',
            type=str,
            help='Tenant ID to create permissions for (optional)',
        )

    def handle(self, *args, **options):
        tenant_id = options.get('tenant_id')
        
        if tenant_id:
            tenants = Tenant.objects.filter(id=tenant_id)
        else:
            tenants = Tenant.objects.all()[:1]  # Use first tenant if none specified

        for tenant in tenants:
            self.stdout.write(f'Creating permissions for tenant: {tenant.organization_name}')
            self.create_permissions_for_tenant(tenant)

    def create_permissions_for_tenant(self, tenant):
        """Create basic permissions for a tenant."""
        
        # Basic permission categories and permissions
        permissions_data = [
            # User Management
            {
                'permission_name': 'View Users',
                'permission_code': 'user_management.view_users',
                'permission_category': 'User Management',
                'description': 'View user profiles and basic information',
                'permission_type': 'access',
                'risk_level': 'low',
                'requires_scope': False,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Create Users',
                'permission_code': 'user_management.create_users',
                'permission_category': 'User Management',
                'description': 'Create new user accounts',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Edit Users',
                'permission_code': 'user_management.edit_users',
                'permission_category': 'User Management',
                'description': 'Edit user profiles and information',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Delete Users',
                'permission_code': 'user_management.delete_users',
                'permission_category': 'User Management',
                'description': 'Delete or deactivate user accounts',
                'permission_type': 'action',
                'risk_level': 'high',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            
            # Project Management
            {
                'permission_name': 'View Projects',
                'permission_code': 'project_management.view_projects',
                'permission_category': 'Project Management',
                'description': 'View project information and details',
                'permission_type': 'access',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': False
            },
            {
                'permission_name': 'Create Projects',
                'permission_code': 'project_management.create_projects',
                'permission_category': 'Project Management',
                'description': 'Create new projects',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Edit Projects',
                'permission_code': 'project_management.edit_projects',
                'permission_category': 'Project Management',
                'description': 'Edit project information and settings',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            
            # Site Management
            {
                'permission_name': 'View Sites',
                'permission_code': 'site_management.view_sites',
                'permission_category': 'Site Management',
                'description': 'View site information and locations',
                'permission_type': 'access',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': False
            },
            {
                'permission_name': 'Create Sites',
                'permission_code': 'site_management.create_sites',
                'permission_category': 'Site Management',
                'description': 'Create new site entries',
                'permission_type': 'action',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': True
            },
            
            # RBAC Management
            {
                'permission_name': 'View Permissions',
                'permission_code': 'rbac_management.view_permissions',
                'permission_category': 'RBAC Management',
                'description': 'View permission configurations',
                'permission_type': 'access',
                'risk_level': 'medium',
                'requires_scope': False,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Manage Permissions',
                'permission_code': 'rbac_management.manage_permissions',
                'permission_category': 'RBAC Management',
                'description': 'Create, edit, and delete permissions',
                'permission_type': 'administrative',
                'risk_level': 'critical',
                'requires_scope': False,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Grant Permissions',
                'permission_code': 'rbac_management.grant_permissions',
                'permission_category': 'RBAC Management',
                'description': 'Grant permissions to users and roles',
                'permission_type': 'administrative',
                'risk_level': 'high',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            
            # Task Management
            {
                'permission_name': 'View Tasks',
                'permission_code': 'task_management.view_tasks',
                'permission_category': 'Task Management',
                'description': 'View task assignments and progress',
                'permission_type': 'access',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': False
            },
            {
                'permission_name': 'Assign Tasks',
                'permission_code': 'task_management.assign_tasks',
                'permission_category': 'Task Management',
                'description': 'Assign tasks to team members',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': True
            }
        ]
        
        created_permissions = []
        for perm_data in permissions_data:
            permission, created = PermissionRegistry.objects.get_or_create(
                tenant=tenant,
                permission_code=perm_data['permission_code'],
                defaults={
                    **perm_data,
                    'is_system_permission': False,
                    'is_active': True
                }
            )
            
            if created:
                created_permissions.append(permission)
                self.stdout.write(f'  ✓ Created permission: {permission.permission_name}')
            else:
                self.stdout.write(f'  - Permission exists: {permission.permission_name}')
        
        # Create sample permission groups
        groups_data = [
            {
                'group_name': 'Administrators',
                'group_code': 'administrators',
                'description': 'Full system administrators with all permissions',
                'group_type': 'administrative',
                'permissions': [
                    'user_management.view_users',
                    'user_management.create_users',
                    'user_management.edit_users',
                    'user_management.delete_users',
                    'project_management.view_projects',
                    'project_management.create_projects',
                    'project_management.edit_projects',
                    'rbac_management.view_permissions',
                    'rbac_management.manage_permissions',
                    'rbac_management.grant_permissions'
                ]
            },
            {
                'group_name': 'Project Managers',
                'group_code': 'project_managers',
                'description': 'Project management team with project and site access',
                'group_type': 'functional',
                'permissions': [
                    'user_management.view_users',
                    'project_management.view_projects',
                    'project_management.create_projects',
                    'project_management.edit_projects',
                    'site_management.view_sites',
                    'site_management.create_sites',
                    'task_management.view_tasks',
                    'task_management.assign_tasks'
                ]
            },
            {
                'group_name': 'Field Engineers',
                'group_code': 'field_engineers',
                'description': 'Field engineering team with task and site access',
                'group_type': 'functional',
                'permissions': [
                    'project_management.view_projects',
                    'site_management.view_sites',
                    'task_management.view_tasks'
                ]
            }
        ]
        
        for group_data in groups_data:
            group, created = PermissionGroup.objects.get_or_create(
                tenant=tenant,
                group_code=group_data['group_code'],
                defaults={
                    'group_name': group_data['group_name'],
                    'description': group_data['description'],
                    'group_type': group_data['group_type'],
                    'is_system_group': False,
                    'is_assignable': True,
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(f'  ✓ Created group: {group.group_name}')
                
                # Assign permissions to group
                for perm_code in group_data['permissions']:
                    try:
                        permission = PermissionRegistry.objects.get(
                            tenant=tenant,
                            permission_code=perm_code
                        )
                        
                        PermissionGroupPermission.objects.get_or_create(
                            group=group,
                            permission=permission,
                            defaults={
                                'permission_level': 'granted',
                                'is_active': True
                            }
                        )
                    except PermissionRegistry.DoesNotExist:
                        self.stdout.write(f'    ! Permission not found: {perm_code}')
                        
            else:
                self.stdout.write(f'  - Group exists: {group.group_name}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully initialized RBAC permissions for {tenant.organization_name}'
            )
        ) 
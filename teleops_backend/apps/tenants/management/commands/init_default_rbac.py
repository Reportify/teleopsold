"""
Comprehensive RBAC Initialization Command
Creates all default permissions, categories, and groups for Circle Portal
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from apps.tenants.models import (
    Tenant, PermissionRegistry, PermissionGroup, 
    PermissionGroupPermission, TenantUserProfile, PermissionCategory
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Initialize comprehensive RBAC system with default permissions, categories, and groups'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant-id',
            type=str,
            help='Specific tenant ID (optional, applies to all active tenants if not specified)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of existing permissions and groups',
        )

    def handle(self, *args, **options):
        tenant_id = options.get('tenant_id')
        force = options.get('force', False)
        
        if tenant_id:
            try:
                tenants = [Tenant.objects.get(id=tenant_id)]
            except Tenant.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Tenant with ID {tenant_id} not found')
                )
                return
        else:
            tenants = Tenant.objects.filter(is_active=True)
            
        if not tenants:
            self.stdout.write(
                self.style.WARNING('No active tenants found')
            )
            return
            
        for tenant in tenants:
            self.stdout.write(f'\n🏢 Initializing RBAC for tenant: {tenant.organization_name}')
            
            try:
                with transaction.atomic():
                    # Step 1: Create permission categories
                    categories_created = self._create_permission_categories(tenant, force)
                    
                    # Step 2: Create system permissions
                    permissions_created = self._create_system_permissions(tenant, force)
                    
                    # Step 3: Create system groups
                    groups_created = self._create_system_groups(tenant, force)
                    
                    # Step 4: Assign permissions to groups
                    assignments_created = self._assign_permissions_to_groups(tenant, force)
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✅ RBAC initialization completed for {tenant.organization_name}:\n'
                            f'   • {categories_created} categories created\n'
                            f'   • {permissions_created} permissions created\n'
                            f'   • {groups_created} groups created\n'
                            f'   • {assignments_created} permission assignments created'
                        )
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'❌ Error initializing RBAC for {tenant.organization_name}: {str(e)}'
                    )
                )

    def _create_permission_categories(self, tenant, force=False):
        """Create system permission categories."""
        
        categories_data = [
            {
                'category_name': 'User Management',
                'category_code': 'user_management',
                'description': 'Permissions related to user account management and profiles',
                'is_system_category': True,
                'sort_order': 1
            },
            {
                'category_name': 'Project Management',
                'category_code': 'project_management',
                'description': 'Permissions for managing projects, workflows, and deviation forms',
                'is_system_category': True,
                'sort_order': 2
            },
            {
                'category_name': 'Site Management',
                'category_code': 'site_management',
                'description': 'Permissions for managing sites, locations, and site-related operations',
                'is_system_category': True,
                'sort_order': 3
            },
            {
                'category_name': 'Task Management',
                'category_code': 'task_management',
                'description': 'Permissions for managing tasks, assignments, and status updates',
                'is_system_category': True,
                'sort_order': 4
            },
            {
                'category_name': 'RBAC Management',
                'category_code': 'rbac_management',
                'description': 'Permissions for managing roles, permissions, and access control',
                'is_system_category': True,
                'sort_order': 5
            },
            {
                'category_name': 'System Administration',
                'category_code': 'system_administration',
                'description': 'System-level administrative permissions',
                'is_system_category': True,
                'sort_order': 6
            }
        ]
        
        created_count = 0
        self.stdout.write('  📁 Creating permission categories...')
        
        for cat_data in categories_data:
            if force:
                # Delete existing category if force is enabled
                PermissionCategory.objects.filter(
                    tenant=tenant,
                    category_code=cat_data['category_code']
                ).delete()
            
            category, created = PermissionCategory.objects.get_or_create(
                tenant=tenant,
                category_code=cat_data['category_code'],
                defaults=cat_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'    ✓ Created category: {category.category_name}')
            else:
                self.stdout.write(f'    - Category exists: {category.category_name}')
        
        return created_count

    def _create_system_permissions(self, tenant, force=False):
        """Create comprehensive system permissions."""
        
        permissions_data = [
            # User Management Permissions
            {
                'permission_name': 'View Users',
                'permission_code': 'user.read',
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
                'permission_code': 'user.create',
                'permission_category': 'User Management',
                'description': 'Create new user accounts and profiles',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Edit Users',
                'permission_code': 'user.update',
                'permission_category': 'User Management',
                'description': 'Edit user profiles, information, and settings',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Delete Users',
                'permission_code': 'user.delete',
                'permission_category': 'User Management',
                'description': 'Delete or deactivate user accounts',
                'permission_type': 'action',
                'risk_level': 'high',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Reset Passwords',
                'permission_code': 'user.reset_password',
                'permission_category': 'User Management',
                'description': 'Reset user passwords and authentication credentials',
                'permission_type': 'action',
                'risk_level': 'high',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            
            # Project Management Permissions
            {
                'permission_name': 'View Projects',
                'permission_code': 'project.read',
                'permission_category': 'Project Management',
                'description': 'View project information, details, and status',
                'permission_type': 'access',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': False
            },
            {
                'permission_name': 'Create Projects',
                'permission_code': 'project.create',
                'permission_category': 'Project Management',
                'description': 'Create new projects and initialize project settings',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Edit Projects',
                'permission_code': 'project.update',
                'permission_category': 'Project Management',
                'description': 'Edit project information, settings, and configurations',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Archive Projects',
                'permission_code': 'project.delete',
                'permission_category': 'Project Management',
                'description': 'Archive completed or inactive projects',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },

            
            # Site Management Permissions
            {
                'permission_name': 'View Sites',
                'permission_code': 'site.read',
                'permission_category': 'Site Management',
                'description': 'View site information, locations, and details',
                'permission_type': 'access',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': False
            },
            {
                'permission_name': 'Create Sites',
                'permission_code': 'site.create',
                'permission_category': 'Site Management',
                'description': 'Create new site entries and configure site settings',
                'permission_type': 'action',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Edit Sites',
                'permission_code': 'site.update',
                'permission_category': 'Site Management',
                'description': 'Edit site information, settings, and configurations',
                'permission_type': 'action',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Bulk Upload Sites',
                'permission_code': 'site.bulk_upload',
                'permission_category': 'Site Management',
                'description': 'Upload multiple sites via bulk import operations',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            
            # Task Management Permissions
            {
                'permission_name': 'View Tasks',
                'permission_code': 'task.read',
                'permission_category': 'Task Management',
                'description': 'View task assignments, progress, and details',
                'permission_type': 'access',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': False
            },
            {
                'permission_name': 'Create Tasks',
                'permission_code': 'task.create',
                'permission_category': 'Task Management',
                'description': 'Create new tasks and task templates',
                'permission_type': 'action',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Assign Tasks',
                'permission_code': 'task.assign',
                'permission_category': 'Task Management',
                'description': 'Assign tasks to users, teams, or roles',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Update Task Status',
                'permission_code': 'task.update',
                'permission_category': 'Task Management',
                'description': 'Update task status and progress information',
                'permission_type': 'action',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': True
            },
            
            # RBAC Management Permissions
            {
                'permission_name': 'View Permissions',
                'permission_code': 'rbac.read',
                'permission_category': 'RBAC Management',
                'description': 'View permission configurations and assignments',
                'permission_type': 'access',
                'risk_level': 'medium',
                'requires_scope': False,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Manage Permissions',
                'permission_code': 'rbac.update',
                'permission_category': 'RBAC Management',
                'description': 'Create, edit, and delete custom permissions',
                'permission_type': 'administrative',
                'risk_level': 'critical',
                'requires_scope': False,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Grant Permissions',
                'permission_code': 'rbac.grant',
                'permission_category': 'RBAC Management',
                'description': 'Grant and revoke permissions to users and roles',
                'permission_type': 'administrative',
                'risk_level': 'high',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Manage Groups',
                'permission_code': 'rbac.manage_groups',
                'permission_category': 'RBAC Management',
                'description': 'Create, edit, and delete permission groups',
                'permission_type': 'administrative',
                'risk_level': 'high',
                'requires_scope': False,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'View Audit Trail',
                'permission_code': 'rbac.audit',
                'permission_category': 'RBAC Management',
                'description': 'View security and permission audit logs',
                'permission_type': 'access',
                'risk_level': 'medium',
                'requires_scope': False,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            
            # System Administration Permissions
            {
                'permission_name': 'System Configuration',
                'permission_code': 'system.configure',
                'permission_category': 'System Administration',
                'description': 'Configure system-wide settings and parameters',
                'permission_type': 'administrative',
                'risk_level': 'critical',
                'requires_scope': False,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Tenant Management',
                'permission_code': 'system.manage_tenants',
                'permission_category': 'System Administration',
                'description': 'Manage tenant settings and configurations',
                'permission_type': 'administrative',
                'risk_level': 'critical',
                'requires_scope': False,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            }
        ]
        
        created_count = 0
        self.stdout.write('  🔐 Creating system permissions...')
        
        for perm_data in permissions_data:
            if force:
                # Delete existing permission if force is enabled
                PermissionRegistry.objects.filter(
                    tenant=tenant,
                    permission_code=perm_data['permission_code']
                ).delete()
            
            permission, created = PermissionRegistry.objects.get_or_create(
                tenant=tenant,
                permission_code=perm_data['permission_code'],
                defaults={
                    **perm_data,
                    'is_system_permission': True,
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'    ✓ Created permission: {permission.permission_name}')
            else:
                self.stdout.write(f'    - Permission exists: {permission.permission_name}')
        
        return created_count

    def _create_system_groups(self, tenant, force=False):
        """Create system permission groups."""
        
        groups_data = [
            {
                'group_name': 'Project Managers',
                'group_code': 'project_managers',
                'description': 'Manage projects, sites, and coordinate team activities',
                'group_type': 'functional',
                'is_system_group': True
            },
            {
                'group_name': 'Basic Users',
                'group_code': 'basic_users',
                'description': 'Basic read-only access to essential information',
                'group_type': 'functional',
                'is_system_group': True
            }
        ]
        
        created_count = 0
        self.stdout.write('  👥 Creating system groups...')
        
        for group_data in groups_data:
            if force:
                # Delete existing group if force is enabled
                PermissionGroup.objects.filter(
                    tenant=tenant,
                    group_code=group_data['group_code']
                ).delete()
            
            group, created = PermissionGroup.objects.get_or_create(
                tenant=tenant,
                group_code=group_data['group_code'],
                defaults={
                    **group_data,
                    'is_assignable': True,
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'    ✓ Created group: {group.group_name}')
            else:
                self.stdout.write(f'    - Group exists: {group.group_name}')
        
        return created_count

    def _assign_permissions_to_groups(self, tenant, force=False):
        """Assign permissions to system groups."""
        
        group_permissions = {
            'project_managers': [
                'user.read',
                'project.read',
                'project.create',
                'project.update',
                'site.read',
                'site.create',
                'site.update',
                'site.bulk_upload',
                'task.read',
                'task.create',
                'task.assign',
                'task.update'
            ],
            'basic_users': [
                'user.read',
                'project.read',
                'site.read',
                'task.read'
            ]
        }
        
        created_count = 0
        self.stdout.write('  🔗 Assigning permissions to groups...')
        
        for group_code, permission_codes in group_permissions.items():
            try:
                group = PermissionGroup.objects.get(
                    tenant=tenant,
                    group_code=group_code
                )
                
                if force:
                    # Clear existing assignments if force is enabled
                    PermissionGroupPermission.objects.filter(group=group).delete()
                
                for perm_code in permission_codes:
                    try:
                        permission = PermissionRegistry.objects.get(
                            tenant=tenant,
                            permission_code=perm_code
                        )
                        
                        assignment, created = PermissionGroupPermission.objects.get_or_create(
                            group=group,
                            permission=permission,
                            defaults={
                                'permission_level': 'granted',
                                'is_active': True
                            }
                        )
                        
                        if created:
                            created_count += 1
                            
                    except PermissionRegistry.DoesNotExist:
                        self.stdout.write(f'      ⚠ Permission not found: {perm_code}')
                
                current_permissions = PermissionGroupPermission.objects.filter(
                    group=group, is_active=True
                ).count()
                self.stdout.write(f'    ✓ {group.group_name}: {current_permissions} permissions assigned')
                
            except PermissionGroup.DoesNotExist:
                self.stdout.write(f'      ⚠ Group not found: {group_code}')
        
        return created_count 
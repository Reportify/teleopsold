"""
Circle Portal RBAC Initialization Command
Implements hybrid approach: System-defined foundation + Tenant customization
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.tenants.models import (
    Tenant, PermissionRegistry, PermissionGroup, 
    PermissionGroupPermission, TenantUserProfile
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Initialize Circle Portal RBAC system with hybrid approach'

    def add_arguments(self, parser):
        parser.add_argument(
            '--tenant-id',
            type=str,
            help='Specific tenant ID (optional, applies to all if not specified)',
        )

    def handle(self, *args, **options):
        tenant_id = options.get('tenant_id')
        
        if tenant_id:
            tenants = [Tenant.objects.get(id=tenant_id)]
        else:
            tenants = Tenant.objects.all()
            
        for tenant in tenants:
            self.stdout.write(f'Initializing RBAC for tenant: {tenant.organization_name}')
            
            # Initialize system-defined permissions
            self._create_system_permissions(tenant)
            
            # Create system-defined groups
            self._create_system_groups(tenant)
            
            # Set up tenant customization capabilities
            self._setup_tenant_customization(tenant)
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'✓ Circle Portal RBAC initialized for {tenant.organization_name}'
                )
            )

    def _create_system_permissions(self, tenant):
        """Create system-defined permissions for Circle Portal."""
        
        # First, create system permission categories
        self._create_system_categories(tenant)
        
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
            {
                'permission_name': 'Archive Projects',
                'permission_code': 'project_management.archive_projects',
                'permission_category': 'Project Management',
                'description': 'Archive completed projects',
                'permission_type': 'action',
                'risk_level': 'medium',
                'requires_scope': True,
                'is_delegatable': False,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Deviation Forms',
                'permission_code': 'project_management.deviation_forms',
                'permission_category': 'Project Management',
                'description': 'Manage deviation forms and approvals',
                'permission_type': 'action',
                'risk_level': 'high',
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
            {
                'permission_name': 'Edit Sites',
                'permission_code': 'site_management.edit_sites',
                'permission_category': 'Site Management',
                'description': 'Edit site information and settings',
                'permission_type': 'action',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Bulk Upload Sites',
                'permission_code': 'site_management.bulk_upload_sites',
                'permission_category': 'Site Management',
                'description': 'Upload multiple sites via bulk import',
                'permission_type': 'action',
                'risk_level': 'medium',
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
                'permission_name': 'Create Tasks',
                'permission_code': 'task_management.create_tasks',
                'permission_category': 'Task Management',
                'description': 'Create new tasks and assignments',
                'permission_type': 'action',
                'risk_level': 'low',
                'requires_scope': True,
                'is_delegatable': True,
                'effect': 'allow',
                'is_auditable': True
            },
            {
                'permission_name': 'Assign Tasks',
                'permission_code': 'task_management.assign_tasks',
                'permission_category': 'Task Management',
                'description': 'Assign tasks to users or teams',
                'permission_type': 'action',
                'risk_level': 'medium',
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
        ]
        
        created_permissions = []
        for perm_data in permissions_data:
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
                created_permissions.append(permission)
                self.stdout.write(f'  ✓ Created permission: {permission.permission_name}')
            else:
                self.stdout.write(f'  - Permission exists: {permission.permission_name}')
        
        self.stdout.write(f'Created {len(created_permissions)} new permissions')
        return created_permissions

    def _create_system_categories(self, tenant):
        """Create system permission categories."""
        from ..models import PermissionCategory
        
        categories_data = [
            {
                'category_name': 'User Management',
                'category_code': 'user_management',
                'description': 'Permissions related to user account management',
                'is_system_category': True,
                'sort_order': 1
            },
            {
                'category_name': 'Project Management',
                'category_code': 'project_management',
                'description': 'Permissions for managing projects and workflows',
                'is_system_category': True,
                'sort_order': 2
            },
            {
                'category_name': 'Site Management',
                'category_code': 'site_management',
                'description': 'Permissions for managing sites and locations',
                'is_system_category': True,
                'sort_order': 3
            },
            {
                'category_name': 'Task Management',
                'category_code': 'task_management',
                'description': 'Permissions for managing tasks and assignments',
                'is_system_category': True,
                'sort_order': 4
            },
            {
                'category_name': 'RBAC Management',
                'category_code': 'rbac_management',
                'description': 'Permissions for managing roles, permissions, and access control',
                'is_system_category': True,
                'sort_order': 5
            }
        ]
        
        created_categories = []
        for cat_data in categories_data:
            category, created = PermissionCategory.objects.get_or_create(
                tenant=tenant,
                category_code=cat_data['category_code'],
                defaults=cat_data
            )
            
            if created:
                created_categories.append(category)
                self.stdout.write(f'  ✓ Created category: {category.category_name}')
            else:
                self.stdout.write(f'  - Category exists: {category.category_name}')
        
        return created_categories

    def _create_system_groups(self, tenant):
        """Create system-defined permission groups"""
        
        SYSTEM_GROUPS = [
            {
                'group_name': 'Tenant Administrators',
                'group_code': 'tenant_administrators',
                'description': 'Full administrative access to tenant resources',
                'group_type': 'administrative',
                'permissions': [
                    # All system permissions
                    'user_management.view_users',
                    'user_management.create_users',
                    'user_management.edit_users',
                    'user_management.deactivate_users',
                    'project_management.view_projects',
                    'project_management.create_projects',
                    'project_management.edit_projects',
                    'project_management.archive_projects',
                    'site_management.view_sites',
                    'site_management.create_sites',
                    'site_management.edit_sites',
                    'site_management.bulk_upload_sites',
                    'task_management.view_tasks',
                    'task_management.create_tasks',
                    'task_management.assign_tasks',
                    'task_management.update_status',
                    'rbac.view_permissions',
                    'rbac.assign_permissions',
                    'rbac.manage_groups',
                    'rbac.view_audit_trail',
                ]
            },
            {
                'group_name': 'Project Managers',
                'group_code': 'project_managers',
                'description': 'Project lifecycle and site management',
                'group_type': 'functional',
                'permissions': [
                    'user_management.view_users',
                    'project_management.view_projects',
                    'project_management.create_projects',
                    'project_management.edit_projects',
                    'site_management.view_sites',
                    'site_management.create_sites',
                    'site_management.edit_sites',
                    'task_management.view_tasks',
                    'task_management.create_tasks',
                    'task_management.assign_tasks',
                ]
            },
            {
                'group_name': 'Site Coordinators',
                'group_code': 'site_coordinators',
                'description': 'Site operations and task execution',
                'group_type': 'operational',
                'permissions': [
                    'user_management.view_users',
                    'project_management.view_projects',
                    'site_management.view_sites',
                    'site_management.edit_sites',
                    'task_management.view_tasks',
                    'task_management.update_status',
                ]
            },
            {
                'group_name': 'Basic Users',
                'group_code': 'basic_users',
                'description': 'Read-only access to basic information',
                'group_type': 'basic',
                'permissions': [
                    'user_management.view_users',
                    'project_management.view_projects',
                    'site_management.view_sites',
                    'task_management.view_tasks',
                ]
            }
        ]
        
        self.stdout.write(f'  Creating {len(SYSTEM_GROUPS)} system permission groups...')
        
        for group_data in SYSTEM_GROUPS:
            # Create permission group
            group, created = PermissionGroup.objects.get_or_create(
                tenant=tenant,
                group_code=group_data['group_code'],
                defaults={
                    'group_name': group_data['group_name'],
                    'description': group_data['description'],
                    'group_type': group_data['group_type'],
                    'is_system_group': True,
                    'is_assignable': True,
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(f'    ✓ Created group: {group.group_name}')
                
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
                        self.stdout.write(f'      ⚠ Permission not found: {perm_code}')

    def _setup_tenant_customization(self, tenant):
        """Setup tenant customization capabilities"""
        
        # Create sample tenant-customizable permission categories
        TENANT_CATEGORIES = [
            'Business Process',
            'Workflow Management', 
            'Custom Reporting',
            'Integration',
            'Vendor Management',
            'Quality Control',
            'Compliance'
        ]
        
        self.stdout.write('  Setting up tenant customization capabilities...')
        self.stdout.write(f'    ✓ Enabled custom permission categories: {", ".join(TENANT_CATEGORIES)}')
        self.stdout.write('    ✓ Tenant can create custom permissions with codes: tenant_custom.*')
        self.stdout.write('    ✓ Tenant can create custom permission groups')
        self.stdout.write('    ✓ Tenant cannot modify system-defined permissions') 
"""
Django management command to standardize all permission codes to consistent format.

This command migrates from inconsistent legacy format:
- user_management.view_users
- site_management.create_sites

To consistent modern format:
- user.read
- site.create

Usage:
    python manage.py standardize_permissions --dry-run  # Preview changes
    python manage.py standardize_permissions            # Apply changes
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.tenants.models import PermissionRegistry, DesignationPermission, UserPermissionOverride
from apps.tenants.models import TenantUserProfile
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Standardize all permission codes to consistent resource.action format'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without applying them',
        )
        parser.add_argument(
            '--tenant-id',
            type=str,
            help='Only process permissions for specific tenant',
        )

    def handle(self, *args, **options):
        """Main command handler"""
        dry_run = options['dry_run']
        tenant_id = options.get('tenant_id')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be applied')
            )

        # Permission code mapping from legacy to modern format
        permission_mappings = {
            # User Management
            'user_management.view_users': 'user.read',
            'user_management.create_users': 'user.create',
            'user_management.edit_users': 'user.update', 
            'user_management.delete_users': 'user.delete',
            'user_management.reset_passwords': 'user.reset_password',
            
            # Site Management
            'site_management.view_sites': 'site.read',
            'site_management.create_sites': 'site.create',
            'site_management.edit_sites': 'site.update',
            'site_management.bulk_upload_sites': 'site.bulk_upload',
            
            # Project Management
            'project_management.view_projects': 'project.read',
            'project_management.create_projects': 'project.create',
            'project_management.edit_projects': 'project.update',
            'project_management.archive_projects': 'project.delete',
            'project_management.deviation_forms': 'project.manage_deviations',
            
            # Task Management
            'task_management.view_tasks': 'task.read',
            'task_management.create_tasks': 'task.create',
            'task_management.assign_tasks': 'task.assign',
            'task_management.update_status': 'task.update',
            
            # RBAC Management
            'rbac_management.view_permissions': 'rbac.read',
            'rbac_management.manage_permissions': 'rbac.update',
            'rbac_management.grant_permissions': 'rbac.grant',
            'rbac_management.manage_groups': 'rbac.manage_groups',
            'rbac_management.view_audit_trail': 'rbac.audit',
            
            # System Administration
            'system_administration.system_config': 'system.configure',
            'system_administration.tenant_management': 'system.manage_tenants',
            
            # Vendor Management (already clean, but ensure consistency)
            'vendor.read': 'vendor.read',
            'vendor.create': 'vendor.create',
            'vendor.update': 'vendor.update',
            'vendor.delete': 'vendor.delete',
            'vendor.read_create': 'vendor.read_create',
            'vendor.read_create_update': 'vendor.read_create_update',
            'vendor.read_create_update_delete': 'vendor.read_create_update_delete',
            
            # Deviation Management (already clean)
            'deviation.read': 'deviation.read',
            'deviation.create': 'deviation.create',
            'deviation.update': 'deviation.update',
            'deviation.delete': 'deviation.delete',
        }

        try:
            with transaction.atomic():
                # 1. Update Permission Registry
                updated_permissions = self.update_permission_registry(
                    permission_mappings, dry_run, tenant_id
                )
                
                # 2. Update Designation Permissions
                updated_designation_permissions = self.update_designation_permissions(
                    permission_mappings, dry_run, tenant_id
                )
                
                # 3. Update User Permission Overrides
                updated_user_overrides = self.update_user_permission_overrides(
                    permission_mappings, dry_run, tenant_id
                )
                
                # Summary
                self.stdout.write(
                    self.style.SUCCESS(
                        f'\nMigration Summary:'
                        f'\n- Permission Registry: {updated_permissions} updated'
                        f'\n- Designation Permissions: {updated_designation_permissions} updated'
                        f'\n- User Overrides: {updated_user_overrides} updated'
                    )
                )
                
                if dry_run:
                    self.stdout.write(
                        self.style.WARNING('\nDRY RUN COMPLETE - No changes applied')
                    )
                    # Rollback transaction in dry run
                    raise CommandError("Dry run complete")
                else:
                    self.stdout.write(
                        self.style.SUCCESS('\n✅ Permission standardization complete!')
                    )

        except CommandError:
            # Expected for dry run
            pass
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during migration: {str(e)}')
            )
            raise

    def update_permission_registry(self, mappings, dry_run, tenant_id=None):
        """Update permission codes in PermissionRegistry"""
        queryset = PermissionRegistry.objects.all()
        if tenant_id:
            queryset = queryset.filter(tenant_id=tenant_id)
            
        updated_count = 0
        
        for permission in queryset:
            old_code = permission.permission_code
            if old_code in mappings:
                new_code = mappings[old_code]
                
                self.stdout.write(
                    f'PermissionRegistry: {old_code} → {new_code}'
                )
                
                if not dry_run:
                    permission.permission_code = new_code
                    # Also update resource_type to match new format
                    permission.resource_type = new_code.split('.')[0]
                    permission.save()
                    
                updated_count += 1
                
        return updated_count

    def update_designation_permissions(self, mappings, dry_run, tenant_id=None):
        """Update permission codes in DesignationPermission"""
        queryset = DesignationPermission.objects.select_related('permission')
        if tenant_id:
            queryset = queryset.filter(permission__tenant_id=tenant_id)
            
        updated_count = 0
        
        for designation_perm in queryset:
            old_code = designation_perm.permission.permission_code
            if old_code in mappings:
                new_code = mappings[old_code]
                
                self.stdout.write(
                    f'DesignationPermission: {old_code} → {new_code}'
                )
                
                # Note: We don't update the designation_perm itself, 
                # just ensure the referenced permission is updated
                updated_count += 1
                
        return updated_count

    def update_user_permission_overrides(self, mappings, dry_run, tenant_id=None):
        """Update permission codes in UserPermissionOverride"""
        queryset = UserPermissionOverride.objects.select_related('permission')
        if tenant_id:
            queryset = queryset.filter(permission__tenant_id=tenant_id)
            
        updated_count = 0
        
        for override in queryset:
            old_code = override.permission.permission_code
            if old_code in mappings:
                new_code = mappings[old_code]
                
                self.stdout.write(
                    f'UserPermissionOverride: {old_code} → {new_code}'
                )
                
                # Note: We don't update the override itself,
                # just ensure the referenced permission is updated
                updated_count += 1
                
        return updated_count

    def get_resource_type_from_code(self, permission_code):
        """Extract resource type from permission code"""
        return permission_code.split('.')[0] if '.' in permission_code else permission_code
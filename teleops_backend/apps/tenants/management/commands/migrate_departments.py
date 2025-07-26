"""
Django management command to migrate departments from the old Department model
to the new ComprehensiveDepartment model.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.tenants.models import TenantDepartment, Tenant


class Command(BaseCommand):
    help = 'Migrate departments from old Department model to new TenantDepartment model'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without actually doing it',
        )
        parser.add_argument(
            '--tenant-id',
            type=str,
            help='Migrate departments for a specific tenant only',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        tenant_id = options.get('tenant_id')

        self.stdout.write(
            self.style.SUCCESS('Starting department migration...')
        )

        # Get old departments
        old_departments = TenantDepartment.objects.filter(is_active=True)
        if tenant_id:
            old_departments = old_departments.filter(tenant_id=tenant_id)

        self.stdout.write(f'Found {old_departments.count()} departments to migrate')

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))
            for dept in old_departments:
                self.stdout.write(
                    f'Would migrate: {dept.name} (ID: {dept.id}) for tenant {dept.tenant.organization_name}'
                )
            return

        migrated_count = 0
        skipped_count = 0

        with transaction.atomic():
            for old_dept in old_departments:
                try:
                    # Check if department already exists
                    existing_dept = TenantDepartment.objects.filter(
                        tenant=old_dept.tenant,
                        department_name=old_dept.name
                    ).first()

                    if existing_dept:
                        self.stdout.write(
                            self.style.WARNING(
                                f'Skipping {old_dept.name} - already exists as TenantDepartment'
                            )
                        )
                        skipped_count += 1
                        continue

                    # Create new comprehensive department
                    new_dept = TenantDepartment.objects.create(
                        tenant=old_dept.tenant,
                        department_name=old_dept.name,
                        department_code=old_dept.code,
                        department_level=1,  # Default level
                        description=old_dept.description or '',
                        is_active=old_dept.is_active,
                        is_operational=old_dept.is_operational,
                        requires_safety_training=old_dept.requires_safety_training,
                        # Set parent department if exists
                        parent_department=None,  # Will need manual mapping if needed
                        can_manage_subordinates=False,
                        can_manage_users=False,
                        can_create_projects=False,
                        can_assign_tasks=False,
                        can_approve_expenses=False,
                        can_access_reports=False,
                        expense_approval_limit='0.00',
                        is_system_department=False,
                        is_template=False,
                        created_by=old_dept.created_by,
                        updated_by=old_dept.created_by,
                    )

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Migrated: {old_dept.name} (ID: {old_dept.id} -> {new_dept.id})'
                        )
                    )
                    migrated_count += 1

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Failed to migrate {old_dept.name}: {str(e)}'
                        )
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'Migration completed! Migrated: {migrated_count}, Skipped: {skipped_count}'
            )
        ) 
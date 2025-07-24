from django.core.management.base import BaseCommand
from apps.tenants.models import CircleVendorRelationship
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fix CircleVendorRelationship is_active status to match actual tenant approval status'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        self.stdout.write(
            self.style.SUCCESS('Starting vendor relationship status fix...')
        )
        
        # Find CircleVendorRelationship records that need fixing
        # These are relationships that are marked active but their tenant is not actually active
        relationships = CircleVendorRelationship.objects.filter(
            vendor_tenant__isnull=False,  # Has a linked tenant
            is_active=True,               # Relationship is marked as active
            vendor_tenant__is_active=False # But tenant is not actually active
        ).select_related('vendor_tenant')
        
        total_count = relationships.count()
        updated_count = 0
        
        self.stdout.write(f'Found {total_count} relationships with status mismatch')
        
        for relationship in relationships:
            tenant = relationship.vendor_tenant
            
            if dry_run:
                self.stdout.write(
                    f"[DRY RUN] Would fix relationship {relationship.id} "
                    f"(Vendor: {tenant.organization_name}) "
                    f"- Set is_active=False, status=Pending_Approval"
                )
            else:
                try:
                    relationship.is_active = False
                    relationship.relationship_status = 'Pending_Approval'
                    relationship.save()
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Fixed relationship {relationship.id} "
                            f"(Vendor: {tenant.organization_name}) "
                            f"- Set is_active=False, status=Pending_Approval"
                        )
                    )
                    updated_count += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"✗ Failed to fix relationship {relationship.id}: {e}"
                        )
                    )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Would fix {total_count} relationships')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully fixed {updated_count} relationships')
            )
            
        # Also show relationships that should be active (tenant is active but relationship is not)
        reverse_relationships = CircleVendorRelationship.objects.filter(
            vendor_tenant__isnull=False,
            is_active=False,
            vendor_tenant__is_active=True
        ).select_related('vendor_tenant')
        
        reverse_count = reverse_relationships.count()
        if reverse_count > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'\nFound {reverse_count} relationships that should be active '
                    f'(tenant is active but relationship is not)'
                )
            )
            
            for relationship in reverse_relationships:
                tenant = relationship.vendor_tenant
                
                if dry_run:
                    self.stdout.write(
                        f"[DRY RUN] Would activate relationship {relationship.id} "
                        f"(Vendor: {tenant.organization_name}) "
                        f"- Set is_active=True, status=Active"
                    )
                else:
                    try:
                        relationship.is_active = True
                        relationship.relationship_status = 'Active'
                        relationship.save()
                        
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"✓ Activated relationship {relationship.id} "
                                f"(Vendor: {tenant.organization_name}) "
                                f"- Set is_active=True, status=Active"
                            )
                        )
                        updated_count += 1
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f"✗ Failed to activate relationship {relationship.id}: {e}"
                            )
                        ) 
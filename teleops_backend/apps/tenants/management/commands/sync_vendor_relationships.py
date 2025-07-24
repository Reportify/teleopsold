from django.core.management.base import BaseCommand
from apps.tenants.models import CircleVendorRelationship, TenantInvitation
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync completed vendor invitations with CircleVendorRelationship records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        self.stdout.write(
            self.style.SUCCESS('Starting vendor relationship sync...')
        )
        
        # Find CircleVendorRelationship records with null vendor_tenant
        relationships = CircleVendorRelationship.objects.filter(vendor_tenant__isnull=True)
        
        updated_count = 0
        
        for relationship in relationships:
            invitation = self._find_related_invitation(relationship)
            
            if invitation and invitation.status == 'Completed' and invitation.created_tenant:
                if dry_run:
                    self.stdout.write(
                        f"[DRY RUN] Would link relationship {relationship.id} "
                        f"to tenant {invitation.created_tenant.id} "
                        f"({invitation.created_tenant.organization_name})"
                    )
                else:
                    try:
                        relationship.vendor_tenant = invitation.created_tenant
                        # Only set as active if the tenant is actually approved/active
                        relationship.relationship_status = 'Active' if invitation.created_tenant.is_active else 'Pending_Approval'
                        relationship.is_active = invitation.created_tenant.is_active
                        relationship.save()
                        
                        status_text = "active" if invitation.created_tenant.is_active else "pending approval"
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"✓ Linked relationship {relationship.id} "
                                f"to tenant {invitation.created_tenant.id} "
                                f"({invitation.created_tenant.organization_name}) - Status: {status_text}"
                            )
                        )
                        updated_count += 1
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(
                                f"✗ Failed to link relationship {relationship.id}: {e}"
                            )
                        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Would update {updated_count} relationships')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully updated {updated_count} relationships')
            )

    def _find_related_invitation(self, obj):
        """Helper method to find related TenantInvitation"""
        try:
            # Try to extract invitation token from notes
            if 'invitation' in obj.notes.lower():
                import re
                token_match = re.search(r'invitation\s+([a-f0-9-]+)', obj.notes)
                if token_match:
                    token = token_match.group(1)
                    return TenantInvitation.objects.filter(
                        invitation_token=token,
                        tenant_type='Vendor'
                    ).first()
            
            # Fallback: search by contact person name and recent invitations
            if obj.contact_person_name:
                return TenantInvitation.objects.filter(
                    contact_name=obj.contact_person_name,
                    tenant_type='Vendor',
                    status__in=['Pending', 'Accepted', 'Completed']
                ).order_by('-invited_at').first()
                
        except Exception:
            pass
        
        return None 
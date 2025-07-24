from django.core.management.base import BaseCommand
from apps.tenants.models import TenantInvitation, Tenant

class Command(BaseCommand):
    help = 'Migrate existing accepted invitations with active tenants to completed status'

    def handle(self, *args, **options):
        self.stdout.write("🔍 Checking for accepted invitations with active tenants...")
        
        # Find accepted invitations that have active tenants
        accepted_invitations = TenantInvitation.objects.filter(
            status='Accepted',
            created_tenant__isnull=False
        )
        
        self.stdout.write(f"📊 Found {accepted_invitations.count()} accepted invitations with tenants")
        
        if accepted_invitations.count() == 0:
            self.stdout.write(self.style.SUCCESS("✅ No invitations need migration"))
            return
        
        # Check if the tenants are actually active
        migrated_count = 0
        for invitation in accepted_invitations:
            tenant = invitation.created_tenant
            
            # If tenant exists and is active, mark invitation as completed
            if tenant and tenant.activation_status == 'Active':
                self.stdout.write(f"  📧 Migrating invitation for {invitation.email} → {tenant.organization_name}")
                invitation.status = 'Completed'
                invitation.save()
                migrated_count += 1
            else:
                self.stdout.write(f"  ⚠️  Skipping {invitation.email} - tenant not active ({tenant.activation_status if tenant else 'No tenant'})")
        
        self.stdout.write(self.style.SUCCESS(f"✅ Successfully migrated {migrated_count} invitations to completed status"))
        self.stdout.write("🎯 These invitations are now preserved for audit trail but hidden from UI") 
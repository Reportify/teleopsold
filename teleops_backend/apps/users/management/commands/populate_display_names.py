from django.core.management.base import BaseCommand
from apps.tenants.models import TenantUserProfile
from apps.users.models import User
from django.db import models


class Command(BaseCommand):
    help = 'Populate empty display_name fields in TenantUserProfile'

    def handle(self, *args, **options):
        # Check for both NULL and empty string display_name fields
        profiles = TenantUserProfile.objects.filter(
            models.Q(display_name__isnull=True) | models.Q(display_name='')
        ).select_related('user')
        
        updated_count = 0
        for profile in profiles:
            user = profile.user
            # Create display name from first and last name
            display_name = f"{user.first_name} {user.last_name}".strip()
            if not display_name:
                display_name = user.email.split('@')[0]  # Use email prefix as fallback
            
            profile.display_name = display_name
            profile.save()
            updated_count += 1
            self.stdout.write(f"Updated display_name for user {user.email}: {display_name}")
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated_count} display_name fields')
        ) 
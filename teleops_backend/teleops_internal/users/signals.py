from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.users.models import User
from .models import InternalProfile

@receiver(post_save, sender=User)
def create_internal_profile(sender, instance, created, **kwargs):
    if created and getattr(instance, 'user_type', None) == 'teleops':
        InternalProfile.objects.get_or_create(
            user=instance,
            defaults={
                'display_name': f"{instance.first_name} {instance.last_name}".strip() or instance.email,
                'employee_id': getattr(instance, 'employee_id', None),
                'role': getattr(instance, 'role', ''),
                'access_level': getattr(instance, 'access_level', ''),
            }
        ) 
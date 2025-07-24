from django.db import models
from apps.users.models import User
from apps.tenants.models import Tenant

class TenantProfile(models.Model):
    user = models.OneToOneField('User', on_delete=models.CASCADE, related_name='tenant_profile')
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tenant_profiles')
    phone_number = models.CharField(max_length=17, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    language = models.CharField(max_length=10, default='en')
    is_verified = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"TenantProfile for {self.user.email}" 
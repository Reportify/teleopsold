from django.contrib import admin
from apps.users.models import User
from apps.users.tenant_profile import TenantProfile

admin.site.register(User)
admin.site.register(TenantProfile) 
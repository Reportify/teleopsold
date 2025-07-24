from django.contrib import admin
from .models import InternalProfile

@admin.register(InternalProfile)
class InternalProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'display_name', 'role', 'access_level', 'last_login', 'created_at'
    )
    list_filter = ('role', 'access_level', 'user__is_active')
    search_fields = ('user__email', 'display_name', 'employee_id')
    ordering = ('-created_at',)

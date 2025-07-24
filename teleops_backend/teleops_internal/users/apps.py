from django.apps import AppConfig


class InternalUsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "teleops_internal.users"
    label = "teleops_internal_users"  
    verbose_name = "Internal Users"

    def ready(self):
        import teleops_internal.users.signals

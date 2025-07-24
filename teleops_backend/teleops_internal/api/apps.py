from django.apps import AppConfig


class InternalApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "teleops_internal.api"
    label = "teleops_internal_api"
    verbose_name = "Internal API"

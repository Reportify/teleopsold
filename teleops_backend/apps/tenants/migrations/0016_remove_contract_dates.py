# Generated manually for database cleanup
# Phase 5: Remove contract date fields

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("tenants", "0015_remove_service_and_billing_fields"),
    ]

    operations = [
        # Remove contract date fields (not needed during invitation)
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="contract_start_date",
        ),
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="contract_end_date",
        ),
    ] 
# Generated manually for database cleanup
# Phase 2 & 3: Remove service configuration and billing fields

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("tenants", "0014_remove_redundant_invitation_fields"),
    ]

    operations = [
        # Remove service configuration fields (these belong in Tenant table)
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="service_areas",
        ),
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="service_capabilities",
        ),
        
        # Remove billing fields (not needed for invitation process)
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="billing_rate",
        ),
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="payment_terms",
        ),
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="currency",
        ),
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="billing_frequency",
        ),
        
        # Remove vendor contact info (these belong in Tenant table)
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="vendor_name",
        ),
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="vendor_email",
        ),
    ] 
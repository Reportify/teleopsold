# Generated manually for database cleanup
# Phase 1: Remove redundant invitation management fields

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("tenants", "0012_add_contact_person_name_to_vendor_relationships"),
    ]

    operations = [
        # Remove redundant invitation management fields
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="invitation_token",
        ),
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="invitation_sent_at",
        ),
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="invitation_expires_at",
        ),
        migrations.RemoveField(
            model_name="circlevendorrelationship",
            name="invited_by",
        ),
    ] 
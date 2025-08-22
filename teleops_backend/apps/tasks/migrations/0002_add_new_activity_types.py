# Generated manually to add new activity types

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0001_add_flow_models'),
    ]

    operations = [
        # Note: This migration adds new choices to TASK_TYPE field
        # The actual field modification is handled by Django's model validation
        # No database schema changes are needed, just choice validation updates
    ] 
# Generated migration to remove unnecessary columns from TaskAllocation

from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0016_add_missing_taskallocation_fields'),
    ]

    operations = [
        # Remove allocation_notes column
        migrations.RunSQL(
            "ALTER TABLE tasks_taskallocation DROP COLUMN IF EXISTS allocation_notes;",
            reverse_sql="ALTER TABLE tasks_taskallocation ADD COLUMN allocation_notes TEXT NOT NULL DEFAULT '';"
        ),
        
        # Remove estimated_duration_hours column
        migrations.RunSQL(
            "ALTER TABLE tasks_taskallocation DROP COLUMN IF EXISTS estimated_duration_hours;",
            reverse_sql="ALTER TABLE tasks_taskallocation ADD COLUMN estimated_duration_hours NUMERIC(8,2);"
        ),
    ]
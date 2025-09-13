# Generated manually to create missing SubActivityAllocation table

from django.db import migrations, models
import uuid
from decimal import Decimal


class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0023_add_missing_fields_only'),
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE TABLE IF NOT EXISTS tasks_subactivityallocation (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                allocation_id UUID NOT NULL,
                sub_activity_id UUID NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                estimated_duration_hours DECIMAL(8,2),
                actual_duration_hours DECIMAL(8,2),
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                notes TEXT DEFAULT '',
                completion_notes TEXT DEFAULT '',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
            );
            
            CREATE INDEX IF NOT EXISTS tasks_subac_allocat_1f0b49_idx ON tasks_subactivityallocation(allocation_id, status);
            CREATE INDEX IF NOT EXISTS tasks_subac_sub_act_774df0_idx ON tasks_subactivityallocation(sub_activity_id, status);
            CREATE INDEX IF NOT EXISTS tasks_subac_status_dfe802_idx ON tasks_subactivityallocation(status, started_at);
            """,
            reverse_sql="DROP TABLE IF EXISTS tasks_subactivityallocation;"
        ),
    ]
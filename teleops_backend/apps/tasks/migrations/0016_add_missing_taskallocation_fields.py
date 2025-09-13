# Generated manually to fix TaskAllocation table schema

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0015_taskallocationhistory_taskcomment_tasksiteassignment_and_more'),
    ]

    operations = [
        # Add missing columns to tasks_taskallocation table
        migrations.RunSQL(
            sql=[
                "ALTER TABLE tasks_taskallocation ADD COLUMN IF NOT EXISTS allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
                "ALTER TABLE tasks_taskallocation ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE tasks_taskallocation ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;",
                "ALTER TABLE tasks_taskallocation ADD COLUMN IF NOT EXISTS allocated_by_id UUID;",
                "ALTER TABLE tasks_taskallocation ADD COLUMN IF NOT EXISTS updated_by_id UUID;",
                "ALTER TABLE tasks_taskallocation ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
                "ALTER TABLE tasks_taskallocation ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
                
                # Add foreign key constraints (PostgreSQL doesn't support IF NOT EXISTS for constraints)
                """DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_taskallocation_allocated_by_id_fkey') THEN
                        ALTER TABLE tasks_taskallocation ADD CONSTRAINT tasks_taskallocation_allocated_by_id_fkey FOREIGN KEY (allocated_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;
                    END IF;
                END $$;""",
                """DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_taskallocation_updated_by_id_fkey') THEN
                        ALTER TABLE tasks_taskallocation ADD CONSTRAINT tasks_taskallocation_updated_by_id_fkey FOREIGN KEY (updated_by_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED;
                    END IF;
                END $$;""",
                
                # Create indexes if they don't exist
                "CREATE INDEX IF NOT EXISTS tasks_taskallocation_allocation_type_idx ON tasks_taskallocation (allocation_type);",
                "CREATE INDEX IF NOT EXISTS tasks_taskallocation_status_idx ON tasks_taskallocation (status);",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS tasks_taskallocation_status_idx;",
                "DROP INDEX IF EXISTS tasks_taskallocation_allocation_type_idx;",
                "DROP INDEX IF EXISTS tasks_taskallocation_updated_by_id_idx;",
                "DROP INDEX IF EXISTS tasks_taskallocation_allocated_by_id_idx;",
                "ALTER TABLE tasks_taskallocation DROP CONSTRAINT IF EXISTS tasks_taskallocation_updated_by_id_fkey;",
                "ALTER TABLE tasks_taskallocation DROP CONSTRAINT IF EXISTS tasks_taskallocation_allocated_by_id_fkey;",
                "ALTER TABLE tasks_taskallocation DROP COLUMN IF EXISTS updated_at;",
                "ALTER TABLE tasks_taskallocation DROP COLUMN IF EXISTS created_at;",
                "ALTER TABLE tasks_taskallocation DROP COLUMN IF EXISTS updated_by_id;",
                "ALTER TABLE tasks_taskallocation DROP COLUMN IF EXISTS allocated_by_id;",
                "ALTER TABLE tasks_taskallocation DROP COLUMN IF EXISTS completed_at;",
                "ALTER TABLE tasks_taskallocation DROP COLUMN IF EXISTS started_at;",
                "ALTER TABLE tasks_taskallocation DROP COLUMN IF EXISTS allocated_at;",
            ]
        ),
    ]
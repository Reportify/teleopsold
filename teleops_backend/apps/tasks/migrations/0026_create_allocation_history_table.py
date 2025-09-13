# Generated migration to create missing tasks_allocationhistory table

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0025_create_task_timeline_table'),
        ('apps_users', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE tasks_allocationhistory (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                allocation_id UUID NOT NULL,
                action VARCHAR(30) NOT NULL,
                previous_status VARCHAR(20),
                new_status VARCHAR(20),
                changed_by_id BIGINT NOT NULL,
                change_reason TEXT DEFAULT '',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                
                CONSTRAINT tasks_allocationhistory_allocation_id_fkey 
                    FOREIGN KEY (allocation_id) REFERENCES tasks_taskallocation(id) ON DELETE CASCADE,
                CONSTRAINT tasks_allocationhistory_changed_by_id_fkey 
                    FOREIGN KEY (changed_by_id) REFERENCES users(id) ON DELETE RESTRICT,
                    
                CONSTRAINT tasks_allocationhistory_action_check 
                    CHECK (action IN (
                        'created', 'updated', 'status_changed', 'started', 
                        'completed', 'cancelled', 'sub_activity_added', 
                        'sub_activity_removed'
                    )),
                CONSTRAINT tasks_allocationhistory_previous_status_check 
                    CHECK (previous_status IN (
                        'pending', 'allocated', 'in_progress', 'completed', 
                        'cancelled', 'deallocated', 'in_issue'
                    ) OR previous_status IS NULL),
                CONSTRAINT tasks_allocationhistory_new_status_check 
                    CHECK (new_status IN (
                        'pending', 'allocated', 'in_progress', 'completed', 
                        'cancelled', 'deallocated', 'in_issue'
                    ) OR new_status IS NULL)
            );
            
            CREATE INDEX idx_tasks_allocationhistory_allocation_created_at 
                ON tasks_allocationhistory(allocation_id, created_at);
            CREATE INDEX idx_tasks_allocationhistory_action_created_at 
                ON tasks_allocationhistory(action, created_at);
            CREATE INDEX idx_tasks_allocationhistory_changed_by 
                ON tasks_allocationhistory(changed_by_id);
            CREATE INDEX idx_tasks_allocationhistory_created_at 
                ON tasks_allocationhistory(created_at);
            """,
            reverse_sql="DROP TABLE IF EXISTS tasks_allocationhistory CASCADE;"
        ),
    ]
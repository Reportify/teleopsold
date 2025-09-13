# Generated migration to create missing task_timeline table

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0024_create_missing_subactivity_table'),
        ('apps_users', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE TABLE task_timeline (
                id BIGSERIAL PRIMARY KEY,
                task_from_flow_id UUID NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                event_data JSONB DEFAULT '{}',
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                user_id BIGINT NOT NULL,
                
                CONSTRAINT task_timeline_task_from_flow_id_fkey 
                    FOREIGN KEY (task_from_flow_id) REFERENCES tasks_from_flow(id) ON DELETE CASCADE,
                CONSTRAINT task_timeline_user_id_fkey 
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    
                CONSTRAINT task_timeline_event_type_check 
                    CHECK (event_type IN (
                        'created', 'allocated', 'assigned', 'work_started', 
                        'work_completed', 'cancelled', 'reallocated', 
                        'status_changed', 'progress_updated', 'comment_added', 
                        'equipment_verified'
                    ))
            );
            
            CREATE INDEX idx_task_timeline_task_from_flow ON task_timeline(task_from_flow_id);
            CREATE INDEX idx_task_timeline_event_type ON task_timeline(event_type);
            CREATE INDEX idx_task_timeline_timestamp ON task_timeline(timestamp);
            CREATE INDEX idx_task_timeline_user ON task_timeline(user_id);
            """,
            reverse_sql="DROP TABLE IF EXISTS task_timeline CASCADE;"
        ),
    ]
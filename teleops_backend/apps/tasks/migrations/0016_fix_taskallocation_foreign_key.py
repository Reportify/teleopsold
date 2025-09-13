# Generated migration to fix TaskAllocation foreign key constraint

from django.db import migrations

def fix_foreign_key_constraint(apps, schema_editor):
    """
    Fix the foreign key constraint for TaskAllocation.task_id
    to point to tasks_from_flow.id instead of tasks_task.id
    """
    with schema_editor.connection.cursor() as cursor:
        # Drop the old foreign key constraint
        cursor.execute("""
            ALTER TABLE tasks_taskallocation 
            DROP CONSTRAINT IF EXISTS tasks_taskallocation_task_id_531db211_fk_tasks_task_id;
        """)
        
        # Add the new foreign key constraint pointing to tasks_from_flow
        cursor.execute("""
            ALTER TABLE tasks_taskallocation 
            ADD CONSTRAINT tasks_taskallocation_task_id_fk_tasks_from_flow_id 
            FOREIGN KEY (task_id) REFERENCES tasks_from_flow(id) 
            ON DELETE CASCADE;
        """)

def reverse_foreign_key_constraint(apps, schema_editor):
    """
    Reverse the foreign key constraint fix
    """
    with schema_editor.connection.cursor() as cursor:
        # Drop the new foreign key constraint
        cursor.execute("""
            ALTER TABLE tasks_taskallocation 
            DROP CONSTRAINT IF EXISTS tasks_taskallocation_task_id_fk_tasks_from_flow_id;
        """)
        
        # Note: We don't restore the old constraint as it would fail
        # due to missing tasks_task table

class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0015_taskallocationhistory_taskcomment_tasksiteassignment_and_more'),
    ]

    operations = [
        migrations.RunPython(
            fix_foreign_key_constraint,
            reverse_foreign_key_constraint,
            atomic=True
        ),
    ]
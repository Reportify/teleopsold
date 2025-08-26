# Generated manually to remove is_primary and role fields from TaskSiteGroup

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0006_add_task_creation_models_only'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='tasksitegroup',
            name='is_primary',
        ),
        migrations.RemoveField(
            model_name='tasksitegroup',
            name='role',
        ),
    ]

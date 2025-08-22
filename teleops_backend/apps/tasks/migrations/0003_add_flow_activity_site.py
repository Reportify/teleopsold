# Generated manually to add FlowActivitySite model

from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0002_add_new_activity_types'),
    ]

    operations = [
        migrations.CreateModel(
            name='FlowActivitySite',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('is_required', models.BooleanField(default=True, help_text='Whether this site is required for this activity')),
                ('execution_order', models.IntegerField(default=0, help_text='Order of execution for this site in the activity')),
                ('flow_activity', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='assigned_sites', to='tasks.flowactivity')),
                ('flow_site', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='assigned_activities', to='tasks.flowsite')),
            ],
            options={
                'db_table': 'flow_activity_sites',
                'unique_together': {('flow_activity', 'flow_site')},
                'ordering': ['execution_order'],
            },
        ),
    ]

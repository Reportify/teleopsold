# Generated manually for BulkTaskCreationJob model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0001_initial'),  # Adjust based on your actual tenant app
        ('apps_users', '0001_initial'),  # Adjust based on your actual user app
        ('projects', '0001_initial'),  # Adjust based on your actual project app
        ('tasks', '0009_make_flow_activity_description_optional'),
    ]

    operations = [
        migrations.CreateModel(
            name='BulkTaskCreationJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_name', models.CharField(max_length=255)),
                ('total_rows', models.IntegerField(default=0)),
                ('processed_rows', models.IntegerField(default=0)),
                ('success_count', models.IntegerField(default=0)),
                ('error_count', models.IntegerField(default=0)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('detailed_errors', models.JSONField(blank=True, help_text='Detailed error list for each failed row', null=True)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bulk_task_creation_jobs', to='tenants.tenant')),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bulk_task_creation_jobs', to='apps_users.user')),
                ('flow_template', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bulk_task_jobs', to='tasks.flowtemplate')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bulk_task_jobs', to='projects.project')),
            ],
            options={
                'db_table': 'tasks_bulk_task_creation_job',
                'ordering': ['-created_at'],
            },
        ),
    ]

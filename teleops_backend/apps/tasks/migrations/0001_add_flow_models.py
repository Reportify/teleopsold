# Generated manually for Flow models integration

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0001_initial'),
        ('apps_users', '0001_initial'),
        ('sites', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='FlowTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('category', models.CharField(choices=[('DISMANTLING', 'Dismantling'), ('INSTALLATION', 'Installation'), ('MAINTENANCE', 'Maintenance'), ('SURVEY', 'Survey'), ('LOGISTICS', 'Logistics'), ('COMMISSIONING', 'Commissioning'), ('CUSTOM', 'Custom')], default='CUSTOM', max_length=20)),
                ('tags', models.JSONField(blank=True, default=list)),
                ('is_active', models.BooleanField(default=True)),
                ('is_public', models.BooleanField(default=False, help_text='Whether this flow can be used by other tenants')),
                ('usage_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_flows', to='apps_users.user')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='flow_templates', to='tenants.tenant')),
            ],
            options={
                'db_table': 'flow_templates',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='FlowActivity',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('activity_name', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('activity_type', models.CharField(choices=[('installation', 'Installation'), ('maintenance', 'Maintenance'), ('dismantling', 'Dismantling'), ('survey', 'Survey'), ('audit', 'Audit'), ('repair', 'Repair'), ('upgrade', 'Upgrade'), ('testing', 'Testing'), ('commissioning', 'Commissioning')], max_length=50)),
                ('sequence_order', models.IntegerField()),
                ('dependencies', models.JSONField(default=list, help_text='List of activity IDs this activity depends on')),
                ('requires_site', models.BooleanField(default=True)),
                ('requires_equipment', models.BooleanField(default=False)),
                ('site_scope', models.CharField(choices=[('SINGLE', 'Single Site'), ('MULTIPLE', 'Multiple Sites'), ('ALL', 'All Sites')], default='SINGLE', max_length=20)),
                ('parallel_execution', models.BooleanField(default=False, help_text='Can this activity run in parallel across sites')),
                ('dependency_scope', models.CharField(choices=[('SITE_LOCAL', 'Site Local'), ('CROSS_SITE', 'Cross Site'), ('GLOBAL', 'Global')], default='SITE_LOCAL', max_length=20)),
                ('site_coordination', models.BooleanField(default=False, help_text='Requires coordination between sites')),
                ('flow_template', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activities', to='tasks.flowtemplate')),
            ],
            options={
                'db_table': 'flow_activities',
                'ordering': ['sequence_order'],
            },
        ),
        migrations.CreateModel(
            name='FlowSite',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('alias', models.CharField(blank=True, max_length=100)),
                ('order', models.IntegerField(default=0)),
                ('is_required', models.BooleanField(default=True, help_text='Whether this site is required for the flow')),
                ('role', models.CharField(choices=[('PRIMARY', 'Primary'), ('SECONDARY', 'Secondary'), ('COORDINATION', 'Coordination')], default='PRIMARY', max_length=20)),
                ('flow_template', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sites', to='tasks.flowtemplate')),
                ('site', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='flow_templates', to='sites.site')),
            ],
            options={
                'db_table': 'flow_sites',
                'ordering': ['order'],
            },
        ),
        migrations.CreateModel(
            name='FlowInstance',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed'), ('FAILED', 'Failed'), ('CANCELLED', 'Cancelled')], default='PENDING', max_length=20)),
                ('current_activity_index', models.IntegerField(default=0)),
                ('completed_activities', models.JSONField(default=list)),
                ('failed_activities', models.JSONField(default=list)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('flow_template', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='instances', to='tasks.flowtemplate')),
                ('task_id', models.UUIDField()),  # Use UUID field instead of ForeignKey for now
            ],
            options={
                'db_table': 'flow_instances',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='flowtemplate',
            constraint=models.UniqueConstraint(fields=('tenant', 'name'), name='unique_tenant_flow_name'),
        ),
        migrations.AddConstraint(
            model_name='flowactivity',
            constraint=models.UniqueConstraint(fields=('flow_template', 'sequence_order'), name='unique_flow_activity_order'),
        ),
        migrations.AddConstraint(
            model_name='flowsite',
            constraint=models.UniqueConstraint(fields=('flow_template', 'site'), name='unique_flow_site'),
        ),
    ]

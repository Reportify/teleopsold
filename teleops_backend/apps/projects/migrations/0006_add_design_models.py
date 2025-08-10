from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0001_initial'),
        ('apps_users', '0005_alter_department_unique_together_and_more'),
        ('projects', '0005_drop_legacy_location_column'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectDesign',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(default='active', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_project_designs', to='apps_users.user')),
                ('project', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='design', to='projects.project')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='project_designs', to='tenants.tenant')),
            ],
            options={'db_table': 'project_designs'},
        ),
        migrations.CreateModel(
            name='ProjectDesignVersion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('version_number', models.PositiveIntegerField()),
                ('title', models.CharField(blank=True, max_length=255)),
                ('notes', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('published', 'Published')], default='draft', max_length=20)),
                ('is_locked', models.BooleanField(default=False)),
                ('items_count', models.PositiveIntegerField(default=0)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_project_design_versions', to='apps_users.user')),
                ('design', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='versions', to='projects.projectdesign')),
            ],
            options={'db_table': 'project_design_versions', 'ordering': ['-version_number']},
        ),
        migrations.CreateModel(
            name='DesignItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('item_name', models.CharField(max_length=255)),
                ('equipment_code', models.CharField(blank=True, max_length=128)),
                ('category', models.CharField(blank=True, max_length=255)),
                ('model', models.CharField(blank=True, max_length=255)),
                ('manufacturer', models.CharField(blank=True, max_length=255)),
                ('attributes', models.JSONField(blank=True, null=True)),
                ('remarks', models.TextField(blank=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('is_category', models.BooleanField(default=False)),
                ('version', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='projects.projectdesignversion')),
            ],
            options={'db_table': 'project_design_items', 'ordering': ['sort_order', 'id']},
        ),
        migrations.AddConstraint(
            model_name='projectdesign',
            constraint=models.UniqueConstraint(fields=('tenant', 'project'), name='unique_design_per_project'),
        ),
        migrations.AddConstraint(
            model_name='projectdesignversion',
            constraint=models.UniqueConstraint(fields=('design', 'version_number'), name='unique_version_per_design'),
        ),
    ]



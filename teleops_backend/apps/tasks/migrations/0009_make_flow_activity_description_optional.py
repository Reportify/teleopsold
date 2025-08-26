# Generated manually to make FlowActivity description field optional

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0008_remove_task_site_group_role_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='flowactivity',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
    ]

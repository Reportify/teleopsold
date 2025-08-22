# Generated manually to make site field optional in FlowSite model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0003_add_flow_activity_site'),
    ]

    operations = [
        migrations.AlterField(
            model_name='flowsite',
            name='site',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='flow_templates', to='sites.site'),
        ),
    ]

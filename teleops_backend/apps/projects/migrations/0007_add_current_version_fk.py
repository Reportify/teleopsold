from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0006_add_design_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='projectdesign',
            name='current_version',
            field=models.ForeignKey(
                to='projects.projectdesignversion',
                on_delete=django.db.models.deletion.SET_NULL,
                null=True,
                blank=True,
                related_name='+',
            ),
        ),
    ]



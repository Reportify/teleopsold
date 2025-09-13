# Generated manually to add missing task_type field to TaskFromFlow

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0009_make_flow_activity_description_optional'),
    ]

    operations = [
        migrations.AddField(
            model_name='taskfromflow',
            name='task_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('installation', 'Installation'),
                    ('maintenance', 'Maintenance'),
                    ('dismantling', 'Dismantling'),
                    ('survey', 'Survey'),
                    ('audit', 'Audit'),
                    ('repair', 'Repair'),
                    ('upgrade', 'Upgrade'),
                    ('testing', 'Testing'),
                    ('commissioning', 'Commissioning'),
                    ('rf_survey', 'RF Survey'),
                    ('emf_survey', 'EMF Survey'),
                    ('rfi_survey', 'RFI Survey'),
                    ('transportation', 'Transportation'),
                    ('packaging', 'Packaging'),
                    ('deviation_email', 'Deviation Email'),
                    ('rsa', 'RSA'),
                ],
                default='maintenance'
            ),
        ),
    ]
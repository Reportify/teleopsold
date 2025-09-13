# Generated migration to update allocation status choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0018_merge_20250910_0325'),
    ]

    operations = [
        # Update status field choices in TaskAllocation
        migrations.AlterField(
            model_name='taskallocation',
            name='status',
            field=models.CharField(
                choices=[
                    ('unallocated', 'Unallocated'),
                    ('partially_allocated', 'Partially Allocated'),
                    ('fully_allocated', 'Fully Allocated'),
                    ('mixed_allocation', 'Mixed Allocation')
                ],
                default='unallocated',
                max_length=20
            ),
        ),
    ]
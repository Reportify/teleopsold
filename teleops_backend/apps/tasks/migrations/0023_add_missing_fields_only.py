# Generated manually to add only missing TaskAllocation fields
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tasks", "0022_drop_legacy_tasks_table"),
    ]

    operations = [
        # Add only the fields that are actually missing from the database
        migrations.AddField(
            model_name="taskallocation",
            name="allocation_reference",
            field=models.CharField(
                blank=True,
                help_text="External reference number for this allocation",
                max_length=100,
            ),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="priority",
            field=models.CharField(
                choices=[
                    ("low", "Low"),
                    ("medium", "Medium"),
                    ("high", "High"),
                    ("urgent", "Urgent"),
                ],
                default="medium",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="scheduled_start",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="scheduled_end",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="estimated_duration_hours",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=10, null=True
            ),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="estimated_cost",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True
            ),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="allocation_notes",
            field=models.TextField(
                blank=True,
                help_text="Special instructions or notes for this allocation",
            ),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="progress_percentage",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0.00"),
                help_text="Overall progress of this allocation",
                max_digits=5,
            ),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="actual_start",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="actual_end",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="actual_duration_hours",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=10, null=True
            ),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="actual_cost",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True
            ),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="completion_notes",
            field=models.TextField(blank=True, help_text="Notes added upon completion"),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="accepted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="taskallocation",
            name="cancelled_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
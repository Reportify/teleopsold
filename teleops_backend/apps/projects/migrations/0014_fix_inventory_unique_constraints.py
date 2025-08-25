# Generated manually to fix inventory unique constraints
# This fixes the issue where multiple equipment with same serial (including blank) 
# cannot exist on the same site

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0013_projectinventorybulkuploadjob"),
    ]

    operations = [
        # Remove the old constraints that don't include equipment_item
        migrations.RemoveConstraint(
            model_name="projectsiteinventory",
            name="uniq_serial_plan_site_linked",
        ),
        migrations.RemoveConstraint(
            model_name="projectsiteinventory",
            name="uniq_serial_plan_business_site_unlinked",
        ),
        
        # Add new constraints that include equipment_item
        migrations.AddConstraint(
            model_name="projectsiteinventory",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("deleted_at__isnull", True), ("project_site__isnull", False)
                ),
                fields=("plan", "project_site", "equipment_item", "serial_normalized"),
                name="uniq_equipment_serial_plan_site_linked",
            ),
        ),
        migrations.AddConstraint(
            model_name="projectsiteinventory",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("deleted_at__isnull", True), ("project_site__isnull", True)
                ),
                fields=("plan", "site_id_business", "equipment_item", "serial_normalized"),
                name="uniq_equipment_serial_plan_business_site_unlinked",
            ),
        ),
    ]

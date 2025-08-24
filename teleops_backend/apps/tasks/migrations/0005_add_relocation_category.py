# Generated manually to add RELOCATION category choice

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0004_make_site_field_optional'),
    ]

    operations = [
        # No operations needed - this is just a choice addition
        # The RELOCATION choice has been added to the FLOW_CATEGORY choices in models.py
        # Django will automatically handle the new choice without requiring a database migration
    ]

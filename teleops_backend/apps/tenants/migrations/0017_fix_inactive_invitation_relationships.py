# Generated manually to fix data inconsistency
# Fix is_active=True for relationships without vendor_tenant (invitation stage)

from django.db import migrations


def fix_invitation_active_status(apps, schema_editor):
    """
    Set is_active=False for CircleVendorRelationships that are in invitation stage
    (vendor_tenant is null but is_active is True)
    """
    CircleVendorRelationship = apps.get_model('tenants', 'CircleVendorRelationship')
    
    # Update relationships that are in invitation stage to be inactive
    updated_count = CircleVendorRelationship.objects.filter(
        vendor_tenant__isnull=True,
        is_active=True
    ).update(is_active=False)
    
    print(f"Updated {updated_count} invitation relationships to is_active=False")


def reverse_fix_invitation_active_status(apps, schema_editor):
    """
    Reverse the migration by setting is_active=True for invitation relationships
    """
    CircleVendorRelationship = apps.get_model('tenants', 'CircleVendorRelationship')
    
    # Revert relationships that are in invitation stage back to active
    updated_count = CircleVendorRelationship.objects.filter(
        vendor_tenant__isnull=True,
        relationship_status='Circle_Invitation_Sent',
        is_active=False
    ).update(is_active=True)
    
    print(f"Reverted {updated_count} invitation relationships to is_active=True")


class Migration(migrations.Migration):
    dependencies = [
        ("tenants", "0016_remove_contract_dates"),
    ]

    operations = [
        migrations.RunPython(
            fix_invitation_active_status,
            reverse_fix_invitation_active_status,
        ),
    ] 
# Generated manually to convert department field from CharField to ForeignKey

from django.db import migrations, models
import django.db.models.deletion


def migrate_department_data(apps, schema_editor):
    """Migrate department names to department IDs"""
    TenantDesignation = apps.get_model('tenants', 'TenantDesignation')
    TenantDepartment = apps.get_model('tenants', 'TenantDepartment')
    
    # Get all designations
    designations = TenantDesignation.objects.all()
    
    for designation in designations:
        dept_name = (designation.department or '').strip()
        if not dept_name:
            # Set to None if blank or null
            TenantDesignation.objects.filter(id=designation.id).update(department_id=None)
            continue
        try:
            # Try to find matching department by name
            dept = TenantDepartment.objects.filter(
                tenant=designation.tenant,
                department_name__iexact=dept_name
            ).first()
            if dept:
                TenantDesignation.objects.filter(id=designation.id).update(department_id=dept.id)
            else:
                # Optionally: create a new department if you want, or just set to None
                TenantDesignation.objects.filter(id=designation.id).update(department_id=None)
        except Exception as e:
            print(f"Error migrating department for designation {designation.id}: {e}")
            TenantDesignation.objects.filter(id=designation.id).update(department_id=None)
            continue


def reverse_migrate_department_data(apps, schema_editor):
    """Reverse migration - copy department names back from ForeignKey"""
    TenantDesignation = apps.get_model('tenants', 'TenantDesignation')
    TenantDepartment = apps.get_model('tenants', 'TenantDepartment')
    
    designations = TenantDesignation.objects.exclude(department_id__isnull=True)
    
    for designation in designations:
        if designation.department_id:
            try:
                dept = TenantDepartment.objects.get(id=designation.department_id)
                TenantDesignation.objects.filter(id=designation.id).update(department=dept.department_name)
            except Exception as e:
                print(f"Error reverse migrating department for designation {designation.id}: {e}")
                continue


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0025_rename_tables_to_tenant_prefix'),
    ]

    operations = [
        # Step 1: Add the new department_id field (nullable for now)
        migrations.AddField(
            model_name='tenantdesignation',
            name='department_id',
            field=models.BigIntegerField(null=True, blank=True),
        ),
        
        # Step 2: Migrate data from department (CharField) to department_id
        migrations.RunPython(
            migrate_department_data,
            reverse_migrate_department_data
        ),
        
        # Step 3: Remove the old department field
        migrations.RemoveField(
            model_name='tenantdesignation',
            name='department',
        ),
        
        # Step 4: Rename department_id to department and make it a proper ForeignKey
        migrations.RenameField(
            model_name='tenantdesignation',
            old_name='department_id',
            new_name='department',
        ),
        
        # Step 5: Convert to proper ForeignKey
        migrations.AlterField(
            model_name='tenantdesignation',
            name='department',
            field=models.ForeignKey(
                blank=True,
                help_text='Department this designation belongs to',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='designations',
                to='tenants.tenantdepartment',
            ),
        ),
    ] 
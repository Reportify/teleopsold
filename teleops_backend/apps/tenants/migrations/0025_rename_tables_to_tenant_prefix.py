# Generated manually to fix table naming

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tenants', '0024_alter_tenantdesignation_options_and_more'),
    ]

    operations = [
        # Rename comprehensive_designations table to tenant_designations
        migrations.RunSQL(
            "ALTER TABLE comprehensive_designations RENAME TO tenant_designations;",
            reverse_sql="ALTER TABLE tenant_designations RENAME TO comprehensive_designations;"
        ),
        
        # Rename comprehensive_departments table to tenant_departments  
        migrations.RunSQL(
            "ALTER TABLE comprehensive_departments RENAME TO tenant_departments;",
            reverse_sql="ALTER TABLE tenant_departments RENAME TO comprehensive_departments;"
        ),
        
        # Drop the old designations table if it exists and is different from tenant_designations
        migrations.RunSQL(
            """
            DO $$
            BEGIN
                IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'designations' AND schemaname = 'public') THEN
                    DROP TABLE designations CASCADE;
                END IF;
            END
            $$;
            """,
            reverse_sql="-- Cannot reverse dropping designations table"
        ),
    ] 
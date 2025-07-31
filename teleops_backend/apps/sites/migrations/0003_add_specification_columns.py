# Add missing columns for site management specification

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sites', '0002_add_deleted_at_column'),
    ]

    operations = [
        # Add required specification columns
        migrations.RunSQL(
            sql="ALTER TABLE sites ADD COLUMN IF NOT EXISTS site_id varchar(100);",
            reverse_sql="ALTER TABLE sites DROP COLUMN IF EXISTS site_id;"
        ),
        migrations.RunSQL(
            sql="ALTER TABLE sites ADD COLUMN IF NOT EXISTS global_id varchar(100);",
            reverse_sql="ALTER TABLE sites DROP COLUMN IF EXISTS global_id;"
        ),
        migrations.RunSQL(
            sql="ALTER TABLE sites ADD COLUMN IF NOT EXISTS site_name varchar(255);",
            reverse_sql="ALTER TABLE sites DROP COLUMN IF EXISTS site_name;"
        ),
        migrations.RunSQL(
            sql="ALTER TABLE sites ADD COLUMN IF NOT EXISTS town varchar(100);",
            reverse_sql="ALTER TABLE sites DROP COLUMN IF EXISTS town;"
        ),
        migrations.RunSQL(
            sql="ALTER TABLE sites ADD COLUMN IF NOT EXISTS cluster varchar(100);",
            reverse_sql="ALTER TABLE sites DROP COLUMN IF EXISTS cluster;"
        ),
        
        # Add indexes for performance
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS sites_site_id_idx ON sites (site_id);",
            reverse_sql="DROP INDEX IF EXISTS sites_site_id_idx;"
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS sites_global_id_idx ON sites (global_id);",
            reverse_sql="DROP INDEX IF EXISTS sites_global_id_idx;"
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS sites_town_cluster_idx ON sites (town, cluster);",
            reverse_sql="DROP INDEX IF EXISTS sites_town_cluster_idx;"
        ),
        
        # Add unique constraints (will be enforced at Django level)
        migrations.RunSQL(
            sql="""
            CREATE UNIQUE INDEX IF NOT EXISTS sites_unique_site_id_per_tenant 
            ON sites (tenant_id, site_id) 
            WHERE deleted_at IS NULL;
            """,
            reverse_sql="DROP INDEX IF EXISTS sites_unique_site_id_per_tenant;"
        ),
        migrations.RunSQL(
            sql="""
            CREATE UNIQUE INDEX IF NOT EXISTS sites_unique_global_id_per_tenant 
            ON sites (tenant_id, global_id) 
            WHERE deleted_at IS NULL;
            """,
            reverse_sql="DROP INDEX IF EXISTS sites_unique_global_id_per_tenant;"
        ),
    ]
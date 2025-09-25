# Generated manually to fix site_code uniqueness constraint
# This migration removes the global unique constraint on site_code
# and replaces it with a tenant-specific unique constraint

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sites', '0006_bulkuploadjob_detailed_errors'),
    ]

    operations = [
        # Remove the global unique constraint on site_code (this will also drop the associated index)
        migrations.RunSQL(
            sql="ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_site_code_key;",
            reverse_sql="ALTER TABLE sites ADD CONSTRAINT sites_site_code_key UNIQUE (site_code);"
        ),
        
        # Remove the pattern ops index as well since it's related to the unique constraint
        migrations.RunSQL(
            sql="DROP INDEX IF EXISTS sites_site_code_e61c5326_like;",
            reverse_sql="CREATE INDEX sites_site_code_e61c5326_like ON sites USING btree (site_code varchar_pattern_ops);"
        ),
        
        # Add a tenant-specific unique constraint on site_code (only for non-null, non-empty values)
        migrations.RunSQL(
            sql="""
            CREATE UNIQUE INDEX sites_unique_site_code_per_tenant 
            ON sites (tenant_id, site_code) 
            WHERE deleted_at IS NULL AND site_code IS NOT NULL AND site_code != '';
            """,
            reverse_sql="DROP INDEX IF EXISTS sites_unique_site_code_per_tenant;"
        ),
        
        # Recreate the pattern ops index for tenant-specific site_code lookups
        migrations.RunSQL(
            sql="""
            CREATE INDEX sites_tenant_site_code_pattern_idx 
            ON sites (tenant_id, site_code varchar_pattern_ops) 
            WHERE site_code IS NOT NULL AND site_code != '';
            """,
            reverse_sql="DROP INDEX IF EXISTS sites_tenant_site_code_pattern_idx;"
        ),
    ]
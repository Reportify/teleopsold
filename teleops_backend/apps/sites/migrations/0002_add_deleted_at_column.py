# Generated manually to add missing deleted_at column

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sites', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE sites ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;",
            reverse_sql="ALTER TABLE sites DROP COLUMN IF EXISTS deleted_at;"
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS sites_deleted_at_idx ON sites (deleted_at);",
            reverse_sql="DROP INDEX IF EXISTS sites_deleted_at_idx;"
        ),
        migrations.RunSQL(
            sql="CREATE INDEX IF NOT EXISTS sites_tenant_status_deleted_at_idx ON sites (tenant_id, status, deleted_at);",
            reverse_sql="DROP INDEX IF EXISTS sites_tenant_status_deleted_at_idx;"
        ),
    ]
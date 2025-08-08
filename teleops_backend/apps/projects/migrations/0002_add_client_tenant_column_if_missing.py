from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0001_initial"),
        ("tenants", "0032_transfer_circle_vendor_data"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                """
                DO $$
                BEGIN
                    -- Add client_tenant_id column if it does not exist
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='client_tenant_id'
                    ) THEN
                        ALTER TABLE projects ADD COLUMN client_tenant_id uuid NULL;
                    END IF;

                    -- Create index if not exists
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE c.relname = 'projects_client_tenant_idx' AND n.nspname = 'public'
                    ) THEN
                        CREATE INDEX projects_client_tenant_idx ON projects (client_tenant_id);
                    END IF;

                    -- Add FK constraint if not exists
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE table_name = 'projects' AND constraint_name = 'projects_client_tenant_fk'
                    ) THEN
                        ALTER TABLE projects
                        ADD CONSTRAINT projects_client_tenant_fk
                        FOREIGN KEY (client_tenant_id)
                        REFERENCES tenants (id)
                        ON UPDATE NO ACTION
                        ON DELETE NO ACTION;
                    END IF;
                END$$;
                """
            ),
            reverse_sql=(
                """
                DO $$
                BEGIN
                    -- Drop FK constraint if exists
                    IF EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE table_name = 'projects' AND constraint_name = 'projects_client_tenant_fk'
                    ) THEN
                        ALTER TABLE projects DROP CONSTRAINT projects_client_tenant_fk;
                    END IF;

                    -- Drop index if exists
                    IF EXISTS (
                        SELECT 1 FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE c.relname = 'projects_client_tenant_idx' AND n.nspname = 'public'
                    ) THEN
                        DROP INDEX projects_client_tenant_idx;
                    END IF;

                    -- Drop column if exists
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='client_tenant_id'
                    ) THEN
                        ALTER TABLE projects DROP COLUMN client_tenant_id;
                    END IF;
                END$$;
                """
            ),
        )
    ]


from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0002_add_client_tenant_column_if_missing"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='customer_name'
                    ) THEN
                        ALTER TABLE projects ADD COLUMN customer_name varchar(255) NOT NULL DEFAULT '';
                    END IF;
                END$$;
                """
            ),
            reverse_sql=(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='customer_name'
                    ) THEN
                        ALTER TABLE projects DROP COLUMN customer_name;
                    END IF;
                END$$;
                """
            ),
        )
    ]


from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0003_add_customer_name_if_missing"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                """
                DO $$
                BEGIN
                    -- circle
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='circle'
                    ) THEN
                        ALTER TABLE projects ADD COLUMN circle varchar(100) NOT NULL DEFAULT '';
                    END IF;

                    -- activity
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='activity'
                    ) THEN
                        ALTER TABLE projects ADD COLUMN activity text NOT NULL DEFAULT '';
                    END IF;

                    -- start_date
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='start_date'
                    ) THEN
                        ALTER TABLE projects ADD COLUMN start_date date NULL;
                    END IF;

                    -- end_date
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='end_date'
                    ) THEN
                        ALTER TABLE projects ADD COLUMN end_date date NULL;
                    END IF;

                    -- scope
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='scope'
                    ) THEN
                        ALTER TABLE projects ADD COLUMN scope text NULL DEFAULT '';
                    END IF;

                    -- deleted_at
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='deleted_at'
                    ) THEN
                        ALTER TABLE projects ADD COLUMN deleted_at timestamp with time zone NULL;
                    END IF;
                END$$;
                """
            ),
            reverse_sql=(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='circle'
                    ) THEN
                        ALTER TABLE projects DROP COLUMN circle;
                    END IF;
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='activity'
                    ) THEN
                        ALTER TABLE projects DROP COLUMN activity;
                    END IF;
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='start_date'
                    ) THEN
                        ALTER TABLE projects DROP COLUMN start_date;
                    END IF;
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='end_date'
                    ) THEN
                        ALTER TABLE projects DROP COLUMN end_date;
                    END IF;
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='scope'
                    ) THEN
                        ALTER TABLE projects DROP COLUMN scope;
                    END IF;
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='deleted_at'
                    ) THEN
                        ALTER TABLE projects DROP COLUMN deleted_at;
                    END IF;
                END$$;
                """
            ),
        )
    ]


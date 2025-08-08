from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0004_add_missing_phase1_columns"),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                """
                DO $$
                BEGIN
                    -- Drop legacy 'location' column if present (removed in Phase 1)
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_name='projects' AND column_name='location'
                    ) THEN
                        ALTER TABLE projects DROP COLUMN location;
                    END IF;
                END$$;
                """
            ),
            reverse_sql=(
                """
                -- No-op reversal; we do not reintroduce legacy column
                SELECT 1;
                """
            ),
        )
    ]


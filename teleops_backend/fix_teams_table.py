#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.db import connection

def fix_teams_table():
    cursor = connection.cursor()
    
    try:
        # Check if teams table exists and its structure
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'teams'")
        columns = [row[0] for row in cursor.fetchall()]
        print('Teams table columns:', columns)
        
        if 'team_code' not in columns:
            print('team_code column missing, adding it...')
            cursor.execute('ALTER TABLE teams ADD COLUMN team_code VARCHAR(50)')
            print('team_code column added successfully')
            
            # Add unique constraint
            try:
                cursor.execute('ALTER TABLE teams ADD CONSTRAINT teams_tenant_id_team_code_unique UNIQUE (tenant_id, team_code)')
                print('Unique constraint added successfully')
            except Exception as e:
                print('Warning: Could not add unique constraint:', e)
        else:
            print('team_code column already exists')
            
        # Check if the table has any data
        cursor.execute("SELECT COUNT(*) FROM teams")
        count = cursor.fetchone()[0]
        print(f'Teams table has {count} records')
        
    except Exception as e:
        print('Error:', e)
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    fix_teams_table()
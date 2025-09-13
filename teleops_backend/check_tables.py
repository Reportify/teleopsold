#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.db import connection

def check_task_tables():
    cursor = connection.cursor()
    
    # Check for task-related tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%task%'
        ORDER BY table_name;
    """)
    
    tables = [row[0] for row in cursor.fetchall()]
    print("Task-related tables found:")
    for table in tables:
        print(f"  - {table}")
    
    # Specifically check for task_allocations
    if 'task_allocations' in tables:
        print("\n✓ task_allocations table EXISTS")
        
        # Check the structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'task_allocations'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        print("\nColumns in task_allocations:")
        for col_name, data_type, is_nullable in columns:
            print(f"  - {col_name}: {data_type} (nullable: {is_nullable})")
    else:
        print("\n✗ task_allocations table DOES NOT EXIST")
    
    cursor.close()

if __name__ == '__main__':
    check_task_tables()
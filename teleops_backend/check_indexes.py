import os
import django
from django.conf import settings
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'teleops_backend.settings')
django.setup()

def check_table_indexes():
    with connection.cursor() as cursor:
        # Check if tasks_taskallocation table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'tasks_taskallocation'
            );
        """)
        table_exists = cursor.fetchone()[0]
        
        if table_exists:
            print("tasks_taskallocation table exists")
            
            # Get all indexes for the table
            cursor.execute("""
                SELECT indexname, indexdef 
                FROM pg_indexes 
                WHERE tablename = 'tasks_taskallocation'
                ORDER BY indexname;
            """)
            
            indexes = cursor.fetchall()
            print(f"\nFound {len(indexes)} indexes:")
            for index_name, index_def in indexes:
                print(f"  - {index_name}: {index_def}")
        else:
            print("tasks_taskallocation table does not exist")

if __name__ == '__main__':
    check_table_indexes()
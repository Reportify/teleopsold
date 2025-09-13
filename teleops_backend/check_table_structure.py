import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.db import connection

def check_table_structure():
    cursor = connection.cursor()
    
    # Check if table exists
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'tasks_taskallocation'
    """)
    
    if not cursor.fetchone():
        print("❌ Table 'tasks_taskallocation' does not exist")
        return
    
    print("✅ Table 'tasks_taskallocation' exists")
    
    # Get column information
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'tasks_taskallocation' 
        ORDER BY ordinal_position
    """)
    
    columns = cursor.fetchall()
    print(f"\nColumns in 'tasks_taskallocation' table ({len(columns)} total):")
    for col_name, data_type, nullable, default in columns:
        nullable_str = "NULL" if nullable == "YES" else "NOT NULL"
        default_str = f" DEFAULT {default}" if default else ""
        print(f"  - {col_name}: {data_type} {nullable_str}{default_str}")

if __name__ == "__main__":
    check_table_structure()
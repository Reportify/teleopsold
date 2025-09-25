#!/usr/bin/env python
"""
Check database constraints on the sites table
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.db import connection

def check_site_constraints():
    """Check all constraints on the sites table"""
    with connection.cursor() as cursor:
        # Check table constraints
        cursor.execute("""
            SELECT 
                conname as constraint_name,
                contype as constraint_type,
                pg_get_constraintdef(oid) as constraint_definition
            FROM pg_constraint 
            WHERE conrelid = 'sites'::regclass
            ORDER BY conname;
        """)
        
        constraints = cursor.fetchall()
        
        print("=== SITES TABLE CONSTRAINTS ===")
        for constraint in constraints:
            name, type_code, definition = constraint
            constraint_type = {
                'p': 'PRIMARY KEY',
                'f': 'FOREIGN KEY', 
                'u': 'UNIQUE',
                'c': 'CHECK',
                'x': 'EXCLUDE'
            }.get(type_code, type_code)
            
            print(f"Name: {name}")
            print(f"Type: {constraint_type}")
            print(f"Definition: {definition}")
            print("-" * 50)
        
        # Check indexes
        cursor.execute("""
            SELECT 
                indexname,
                indexdef
            FROM pg_indexes 
            WHERE tablename = 'sites'
            ORDER BY indexname;
        """)
        
        indexes = cursor.fetchall()
        
        print("\n=== SITES TABLE INDEXES ===")
        for index in indexes:
            name, definition = index
            print(f"Name: {name}")
            print(f"Definition: {definition}")
            print("-" * 50)

if __name__ == "__main__":
    check_site_constraints()
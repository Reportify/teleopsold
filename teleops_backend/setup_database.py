#!/usr/bin/env python
"""
Database Setup Script for Teleops Backend
This script helps you test and configure your PostgreSQL database connection.
"""

import os
import sys
import psycopg2
from pathlib import Path

def test_postgresql_connection(host, port, database, user, password):
    """Test PostgreSQL connection"""
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        cursor.close()
        conn.close()
        print(f"✅ PostgreSQL connection successful!")
        print(f"   Version: {version[0]}")
        return True
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
        return False

def create_database_if_not_exists(host, port, user, password, database_name):
    """Create database if it doesn't exist"""
    try:
        # Connect to default postgres database
        conn = psycopg2.connect(
            host=host,
            port=port,
            database='postgres',
            user=user,
            password=password
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database_name,))
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute(f"CREATE DATABASE {database_name}")
            print(f"✅ Database '{database_name}' created successfully!")
        else:
            print(f"✅ Database '{database_name}' already exists!")
        
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Failed to create database: {e}")
        return False

def setup_environment():
    """Setup environment variables"""
    env_file = Path('.env')
    env_template = Path('env.template')
    
    if not env_file.exists():
        if env_template.exists():
            print("📝 Creating .env file from template...")
            import shutil
            shutil.copy(env_template, env_file)
            print("✅ .env file created from template")
        else:
            print("❌ env.template file not found!")
            return False
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    return True

def main():
    """Main setup function"""
    print("🚀 Teleops Backend Database Setup")
    print("=" * 50)
    
    # Setup environment
    if not setup_environment():
        return
    
    # Get database configuration
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'teleops')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', '')
    
    print(f"\n📊 Database Configuration:")
    print(f"   Host: {db_host}")
    print(f"   Port: {db_port}")
    print(f"   Database: {db_name}")
    print(f"   User: {db_user}")
    print(f"   Password: {'*' * len(db_password) if db_password else 'Not set'}")
    
    # Test connection to postgres database
    print(f"\n🔍 Testing connection to PostgreSQL...")
    if not test_postgresql_connection(db_host, db_port, 'postgres', db_user, db_password):
        print("\n❌ Cannot connect to PostgreSQL. Please check:")
        print("   1. PostgreSQL is installed and running")
        print("   2. Database credentials are correct")
        print("   3. PostgreSQL service is started")
        return
    
    # Create database if it doesn't exist
    print(f"\n🗄️ Creating database '{db_name}' if it doesn't exist...")
    if not create_database_if_not_exists(db_host, db_port, db_user, db_password, db_name):
        print("\n❌ Failed to create database. Please check:")
        print("   1. User has CREATE DATABASE permission")
        print("   2. Database name is valid")
        return
    
    # Test connection to the specific database
    print(f"\n🔍 Testing connection to '{db_name}' database...")
    if not test_postgresql_connection(db_host, db_port, db_name, db_user, db_password):
        print("\n❌ Cannot connect to the database. Please check:")
        print("   1. Database exists")
        print("   2. User has access to the database")
        return
    
    print(f"\n✅ Database setup completed successfully!")
    print(f"\n🎯 Next steps:")
    print(f"   1. Run: python manage.py migrate")
    print(f"   2. Run: python manage.py createsuperuser")
    print(f"   3. Run: python manage.py runserver")
    print(f"   4. Open: http://localhost:8000/health/")

if __name__ == "__main__":
    main() 
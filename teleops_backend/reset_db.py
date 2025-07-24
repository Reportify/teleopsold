#!/usr/bin/env python
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def reset_database():
    """Drop and recreate the database"""
    
    # Database connection parameters
    DB_NAME = os.getenv('DB_NAME', 'teleops')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '123456')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    
    try:
        # Connect to PostgreSQL server (not to specific database)
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database='postgres'  # Connect to default postgres database
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Drop database if it exists
        print(f"Dropping database '{DB_NAME}' if it exists...")
        cursor.execute(f"DROP DATABASE IF EXISTS {DB_NAME}")
        
        # Create new database
        print(f"Creating database '{DB_NAME}'...")
        cursor.execute(f"CREATE DATABASE {DB_NAME}")
        
        print(f"Database '{DB_NAME}' has been reset successfully!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error resetting database: {e}")
        return False
    
    return True

if __name__ == '__main__':
    reset_database() 
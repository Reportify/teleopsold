#!/usr/bin/env python3
"""
Setup script for Teleops Backend
This script helps set up the project dependencies and initial configuration.
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors."""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")
    return True

def check_pip():
    """Check if pip is available."""
    try:
        subprocess.run([sys.executable, "-m", "pip", "--version"], check=True, capture_output=True)
        print("✅ pip is available")
        return True
    except subprocess.CalledProcessError:
        print("❌ pip is not available")
        return False

def upgrade_pip():
    """Upgrade pip to the latest version."""
    return run_command(
        f"{sys.executable} -m pip install --upgrade pip",
        "Upgrading pip"
    )

def install_requirements():
    """Install project requirements."""
    requirements_file = Path("requirements/base.txt")
    if not requirements_file.exists():
        print(f"❌ Requirements file not found: {requirements_file}")
        return False
    
    return run_command(
        f"{sys.executable} -m pip install -r {requirements_file}",
        "Installing project requirements"
    )

def create_env_file():
    """Create a .env file with default settings."""
    env_file = Path(".env")
    env_template = Path('env.template')
    
    if env_file.exists():
        print("✅ .env file already exists")
        return True
    
    if env_template.exists():
        try:
            import shutil
            shutil.copy(env_template, env_file)
            print("✅ Created .env file from template")
            print("⚠️  Please update the .env file with your actual configuration")
            return True
        except Exception as e:
            print(f"❌ Failed to create .env file: {e}")
            return False
    else:
        print("❌ env.template file not found")
        return False

def run_migrations():
    """Run Django migrations."""
    return run_command(
        f"{sys.executable} manage.py migrate",
        "Running database migrations"
    )

def create_superuser():
    """Create a superuser account."""
    print("\n🔄 Creating superuser account...")
    print("Please enter the following information:")
    
    try:
        subprocess.run([sys.executable, "manage.py", "createsuperuser"], check=True)
        print("✅ Superuser created successfully")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to create superuser")
        return False

def main():
    """Main setup function."""
    print("🚀 Teleops Backend Setup")
    print("=" * 50)
    
    # Check prerequisites
    if not check_python_version():
        sys.exit(1)
    
    if not check_pip():
        sys.exit(1)
    
    # Upgrade pip
    upgrade_pip()
    
    # Install requirements
    if not install_requirements():
        print("\n❌ Setup failed during requirements installation")
        print("Please check the error messages above and try again")
        sys.exit(1)
    
    # Create .env file
    create_env_file()
    
    # Run migrations
    if not run_migrations():
        print("\n❌ Setup failed during migrations")
        print("Please ensure your database is properly configured")
        sys.exit(1)
    
    # Create superuser
    create_superuser()
    
    print("\n🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Update the .env file with your actual configuration")
    print("2. Start the development server: python manage.py runserver")
    print("3. Access the admin interface at: http://localhost:8000/admin")
    print("4. Check the API documentation at: http://localhost:8000/api/docs/")

if __name__ == "__main__":
    main() 
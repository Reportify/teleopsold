# Database Setup Guide - PostgreSQL with pgAdmin 4

## 🗄️ PostgreSQL Database Setup for Teleops Backend

This guide will help you set up PostgreSQL database for the Teleops circle-based multi-tenant platform using pgAdmin 4.

---

## 📋 Prerequisites

- **PostgreSQL**: Installed on your local machine
- **pgAdmin 4**: Downloaded and installed
- **Python**: 3.10+ with virtual environment
- **Teleops Backend**: Cloned and ready

---

## 🚀 Step 1: PostgreSQL Installation & Configuration

### Windows Installation

1. **Download PostgreSQL**: Visit https://www.postgresql.org/download/windows/
2. **Run Installer**: Use the PostgreSQL installer
3. **Set Password**: Remember the `postgres` user password
4. **Default Port**: 5432 (keep default)
5. **Install pgAdmin**: Include pgAdmin 4 during installation

### macOS Installation

```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Install pgAdmin 4 separately
brew install --cask pgadmin4
```

### Linux Installation (Ubuntu/Debian)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Install pgAdmin 4
sudo apt install pgadmin4 pgadmin4-apache2

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## 🛠️ Step 2: Database Creation

### Method 1: Using pgAdmin 4 (Recommended)

1. **Open pgAdmin 4**
2. **Connect to Server**:

   - Right-click on "Servers" → "Register" → "Server"
   - **General Tab**:
     - Name: `Teleops Local`
   - **Connection Tab**:
     - Host: `localhost`
     - Port: `5432`
     - Database: `postgres`
     - Username: `postgres`
     - Password: `[your-postgres-password]`

3. **Create Database**:

   - Expand your server → "Databases"
   - Right-click → "Create" → "Database"
   - **Database**: `teleops`
   - **Owner**: `postgres`
   - Click "Save"

4. **Create User** (Optional but recommended):
   - Expand your server → "Login/Group Roles"
   - Right-click → "Create" → "Login/Group Role"
   - **General Tab**:
     - Name: `teleops_user`
   - **Definition Tab**:
     - Password: `teleops123`
   - **Privileges Tab**:
     - Can login: ✅
     - Create databases: ✅
   - Click "Save"

### Method 2: Using Command Line

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres -h localhost

# Create database
CREATE DATABASE teleops;

# Create user (optional)
CREATE USER teleops_user WITH PASSWORD 'teleops123';
GRANT ALL PRIVILEGES ON DATABASE teleops TO teleops_user;
GRANT CREATE ON DATABASE teleops TO teleops_user;

# Exit psql
\q
```

---

## ⚙️ Step 3: Environment Configuration

### Create Environment File

```bash
# Navigate to teleops_backend directory
cd teleops_backend

# Copy environment template
copy env.template .env

# Edit .env file with your database settings
```

### Environment Variables for Database

```bash
# Database Configuration
DB_NAME=teleops
DB_USER=postgres          # or teleops_user if you created one
DB_PASSWORD=your_password # your postgres password
DB_HOST=localhost
DB_PORT=5432
```

### Example .env Configuration

```bash
# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1

# Database Configuration
DB_NAME=teleops
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
DB_HOST=localhost
DB_PORT=5432

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Azure Blob Storage Configuration
AZURE_ACCOUNT_NAME=your-storage-account
AZURE_ACCOUNT_KEY=your-storage-key
AZURE_CONTAINER_NAME=teleops-files

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@teleops.com

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# GPS Configuration
GPS_ACCURACY_THRESHOLD=10.0

# Development Configuration
DJANGO_SETTINGS_MODULE=config.settings.development
```

---

## 🔧 Step 4: Backend Setup

### Install Dependencies

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements/development.txt
```

### Database Migration

```bash
# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load initial data (if available)
python manage.py loaddata fixtures/initial_data.json
```

### Test Database Connection

```bash
# Test the connection
python manage.py dbshell

# You should see PostgreSQL prompt
# Type \q to exit
```

---

## 🧪 Step 5: Verification

### Test Database Connection

```bash
# Run Django shell
python manage.py shell

# Test database connection
from django.db import connection
cursor = connection.cursor()
cursor.execute("SELECT version();")
print(cursor.fetchone())
```

### Check Database in pgAdmin 4

1. **Refresh pgAdmin 4**
2. **Expand**: `Teleops Local` → `Databases` → `teleops_dev`
3. **Check Tables**: You should see Django tables like:
   - `django_migrations`
   - `users_user`
   - `django_content_type`
   - etc.

### Health Check

```bash
# Start Django server
python manage.py runserver

# Test health endpoint
curl http://localhost:8000/health/
# Should return: {"status": "healthy", ...}
```

---

## 🚀 Step 6: Development Workflow

### Start Development Server

```bash
# Start Django development server
python manage.py runserver

# Access:
# - Backend API: http://localhost:8000/
# - Admin Panel: http://localhost:8000/admin/
# - API Docs: http://localhost:8000/swagger/
# - Health Check: http://localhost:8000/health/
```

### Database Management with pgAdmin 4

1. **View Tables**: Navigate to `teleops_dev` → `Schemas` → `public` → `Tables`
2. **Execute Queries**: Use the Query Tool (SQL icon)
3. **Monitor Performance**: Check server statistics
4. **Backup/Restore**: Use pgAdmin's backup tools

### Useful pgAdmin 4 Features

- **Query Tool**: Execute SQL queries
- **Table Viewer**: Browse and edit data
- **Backup/Restore**: Database backup functionality
- **Server Statistics**: Monitor database performance
- **User Management**: Manage database users and permissions

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Connection Refused

```bash
# Check if PostgreSQL is running
# Windows: Check Services
# macOS: brew services list
# Linux: sudo systemctl status postgresql
```

#### 2. Authentication Failed

```bash
# Check password in .env file
# Verify user exists in PostgreSQL
# Test connection with psql
psql -U postgres -h localhost -d teleops_dev
```

#### 3. Database Does Not Exist

```bash
# Create database manually
psql -U postgres -h localhost
CREATE DATABASE teleops_dev;
\q
```

#### 4. Permission Denied

```bash
# Grant permissions to user
psql -U postgres -h localhost
GRANT ALL PRIVILEGES ON DATABASE teleops_dev TO your_user;
\q
```

### Reset Database (if needed)

```bash
# Drop and recreate database
psql -U postgres -h localhost
DROP DATABASE IF EXISTS teleops_dev;
CREATE DATABASE teleops_dev;
\q

# Re-run migrations
python manage.py migrate
```

---

## 📊 Database Schema Overview

Once migrations are complete, you'll have these core tables:

### Multi-Tenant Tables

- `tenants_tenant` - Tenant hierarchy (Corporate, Circle, Vendor)
- `tenants_corporatecirclerelationship` - Corporate-Circle associations
- `tenants_circlevendorrelationship` - Circle-Vendor associations

### Business Tables

- `projects_project` - Project management
- `sites_site` - Site operations with GPS coordinates
- `equipment_equipmentcategory` - Equipment categories
- `equipment_equipmentmodel` - Equipment models
- `tasks_task` - VLT-style task workflow

### User Management

- `users_user` - Extended Django user model
- `users_userprofile` - Tenant-specific user profiles
- `users_designation` - Role-based designations

---

## ✅ Success Checklist

- [ ] PostgreSQL installed and running
- [ ] pgAdmin 4 connected to local PostgreSQL
- [ ] `teleops` database created
- [ ] Environment variables configured in `.env`
- [ ] Dependencies installed (`pip install -r requirements/development.txt`)
- [ ] Database migrations completed (`python manage.py migrate`)
- [ ] Superuser created (`python manage.py createsuperuser`)
- [ ] Health check passing (`http://localhost:8000/health/`)
- [ ] Database visible in pgAdmin 4

---

## 🎯 Next Steps

After successful database setup:

1. **Create Django Apps**: Build tenant, project, site models
2. **Implement APIs**: Create REST endpoints for each module
3. **Frontend Integration**: Connect React frontend to backend
4. **Testing**: Write and run tests
5. **Deployment**: Prepare for production deployment

---

**Need Help?** Check the troubleshooting section or create an issue in the project repository.

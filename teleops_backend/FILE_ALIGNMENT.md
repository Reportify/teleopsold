# File Alignment Guide - Teleops Backend

## Overview

This document explains the alignment of configuration files and which ones to use in different scenarios.

## Environment Configuration Files

### Primary Template

- **`env.template`** - The single source of truth for environment variables
  - Contains all possible configuration options
  - Well-organized with clear sections
  - Used by all setup scripts

### Legacy Files (Removed)

- ~~`env.example`~~ - Removed (redundant with `env.template`)
- ~~`env.custom`~~ - Removed (specific config no longer needed)

### Usage

```bash
# For new setup (Windows)
copy env.template .env
# Edit .env with your actual values

# For new setup (macOS/Linux)
cp env.template .env
# Edit .env with your actual values

# For your specific config
copy env.template .env
# Edit with your PostgreSQL password: DB_PASSWORD=123456
```

## Database Configuration Alignment

### Standardized Configuration

All files now use consistent database settings:

```bash
DB_NAME=teleops          # Database name
DB_USER=postgres         # Database user
DB_HOST=localhost        # Database host
DB_PORT=5432            # Database port
```

### Your Local Configuration

```bash
DB_PASSWORD=123456       # Your PostgreSQL password
```

## File Alignment Summary

| File                 | Purpose          | Database Name | Database User | Status         |
| -------------------- | ---------------- | ------------- | ------------- | -------------- |
| `env.template`       | Primary template | `teleops`     | `postgres`    | ✅ Primary     |
| `DATABASE_SETUP.md`  | Setup guide      | `teleops`     | `postgres`    | ✅ Aligned     |
| `docker-compose.yml` | Docker config    | `teleops`     | `teleops`     | ✅ Docker user |
| `setup_project.py`   | Setup script     | `teleops`     | `postgres`    | ✅ Aligned     |
| `setup_database.py`  | DB setup script  | `teleops`     | `postgres`    | ✅ Aligned     |

## Setup Scripts Alignment

### Primary Setup Scripts

- **`setup_project.py`** - General setup using `env.template`
- **`setup_database.py`** - Database verification and setup

### Removed Scripts

- ~~`setup_with_config.py`~~ - Removed (redundant with `setup_project.py`)
- ~~`verify_postgresql17.py`~~ - Removed (one-time verification script)

## Docker Configuration

### Local Development

```bash
# Uses your local PostgreSQL
DB_NAME=teleops
DB_USER=postgres
DB_PASSWORD=123456
```

### Docker Development

```bash
# Uses Docker PostgreSQL
DB_NAME=teleops
DB_USER=teleops
DB_PASSWORD=teleops123
```

## Migration Guide

### From Old Configuration

If you have an existing `.env` file with `teleops_dev`:

1. **Update database name:**

   ```bash
   # Change from
   DB_NAME=teleops_dev
   # To
   DB_NAME=teleops
   ```

2. **Update user (if needed):**

   ```bash
   # Change from
   DB_USER=teleops
   # To
   DB_USER=postgres
   ```

3. **Update password:**
   ```bash
   # Change to your actual password
   DB_PASSWORD=123456
   ```

## Best Practices

### For Development

1. Use `env.template` as the base
2. Copy to `.env` and update with your values
3. Never commit `.env` to version control

### For Production

1. Use `env.template` as reference
2. Set all passwords and secret keys
3. Use dedicated database user
4. Enable SSL and security settings

### For Docker

1. Use `docker-compose.yml` environment variables
2. Override with `.env` file if needed
3. Use Docker secrets for sensitive data

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check database exists: `psql -U postgres -l`
3. Create database: `CREATE DATABASE teleops;`
4. Verify credentials in `.env`

### Setup Script Issues

1. Ensure `env.template` exists
2. Check file permissions
3. Verify Python environment

## Next Steps

1. **Files cleaned up** ✅

2. **Test setup** with aligned configuration

3. **Deploy** using consistent configuration

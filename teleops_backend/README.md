# Teleops Backend - Circle-Based Multi-Tenant Platform

## 🚀 Internal Portal (Teleops Staff)

The backend now supports a dedicated Teleops Internal Portal for platform administrators:

- **Internal user profile and logic**: Located in `teleops_internal/users/` (replaces the old `internal_users/`)
- **Internal-only API endpoints**: Located in `teleops_internal/api/` (replaces the old `internal_api/`)
- **All internal portal APIs** are namespaced under `/internal/`
- **Role-based access**: Only internal users can access these endpoints (see AUTH_USER_MODEL)
- **Separation from tenant APIs**: Internal portal APIs are not accessible to tenant users

### Internal Portal API Quick Start

- Create internal users via management command or Django admin
- Authenticate via `/internal/auth/login/` to receive JWT tokens
- Access internal portal endpoints with the JWT access token in the Authorization header

## 🏗️ Project Architecture Overview

Teleops Backend is a **Django-based multi-tenant platform** designed for telecom infrastructure management with a sophisticated **Corporate → Circle → Vendor hierarchy**. The platform supports VLT-style equipment verification, GPS photo tagging, and comprehensive field operations.

## 📁 Project Structure

```
teleops_backend/
├── apps/
│   ├── tenants/                   # Multi-tenant management, TenantUserProfile
│   ├── projects/                  # Project management
│   ├── sites/                     # Site operations
│   ├── equipment/                 # Equipment inventory
│   ├── tasks/                     # Task management & field operations
│   ├── teams/                     # Team management
│   ├── users/                     # Main User model (all users: internal + tenant), authentication
│   ├── billing/                   # Subscription & billing
│   ├── analytics/                 # Cross-tenant analytics
│   ├── notifications/             # Real-time notifications
│   ├── integrations/              # Third-party integrations
├── teleops_internal/              # All internal portal logic (replaces internal_users/ and internal_api/)
│   ├── users/                     # Internal user profile, admin, management, migrations
│   ├── api/                       # Internal-only API endpoints, migrations
├── core/                          # Core utilities & middleware
│   ├── authentication/            # JWT & tenant scoping
│   ├── permissions/               # RBAC & tenant permissions
│   ├── middleware/                # Custom middleware
│   ├── views/                     # Core views (health, error handlers)
│   ├── pagination.py              # Custom pagination
│   └── urls.py                    # Core URL routing
├── api/
│   └── v1/                        # API version 1 (tenant/circle/vendor APIs)
├── config/                        # Configuration files
│   ├── settings/                  # Environment-specific settings
│   ├── urls.py                    # URL routing
│   ├── wsgi.py                    # WSGI configuration
│   └── asgi.py                    # ASGI configuration
├── requirements/                  # Python dependencies
├── logs/                          # Application logs
├── venv/                          # Virtual environment
├── manage.py                      # Django management
├── Dockerfile                     # Container configuration
├── docker-compose.yml             # Local development with PostgreSQL 17 & Redis 7
├── env.template                   # Environment variables template
├── setup_database.py              # Database setup script
├── setup_project.py               # Project initialization script
├── reset_db.py                    # Database reset utility
├── DATABASE_SETUP.md              # Detailed database setup guide
├── TENANT_HIERARCHY_SUMMARY.md    # Tenant architecture documentation
└── FILE_ALIGNMENT.md              # File structure alignment guide
```

## 🏛️ Architecture Principles

### 1. Multi-Tenant Design

- **Tenant Isolation**: Complete data separation between tenants
- **Circle Hierarchy**: Corporate → Circle → Vendor relationships
- **Row-Level Security**: Database-level tenant scoping
- **Tenant Context**: Request-level tenant awareness

### 2. Scalability

- **Microservices Ready**: Modular app structure for future scaling
- **Database Optimization**: Efficient queries with proper indexing
- **Caching Strategy**: Redis-based caching for performance
- **Async Processing**: Celery for background tasks

### 3. Security

- **JWT Authentication**: Secure token-based authentication
- **RBAC**: Role-based access control with tenant scoping
- **Data Encryption**: Sensitive data encryption at rest
- **Audit Logging**: Comprehensive activity tracking

### 4. API-First Design

- **RESTful APIs**: Standard REST endpoints
- **Versioning**: API version management
- **Documentation**: Auto-generated API docs
- **Rate Limiting**: API usage controls

## 🔑 User Management Overview

- **Main User model**: Located in `apps/users/` and used for all users (internal and tenant)
- **Tenant user profile**: Located in `apps/tenants/` as `TenantUserProfile`
- **Internal user profile**: Located in `teleops_internal/users/` as `InternalProfile`
- **Internal-only APIs**: Located in `teleops_internal/api/`

## 🔄 Migration Note

- The old `internal_users/` and `internal_api/` directories have been removed.
- All internal logic is now consolidated under `teleops_internal/` for clarity, security, and maintainability.

## 📚 For More Information

- See `DATABASE_SETUP.md` for database setup
- See `TENANT_HIERARCHY_SUMMARY.md` for tenant architecture
- See `AUTHENTICATION_INTEGRATION.md` for authentication details

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Architecture**: Circle-Based Multi-Tenant Platform  
**Database**: PostgreSQL 17  
**Cache**: Redis 7  
**Container**: Docker with docker-compose

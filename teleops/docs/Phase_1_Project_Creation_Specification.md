# Phase 1: Project Creation Specification

## Overview

Phase 1 implements the foundational project creation system with VLT-style fields, client/customer management, and basic project workflow. This phase establishes the core project structure that will support the subsequent design, inventory, and task management phases.

---

## Business Context

### Core Features

```yaml
Phase 1 Features:
  Project Management:
    - VLT-style project creation with business context
    - Multi-tenant project isolation and security
    - Project type classification (Dismantle vs Other)
    - Project status workflow management
    - Geographic scope with telecom circle selection

  Client/Customer Management:
    - Clients are managed via existing Tenant-based client APIs
    - Customer is a string captured on the project and is defined by the project owner at creation
    - UI provides a dropdown with suggestions from the owner's client list and allows custom customer names
    - Soft delete with audit trail
    - Search and filtering capabilities
    - Duplicate prevention and validation
    - Custom customer addition during project creation (free text)

  Business Context Integration:
    - Client = Who hired the tenant (immediate contractor)
    - Customer = Who owns the infrastructure (project owner)
    - Project ownership determined by client/customer selection
    - Multi-level vendor chain support
    - Context inheritance for contracted vendors

  Data Validation & Security:
    - Comprehensive input validation
    - Business rule enforcement
    - Multi-tenant data isolation
    - Permission-based access control
    - Audit trail for all operations
    - Soft delete with recovery options
```

### Project Creation Workflow

```yaml
Detailed Project Creation Flow:
  Step 1: Project Type Selection
    - Choose between "Dismantle" and "Other" project types
    - Dismantle projects trigger automatic design phase
    - Other projects follow standard workflow
    - Project type determines subsequent workflow branches

  Step 2: Business Context Setup
    - Project name and description
    - Ownership toggle: "This project is owned by my organization"
      - If ON: client auto-set to current tenant; client selection is hidden
      - If OFF: select client from tenant's client list
    - Customer selection by the project owner
      - Customer toggle: "Customer is my organization (infrastructure owner)"
        - If ON: customer auto-set to current tenant organization; input is disabled
        - If OFF: choose from suggested list or enter custom name
      - Dropdown suggests names from the owner's client list
      - Owner can type a custom customer name (stored as plain string)
    - Option to add custom client/customer if not in list
    - Telecom circle selection (geographic scope)
    - Activity description (detailed work scope)
    - Project ownership determined by client/customer selection

  Step 3: Project Details Configuration
    - Scope details
    - Basic project information
    - Optional start_date and end_date
    - Dates can be set later via update (not required at creation)

  Step 4: Validation & Creation
    - Business rule validation
    - Data completeness check
    - Permission validation
    - Cross-reference validation
    - Direct project creation without approval
    - Workflow initiation based on type
```

### Multi-Tenant Project Context

```yaml
Tenant Project Scenarios:
  Client Projects:
    - Clients create projects in their tenant
    - Access to client/customer dropdowns
    - Can associate sites from their master data
    - Project ownership determined by client/customer selection
    - Full CRUD permissions
    - Can invite vendors for project outsourcing

  Independent Vendor Projects:
    - Vendors create projects in their own tenant
    - Independent client/customer management
    - Use their own site master data
    - Project ownership determined by client/customer selection
    - Self-managed project lifecycle
    - Can subcontract to other vendors

  Contracted Vendor Projects:
    - Vendors work on client-assigned projects
    - Client/customer context inherited from assignment
    - Limited project modification permissions
    - Read-only access to project details (no sites/inventory access)
    - Sites and inventory access only with task allocation (future phase)
    - Context rules per invite chain (see below)
    - Task-level permissions only

  Vendor Chain Context:
    - Multi-level vendor relationships
    - Context inheritance down the chain
    - Client/Customer context preservation
    - Permission inheritance rules
    - Audit trail across levels
    - Context rule: Client = immediate inviter, Customer = original project owner

Context Rules (Authoritative):
  - Client: The tenant that invited the current vendor (immediate contractor in the chain)
  - Customer: The infrastructure owner (the tenant that owns the project)
  - The Customer value is preserved across the entire chain and does not change as work is subcontracted
  - The Client value changes at each hop to reflect the immediate inviter

Worked Example:
  - Vodafone creates project with ownership toggle ON
    - Owner (Customer) = Vodafone
    - Client for Vodafone = Vodafone (self-owned)
  - Vodafone invites Ericsson → Ericsson accepts
    - Ericsson sees: Client = Vodafone, Customer = Vodafone
  - Ericsson invites Verveland → Verveland accepts
    - Verveland sees: Client = Ericsson, Customer = Vodafone
  - Verveland invites Sia Communications → Sia accepts
    - Sia sees: Client = Verveland, Customer = Vodafone

API/Model Notes (Phase 1):
  - The `customer_name` captured at creation represents the project owner and remains constant down the chain
  - The `client_tenant` on the origin record reflects the creator's context; per-tenant client context for downstream vendors will be derived from the invitation/assignment chain in a later phase
  - Phase 1 only exposes read-only project details to invited vendors; sites/inventory remain hidden until tasks are allocated in future phases

  Project Outsourcing Workflow:
    - Client tenant invites vendor for project acceptance
    - Vendor tenant can view project details upon acceptance
    - Sites and inventory access restricted until task allocation
    - Task allocation enables full project access (future phase)
```

### Architecture Overview

```yaml
System Architecture:
  Frontend Layer:
    - React 18+ with TypeScript
    - Material-UI (MUI) v5 components
    - FeatureGate permission components
    - Custom hooks for state management
    - Responsive design for all devices
    - Real-time validation and feedback

  API Layer:
    - Django REST Framework
    - JWT authentication
    - Multi-tenant middleware
    - Permission-based access control
    - Comprehensive error handling
    - Rate limiting and security

  Business Logic Layer:
    - Service-oriented architecture
    - Domain-driven design principles
    - Comprehensive validation rules
    - Business workflow management
    - Audit trail generation
    - Event-driven architecture

  Data Layer:
    - PostgreSQL database
    - Multi-tenant data isolation
    - Soft delete with audit trails
    - Optimized indexes for performance
    - Referential integrity constraints
    - Data migration support

  Security Layer:
    - Role-based access control (RBAC)
    - Multi-tenant isolation
    - Input validation and sanitization
    - SQL injection prevention
    - XSS protection
    - CSRF protection
```

---

## Database Schema

### 1. Enhanced Project Model

```sql
-- Enhanced projects table with VLT-specific fields
CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,

    -- Core relationships
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES auth_user(id),

    -- VLT-specific fields
    project_name VARCHAR(255) NOT NULL,
    project_type VARCHAR(20) NOT NULL DEFAULT 'other',
    client_id INTEGER NOT NULL REFERENCES clients(id),
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    circle VARCHAR(100) NOT NULL, -- Indian telecom circles
    activity TEXT NOT NULL,

    -- Project details
    description TEXT,
    status VARCHAR(20) DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    -- location removed (circle captures geographic scope)
    scope TEXT,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(tenant_id, project_name),
    CHECK (project_type IN ('dismantle', 'other')),
    CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date)
);

-- Indexes for performance
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_type ON projects(project_type);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_circle ON projects(circle);
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);
```

### 2. Client & Customer Models

```sql
-- Client model for tenant's client relationships
CREATE TABLE clients (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Client details
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address TEXT,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(tenant_id, name),
    CHECK (deleted_at IS NULL OR deleted_at > created_at)
);

-- Customer model for tenant's customer relationships
CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Customer details
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address TEXT,

    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(tenant_id, name),
    CHECK (deleted_at IS NULL OR deleted_at > created_at)
);

-- Indexes
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at);
```

---

## API Endpoints

### 1. Project Management APIs

```yaml
# Core project CRUD
GET    /api/v1/projects/                      # List projects with filtering
POST   /api/v1/projects/                      # Create new project
GET    /api/v1/projects/{id}/                 # Get project details
PUT    /api/v1/projects/{id}/                 # Update project
DELETE /api/v1/projects/{id}/                 # Delete project (soft delete)

# Project filtering and search
GET    /api/v1/projects/search/               # Search projects
GET    /api/v1/projects/stats/                # Project statistics
GET    /api/v1/projects/export/               # Export projects to Excel



# Project workflow
POST   /api/v1/projects/{id}/activate/        # Activate project
POST   /api/v1/projects/{id}/hold/            # Put project on hold
POST   /api/v1/projects/{id}/complete/        # Complete project
POST   /api/v1/projects/{id}/cancel/          # Cancel project
```

### 2. Detailed API Specifications

#### 2.1 Project CRUD Operations

**GET /api/v1/projects/**

```yaml
Description: List projects with filtering and pagination
Authentication: Required (JWT)
Permissions: project.read

Query Parameters:
  - project_type: string (dismantle|other)
  - status: string (planning|active|on_hold|completed|cancelled)
  - circle: string (telecom circle)
  - search: string (search term)
  - page: integer (default: 1)
  - page_size: integer (default: 20, max: 100)
  - ordering: string (created_at|-created_at|project_name|-project_name)

Request Headers:
  Authorization: Bearer <jwt_token>
  X-Tenant-ID: <tenant_id>
  Content-Type: application/json

Response (200 OK):
{
  "count": 150,
  "next": "http://api.example.com/api/v1/projects/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "project_name": "I&C L900 Dismantling",
      "project_type": "dismantle",
      "client": {
        "id": 1,
        "name": "Vodafone Idea Limited",
        "contact_person": "John Doe",
        "contact_email": "john@vodafone.com"
      },
      "customer": {
        "id": 1,
        "name": "Vodafone Idea Limited",
        "contact_person": "John Doe",
        "contact_email": "john@vodafone.com"
      },
      "circle": "maharashtra",
      "activity": "Dismantling of 2G equipment from 50 sites",
      "description": "Complete dismantling of L900 equipment",
      "status": "planning",
      "location": "Mumbai, Maharashtra",
      "scope": "50 sites across Maharashtra circle",
      "created_at": "2024-01-10T10:30:00Z",
      "updated_at": "2024-01-10T10:30:00Z"
    }
  ]
}

Error Responses:
  401 Unauthorized: Invalid or missing JWT token
  403 Forbidden: Insufficient permissions
  400 Bad Request: Invalid query parameters
```

**POST /api/v1/projects/**

```yaml
Description: Create new project (supports ownership toggles for project and infrastructure)
Authentication: Required (JWT)
Permissions: project.create

Request Headers:
  Authorization: Bearer <jwt_token>
  X-Tenant-ID: <tenant_id>
  Content-Type: application/json

Request Payload (start_date and end_date are optional; can be omitted at creation and added later):
{
  "project_name": "I&C L900 Dismantling",
  "project_type": "dismantle",
  "is_tenant_owner": true, # when true, backend uses current tenant as client
  # If is_tenant_owner is false or omitted, provide client_id instead
  # "client_id": 1,
  "customer_is_tenant_owner": false, # when true, backend sets customer_name to current tenant organization
  "customer_name": "Airtel", # REQUIRED unless customer_is_tenant_owner=true
  "circle": "maharashtra",
  "activity": "Dismantling of 2G equipment from 50 sites",
  "description": "Complete dismantling of L900 equipment",
  # Optional
  "start_date": "2024-01-15",
  "end_date": "2024-06-30",
  "scope": "50 sites across Maharashtra circle"
}

Response (201 Created):
{
  "id": 1,
  "project_name": "I&C L900 Dismantling",
  "project_type": "dismantle",
  "client": {
    "id": 1,
    "name": "Vodafone Idea Limited",
    "contact_person": "John Doe",
    "contact_email": "john@vodafone.com"
  },
  "customer": {
    "id": 1,
    "name": "Vodafone Idea Limited",
    "contact_person": "John Doe",
    "contact_email": "john@vodafone.com"
  },
  "circle": "maharashtra",
  "activity": "Dismantling of 2G equipment from 50 sites",
  "description": "Complete dismantling of L900 equipment",
  "status": "planning",
  "start_date": "2024-01-15",
  "end_date": "2024-06-30",
  "scope": "50 sites across Maharashtra circle",
  "created_at": "2024-01-10T10:30:00Z",
  "updated_at": "2024-01-10T10:30:00Z"
}

Validation Rules (ownership):
  - Exactly one of these must be provided:
    - is_tenant_owner = true
    - client_id (valid tenant id)
  - If is_tenant_owner = true, the API will set client_tenant = current tenant and ignore client_id if sent
  - Exactly one of these must be true for customer context:
      - customer_is_tenant_owner = true
      - customer_name (non-empty)
    - If customer_is_tenant_owner = true, API sets customer_name = current tenant organization (and ignores provided customer_name if any)

Error Responses:
  400 Bad Request: Validation errors
  {
    "errors": {
      "project_name": ["Project name is required"],
      "project_type": ["Invalid project type"],
      "client": ["Either set is_tenant_owner=true or provide client_id"],
      "customer_name": ["Customer name is required"],
      "start_date": ["Start date cannot be after end date"],
      "end_date": ["End date cannot be before start date"]
    }
  }
  401 Unauthorized: Invalid or missing JWT token
  403 Forbidden: Insufficient permissions
  409 Conflict: Project name already exists
```

**GET /api/v1/projects/{id}/**

```yaml
Description: Get detailed project information
Authentication: Required (JWT)
Permissions: project.read

Request Headers:
  Authorization: Bearer <jwt_token>
  X-Tenant-ID: <tenant_id>

Response (200 OK):
{
  "id": 1,
  "project_name": "I&C L900 Dismantling",
  "project_type": "dismantle",
  "client": {
    "id": 1,
    "name": "Vodafone Idea Limited",
    "contact_person": "John Doe",
    "contact_email": "john@vodafone.com",
    "contact_phone": "+91-9876543210",
    "address": "Mumbai, Maharashtra"
  },
  "customer": {
    "id": 1,
    "name": "Vodafone Idea Limited",
    "contact_person": "John Doe",
    "contact_email": "john@vodafone.com",
    "contact_phone": "+91-9876543210",
    "address": "Mumbai, Maharashtra"
  },
  "circle": "maharashtra",
  "activity": "Dismantling of 2G equipment from 50 sites",
  "description": "Complete dismantling of L900 equipment",
  "status": "planning",
  "start_date": "2024-01-15",
  "end_date": "2024-06-30",
  "scope": "50 sites across Maharashtra circle",
  "created_at": "2024-01-10T10:30:00Z",
  "updated_at": "2024-01-10T10:30:00Z",
  "created_by": {
    "id": 3,
    "first_name": "Admin",
    "last_name": "User",
    "email": "admin@company.com"
  }
}

Error Responses:
  404 Not Found: Project not found
  401 Unauthorized: Invalid or missing JWT token
  403 Forbidden: Insufficient permissions
```

**PUT /api/v1/projects/{id}/**

```yaml
Description: Update project information
Authentication: Required (JWT)
Permissions: project.update

Request Headers:
  Authorization: Bearer <jwt_token>
  X-Tenant-ID: <tenant_id>
  Content-Type: application/json

Request Payload (Partial Update):
{
  "project_name": "Updated I&C L900 Dismantling",
  "description": "Updated project description",
  "end_date": "2024-07-15"
}

Response (200 OK):
{
  "id": 1,
  "project_name": "Updated I&C L900 Dismantling",
  "project_type": "dismantle",
  "client": {
    "id": 1,
    "name": "Vodafone Idea Limited"
  },
  "customer": {
    "id": 1,
    "name": "Vodafone Idea Limited"
  },
  "circle": "maharashtra",
  "activity": "Dismantling of 2G equipment from 50 sites",
  "description": "Updated project description",
  "status": "planning",
  "start_date": "2024-01-15",
  "end_date": "2024-07-15",
  "updated_at": "2024-01-10T11:30:00Z"
}

Error Responses:
  400 Bad Request: Validation errors
  404 Not Found: Project not found
  401 Unauthorized: Invalid or missing JWT token
  403 Forbidden: Insufficient permissions
  409 Conflict: Project name already exists
```

**DELETE /api/v1/projects/{id}/**

```yaml
Description: Soft delete project
Authentication: Required (JWT)
Permissions: project.delete

Request Headers:
  Authorization: Bearer <jwt_token>
  X-Tenant-ID: <tenant_id>

Response (204 No Content):
# Project is soft deleted, no content returned

Error Responses:
  404 Not Found: Project not found
  401 Unauthorized: Invalid or missing JWT token
  403 Forbidden: Insufficient permissions
  409 Conflict: Cannot delete active project
```

#### 2.2 Project Workflow Operations

**POST /api/v1/projects/{id}/activate/**

```yaml
Description: Activate project (change status to active)
Authentication: Required (JWT)
Permissions: project.update

Request Headers:
  Authorization: Bearer <jwt_token>
  X-Tenant-ID: <tenant_id>

Response (200 OK):
{
  "id": 1,
  "project_name": "I&C L900 Dismantling",
  "status": "active",
  "updated_at": "2024-01-10T12:30:00Z",
  "message": "Project activated successfully"
}

Error Responses:
  400 Bad Request: Cannot activate project from current status
  404 Not Found: Project not found
  401 Unauthorized: Invalid or missing JWT token
  403 Forbidden: Insufficient permissions
```

**POST /api/v1/projects/{id}/hold/**

```yaml
Description: Put project on hold
Authentication: Required (JWT)
Permissions: project.update

Request Headers:
  Authorization: Bearer <jwt_token>
  X-Tenant-ID: <tenant_id>

Response (200 OK):
{
  "id": 1,
  "project_name": "I&C L900 Dismantling",
  "status": "on_hold",
  "updated_at": "2024-01-10T12:30:00Z",
  "message": "Project put on hold"
}

Error Responses:
  400 Bad Request: Cannot put project on hold from current status
  404 Not Found: Project not found
  401 Unauthorized: Invalid or missing JWT token
  403 Forbidden: Insufficient permissions
```

#### 2.4 Project Statistics

**GET /api/v1/projects/stats/**

```yaml
Description: Get project statistics
Authentication: Required (JWT)
Permissions: project.read

Response (200 OK):
{
  "total_projects": 150,
  "active_projects": 45,
  "planning_projects": 30,
  "completed_projects": 60,
  "on_hold_projects": 10,
  "cancelled_projects": 5,
  "dismantle_projects": 80,
  "other_projects": 70,
  "projects_by_circle": {
    "maharashtra": 25,
    "delhi": 20,
    "karnataka": 15,
    "tamil_nadu": 12
  }
}
```

### 2. Client/Customer Management APIs

```yaml
# Client management
GET    /api/v1/clients/                       # List clients
POST   /api/v1/clients/                       # Create client
GET    /api/v1/clients/{id}/                  # Get client details
PUT    /api/v1/clients/{id}/                  # Update client
DELETE /api/v1/clients/{id}/                  # Delete client (soft delete)

# Customer management
GET    /api/v1/customers/                     # List customers
POST   /api/v1/customers/                     # Create customer
GET    /api/v1/customers/{id}/                # Get customer details
PUT    /api/v1/customers/{id}/                # Update customer
DELETE /api/v1/customers/{id}/                # Delete customer (soft delete)

# Client/Customer search
GET    /api/v1/clients/search/                # Search clients
GET    /api/v1/customers/search/              # Search customers
```

#### 2.5 Client Management API Specifications

**GET /api/v1/clients/**

```yaml
Description: List clients with filtering and pagination
Authentication: Required (JWT)
Permissions: client.read

Query Parameters:
  - search: string (search term)
  - page: integer (default: 1)
  - page_size: integer (default: 20, max: 100)
  - ordering: string (name|-name|created_at|-created_at)

Request Headers:
  Authorization: Bearer <jwt_token>
  X-Tenant-ID: <tenant_id>

Response (200 OK):
{
  "count": 25,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Vodafone Idea Limited",
      "contact_person": "John Doe",
      "contact_email": "john@vodafone.com",
      "contact_phone": "+91-9876543210",
      "address": "Mumbai, Maharashtra",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Airtel India",
      "contact_person": "Jane Smith",
      "contact_email": "jane@airtel.com",
      "contact_phone": "+91-9876543211",
      "address": "Delhi, NCR",
      "created_at": "2024-01-02T10:00:00Z",
      "updated_at": "2024-01-02T10:00:00Z"
    }
  ]
}
```

**POST /api/v1/clients/**

```yaml
Description: Create new client
Authentication: Required (JWT)
Permissions: client.create

Request Headers:
  Authorization: Bearer <jwt_token>
  X-Tenant-ID: <tenant_id>
  Content-Type: application/json

Request Payload:
{
  "name": "Reliance Jio",
  "contact_person": "Mike Johnson",
  "contact_email": "mike@jio.com",
  "contact_phone": "+91-9876543212",
  "address": "Mumbai, Maharashtra"
}

Response (201 Created):
{
  "id": 3,
  "name": "Reliance Jio",
  "contact_person": "Mike Johnson",
  "contact_email": "mike@jio.com",
  "contact_phone": "+91-9876543212",
  "address": "Mumbai, Maharashtra",
  "created_at": "2024-01-10T10:30:00Z",
  "updated_at": "2024-01-10T10:30:00Z"
}

Error Responses:
  400 Bad Request: Validation errors
  {
    "errors": {
      "name": ["Client name is required"],
      "contact_email": ["Invalid email format"]
    }
  }
  401 Unauthorized: Invalid or missing JWT token
  403 Forbidden: Insufficient permissions
  409 Conflict: Client name already exists
```

**GET /api/v1/clients/{id}/**

```yaml
Description: Get detailed client information
Authentication: Required (JWT)
Permissions: client.read

Response (200 OK):
{
  "id": 1,
  "name": "Vodafone Idea Limited",
  "contact_person": "John Doe",
  "contact_email": "john@vodafone.com",
  "contact_phone": "+91-9876543210",
  "address": "Mumbai, Maharashtra",
  "created_at": "2024-01-01T10:00:00Z",
  "updated_at": "2024-01-01T10:00:00Z",
  "projects_count": 15,
  "active_projects": 8
}
```

**PUT /api/v1/clients/{id}/**

```yaml
Description: Update client information
Authentication: Required (JWT)
Permissions: client.update

Request Payload (Partial Update):
{
  "contact_person": "John Updated",
  "contact_email": "john.updated@vodafone.com",
  "contact_phone": "+91-9876543219"
}

Response (200 OK):
{
  "id": 1,
  "name": "Vodafone Idea Limited",
  "contact_person": "John Updated",
  "contact_email": "john.updated@vodafone.com",
  "contact_phone": "+91-9876543219",
  "address": "Mumbai, Maharashtra",
  "updated_at": "2024-01-10T11:30:00Z"
}
```

**DELETE /api/v1/clients/{id}/**

```yaml
Description: Soft delete client
Authentication: Required (JWT)
Permissions: client.delete

Response (204 No Content):
# Client is soft deleted, no content returned

Error Responses:
  409 Conflict: Cannot delete client with active projects
```

#### 2.6 Customer Management API Specifications

**GET /api/v1/customers/**

```yaml
Description: List customers with filtering and pagination
Authentication: Required (JWT)
Permissions: customer.read

Response (200 OK):
{
  "count": 20,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Vodafone Idea Limited",
      "contact_person": "John Doe",
      "contact_email": "john@vodafone.com",
      "contact_phone": "+91-9876543210",
      "address": "Mumbai, Maharashtra",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

**POST /api/v1/customers/**

```yaml
Description: Create new customer
Authentication: Required (JWT)
Permissions: customer.create

Request Payload:
{
  "name": "BSNL",
  "contact_person": "Sarah Wilson",
  "contact_email": "sarah@bsnl.com",
  "contact_phone": "+91-9876543213",
  "address": "Delhi, NCR"
}

Response (201 Created):
{
  "id": 2,
  "name": "BSNL",
  "contact_person": "Sarah Wilson",
  "contact_email": "sarah@bsnl.com",
  "contact_phone": "+91-9876543213",
  "address": "Delhi, NCR",
  "created_at": "2024-01-10T10:30:00Z",
  "updated_at": "2024-01-10T10:30:00Z"
}
```

#### 2.7 Search APIs

**GET /api/v1/clients/search/**

```yaml
Description: Search clients by name, contact person, or email
Authentication: Required (JWT)
Permissions: client.read

Query Parameters:
  - q: string (search term)
  - page: integer (default: 1)
  - page_size: integer (default: 20)

Response (200 OK):
{
  "count": 3,
  "results": [
    {
      "id": 1,
      "name": "Vodafone Idea Limited",
      "contact_person": "John Doe",
      "contact_email": "john@vodafone.com"
    }
  ]
}
```

**GET /api/v1/customers/search/**

```yaml
Description: Search customers by name, contact person, or email
Authentication: Required (JWT)
Permissions: customer.read

Query Parameters:
  - q: string (search term)
  - page: integer (default: 1)
  - page_size: integer (default: 20)

Response (200 OK):
{
  "count": 2,
  "results": [
    {
      "id": 1,
      "name": "Vodafone Idea Limited",
      "contact_person": "John Doe",
      "contact_email": "john@vodafone.com"
    }
  ]
}
```

### 3. Telecom Circle APIs

```yaml
# Telecom circle management
GET    /api/v1/telecom-circles/               # List all telecom circles
GET    /api/v1/telecom-circles/{id}/          # Get circle details
```

---

## Data Flow & Workflow

### 1. Project Creation Workflow

```yaml
Detailed Project Creation Process:
  Step 1: User Authentication & Authorization
    - JWT token validation
    - Tenant context extraction
    - Permission verification (project.create)
    - User profile retrieval

  Step 2: Form Data Collection
    - Project basic information
    - Client/Customer selection (with custom add option)
    - Telecom circle selection
    - Project type determination
    - Optional start_date and end_date

  Step 3: Data Validation
    - Required field validation
    - Business rule validation
    - Cross-reference validation
    - Permission validation
    - Data format validation

  Step 4: Business Logic Processing
    - Client/Customer context determination
    - Project status initialization
    - Audit trail creation

  Step 5: Database Operations
    - Project record creation
    - Audit log entries
    - Transaction commit

  Step 6: Response Generation
    - Success response with project details
    - Error handling and rollback
    - Notification triggers
    - Workflow initiation
```

### 2. Multi-Tenant Data Flow

```yaml
Tenant Data Isolation Flow:
  Request Processing:
    - JWT token contains tenant_id
    - X-Tenant-ID header validation
    - Tenant context middleware
    - Permission verification per tenant

  Data Access Patterns:
    - All queries filtered by tenant_id
    - Cross-tenant data access prevention
    - Tenant-specific client/customer lists
    - Isolated project databases

  Security Enforcement:
    - Tenant boundary validation
    - Permission-based access control
    - Data leakage prevention
    - Audit trail per tenant

  Business Context Inheritance:
    - Client/Customer context per tenant
    - Project ownership determination
    - Vendor chain context preservation
    - Permission inheritance rules
```

### 3. Client/Customer Management Flow

```yaml
Client/Customer Creation Process:
  Step 1: Data Validation
    - Name uniqueness per tenant
    - Email format validation
    - Phone number validation
    - Required field validation

  Step 2: Business Logic
    - Duplicate prevention
    - Contact information validation
    - Address formatting
    - Audit trail creation

  Step 3: Database Operations
    - Client/Customer record creation
    - Soft delete support
    - Index optimization
    - Transaction management

  Step 4: Integration Points
    - Project creation integration
    - Search functionality
    - Export capabilities
    - Reporting integration
```

### 4. Project Status Workflow

```yaml
Project Status Transitions:
  planning → active:
    - Validation: Basic info and business context are valid
    - Validation: Dates (if provided) pass validation
    - Action: Update status to active

  active → on_hold:
    - Validation: Project is currently active
    - Action: Update status to on_hold
    - Log: Reason for hold

  active → completed:
    - Validation: All required Phase 1 criteria are met
    - Action: Update status to completed

  active → cancelled:
    - Validation: Cancellation reason provided
    - Action: Update status to cancelled
    - Log: Cancellation details

  on_hold → active:
    - Validation: Hold issues resolved
    - Action: Update status to active
    - Trigger: Resume project activities
    - Log: Resolution details
```

## Business Logic Implementation

### 1. Project Service

```python
class ProjectService:
    """Core business logic for project management"""

    def create_project(self, tenant, project_data, created_by):
        """Create project with proper validation and context"""
        try:
            # Validate project data
            self.validate_project_data(project_data)

            # Determine client and customer context
            client, customer = self.get_client_customer_context(tenant, project_data)

            # Create project
            project = Project.objects.create(
                tenant=tenant,
                client=client,
                customer=customer,
                created_by=created_by,
                **project_data
            )



            # Log project creation
            self.log_project_activity(project, 'created', created_by)

            return project

        except ValidationError as e:
            raise e
        except Exception as e:
            raise ValidationError(f"Failed to create project: {str(e)}")

    def validate_project_data(self, project_data):
        """Validate project creation data"""
        errors = []

        # Required fields validation
        required_fields = ['project_name', 'project_type', 'client_id', 'customer_id', 'circle', 'activity']
        for field in required_fields:
            if not project_data.get(field):
                errors.append(f"{field} is required")

        # Project type validation
        if project_data.get('project_type') not in ['dismantle', 'other']:
            errors.append("Invalid project type")

        # Date validation
        start_date = project_data.get('start_date')
        end_date = project_data.get('end_date')
        if start_date and end_date and start_date > end_date:
            errors.append("Start date cannot be after end date")

        if errors:
            raise ValidationError(errors)

    def get_client_customer_context(self, tenant, project_data):
        """Resolve client and customer from provided ids (with optional custom create handled elsewhere)"""
        client = Client.objects.get(
            id=project_data['client_id'],
            tenant=tenant,
            deleted_at__isnull=True
        )
        customer = Customer.objects.get(
            id=project_data['customer_id'],
            tenant=tenant,
            deleted_at__isnull=True
        )

        return client, customer



    def get_projects_for_tenant(self, tenant, filters=None):
        """Get projects for tenant with filtering"""
        queryset = Project.objects.filter(
            tenant=tenant,
            deleted_at__isnull=True
        )

        # Apply filters
        if filters:
            if filters.get('project_type'):
                queryset = queryset.filter(project_type=filters['project_type'])

            if filters.get('status'):
                queryset = queryset.filter(status=filters['status'])

            if filters.get('circle'):
                queryset = queryset.filter(circle=filters['circle'])

            if filters.get('search'):
                search_term = filters['search']
                queryset = queryset.filter(
                    Q(project_name__icontains=search_term) |
                    Q(activity__icontains=search_term) |
                    Q(client__name__icontains=search_term) |
                    Q(customer__name__icontains=search_term)
                )

        return queryset.select_related('client', 'customer')

    def update_project_status(self, project, new_status, updated_by):
        """Update project status with validation"""
        valid_transitions = {
            'planning': ['active', 'cancelled'],
            'active': ['on_hold', 'completed', 'cancelled'],
            'on_hold': ['active', 'cancelled'],
            'completed': [],  # No further transitions
            'cancelled': []   # No further transitions
        }

        current_status = project.status
        if new_status not in valid_transitions.get(current_status, []):
            raise ValidationError(f"Cannot transition from {current_status} to {new_status}")

        project.status = new_status
        project.save()

        # Log status change
        self.log_project_activity(project, f'status_changed_to_{new_status}', updated_by)

        return project
```

### 2. Client/Customer Service

```python
class ClientCustomerService:
    """Business logic for client and customer management"""

    def create_client(self, tenant, client_data, created_by):
        """Create new client for tenant"""
        try:
            # Validate client data
            self.validate_client_data(client_data)

            # Check for duplicate client name
            if Client.objects.filter(
                tenant=tenant,
                name=client_data['name'],
                deleted_at__isnull=True
            ).exists():
                raise ValidationError("Client with this name already exists")

            # Create client
            client = Client.objects.create(
                tenant=tenant,
                **client_data
            )

            return client

        except ValidationError as e:
            raise e
        except Exception as e:
            raise ValidationError(f"Failed to create client: {str(e)}")

    def create_customer(self, tenant, customer_data, created_by):
        """Create new customer for tenant"""
        try:
            # Validate customer data
            self.validate_customer_data(customer_data)

            # Check for duplicate customer name
            if Customer.objects.filter(
                tenant=tenant,
                name=customer_data['name'],
                deleted_at__isnull=True
            ).exists():
                raise ValidationError("Customer with this name already exists")

            # Create customer
            customer = Customer.objects.create(
                tenant=tenant,
                **customer_data
            )

            return customer

        except ValidationError as e:
            raise e
        except Exception as e:
            raise ValidationError(f"Failed to create customer: {str(e)}")

    def validate_client_data(self, client_data):
        """Validate client creation data"""
        errors = []

        if not client_data.get('name'):
            errors.append("Client name is required")

        if client_data.get('contact_email') and not self.is_valid_email(client_data['contact_email']):
            errors.append("Invalid email format")

        if errors:
            raise ValidationError(errors)

    def validate_customer_data(self, customer_data):
        """Validate customer creation data"""
        errors = []

        if not customer_data.get('name'):
            errors.append("Customer name is required")

        if customer_data.get('contact_email') and not self.is_valid_email(customer_data['contact_email']):
            errors.append("Invalid email format")

        if errors:
            raise ValidationError(errors)

    def get_clients_for_tenant(self, tenant, search_term=None):
        """Get clients for tenant with optional search"""
        queryset = Client.objects.filter(
            tenant=tenant,
            deleted_at__isnull=True
        )

        if search_term:
            queryset = queryset.filter(
                Q(name__icontains=search_term) |
                Q(contact_person__icontains=search_term) |
                Q(contact_email__icontains=search_term)
            )

        return queryset

    def get_customers_for_tenant(self, tenant, search_term=None):
        """Get customers for tenant with optional search"""
        queryset = Customer.objects.filter(
            tenant=tenant,
            deleted_at__isnull=True
        )

        if search_term:
            queryset = queryset.filter(
                Q(name__icontains=search_term) |
                Q(contact_person__icontains=search_term) |
                Q(contact_email__icontains=search_term)
            )

        return queryset
```

---

## Frontend Implementation

### 1. TypeScript Interfaces

```typescript
// Project Types
interface Project {
  id: number;
  project_name: string;
  project_type: "dismantle" | "other";
  client: Client;
  customer: Customer;
  circle: string;
  activity: string;
  description?: string;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  start_date?: string;
  end_date?: string;
  scope?: string;
  created_at: string;
  updated_at: string;
}

interface CreateProjectRequest {
  project_name: string;
  project_type: "dismantle" | "other";
  client_id: number;
  customer_id: number;
  circle: string;
  activity: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  scope?: string;
}

// Client/Customer Types
interface Client {
  id: number;
  name: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: number;
  name: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

// Project Filters
interface ProjectFilters {
  project_type?: "dismantle" | "other";
  status?: string;
  circle?: string;
  search?: string;
  page?: number;
  page_size?: number;
}
```

### 2. API Services

```typescript
// Project API Service
export const projectAPI = {
  // Core CRUD
  getProjects: (filters?: ProjectFilters) => api.get("/projects/", { params: filters }),

  createProject: (data: CreateProjectRequest) => api.post("/projects/", data),

  getProject: (id: number) => api.get(`/projects/${id}/`),

  updateProject: (id: number, data: Partial<CreateProjectRequest>) => api.put(`/projects/${id}/`, data),

  deleteProject: (id: number) => api.delete(`/projects/${id}/`),

  // Project workflow
  activateProject: (id: number) => api.post(`/projects/${id}/activate/`),

  holdProject: (id: number) => api.post(`/projects/${id}/hold/`),

  completeProject: (id: number) => api.post(`/projects/${id}/complete/`),

  cancelProject: (id: number) => api.post(`/projects/${id}/cancel/`),

  // Statistics
  getProjectStats: () => api.get("/projects/stats/"),

  // Export
  exportProjects: (filters?: ProjectFilters) => api.get("/projects/export/", { params: filters, responseType: "blob" }),
};

// Client/Customer API Service
export const clientAPI = {
  getClients: (search?: string) => api.get("/clients/", { params: { search } }),

  createClient: (data: Omit<Client, "id" | "created_at" | "updated_at">) => api.post("/clients/", data),

  getClient: (id: number) => api.get(`/clients/${id}/`),

  updateClient: (id: number, data: Partial<Client>) => api.put(`/clients/${id}/`, data),

  deleteClient: (id: number) => api.delete(`/clients/${id}/`),

  searchClients: (search: string) => api.get("/clients/search/", { params: { search } }),
};

export const customerAPI = {
  getCustomers: (search?: string) => api.get("/customers/", { params: { search } }),

  createCustomer: (data: Omit<Customer, "id" | "created_at" | "updated_at">) => api.post("/customers/", data),

  getCustomer: (id: number) => api.get(`/customers/${id}/`),

  updateCustomer: (id: number, data: Partial<Customer>) => api.put(`/customers/${id}/`, data),

  deleteCustomer: (id: number) => api.delete(`/customers/${id}/`),

  searchCustomers: (search: string) => api.get("/customers/search/", { params: { search } }),
};
```

### 3. React Components

```typescript
// Project List Component
const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ProjectFilters>({});

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await projectAPI.getProjects(filters);
      setProjects(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <Box>
      <ProjectFilters filters={filters} onFiltersChange={setFilters} />
      <ProjectTable projects={projects} loading={loading} onRefresh={loadProjects} />
    </Box>
  );
};

// Create Project Form Component
const CreateProjectForm: React.FC = () => {
  const [formData, setFormData] = useState<CreateProjectRequest>({
    project_name: "",
    project_type: "other",
    client_id: 0,
    customer_id: 0,
    circle: "",
    activity: "",
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await projectAPI.createProject(formData);
      // Navigate to project list or show success message
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="Project Name" value={formData.project_name} onChange={(e) => setFormData({ ...formData, project_name: e.target.value })} required />
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Project Type</InputLabel>
            <Select value={formData.project_type} onChange={(e) => setFormData({ ...formData, project_type: e.target.value as any })}>
              <MenuItem value="dismantle">Dismantle</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Client</InputLabel>
            <Select value={formData.client_id} onChange={(e) => setFormData({ ...formData, client_id: e.target.value as number })}>
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Customer</InputLabel>
            <Select value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value as number })}>
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Telecom Circle</InputLabel>
            <Select value={formData.circle} onChange={(e) => setFormData({ ...formData, circle: e.target.value })}>
              {TELECOM_CIRCLES.map((circle) => (
                <MenuItem key={circle.value} value={circle.value}>
                  {circle.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField fullWidth label="Activity Description" multiline rows={4} value={formData.activity} onChange={(e) => setFormData({ ...formData, activity: e.target.value })} required />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            value={formData.start_date || ""}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="End Date"
            type="date"
            value={formData.end_date || ""}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={12}>
          <Button type="submit" variant="contained" disabled={loading} fullWidth>
            {loading ? "Creating..." : "Create Project"}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};
```

---

## Telecom Circle Configuration

### Indian Telecom Circles

```typescript
export const TELECOM_CIRCLES = [
  { value: "andhra_pradesh", label: "Andhra Pradesh" },
  { value: "assam", label: "Assam" },
  { value: "bihar", label: "Bihar" },
  { value: "delhi", label: "Delhi" },
  { value: "gujarat", label: "Gujarat" },
  { value: "haryana", label: "Haryana" },
  { value: "himachal_pradesh", label: "Himachal Pradesh" },
  { value: "jammu_kashmir", label: "Jammu & Kashmir" },
  { value: "karnataka", label: "Karnataka" },
  { value: "kerala", label: "Kerala" },
  { value: "madhya_pradesh", label: "Madhya Pradesh" },
  { value: "maharashtra", label: "Maharashtra" },
  { value: "north_east", label: "North East" },
  { value: "odisha", label: "Odisha" },
  { value: "punjab", label: "Punjab" },
  { value: "rajasthan", label: "Rajasthan" },
  { value: "tamil_nadu", label: "Tamil Nadu" },
  { value: "telangana", label: "Telangana" },
  { value: "uttar_pradesh_east", label: "Uttar Pradesh (East)" },
  { value: "uttar_pradesh_west", label: "Uttar Pradesh (West)" },
  { value: "west_bengal", label: "West Bengal" },
];
```

---

## Security & Validation

### 1. Authentication & Authorization

```yaml
Security Framework:
  JWT Authentication:
    - Token-based authentication
    - Token expiration handling
    - Refresh token mechanism
    - Secure token storage

  Multi-Tenant Security:
    - Tenant isolation enforcement
    - Cross-tenant access prevention
    - Tenant-specific permissions
    - Data boundary validation

  Permission-Based Access Control:
    - Role-based permissions
    - Feature-level access control
    - Resource-level permissions
    - Dynamic permission checking

  API Security:
    - Rate limiting
    - Input validation
    - SQL injection prevention
    - XSS protection
    - CSRF protection
```

### 2. Data Validation Rules

```yaml
Project Validation:
  Required Fields:
    - project_name: string (1-255 characters)
    - project_type: enum (dismantle|other)
    - client_id: integer (must exist)
    - customer_id: integer (must exist)
    - circle: string (valid telecom circle)
    - activity: string (1-1000 characters)

  Business Rules:
    - Project name unique per tenant
    - Project type determines workflow
    - Client/Customer must belong to tenant
    - Start date <= End date (if both provided)

  Cross-Reference Validation:
    - Client exists and is active
    - Customer exists and is active
    - Telecom circle is valid

Client/Customer Validation:
  Required Fields:
    - name: string (1-255 characters)
    - contact_person: string (optional, 1-255 characters)
    - contact_email: string (optional, valid email format)
    - contact_phone: string (optional, valid phone format)

  Business Rules:
    - Name unique per tenant
    - Email format validation
    - Phone number format validation
    - Cannot delete with active projects
```

### 3. Error Handling & Logging

```yaml
Error Handling Strategy:
  Validation Errors:
    - Field-level error messages
    - Business rule violations
    - Cross-reference errors
    - Format validation errors

  Security Errors:
    - Authentication failures
    - Authorization denials
    - Permission violations
    - Tenant boundary violations

  System Errors:
    - Database connection issues
    - External service failures
    - Network timeouts
    - Resource exhaustion

  User-Friendly Messages:
    - Clear error descriptions
    - Actionable error messages
    - Context-specific guidance
    - Multilingual support

Audit Trail:
  Project Operations:
    - Project creation
    - Project updates
    - Status changes
    - Project deletion

  Client/Customer Operations:
    - Client creation
    - Customer creation
    - Contact updates
    - Soft deletions

  Security Events:
    - Login attempts
    - Permission denials
    - Data access violations
    - Tenant boundary violations
```

## Implementation Checklist

### Backend Implementation

- [ ] Create enhanced Project model with VLT fields
- [ ] Create Client and Customer models
- [ ] Implement database migrations
- [ ] Create ProjectService with business logic
- [ ] Create ClientCustomerService with business logic
- [ ] Implement all API endpoints
- [ ] Add proper validation and error handling
- [ ] Implement soft delete functionality
- [ ] Add comprehensive logging
- [ ] Implement RBAC permission system
- [ ] Add multi-tenant security
- [ ] Implement audit trail
- [ ] Add rate limiting and security headers

### Frontend Implementation

- [ ] Create TypeScript interfaces for all data types
- [ ] Implement API services for all endpoints
- [ ] Create ProjectList component with filtering
- [ ] Create CreateProjectForm component
- [ ] Create ProjectDetails component
- [ ] Create Client/Customer management components
- [ ] Implement telecom circle selection
- [ ] Add proper error handling and loading states
- [ ] Implement responsive design
- [ ] Add form validation
- [ ] Implement custom client/customer addition during project creation

### Testing

- [ ] Unit tests for all business logic
- [ ] API endpoint tests
- [ ] Frontend component tests
- [ ] Integration tests for complete workflows
- [ ] Performance testing for large datasets
- [ ] Security testing (penetration tests)
- [ ] Multi-tenant isolation testing
- [ ] Permission-based access testing
- [ ] Data validation testing
- [ ] Error handling testing
- [ ] Audit trail verification
- [ ] Cross-browser compatibility testing
- [ ] Mobile responsiveness testing
- [ ] Load testing for concurrent users
- [ ] Database performance testing

### Deployment & DevOps

- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] Environment configuration management
- [ ] Database migration scripts
- [ ] Monitoring and logging setup
- [ ] Backup and recovery procedures
- [ ] Security scanning integration
- [ ] Performance monitoring
- [ ] Error tracking and alerting
- [ ] Health check endpoints

### Documentation

- [ ] API documentation
- [ ] Component documentation
- [ ] User guide for project creation
- [ ] Admin guide for client/customer management

---

## Success Criteria

### Phase 1 Completion Criteria

- [ ] Users can create projects with VLT-style fields
- [ ] Client and customer management is fully functional
- [ ] Custom client/customer addition during project creation works
- [ ] Project filtering and search works correctly
- [ ] Project status transitions are properly validated
- [ ] All API endpoints are tested and working
- [ ] Frontend components are responsive and user-friendly
- [ ] Data validation prevents invalid project creation
- [ ] Multi-tenant isolation is properly implemented
- [ ] Performance is acceptable for typical usage
- [ ] Project outsourcing workflow is properly implemented

---

This Phase 1 specification provides the foundation for the complete project management system, establishing the core project structure that will support the subsequent design, inventory, and task management phases.

_Last Updated: 2024-12-28_

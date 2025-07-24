# Teleops Designation Management Specification

## Overview

The Designation Management module handles role hierarchy, permissions, and access control within the Teleops **Circle-Based Multi-Tenant Platform**. This system provides **complete tenant autonomy** in defining organizational structure, with only one predefined designation (Super Admin) and full flexibility for tenants to create custom designations based on their specific business needs.

**Key Principle**: Tenants have complete control over their designation hierarchy. The system provides infrastructure and tools for designation management but does not impose any predefined organizational structure beyond the essential Super Admin role.

**Important Clarification**: There are NO predefined user categories, role templates, or organizational structures based on tenant type (Corporate/Circle/Vendor). Each tenant - regardless of type - has complete freedom to design their own designation system according to their specific business needs, industry requirements, and operational preferences.

---

## Business Context

### Tenant-Driven Designation Philosophy

```yaml
Complete Tenant Autonomy Principle:
  No System-Imposed Structure:
    - Zero predefined designations except Super Admin
    - No role templates or organizational suggestions
    - No tenant-type-based role expectations
    - No industry-specific role assumptions

  Tenant Freedom:
    - Each tenant creates their own designation hierarchy
    - Complete freedom in naming and structuring roles
    - Custom permission sets defined by tenant needs
    - Organizational design reflects tenant's business reality

  Circle-Aware Infrastructure Support:
    - Designation system supports circle-based operations
    - Geographic and functional scope assignment capabilities
    - Cross-circle coordination features available
    - Multi-circle access permissions when needed
    - Infrastructure adapts to tenant's circle model

  Single Predefined Role (System Requirement):
    Super Admin:
      - Platform-level administration access
      - Tenant management capabilities
      - Designation management permissions
      - Initial tenant setup authority
      - Created automatically during tenant onboarding
      - Cannot be deleted or modified by tenant

  Business-Driven Flexibility:
    - Tenants design roles based on their specific industry
    - Custom hierarchies for unique business models
    - Adaptable permission schemes per business need
    - Project and department-specific designations
    - Industry-agnostic role creation capabilities
    - No constraints based on Corporate/Circle/Vendor tenant type

Resolution of Autonomy vs Structure Conflict:
  - System provides INFRASTRUCTURE for designation management
  - System does NOT provide PREDEFINED designations or role templates
  - Tenants use infrastructure to build their own organizational structure
  - No role suggestions, templates, or predefined categories
  - Complete organizational design freedom for all tenant types
```

### Tenant Designation Creation Examples

```yaml
Example Organizational Patterns (Tenant-Created):
  Technology Company Example:
    Leadership:
      - Chief Executive Officer
      - Chief Technology Officer
      - VP Engineering
      - VP Operations

    Engineering:
      - Engineering Manager
      - Senior Software Engineer
      - Software Engineer
      - DevOps Engineer

    Operations:
      - Operations Manager
      - Site Reliability Engineer
      - Infrastructure Specialist
      - Support Engineer

  Telecom Infrastructure Company Example:
    Management:
      - Managing Director
      - General Manager
      - Regional Manager
      - Operations Head

    Field Operations:
      - Field Manager
      - Site Supervisor
      - Senior Technician
      - Technician
      - Helper

    Support Functions:
      - Project Coordinator
      - Quality Inspector
      - Safety Officer
      - Administrative Assistant

  Consulting Firm Example:
    Leadership:
      - Senior Partner
      - Partner
      - Principal
      - Director

    Consultants:
      - Senior Manager
      - Manager
      - Senior Consultant
      - Consultant
      - Analyst

    Operations:
      - Business Development Manager
      - Account Manager
      - Operations Coordinator
      - Administrative Support

Note: These are examples only. Each tenant creates their own
  organizational structure based on their specific business
  requirements, industry standards, and operational needs.
```

---

## Designation Data Structure

### Core Designation Fields

```yaml
Designation Entity:
  Required Fields:
    - designation_name: string (role title - tenant defined)
    - designation_code: string (unique identifier within tenant)
    - designation_level: integer (hierarchy level, 1=highest)
    - department: string (functional department - tenant defined)
    - is_active: boolean (designation active status)

  Tenant-Defined Hierarchy:
    - parent_designation_id: bigint (hierarchical parent)
    - can_manage_subordinates: boolean (manage lower hierarchy)
    - approval_authority_level: integer (approval limits - tenant defined)
    - delegation_allowed: boolean (can delegate permissions)
    - max_subordinates: integer (team size limits)

  Custom Permissions:
    - permissions: jsonb (tenant-defined permissions)
    - feature_access: jsonb (tenant-defined feature access)
    - data_access_level: enum (Full, Limited, Restricted, View_Only)
    - custom_capabilities: jsonb (tenant-specific capabilities)

  Geographic & Functional Scope:
    - geographic_scope: jsonb (circles, regions - tenant defined)
    - functional_scope: jsonb (departments, functions - tenant defined)
    - cross_functional_access: boolean (can work across functions)
    - multi_location_access: boolean (can work across locations)

  Business Rules:
    - can_manage_users: boolean (user management permission)
    - can_create_projects: boolean (project creation permission)
    - can_assign_tasks: boolean (task assignment permission)
    - can_approve_expenses: boolean (expense approval authority)
    - can_access_reports: boolean (reporting access level)

  System Fields:
    - id: bigint (auto-generated primary key)
    - tenant_id: uuid (multi-tenant isolation)
    - is_system_role: boolean (true only for Super Admin)
    - created_by: integer (user who created)
    - created_at: timestamp
    - updated_at: timestamp
    - deleted_at: timestamp (soft delete)
```

### Flexible Permission Framework

```yaml
Tenant-Defined Permission Categories:
  Core Platform Permissions:
    Base Infrastructure:
      - platform.access: Basic platform access
      - tenant.manage: Tenant administration
      - tenant.settings: Tenant configuration
      - system.admin: System administration (Super Admin only)

    User Management:
      - user.create: Create new users
      - user.read: View user information
      - user.update: Modify user details
      - user.deactivate: Deactivate users
      - user.manage_designations: Assign and remove designations
      - user.manage_teams: Team membership management

  Business Function Permissions (Tenant-Customizable):
    Project Management:
      - project.create: Create new projects
      - project.read: View project details
      - project.update: Modify project information
      - project.delete: Delete projects
      - project.assign_resources: Assign resources to projects
      - project.approve: Approve project phases
      - project.close: Close completed projects

    Task Management:
      - task.create: Create tasks
      - task.read: View task details
      - task.assign: Assign tasks to team members
      - task.update_progress: Update task progress
      - task.approve: Approve task completion
      - task.reassign: Reassign tasks to different members

    Resource Management:
      - resource.create: Create resource entries
      - resource.read: View resource information
      - resource.allocate: Allocate resources to projects
      - resource.transfer: Transfer resources between projects
      - resource.approve_usage: Approve resource usage

    Financial Management:
      - finance.view_budgets: View budget information
      - finance.approve_expenses: Approve expense requests
      - finance.create_invoices: Create invoices
      - finance.manage_payments: Manage payment processing
      - finance.view_reports: View financial reports

    Reporting & Analytics:
      - report.view_basic: View basic reports
      - report.view_advanced: View advanced analytics
      - report.create_custom: Create custom reports
      - report.export: Export report data
      - report.schedule: Schedule automated reports

  Custom Permission Categories (Tenant-Defined):
    Industry-Specific:
      - Tenants can define industry-specific permissions
      - Custom workflow permissions
      - Specialized tool access permissions
      - Integration-specific permissions

    Department-Specific:
      - Custom department permissions
      - Role-specific access permissions
      - Process-specific permissions
      - Equipment-specific permissions

Note: Tenants can create entirely custom permission schemes
  based on their business requirements and operational needs.
```

---

## Database Schema

### Flexible Designation Management Tables

```sql
-- Core Designations Table (Tenant-Driven)
CREATE TABLE designations (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Designation Information (Tenant-Defined)
    designation_name VARCHAR(255) NOT NULL,
    designation_code VARCHAR(100) NOT NULL,
    designation_level INTEGER NOT NULL DEFAULT 10,
    department VARCHAR(100), -- Tenant-defined department
    description TEXT,

    -- Hierarchy Configuration (Tenant-Controlled)
    parent_designation_id BIGINT REFERENCES designations(id) ON DELETE SET NULL,
    can_manage_subordinates BOOLEAN DEFAULT FALSE,
    approval_authority_level INTEGER DEFAULT 0, -- Tenant-defined authority levels
    delegation_allowed BOOLEAN DEFAULT FALSE,
    max_subordinates INTEGER DEFAULT NULL, -- Team size limits
    hierarchy_path TEXT, -- Materialized path for efficient queries

    -- Custom Permission Configuration (Tenant-Defined)
    permissions JSONB NOT NULL DEFAULT '[]',
    feature_access JSONB NOT NULL DEFAULT '{}',
    data_access_level VARCHAR(50) NOT NULL DEFAULT 'View_Only',
    custom_capabilities JSONB DEFAULT '{}', -- Tenant-specific capabilities

    -- Scope Configuration (Tenant-Defined)
    geographic_scope JSONB DEFAULT '[]', -- Tenant-defined geographic areas
    functional_scope JSONB DEFAULT '[]', -- Tenant-defined functional areas
    cross_functional_access BOOLEAN DEFAULT FALSE,
    multi_location_access BOOLEAN DEFAULT FALSE,

    -- Business Rules (Tenant-Configurable)
    can_manage_users BOOLEAN DEFAULT FALSE,
    can_create_projects BOOLEAN DEFAULT FALSE,
    can_assign_tasks BOOLEAN DEFAULT FALSE,
    can_approve_expenses BOOLEAN DEFAULT FALSE,
    can_access_reports BOOLEAN DEFAULT FALSE,
    expense_approval_limit DECIMAL(15,2) DEFAULT 0.00, -- Tenant-defined limits

    -- System Fields
    is_system_role BOOLEAN DEFAULT FALSE, -- Only true for Super Admin
    is_active BOOLEAN DEFAULT TRUE,
    is_template BOOLEAN DEFAULT FALSE, -- For tenant-created templates

    -- Audit Fields
    created_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(tenant_id, designation_code),
    CHECK (designation_level > 0),
    CHECK (data_access_level IN ('Full', 'Limited', 'Restricted', 'View_Only')),
    CHECK (approval_authority_level >= 0),
    CHECK (max_subordinates IS NULL OR max_subordinates > 0),
    CHECK (expense_approval_limit >= 0)
);

-- Tenant-Defined Permission Categories
CREATE TABLE permission_categories (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Category Information
    category_name VARCHAR(100) NOT NULL,
    category_code VARCHAR(50) NOT NULL,
    description TEXT,
    is_system_category BOOLEAN DEFAULT FALSE, -- Core platform categories

    -- Category Configuration
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, category_code)
);

-- Tenant-Defined Permissions
CREATE TABLE custom_permissions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES permission_categories(id) ON DELETE CASCADE,

    -- Permission Information
    permission_name VARCHAR(100) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    description TEXT,

    -- Permission Configuration
    permission_type VARCHAR(50) DEFAULT 'action', -- action, access, approval, etc.
    requires_approval BOOLEAN DEFAULT FALSE,
    is_delegatable BOOLEAN DEFAULT TRUE,
    scope_required BOOLEAN DEFAULT FALSE, -- Requires geographic/functional scope

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,

    -- Audit Fields
    created_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, permission_code),
    CHECK (permission_type IN ('action', 'access', 'approval', 'management', 'reporting', 'custom'))
);

-- Designation Permission Assignments (Tenant-Configured)
CREATE TABLE designation_permissions (
    id BIGSERIAL PRIMARY KEY,
    designation_id BIGINT NOT NULL REFERENCES designations(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES custom_permissions(id) ON DELETE CASCADE,

    -- Assignment Configuration
    permission_level VARCHAR(20) NOT NULL DEFAULT 'granted',
    scope_restriction JSONB DEFAULT '{}', -- Geographic/functional restrictions
    conditions JSONB DEFAULT '{}', -- Conditional permissions
    approval_required BOOLEAN DEFAULT FALSE,

    -- Time-based Permissions
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_temporary BOOLEAN DEFAULT FALSE,

    -- Audit Fields
    granted_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(designation_id, permission_id),
    CHECK (permission_level IN ('granted', 'denied', 'conditional', 'approval_required'))
);

-- User Designation Assignments (Updated for Flexibility)
CREATE TABLE user_designation_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_profile_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    designation_id BIGINT NOT NULL REFERENCES designations(id) ON DELETE CASCADE,

    -- Assignment Details
    is_primary_designation BOOLEAN DEFAULT TRUE,
    is_temporary BOOLEAN DEFAULT FALSE,
    assignment_reason VARCHAR(255),

    -- Scope Overrides (Tenant-Defined)
    geographic_scope_override JSONB DEFAULT '{}',
    functional_scope_override JSONB DEFAULT '{}',
    permission_overrides JSONB DEFAULT '{}', -- Additional or restricted permissions

    -- Time Period
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    auto_expire BOOLEAN DEFAULT FALSE,

    -- Approval and Assignment
    assigned_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    approval_required BOOLEAN DEFAULT FALSE,

    -- Status
    assignment_status VARCHAR(50) DEFAULT 'Active',
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_profile_id, designation_id, effective_from),
    CHECK (assignment_status IN ('Pending', 'Active', 'Suspended', 'Expired', 'Revoked'))
);

-- Tenant Designation Templates (Tenant-Created)
CREATE TABLE designation_templates (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Template Information
    template_name VARCHAR(100) NOT NULL,
    template_description TEXT,
    industry_category VARCHAR(100), -- e.g., "Technology", "Construction", "Consulting"

    -- Template Configuration
    designation_data JSONB NOT NULL, -- Complete designation configuration
    permission_set JSONB NOT NULL, -- Associated permissions
    hierarchy_suggestions JSONB DEFAULT '{}', -- Suggested hierarchy relationships

    -- Usage Tracking
    usage_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE, -- Can be shared with other tenants
    is_verified BOOLEAN DEFAULT FALSE, -- Verified by platform

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, template_name)
);

-- Super Admin Role (System-Defined)
CREATE TABLE system_roles (
    id BIGSERIAL PRIMARY KEY,

    -- Role Information
    role_name VARCHAR(100) NOT NULL UNIQUE,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    -- Role Configuration
    system_permissions JSONB NOT NULL, -- Platform-level permissions
    is_tenant_scoped BOOLEAN DEFAULT TRUE,
    can_access_all_tenants BOOLEAN DEFAULT FALSE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Super Admin Role
INSERT INTO system_roles (role_name, role_code, description, system_permissions, can_access_all_tenants)
VALUES (
    'Super Administrator',
    'SUPER_ADMIN',
    'Platform administration with tenant management capabilities',
    '["*"]',
    false
);

-- Indexes for Performance
CREATE INDEX idx_designations_tenant ON designations(tenant_id);
CREATE INDEX idx_designations_code ON designations(tenant_id, designation_code);
CREATE INDEX idx_designations_level ON designations(designation_level);
CREATE INDEX idx_designations_parent ON designations(parent_designation_id);
CREATE INDEX idx_designations_active ON designations(is_active);
CREATE INDEX idx_designations_system ON designations(is_system_role);
CREATE INDEX idx_designations_geographic ON designations USING GIN(geographic_scope);
CREATE INDEX idx_designations_functional ON designations USING GIN(functional_scope);

CREATE INDEX idx_permission_categories_tenant ON permission_categories(tenant_id);
CREATE INDEX idx_permission_categories_code ON permission_categories(tenant_id, category_code);

CREATE INDEX idx_custom_permissions_tenant ON custom_permissions(tenant_id);
CREATE INDEX idx_custom_permissions_category ON custom_permissions(category_id);
CREATE INDEX idx_custom_permissions_code ON custom_permissions(tenant_id, permission_code);

CREATE INDEX idx_designation_permissions_designation ON designation_permissions(designation_id);
CREATE INDEX idx_designation_permissions_permission ON designation_permissions(permission_id);
CREATE INDEX idx_designation_permissions_active ON designation_permissions(is_active);

CREATE INDEX idx_user_designations_user ON user_designation_assignments(user_profile_id);
CREATE INDEX idx_user_designations_designation ON user_designation_assignments(designation_id);
CREATE INDEX idx_user_designations_active ON user_designation_assignments(is_active);
CREATE INDEX idx_user_designations_primary ON user_designation_assignments(is_primary_designation);

CREATE INDEX idx_designation_templates_tenant ON designation_templates(tenant_id);
CREATE INDEX idx_designation_templates_category ON designation_templates(industry_category);
CREATE INDEX idx_designation_templates_public ON designation_templates(is_public);
```

---

## API Endpoints

### Tenant-Driven Designation Management APIs

```yaml
# Core Designation Management (Tenant-Scoped)
GET    /api/designations/                      # List tenant designations
POST   /api/designations/                      # Create new designation
GET    /api/designations/{id}/                 # Get designation details
PUT    /api/designations/{id}/                 # Update designation
DELETE /api/designations/{id}/                 # Soft delete designation

# Designation Hierarchy Management (Tenant-Controlled)
GET    /api/designations/hierarchy/            # Get designation hierarchy tree
POST   /api/designations/{id}/add-subordinate/ # Add subordinate designation
PUT    /api/designations/{id}/move/            # Move designation in hierarchy
GET    /api/designations/{id}/subordinates/    # Get subordinate designations
GET    /api/designations/{id}/superiors/       # Get superior designations
POST   /api/designations/validate-hierarchy/   # Validate hierarchy changes

# Permission Management (Tenant-Defined)
GET    /api/permission-categories/             # Get tenant permission categories
POST   /api/permission-categories/             # Create permission category
GET    /api/permissions/                       # Get tenant-defined permissions
POST   /api/permissions/                       # Create custom permission
PUT    /api/permissions/{id}/                  # Update permission
DELETE /api/permissions/{id}/                  # Delete permission

# Designation Permission Assignment (Tenant-Configured)
GET    /api/designations/{id}/permissions/     # Get designation permissions
POST   /api/designations/{id}/permissions/     # Assign permissions to designation
PUT    /api/designations/{id}/permissions/{permission_id}/ # Update permission assignment
DELETE /api/designations/{id}/permissions/{permission_id}/ # Remove permission

# User Designation Management (Tenant-Driven)
GET    /api/users/{id}/designations/           # Get user designation assignments
POST   /api/users/{id}/designations/           # Assign designation to user
PUT    /api/users/{id}/designations/{assignment_id}/ # Update designation assignment
DELETE /api/users/{id}/designations/{assignment_id}/ # Remove designation assignment

# Designation Templates (Tenant-Created)
GET    /api/designation-templates/             # Get tenant templates
POST   /api/designation-templates/             # Create designation template
GET    /api/designation-templates/{id}/        # Get template details
PUT    /api/designation-templates/{id}/        # Update template
DELETE /api/designation-templates/{id}/        # Delete template
POST   /api/designations/create-from-template/ # Create designation from template

# Template Sharing and Discovery
GET    /api/designation-templates/public/      # Get public templates
GET    /api/designation-templates/by-industry/{category}/ # Get industry-specific templates
POST   /api/designation-templates/{id}/share/  # Share template publicly
POST   /api/designation-templates/{id}/fork/   # Fork public template for customization

# System Administration (Super Admin Only)
GET    /api/system/roles/                      # Get system roles
GET    /api/system/super-admin/tenants/        # Get all tenants (Super Admin)
POST   /api/system/super-admin/assign/         # Assign Super Admin to user
DELETE /api/system/super-admin/revoke/         # Revoke Super Admin from user

# Validation and Utilities
POST   /api/designations/validate/             # Validate designation configuration
GET    /api/designations/available-permissions/ # Get available permissions for tenant
POST   /api/designations/bulk-create/          # Bulk create designations
GET    /api/designations/suggestions/          # Get designation creation suggestions

# Reporting and Analytics (Tenant-Scoped)
GET    /api/designations/analytics/            # Designation usage analytics
GET    /api/designations/hierarchy-report/     # Hierarchy structure report
GET    /api/designations/permission-matrix/    # Permission assignment matrix
GET    /api/designations/user-distribution/    # User distribution by designation
```

---

## Business Logic Services

### Tenant-Driven Designation Management Service

```python
class DesignationManagementService:
    """Core business logic for tenant-driven designation management"""

    def create_tenant_designation(self, tenant_id, designation_data, creating_user):
        """Create custom designation for tenant"""
        # Validate tenant permissions
        if not self.can_manage_designations(creating_user):
            raise PermissionError("Insufficient permissions to create designations")

        # Validate designation data
        self.validate_designation_data(designation_data, tenant_id)

        # Validate hierarchy if parent specified
        if designation_data.get('parent_designation_id'):
            self.validate_hierarchy_assignment(
                designation_data['parent_designation_id'],
                designation_data['designation_level'],
                tenant_id
            )

        # Create designation
        designation = Designation.objects.create(
            tenant_id=tenant_id,
            designation_name=designation_data['designation_name'],
            designation_code=designation_data['designation_code'],
            designation_level=designation_data['designation_level'],
            department=designation_data.get('department'),
            description=designation_data.get('description'),
            parent_designation_id=designation_data.get('parent_designation_id'),
            can_manage_subordinates=designation_data.get('can_manage_subordinates', False),
            approval_authority_level=designation_data.get('approval_authority_level', 0),
            delegation_allowed=designation_data.get('delegation_allowed', False),
            max_subordinates=designation_data.get('max_subordinates'),
            permissions=designation_data.get('permissions', []),
            feature_access=designation_data.get('feature_access', {}),
            data_access_level=designation_data.get('data_access_level', 'View_Only'),
            custom_capabilities=designation_data.get('custom_capabilities', {}),
            geographic_scope=designation_data.get('geographic_scope', []),
            functional_scope=designation_data.get('functional_scope', []),
            cross_functional_access=designation_data.get('cross_functional_access', False),
            multi_location_access=designation_data.get('multi_location_access', False),
            can_manage_users=designation_data.get('can_manage_users', False),
            can_create_projects=designation_data.get('can_create_projects', False),
            can_assign_tasks=designation_data.get('can_assign_tasks', False),
            can_approve_expenses=designation_data.get('can_approve_expenses', False),
            can_access_reports=designation_data.get('can_access_reports', False),
            expense_approval_limit=designation_data.get('expense_approval_limit', 0.00),
            is_system_role=False,  # Only system can create system roles
            created_by=creating_user
        )

        # Update hierarchy path
        self.update_hierarchy_path(designation)

        # Assign permissions if specified
        if designation_data.get('permission_assignments'):
            self.assign_permissions_to_designation(
                designation.id,
                designation_data['permission_assignments'],
                creating_user
            )

        return designation

    def create_super_admin_designation(self, tenant_id):
        """Create Super Admin designation for new tenant"""
        # Check if Super Admin already exists for tenant
        existing_admin = Designation.objects.filter(
            tenant_id=tenant_id,
            is_system_role=True,
            designation_code='SUPER_ADMIN'
        ).first()

        if existing_admin:
            return existing_admin

        # Create Super Admin designation
        super_admin = Designation.objects.create(
            tenant_id=tenant_id,
            designation_name='Super Administrator',
            designation_code='SUPER_ADMIN',
            designation_level=1,
            department='Administration',
            description='Platform administration with full tenant management capabilities',
            permissions=['*'],  # All permissions
            feature_access={'all': 'full'},
            data_access_level='Full',
            can_manage_subordinates=True,
            approval_authority_level=999999,  # Unlimited approval authority
            delegation_allowed=True,
            can_manage_users=True,
            can_create_projects=True,
            can_assign_tasks=True,
            can_approve_expenses=True,
            can_access_reports=True,
            expense_approval_limit=999999999.99,  # Unlimited expense approval
            cross_functional_access=True,
            multi_location_access=True,
            is_system_role=True,
            is_active=True
        )

        return super_admin

    def get_or_create_super_admin_designation(self, tenant_id):
        """Get existing or create new Super Admin designation"""
        super_admin = Designation.objects.filter(
            tenant_id=tenant_id,
            is_system_role=True,
            designation_code='SUPER_ADMIN'
        ).first()

        if not super_admin:
            super_admin = self.create_super_admin_designation(tenant_id)

        return super_admin

    def create_permission_category(self, tenant_id, category_data, creating_user):
        """Create custom permission category for tenant"""
        if not self.can_manage_permissions(creating_user):
            raise PermissionError("Insufficient permissions to create permission categories")

        category = PermissionCategory.objects.create(
            tenant_id=tenant_id,
            category_name=category_data['category_name'],
            category_code=category_data['category_code'],
            description=category_data.get('description'),
            is_system_category=False,
            sort_order=category_data.get('sort_order', 0),
            created_by=creating_user
        )

        return category

    def create_custom_permission(self, tenant_id, permission_data, creating_user):
        """Create custom permission for tenant"""
        if not self.can_manage_permissions(creating_user):
            raise PermissionError("Insufficient permissions to create permissions")

        permission = CustomPermission.objects.create(
            tenant_id=tenant_id,
            category_id=permission_data['category_id'],
            permission_name=permission_data['permission_name'],
            permission_code=permission_data['permission_code'],
            description=permission_data.get('description'),
            permission_type=permission_data.get('permission_type', 'action'),
            requires_approval=permission_data.get('requires_approval', False),
            is_delegatable=permission_data.get('is_delegatable', True),
            scope_required=permission_data.get('scope_required', False),
            sort_order=permission_data.get('sort_order', 0),
            created_by=creating_user
        )

        return permission

    def assign_designation_to_user(self, user_profile_id, designation_id, assignment_data, assigned_by):
        """Assign tenant-created designation to user"""
        # Validate user and designation belong to same tenant
        user_profile = UserProfile.objects.get(id=user_profile_id)
        designation = Designation.objects.get(
            id=designation_id,
            tenant_id=user_profile.tenant_id,
            is_active=True
        )

        # Check assignment permissions
        if not self.can_assign_designation(assigned_by, designation, user_profile):
            raise PermissionError("Insufficient permissions to assign this designation")

        # Check if user already has this designation
        existing_assignment = UserDesignationAssignment.objects.filter(
            user_profile=user_profile,
            designation=designation,
            is_active=True
        ).first()

        if existing_assignment:
            raise ValidationError("User already has this designation")

        # Create assignment
        assignment = UserDesignationAssignment.objects.create(
            user_profile=user_profile,
            designation=designation,
            is_primary_designation=assignment_data.get('is_primary', False),
            is_temporary=assignment_data.get('is_temporary', False),
            assignment_reason=assignment_data.get('reason'),
            geographic_scope_override=assignment_data.get('geographic_scope_override', {}),
            functional_scope_override=assignment_data.get('functional_scope_override', {}),
            permission_overrides=assignment_data.get('permission_overrides', {}),
            effective_from=assignment_data.get('effective_from', date.today()),
            effective_to=assignment_data.get('effective_to'),
            auto_expire=assignment_data.get('auto_expire', False),
            assigned_by=assigned_by,
            approval_required=assignment_data.get('approval_required', False)
        )

        # Update primary designation if specified
        if assignment.is_primary_designation:
            UserDesignationAssignment.objects.filter(
                user_profile=user_profile,
                is_primary_designation=True,
                is_active=True
            ).exclude(id=assignment.id).update(is_primary_designation=False)

        return assignment

    def get_user_effective_permissions(self, user_profile):
        """Calculate effective permissions for user based on all active designations"""
        # Get active designation assignments
        assignments = UserDesignationAssignment.objects.filter(
            user_profile=user_profile,
            is_active=True,
            assignment_status='Active',
            effective_from__lte=date.today()
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=date.today())
        ).select_related('designation')

        if not assignments.exists():
            return self.get_default_permissions()

        # Aggregate permissions from all assignments
        all_permissions = set()
        feature_access = {}
        geographic_scope = set()
        functional_scope = set()
        custom_capabilities = {}
        highest_data_access = 'View_Only'
        max_approval_limit = 0.00

        # Boolean capabilities (OR logic)
        can_manage_users = False
        can_create_projects = False
        can_assign_tasks = False
        can_approve_expenses = False
        can_access_reports = False
        cross_functional_access = False
        multi_location_access = False

        for assignment in assignments:
            designation = assignment.designation

            # Collect permissions
            all_permissions.update(designation.permissions or [])

            # Apply permission overrides from assignment
            if assignment.permission_overrides:
                additional_perms = assignment.permission_overrides.get('additional', [])
                restricted_perms = assignment.permission_overrides.get('restricted', [])
                all_permissions.update(additional_perms)
                all_permissions.difference_update(restricted_perms)

            # Merge feature access (take highest level)
            for feature, access_level in (designation.feature_access or {}).items():
                if feature not in feature_access or self.is_higher_access_level(access_level, feature_access[feature]):
                    feature_access[feature] = access_level

            # Aggregate geographic scope
            designation_geo = designation.geographic_scope or []
            override_geo = assignment.geographic_scope_override or []
            if override_geo:
                geographic_scope.update(override_geo)
            else:
                geographic_scope.update(designation_geo)

            # Aggregate functional scope
            designation_func = designation.functional_scope or []
            override_func = assignment.functional_scope_override or []
            if override_func:
                functional_scope.update(override_func)
            else:
                functional_scope.update(designation_func)

            # Merge custom capabilities
            custom_capabilities.update(designation.custom_capabilities or {})

            # Take highest data access level
            if self.is_higher_data_access_level(designation.data_access_level, highest_data_access):
                highest_data_access = designation.data_access_level

            # Take highest approval limit
            if designation.expense_approval_limit > max_approval_limit:
                max_approval_limit = designation.expense_approval_limit

            # Boolean capabilities (OR logic)
            can_manage_users = can_manage_users or designation.can_manage_users
            can_create_projects = can_create_projects or designation.can_create_projects
            can_assign_tasks = can_assign_tasks or designation.can_assign_tasks
            can_approve_expenses = can_approve_expenses or designation.can_approve_expenses
            can_access_reports = can_access_reports or designation.can_access_reports
            cross_functional_access = cross_functional_access or designation.cross_functional_access
            multi_location_access = multi_location_access or designation.multi_location_access

        return {
            'permissions': list(all_permissions),
            'feature_access': feature_access,
            'geographic_scope': list(geographic_scope),
            'functional_scope': list(functional_scope),
            'custom_capabilities': custom_capabilities,
            'data_access_level': highest_data_access,
            'can_manage_users': can_manage_users,
            'can_create_projects': can_create_projects,
            'can_assign_tasks': can_assign_tasks,
            'can_approve_expenses': can_approve_expenses,
            'can_access_reports': can_access_reports,
            'cross_functional_access': cross_functional_access,
            'multi_location_access': multi_location_access,
            'expense_approval_limit': max_approval_limit
        }

    def create_designation_template(self, tenant_id, template_data, creating_user):
        """Create designation template for reuse"""
        template = DesignationTemplate.objects.create(
            tenant_id=tenant_id,
            template_name=template_data['template_name'],
            template_description=template_data.get('template_description'),
            industry_category=template_data.get('industry_category'),
            designation_data=template_data['designation_data'],
            permission_set=template_data['permission_set'],
            hierarchy_suggestions=template_data.get('hierarchy_suggestions', {}),
            is_public=template_data.get('is_public', False),
            created_by=creating_user
        )

        return template

    def create_designation_from_template(self, tenant_id, template_id, customizations, creating_user):
        """Create designation from template with customizations"""
        template = DesignationTemplate.objects.get(
            id=template_id,
            is_active=True
        )

        # Validate template access (public or tenant-owned)
        if not template.is_public and template.tenant_id != tenant_id:
            raise PermissionError("Cannot access this template")

        # Merge template data with customizations
        designation_data = template.designation_data.copy()
        designation_data.update(customizations)

        # Create designation
        designation = self.create_tenant_designation(tenant_id, designation_data, creating_user)

        # Update template usage count
        template.usage_count += 1
        template.save()

        return designation

    def validate_designation_data(self, designation_data, tenant_id):
        """Validate designation data before creation"""
        # Check required fields
        required_fields = ['designation_name', 'designation_code', 'designation_level']
        for field in required_fields:
            if not designation_data.get(field):
                raise ValidationError(f"Required field missing: {field}")

        # Check unique designation code within tenant
        if Designation.objects.filter(
            tenant_id=tenant_id,
            designation_code=designation_data['designation_code'],
            is_active=True
        ).exists():
            raise ValidationError("Designation code must be unique within tenant")

        # Validate designation level
        if designation_data['designation_level'] < 1:
            raise ValidationError("Designation level must be positive")

        # Validate approval authority level
        approval_level = designation_data.get('approval_authority_level', 0)
        if approval_level < 0:
            raise ValidationError("Approval authority level cannot be negative")

        # Validate expense approval limit
        expense_limit = designation_data.get('expense_approval_limit', 0)
        if expense_limit < 0:
            raise ValidationError("Expense approval limit cannot be negative")

        return True

    def can_manage_designations(self, user):
        """Check if user can manage designations"""
        permissions = self.get_user_effective_permissions(user.user_profile)
        return (
            'designation.manage' in permissions.get('permissions', []) or
            '*' in permissions.get('permissions', [])
        )

    def can_manage_permissions(self, user):
        """Check if user can manage permissions"""
        permissions = self.get_user_effective_permissions(user.user_profile)
        return (
            'permission.manage' in permissions.get('permissions', []) or
            '*' in permissions.get('permissions', [])
        )

    def can_assign_designation(self, assigning_user, designation, target_user):
        """Check if user can assign designation to another user"""
        assigner_permissions = self.get_user_effective_permissions(assigning_user.user_profile)

        # Check basic permission
        can_assign = (
            'user.manage_designations' in assigner_permissions.get('permissions', []) or
            '*' in assigner_permissions.get('permissions', [])
        )

        if not can_assign:
            return False

        # Check hierarchy rules (can only assign equal or lower level designations)
        assigner_designations = UserDesignationAssignment.objects.filter(
            user_profile=assigning_user.user_profile,
            is_active=True
        ).values_list('designation__designation_level', flat=True)

        if assigner_designations:
            min_assigner_level = min(assigner_designations)
            if designation.designation_level < min_assigner_level:
                return False

        return True

    def is_higher_access_level(self, level1, level2):
        """Compare access levels"""
        levels = {'basic': 1, 'standard': 2, 'advanced': 3, 'full': 4}
        return levels.get(level1.lower(), 0) > levels.get(level2.lower(), 0)

    def is_higher_data_access_level(self, level1, level2):
        """Compare data access levels"""
        levels = {'View_Only': 1, 'Restricted': 2, 'Limited': 3, 'Full': 4}
        return levels.get(level1, 0) > levels.get(level2, 0)

    def get_default_permissions(self):
        """Get default permissions for users with no designations"""
        return {
            'permissions': ['platform.access'],
            'feature_access': {'basic': 'standard'},
            'geographic_scope': [],
            'functional_scope': [],
            'custom_capabilities': {},
            'data_access_level': 'View_Only',
            'can_manage_users': False,
            'can_create_projects': False,
            'can_assign_tasks': False,
            'can_approve_expenses': False,
            'can_access_reports': False,
            'cross_functional_access': False,
            'multi_location_access': False,
            'expense_approval_limit': 0.00
        }
```

---

## Frontend Components

### Tenant-Driven Designation Management Interface

```typescript
// Designation Management Types
interface Designation {
  id: number;
  tenant_id: string;
  designation_name: string;
  designation_code: string;
  designation_level: number;
  department?: string;
  description?: string;

  parent_designation_id?: number;
  can_manage_subordinates: boolean;
  approval_authority_level: number;
  delegation_allowed: boolean;
  max_subordinates?: number;
  hierarchy_path?: string;

  permissions: string[];
  feature_access: Record<string, string>;
  data_access_level: "Full" | "Limited" | "Restricted" | "View_Only";
  custom_capabilities: Record<string, any>;

  geographic_scope: string[];
  functional_scope: string[];
  cross_functional_access: boolean;
  multi_location_access: boolean;

  can_manage_users: boolean;
  can_create_projects: boolean;
  can_assign_tasks: boolean;
  can_approve_expenses: boolean;
  can_access_reports: boolean;
  expense_approval_limit: number;

  is_system_role: boolean;
  is_active: boolean;
  is_template: boolean;

  created_by?: number;
  created_at: string;
  updated_at: string;
}

interface CreateDesignationRequest {
  designation_name: string;
  designation_code: string;
  designation_level: number;
  department?: string;
  description?: string;
  parent_designation_id?: number;
  can_manage_subordinates?: boolean;
  approval_authority_level?: number;
  delegation_allowed?: boolean;
  max_subordinates?: number;
  permissions?: string[];
  feature_access?: Record<string, string>;
  data_access_level?: string;
  custom_capabilities?: Record<string, any>;
  geographic_scope?: string[];
  functional_scope?: string[];
  cross_functional_access?: boolean;
  multi_location_access?: boolean;
  can_manage_users?: boolean;
  can_create_projects?: boolean;
  can_assign_tasks?: boolean;
  can_approve_expenses?: boolean;
  can_access_reports?: boolean;
  expense_approval_limit?: number;
}

interface PermissionCategory {
  id: number;
  tenant_id: string;
  category_name: string;
  category_code: string;
  description?: string;
  is_system_category: boolean;
  is_active: boolean;
  sort_order: number;
}

interface CustomPermission {
  id: number;
  tenant_id: string;
  category_id: number;
  permission_name: string;
  permission_code: string;
  description?: string;
  permission_type: "action" | "access" | "approval" | "management" | "reporting" | "custom";
  requires_approval: boolean;
  is_delegatable: boolean;
  scope_required: boolean;
  is_active: boolean;
  sort_order: number;
}

interface DesignationTemplate {
  id: number;
  tenant_id: string;
  template_name: string;
  template_description?: string;
  industry_category?: string;
  designation_data: Record<string, any>;
  permission_set: Record<string, any>;
  hierarchy_suggestions: Record<string, any>;
  usage_count: number;
  is_public: boolean;
  is_verified: boolean;
  is_active: boolean;
}

// Designation Management Hook
export const useDesignationManagement = () => {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [permissionCategories, setPermissionCategories] = useState<PermissionCategory[]>([]);
  const [customPermissions, setCustomPermissions] = useState<CustomPermission[]>([]);
  const [templates, setTemplates] = useState<DesignationTemplate[]>([]);
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDesignations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await designationAPI.getDesignations();
      setDesignations(data);
      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHierarchy = useCallback(async () => {
    try {
      const data = await designationAPI.getHierarchy();
      setHierarchy(data);
      return data;
    } catch (error) {
      throw error;
    }
  }, []);

  const loadPermissionCategories = useCallback(async () => {
    try {
      const data = await designationAPI.getPermissionCategories();
      setPermissionCategories(data);
      return data;
    } catch (error) {
      throw error;
    }
  }, []);

  const loadCustomPermissions = useCallback(async () => {
    try {
      const data = await designationAPI.getCustomPermissions();
      setCustomPermissions(data);
      return data;
    } catch (error) {
      throw error;
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await designationAPI.getTemplates();
      setTemplates(data);
      return data;
    } catch (error) {
      throw error;
    }
  }, []);

  const createDesignation = useCallback(
    async (designationData: CreateDesignationRequest) => {
      setLoading(true);
      try {
        const newDesignation = await designationAPI.create(designationData);
        setDesignations((prev) => [...prev, newDesignation]);
        await loadHierarchy(); // Refresh hierarchy
        return newDesignation;
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadHierarchy]
  );

  const updateDesignation = useCallback(
    async (id: number, designationData: Partial<CreateDesignationRequest>) => {
      try {
        const updatedDesignation = await designationAPI.update(id, designationData);
        setDesignations((prev) => prev.map((d) => (d.id === id ? updatedDesignation : d)));
        await loadHierarchy(); // Refresh hierarchy
        return updatedDesignation;
      } catch (error) {
        throw error;
      }
    },
    [loadHierarchy]
  );

  const deleteDesignation = useCallback(
    async (id: number) => {
      try {
        await designationAPI.delete(id);
        setDesignations((prev) => prev.filter((d) => d.id !== id));
        await loadHierarchy(); // Refresh hierarchy
      } catch (error) {
        throw error;
      }
    },
    [loadHierarchy]
  );

  const createPermissionCategory = useCallback(async (categoryData: Partial<PermissionCategory>) => {
    try {
      const newCategory = await designationAPI.createPermissionCategory(categoryData);
      setPermissionCategories((prev) => [...prev, newCategory]);
      return newCategory;
    } catch (error) {
      throw error;
    }
  }, []);

  const createCustomPermission = useCallback(async (permissionData: Partial<CustomPermission>) => {
    try {
      const newPermission = await designationAPI.createCustomPermission(permissionData);
      setCustomPermissions((prev) => [...prev, newPermission]);
      return newPermission;
    } catch (error) {
      throw error;
    }
  }, []);

  const assignDesignationToUser = useCallback(async (userId: number, designationId: number, assignmentData: any) => {
    try {
      const assignment = await designationAPI.assignToUser(userId, designationId, assignmentData);
      return assignment;
    } catch (error) {
      throw error;
    }
  }, []);

  const createTemplate = useCallback(async (templateData: Partial<DesignationTemplate>) => {
    try {
      const newTemplate = await designationAPI.createTemplate(templateData);
      setTemplates((prev) => [...prev, newTemplate]);
      return newTemplate;
    } catch (error) {
      throw error;
    }
  }, []);

  const createFromTemplate = useCallback(
    async (templateId: number, customizations: Record<string, any>) => {
      setLoading(true);
      try {
        const newDesignation = await designationAPI.createFromTemplate(templateId, customizations);
        setDesignations((prev) => [...prev, newDesignation]);
        await loadHierarchy(); // Refresh hierarchy
        return newDesignation;
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadHierarchy]
  );

  return {
    designations,
    permissionCategories,
    customPermissions,
    templates,
    hierarchy,
    loading,
    loadDesignations,
    loadHierarchy,
    loadPermissionCategories,
    loadCustomPermissions,
    loadTemplates,
    createDesignation,
    updateDesignation,
    deleteDesignation,
    createPermissionCategory,
    createCustomPermission,
    assignDesignationToUser,
    createTemplate,
    createFromTemplate,
  };
};
```

---

## Integration Points

### 1. Tenant Onboarding Integration

```yaml
Super Admin Creation:
  - Super Admin designation created automatically during tenant setup
  - Initial admin user assigned Super Admin role
  - Full platform access for initial setup
  - Ability to create custom organizational structure

Tenant-Driven Setup:
  - No predefined designations beyond Super Admin
  - Tenants create their own organizational hierarchy
  - Custom permission schemes based on business needs
  - Industry-specific templates available for guidance
```

### 2. User Management Integration

```yaml
Designation Assignment:
  - Users assigned to tenant-created designations only
  - Multiple designation support per user
  - Scope-based assignment (geographic/functional)
  - Temporary and project-specific assignments

Permission Calculation:
  - Real-time permission aggregation from multiple designations
  - Scope-based access control enforcement
  - Custom capability integration
  - Approval authority validation
```

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)

- Flexible designation data model
- Super Admin role creation
- Basic CRUD operations
- Permission framework foundation

### Phase 2: Tenant-Driven Features (Weeks 3-4)

- Custom permission creation
- Designation templates
- Hierarchy management
- Permission assignment system

### Phase 3: Advanced Capabilities (Weeks 5-6)

- Complex permission aggregation
- Scope-based access control
- Template sharing and discovery
- Advanced hierarchy operations

### Phase 4: Integration & Optimization (Weeks 7-8)

- User management integration
- Performance optimization
- Analytics and reporting
- Mobile app support

---

This Designation Management specification provides complete tenant autonomy in organizational structure design while maintaining the necessary infrastructure for secure, scalable permission management across the Circle-Based Multi-Tenant Platform.

_Last Updated: 2024-12-28_

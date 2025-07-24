# Teleops Role-Based Access Control (RBAC) Specification

## Overview

The Role-Based Access Control (RBAC) module provides sophisticated permission management within the Teleops **Circle-Based Multi-Tenant Platform**. This system supports **dual-level permission control** - base permissions at the designation level with flexible **individual user-level overrides**, enabling granular access control while maintaining organizational structure.

**Key Principle**: Permissions are inherited from designations but can be customized at the individual user level. This allows for business scenarios where users with the same designation have different specific permissions based on their responsibilities, project assignments, or business requirements.

---

## Business Context

### Dual-Level RBAC Philosophy

```yaml
Sophisticated Permission Management:
  Designation-Level Permissions:
    - Base permissions inherited from designation
    - Default capabilities for role holders
    - Organizational structure-based access
    - Tenant-defined permission sets

  User-Level Permission Overrides:
    - Individual permission customizations
    - Additional permissions beyond designation
    - Restricted permissions below designation level
    - Context-specific access control

  Flexible Override System:
    - Additive permissions (grant additional access)
    - Restrictive permissions (remove specific access)
    - Conditional permissions (time, location, project-based)
    - Temporary permission assignments

  Business Scenario Examples:
    Same Designation, Different Permissions:
      - John Smith (Project Manager): Can create tasks + assign to vendors
      - Nancy Methew (Project Manager): Can create tasks but NOT assign to vendors

    Context-Based Access:
      - Senior Engineer A: Full system access during business hours
      - Senior Engineer B: Limited system access (specific projects only)

    Temporary Assignments:
      - Manager temporarily gets Finance approval permissions
      - Field Technician gets Site Supervisor permissions for specific project
```

### RBAC Business Scenarios

```yaml
Real-World Permission Examples:
  Project Management Scenarios:
    Base Project Manager Designation:
      - project.create: Create new projects
      - project.read: View project details
      - project.update: Modify project information
      - task.create: Create project tasks
      - task.assign_internal: Assign tasks to internal team

    User-Level Customizations:
      John Smith (Senior PM):
        Additional Permissions:
          - task.assign_vendors: Can assign tasks to vendor teams
          - project.budget_approve: Can approve project budgets up to $50K
          - vendor.communicate: Can communicate directly with vendors

      Nancy Methew (Junior PM):
        Restricted Permissions:
          - task.assign_vendors: DENIED (cannot assign to vendors)
          - project.budget_approve: DENIED (no budget approval)
        Additional Permissions:
          - report.detailed_access: Access to detailed project reports

  Operations Management Scenarios:
    Base Operations Manager Designation:
      - site.read: View site information
      - site.update: Update site details
      - team.manage: Manage team assignments
      - equipment.track: Track equipment usage

    User-Level Customizations:
      Regional Operations Manager:
        Additional Permissions:
          - site.create: Can create new sites
          - site.delete: Can decommission sites
          - budget.approve: Regional budget approval authority
          - cross_region.coordinate: Coordinate across regions

      Site Operations Manager:
        Restricted Permissions:
          - team.manage: LIMITED to assigned sites only
        Additional Permissions:
          - safety.incident_report: File safety incidents
          - equipment.maintenance_schedule: Schedule equipment maintenance

  Enhanced Vendor Management Scenarios *(UPDATED)*:
    Base Vendor Coordinator Designation:
      - vendor.communicate: Basic vendor communication
      - vendor.performance_view: View vendor performance
      - contract.read: Read contract details
      - vendor_relationship.view: View vendor relationships

    Enhanced Vendor Hierarchy Manager:
      Additional Permissions:
        - vendor_relationship.create: Create vendor relationships
        - vendor_relationship.hierarchy_manage: Manage multi-level hierarchies
        - vendor_relationship.subcontractor_create: Create subcontractor relationships
        - vendor_relationship.revenue_share_configure: Configure revenue sharing
        - vendor_relationship.hierarchy_view: View complete vendor hierarchies

    Cross-Tenant Vendor Manager:
      Additional Permissions:
        - vendor_relationship.cross_tenant_create: Create cross-tenant relationships
        - vendor_relationship.corporate_approve: Approve corporate-to-corporate relationships
        - vendor_relationship.multi_client_manage: Manage multi-client vendor operations
        - vendor_relationship.strategic_partnership: Manage strategic partnerships

    Senior Vendor Manager:
      Additional Permissions:
        - contract.negotiate: Negotiate contract terms
        - vendor.approve: Approve new vendor applications
        - payment.authorize: Authorize vendor payments
        - vendor_relationship.hierarchy_approve: Approve vendor hierarchies
        - vendor_relationship.revenue_share_approve: Approve revenue sharing models

    Vendor Network Analyst:
      Additional Permissions:
        - vendor_relationship.analytics_view: View vendor network analytics
        - vendor_relationship.revenue_tracking: Track revenue across hierarchies
        - vendor_relationship.performance_aggregate: Aggregate performance across levels
        - vendor_relationship.network_optimization: Optimize vendor networks

    Vendor Support Coordinator:
      Additional Permissions:
        - vendor.training: Provide vendor training
        - vendor.issue_escalate: Escalate vendor issues
        - vendor_relationship.communication_coordinate: Coordinate cross-hierarchy communication
      Restricted Permissions:
        - vendor.performance_view: LIMITED to assigned vendors only
        - vendor_relationship.view: LIMITED to assigned vendor relationships only
```

---

## RBAC Data Structure

### Permission Management Architecture

```yaml
RBAC Components:
  Base Designation Permissions:
    - Default permission set for designation holders
    - Inherited by all users with that designation
    - Tenant-defined and customizable
    - Foundation for user access control

  User Permission Overrides:
    - Individual customizations per user
    - Can add permissions (grant additional access)
    - Can restrict permissions (remove specific access)
    - Can modify permission scope (geographic, functional)

  Permission Types:
    System Permissions:
      - Platform-level access control
      - Tenant management capabilities
      - System administration functions

    Business Permissions:
      - Feature-specific access control
      - Operation-level permissions (CRUD)
      - Workflow-specific permissions
      - Integration permissions

    Data Permissions:
      - Entity-level access control
      - Field-level data access
      - Record-level security
      - Scope-based data filtering

  Permission Scopes:
    Geographic Scope:
      - Circle-specific access
      - Region-based permissions
      - Site-level access control
      - Location-based restrictions

    Functional Scope:
      - Department-specific access
      - Project-based permissions
      - Team-level access control
      - Role-specific functionality

    Temporal Scope:
      - Time-based access control
      - Business hours restrictions
      - Temporary assignments
      - Scheduled permissions

    Conditional Scope:
      - Context-dependent access
      - Approval-based permissions
      - Escalation-triggered access
      - Emergency permissions
```

### Permission Hierarchy and Inheritance

````yaml
Permission Resolution Order:
  1. System-Level Permissions:
    - Super Admin: Full platform access
    - System roles: Platform management
    - Override all other permissions

  2. Designation-Level Permissions:
    - Base permissions from designation
    - Inherited by all designation holders
    - Tenant-configured permission sets
    - Default access patterns

  3. User-Level Additions:
    - Additional permissions granted to user
    - Extend beyond designation permissions
    - Project-specific access grants
    - Temporary permission assignments

  4. User-Level Restrictions:
    - Permissions explicitly denied to user
    - Override designation permissions
    - Security-based restrictions
    - Compliance-required limitations

  5. Scope-Based Filtering:
    - Geographic scope limitations
    - Functional scope restrictions
    - Time-based access control
    - Conditional access requirements

Permission Calculation Formula: Effective_Permissions = (
  Designation_Permissions
  + User_Additional_Permissions
  - User_Restricted_Permissions
  ) filtered by (
  Geographic_Scope AND
  Functional_Scope AND
  Temporal_Scope AND
  Conditional_Requirements
  )

### Permission Resolution Implementation Guide

#### Conflict Resolution Rules

```yaml
Permission Conflict Resolution:
  1. Restriction Override Priority:
    - User-level restrictions ALWAYS override additions
    - Mandatory designation permissions cannot be restricted
    - System-level permissions override all others
    - Security restrictions have highest priority

  2. Scope Intersection Logic:
    - Geographic Scope: User must have access to ALL required geographic areas
    - Functional Scope: User must have access to ALL required functional areas
    - Temporal Scope: Current time must fall within ALL active time windows
    - Conditional Scope: ALL conditions must be satisfied

  3. Permission Level Precedence:
    - 'denied' overrides 'granted'
    - 'conditional' requires additional validation
    - 'granted' is default positive permission
    - Missing permission defaults to 'denied'

  4. Error Handling:
    - Invalid permission configurations default to 'denied'
    - Circular scope references resolved by denying access
    - Expired permissions automatically treated as 'denied'
    - Malformed scope data defaults to empty scope (deny all)
```

#### Performance Optimization

```yaml
Permission Caching Strategy:
  1. Redis Cache Layers:
    - User permission cache: 5 minutes TTL
    - Designation permission cache: 15 minutes TTL
    - Permission registry cache: 60 minutes TTL
    - Scope validation cache: 2 minutes TTL

  2. Cache Invalidation:
    - User-specific: Invalidate on user permission changes
    - Designation-specific: Invalidate on designation changes
    - Global: Invalidate on permission registry updates
    - Immediate: Critical security changes

  3. Query Optimization:
    - Precompute common permission sets
    - Batch permission resolution for multiple users
    - Use database indexes for permission lookups
    - Implement permission calculation background jobs

Real-Time Permission Calculation:
  Acceptable Performance Targets:
    - Simple permission check: < 50ms
    - Complex scope validation: < 200ms
    - Bulk permission verification: < 500ms
    - Emergency permission override: < 100ms

  Fallback Mechanisms:
    - Cache failure: Default to basic permissions
    - Database timeout: Return cached permissions
    - Calculation error: Log and deny access
    - System overload: Queue permission checks
```

#### Implementation Example

```python
class PermissionResolutionService:
    """High-performance permission resolution with error handling"""

    def get_effective_permissions(self, user_profile, resource=None, context=None):
        """Calculate effective permissions with comprehensive error handling"""
        try:
            # Check cache first
            cache_key = f"user_permissions:{user_profile.id}:{hash(str(context))}"
            cached_permissions = self.cache.get(cache_key)
            if cached_permissions:
                return cached_permissions

            # Step 1: Get designation permissions
            designation_permissions = self._get_designation_permissions(user_profile)

            # Step 2: Get user additional permissions
            additional_permissions = self._get_user_additional_permissions(user_profile)

            # Step 3: Get user restrictions
            restricted_permissions = self._get_user_restricted_permissions(user_profile)

            # Step 4: Calculate base permissions with conflict resolution
            base_permissions = self._resolve_permission_conflicts(
                designation_permissions,
                additional_permissions,
                restricted_permissions
            )

            # Step 5: Apply scope filtering
            effective_permissions = self._apply_scope_filtering(
                base_permissions,
                user_profile,
                resource,
                context
            )

            # Cache the result
            self.cache.set(cache_key, effective_permissions, timeout=300)  # 5 minutes

            return effective_permissions

        except Exception as e:
            # Log error and return safe default
            logger.error(f"Permission resolution error for user {user_profile.id}: {e}")
            return self._get_safe_default_permissions(user_profile)

    def _resolve_permission_conflicts(self, designation_perms, additional_perms, restricted_perms):
        """Resolve permission conflicts with clear precedence rules"""
        try:
            # Start with designation permissions
            effective_perms = set(designation_perms)

            # Add additional permissions (but not if restricted)
            for perm in additional_perms:
                if perm not in restricted_perms:
                    effective_perms.add(perm)

            # Remove restricted permissions (except mandatory ones)
            for perm in restricted_perms:
                if not self._is_mandatory_permission(perm):
                    effective_perms.discard(perm)

            return list(effective_perms)

        except Exception as e:
            logger.error(f"Permission conflict resolution error: {e}")
            # Return only designation permissions as safe fallback
            return designation_perms

    def _apply_scope_filtering(self, permissions, user_profile, resource, context):
        """Apply scope filtering with error handling"""
        try:
            filtered_permissions = []

            for permission in permissions:
                # Check if permission applies to current context
                if self._validate_geographic_scope(permission, user_profile, context):
                    if self._validate_functional_scope(permission, user_profile, context):
                        if self._validate_temporal_scope(permission, context):
                            if self._validate_conditional_scope(permission, user_profile, context):
                                filtered_permissions.append(permission)

            return filtered_permissions

        except Exception as e:
            logger.error(f"Scope filtering error: {e}")
            # Return basic permissions without scope restrictions
            return self._get_basic_permissions(user_profile)

    def _validate_geographic_scope(self, permission, user_profile, context):
        """Validate geographic scope with error handling"""
        try:
            # Get permission geographic scope
            perm_scope = self._get_permission_geographic_scope(permission)

            # Get user geographic scope
            user_scope = user_profile.geographic_scope or []

            # Get context geographic requirements
            context_scope = context.get('geographic_scope', []) if context else []

            # Check if user has access to all required geographic areas
            if context_scope:
                return all(area in user_scope for area in context_scope)

            # If no context scope, check if user has permission scope
            if perm_scope:
                return any(area in user_scope for area in perm_scope)

            # No scope restrictions
            return True

        except Exception as e:
            logger.warning(f"Geographic scope validation error: {e}")
            return False  # Deny on error

    def _validate_functional_scope(self, permission, user_profile, context):
        """Validate functional scope with error handling"""
        try:
            # Similar logic to geographic scope but for functional areas
            perm_scope = self._get_permission_functional_scope(permission)
            user_scope = user_profile.functional_scope or []
            context_scope = context.get('functional_scope', []) if context else []

            if context_scope:
                return all(func in user_scope for func in context_scope)

            if perm_scope:
                return any(func in user_scope for func in perm_scope)

            return True

        except Exception as e:
            logger.warning(f"Functional scope validation error: {e}")
            return False

    def _validate_temporal_scope(self, permission, context):
        """Validate temporal scope with error handling"""
        try:
            from datetime import datetime, timezone

            # Get current time
            now = datetime.now(timezone.utc)

            # Get permission temporal scope
            temporal_scope = self._get_permission_temporal_scope(permission)

            if not temporal_scope:
                return True  # No temporal restrictions

            # Check if current time falls within allowed windows
            for time_window in temporal_scope.get('time_windows', []):
                if self._time_in_window(now, time_window):
                    return True

            return len(temporal_scope.get('time_windows', [])) == 0

        except Exception as e:
            logger.warning(f"Temporal scope validation error: {e}")
            return True  # Allow on error for temporal scope

    def _validate_conditional_scope(self, permission, user_profile, context):
        """Validate conditional scope with error handling"""
        try:
            # Get permission conditions
            conditions = self._get_permission_conditions(permission)

            if not conditions:
                return True  # No conditions

            # Evaluate each condition
            for condition in conditions:
                if not self._evaluate_condition(condition, user_profile, context):
                    return False

            return True

        except Exception as e:
            logger.warning(f"Conditional scope validation error: {e}")
            return False  # Deny on error for conditions

    def _get_safe_default_permissions(self, user_profile):
        """Return safe default permissions for error cases"""
        # Return minimal permissions for user's tenant type
        if user_profile.tenant.tenant_type == 'Corporate':
            return ['platform.access', 'reports.view_basic']
        elif user_profile.tenant.tenant_type == 'Circle':
            return ['platform.access', 'projects.view', 'sites.view']
        elif user_profile.tenant.tenant_type == 'Vendor':
            return ['platform.access', 'tasks.view_assigned']
        else:
            return ['platform.access']  # Basic platform access only
```

#### Error Handling Best Practices

```yaml
Error Categories and Responses:
  1. Permission Configuration Errors:
    - Invalid permission codes: Log error, deny access
    - Malformed scope data: Log error, ignore scope
    - Circular dependencies: Log error, break loop, deny access
    - Missing permission definitions: Log error, deny access

  2. Performance Issues:
    - Database timeouts: Use cached permissions, log incident
    - Cache failures: Calculate permissions live, log incident
    - High CPU usage: Queue permission calculations, use defaults
    - Memory issues: Simplify permission calculations, alert admins

  3. Security Concerns:
    - Permission escalation attempts: Log security event, deny access
    - Invalid scope access: Log security event, restrict scope
    - Expired permissions: Automatically deny, notify user
    - Suspicious pattern detection: Flag for review, continue with restrictions

Monitoring and Alerting:
  - Permission resolution errors: Alert on >1% error rate
  - Performance degradation: Alert on >500ms average response time
  - Security violations: Immediate alert on any violation
  - Cache hit rate: Alert if <90% hit rate for user permissions
```

````

---

## Database Schema

### RBAC Management Tables

```sql
-- Permission Registry (Tenant-Defined)
CREATE TABLE permission_registry (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Permission Information
    permission_name VARCHAR(100) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    permission_category VARCHAR(50) NOT NULL,
    description TEXT,

    -- Permission Configuration
    permission_type VARCHAR(50) NOT NULL DEFAULT 'action',
    is_system_permission BOOLEAN DEFAULT FALSE,
    requires_scope BOOLEAN DEFAULT FALSE,
    is_delegatable BOOLEAN DEFAULT TRUE,
    risk_level VARCHAR(20) DEFAULT 'low',

    -- Permission Metadata
    resource_type VARCHAR(50), -- What resource this permission applies to
    action_type VARCHAR(50), -- What action this permission allows
    effect VARCHAR(20) DEFAULT 'allow', -- allow, deny

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_auditable BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, permission_code),
    CHECK (permission_type IN ('action', 'access', 'data', 'administrative', 'system')),
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    CHECK (effect IN ('allow', 'deny'))
);

-- Designation Base Permissions
CREATE TABLE designation_base_permissions (
    id BIGSERIAL PRIMARY KEY,
    designation_id BIGINT NOT NULL REFERENCES designations(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permission_registry(id) ON DELETE CASCADE,

    -- Permission Configuration
    permission_level VARCHAR(20) DEFAULT 'granted',
    scope_configuration JSONB DEFAULT '{}',
    conditions JSONB DEFAULT '{}',

    -- Permission Scope
    geographic_scope JSONB DEFAULT '[]', -- Geographic limitations
    functional_scope JSONB DEFAULT '[]', -- Functional limitations
    temporal_scope JSONB DEFAULT '{}', -- Time-based limitations

    -- Permission Metadata
    is_inherited BOOLEAN DEFAULT TRUE, -- Whether users inherit this permission
    is_mandatory BOOLEAN DEFAULT FALSE, -- Cannot be removed by user overrides
    priority_level INTEGER DEFAULT 0, -- For conflict resolution

    -- Audit Fields
    granted_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Constraints
    UNIQUE(designation_id, permission_id),
    CHECK (permission_level IN ('granted', 'denied', 'conditional'))
);

-- User Permission Overrides
CREATE TABLE user_permission_overrides (
    id BIGSERIAL PRIMARY KEY,
    user_profile_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permission_registry(id) ON DELETE CASCADE,

    -- Override Configuration
    override_type VARCHAR(20) NOT NULL, -- addition, restriction, modification
    permission_level VARCHAR(20) DEFAULT 'granted',
    override_reason VARCHAR(255),
    business_justification TEXT,

    -- Scope Configuration
    scope_override JSONB DEFAULT '{}',
    geographic_scope_override JSONB DEFAULT '[]',
    functional_scope_override JSONB DEFAULT '[]',
    temporal_scope_override JSONB DEFAULT '{}',

    -- Override Conditions
    conditions JSONB DEFAULT '{}',
    approval_required BOOLEAN DEFAULT FALSE,
    requires_mfa BOOLEAN DEFAULT FALSE,

    -- Time Constraints
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE,
    is_temporary BOOLEAN DEFAULT FALSE,
    auto_expire BOOLEAN DEFAULT FALSE,

    -- Approval Workflow
    approval_status VARCHAR(20) DEFAULT 'approved',
    approved_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Audit Fields
    granted_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Constraints
    UNIQUE(user_profile_id, permission_id, override_type),
    CHECK (override_type IN ('addition', 'restriction', 'modification', 'scope_change')),
    CHECK (permission_level IN ('granted', 'denied', 'conditional')),
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'expired'))
);

-- Permission Groups (for easier management)
CREATE TABLE permission_groups (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Group Information
    group_name VARCHAR(100) NOT NULL,
    group_code VARCHAR(50) NOT NULL,
    description TEXT,
    group_type VARCHAR(50) DEFAULT 'functional',

    -- Group Configuration
    is_system_group BOOLEAN DEFAULT FALSE,
    is_assignable BOOLEAN DEFAULT TRUE,
    auto_assign_conditions JSONB DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, group_code),
    CHECK (group_type IN ('functional', 'project', 'temporary', 'administrative'))
);

-- Permission Group Memberships
CREATE TABLE permission_group_permissions (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permission_registry(id) ON DELETE CASCADE,

    -- Permission Configuration in Group
    permission_level VARCHAR(20) DEFAULT 'granted',
    scope_configuration JSONB DEFAULT '{}',
    is_mandatory BOOLEAN DEFAULT FALSE,

    -- Audit Fields
    added_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE(group_id, permission_id)
);

-- User Permission Group Assignments
CREATE TABLE user_permission_group_assignments (
    id BIGSERIAL PRIMARY KEY,
    user_profile_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,

    -- Assignment Configuration
    assignment_reason VARCHAR(255),
    scope_override JSONB DEFAULT '{}',

    -- Time Constraints
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_to TIMESTAMP WITH TIME ZONE,
    is_temporary BOOLEAN DEFAULT FALSE,

    -- Approval
    assigned_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_profile_id, group_id)
);

-- Permission Audit Trail
CREATE TABLE permission_audit_trail (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Audit Information
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- user, designation, group
    entity_id BIGINT NOT NULL,
    permission_id BIGINT REFERENCES permission_registry(id) ON DELETE SET NULL,

    -- Change Details
    old_value JSONB,
    new_value JSONB,
    change_reason VARCHAR(255),
    business_context TEXT,

    -- Actor Information
    performed_by INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,

    -- Additional Context
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    additional_context JSONB DEFAULT '{}',

    CHECK (action_type IN ('grant', 'revoke', 'modify', 'restrict', 'escalate', 'expire')),
    CHECK (entity_type IN ('user', 'designation', 'group', 'system'))
);

-- Effective Permissions Cache (for performance)
CREATE TABLE user_effective_permissions_cache (
    id BIGSERIAL PRIMARY KEY,
    user_profile_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

    -- Cached Permission Data
    effective_permissions JSONB NOT NULL,
    permission_summary JSONB DEFAULT '{}',
    scope_limitations JSONB DEFAULT '{}',

    -- Cache Metadata
    cache_version INTEGER DEFAULT 1,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Cache Dependencies
    designation_version INTEGER,
    override_version INTEGER,

    -- Status
    is_valid BOOLEAN DEFAULT TRUE,

    UNIQUE(user_profile_id)
);

-- Indexes for Performance
CREATE INDEX idx_permission_registry_tenant ON permission_registry(tenant_id);
CREATE INDEX idx_permission_registry_code ON permission_registry(tenant_id, permission_code);
CREATE INDEX idx_permission_registry_category ON permission_registry(permission_category);
CREATE INDEX idx_permission_registry_type ON permission_registry(permission_type);

CREATE INDEX idx_designation_permissions_designation ON designation_base_permissions(designation_id);
CREATE INDEX idx_designation_permissions_permission ON designation_base_permissions(permission_id);
CREATE INDEX idx_designation_permissions_active ON designation_base_permissions(is_active);

CREATE INDEX idx_user_overrides_user ON user_permission_overrides(user_profile_id);
CREATE INDEX idx_user_overrides_permission ON user_permission_overrides(permission_id);
CREATE INDEX idx_user_overrides_type ON user_permission_overrides(override_type);
CREATE INDEX idx_user_overrides_active ON user_permission_overrides(is_active);
CREATE INDEX idx_user_overrides_temporal ON user_permission_overrides(effective_from, effective_to);

CREATE INDEX idx_permission_groups_tenant ON permission_groups(tenant_id);
CREATE INDEX idx_permission_groups_code ON permission_groups(tenant_id, group_code);

CREATE INDEX idx_audit_trail_tenant ON permission_audit_trail(tenant_id);
CREATE INDEX idx_audit_trail_entity ON permission_audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_trail_performer ON permission_audit_trail(performed_by);
CREATE INDEX idx_audit_trail_timestamp ON permission_audit_trail(performed_at);

CREATE INDEX idx_effective_cache_user ON user_effective_permissions_cache(user_profile_id);
CREATE INDEX idx_effective_cache_valid ON user_effective_permissions_cache(is_valid);
CREATE INDEX idx_effective_cache_expires ON user_effective_permissions_cache(expires_at);
```

---

## API Endpoints

### RBAC Management APIs

```yaml
# Permission Registry Management
GET    /api/permissions/                       # List tenant permissions
POST   /api/permissions/                       # Create custom permission
GET    /api/permissions/{id}/                  # Get permission details
PUT    /api/permissions/{id}/                  # Update permission
DELETE /api/permissions/{id}/                  # Delete permission
GET    /api/permissions/categories/            # Get permission categories
GET    /api/permissions/system/                # Get system permissions

# Designation Permission Management
GET    /api/designations/{id}/permissions/     # Get designation permissions
POST   /api/designations/{id}/permissions/     # Grant permission to designation
PUT    /api/designations/{id}/permissions/{permission_id}/ # Update designation permission
DELETE /api/designations/{id}/permissions/{permission_id}/ # Revoke designation permission
POST   /api/designations/{id}/permissions/bulk/ # Bulk permission assignment

# User Permission Override Management
GET    /api/users/{id}/permissions/            # Get user effective permissions
GET    /api/users/{id}/permissions/base/       # Get base permissions from designations
GET    /api/users/{id}/permissions/overrides/  # Get user-specific overrides
POST   /api/users/{id}/permissions/grant/      # Grant additional permission to user
POST   /api/users/{id}/permissions/restrict/   # Restrict permission for user
PUT    /api/users/{id}/permissions/overrides/{override_id}/ # Update permission override
DELETE /api/users/{id}/permissions/overrides/{override_id}/ # Remove permission override

# Permission Group Management
GET    /api/permission-groups/                 # List permission groups
POST   /api/permission-groups/                 # Create permission group
GET    /api/permission-groups/{id}/            # Get group details
PUT    /api/permission-groups/{id}/            # Update permission group
DELETE /api/permission-groups/{id}/            # Delete permission group
GET    /api/permission-groups/{id}/permissions/ # Get group permissions
POST   /api/permission-groups/{id}/permissions/ # Add permission to group
DELETE /api/permission-groups/{id}/permissions/{permission_id}/ # Remove permission from group

# User Group Assignment
GET    /api/users/{id}/permission-groups/      # Get user's permission groups
POST   /api/users/{id}/permission-groups/      # Assign user to permission group
DELETE /api/users/{id}/permission-groups/{group_id}/ # Remove user from group

# Permission Validation and Checking
POST   /api/permissions/check/                 # Check if user has specific permission
POST   /api/permissions/validate/              # Validate permission assignment
GET    /api/permissions/conflicts/             # Check for permission conflicts
POST   /api/permissions/simulate/              # Simulate permission changes

# Permission Analysis and Reporting
GET    /api/permissions/matrix/                # Permission assignment matrix
GET    /api/permissions/usage-analytics/       # Permission usage analytics
GET    /api/permissions/access-patterns/       # User access pattern analysis
GET    /api/permissions/compliance-report/     # Permission compliance report
GET    /api/permissions/risk-assessment/       # Permission risk assessment

# Bulk Operations
POST   /api/permissions/bulk-grant/            # Bulk permission grants
POST   /api/permissions/bulk-revoke/           # Bulk permission revocations
POST   /api/permissions/bulk-transfer/         # Transfer permissions between users
POST   /api/permissions/bulk-cleanup/          # Clean up expired permissions

# Audit and History
GET    /api/permissions/audit-trail/           # Permission change audit trail
GET    /api/permissions/audit/{entity_type}/{entity_id}/ # Entity-specific audit trail
GET    /api/users/{id}/permission-history/     # User permission change history
GET    /api/designations/{id}/permission-history/ # Designation permission change history

# Emergency and Admin Operations
POST   /api/permissions/emergency-grant/       # Emergency permission grant
POST   /api/permissions/emergency-revoke/      # Emergency permission revocation
POST   /api/permissions/admin-override/        # Admin permission override
POST   /api/permissions/escalate/              # Escalate permission request
```

---

## Business Logic Services

### RBAC Management Service

```python
class RBACManagementService:
    """Core business logic for Role-Based Access Control"""

    def grant_user_additional_permission(self, user_profile_id, permission_code, override_data, granted_by):
        """Grant additional permission to user beyond their designation"""
        # Validate granting user has authority
        if not self.can_grant_permission(granted_by, permission_code):
            raise PermissionError("Insufficient authority to grant this permission")

        # Get permission and user
        permission = self.get_permission_by_code(permission_code, granted_by.user_profile.tenant_id)
        user_profile = UserProfile.objects.get(id=user_profile_id)

        # Check if user already has this permission from designation
        if self.user_has_permission_from_designation(user_profile, permission_code):
            raise ValidationError("User already has this permission from their designation")

        # Check for existing override
        existing_override = UserPermissionOverride.objects.filter(
            user_profile=user_profile,
            permission=permission,
            override_type='addition',
            is_active=True
        ).first()

        if existing_override:
            raise ValidationError("User already has additional grant for this permission")

        # Create permission override
        override = UserPermissionOverride.objects.create(
            user_profile=user_profile,
            permission=permission,
            override_type='addition',
            permission_level='granted',
            override_reason=override_data.get('reason'),
            business_justification=override_data.get('justification'),
            scope_override=override_data.get('scope_override', {}),
            geographic_scope_override=override_data.get('geographic_scope', []),
            functional_scope_override=override_data.get('functional_scope', []),
            temporal_scope_override=override_data.get('temporal_scope', {}),
            effective_from=override_data.get('effective_from', timezone.now()),
            effective_to=override_data.get('effective_to'),
            is_temporary=override_data.get('is_temporary', False),
            auto_expire=override_data.get('auto_expire', False),
            approval_required=override_data.get('approval_required', False),
            granted_by=granted_by
        )

        # Invalidate permission cache
        self.invalidate_user_permission_cache(user_profile_id)

        # Log audit trail
        self.log_permission_change(
            action_type='grant',
            entity_type='user',
            entity_id=user_profile_id,
            permission_id=permission.id,
            change_reason=override_data.get('reason'),
            performed_by=granted_by
        )

        return override

    def restrict_user_permission(self, user_profile_id, permission_code, restriction_data, restricted_by):
        """Restrict specific permission for user (even if they have it from designation)"""
        # Validate restricting user has authority
        if not self.can_restrict_permission(restricted_by, permission_code):
            raise PermissionError("Insufficient authority to restrict this permission")

        # Get permission and user
        permission = self.get_permission_by_code(permission_code, restricted_by.user_profile.tenant_id)
        user_profile = UserProfile.objects.get(id=user_profile_id)

        # Check if user has this permission (from designation or previous grant)
        if not self.user_has_permission(user_profile, permission_code):
            raise ValidationError("User does not have this permission to restrict")

        # Check for existing restriction
        existing_restriction = UserPermissionOverride.objects.filter(
            user_profile=user_profile,
            permission=permission,
            override_type='restriction',
            is_active=True
        ).first()

        if existing_restriction:
            raise ValidationError("User already has restriction for this permission")

        # Create permission restriction
        restriction = UserPermissionOverride.objects.create(
            user_profile=user_profile,
            permission=permission,
            override_type='restriction',
            permission_level='denied',
            override_reason=restriction_data.get('reason'),
            business_justification=restriction_data.get('justification'),
            scope_override=restriction_data.get('scope_override', {}),
            effective_from=restriction_data.get('effective_from', timezone.now()),
            effective_to=restriction_data.get('effective_to'),
            is_temporary=restriction_data.get('is_temporary', False),
            approval_required=restriction_data.get('approval_required', False),
            granted_by=restricted_by
        )

        # Invalidate permission cache
        self.invalidate_user_permission_cache(user_profile_id)

        # Log audit trail
        self.log_permission_change(
            action_type='restrict',
            entity_type='user',
            entity_id=user_profile_id,
            permission_id=permission.id,
            change_reason=restriction_data.get('reason'),
            performed_by=restricted_by
        )

        return restriction

    def calculate_user_effective_permissions(self, user_profile):
        """Calculate effective permissions for user with designation and overrides"""
        # Check cache first
        cached_permissions = self.get_cached_permissions(user_profile.id)
        if cached_permissions and cached_permissions['is_valid']:
            return cached_permissions['effective_permissions']

        # Get base permissions from designations
        designation_permissions = self.get_designation_permissions(user_profile)

        # Get user permission overrides
        user_overrides = self.get_user_permission_overrides(user_profile)

        # Get permission group assignments
        group_permissions = self.get_user_group_permissions(user_profile)

        # Calculate effective permissions
        effective_permissions = self.merge_permissions(
            designation_permissions,
            user_overrides,
            group_permissions
        )

        # Apply scope filtering
        effective_permissions = self.apply_scope_filtering(effective_permissions, user_profile)

        # Cache the result
        self.cache_user_permissions(user_profile.id, effective_permissions)

        return effective_permissions

    def get_designation_permissions(self, user_profile):
        """Get permissions from user's designations"""
        # Get active designation assignments
        assignments = UserDesignationAssignment.objects.filter(
            user_profile=user_profile,
            is_active=True,
            assignment_status='Active',
            effective_from__lte=date.today()
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=date.today())
        ).select_related('designation')

        all_permissions = {}

        for assignment in assignments:
            designation = assignment.designation

            # Get designation base permissions
            base_permissions = DesignationBasePermission.objects.filter(
                designation=designation,
                is_active=True,
                is_inherited=True
            ).select_related('permission')

            for base_perm in base_permissions:
                permission_code = base_perm.permission.permission_code

                # Build permission data
                perm_data = {
                    'permission_code': permission_code,
                    'permission_level': base_perm.permission_level,
                    'source': 'designation',
                    'source_id': designation.id,
                    'source_name': designation.designation_name,
                    'scope_configuration': base_perm.scope_configuration,
                    'geographic_scope': base_perm.geographic_scope,
                    'functional_scope': base_perm.functional_scope,
                    'temporal_scope': base_perm.temporal_scope,
                    'conditions': base_perm.conditions,
                    'is_mandatory': base_perm.is_mandatory,
                    'priority_level': base_perm.priority_level
                }

                # Apply assignment scope overrides
                if assignment.geographic_scope_override:
                    perm_data['geographic_scope'] = assignment.geographic_scope_override
                if assignment.functional_scope_override:
                    perm_data['functional_scope'] = assignment.functional_scope_override

                # Add or merge permission
                if permission_code not in all_permissions:
                    all_permissions[permission_code] = perm_data
                else:
                    # Merge permissions (take highest priority/level)
                    existing = all_permissions[permission_code]
                    if base_perm.priority_level > existing.get('priority_level', 0):
                        all_permissions[permission_code] = perm_data

        return all_permissions

    def get_user_permission_overrides(self, user_profile):
        """Get user-specific permission overrides"""
        overrides = UserPermissionOverride.objects.filter(
            user_profile=user_profile,
            is_active=True,
            approval_status='approved',
            effective_from__lte=timezone.now()
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=timezone.now())
        ).select_related('permission')

        override_permissions = {}

        for override in overrides:
            permission_code = override.permission.permission_code

            override_data = {
                'permission_code': permission_code,
                'override_type': override.override_type,
                'permission_level': override.permission_level,
                'source': 'user_override',
                'source_id': override.id,
                'override_reason': override.override_reason,
                'scope_override': override.scope_override,
                'geographic_scope_override': override.geographic_scope_override,
                'functional_scope_override': override.functional_scope_override,
                'temporal_scope_override': override.temporal_scope_override,
                'conditions': override.conditions,
                'is_temporary': override.is_temporary,
                'effective_from': override.effective_from,
                'effective_to': override.effective_to
            }

            if permission_code not in override_permissions:
                override_permissions[permission_code] = []
            override_permissions[permission_code].append(override_data)

        return override_permissions

    def merge_permissions(self, designation_permissions, user_overrides, group_permissions):
        """Merge permissions from different sources with proper precedence"""
        effective_permissions = {}

        # Start with designation permissions
        for perm_code, perm_data in designation_permissions.items():
            effective_permissions[perm_code] = perm_data.copy()

        # Add group permissions
        for perm_code, perm_data in group_permissions.items():
            if perm_code not in effective_permissions:
                effective_permissions[perm_code] = perm_data.copy()
            else:
                # Merge group permissions with designation permissions
                existing = effective_permissions[perm_code]
                if perm_data.get('priority_level', 0) > existing.get('priority_level', 0):
                    effective_permissions[perm_code] = perm_data.copy()

        # Apply user overrides
        for perm_code, override_list in user_overrides.items():
            for override in override_list:
                if override['override_type'] == 'addition':
                    # Add new permission or modify existing
                    effective_permissions[perm_code] = {
                        'permission_code': perm_code,
                        'permission_level': override['permission_level'],
                        'source': 'user_addition',
                        'source_details': override,
                        'geographic_scope': override.get('geographic_scope_override', []),
                        'functional_scope': override.get('functional_scope_override', []),
                        'temporal_scope': override.get('temporal_scope_override', {}),
                        'conditions': override.get('conditions', {}),
                        'is_temporary': override.get('is_temporary', False)
                    }

                elif override['override_type'] == 'restriction':
                    # Remove or restrict existing permission
                    if perm_code in effective_permissions:
                        if override['permission_level'] == 'denied':
                            # Complete denial - remove permission
                            del effective_permissions[perm_code]
                        else:
                            # Partial restriction - modify scope
                            existing = effective_permissions[perm_code]
                            existing['restriction_applied'] = True
                            existing['restriction_details'] = override
                            # Apply scope restrictions
                            if override.get('scope_override'):
                                existing.update(override['scope_override'])

                elif override['override_type'] == 'modification':
                    # Modify existing permission scope/conditions
                    if perm_code in effective_permissions:
                        existing = effective_permissions[perm_code]
                        existing['modified_by_override'] = True
                        existing['modification_details'] = override
                        # Apply modifications
                        if override.get('geographic_scope_override'):
                            existing['geographic_scope'] = override['geographic_scope_override']
                        if override.get('functional_scope_override'):
                            existing['functional_scope'] = override['functional_scope_override']
                        if override.get('temporal_scope_override'):
                            existing['temporal_scope'].update(override['temporal_scope_override'])

        return effective_permissions

    def check_user_permission(self, user_profile, permission_code, context=None):
        """Check if user has specific permission with optional context"""
        effective_permissions = self.calculate_user_effective_permissions(user_profile)

        if permission_code not in effective_permissions:
            return False

        permission_data = effective_permissions[permission_code]

        # Check basic permission level
        if permission_data.get('permission_level') == 'denied':
            return False

        # Apply context-based filtering if provided
        if context:
            # Check geographic scope
            if context.get('geographic_location'):
                allowed_geo = permission_data.get('geographic_scope', [])
                if allowed_geo and context['geographic_location'] not in allowed_geo:
                    return False

            # Check functional scope
            if context.get('functional_area'):
                allowed_func = permission_data.get('functional_scope', [])
                if allowed_func and context['functional_area'] not in allowed_func:
                    return False

            # Check temporal constraints
            temporal_scope = permission_data.get('temporal_scope', {})
            if temporal_scope:
                current_time = timezone.now()

                # Check time of day restrictions
                if 'allowed_hours' in temporal_scope:
                    current_hour = current_time.hour
                    allowed_hours = temporal_scope['allowed_hours']
                    if current_hour < allowed_hours.get('start', 0) or current_hour > allowed_hours.get('end', 23):
                        return False

                # Check day of week restrictions
                if 'allowed_days' in temporal_scope:
                    current_day = current_time.weekday()  # 0=Monday, 6=Sunday
                    allowed_days = temporal_scope['allowed_days']
                    if current_day not in allowed_days:
                        return False

            # Check conditional requirements
            conditions = permission_data.get('conditions', {})
            if conditions:
                if not self.evaluate_permission_conditions(conditions, context):
                    return False

        return True

    def evaluate_permission_conditions(self, conditions, context):
        """Evaluate conditional permission requirements"""
        for condition_type, condition_value in conditions.items():
            if condition_type == 'requires_approval':
                # Check if required approval is present in context
                if condition_value and not context.get('has_approval'):
                    return False

            elif condition_type == 'requires_mfa':
                # Check if MFA is completed
                if condition_value and not context.get('mfa_completed'):
                    return False

            elif condition_type == 'ip_restriction':
                # Check IP address restrictions
                allowed_ips = condition_value
                current_ip = context.get('ip_address')
                if current_ip and current_ip not in allowed_ips:
                    return False

            elif condition_type == 'project_context':
                # Check project-specific requirements
                required_project = condition_value
                current_project = context.get('project_id')
                if required_project and current_project != required_project:
                    return False

        return True

    def grant_designation_permission(self, designation_id, permission_code, permission_data, granted_by):
        """Grant permission to designation (affects all users with that designation)"""
        # Validate granting authority
        if not self.can_manage_designation_permissions(granted_by):
            raise PermissionError("Insufficient authority to manage designation permissions")

        # Get designation and permission
        designation = Designation.objects.get(id=designation_id)
        permission = self.get_permission_by_code(permission_code, designation.tenant_id)

        # Check for existing permission
        existing_permission = DesignationBasePermission.objects.filter(
            designation=designation,
            permission=permission,
            is_active=True
        ).first()

        if existing_permission:
            raise ValidationError("Designation already has this permission")

        # Create designation permission
        designation_permission = DesignationBasePermission.objects.create(
            designation=designation,
            permission=permission,
            permission_level=permission_data.get('permission_level', 'granted'),
            scope_configuration=permission_data.get('scope_configuration', {}),
            conditions=permission_data.get('conditions', {}),
            geographic_scope=permission_data.get('geographic_scope', []),
            functional_scope=permission_data.get('functional_scope', []),
            temporal_scope=permission_data.get('temporal_scope', {}),
            is_inherited=permission_data.get('is_inherited', True),
            is_mandatory=permission_data.get('is_mandatory', False),
            priority_level=permission_data.get('priority_level', 0),
            granted_by=granted_by
        )

        # Invalidate cache for all users with this designation
        self.invalidate_designation_users_cache(designation_id)

        # Log audit trail
        self.log_permission_change(
            action_type='grant',
            entity_type='designation',
            entity_id=designation_id,
            permission_id=permission.id,
            change_reason=permission_data.get('reason'),
            performed_by=granted_by
        )

        return designation_permission

    def create_permission_group(self, tenant_id, group_data, created_by):
        """Create permission group for easier permission management"""
        group = PermissionGroup.objects.create(
            tenant_id=tenant_id,
            group_name=group_data['group_name'],
            group_code=group_data['group_code'],
            description=group_data.get('description'),
            group_type=group_data.get('group_type', 'functional'),
            is_assignable=group_data.get('is_assignable', True),
            auto_assign_conditions=group_data.get('auto_assign_conditions', {}),
            created_by=created_by
        )

        # Add permissions to group if specified
        if group_data.get('permissions'):
            for perm_code in group_data['permissions']:
                permission = self.get_permission_by_code(perm_code, tenant_id)
                PermissionGroupPermission.objects.create(
                    group=group,
                    permission=permission,
                    permission_level='granted',
                    added_by=created_by
                )

        return group

    def assign_user_to_permission_group(self, user_profile_id, group_id, assignment_data, assigned_by):
        """Assign user to permission group"""
        user_profile = UserProfile.objects.get(id=user_profile_id)
        group = PermissionGroup.objects.get(id=group_id)

        # Validate assignment authority
        if not self.can_assign_permission_groups(assigned_by):
            raise PermissionError("Insufficient authority to assign permission groups")

        # Check for existing assignment
        existing_assignment = UserPermissionGroupAssignment.objects.filter(
            user_profile=user_profile,
            group=group,
            is_active=True
        ).first()

        if existing_assignment:
            raise ValidationError("User is already assigned to this permission group")

        # Create assignment
        assignment = UserPermissionGroupAssignment.objects.create(
            user_profile=user_profile,
            group=group,
            assignment_reason=assignment_data.get('reason'),
            scope_override=assignment_data.get('scope_override', {}),
            effective_from=assignment_data.get('effective_from', timezone.now()),
            effective_to=assignment_data.get('effective_to'),
            is_temporary=assignment_data.get('is_temporary', False),
            assigned_by=assigned_by
        )

        # Invalidate user permission cache
        self.invalidate_user_permission_cache(user_profile_id)

        return assignment

    def get_permission_by_code(self, permission_code, tenant_id):
        """Get permission by code within tenant"""
        return PermissionRegistry.objects.get(
            permission_code=permission_code,
            tenant_id=tenant_id,
            is_active=True
        )

    def invalidate_user_permission_cache(self, user_profile_id):
        """Invalidate cached permissions for user"""
        UserEffectivePermissionsCache.objects.filter(
            user_profile_id=user_profile_id
        ).update(is_valid=False)

    def invalidate_designation_users_cache(self, designation_id):
        """Invalidate cache for all users with specific designation"""
        user_profiles = UserDesignationAssignment.objects.filter(
            designation_id=designation_id,
            is_active=True
        ).values_list('user_profile_id', flat=True)

        UserEffectivePermissionsCache.objects.filter(
            user_profile_id__in=user_profiles
        ).update(is_valid=False)

    def cache_user_permissions(self, user_profile_id, effective_permissions):
        """Cache calculated permissions for performance"""
        cache_data = {
            'effective_permissions': effective_permissions,
            'permission_summary': self.create_permission_summary(effective_permissions),
            'calculated_at': timezone.now(),
            'expires_at': timezone.now() + timedelta(hours=1),
            'is_valid': True
        }

        UserEffectivePermissionsCache.objects.update_or_create(
            user_profile_id=user_profile_id,
            defaults=cache_data
        )

    def log_permission_change(self, action_type, entity_type, entity_id, permission_id, change_reason, performed_by):
        """Log permission changes for audit trail"""
        PermissionAuditTrail.objects.create(
            tenant_id=performed_by.user_profile.tenant_id,
            action_type=action_type,
            entity_type=entity_type,
            entity_id=entity_id,
            permission_id=permission_id,
            change_reason=change_reason,
            performed_by=performed_by
        )

    # Permission check methods
    def can_grant_permission(self, user, permission_code):
        """Check if user can grant specific permission"""
        return self.check_user_permission(user.user_profile, 'permission.grant') or \
               self.check_user_permission(user.user_profile, f'permission.grant.{permission_code}')

    def can_restrict_permission(self, user, permission_code):
        """Check if user can restrict specific permission"""
        return self.check_user_permission(user.user_profile, 'permission.restrict') or \
               self.check_user_permission(user.user_profile, f'permission.restrict.{permission_code}')

    def can_manage_designation_permissions(self, user):
        """Check if user can manage designation permissions"""
        return self.check_user_permission(user.user_profile, 'designation.manage_permissions')

    def can_assign_permission_groups(self, user):
        """Check if user can assign permission groups"""
        return self.check_user_permission(user.user_profile, 'permission_group.assign')
```

---

## Frontend Components

### RBAC Management Interface

```typescript
// RBAC Types
interface Permission {
  id: number;
  tenant_id: string;
  permission_name: string;
  permission_code: string;
  permission_category: string;
  description?: string;
  permission_type: "action" | "access" | "data" | "administrative" | "system";
  is_system_permission: boolean;
  requires_scope: boolean;
  is_delegatable: boolean;
  risk_level: "low" | "medium" | "high" | "critical";
  resource_type?: string;
  action_type?: string;
  effect: "allow" | "deny";
  is_active: boolean;
  is_auditable: boolean;
}

interface UserPermissionOverride {
  id: number;
  user_profile_id: number;
  permission_id: number;
  override_type: "addition" | "restriction" | "modification" | "scope_change";
  permission_level: "granted" | "denied" | "conditional";
  override_reason?: string;
  business_justification?: string;
  scope_override: Record<string, any>;
  geographic_scope_override: string[];
  functional_scope_override: string[];
  temporal_scope_override: Record<string, any>;
  conditions: Record<string, any>;
  approval_required: boolean;
  requires_mfa: boolean;
  effective_from: string;
  effective_to?: string;
  is_temporary: boolean;
  auto_expire: boolean;
  approval_status: "pending" | "approved" | "rejected" | "expired";
  is_active: boolean;
}

interface EffectivePermission {
  permission_code: string;
  permission_level: string;
  source: "designation" | "user_override" | "group" | "user_addition";
  source_id: number;
  source_name?: string;
  geographic_scope: string[];
  functional_scope: string[];
  temporal_scope: Record<string, any>;
  conditions: Record<string, any>;
  is_temporary: boolean;
  restriction_applied?: boolean;
  modification_details?: any;
}

interface PermissionGroup {
  id: number;
  tenant_id: string;
  group_name: string;
  group_code: string;
  description?: string;
  group_type: "functional" | "project" | "temporary" | "administrative";
  is_system_group: boolean;
  is_assignable: boolean;
  auto_assign_conditions: Record<string, any>;
  is_active: boolean;
  permissions: Permission[];
}

// RBAC Management Hook
export const useRBACManagement = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [userPermissions, setUserPermissions] = useState<Record<number, EffectivePermission[]>>({});
  const [designationPermissions, setDesignationPermissions] = useState<Record<number, Permission[]>>({});
  const [loading, setLoading] = useState(false);

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rbacAPI.getPermissions();
      setPermissions(data);
      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserEffectivePermissions = useCallback(async (userId: number) => {
    try {
      const data = await rbacAPI.getUserEffectivePermissions(userId);
      setUserPermissions((prev) => ({ ...prev, [userId]: data }));
      return data;
    } catch (error) {
      throw error;
    }
  }, []);

  const loadDesignationPermissions = useCallback(async (designationId: number) => {
    try {
      const data = await rbacAPI.getDesignationPermissions(designationId);
      setDesignationPermissions((prev) => ({ ...prev, [designationId]: data }));
      return data;
    } catch (error) {
      throw error;
    }
  }, []);

  const grantUserAdditionalPermission = useCallback(
    async (userId: number, permissionCode: string, overrideData: Partial<UserPermissionOverride>) => {
      try {
        const result = await rbacAPI.grantUserPermission(userId, permissionCode, overrideData);
        await loadUserEffectivePermissions(userId); // Refresh user permissions
        return result;
      } catch (error) {
        throw error;
      }
    },
    [loadUserEffectivePermissions]
  );

  const restrictUserPermission = useCallback(
    async (userId: number, permissionCode: string, restrictionData: Partial<UserPermissionOverride>) => {
      try {
        const result = await rbacAPI.restrictUserPermission(userId, permissionCode, restrictionData);
        await loadUserEffectivePermissions(userId); // Refresh user permissions
        return result;
      } catch (error) {
        throw error;
      }
    },
    [loadUserEffectivePermissions]
  );

  const grantDesignationPermission = useCallback(
    async (designationId: number, permissionCode: string, permissionData: any) => {
      try {
        const result = await rbacAPI.grantDesignationPermission(designationId, permissionCode, permissionData);
        await loadDesignationPermissions(designationId); // Refresh designation permissions
        return result;
      } catch (error) {
        throw error;
      }
    },
    [loadDesignationPermissions]
  );

  const revokeDesignationPermission = useCallback(
    async (designationId: number, permissionId: number) => {
      try {
        await rbacAPI.revokeDesignationPermission(designationId, permissionId);
        await loadDesignationPermissions(designationId); // Refresh designation permissions
      } catch (error) {
        throw error;
      }
    },
    [loadDesignationPermissions]
  );

  const checkUserPermission = useCallback(async (userId: number, permissionCode: string, context?: Record<string, any>) => {
    try {
      const result = await rbacAPI.checkUserPermission(userId, permissionCode, context);
      return result.has_permission;
    } catch (error) {
      throw error;
    }
  }, []);

  const createPermissionGroup = useCallback(async (groupData: Partial<PermissionGroup>) => {
    try {
      const newGroup = await rbacAPI.createPermissionGroup(groupData);
      setPermissionGroups((prev) => [...prev, newGroup]);
      return newGroup;
    } catch (error) {
      throw error;
    }
  }, []);

  const assignUserToPermissionGroup = useCallback(
    async (userId: number, groupId: number, assignmentData: any) => {
      try {
        const result = await rbacAPI.assignUserToPermissionGroup(userId, groupId, assignmentData);
        await loadUserEffectivePermissions(userId); // Refresh user permissions
        return result;
      } catch (error) {
        throw error;
      }
    },
    [loadUserEffectivePermissions]
  );

  const getPermissionMatrix = useCallback(async () => {
    try {
      const matrix = await rbacAPI.getPermissionMatrix();
      return matrix;
    } catch (error) {
      throw error;
    }
  }, []);

  const getPermissionAuditTrail = useCallback(async (filters?: any) => {
    try {
      const auditTrail = await rbacAPI.getPermissionAuditTrail(filters);
      return auditTrail;
    } catch (error) {
      throw error;
    }
  }, []);

  const bulkGrantPermissions = useCallback(
    async (grantData: any) => {
      setLoading(true);
      try {
        const result = await rbacAPI.bulkGrantPermissions(grantData);
        // Refresh affected users/designations
        if (grantData.refresh_users) {
          for (const userId of grantData.refresh_users) {
            await loadUserEffectivePermissions(userId);
          }
        }
        return result;
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadUserEffectivePermissions]
  );

  const validatePermissionAssignment = useCallback(async (validationData: any) => {
    try {
      const result = await rbacAPI.validatePermissionAssignment(validationData);
      return result;
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    permissions,
    permissionGroups,
    userPermissions,
    designationPermissions,
    loading,
    loadPermissions,
    loadUserEffectivePermissions,
    loadDesignationPermissions,
    grantUserAdditionalPermission,
    restrictUserPermission,
    grantDesignationPermission,
    revokeDesignationPermission,
    checkUserPermission,
    createPermissionGroup,
    assignUserToPermissionGroup,
    getPermissionMatrix,
    getPermissionAuditTrail,
    bulkGrantPermissions,
    validatePermissionAssignment,
  };
};

// Permission Management Component Example
export const UserPermissionManagement: React.FC<{ userId: number }> = ({ userId }) => {
  const { userPermissions, loadUserEffectivePermissions, grantUserAdditionalPermission, restrictUserPermission, checkUserPermission } = useRBACManagement();

  const [selectedPermission, setSelectedPermission] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [businessJustification, setBusinessJustification] = useState<string>("");

  useEffect(() => {
    loadUserEffectivePermissions(userId);
  }, [userId, loadUserEffectivePermissions]);

  const handleGrantAdditionalPermission = async () => {
    try {
      await grantUserAdditionalPermission(userId, selectedPermission, {
        override_reason: overrideReason,
        business_justification: businessJustification,
        override_type: "addition",
        is_temporary: false,
      });

      // Show success message
      alert("Permission granted successfully");

      // Reset form
      setSelectedPermission("");
      setOverrideReason("");
      setBusinessJustification("");
    } catch (error) {
      alert("Failed to grant permission: " + error.message);
    }
  };

  const handleRestrictPermission = async () => {
    try {
      await restrictUserPermission(userId, selectedPermission, {
        override_reason: overrideReason,
        business_justification: businessJustification,
        override_type: "restriction",
      });

      alert("Permission restricted successfully");

      // Reset form
      setSelectedPermission("");
      setOverrideReason("");
      setBusinessJustification("");
    } catch (error) {
      alert("Failed to restrict permission: " + error.message);
    }
  };

  const effectivePermissions = userPermissions[userId] || [];

  return (
    <div className="user-permission-management">
      <h3>User Permission Management</h3>

      {/* Current Effective Permissions */}
      <div className="effective-permissions">
        <h4>Current Effective Permissions</h4>
        <div className="permission-list">
          {effectivePermissions.map((perm, index) => (
            <div key={index} className="permission-item">
              <span className="permission-code">{perm.permission_code}</span>
              <span className="permission-source">({perm.source})</span>
              {perm.restriction_applied && <span className="restriction-badge">Restricted</span>}
              {perm.is_temporary && <span className="temporary-badge">Temporary</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Grant Additional Permission */}
      <div className="grant-permission">
        <h4>Grant Additional Permission</h4>
        <input type="text" placeholder="Permission Code" value={selectedPermission} onChange={(e) => setSelectedPermission(e.target.value)} />
        <input type="text" placeholder="Override Reason" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
        <textarea placeholder="Business Justification" value={businessJustification} onChange={(e) => setBusinessJustification(e.target.value)} />
        <button onClick={handleGrantAdditionalPermission}>Grant Permission</button>
      </div>

      {/* Restrict Permission */}
      <div className="restrict-permission">
        <h4>Restrict Permission</h4>
        <button onClick={handleRestrictPermission}>Restrict Permission</button>
      </div>
    </div>
  );
};
```

---

## Integration Points

### 1. User Management Integration

```yaml
Permission Assignment During User Creation:
  - Users inherit base permissions from assigned designations
  - Additional permissions can be granted during user setup
  - Permission restrictions can be applied based on role requirements
  - Temporary permissions for project-specific access

User Permission Updates:
  - Real-time permission recalculation when designations change
  - Automatic cache invalidation for affected users
  - Audit trail for all permission modifications
  - Notification system for permission changes
```

### 2. Designation Management Integration

```yaml
Designation Permission Templates:
  - Base permission sets for common designations
  - Industry-specific permission templates
  - Customizable permission packages
  - Permission inheritance rules

Permission Propagation:
  - Changes to designation permissions affect all users
  - Selective permission inheritance controls
  - Override protection for critical permissions
  - Bulk permission updates for designations
```

---

## Implementation Roadmap

### Phase 1: Core RBAC Infrastructure (Weeks 1-2)

- Permission registry and management
- Basic designation permission system
- User permission override foundation
- Permission calculation engine

### Phase 2: Advanced Permission Features (Weeks 3-4)

- Permission groups and bulk management
- Scope-based access control
- Temporal and conditional permissions
- Permission validation and conflict detection

### Phase 3: User Interface and Experience (Weeks 5-6)

- RBAC management interfaces
- Permission matrix visualization
- Bulk permission operations
- Permission audit and reporting

### Phase 4: Integration and Optimization (Weeks 7-8)

- Performance optimization and caching
- Advanced analytics and reporting
- Integration with existing modules
- Security hardening and compliance

---

This RBAC specification provides the sophisticated permission management system needed to support scenarios like John Smith and Nancy Methew both being Project Managers but having different specific permissions, while maintaining organizational structure through designation-based base permissions.

_Last Updated: 2024-12-28_

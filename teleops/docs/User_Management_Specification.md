# Teleops User Management Specification

## Overview

The User Management module handles comprehensive user lifecycle management within the Teleops multi-tenant platform. This system provides tenant-specific user registration, authentication, profile management, role assignments, and access control with seamless integration to the designation management and role-based access control systems.

**Key Principle**: Tenants have complete autonomy to define their organizational structure. The system provides only one predefined role (Super Admin) and allows tenants to create any designations, assign them to any users, and structure their organization according to their specific business needs.

---

## Business Context

### User Management Philosophy

```yaml
Multi-Tenant User Management:
  Tenant Isolation:
    - Each tenant maintains independent user database
    - Complete data separation between tenants
    - Tenant-specific user policies and configurations
    - Flexible cross-tenant collaboration where needed

  Tenant-Driven Organization:
    - Tenants create their own designations and roles
    - Complete freedom in organizational structure design
    - No system-imposed user categories or hierarchies
    - Only Super Admin role is predefined by system

  Flexible Role-Based Access:
    - Users assigned to tenant-created designations
    - Custom permission sets defined by tenant
    - Multiple designation support per user
    - Dynamic permission calculation based on tenant's rules

  Comprehensive Lifecycle:
    - Multiple registration methods (admin-created, invited)
    - Email verification and account activation
    - Profile management and updates
    - Security and password management
    - Account deactivation and audit trails
```

### User Categories by Circle-Based Tenant Type

```yaml
Circle-Based User Management:
  Circle Tenant Users:
    - Users belong to specific circle tenants (Vodafone MPCG, Vodafone UPE)
    - Complete operational independence per circle
    - Circle-specific user policies and configurations
    - Circle-bound employee structures and teams
    - Cannot access other circles' operational data

  Corporate Tenant Users:
    - Users belong to corporate HQ tenant (Vodafone India HQ)
    - Special cross-circle access permissions for oversight
    - Consolidated reporting access across all corporate circles
    - Corporate-level policy management across circles
    - Can view aggregated data from all circles but not edit circle operations

  Vendor Tenant Users:
    - Users belong to vendor tenant (ABC Infrastructure)
    - Multi-circle relationship capabilities based on vendor-circle contracts
    - Circle-specific access and permissions per relationship
    - Independent vendor operations per circle
    - Access limited to circles where vendor has active relationships

Circle Independence Implementation:
  Circle Tenant Isolation:
    - Each circle maintains independent user database
    - Circle-specific designation management
    - Circle-bound role assignments and permissions
    - Independent billing and revenue tracking

  Corporate Oversight:
    - Corporate users access consolidated reporting
    - Cross-circle analytics and governance
    - Corporate-level policy enforcement
    - Circle performance monitoring

  Vendor Multi-Circle Access:
    - Vendor users access multiple circles independently
    - Circle-specific permissions and relationships
    - Separate performance tracking per circle
    - Independent billing per circle relationship

User Examples by Circle Tenant:
  Vodafone MPCG Circle Tenant:
    - Circle Head, Circle Managers, Circle Engineers
    - MPCG-specific operations and vendor management
    - Independent from Vodafone UPE circle operations
    - Circle billing: ₹1.5L/month independent revenue

  Vodafone UPE Circle Tenant:
    - UPE Circle Head, UPE Managers, UPE Engineers
    - UPE-specific operations and vendor management
    - Independent from MPCG circle operations
    - Circle billing: ₹2L/month independent revenue

  Vodafone India Corporate Tenant:
    - CTO, Directors, Corporate Managers
    - Consolidated oversight across MPCG + UPE + Gujarat
    - Corporate governance and policy management
    - Consolidated billing: ₹5.3L/month total revenue

  ABC Infrastructure Vendor Tenant:
    - Vendor Managers, Field Teams, Coordinators
    - Multi-circle relationships (MPCG + UPE independently)
    - Circle-specific project access and communication
    - Separate billing per circle: MPCG (₹50K) + UPE (₹50K)

Circle-Specific User Access Patterns:
  Circle Users (Isolated Access):
    - Access ONLY to their specific circle operations (Vodafone MPCG users cannot see UPE data)
    - Circle-specific project and task management within their circle only
    - Circle-bound vendor relationships (only vendors contracted to their circle)
    - Circle-specific reporting and analytics (no cross-circle visibility)

  Corporate Users (Cross-Circle Read Access):
    - Read-only aggregated view across all corporate circles
    - Corporate-level analytics and reporting (consolidated from all circles)
    - Cross-circle governance and oversight (viewing, not editing)
    - Corporate policy management (can set policies that apply to circles)
    - Cannot edit circle operational data directly

  Vendor Users (Multi-Circle Contracted Access):
    - Access to contracted circles only (ABC vendor sees only MPCG + UPE if contracted)
    - Circle-specific contact directories per relationship
    - Independent relationships per circle (MPCG data separate from UPE data)
    - Circle-specific performance tracking (separate metrics per circle)
```

---

## User Registration and Onboarding

### Registration Methods

#### 1. Admin-Created Users

```yaml
Admin User Creation:
  Use Cases:
    - New employee onboarding
    - Contractor assignments
    - Bulk user creation
    - System user setup
    - External collaborator access

  Process Flow:
    Step 1: Admin initiates user creation
    Step 2: User details and role assignment
    Step 3: Account creation and credential generation
    Step 4: Welcome email with login instructions
    Step 5: First-login password change requirement

  Required Information:
    Personal Details:
      - First Name, Last Name
      - Email Address (unique across platform)
      - Phone Number
      - Employee/Contractor ID (optional)

    Professional Information:
      - Custom Designation (selected from tenant's designations)
      - Department/Team (tenant-defined)
      - Reporting Manager (optional)
      - Start Date

    Access Configuration:
      - Role and Permission Level (based on tenant's designation system)
      - System Access Requirements
      - Mobile App Access (if needed)
      - Geographic/Functional Scope (tenant-defined)

  Flexible Role Assignment:
    - Tenant admin selects from available designations
    - No restrictions based on tenant type
    - Custom permissions can be added
    - Multiple designations per user allowed
    - Temporary or project-specific roles supported

  Immediate Activation:
    - Account active upon creation
    - No email verification required
    - Temporary password provided
    - Force password change on first login
```

#### 2. Invitation-Based Registration

```yaml
User Invitation Process:
  Use Cases:
    - Vendor user onboarding
    - External contractor access
    - Cross-tenant collaboration
    - Guest user access

  Invitation Flow:
    Step 1: Admin sends invitation with role definition
    Step 2: User receives invitation email with registration link
    Step 3: User completes registration form
    Step 4: Email verification process
    Step 5: Account activation and access granted

  Invitation Data:
    Basic Information:
      - User Name and Email
      - Intended Role/Designation
      - Access Level and Scope
      - Invitation Expiry (default: 7 days)

    Context Information:
      - Inviting Organization
      - Project/Work Context
      - Access Duration (if temporary)
      - Special Instructions

  Registration Completion:
    - User sets own password
    - Profile completion
    - Terms and conditions acceptance
    - Account activation notification
```

### Email Verification and Security

```yaml
Email Verification Process:
  Verification Requirements:
    - All new user accounts require email verification
    - Invitation-based users: mandatory verification
    - Admin-created users: optional verification

  Security Features:
    - Unique verification tokens
    - Time-limited validity (24 hours)
    - Secure verification links
    - Resend capability

  Failed Verification Handling:
    - Expired token detection
    - Account cleanup for unverified users (7 days)
    - Support escalation process
    - Manual verification override (admin)

Account Security:
  Password Policies:
    - Minimum 8 characters
    - Mixed case, numbers, special characters
    - Password history (prevent reuse of last 5)
    - Regular password change reminders

  Account Lockout:
    - 5 failed login attempts
    - 30-minute lockout period
    - Admin unlock capability
    - Security notification alerts
```

---

## User Profile Management

### Core Profile Structure

```yaml
User Profile Components:
  Identity Information:
    - Full Name and Display Name
    - Email Address (primary contact)
    - Phone Numbers (primary and secondary)
    - Employee/Contractor ID
    - Profile Photo

  Professional Details:
    - Job Title and Designation
    - Department and Team
    - Reporting Manager
    - Employment Start Date
    - Years of Experience

  Contact Information:
    - Business Address
    - Emergency Contact Details
    - Secondary Email
    - Preferred Communication Method

  System Access:
    - Last Login Time
    - Password Last Changed
    - Security Settings
    - API Access Keys (if applicable)

  Operational Context:
    - Geographic Scope (circles, regions)
    - Functional Responsibilities
    - Project Assignments
    - Team Memberships
```

### Profile Management Capabilities

```yaml
Self-Service Updates:
  Editable Fields:
    - Personal contact information
    - Profile photo
    - Emergency contact details
    - Password changes
    - Notification preferences

  Restricted Fields:
    - Employment details
    - Role assignments
    - Access permissions
    - System configuration

Admin-Managed Updates:
  Full Profile Control:
    - All personal and professional information
    - Role and designation changes
    - Access level modifications
    - Account status management

  Bulk Operations:
    - Mass profile updates
    - Role reassignments
    - Department transfers
    - Access provisioning

Approval Workflows:
  Change Requests:
    - Significant profile changes require approval
    - Manager review for role changes
    - HR approval for employment updates
    - Security review for access changes
```

---

## Access Control and Permissions

### Role-Based Access Control

```yaml
Designation Assignment:
  Primary Designation:
    - Every user has one primary designation
    - Determines base access permissions
    - Used for hierarchy and reporting
    - Cannot be removed, only changed

  Additional Roles:
    - Users can have multiple designations
    - Temporary or project-specific access
    - Cross-functional responsibilities
    - Time-limited assignments

Permission Calculation:
  Aggregated Permissions:
    - Combines permissions from all active designations
    - Highest permission level takes precedence
    - Additive for special capabilities
    - Context-aware access control

Access Scope:
  Geographic Scope:
    - Operations limited to assigned regions/circles
    - Cross-regional access for senior roles
    - Project-specific geographic permissions
    - Mobile app location-based access

  Functional Scope:
    - Department-specific access
    - Project-based permissions
    - Vendor relationship access
    - Reporting and analytics access

Multi-Tenant Access:
  Vendor Users:
    - Access to contracted client data
    - Project-specific information sharing
    - Communication with client contacts
    - Performance tracking and reporting

  Corporate Users:
    - Oversight across subsidiary operations
    - Consolidated reporting access
    - Cross-subsidiary coordination
    - Strategic planning information
```

### Team and Project Management

```yaml
Team Assignments:
  Team Membership:
    - Users belong to functional teams
    - Project-specific team assignments
    - Leadership roles within teams
    - Cross-team collaboration

  Team-Based Access:
    - Team-specific resource access
    - Collaborative workspaces
    - Team performance metrics
    - Shared project information

Project Assignments:
  Project Access:
    - Users assigned to specific projects
    - Role-based project permissions
    - Project lifecycle participation
    - Resource allocation and tracking

  Dynamic Assignment:
    - Temporary project access
    - Skills-based assignment
    - Workload balancing
    - Project completion cleanup
```

---

## Database Schema

### Core User Management Tables

```sql
-- Circle-Based User Profiles
CREATE TABLE user_profiles (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,

    -- Circle Context (for circle independence)
    circle_tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- Specific circle if user belongs to circle
    parent_corporate_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- Corporate parent for circle users

    -- Professional Information
    employee_id VARCHAR(50),
    job_title VARCHAR(100),
    department VARCHAR(100),
    date_of_joining DATE,
    years_of_experience INTEGER DEFAULT 0,
    reporting_manager_id INTEGER REFERENCES auth_user(id) ON DELETE SET NULL,

    -- Contact Information
    phone_number VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    business_address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    preferred_communication VARCHAR(50) DEFAULT 'Email',

    -- Profile Details
    profile_photo_url TEXT,
    date_of_birth DATE,
    skills JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',

    -- Circle-Specific Operational Context
    circle_scope JSONB DEFAULT '[]', -- specific circles user can access (for vendors)
    functional_scope JSONB DEFAULT '[]', -- departments/functions within circle
    operational_permissions JSONB DEFAULT '{}',

    -- Employment Status
    employment_type VARCHAR(50) DEFAULT 'Employee', -- Employee, Contractor, Consultant
    is_active BOOLEAN DEFAULT TRUE,
    activation_status VARCHAR(50) DEFAULT 'Pending',

    -- Security
    last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    password_expires_at TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,

    -- Audit Fields
    created_by INTEGER REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by INTEGER REFERENCES auth_user(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(tenant_id, user_id),
    UNIQUE(tenant_id, employee_id),
    CHECK (employment_type IN ('Employee', 'Contractor', 'Consultant', 'Vendor')),
    CHECK (activation_status IN ('Pending', 'Active', 'Suspended', 'Deactivated')),
    CHECK (preferred_communication IN ('Email', 'Phone', 'SMS', 'WhatsApp')),
    CHECK (login_attempts >= 0),

    -- Circle context validation
    CHECK (
        (tenant_id IN (SELECT id FROM tenants WHERE tenant_type = 'Circle') AND circle_tenant_id = tenant_id) OR
        (tenant_id IN (SELECT id FROM tenants WHERE tenant_type = 'Corporate') AND circle_tenant_id IS NULL) OR
        (tenant_id IN (SELECT id FROM tenants WHERE tenant_type = 'Vendor') AND circle_tenant_id IS NULL)
    )
);

-- User Registration Tracking
CREATE TABLE user_registrations (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES auth_user(id) ON DELETE CASCADE,

    -- Registration Method
    registration_type VARCHAR(50) NOT NULL, -- 'admin_created', 'invitation', 'self_service'
    registration_status VARCHAR(50) DEFAULT 'Pending',
    invitation_token VARCHAR(255),
    invited_by INTEGER REFERENCES auth_user(id),

    -- Verification
    email_verification_token VARCHAR(255),
    email_verification_expires_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    verification_attempts INTEGER DEFAULT 0,

    -- Approval Process
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by INTEGER REFERENCES auth_user(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Registration Data
    registration_data JSONB,
    welcome_email_sent BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    CHECK (registration_type IN ('admin_created', 'invitation', 'self_service')),
    CHECK (registration_status IN ('Pending', 'Email_Verified', 'Approved', 'Rejected', 'Completed')),
    CHECK (verification_attempts >= 0)
);

-- Teams Management
CREATE TABLE teams (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Team Information
    team_name VARCHAR(255) NOT NULL,
    team_code VARCHAR(100) NOT NULL,
    description TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, team_code)
);

-- Team Memberships
CREATE TABLE team_memberships (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_profile_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

    -- Membership Details
    membership_role VARCHAR(50) DEFAULT 'Member',

    -- Period
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    added_by INTEGER REFERENCES auth_user(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(team_id, user_profile_id),
    CHECK (membership_role IN ('Member', 'Senior_Member', 'Team_Lead', 'Deputy_Manager', 'Manager'))
);

-- Cross-Tenant Access (for vendor users)
CREATE TABLE cross_tenant_access (
    id BIGSERIAL PRIMARY KEY,
    user_profile_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    client_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Access Configuration
    access_type VARCHAR(50) NOT NULL,
    access_level VARCHAR(50) DEFAULT 'Basic',
    access_scope JSONB DEFAULT '{}',
    contact_directory_access BOOLEAN DEFAULT FALSE,
    communication_allowed BOOLEAN DEFAULT FALSE,

    -- Access Period
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    granted_by INTEGER REFERENCES auth_user(id),
    revoked_by INTEGER REFERENCES auth_user(id),
    revoked_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(user_profile_id, client_tenant_id),
    CHECK (access_type IN ('Project_Based', 'Contract_Based', 'Temporary', 'Ongoing')),
    CHECK (access_level IN ('Basic', 'Standard', 'Extended', 'Full'))
);

-- User Activity Logs
CREATE TABLE user_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,

    -- Activity Information
    activity_type VARCHAR(100) NOT NULL,
    activity_description TEXT NOT NULL,
    activity_context JSONB,

    -- System Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    geographic_location VARCHAR(100),

    -- Result
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,

    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CHECK (activity_type IN ('login', 'logout', 'password_change', 'profile_update',
           'permission_change', 'access_granted', 'access_revoked', 'team_assignment',
           'designation_change', 'data_access', 'api_access'))
);

-- Indexes
CREATE INDEX idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX idx_user_profiles_employee_id ON user_profiles(tenant_id, employee_id);
CREATE INDEX idx_user_profiles_manager ON user_profiles(reporting_manager_id);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX idx_user_profiles_geographic ON user_profiles USING GIN(geographic_scope);

CREATE INDEX idx_user_registrations_tenant ON user_registrations(tenant_id);
CREATE INDEX idx_user_registrations_status ON user_registrations(registration_status);
CREATE INDEX idx_user_registrations_token ON user_registrations(invitation_token);
CREATE INDEX idx_user_registrations_email_token ON user_registrations(email_verification_token);

CREATE INDEX idx_teams_tenant ON teams(tenant_id);
CREATE INDEX idx_teams_code ON teams(tenant_id, team_code);
CREATE INDEX idx_teams_leader ON teams(team_leader_id);
CREATE INDEX idx_teams_geographic ON teams USING GIN(geographic_scope);

CREATE INDEX idx_team_memberships_team ON team_memberships(team_id);
CREATE INDEX idx_team_memberships_user ON team_memberships(user_profile_id);
CREATE INDEX idx_team_memberships_active ON team_memberships(is_active);

CREATE INDEX idx_cross_tenant_access_user ON cross_tenant_access(user_profile_id);
CREATE INDEX idx_cross_tenant_access_client ON cross_tenant_access(client_tenant_id);
CREATE INDEX idx_cross_tenant_access_active ON cross_tenant_access(is_active);

CREATE INDEX idx_activity_logs_tenant ON user_activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_user ON user_activity_logs(user_id);
CREATE INDEX idx_activity_logs_type ON user_activity_logs(activity_type);
CREATE INDEX idx_activity_logs_timestamp ON user_activity_logs(timestamp);
```

---

## API Endpoints

### User Management APIs

```yaml
# User Registration & Authentication
POST   /api/users/register/                    # Self-registration
POST   /api/users/invite/                      # Admin invites user
POST   /api/users/verify-email/               # Email verification
POST   /api/users/resend-verification/        # Resend verification
GET    /api/users/registration-status/        # Check registration status

# User CRUD Operations
GET    /api/users/                           # List tenant users
POST   /api/users/                           # Create user (admin)
GET    /api/users/{id}/                      # Get user details
PUT    /api/users/{id}/                      # Update user
DELETE /api/users/{id}/                      # Deactivate user

# Profile Management
GET    /api/users/{id}/profile/              # Get user profile
PUT    /api/users/{id}/profile/              # Update user profile
POST   /api/users/{id}/profile/photo/        # Upload profile photo
DELETE /api/users/{id}/profile/photo/        # Remove profile photo
GET    /api/users/{id}/activity/             # Get user activity log

# Authentication & Security
POST   /api/users/{id}/change-password/      # Change password
POST   /api/users/{id}/reset-password/       # Reset password (admin)
POST   /api/users/{id}/unlock-account/       # Unlock account
GET    /api/users/{id}/security-status/      # Get security status
POST   /api/users/{id}/generate-api-key/     # Generate API access key

# User Status Management
POST   /api/users/{id}/activate/             # Activate user
POST   /api/users/{id}/deactivate/           # Deactivate user
POST   /api/users/{id}/suspend/              # Suspend user
POST   /api/users/{id}/reactivate/           # Reactivate user

# Designation & Permission Management (Tenant-Created Only)
GET    /api/users/{id}/designations/         # Get user designations
POST   /api/users/{id}/designations/         # Assign tenant-created designation
PUT    /api/users/{id}/designations/{designation_id}/ # Update designation assignment
DELETE /api/users/{id}/designations/{designation_id}/ # Remove designation

# Team Management
GET    /api/teams/                           # List teams
POST   /api/teams/                           # Create team
GET    /api/teams/{id}/                      # Get team details
PUT    /api/teams/{id}/                      # Update team
DELETE /api/teams/{id}/                      # Delete team
GET    /api/teams/{id}/members/              # Get team members
POST   /api/teams/{id}/members/              # Add team member
DELETE /api/teams/{id}/members/{user_id}/    # Remove team member

# Circle-Based Access APIs
GET    /api/circles/{circle_id}/users/       # Get circle-specific users
GET    /api/corporate/{corp_id}/circles/users/ # Get users across corporate circles
GET    /api/vendors/circle-access/           # Get vendor's circle access
POST   /api/vendors/circles/{circle_id}/communicate/ # Vendor communicate with circle
GET    /api/vendors/circles/{circle_id}/contacts/ # Get circle contacts for vendor

# Cross-Circle Vendor APIs
GET    /api/vendors/multi-circle/dashboard/  # Unified vendor dashboard across circles
GET    /api/vendors/multi-circle/performance/ # Performance metrics across circles
GET    /api/vendors/circle-relationships/    # All circle relationships
POST   /api/vendors/circle-relationships/{circle_id}/request-access/ # Request circle access

# Search & Filtering
GET    /api/users/search/                    # Search users (tenant-scoped)
GET    /api/users/by-designation/{designation_id}/ # Users by tenant-created designation
GET    /api/users/by-team/{team_id}/         # Users by team
GET    /api/users/by-manager/{manager_id}/   # Users by manager
GET    /api/users/by-scope/                  # Users by geographic/functional scope
GET    /api/users/inactive/                  # Inactive users

# Bulk Operations
POST   /api/users/bulk-create/               # Bulk user creation
POST   /api/users/bulk-update/               # Bulk user updates
POST   /api/users/bulk-invite/               # Bulk user invitations
POST   /api/users/bulk-deactivate/           # Bulk deactivation

# Reporting & Analytics
GET    /api/users/statistics/                # User statistics
GET    /api/users/activity-report/           # User activity report
GET    /api/users/login-analytics/           # Login analytics
GET    /api/users/export/                    # Export user data
```

---

## Business Logic Services

### User Management Service

```python
class UserManagementService:
    """Core business logic for user management"""

    def create_user_by_admin(self, tenant_id, user_data, creating_admin):
        """Create user account by admin"""
        # Validate admin permissions
        if not self.can_create_users(creating_admin):
            raise PermissionError("Insufficient permissions to create users")

        # Validate user data
        self.validate_user_data(user_data, tenant_id)

        # Generate secure temporary password
        temp_password = self.generate_secure_password()

        # Create Django user
        user = User.objects.create_user(
            username=user_data['email'],
            email=user_data['email'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            password=temp_password,
            is_active=True
        )

        # Create user profile
        user_profile = UserProfile.objects.create(
            tenant_id=tenant_id,
            user=user,
            employee_id=user_data['employee_id'],
            job_title=user_data.get('job_title'),
            department=user_data.get('department'),
            phone_number=user_data['phone_number'],
            date_of_joining=user_data.get('date_of_joining', date.today()),
            reporting_manager_id=user_data.get('reporting_manager_id'),
            geographic_scope=user_data.get('geographic_scope', []),
            functional_scope=user_data.get('functional_scope', []),
            employment_type=user_data.get('employment_type', 'Employee'),
            activation_status='Active',
            created_by=creating_admin
        )

        # Assign roles if specified
        if user_data.get('role_assignments'):
            self.assign_user_roles(user_profile, user_data['role_assignments'])

        # Add to teams if specified
        if user_data.get('team_assignments'):
            self.assign_user_teams(user_profile, user_data['team_assignments'])

        # Send welcome email with credentials
        self.send_welcome_email(user, temp_password)

        # Log creation activity
        self.log_activity(user, 'user_created', f'User created by {creating_admin.get_full_name()}')

        return user_profile

    def invite_user(self, tenant_id, invitation_data, inviting_admin):
        """Send user invitation"""
        # Validate invitation permissions
        if not self.can_invite_users(inviting_admin):
            raise PermissionError("Insufficient permissions to invite users")

        # Generate invitation token
        invitation_token = self.generate_invitation_token()

        # Create registration record
        registration = UserRegistration.objects.create(
            tenant_id=tenant_id,
            registration_type='invitation',
            invitation_token=invitation_token,
            invited_by=inviting_admin,
            registration_data=invitation_data,
            requires_approval=invitation_data.get('requires_approval', False)
        )

        # Send invitation email
        self.send_invitation_email(
            email=invitation_data['email'],
            name=invitation_data['name'],
            role=invitation_data.get('intended_role'),
            organization=inviting_admin.user_profile.tenant.organization_name,
            invitation_token=invitation_token,
            expires_in_days=7
        )

        # Log invitation activity
        self.log_activity(
            inviting_admin,
            'user_invited',
            f'User invited: {invitation_data["email"]}'
        )

        return registration

    def complete_invitation_registration(self, invitation_token, registration_data):
        """Complete user registration from invitation"""
        # Validate invitation token
        registration = UserRegistration.objects.filter(
            invitation_token=invitation_token,
            registration_status='Pending'
        ).first()

        if not registration:
            raise ValidationError("Invalid or expired invitation")

        # Create user account
        user = User.objects.create_user(
            username=registration_data['email'],
            email=registration_data['email'],
            first_name=registration_data['first_name'],
            last_name=registration_data['last_name'],
            password=registration_data['password'],
            is_active=False  # Will be activated after email verification
        )

        # Create user profile
        user_profile = UserProfile.objects.create(
            tenant_id=registration.tenant_id,
            user=user,
            phone_number=registration_data['phone_number'],
            employment_type=registration_data.get('employment_type', 'Contractor'),
            activation_status='Pending'
        )

        # Update registration record
        registration.user = user
        registration.registration_status = 'Email_Verified'
        registration.save()

        # Send email verification
        self.send_email_verification(user)

        return user_profile

    def assign_user_roles(self, user_profile, role_assignments):
        """Assign roles to user - tenant-defined designations only"""
        from .designation_management_service import DesignationManagementService
        designation_service = DesignationManagementService()

        for assignment in role_assignments:
            # Validate designation belongs to user's tenant
            if not self.validate_designation_ownership(assignment['designation_id'], user_profile.tenant_id):
                raise ValidationError("Designation does not belong to user's tenant")

            designation_service.assign_designation_to_user(
                user_profile.id,
                assignment['designation_id'],
                assignment.get('scope'),
                assignment.get('assigned_by')
            )

    def grant_circle_access(self, vendor_user_id, circle_tenant_id, access_config):
        """Grant vendor user access to specific circle tenant"""
        vendor_user = UserProfile.objects.get(id=vendor_user_id)

        # Validate vendor user and circle relationship
        if not self.validate_vendor_circle_relationship(vendor_user.tenant_id, circle_tenant_id):
            raise PermissionError("No valid relationship between vendor and circle")

        # Create circle access record
        access = CircleVendorAccess.objects.create(
            vendor_user_profile=vendor_user,
            circle_tenant_id=circle_tenant_id,
            access_type=access_config['access_type'],
            access_level=access_config['access_level'],
            circle_scope=access_config.get('scope', {}),
            contact_directory_access=access_config.get('contact_access', False),
            communication_allowed=access_config.get('communication', False),
            expires_at=access_config.get('expires_at'),
            granted_by=access_config['granted_by']
        )

        # Add circle to vendor user's circle scope
        if vendor_user.circle_scope is None:
            vendor_user.circle_scope = []

        circle_info = {
            'circle_tenant_id': str(circle_tenant_id),
            'access_level': access_config['access_level'],
            'granted_at': timezone.now().isoformat()
        }

        if circle_info not in vendor_user.circle_scope:
            vendor_user.circle_scope.append(circle_info)
            vendor_user.save()

        # Log access grant
        self.log_activity(
            vendor_user.user,
            'circle_access_granted',
            f'Circle access granted to {circle_tenant_id}'
        )

        return access

    def update_user_profile(self, user_id, profile_data, updating_user):
        """Update user profile"""
        user_profile = UserProfile.objects.get(user_id=user_id)

        # Check update permissions
        if not self.can_update_profile(updating_user, user_profile):
            raise PermissionError("Insufficient permissions to update profile")

        # Track changes for audit
        changes = []

        # Update allowed fields
        updatable_fields = [
            'phone_number', 'secondary_phone', 'business_address',
            'emergency_contact_name', 'emergency_contact_phone',
            'preferred_communication', 'skills', 'certifications'
        ]

        for field in updatable_fields:
            if field in profile_data:
                old_value = getattr(user_profile, field)
                new_value = profile_data[field]
                if old_value != new_value:
                    setattr(user_profile, field, new_value)
                    changes.append(f'{field}: {old_value} → {new_value}')

        # Update admin-only fields if user has permission
        if self.can_update_admin_fields(updating_user):
            admin_fields = [
                'job_title', 'department', 'reporting_manager_id',
                'geographic_scope', 'functional_scope', 'employment_type'
            ]

            for field in admin_fields:
                if field in profile_data:
                    old_value = getattr(user_profile, field)
                    new_value = profile_data[field]
                    if old_value != new_value:
                        setattr(user_profile, field, new_value)
                        changes.append(f'{field}: {old_value} → {new_value}')

        user_profile.updated_by = updating_user
        user_profile.save()

        # Log changes
        if changes:
            self.log_activity(
                user_profile.user,
                'profile_update',
                f'Profile updated: {", ".join(changes)}'
            )

        return user_profile

    def get_user_permissions(self, user_profile):
        """Get effective permissions for user with circle independence"""
        from .designation_management_service import DesignationManagementService
        designation_service = DesignationManagementService()

        # Get base permissions from designations
        permissions = designation_service.get_user_permissions(user_profile)

        # Add circle-specific scope
        permissions['circle_scope'] = user_profile.circle_scope or []
        permissions['functional_scope'] = user_profile.functional_scope or []

        # Circle independence context
        tenant = user_profile.tenant
        if tenant.tenant_type == 'Circle':
            # Circle users have access ONLY to their specific circle (isolated)
            permissions['circle_tenant_id'] = str(user_profile.circle_tenant_id)
            permissions['corporate_parent_id'] = str(user_profile.parent_corporate_id) if user_profile.parent_corporate_id else None
            permissions['access_scope'] = 'circle_only'
            permissions['can_edit_operations'] = True
            permissions['can_view_other_circles'] = False

        elif tenant.tenant_type == 'Corporate':
            # Corporate users have READ-ONLY consolidated access across all circles
            circle_tenants = Tenant.objects.filter(
                parent_tenant_id=tenant.id,
                tenant_type='Circle',
                is_active=True
            ).values_list('id', flat=True)
            permissions['managed_circles'] = [str(cid) for cid in circle_tenants]
            permissions['access_scope'] = 'corporate_consolidated'
            permissions['can_edit_operations'] = False  # Corporate cannot edit circle operations
            permissions['can_view_other_circles'] = True  # Corporate can view all circles
            permissions['access_level'] = 'read_only'

        elif tenant.tenant_type == 'Vendor':
            # Vendor users have multi-circle access based on ACTIVE contracts only
            circle_relationships = ClientVendorRelationship.objects.filter(
                vendor_tenant_id=tenant.id,
                is_active=True
            ).values_list('circle_tenant_id', flat=True)
            permissions['accessible_circles'] = [str(cid) for cid in circle_relationships]
            permissions['access_scope'] = 'multi_circle_vendor'
            permissions['can_edit_operations'] = True  # Vendor can edit in contracted circles
            permissions['can_view_other_circles'] = False  # Vendor cannot see non-contracted circles

        return permissions

    def get_circle_specific_permissions(self, user_profile, circle_tenant_id):
        """Get user permissions specific to a circle"""
        # Validate circle access
        if not self.can_access_circle(user_profile, circle_tenant_id):
            raise PermissionError("User does not have access to this circle")

        base_permissions = self.get_user_permissions(user_profile)

        # Add circle-specific context
        circle_permissions = base_permissions.copy()
        circle_permissions['current_circle_id'] = str(circle_tenant_id)

        # Get circle-specific vendor access if applicable
        if user_profile.tenant.tenant_type == 'Vendor':
            vendor_access = CircleVendorAccess.objects.filter(
                vendor_user_profile=user_profile,
                circle_tenant_id=circle_tenant_id,
                is_active=True
            ).first()

            if vendor_access:
                circle_permissions['circle_access_level'] = vendor_access.access_level
                circle_permissions['contact_directory_access'] = vendor_access.contact_directory_access
                circle_permissions['communication_allowed'] = vendor_access.communication_allowed
                circle_permissions['circle_scope'] = vendor_access.circle_scope

        return circle_permissions

    def can_access_circle(self, user_profile, circle_tenant_id):
        """Check if user can access specific circle"""
        tenant = user_profile.tenant

        if tenant.tenant_type == 'Circle':
            # Circle users can only access their own circle
            return str(user_profile.circle_tenant_id) == str(circle_tenant_id)

        elif tenant.tenant_type == 'Corporate':
            # Corporate users can access all their circles
            return Tenant.objects.filter(
                id=circle_tenant_id,
                parent_tenant_id=tenant.id,
                tenant_type='Circle'
            ).exists()

        elif tenant.tenant_type == 'Vendor':
            # Vendor users can access circles they have relationships with
            return ClientVendorRelationship.objects.filter(
                vendor_tenant_id=tenant.id,
                circle_tenant_id=circle_tenant_id,
                is_active=True
            ).exists()

        return False

    def log_activity(self, user, activity_type, description, context=None):
        """Log user activity"""
        UserActivityLog.objects.create(
            tenant_id=user.user_profile.tenant_id,
            user=user,
            activity_type=activity_type,
            activity_description=description,
            activity_context=context or {}
        )

    def validate_vendor_client_relationship(self, vendor_tenant_id, client_tenant_id):
        """Validate if vendor has relationship with client"""
        # Implementation depends on tenant relationship model
        # This would check circle-vendor relationships in the new architecture
        return True  # Placeholder

    def can_create_users(self, user):
        """Check if user can create other users"""
        permissions = self.get_user_permissions(user.user_profile)
        return 'user.create' in permissions.get('permissions', [])

    def can_invite_users(self, user):
        """Check if user can invite other users"""
        permissions = self.get_user_permissions(user.user_profile)
        return 'user.invite' in permissions.get('permissions', [])

    def can_update_profile(self, updating_user, target_profile):
        """Check if user can update another user's profile"""
        # Users can always update their own profile
        if updating_user.id == target_profile.user_id:
            return True

        # Check admin permissions
        permissions = self.get_user_permissions(updating_user.user_profile)
        return 'user.update' in permissions.get('permissions', [])

    def can_update_admin_fields(self, user):
        """Check if user can update admin-only fields"""
        permissions = self.get_user_permissions(user.user_profile)
        return 'user.admin_update' in permissions.get('permissions', [])

    def validate_designation_ownership(self, designation_id, tenant_id):
        """Validate that designation belongs to the tenant"""
        from .designation_management_service import Designation
        return Designation.objects.filter(
            id=designation_id,
            tenant_id=tenant_id,
            is_active=True
        ).exists()

    def create_super_admin_user(self, tenant_id, admin_data):
        """Create initial super admin user for new tenant"""
        # This is called during tenant onboarding
        user = User.objects.create_user(
            username=admin_data['email'],
            email=admin_data['email'],
            first_name=admin_data['first_name'],
            last_name=admin_data['last_name'],
            password=admin_data['password'],
            is_active=True
        )

        # Create user profile with super admin access
        user_profile = UserProfile.objects.create(
            tenant_id=tenant_id,
            user=user,
            employee_id=admin_data.get('employee_id', 'ADMIN001'),
            job_title='Super Administrator',
            phone_number=admin_data['phone_number'],
            employment_type='Employee',
            activation_status='Active'
        )

        # Assign super admin designation (created during tenant setup)
        super_admin_designation = self.get_or_create_super_admin_designation(tenant_id)
        self.assign_user_roles(user_profile, [{
            'designation_id': super_admin_designation.id,
            'assigned_by': None  # System assignment
        }])

        return user_profile

    def get_or_create_super_admin_designation(self, tenant_id):
        """Get or create super admin designation for tenant"""
        from .designation_management_service import DesignationManagementService
        designation_service = DesignationManagementService()

        # This creates the only predefined designation
        return designation_service.get_or_create_super_admin_designation(tenant_id)
```

---

## Frontend Components

### User Management Interface

```typescript
// User Management Types
interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
  user_profile: UserProfile;
}

interface UserProfile {
  id: number;
  tenant_id: string;
  circle_tenant_id?: string; // Specific circle for circle users
  parent_corporate_id?: string; // Corporate parent for circle users
  employee_id?: string;
  job_title?: string;
  department?: string;
  phone_number: string;
  secondary_phone?: string;
  business_address?: string;
  date_of_joining?: string;
  years_of_experience: number;
  reporting_manager_id?: number;
  employment_type: "Employee" | "Contractor" | "Consultant" | "Vendor";
  circle_scope: CircleAccess[]; // Circles user can access (for vendors)
  functional_scope: string[]; // Functions within circle
  activation_status: "Pending" | "Active" | "Suspended" | "Deactivated";
  is_active: boolean;
  profile_photo_url?: string;
  skills: string[];
  certifications: string[];
  last_login_ip?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  preferred_communication: "Email" | "Phone" | "SMS" | "WhatsApp";
}

interface CircleAccess {
  circle_tenant_id: string;
  circle_name: string;
  access_level: "Basic" | "Standard" | "Extended" | "Full";
  granted_at: string;
  expires_at?: string;
  contact_directory_access: boolean;
  communication_allowed: boolean;
}

interface CreateUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  employee_id?: string;
  job_title?: string;
  department?: string; // Circle-specific department
  date_of_joining?: string;
  reporting_manager_id?: number;
  employment_type?: "Employee" | "Contractor" | "Consultant" | "Vendor";
  circle_tenant_id?: string; // Specific circle for circle users
  parent_corporate_id?: string; // Corporate parent for circle users
  functional_scope?: string[]; // Functions within circle
  custom_designation_ids?: number[]; // Circle-created designations only
  team_assignments?: number[];
  circle_access_requests?: CircleAccessRequest[]; // For vendor users
  custom_fields?: Record<string, any>; // Circle-specific additional fields
}

interface CircleAccessRequest {
  circle_tenant_id: string;
  access_level: "Basic" | "Standard" | "Extended" | "Full";
  requested_scope: string[];
  business_justification: string;
  contact_access_needed: boolean;
  communication_needed: boolean;
}

interface InviteUserRequest {
  name: string;
  email: string;
  intended_designation_id?: number; // Tenant-created designation
  intended_role_description?: string; // Freeform description
  access_level?: "Basic" | "Standard" | "Extended" | "Full";
  geographic_scope?: string[]; // Tenant-defined areas
  functional_scope?: string[]; // Tenant-defined functions
  expires_in_days?: number;
  personal_message?: string;
  requires_approval?: boolean;
  temporary_access?: boolean;
  project_context?: string; // For project-specific invitations
}

// User Management Hook
export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async (filters?: UserFilters) => {
    setLoading(true);
    try {
      const data = await userAPI.getUsers(filters);
      setUsers(data);
      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (userData: CreateUserRequest) => {
    setLoading(true);
    try {
      const newUser = await userAPI.create(userData);
      setUsers((prev) => [...prev, newUser]);
      return newUser;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const inviteUser = useCallback(async (invitationData: InviteUserRequest) => {
    setLoading(true);
    try {
      const invitation = await userAPI.invite(invitationData);
      return invitation;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id: number, userData: Partial<UserProfile>) => {
    try {
      const updatedUser = await userAPI.update(id, userData);
      setUsers((prev) => prev.map((u) => (u.id === id ? updatedUser : u)));
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }, []);

  const assignUserDesignations = useCallback(
    async (userId: number, designationIds: number[]) => {
      try {
        // Designations must be tenant-created (no predefined roles except Super Admin)
        const result = await userAPI.assignDesignations(userId, designationIds);
        await loadUsers(); // Refresh to get updated designations
        return result;
      } catch (error) {
        throw error;
      }
    },
    [loadUsers]
  );

  const grantCircleAccess = useCallback(async (userId: number, circleId: string, accessConfig: CircleAccessRequest) => {
    try {
      const access = await userAPI.grantCircleAccess(userId, circleId, accessConfig);
      return access;
    } catch (error) {
      throw error;
    }
  }, []);

  const getCircleUsers = useCallback(async (circleId: string) => {
    try {
      const circleUsers = await userAPI.getCircleUsers(circleId);
      return circleUsers;
    } catch (error) {
      throw error;
    }
  }, []);

  const getCorporateCirclesUsers = useCallback(async (corporateId: string) => {
    try {
      const users = await userAPI.getCorporateCirclesUsers(corporateId);
      return users;
    } catch (error) {
      throw error;
    }
  }, []);

  const getVendorCircleAccess = useCallback(async () => {
    try {
      const circleAccess = await userAPI.getVendorCircleAccess();
      return circleAccess;
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    users,
    teams,
    loading,
    loadUsers,
    createUser,
    inviteUser,
    updateUser,
    assignUserDesignations,
    grantCircleAccess,
    getCircleUsers,
    getCorporateCirclesUsers,
    getVendorCircleAccess,
  };
};

// Team Management Hook
export const useTeamManagement = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teamAPI.getTeams();
      setTeams(data);
      return data;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTeam = useCallback(async (teamData: CreateTeamRequest) => {
    setLoading(true);
    try {
      const newTeam = await teamAPI.create(teamData);
      setTeams((prev) => [...prev, newTeam]);
      return newTeam;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const addTeamMember = useCallback(
    async (teamId: number, userId: number, role?: string) => {
      try {
        const membership = await teamAPI.addMember(teamId, userId, role);
        await loadTeams(); // Refresh teams
        return membership;
      } catch (error) {
        throw error;
      }
    },
    [loadTeams]
  );

  return {
    teams,
    loading,
    loadTeams,
    createTeam,
    addTeamMember,
  };
};
```

---

## Integration Points

### 1. Tenant Onboarding Integration

```yaml
User Creation During Tenant Setup:
  - Primary admin user created automatically during tenant activation
  - Super Admin designation assigned to initial user
  - Welcome email with platform introduction
  - Access to designation and team management

Tenant-Driven Configuration:
  - User limits based on subscription plan
  - Feature access based on subscription level
  - Geographic scope defined by tenant operations
  - Cross-tenant access configured as needed

Flexible Initial Setup:
  Super Admin User:
    - Platform access and tenant management
    - Ability to create custom designations
    - User management capabilities
    - Team and permission setup

  Tenant Customization:
    - Create organizational structure
    - Define custom designations and roles
    - Set up teams and departments
    - Configure permission hierarchy
    - Establish reporting relationships

  No Predefined Structure:
    - Tenants define their own organizational model
    - Custom designations based on business needs
    - Flexible permission assignment
    - Adaptable team structures
```

### 2. Role-Based Access Control Integration

```yaml
Permission Management:
  - Real-time permission validation
  - Role-based feature access
  - Geographic scope enforcement
  - Cross-tenant access validation

Dynamic Permission Updates:
  - Permission changes reflect immediately
  - Role inheritance and aggregation
  - Scope-based access control
  - Audit trail for permission changes

Security Integration:
  - Multi-factor authentication support
  - Session management
  - API access control
  - Security monitoring and alerts
```

---

## Implementation Roadmap

### Phase 1: Core User Management (Weeks 1-2)

- User registration and authentication
- Basic user CRUD operations
- Profile management system
- Email verification and security

### Phase 2: Role and Team Management (Weeks 3-4)

- Role assignment system
- Team creation and management
- Permission enforcement
- Cross-tenant access foundation

### Phase 3: Advanced Features (Weeks 5-6)

- User search and filtering
- Bulk operations
- Activity logging and audit
- Advanced security features

### Phase 4: Integration and Optimization (Weeks 7-8)

- Tenant onboarding integration
- Performance optimization
- Reporting and analytics
- Mobile app integration

---

This User Management specification provides a comprehensive and balanced approach to user lifecycle management while seamlessly supporting the multi-tenant architecture with natural integration of geographic and functional scope capabilities.

_Last Updated: 2024-12-28_

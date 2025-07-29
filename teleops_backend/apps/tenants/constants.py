"""
Tenant Constants
Centralized definitions for resource types and other constants used across the application.
"""

# Resource type definitions - single source of truth
RESOURCE_TYPES = {
    'project': 'Project Management',
    'task': 'Task Management', 
    'site': 'Site Management',
    'user': 'User Management',
    'deviation': 'Deviation Management',
    'report': 'Reporting & Analytics',
    'compliance': 'Compliance Management',
    'vendor': 'Vendor Management',
    'asset': 'Asset Management',
    'document': 'Document Management',
    'audit': 'Audit & Logging',
    'system': 'System Administration',
    'workflow': 'Workflow Management',
    'notification': 'Notification Management',
    'rbac': 'RBAC Management',
    'custom': 'Custom Resource',
}

# Django model choices format
RESOURCE_TYPE_CHOICES = [
    (key, value) for key, value in RESOURCE_TYPES.items()
]

# Frontend format with additional metadata
RESOURCE_TYPES_FRONTEND = [
    {'value': 'project', 'label': 'Project Management', 'icon': '📋', 'description': 'Project creation, tracking, and management'},
    {'value': 'task', 'label': 'Task Management', 'icon': '✅', 'description': 'Task assignment, updates, and completion'},
    {'value': 'site', 'label': 'Site Management', 'icon': '📍', 'description': 'Site information, locations, and details'},
    {'value': 'user', 'label': 'User Management', 'icon': '👥', 'description': 'User profiles, roles, and access control'},
    {'value': 'deviation', 'label': 'Deviation Management', 'icon': '⚠️', 'description': 'Deviation records, approvals, and reports'},
    {'value': 'report', 'label': 'Reporting & Analytics', 'icon': '📊', 'description': 'Reports, dashboards, and data analysis'},
    {'value': 'compliance', 'label': 'Compliance Management', 'icon': '📜', 'description': 'Compliance tracking and regulatory requirements'},
    {'value': 'vendor', 'label': 'Vendor Management', 'icon': '🏢', 'description': 'Vendor relationships and contracts'},
    {'value': 'asset', 'label': 'Asset Management', 'icon': '🔧', 'description': 'Equipment, tools, and asset tracking'},
    {'value': 'document', 'label': 'Document Management', 'icon': '📄', 'description': 'Document storage, sharing, and version control'},
    {'value': 'audit', 'label': 'Audit & Logging', 'icon': '🔍', 'description': 'Audit trails, logs, and security monitoring'},
    {'value': 'system', 'label': 'System Administration', 'icon': '⚙️', 'description': 'System settings, configuration, and maintenance'},
    {'value': 'workflow', 'label': 'Workflow Management', 'icon': '🔄', 'description': 'Business processes and workflow automation'},
    {'value': 'notification', 'label': 'Notification Management', 'icon': '🔔', 'description': 'Alerts, notifications, and communication'},
    {'value': 'rbac', 'label': 'RBAC Management', 'icon': '🔐', 'description': 'Role-based access control and permissions'},
    {'value': 'custom', 'label': 'Custom Resource', 'icon': '🎯', 'description': 'Custom functionality specific to your organization'},
]

"""
Constants for tenant management
"""

# API Response Messages
MESSAGES = {
    # Success messages
    'INVITATION_SENT': 'Invitation sent successfully',
    'INVITATION_RESENT': 'Invitation resent successfully',
    'INVITATION_CANCELLED': 'Invitation cancelled successfully',
    'TENANT_CREATED': 'Tenant created successfully',
    'TENANT_UPDATED': 'Tenant updated successfully',
    'TENANT_ACTIVATED': 'Tenant activated successfully',
    'TENANT_DEACTIVATED': 'Tenant deactivated successfully',
    'ONBOARDING_COMPLETED': 'Onboarding completed successfully',
    
    # Error messages
    'INVITATION_NOT_FOUND': 'Invitation not found',
    'INVITATION_EXPIRED': 'Invitation has expired',
    'INVITATION_INVALID': 'Invalid invitation token',
    'INVITATION_ALREADY_ACCEPTED': 'Invitation has already been accepted',
    'TENANT_NOT_FOUND': 'Tenant not found',
    'INVALID_TENANT_TYPE': 'Invalid tenant type',
    'EMAIL_DELIVERY_FAILED': 'Failed to send email',
    'ONBOARDING_FAILED': 'Onboarding process failed',
    'VALIDATION_FAILED': 'Validation failed',
    'UNAUTHORIZED_ACCESS': 'Unauthorized access',
    'UNEXPECTED_ERROR': 'An unexpected error occurred',
    
    # Validation messages
    'REQUIRED_FIELD': 'This field is required',
    'INVALID_EMAIL': 'Invalid email address',
    'INVALID_PHONE': 'Invalid phone number',
    'SUBDOMAIN_EXISTS': 'Subdomain already exists',
    'EMAIL_EXISTS': 'Email already exists',
    'INVALID_CIRCLE_CODE': 'Invalid circle code',
}

# Tenant Configuration
TENANT_CONFIG = {
    'DEFAULT_INVITATION_EXPIRY_DAYS': 7,
    'DEFAULT_VERIFICATION_EXPIRY_HOURS': 24,
    'MAX_INVITATIONS_PER_HOUR': 10,
    'MAX_SUBDOMAIN_LENGTH': 63,
    'MIN_PASSWORD_LENGTH': 8,
}

# Tenant Types
TENANT_TYPES = {
    'CORPORATE': 'Corporate',
    'CIRCLE': 'Circle',
    'VENDOR': 'Vendor',
}

# Tenant Status Choices
TENANT_STATUS = {
    'REGISTRATION': {
        'PENDING': 'Pending',
        'APPROVED': 'Approved',
        'REJECTED': 'Rejected',
        'EXPIRED': 'Expired',
    },
    'ACTIVATION': {
        'INACTIVE': 'Inactive',
        'ACTIVE': 'Active',
        'SUSPENDED': 'Suspended',
        'TERMINATED': 'Terminated',
    },
}

# Invitation Status
INVITATION_STATUS = {
    'PENDING': 'Pending',
    'ACCEPTED': 'Accepted',
    'EXPIRED': 'Expired',
    'CANCELLED': 'Cancelled',
}

# Circle Information
INDIAN_TELECOM_CIRCLES = [
    {'code': 'AP', 'name': 'Andhra Pradesh', 'region': 'South'},
    {'code': 'AS', 'name': 'Assam', 'region': 'North East'},
    {'code': 'BH', 'name': 'Bihar', 'region': 'East'},
    {'code': 'CH', 'name': 'Chennai', 'region': 'South'},
    {'code': 'GJ', 'name': 'Gujarat', 'region': 'West'},
    {'code': 'HR', 'name': 'Haryana', 'region': 'North'},
    {'code': 'HP', 'name': 'Himachal Pradesh', 'region': 'North'},
    {'code': 'JK', 'name': 'Jammu & Kashmir', 'region': 'North'},
    {'code': 'KA', 'name': 'Karnataka', 'region': 'South'},
    {'code': 'KL', 'name': 'Kerala', 'region': 'South'},
    {'code': 'KO', 'name': 'Kolkata', 'region': 'East'},
    {'code': 'MH', 'name': 'Maharashtra & Goa', 'region': 'West'},
    {'code': 'MPCG', 'name': 'Madhya Pradesh & Chhattisgarh', 'region': 'Central'},
    {'code': 'MU', 'name': 'Mumbai', 'region': 'West'},
    {'code': 'NE', 'name': 'North East', 'region': 'North East'},
    {'code': 'OR', 'name': 'Odisha', 'region': 'East'},
    {'code': 'PB', 'name': 'Punjab', 'region': 'North'},
    {'code': 'RJ', 'name': 'Rajasthan', 'region': 'North'},
    {'code': 'TN', 'name': 'Tamil Nadu', 'region': 'South'},
    {'code': 'UPE', 'name': 'UP (East)', 'region': 'North'},
    {'code': 'UPW', 'name': 'UP (West)', 'region': 'North'},
    {'code': 'WB', 'name': 'West Bengal', 'region': 'East'},
    {'code': 'MC', 'name': 'Mumbai Corporate', 'region': 'West'},
]

# Email Templates
EMAIL_TEMPLATES = {
    'TENANT_INVITATION': 'emails/tenant_invitation.html',
    'USER_VERIFICATION': 'emails/user_verification.html',
    'ONBOARDING_CONFIRMATION': 'emails/onboarding_confirmation.html',
    'PASSWORD_RESET': 'emails/password_reset.html',
    'ACCOUNT_ACTIVATED': 'emails/account_activated.html',
}

# Log Messages
LOG_MESSAGES = {
    'INVITATION_CREATED': 'Invitation created for {email} by {user}',
    'INVITATION_SENT': 'Invitation sent to {email}',
    'INVITATION_ACCEPTED': 'Invitation accepted by {email}',
    'TENANT_CREATED': 'Tenant created: {organization_name} ({tenant_type})',
    'TENANT_ACTIVATED': 'Tenant activated: {organization_name}',
    'USER_VERIFICATION_SENT': 'Verification email sent to {email}',
    'ONBOARDING_COMPLETED': 'Onboarding completed for {organization_name}',
    'EMAIL_DELIVERY_FAILED': 'Failed to send email to {email}: {error}',
    'SERVICE_ERROR': 'Service error in {service}: {error}',
}

# Validation Patterns
VALIDATION_PATTERNS = {
    'SUBDOMAIN': r'^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$',
    'PHONE': r'^\+?[\d\s\-\(\)]{10,15}$',
    'ORGANIZATION_CODE': r'^[A-Z0-9_]{2,10}$',
}

# Rate Limiting
RATE_LIMITS = {
    'INVITATION_CREATE': '10/hour',
    'INVITATION_RESEND': '5/hour',
    'ONBOARDING_ATTEMPT': '3/hour',
    'LOGIN_ATTEMPT': '5/minute',
}

# Feature Flags
FEATURE_FLAGS = {
    'ENABLE_CIRCLE_BILLING': True,
    'ENABLE_VENDOR_MULTI_CIRCLE': True,
    'ENABLE_AUTOMATIC_APPROVAL': False,
    'ENABLE_SMS_NOTIFICATIONS': False,
    'ENABLE_AUDIT_LOGGING': True,
} 
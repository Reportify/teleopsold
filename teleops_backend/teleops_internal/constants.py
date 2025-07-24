"""
Constants for teleops_internal management
"""

# API Response Messages
MESSAGES = {
    # Authentication messages
    'LOGIN_SUCCESS': 'Login successful',
    'LOGOUT_SUCCESS': 'Logout successful',
    'INVALID_CREDENTIALS': 'Invalid email or password',
    'ACCOUNT_INACTIVE': 'Account is inactive',
    'PROFILE_NOT_FOUND': 'Internal profile not found',
    'INSUFFICIENT_PERMISSIONS': 'Insufficient permissions for this operation',
    
    # Profile messages
    'PROFILE_UPDATED': 'Profile updated successfully',
    'PROFILE_PHOTO_UPDATED': 'Profile photo updated successfully',
    'PROFILE_RETRIEVED': 'Profile retrieved successfully',
    
    # Tenant management messages
    'TENANT_SUSPENDED': 'Tenant suspended successfully',
    'TENANT_REACTIVATED': 'Tenant reactivated successfully',
    'TENANT_UPDATED': 'Tenant information updated successfully',
    'TENANT_NOT_FOUND': 'Tenant not found',
    'TENANT_ALREADY_SUSPENDED': 'Tenant is already suspended',
    'TENANT_CANNOT_REACTIVATE': 'Only suspended tenants can be reactivated',
    
    # General messages
    'OPERATION_SUCCESSFUL': 'Operation completed successfully',
    'VALIDATION_FAILED': 'Validation failed',
    'UNAUTHORIZED_ACCESS': 'Unauthorized access',
    'FORBIDDEN_ACCESS': 'Access forbidden',
    'RESOURCE_NOT_FOUND': 'Resource not found',
    'INTERNAL_ERROR': 'Internal server error occurred',
    'SERVICE_UNAVAILABLE': 'Service temporarily unavailable',
    
    # Feature messages
    'FEATURE_NOT_IMPLEMENTED': 'Feature not yet implemented',
    'FEATURE_COMING_SOON': 'Feature coming soon',
}

# Internal Portal Configuration
INTERNAL_CONFIG = {
    'DEFAULT_PAGE_SIZE': 20,
    'MAX_PAGE_SIZE': 100,
    'SESSION_TIMEOUT_HOURS': 8,
    'MAX_LOGIN_ATTEMPTS': 5,
    'LOCKOUT_DURATION_MINUTES': 30,
    'PASSWORD_RESET_EXPIRY_HOURS': 24,
    'AUDIT_LOG_RETENTION_DAYS': 365,
}

# Internal User Roles
INTERNAL_ROLES = {
    'SUPER_ADMIN': 'super_admin',
    'OPERATIONS_MANAGER': 'operations_manager',
    'SUPPORT_STAFF': 'support_staff',
}

# Access Levels
ACCESS_LEVELS = {
    'READ_ONLY': 'read_only',
    'STANDARD': 'standard',
    'ADMIN': 'admin',
}

# Role Display Names
ROLE_DISPLAY_NAMES = {
    'super_admin': 'Super Administrator',
    'operations_manager': 'Operations Manager',
    'support_staff': 'Support Staff',
}

# Access Level Display Names
ACCESS_LEVEL_DISPLAY_NAMES = {
    'read_only': 'Read Only',
    'standard': 'Standard',
    'admin': 'Administrator',
}

# Permissions Matrix
ROLE_PERMISSIONS = {
    'super_admin': {
        'can_view_tenants': True,
        'can_manage_tenants': True,
        'can_suspend_tenants': True,
        'can_manage_billing': True,
        'can_access_support': True,
        'can_view_analytics': True,
        'can_manage_users': True,
        'can_manage_system': True,
        'can_view_audit_logs': True,
        'can_export_data': True,
    },
    'operations_manager': {
        'can_view_tenants': True,
        'can_manage_tenants': True,
        'can_suspend_tenants': True,
        'can_manage_billing': True,
        'can_access_support': True,
        'can_view_analytics': True,
        'can_manage_users': False,
        'can_manage_system': False,
        'can_view_audit_logs': True,
        'can_export_data': True,
    },
    'support_staff': {
        'can_view_tenants': True,
        'can_manage_tenants': False,
        'can_suspend_tenants': False,
        'can_manage_billing': False,
        'can_access_support': True,
        'can_view_analytics': False,
        'can_manage_users': False,
        'can_manage_system': False,
        'can_view_audit_logs': False,
        'can_export_data': False,
    },
}

# Tenant Status Options
TENANT_STATUS_OPTIONS = {
    'ACTIVE': 'Active',
    'INACTIVE': 'Inactive',
    'SUSPENDED': 'Suspended',
    'TERMINATED': 'Terminated',
}

# Tenant Type Options
TENANT_TYPE_OPTIONS = {
    'CORPORATE': 'Corporate',
    'CIRCLE': 'Circle',
    'VENDOR': 'Vendor',
}

# Dashboard Metrics
DASHBOARD_METRICS = {
    'TENANT_METRICS': [
        'total_tenants',
        'active_tenants',
        'suspended_tenants',
        'new_tenants_30d',
        'corporate_tenants',
        'circle_tenants',
        'vendor_tenants',
    ],
    'USER_METRICS': [
        'total_users',
        'active_users',
        'inactive_users',
        'new_users_30d',
    ],
    'BILLING_METRICS': [
        'total_revenue',
        'monthly_recurring_revenue',
        'outstanding_invoices',
        'payment_success_rate',
    ],
    'SUPPORT_METRICS': [
        'total_tickets',
        'open_tickets',
        'resolved_tickets',
        'average_response_time',
    ],
}

# Validation Patterns
VALIDATION_PATTERNS = {
    'EMPLOYEE_ID': r'^[A-Z0-9]{3,20}$',
    'PHONE': r'^\+?[\d\s\-\(\)]{10,20}$',
    'DISPLAY_NAME': r'^[a-zA-Z\s]{2,100}$',
}

# File Upload Settings
UPLOAD_SETTINGS = {
    'PROFILE_PHOTO': {
        'MAX_SIZE_MB': 5,
        'ALLOWED_EXTENSIONS': ['jpg', 'jpeg', 'png', 'gif'],
        'MAX_DIMENSIONS': (1024, 1024),
    },
}

# Audit Action Types
AUDIT_ACTIONS = {
    # Authentication actions
    'USER_LOGIN': 'user_login',
    'USER_LOGOUT': 'user_logout',
    'LOGIN_FAILED': 'login_failed',
    
    # Profile actions
    'PROFILE_UPDATED': 'profile_updated',
    'PROFILE_PHOTO_UPDATED': 'profile_photo_updated',
    
    # Tenant management actions
    'TENANT_SUSPENDED': 'tenant_suspended',
    'TENANT_REACTIVATED': 'tenant_reactivated',
    'TENANT_UPDATED': 'tenant_updated',
    'TENANT_VIEWED': 'tenant_viewed',
    'TENANT_USERS_VIEWED': 'tenant_users_viewed',
    
    # System actions
    'SYSTEM_BACKUP': 'system_backup',
    'SYSTEM_MAINTENANCE': 'system_maintenance',
    'DATA_EXPORT': 'data_export',
}

# Log Messages Templates
LOG_MESSAGES = {
    'USER_AUTHENTICATED': 'Internal user {email} authenticated successfully from {ip}',
    'AUTHENTICATION_FAILED': 'Authentication failed for {email} from {ip}',
    'TENANT_SUSPENDED': 'Tenant {tenant_name} suspended by {user_email}. Reason: {reason}',
    'TENANT_REACTIVATED': 'Tenant {tenant_name} reactivated by {user_email}',
    'PROFILE_UPDATED': 'Profile updated for {user_email}: {changes}',
    'PERMISSION_DENIED': 'Permission denied for {user_email} accessing {resource}',
    'SERVICE_ERROR': 'Service error in {service}: {error}',
}

# Feature Flags
FEATURE_FLAGS = {
    'ENABLE_AUDIT_LOGGING': True,
    'ENABLE_TENANT_SUSPENSION': True,
    'ENABLE_BILLING_MANAGEMENT': False,  # To be implemented
    'ENABLE_SUPPORT_INTEGRATION': False,  # To be implemented
    'ENABLE_ANALYTICS_DASHBOARD': True,
    'ENABLE_DATA_EXPORT': False,  # To be implemented
    'ENABLE_BULK_OPERATIONS': False,  # Future feature
    'ENABLE_ADVANCED_SEARCH': False,  # Future feature
}

# Rate Limiting
RATE_LIMITS = {
    'LOGIN_ATTEMPT': '5/minute',
    'TENANT_OPERATIONS': '100/hour',
    'PROFILE_UPDATE': '10/hour',
    'DATA_EXPORT': '5/day',
}

# Cache Settings
CACHE_SETTINGS = {
    'TENANT_LIST_CACHE_TIMEOUT': 300,  # 5 minutes
    'USER_PERMISSIONS_CACHE_TIMEOUT': 600,  # 10 minutes
    'ANALYTICS_CACHE_TIMEOUT': 1800,  # 30 minutes
}

# Notification Settings
NOTIFICATION_SETTINGS = {
    'ENABLE_EMAIL_NOTIFICATIONS': True,
    'ENABLE_SLACK_NOTIFICATIONS': False,
    'TENANT_SUSPENSION_NOTIFY': True,
    'SYSTEM_ERROR_NOTIFY': True,
}

# Export Formats
EXPORT_FORMATS = {
    'CSV': 'csv',
    'EXCEL': 'xlsx',
    'PDF': 'pdf',
    'JSON': 'json',
}

# Internal Portal Menu Structure
MENU_STRUCTURE = {
    'dashboard': {
        'title': 'Dashboard',
        'icon': 'dashboard',
        'permission': 'can_view_analytics',
    },
    'tenants': {
        'title': 'Tenant Management',
        'icon': 'business',
        'permission': 'can_view_tenants',
        'submenu': {
            'list': 'Tenant List',
            'invitations': 'Invitations',
            'analytics': 'Analytics',
        }
    },
    'billing': {
        'title': 'Billing & Subscriptions',
        'icon': 'payment',
        'permission': 'can_manage_billing',
        'submenu': {
            'invoices': 'Invoices',
            'plans': 'Subscription Plans',
            'payments': 'Payments',
        }
    },
    'support': {
        'title': 'Support Management',
        'icon': 'support',
        'permission': 'can_access_support',
        'submenu': {
            'tickets': 'Support Tickets',
            'knowledgebase': 'Knowledge Base',
        }
    },
    'users': {
        'title': 'User Management',
        'icon': 'people',
        'permission': 'can_manage_users',
        'submenu': {
            'internal': 'Internal Users',
            'tenant_users': 'Tenant Users',
        }
    },
    'system': {
        'title': 'System Settings',
        'icon': 'settings',
        'permission': 'can_manage_system',
        'submenu': {
            'configuration': 'Configuration',
            'audit_logs': 'Audit Logs',
            'backup': 'Backup & Restore',
        }
    },
} 
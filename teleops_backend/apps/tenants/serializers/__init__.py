"""
Tenant Serializers Package
"""

# Import from main serializers (Client/Vendor relationships, Tenant management)
from .main_serializers import (
    ClientVendorRelationshipSerializer,
    ClientManagementSerializer,
    CorporateOnboardingSerializer,
    TenantSerializer,
    TelecomCircleSerializer,
    TenantInvitationSerializer,
    TenantInvitationAcceptSerializer,
    VendorCreatedClientSerializer,
    VendorCreatedClientFormSerializer,
    VendorClientBillingSerializer,
    TenantUserProfileSerializer,
    TenantDesignationSerializer,
    DualModeVendorSerializer,
    VendorClientRelationshipSerializer,
    VendorClientSerializer,
    VendorManagementSummarySerializer,
    CircleVendorSummarySerializer,
    CircleRelationshipMetricsSerializer,
    AssociatedClientSerializer,
    IndependentClientSerializer,
    VendorClientPortfolioSerializer,
    ClientNameValidationSerializer,
    ClientNameValidationResponseSerializer,
    VendorBillingSummarySerializer,
    ConversionAnalyticsSerializer,
    DesignationSerializer,
)

# Import from RBAC serializers
from .rbac_serializers import (
    PermissionRegistrySerializer,
    PermissionGroupSerializer,
    UserPermissionGroupAssignmentSerializer,
    UserPermissionOverrideSerializer,
    DesignationBasePermissionSerializer,
    UserEffectivePermissionsSerializer,
    PermissionCheckRequestSerializer,
    PermissionCheckResponseSerializer,
    PermissionAuditTrailSerializer,
    DepartmentSerializer,
    TenantDesignationSerializer,
    TenantDepartmentSerializer,
)

# Import from designation serializers if they exist
try:
    from .designation_serializers import *
except ImportError:
    pass

__all__ = [
    # Main serializers
    'ClientVendorRelationshipSerializer',
    'ClientManagementSerializer',
    'CorporateOnboardingSerializer',
    'TenantSerializer',
    'TelecomCircleSerializer',
    'TenantInvitationSerializer',
    'TenantInvitationAcceptSerializer',
    'VendorCreatedClientSerializer',
    'VendorCreatedClientFormSerializer',
    'VendorClientBillingSerializer',
    'TenantUserProfileSerializer',
    'TenantDesignationSerializer',
    'DualModeVendorSerializer',
    'VendorClientRelationshipSerializer',
    'VendorClientSerializer',
    'VendorManagementSummarySerializer',
    'CircleVendorSummarySerializer',
    'CircleRelationshipMetricsSerializer',
    'AssociatedClientSerializer',
    'IndependentClientSerializer',
    'VendorClientPortfolioSerializer',
    'ClientNameValidationSerializer',
    'ClientNameValidationResponseSerializer',
    'VendorBillingSummarySerializer',
    'ConversionAnalyticsSerializer',
    'DesignationSerializer',
    # RBAC serializers
    'PermissionRegistrySerializer',
    'PermissionGroupSerializer',
    'UserPermissionGroupAssignmentSerializer',
    'UserPermissionOverrideSerializer',
    'DesignationBasePermissionSerializer',
    'UserEffectivePermissionsSerializer',
    'PermissionCheckRequestSerializer',
    'PermissionCheckResponseSerializer',
    'PermissionAuditTrailSerializer',
    'DepartmentSerializer',
    'TenantDesignationSerializer',
    'TenantDepartmentSerializer',
] 
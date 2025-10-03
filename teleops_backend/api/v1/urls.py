from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.response import Response
from apps.tenants.views.main_views import ClientVendorRelationshipViewSet, list_telecom_circles, DualModeVendorViewSet, UnifiedClientViewSet, ClientViewSet, VendorCreatedClientViewSet
from apps.tenants.views.main_views import CorporateOnboardingView, TenantInvitationView, TenantInvitationAcceptView, TenantInvitationResendView, TenantInvitationCancelView
from apps.tenants.views.main_views import onboarding_status, public_invitation_details, CorporateCircleManagementView, CorporateCircleInvitationView, TenantInvitationViewSet

router = DefaultRouter()
router.register(r'client-vendor-relationships', ClientVendorRelationshipViewSet, basename='clientvendorrelationship')
router.register(r'clients', UnifiedClientViewSet, basename='unified-client')
router.register(r'client-management', ClientViewSet, basename='client-management')
router.register(r'vendor-clients', VendorCreatedClientViewSet, basename='vendor-created-client')
router.register(r'vendors/(?P<vendor_id>[^/.]+)/clients', DualModeVendorViewSet, basename='dual-mode-vendor')
router.register(r'tenant-invitations', TenantInvitationViewSet, basename='tenant-invitation')

urlpatterns = [
    # Authentication endpoints
    path('auth/', include('apps.users.urls')),
    
    # Tenant User Management endpoints
    path('tenant/', include('apps.users.tenant.urls')),
    
    # Tenant Organization Management endpoints
    path('tenant/', include('apps.tenants.urls.organization_urls')),
    
    # Tenant RBAC Management endpoints
    path('tenants/rbac/', include('apps.tenants.urls.rbac_urls')),
    
    # Vendor Operations Management endpoints
    path('vendor-operations/', include('apps.users.tenant.urls', namespace='vendor-operations')),
    
    # Site Management endpoints
    path('sites/', include('apps.sites.urls')),
    
    # Project Management endpoints
    path('projects/', include('apps.projects.urls')),
    
    # Task Management endpoints
    path('tasks/', include('apps.tasks.urls')),

    # Team Management endpoints
    path('teams/', include('apps.teams.urls')),

    # Equipment Inventory endpoints
    path('equipment/', include('apps.equipment.urls')),
    
    path('internal/', include('teleops_internal.api.urls')),
    path('public/corporate/register/', CorporateOnboardingView.as_view(), name='corporate-onboarding'),
    # Tenant invitation endpoints
    path('admin/invitations/', TenantInvitationView.as_view(), name='tenant-invitations'),
    path('admin/invitations/<uuid:pk>/resend/', TenantInvitationResendView.as_view(), name='tenant-invitation-resend'),
    path('admin/invitations/<uuid:pk>/cancel/', TenantInvitationCancelView.as_view(), name='tenant-invitation-cancel'),
    path('public/invitations/accept/', TenantInvitationAcceptView.as_view(), name='accept-invitation'),
    path('public/onboarding/status/<uuid:invitation_id>/', onboarding_status, name='onboarding-status'),
    path('public/invitations/<str:invitation_token>/', public_invitation_details, name='public-invitation-details'),
    path('circles/', list_telecom_circles, name='list_telecom_circles'),
    # Test endpoint
    path('test/', lambda request: Response({"message": "Test endpoint working!"}), name='test-endpoint'),
    # Corporate circle management endpoints
    path('corporate/circles/', CorporateCircleManagementView.as_view(), name='corporate-circle-management'),
    path('corporate/circles/invite/', CorporateCircleInvitationView.as_view(), name='corporate-circle-invitation'),
    path('corporate/circles/invitations/', CorporateCircleInvitationView.as_view(), name='corporate-circle-pending-invitations'),
    path('', include(router.urls)),
]
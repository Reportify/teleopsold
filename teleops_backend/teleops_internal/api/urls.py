from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('auth/login/', views.InternalLoginView.as_view(), name='internal_auth_login'),
    path('auth/logout/', views.InternalLogoutView.as_view(), name='internal_auth_logout'),
    path('auth/profile/', views.InternalProfileView.as_view(), name='internal_auth_profile'),

    # Dashboard
    path('dashboard/', views.InternalDashboardView.as_view(), name='internal_dashboard'),

    # Circle Management endpoints
    path('circles/', views.InternalCircleManagementView.as_view(), name='internal_circles'),
    path('circles/corporate/<uuid:corporate_id>/', views.InternalCircleManagementView.as_view(), name='internal_corporate_circles'),
    path('circles/invite/', views.InternalCircleInvitationView.as_view(), name='internal_circle_invite'),

    # Tenant management endpoints
    path('tenants/', views.InternalTenantListView.as_view(), name='internal_tenant_list'),
    path('tenants/<uuid:pk>/', views.InternalTenantDetailView.as_view(), name='internal_tenant_detail'),
    path('tenants/<uuid:pk>/update/', views.InternalTenantUpdateView.as_view(), name='internal_tenant_update'),
    path('tenants/<uuid:pk>/suspend/', views.InternalTenantSuspendView.as_view(), name='internal_tenant_suspend'),
    path('tenants/<uuid:pk>/reactivate/', views.InternalTenantReactivateView.as_view(), name='internal_tenant_reactivate'),
    path('tenants/<uuid:pk>/cancel-rejection/', views.InternalTenantCancelRejectionView.as_view(), name='internal_tenant_cancel_rejection'),
    path('tenants/<uuid:pk>/users/', views.InternalTenantUsersView.as_view(), name='internal_tenant_users'),
    
    # Invitation management endpoints  
    path('invitations/', views.InternalInvitationView.as_view(), name='internal_invitations'),
    path('invitations/<uuid:invitation_id>/', views.InternalInvitationDetailView.as_view(), name='internal_invitation_detail'),
    path('invitations/<uuid:invitation_id>/resend-verification/', views.InternalInvitationResendVerificationView.as_view(), name='internal_invitation_resend_verification'),
    path('invitations/<uuid:invitation_id>/verification-token/', views.InternalInvitationVerificationTokenView.as_view(), name='internal_invitation_verification_token'),
    path('invitations/<uuid:invitation_id>/revoke-cancellation/', views.InternalInvitationRevokeCancellationView.as_view(), name='internal_invitation_revoke_cancellation'),
    path('invitations/<uuid:invitation_id>/resend-expired/', views.InternalInvitationResendExpiredView.as_view(), name='internal_invitation_resend_expired'),
    path('invitations/expire-overdue/', views.InternalInvitationExpireOverdueView.as_view(), name='internal_invitation_expire_overdue'),
    
    # Email verification endpoints
    path('email-verification/', views.InternalEmailVerificationView.as_view(), name='internal_email_verification'),
] 
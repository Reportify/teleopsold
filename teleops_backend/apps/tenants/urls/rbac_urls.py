"""
RBAC URL Configuration
URL patterns for tenant RBAC API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import HttpResponse

from ..views.rbac_views import (
    PermissionRegistryViewSet,
    PermissionGroupViewSet,
    UserPermissionViewSet,
    PermissionAuditViewSet
)

# Create router for RBAC viewsets
rbac_router = DefaultRouter()
rbac_router.register(r'permissions', PermissionRegistryViewSet, basename='permission-registry')
rbac_router.register(r'groups', PermissionGroupViewSet, basename='permission-groups')
rbac_router.register(r'user-permissions', UserPermissionViewSet, basename='user-permissions')
rbac_router.register(r'audit', PermissionAuditViewSet, basename='permission-audit')

urlpatterns = [
    # RBAC API endpoints
    path('rbac/', include(rbac_router.urls)),
    
    # Additional RBAC endpoints (if needed)
    path('rbac/health/', lambda request: HttpResponse('RBAC API is healthy'), name='rbac-health'),
] 
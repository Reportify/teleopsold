"""
RBAC URL Configuration
URL patterns for tenant RBAC API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import HttpResponse

from ..views.rbac_views import (
    PermissionRegistryViewSet, PermissionGroupViewSet,
    TenantDesignationViewSet, UserPermissionViewSet,
    PermissionCategoryViewSet, PermissionAuditViewSet
)

# Create router for RBAC viewsets
router = DefaultRouter()
router.register(r'categories', PermissionCategoryViewSet, basename='permission-categories')
router.register(r'permissions', PermissionRegistryViewSet, basename='permissions')
router.register(r'groups', PermissionGroupViewSet, basename='permission-groups')
router.register(r'audit', PermissionAuditViewSet, basename='permission-audit')
router.register(r'user-permissions', UserPermissionViewSet, basename='user-permissions')
router.register(r'designations', TenantDesignationViewSet, basename='tenant-designations')

urlpatterns = [
    # RBAC API endpoints
    path('rbac/', include(router.urls)),
    
    # Additional RBAC endpoints (if needed)
    path('rbac/health/', lambda request: HttpResponse('RBAC API is healthy'), name='rbac-health'),
] 
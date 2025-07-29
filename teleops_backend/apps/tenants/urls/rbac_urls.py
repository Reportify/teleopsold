"""
RBAC URL Configuration
URL patterns for tenant RBAC API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import HttpResponse

from ..views.rbac_views import (
    get_resource_types,
    PermissionRegistryViewSet,
    PermissionGroupViewSet,
    TenantDesignationViewSet,
    UserPermissionViewSet,
    PermissionCategoryViewSet,
    PermissionAuditViewSet
)

# Router configuration - define first
router = DefaultRouter()

# Register existing views (current implementation)
router.register(r'permissions', PermissionRegistryViewSet, basename='permissions')
router.register(r'groups', PermissionGroupViewSet, basename='groups')  
router.register(r'designations', TenantDesignationViewSet, basename='designations')
router.register(r'user-permissions', UserPermissionViewSet, basename='user-permissions')
router.register(r'categories', PermissionCategoryViewSet, basename='categories')
router.register(r'audit', PermissionAuditViewSet, basename='audit')

# RBAC URL patterns
urlpatterns = [
    path('resource-types/', get_resource_types, name='resource-types'),
    # RBAC implementation with working comprehensive dashboard
    path('', include(router.urls)),
] 
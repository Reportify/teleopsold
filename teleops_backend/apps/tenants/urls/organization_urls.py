"""
Tenant Organization Management URL Configuration
URL patterns for tenant organizational structure management (designations, departments, users).
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from ..views.rbac_views import (
    DepartmentViewSet,
    TenantDesignationViewSet
)

# Create router for organization viewsets
organization_router = DefaultRouter()
organization_router.register(r'departments', DepartmentViewSet, basename='departments')
organization_router.register(r'designations', TenantDesignationViewSet, basename='designations')

urlpatterns = [
    # Organization management endpoints (tenant-context-aware)
    *organization_router.urls,
    
    # User management endpoints
    path('', include('apps.tenants.urls.user_management_urls')),
] 
"""
Tenant Organization Management URL Configuration
URL patterns for tenant organizational structure management (designations, departments).
"""

from django.urls import path
from rest_framework.routers import DefaultRouter

from ..views.rbac_views import (
    DepartmentViewSet,
    ComprehensiveDesignationViewSet
)

# Create router for organization viewsets
organization_router = DefaultRouter()
organization_router.register(r'departments', DepartmentViewSet, basename='departments')
organization_router.register(r'designations', ComprehensiveDesignationViewSet, basename='designations')

urlpatterns = [
    # Organization management endpoints (tenant-context-aware)
    *organization_router.urls,
] 
"""
Tenant User Management URL Configuration
URL patterns for tenant user management API endpoints.
"""

from django.urls import path
from rest_framework.routers import DefaultRouter

from ..views.user_management_views import TenantUserViewSet

# Create router for user management viewsets
user_management_router = DefaultRouter()
user_management_router.register(r'users', TenantUserViewSet, basename='tenant-users')

urlpatterns = [
    # User management endpoints (tenant-context-aware)
    *user_management_router.urls,
] 
"""
Core URL patterns for Teleops Backend
"""

from django.urls import path
from core.views import health, error_handlers

urlpatterns = [
    # Health check endpoints
    path('', health.health_check, name='health_check'),
    path('status/', health.system_status, name='system_status'),
    path('ready/', health.readiness_check, name='readiness_check'),
    path('live/', health.liveness_check, name='liveness_check'),
] 
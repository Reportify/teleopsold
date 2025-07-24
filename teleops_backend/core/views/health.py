"""
Health check views for Teleops Backend
"""

import logging
from datetime import datetime
from django.http import JsonResponse
from django.db import connection
from django.conf import settings
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Basic health check endpoint
    """
    return Response({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'teleops-backend',
        'version': '1.0.0',
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def system_status(request):
    """
    Detailed system status check
    """
    status = {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'teleops-backend',
        'version': '1.0.0',
        'checks': {}
    }
    
    # Database check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            status['checks']['database'] = 'healthy'
    except Exception as e:
        status['checks']['database'] = 'unhealthy'
        status['status'] = 'unhealthy'
        logger.error(f"Database health check failed: {e}")
    
    # Cache check
    try:
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            status['checks']['cache'] = 'healthy'
        else:
            status['checks']['cache'] = 'unhealthy'
            status['status'] = 'unhealthy'
    except Exception as e:
        status['checks']['cache'] = 'unhealthy'
        status['status'] = 'unhealthy'
        logger.error(f"Cache health check failed: {e}")
    
    # Settings check
    try:
        required_settings = [
            'SECRET_KEY',
            'DATABASES',
            'REDIS_URL',
            'AZURE_ACCOUNT_NAME',
        ]
        
        missing_settings = []
        for setting in required_settings:
            if not getattr(settings, setting, None):
                missing_settings.append(setting)
        
        if missing_settings:
            status['checks']['settings'] = 'unhealthy'
            status['status'] = 'unhealthy'
            status['checks']['missing_settings'] = missing_settings
        else:
            status['checks']['settings'] = 'healthy'
    except Exception as e:
        status['checks']['settings'] = 'unhealthy'
        status['status'] = 'unhealthy'
        logger.error(f"Settings health check failed: {e}")
    
    return Response(status)


@api_view(['GET'])
@permission_classes([AllowAny])
def readiness_check(request):
    """
    Readiness check for Kubernetes/container orchestration
    """
    # Check if the application is ready to receive traffic
    try:
        # Database connectivity
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        # Cache connectivity
        cache.set('readiness_check', 'ok', 10)
        if cache.get('readiness_check') != 'ok':
            raise Exception("Cache not responding")
        
        return Response({
            'status': 'ready',
            'timestamp': datetime.utcnow().isoformat(),
        })
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return Response({
            'status': 'not_ready',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e),
        }, status=503)


@api_view(['GET'])
@permission_classes([AllowAny])
def liveness_check(request):
    """
    Liveness check for Kubernetes/container orchestration
    """
    # Simple check to see if the application is alive
    return Response({
        'status': 'alive',
        'timestamp': datetime.utcnow().isoformat(),
    }) 
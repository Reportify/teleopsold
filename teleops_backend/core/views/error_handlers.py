"""
Custom error handlers for Teleops Backend
"""

import logging
from django.http import JsonResponse
from django.conf import settings

logger = logging.getLogger(__name__)


def handler404(request, exception):
    """
    Custom 404 error handler
    """
    logger.warning(f"404 error for path: {request.path}")
    
    return JsonResponse({
        'error': 'Not Found',
        'message': 'The requested resource was not found',
        'path': request.path,
        'method': request.method,
    }, status=404)


def handler500(request):
    """
    Custom 500 error handler
    """
    logger.error(f"500 error for path: {request.path}")
    
    return JsonResponse({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred',
        'path': request.path,
        'method': request.method,
    }, status=500)


def handler403(request, exception):
    """
    Custom 403 error handler
    """
    logger.warning(f"403 error for path: {request.path}")
    
    return JsonResponse({
        'error': 'Forbidden',
        'message': 'You do not have permission to access this resource',
        'path': request.path,
        'method': request.method,
    }, status=403)


def handler400(request, exception):
    """
    Custom 400 error handler
    """
    logger.warning(f"400 error for path: {request.path}")
    
    return JsonResponse({
        'error': 'Bad Request',
        'message': 'The request could not be processed',
        'path': request.path,
        'method': request.method,
    }, status=400)


def ratelimited(request, exception):
    """
    Custom rate limit exceeded handler
    """
    logger.warning(f"Rate limit exceeded for IP: {request.META.get('REMOTE_ADDR')} on path: {request.path}")
    
    return JsonResponse({
        'error': 'Rate Limit Exceeded',
        'message': 'Too many requests. Please try again later.',
        'path': request.path,
        'method': request.method,
        'retry_after': getattr(exception, 'retry_after', 60),
    }, status=429) 
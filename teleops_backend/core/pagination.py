"""
Custom pagination classes for Teleops API
"""

from rest_framework.pagination import PageNumberPagination, LimitOffsetPagination
from rest_framework.response import Response
from django.conf import settings


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination with configurable page size
    """
    page_size = getattr(settings, 'PAGINATION_PAGE_SIZE', 20)
    page_size_query_param = 'page_size'
    max_page_size = getattr(settings, 'PAGINATION_MAX_PAGE_SIZE', 100)
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
            'page': self.page.number,
            'pages': self.page.paginator.num_pages,
        })


class LargeResultsSetPagination(PageNumberPagination):
    """
    Pagination for large result sets
    """
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


class SmallResultsSetPagination(PageNumberPagination):
    """
    Pagination for small result sets
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class TenantAwarePagination(PageNumberPagination):
    """
    Pagination that includes tenant context in response
    """
    page_size = getattr(settings, 'PAGINATION_PAGE_SIZE', 20)
    page_size_query_param = 'page_size'
    max_page_size = getattr(settings, 'PAGINATION_MAX_PAGE_SIZE', 100)
    
    def get_paginated_response(self, data):
        response_data = {
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
            'page': self.page.number,
            'pages': self.page.paginator.num_pages,
        }
        
        # Add tenant context if available
        if hasattr(self.request, 'tenant') and self.request.tenant:
            response_data['tenant'] = {
                'id': str(self.request.tenant.id),
                'name': self.request.tenant.organization_name,
                'type': self.request.tenant.tenant_type,
            }
        
        return Response(response_data)


class CursorPagination(LimitOffsetPagination):
    """
    Cursor-based pagination for real-time data
    """
    default_limit = 20
    limit_query_param = 'limit'
    offset_query_param = 'offset'
    max_limit = 100
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
        })


class EquipmentPagination(StandardResultsSetPagination):
    """
    Specialized pagination for equipment lists
    """
    page_size = 50
    max_page_size = 200


class TaskPagination(StandardResultsSetPagination):
    """
    Specialized pagination for task lists
    """
    page_size = 25
    max_page_size = 100


class SitePagination(StandardResultsSetPagination):
    """
    Specialized pagination for site lists
    """
    page_size = 30
    max_page_size = 150


class ProjectPagination(StandardResultsSetPagination):
    """
    Specialized pagination for project lists
    """
    page_size = 15
    max_page_size = 50 
"""
Custom pagination classes for Teleops API
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from collections import OrderedDict


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination class for Circle Portal APIs
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        """
        Return a paginated style Response object with additional metadata
        """
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('page_size', self.page_size),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('results', data)
        ]))


class LargeResultsSetPagination(PageNumberPagination):
    """
    Pagination class for large datasets (e.g., sites, tasks)
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
    
    def get_paginated_response(self, data):
        """
        Return a paginated style Response object with additional metadata
        """
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('page_size', self.page_size),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('results', data)
        ]))


class SmallResultsSetPagination(PageNumberPagination):
    """
    Pagination class for small datasets (e.g., projects)
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50
    
    def get_paginated_response(self, data):
        """
        Return a paginated style Response object with additional metadata
        """
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('page_size', self.page_size),
            ('total_pages', self.page.paginator.num_pages),
            ('current_page', self.page.number),
            ('results', data)
        ]))


class NoPagination:
    """
    Pagination class that returns all results without pagination
    Used for small datasets like dropdown lists, lookups, etc.
    """
    def paginate_queryset(self, queryset, request, view=None):
        return None

    def get_paginated_response(self, data):
        return Response(data) 
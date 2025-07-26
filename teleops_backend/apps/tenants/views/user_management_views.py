"""
Tenant User Management Views

API views for managing tenant users including creation, listing, and management.
"""

import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from django.db import transaction
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema

from core.permissions.tenant_permissions import IsTenantMember, IsTenantAdmin
from ..models import TenantUserProfile, Tenant
from ..serializers.main_serializers import TenantUserCreateSerializer, TenantUserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


class TenantUserViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing tenant users.
    
    Provides functionality to:
    - List tenant users
    - Create new tenant users
    - Retrieve user details
    - Update user information
    - Deactivate users
    """
    
    permission_classes = [IsTenantMember]
    
    def get_queryset(self):
        """Get users for the current tenant"""
        if hasattr(self.request.user, 'tenant_user_profile'):
            tenant = self.request.user.tenant_user_profile.tenant
            return TenantUserProfile.objects.filter(
                tenant=tenant
            ).select_related('user').prefetch_related('designation_assignments__designation')
        return TenantUserProfile.objects.none()
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return TenantUserCreateSerializer
        return TenantUserSerializer
    
    @extend_schema(
        summary="List tenant users",
        description="Get all users for the current tenant with pagination and filtering support",
        responses={200: TenantUserSerializer(many=True)}
    )
    def list(self, request: Request) -> Response:
        """List all users for the current tenant"""
        try:
            queryset = self.get_queryset()
            
            # Apply filters
            is_active = request.query_params.get('is_active')
            if is_active is not None:
                queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
            search = request.query_params.get('search')
            if search:
                queryset = queryset.filter(
                    user__first_name__icontains=search
                ) | queryset.filter(
                    user__last_name__icontains=search
                ) | queryset.filter(
                    user__email__icontains=search
                ) | queryset.filter(
                    employee_id__icontains=search
                )
            
            department = request.query_params.get('department')
            if department:
                queryset = queryset.filter(department__icontains=department)
            
            # Order by creation date (newest first)
            queryset = queryset.order_by('-created_at')
            
            # Paginate
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'results': serializer.data,
                'count': queryset.count()
            })
            
        except Exception as e:
            logger.error(f"Error listing tenant users: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve users'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @extend_schema(
        summary="Create new tenant user",
        description="Create a new user account with tenant profile and send login credentials via email",
        request=TenantUserCreateSerializer,
        responses={
            201: TenantUserSerializer,
            400: "Validation errors"
        }
    )
    def create(self, request: Request) -> Response:
        """Create a new tenant user"""
        try:
            # Check permissions - only admins can create users
            if not hasattr(request.user, 'tenant_user_profile'):
                return Response(
                    {'error': 'User profile not found'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Validate that the circle_tenant_id matches the current user's tenant
            current_tenant = request.user.tenant_user_profile.tenant
            provided_tenant_id = request.data.get('circle_tenant_id')
            
            if str(current_tenant.id) != str(provided_tenant_id):
                return Response(
                    {'error': 'Cannot create users for different tenants'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                
                # Create the user and profile
                result = serializer.save()
                
                # Return the created user profile
                user_serializer = TenantUserSerializer(result['tenant_profile'])
                
                logger.info(f"User {result['user'].email} created successfully for tenant {current_tenant.organization_name}")
                
                return Response(
                    user_serializer.data, 
                    status=status.HTTP_201_CREATED
                )
                
        except Exception as e:
            logger.error(f"Error creating tenant user: {str(e)}")
            return Response(
                {'error': f'Failed to create user: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Get user details",
        description="Retrieve detailed information about a specific user",
        responses={200: TenantUserSerializer}
    )
    def retrieve(self, request: Request, pk=None) -> Response:
        """Get details of a specific user"""
        try:
            user_profile = self.get_object()
            serializer = self.get_serializer(user_profile)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error retrieving user {pk}: {str(e)}")
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @extend_schema(
        summary="Deactivate user",
        description="Deactivate a user account (does not delete the user)",
        responses={200: "User deactivated successfully"}
    )
    @action(detail=True, methods=['post'])
    def deactivate(self, request: Request, pk=None) -> Response:
        """Deactivate a user"""
        try:
            user_profile = self.get_object()
            
            # Deactivate both user and profile
            user_profile.user.is_active = False
            user_profile.is_active = False
            
            user_profile.user.save()
            user_profile.save()
            
            logger.info(f"User {user_profile.user.email} deactivated")
            
            return Response({
                'message': 'User deactivated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error deactivating user {pk}: {str(e)}")
            return Response(
                {'error': 'Failed to deactivate user'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Activate user",
        description="Activate a previously deactivated user account",
        responses={200: "User activated successfully"}
    )
    @action(detail=True, methods=['post'])
    def activate(self, request: Request, pk=None) -> Response:
        """Activate a user"""
        try:
            user_profile = self.get_object()
            
            # Activate both user and profile
            user_profile.user.is_active = True
            user_profile.is_active = True
            
            user_profile.user.save()
            user_profile.save()
            
            logger.info(f"User {user_profile.user.email} activated")
            
            return Response({
                'message': 'User activated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error activating user {pk}: {str(e)}")
            return Response(
                {'error': 'Failed to activate user'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Get user statistics",
        description="Get statistics about tenant users",
        responses={200: "User statistics"}
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request: Request) -> Response:
        """Get user statistics for the tenant"""
        try:
            queryset = self.get_queryset()
            
            stats = {
                'total_users': queryset.count(),
                'active_users': queryset.filter(is_active=True).count(),
                'inactive_users': queryset.filter(is_active=False).count(),
            }
            
            # Department breakdown
            department_counts = {}
            for profile in queryset.filter(is_active=True):
                dept = profile.department or 'Unassigned'
                department_counts[dept] = department_counts.get(dept, 0) + 1
            
            stats['department_breakdown'] = department_counts
            
            return Response(stats)
            
        except Exception as e:
            logger.error(f"Error getting user statistics: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve statistics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 
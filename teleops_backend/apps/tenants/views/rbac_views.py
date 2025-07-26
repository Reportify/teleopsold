"""
RBAC API Views
Provides REST API endpoints for tenant RBAC management.
"""

import logging
from typing import Dict, Any
from django.contrib.auth import get_user_model
from django.db.models import Q, Prefetch
from django.utils import timezone
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from core.permissions.tenant_permissions import IsTenantAdmin, IsTenantMember
from ..models import (
    Tenant, TenantUserProfile, PermissionRegistry, PermissionGroup,
    PermissionGroupPermission, UserPermissionGroupAssignment,
    UserPermissionOverride, DesignationBasePermission, 
    TenantDesignation, TenantDepartment, PermissionAuditTrail
)
from ..serializers.rbac_serializers import (
    PermissionRegistrySerializer, PermissionGroupSerializer,
    UserPermissionGroupAssignmentSerializer, UserPermissionOverrideSerializer,
    DesignationBasePermissionSerializer, UserEffectivePermissionsSerializer,
    PermissionCheckRequestSerializer, PermissionCheckResponseSerializer,
    PermissionAuditTrailSerializer, DepartmentSerializer, 
    TenantDesignationSerializer, TenantDepartmentSerializer
)
from ..services import get_rbac_service, get_permission_management_service

User = get_user_model()
logger = logging.getLogger(__name__)


class PermissionRegistryViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing tenant permission registry.
    """
    serializer_class = PermissionRegistrySerializer
    permission_classes = [IsTenantAdmin]
    
    def get_queryset(self):
        """Get permissions for current tenant."""
        return PermissionRegistry.objects.filter(
            tenant=self.request.user.tenant_user_profile.tenant
        ).order_by('permission_category', 'permission_name')
    
    @extend_schema(
        summary="Create a new permission",
        description="Create a new permission in the tenant's registry",
        responses={201: PermissionRegistrySerializer}
    )
    def create(self, request: Request) -> Response:
        """Create a new permission."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            permission_service = get_permission_management_service(tenant, request.user)
            
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            permission = permission_service.create_permission(serializer.validated_data)
            
            response_serializer = self.get_serializer(permission)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating permission: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Update permission",
        description="Update an existing permission",
        responses={200: PermissionRegistrySerializer}
    )
    def update(self, request: Request, pk=None) -> Response:
        """Update an existing permission."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            permission_service = get_permission_management_service(tenant, request.user)
            
            serializer = self.get_serializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            permission = permission_service.update_permission(int(pk), serializer.validated_data)
            
            response_serializer = self.get_serializer(permission)
            return Response(response_serializer.data)
            
        except Exception as e:
            logger.error(f"Error updating permission: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Delete permission",
        description="Soft delete (deactivate) a permission",
        responses={204: None}
    )
    def destroy(self, request: Request, pk=None) -> Response:
        """Soft delete a permission."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            permission_service = get_permission_management_service(tenant, request.user)
            
            permission_service.delete_permission(int(pk))
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            logger.error(f"Error deleting permission: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Get permission usage",
        description="Get information about where a permission is used",
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=True, methods=['get'])
    def usage(self, request: Request, pk=None) -> Response:
        """Get permission usage information."""
        try:
            permission = self.get_object()
            
            # Get usage statistics
            designation_count = DesignationBasePermission.objects.filter(
                permission=permission,
                is_active=True
            ).count()
            
            group_count = PermissionGroupPermission.objects.filter(
                permission=permission,
                is_active=True
            ).count()
            
            override_count = UserPermissionOverride.objects.filter(
                permission=permission,
                is_active=True
            ).count()
            
            usage_data = {
                'permission_id': permission.id,
                'permission_code': permission.permission_code,
                'total_usage': designation_count + group_count + override_count,
                'designation_assignments': designation_count,
                'group_assignments': group_count,
                'user_overrides': override_count,
                'can_delete': (designation_count + group_count + override_count) == 0
            }
            
            return Response(usage_data)
            
        except Exception as e:
            logger.error(f"Error getting permission usage: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class PermissionGroupViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing permission groups.
    """
    serializer_class = PermissionGroupSerializer
    permission_classes = [IsTenantAdmin]
    
    def get_queryset(self):
        """Get permission groups for current tenant."""
        return PermissionGroup.objects.filter(
            tenant=self.request.user.tenant_user_profile.tenant
        ).prefetch_related(
            'group_permissions__permission',
            'user_assignments__user_profile__user'
        ).order_by('group_name')
    
    @extend_schema(
        summary="Assign permissions to group",
        description="Assign multiple permissions to a permission group",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=True, methods=['post'])
    def assign_permissions(self, request: Request, pk=None) -> Response:
        """Assign permissions to a group."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            permission_service = get_permission_management_service(tenant, request.user)
            
            permission_assignments = request.data.get('permissions', [])
            if not permission_assignments:
                return Response(
                    {'error': 'No permissions provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            assignments = permission_service.assign_permissions_to_group(
                int(pk), 
                permission_assignments
            )
            
            return Response({
                'success': True,
                'assigned_count': len(assignments),
                'assigned_permissions': [
                    {
                        'permission_id': a.permission.id,
                        'permission_code': a.permission.permission_code,
                        'permission_level': a.permission_level
                    }
                    for a in assignments
                ]
            })
            
        except Exception as e:
            logger.error(f"Error assigning permissions to group: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Assign user to group",
        description="Assign a user to a permission group",
        request=OpenApiTypes.OBJECT,
        responses={200: UserPermissionGroupAssignmentSerializer}
    )
    @action(detail=True, methods=['post'])
    def assign_user(self, request: Request, pk=None) -> Response:
        """Assign a user to a permission group."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            permission_service = get_permission_management_service(tenant, request.user)
            
            user_profile_id = request.data.get('user_profile_id')
            if not user_profile_id:
                return Response(
                    {'error': 'user_profile_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            assignment_data = {
                'assignment_reason': request.data.get('assignment_reason', ''),
                'scope_override': request.data.get('scope_override', {}),
                'effective_from': request.data.get('effective_from'),
                'effective_to': request.data.get('effective_to'),
                'is_temporary': request.data.get('is_temporary', False)
            }
            
            assignment = permission_service.assign_user_to_group(
                user_profile_id,
                int(pk),
                assignment_data
            )
            
            serializer = UserPermissionGroupAssignmentSerializer(assignment)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error assigning user to group: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class UserPermissionViewSet(viewsets.ViewSet):
    """
    API endpoints for user permission queries and management.
    """
    permission_classes = [IsTenantMember]
    
    @extend_schema(
        summary="Get user effective permissions",
        description="Get all effective permissions for a user",
        parameters=[
            OpenApiParameter(
                name='user_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='User ID (optional, defaults to current user)'
            ),
            OpenApiParameter(
                name='force_refresh',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Force cache refresh'
            )
        ],
        responses={200: UserEffectivePermissionsSerializer}
    )
    @action(detail=False, methods=['get'])
    def effective_permissions(self, request: Request) -> Response:
        """Get effective permissions for a user."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            rbac_service = get_rbac_service(tenant)
            
            # Get target user (default to current user)
            user_id = request.query_params.get('user_id')
            if user_id:
                # Admin can query other users
                if not request.user.is_staff:  # Add proper admin check
                    return Response(
                        {'error': 'Permission denied'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                target_user_profile = TenantUserProfile.objects.get(
                    user_id=user_id,
                    tenant=tenant
                )
            else:
                target_user_profile = request.user.tenant_user_profile
            
            force_refresh = request.query_params.get('force_refresh', '').lower() == 'true'
            
            permissions = rbac_service.get_user_effective_permissions(
                target_user_profile,
                force_refresh=force_refresh
            )
            
            return Response(permissions)
            
        except TenantUserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting user permissions: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Check specific permission",
        description="Check if user has a specific permission",
        request=PermissionCheckRequestSerializer,
        responses={200: PermissionCheckResponseSerializer}
    )
    @action(detail=False, methods=['post'])
    def check_permission(self, request: Request) -> Response:
        """Check if user has a specific permission."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            rbac_service = get_rbac_service(tenant)
            
            serializer = PermissionCheckRequestSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            permission_code = serializer.validated_data['permission_code']
            scope_context = serializer.validated_data.get('scope_context')
            user_id = serializer.validated_data.get('user_id')
            
            # Get target user
            if user_id:
                # Admin can check other users
                if not request.user.is_staff:  # Add proper admin check
                    return Response(
                        {'error': 'Permission denied'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                target_user_profile = TenantUserProfile.objects.get(
                    user_id=user_id,
                    tenant=tenant
                )
            else:
                target_user_profile = request.user.tenant_user_profile
            
            has_permission, details = rbac_service.check_permission(
                target_user_profile,
                permission_code,
                scope_context
            )
            
            response_data = {
                'has_permission': has_permission,
                'permission_code': permission_code,
                'user_id': target_user_profile.user.id,
                'details': details,
                'checked_at': timezone.now().isoformat()
            }
            
            return Response(response_data)
            
        except TenantUserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error checking permission: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Create user permission override",
        description="Create a user-specific permission override",
        request=UserPermissionOverrideSerializer,
        responses={201: UserPermissionOverrideSerializer}
    )
    @action(detail=False, methods=['post'])
    def create_override(self, request: Request) -> Response:
        """Create a user permission override."""
        try:
            # Only admins can create overrides
            if not request.user.is_staff:  # Add proper admin check
                return Response(
                    {'error': 'Permission denied'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            tenant = request.user.tenant_user_profile.tenant
            permission_service = get_permission_management_service(tenant, request.user)
            
            serializer = UserPermissionOverrideSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user_profile_id = serializer.validated_data.pop('user_profile_id')
            
            override = permission_service.create_user_permission_override(
                user_profile_id,
                serializer.validated_data
            )
            
            response_serializer = UserPermissionOverrideSerializer(override)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating permission override: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class PermissionAuditViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoints for permission audit trail.
    """
    serializer_class = PermissionAuditTrailSerializer
    permission_classes = [IsTenantAdmin]
    
    def get_queryset(self):
        """Get audit trail for current tenant."""
        return PermissionAuditTrail.objects.filter(
            tenant=self.request.user.tenant_user_profile.tenant
        ).select_related(
            'performed_by'
        ).order_by('-performed_at')
    
    @extend_schema(
        summary="Get permission audit trail",
        description="Get permission-related audit events",
        parameters=[
            OpenApiParameter(
                name='entity_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by entity type'
            ),
            OpenApiParameter(
                name='entity_id',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by entity ID'
            ),
            OpenApiParameter(
                name='action',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by action type'
            ),
            OpenApiParameter(
                name='performed_by',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Filter by user who performed action'
            )
        ]
    )
    def list(self, request: Request) -> Response:
        """List audit trail entries with filtering."""
        queryset = self.get_queryset()
        
        # Apply filters
        entity_type = request.query_params.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        
        entity_id = request.query_params.get('entity_id')
        if entity_id:
            queryset = queryset.filter(entity_id=entity_id)
        
        action = request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        performed_by = request.query_params.get('performed_by')
        if performed_by:
            queryset = queryset.filter(performed_by_id=performed_by)
        
        # Paginate
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing tenant departments.
    """
    serializer_class = DepartmentSerializer
    permission_classes = [IsTenantMember]
    
    def get_queryset(self):
        """Get departments for current tenant."""
        return TenantDepartment.objects.filter(
            tenant=self.request.user.tenant_user_profile.tenant,
            is_active=True
        ).order_by('department_name')
    
    @extend_schema(
        summary="List departments",
        description="Get all departments for the current tenant",
        responses={200: DepartmentSerializer(many=True)}
    )
    def list(self, request: Request) -> Response:
        """List all departments."""
        try:
            queryset = self.get_queryset()
            # Search filter
            search = request.query_params.get('search')
            if search:
                queryset = queryset.filter(
                    Q(department_name__icontains=search) | Q(description__icontains=search)
                )
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'departments': serializer.data,
                'count': queryset.count()
            })
        except Exception as e:
            logger.error(f"Error listing departments: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Create department",
        description="Create a new department",
        responses={201: DepartmentSerializer}
    )
    def create(self, request: Request) -> Response:
        """Create a new department."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Auto-generate department_code from department_name if not provided
            validated_data = serializer.validated_data
            if not validated_data.get('department_code'):
                validated_data['department_code'] = validated_data['department_name'].lower().replace(' ', '_')
            validated_data['tenant'] = tenant
            validated_data['created_by'] = request.user
            
            department = TenantDepartment.objects.create(**validated_data)
            
            response_serializer = self.get_serializer(department)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating department: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class TenantDesignationViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing tenant designations.
    """
    serializer_class = TenantDesignationSerializer
    permission_classes = [IsTenantMember]
    
    def get_queryset(self):
        """Get designations for current tenant."""
        return TenantDesignation.objects.filter(
            tenant=self.request.user.tenant_user_profile.tenant,
            is_active=True
        ).select_related('department', 'created_by').order_by('designation_level', 'designation_name')
    
    @extend_schema(
        summary="List designations",
        description="Get all designations for the current tenant",
        responses={200: TenantDesignationSerializer(many=True)}
    )
    def list(self, request: Request) -> Response:
        """List all designations."""
        try:
            queryset = self.get_queryset()
            
            # Search filter
            search = request.query_params.get('search')
            if search:
                queryset = queryset.filter(
                    Q(designation_name__icontains=search) | 
                    Q(department__department_name__icontains=search) |
                    Q(description__icontains=search)
                )
            
            # Type filter
            designation_type = request.query_params.get('type')
            if designation_type in ['field', 'non_field']:
                queryset = queryset.filter(designation_type=designation_type)
            
            # Department filter
            department = request.query_params.get('department')
            if department and str(department).strip() and department != '0':
                try:
                    department_id = int(department)
                    queryset = queryset.filter(department=department_id)
                except (ValueError, TypeError):
                    pass  # Skip invalid department filter
            
            serializer = self.get_serializer(queryset, many=True)
            
            # Calculate statistics
            total = queryset.count()
            field_count = queryset.filter(designation_type='field').count()
            non_field_count = queryset.filter(designation_type='non_field').count()
            departments = queryset.values_list('department__department_name', flat=True).distinct()
            
            return Response({
                'designations': serializer.data,
                'statistics': {
                    'total': total,
                    'field': field_count,
                    'non_field': non_field_count,
                    'departments_count': len(list(departments))
                }
            })
            
        except Exception as e:
            logger.error(f"Error listing designations: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Create designation",
        description="Create a new designation",
        responses={201: TenantDesignationSerializer}
    )
    def create(self, request: Request) -> Response:
        """Create a new designation."""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            designation = serializer.save()
            
            return Response(
                self.get_serializer(designation).data, 
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Error creating designation: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Update designation",
        description="Update an existing designation",
        responses={200: TenantDesignationSerializer}
    )
    def update(self, request: Request, pk=None) -> Response:
        """Update an existing designation."""
        try:
            designation = self.get_object()
            serializer = self.get_serializer(designation, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            designation = serializer.save()
            
            return Response(self.get_serializer(designation).data)
            
        except Exception as e:
            logger.error(f"Error updating designation: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Delete designation",
        description="Delete a designation (soft delete)",
        responses={204: None}
    )
    def destroy(self, request: Request, pk=None) -> Response:
        """Delete a designation (soft delete)."""
        try:
            designation = self.get_object()
            
            # Check if designation has users assigned
            from ..models import UserDesignationAssignment
            assigned_users = UserDesignationAssignment.objects.filter(
                designation=designation,
                is_active=True,
                assignment_status='Active'
            ).count()
            
            if assigned_users > 0:
                return Response(
                    {'error': f'Cannot delete designation. {assigned_users} users are assigned to this designation.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Soft delete
            designation.is_active = False
            designation.deleted_at = timezone.now()
            designation.save()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            logger.error(f"Error deleting designation: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class TenantDepartmentViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing tenant departments.
    """
    serializer_class = TenantDepartmentSerializer
    permission_classes = [IsTenantMember]
    
    def get_queryset(self):
        """Get departments for current tenant."""
        return TenantDepartment.objects.filter(
            tenant=self.request.user.tenant_user_profile.tenant,
            is_active=True
        ).order_by('department_level', 'department_name')
    
    @extend_schema(
        summary="List departments",
        description="Get all departments for the current tenant",
        responses={200: TenantDepartmentSerializer(many=True)}
    )
    def list(self, request: Request) -> Response:
        """List all departments for the tenant."""
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            
            # Get statistics
            total = queryset.count()
            operational_count = queryset.filter(is_operational=True).count()
            non_operational_count = queryset.filter(is_operational=False).count()
            
            return Response({
                'departments': serializer.data,
                'statistics': {
                    'total': total,
                    'operational': operational_count,
                    'non_operational': non_operational_count
                }
            })
            
        except Exception as e:
            logger.error(f"Error listing departments: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Create department",
        description="Create a new department",
        responses={201: TenantDepartmentSerializer}
    )
    def create(self, request: Request) -> Response:
        """Create a new department."""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            department = serializer.save()
            
            return Response(
                self.get_serializer(department).data, 
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Error creating department: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Update department",
        description="Update an existing department",
        responses={200: TenantDepartmentSerializer}
    )
    def update(self, request: Request, pk=None) -> Response:
        """Update an existing department."""
        try:
            department = self.get_object()
            serializer = self.get_serializer(department, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            department = serializer.save()
            
            return Response(self.get_serializer(department).data)
            
        except Exception as e:
            logger.error(f"Error updating department: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Delete department",
        description="Delete a department (soft delete)",
        responses={204: None}
    )
    def destroy(self, request: Request, pk=None) -> Response:
        """Delete a department (soft delete)."""
        try:
            department = self.get_object()
            
            # Check if department has users assigned
            assigned_users = department.tenant_user_profiles.filter(is_active=True).count()
            
            if assigned_users > 0:
                return Response(
                    {'error': f'Cannot delete department. {assigned_users} users are assigned to this department.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Soft delete
            department.is_active = False
            department.deleted_at = timezone.now()
            department.save()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            logger.error(f"Error deleting department: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            ) 
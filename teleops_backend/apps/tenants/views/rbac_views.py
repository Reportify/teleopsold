"""
RBAC API Views
Provides REST API endpoints for tenant RBAC management.
"""

import logging
from typing import Dict, Any, List
from django.contrib.auth import get_user_model
from django.db.models import Q, Prefetch
from django.utils import timezone
from datetime import timedelta
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from core.permissions.tenant_permissions import IsTenantAdmin, IsTenantMember
from ..models import (
    Tenant, PermissionRegistry, DesignationBasePermission, 
    UserPermissionOverride, PermissionGroup, PermissionGroupPermission,
    UserPermissionGroupAssignment, PermissionAuditTrail, TenantUserProfile,
    TenantDesignation, PermissionCategory, TenantDepartment
)
from ..serializers.rbac_serializers import (
    PermissionRegistrySerializer, DesignationBasePermissionSerializer,
    UserPermissionOverrideSerializer, PermissionGroupSerializer,
    UserPermissionGroupAssignmentSerializer, PermissionAuditTrailSerializer,
    PermissionCategorySerializer, UserEffectivePermissionsSerializer,
    PermissionCheckRequestSerializer, PermissionCheckResponseSerializer,
    DepartmentSerializer, TenantDesignationSerializer, TenantDepartmentSerializer
)
from ..services import get_rbac_service, get_permission_management_service

User = get_user_model()
logger = logging.getLogger(__name__)


class PermissionCategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing permission categories.
    """
    serializer_class = PermissionCategorySerializer
    permission_classes = [IsTenantAdmin]
    
    def get_queryset(self):
        """Get permission categories for current tenant."""
        return PermissionCategory.objects.filter(
            tenant=self.request.user.tenant_user_profile.tenant
        ).order_by('sort_order', 'category_name')


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
    
    @extend_schema(
        summary="Bulk grant permissions",
        description="Grant permissions to multiple targets (users, designations, groups)",
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['post'])
    def bulk_grant(self, request: Request) -> Response:
        """Bulk grant permissions."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            rbac_service = get_rbac_service(tenant)
            
            permission_ids = request.data.get('permission_ids', [])
            target_type = request.data.get('target_type')  # 'users', 'designations', 'groups'
            target_ids = request.data.get('target_ids', [])
            reason = request.data.get('reason', '')
            
            if not all([permission_ids, target_type, target_ids]):
                return Response(
                    {'error': 'Missing required fields: permission_ids, target_type, target_ids'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            results = []
            for permission_id in permission_ids:
                for target_id in target_ids:
                    try:
                        if target_type == 'users':
                            # Grant to user via override
                            user_profile = TenantUserProfile.objects.get(id=target_id, tenant=tenant)
                            permission = PermissionRegistry.objects.get(id=permission_id, tenant=tenant)
                            
                            override_data = {
                                'user_profile': user_profile,
                                'permission': permission,
                                'override_type': 'addition',
                                'permission_level': 'granted',
                                'override_reason': reason,
                                'granted_by': request.user.tenant_user_profile
                            }
                            
                            override, created = UserPermissionOverride.objects.get_or_create(
                                user_profile=user_profile,
                                permission=permission,
                                defaults=override_data
                            )
                            
                            results.append({
                                'permission_id': permission_id,
                                'target_id': target_id,
                                'target_type': target_type,
                                'success': True,
                                'created': created
                            })
                            
                        elif target_type == 'designations':
                            # Grant to designation
                            designation = TenantDesignation.objects.get(id=target_id, tenant=tenant)
                            permission = PermissionRegistry.objects.get(id=permission_id, tenant=tenant)
                            
                            perm_data = {
                                'designation': designation,
                                'permission': permission,
                                'permission_level': 'granted',
                                'granted_by': request.user.tenant_user_profile
                            }
                            
                            perm, created = DesignationBasePermission.objects.get_or_create(
                                designation=designation,
                                permission=permission,
                                defaults=perm_data
                            )
                            
                            results.append({
                                'permission_id': permission_id,
                                'target_id': target_id,
                                'target_type': target_type,
                                'success': True,
                                'created': created
                            })
                            
                    except Exception as e:
                        results.append({
                            'permission_id': permission_id,
                            'target_id': target_id,
                            'target_type': target_type,
                            'success': False,
                            'error': str(e)
                        })
            
            return Response({
                'success': True,
                'message': f'Bulk grant operation completed',
                'results': results
            })
            
        except Exception as e:
            logger.error(f"Error in bulk grant: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Bulk revoke permissions",
        description="Revoke permissions from multiple targets",
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['post'])
    def bulk_revoke(self, request: Request) -> Response:
        """Bulk revoke permissions."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            
            permission_ids = request.data.get('permission_ids', [])
            target_type = request.data.get('target_type')
            target_ids = request.data.get('target_ids', [])
            reason = request.data.get('reason', '')
            
            results = []
            for permission_id in permission_ids:
                for target_id in target_ids:
                    try:
                        if target_type == 'users':
                            # Remove user overrides or add restriction
                            UserPermissionOverride.objects.filter(
                                user_profile_id=target_id,
                                permission_id=permission_id,
                                user_profile__tenant=tenant
                            ).update(is_active=False)
                            
                        elif target_type == 'designations':
                            # Deactivate designation permissions
                            DesignationBasePermission.objects.filter(
                                designation_id=target_id,
                                permission_id=permission_id,
                                designation__tenant=tenant
                            ).update(is_active=False)
                        
                        results.append({
                            'permission_id': permission_id,
                            'target_id': target_id,
                            'target_type': target_type,
                            'success': True
                        })
                        
                    except Exception as e:
                        results.append({
                            'permission_id': permission_id,
                            'target_id': target_id,
                            'target_type': target_type,
                            'success': False,
                            'error': str(e)
                        })
            
            return Response({
                'success': True,
                'message': f'Bulk revoke operation completed',
                'results': results
            })
            
        except Exception as e:
            logger.error(f"Error in bulk revoke: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Get permission matrix",
        description="Get comprehensive permission matrix for all users and permissions",
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['get'])
    def matrix(self, request: Request) -> Response:
        """Get permission matrix."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            
            # Get all active permissions
            permissions = PermissionRegistry.objects.filter(
                tenant=tenant,
                is_active=True
            ).values('id', 'permission_code', 'permission_name')
            
            # Get all users in tenant
            users = TenantUserProfile.objects.filter(
                tenant=tenant,
                is_active=True
            ).select_related('user').values(
                'id', 
                'user__username', 
                'user__first_name', 
                'user__last_name'
            )
            
            # Create matrix (simplified version)
            matrix = {}
            for user in users:
                user_key = f"user_{user['id']}"
                matrix[user_key] = {}
                for permission in permissions:
                    perm_key = permission['permission_code']
                    # In a real implementation, check actual permissions
                    matrix[user_key][perm_key] = False  # Placeholder
            
            return Response({
                'users': list(users),
                'permissions': list(permissions),
                'matrix': matrix
            })
            
        except Exception as e:
            logger.error(f"Error getting permission matrix: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Get permission usage analytics",
        description="Get analytics on permission usage patterns",
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['get'])
    def usage_analytics(self, request: Request) -> Response:
        """Get permission usage analytics."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            
            # Basic analytics (can be expanded)
            permissions = PermissionRegistry.objects.filter(tenant=tenant, is_active=True)
            
            usage_by_permission = {}
            usage_by_user = {}
            
            for permission in permissions:
                # Count usage across different assignment types
                designation_count = DesignationBasePermission.objects.filter(
                    permission=permission, is_active=True
                ).count()
                
                group_count = PermissionGroupPermission.objects.filter(
                    permission=permission, is_active=True
                ).count()
                
                override_count = UserPermissionOverride.objects.filter(
                    permission=permission, is_active=True
                ).count()
                
                usage_by_permission[permission.permission_code] = {
                    'total': designation_count + group_count + override_count,
                    'designation_assignments': designation_count,
                    'group_assignments': group_count,
                    'user_overrides': override_count
                }
            
            return Response({
                'usage_by_permission': usage_by_permission,
                'usage_by_user': usage_by_user,
                'usage_trends': [],  # Placeholder for trend data
                'risk_analysis': {}  # Placeholder for risk analysis
            })
            
        except Exception as e:
            logger.error(f"Error getting usage analytics: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Get compliance report",
        description="Generate compliance report for permissions",
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['get'])
    def compliance_report(self, request: Request) -> Response:
        """Get compliance report."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            
            # Basic compliance metrics
            total_permissions = PermissionRegistry.objects.filter(tenant=tenant, is_active=True).count()
            high_risk_permissions = PermissionRegistry.objects.filter(
                tenant=tenant, 
                is_active=True,
                risk_level__in=['high', 'critical']
            ).count()
            
            compliance_score = max(0, 100 - (high_risk_permissions * 10))  # Simple scoring
            
            return Response({
                'compliance_score': compliance_score,
                'violations': [],  # Placeholder
                'recommendations': [
                    'Review high-risk permission assignments',
                    'Implement regular permission audits',
                    'Enable multi-factor authentication for critical permissions'
                ],
                'audit_summary': {
                    'total_permissions': total_permissions,
                    'high_risk_permissions': high_risk_permissions,
                    'last_audit_date': timezone.now().isoformat()
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting compliance report: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Validate permission assignment",
        description="Validate if a permission assignment is valid",
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['post'])
    def validate(self, request: Request) -> Response:
        """Validate permission assignment."""
        try:
            permission_id = request.data.get('permission_id')
            target_type = request.data.get('target_type')
            target_id = request.data.get('target_id')
            assignment_type = request.data.get('assignment_type')
            
            if not all([permission_id, target_type, target_id, assignment_type]):
                return Response(
                    {'error': 'Missing required fields'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Basic validation (can be expanded)
            conflicts = []
            warnings = []
            recommendations = []
            
            # Check if permission exists
            try:
                permission = PermissionRegistry.objects.get(
                    id=permission_id,
                    tenant=request.user.tenant_user_profile.tenant,
                    is_active=True
                )
                
                if permission.risk_level in ['high', 'critical']:
                    warnings.append(f'This is a {permission.risk_level} risk permission')
                
                if permission.requires_mfa:
                    recommendations.append('Multi-factor authentication recommended')
                    
            except PermissionRegistry.DoesNotExist:
                conflicts.append('Permission not found or inactive')
            
            return Response({
                'is_valid': len(conflicts) == 0,
                'conflicts': conflicts,
                'warnings': warnings,
                'recommendations': recommendations
            })
            
        except Exception as e:
            logger.error(f"Error validating permission assignment: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Simulate permission changes",
        description="Simulate the effects of permission changes",
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['post'])
    def simulate(self, request: Request) -> Response:
        """Simulate permission changes."""
        try:
            changes = request.data.get('changes', [])
            
            simulated_results = []
            potential_conflicts = []
            affected_users = set()
            
            for change in changes:
                permission_id = change.get('permission_id')
                target_type = change.get('target_type')
                target_id = change.get('target_id')
                action = change.get('action')
                
                # Simulate the change
                if target_type == 'users':
                    affected_users.add(target_id)
                
                simulated_results.append({
                    'permission_id': permission_id,
                    'target_type': target_type,
                    'target_id': target_id,
                    'action': action,
                    'result': 'success',  # Simplified simulation
                    'impact': 'low'
                })
            
            return Response({
                'simulated_results': simulated_results,
                'potential_conflicts': potential_conflicts,
                'affected_users': list(affected_users)
            })
            
        except Exception as e:
            logger.error(f"Error simulating permission changes: {str(e)}")
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
        summary="Update permission group",
        description="Update an existing permission group",
        responses={200: PermissionGroupSerializer}
    )
    def update(self, request: Request, pk=None) -> Response:
        """Update an existing permission group."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            permission_service = get_permission_management_service(tenant, request.user)
            
            serializer = self.get_serializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            # Use the service method for proper business logic
            group = permission_service.update_permission_group(int(pk), serializer.validated_data)
            
            response_serializer = self.get_serializer(group)
            return Response(response_serializer.data)
            
        except Exception as e:
            logger.error(f"Error updating permission group: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
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
        summary="Assign users to group",
        description="Assign multiple users to a permission group",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=True, methods=['post'])
    def assign_users(self, request: Request, pk=None) -> Response:
        """Assign users to a permission group."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            user_ids = request.data.get('user_ids', [])
            
            if not user_ids:
                return Response(
                    {'error': 'No user IDs provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            group = self.get_object()
            assigned_users = []
            
            for user_id in user_ids:
                try:
                    user_profile = TenantUserProfile.objects.get(id=user_id, tenant=tenant)
                    assignment, created = UserPermissionGroupAssignment.objects.get_or_create(
                        user_profile=user_profile,
                        group=group,
                        defaults={
                            'assigned_by': request.user.tenant_user_profile,
                            'assignment_reason': 'Manual group assignment'
                        }
                    )
                    
                    assigned_users.append({
                        'user_id': user_id,
                        'username': user_profile.user.username,
                        'created': created
                    })
                    
                except TenantUserProfile.DoesNotExist:
                    continue
            
            return Response({
                'success': True,
                'message': f'Assigned {len(assigned_users)} users to group',
                'assigned_users': assigned_users
            })
            
        except Exception as e:
            logger.error(f"Error assigning users to group: {str(e)}")
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
        description="Create a permission override for a specific user",
        request=UserPermissionOverrideSerializer,
        responses={201: UserPermissionOverrideSerializer}
    )
    @action(detail=False, methods=['post'])
    def create_override(self, request: Request) -> Response:
        """Create a user permission override."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            
            # Check if user has admin permissions
            if not request.user.is_staff:
                return Response(
                    {'error': 'Permission denied'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = UserPermissionOverrideSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Ensure user belongs to same tenant
            user_profile = TenantUserProfile.objects.get(
                id=serializer.validated_data['user_profile_id'],
                tenant=tenant
            )
            
            # Ensure permission belongs to same tenant
            permission = PermissionRegistry.objects.get(
                id=serializer.validated_data['permission_id'],
                tenant=tenant
            )
            
            override_data = serializer.validated_data.copy()
            override_data['user_profile'] = user_profile
            override_data['permission'] = permission
            override_data['granted_by'] = request.user.tenant_user_profile
            
            # Remove the ID fields since we're using the objects
            override_data.pop('user_profile_id', None)
            override_data.pop('permission_id', None)
            
            override = UserPermissionOverride.objects.create(**override_data)
            
            response_serializer = UserPermissionOverrideSerializer(override)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except TenantUserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except PermissionRegistry.DoesNotExist:
            return Response(
                {'error': 'Permission not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error creating permission override: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Get permission dashboard data",
        description="Get comprehensive permission dashboard data for a user including sources, conflicts, and history",
        parameters=[
            OpenApiParameter(
                name='user_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='User ID to get dashboard for (admin only)'
            )
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['get'])
    def permission_dashboard(self, request: Request) -> Response:
        """Get comprehensive permission dashboard data for a user."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            rbac_service = get_rbac_service(tenant)
            
            # Get target user (default to current user)
            user_id = request.query_params.get('user_id')
            if user_id:
                # Check if user has admin permissions
                user_permissions = rbac_service.get_user_effective_permissions(request.user.tenant_user_profile)
                if not ('rbac.manage_users' in user_permissions.get('permissions', []) or 
                       request.user.is_staff):
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
            
            # Get effective permissions
            effective_permissions = rbac_service.get_user_effective_permissions(target_user_profile)
            
            # Get detailed permission sources
            permission_sources = self._get_permission_sources(target_user_profile, tenant)
            
            # Get assignment history
            assignment_history = self._get_assignment_history(target_user_profile)
            
            # Get permission conflicts
            conflicts = self._get_permission_conflicts(target_user_profile)
            
            # Get risk analysis
            risk_analysis = self._get_risk_analysis(effective_permissions['permissions'])
            
            # User profile summary
            user_summary = {
                'user_id': target_user_profile.user.id,
                'name': target_user_profile.user.full_name,
                'email': target_user_profile.user.email,
                'employee_id': target_user_profile.employee_id,
                'job_title': target_user_profile.job_title,
                'department': target_user_profile.department,
                'is_active': target_user_profile.is_active,
                'last_login': target_user_profile.last_login,
            }
            
            return Response({
                'user_summary': user_summary,
                'effective_permissions': effective_permissions,
                'permission_sources': permission_sources,
                'assignment_history': assignment_history,
                'conflicts': conflicts,
                'risk_analysis': risk_analysis,
                'statistics': {
                    'total_permissions': len(effective_permissions['permissions']),
                    'designation_permissions': len(permission_sources['designation_permissions']),
                    'group_permissions': len(permission_sources['group_permissions']),
                    'override_permissions': len(permission_sources['override_permissions']),
                    'conflicts_count': len(conflicts),
                    'high_risk_permissions': len([p for p in risk_analysis if risk_analysis[p].get('risk_level') in ['high', 'critical']])
                }
            })
            
        except TenantUserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting permission dashboard: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _get_permission_sources(self, user_profile: TenantUserProfile, tenant: Tenant) -> Dict[str, Any]:
        """Get detailed breakdown of permission sources."""
        sources = {
            'designation_permissions': [],
            'group_permissions': [],
            'override_permissions': []
        }
        
        # Designation permissions
        designation_assignments = user_profile.designation_assignments.filter(
            is_active=True
        ).select_related('designation').prefetch_related(
            'designation__base_permissions__permission'
        )
        
        for assignment in designation_assignments:
            for base_perm in assignment.designation.base_permissions.filter(is_active=True):
                sources['designation_permissions'].append({
                    'permission_id': base_perm.permission.id,
                    'permission_code': base_perm.permission.permission_code,
                    'permission_name': base_perm.permission.permission_name,
                    'permission_level': base_perm.permission_level,
                    'source_type': 'designation',
                    'source_name': assignment.designation.designation_name,
                    'source_id': assignment.designation.id,
                    'risk_level': base_perm.permission.risk_level,
                    'is_mandatory': base_perm.is_mandatory,
                    'scope_configuration': base_perm.scope_configuration,
                    'effective_from': assignment.effective_from,
                    'effective_to': assignment.effective_to
                })
        
        # Group permissions
        group_assignments = user_profile.permission_group_assignments.filter(
            is_active=True
        ).select_related('group').prefetch_related(
            'group__group_permissions__permission'
        )
        
        for assignment in group_assignments:
            for group_perm in assignment.group.group_permissions.filter(is_active=True):
                sources['group_permissions'].append({
                    'permission_id': group_perm.permission.id,
                    'permission_code': group_perm.permission.permission_code,
                    'permission_name': group_perm.permission.permission_name,
                    'permission_level': group_perm.permission_level,
                    'source_type': 'group',
                    'source_name': assignment.group.group_name,
                    'source_id': assignment.group.id,
                    'risk_level': group_perm.permission.risk_level,
                    'is_mandatory': group_perm.is_mandatory,
                    'scope_configuration': group_perm.scope_configuration,
                    'effective_from': assignment.effective_from,
                    'effective_to': assignment.effective_to,
                    'assignment_reason': assignment.assignment_reason
                })
        
        # User overrides
        overrides = user_profile.permission_overrides.filter(
            is_active=True,
            approval_status='approved'
        ).select_related('permission')
        
        for override in overrides:
            sources['override_permissions'].append({
                'permission_id': override.permission.id,
                'permission_code': override.permission.permission_code,
                'permission_name': override.permission.permission_name,
                'permission_level': override.permission_level,
                'source_type': 'override',
                'source_name': f"{override.get_override_type_display()} Override",
                'source_id': override.id,
                'risk_level': override.permission.risk_level,
                'override_type': override.override_type,
                'override_reason': override.override_reason,
                'business_justification': override.business_justification,
                'requires_mfa': override.requires_mfa,
                'effective_from': override.effective_from,
                'effective_to': override.effective_to,
                'is_temporary': override.is_temporary
            })
        
        return sources

    @extend_schema(
        summary="Get current user profile",
        description="Get the current user's tenant profile information",
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['get'])
    def current_profile(self, request: Request) -> Response:
        """Get current user's tenant profile."""
        try:
            user_profile = request.user.tenant_user_profile
            
            response_data = {
                'id': user_profile.id,
                'user_id': user_profile.user.id,
                'email': user_profile.user.email,
                'first_name': user_profile.user.first_name,
                'last_name': user_profile.user.last_name,
                'display_name': user_profile.display_name,
                'phone_number': user_profile.phone_number,
                'employee_id': user_profile.employee_id,
                'job_title': user_profile.job_title,
                'department': user_profile.department,
                'employment_type': user_profile.employment_type,
                'is_active': user_profile.is_active,
                'last_login': user_profile.last_login,
                'created_at': user_profile.created_at,
                'updated_at': user_profile.updated_at
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting current user profile: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        summary="Get user designations",
        description="Get designations for a specific user ID",
        parameters=[
            OpenApiParameter(
                name='user_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='User ID to get designations for'
            )
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['get'])
    def designations(self, request: Request) -> Response:
        """Get designations for a specific user."""
        try:
            from ..models import TenantUserProfile, UserDesignationAssignment
            
            user_id = request.query_params.get('user_id')
            if not user_id:
                return Response(
                    {'error': 'user_id parameter is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            tenant = request.user.tenant_user_profile.tenant
            
            # Get the user profile
            try:
                user_profile = TenantUserProfile.objects.get(
                    id=user_id,
                    tenant=tenant,
                    is_active=True
                )
            except TenantUserProfile.DoesNotExist:
                return Response(
                    {'error': 'User not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get user's designation assignments
            assignments = UserDesignationAssignment.objects.filter(
                user_profile=user_profile,
                is_active=True,
                assignment_status='Active'
            ).select_related('designation').order_by('-is_primary_designation', 'designation__designation_level')
            
            designations_data = []
            for assignment in assignments:
                designation = assignment.designation
                designations_data.append({
                    'assignment_id': assignment.id,
                    'designation_id': designation.id,
                    'designation_name': designation.designation_name,
                    'designation_code': designation.designation_code,
                    'designation_level': designation.designation_level,
                    'department': designation.department.department_name if designation.department else None,
                    'is_primary': assignment.is_primary_designation,
                    'is_temporary': assignment.is_temporary,
                    'effective_from': assignment.effective_from,
                    'effective_to': assignment.effective_to,
                    'assignment_status': assignment.assignment_status,
                    'data_access_level': designation.data_access_level,
                    'designation_type': designation.designation_type
                })
            
            return Response(designations_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting user designations: {str(e)}")
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


    @extend_schema(
        summary="Get designation permissions",
        description="Get all permissions assigned to a designation",
        responses={200: DesignationBasePermissionSerializer(many=True)}
    )
    @action(detail=True, methods=['get'])
    def permissions(self, request: Request, pk=None) -> Response:
        """Get permissions for a designation."""
        try:
            designation = self.get_object()
            permissions = DesignationBasePermission.objects.filter(
                designation=designation,
                is_active=True
            ).select_related('permission')
            
            serializer = DesignationBasePermissionSerializer(permissions, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error getting designation permissions: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Grant permission to designation",
        description="Grant a permission to a designation",
        request=OpenApiTypes.OBJECT,
        responses={201: DesignationBasePermissionSerializer}
    )
    @action(detail=True, methods=['post'], url_path='permissions')
    def grant_permission(self, request: Request, pk=None) -> Response:
        """Grant a permission to a designation."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            designation = self.get_object()
            
            permission_code = request.data.get('permission_code')
            permission_level = request.data.get('permission_level', 'granted')
            
            if not permission_code:
                return Response(
                    {'error': 'permission_code is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the permission
            try:
                permission = PermissionRegistry.objects.get(
                    permission_code=permission_code,
                    tenant=tenant,
                    is_active=True
                )
            except PermissionRegistry.DoesNotExist:
                return Response(
                    {'error': 'Permission not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create or update the designation permission
            designation_permission, created = DesignationBasePermission.objects.get_or_create(
                designation=designation,
                permission=permission,
                defaults={
                    'permission_level': permission_level,
                    'scope_configuration': request.data.get('scope_configuration', {}),
                    'geographic_scope': request.data.get('geographic_scope', []),
                    'functional_scope': request.data.get('functional_scope', []),
                    'temporal_scope': request.data.get('temporal_scope', {}),
                    'is_inherited': request.data.get('is_inherited', True),
                    'is_mandatory': request.data.get('is_mandatory', False),
                    'priority_level': request.data.get('priority_level', 100),
                    'granted_by': request.user.tenant_user_profile
                }
            )
            
            if not created:
                # Update existing permission
                designation_permission.permission_level = permission_level
                designation_permission.is_active = True
                designation_permission.save()
            
            serializer = DesignationBasePermissionSerializer(designation_permission)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error granting permission to designation: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        summary="Assign users to designation",
        description="Assign multiple users to a designation",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=True, methods=['post'])
    def assign_users(self, request: Request, pk=None) -> Response:
        """Assign multiple users to a designation."""
        try:
            designation = self.get_object()
            user_ids = request.data.get('user_ids', [])
            assignment_reason = request.data.get('assignment_reason', '')
            is_primary = request.data.get('is_primary', False)
            is_temporary = request.data.get('is_temporary', False)
            effective_from = request.data.get('effective_from')
            effective_to = request.data.get('effective_to')
            
            if not user_ids:
                return Response(
                    {'error': 'No user IDs provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get tenant user profiles
            from ..models import TenantUserProfile, UserDesignationAssignment
            from django.utils import timezone
            from datetime import datetime
            
            tenant = request.user.tenant_user_profile.tenant
            user_profiles = TenantUserProfile.objects.filter(
                id__in=user_ids,
                tenant=tenant,
                is_active=True
            )
            
            if len(user_profiles) != len(user_ids):
                return Response(
                    {'error': 'Some users not found or not active'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            assignments = []
            for user_profile in user_profiles:
                # Check if assignment already exists
                existing = UserDesignationAssignment.objects.filter(
                    user_profile=user_profile,
                    designation=designation,
                    is_active=True
                ).first()
                
                if existing:
                    # Update existing assignment
                    existing.assignment_reason = assignment_reason
                    existing.is_primary_designation = is_primary
                    existing.is_temporary = is_temporary
                    if effective_from:
                        existing.effective_from = datetime.strptime(effective_from, '%Y-%m-%d').date()
                    if effective_to:
                        existing.effective_to = datetime.strptime(effective_to, '%Y-%m-%d').date()
                    existing.assigned_by = request.user
                    existing.save()
                    assignments.append(existing)
                else:
                    # Create new assignment
                    assignment_data = {
                        'user_profile': user_profile,
                        'designation': designation,
                        'assignment_reason': assignment_reason,
                        'is_primary_designation': is_primary,
                        'is_temporary': is_temporary,
                        'assigned_by': request.user
                    }
                    
                    if effective_from:
                        assignment_data['effective_from'] = datetime.strptime(effective_from, '%Y-%m-%d').date()
                    if effective_to:
                        assignment_data['effective_to'] = datetime.strptime(effective_to, '%Y-%m-%d').date()
                    
                    assignment = UserDesignationAssignment.objects.create(**assignment_data)
                    assignments.append(assignment)
            
            # Invalidate user permissions cache for all assigned users
            from ..services.rbac_service import get_rbac_service
            rbac_service = get_rbac_service(tenant)
            for user_profile in user_profiles:
                rbac_service.invalidate_user_permissions(user_profile)
            
            return Response({
                'success': True,
                'message': f'Successfully assigned {len(assignments)} user(s) to {designation.designation_name}',
                'assignments': [
                    {
                        'id': assignment.id,
                        'user_id': assignment.user_profile.id,
                        'user_name': assignment.user_profile.user.get_full_name(),
                        'is_primary': assignment.is_primary_designation,
                        'is_temporary': assignment.is_temporary,
                        'effective_from': assignment.effective_from.isoformat() if assignment.effective_from else None,
                        'effective_to': assignment.effective_to.isoformat() if assignment.effective_to else None
                    }
                    for assignment in assignments
                ]
            })
            
        except Exception as e:
            logger.error(f"Error assigning users to designation: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    @extend_schema(
        summary="Assign permissions to designation",
        description="Assign multiple permissions to a designation",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=True, methods=['post'])
    def assign_permissions(self, request: Request, pk=None) -> Response:
        """Assign multiple permissions to a designation."""
        try:
            designation = self.get_object()
            permission_ids = request.data.get('permission_ids', [])
            assignment_reason = request.data.get('assignment_reason', '')
            permission_level = request.data.get('permission_level', 'granted')
            requires_approval = request.data.get('requires_approval', False)
            
            if not permission_ids:
                return Response(
                    {'error': 'No permission IDs provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get permissions
            from ..models import PermissionRegistry, DesignationBasePermission
            
            tenant = request.user.tenant_user_profile.tenant
            permissions = PermissionRegistry.objects.filter(
                id__in=permission_ids,
                tenant=tenant,
                is_active=True
            )
            
            if len(permissions) != len(permission_ids):
                return Response(
                    {'error': 'Some permissions not found or not active'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            assignments = []
            for permission in permissions:
                # Check if assignment already exists
                existing = DesignationBasePermission.objects.filter(
                    designation=designation,
                    permission=permission,
                    is_active=True
                ).first()
                
                if existing:
                    # Update existing assignment
                    existing.permission_level = permission_level
                    existing.is_mandatory = requires_approval
                    existing.granted_by = request.user
                    existing.save()
                    assignments.append(existing)
                else:
                    # Create new assignment
                    assignment_data = {
                        'designation': designation,
                        'permission': permission,
                        'permission_level': permission_level,
                        'is_mandatory': requires_approval,
                        'granted_by': request.user
                    }
                    
                    assignment = DesignationBasePermission.objects.create(**assignment_data)
                    assignments.append(assignment)
            
            # Invalidate permissions cache for users with this designation
            from ..services.rbac_service import get_rbac_service
            from ..models import UserDesignationAssignment
            rbac_service = get_rbac_service(tenant)
            
            # Get all users with this designation
            user_assignments = UserDesignationAssignment.objects.filter(
                designation=designation,
                is_active=True
            ).select_related('user_profile')
            
            for user_assignment in user_assignments:
                rbac_service.invalidate_user_permissions(user_assignment.user_profile)
            
            return Response({
                'success': True,
                'message': f'Successfully assigned {len(assignments)} permission(s) to {designation.designation_name}',
                'assignments': [
                    {
                        'id': assignment.id,
                        'permission_id': assignment.permission.id,
                        'permission_name': assignment.permission.permission_name,
                        'permission_code': assignment.permission.permission_code,
                        'permission_level': assignment.permission_level,
                        'is_mandatory': assignment.is_mandatory,
                        'is_inherited': assignment.is_inherited,
                        'priority_level': assignment.priority_level,
                        'granted_at': assignment.granted_at.isoformat() if assignment.granted_at else None
                    }
                    for assignment in assignments
                ]
            })
            
        except Exception as e:
            logger.error(f"Error assigning permissions to designation: {str(e)}")
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
        ).prefetch_related('group_permissions__permission', 'user_assignments__user_profile__user')
    
    @extend_schema(
        summary="Assign users to permission group",
        description="Assign multiple users to a permission group",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'user_ids': {
                        'type': 'array',
                        'items': {'type': 'integer'},
                        'description': 'List of user IDs to assign to the group'
                    },
                    'assignment_reason': {
                        'type': 'string',
                        'description': 'Reason for the assignment'
                    }
                },
                'required': ['user_ids']
            }
        },
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=True, methods=['post'])
    def assign_users(self, request: Request, pk=None) -> Response:
        """Assign users to a permission group."""
        try:
            group = self.get_object()
            tenant = request.user.tenant_user_profile.tenant
            
            user_profile_ids = request.data.get('user_ids', [])  # Actually TenantUserProfile IDs
            assignment_reason = request.data.get('assignment_reason', '')
            
            if not user_profile_ids:
                return Response(
                    {'error': 'user_ids field is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # The frontend sends TenantUserProfile IDs, not User IDs
            # Validate that all TenantUserProfile IDs exist and belong to this tenant
            user_profiles = TenantUserProfile.objects.filter(
                id__in=user_profile_ids,
                tenant=tenant
            )
            
            if len(user_profiles) != len(user_profile_ids):
                missing_profile_ids = set(user_profile_ids) - set(user_profiles.values_list('id', flat=True))
                return Response(
                    {
                        'error': 'Some user profile IDs do not exist or do not belong to this tenant',
                        'missing_profile_ids': list(missing_profile_ids),
                        'found_profiles': len(user_profiles),
                        'requested_profiles': len(user_profile_ids)
                    }, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create assignments
            assignments_created = []
            for user_profile in user_profiles:
                assignment, created = UserPermissionGroupAssignment.objects.get_or_create(
                    user_profile=user_profile,
                    group=group,
                    defaults={
                        'assignment_reason': assignment_reason,
                        'assigned_by': request.user,
                        'effective_from': timezone.now(),
                    }
                )
                
                if created:
                    assignments_created.append({
                        'user_id': user_profile.user.id,
                        'user_name': user_profile.user.get_full_name(),
                        'assignment_id': assignment.id
                    })
                    
                    # Log audit trail
                    PermissionAuditTrail.objects.create(
                        tenant=tenant,
                        action_type='grant',
                        entity_type='user',
                        entity_id=user_profile.user.id,
                        change_reason=assignment_reason or f'Assigned to group {group.group_name}',
                        business_context=f'User {user_profile.user.get_full_name()} assigned to permission group {group.group_name}',
                        performed_by=request.user,
                        ip_address=request.META.get('REMOTE_ADDR'),
                        additional_context={
                            'group_id': group.id,
                            'group_name': group.group_name,
                            'assigned_user_id': user_profile.user.id,
                            'assigned_user_name': user_profile.user.get_full_name(),
                            'user_profile_id': user_profile.id,
                        }
                    )
            
            return Response({
                'success': True,
                'message': f'Successfully assigned {len(assignments_created)} user(s) to group {group.group_name}',
                'assignments_created': assignments_created,
                'total_assigned': len(assignments_created),
                'already_assigned': len(user_profile_ids) - len(assignments_created)
            })
            
        except Exception as e:
            logger.error(f"Error assigning users to group: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            ) 

    @extend_schema(
        summary="Get comprehensive permission overview dashboard",
        description="Get overview of all permissions, users, and assignments in the system",
        parameters=[
            OpenApiParameter(
                name='view_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Type of view: overview, user_analysis, permission_analysis, analytics',
                enum=['overview', 'user_analysis', 'permission_analysis', 'analytics']
            ),
            OpenApiParameter(
                name='user_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Specific user ID for user_analysis view'
            ),
            OpenApiParameter(
                name='permission_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Specific permission ID for permission_analysis view'
            ),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['get'])
    def comprehensive_dashboard(self, request: Request) -> Response:
        """Get comprehensive permission dashboard with multiple view types."""
        try:
            # Custom permission check: allow users with rbac_management.view_permissions
            from ..services import get_rbac_service
            
            tenant = request.user.tenant_user_profile.tenant
            rbac_service = get_rbac_service()
            
            # Check if user has permission to view RBAC data
            has_view_permission = rbac_service.check_permission(
                user=request.user,
                tenant=tenant,
                permission_code='rbac_management.view_permissions'
            )
            
            # Also allow tenant admins
            is_admin = (
                request.user.is_superuser or
                tenant.primary_contact_email == request.user.email or
                (hasattr(request.user, 'tenant_user_profile') and 
                 request.user.tenant_user_profile.tenant_id == tenant.id)
            )
            
            if not (has_view_permission or is_admin):
                return Response(
                    {'error': 'You do not have permission to view RBAC dashboard'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            view_type = request.query_params.get('view_type', 'overview')
            
            if view_type == 'overview':
                return self._get_permission_overview(tenant)
            elif view_type == 'user_analysis':
                user_id = request.query_params.get('user_id')
                return self._get_user_analysis(tenant, user_id)
            elif view_type == 'permission_analysis':
                permission_id = request.query_params.get('permission_id')
                return self._get_permission_analysis(tenant, permission_id)
            elif view_type == 'analytics':
                return self._get_permission_analytics(tenant)
            else:
                return Response(
                    {'error': 'Invalid view_type. Use: overview, user_analysis, permission_analysis, analytics'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Error getting comprehensive dashboard: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _get_permission_overview(self, tenant: Tenant) -> Response:
        """Get overview of all permissions and who has them."""
        
        # Get all active permissions
        permissions = PermissionRegistry.objects.filter(
            tenant=tenant, 
            is_active=True
        ).order_by('permission_category', 'permission_name')
        
        # Get all active users
        users = TenantUserProfile.objects.filter(
            tenant=tenant,
            is_active=True
        ).select_related('user').order_by('user__first_name', 'user__last_name')
        
        # Build permission matrix
        permission_matrix = {}
        user_summaries = {}
        permission_summaries = {}
        
        rbac_service = get_rbac_service(tenant)
        
        for user in users:
            user_key = f"user_{user.user.id}"
            user_effective_perms = rbac_service.get_user_effective_permissions(user)
            
            user_summaries[user_key] = {
                'user_id': user.user.id,
                'name': user.user.get_full_name() or f"{user.user.first_name} {user.user.last_name}".strip() or user.user.username,
                'email': user.user.email,
                'employee_id': user.employee_id or '',
                'job_title': user.job_title or '',
                'department': getattr(user, 'department', '') or '',
                'is_active': user.is_active,
                'total_permissions': len(user_effective_perms.get('permissions', {})),
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
            
            permission_matrix[user_key] = {}
            
            for permission in permissions:
                perm_code = permission.permission_code
                has_permission = perm_code in user_effective_perms.get('permissions', {})
                
                # Get source information safely
                source_info = 'none'
                if has_permission:
                    perm_details = user_effective_perms.get('permissions', {}).get(perm_code, {})
                    if isinstance(perm_details, dict):
                        source_info = perm_details.get('source', 'none')
                    else:
                        source_info = 'unknown'
                
                permission_matrix[user_key][perm_code] = {
                    'has_permission': has_permission,
                    'source': source_info,
                    'risk_level': permission.risk_level
                }
                
                # Track permission usage
                if perm_code not in permission_summaries:
                    permission_summaries[perm_code] = {
                        'permission_id': permission.id,
                        'permission_name': permission.permission_name,
                        'permission_code': permission.permission_code,
                        'category': permission.permission_category,
                        'risk_level': permission.risk_level,
                        'users_with_permission': 0,
                        'assignment_sources': {'designation': 0, 'group': 0, 'override': 0}
                    }
                
                if has_permission:
                    permission_summaries[perm_code]['users_with_permission'] += 1
                    source_type = source_info
                    if isinstance(source_type, str):
                        if 'designation' in source_type.lower():
                            permission_summaries[perm_code]['assignment_sources']['designation'] += 1
                        elif 'group' in source_type.lower():
                            permission_summaries[perm_code]['assignment_sources']['group'] += 1
                        elif 'override' in source_type.lower():
                            permission_summaries[perm_code]['assignment_sources']['override'] += 1
        
        # Calculate statistics
        total_users = len(users)
        total_permissions = len(permissions)
        total_assignments = sum(
            sum(1 for perm_data in user_perms.values() if perm_data['has_permission'])
            for user_perms in permission_matrix.values()
        )
        
        return Response({
            'view_type': 'overview',
            'summary': {
                'total_users': total_users,
                'total_permissions': total_permissions,
                'total_assignments': total_assignments,
                'average_permissions_per_user': total_assignments / total_users if total_users > 0 else 0
            },
            'permission_matrix': permission_matrix,
            'user_summaries': user_summaries,
            'permission_summaries': permission_summaries,
            'generated_at': timezone.now().isoformat()
        })
    
    def _get_user_analysis(self, tenant: Tenant, user_id: str = None) -> Response:
        """Get detailed analysis for a specific user or all users."""
        
        if user_id:
            # Single user analysis
            try:
                target_user = TenantUserProfile.objects.get(
                    user_id=user_id,
                    tenant=tenant
                )
                rbac_service = get_rbac_service(tenant)
                effective_permissions = rbac_service.get_user_effective_permissions(target_user)
                permission_sources = self._get_permission_sources(target_user, tenant)
                assignment_history = self._get_assignment_history(target_user)
                conflicts = self._get_permission_conflicts(target_user)
                
                # Serialize effective permissions to avoid JSON serialization issues
                serialized_effective_permissions = self._serialize_effective_permissions(effective_permissions)
                
                return Response({
                    'view_type': 'user_analysis',
                    'user_summary': {
                        'user_id': target_user.user.id,
                        'name': target_user.user.get_full_name() or f"{target_user.user.first_name} {target_user.user.last_name}".strip() or target_user.user.username,
                        'email': target_user.user.email,
                        'employee_id': target_user.employee_id or '',
                        'job_title': target_user.job_title or '',
                        'department': getattr(target_user, 'department', '') or '',
                        'is_active': target_user.is_active,
                        'last_login': target_user.last_login.isoformat() if target_user.last_login else None
                    },
                    'effective_permissions': serialized_effective_permissions,
                    'permission_sources': permission_sources,
                    'assignment_history': assignment_history,
                    'conflicts': conflicts,
                    'recommendations': self._get_user_recommendations(target_user, serialized_effective_permissions),
                    'generated_at': timezone.now().isoformat()
                })
                
            except TenantUserProfile.DoesNotExist:
                return Response(
                    {'error': 'User not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # All users summary
            users = TenantUserProfile.objects.filter(
                tenant=tenant,
                is_active=True
            ).select_related('user')
            
            user_analyses = []
            rbac_service = get_rbac_service(tenant)
            
            for user in users:
                effective_permissions = rbac_service.get_user_effective_permissions(user)
                serialized_permissions = self._serialize_effective_permissions(effective_permissions)
                permission_sources = self._get_permission_sources(user, tenant)
                
                # Count high risk permissions properly
                high_risk_count = 0
                for perm_data in serialized_permissions.get('permissions', {}).values():
                    permission = perm_data.get('permission', {})
                    if permission.get('risk_level') in ['high', 'critical']:
                        high_risk_count += 1
                
                user_analyses.append({
                    'user_id': user.user.id,
                    'name': user.user.get_full_name() or f"{user.user.first_name} {user.user.last_name}".strip() or user.user.username,
                    'email': user.user.email,
                    'employee_id': user.employee_id or '',
                    'job_title': user.job_title or '',
                    'total_permissions': len(serialized_permissions.get('permissions', {})),
                    'high_risk_permissions': high_risk_count,
                    'permission_sources_count': {
                        'designation': len(permission_sources['designation_permissions']),
                        'group': len(permission_sources['group_permissions']),
                        'override': len(permission_sources['override_permissions'])
                    }
                })
            
            return Response({
                'view_type': 'user_analysis',
                'user_analyses': user_analyses,
                'generated_at': timezone.now().isoformat()
            })
    
    def _get_permission_analysis(self, tenant: Tenant, permission_id: str = None) -> Response:
        """Get detailed analysis for a specific permission or all permissions."""
        
        if permission_id:
            # Single permission analysis
            try:
                permission = PermissionRegistry.objects.get(
                    id=permission_id,
                    tenant=tenant
                )
                
                # Find all users who have this permission
                users_with_permission = []
                rbac_service = get_rbac_service(tenant)
                
                users = TenantUserProfile.objects.filter(
                    tenant=tenant,
                    is_active=True
                ).select_related('user')
                
                for user in users:
                    effective_permissions = rbac_service.get_user_effective_permissions(user)
                    if permission.permission_code in effective_permissions.get('permissions', {}):
                        perm_details = effective_permissions['permissions'][permission.permission_code]
                        users_with_permission.append({
                            'user_id': user.user.id,
                            'name': user.user.get_full_name(),
                            'email': user.user.email,
                            'employee_id': user.employee_id,
                            'source': perm_details.get('source', 'unknown'),
                            'level': perm_details.get('level', 'unknown'),
                            'scope_configuration': perm_details.get('scope_configuration', {})
                        })
                
                return Response({
                    'view_type': 'permission_analysis',
                    'permission_details': {
                        'id': permission.id,
                        'name': permission.permission_name,
                        'code': permission.permission_code,
                        'category': permission.permission_category,
                        'description': permission.description,
                        'risk_level': permission.risk_level,
                        'is_system_permission': permission.is_system_permission
                    },
                    'users_with_permission': users_with_permission,
                    'assignment_breakdown': {
                        'total_users': len(users_with_permission),
                        'by_source': {
                            'designation': len([u for u in users_with_permission if 'designation' in u['source']]),
                            'group': len([u for u in users_with_permission if 'group' in u['source']]),
                            'override': len([u for u in users_with_permission if 'override' in u['source']])
                        }
                    },
                    'generated_at': timezone.now().isoformat()
                })
                
            except PermissionRegistry.DoesNotExist:
                return Response(
                    {'error': 'Permission not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # All permissions summary
            permissions = PermissionRegistry.objects.filter(
                tenant=tenant,
                is_active=True
            ).order_by('permission_category', 'permission_name')
            
            permission_analyses = []
            
            for permission in permissions:
                # Count users with this permission (simplified for performance)
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
                    is_active=True,
                    approval_status='approved'
                ).count()
                
                permission_analyses.append({
                    'permission_id': permission.id,
                    'name': permission.permission_name,
                    'code': permission.permission_code,
                    'category': permission.permission_category,
                    'risk_level': permission.risk_level,
                    'assignment_counts': {
                        'designation_assignments': designation_count,
                        'group_assignments': group_count,
                        'user_overrides': override_count,
                        'total': designation_count + group_count + override_count
                    }
                })
            
            return Response({
                'view_type': 'permission_analysis',
                'permission_analyses': permission_analyses,
                'generated_at': timezone.now().isoformat()
            })
    
    def _get_permission_analytics(self, tenant: Tenant) -> Response:
        """Get advanced analytics and insights about permission usage."""
        
        # Top permissions by usage
        permissions = PermissionRegistry.objects.filter(
            tenant=tenant,
            is_active=True
        )
        
        permission_usage = []
        for permission in permissions:
            designation_count = DesignationBasePermission.objects.filter(
                permission=permission, is_active=True
            ).count()
            group_count = PermissionGroupPermission.objects.filter(
                permission=permission, is_active=True
            ).count()
            override_count = UserPermissionOverride.objects.filter(
                permission=permission, is_active=True, approval_status='approved'
            ).count()
            
            total_usage = designation_count + group_count + override_count
            permission_usage.append({
                'permission_name': permission.permission_name,
                'permission_code': permission.permission_code,
                'category': permission.permission_category,
                'risk_level': permission.risk_level,
                'total_usage': total_usage,
                'usage_breakdown': {
                    'designation': designation_count,
                    'group': group_count,
                    'override': override_count
                }
            })
        
        # Sort by usage
        permission_usage.sort(key=lambda x: x['total_usage'], reverse=True)
        
        # Risk analysis
        risk_analysis = {
            'high_risk_permissions': len([p for p in permissions if p.risk_level in ['high', 'critical']]),
            'permissions_by_risk': {},
            'unused_permissions': len([p for p in permission_usage if p['total_usage'] == 0])
        }
        
        for risk_level in ['low', 'medium', 'high', 'critical']:
            risk_analysis['permissions_by_risk'][risk_level] = len([
                p for p in permissions if p.risk_level == risk_level
            ])
        
        # User analytics
        users = TenantUserProfile.objects.filter(tenant=tenant, is_active=True)
        user_permission_counts = []
        
        rbac_service = get_rbac_service(tenant)
        for user in users:
            effective_permissions = rbac_service.get_user_effective_permissions(user)
            user_permission_counts.append({
                'user_name': user.user.get_full_name(),
                'permission_count': len(effective_permissions.get('permissions', {}))
            })
        
        user_permission_counts.sort(key=lambda x: x['permission_count'], reverse=True)
        
        return Response({
            'view_type': 'analytics',
            'permission_usage': {
                'top_permissions': permission_usage[:10],
                'least_used_permissions': [p for p in permission_usage if p['total_usage'] <= 1]
            },
            'risk_analysis': risk_analysis,
            'user_analytics': {
                'users_by_permission_count': user_permission_counts,
                'top_users': user_permission_counts[:5],
                'users_with_no_permissions': [u for u in user_permission_counts if u['permission_count'] == 0]
            },
            'trends': {
                'recent_assignments': PermissionAuditTrail.objects.filter(
                    tenant=tenant,
                    action_type='grant',
                    performed_at__gte=timezone.now() - timedelta(days=30)
                ).count(),
                'recent_revocations': PermissionAuditTrail.objects.filter(
                    tenant=tenant,
                    action_type='revoke',
                    performed_at__gte=timezone.now() - timedelta(days=30)
                ).count()
            },
            'generated_at': timezone.now().isoformat()
        })
    
    def _get_user_recommendations(self, user_profile: TenantUserProfile, effective_permissions: Dict) -> List[str]:
        """Generate recommendations for user permission optimization."""
        recommendations = []
        
        perm_count = len(effective_permissions.get('permissions', {}))
        
        if perm_count == 0:
            recommendations.append("User has no permissions assigned. Consider assigning a basic permission group.")
        elif perm_count > 50:
            recommendations.append("User has many permissions. Review for unnecessary access.")
        
        # Check for high-risk permissions (works with serialized permissions)
        high_risk_perms = [
            p for p in effective_permissions.get('permissions', {}).values()
            if p.get('permission', {}).get('risk_level') in ['high', 'critical']
        ]
        
        if high_risk_perms:
            recommendations.append(f"User has {len(high_risk_perms)} high-risk permissions. Ensure MFA is enabled.")
        
        return recommendations 

    @extend_schema(
        summary="Search users by permission",
        description="Find all users who have a specific permission",
        parameters=[
            OpenApiParameter(
                name='permission_code',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Permission code to search for',
                required=True
            ),
            OpenApiParameter(
                name='source_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter by permission source: designation, group, override',
                enum=['designation', 'group', 'override']
            ),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['get'])
    def search_users_by_permission(self, request: Request) -> Response:
        """Find all users who have a specific permission."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            permission_code = request.query_params.get('permission_code')
            source_type = request.query_params.get('source_type')
            
            if not permission_code:
                return Response(
                    {'error': 'permission_code parameter is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify permission exists
            try:
                permission = PermissionRegistry.objects.get(
                    permission_code=permission_code,
                    tenant=tenant,
                    is_active=True
                )
            except PermissionRegistry.DoesNotExist:
                return Response(
                    {'error': f'Permission {permission_code} not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            users_with_permission = []
            rbac_service = get_rbac_service(tenant)
            
            # Get all active users
            users = TenantUserProfile.objects.filter(
                tenant=tenant,
                is_active=True
            ).select_related('user')
            
            for user in users:
                effective_permissions = rbac_service.get_user_effective_permissions(user)
                
                if permission_code in effective_permissions.get('permissions', {}):
                    perm_details = effective_permissions['permissions'][permission_code]
                    source = perm_details.get('source', 'unknown')
                    
                    # Filter by source type if specified
                    if source_type and source_type not in source:
                        continue
                    
                    users_with_permission.append({
                        'user_id': user.user.id,
                        'name': user.user.get_full_name(),
                        'email': user.user.email,
                        'employee_id': user.employee_id,
                        'job_title': user.job_title,
                        'department': user.department,
                        'permission_source': source,
                        'permission_level': perm_details.get('level', 'unknown'),
                        'scope_configuration': perm_details.get('scope_configuration', {}),
                        'last_login': user.last_login
                    })
            
            return Response({
                'permission_details': {
                    'code': permission.permission_code,
                    'name': permission.permission_name,
                    'category': permission.permission_category,
                    'risk_level': permission.risk_level
                },
                'search_criteria': {
                    'permission_code': permission_code,
                    'source_type_filter': source_type
                },
                'results': {
                    'total_users_found': len(users_with_permission),
                    'users': users_with_permission
                },
                'breakdown_by_source': {
                    'designation': len([u for u in users_with_permission if 'designation' in u['permission_source']]),
                    'group': len([u for u in users_with_permission if 'group' in u['permission_source']]),
                    'override': len([u for u in users_with_permission if 'override' in u['permission_source']])
                }
            })
            
        except Exception as e:
            logger.error(f"Error searching users by permission: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Get user permissions with detailed breakdown",
        description="Get all permissions for a specific user with source details",
        parameters=[
            OpenApiParameter(
                name='user_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='User ID to get permissions for',
                required=True
            ),
            OpenApiParameter(
                name='include_inactive',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Include inactive permissions in results'
            ),
            OpenApiParameter(
                name='category_filter',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Filter permissions by category'
            ),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=False, methods=['get'])
    def user_permissions_detailed(self, request: Request) -> Response:
        """Get detailed breakdown of all permissions for a specific user."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            user_id = request.query_params.get('user_id')
            include_inactive = request.query_params.get('include_inactive', 'false').lower() == 'true'
            category_filter = request.query_params.get('category_filter')
            
            if not user_id:
                return Response(
                    {'error': 'user_id parameter is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get target user
            try:
                target_user = TenantUserProfile.objects.get(
                    user_id=user_id,
                    tenant=tenant
                )
            except TenantUserProfile.DoesNotExist:
                return Response(
                    {'error': 'User not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            rbac_service = get_rbac_service(tenant)
            effective_permissions = rbac_service.get_user_effective_permissions(target_user)
            permission_sources = self._get_permission_sources(target_user, tenant)
            
            # Organize permissions by source with detailed breakdown
            detailed_permissions = {
                'designation_permissions': [],
                'group_permissions': [],
                'override_permissions': [],
                'effective_permissions': []
            }
            
            # Process each permission source
            for source_type in ['designation_permissions', 'group_permissions', 'override_permissions']:
                for perm_source in permission_sources[source_type]:
                    if category_filter and perm_source.get('permission_category') != category_filter:
                        continue
                    
                    detailed_permissions[source_type].append(perm_source)
            
            # Process effective permissions
            for perm_code, perm_data in effective_permissions.get('permissions', {}).items():
                if hasattr(perm_data.get('permission'), 'permission_category'):
                    if category_filter and perm_data['permission'].permission_category != category_filter:
                        continue
                
                detailed_permissions['effective_permissions'].append({
                    'permission_code': perm_code,
                    'permission_name': perm_data['permission'].permission_name if hasattr(perm_data.get('permission'), 'permission_name') else 'Unknown',
                    'permission_category': perm_data['permission'].permission_category if hasattr(perm_data.get('permission'), 'permission_category') else 'Unknown',
                    'risk_level': perm_data['permission'].risk_level if hasattr(perm_data.get('permission'), 'risk_level') else 'unknown',
                    'source': perm_data.get('source', 'unknown'),
                    'level': perm_data.get('level', 'unknown'),
                    'scope_configuration': perm_data.get('scope_configuration', {})
                })
            
            # Calculate summary statistics
            permission_stats = {
                'total_effective_permissions': len(effective_permissions.get('permissions', {})),
                'by_source': {
                    'designation': len(detailed_permissions['designation_permissions']),
                    'group': len(detailed_permissions['group_permissions']),
                    'override': len(detailed_permissions['override_permissions'])
                },
                'by_risk_level': {},
                'by_category': {}
            }
            
            # Calculate risk and category breakdowns
            for perm in detailed_permissions['effective_permissions']:
                risk = perm['risk_level']
                category = perm['permission_category']
                
                permission_stats['by_risk_level'][risk] = permission_stats['by_risk_level'].get(risk, 0) + 1
                permission_stats['by_category'][category] = permission_stats['by_category'].get(category, 0) + 1
            
            return Response({
                'user_details': {
                    'user_id': target_user.user.id,
                    'name': target_user.user.get_full_name(),
                    'email': target_user.user.email,
                    'employee_id': target_user.employee_id,
                    'job_title': target_user.job_title,
                    'department': target_user.department,
                    'is_active': target_user.is_active,
                    'last_login': target_user.last_login
                },
                'search_criteria': {
                    'include_inactive': include_inactive,
                    'category_filter': category_filter
                },
                'permission_breakdown': detailed_permissions,
                'statistics': permission_stats,
                'scope_limitations': effective_permissions.get('scope_limitations', {}),
                'generated_at': timezone.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error getting detailed user permissions: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def _get_permission_sources(self, user_profile: TenantUserProfile, tenant: Tenant) -> Dict[str, Any]:
        """Get detailed breakdown of permission sources."""
        sources = {
            'designation_permissions': [],
            'group_permissions': [],
            'override_permissions': []
        }
        
        # Designation permissions
        designation_assignments = user_profile.designation_assignments.filter(
            is_active=True
        ).select_related('designation').prefetch_related(
            'designation__base_permissions__permission'
        )
        
        for assignment in designation_assignments:
            for base_perm in assignment.designation.base_permissions.filter(is_active=True):
                sources['designation_permissions'].append({
                    'permission_id': base_perm.permission.id,
                    'permission_code': base_perm.permission.permission_code,
                    'permission_name': base_perm.permission.permission_name,
                    'permission_level': base_perm.permission_level,
                    'source_type': 'designation',
                    'source_name': assignment.designation.designation_name,
                    'source_id': assignment.designation.id,
                    'risk_level': base_perm.permission.risk_level,
                    'is_mandatory': base_perm.is_mandatory,
                    'scope_configuration': base_perm.scope_configuration or {},
                    'effective_from': assignment.effective_from.isoformat() if assignment.effective_from else None,
                    'effective_to': assignment.effective_to.isoformat() if assignment.effective_to else None
                })
        
        # Group permissions
        group_assignments = user_profile.permission_group_assignments.filter(
            is_active=True
        ).select_related('group').prefetch_related(
            'group__group_permissions__permission'
        )
        
        for assignment in group_assignments:
            for group_perm in assignment.group.group_permissions.filter(is_active=True):
                sources['group_permissions'].append({
                    'permission_id': group_perm.permission.id,
                    'permission_code': group_perm.permission.permission_code,
                    'permission_name': group_perm.permission.permission_name,
                    'permission_level': group_perm.permission_level,
                    'source_type': 'group',
                    'source_name': assignment.group.group_name,
                    'source_id': assignment.group.id,
                    'risk_level': group_perm.permission.risk_level,
                    'is_mandatory': group_perm.is_mandatory,
                    'scope_configuration': group_perm.scope_configuration or {},
                    'effective_from': assignment.effective_from.isoformat() if assignment.effective_from else None,
                    'effective_to': assignment.effective_to.isoformat() if assignment.effective_to else None,
                    'assignment_reason': assignment.assignment_reason or ''
                })
        
        # User overrides
        overrides = user_profile.permission_overrides.filter(
            is_active=True,
            approval_status='approved'
        ).select_related('permission')
        
        for override in overrides:
            sources['override_permissions'].append({
                'permission_id': override.permission.id,
                'permission_code': override.permission.permission_code,
                'permission_name': override.permission.permission_name,
                'permission_level': override.permission_level,
                'source_type': 'override',
                'source_name': f"{override.get_override_type_display()} Override",
                'source_id': override.id,
                'risk_level': override.permission.risk_level,
                'override_type': override.override_type,
                'override_reason': override.override_reason or '',
                'business_justification': override.business_justification or '',
                'requires_mfa': override.requires_mfa,
                'effective_from': override.effective_from.isoformat() if override.effective_from else None,
                'effective_to': override.effective_to.isoformat() if override.effective_to else None,
                'is_temporary': override.is_temporary
            })
        
        return sources
    
    def _serialize_effective_permissions(self, effective_permissions: Dict[str, Any]) -> Dict[str, Any]:
        """Serialize effective permissions to avoid Django model serialization issues."""
        if not effective_permissions:
            return {}
        
        serialized = {
            'permissions': {},
            'scope_limitations': effective_permissions.get('scope_limitations', {}),
            'permission_summary': effective_permissions.get('permission_summary', {}),
            'metadata': effective_permissions.get('metadata', {})
        }
        
        # Serialize permissions dict
        permissions = effective_permissions.get('permissions', {})
        for perm_code, perm_data in permissions.items():
            permission_obj = perm_data.get('permission')
            if hasattr(permission_obj, 'id'):  # It's a Django model
                serialized['permissions'][perm_code] = {
                    'permission': {
                        'id': permission_obj.id,
                        'permission_code': permission_obj.permission_code,
                        'permission_name': permission_obj.permission_name,
                        'permission_category': permission_obj.permission_category,
                        'risk_level': permission_obj.risk_level,
                        'requires_mfa': getattr(permission_obj, 'requires_mfa', False),
                        'is_active': permission_obj.is_active
                    },
                    'permission_level': perm_data.get('permission_level', 'read'),
                    'source_type': perm_data.get('source_type', 'unknown'),
                    'source_name': perm_data.get('source_name', ''),
                    'scope_configuration': perm_data.get('scope_configuration', {}),
                    'is_temporary': perm_data.get('is_temporary', False),
                    'effective_from': perm_data.get('effective_from'),
                    'effective_to': perm_data.get('effective_to')
                }
            else:
                # Already serialized or dict
                serialized['permissions'][perm_code] = perm_data
        
        return serialized
    
    def _get_assignment_history(self, user_profile: TenantUserProfile) -> List[Dict[str, Any]]:
        """Get recent assignment history for the user."""
        history = []
        
        # Get recent audit trail entries for this user
        recent_audits = PermissionAuditTrail.objects.filter(
            tenant=user_profile.tenant,
            entity_type__in=['user', 'group'],
            performed_at__gte=timezone.now() - timedelta(days=30)
        ).order_by('-performed_at')[:20]
        
        for audit in recent_audits:
            history.append({
                'action_type': audit.action_type,
                'entity_type': audit.entity_type,
                'entity_name': audit.additional_context.get('entity_name', 'Unknown') if audit.additional_context else 'Unknown',
                'performed_by': getattr(audit.performed_by, 'full_name', 'System') if audit.performed_by else 'System',
                'performed_at': audit.performed_at.isoformat() if audit.performed_at else None,
                'change_reason': audit.change_reason or '',
                'additional_context': audit.additional_context or {}
            })
        
        return history
    
    def _get_permission_conflicts(self, user_profile: TenantUserProfile) -> List[Dict[str, Any]]:
        """Identify and return permission conflicts."""
        conflicts = []
        
        # This would contain logic to detect conflicts between different permission sources
        # For now, return empty list - can be enhanced based on business rules
        
        return conflicts
    
    def _get_risk_analysis(self, permissions: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze risk levels of user's permissions."""
        risk_analysis = {}
        
        # Get tenant from request context
        tenant = getattr(self.request.user, 'tenant_user_profile', None)
        if not tenant:
            return risk_analysis
        
        for permission_code in permissions:
            try:
                permission = PermissionRegistry.objects.get(
                    permission_code=permission_code,
                    tenant=tenant.tenant
                )
                risk_analysis[permission_code] = {
                    'risk_level': permission.risk_level,
                    'permission_type': permission.permission_type,
                    'requires_scope': permission.requires_scope,
                    'is_auditable': permission.is_auditable
                }
            except PermissionRegistry.DoesNotExist:
                risk_analysis[permission_code] = {
                    'risk_level': 'unknown',
                    'permission_type': 'unknown'
                }
        
        return risk_analysis


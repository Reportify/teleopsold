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
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.request import Request
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from core.permissions.tenant_permissions import IsTenantAdmin, IsTenantMember, HasRBACPermission
from ..models import (
    Tenant, PermissionRegistry, DesignationBasePermission, 
    UserPermissionOverride, PermissionGroup, PermissionGroupPermission,
    UserPermissionGroupAssignment, PermissionAuditTrail, TenantUserProfile,
    TenantDesignation, PermissionCategory, TenantDepartment, UserDesignationAssignment
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
from ..constants import RESOURCE_TYPES_FRONTEND

User = get_user_model()
logger = logging.getLogger(__name__)

@extend_schema(
    summary="Get resource types",
    description="Get all available resource types for permissions",
    responses={200: OpenApiTypes.OBJECT}
)
@api_view(['GET'])
@permission_classes([IsTenantMember])
def get_resource_types(request):
    """Get resource types for frontend."""
    return Response({
        'success': True,
        'resource_types': RESOURCE_TYPES_FRONTEND
    })


class PermissionCategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing permission categories.
    """
    serializer_class = PermissionCategorySerializer
    permission_classes = [HasRBACPermission]
    
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
    permission_classes = [HasRBACPermission]
    permission_required = 'rbac_management.view_permissions'
    
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
        """Bulk revoke permissions with smart override logic."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            rbac_service = get_rbac_service(tenant.id)
            
            permission_ids = request.data.get('permission_ids', [])
            target_type = request.data.get('target_type')
            target_ids = request.data.get('target_ids', [])
            reason = request.data.get('reason', '')
            
            results = []
            for permission_id in permission_ids:
                for target_id in target_ids:
                    try:
                        if target_type == 'users':
                            # Get user profile
                            user_profile = TenantUserProfile.objects.get(
                                user_id=target_id, 
                                tenant=tenant, 
                                is_active=True
                            )
                            
                            # Check if user is administrator
                            user_designations = UserDesignationAssignment.objects.filter(
                                user_profile=user_profile,
                                is_active=True
                            ).select_related('designation')
                            
                            is_admin = any(
                                designation.designation.designation_name.lower() == 'administrator'
                                for designation in user_designations
                            )
                            
                            if is_admin:
                                results.append({
                                    'permission_id': permission_id,
                                    'target_id': target_id,
                                    'target_type': target_type,
                                    'success': False,
                                    'error': 'Cannot remove permissions from administrator users'
                                })
                                continue
                            
                            # Get permission registry entry
                            permission = PermissionRegistry.objects.get(id=permission_id, tenant=tenant)
                            
                            # Get user's effective permissions to understand the source
                            effective_perms = rbac_service.get_user_effective_permissions(user_profile, force_refresh=True)
                            user_permissions = effective_perms.get('permissions', {})
                            
                            permission_data = user_permissions.get(permission.permission_code)
                            
                            if not permission_data:
                                results.append({
                                    'permission_id': permission_id,
                                    'target_id': target_id,
                                    'target_type': target_type,
                                    'success': False,
                                    'error': 'User does not have this permission'
                                })
                                continue
                            
                            source = permission_data.get('source', '')
                            
                            if source.startswith('user_override_'):
                                # User has permission via override - remove/deactivate the override
                                UserPermissionOverride.objects.filter(
                                        user_profile=user_profile,
                                        permission=permission,
                                        is_active=True
                                ).update(is_active=False)
                                
                            elif source.startswith('designation_') or source.startswith('group_'):
                                # User has permission via designation or group - create deny override
                                override, created = UserPermissionOverride.objects.get_or_create(
                                    user_profile=user_profile,
                                    permission=permission,
                                    defaults={
                                        'permission_level': 'denied',
                                        'is_active': True,
                                        'assignment_reason': reason or f'Override to deny permission from {source}',
                                        'assigned_by': request.user.tenant_user_profile
                                    }
                                )
                                
                                if not created:
                                    # Update existing override to deny
                                    override.permission_level = 'denied'
                                    override.is_active = True
                                    override.assignment_reason = reason or f'Override to deny permission from {source}'
                                    override.assigned_by = request.user.tenant_user_profile
                                    override.save()
                            
                        elif target_type == 'designations':
                            # Deactivate designation permissions
                            DesignationBasePermission.objects.filter(
                                designation_id=target_id,
                                permission_id=permission_id,
                                designation__tenant=tenant
                            ).update(is_active=False)
                        
                        elif target_type == 'groups':
                            # Remove permission from group
                            permission = PermissionRegistry.objects.get(id=permission_id, tenant=tenant)
                            group = PermissionGroup.objects.get(id=target_id, tenant=tenant)
                            
                            # Remove permission from group - users will naturally lose permission via group
                            PermissionGroupPermission.objects.filter(
                                group=group,
                                permission=permission,
                                is_active=True
                            ).update(is_active=False)
                            
                            # Count affected users for reporting
                            group_users_count = UserPermissionGroupAssignment.objects.filter(
                                group=group,
                                is_active=True
                            ).count()
                            
                            # Add group-specific result info
                            results.append({
                                'permission_id': permission_id,
                                'target_id': target_id,
                                'target_type': target_type,
                                'success': True,
                                'users_affected': group_users_count,
                                'group_name': group.group_name
                            })
                            continue  # Skip the generic success append below
                        
                        results.append({
                            'permission_id': permission_id,
                            'target_id': target_id,
                            'target_type': target_type,
                            'success': True
                        })
                        
                    except Exception as e:
                        logger.error(f"Error revoking permission {permission_id} from {target_type} {target_id}: {str(e)}")
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

    @action(detail=False, methods=['get'])
    def test_working_permissions(self, request: Request) -> Response:
        """
        TEST: Working permission calculation for all users.
        This tests if the individual analysis approach works for batch operations.
        """
        try:
            tenant = request.user.tenant_user_profile.tenant
            
            # Get all active users
            users = TenantUserProfile.objects.filter(
                tenant=tenant,
                is_active=True
            ).select_related('user')[:5]  # Limit to 5 users for testing
            
            results = []
            
            for user in users:
                # Use the EXACT same logic as individual user analysis (which works)
                rbac_service = get_rbac_service(tenant)
                effective_permissions = rbac_service.get_user_effective_permissions(user)
                
                # Don't serialize - just get raw count
                perm_count = len(effective_permissions.get('permissions', {}))
                is_admin = rbac_service._is_administrator(user)
                
                results.append({
                    'user_id': user.user.id,
                    'email': user.user.email,
                    'name': user.user.get_full_name() or user.user.username,
                    'is_administrator': is_admin,
                    'permission_count': perm_count,
                    'sample_permissions': list(effective_permissions.get('permissions', {}).keys())[:3]
                })
            
            return Response({
                'test_type': 'working_permissions',
                'users_tested': len(results),
                'results': results,
                'note': 'This uses individual analysis logic for each user'
            })
            
        except Exception as e:
            logger.error(f"Error in test working permissions: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Delete permission completely",
        description="Completely delete a permission with cascading cleanup from all assignments",
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT}
    )
    @action(detail=True, methods=['delete'])
    def delete_completely(self, request: Request, pk=None) -> Response:
        """Complete permission deletion with cascading cleanup."""
        try:
            tenant = request.user.tenant_user_profile.tenant
            permission = self.get_object()
            reason = request.data.get('reason', 'Complete deletion requested')
            
            cleanup_results = {
                'designations_cleaned': 0,
                'groups_cleaned': 0,
                'users_cleaned': 0,
                'overrides_cleaned': 0
            }
            
            # 1. Remove from all designations (HARD DELETE)
            designation_perms = DesignationBasePermission.objects.filter(
                permission=permission
            )
            cleanup_results['designations_cleaned'] = designation_perms.count()
            designation_perms.delete()
            
            # 2. Remove from all groups (HARD DELETE)
            group_perms = PermissionGroupPermission.objects.filter(
                permission=permission
            )
            cleanup_results['groups_cleaned'] = group_perms.count()
            group_perms.delete()
            
            # 3. Remove all user overrides (HARD DELETE)
            user_overrides = UserPermissionOverride.objects.filter(
                permission=permission
            )
            cleanup_results['overrides_cleaned'] = user_overrides.count()
            user_overrides.delete()
            
            # 4. Create audit trail before deletion
            PermissionAuditTrail.objects.create(
                tenant=tenant,
                action_type='delete',
                entity_type='permission',
                entity_id=permission.id,
                change_reason=reason,
                business_context=f'Permission "{permission.permission_name}" ({permission.permission_code}) completely deleted from system',
                performed_by=request.user,
                ip_address=request.META.get('REMOTE_ADDR'),
                additional_context={
                    'permission_id': permission.id,
                    'permission_code': permission.permission_code,
                    'permission_name': permission.permission_name,
                    'permission_category': permission.permission_category,
                    'risk_level': permission.risk_level,
                    'cleanup_results': cleanup_results,
                    'deletion_type': 'complete'
                }
            )
            
            # 5. Hard delete the permission itself
            permission_code = permission.permission_code  # Store before deletion
            permission_name = permission.permission_name   # Store before deletion
            permission.delete()
            
            user_identifier = getattr(request.user, 'email', '') or getattr(request.user, 'username', f'user_{request.user.id}')
            logger.info(f"Permission {permission_code} completely deleted by {user_identifier}")
            
            return Response({
                'success': True,
                'message': f'Permission "{permission_name}" completely removed from system',
                'cleanup_results': cleanup_results,
                'permission_code': permission_code
            })
            
        except Exception as e:
            logger.error(f"Error in complete permission deletion: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )




class PermissionGroupViewSet(viewsets.ModelViewSet):
    """
    API endpoints for managing permission groups.
    """
    serializer_class = PermissionGroupSerializer
    permission_classes = [HasRBACPermission]
    permission_required = 'rbac_management.view_permissions'
    
    def get_queryset(self):
        """Get permission groups for current tenant."""
        return PermissionGroup.objects.filter(
            tenant=self.request.user.tenant_user_profile.tenant
        ).prefetch_related('group_permissions__permission', 'user_assignments__user_profile__user')
    
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
                    
                    user_identifier = getattr(user_profile.user, 'email', '') or getattr(user_profile.user, 'username', f'user_{user_profile.user.id}')
                    assigned_users.append({
                        'user_id': user_id,
                        'username': user_identifier,
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
                'last_login': target_user_profile.user.last_login.isoformat() if target_user_profile.user.last_login else None,
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
                'last_login': user_profile.user.last_login.isoformat() if user_profile.user.last_login else None,
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
    permission_classes = [HasRBACPermission]
    permission_required = 'rbac_management.view_audit_trail'
    
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
    permission_classes = [HasRBACPermission]
    permission_required = 'rbac_management.view_permissions'
    
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
        """
        New comprehensive dashboard API that properly handles all view types.
        Matches frontend TypeScript interfaces exactly.
        """
        try:
            view_type = request.query_params.get('view_type', 'overview')
            tenant = request.user.tenant_user_profile.tenant
            
            # Route to specific view handler
            if view_type == 'overview':
                return self._get_overview_data(tenant)
            elif view_type == 'user_analysis':
                user_id = request.query_params.get('user_id')
                return self._get_user_analysis_data(tenant, user_id)
            elif view_type == 'permission_analysis':
                permission_id = request.query_params.get('permission_id')
                return self._get_permission_analysis_data(tenant, permission_id)
            elif view_type == 'analytics':
                return self._get_analytics_data(tenant)
            else:
                return Response(
                    {'error': f'Invalid view_type: {view_type}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Error in comprehensive_dashboard: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_overview_data(self, tenant) -> Response:
        """
        Get overview dashboard data.
        Returns: OverviewDashboardData structure
        """
        try:
            # Get all active users in tenant
            users = TenantUserProfile.objects.filter(
                tenant=tenant, 
                is_active=True
            ).select_related('user')
        
            # Get all permissions in tenant  
            permissions = PermissionRegistry.objects.filter(
                tenant=tenant,
                is_active=True
            )
        
            # Calculate user permissions using reliable method
            rbac_service = get_rbac_service(tenant)
            user_summaries = {}
            permission_matrix = {}
            total_assignments = 0

            for user in users:
                # Get effective permissions (using the working individual logic)
                effective_perms = rbac_service.get_user_effective_permissions(user, force_refresh=True)
                user_permissions = effective_perms.get('permissions', {})
                
                # Create user summary
                user_key = f"user_{user.user.id}"
                user_summaries[user_key] = {
                    "user_id": user.user.id,
                    "name": user.user.get_full_name() or user.user.username,
                    "email": user.user.email,
                    "employee_id": getattr(user, 'employee_id', '') or '',
                    "job_title": getattr(user, 'job_title', '') or '',
                    "department": getattr(user, 'department', '') or '',
                    "is_active": user.is_active,
                    "last_login": user.user.last_login.isoformat() if user.user.last_login else None,
                    "total_permissions": len(user_permissions)
                }

                # Build permission matrix for this user
                user_matrix = {}
                for perm in permissions:
                    perm_code = perm.permission_code
                    if perm_code in user_permissions:
                        perm_data = user_permissions[perm_code]
                        user_matrix[perm_code] = {
                            "has_permission": True,
                            "source": perm_data.get('source', 'unknown'),
                            "risk_level": perm.risk_level
                        }
                        total_assignments += 1
                    else:
                        user_matrix[perm_code] = {
                            "has_permission": False,
                            "source": "none",
                            "risk_level": perm.risk_level
                        }
                
                permission_matrix[user_key] = user_matrix

            # Create permission summaries
            permission_summaries = {}
            for perm in permissions:
                # Count users with this permission
                users_with_perm = sum(
                    1 for user_matrix in permission_matrix.values()
                    if user_matrix.get(perm.permission_code, {}).get('has_permission', False)
                )
                
                # Count by source (simplified for now)
                permission_summaries[perm.permission_code] = {
                    "permission_id": perm.id,
                    "permission_name": perm.permission_name,
                    "permission_code": perm.permission_code,
                    "category": perm.permission_category,
                    "risk_level": perm.risk_level,
                    "users_with_permission": users_with_perm,
                    "assignment_sources": {
                        "designation": 0,  # TODO: Calculate actual breakdown
                        "group": 0,
                        "override": 0
                    }
                }

            # Calculate summary statistics
            total_users = len(users)
            total_permissions = len(permissions)
            avg_permissions = total_assignments / total_users if total_users > 0 else 0

            response_data = {
                "view_type": "overview",
                "summary": {
                    "total_users": total_users,
                    "total_permissions": total_permissions,
                    "total_assignments": total_assignments,
                    "average_permissions_per_user": round(avg_permissions, 2)
                },
                "permission_matrix": permission_matrix,
                "user_summaries": user_summaries,
                "permission_summaries": permission_summaries,
                "generated_at": timezone.now().isoformat()
            }

            return Response(response_data)

        except Exception as e:
            logger.error(f"Error in _get_overview_data: {str(e)}")
            raise

    def _get_user_analysis_data(self, tenant, user_id) -> Response:
        """
        Get user analysis data.
        Returns: UserAnalysisData structure
        """
        try:
            rbac_service = get_rbac_service(tenant)
        
            if user_id:
                # Single user analysis
                try:
                    user = TenantUserProfile.objects.get(
                        user_id=user_id,
                        tenant=tenant
                    )
                    
                    effective_perms = rbac_service.get_user_effective_permissions(user, force_refresh=True)
                    
                    # Count high risk permissions
                    high_risk_count = sum(
                        1 for perm_code, perm_data in effective_perms.get('permissions', {}).items()
                        if self._get_permission_risk_level(tenant, perm_code) in ['high', 'critical']
                    )
                    
                    user_summary = {
                        "user_id": user.user.id,
                        "name": user.user.get_full_name() or user.user.username,
                        "email": user.user.email,
                        "employee_id": getattr(user, 'employee_id', '') or '',
                        "job_title": getattr(user, 'job_title', '') or '',
                        "department": getattr(user, 'department', '') or '',
                        "is_active": user.is_active,
                        "last_login": user.user.last_login.isoformat() if user.user.last_login else None,
                        "total_permissions": len(effective_perms.get('permissions', {}))
                    }

                    response_data = {
                        "view_type": "user_analysis",
                        "user_summary": user_summary,
                        "effective_permissions": effective_perms,
                        "permission_sources": self._get_user_permission_sources(user, rbac_service),
                        "assignment_history": [],  # TODO: Implement
                        "conflicts": [],  # TODO: Implement
                        "recommendations": [],  # TODO: Implement
                        "generated_at": timezone.now().isoformat()
                    }

                    return Response(response_data)

                except TenantUserProfile.DoesNotExist:
                    return Response(
                        {'error': f'User {user_id} not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
                else:
                    # All users analysis
                    users = TenantUserProfile.objects.filter(
                    tenant=tenant,
                    is_active=True
                ).select_related('user')

                user_analyses = []
                for user in users:
                    effective_perms = rbac_service.get_user_effective_permissions(user, force_refresh=True)
                    user_perms = effective_perms.get('permissions', {})
                    
                    high_risk_count = sum(
                        1 for perm_code in user_perms.keys()
                        if self._get_permission_risk_level(tenant, perm_code) in ['high', 'critical']
                    )
                    
                    user_analyses.append({
                        "user_id": user.user.id,
                        "name": user.user.get_full_name() or user.user.username,
                        "email": user.user.email,
                        "employee_id": getattr(user, 'employee_id', '') or '',
                        "job_title": getattr(user, 'job_title', '') or '',
                        "total_permissions": len(user_perms),
                        "high_risk_permissions": high_risk_count,
                        "permission_sources_count": {
                            "designation": 0,  # TODO: Calculate
                            "group": 0,
                            "override": 0
                        }
                    })

                response_data = {
                    "view_type": "user_analysis",
                    "user_analyses": user_analyses,
                    "generated_at": timezone.now().isoformat()
                }

            return Response(response_data)

        except Exception as e:
            logger.error(f"Error in _get_user_analysis_data: {str(e)}")
            raise

    def _get_permission_analysis_data(self, tenant, permission_id) -> Response:
        """
        Get permission analysis data.
        Returns: PermissionAnalysisData structure
        """
        try:
            if permission_id:
                # Single permission analysis
                try:
                    permission = PermissionRegistry.objects.get(
                        id=permission_id,
                        tenant=tenant
                    )
                    
                    # Find users with this permission
                    users_with_permission = []
                    rbac_service = get_rbac_service(tenant)
                    
                    for user in TenantUserProfile.objects.filter(tenant=tenant, is_active=True):
                        effective_perms = rbac_service.get_user_effective_permissions(user, force_refresh=True)
                        if permission.permission_code in effective_perms.get('permissions', {}):
                            perm_data = effective_perms['permissions'][permission.permission_code]
                            users_with_permission.append({
                                "user_id": user.user.id,
                                "name": user.user.get_full_name() or user.user.username,
                                "email": user.user.email,
                                "employee_id": getattr(user, 'employee_id', '') or '',
                                "source": perm_data.get('source', 'unknown'),
                                "level": perm_data.get('permission_level', 'granted'),
                                "scope_configuration": perm_data.get('scope_configuration', {})
                            })

                    response_data = {
                        "view_type": "permission_analysis",
                        "permission_details": {
                            "id": permission.id,
                            "name": permission.permission_name,
                            "code": permission.permission_code,
                            "category": permission.permission_category,
                            "description": permission.description or '',
                            "risk_level": permission.risk_level,
                            "is_system_permission": permission.is_system_permission
                        },
                        "users_with_permission": users_with_permission,
                        "assignment_breakdown": {
                            "total_users": len(users_with_permission),
                            "by_source": {
                                "designation": 0,  # TODO: Calculate
                                "group": 0,
                                "override": 0
                            }
                        },
                        "generated_at": timezone.now().isoformat()
                    }

                except PermissionRegistry.DoesNotExist:
                    return Response(
                        {'error': f'Permission {permission_id} not found'}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # All permissions analysis
                permissions = PermissionRegistry.objects.filter(
                    tenant=tenant,
                    is_active=True
                )
                
                permission_analyses = []
                for permission in permissions:
                    # Count assignments (simplified)
                    permission_analyses.append({
                        "permission_id": permission.id,
                        "name": permission.permission_name,
                        "code": permission.permission_code,
                        "category": permission.permission_category,
                        "risk_level": permission.risk_level,
                        "assignment_counts": {
                            "designation_assignments": 0,  # TODO: Calculate
                            "group_assignments": 0,
                            "user_overrides": 0,
                            "total": 0
                        }
                    })

                response_data = {
                    "view_type": "permission_analysis",
                    "permission_analyses": permission_analyses,
                    "generated_at": timezone.now().isoformat()
                }

            return Response(response_data)

        except Exception as e:
            logger.error(f"Error in _get_permission_analysis_data: {str(e)}")
            raise

    def _get_analytics_data(self, tenant) -> Response:
        """
        Get analytics dashboard data.
        Returns: AnalyticsDashboardData structure
        """
        try:
            rbac_service = get_rbac_service(tenant)
            
            # Get all users and their permissions
            users = TenantUserProfile.objects.filter(tenant=tenant, is_active=True)
            permissions = PermissionRegistry.objects.filter(tenant=tenant, is_active=True)
            
            # Calculate permission usage
            permission_usage_map = {}
            user_permission_counts = []
            users_with_no_permissions = []
            
            for user in users:
                effective_perms = rbac_service.get_user_effective_permissions(user, force_refresh=True)
                user_perms = effective_perms.get('permissions', {})
                
                permission_count = len(user_perms)
                user_name = user.user.get_full_name() or user.user.username
                
                user_permission_counts.append({
                    "user_name": user_name,
                    "permission_count": permission_count
                })
                
                if permission_count == 0:
                    users_with_no_permissions.append({
                        "user_name": user_name,
                        "permission_count": 0
                    })
                
                # Count permission usage
                for perm_code in user_perms.keys():
                    if perm_code not in permission_usage_map:
                        permission_usage_map[perm_code] = 0
                    permission_usage_map[perm_code] += 1

            # Build top permissions list
            top_permissions = []
            for permission in permissions:
                usage_count = permission_usage_map.get(permission.permission_code, 0)
                top_permissions.append({
                    "permission_name": permission.permission_name,
                    "permission_code": permission.permission_code,
                    "category": permission.permission_category,
                    "risk_level": permission.risk_level,
                    "total_usage": usage_count,
                    "usage_breakdown": {
                        "designation": 0,  # TODO: Calculate
                        "group": 0,
                        "override": 0
                    }
                })
            
            # Sort by usage
            top_permissions.sort(key=lambda x: x['total_usage'], reverse=True)
            least_used = [p for p in top_permissions if p['total_usage'] == 0]
            
            # Risk analysis
            risk_counts = {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
            for permission in permissions:
                risk_counts[permission.risk_level] = risk_counts.get(permission.risk_level, 0) + 1
            
            high_risk_count = risk_counts.get('high', 0) + risk_counts.get('critical', 0)
            unused_count = len(least_used)

            # Sort users by permission count
            user_permission_counts.sort(key=lambda x: x['permission_count'], reverse=True)
            top_users = user_permission_counts[:10]

            response_data = {
                "view_type": "analytics",
                "permission_usage": {
                    "top_permissions": top_permissions[:10],
                    "least_used_permissions": least_used[:5]
                },
                "risk_analysis": {
                    "high_risk_permissions": high_risk_count,
                    "permissions_by_risk": risk_counts,
                    "unused_permissions": unused_count
                },
                "user_analytics": {
                    "users_by_permission_count": user_permission_counts,
                    "top_users": top_users,
                    "users_with_no_permissions": users_with_no_permissions
                },
                "trends": {
                    "recent_assignments": 0,  # TODO: Calculate from audit trail
                    "recent_revocations": 0
                },
                "generated_at": timezone.now().isoformat()
            }

            return Response(response_data)

        except Exception as e:
            logger.error(f"Error in _get_analytics_data: {str(e)}")
            raise

    # Helper methods
    def _get_permission_risk_level(self, tenant, permission_code: str) -> str:
        """Get risk level for a permission code."""
        try:
            permission = PermissionRegistry.objects.get(
                permission_code=permission_code,
                tenant=tenant
            )
            return permission.risk_level
        except PermissionRegistry.DoesNotExist:
            return 'low'

    def _get_user_permission_sources(self, user, rbac_service):
        """Get detailed permission sources for a user."""
        try:
            effective_perms = rbac_service.get_user_effective_permissions(user, force_refresh=True)
            permissions = effective_perms.get('permissions', {})
            
            designation_permissions = []
            group_permissions = []
            override_permissions = []
            
            for perm_code, perm_data in permissions.items():
                source = perm_data.get('source', '')
                permission_info = {
                    'permission_code': perm_code,
                    'permission_name': perm_data.get('permission', {}).get('name', perm_code),
                    'category': perm_data.get('permission', {}).get('category', 'Unknown'),
                    'level': perm_data.get('level', 'granted'),
                    'source': source,
                    'source_name': self._extract_source_name(source),
                    'risk_level': perm_data.get('permission', {}).get('risk_level', 'low'),
                    'is_mandatory': perm_data.get('is_mandatory', False),
                    'assignment_reason': perm_data.get('assignment_reason', 'Manual assignment')
                }
                
                if source.startswith('designation_'):
                    designation_permissions.append(permission_info)
                elif source.startswith('group_'):
                    group_permissions.append(permission_info)
                elif source.startswith('user_override_'):
                    override_permissions.append(permission_info)
            
            return {
                "designation_permissions": designation_permissions,
                "group_permissions": group_permissions,
                "override_permissions": override_permissions
            }
        except Exception as e:
            logger.error(f"Error calculating permission sources for user {user.user.id}: {str(e)}")
            return {
                "designation_permissions": [],
                "group_permissions": [],
                "override_permissions": []
            }
    
    def _extract_source_name(self, source):
        """Extract readable name from source string like 'designation_6' or 'group_34'."""
        try:
            if source.startswith('designation_'):
                designation_id = source.split('_')[1]
                designation = TenantDesignation.objects.get(id=designation_id)
                return designation.designation_name
            elif source.startswith('group_'):
                group_id = source.split('_')[1]
                group = PermissionGroup.objects.get(id=group_id)
                return group.group_name
            elif source.startswith('user_override_'):
                return "User Override"
            else:
                return source
        except Exception:
            return source
    
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
                        'last_login': target_user.user.last_login.isoformat() if target_user.user.last_login else None
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
                # Use normal permission calculation
                effective_permissions = rbac_service.get_user_effective_permissions(user)
                serialized_permissions = self._serialize_effective_permissions(effective_permissions)
                permission_sources = self._get_permission_sources(user, tenant)
                
                user_analyses.append({
                    'user_id': user.user.id,
                    'name': user.user.get_full_name() or f"{user.user.first_name} {user.user.last_name}".strip() or user.user.username,
                    'email': user.user.email,
                    'employee_id': user.employee_id or '',
                    'job_title': user.job_title or '',
                    'total_permissions': len(serialized_permissions.get('permissions', {})),
                    'high_risk_permissions': len([p for p in serialized_permissions.get('permissions', {}).values() if p.get('risk_level') in ['high', 'critical']]),
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
                    # Use normal permission calculation
                    effective_permissions = rbac_service.get_user_effective_permissions(user)
                    serialized_permissions = self._serialize_effective_permissions(effective_permissions)
                    permission_sources = self._get_permission_sources(user, tenant)
                    
                    if permission.permission_code in serialized_permissions.get('permissions', {}):
                        perm_details = serialized_permissions['permissions'][permission.permission_code]
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
            # Use normal permission calculation
            effective_permissions = rbac_service.get_user_effective_permissions(user)
            serialized_permissions = self._serialize_effective_permissions(effective_permissions)
            user_permission_counts.append({
                'user_name': user.user.get_full_name(),
                'permission_count': len(serialized_permissions.get('permissions', {}))
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
        """
        Search users who have a specific permission.
        Returns: SearchUsersResponse structure
        """
        try:
            permission_code = request.query_params.get('permission_code')
            source_type_filter = request.query_params.get('source_type')
            
            if not permission_code:
                return Response(
                    {'error': 'permission_code parameter is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            tenant = request.user.tenant_user_profile.tenant
            
            # Get permission details
            try:
                permission = PermissionRegistry.objects.get(
                    permission_code=permission_code,
                    tenant=tenant
                )
            except PermissionRegistry.DoesNotExist:
                return Response(
                    {'error': f'Permission {permission_code} not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Find users with this permission
            rbac_service = get_rbac_service(tenant)
            users_with_permission = []
            source_breakdown = {"designation": 0, "group": 0, "override": 0}

            for user in TenantUserProfile.objects.filter(tenant=tenant, is_active=True):
                effective_perms = rbac_service.get_user_effective_permissions(user, force_refresh=True)
                
                if permission_code in effective_perms.get('permissions', {}):
                    perm_data = effective_perms['permissions'][permission_code]
                    source = perm_data.get('source', 'unknown')
                    
                    # Apply source filter if specified
                    if source_type_filter and source != source_type_filter:
                        continue
                    
                    users_with_permission.append({
                        "user_id": user.user.id,
                        "name": user.user.get_full_name() or user.user.username,
                        "email": user.user.email,
                        "employee_id": getattr(user, 'employee_id', '') or '',
                        "job_title": getattr(user, 'job_title', '') or '',
                        "department": getattr(user, 'department', '') or '',
                        "permission_source": source,
                        "permission_level": perm_data.get('permission_level', 'granted'),
                        "scope_configuration": perm_data.get('scope_configuration', {}),
                        "last_login": user.user.last_login.isoformat() if user.user.last_login else None
                    })
                    
                    # Count by source
                    if source in source_breakdown:
                        source_breakdown[source] += 1

            response_data = {
                "permission_details": {
                    "code": permission.permission_code,
                    "name": permission.permission_name,
                    "category": permission.permission_category,
                    "risk_level": permission.risk_level
                },
                "search_criteria": {
                    "permission_code": permission_code,
                    "source_type_filter": source_type_filter
                },
                "results": {
                    "total_users_found": len(users_with_permission),
                    "users": users_with_permission
                },
                "breakdown_by_source": source_breakdown
            }

            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error in search_users_by_permission: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
                    'last_login': target_user.user.last_login.isoformat() if target_user.user.last_login else None
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

    @action(detail=False, methods=['get'])
    def working_overview(self, request: Request) -> Response:
        """
        WORKING overview using individual analysis logic for each user.
        This bypasses the problematic batch processing.
        """
        try:
            tenant = request.user.tenant_user_profile.tenant
            
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
            
            # Use individual analysis logic for each user (the working approach)
            permission_matrix = {}
            user_summaries = {}
            permission_summaries = {}
            
            for user in users:
                user_key = f"user_{user.user.id}"
                
                # Use the EXACT same logic as individual user analysis (which works)
                rbac_service = get_rbac_service(tenant)
                effective_permissions = rbac_service.get_user_effective_permissions(user)
                
                # Serialize exactly like individual analysis
                serialized_effective_permissions = self._serialize_effective_permissions(effective_permissions)
                
                user_summaries[user_key] = {
                    'user_id': user.user.id,
                    'name': user.user.get_full_name() or f"{user.user.first_name} {user.user.last_name}".strip() or user.user.username,
                    'email': user.user.email,
                    'employee_id': user.employee_id or '',
                    'job_title': user.job_title or '',
                    'department': getattr(user, 'department', '') or '',
                    'is_active': user.is_active,
                    'total_permissions': len(serialized_effective_permissions.get('permissions', {})),
                    'last_login': user.user.last_login.isoformat() if user.user.last_login else None
                }
                
                permission_matrix[user_key] = {}
                
                for permission in permissions:
                    perm_code = permission.permission_code
                    has_permission = perm_code in serialized_effective_permissions.get('permissions', {})
                    
                    source_info = 'none'
                    if has_permission:
                        perm_details = serialized_effective_permissions.get('permissions', {}).get(perm_code, {})
                        if isinstance(perm_details, dict):
                            source_info = perm_details.get('source', 'none')
                    
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
                        if 'designation' in source_info.lower():
                            permission_summaries[perm_code]['assignment_sources']['designation'] += 1
                        elif 'group' in source_info.lower():
                            permission_summaries[perm_code]['assignment_sources']['group'] += 1
                        elif 'override' in source_info.lower():
                            permission_summaries[perm_code]['assignment_sources']['override'] += 1
            
            # Calculate statistics
            total_users = len(users)
            total_permissions = len(permissions)
            total_assignments = sum(
                sum(1 for perm_data in user_perms.values() if perm_data['has_permission'])
                for user_perms in permission_matrix.values()
            )
            
            return Response({
                'view_type': 'working_overview',
                'summary': {
                    'total_users': total_users,
                    'total_permissions': total_permissions,
                    'total_assignments': total_assignments,
                    'average_permissions_per_user': total_assignments / total_users if total_users > 0 else 0
                },
                'permission_matrix': permission_matrix,
                'user_summaries': user_summaries,
                'permission_summaries': permission_summaries,
                'generated_at': timezone.now().isoformat(),
                'note': 'This uses individual analysis logic for each user'
            })
            
        except Exception as e:
            logger.error(f"Error in working overview: {str(e)}")
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )


from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models, transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
import logging

from .models import Project
from .serializers import (
    ProjectSerializer, ProjectDetailSerializer, ProjectCreateSerializer,
    ProjectUpdateSerializer, ProjectStatsSerializer
)
from core.permissions.tenant_permissions import TenantScopedPermission
from core.pagination import StandardResultsSetPagination

logger = logging.getLogger(__name__)


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for managing projects with comprehensive functionality"""
    permission_classes = [IsAuthenticated, TenantScopedPermission]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'project_type', 'circle']
    search_fields = ['name', 'description', 'activity']
    ordering_fields = ['created_at', 'start_date', 'end_date', 'name']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter projects by tenant and exclude soft-deleted records"""
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return Project.objects.none()

        return (
            Project.objects
            .filter(tenant=tenant, deleted_at__isnull=True)
            .select_related('client_tenant', 'created_by')
        )

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return ProjectCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ProjectUpdateSerializer
        elif self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectSerializer

    def perform_create(self, serializer):
        """Create project with tenant context"""
        tenant = getattr(self.request, 'tenant', None)
        serializer.save(
            tenant=tenant,
            created_by=self.request.user
        )

    def destroy(self, request, *args, **kwargs):
        """Soft delete: set deleted_at, do not hard delete"""
        project = self.get_object()
        if project.deleted_at:
            return Response(status=status.HTTP_204_NO_CONTENT)
        project.deleted_at = timezone.now()
        project.save(update_fields=['deleted_at', 'updated_at'])
        logger.info(f"Project {project.name} soft-deleted by {request.user.email}")
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Team member endpoints removed for Phase 1

    # --- Workflow endpoints (explicit) ---
    def _set_status(self, project: Project, new_status: str):
        """Internal helper to validate and set status according to Phase 1 transitions"""
        valid_transitions = {
            'planning': {'active', 'cancelled'},
            'active': {'on_hold', 'completed', 'cancelled'},
            'on_hold': {'active', 'cancelled'},
            'completed': set(),
            'cancelled': set(),
        }

        if new_status not in dict(Project.PROJECT_STATUS):
            return False, 'Invalid status'

        current = project.status
        if new_status not in valid_transitions.get(current, set()):
            return False, f'Cannot transition from {current} to {new_status}'

        project.status = new_status
        project.save(update_fields=['status', 'updated_at'])
        return True, None

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update project status"""
        project = self.get_object()
        new_status = request.data.get('status')
        ok, err = self._set_status(project, new_status)
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        logger.info(f"Project {project.name} status updated to {new_status} by {request.user.email}")
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        project = self.get_object()
        ok, err = self._set_status(project, 'active')
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        logger.info(f"Project {project.name} activated by {request.user.email}")
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def hold(self, request, pk=None):
        project = self.get_object()
        ok, err = self._set_status(project, 'on_hold')
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        logger.info(f"Project {project.name} put on hold by {request.user.email}")
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        project = self.get_object()
        ok, err = self._set_status(project, 'completed')
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        logger.info(f"Project {project.name} completed by {request.user.email}")
        return Response(ProjectSerializer(project).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        project = self.get_object()
        ok, err = self._set_status(project, 'cancelled')
        if not ok:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)
        logger.info(f"Project {project.name} cancelled by {request.user.email}")
        return Response(ProjectSerializer(project).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get project statistics for the tenant"""
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response(
                {'error': 'Tenant context required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        projects = Project.objects.filter(tenant=tenant, deleted_at__isnull=True)
        
        # Calculate statistics
        total_projects = projects.count()
        active_projects = projects.filter(status='active').count()
        completed_projects = projects.filter(status='completed').count()
        planning_projects = projects.filter(status='planning').count()
        on_hold_projects = projects.filter(status='on_hold').count()
        cancelled_projects = projects.filter(status='cancelled').count()
        
        # Project type breakdown
        project_types = projects.values('project_type').annotate(count=models.Count('id')).order_by('project_type')
        
        # Recent projects
        recent_projects = projects.order_by('-created_at')[:5]
        
        stats_data = {
            'total_projects': total_projects,
            'active_projects': active_projects,
            'completed_projects': completed_projects,
            'planning_projects': planning_projects,
            'on_hold_projects': on_hold_projects,
            'cancelled_projects': cancelled_projects,
            'project_types': list(project_types),
            'recent_projects': ProjectSerializer(recent_projects, many=True).data,
            'completion_rate': (completed_projects / total_projects * 100) if total_projects > 0 else 0
        }
        
        return Response(stats_data)

    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        """Bulk update project status"""
        project_ids = request.data.get('project_ids', [])
        new_status = request.data.get('status')
        
        if not project_ids:
            return Response(
                {'error': 'project_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_status not in dict(Project.PROJECT_STATUS):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tenant = getattr(request, 'tenant', None)
        updated_count = Project.objects.filter(
            id__in=project_ids,
            tenant=tenant,
            deleted_at__isnull=True
        ).update(status=new_status, updated_at=timezone.now())
        
        logger.info(f"Bulk updated {updated_count} projects to status {new_status} by {request.user.email}")
        
        return Response({
            'message': f'Updated {updated_count} projects',
            'updated_count': updated_count
        })

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Advanced project search"""
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response(
                {'error': 'Tenant context required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset()
        
        # Apply date range filters if provided
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(start_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(end_date__lte=date_to)
        
        # Apply standard filters
        queryset = self.filter_queryset(queryset)
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProjectSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ProjectSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a project (soft delete)"""
        project = self.get_object()
        
        if project.status == 'active':
            return Response(
                {'error': 'Cannot archive active project. Change status first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add archived status if not exists in choices
        project.status = 'cancelled'
        project.save(update_fields=['status', 'updated_at'])
        
        logger.info(f"Project {project.name} archived by {request.user.email}")
        
        return Response({'message': 'Project archived successfully'})

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a project with new name"""
        original_project = self.get_object()
        new_name = request.data.get('name')
        
        if not new_name:
            return Response(
                {'error': 'New project name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if project with new name already exists
        tenant = getattr(request, 'tenant', None)
        if Project.objects.filter(tenant=tenant, name=new_name).exists():
            return Response(
                {'error': 'Project with this name already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Create duplicate project (no team data in Phase 1)
            new_project = Project.objects.create(
                tenant=original_project.tenant,
                name=new_name,
                description=f"Copy of {original_project.description}",
                project_type=original_project.project_type,
                status='planning',
                client_tenant=original_project.client_tenant,
                customer_name=original_project.customer_name,
                circle=original_project.circle,
                activity=original_project.activity,
                start_date=original_project.start_date,
                end_date=original_project.end_date,
                scope=original_project.scope,
                created_by=request.user
            )
        
        logger.info(f"Project {original_project.name} duplicated as {new_name} by {request.user.email}")
        
        return Response(ProjectDetailSerializer(new_project).data, status=status.HTTP_201_CREATED)


class ProjectTeamMemberViewSet:  # Deprecated in Phase 1
    pass
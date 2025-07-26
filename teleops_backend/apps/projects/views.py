from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models, transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
import logging

from .models import Project, ProjectTeamMember
from .serializers import (
    ProjectSerializer, ProjectDetailSerializer, ProjectCreateSerializer,
    ProjectUpdateSerializer, ProjectTeamMemberSerializer, ProjectStatsSerializer
)
from core.permissions.tenant_permissions import TenantScopedPermission
from core.pagination import StandardResultsSetPagination

logger = logging.getLogger(__name__)


class ProjectViewSet(viewsets.ModelViewSet):
    """ViewSet for managing projects with comprehensive functionality"""
    permission_classes = [IsAuthenticated, TenantScopedPermission]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'project_type', 'project_manager']
    search_fields = ['name', 'description', 'location']
    ordering_fields = ['created_at', 'start_date', 'end_date', 'name']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter projects by tenant"""
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return Project.objects.none()
        
        return Project.objects.filter(tenant=tenant).select_related(
            'project_manager', 'created_by'
        ).prefetch_related('team_members')

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

    @action(detail=True, methods=['post'])
    def add_team_member(self, request, pk=None):
        """Add a team member to the project"""
        project = self.get_object()
        
        serializer = ProjectTeamMemberSerializer(data=request.data)
        if serializer.is_valid():
            # Check if user is already a team member
            user_id = serializer.validated_data['user'].id
            if ProjectTeamMember.objects.filter(project=project, user_id=user_id, is_active=True).exists():
                return Response(
                    {'error': 'User is already a team member'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer.save(project=project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def remove_team_member(self, request, pk=None):
        """Remove a team member from the project"""
        project = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            team_member = ProjectTeamMember.objects.get(
                project=project, 
                user_id=user_id, 
                is_active=True
            )
            team_member.is_active = False
            team_member.save()
            
            return Response({'message': 'Team member removed successfully'})
        except ProjectTeamMember.DoesNotExist:
            return Response(
                {'error': 'Team member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def team_members(self, request, pk=None):
        """Get all team members for the project"""
        project = self.get_object()
        team_members = ProjectTeamMember.objects.filter(
            project=project, 
            is_active=True
        ).select_related('user')
        
        serializer = ProjectTeamMemberSerializer(team_members, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update project status"""
        project = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Project.PROJECT_STATUS):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        project.status = new_status
        project.save(update_fields=['status', 'updated_at'])
        
        logger.info(f"Project {project.name} status updated to {new_status} by {request.user.email}")
        
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
        
        projects = Project.objects.filter(tenant=tenant)
        
        # Calculate statistics
        total_projects = projects.count()
        active_projects = projects.filter(status='active').count()
        completed_projects = projects.filter(status='completed').count()
        planning_projects = projects.filter(status='planning').count()
        on_hold_projects = projects.filter(status='on_hold').count()
        cancelled_projects = projects.filter(status='cancelled').count()
        
        # Project type breakdown
        project_types = projects.values('project_type').annotate(
            count=models.Count('id')
        ).order_by('project_type')
        
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
            tenant=tenant
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
        
        # Apply additional filters
        project_manager_id = request.query_params.get('project_manager_id')
        if project_manager_id:
            queryset = queryset.filter(project_manager_id=project_manager_id)
        
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(start_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(end_date__lte=date_to)
        
        budget_min = request.query_params.get('budget_min')
        budget_max = request.query_params.get('budget_max')
        if budget_min:
            queryset = queryset.filter(budget__gte=budget_min)
        if budget_max:
            queryset = queryset.filter(budget__lte=budget_max)
        
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
        project.status = 'archived'
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
            # Create duplicate project
            new_project = Project.objects.create(
                tenant=original_project.tenant,
                name=new_name,
                description=f"Copy of {original_project.description}",
                project_type=original_project.project_type,
                status='planning',  # Always start as planning
                budget=original_project.budget,
                location=original_project.location,
                scope=original_project.scope,
                created_by=request.user
            )
            
            # Copy team members
            team_members = ProjectTeamMember.objects.filter(
                project=original_project, 
                is_active=True
            )
            for member in team_members:
                ProjectTeamMember.objects.create(
                    project=new_project,
                    user=member.user,
                    role=member.role
                )
        
        logger.info(f"Project {original_project.name} duplicated as {new_name} by {request.user.email}")
        
        return Response(
            ProjectDetailSerializer(new_project).data,
            status=status.HTTP_201_CREATED
        )


class ProjectTeamMemberViewSet(viewsets.ModelViewSet):
    """ViewSet for managing project team members"""
    serializer_class = ProjectTeamMemberSerializer
    permission_classes = [IsAuthenticated, TenantScopedPermission]

    def get_queryset(self):
        """Filter team members by tenant projects"""
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return ProjectTeamMember.objects.none()
        
        return ProjectTeamMember.objects.filter(
            project__tenant=tenant
        ).select_related('project', 'user')

    def perform_create(self, serializer):
        """Create team member assignment"""
        # Additional validation can be added here
        serializer.save() 
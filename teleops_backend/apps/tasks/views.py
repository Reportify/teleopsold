from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models, transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
import logging
from django.db.models import Q, Count, Sum
from rest_framework.views import APIView
import pandas as pd

from .models import (
    Task, TaskSiteAssignment, TaskTeamAssignment, TaskComment, TaskTemplate,
    FlowTemplate, FlowInstance, TaskFromFlow, TaskSiteGroup, TaskSubActivity,
    BulkTaskCreationJob
)
from .serializers import (
    TaskSerializer, TaskDetailSerializer, TaskCreateSerializer,
    TaskUpdateSerializer, TaskSiteAssignmentSerializer, TaskTeamAssignmentSerializer,
    TaskCommentSerializer, TaskTemplateSerializer, TaskStatsSerializer,
    FlowTemplateCreateSerializer, FlowTemplateUpdateSerializer, FlowTemplateSerializer, 
    FlowInstanceSerializer, TaskFromFlowSerializer, TaskCreationRequestSerializer,
    BulkTaskCreationJobSerializer
)
from core.permissions.tenant_permissions import TenantScopedPermission, TaskPermission, EquipmentVerificationPermission
from core.pagination import StandardResultsSetPagination, LargeResultsSetPagination
from .utils import TaskIDGenerator, TaskCreationValidator
from django.core.exceptions import ValidationError
from apps.projects.models import Project, ProjectSite
from apps.sites.models import Site


logger = logging.getLogger(__name__)


class TaskViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tasks with multi-site and equipment verification support"""
    permission_classes = [IsAuthenticated, TaskPermission]
    pagination_class = LargeResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = [
        'status', 'priority', 'task_type', 'assigned_to', 'supervisor',
        'equipment_verification_status', 'equipment_verification_required'
    ]
    search_fields = ['title', 'description', 'task_id', 'instructions']
    ordering_fields = [
        'created_at', 'scheduled_start', 'priority', 
        'progress_percentage', 'task_id'
    ]
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter tasks by tenant"""
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return Task.objects.none()
        
        queryset = Task.objects.filter(tenant=tenant).select_related(
            'primary_site', 'project', 'assigned_to', 'supervisor',
            'equipment_verified_by', 'created_by'
        ).prefetch_related('additional_sites', 'assigned_team')
        
        # Additional filtering options
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        site_id = self.request.query_params.get('site')
        if site_id:
            queryset = queryset.filter(
                models.Q(primary_site_id=site_id) |
                models.Q(additional_sites__id=site_id)
            ).distinct()
        
        # Filter by assignment
        my_tasks = self.request.query_params.get('my_tasks')
        if my_tasks == 'true':
            queryset = queryset.filter(
                models.Q(assigned_to=self.request.user) |
                models.Q(supervisor=self.request.user) |
                models.Q(assigned_team=self.request.user)
            ).distinct()
        

        
        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return TaskCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TaskUpdateSerializer
        elif self.action == 'retrieve':
            return TaskDetailSerializer
        return TaskSerializer

    def perform_create(self, serializer):
        """Create task with tenant context"""
        tenant = getattr(self.request, 'tenant', None)
        serializer.save(
            tenant=tenant,
            created_by=self.request.user
        )

    @action(detail=True, methods=['post'])
    def assign_team_member(self, request, pk=None):
        """Assign a team member to the task"""
        task = self.get_object()
        
        serializer = TaskTeamAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            # Check if user is already assigned
            user_id = serializer.validated_data['user'].id
            if TaskTeamAssignment.objects.filter(
                task=task, 
                user_id=user_id, 
                is_active=True
            ).exists():
                return Response(
                    {'error': 'User is already assigned to this task'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer.save(task=task)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def remove_team_member(self, request, pk=None):
        """Remove a team member from the task"""
        task = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            assignment = TaskTeamAssignment.objects.get(
                task=task, 
                user_id=user_id, 
                is_active=True
            )
            assignment.is_active = False
            assignment.save()
            
            return Response({'message': 'Team member removed successfully'})
        except TaskTeamAssignment.DoesNotExist:
            return Response(
                {'error': 'Team member assignment not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def add_site(self, request, pk=None):
        """Add an additional site to the task"""
        task = self.get_object()
        
        serializer = TaskSiteAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            site_id = serializer.validated_data['site'].id
            
            # Check if site is already assigned
            if TaskSiteAssignment.objects.filter(task=task, site_id=site_id).exists():
                return Response(
                    {'error': 'Site is already assigned to this task'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if site is the primary site
            if task.primary_site.id == site_id:
                return Response(
                    {'error': 'Cannot add primary site as additional site'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer.save(task=task)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def update_progress(self, request, pk=None):
        """Update task progress"""
        task = self.get_object()
        
        progress = request.data.get('progress_percentage')
        notes = request.data.get('notes', '')
        
        if progress is None:
            return Response(
                {'error': 'progress_percentage is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            progress = float(progress)
            if not (0 <= progress <= 100):
                raise ValueError("Progress must be between 0 and 100")
        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid progress percentage'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        task.update_progress(progress, notes)
        
        logger.info(f"Task {task.task_id} progress updated to {progress}% by {request.user.email}")
        
        return Response(TaskSerializer(task).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, EquipmentVerificationPermission])
    def verify_equipment(self, request, pk=None):
        """Mark equipment as verified"""
        task = self.get_object()
        
        if not task.equipment_verification_required:
            return Response(
                {'error': 'Equipment verification not required for this task'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        verification_notes = request.data.get('notes', '')
        
        task.mark_equipment_verified(request.user)
        
        # Add comment about verification
        if verification_notes:
            TaskComment.objects.create(
                task=task,
                user=request.user,
                comment_type='equipment',
                comment=f"Equipment verified. {verification_notes}",
                is_internal=False
            )
        
        logger.info(f"Equipment verified for task {task.task_id} by {request.user.email}")
        
        return Response({
            'message': 'Equipment verified successfully',
            'verified_at': task.equipment_verified_at,
            'verified_by': task.equipment_verified_by.full_name
        })

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update task status"""
        task = self.get_object()
        new_status = request.data.get('status')
        status_notes = request.data.get('notes', '')
        
        if new_status not in dict(Task.TASK_STATUS):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = task.status
        task.status = new_status
        
        # Handle status-specific logic
        if new_status == 'in_progress' and not task.actual_start:
            task.actual_start = timezone.now()
        
        if new_status == 'completed':
            if not task.actual_end:
                task.actual_end = timezone.now()
            if task.progress_percentage < 100:
                task.progress_percentage = 100
            task.completed_at = timezone.now()
        
        if new_status == 'cancelled':
            task.cancellation_reason = status_notes
        
        task.save()
        
        # Add status change comment
        TaskComment.objects.create(
            task=task,
            user=request.user,
            comment_type='progress',
            comment=f"Status changed from {old_status} to {new_status}. {status_notes}",
            is_internal=False
        )
        
        logger.info(f"Task {task.task_id} status updated from {old_status} to {new_status} by {request.user.email}")
        
        return Response(TaskSerializer(task).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get task statistics for the tenant"""
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response(
                {'error': 'Tenant context required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tasks = Task.objects.filter(tenant=tenant)
        
        # Calculate statistics
        total_tasks = tasks.count()
        pending_tasks = tasks.filter(status='pending').count()
        assigned_tasks = tasks.filter(status='assigned').count()
        in_progress_tasks = tasks.filter(status='in_progress').count()
        completed_tasks = tasks.filter(status='completed').count()
        cancelled_tasks = tasks.filter(status='cancelled').count()

        
        # Equipment verification stats
        verification_required = tasks.filter(equipment_verification_required=True).count()
        verification_pending = tasks.filter(
            equipment_verification_required=True,
            equipment_verification_status='pending'
        ).count()
        verification_completed = tasks.filter(
            equipment_verification_required=True,
            equipment_verification_status='verified'
        ).count()
        
        # Task type breakdown
        task_types = tasks.values('task_type').annotate(
            count=models.Count('id')
        ).order_by('task_type')
        
        # Priority breakdown
        priority_breakdown = tasks.values('priority').annotate(
            count=models.Count('id')
        ).order_by('priority')
        
        # Recent tasks
        recent_tasks = tasks.order_by('-created_at')[:5]
        
        stats_data = {
            'total_tasks': total_tasks,
            'pending_tasks': pending_tasks,
            'assigned_tasks': assigned_tasks,
            'in_progress_tasks': in_progress_tasks,
            'completed_tasks': completed_tasks,
            'cancelled_tasks': cancelled_tasks,
            'completion_rate': (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
            'equipment_verification': {
                'required': verification_required,
                'pending': verification_pending,
                'completed': verification_completed,
                'completion_rate': (verification_completed / verification_required * 100) if verification_required > 0 else 0
            },
            'task_types': list(task_types),
            'priority_breakdown': list(priority_breakdown),
            'recent_tasks': TaskSerializer(recent_tasks, many=True).data
        }
        
        return Response(stats_data)

    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        """Bulk update task status"""
        task_ids = request.data.get('task_ids', [])
        new_status = request.data.get('status')
        
        if not task_ids:
            return Response(
                {'error': 'task_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_status not in dict(Task.TASK_STATUS):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        tenant = getattr(request, 'tenant', None)
        
        # Update tasks
        updated_count = 0
        with transaction.atomic():
            tasks = Task.objects.filter(
                id__in=task_ids,
                tenant=tenant
            )
            
            for task in tasks:
                old_status = task.status
                task.status = new_status
                
                # Handle status-specific logic
                if new_status == 'in_progress' and not task.actual_start:
                    task.actual_start = timezone.now()
                
                if new_status == 'completed':
                    if not task.actual_end:
                        task.actual_end = timezone.now()
                    if task.progress_percentage < 100:
                        task.progress_percentage = 100
                    task.completed_at = timezone.now()
                
                task.save()
                
                # Add status change comment
                TaskComment.objects.create(
                    task=task,
                    user=request.user,
                    comment_type='progress',
                    comment=f"Status changed from {old_status} to {new_status} (bulk update)",
                    is_internal=False
                )
                
                updated_count += 1
        
        logger.info(f"Bulk updated {updated_count} tasks to status {new_status} by {request.user.email}")
        
        return Response({
            'message': f'Updated {updated_count} tasks',
            'updated_count': updated_count
        })

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        """Get all comments for the task"""
        task = self.get_object()
        
        comments = TaskComment.objects.filter(task=task).select_related('user')
        
        # Filter internal comments based on permissions
        if not self._can_view_internal_comments(request.user, task):
            comments = comments.filter(is_internal=False)
        
        # Filter by visibility scope
        comments = self._filter_by_visibility_scope(comments, request.user, task)
        
        serializer = TaskCommentSerializer(comments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        """Add a comment to the task"""
        task = self.get_object()
        
        data = request.data.copy()
        data['task'] = task.id
        data['user'] = request.user.id
        
        serializer = TaskCommentSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def _can_view_internal_comments(self, user, task):
        """Check if user can view internal comments"""
        # Task assignees, supervisors, and project managers can view internal comments
        if user == task.assigned_to or user == task.supervisor:
            return True
        
        if task.project and user == task.project.project_manager:
            return True
        
        if user in task.assigned_team.all():
            return True
        
        # Check for admin permissions
        if hasattr(user, 'tenant_user_profile'):
            profile = user.tenant_user_profile
            if profile:
                designations = profile.all_designations
                for designation in designations:
                    if designation.can_manage_users or designation.approval_authority_level > 0:
                        return True
        
        return False

    def _filter_by_visibility_scope(self, comments, user, task):
        """Filter comments by visibility scope"""
        # For now, return all non-internal comments
        # This can be enhanced based on specific business rules
        return comments


class TaskCommentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing task comments"""
    serializer_class = TaskCommentSerializer
    permission_classes = [IsAuthenticated, TenantScopedPermission]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Filter comments by tenant through task relationship"""
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return TaskComment.objects.none()
        
        return TaskComment.objects.filter(
            task__tenant=tenant
        ).select_related('task', 'user')

    def perform_create(self, serializer):
        """Create comment with user context"""
        serializer.save(user=self.request.user)


class TaskTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing task templates"""
    serializer_class = TaskTemplateSerializer
    permission_classes = [IsAuthenticated, TenantScopedPermission]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['task_type', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'usage_count', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        """Filter templates by tenant"""
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return TaskTemplate.objects.none()
        
        return TaskTemplate.objects.filter(tenant=tenant).select_related('created_by')

    def perform_create(self, serializer):
        """Create template with tenant context"""
        tenant = getattr(self.request, 'tenant', None)
        serializer.save(
            tenant=tenant,
            created_by=self.request.user
        )

    @action(detail=True, methods=['post'])
    def create_task(self, request, pk=None):
        """Create a task from this template"""
        template = self.get_object()
        
        # Required data for task creation
        primary_site_id = request.data.get('primary_site_id')
        if not primary_site_id:
            return Response(
                {'error': 'primary_site_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from apps.sites.models import Site
            primary_site = Site.objects.get(id=primary_site_id, tenant=template.tenant)
        except Site.DoesNotExist:
            return Response(
                {'error': 'Primary site not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Optional data
        project_id = request.data.get('project_id')
        project = None
        if project_id:
            try:
                from apps.projects.models import Project
                project = Project.objects.get(id=project_id, tenant=template.tenant)
            except Project.DoesNotExist:
                return Response(
                    {'error': 'Project not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Create task from template
        task = template.create_task_from_template(
            title=request.data.get('title'),
            description=request.data.get('description'),
            priority=request.data.get('priority'),
            estimated_hours=request.data.get('estimated_hours'),
            created_by=request.user,
            primary_site=primary_site,
            project=project
        )
        
        return Response(
            TaskDetailSerializer(task).data,
            status=status.HTTP_201_CREATED
        ) 


class FlowTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for FlowTemplate CRUD operations"""
    serializer_class = FlowTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter flows by tenant and handle search/filtering"""
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return FlowTemplate.objects.none()
        
        queryset = FlowTemplate.objects.filter(tenant=tenant).prefetch_related(
            'activities__assigned_sites__flow_site',
            'sites'
        )
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(category__icontains=search)
            )
        
        # Category filter
        category = self.request.query_params.get('category', None)
        if category and category != 'all':
            queryset = queryset.filter(category=category)
        
        # Active filter
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Public filter
        is_public = self.request.query_params.get('is_public', None)
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public.lower() == 'true')
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """Use different serializers for create/update operations"""
        if self.action in ['create']:
            return FlowTemplateCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return FlowTemplateUpdateSerializer
        return FlowTemplateSerializer
    
    def perform_create(self, serializer):
        """Create the flow template and return the instance"""
        return serializer.save()
    
    def create(self, request, *args, **kwargs):
        """Override create to return properly serialized response"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = self.perform_create(serializer)
        
        # Use the default serializer to return the response
        # This ensures proper serialization of related fields
        response_serializer = FlowTemplateSerializer(instance, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def perform_update(self, serializer):
        """Update the flow template"""
        serializer.save()
    
    def perform_destroy(self, instance):
        """Delete the flow template and related data"""
        instance.delete()


class FlowTemplateSearchView(APIView):
    """View for searching flow templates with advanced filters"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Search flow templates with various filters"""
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response({
                'success': False,
                'message': 'Tenant context required'
            }, status=400)
        
        queryset = FlowTemplate.objects.filter(tenant=tenant)
        
        # Search term
        search_term = request.query_params.get('search', '')
        if search_term:
            queryset = queryset.filter(
                Q(name__icontains=search_term) |
                Q(description__icontains=search_term) |
                Q(category__icontains=search_term)
            )
        
        # Category filter
        category = request.query_params.get('category', '')
        if category:
            queryset = queryset.filter(category=category)
        
        # Popular flows (by usage count)
        popular = request.query_params.get('popular', 'false').lower() == 'true'
        if popular:
            queryset = queryset.order_by('-usage_count')
        
        # Limit results
        limit = request.query_params.get('limit', 10)
        try:
            limit = int(limit)
            queryset = queryset[:limit]
        except ValueError:
            pass
        
        serializer = FlowTemplateSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data,
            'count': len(serializer.data)
        })


class FlowTemplateUsageView(APIView):
    """View for managing flow template usage"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, flow_id):
        """Increment usage count for a flow template"""
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response({
                'success': False,
                'message': 'Tenant context required'
            }, status=400)
        
        try:
            flow_template = FlowTemplate.objects.get(
                id=flow_id, 
                tenant=tenant
            )
            flow_template.usage_count += 1
            flow_template.save(update_fields=['usage_count'])
            
            return Response({
                'success': True,
                'message': 'Usage count updated successfully',
                'data': FlowTemplateSerializer(flow_template).data
            })
        except FlowTemplate.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Flow template not found'
            }, status=404)


class FlowTemplateStatisticsView(APIView):
    """View for getting flow template statistics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get statistics about flow templates"""
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response({
                'success': False,
                'message': 'Tenant context required'
            }, status=400)
        
        queryset = FlowTemplate.objects.filter(tenant=tenant)
        
        # Basic counts
        total_flows = queryset.count()
        active_flows = queryset.filter(is_active=True).count()
        total_usage = queryset.aggregate(
            total=Sum('usage_count')
        )['total'] or 0
        
        # Category counts
        category_counts = queryset.values('category').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Most used flows
        most_used_flows = queryset.order_by('-usage_count')[:5]
        most_used_data = FlowTemplateSerializer(most_used_flows, many=True).data
        
        # Recent flows
        recent_flows = queryset.order_by('-created_at')[:5]
        recent_data = FlowTemplateSerializer(recent_flows, many=True).data
        
        return Response({
            'success': True,
            'data': {
                'totalFlows': total_flows,
                'activeFlows': active_flows,
                'totalUsage': total_usage,
                'categoryCounts': {item['category']: item['count'] for item in category_counts},
                'mostUsedFlows': most_used_data,
                'recentFlows': recent_data
            }
        })


class FlowInstanceViewSet(viewsets.ModelViewSet):
    """ViewSet for FlowInstance CRUD operations"""
    serializer_class = FlowInstanceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter flow instances by tenant and related data"""
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return FlowInstance.objects.none()
        
        queryset = FlowInstance.objects.filter(
            flow_template__tenant=tenant
        )
        
        # Filter by flow template
        flow_template = self.request.query_params.get('flow_template', None)
        if flow_template:
            queryset = queryset.filter(flow_template_id=flow_template)
        
        # Filter by task
        task = self.request.query_params.get('task', None)
        if task:
            queryset = queryset.filter(task_id=task)
        
        # Filter by status
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create a new flow instance"""
        serializer.save()
    
    def perform_update(self, serializer):
        """Update the flow instance"""
        serializer.save()


# ============================================================================
# Task Creation from Flow Template Views
# ============================================================================

class TaskFromFlowViewSet(viewsets.ModelViewSet):
    """ViewSet for managing TaskFromFlow objects"""
    permission_classes = [IsAuthenticated, TenantScopedPermission]
    serializer_class = TaskFromFlowSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'flow_template', 'project']
    search_fields = ['task_id', 'task_name', 'description', 'client_task_id']
    ordering_fields = ['created_at', 'updated_at', 'task_id']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter TaskFromFlow objects by tenant"""
        tenant = getattr(self.request, 'tenant', None)
        if not tenant:
            return TaskFromFlow.objects.none()
        
        queryset = TaskFromFlow.objects.filter(tenant=tenant).select_related(
            'flow_template', 'project', 'created_by', 'assigned_to', 'supervisor'
        ).prefetch_related('site_groups', 'sub_activities')
        
        # Additional filtering options
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        flow_template_id = self.request.query_params.get('flow_template')
        if flow_template_id:
            queryset = queryset.filter(flow_template_id=flow_template_id)
        
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        
        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'retrieve':
            return TaskFromFlowSerializer
        return TaskFromFlowSerializer


class CreateTaskFromFlowView(APIView):
    """API view for creating tasks from flow templates"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create tasks from a flow template for specified site groups"""
        try:
            # Validate request data
            serializer = TaskCreationRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'message': 'Invalid request data',
                    'errors': serializer.errors
                }, status=400)
            
            validated_data = serializer.validated_data
            flow_template_id = validated_data['flow_template_id']
            project_id = validated_data['project_id']
            site_groups = validated_data['site_groups']
            task_naming = validated_data.get('task_naming', {})
            
            # Get tenant context
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response({
                    'success': False,
                    'message': 'Tenant context required'
                }, status=400)
            
            # Get flow template
            try:
                flow_template = FlowTemplate.objects.get(
                    id=flow_template_id,
                    tenant=tenant,
                    is_active=True
                )
            except FlowTemplate.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Flow template not found or inactive'
                }, status=400)
            
            # Get project
            try:
                project = Project.objects.get(
                    id=project_id,
                    tenant=tenant
                )
            except Project.DoesNotExist:
                return Response({
                    'success': False,
                    'message': 'Project not found'
                }, status=400)
            
            # Validate site groups against flow template
            is_valid, error_msg = TaskCreationValidator.validate_site_groups(
                site_groups, flow_template
            )
            if not is_valid:
                return Response({
                    'success': False,
                    'message': error_msg
                }, status=400)
            
            # Create tasks using transaction
            with transaction.atomic():
                created_tasks = []
                total_sites = 0
                
                for site_group in site_groups:
                    # Create task for this site group
                    task = self._create_task_from_site_group(
                        flow_template, project, site_group, task_naming, tenant, request.user
                    )
                    created_tasks.append(task)
                    total_sites += len(site_group['sites'])
                
                # Create flow instance for tracking (using the first task's ID)
                if created_tasks:
                    flow_instance = FlowInstance.objects.create(
                        flow_template=flow_template,
                            task_id=created_tasks[0].id,
                        status='PENDING'
                    )
                else:
                    # This shouldn't happen, but handle it gracefully
                    flow_instance = None
                
                # Prepare response data
                response_data = {
                    'tasks': TaskFromFlowSerializer(created_tasks, many=True).data,
                    'flow_instance': {
                        'id': str(flow_instance.id) if flow_instance else None,
                        'flow_template': flow_template.name,
                        'status': flow_instance.status if flow_instance else 'PENDING'
                    } if flow_instance else None,
                    'message': f"Successfully created {len(created_tasks)} tasks",
                    'created_count': len(created_tasks),
                    'total_sites': total_sites
                }
                
                return Response({
                    'success': True,
                    'data': response_data
                }, status=201)
                
        except Exception as e:
            return Response({
                'success': False,
                'message': f'An error occurred: {str(e)}'
            }, status=500)
    
    def _create_task_from_site_group(self, flow_template, project, site_group, task_naming, tenant, user):
        """Create a single task from a site group"""
        # Generate task ID
        client_task_id = site_group.get('client_task_id')
        
        # Validate client ID if provided
        if client_task_id:
            is_valid, error_msg = TaskIDGenerator.validate_client_id(client_task_id, tenant)
            if not is_valid:
                raise ValidationError(error_msg)
        
        # Generate task ID
        task_id = TaskIDGenerator.generate_task_id(
            flow_template=flow_template,
            project=project,
            client_id=client_task_id,
            prefix=task_naming.get('auto_id_prefix'),
            start_number=task_naming.get('auto_id_start'),
            tenant=tenant
        )
        
        # Create main task
        task = TaskFromFlow.objects.create(
            task_id=task_id,
            client_task_id=client_task_id,
            is_client_id_provided=bool(client_task_id),
            task_name=f"{flow_template.name}Task",
            description=f"Task created from flow template: {flow_template.name}",
            flow_template=flow_template,
            project=project,
            tenant=tenant,
            created_by=user,
            status='pending',
            priority='medium'
        )
        
        # Create site group mappings
        for i, (alias, project_site_id) in enumerate(site_group['sites'].items()):
            # Get the project site object first, then extract the actual site
            try:
                project_site = ProjectSite.objects.get(id=project_site_id)
                actual_site = project_site.site
            except ProjectSite.DoesNotExist:
                raise ValidationError(f"Project site with ID {project_site_id} not found")
            except AttributeError:
                # Handle case where project_site.site might be None
                raise ValidationError(f"Project site {project_site_id} has no associated site")
            
            TaskSiteGroup.objects.create(
                task_from_flow=task,
                site=actual_site,
                site_alias=alias,
                assignment_order=i
            )
        
        # Create sub-activities for this task
        self._create_sub_activities_for_task(task, flow_template, site_group)
        
        return task
    
    def _create_sub_activities_for_task(self, task, flow_template, site_group):
        """Create sub-activities for a task based on flow template"""
        # Get all activities from the flow template
        template_activities = flow_template.activities.all().order_by('sequence_order')
        
        sub_task_counter = 0
        sub_task_map = {}  # Map template sequence to list of sub-task IDs for dependencies
        
        # First pass: Create all sub-tasks and build the mapping
        for template_activity in template_activities:
            # Check which sites this activity is assigned to
            for flow_activity_site in template_activity.assigned_sites.all():
                if flow_activity_site.flow_site.alias in site_group['sites']:
                    # Get the project site ID for this alias
                    project_site_id = site_group['sites'][flow_activity_site.flow_site.alias]
                    
                    # Get the actual site from the project site
                    try:
                        project_site = ProjectSite.objects.get(id=project_site_id)
                        actual_site = project_site.site
                    except ProjectSite.DoesNotExist:
                        raise ValidationError(f"Project site with ID {project_site_id} not found")
                    except AttributeError:
                        raise ValidationError(f"Project site {project_site_id} has no associated site")
                    
                    # Create sub-task for this site
                    sub_task = TaskSubActivity.objects.create(
                        task_from_flow=task,
                        flow_activity=template_activity,
                        sequence_order=sub_task_counter,
                        activity_type=template_activity.activity_type,
                        activity_name=template_activity.activity_name,
                        description=template_activity.description,
                        assigned_site=actual_site,  # Use the actual Site object, not ID
                        site_alias=flow_activity_site.flow_site.alias,
                        dependencies=[],  # Initialize empty, will be updated later
                        dependency_scope=template_activity.dependency_scope,
                        parallel_execution=template_activity.parallel_execution,
                        status='pending',
                        progress_percentage=0
                    )
                    
                    # Store mapping for dependency resolution
                    if template_activity.sequence_order not in sub_task_map:
                        sub_task_map[template_activity.sequence_order] = []
                    sub_task_map[template_activity.sequence_order].append(sub_task.id)
                    sub_task_counter += 1
        
        # Second pass: Update dependencies to use sub-task IDs instead of template sequence
        for sub_task in task.sub_activities.all():
            # Get the template activity for this sub-task
            template_activity = sub_task.flow_activity
            
            if template_activity.dependencies:
                updated_dependencies = []
                for dep_sequence in template_activity.dependencies:
                    try:
                        dep_sequence_int = int(dep_sequence)
                        if dep_sequence_int in sub_task_map:
                            # For now, just use the first sub-task of the dependent activity
                            # This handles the basic case where dependencies are site-local
                            updated_dependencies.append(str(sub_task_map[dep_sequence_int][0]))
                    except ValueError:
                        # Skip invalid dependency sequences
                        continue
                
                sub_task.dependencies = updated_dependencies
                sub_task.save(update_fields=['dependencies']) 


class AsyncBulkTaskCreationView(APIView):
    """
    Asynchronous view for bulk task creation from CSV files
    """
    permission_classes = [IsAuthenticated, TaskPermission]
    
    def post(self, request):
        """Handle bulk CSV upload for task creation"""
        try:
            # Get tenant and user
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"success": False, "message": "Tenant not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            user = request.user
            
            # Validate required fields
            flow_template_id = request.data.get('flow_template_id')
            project_id = request.data.get('project_id')
            csv_file = request.FILES.get('csv_file')
            
            # Get new Task ID generation parameters
            auto_id_prefix = request.data.get('auto_id_prefix', '')
            auto_id_start = request.data.get('auto_id_start', '')
            task_name = request.data.get('task_name', '')
            
            # Log the new parameters for debugging
            logger.info(f"🚨 TASK ID GENERATION DEBUG - New parameters received:")
            logger.info(f"Auto-ID Prefix: '{auto_id_prefix}'")
            logger.info(f"Auto-ID Start: '{auto_id_start}'")
            logger.info(f"Task Name: '{task_name}'")
            
            if not all([flow_template_id, project_id, csv_file]):
                return Response(
                    {"success": False, "message": "Missing required fields: flow_template_id, project_id, csv_file"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate flow template and project
            try:
                flow_template = FlowTemplate.objects.get(id=flow_template_id, tenant=tenant)
                project = Project.objects.get(id=project_id, tenant=tenant)
            except (FlowTemplate.DoesNotExist, Project.DoesNotExist):
                return Response(
                    {"success": False, "message": "Invalid flow template or project"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Read CSV file
            import pandas as pd
            import io
            
            try:
                csv_content = csv_file.read().decode('utf-8')
                logger.error(f"🔍 CSV DEBUG: Raw CSV content preview: {csv_content[:1000]}...")
                logger.error(f"🔍 CSV DEBUG: CSV file size: {len(csv_content)} characters")
                
                # Log the raw bytes to see if there are encoding issues
                csv_file.seek(0)  # Reset file pointer
                raw_bytes = csv_file.read()
                logger.error(f"🔍 CSV DEBUG: Raw bytes (first 200): {raw_bytes[:200]}")
                logger.error(f"🔍 CSV DEBUG: Raw bytes length: {len(raw_bytes)}")
                
                # Try different encoding methods
                try:
                    csv_content_utf8 = raw_bytes.decode('utf-8')
                    logger.error(f"🔍 CSV DEBUG: UTF-8 decode successful")
                except UnicodeDecodeError as e:
                    logger.error(f"🔍 CSV DEBUG: UTF-8 decode failed: {e}")
                    try:
                        csv_content_utf8 = raw_bytes.decode('utf-8-sig')  # Try with BOM
                        logger.error(f"🔍 CSV DEBUG: UTF-8-BOM decode successful")
                    except UnicodeDecodeError as e2:
                        logger.error(f"🔍 CSV DEBUG: UTF-8-BOM decode failed: {e2}")
                        csv_content_utf8 = raw_bytes.decode('latin-1')  # Fallback
                        logger.error(f"🔍 CSV DEBUG: Latin-1 decode successful")
                
                # Read CSV with better handling of empty cells and NaN values
                logger.error(f"🔍 CSV DEBUG: About to read CSV with pandas...")
                df = pd.read_csv(io.StringIO(csv_content_utf8), na_values=['', 'nan', 'NaN', 'NULL', 'null'], keep_default_na=False)
                logger.error(f"🔍 CSV DEBUG: Pandas read_csv completed successfully")
                
                # Log the raw dataframe info
                logger.error(f"🔍 CSV DEBUG: DataFrame info:")
                logger.error(f"🔍 CSV DEBUG: Shape: {df.shape}")
                logger.error(f"🔍 CSV DEBUG: Columns: {df.columns.tolist()}")
                logger.error(f"🔍 CSV DEBUG: First few rows (raw):")
                logger.error(f"🔍 CSV DEBUG: {df.head(3).to_string()}")
                
                # Clean the dataframe - replace any remaining NaN values with empty strings
                df = df.fillna('')
                logger.error(f"🔍 CSV DEBUG: DataFrame cleaned with fillna")
                
                logger.error(f"🔍 CSV DEBUG: CSV loaded with {len(df)} rows and columns: {list(df.columns)}")
                logger.error(f"🔍 CSV DEBUG: Column names (exact): {[repr(col) for col in df.columns]}")
                logger.error(f"🔍 CSV DEBUG: DataFrame dtypes: {df.dtypes.to_dict()}")
                logger.error(f"🔍 CSV DEBUG: First few rows of data:")
                for i in range(min(3, len(df))):
                    row_data = dict(df.iloc[i])
                    logger.error(f"🔍 CSV DEBUG: Row {i+1}: {row_data}")
                    # Log each column value separately to see exact content
                    for col, val in row_data.items():
                        logger.error(f"🔍 CSV DEBUG: Row {i+1}, Column '{col}': '{val}' (type: {type(val)})")
                
                logger.error(f"🔍 CSV DEBUG: CSV cleaned - NaN values replaced with empty strings")
            except Exception as e:
                logger.error(f"CSV reading error: {str(e)}")
                logger.error(f"Error type: {type(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                return Response(
                    {"success": False, "message": f"Failed to read CSV file: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
                            # Validate CSV structure - Updated for new Task ID column
            expected_columns = ["Task Unique ID (Optional)"]
            for site in flow_template.sites.all():
                expected_columns.extend([f"{site.alias} Site ID", f"{site.alias} Global ID", f"{site.alias} Site Name"])
            
            logger.error(f"🔍 CSV DEBUG: Expected columns: {expected_columns}")
            logger.error(f"🔍 CSV DEBUG: Actual columns: {list(df.columns)}")
            logger.error(f"🔍 CSV DEBUG: Column existence check:")
            for col in expected_columns:
                exists = col in df.columns
                logger.error(f"🔍 CSV DEBUG: Column '{col}' exists: {exists}")
            
            if not all(col in df.columns for col in expected_columns):
                return Response(
                    {"success": False, "message": f"Invalid CSV structure. Expected columns: {', '.join(expected_columns)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            total_rows = len(df)
            
            # For large files (>50 rows), use async processing
            if total_rows > 50:
                return self._process_large_upload_async(request, df, flow_template, project, tenant, user, csv_file.name, auto_id_prefix, auto_id_start, task_name)
            else:
                return self._process_small_upload_sync(request, df, flow_template, project, tenant, user, auto_id_prefix, auto_id_start, task_name)
                
        except Exception as e:
            logger.error(f"Error in bulk task creation: {str(e)}")
            return Response(
                {"success": False, "message": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_small_upload_sync(self, request, df, flow_template, project, tenant, user, auto_id_prefix, auto_id_start, task_name):
        """Process small uploads synchronously"""
        try:
            results = self._process_csv_data(df, flow_template, project, tenant, user, auto_id_prefix, auto_id_start, task_name)
            
            return Response({
                "success": True,
                "message": f"Successfully created {results['success_count']} tasks",
                "data": {
                    "created_count": results['success_count'],
                    "error_count": results['error_count'],
                    "total_rows": len(df),
                    "errors": results['errors']
                }
            })
            
        except Exception as e:
            logger.error(f"Error in sync processing: {str(e)}")
            return Response(
                {"success": False, "message": f"Failed to process upload: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_large_upload_async(self, request, df, flow_template, project, tenant, user, file_name, auto_id_prefix, auto_id_start, task_name):
        """Process large uploads asynchronously"""
        try:
            # Create job record
            job = BulkTaskCreationJob.objects.create(
                tenant=tenant,
                created_by=user,
                flow_template=flow_template,
                project=project,
                file_name=file_name,
                total_rows=len(df),
                status='pending'
            )
            
            # Start async processing
            import threading
            thread = threading.Thread(
                target=self._process_large_upload_async_worker,
                args=(job, df, flow_template, project, tenant, user, auto_id_prefix, auto_id_start, task_name)
            )
            thread.daemon = True
            thread.start()
            
            return Response({
                "success": True,
                "message": "Large file detected. Processing started asynchronously.",
                "data": {
                    "job_id": job.id,
                    "total_rows": len(df),
                    "status": "processing"
                }
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.error(f"Error starting async job: {str(e)}")
            return Response(
                {"success": False, "message": f"Failed to start async processing: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_large_upload_async_worker(self, job, df, flow_template, project, tenant, user, auto_id_prefix, auto_id_start, task_name):
        """Worker thread for async processing"""
        try:
            logger.info(f"Starting async processing for job {job.id}, {len(df)} rows")
            job.status = 'processing'
            job.started_at = timezone.now()
            job.detailed_errors = []
            job.save()
            
            # Process in chunks of 50 rows
            chunk_size = 50
            total_chunks = (len(df) + chunk_size - 1) // chunk_size
            logger.info(f"Processing {len(df)} rows in {total_chunks} chunks of {chunk_size}")
            
            all_errors = []
            total_success = 0
            
            for chunk_idx in range(total_chunks):
                start_idx = chunk_idx * chunk_size
                end_idx = min(start_idx + chunk_size, len(df))
                chunk_df = df.iloc[start_idx:end_idx]
                
                # Process chunk
                chunk_result = self._process_csv_data(chunk_df, flow_template, project, tenant, user, auto_id_prefix, auto_id_start, task_name)
                
                # Collect errors from this chunk
                if chunk_result.get('errors'):
                    all_errors.extend(chunk_result['errors'])
                
                # Update job progress
                job.processed_rows = end_idx
                job.success_count += chunk_result['success_count']
                job.error_count += chunk_result['error_count']
                job.detailed_errors = all_errors
                job.save()
                
                # Small delay to prevent overwhelming the database
                import time
                time.sleep(0.1)
            
            # Mark job as completed
            job.status = 'completed'
            job.completed_at = timezone.now()
            job.save()
            
            logger.info(f"Bulk task creation job {job.id} completed successfully. {job.success_count} tasks created, {job.error_count} errors.")
            
        except Exception as e:
            logger.error(f"Error in async task creation job {job.id}: {str(e)}")
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
    
    def _process_csv_data(self, df, flow_template, project, tenant, user, auto_id_prefix, auto_id_start, task_name):
        """Process CSV data and create tasks with new Task ID generation logic"""
        success_count = 0
        error_count = 0
        errors = []
        
        # Convert auto_id_start to integer if provided
        try:
            auto_id_start_int = int(auto_id_start) if auto_id_start else 1
        except (ValueError, TypeError):
            auto_id_start_int = 1
            logger.warning(f"Invalid auto_id_start '{auto_id_start}', defaulting to 1")
        
        logger.info(f"🚨 TASK ID GENERATION DEBUG - Processing with:")
        logger.info(f"Auto-ID Prefix: '{auto_id_prefix}'")
        logger.info(f"Auto-ID Start: {auto_id_start_int}")
        logger.info(f"Task Name: '{task_name}'")
        
        for index, row in df.iterrows():
            try:
                # Extract data from row - Updated for new column structure
                csv_task_unique_id = row.get('Task Unique ID (Optional)', '')
                sites_data = {}
                
                logger.info(f"Processing row {index + 1}: csv_task_unique_id='{csv_task_unique_id}'")
                logger.info(f"Row data: {dict(row)}")
                
                # Check if this row has any meaningful data
                row_has_data = False
                logger.error(f"🔍 ROW DEBUG: Row {index + 1}: Checking for data...")
                logger.error(f"🔍 ROW DEBUG: Row {index + 1}: Available columns in row: {list(row.keys())}")
                logger.error(f"🔍 ROW DEBUG: Row {index + 1}: Flow template has {flow_template.sites.count()} sites")
                
                # Let's also check the raw values directly from the dataframe
                logger.error(f"🔍 ROW DEBUG: Row {index + 1}: Raw dataframe values:")
                for flow_site in flow_template.sites.all():
                    alias = flow_site.alias
                    site_id_col = f"{alias} Site ID"
                    global_id_col = f"{alias} Global ID"
                    
                    # Get values directly from dataframe
                    raw_site_id = df.iloc[index][site_id_col]
                    raw_global_id = df.iloc[index][global_id_col]
                    logger.error(f"🔍 ROW DEBUG: Row {index + 1}: Raw df values - {site_id_col}: {repr(raw_site_id)}, {global_id_col}: {repr(raw_global_id)}")
                    
                    # Get values from row object
                    site_id = row.get(site_id_col, '')
                    global_id = row.get(global_id_col, '')
                    
                    logger.error(f"🔍 ROW DEBUG: Row {index + 1}: alias='{alias}'")
                    logger.error(f"🔍 ROW DEBUG: Row {index + 1}: site_id_col='{site_id_col}' -> value='{site_id}' (type: {type(site_id)})")
                    logger.error(f"🔍 ROW DEBUG: Row {index + 1}: global_id_col='{global_id_col}' -> value='{global_id}' (type: {type(global_id)})")
                    logger.error(f"🔍 ROW DEBUG: Row {index + 1}: Raw row data: {dict(row)}")
                    
                    # Check if the column exists in the row
                    if site_id_col not in row:
                        logger.error(f"🔍 ROW DEBUG: Row {index + 1}: Column '{site_id_col}' NOT FOUND in row!")
                        logger.error(f"🔍 ROW DEBUG: Row {index + 1}: Available columns: {list(row.keys())}")
                        # Try to find similar columns
                        similar_cols = [col for col in row.keys() if 'site' in col.lower() and 'id' in col.lower()]
                        if similar_cols:
                            logger.error(f"🔍 ROW DEBUG: Row {index + 1}: Found similar columns: {similar_cols}")
                    
                    # Check if either site_id or global_id has valid data
                    logger.error(f"🔍 ROW DEBUG: Row {index + 1}: Checking data validity...")
                    logger.error(f"🔍 ROW DEBUG: Row {index + 1}: site_id='{site_id}' (type: {type(site_id)}, empty: {site_id == ''}, nan: {site_id == 'nan'})")
                    logger.error(f"🔍 ROW DEBUG: Row {index + 1}: global_id='{global_id}' (type: {type(global_id)}, empty: {global_id == ''}, nan: {global_id == 'nan'})")
                    
                    if (site_id and site_id != '' and site_id != 'nan') or (global_id and global_id != '' and global_id != 'nan'):
                        row_has_data = True
                        logger.error(f"🔍 ROW DEBUG: Row {index + 1}: Found valid data - site_id: '{site_id}', global_id: '{global_id}'")
                        break
                    else:
                        logger.error(f"🔍 ROW DEBUG: Row {index + 1}: No valid data found - both columns appear empty")
                
                if not row_has_data:
                    logger.warning(f"Row {index + 1}: Skipping completely empty row - no valid site IDs or global IDs found")
                    logger.warning(f"Row {index + 1}: All site columns were empty or invalid")
                    error_count += 1
                    errors.append({
                        'row': index + 1,
                        'error': 'Row is completely empty - no valid site IDs or global IDs found'
                    })
                    continue
                
                # Process each site alias
                for flow_site in flow_template.sites.all():
                    alias = flow_site.alias
                    site_id_col = f"{alias} Site ID"
                    global_id_col = f"{alias} Global ID"
                    site_name_col = f"{alias} Site Name"
                    
                    site_id = row.get(site_id_col, '')
                    global_id = row.get(global_id_col, '')
                    site_name = row.get(site_name_col, '')
                    
                    # Handle pandas NaN values
                    if pd.isna(site_id) or site_id == 'nan':
                        site_id = ''
                    if pd.isna(global_id) or global_id == 'nan':
                        global_id = ''
                    
                    logger.info(f"Site alias '{alias}': site_id='{site_id}', global_id='{global_id}', site_name='{site_name}'")
                    
                    # Log the CSV column names being processed
                    logger.info(f"CSV columns for alias '{alias}': {site_id_col}, {global_id_col}, {site_name_col}")
                    
                    # Use either site_id or global_id, prioritizing site_id if available
                    identifier = site_id if site_id else global_id
                    
                    logger.info(f"Row {index + 1}: Processing alias '{alias}' - site_id: '{site_id}', global_id: '{global_id}', using identifier: '{identifier}'")
                    
                    if identifier:
                        # Try to find project site by ID or global ID
                        project_site = None
                        
                        logger.info(f"Processing identifier: '{identifier}' for alias '{alias}' in project {project.id}")
                        
                        # First try by ProjectSite ID (if identifier is numeric)
                        try:
                            numeric_id = int(identifier)
                            logger.info(f"Trying to find ProjectSite by ID: {numeric_id}")
                            project_site = ProjectSite.objects.filter(
                                id=numeric_id,
                                project=project
                            ).first()
                            
                            if project_site:
                                logger.info(f"Found ProjectSite by ID: {project_site.id} -> Site: {project_site.site.global_id}")
                            else:
                                logger.info(f"No ProjectSite found with ID: {numeric_id} in project {project.id}")
                                
                        except ValueError:
                            # If not numeric, try by site business ID (site_id) first, then global_id
                            if site_id:  # Try business site_id first if available
                                logger.info(f"Trying to find ProjectSite by Site Business ID: {site_id}")
                                project_site = ProjectSite.objects.filter(
                                    project=project,
                                    site__site_id=site_id
                                ).first()
                                
                                if project_site:
                                    logger.info(f"Found ProjectSite by Site Business ID: {project_site.id} -> Site: {project_site.site.site_id}")
                                else:
                                    logger.info(f"No ProjectSite found with Site Business ID: {site_id} in project {project.id}")
                            
                            # If still not found and we have a global_id, try that
                            if not project_site and global_id:
                                logger.info(f"Trying to find ProjectSite by Global ID: {global_id}")
                                project_site = ProjectSite.objects.filter(
                                    project=project,
                                    site__global_id=global_id
                                ).first()
                                
                                if project_site:
                                    logger.info(f"Found ProjectSite by Global ID: {project_site.id} -> Site: {project_site.site.global_id}")
                                else:
                                    logger.info(f"No ProjectSite found with Global ID: {global_id} in project {project.id}")
                        
                        if project_site:
                            sites_data[alias] = project_site.id
                            logger.info(f"Row {index + 1}: Successfully found ProjectSite {project_site.id} for alias '{alias}' -> Site: {project_site.site.site_id} (Global: {project_site.site.global_id})")
                        else:
                            logger.warning(f"Row {index + 1}: No valid ProjectSite found for identifier: '{identifier}' in project {project.id}")
                            logger.warning(f"Row {index + 1}: Tried site_id: '{site_id}', global_id: '{global_id}'")
                    else:
                        logger.warning(f"Row {index + 1}: Both site_id and global_id are empty for alias '{alias}'")
                
                # Create site group
                if sites_data:
                    # Generate Task ID based on new logic
                    task_id = self._generate_task_id(
                        row_index=index,
                        csv_task_unique_id=csv_task_unique_id,
                        auto_id_prefix=auto_id_prefix,
                        auto_id_start=auto_id_start_int
                    )
                    
                    logger.info(f"Row {index + 1}: Generated Task ID: '{task_id}'")
                    logger.info(f"Row {index + 1}: CSV Task Unique ID: '{csv_task_unique_id}'")
                    logger.info(f"Row {index + 1}: Auto-ID Prefix: '{auto_id_prefix}'")
                    logger.info(f"Row {index + 1}: Auto-ID Start: {auto_id_start_int}")
                    
                    site_group = {
                        'sites': sites_data,
                        'task_name': task_name,  # Use task name from Step 1
                        'client_task_id': task_id  # Use generated task ID
                    }
                    
                    logger.info(f"Row {index + 1}: Creating task with sites_data: {sites_data}")
                    
                    # Create task using existing logic
                    task_config = {
                        'flow_template_id': str(flow_template.id),
                        'project_id': project.id,
                        'site_groups': [site_group],
                        'task_naming': {
                            'auto_id_prefix': auto_id_prefix,
                            'auto_id_start': auto_id_start_int
                        }
                    }
                    
                    # Create task using the existing task creation logic
                    try:
                        # Create task using the same logic as CreateTaskFromFlowView
                        task = self._create_task_from_site_group(
                            flow_template, project, site_group, task_config['task_naming'], tenant, user
                        )
                        
                        if task:
                            success_count += 1
                            logger.info(f"Row {index + 1}: Successfully created task {task.id} with task_id: {task.task_id}")
                            logger.info(f"Row {index + 1}: Task created with {len(task.sub_activities.all())} sub-activities")
                        else:
                            error_count += 1
                            errors.append({
                                'row': index + 1,
                                'error': 'Task creation returned None'
                            })
                            logger.error(f"Row {index + 1}: Task creation returned None")
                            
                    except Exception as task_error:
                        error_count += 1
                        errors.append({
                            'row': index + 1,
                            'error': f'Task creation failed: {str(task_error)}'
                        })
                        logger.error(f"Row {index + 1}: Error creating task: {str(task_error)}")
                else:
                    error_count += 1
                    errors.append({
                        'row': index + 1,
                        'error': 'No valid sites found for this row - all site IDs were empty, NaN, or invalid'
                    })
                    logger.warning(f"Row {index + 1}: No valid sites found - sites_data: {sites_data}")
                    
            except Exception as e:
                error_count += 1
                errors.append({
                    'row': index + 1,
                    'error': str(e)
                })
                logger.error(f"Error processing row {index + 1}: {str(e)}")
        
        logger.info(f"CSV processing completed: {success_count} successful, {error_count} errors out of {len(df)} total rows")
        logger.info(f"Final results - Success: {success_count}, Errors: {error_count}, Total: {len(df)}")
        
        if success_count > 0:
            logger.info(f"✅ Successfully created {success_count} tasks from CSV")
        
        if errors:
            error_summary = [f"Row {e.get('row', '?')}: {e.get('error', 'Unknown error')}" for e in errors[:5]]
            logger.info(f"❌ Error summary: {error_summary}")
            if len(errors) > 5:
                logger.info(f"❌ ... and {len(errors) - 5} more errors")
        
        return {
            'success_count': success_count,
            'error_count': error_count,
            'errors': errors
        }
    
    def _generate_task_id(self, row_index, csv_task_unique_id, auto_id_prefix, auto_id_start):
        """
        Generate task ID based on the 4 cases:
        Case 1: Auto-ID Prefix Given + Task Unique ID Blank -> PREFIX + (STARTING_NUMBER + row_index)
        Case 2: Auto-ID Prefix Given + Task Unique ID Provided -> Use CSV value
        Case 3: No Auto-ID Prefix + Task Unique ID Provided -> Use CSV value  
        Case 4: No Auto-ID Prefix + Task Unique ID Blank -> T_{bulk_uuid}_{row_number}
        """
        import uuid
        
        # Case 2 & 3: CSV Task Unique ID provided
        if csv_task_unique_id and csv_task_unique_id.strip():
            logger.info(f"Using CSV Task Unique ID: '{csv_task_unique_id}'")
            return csv_task_unique_id.strip()
        
        # Case 1: Auto-ID Prefix given
        if auto_id_prefix and auto_id_prefix.strip():
            start_num = auto_id_start if auto_id_start else 1
            generated_id = f"{auto_id_prefix}{start_num + row_index}"
            logger.info(f"Generated Auto-ID: '{generated_id}' (prefix: '{auto_id_prefix}', start: {start_num}, row: {row_index})")
            return generated_id
        
        # Case 4: Fallback - generate T_{bulk_uuid}_{row_number}
        bulk_uuid = uuid.uuid4().hex[:8]
        fallback_id = f"T_{bulk_uuid}_{row_index + 1}"
        logger.info(f"Generated Fallback ID: '{fallback_id}' (no prefix, no CSV ID)")
        return fallback_id
    
    def _create_task_from_site_group(self, flow_template, project, site_group, task_naming, tenant, user):
        """Create a single task from a site group"""
        # Generate task ID
        client_task_id = site_group.get('client_task_id')
        
        # Validate client ID if provided
        if client_task_id:
            from django.core.exceptions import ValidationError
            # For now, skip validation in bulk upload to avoid complexity
            pass
        
        # Generate task ID
        from .utils import TaskIDGenerator
        task_id = TaskIDGenerator.generate_task_id(
            flow_template=flow_template,
            project=project,
            client_id=client_task_id,
            prefix=task_naming.get('auto_id_prefix'),
            start_number=task_naming.get('auto_id_start'),
            tenant=tenant
        )
        
        # Create main task
        task = TaskFromFlow.objects.create(
            task_id=task_id,
            client_task_id=client_task_id,
            is_client_id_provided=bool(client_task_id),
            task_name=site_group.get('task_name') or f"{flow_template.name}Task",
            description=f"Task created from flow template: {flow_template.name}",
            flow_template=flow_template,
            project=project,
            tenant=tenant,
            created_by=user,
            status='pending',
            priority='medium'
        )
        
        # Create site group mappings
        for i, (alias, project_site_id) in enumerate(site_group['sites'].items()):
            # Get the project site object first, then extract the actual site
            try:
                project_site = ProjectSite.objects.get(id=project_site_id)
                actual_site = project_site.site
            except ProjectSite.DoesNotExist:
                raise ValidationError(f"Project site with ID {project_site_id} not found")
            except AttributeError:
                # Handle case where project_site.site might be None
                raise ValidationError(f"Project site {project_site_id} has no associated site")
            
            TaskSiteGroup.objects.create(
                task_from_flow=task,
                site=actual_site,
                site_alias=alias,
                assignment_order=i
            )
        
        # Create sub-activities for this task
        self._create_sub_activities_for_task(task, flow_template, site_group)
        
        return task
    
    def _create_sub_activities_for_task(self, task, flow_template, site_group):
        """Create sub-activities for a task based on flow template"""
        # Get all activities from the flow template
        template_activities = flow_template.activities.all().order_by('sequence_order')
        
        sub_task_counter = 0
        sub_task_map = {}  # Map template sequence to list of sub-task IDs for dependencies
        
        # First pass: Create all sub-tasks and build the mapping
        for template_activity in template_activities:
            # Check which sites this activity is assigned to
            for flow_activity_site in template_activity.assigned_sites.all():
                if flow_activity_site.flow_site.alias in site_group['sites']:
                    # Get the project site ID for this alias
                    project_site_id = site_group['sites'][flow_activity_site.flow_site.alias]
                    
                    # Get the actual site from the project site
                    try:
                        project_site = ProjectSite.objects.get(id=project_site_id)
                        actual_site = project_site.site
                    except ProjectSite.DoesNotExist:
                        raise ValidationError(f"Project site with ID {project_site_id} not found")
                    except AttributeError:
                        raise ValidationError(f"Project site {project_site_id} has no associated site")
                    
                    # Create sub-task for this site
                    sub_task = TaskSubActivity.objects.create(
                        task_from_flow=task,
                        flow_activity=template_activity,
                        sequence_order=sub_task_counter,
                        activity_type=template_activity.activity_type,
                        activity_name=template_activity.activity_name,
                        description=template_activity.description,
                        assigned_site=actual_site,  # Use the actual Site object, not ID
                        site_alias=flow_activity_site.flow_site.alias,
                        dependencies=[],  # Initialize empty, will be updated later
                        dependency_scope=template_activity.dependency_scope,
                        parallel_execution=template_activity.parallel_execution,
                        status='pending',
                        progress_percentage=0
                    )
                    
                    # Store mapping for dependency resolution
                    if template_activity.sequence_order not in sub_task_map:
                        sub_task_map[template_activity.sequence_order] = []
                    sub_task_map[template_activity.sequence_order].append(sub_task.id)
                    
                    sub_task_counter += 1
        
        # Second pass: Update dependencies based on flow template dependencies
        for template_activity in template_activities:
            if template_activity.dependencies:
                # Find sub-tasks for this activity
                current_sub_tasks = sub_task_map.get(template_activity.sequence_order, [])
                
                for dependency_sequence in template_activity.dependencies:
                    # Find sub-tasks for the dependency activity
                    dependency_sub_tasks = sub_task_map.get(dependency_sequence, [])
                    
                    # Update all current sub-tasks with dependencies
                    for sub_task_id in current_sub_tasks:
                        sub_task = TaskSubActivity.objects.get(id=sub_task_id)
                        sub_task.dependencies = dependency_sub_tasks
                        sub_task.save()


class BulkTaskCreationJobStatusView(APIView):
    """View to check status of bulk task creation jobs"""
    permission_classes = [IsAuthenticated, TaskPermission]
    
    def get(self, request, job_id):
        """Get job status by ID"""
        try:
            tenant = getattr(request, 'tenant', None)
            if not tenant:
                return Response(
                    {"success": False, "message": "Tenant not found"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                job = BulkTaskCreationJob.objects.get(id=job_id, tenant=tenant)
            except BulkTaskCreationJob.DoesNotExist:
                return Response(
                    {"success": False, "message": "Job not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = BulkTaskCreationJobSerializer(job)
            return Response({
                "success": True,
                "data": serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error getting job status: {str(e)}")
            return Response(
                {"success": False, "message": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 
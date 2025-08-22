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

from .models import Task, TaskSiteAssignment, TaskTeamAssignment, TaskComment, TaskTemplate
from .serializers import (
    TaskSerializer, TaskDetailSerializer, TaskCreateSerializer,
    TaskUpdateSerializer, TaskSiteAssignmentSerializer, TaskTeamAssignmentSerializer,
    TaskCommentSerializer, TaskTemplateSerializer, TaskStatsSerializer
)
from core.permissions.tenant_permissions import TenantScopedPermission, TaskPermission, EquipmentVerificationPermission
from core.pagination import StandardResultsSetPagination, LargeResultsSetPagination
from .models import FlowTemplate, FlowInstance
from .serializers import FlowTemplateCreateSerializer, FlowTemplateUpdateSerializer, FlowTemplateSerializer, FlowInstanceSerializer

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
        'created_at', 'due_date', 'scheduled_start', 'priority', 
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
        
        # Filter by overdue tasks
        overdue = self.request.query_params.get('overdue')
        if overdue == 'true':
            queryset = queryset.filter(
                due_date__lt=timezone.now(),
                status__in=['pending', 'assigned', 'in_progress']
            )
        
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
        overdue_tasks = tasks.filter(
            due_date__lt=timezone.now(),
            status__in=['pending', 'assigned', 'in_progress']
        ).count()
        
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
            'overdue_tasks': overdue_tasks,
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
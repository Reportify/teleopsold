from rest_framework import serializers
from django.utils import timezone
from django.db import models

from .models import Task, TaskSiteAssignment, TaskTeamAssignment, TaskComment, TaskTemplate
from apps.users.serializers import UserSerializer
from apps.sites.serializers import SiteSerializer
from apps.projects.serializers import ProjectSerializer

# Import models for default querysets
from apps.sites.models import Site
from apps.users.models import User


class TaskSiteAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for task site assignments"""
    site_name = serializers.CharField(source='site.site_name', read_only=True)
    site_global_id = serializers.CharField(source='site.global_id', read_only=True)
    
    class Meta:
        model = TaskSiteAssignment
        fields = [
            'id', 'site', 'site_name', 'site_global_id', 'assignment_order',
            'status', 'site_specific_instructions', 'estimated_hours', 'actual_hours',
            'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate site assignment data"""
        scheduled_start = data.get('scheduled_start')
        scheduled_end = data.get('scheduled_end')
        actual_start = data.get('actual_start')
        actual_end = data.get('actual_end')
        
        if scheduled_start and scheduled_end:
            if scheduled_start >= scheduled_end:
                raise serializers.ValidationError(
                    "Scheduled start must be before scheduled end"
                )
        
        if actual_start and actual_end:
            if actual_start >= actual_end:
                raise serializers.ValidationError(
                    "Actual start must be before actual end"
                )
        
        return data


class TaskTeamAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for task team assignments"""
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = TaskTeamAssignment
        fields = [
            'id', 'user', 'user_full_name', 'user_email', 'role', 'is_primary',
            'assigned_at', 'started_at', 'completed_at', 'estimated_hours',
            'actual_hours', 'notes', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate team assignment data"""
        assigned_at = data.get('assigned_at')
        started_at = data.get('started_at')
        completed_at = data.get('completed_at')
        
        if assigned_at and started_at:
            if assigned_at > started_at:
                raise serializers.ValidationError(
                    "Assignment date cannot be after start date"
                )
        
        if started_at and completed_at:
            if started_at >= completed_at:
                raise serializers.ValidationError(
                    "Start time must be before completion time"
                )
        
        return data


class TaskCommentSerializer(serializers.ModelSerializer):
    """Serializer for task comments"""
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = TaskComment
        fields = [
            'id', 'task', 'user', 'user_full_name', 'user_email', 'comment_type',
            'comment', 'is_internal', 'attachments', 'is_pinned', 'visibility_scope',
            'created_at', 'updated_at', 'edited_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'edited_at']
    
    def validate_comment(self, value):
        """Validate comment content"""
        if not value or not value.strip():
            raise serializers.ValidationError("Comment cannot be empty")
        return value.strip()


class TaskSerializer(serializers.ModelSerializer):
    """Basic serializer for task listing"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    primary_site_name = serializers.CharField(source='primary_site.site_name', read_only=True)
    primary_site_global_id = serializers.CharField(source='primary_site.global_id', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    # Computed fields
    sites_count = serializers.SerializerMethodField()
    team_members_count = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    days_until_due = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'task_id', 'title', 'description', 'status', 'priority', 'task_type',
            'project', 'project_name', 'primary_site', 'primary_site_name', 'primary_site_global_id',
            'assigned_to', 'assigned_to_name', 'supervisor', 'supervisor_name',
            'due_date', 'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
            'estimated_hours', 'actual_hours', 'progress_percentage',
            'equipment_verification_required', 'equipment_verification_status',
            'mobile_accessible', 'offline_capable', 'gps_required',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'sites_count', 'team_members_count', 'duration_hours', 'is_overdue', 'days_until_due'
        ]
    
    def get_sites_count(self, obj):
        """Get total number of sites for this task"""
        return obj.sites_count
    
    def get_team_members_count(self, obj):
        """Get number of active team members"""
        return obj.assigned_team.filter(taskteamassignment__is_active=True).count()
    
    def get_duration_hours(self, obj):
        """Get task duration in hours"""
        return obj.duration_hours
    
    def get_is_overdue(self, obj):
        """Check if task is overdue"""
        if not obj.due_date:
            return False
        return (obj.due_date < timezone.now() and 
                obj.status in ['pending', 'assigned', 'in_progress'])
    
    def get_days_until_due(self, obj):
        """Get days until due date (negative if overdue)"""
        if not obj.due_date:
            return None
        delta = obj.due_date.date() - timezone.now().date()
        return delta.days


class TaskDetailSerializer(TaskSerializer):
    """Detailed serializer for single task view"""
    project = ProjectSerializer(read_only=True)
    primary_site = SiteSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    supervisor = UserSerializer(read_only=True)
    equipment_verified_by = UserSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    
    # Related data
    additional_sites = SiteSerializer(many=True, read_only=True)
    site_assignments = TaskSiteAssignmentSerializer(
        source='tasksiteassignment_set', many=True, read_only=True
    )
    team_assignments = TaskTeamAssignmentSerializer(
        source='taskteamassignment_set', many=True, read_only=True
    )
    comments = TaskCommentSerializer(many=True, read_only=True)
    
    # Computed fields
    all_sites = serializers.SerializerMethodField()
    team_members = serializers.SerializerMethodField()
    recent_comments = serializers.SerializerMethodField()
    
    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + [
            'instructions', 'completion_notes', 'cancellation_reason',
            'safety_requirements', 'compliance_notes', 'quality_score',
            'estimated_cost', 'actual_cost', 'equipment_verified_at',
            'completed_at', 'additional_sites', 'site_assignments',
            'team_assignments', 'comments', 'all_sites', 'team_members',
            'recent_comments'
        ]
    
    def get_all_sites(self, obj):
        """Get all sites (primary + additional)"""
        return SiteSerializer(obj.all_sites, many=True).data
    
    def get_team_members(self, obj):
        """Get active team members with details"""
        active_assignments = obj.taskteamassignment_set.filter(is_active=True)
        return TaskTeamAssignmentSerializer(active_assignments, many=True).data
    
    def get_recent_comments(self, obj):
        """Get recent comments (last 5)"""
        recent = obj.comments.all()[:5]
        return TaskCommentSerializer(recent, many=True).data


class TaskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating tasks"""
    additional_sites = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Site.objects.none(), required=False, allow_empty=True
    )
    team_members = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.none(), required=False, allow_empty=True
    )
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'status', 'priority', 'task_type',
            'project', 'primary_site', 'additional_sites',
            'assigned_to', 'supervisor', 'team_members',
            'due_date', 'scheduled_start', 'scheduled_end',
            'estimated_hours', 'estimated_cost',
            'equipment_verification_required',
            'mobile_accessible', 'offline_capable', 'gps_required',
            'instructions', 'safety_requirements', 'compliance_notes'
        ]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'tenant'):
            # Limit queryset to tenant's sites and users
            tenant = request.tenant
            self.fields['additional_sites'].queryset = Site.objects.filter(tenant=tenant)
            self.fields['team_members'].queryset = User.objects.filter(
                models.Q(tenant_user_profile__tenant=tenant) |
                models.Q(tenant_user_profile__isnull=True)  # Allow superusers
            )
    
    def validate(self, data):
        """Validate task creation data"""
        # Date validations
        scheduled_start = data.get('scheduled_start')
        scheduled_end = data.get('scheduled_end')
        due_date = data.get('due_date')
        
        if scheduled_start and scheduled_end:
            if scheduled_start >= scheduled_end:
                raise serializers.ValidationError(
                    "Scheduled start must be before scheduled end"
                )
        
        if due_date and scheduled_end:
            if due_date < scheduled_end:
                raise serializers.ValidationError(
                    "Due date cannot be before scheduled end"
                )
        
        # Ensure primary site is not in additional sites
        primary_site = data.get('primary_site')
        additional_sites = data.get('additional_sites', [])
        
        if primary_site and primary_site in additional_sites:
            raise serializers.ValidationError(
                "Primary site cannot be included in additional sites"
            )
        
        return data
    
    def create(self, validated_data):
        """Create task with related data"""
        additional_sites = validated_data.pop('additional_sites', [])
        team_members = validated_data.pop('team_members', [])
        
        # Create the task
        task = Task.objects.create(**validated_data)
        
        # Add additional sites
        for i, site in enumerate(additional_sites):
            TaskSiteAssignment.objects.create(
                task=task,
                site=site,
                assignment_order=i + 1,
                status='assigned'
            )
        
        # Add team members
        for user in team_members:
            TaskTeamAssignment.objects.create(
                task=task,
                user=user,
                role='team_member',
                is_active=True,
                assigned_at=timezone.now()
            )
        
        return task


class TaskUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating tasks"""
    
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'status', 'priority', 'task_type',
            'assigned_to', 'supervisor', 'due_date', 'scheduled_start', 'scheduled_end',
            'estimated_hours', 'actual_hours', 'progress_percentage',
            'estimated_cost', 'actual_cost', 'equipment_verification_required',
            'mobile_accessible', 'offline_capable', 'gps_required',
            'instructions', 'completion_notes', 'safety_requirements',
            'compliance_notes', 'quality_score'
        ]
    
    def validate(self, data):
        """Validate task update data"""
        # Progress validation
        progress = data.get('progress_percentage')
        if progress is not None:
            if not (0 <= progress <= 100):
                raise serializers.ValidationError(
                    "Progress percentage must be between 0 and 100"
                )
        
        # Quality score validation
        quality_score = data.get('quality_score')
        if quality_score is not None:
            if not (0 <= quality_score <= 10):
                raise serializers.ValidationError(
                    "Quality score must be between 0 and 10"
                )
        
        # Date validations
        scheduled_start = data.get('scheduled_start')
        scheduled_end = data.get('scheduled_end')
        
        if scheduled_start and scheduled_end:
            if scheduled_start >= scheduled_end:
                raise serializers.ValidationError(
                    "Scheduled start must be before scheduled end"
                )
        
        return data


class TaskTemplateSerializer(serializers.ModelSerializer):
    """Serializer for task templates"""
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    class Meta:
        model = TaskTemplate
        fields = [
            'id', 'name', 'description', 'task_type', 'default_priority',
            'default_estimated_hours', 'default_estimated_cost',
            'default_equipment_verification_required', 'default_mobile_accessible',
            'default_offline_capable', 'default_gps_required',
            'checklist_template', 'default_instructions', 'default_safety_requirements',
            'default_compliance_notes', 'is_active', 'usage_count',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        """Validate template name uniqueness within tenant"""
        request = self.context.get('request')
        if request and hasattr(request, 'tenant'):
            tenant = request.tenant
            qs = TaskTemplate.objects.filter(tenant=tenant, name=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    "Template with this name already exists"
                )
        return value


class TaskStatsSerializer(serializers.Serializer):
    """Serializer for task statistics"""
    total_tasks = serializers.IntegerField()
    pending_tasks = serializers.IntegerField()
    assigned_tasks = serializers.IntegerField()
    in_progress_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    cancelled_tasks = serializers.IntegerField()
    overdue_tasks = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    
    equipment_verification = serializers.DictField()
    task_types = serializers.ListField()
    priority_breakdown = serializers.ListField()
    recent_tasks = TaskSerializer(many=True)


class TaskBulkUpdateSerializer(serializers.Serializer):
    """Serializer for bulk task status updates"""
    task_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100
    )
    status = serializers.ChoiceField(choices=Task.TASK_STATUS)
    
    def validate_task_ids(self, value):
        """Validate task IDs belong to the current tenant"""
        request = self.context.get('request')
        if request and hasattr(request, 'tenant'):
            tenant = request.tenant
            existing_tasks = Task.objects.filter(
                id__in=value, tenant=tenant
            ).values_list('id', flat=True)
            
            if len(existing_tasks) != len(value):
                raise serializers.ValidationError(
                    "Some task IDs are invalid or don't belong to your tenant"
                )
        
        return value


class TaskSearchSerializer(serializers.Serializer):
    """Serializer for advanced task search"""
    search = serializers.CharField(required=False, allow_blank=True)
    status = serializers.MultipleChoiceField(
        choices=Task.TASK_STATUS, required=False
    )
    priority = serializers.MultipleChoiceField(
        choices=Task.TASK_PRIORITY, required=False
    )
    task_type = serializers.MultipleChoiceField(
        choices=Task.TASK_TYPE, required=False
    )
    project_id = serializers.UUIDField(required=False)
    site_id = serializers.UUIDField(required=False)
    assigned_to = serializers.UUIDField(required=False)
    supervisor = serializers.UUIDField(required=False)
    created_by = serializers.UUIDField(required=False)
    
    # Date range filters
    due_date_from = serializers.DateField(required=False)
    due_date_to = serializers.DateField(required=False)
    created_from = serializers.DateTimeField(required=False)
    created_to = serializers.DateTimeField(required=False)
    
    # Progress filters
    progress_min = serializers.IntegerField(min_value=0, max_value=100, required=False)
    progress_max = serializers.IntegerField(min_value=0, max_value=100, required=False)
    
    # Boolean filters
    overdue_only = serializers.BooleanField(required=False)
    equipment_verification_required = serializers.BooleanField(required=False)
    mobile_accessible = serializers.BooleanField(required=False)
    
    def validate(self, data):
        """Validate search parameters"""
        # Date range validations
        due_date_from = data.get('due_date_from')
        due_date_to = data.get('due_date_to')
        
        if due_date_from and due_date_to:
            if due_date_from > due_date_to:
                raise serializers.ValidationError(
                    "Due date 'from' must be before 'to'"
                )
        
        created_from = data.get('created_from')
        created_to = data.get('created_to')
        
        if created_from and created_to:
            if created_from >= created_to:
                raise serializers.ValidationError(
                    "Created 'from' must be before 'to'"
                )
        
        # Progress range validation
        progress_min = data.get('progress_min')
        progress_max = data.get('progress_max')
        
        if progress_min is not None and progress_max is not None:
            if progress_min > progress_max:
                raise serializers.ValidationError(
                    "Progress minimum must be less than or equal to maximum"
                )
        
        return data 
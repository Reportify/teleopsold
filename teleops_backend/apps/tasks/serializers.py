from rest_framework import serializers
from django.utils import timezone
from django.db import models

from .models import TaskSiteAssignment, TaskTeamAssignment, TaskComment, TaskTemplate, TASK_STATUS, TASK_PRIORITY, TASK_TYPE
from apps.users.serializers import UserSerializer
from apps.sites.serializers import SiteSerializer
from apps.projects.serializers import ProjectSerializer

# Import models for default querysets
from apps.sites.models import Site
from apps.users.models import User
from .models import FlowSite, FlowActivity, FlowTemplate, FlowInstance, FlowActivitySite, TaskFromFlow, TaskSiteGroup, TaskSubActivity
from apps.tasks.models import BulkTaskCreationJob
from .allocation_models import SubActivityAllocation as TaskSubActivityAllocation, TaskAllocation, AllocationHistory as TaskAllocationHistory
from apps.tasks.models import TaskTimeline


class TaskTimelineSerializer(serializers.ModelSerializer):
    """Serializer for TaskTimeline model"""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    event_description = serializers.CharField(read_only=True)
    
    class Meta:
        model = TaskTimeline
        fields = [
            'id', 'task_from_flow', 'event_type', 'event_data', 'timestamp', 
            'user', 'user_name', 'event_description'
        ]
        read_only_fields = ['id', 'timestamp']


class TaskSubActivityAllocationSerializer(serializers.ModelSerializer):
    """Serializer for TaskSubActivityAllocation model"""
    
    sub_activity_name = serializers.CharField(source='sub_activity.activity_name', read_only=True)
    sub_activity_type = serializers.CharField(source='sub_activity.activity_type', read_only=True)
    site_name = serializers.CharField(source='sub_activity.assigned_site.site_name', read_only=True)
    site_business_id = serializers.CharField(source='sub_activity.assigned_site.site_id', read_only=True)
    site_global_id = serializers.CharField(source='sub_activity.assigned_site.global_id', read_only=True)
    site_alias = serializers.CharField(source='sub_activity.site_alias', read_only=True)
    
    def to_representation(self, instance):
        """Override to include site information in metadata"""
        data = super().to_representation(instance)
        
        # Ensure metadata includes site information
        if not data.get('metadata'):
            data['metadata'] = {}
        
        # Add site information to metadata
        if instance.sub_activity and instance.sub_activity.assigned_site:
            data['metadata']['site_name'] = instance.sub_activity.assigned_site.site_name
            data['metadata']['site_business_id'] = instance.sub_activity.assigned_site.site_id
            data['metadata']['site_global_id'] = instance.sub_activity.assigned_site.global_id
            data['metadata']['site_id'] = str(instance.sub_activity.assigned_site.id)
        
        return data
    
    class Meta:
        model = TaskSubActivityAllocation
        fields = [
            'id', 'allocation', 'sub_activity', 'sub_activity_name', 'sub_activity_type',
            'site_name', 'site_business_id', 'site_global_id', 'site_alias', 'status', 'progress_percentage', 
            'estimated_duration_hours', 'actual_duration_hours', 'started_at', 'completed_at', 
            'notes', 'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'site_name', 'site_business_id', 'site_global_id', 'site_alias']


class TaskAllocationSerializer(serializers.ModelSerializer):
    """Serializer for TaskAllocation model"""
    
    # Related field data
    task_id = serializers.CharField(source='task.task_id', read_only=True)
    task_name = serializers.CharField(source='task.task_name', read_only=True)
    project_name = serializers.CharField(source='task.project.name', read_only=True)
    
    # Vendor information
    vendor_name = serializers.CharField(source='vendor_relationship.vendor_tenant.organization_name', read_only=True)
    vendor_code = serializers.CharField(source='vendor_relationship.vendor_code', read_only=True)
    vendor_contact_person = serializers.CharField(source='vendor_relationship.contact_person_name', read_only=True)
    
    # Team information
    team_name = serializers.CharField(source='internal_team.name', read_only=True)
    team_type = serializers.CharField(source='internal_team.team_type', read_only=True)
    
    # User information
    allocated_by_name = serializers.CharField(source='allocated_by.get_full_name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    
    # Sub-activity allocations
    sub_activity_allocations = TaskSubActivityAllocationSerializer(many=True, read_only=True)
    
    # Computed fields
    allocated_to_name = serializers.CharField(read_only=True)
    total_sub_activities = serializers.SerializerMethodField()
    completed_sub_activities = serializers.SerializerMethodField()
    site_groups = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskAllocation
        fields = [
            'id', 'task', 'task_id', 'task_name', 'project_name',
            'allocation_type', 'status', 'vendor_relationship', 'internal_team',
            'vendor_name', 'vendor_code', 'vendor_contact_person',
            'team_name', 'team_type',
            'sub_activity_allocations',
            'allocated_at', 'started_at', 'completed_at',
            'allocated_by', 'allocated_by_name', 'updated_by', 'updated_by_name',
            'allocated_to_name', 'total_sub_activities', 'completed_sub_activities',
            'site_groups', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'allocated_at', 'created_at', 'updated_at']
    
    def get_total_sub_activities(self, obj):
        """Get total number of allocated sub-activities"""
        return obj.sub_activity_allocations.count()
    
    def get_completed_sub_activities(self, obj):
        """Get number of completed sub-activities"""
        return obj.sub_activity_allocations.filter(status='completed').count()
    
    def get_site_groups(self, obj):
        """Get site groups from the related task"""
        if not obj.task:
            return []
        
        site_groups = obj.task.site_groups.all()
        return [
            {
                'id': site_group.id,
                'site': site_group.site.id if site_group.site else None,
                'site_alias': site_group.site_alias,
                'assignment_order': site_group.assignment_order,
                'site_name': site_group.site.site_name if site_group.site else None,
                'site_global_id': site_group.site.global_id if site_group.site else None,
                'site_business_id': site_group.site.site_id if site_group.site else None,
            }
            for site_group in site_groups
        ]
    
    def validate(self, data):
        """Validate allocation data"""
        allocation_type = data.get('allocation_type')
        vendor_relationship = data.get('vendor_relationship')
        internal_team = data.get('internal_team')
        
        if allocation_type == 'vendor' and not vendor_relationship:
            raise serializers.ValidationError("Vendor relationship is required for vendor allocation")
        
        if allocation_type == 'internal_team' and not internal_team:
            raise serializers.ValidationError("Internal team is required for internal team allocation")
        
        if vendor_relationship and internal_team:
            raise serializers.ValidationError("Cannot have both vendor relationship and internal team")
        
        return data


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
            'id', 'task_from_flow', 'user', 'user_full_name', 'user_email', 'comment_type',
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
    """Basic task serializer for list views"""
    
    # Basic fields
    id = serializers.UUIDField(read_only=True)
    task_id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    task_type = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    priority = serializers.CharField(read_only=True)
    progress_percentage = serializers.DecimalField(read_only=True, max_digits=5, decimal_places=2)
    
    # Related fields
    primary_site_name = serializers.CharField(source='primary_site.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True)
    
    # Site groups for displaying site information
    site_groups = serializers.SerializerMethodField()
    
    # Timeline events (recent ones)
    recent_timeline_events = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskFromFlow
        fields = [
            'id', 'task_id', 'task_name', 'task_type', 'status', 'priority',
            'progress_percentage', 'project_name',
            'assigned_to_name', 'supervisor_name', 'scheduled_start',
            'scheduled_end', 'created_at', 'site_groups', 'recent_timeline_events'
        ]
    
    def get_site_groups(self, obj):
        """Get site groups for the task"""
        site_groups = obj.site_groups.all()
        return [
            {
                'id': sg.id,
                'site': sg.site.id if sg.site else None,
                'site_alias': sg.site_alias,
                'assignment_order': sg.assignment_order,
                'site_name': sg.site.site_name if sg.site else None,
                'site_global_id': sg.site.global_id if sg.site else None,
                'site_business_id': sg.site.site_id if sg.site else None,
            }
            for sg in site_groups
        ]
    
    def get_recent_timeline_events(self, obj):
        """Get recent timeline events for the task"""
        recent_events = obj.timeline_events.all().order_by('-timestamp')[:5]
        return TaskTimelineSerializer(recent_events, many=True).data



class TaskDetailSerializer(serializers.ModelSerializer):
    """Detailed task serializer with all related data"""
    
    # Basic fields
    id = serializers.UUIDField(read_only=True)
    task_id = serializers.CharField(read_only=True)
    title = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    task_type = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    priority = serializers.CharField(read_only=True)
    progress_percentage = serializers.DecimalField(read_only=True, max_digits=5, decimal_places=2)
    
    # Related fields
    primary_site_name = serializers.CharField(source='primary_site.name', read_only=True)
    primary_site_global_id = serializers.CharField(source='primary_site.global_id', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    # Timeline and allocation data
    timeline_events = TaskTimelineSerializer(many=True, read_only=True)
    allocations = TaskAllocationSerializer(many=True, read_only=True)
    
    # Computed fields
    sites_count = serializers.SerializerMethodField()
    team_members_count = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    days_until_due = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskFromFlow
        fields = [
            'id', 'task_id', 'task_name', 'description', 'status', 'priority',
            'project', 'project_name',
            'assigned_to', 'assigned_to_name', 'supervisor', 'supervisor_name',
            'scheduled_start', 'scheduled_end',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'timeline_events', 'allocations'
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
        if obj.scheduled_end and obj.status not in ['completed', 'cancelled']:
            return timezone.now() > obj.scheduled_end
        return False
    
    def get_days_until_due(self, obj):
        """Get days until task is due"""
        if obj.scheduled_end and obj.status not in ['completed', 'cancelled']:
            delta = obj.scheduled_end - timezone.now()
            return delta.days
        return None


class TaskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating tasks"""
    additional_sites = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Site.objects.none(), required=False, allow_empty=True
    )
    team_members = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.none(), required=False, allow_empty=True
    )
    
    class Meta:
        model = TaskFromFlow
        fields = [
            'task_name', 'description', 'status', 'priority',
            'project', 'assigned_to', 'supervisor',
            'scheduled_start', 'scheduled_end'
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
        
        if scheduled_start and scheduled_end:
            if scheduled_start >= scheduled_end:
                raise serializers.ValidationError(
                    "Scheduled start must be before scheduled end"
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
        task = TaskFromFlow.objects.create(**validated_data)
        
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
        model = TaskFromFlow
        fields = [
            'task_name', 'description', 'status', 'priority',
            'assigned_to', 'supervisor', 'scheduled_start', 'scheduled_end'
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
    status = serializers.ChoiceField(choices=TASK_STATUS)
    
    def validate_task_ids(self, value):
        """Validate task IDs belong to the current tenant"""
        request = self.context.get('request')
        if request and hasattr(request, 'tenant'):
            tenant = request.tenant
            existing_tasks = TaskFromFlow.objects.filter(
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
        choices=TASK_STATUS, required=False
    )
    priority = serializers.MultipleChoiceField(
        choices=TASK_PRIORITY, required=False
    )
    task_type = serializers.MultipleChoiceField(
        choices=TASK_TYPE, required=False
    )
    project_id = serializers.UUIDField(required=False)
    site_id = serializers.UUIDField(required=False)
    assigned_to = serializers.UUIDField(required=False)
    supervisor = serializers.UUIDField(required=False)
    created_by = serializers.UUIDField(required=False)
    
    # Date range filters
    created_from = serializers.DateTimeField(required=False)
    created_to = serializers.DateTimeField(required=False)
    
    # Progress filters
    progress_min = serializers.IntegerField(min_value=0, max_value=100, required=False)
    progress_max = serializers.IntegerField(min_value=0, max_value=100, required=False)
    
    # Boolean filters
    equipment_verification_required = serializers.BooleanField(required=False)
    mobile_accessible = serializers.BooleanField(required=False)
    
    def validate(self, data):
        """Validate search parameters"""
        # Date range validations
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


class FlowSiteSerializer(serializers.ModelSerializer):
    """Serializer for FlowSite model"""
    site_name = serializers.CharField(source='site.site_name', read_only=True, allow_null=True)
    site_global_id = serializers.CharField(source='site.global_id', read_only=True, allow_null=True)
    
    class Meta:
        model = FlowSite
        fields = [
            'id', 'site', 'site_name', 'site_global_id', 'alias', 'order', 
            'is_required', 'role'
        ]


class FlowActivitySiteSerializer(serializers.ModelSerializer):
    """Serializer for FlowActivitySite model"""
    flow_site = FlowSiteSerializer(read_only=True)
    
    class Meta:
        model = FlowActivitySite
        fields = ['id', 'flow_site', 'is_required', 'execution_order']


class FlowActivitySerializer(serializers.ModelSerializer):
    """Serializer for FlowActivity model"""
    assigned_sites = serializers.SerializerMethodField()
    description = serializers.CharField(required=False, allow_blank=True, default="")
    
    class Meta:
        model = FlowActivity
        fields = [
            'id', 'activity_name', 'description', 'activity_type', 
            'sequence_order', 'dependencies', 'requires_site', 'requires_equipment',
            'site_scope', 'parallel_execution', 'dependency_scope', 'site_coordination',
            'assigned_sites'
        ]
    
    def get_assigned_sites(self, obj):
        """Get assigned sites for this activity"""
        if hasattr(obj, 'assigned_sites'):
            return FlowActivitySiteSerializer(obj.assigned_sites.all(), many=True).data
        return []


class FlowTemplateSerializer(serializers.ModelSerializer):
    """Serializer for FlowTemplate model"""
    activities = FlowActivitySerializer(many=True, read_only=True)
    sites = FlowSiteSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    
    class Meta:
        model = FlowTemplate
        fields = [
            'id', 'name', 'description', 'category', 'tags', 'is_active', 'is_public',
            'usage_count', 'created_by', 'created_by_name', 'tenant_name',
            'created_at', 'updated_at', 'activities', 'sites'
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']


class FlowTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating FlowTemplate with activities and sites"""
    activities = serializers.ListField(child=serializers.DictField())
    sites = FlowSiteSerializer(many=True, required=False)
    
    class Meta:
        model = FlowTemplate
        fields = [
            'name', 'description', 'category', 'tags', 'is_active', 'is_public',
            'activities', 'sites'
        ]
    
    def create(self, validated_data):
        print(f"🔍 DEBUG: FlowTemplateCreateSerializer.create() called with {len(validated_data)} fields")
        
        activities_data = validated_data.pop('activities', [])
        sites_data = validated_data.pop('sites', [])
        
        print(f"🔍 DEBUG: Found {len(activities_data)} activities and {len(sites_data)} sites")
        
        # Get the current user and tenant from the request
        user = self.context['request'].user
        tenant = getattr(self.context['request'], 'tenant', None)
        if not tenant:
            raise serializers.ValidationError("Tenant context required")
        
        print(f"🔍 DEBUG: Creating flow template for tenant: {tenant}")
        
        # Use transaction to ensure atomicity
        from django.db import transaction
        
        with transaction.atomic():
            # Create the flow template
            flow_template = FlowTemplate.objects.create(
                **validated_data,
                tenant=tenant,
                created_by=user
            )
            
            print(f"🔍 DEBUG: Created flow template with ID: {flow_template.id}")
            
            # Collect all unique site aliases from activities
            all_site_aliases = set()
            for activity_data in activities_data:
                assigned_sites = activity_data.get('assigned_sites', [])
                all_site_aliases.update(assigned_sites)
            
            # Create sites automatically if none provided
            created_sites = {}
            if sites_data:
                # Use provided sites data
                for i, site_data in enumerate(sites_data):
                    print(f"🔍 DEBUG: Creating site {i+1}/{len(sites_data)}: {site_data.get('alias', 'Unknown')}")
                    site = FlowSite.objects.create(
                        flow_template=flow_template,
                        **site_data
                    )
                    created_sites[site_data.get('alias', f'site_{i}')] = site
                    print(f"🔍 DEBUG: Created site with ID: {site.id}")
            else:
                # Create sites automatically from activity assignments
                for i, site_alias in enumerate(all_site_aliases):
                    if site_alias:  # Skip empty aliases
                        print(f"🔍 DEBUG: Auto-creating site: {site_alias}")
                        site = FlowSite.objects.create(
                            flow_template=flow_template,
                            alias=site_alias,
                            order=i,
                            is_required=True,
                            role='PRIMARY'
                        )
                        created_sites[site_alias] = site
                        print(f"🔍 DEBUG: Created site with ID: {site.id}")
            
            # Create activities with duplicate check
            for i, activity_data in enumerate(activities_data):
                sequence_order = activity_data.get('sequence_order')
                print(f"🔍 DEBUG: Creating activity {i+1}/{len(activities_data)}: {activity_data.get('activity_name', 'Unknown')} with sequence_order: {sequence_order}")
                
                # Check if activity with this sequence_order already exists
                if FlowActivity.objects.filter(flow_template=flow_template, sequence_order=sequence_order).exists():
                    print(f"⚠️ WARNING: Activity with sequence_order {sequence_order} already exists for this flow template!")
                    continue
                
                # Extract site assignments from the activity data
                assigned_sites = activity_data.pop('assigned_sites', [])
                
                # Ensure description field is present (provide default if missing)
                if 'description' not in activity_data:
                    activity_data['description'] = ""
                
                activity = FlowActivity.objects.create(
                    flow_template=flow_template,
                    **activity_data
                )
                print(f"🔍 DEBUG: Created activity with ID: {activity.id}")
                
                # Create site assignments for this activity
                for site_alias in assigned_sites:
                    if site_alias in created_sites:
                        FlowActivitySite.objects.create(
                            flow_activity=activity,
                            flow_site=created_sites[site_alias],
                            execution_order=len(activity.assigned_sites.all())
                        )
                        print(f"🔍 DEBUG: Assigned activity {activity.id} to site {site_alias}")
                    else:
                        print(f"⚠️ WARNING: Site alias '{site_alias}' not found in created sites: {list(created_sites.keys())}")
        
        print(f"🔍 DEBUG: FlowTemplateCreateSerializer.create() completed successfully")
        
        # Return the created flow template with all related data loaded
        # This prevents RelatedManager iteration errors during serialization
        flow_template.refresh_from_db()
        return flow_template


class FlowTemplateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating FlowTemplate with activities and sites"""
    activities = FlowActivitySerializer(many=True)
    sites = FlowSiteSerializer(many=True, required=False)
    
    class Meta:
        model = FlowTemplate
        fields = [
            'name', 'description', 'category', 'tags', 'is_active', 'is_public',
            'activities', 'sites'
        ]
    
    def update(self, instance, validated_data):
        activities_data = validated_data.pop('activities', [])
        sites_data = validated_data.pop('sites', [])
        
        # Update the flow template
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update activities - delete existing and create new ones
        instance.activities.all().delete()
        
        # Create sites first so we can reference them in activities
        created_sites = {}
        
        if sites_data:
            # First, delete ALL existing sites since we're replacing them
            instance.sites.all().delete()
            
            # Create new sites from the provided data
            for i, site_data in enumerate(sites_data):
                site = FlowSite.objects.create(
                    flow_template=instance,
                    **site_data
                )
                created_sites[site_data.get('alias', f'site_{i}')] = site
        else:
            # Preserve existing sites if no new data provided
            existing_sites = instance.sites.all()
            if existing_sites.exists():
                for site in existing_sites:
                    created_sites[site.alias] = site
            else:
                # No existing sites, create them from activity assignments
                all_site_aliases = set()
                for activity_data in activities_data:
                    assigned_sites = activity_data.get('assigned_sites', [])
                    if assigned_sites:  # Only add non-empty site aliases
                        all_site_aliases.update(assigned_sites)
                
                # If no site aliases found in activities, create a default site
                if not all_site_aliases:
                    # Check if a default site already exists
                    if "Site" not in created_sites:
                        site = FlowSite.objects.create(
                            flow_template=instance,
                            alias="Site",
                            order=0,
                            is_required=True,
                            role='PRIMARY'
                        )
                        created_sites["Site"] = site
                else:
                    # Create sites automatically from activity assignments
                    for i, site_alias in enumerate(all_site_aliases):
                        if site_alias:  # Skip empty aliases
                            # Check if site with this alias already exists
                            if site_alias not in created_sites:
                                site = FlowSite.objects.create(
                                    flow_template=instance,
                                    alias=site_alias,
                                    order=i,
                                    is_required=True,
                                    role='PRIMARY'
                                )
                                created_sites[site_alias] = site
        
        # Clean up any existing FlowActivitySite objects since we're recreating everything
        from apps.tasks.models import FlowActivitySite
        FlowActivitySite.objects.filter(flow_site__flow_template=instance).delete()
        
        # Create activities with site assignments
        for activity_data in activities_data:
            # Extract site assignments from the activity data
            assigned_sites = activity_data.pop('assigned_sites', [])
            
            # Ensure description field is present (provide default if missing)
            if 'description' not in activity_data:
                activity_data['description'] = ""
            
            activity = FlowActivity.objects.create(
                flow_template=instance,
                **activity_data
            )
            
            # Create site assignments for this activity
            if assigned_sites and len(assigned_sites) > 0:
                for i, site_alias in enumerate(assigned_sites):
                    if site_alias in created_sites:
                        FlowActivitySite.objects.create(
                            flow_activity=activity,
                            flow_site=created_sites[site_alias],
                            execution_order=i
                        )
                    else:
                        # If site alias not found, skip this assignment
                        continue
            else:
                # If no specific site assignments, assign to all sites (default behavior)
                for i, (site_alias, site) in enumerate(created_sites.items()):
                    FlowActivitySite.objects.create(
                        flow_activity=activity,
                        flow_site=site,
                        execution_order=i
                    )
        
        return instance


class FlowInstanceSerializer(serializers.ModelSerializer):
    """Serializer for FlowInstance model"""
    flow_template_name = serializers.CharField(source='flow_template.name', read_only=True)
    task_title = serializers.CharField(source='task_from_flow.task_name', read_only=True)
    
    class Meta:
        model = FlowInstance
        fields = [
            'id', 'flow_template', 'flow_template_name', 'task_from_flow', 'task_title',
            'status', 'current_activity_index', 'completed_activities', 'failed_activities',
            'started_at', 'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================================================
# Task Creation from Flow Template Serializers
# ============================================================================

class TaskSiteGroupSerializer(serializers.ModelSerializer):
    """Serializer for TaskSiteGroup model"""
    site_name = serializers.CharField(source='site.site_name', read_only=True)
    site_global_id = serializers.CharField(source='site.global_id', read_only=True)
    site_business_id = serializers.CharField(source='site.site_id', read_only=True)
    
    class Meta:
        model = TaskSiteGroup
        fields = [
            'id', 'site', 'site_alias', 'assignment_order',
            'site_name', 'site_global_id', 'site_business_id'
        ]
        read_only_fields = ['id']


class TaskSubActivitySerializer(serializers.ModelSerializer):
    """Serializer for TaskSubActivity model"""
    site_name = serializers.CharField(source='assigned_site.site_name', read_only=True)
    site_global_id = serializers.CharField(source='assigned_site.global_id', read_only=True)
    site_business_id = serializers.CharField(source='assigned_site.site_id', read_only=True)
    
    class Meta:
        model = TaskSubActivity
        fields = [
            'id', 'sequence_order', 'activity_type', 'activity_name', 'description',
            'assigned_site', 'site_alias', 'dependencies', 'dependency_scope',
            'parallel_execution', 'status', 'actual_start', 'actual_end',
            'progress_percentage', 'notes', 'created_at', 'updated_at',
            'site_name', 'site_global_id', 'site_business_id'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskFromFlowSerializer(serializers.ModelSerializer):
    """Serializer for TaskFromFlow model"""
    flow_template_name = serializers.CharField(source='flow_template.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True)
    
    # Related data
    site_groups = TaskSiteGroupSerializer(many=True, read_only=True)
    sub_activities = TaskSubActivitySerializer(many=True, read_only=True)
    
    class Meta:
        model = TaskFromFlow
        fields = [
            'id', 'task_id', 'client_task_id', 'is_client_id_provided',
            'task_name', 'description', 'flow_template', 'flow_template_name',
            'project', 'project_name', 'status', 'priority',
            'scheduled_start', 'scheduled_end', 'created_by', 'created_by_name',
            'assigned_to', 'assigned_to_name', 'supervisor', 'supervisor_name',
            'created_at', 'updated_at', 'site_groups', 'sub_activities'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskCreationRequestSerializer(serializers.Serializer):
    """Serializer for task creation request validation"""
    flow_template_id = serializers.UUIDField()
    project_id = serializers.IntegerField()  # Changed from UUIDField to IntegerField to match Project model (Phase 1 uses integer IDs)
    site_groups = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    task_naming = serializers.DictField(required=False)
    
    def validate_site_groups(self, value):
        """Validate site groups structure"""
        for i, group in enumerate(value):
            if 'sites' not in group:
                raise serializers.ValidationError(
                    f"Site group {i+1} missing 'sites' field"
                )
            
            sites = group['sites']
            if not isinstance(sites, dict) or not sites:
                raise serializers.ValidationError(
                    f"Site group {i+1} 'sites' must be a non-empty dictionary"
                )
            
            # Validate each site mapping
            for alias, site_id in sites.items():
                if not alias or not str(alias).strip():
                    raise serializers.ValidationError(
                        f"Site group {i+1} has invalid alias: {alias}"
                    )
                if not site_id or not str(site_id).strip():
                    raise serializers.ValidationError(
                        f"Site group {i+1}, alias '{alias}' has invalid site ID: {site_id}"
                    )
        
        return value
    
    def validate_task_naming(self, value):
        """Validate task naming configuration"""
        if not value:
            return value
        
        valid_conventions = ['AUTO', 'CLIENT_ID', 'HYBRID']
        convention = value.get('convention', 'AUTO')
        
        if convention not in valid_conventions:
            raise serializers.ValidationError(
                f"Invalid naming convention. Must be one of: {valid_conventions}"
            )
        
        return value


class TaskCreationResponseSerializer(serializers.Serializer):
    """Serializer for task creation response"""
    tasks = TaskFromFlowSerializer(many=True)
    flow_instance = serializers.DictField()  # Will be enhanced later
    message = serializers.CharField(default="Tasks created successfully")
    created_count = serializers.IntegerField()
    total_sites = serializers.IntegerField() 


class BulkTaskCreationJobSerializer(serializers.ModelSerializer):
    """Serializer for BulkTaskCreationJob model"""
    progress_percentage = serializers.ReadOnlyField()
    duration = serializers.ReadOnlyField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    flow_template_name = serializers.CharField(source='flow_template.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = BulkTaskCreationJob
        fields = [
            'id', 'tenant', 'created_by', 'created_by_name', 'flow_template', 'flow_template_name',
            'project', 'project_name', 'file_name', 'total_rows', 'processed_rows', 'success_count',
            'error_count', 'status', 'error_message', 'detailed_errors', 'started_at', 'completed_at',
            'created_at', 'updated_at', 'progress_percentage', 'duration'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'progress_percentage', 'duration'] 

class TaskAllocationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new task allocations"""
    
    sub_activity_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        help_text="List of sub-activity IDs to allocate"
    )
    
    class Meta:
        model = TaskAllocation
        fields = [
            'task', 'allocation_type', 'vendor_relationship', 'internal_team',
            'sub_activity_ids'
        ]
    
    def validate(self, data):
        """Validate allocation data"""
        task = data.get('task')
        allocation_type = data.get('allocation_type')
        vendor_relationship = data.get('vendor_relationship')
        internal_team = data.get('internal_team')
        sub_activity_ids = data.get('sub_activity_ids', [])
        
        # Validate allocation type and related fields
        if allocation_type == 'vendor' and not vendor_relationship:
            raise serializers.ValidationError("Vendor relationship is required for vendor allocation")
        
        if allocation_type == 'internal_team' and not internal_team:
            raise serializers.ValidationError("Internal team is required for internal team allocation")
        
        if vendor_relationship and internal_team:
            raise serializers.ValidationError("Cannot have both vendor relationship and internal team")
        
        # Validate sub-activities belong to the task
        if task and sub_activity_ids:
            task_sub_activities = set(str(sa.id) for sa in task.sub_activities.all())
            provided_sub_activities = set(str(sa_id) for sa_id in sub_activity_ids)
            
            if not provided_sub_activities.issubset(task_sub_activities):
                invalid_ids = provided_sub_activities - task_sub_activities
                raise serializers.ValidationError(f"Sub-activities {invalid_ids} do not belong to the specified task")
        
        return data
    
    def create(self, validated_data):
        """Create task allocation with sub-activity allocations"""
        sub_activity_ids = validated_data.pop('sub_activity_ids', [])
        
        # Set the user who is creating the allocation
        validated_data['allocated_by'] = self.context['request'].user
        validated_data['updated_by'] = self.context['request'].user
        
        # Create the main allocation
        allocation = TaskAllocation.objects.create(**validated_data)
        
        # Create sub-activity allocations
        for sub_activity_id in sub_activity_ids:
            TaskSubActivityAllocation.objects.create(
                allocation=allocation,
                sub_activity_id=sub_activity_id
            )
        
        # UPDATE TASK STATUS BASED ON ALLOCATION TYPE
        task = allocation.task
        if allocation.allocation_type == 'vendor':
            task.status = 'allocated'  # Change to 'allocated'
        elif allocation.allocation_type == 'internal_team':
            task.status = 'assigned'   # Change to 'assigned'
        
        task.save()
        
        # Create timeline event for task status change
        TaskTimeline.objects.create(
            task_from_flow=task,
            event_type='allocated' if allocation.allocation_type == 'vendor' else 'assigned',
            event_data={
                'allocation_id': str(allocation.id),
                'allocation_type': allocation.allocation_type,
                'allocated_to': allocation.allocated_to_name,
                'sub_activities_count': len(sub_activity_ids),
                'previous_status': 'pending',  # Assuming task was pending before
                'new_status': task.status
            },
            user=self.context['request'].user
        )
        
        # Create history record
        TaskAllocationHistory.objects.create(
            allocation=allocation,
            action='created',
            changed_by=self.context['request'].user,
            change_reason='Task allocation created'
        )
        
        return allocation


class TaskAllocationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating task allocations"""
    
    class Meta:
        model = TaskAllocation
        fields = [
            'status', 'actual_duration_hours', 'started_at', 'completed_at'
        ]
    
    def update(self, instance, validated_data):
        """Update allocation and track changes"""
        old_status = instance.status
        new_status = validated_data.get('status', old_status)
        
        # Update the instance
        updated_instance = super().update(instance, validated_data)
        
        # Track who made the update
        updated_instance.updated_by = self.context['request'].user
        updated_instance.save()
        
        # Create history record if status changed
        if old_status != new_status:
            TaskAllocationHistory.objects.create(
                allocation=updated_instance,
                action='status_changed',
                previous_status=old_status,
                new_status=new_status,
                changed_by=self.context['request'].user,
                change_reason=f'Status changed from {old_status} to {new_status}'
            )
        else:
            TaskAllocationHistory.objects.create(
                allocation=updated_instance,
                action='updated',
                changed_by=self.context['request'].user,
                change_reason='Allocation details updated'
            )
        
        return updated_instance


class TaskAllocationHistorySerializer(serializers.ModelSerializer):
    """Serializer for TaskAllocationHistory model"""
    
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)
    
    class Meta:
        model = TaskAllocationHistory
        fields = [
            'id', 'allocation', 'action', 'previous_status', 'new_status',
            'changed_by', 'changed_by_name', 'change_reason', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
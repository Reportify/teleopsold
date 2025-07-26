from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import models

from .models import Project, ProjectTeamMember
from apps.users.serializers import UserSerializer

User = get_user_model()


class ProjectSerializer(serializers.ModelSerializer):
    """Basic project serializer for list views"""
    project_manager_name = serializers.CharField(source='project_manager.full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    team_members_count = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'project_type', 'status', 
            'start_date', 'end_date', 'budget', 'location', 'scope',
            'project_manager', 'project_manager_name', 'created_by_name',
            'team_members_count', 'progress_percentage', 'days_remaining',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_team_members_count(self, obj):
        """Get count of active team members"""
        return obj.team_members.filter(projectteammember__is_active=True).count()
    
    def get_progress_percentage(self, obj):
        """Calculate project progress based on tasks completion"""
        # TODO: Implement when tasks are linked to projects
        if obj.status == 'completed':
            return 100
        elif obj.status == 'active':
            return 50  # Placeholder
        return 0
    
    def get_days_remaining(self, obj):
        """Calculate days remaining until end date"""
        if not obj.end_date:
            return None
        
        from django.utils import timezone
        today = timezone.now().date()
        
        if obj.end_date < today:
            return 0  # Overdue
        
        delta = obj.end_date - today
        return delta.days


class ProjectDetailSerializer(ProjectSerializer):
    """Detailed project serializer for individual project views"""
    project_manager_details = UserSerializer(source='project_manager', read_only=True)
    created_by_details = UserSerializer(source='created_by', read_only=True)
    team_members_details = serializers.SerializerMethodField()
    tasks_summary = serializers.SerializerMethodField()
    sites_summary = serializers.SerializerMethodField()
    
    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + [
            'project_manager_details', 'created_by_details', 
            'team_members_details', 'tasks_summary', 'sites_summary'
        ]
    
    def get_team_members_details(self, obj):
        """Get detailed team member information"""
        team_members = ProjectTeamMember.objects.filter(
            project=obj, 
            is_active=True
        ).select_related('user')
        
        return ProjectTeamMemberSerializer(team_members, many=True).data
    
    def get_tasks_summary(self, obj):
        """Get task summary for the project"""
        # TODO: Implement when tasks model is connected
        return {
            'total_tasks': 0,
            'completed_tasks': 0,
            'in_progress_tasks': 0,
            'pending_tasks': 0
        }
    
    def get_sites_summary(self, obj):
        """Get sites summary for the project"""
        # TODO: Implement when project-site relationship is established
        return {
            'total_sites': 0,
            'active_sites': 0,
            'sites_list': []
        }


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new projects"""
    team_members = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="List of team members with user_id and role"
    )
    
    class Meta:
        model = Project
        fields = [
            'name', 'description', 'project_type', 'status',
            'start_date', 'end_date', 'budget', 'location', 'scope',
            'project_manager', 'team_members'
        ]
    
    def validate_name(self, value):
        """Validate project name uniqueness within tenant"""
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        
        if tenant:
            if Project.objects.filter(tenant=tenant, name=value).exists():
                raise serializers.ValidationError(
                    "A project with this name already exists in your organization."
                )
        
        return value
    
    def validate(self, data):
        """Validate project data"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                "Start date cannot be after end date."
            )
        
        budget = data.get('budget')
        if budget is not None and budget < 0:
            raise serializers.ValidationError(
                "Budget cannot be negative."
            )
        
        return data
    
    def create(self, validated_data):
        """Create project with team members"""
        team_members_data = validated_data.pop('team_members', [])
        
        project = Project.objects.create(**validated_data)
        
        # Add team members
        for member_data in team_members_data:
            user_id = member_data.get('user_id')
            role = member_data.get('role', 'engineer')
            
            try:
                user = User.objects.get(id=user_id)
                ProjectTeamMember.objects.create(
                    project=project,
                    user=user,
                    role=role
                )
            except User.DoesNotExist:
                continue  # Skip invalid users
        
        return project


class ProjectUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating projects"""
    
    class Meta:
        model = Project
        fields = [
            'name', 'description', 'project_type', 'status',
            'start_date', 'end_date', 'budget', 'location', 'scope',
            'project_manager'
        ]
    
    def validate_name(self, value):
        """Validate project name uniqueness within tenant (excluding current)"""
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        
        if tenant and self.instance:
            existing = Project.objects.filter(
                tenant=tenant, 
                name=value
            ).exclude(id=self.instance.id)
            
            if existing.exists():
                raise serializers.ValidationError(
                    "A project with this name already exists in your organization."
                )
        
        return value
    
    def validate(self, data):
        """Validate project update data"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                "Start date cannot be after end date."
            )
        
        budget = data.get('budget')
        if budget is not None and budget < 0:
            raise serializers.ValidationError(
                "Budget cannot be negative."
            )
        
        return data


class ProjectTeamMemberSerializer(serializers.ModelSerializer):
    """Serializer for project team members"""
    user_details = UserSerializer(source='user', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    
    class Meta:
        model = ProjectTeamMember
        fields = [
            'id', 'project', 'user', 'role', 'assigned_date', 'is_active',
            'user_details', 'user_name', 'user_email', 'project_name'
        ]
        read_only_fields = ['id', 'assigned_date']
    
    def validate(self, data):
        """Validate team member assignment"""
        project = data.get('project')
        user = data.get('user')
        
        if project and user:
            # Check if user is already a team member
            existing = ProjectTeamMember.objects.filter(
                project=project,
                user=user,
                is_active=True
            )
            
            if self.instance:
                existing = existing.exclude(id=self.instance.id)
            
            if existing.exists():
                raise serializers.ValidationError(
                    "This user is already a team member of this project."
                )
        
        return data


class ProjectStatsSerializer(serializers.Serializer):
    """Serializer for project statistics"""
    total_projects = serializers.IntegerField()
    active_projects = serializers.IntegerField()
    completed_projects = serializers.IntegerField()
    planning_projects = serializers.IntegerField()
    on_hold_projects = serializers.IntegerField()
    cancelled_projects = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    project_types = serializers.ListField(child=serializers.DictField())
    recent_projects = ProjectSerializer(many=True)
    
    class Meta:
        fields = [
            'total_projects', 'active_projects', 'completed_projects',
            'planning_projects', 'on_hold_projects', 'cancelled_projects',
            'completion_rate', 'project_types', 'recent_projects'
        ]


class ProjectBulkUpdateSerializer(serializers.Serializer):
    """Serializer for bulk project updates"""
    project_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text="List of project IDs to update"
    )
    status = serializers.ChoiceField(
        choices=Project.PROJECT_STATUS,
        help_text="New status for all selected projects"
    )
    
    def validate_project_ids(self, value):
        """Validate that all project IDs exist and belong to the tenant"""
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        
        if tenant:
            existing_ids = Project.objects.filter(
                id__in=value,
                tenant=tenant
            ).values_list('id', flat=True)
            
            invalid_ids = set(value) - set(existing_ids)
            if invalid_ids:
                raise serializers.ValidationError(
                    f"Invalid project IDs: {list(invalid_ids)}"
                )
        
        return value


class ProjectSearchSerializer(serializers.Serializer):
    """Serializer for project search parameters"""
    search = serializers.CharField(required=False)
    status = serializers.MultipleChoiceField(
        choices=Project.PROJECT_STATUS,
        required=False
    )
    project_type = serializers.MultipleChoiceField(
        choices=Project.PROJECT_TYPE,
        required=False
    )
    project_manager_id = serializers.IntegerField(required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    budget_min = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False
    )
    budget_max = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False
    )
    
    def validate(self, data):
        """Validate search parameters"""
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError(
                "Date from cannot be after date to."
            )
        
        budget_min = data.get('budget_min')
        budget_max = data.get('budget_max')
        
        if budget_min and budget_max and budget_min > budget_max:
            raise serializers.ValidationError(
                "Minimum budget cannot be greater than maximum budget."
            )
        
        return data


class ProjectDuplicateSerializer(serializers.Serializer):
    """Serializer for project duplication"""
    name = serializers.CharField(
        max_length=255,
        help_text="Name for the duplicated project"
    )
    include_team_members = serializers.BooleanField(
        default=True,
        help_text="Whether to copy team members to the new project"
    )
    
    def validate_name(self, value):
        """Validate new project name"""
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None) if request else None
        
        if tenant:
            if Project.objects.filter(tenant=tenant, name=value).exists():
                raise serializers.ValidationError(
                    "A project with this name already exists in your organization."
                )
        
        return value 
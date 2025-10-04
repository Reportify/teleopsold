from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Team, TeamMember

User = get_user_model()


class TeamMemberSerializer(serializers.ModelSerializer):
    """Serializer for team member details"""
    user_id = serializers.IntegerField(write_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = TeamMember
        fields = [
            'id', 'user_id', 'user_full_name', 'user_email', 
            'role', 'role_display', 'joined_at'
        ]
        read_only_fields = ['id', 'joined_at']

    def validate_user_id(self, value):
        """Validate that the user exists and belongs to the same tenant"""
        try:
            user = User.objects.get(id=value)
            # Get tenant from context (will be set by the view)
            tenant = self.context.get('tenant')
            if tenant and hasattr(user, 'profile') and user.profile.tenant != tenant:
                raise serializers.ValidationError("User does not belong to this tenant.")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User does not exist.")

    def create(self, validated_data):
        """Create team member with user_id"""
        user_id = validated_data.pop('user_id')
        user = User.objects.get(id=user_id)
        validated_data['user'] = user
        return super().create(validated_data)


class TeamSerializer(serializers.ModelSerializer):
    """Serializer for team management"""
    members = TeamMemberSerializer(source='teammember_set', many=True, read_only=True)
    member_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    # Fields for team creation with initial members
    team_leader_id = serializers.IntegerField(write_only=True, required=False)
    team_member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )

    class Meta:
        model = Team
        fields = [
            'id', 'name', 'description', 'members', 
            'member_count', 'created_by', 'created_by_name', 
            'created_at', 'updated_at', 'team_leader_id', 'team_member_ids'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        """Get the number of active members in the team"""
        return obj.teammember_set.count()

    def validate_team_leader_id(self, value):
        """Validate that the team leader exists and belongs to the same tenant"""
        if value is None:
            return value
            
        try:
            user = User.objects.get(id=value)
            tenant = self.context.get('tenant')
            if tenant and hasattr(user, 'profile') and user.profile.tenant != tenant:
                raise serializers.ValidationError("Team leader does not belong to this tenant.")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Team leader does not exist.")

    def validate_team_member_ids(self, value):
        """Validate that all team members exist and belong to the same tenant"""
        if not value:
            return value
            
        tenant = self.context.get('tenant')
        
        # Check for duplicates
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate user IDs found in team members.")
        
        # Validate each user
        for user_id in value:
            try:
                user = User.objects.get(id=user_id)
                if tenant and hasattr(user, 'profile') and user.profile.tenant != tenant:
                    raise serializers.ValidationError(f"User {user_id} does not belong to this tenant.")
            except User.DoesNotExist:
                raise serializers.ValidationError(f"User {user_id} does not exist.")
        
        return value

    def validate(self, data):
        """Cross-field validation"""
        team_leader_id = data.get('team_leader_id')
        team_member_ids = data.get('team_member_ids', [])
        
        # Ensure team leader is not also in team members list
        if team_leader_id and team_leader_id in team_member_ids:
            raise serializers.ValidationError(
                "Team leader cannot be included in the team members list."
            )
        
        return data

    def validate_name(self, value):
        """Validate team name uniqueness within tenant"""
        tenant = self.context.get('tenant')
        if tenant:
            # Check if team name already exists for this tenant
            existing_team = Team.objects.filter(
                tenant=tenant, 
                name=value
            ).exclude(id=self.instance.id if self.instance else None)
            
            if existing_team.exists():
                raise serializers.ValidationError(
                    "A team with this name already exists in your organization."
                )
        return value

    def create(self, validated_data):
        """Create team with tenant and created_by from context, and assign initial members"""
        tenant = self.context.get('tenant')
        user = self.context.get('user')
        
        if not tenant:
            raise serializers.ValidationError("Tenant context is required.")
        if not user:
            raise serializers.ValidationError("User context is required.")
        
        # Extract team member data before creating the team
        team_leader_id = validated_data.pop('team_leader_id', None)
        team_member_ids = validated_data.pop('team_member_ids', [])
            
        validated_data['tenant'] = tenant
        validated_data['created_by'] = user
        
        # Create the team
        team = super().create(validated_data)
        
        # Add team leader if provided
        if team_leader_id:
            TeamMember.objects.create(
                team=team,
                user_id=team_leader_id,
                role='leader'
            )
        
        # Add team members if provided
        for member_id in team_member_ids:
            TeamMember.objects.create(
                team=team,
                user_id=member_id,
                role='member'
            )
        
        return team

    def update(self, instance, validated_data):
        """Update team and handle team leader and member changes"""
        from django.db import transaction
        
        # Extract team member data before updating the team
        team_leader_id = validated_data.pop('team_leader_id', None)
        team_member_ids = validated_data.pop('team_member_ids', None)
        
        # Update basic team fields
        instance = super().update(instance, validated_data)
        
        # Handle team membership changes if provided
        if team_leader_id is not None or team_member_ids is not None:
            with transaction.atomic():
                # Clear existing memberships
                TeamMember.objects.filter(team=instance).delete()
                
                # Add new team leader if provided
                if team_leader_id:
                    TeamMember.objects.create(
                        team=instance,
                        user_id=team_leader_id,
                        role='leader'
                    )
                
                # Add new team members if provided
                if team_member_ids:
                    for member_id in team_member_ids:
                        TeamMember.objects.create(
                            team=instance,
                            user_id=member_id,
                            role='member'
                        )
        
        return instance


class TeamMemberManagementSerializer(serializers.Serializer):
    """Serializer for adding/removing team members"""
    user_id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=TeamMember.ROLE_CHOICES, default='member')

    def validate_user_id(self, value):
        """Validate that the user exists and belongs to the same tenant"""
        try:
            user = User.objects.get(id=value)
            tenant = self.context.get('tenant')
            if tenant and hasattr(user, 'profile') and user.profile.tenant != tenant:
                raise serializers.ValidationError("User does not belong to this tenant.")
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("User does not exist.")


class TeamStatsSerializer(serializers.Serializer):
    """Serializer for team statistics"""
    total_teams = serializers.IntegerField()
    total_members = serializers.IntegerField()
    teams_by_role = serializers.DictField()
    recent_teams = serializers.ListField()
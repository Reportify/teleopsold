from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import Team, TeamMember
from .serializers import (
    TeamSerializer, 
    TeamMemberSerializer, 
    TeamMemberManagementSerializer,
    TeamStatsSerializer
)
from core.permissions.base import TenantBasedPermission

User = get_user_model()


class TeamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing teams within a tenant
    Provides CRUD operations and team member management
    """
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticated, TenantBasedPermission]
    
    def get_queryset(self):
        """Filter teams by current user's tenant"""
        tenant = None
        if hasattr(self.request.user, 'tenant_user_profile') and self.request.user.tenant_user_profile:
            tenant = self.request.user.tenant_user_profile.tenant
        elif hasattr(self.request, 'tenant'):
            tenant = self.request.tenant
        
        if tenant:
            return Team.objects.filter(
                tenant=tenant
            ).prefetch_related('teammember_set__user').order_by('-created_at')
        return Team.objects.none()

    def get_serializer_context(self):
        """Add tenant and user to serializer context"""
        context = super().get_serializer_context()
        if hasattr(self.request.user, 'tenant_user_profile') and self.request.user.tenant_user_profile:
            context['tenant'] = self.request.user.tenant_user_profile.tenant
        elif hasattr(self.request, 'tenant'):
            context['tenant'] = self.request.tenant
        context['user'] = self.request.user
        return context

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """Get all members of a specific team"""
        team = self.get_object()
        members = TeamMember.objects.filter(team=team).select_related('user')
        serializer = TeamMemberSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Add a member to the team"""
        team = self.get_object()
        serializer = TeamMemberManagementSerializer(
            data=request.data,
            context=self.get_serializer_context()
        )
        
        if serializer.is_valid():
            user_id = serializer.validated_data['user_id']
            role = serializer.validated_data['role']
            
            # Check if user is already a member
            if TeamMember.objects.filter(team=team, user_id=user_id).exists():
                return Response(
                    {'error': 'User is already a member of this team'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create team membership
            team_member = TeamMember.objects.create(
                team=team,
                user_id=user_id,
                role=role
            )
            
            member_serializer = TeamMemberSerializer(team_member)
            return Response(member_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'])
    def remove_member(self, request, pk=None):
        """Remove a member from the team"""
        team = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            team_member = TeamMember.objects.get(team=team, user_id=user_id)
            team_member.delete()
            return Response(
                {'message': 'Member removed successfully'},
                status=status.HTTP_200_OK
            )
        except TeamMember.DoesNotExist:
            return Response(
                {'error': 'User is not a member of this team'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['patch'])
    def update_member_role(self, request, pk=None):
        """Update a team member's role"""
        team = self.get_object()
        user_id = request.data.get('user_id')
        new_role = request.data.get('role')
        
        if not user_id or not new_role:
            return Response(
                {'error': 'user_id and role are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_role not in dict(TeamMember.ROLE_CHOICES):
            return Response(
                {'error': 'Invalid role'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            team_member = TeamMember.objects.get(team=team, user_id=user_id)
            team_member.role = new_role
            team_member.save()
            
            member_serializer = TeamMemberSerializer(team_member)
            return Response(member_serializer.data)
        except TeamMember.DoesNotExist:
            return Response(
                {'error': 'User is not a member of this team'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get team statistics for the tenant"""
        tenant = request.user.profile.tenant if hasattr(request.user, 'profile') else None
        if not tenant:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get basic stats
        teams = Team.objects.filter(tenant=tenant)
        total_teams = teams.count()
        total_members = TeamMember.objects.filter(team__tenant=tenant).count()
        
        # Get teams by role distribution
        teams_by_role = TeamMember.objects.filter(
            team__tenant=tenant
        ).values('role').annotate(count=Count('id'))
        
        role_distribution = {item['role']: item['count'] for item in teams_by_role}
        
        # Get recent teams (last 30 days)
        recent_date = timezone.now() - timedelta(days=30)
        recent_teams = teams.filter(created_at__gte=recent_date).values(
            'id', 'name', 'created_at'
        )[:5]
        
        stats_data = {
            'total_teams': total_teams,
            'total_members': total_members,
            'teams_by_role': role_distribution,
            'recent_teams': list(recent_teams)
        }
        
        serializer = TeamStatsSerializer(stats_data)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_add_members(self, request):
        """Add multiple members to multiple teams"""
        team_id = request.data.get('team_id')
        members_data = request.data.get('members', [])
        
        if not team_id:
            return Response(
                {'error': 'team_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            team = self.get_queryset().get(id=team_id)
        except Team.DoesNotExist:
            return Response(
                {'error': 'Team not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        created_members = []
        errors = []
        
        with transaction.atomic():
            for member_data in members_data:
                serializer = TeamMemberManagementSerializer(
                    data=member_data,
                    context=self.get_serializer_context()
                )
                
                if serializer.is_valid():
                    user_id = serializer.validated_data['user_id']
                    role = serializer.validated_data['role']
                    
                    # Check if user is already a member
                    if not TeamMember.objects.filter(team=team, user_id=user_id).exists():
                        team_member = TeamMember.objects.create(
                            team=team,
                            user_id=user_id,
                            role=role
                        )
                        created_members.append(TeamMemberSerializer(team_member).data)
                    else:
                        errors.append({
                            'user_id': user_id,
                            'error': 'User is already a member of this team'
                        })
                else:
                    errors.append({
                        'data': member_data,
                        'errors': serializer.errors
                    })
        
        return Response({
            'created_members': created_members,
            'errors': errors
        }, status=status.HTTP_201_CREATED if created_members else status.HTTP_400_BAD_REQUEST)


class TeamMemberViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing team members
    Read-only operations for team member details
    """
    serializer_class = TeamMemberSerializer
    permission_classes = [permissions.IsAuthenticated, TenantBasedPermission]
    
    def get_queryset(self):
        """Filter team members by current user's tenant"""
        if hasattr(self.request.user, 'profile') and self.request.user.profile.tenant:
            return TeamMember.objects.filter(
                team__tenant=self.request.user.profile.tenant
            ).select_related('user', 'team').order_by('-joined_at')
        return TeamMember.objects.none()

    def get_serializer_context(self):
        """Add tenant to serializer context"""
        context = super().get_serializer_context()
        if hasattr(self.request.user, 'profile'):
            context['tenant'] = self.request.user.profile.tenant
        return context
#!/usr/bin/env python
"""
Script to test team creation directly using Django
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import TenantUserProfile
from apps.teams.models import Team
from apps.teams.serializers import TeamSerializer

User = get_user_model()

def test_team_creation():
    try:
        # Get user with ID 8
        user = User.objects.get(id=8)
        print(f'User: {user.email}')

        # Get user's tenant profile
        profile = TenantUserProfile.objects.get(user=user, is_active=True)
        print(f'Tenant: {profile.tenant.organization_name}')
        
        # Test team creation data
        team_data = {
            'name': 'Development Team',
            'description': 'Main development team for the project'
        }
        
        # Create team directly
        team = Team.objects.create(
            name=team_data['name'],
            description=team_data['description'],
            tenant=profile.tenant,
            created_by=user
        )
        
        print(f'SUCCESS: Team created with ID {team.id}')
        print(f'Team Name: {team.name}')
        print(f'Description: {team.description}')
        print(f'Tenant: {team.tenant.organization_name}')
        print(f'Created by: {team.created_by.email}')
        
        # Test serializer
        serializer = TeamSerializer(team)
        print(f'Serialized data: {serializer.data}')
        
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_team_creation()
#!/usr/bin/env python3
"""
Test script to verify team creation endpoint works with corrected permissions
"""

import os
import sys
import django
import json

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from apps.teams.models import Team

User = get_user_model()

def test_team_creation():
    """Test team creation endpoint with admin user permissions"""
    
    try:
        # Get admin user
        admin_user = User.objects.get(email='admin@teleops.com')
        print(f"🔍 Testing team creation for user: {admin_user.email}")
        print(f"📋 User tenant: {admin_user.tenant_user_profile.tenant.organization_name}")
        print()
        
        # Create test client and login
        client = Client()
        client.force_login(admin_user)
        
        # Test data for team creation
        team_data = {
            'team_name': 'Test Engineering Team',
            'description': 'Test team for engineering tasks',
            'department': 'Engineering',
            'team_type': 'functional',
            'is_active': True
        }
        
        print("📝 Creating team with data:")
        for key, value in team_data.items():
            print(f"  {key}: {value}")
        print()
        
        # Get the team creation URL
        url = '/api/v1/teams/'
        print(f"🌐 POST URL: {url}")
        
        # Make the request
        response = client.post(
            url,
            data=json.dumps(team_data),
            content_type='application/json'
        )
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📄 Response Headers: {dict(response.items())}")
        
        if response.content:
            try:
                response_data = response.json()
                print(f"📋 Response Data:")
                print(json.dumps(response_data, indent=2))
            except json.JSONDecodeError:
                print(f"📋 Response Content (raw): {response.content.decode()}")
        
        # Check if team was created
        if response.status_code == 201:
            print("✅ Team creation successful!")
            
            # Verify team exists in database
            try:
                team = Team.objects.get(team_name='Test Engineering Team')
                print(f"✅ Team found in database:")
                print(f"  ID: {team.id}")
                print(f"  Name: {team.team_name}")
                print(f"  Tenant: {team.tenant.organization_name}")
                print(f"  Created by: {team.created_by.email if team.created_by else 'Unknown'}")
                
                # Clean up - delete the test team
                team.delete()
                print("🧹 Test team cleaned up")
                
            except Team.DoesNotExist:
                print("❌ Team not found in database despite successful response")
                
        elif response.status_code == 403:
            print("❌ Permission denied - user doesn't have team creation permissions")
        elif response.status_code == 400:
            print("❌ Bad request - check the data format")
        else:
            print(f"❌ Unexpected response status: {response.status_code}")
        
        print()
        
        # Test team listing endpoint
        print("📋 Testing team listing endpoint:")
        list_response = client.get('/api/v1/teams/')
        print(f"📊 List Response Status: {list_response.status_code}")
        
        if list_response.status_code == 200:
            try:
                list_data = list_response.json()
                print(f"📋 Teams found: {len(list_data.get('results', []))}")
                for team in list_data.get('results', [])[:3]:  # Show first 3 teams
                    print(f"  - {team.get('team_name')}")
            except json.JSONDecodeError:
                print(f"📋 List Response Content (raw): {list_response.content.decode()}")
        else:
            print(f"❌ Team listing failed with status: {list_response.status_code}")
        
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_team_creation()
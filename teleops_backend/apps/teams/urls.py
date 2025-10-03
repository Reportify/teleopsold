from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeamViewSet, TeamMemberViewSet

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'', TeamViewSet, basename='team')  # Empty string to make teams accessible at /teams/
router.register(r'members', TeamMemberViewSet, basename='teammember')

# The API URLs are now determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]

# Available endpoints:
# GET /api/v1/teams/ - List all teams
# POST /api/v1/teams/ - Create a new team
# GET /api/v1/teams/{id}/ - Retrieve a specific team
# PUT /api/v1/teams/{id}/ - Update a specific team
# PATCH /api/v1/teams/{id}/ - Partially update a specific team
# DELETE /api/v1/teams/{id}/ - Delete a specific team
# GET /api/v1/teams/{id}/members/ - Get all members of a team
# POST /api/v1/teams/{id}/add_member/ - Add a member to a team
# DELETE /api/v1/teams/{id}/remove_member/ - Remove a member from a team
# PATCH /api/v1/teams/{id}/update_member_role/ - Update a team member's role
# GET /api/v1/teams/stats/ - Get team statistics
# POST /api/v1/teams/bulk_add_members/ - Add multiple members to a team
# GET /api/v1/teams/members/ - List all team members
# GET /api/v1/teams/members/{id}/ - Retrieve a specific team member
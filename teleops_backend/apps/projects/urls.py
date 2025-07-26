from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, ProjectTeamMemberViewSet

# Create router for ViewSets
router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'team-members', ProjectTeamMemberViewSet, basename='projectteammember')

# Define URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Additional custom endpoints can be added here
    # Example: path('projects/export/', ExportProjectsView.as_view(), name='export-projects'),
]

# Named URL patterns for easy reverse lookups
app_name = 'projects' 
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet

# Create router for ViewSets
router = DefaultRouter()
# Register at root so list is available at /api/v1/projects/
router.register(r'', ProjectViewSet, basename='project')

# Define URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Additional custom endpoints can be added here
    # Example: path('projects/export/', ExportProjectsView.as_view(), name='export-projects'),
]

# Named URL patterns for easy reverse lookups
app_name = 'projects' 
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, VendorInvitationPublicViewSet

# Create router for ViewSets
router = DefaultRouter()
# Register at root so list is available at /api/v1/projects/
# Register at root so list is available at /api/v1/projects/
router.register(r'', ProjectViewSet, basename='project')

# Define URL patterns
urlpatterns = [
    path('', include(router.urls)),
    path('invitations/<str:token>/', VendorInvitationPublicViewSet.as_view({'get': 'preview'}), name='vendor-invite-preview'),
    path('invitations/<str:token>/accept/', VendorInvitationPublicViewSet.as_view({'post': 'accept'}), name='vendor-invite-accept'),
    path('invitations/<str:token>/decline/', VendorInvitationPublicViewSet.as_view({'post': 'decline'}), name='vendor-invite-decline'),
]

# Named URL patterns for easy reverse lookups
app_name = 'projects' 
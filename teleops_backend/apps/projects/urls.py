from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProjectViewSet, VendorInvitationPublicViewSet, 
    ProjectSitesImportView, AsyncProjectSitesImportView, ProjectSitesBulkUploadJobStatusView,
    ProjectInventoryImportView, AsyncProjectInventoryImportView, ProjectInventoryBulkUploadJobStatusView
)

# Create router for ViewSets
router = DefaultRouter()
# Register at root so list is available at /api/v1/projects/
# Register at root so list is available at /api/v1/projects/
router.register(r'', ProjectViewSet, basename='project')

# Define URL patterns
urlpatterns = [
    path('', include(router.urls)),
    
    # Project Sites Import (dedicated views)
    path('<int:project_id>/sites/import/', ProjectSitesImportView.as_view(), name='project-sites-import'),
    path('<int:project_id>/sites/import-async/', AsyncProjectSitesImportView.as_view(), name='project-sites-import-async'),
    path('<int:project_id>/sites/import-jobs/', ProjectSitesBulkUploadJobStatusView.as_view(), name='project-sites-import-jobs'),
    path('<int:project_id>/sites/import-jobs/<int:job_id>/', ProjectSitesBulkUploadJobStatusView.as_view(), name='project-sites-import-job-detail'),
    
    # Project Inventory Import (dedicated views)
    path('<int:project_id>/inventory/dismantle/upload/', ProjectInventoryImportView.as_view(), name='project-inventory-import'),
    path('<int:project_id>/inventory/dismantle/upload-async/', AsyncProjectInventoryImportView.as_view(), name='project-inventory-import-async'),
    path('<int:project_id>/inventory/dismantle/upload-jobs/', ProjectInventoryBulkUploadJobStatusView.as_view(), name='project-inventory-import-jobs'),
    path('<int:project_id>/inventory/dismantle/upload-jobs/<int:job_id>/', ProjectInventoryBulkUploadJobStatusView.as_view(), name='project-inventory-import-job-detail'),
    path('<int:project_id>/inventory/dismantle/template/', ProjectInventoryImportView.as_view(), name='project-inventory-template'),
    
    # Vendor Invitations (public, token-based)
    path('invitations/<str:token>/', VendorInvitationPublicViewSet.as_view({'get': 'preview'}), name='vendor-invite-preview'),
    path('invitations/<str:token>/accept/', VendorInvitationPublicViewSet.as_view({'post': 'accept'}), name='vendor-invite-accept'),
    path('invitations/<str:token>/decline/', VendorInvitationPublicViewSet.as_view({'post': 'decline'}), name='vendor-invite-decline'),
]

# Named URL patterns for easy reverse lookups
app_name = 'projects' 
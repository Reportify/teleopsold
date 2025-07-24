from django.urls import path
from .views import (
    CircleSiteManagementView,
    CircleSiteDetailView,
    BulkSiteUploadView
)

app_name = 'sites'

urlpatterns = [
    # Circle Site Management
    path('', CircleSiteManagementView.as_view(), name='circle_sites'),
    path('<int:site_id>/', CircleSiteDetailView.as_view(), name='circle_site_detail'),
    path('bulk-upload/', BulkSiteUploadView.as_view(), name='bulk_site_upload'),
] 
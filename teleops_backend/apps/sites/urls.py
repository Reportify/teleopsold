from django.urls import path
from .views import (
    CircleSiteManagementView,
    CircleSiteDetailView,
    BulkSiteUploadView,
    SiteTemplateDownloadView,
    SiteExportView,
    SiteRestoreView,
    SiteClustersView,
    SiteTownsView
)

app_name = 'sites'

urlpatterns = [
    # Circle Site Management
    path('', CircleSiteManagementView.as_view(), name='circle_sites'),
    path('<int:site_id>/', CircleSiteDetailView.as_view(), name='circle_site_detail'),
    path('<int:site_id>/restore/', SiteRestoreView.as_view(), name='site_restore'),
    
    # Bulk Operations
    path('bulk-upload/', BulkSiteUploadView.as_view(), name='bulk_site_upload'),
    path('template/', SiteTemplateDownloadView.as_view(), name='site_template'),
    path('export/', SiteExportView.as_view(), name='site_export'),
    
    # Data Utilities
    path('clusters/', SiteClustersView.as_view(), name='site_clusters'),
    path('towns/', SiteTownsView.as_view(), name='site_towns'),
] 
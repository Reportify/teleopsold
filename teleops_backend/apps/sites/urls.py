from django.urls import path
from .views import (
    CircleSiteManagementView,
    CircleSiteDetailView,
    BulkSiteUploadView,
    AsyncBulkSiteUploadView,
    BulkUploadJobStatusView,
    SiteTemplateDownloadView,
    SiteExportView,
    SiteRestoreView,
    SiteClustersView,
    SiteTownsView,
    GeographicAnalysisView
)

app_name = 'sites'

urlpatterns = [
    # Circle Site Management
    path('', CircleSiteManagementView.as_view(), name='circle_sites'),
    path('<int:site_id>/', CircleSiteDetailView.as_view(), name='circle_site_detail'),
    path('<int:site_id>/restore/', SiteRestoreView.as_view(), name='site_restore'),
    
    # Bulk Operations
    path('bulk-upload/', BulkSiteUploadView.as_view(), name='bulk_site_upload'),
    path('bulk-upload-async/', AsyncBulkSiteUploadView.as_view(), name='async_bulk_site_upload'),
    path('bulk-upload-jobs/', BulkUploadJobStatusView.as_view(), name='bulk_upload_jobs'),
    path('bulk-upload-jobs/<int:job_id>/', BulkUploadJobStatusView.as_view(), name='bulk_upload_job_detail'),
    path('template/', SiteTemplateDownloadView.as_view(), name='site_template'),
    path('export/', SiteExportView.as_view(), name='site_export'),
    
    # Data Utilities
    path('clusters/', SiteClustersView.as_view(), name='site_clusters'),
    path('towns/', SiteTownsView.as_view(), name='site_towns'),
    path('geographic-analysis/', GeographicAnalysisView.as_view(), name='site_geographic_analysis'),
] 
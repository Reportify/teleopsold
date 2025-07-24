"""
Vendor Operations Management URLs

URL patterns for vendor operational designation and employee management API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'vendor_operations'

# URL patterns for vendor operations management
urlpatterns = [
    # Department URLs
    path('tenants/<uuid:tenant_id>/departments/', 
         views.DepartmentListCreateView.as_view(), 
         name='department-list-create'),
    path('tenants/<uuid:tenant_id>/departments/<uuid:pk>/', 
         views.DepartmentDetailView.as_view(), 
         name='department-detail'),
    
    # Certification Type URLs
    path('tenants/<uuid:tenant_id>/certification-types/', 
         views.CertificationTypeListCreateView.as_view(), 
         name='certification-type-list-create'),
    path('tenants/<uuid:tenant_id>/certification-types/<uuid:pk>/', 
         views.CertificationTypeDetailView.as_view(), 
         name='certification-type-detail'),
    path('tenants/<uuid:tenant_id>/certification-types/create-predefined/', 
         views.create_predefined_certifications, 
         name='create-predefined-certifications'),
    
    # Vendor Operational Designation URLs
    path('tenants/<uuid:tenant_id>/designations/', 
         views.VendorOperationalDesignationListCreateView.as_view(), 
         name='designation-list-create'),
    path('tenants/<uuid:tenant_id>/designations/<uuid:pk>/', 
         views.VendorOperationalDesignationDetailView.as_view(), 
         name='designation-detail'),
    path('tenants/<uuid:tenant_id>/designations/hierarchy/', 
         views.designation_hierarchy, 
         name='designation-hierarchy'),
    
    # Vendor Employee URLs
    path('tenants/<uuid:tenant_id>/employees/', 
         views.VendorEmployeeListCreateView.as_view(), 
         name='employee-list-create'),
    path('tenants/<uuid:tenant_id>/employees/<uuid:pk>/', 
         views.VendorEmployeeDetailView.as_view(), 
         name='employee-detail'),
    path('tenants/<uuid:tenant_id>/employees/bulk-create/', 
         views.bulk_create_employees, 
         name='employee-bulk-create'),
    path('tenants/<uuid:tenant_id>/employees/<uuid:employee_id>/update-field-readiness/', 
         views.update_employee_field_readiness, 
         name='employee-update-field-readiness'),
    
    # Employee Certification URLs
    path('employees/<uuid:employee_id>/certifications/', 
         views.EmployeeCertificationListCreateView.as_view(), 
         name='employee-certification-list-create'),
    path('employees/<uuid:employee_id>/certifications/<uuid:pk>/', 
         views.EmployeeCertificationDetailView.as_view(), 
         name='employee-certification-detail'),
    path('employees/<uuid:employee_id>/certifications/<uuid:certification_id>/verify/', 
         views.verify_certification, 
         name='verify-certification'),
    
    # Analytics and Reports URLs
    path('tenants/<uuid:tenant_id>/dashboard/', 
         views.operational_dashboard, 
         name='operational-dashboard'),
    path('tenants/<uuid:tenant_id>/reports/certification-status/', 
         views.certification_status_report, 
         name='certification-status-report'),
] 
"""
Vendor Operations Management Views

API views for vendor operational designation and employee management.
"""

from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q, Count, Avg
from django.utils import timezone
from datetime import date, timedelta
from typing import Dict, Any

from apps.tenants.models import Tenant, TenantDepartment
from apps.users.models import (
    CertificationType,
    VendorOperationalDesignation,
    VendorEmployee,
    EmployeeCertification
)
from .serializers import (
    DepartmentSerializer,
    DepartmentListSerializer,
    CertificationTypeSerializer,
    CertificationTypeListSerializer,
    VendorOperationalDesignationSerializer,
    VendorOperationalDesignationListSerializer,
    VendorEmployeeSerializer,
    VendorEmployeeListSerializer,
    EmployeeCertificationSerializer,
    EmployeeCertificationListSerializer,
    BulkEmployeeCreateSerializer,
    CertificationStatusReportSerializer,
    DesignationHierarchySerializer
)


# ============================================================================
# Base Mixins
# ============================================================================

class TenantContextMixin:
    """Mixin to add tenant context to serializers"""
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['tenant'] = self.get_tenant()
        return context
    
    def get_tenant(self):
        tenant_id = self.kwargs.get('tenant_id')
        return get_object_or_404(Tenant, id=tenant_id)
    
    def get_queryset(self):
        """Filter queryset by tenant"""
        return super().get_queryset().filter(tenant=self.get_tenant())


# ============================================================================
# Department Views
# ============================================================================

class DepartmentListCreateView(TenantContextMixin, generics.ListCreateAPIView):
    """List and create departments"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return DepartmentListSerializer
        return DepartmentSerializer
    
    def get_queryset(self):
        queryset = TenantDepartment.objects.filter(tenant=self.get_tenant())
        
        # Filter parameters
        is_operational = self.request.query_params.get('is_operational')
        parent_id = self.request.query_params.get('parent')
        search = self.request.query_params.get('search')
        
        if is_operational is not None:
            queryset = queryset.filter(is_operational=is_operational.lower() == 'true')
        
        if parent_id:
            queryset = queryset.filter(parent_department_id=parent_id)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(code__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset.filter(is_active=True).order_by('name')


class DepartmentDetailView(TenantContextMixin, generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete department"""
    
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return TenantDepartment.objects.filter(tenant=self.get_tenant(), is_active=True)
    
    def perform_destroy(self, instance):
        """Soft delete department"""
        # Check if department has active designations
        if instance.designations.filter(is_active=True).exists():
            return Response(
                {'error': 'Cannot delete department with active designations'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.is_active = False
        instance.save()


# ============================================================================
# Certification Type Views
# ============================================================================

class CertificationTypeListCreateView(TenantContextMixin, generics.ListCreateAPIView):
    """List and create certification types"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return CertificationTypeListSerializer
        return CertificationTypeSerializer
    
    def get_queryset(self):
        queryset = CertificationType.objects.filter(tenant=self.get_tenant())
        
        # Filter parameters
        category = self.request.query_params.get('category')
        is_mandatory = self.request.query_params.get('is_mandatory_for_field')
        search = self.request.query_params.get('search')
        
        if category:
            queryset = queryset.filter(category__icontains=category)
        
        if is_mandatory is not None:
            queryset = queryset.filter(is_mandatory_for_field=is_mandatory.lower() == 'true')
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(code__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset.filter(is_active=True).order_by('category', 'name')


class CertificationTypeDetailView(TenantContextMixin, generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete certification type"""
    
    serializer_class = CertificationTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return CertificationType.objects.filter(tenant=self.get_tenant(), is_active=True)
    
    def perform_destroy(self, instance):
        """Soft delete certification type"""
        # Check if certification type is used by employees
        if instance.employee_certifications.filter(status='Active').exists():
                    return Response(
                {'error': 'Cannot delete certification type with active employee certifications'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
        instance.is_active = False
        instance.save()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_predefined_certifications(request, tenant_id):
    """Create predefined certification types for a tenant"""
    tenant = get_object_or_404(Tenant, id=tenant_id)
    
    predefined_certs = [
        {
            'name': 'Fall Arrest, Rescue, Medical Training, Climbing',
            'code': 'FARMTocli',
            'category': 'Safety',
            'description': 'Comprehensive safety training for working at heights',
            'is_mandatory_for_field': True,
            'validity_period_days': 365,
            'advance_notification_days': 30
        },
        {
            'name': 'Factory Acceptance Test',
            'code': 'FAT',
            'category': 'Technical',
            'description': 'Factory acceptance testing certification',
            'is_mandatory_for_field': False,
            'validity_period_days': 730,
            'advance_notification_days': 60
        },
        {
            'name': 'Medical Fitness Certificate',
            'code': 'Medical',
            'category': 'Medical',
            'description': 'Medical fitness certification for field work',
            'is_mandatory_for_field': True,
            'validity_period_days': 365,
            'advance_notification_days': 45
        },
        {
            'name': 'Safety Officer Certification',
            'code': 'Safety_Officer',
            'category': 'Safety',
            'description': 'Safety officer training and certification',
            'is_mandatory_for_field': False,
            'validity_period_days': 1095,
            'advance_notification_days': 90
        },
        {
            'name': 'First Aid Training',
            'code': 'First_Aid',
            'category': 'Medical',
            'description': 'Basic first aid training',
            'is_mandatory_for_field': True,
            'validity_period_days': 730,
            'advance_notification_days': 60
        }
    ]
    
    created_certs = []
    with transaction.atomic():
        for cert_data in predefined_certs:
            # Check if certification already exists
            if not CertificationType.objects.filter(
                tenant=tenant, 
                code=cert_data['code']
            ).exists():
                cert = CertificationType.objects.create(
                    tenant=tenant,
                    is_predefined=True,
                    created_by=request.user,
                    **cert_data
                )
                created_certs.append(cert)
    
    serializer = CertificationTypeSerializer(created_certs, many=True, context={'tenant': tenant})
    return Response({
        'message': f'Created {len(created_certs)} predefined certifications',
        'certifications': serializer.data
    })


# ============================================================================
# Designation Views
# ============================================================================

class VendorOperationalDesignationListCreateView(TenantContextMixin, generics.ListCreateAPIView):
    """List and create vendor operational designations"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return VendorOperationalDesignationListSerializer
        return VendorOperationalDesignationSerializer
    
    def get_queryset(self):
        queryset = VendorOperationalDesignation.objects.filter(tenant=self.get_tenant())
        
        # Filter parameters
        department_id = self.request.query_params.get('department')
        is_field = self.request.query_params.get('is_field_designation')
        hierarchy_level = self.request.query_params.get('hierarchy_level')
        search = self.request.query_params.get('search')
        
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        
        if is_field is not None:
            queryset = queryset.filter(is_field_designation=is_field.lower() == 'true')
        
        if hierarchy_level:
            queryset = queryset.filter(hierarchy_level=hierarchy_level)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(code__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset.filter(is_active=True).order_by('hierarchy_level', 'name')


class VendorOperationalDesignationDetailView(TenantContextMixin, generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete vendor operational designation"""
    
    serializer_class = VendorOperationalDesignationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return VendorOperationalDesignation.objects.filter(tenant=self.get_tenant(), is_active=True)
    
    def perform_destroy(self, instance):
        """Soft delete designation"""
        # Check if designation has active employees
        if instance.employees.filter(status='Active').exists():
                return Response(
                {'error': 'Cannot delete designation with active employees'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
        instance.is_active = False
        instance.save()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def designation_hierarchy(request, tenant_id):
    """Get designation hierarchy for tenant"""
    tenant = get_object_or_404(Tenant, id=tenant_id)
    
    designations = VendorOperationalDesignation.objects.filter(
                    tenant=tenant,
                    is_active=True
    ).select_related('department').prefetch_related('employees').order_by('hierarchy_level', 'name')
    
    # Build hierarchy tree
    hierarchy = []
    designation_map = {}
    
    for designation in designations:
        designation_data = {
                        'id': designation.id,
                        'name': designation.name,
            'code': designation.code,
            'department_name': designation.department.name,
            'hierarchy_level': designation.hierarchy_level,
            'employees_count': designation.employees.filter(status='Active').count(),
            'subordinates': []
        }
        
        designation_map[designation.id] = designation_data
        
        if designation.parent_designation_id:
            parent = designation_map.get(designation.parent_designation_id)
            if parent:
                parent['subordinates'].append(designation_data)
        else:
            hierarchy.append(designation_data)
    
    serializer = DesignationHierarchySerializer(hierarchy, many=True)
    return Response(serializer.data)


# ============================================================================
# Employee Views
# ============================================================================

class VendorEmployeeListCreateView(TenantContextMixin, generics.ListCreateAPIView):
    """List and create vendor employees"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return VendorEmployeeListSerializer
        return VendorEmployeeSerializer
    
    def get_queryset(self):
        queryset = VendorEmployee.objects.filter(tenant=self.get_tenant())
        
        # Filter parameters
        designation_id = self.request.query_params.get('designation')
        department_id = self.request.query_params.get('department')
        status_filter = self.request.query_params.get('status')
        is_field_ready = self.request.query_params.get('is_field_ready')
        search = self.request.query_params.get('search')
        
        if designation_id:
            queryset = queryset.filter(designation_id=designation_id)
        
        if department_id:
            queryset = queryset.filter(designation__department_id=department_id)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if is_field_ready is not None:
            queryset = queryset.filter(is_field_ready=is_field_ready.lower() == 'true')
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(email__icontains=search) |
                Q(employee_id__icontains=search) |
                Q(phone__icontains=search)
            )
        
        return queryset.select_related('designation__department').order_by('name')


class VendorEmployeeDetailView(TenantContextMixin, generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete vendor employee"""
    
    serializer_class = VendorEmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return VendorEmployee.objects.filter(tenant=self.get_tenant())
    
    def perform_destroy(self, instance):
        """Soft delete employee"""
        instance.status = 'Terminated'
        instance.save()


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def bulk_create_employees(request, tenant_id):
    """Bulk create employees"""
    tenant = get_object_or_404(Tenant, id=tenant_id)
    
    serializer = BulkEmployeeCreateSerializer(
        data=request.data,
        context={'tenant': tenant, 'request': request}
    )
    
    if serializer.is_valid():
        created_employees = []
        with transaction.atomic():
            for employee_data in serializer.validated_data['employees']:
                employee_serializer = VendorEmployeeSerializer(
                    data=employee_data,
                    context={'tenant': tenant, 'request': request}
                )
                if employee_serializer.is_valid():
                    employee = employee_serializer.save()
                    created_employees.append(employee)
                else:
                    return Response(
                        employee_serializer.errors,
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        response_serializer = VendorEmployeeListSerializer(created_employees, many=True)
        return Response({
            'message': f'Created {len(created_employees)} employees',
            'employees': response_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def update_employee_field_readiness(request, tenant_id, employee_id):
    """Update employee field readiness based on current certifications"""
    tenant = get_object_or_404(Tenant, id=tenant_id)
    employee = get_object_or_404(VendorEmployee, id=employee_id, tenant=tenant)
    
    employee.update_field_readiness()
    
    serializer = VendorEmployeeSerializer(employee, context={'tenant': tenant})
    return Response({
        'message': 'Field readiness updated',
        'employee': serializer.data
    })


# ============================================================================
# Employee Certification Views
# ============================================================================

class EmployeeCertificationListCreateView(generics.ListCreateAPIView):
    """List and create employee certifications"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return EmployeeCertificationListSerializer
        return EmployeeCertificationSerializer
    
    def get_queryset(self):
        employee_id = self.kwargs.get('employee_id')
        employee = get_object_or_404(VendorEmployee, id=employee_id)
        
        queryset = EmployeeCertification.objects.filter(employee=employee)
        
        # Filter parameters
        status_filter = self.request.query_params.get('status')
        certification_type_id = self.request.query_params.get('certification_type')
        expiring_soon = self.request.query_params.get('expiring_soon')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if certification_type_id:
            queryset = queryset.filter(certification_type_id=certification_type_id)
        
        if expiring_soon == 'true':
            thirty_days_from_now = date.today() + timedelta(days=30)
            queryset = queryset.filter(
                status='Active',
                expiry_date__lte=thirty_days_from_now,
                expiry_date__gte=date.today()
            )
        
        return queryset.order_by('-issue_date')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        employee_id = self.kwargs.get('employee_id')
        context['employee'] = get_object_or_404(VendorEmployee, id=employee_id)
        return context


class EmployeeCertificationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete employee certification"""
    
    serializer_class = EmployeeCertificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        employee_id = self.kwargs.get('employee_id')
        employee = get_object_or_404(VendorEmployee, id=employee_id)
        return EmployeeCertification.objects.filter(employee=employee)
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        employee_id = self.kwargs.get('employee_id')
        context['employee'] = get_object_or_404(VendorEmployee, id=employee_id)
        return context


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verify_certification(request, employee_id, certification_id):
    """Verify an employee certification"""
    employee = get_object_or_404(VendorEmployee, id=employee_id)
    certification = get_object_or_404(
        EmployeeCertification, 
        id=certification_id, 
        employee=employee
    )
    
    certification.verify_certification(request.user)
    
    serializer = EmployeeCertificationSerializer(certification)
    return Response({
        'message': 'Certification verified',
        'certification': serializer.data
    })


# ============================================================================
# Analytics and Reports Views
# ============================================================================

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def operational_dashboard(request, tenant_id):
    """Get operational dashboard metrics"""
    tenant = get_object_or_404(Tenant, id=tenant_id)
    
    # Employee metrics
    total_employees = VendorEmployee.objects.filter(tenant=tenant).count()
    active_employees = VendorEmployee.objects.filter(tenant=tenant, status='Active').count()
    field_ready_employees = VendorEmployee.objects.filter(
        tenant=tenant, 
        status='Active',
        is_field_ready=True
    ).count()
    
    # Designation metrics
    total_designations = VendorOperationalDesignation.objects.filter(
        tenant=tenant, 
        is_active=True
    ).count()
    field_designations = VendorOperationalDesignation.objects.filter(
        tenant=tenant, 
        is_active=True,
        is_field_designation=True
    ).count()
    
    # Certification metrics
    total_certifications = EmployeeCertification.objects.filter(
        employee__tenant=tenant
    ).count()
    active_certifications = EmployeeCertification.objects.filter(
        employee__tenant=tenant,
        status='Active'
    ).count()
    expired_certifications = EmployeeCertification.objects.filter(
        employee__tenant=tenant,
        status='Expired'
    ).count()
    
    # Expiring soon certifications
    thirty_days_from_now = date.today() + timedelta(days=30)
    expiring_soon = EmployeeCertification.objects.filter(
        employee__tenant=tenant,
        status='Active',
        expiry_date__lte=thirty_days_from_now,
        expiry_date__gte=date.today()
    ).count()
    
    # Department metrics
    departments_with_employees = TenantDepartment.objects.filter(
        tenant=tenant,
        is_active=True,
        designations__employees__status='Active'
    ).distinct().count()
    
    # Field readiness rate
    field_readiness_rate = 0
    if active_employees > 0:
        field_readiness_rate = (field_ready_employees / active_employees) * 100
    
    # Certification compliance rate
    compliance_rate = 0
    if total_certifications > 0:
        compliance_rate = (active_certifications / total_certifications) * 100
    
    return Response({
        'employee_metrics': {
            'total_employees': total_employees,
            'active_employees': active_employees,
            'field_ready_employees': field_ready_employees,
            'field_readiness_rate': round(field_readiness_rate, 2)
        },
        'designation_metrics': {
            'total_designations': total_designations,
            'field_designations': field_designations,
            'departments_with_employees': departments_with_employees
        },
        'certification_metrics': {
            'total_certifications': total_certifications,
            'active_certifications': active_certifications,
            'expired_certifications': expired_certifications,
            'expiring_soon': expiring_soon,
            'compliance_rate': round(compliance_rate, 2)
        }
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def certification_status_report(request, tenant_id):
    """Get certification status report for all employees"""
    tenant = get_object_or_404(Tenant, id=tenant_id)
    
    employees = VendorEmployee.objects.filter(
        tenant=tenant,
        status='Active'
    ).select_related('designation__department').prefetch_related('certifications')
    
    report_data = []
    for employee in employees:
        certifications = employee.certifications.all()
        active_certs = certifications.filter(status='Active').count()
        expired_certs = certifications.filter(status='Expired').count()
        
        # Count expiring soon
        thirty_days_from_now = date.today() + timedelta(days=30)
        expiring_soon = certifications.filter(
            status='Active',
            expiry_date__lte=thirty_days_from_now,
            expiry_date__gte=date.today()
        ).count()
        
        # Count missing required certifications
        required_certs = employee.designation.required_certifications.count()
        employee_cert_types = set(certifications.filter(
            status='Active'
        ).values_list('certification_type_id', flat=True))
        required_cert_types = set(employee.designation.required_certifications.values_list(
            'id', flat=True
        ))
        missing_required = len(required_cert_types - employee_cert_types)
        
        report_data.append({
            'employee_id': employee.id,
            'employee_name': employee.name,
            'employee_id_number': employee.employee_id,
            'designation_name': employee.designation.name,
            'department_name': employee.designation.department.name,
            'is_field_ready': employee.is_field_ready,
            'compliance_rate': employee.certification_compliance_rate,
            'active_certifications': active_certs,
            'expired_certifications': expired_certs,
            'expiring_soon': expiring_soon,
            'missing_required': missing_required
        })
    
    serializer = CertificationStatusReportSerializer(report_data, many=True)
    return Response(serializer.data) 
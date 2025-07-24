"""
Vendor Operations Management Serializers

Serializers for vendor operational designation and employee management API endpoints.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from datetime import date, timedelta
from django.utils import timezone

from apps.users.models import (
    Department,
    CertificationType,
    VendorOperationalDesignation,
    VendorEmployee,
    EmployeeCertification
)


# ============================================================================
# Department Serializers
# ============================================================================

class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model"""
    
    parent_department_name = serializers.CharField(
        source='parent_department.name', 
        read_only=True
    )
    sub_departments_count = serializers.SerializerMethodField()
    designations_count = serializers.SerializerMethodField()
    employees_count = serializers.SerializerMethodField()
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = Department
        fields = [
            'id', 'tenant', 'name', 'code', 'description', 'parent_department',
            'parent_department_name', 'is_operational', 'requires_safety_training',
            'is_active', 'created_by', 'created_at', 'updated_at',
            'sub_departments_count', 'designations_count', 'employees_count', 'full_name'
        ]
        read_only_fields = ['id', 'tenant', 'created_by', 'created_at', 'updated_at']
    
    def get_sub_departments_count(self, obj):
        return obj.sub_departments.filter(is_active=True).count()
    
    def get_designations_count(self, obj):
        return obj.designations.filter(is_active=True).count()
    
    def get_employees_count(self, obj):
        return VendorEmployee.objects.filter(
            designation__department=obj,
            status='Active'
        ).count()
    
    def validate_code(self, value):
        """Validate department code uniqueness within tenant"""
        tenant = self.context['tenant']
        existing = Department.objects.filter(tenant=tenant, code=value)
        
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        
        if existing.exists():
            raise serializers.ValidationError("Department code must be unique within tenant")
        
        return value
    
    def validate(self, attrs):
        """Cross-field validation"""
        parent_department = attrs.get('parent_department')
        
        # Prevent circular reference
        if parent_department and self.instance:
            if parent_department == self.instance:
                raise serializers.ValidationError({
                    'parent_department': 'Department cannot be its own parent'
                })
        
        return attrs
    
    def create(self, validated_data):
        validated_data['tenant'] = self.context['tenant']
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class DepartmentListSerializer(serializers.ModelSerializer):
    """Simplified serializer for department lists"""
    
    parent_department_name = serializers.CharField(
        source='parent_department.name', 
        read_only=True
    )
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'parent_department', 'parent_department_name',
            'is_operational', 'is_active', 'full_name'
        ]


# ============================================================================
# Certification Type Serializers
# ============================================================================

class CertificationTypeSerializer(serializers.ModelSerializer):
    """Serializer for CertificationType model"""
    
    employees_with_certification = serializers.SerializerMethodField()
    designations_requiring = serializers.SerializerMethodField()
    is_expiring_soon_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CertificationType
        fields = [
            'id', 'tenant', 'name', 'code', 'description', 'category',
            'is_predefined', 'is_mandatory_for_field', 'validity_period_days',
            'renewal_required', 'advance_notification_days', 'is_active',
            'created_by', 'created_at', 'updated_at', 'employees_with_certification',
            'designations_requiring', 'is_expiring_soon_count'
        ]
        read_only_fields = ['id', 'tenant', 'is_predefined', 'created_by', 'created_at', 'updated_at']
    
    def get_employees_with_certification(self, obj):
        return obj.employee_certifications.filter(status='Active').count()
    
    def get_designations_requiring(self, obj):
        return obj.required_for_designations.filter(is_active=True).count()
    
    def get_is_expiring_soon_count(self, obj):
        if not obj.validity_period_days:
            return 0
        
        notification_date = date.today() + timedelta(days=obj.advance_notification_days)
        return obj.employee_certifications.filter(
            status='Active',
            expiry_date__lte=notification_date,
            expiry_date__gte=date.today()
        ).count()
    
    def validate_code(self, value):
        """Validate certification code uniqueness within tenant"""
        tenant = self.context['tenant']
        existing = CertificationType.objects.filter(tenant=tenant, code=value)
        
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        
        if existing.exists():
            raise serializers.ValidationError("Certification code must be unique within tenant")
        
        return value
    
    def validate_validity_period_days(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Validity period must be positive")
        return value
    
    def validate_advance_notification_days(self, value):
        if value < 0:
            raise serializers.ValidationError("Advance notification days cannot be negative")
        return value
    
    def create(self, validated_data):
        validated_data['tenant'] = self.context['tenant']
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class CertificationTypeListSerializer(serializers.ModelSerializer):
    """Simplified serializer for certification type lists"""
    
    class Meta:
        model = CertificationType
        fields = [
            'id', 'name', 'code', 'category', 'is_mandatory_for_field',
            'validity_period_days', 'is_active'
        ]


# ============================================================================
# Designation Serializers
# ============================================================================

class VendorOperationalDesignationSerializer(serializers.ModelSerializer):
    """Serializer for VendorOperationalDesignation model"""
    
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_full_name = serializers.CharField(source='department.full_name', read_only=True)
    parent_designation_name = serializers.CharField(
        source='parent_designation.name', 
        read_only=True
    )
    required_certifications_list = CertificationTypeListSerializer(
        source='required_certifications',
        many=True,
        read_only=True
    )
    employees_count = serializers.SerializerMethodField()
    field_ready_employees_count = serializers.SerializerMethodField()
    subordinate_designations_count = serializers.SerializerMethodField()
    
    class Meta:
        model = VendorOperationalDesignation
        fields = [
            'id', 'tenant', 'name', 'code', 'description', 'department',
            'department_name', 'department_full_name', 'is_field_designation',
            'requires_supervision', 'can_supervise_others', 'max_team_size',
            'required_certifications', 'required_certifications_list', 'rbac_permissions',
            'parent_designation', 'parent_designation_name', 'hierarchy_level',
            'is_active', 'created_by', 'created_at', 'updated_at',
            'employees_count', 'field_ready_employees_count', 'subordinate_designations_count'
        ]
        read_only_fields = ['id', 'tenant', 'created_by', 'created_at', 'updated_at']
    
    def get_employees_count(self, obj):
        return obj.employees.filter(status='Active').count()
    
    def get_field_ready_employees_count(self, obj):
        return obj.employees.filter(status='Active', is_field_ready=True).count()
    
    def get_subordinate_designations_count(self, obj):
        return obj.subordinate_designations.filter(is_active=True).count()
    
    def validate_code(self, value):
        """Validate designation code uniqueness within tenant"""
        tenant = self.context['tenant']
        existing = VendorOperationalDesignation.objects.filter(tenant=tenant, code=value)
        
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        
        if existing.exists():
            raise serializers.ValidationError("Designation code must be unique within tenant")
        
        return value
    
    def validate_department(self, value):
        """Validate department belongs to same tenant"""
        tenant = self.context['tenant']
        if value.tenant != tenant:
            raise serializers.ValidationError("Department must belong to same tenant")
        return value
    
    def validate_required_certifications(self, value):
        """Validate all certifications belong to same tenant"""
        tenant = self.context['tenant']
        for cert in value:
            if cert.tenant != tenant:
                raise serializers.ValidationError("All certifications must belong to same tenant")
        return value
    
    def validate(self, attrs):
        """Cross-field validation"""
        parent_designation = attrs.get('parent_designation')
        hierarchy_level = attrs.get('hierarchy_level', 1)
        max_team_size = attrs.get('max_team_size')
        
        # Validate hierarchy
        if parent_designation and hierarchy_level <= parent_designation.hierarchy_level:
            raise serializers.ValidationError({
                'hierarchy_level': 'Hierarchy level must be greater than parent level'
            })
        
        # Validate team size
        if max_team_size is not None and max_team_size <= 0:
            raise serializers.ValidationError({
                'max_team_size': 'Max team size must be positive'
            })
        
        return attrs
    
    def create(self, validated_data):
        required_certifications = validated_data.pop('required_certifications', [])
        validated_data['tenant'] = self.context['tenant']
        validated_data['created_by'] = self.context['request'].user
        
        designation = super().create(validated_data)
        designation.required_certifications.set(required_certifications)
        return designation
    
    def update(self, instance, validated_data):
        required_certifications = validated_data.pop('required_certifications', None)
        
        instance = super().update(instance, validated_data)
        
        if required_certifications is not None:
            instance.required_certifications.set(required_certifications)
        
        return instance


class VendorOperationalDesignationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for designation lists"""
    
    department_name = serializers.CharField(source='department.name', read_only=True)
    employees_count = serializers.SerializerMethodField()
    required_certifications_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = VendorOperationalDesignation
        fields = [
            'id', 'name', 'code', 'department_name', 'is_field_designation',
            'hierarchy_level', 'is_active', 'employees_count', 'required_certifications_count'
        ]
    
    def get_employees_count(self, obj):
        return obj.employees.filter(status='Active').count()


# ============================================================================
# Employee Serializers
# ============================================================================

class VendorEmployeeSerializer(serializers.ModelSerializer):
    """Serializer for VendorEmployee model"""
    
    designation_name = serializers.CharField(source='designation.name', read_only=True)
    department_name = serializers.CharField(source='designation.department.name', read_only=True)
    certification_compliance_rate = serializers.FloatField(read_only=True)
    active_certifications_count = serializers.SerializerMethodField()
    expired_certifications_count = serializers.SerializerMethodField()
    expiring_soon_count = serializers.SerializerMethodField()
    required_certifications_count = serializers.SerializerMethodField()
    
    class Meta:
        model = VendorEmployee
        fields = [
            'id', 'tenant', 'name', 'email', 'phone', 'employee_id',
            'designation', 'designation_name', 'department_name', 'date_of_joining',
            'employment_type', 'is_field_ready', 'last_certification_check',
            'address', 'emergency_contact_name', 'emergency_contact_phone',
            'status', 'created_by', 'created_at', 'updated_at',
            'certification_compliance_rate', 'active_certifications_count',
            'expired_certifications_count', 'expiring_soon_count', 'required_certifications_count'
        ]
        read_only_fields = [
            'id', 'tenant', 'is_field_ready', 'last_certification_check',
            'created_by', 'created_at', 'updated_at'
        ]
    
    def get_active_certifications_count(self, obj):
        return obj.certifications.filter(status='Active').count()
    
    def get_expired_certifications_count(self, obj):
        return obj.certifications.filter(status='Expired').count()
    
    def get_expiring_soon_count(self, obj):
        return obj.certifications.filter(
            status='Active',
            expiry_date__lte=date.today() + timedelta(days=30),
            expiry_date__gte=date.today()
        ).count()
    
    def get_required_certifications_count(self, obj):
        return obj.designation.required_certifications.count()
    
    def validate_employee_id(self, value):
        """Validate employee ID uniqueness within tenant"""
        tenant = self.context['tenant']
        existing = VendorEmployee.objects.filter(tenant=tenant, employee_id=value)
        
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        
        if existing.exists():
            raise serializers.ValidationError("Employee ID must be unique within tenant")
        
        return value
    
    def validate_email(self, value):
        """Validate email uniqueness within tenant"""
        tenant = self.context['tenant']
        existing = VendorEmployee.objects.filter(tenant=tenant, email=value)
        
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        
        if existing.exists():
            raise serializers.ValidationError("Email must be unique within tenant")
        
        return value
    
    def validate_designation(self, value):
        """Validate designation belongs to same tenant"""
        tenant = self.context['tenant']
        if value.tenant != tenant:
            raise serializers.ValidationError("Designation must belong to same tenant")
        return value
    
    def validate_date_of_joining(self, value):
        if value > date.today():
            raise serializers.ValidationError("Date of joining cannot be in the future")
        return value
    
    def create(self, validated_data):
        validated_data['tenant'] = self.context['tenant']
        validated_data['created_by'] = self.context['request'].user
        employee = super().create(validated_data)
        # Update field readiness after creation
        employee.update_field_readiness()
        return employee


class VendorEmployeeListSerializer(serializers.ModelSerializer):
    """Simplified serializer for employee lists"""
    
    designation_name = serializers.CharField(source='designation.name', read_only=True)
    department_name = serializers.CharField(source='designation.department.name', read_only=True)
    
    class Meta:
        model = VendorEmployee
        fields = [
            'id', 'name', 'email', 'employee_id', 'designation_name',
            'department_name', 'is_field_ready', 'status', 'date_of_joining'
        ]


# ============================================================================
# Employee Certification Serializers
# ============================================================================

class EmployeeCertificationSerializer(serializers.ModelSerializer):
    """Serializer for EmployeeCertification model"""
    
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    certification_name = serializers.CharField(source='certification_type.name', read_only=True)
    certification_category = serializers.CharField(source='certification_type.category', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    days_to_expiry = serializers.IntegerField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    
    class Meta:
        model = EmployeeCertification
        fields = [
            'id', 'employee', 'employee_name', 'employee_id', 'certification_type',
            'certification_name', 'certification_category', 'certificate_number',
            'issuing_authority', 'issue_date', 'expiry_date', 'status',
            'is_verified', 'verified_by', 'verified_by_name', 'verified_at',
            'expiry_notification_sent', 'last_reminder_sent', 'notes',
            'renewal_required', 'created_by', 'created_at', 'updated_at',
            'is_active', 'days_to_expiry', 'is_expiring_soon'
        ]
        read_only_fields = [
            'id', 'expiry_notification_sent', 'last_reminder_sent', 'verified_by',
            'verified_at', 'created_by', 'created_at', 'updated_at'
        ]
    
    def validate_certification_type(self, value):
        """Validate certification type belongs to same tenant as employee"""
        employee = self.context.get('employee')
        if employee and value.tenant != employee.tenant:
            raise serializers.ValidationError("Certification type must belong to same tenant as employee")
        return value
    
    def validate(self, attrs):
        """Cross-field validation"""
        issue_date = attrs.get('issue_date')
        expiry_date = attrs.get('expiry_date')
        
        if expiry_date and issue_date and expiry_date <= issue_date:
            raise serializers.ValidationError({
                'expiry_date': 'Expiry date must be after issue date'
            })
        
        return attrs
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        certification = super().create(validated_data)
        
        # Update employee field readiness after adding certification
        certification.employee.update_field_readiness()
        
        return certification
    
    def update(self, instance, validated_data):
        certification = super().update(instance, validated_data)
        
        # Update employee field readiness after updating certification
        certification.employee.update_field_readiness()
        
        return certification


class EmployeeCertificationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for certification lists"""
    
    certification_name = serializers.CharField(source='certification_type.name', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    days_to_expiry = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = EmployeeCertification
        fields = [
            'id', 'certification_name', 'certificate_number', 'issue_date',
            'expiry_date', 'status', 'is_verified', 'is_active', 'days_to_expiry'
        ]


# ============================================================================
# Bulk Operations Serializers
# ============================================================================

class BulkEmployeeCreateSerializer(serializers.Serializer):
    """Serializer for bulk employee creation"""
    
    employees = VendorEmployeeSerializer(many=True)
    
    def validate_employees(self, value):
        if not value:
            raise serializers.ValidationError("At least one employee must be provided")
        
        if len(value) > 100:
            raise serializers.ValidationError("Cannot create more than 100 employees at once")
        
        # Check for duplicate employee IDs within the batch
        employee_ids = [emp.get('employee_id') for emp in value if emp.get('employee_id')]
        if len(employee_ids) != len(set(employee_ids)):
            raise serializers.ValidationError("Duplicate employee IDs found in batch")
        
        # Check for duplicate emails within the batch
        emails = [emp.get('email') for emp in value if emp.get('email')]
        if len(emails) != len(set(emails)):
            raise serializers.ValidationError("Duplicate emails found in batch")
        
        return value


class CertificationStatusReportSerializer(serializers.Serializer):
    """Serializer for certification status reports"""
    
    employee_id = serializers.UUIDField()
    employee_name = serializers.CharField()
    employee_id_number = serializers.CharField()
    designation_name = serializers.CharField()
    department_name = serializers.CharField()
    is_field_ready = serializers.BooleanField()
    compliance_rate = serializers.FloatField()
    active_certifications = serializers.IntegerField()
    expired_certifications = serializers.IntegerField()
    expiring_soon = serializers.IntegerField()
    missing_required = serializers.IntegerField()


class DesignationHierarchySerializer(serializers.Serializer):
    """Serializer for designation hierarchy response"""
    
    id = serializers.UUIDField()
    name = serializers.CharField()
    code = serializers.CharField()
    department_name = serializers.CharField()
    hierarchy_level = serializers.IntegerField()
    employees_count = serializers.IntegerField()
    subordinates = serializers.ListField(child=serializers.DictField(), required=False) 
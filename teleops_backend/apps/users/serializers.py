from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from apps.users.models import User
from apps.users.tenant_profile import TenantProfile
from teleops_internal.users.models import InternalProfile


class TenantProfileSerializer(serializers.ModelSerializer):
    tenant = serializers.SerializerMethodField()
    
    class Meta:
        model = TenantProfile
        fields = '__all__'
    
    def get_tenant(self, obj):
        if obj.tenant:
            return {
                'id': str(obj.tenant.id),  # Convert UUID to string
                'tenant_type': obj.tenant.tenant_type,
                'organization_name': obj.tenant.organization_name,
                'circle_code': getattr(obj.tenant, 'circle_code', None),
                'circle_name': getattr(obj.tenant, 'circle_name', None),
            }
        return None

class InternalProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = InternalProfile
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    tenant_profile = TenantProfileSerializer(read_only=True)
    internal_profile = InternalProfileSerializer(read_only=True)
    uuid = serializers.UUIDField(read_only=True)  # Ensure UUID is properly serialized

    class Meta:
        model = User
        fields = [
            'id', 'uuid', 'email', 'first_name', 'last_name', 'user_type',
            'is_active', 'is_staff', 'is_superuser', 'last_login', 'created_at', 'updated_at',
            'tenant_profile', 'internal_profile',
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    """Extended user profile serializer with tenant information"""
    user = UserSerializer(read_only=True)
    tenant = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    employee_id = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    access_level = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'user', 'tenant', 'display_name', 'phone_number', 'department', 
            'employee_id', 'role', 'access_level', 'avatar'
        ]
    
    def get_tenant(self, obj):
        # Get tenant from tenant_user_profile
        if hasattr(obj, 'tenant_user_profile') and obj.tenant_user_profile:
            from apps.tenants.models import Tenant
            try:
                tenant = Tenant.objects.get(id=obj.tenant_user_profile.tenant_id, is_active=True)
                return {
                    'id': str(tenant.id),
                    'tenant_type': tenant.tenant_type,
                    'organization_name': tenant.organization_name,
                    'circle_code': getattr(tenant, 'circle_code', None),
                    'circle_name': getattr(tenant, 'circle_name', None),
                }
            except Tenant.DoesNotExist:
                pass
        # Fallback: match email to primary_contact_email
        from apps.tenants.models import Tenant
        tenant = Tenant.objects.filter(primary_contact_email=obj.email).first()
        if tenant:
            return {
                'id': str(tenant.id),
                'tenant_type': tenant.tenant_type,
                'organization_name': tenant.organization_name,
                'circle_code': getattr(tenant, 'circle_code', None),
                'circle_name': getattr(tenant, 'circle_name', None),
            }
        return None
    
    def get_display_name(self, obj):
        if hasattr(obj, 'tenant_user_profile') and obj.tenant_user_profile:
            return obj.tenant_user_profile.display_name
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email
    
    def get_phone_number(self, obj):
        if hasattr(obj, 'tenant_user_profile') and obj.tenant_user_profile:
            return obj.tenant_user_profile.phone_number
        return None
    
    def get_department(self, obj):
        if hasattr(obj, 'tenant_user_profile') and obj.tenant_user_profile:
            return obj.tenant_user_profile.department
        return None
    
    def get_employee_id(self, obj):
        if hasattr(obj, 'tenant_user_profile') and obj.tenant_user_profile:
            return obj.tenant_user_profile.employee_id
        return None
    
    def get_role(self, obj):
        if hasattr(obj, 'tenant_user_profile') and obj.tenant_user_profile:
            return obj.tenant_user_profile.job_title
        return None
    
    def get_access_level(self, obj):
        # For tenant users, we can determine access level based on user type or role
        if obj.is_superuser:
            return "admin"
        elif obj.is_staff:
            return "standard"
        else:
            return "read_only"
    
    def get_avatar(self, obj):
        if hasattr(obj, 'tenant_user_profile') and obj.tenant_user_profile and obj.tenant_user_profile.profile_photo:
            return obj.tenant_user_profile.profile_photo.url
        return None
    
    


class TenantContextSerializer(serializers.Serializer):
    """Serializer for tenant context in authentication response"""
    currentTenant = serializers.SerializerMethodField()
    accessibleCircles = serializers.SerializerMethodField()
    primaryCircle = serializers.SerializerMethodField()
    corporateAccess = serializers.SerializerMethodField()
    crossCirclePermissions = serializers.SerializerMethodField()
    userPermissions = serializers.SerializerMethodField()
    
    def get_currentTenant(self, obj):
        tenant = None
        # Try to get tenant from related profile
        if hasattr(obj, 'tenant_user_profile') and obj.tenant_user_profile:
            from apps.tenants.models import Tenant
            try:
                tenant = Tenant.objects.get(id=obj.tenant_user_profile.tenant_id, is_active=True)
            except Tenant.DoesNotExist:
                pass
        # Fallback: match email to primary_contact_email
        if tenant is None:
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.filter(primary_contact_email=obj.email).first()
        if not tenant:
            return None
        return {
            'id': str(tenant.id),
            'tenant_type': tenant.tenant_type,
            'organization_name': tenant.organization_name,
            'circle_code': getattr(tenant, 'circle_code', None),
            'circle_name': getattr(tenant, 'circle_name', None),
            'subdomain': getattr(tenant, 'subdomain', None),
            'subscription_plan': getattr(tenant, 'subscription_plan', None),
        }
    
    def get_accessibleCircles(self, obj):
        """Get accessible circles for corporate users"""
        if obj.is_corporate_user and obj.tenant:
            circles = obj.tenant.circle_children.filter(is_active=True)
            return [{
                'id': str(circle.id),
                'tenant_type': circle.tenant_type,
                'organization_name': circle.organization_name,
                'circle_code': circle.circle_code,
                'circle_name': circle.circle_name,
            } for circle in circles]
        return []
    
    def get_primaryCircle(self, obj):
        """Get primary circle for corporate users"""
        if obj.is_corporate_user and obj.tenant:
            # For now, return the first circle. In future, this could be user preference
            primary_circle = obj.tenant.circle_children.filter(is_active=True).first()
            if primary_circle:
                return {
                    'id': str(primary_circle.id),
                    'tenant_type': primary_circle.tenant_type,
                    'organization_name': primary_circle.organization_name,
                    'circle_code': primary_circle.circle_code,
                    'circle_name': primary_circle.circle_name,
                }
        return None
    
    def get_corporateAccess(self, obj):
        """Check if user has corporate access"""
        return obj.is_corporate_user
    
    def get_crossCirclePermissions(self, obj):
        """Get cross-circle permissions for corporate users"""
        if obj.is_corporate_user:
            return [
                'circles.view',
                'circles.report',
                'circles.analytics',
                'circles.governance'
            ]
        return []
    
    def get_userPermissions(self, obj):
        """Get user permissions based on tenant type and role"""
        permissions = []
        
        if obj.is_superuser:
            permissions.extend([
                'admin.all',
                'tenants.manage',
                'users.manage',
                'system.configure'
            ])
        elif obj.is_corporate_user:
            permissions.extend([
                'dashboard.view',
                'projects.view',
                'sites.view',
                'tasks.view',
                'equipment.view',
                'teams.view',
                'warehouse.view',
                'transport.view',
                'analytics.view',
                'settings.view',
                'circles.oversight',
                'corporate.reporting'
            ])
        elif obj.is_circle_user:
            permissions.extend([
                'dashboard.view',
                'projects.view',
                'sites.view',
                'tasks.view',
                'equipment.view',
                'teams.view',
                'warehouse.view',
                'transport.view',
                'analytics.view',
                'settings.view',
                'vendors.manage'
            ])
        elif obj.is_vendor_user:
            permissions.extend([
                'dashboard.view',
                'tasks.view',
                'equipment.view',
                'warehouse.view',
                'transport.view',
                'analytics.view',
                'profile.view'
            ])
        
        return permissions


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            try:
                user_obj = User.objects.get(email=email)
                user = authenticate(username=user_obj.email, password=password)
            except User.DoesNotExist:
                user = None

            if not user:
                raise serializers.ValidationError('Invalid email or password.')

            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')

            attrs['user'] = user
            return attrs

        raise serializers.ValidationError('Must include "email" and "password".')


class LoginResponseSerializer(serializers.Serializer):
    """Serializer for login response"""
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()
    user_profile = UserProfileSerializer(source='user')
    tenant_context = TenantContextSerializer(source='user')


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    
    def validate_new_password(self, value):
        validate_password(value, self.context['request'].user)
        return value
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value


class ForgotPasswordSerializer(serializers.Serializer):
    """Serializer for forgot password"""
    email = serializers.EmailField()
    
    def validate_email(self, value):
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError('No user found with this email address.')
        return value


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer for password reset"""
    token = serializers.CharField()
    new_password = serializers.CharField()
    
    def validate_new_password(self, value):
        validate_password(value)
        return value 


class OnboardingSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    phone_number = serializers.CharField()
    department = serializers.CharField()
    designation = serializers.CharField()
    employee_id = serializers.CharField(required=False, allow_blank=True)
    profile_photo = serializers.ImageField(required=False, allow_null=True)
    reporting_manager = serializers.CharField(required=False, allow_blank=True)
    # Optionally, add tenant_type if not in context
    tenant_type = serializers.CharField(required=False)

    def validate(self, attrs):
        # Determine tenant_type
        tenant_type = attrs.get('tenant_type') or self.context.get('tenant_type')
        errors = {}
        # Enforce required fields by tenant type
        if tenant_type == 'Circle':
            required = ['first_name', 'last_name', 'phone_number', 'department', 'designation']
        elif tenant_type == 'Corporate':
            required = ['first_name', 'last_name', 'phone_number', 'department', 'designation']
        elif tenant_type == 'Vendor':
            required = ['first_name', 'last_name', 'phone_number', 'department', 'designation']
        else:
            required = ['first_name', 'last_name', 'phone_number', 'department', 'designation']
        for field in required:
            if not attrs.get(field):
                errors[field] = 'This field is required.'
        if errors:
            raise serializers.ValidationError(errors)
        return attrs 


class UserProfileUpdateSerializer(serializers.Serializer):
    """Serializer for updating user profile"""
    display_name = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)
    employee_id = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, allow_blank=True)
    access_level = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.ImageField(required=False, allow_null=True)
    
    def update(self, instance, validated_data):
        """Update the user profile"""
        # Get or create tenant user profile
        from apps.tenants.models import TenantUserProfile
        profile, created = TenantUserProfile.objects.get_or_create(
            user=instance,
            defaults={'tenant_id': self._get_tenant_id(instance)}
        )
        
        # Update profile fields
        if 'display_name' in validated_data:
            profile.display_name = validated_data['display_name']
        if 'phone_number' in validated_data:
            profile.phone_number = validated_data['phone_number']
        if 'department' in validated_data:
            profile.department = validated_data['department']
        if 'employee_id' in validated_data:
            profile.employee_id = validated_data['employee_id']
        if 'role' in validated_data:
            profile.job_title = validated_data['role']
        if 'avatar' in validated_data:
            profile.profile_photo = validated_data['avatar']
        if 'profile_photo' in validated_data:
            profile.profile_photo = validated_data['profile_photo']
        
        profile.save()
        
        # Return the updated profile data using UserProfileSerializer
        from .serializers import UserProfileSerializer
        return UserProfileSerializer(instance).data
    
    def _get_tenant_id(self, user):
        """Get tenant ID for the user"""
        # Try to get from existing profile
        if hasattr(user, 'tenant_user_profile') and user.tenant_user_profile:
            return user.tenant_user_profile.tenant_id
        
        # Try to get from tenant by email
        from apps.tenants.models import Tenant
        tenant = Tenant.objects.filter(primary_contact_email=user.email).first()
        return tenant.id if tenant else None 
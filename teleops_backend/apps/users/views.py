from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import authenticate
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist
import logging

logger = logging.getLogger(__name__)

from .serializers import (
    LoginSerializer, LoginResponseSerializer, UserSerializer, 
    UserProfileSerializer, ChangePasswordSerializer, ForgotPasswordSerializer,
    ResetPasswordSerializer, OnboardingSerializer
)
from .models import User
from apps.tenants.serializers import TenantSerializer


class LoginView(TokenObtainPairView):
    """Custom login view with tenant context"""
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Get current tenant for the user
        current_tenant = self._get_current_tenant(user)
        
        # Generate tokens with tenant information
        refresh = RefreshToken.for_user(user)
        
        # Add tenant information to the access token
        if current_tenant:
            refresh.access_token['tenant_id'] = current_tenant['id']
            refresh.access_token['tenant_type'] = current_tenant['tenant_type']
        
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Prepare response data
        response_data = {
            'access': access_token,
            'refresh': refresh_token,
            'user': UserSerializer(user).data,
            'user_profile': UserProfileSerializer(user).data,
            'tenant_context': {
                'currentTenant': current_tenant,
                'accessibleCircles': self._get_accessible_circles(user),
                'primaryCircle': self._get_primary_circle(user),
                'corporateAccess': user.is_corporate_user,
                'crossCirclePermissions': self._get_cross_circle_permissions(user),
                'userPermissions': self._get_user_permissions(user),
                'user': UserSerializer(user).data,
                'userProfile': UserProfileSerializer(user).data,
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def _get_current_tenant(self, user):
        tenant = None
        if hasattr(user, 'tenant_user_profile') and user.tenant_user_profile:
            profile = user.tenant_user_profile
            from apps.tenants.models import Tenant
            try:
                tenant = Tenant.objects.get(id=profile.tenant_id, is_active=True)
            except Tenant.DoesNotExist:
                pass
        if tenant is None:
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.filter(primary_contact_email=user.email).first()
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

    def _get_accessible_circles(self, user):
        tenant = self._get_current_tenant(user)
        if tenant and tenant.get('tenant_type') == 'Corporate':
            from apps.tenants.models import Tenant as TenantModel
            circles = TenantModel.objects.filter(parent_tenant_id=tenant['id'], tenant_type='Circle', is_active=True)
            return [{
                'id': str(circle.id),
                'tenant_type': circle.tenant_type,
                'organization_name': circle.organization_name,
                'circle_code': getattr(circle, 'circle_code', None),
                'circle_name': getattr(circle, 'circle_name', None),
            } for circle in circles]
        return []

    def _get_primary_circle(self, user):
        tenant = self._get_current_tenant(user)
        if tenant and tenant.get('tenant_type') == 'Corporate':
            from apps.tenants.models import Tenant as TenantModel
            circle = TenantModel.objects.filter(parent_tenant_id=tenant['id'], tenant_type='Circle', is_active=True).first()
            if circle:
                return {
                    'id': str(circle.id),
                    'tenant_type': circle.tenant_type,
                    'organization_name': circle.organization_name,
                    'circle_code': getattr(circle, 'circle_code', None),
                    'circle_name': getattr(circle, 'circle_name', None),
                }
        return None
    
    def _get_cross_circle_permissions(self, user):
        """Get cross-circle permissions for corporate users"""
        if user.is_corporate_user:
            return [
                'circles.view',
                'circles.report',
                'circles.analytics',
                'circles.governance'
            ]
        return []
    
    def _get_user_permissions(self, user):
        """Get user permissions based on tenant type and role"""
        permissions = []
        
        if user.is_superuser:
            permissions.extend([
                'admin.all',
                'tenants.manage',
                'users.manage',
                'system.configure'
            ])
        elif user.is_corporate_user:
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
        elif user.is_circle_user:
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
        elif user.is_vendor_user:
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


class LogoutView(generics.GenericAPIView):
    """Logout view to invalidate tokens"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': 'Logout failed.'}, status=status.HTTP_400_BAD_REQUEST)


class TokenRefreshView(TokenRefreshView):
    """Custom token refresh view with tenant context preservation"""
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        # If refresh was successful, preserve tenant information in new token
        if response.status_code == 200:
            try:
                # Get the old token to extract tenant information
                refresh_token = request.data.get('refresh')
                if refresh_token:
                    old_token = RefreshToken(refresh_token)
                    old_access_token = old_token.access_token
                    
                    # Extract tenant information from old token
                    tenant_id = old_access_token.get('tenant_id')
                    tenant_type = old_access_token.get('tenant_type')
                    
                    # Add tenant information to new token
                    new_access_token = response.data.get('access')
                    if new_access_token and tenant_id:
                        # Decode the new token, add tenant info, and re-encode
                        from rest_framework_simplejwt.tokens import AccessToken
                        new_token = AccessToken(new_access_token)
                        new_token['tenant_id'] = tenant_id
                        new_token['tenant_type'] = tenant_type
                        response.data['access'] = str(new_token)
                        
            except Exception as e:
                # Log error but don't fail the refresh
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to preserve tenant context in token refresh: {e}")
        
        return response


class VerifyTokenView(generics.GenericAPIView):
    """Verify token and return user data"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        user = request.user
        # Use the helper to get the tenant object
        tenant = self._get_current_tenant(user)
        # Check if tenant exists and is active (for tenant users)
        if tenant and hasattr(tenant, 'is_active') and not tenant.is_active:
            return Response(
                {'detail': 'User tenant is inactive.'},
                status=status.HTTP_410_GONE
            )
        # Prepare response data
        response_data = {
            'user': UserSerializer(user).data,
            'user_profile': UserProfileSerializer(user).data,
            'tenant_context': {
                'currentTenant': TenantSerializer(tenant).data if tenant else None,
                'accessibleCircles': self._get_accessible_circles(user, tenant),
                'primaryCircle': self._get_primary_circle(user, tenant),
                'corporateAccess': getattr(user, 'is_corporate_user', False),
                'crossCirclePermissions': self._get_cross_circle_permissions(user),
                'userPermissions': self._get_user_permissions(user),
                'user': UserSerializer(user).data,
                'userProfile': UserProfileSerializer(user).data,
            }
        }
        return Response(response_data, status=status.HTTP_200_OK)
    
    def _get_current_tenant(self, user):
        # Try to get tenant from related profile
        if hasattr(user, 'tenant_user_profile') and user.tenant_user_profile:
            profile = user.tenant_user_profile
            from apps.tenants.models import Tenant
            try:
                tenant = Tenant.objects.get(id=profile.tenant_id, is_active=True)
                return tenant
            except Tenant.DoesNotExist:
                pass
        # Fallback: match email to primary_contact_email
        from apps.tenants.models import Tenant
        tenant = Tenant.objects.filter(primary_contact_email=user.email).first()
        return tenant
    
    def _get_accessible_circles(self, user, tenant=None):
        """Get accessible circles for corporate users"""
        if getattr(user, 'is_corporate_user', False) and tenant:
            circles = getattr(tenant, 'circle_children', []).filter(is_active=True) if hasattr(tenant, 'circle_children') else []
            return [{
                'id': str(circle.id),
                'tenant_type': circle.tenant_type,
                'organization_name': circle.organization_name,
                'circle_code': circle.circle_code,
                'circle_name': circle.circle_name,
            } for circle in circles]
        return []
    
    def _get_primary_circle(self, user, tenant=None):
        """Get primary circle for corporate users"""
        if getattr(user, 'is_corporate_user', False) and tenant:
            primary_circle = tenant.circle_children.filter(is_active=True).first() if hasattr(tenant, 'circle_children') else None
            if primary_circle:
                return {
                    'id': str(primary_circle.id),
                    'tenant_type': primary_circle.tenant_type,
                    'organization_name': primary_circle.organization_name,
                    'circle_code': primary_circle.circle_code,
                    'circle_name': primary_circle.circle_name,
                }
        return None
    
    def _get_cross_circle_permissions(self, user):
        """Get cross-circle permissions for corporate users"""
        if user.is_corporate_user:
            return [
                'circles.view',
                'circles.report',
                'circles.analytics',
                'circles.governance'
            ]
        return []
    
    def _get_user_permissions(self, user):
        """Get user permissions based on tenant type and role"""
        permissions = []
        
        if user.is_superuser:
            permissions.extend([
                'admin.all',
                'tenants.manage',
                'users.manage',
                'system.configure'
            ])
        elif user.is_corporate_user:
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
        elif user.is_circle_user:
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
        elif user.is_vendor_user:
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


class UserProfileView(generics.RetrieveUpdateAPIView):
    """User profile view"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            from .serializers import UserProfileUpdateSerializer
            return UserProfileUpdateSerializer
        return UserProfileSerializer
    
    def get_object(self):
        return self.request.user


class ChangePasswordView(generics.UpdateAPIView):
    """Change password view"""
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer
    
    def update(self, request, *args, **kwargs):
        user = request.user
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Change password
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """Forgot password view"""
    serializer = ForgotPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    email = serializer.validated_data['email']
    
    try:
        user = User.objects.get(email=email)
        # TODO: Implement password reset email sending
        # For now, just return success
        return Response(
            {'detail': 'Password reset email sent.'}, 
            status=status.HTTP_200_OK
        )
    except User.DoesNotExist:
        return Response(
            {'detail': 'No user found with this email address.'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password view"""
    serializer = ResetPasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    token = serializer.validated_data['token']
    new_password = serializer.validated_data['new_password']
    
    # TODO: Implement token validation and password reset
    # For now, just return success
    return Response(
        {'detail': 'Password reset successfully.'}, 
        status=status.HTTP_200_OK
    ) 


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email_and_set_password(request):
    """
    Verify email using the token and set the user's password and onboarding fields.
    POST body: { token, password, first_name, last_name, phone_number, department, designation, ... }
    """
    from apps.users.models import UserVerificationToken
    from apps.tenants.models import TenantUserProfile, Tenant
    serializer = OnboardingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    token = data['token']
    password = data['password']
    # Find token and user
    try:
        token_obj = UserVerificationToken.objects.select_related('user').get(token=token)
    except UserVerificationToken.DoesNotExist:
        return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)
    if token_obj.is_expired():
        return Response({'error': 'Token has expired or already used.'}, status=status.HTTP_400_BAD_REQUEST)
    user = token_obj.user
    # Set password and activate
    user.set_password(password)
    user.is_active = True
    user.is_verified = True
    user.first_name = data['first_name']
    user.last_name = data['last_name']
    user.save()
    token_obj.mark_used()
    
    # Create and activate the tenant now that email verification and profile setup is complete
    try:
        from apps.tenants.services.onboarding_service import OnboardingService
        onboarding_service = OnboardingService()
        
        # Get tenant (might exist from old flow)
        tenant = Tenant.objects.filter(primary_contact_email=user.email).first()
        
        # Check if tenant already exists (from old flow) or needs to be created (new flow)
        if tenant:
            # Old flow - just activate existing tenant
            from apps.tenants.services.tenant_service import TenantService
            tenant_service = TenantService()
            activated = tenant_service.activate_tenant_after_verification(str(tenant.id))
            if activated:
                logger.info(f"Existing tenant {tenant.organization_name} activated after user {user.email} completed verification")
        else:
            # New flow - create tenant after verification
            tenant = onboarding_service.create_tenant_after_verification(user.email)
            logger.info(f"New tenant {tenant.organization_name} created and activated after user {user.email} completed verification")
    except Exception as e:
        logger.error(f"Failed to create/activate tenant after verification for {user.email}: {e}", exc_info=True)
        # Don't fail the user verification if tenant creation/activation fails
        tenant = None
    
    # Now create or update tenant user profile (only if we have a tenant)
    if tenant:
        try:
            profile, _ = TenantUserProfile.objects.get_or_create(user=user, tenant=tenant)
            profile.phone_number = data['phone_number']
            profile.department = data['department']
            profile.job_title = data['designation']
            if 'employee_id' in data:
                profile.employee_id = data['employee_id']
            if 'profile_photo' in data and data['profile_photo']:
                profile.profile_photo = data['profile_photo']
            if 'reporting_manager' in data:
                profile.reporting_manager = data['reporting_manager']
            profile.save()
            logger.info(f"TenantUserProfile created for user {user.email} in tenant {tenant.organization_name}")
        except Exception as e:
            logger.error(f"Failed to create TenantUserProfile for {user.email}: {e}", exc_info=True)
            # Don't fail the verification if profile creation fails
        
        # Mark the invitation as completed now that tenant is created and user profile is set up
        try:
            from apps.tenants.models import TenantInvitation
            invitation = TenantInvitation.objects.filter(email=user.email, status='Accepted').first()
            if invitation:
                invitation.status = 'Completed'
                invitation.created_tenant_id = tenant.id
                invitation.save()
                logger.info(f"Marked invitation {invitation.id} as completed for tenant {tenant.organization_name}")
        except Exception as e:
            logger.error(f"Failed to mark invitation as completed for {user.email}: {e}", exc_info=True)
            # Don't fail the verification if invitation update fails
    
    return Response({'message': 'Email verified and onboarding complete. You can now log in.'}, status=status.HTTP_200_OK) 


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_verification_token(request):
    """
    Validate a verification token to check if it's valid and not already used.
    GET /auth/verify-email/validate/?token=TOKEN
    """
    from apps.users.models import UserVerificationToken
    
    token = request.GET.get('token')
    if not token:
        return Response({'error': 'Token is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        token_obj = UserVerificationToken.objects.select_related('user').get(token=token)
    except UserVerificationToken.DoesNotExist:
        return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check if token is expired or already used
    if token_obj.is_expired():
        if token_obj.is_used:
            return Response({'error': 'This verification link has already been used. Your account is already verified.'}, status=status.HTTP_410_GONE)
        else:
            return Response({'error': 'This verification link has expired. Please request a new one.'}, status=status.HTTP_410_GONE)
    
    # Check if user is already verified (active user with used token means verified)
    user = token_obj.user
    if user.is_active and token_obj.is_used:
        return Response({'error': 'Your account is already verified. You can log in directly.'}, status=status.HTTP_409_CONFLICT)
    
    # Token is valid and user needs verification
    return Response({
        'valid': True,
        'user_email': user.email,
        'user_name': f"{user.first_name} {user.last_name}".strip() or user.email.split('@')[0],
        'message': 'Token is valid. You can proceed with account setup.'
    }, status=status.HTTP_200_OK) 
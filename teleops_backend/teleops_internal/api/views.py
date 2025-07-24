# Standard library imports
import logging
from typing import Dict, Any

# Third-party imports
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import models

# Local imports
from ..exceptions import (
    TeleopsInternalException,
    InvalidCredentialsError,
    InternalProfileNotFoundError,
    InactiveAccountError,
    TenantManagementError,
    ProfileUpdateError,
    InsufficientPermissionsError
)
from ..services import (
    AuthService,
    ProfileService,
    TenantManagementService
)
from apps.tenants.services import InvitationService
from ..utils import (
    InternalAPIResponseBuilder,
    get_client_ip,
    extract_internal_user_context,
    validate_pagination_params,
    format_error_response
)
from ..validators import (
    AuthenticationValidator,
    InternalProfileValidator,
    TenantManagementValidator,
    FileUploadValidator,
    validate_uuid
)
from ..constants import MESSAGES
from .serializers import InternalUserLoginSerializer, InternalUserProfileSerializer

logger = logging.getLogger(__name__)


class InternalLoginView(APIView):
    """Consolidated internal authentication view"""
    permission_classes = [AllowAny]

    def __init__(self):
        super().__init__()
        self.auth_service = AuthService()
        self.auth_validator = AuthenticationValidator()

    def post(self, request):
        """Handle internal user login"""
        try:
            # Get client IP for logging
            client_ip = get_client_ip(request)
            
            # Validate input data
            self.auth_validator.validate_login_data(request.data)
            
            # Authenticate user using service
            user, profile, tokens = self.auth_service.authenticate_internal_user(
                email=request.data['email'],
                password=request.data['password']
            )
            
            # Serialize profile data
            profile_data = InternalUserProfileSerializer(profile).data
            
            # Log successful authentication
            logger.info(f"Internal user authenticated: {user.email} from {client_ip}")
            
            return InternalAPIResponseBuilder.success(
                data={
                    'access': tokens['access'],
                    'refresh': tokens['refresh'],
                    'user': profile_data,
                },
                message=MESSAGES['LOGIN_SUCCESS']
            )

        except ValidationError as e:
            return InternalAPIResponseBuilder.validation_error(e.message_dict if hasattr(e, 'message_dict') else {'error': str(e)})
        except InvalidCredentialsError:
            logger.warning(f"Authentication failed for {request.data.get('email', 'unknown')} from {get_client_ip(request)}")
            return InternalAPIResponseBuilder.unauthorized(MESSAGES['INVALID_CREDENTIALS'])
        except InactiveAccountError:
            return InternalAPIResponseBuilder.forbidden(MESSAGES['ACCOUNT_INACTIVE'])
        except InternalProfileNotFoundError:
            return InternalAPIResponseBuilder.not_found(MESSAGES['PROFILE_NOT_FOUND'])
        except TeleopsInternalException as e:
            logger.error(f"Authentication error: {e}")
            return InternalAPIResponseBuilder.error(str(e), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected authentication error: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalLogoutView(APIView):
    """Internal user logout"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.auth_service = AuthService()

    def post(self, request):
        """Handle internal user logout"""
        try:
            # Blacklist refresh token if provided
            refresh_token = request.data.get('refresh')
            self.auth_service.blacklist_token(refresh_token)
            
            logger.info(f"Internal user logged out: {request.user.email}")
            
            return InternalAPIResponseBuilder.success(
                message=MESSAGES['LOGOUT_SUCCESS']
            )

        except Exception as e:
            logger.error(f"Logout error for {request.user.email}: {e}")
            # Always return success for logout to avoid breaking client
            return InternalAPIResponseBuilder.success(
                message=MESSAGES['LOGOUT_SUCCESS']
            )


class InternalProfileView(APIView):
    """Internal profile management"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.profile_service = ProfileService()
        self.profile_validator = InternalProfileValidator()
        self.file_validator = FileUploadValidator()

    def get(self, request):
        """Get internal profile"""
        try:
            profile = self.profile_service.get_profile_by_user(request.user)
            serializer = InternalUserProfileSerializer(profile)
            
            return InternalAPIResponseBuilder.success(
                data=serializer.data,
                message=MESSAGES['PROFILE_RETRIEVED']
            )

        except InternalProfileNotFoundError:
            return InternalAPIResponseBuilder.not_found(MESSAGES['PROFILE_NOT_FOUND'])
        except Exception as e:
            logger.error(f"Error retrieving profile for {request.user.email}: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])

    def put(self, request):
        """Update internal profile"""
        try:
            # Validate profile data
            self.profile_validator.validate_profile_data(request.data)
            
            # Handle profile photo separately if present
            update_data = request.data.copy()
            if 'profile_photo' in request.FILES:
                self.file_validator.validate_profile_photo(request.FILES['profile_photo'])
                update_data['profile_photo'] = request.FILES['profile_photo']
            
            # Update profile using service
            profile = self.profile_service.update_profile(request.user, update_data)
            serializer = InternalUserProfileSerializer(profile)
            
            return InternalAPIResponseBuilder.success(
                data=serializer.data,
                message=MESSAGES['PROFILE_UPDATED']
            )

        except ValidationError as e:
            return InternalAPIResponseBuilder.validation_error(e.message_dict if hasattr(e, 'message_dict') else {'error': str(e)})
        except InternalProfileNotFoundError:
            return InternalAPIResponseBuilder.not_found(MESSAGES['PROFILE_NOT_FOUND'])
        except ProfileUpdateError as e:
            return InternalAPIResponseBuilder.error(str(e), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating profile for {request.user.email}: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalTenantListView(APIView):
    """Get all tenants (simplified for client-side filtering)"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.auth_service = AuthService()

    def get(self, request):
        """Get all tenants for client-side filtering"""
        try:
            # Check permissions
            permission_result = self.auth_service.check_permission(request.user, 'can_view_tenants')
            
            if not permission_result:
                logger.warning(f"Permission denied for user: {request.user}")
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            # Get all tenants using simplified service
            result = TenantManagementService.get_tenants_list()
            
            if result['success']:
                return InternalAPIResponseBuilder.success(data=result)
            else:
                return InternalAPIResponseBuilder.error(
                    result['message'], 
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except InsufficientPermissionsError:
            return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
        except Exception as e:
            logger.error(f"Error retrieving tenant list: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalTenantDetailView(APIView):
    """Get detailed tenant information"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.tenant_service = TenantManagementService()
        self.auth_service = AuthService()

    def get(self, request, pk):
        """Get detailed tenant information"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_view_tenants'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            # Validate UUID
            validate_uuid(pk)
            
            # Get tenant detail using service
            tenant_data = self.tenant_service.get_tenant_detail(pk)
            
            return InternalAPIResponseBuilder.success(data=tenant_data)

        except ValidationError:
            return InternalAPIResponseBuilder.error("Invalid tenant ID format", status_code=status.HTTP_400_BAD_REQUEST)
        except TenantManagementError as e:
            if "not found" in str(e).lower():
                return InternalAPIResponseBuilder.not_found(MESSAGES['TENANT_NOT_FOUND'])
            return InternalAPIResponseBuilder.error(str(e), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error retrieving tenant detail for {pk}: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalTenantUpdateView(APIView):
    """Update tenant information"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.tenant_service = TenantManagementService()
        self.auth_service = AuthService()
        self.tenant_validator = TenantManagementValidator()

    def put(self, request, pk):
        """Update tenant information"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_manage_tenants'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            # Validate UUID
            validate_uuid(pk)
            
            # Validate update data
            self.tenant_validator.validate_tenant_update_data(request.data)
            
            # Update tenant using service
            tenant_data = self.tenant_service.update_tenant(pk, request.data, request.user)
            
            return InternalAPIResponseBuilder.success(
                data=tenant_data,
                message=MESSAGES['TENANT_UPDATED']
            )

        except ValidationError as e:
            return InternalAPIResponseBuilder.validation_error(e.message_dict if hasattr(e, 'message_dict') else {'error': str(e)})
        except TenantManagementError as e:
            if "not found" in str(e).lower():
                return InternalAPIResponseBuilder.not_found(MESSAGES['TENANT_NOT_FOUND'])
            return InternalAPIResponseBuilder.error(str(e), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating tenant {pk}: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalTenantSuspendView(APIView):
    """Suspend tenant account"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.tenant_service = TenantManagementService()
        self.auth_service = AuthService()
        self.tenant_validator = TenantManagementValidator()

    def post(self, request, pk):
        """Suspend tenant account"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_suspend_tenants'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            # Validate UUID
            validate_uuid(pk)
            
            # Validate suspension data
            self.tenant_validator.validate_suspension_data(request.data)
            
            # Suspend tenant using service
            result = self.tenant_service.suspend_tenant(
                tenant_id=pk,
                reason=request.data.get('reason', 'No reason provided'),
                suspended_by=request.user
            )
            
            return InternalAPIResponseBuilder.success(
                data=result,
                message=MESSAGES['TENANT_SUSPENDED']
            )

        except ValidationError as e:
            return InternalAPIResponseBuilder.validation_error(e.message_dict if hasattr(e, 'message_dict') else {'error': str(e)})
        except TenantManagementError as e:
            if "not found" in str(e).lower():
                return InternalAPIResponseBuilder.not_found(MESSAGES['TENANT_NOT_FOUND'])
            elif "already suspended" in str(e).lower():
                return InternalAPIResponseBuilder.error(MESSAGES['TENANT_ALREADY_SUSPENDED'], status_code=status.HTTP_400_BAD_REQUEST)
            return InternalAPIResponseBuilder.error(str(e), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error suspending tenant {pk}: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalTenantReactivateView(APIView):
    """Reactivate suspended tenant"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.tenant_service = TenantManagementService()
        self.auth_service = AuthService()

    def post(self, request, pk):
        """Reactivate suspended tenant"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_suspend_tenants'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            # Validate UUID
            validate_uuid(pk)
            
            # Reactivate tenant using service
            result = self.tenant_service.reactivate_tenant(pk, request.user)
            
            return InternalAPIResponseBuilder.success(
                data=result,
                message=MESSAGES['TENANT_REACTIVATED']
            )

        except ValidationError:
            return InternalAPIResponseBuilder.error("Invalid tenant ID format", status_code=status.HTTP_400_BAD_REQUEST)
        except TenantManagementError as e:
            if "not found" in str(e).lower():
                return InternalAPIResponseBuilder.not_found(MESSAGES['TENANT_NOT_FOUND'])
            elif "can be reactivated" in str(e).lower():
                return InternalAPIResponseBuilder.error(MESSAGES['TENANT_CANNOT_REACTIVATE'], status_code=status.HTTP_400_BAD_REQUEST)
            return InternalAPIResponseBuilder.error(str(e), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error reactivating tenant {pk}: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalTenantCancelRejectionView(APIView):
    """Cancel tenant rejection"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.auth_service = AuthService()

    def post(self, request, pk):
        """Cancel rejection for a tenant"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_manage_tenants'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            # Validate UUID
            validate_uuid(pk)
            
            # Cancel rejection using service
            result = TenantManagementService.cancel_rejection(pk, request.user.email)
            
            return InternalAPIResponseBuilder.success(
                data=result,
                message=f"Rejection cancelled for tenant {result['organization_name']}"
            )

        except ValidationError:
            return InternalAPIResponseBuilder.error("Invalid tenant ID format", status_code=status.HTTP_400_BAD_REQUEST)
        except TenantManagementError as e:
            if "not found" in str(e).lower():
                return InternalAPIResponseBuilder.not_found(MESSAGES['TENANT_NOT_FOUND'])
            elif "Only rejected tenants" in str(e):
                return InternalAPIResponseBuilder.error(str(e), status_code=status.HTTP_400_BAD_REQUEST)
            return InternalAPIResponseBuilder.error(str(e), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error cancelling rejection for tenant {pk}: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalTenantUsersView(APIView):
    """Get tenant users"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.tenant_service = TenantManagementService()
        self.auth_service = AuthService()

    def get(self, request, pk):
        """Get list of users for a tenant"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_view_tenants'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            # Validate UUID
            validate_uuid(pk)
            
            # Get tenant users using service
            users_data = self.tenant_service.get_tenant_users(pk)
            
            return InternalAPIResponseBuilder.success(data={'users': users_data})

        except ValidationError:
            return InternalAPIResponseBuilder.error("Invalid tenant ID format", status_code=status.HTTP_400_BAD_REQUEST)
        except TenantManagementError as e:
            if "not found" in str(e).lower():
                return InternalAPIResponseBuilder.not_found(MESSAGES['TENANT_NOT_FOUND'])
            return InternalAPIResponseBuilder.error(str(e), status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error retrieving tenant users for {pk}: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalInvitationView(APIView):
    """API for managing tenant invitations from internal portal"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.invitation_service = InvitationService()

    def get(self, request):
        """List invitations with optional filtering"""
        try:
            from apps.tenants.models import TenantInvitation
            from apps.tenants.serializers import TenantInvitationSerializer
            
            # Auto-expire overdue invitations before loading the list
            expired_count = self.invitation_service.expire_overdue_invitations()
            if expired_count > 0:
                logger.info(f"Auto-expired {expired_count} overdue invitations during list load")
            
            # Get query parameters
            tenant_id = request.GET.get('tenant_id')
            status_filter = request.GET.get('status')
            
            # Build queryset
            queryset = TenantInvitation.objects.all()
            
            if tenant_id:
                # Filter by created_tenant (for invitations that resulted in this tenant)
                queryset = queryset.filter(created_tenant_id=tenant_id)
            
            if status_filter:
                if status_filter.lower() == 'active':
                    # Active invitations are those that are pending and not expired
                    queryset = queryset.filter(
                        status='pending',
                        expires_at__gt=timezone.now()
                    )
                else:
                    queryset = queryset.filter(status=status_filter)
            
            # Order by most recent
            queryset = queryset.order_by('-invited_at')
            
            # Serialize data
            serializer = TenantInvitationSerializer(queryset, many=True)
            
            return InternalAPIResponseBuilder.success(data={
                'results': serializer.data,
                'count': queryset.count()
            })
            
        except Exception as e:
            logger.error(f"Error fetching invitations: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])

    def post(self, request):
        """Create a new tenant invitation"""
        try:
            from apps.tenants.serializers import TenantInvitationSerializer
            
            # Debug: Log the incoming request data
            logger.info(f"🔍 Received invitation data: {request.data}")
            
            serializer = TenantInvitationSerializer(data=request.data, context={'request': request})
            if not serializer.is_valid():
                logger.error(f"❌ Serializer validation failed: {serializer.errors}")
                return InternalAPIResponseBuilder.validation_error(serializer.errors)

            # Debug: Log the validated data
            logger.info(f"✅ Validated data: {serializer.validated_data}")

            # Create invitation using service
            invitation = self.invitation_service.create_invitation(
                invitation_data=serializer.validated_data,
                invited_by=request.user
            )

            # Debug: Log the created invitation
            logger.info(f"📧 Created invitation: ID={invitation.id}, Email={invitation.email}, Org={invitation.organization_name}, Phone={invitation.contact_phone}")

            return InternalAPIResponseBuilder.success(data={
                'message': f'Invitation sent to {invitation.email}',
                'invitation_id': str(invitation.id),
                'invitation_token': invitation.invitation_token,
                'expires_at': invitation.expires_at
            })

        except Exception as e:
            logger.error(f"Error creating invitation: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalInvitationDetailView(APIView):
    """API for individual invitation operations (resend, cancel, delete)"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.invitation_service = InvitationService()

    def patch(self, request, invitation_id):
        """Cancel an invitation (changes status to Cancelled)"""
        try:
            cancelled = self.invitation_service.cancel_invitation(invitation_id)

            if cancelled:
                return InternalAPIResponseBuilder.success(data={'message': 'Invitation cancelled successfully'})
            else:
                return InternalAPIResponseBuilder.bad_request({'error': 'Failed to cancel invitation'})

        except Exception as e:
            logger.error(f"Error cancelling invitation: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])

    def delete(self, request, invitation_id):
        """Permanently delete a cancelled invitation"""
        try:
            deleted = self.invitation_service.delete_invitation(invitation_id)

            if deleted:
                return InternalAPIResponseBuilder.success(data={'message': 'Invitation deleted successfully'})
            else:
                return InternalAPIResponseBuilder.bad_request({'error': 'Failed to delete invitation'})

        except Exception as e:
            logger.error(f"Error deleting invitation: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])

    def post(self, request, invitation_id):
        """Resend an invitation or complete verification"""
        try:
            # Extract optional expires_at from request data
            expires_at = request.data.get('expires_at')
            if expires_at:
                # Parse the ISO date string to datetime
                from dateutil import parser
                expires_at = parser.parse(expires_at)
            
            # Resend invitation (for pending invitations only)
            invitation = self.invitation_service.resend_invitation(invitation_id, expires_at)

            return InternalAPIResponseBuilder.success(data={
                'message': f'Invitation resent to {invitation.email}',
                'invitation_id': str(invitation.id),
                'expires_at': invitation.expires_at
            })

        except Exception as e:
            logger.error(f"Error handling invitation action: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalEmailVerificationView(APIView):
    """API for getting email verification tokens from internal portal"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get email verification tokens for a tenant"""
        try:
            from apps.users.models import User, UserVerificationToken
            from apps.tenants.models import Tenant
            
            # Get query parameters
            tenant_id = request.GET.get('tenant_id')
            
            if not tenant_id:
                return InternalAPIResponseBuilder.validation_error({'tenant_id': 'This field is required.'})
            
            # Get the tenant
            try:
                tenant = Tenant.objects.get(id=tenant_id)
            except Tenant.DoesNotExist:
                return InternalAPIResponseBuilder.validation_error({'tenant_id': 'Tenant not found.'})
            
            # Find users associated with this tenant
            # Check primary contact email first
            user_emails = [tenant.primary_contact_email]
            if tenant.secondary_contact_email:
                user_emails.append(tenant.secondary_contact_email)
            if tenant.administrative_contact_email:
                user_emails.append(tenant.administrative_contact_email)
            
            # Get users by email
            users = User.objects.filter(email__in=user_emails)
            
            verification_tokens = []
            for user in users:
                # Get active (unused and not expired) verification tokens
                tokens = UserVerificationToken.objects.filter(
                    user=user,
                    is_used=False,
                    expires_at__gt=timezone.now()
                ).order_by('-created_at')
                
                for token in tokens:
                    verification_tokens.append({
                        'user_email': user.email,
                        'user_name': f"{user.first_name} {user.last_name}".strip() or user.email,
                        'verification_token': token.token,
                        'created_at': token.created_at,
                        'expires_at': token.expires_at,
                        'is_used': token.is_used
                    })
            
            return InternalAPIResponseBuilder.success(data={
                'results': verification_tokens,
                'count': len(verification_tokens),
                'tenant_id': str(tenant.id),
                'tenant_name': tenant.organization_name
            })
            
        except Exception as e:
            logger.error(f"Error fetching verification tokens: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalDashboardView(APIView):
    """Dashboard analytics"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.auth_service = AuthService()

    def get(self, request):
        """Get dashboard analytics"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_view_analytics'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            # Calculate platform metrics
            from ..utils import calculate_platform_metrics
            metrics = calculate_platform_metrics()
            
            return InternalAPIResponseBuilder.success(data=metrics)

        except Exception as e:
            logger.error(f"Error retrieving dashboard analytics: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalInvitationResendVerificationView(APIView):
    """API for resending email verification for accepted invitations"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.invitation_service = InvitationService()

    def post(self, request, invitation_id):
        """Resend email verification for an accepted invitation"""
        try:
            from apps.tenants.models import TenantInvitation
            from apps.users.models import User, UserVerificationToken
            from apps.tenants.services.email_service import EmailService
            
            # Get the invitation
            try:
                invitation = TenantInvitation.objects.get(id=invitation_id)
            except TenantInvitation.DoesNotExist:
                return InternalAPIResponseBuilder.validation_error({'invitation_id': 'Invitation not found.'})
            
            if invitation.status != 'Accepted':
                return InternalAPIResponseBuilder.bad_request({'error': 'Email verification can only be resent for accepted invitations.'})
            
            # Find the user associated with this invitation
            try:
                user = User.objects.get(email=invitation.email)
            except User.DoesNotExist:
                return InternalAPIResponseBuilder.bad_request({'error': 'User not found for this invitation.'})
            
            # Generate or get existing verification token
            token_obj = UserVerificationToken.generate_token(user, expiry_hours=24)
            
            # Send verification email
            email_service = EmailService()
            try:
                email_service.send_user_verification_email(user, token_obj.token)
                logger.info(f"Email verification resent to {user.email}")
                
                return InternalAPIResponseBuilder.success(data={
                    'message': f'Email verification resent to {invitation.email}',
                    'user_email': user.email,
                    'token_expires_at': token_obj.expires_at
                })
                
            except Exception as email_error:
                logger.error(f"Failed to send verification email: {email_error}")
                return InternalAPIResponseBuilder.server_error({'error': 'Failed to send verification email'})
            
        except Exception as e:
            logger.error(f"Error resending email verification: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalInvitationVerificationTokenView(APIView):
    """API for getting email verification token for a specific invitation"""
    permission_classes = [IsAuthenticated]

    def get(self, request, invitation_id):
        """Get email verification token for an accepted invitation"""
        try:
            from apps.tenants.models import TenantInvitation
            from apps.users.models import User, UserVerificationToken
            
            # Get the invitation
            try:
                invitation = TenantInvitation.objects.get(id=invitation_id)
            except TenantInvitation.DoesNotExist:
                return InternalAPIResponseBuilder.validation_error({'invitation_id': 'Invitation not found.'})
            
            if invitation.status != 'Accepted':
                return InternalAPIResponseBuilder.bad_request({'error': 'Email verification token is only available for accepted invitations.'})
            
            # Find the user associated with this invitation
            try:
                user = User.objects.get(email=invitation.email)
            except User.DoesNotExist:
                return InternalAPIResponseBuilder.bad_request({'error': 'User not found for this invitation.'})
            
            # Get the most recent active verification token
            token = UserVerificationToken.objects.filter(
                user=user,
                is_used=False,
                expires_at__gt=timezone.now()
            ).order_by('-created_at').first()
            
            if not token:
                return InternalAPIResponseBuilder.bad_request({'error': 'No active verification token found. Please resend verification email first.'})
            
            return InternalAPIResponseBuilder.success(data={
                'token': token.token,
                'user_email': user.email,
                'created_at': token.created_at,
                'expires_at': token.expires_at,
                'invitation_id': str(invitation.id)
            })
            
        except Exception as e:
            logger.error(f"Error getting verification token: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalInvitationRevokeCancellationView(APIView):
    """Revoke cancellation of an invitation"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.auth_service = AuthService()

    def post(self, request, invitation_id):
        """Revoke cancellation for an invitation"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_manage_tenants'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            # Validate UUID
            validate_uuid(invitation_id)
            
            from apps.tenants.services import InvitationService
            invitation_service = InvitationService()
            
            # Revoke cancellation using service
            result = invitation_service.revoke_cancellation(invitation_id)
            
            if result:
                return InternalAPIResponseBuilder.success(
                    data={'revoked': True, 'invitation_id': invitation_id},
                    message="Invitation cancellation revoked successfully"
                )
            else:
                return InternalAPIResponseBuilder.error("Failed to revoke cancellation", status_code=status.HTTP_400_BAD_REQUEST)

        except ValidationError:
            return InternalAPIResponseBuilder.error("Invalid invitation ID format", status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            from apps.tenants.exceptions import InvalidInvitationTokenError
            if isinstance(e, InvalidInvitationTokenError):
                if "not found" in str(e).lower():
                    return InternalAPIResponseBuilder.not_found("Invitation not found")
                else:
                    return InternalAPIResponseBuilder.error(str(e), status_code=status.HTTP_400_BAD_REQUEST)
            
            logger.error(f"Error revoking cancellation for invitation {invitation_id}: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalInvitationExpireOverdueView(APIView):
    """Expire overdue invitations"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.auth_service = AuthService()

    def post(self, request):
        """Expire all overdue invitations"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_manage_tenants'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            from apps.tenants.services import InvitationService
            invitation_service = InvitationService()
            
            # Expire overdue invitations
            expired_count = invitation_service.expire_overdue_invitations()
            
            return InternalAPIResponseBuilder.success(
                data={'expired_count': expired_count},
                message=f"Expired {expired_count} overdue invitations"
            )

        except Exception as e:
            logger.error(f"Error expiring overdue invitations: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalInvitationResendExpiredView(APIView):
    """Resend an expired invitation"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.auth_service = AuthService()

    def post(self, request, invitation_id):
        """Resend an expired invitation"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_manage_tenants'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            # Validate UUID
            validate_uuid(invitation_id)
            
            from apps.tenants.services import InvitationService
            invitation_service = InvitationService()
            
            # Get optional new expiry from request
            expires_at = request.data.get('expires_at')
            if expires_at:
                from datetime import datetime
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            
            # Resend expired invitation
            result = invitation_service.resend_expired_invitation(invitation_id, expires_at)
            
            if result:
                return InternalAPIResponseBuilder.success(
                    data={'resent': True, 'invitation_id': invitation_id},
                    message="Expired invitation has been reactivated and resent"
                )
            else:
                return InternalAPIResponseBuilder.error("Failed to resend expired invitation", status_code=status.HTTP_400_BAD_REQUEST)

        except ValidationError:
            return InternalAPIResponseBuilder.error("Invalid invitation ID format", status_code=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            from apps.tenants.exceptions import InvalidInvitationTokenError
            if isinstance(e, InvalidInvitationTokenError):
                if "not found" in str(e).lower():
                    return InternalAPIResponseBuilder.not_found("Invitation not found")
                else:
                    return InternalAPIResponseBuilder.error(str(e), status_code=status.HTTP_400_BAD_REQUEST)
            
            logger.error(f"Error resending expired invitation {invitation_id}: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])


class InternalCircleManagementView(APIView):
    """API for corporate tenant circle management"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.auth_service = AuthService()
        self.tenant_service = TenantManagementService()

    def get(self, request, corporate_id=None):
        """Get circles under a corporate tenant"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_view_tenants'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            if corporate_id:
                # Get specific corporate tenant's circles
                return self._get_corporate_circles(corporate_id)
            else:
                # Get all corporate tenants with their circles
                return self._get_all_corporate_circles()

        except Exception as e:
            logger.error(f"Error in circle management view: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error(MESSAGES['INTERNAL_ERROR'])

    def _get_corporate_circles(self, corporate_id):
        """Get circles for a specific corporate tenant"""
        try:
            from apps.tenants.models import Tenant
            
            # Validate corporate tenant
            try:
                corporate = Tenant.objects.get(id=corporate_id, tenant_type='Corporate')
            except Tenant.DoesNotExist:
                return InternalAPIResponseBuilder.not_found("Corporate tenant not found")
            
            # Get all circles under this corporate
            circles = Tenant.objects.filter(
                parent_tenant=corporate,
                tenant_type='Circle'
            ).select_related('circle').order_by('organization_name')
            
            # Build circle data with metrics
            circle_data = []
            total_monthly_revenue = 0
            total_projects = 0
            total_sites = 0
            
            for circle in circles:
                circle_info = self._build_circle_info(circle)
                circle_data.append(circle_info)
                
                # Aggregate metrics
                total_monthly_revenue += circle_info['metrics']['monthly_revenue']
                total_projects += circle_info['performance']['projects_completed']
                total_sites += circle_info['performance']['sites_dismantled']
            
            # Calculate corporate overview metrics
            corporate_metrics = {
                'total_circles': len(circle_data),
                'active_circles': len([c for c in circle_data if c['status'] == 'Active']),
                'total_monthly_revenue': total_monthly_revenue,
                'total_projects': total_projects,
                'total_sites': total_sites,
                'average_efficiency': sum(c['performance']['efficiency_score'] for c in circle_data if c['status'] == 'Active') / max(1, len([c for c in circle_data if c['status'] == 'Active']))
            }
            
            return InternalAPIResponseBuilder.success(data={
                'corporate': {
                    'id': str(corporate.id),
                    'organization_name': corporate.organization_name,
                    'primary_contact_name': corporate.primary_contact_name,
                    'primary_contact_email': corporate.primary_contact_email,
                },
                'circles': circle_data,
                'corporate_metrics': corporate_metrics
            })
            
        except Exception as e:
            logger.error(f"Error getting corporate circles for {corporate_id}: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error("Failed to retrieve circle data")

    def _get_all_corporate_circles(self):
        """Get all corporate tenants with their circle counts"""
        try:
            from apps.tenants.models import Tenant
            from django.db.models import Count
            
            corporates = Tenant.objects.filter(
                tenant_type='Corporate'
            ).annotate(
                circle_count=Count('child_tenants', filter=models.Q(child_tenants__tenant_type='Circle'))
            ).order_by('organization_name')
            
            corporate_data = []
            for corporate in corporates:
                corporate_data.append({
                    'id': str(corporate.id),
                    'organization_name': corporate.organization_name,
                    'circle_count': corporate.circle_count,
                    'activation_status': corporate.activation_status,
                    'registration_status': corporate.registration_status,
                    'primary_contact_name': corporate.primary_contact_name,
                    'primary_contact_email': corporate.primary_contact_email,
                    'created_at': corporate.created_at.isoformat() if corporate.created_at else None,
                })
            
            return InternalAPIResponseBuilder.success(data={
                'corporates': corporate_data,
                'total_count': len(corporate_data)
            })
            
        except Exception as e:
            logger.error(f"Error getting all corporate circles: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error("Failed to retrieve corporate data")

    def _build_circle_info(self, circle):
        """Build detailed circle information with mock performance data"""
        import random
        from datetime import datetime, timedelta
        
        # Mock performance data (replace with real data when available)
        base_projects = random.randint(30, 60)
        base_sites = random.randint(200, 400)
        base_revenue = random.randint(1200000, 2000000)
        efficiency = random.randint(85, 95)
        
        return {
            'id': str(circle.id),
            'name': circle.organization_name,
            'circle_code': circle.circle_code or 'N/A',
            'circle_name': circle.circle_name or 'N/A',
            'status': 'Active' if circle.is_active else 'Inactive',
            'activation_date': circle.activated_at.isoformat() if circle.activated_at else None,
            'primary_contact': circle.primary_contact_name,
            'email': circle.primary_contact_email,
            'phone': circle.primary_contact_phone,
            'performance': {
                'projects_completed': base_projects,
                'sites_dismantled': base_sites,
                'equipment_recovered': round(random.uniform(10, 20), 1),
                'efficiency_score': efficiency,
            },
            'metrics': {
                'monthly_revenue': base_revenue,
                'active_projects': random.randint(5, 15),
                'vendor_count': random.randint(8, 15),
                'compliance_score': random.randint(90, 98),
            }
        }


class InternalCircleInvitationView(APIView):
    """API for sending circle invitations from corporate tenants"""
    permission_classes = [IsAuthenticated]

    def __init__(self):
        super().__init__()
        self.auth_service = AuthService()
        self.invitation_service = InvitationService()

    def post(self, request):
        """Send circle invitation"""
        try:
            # Check permissions
            if not self.auth_service.check_permission(request.user, 'can_manage_tenants'):
                return InternalAPIResponseBuilder.forbidden(MESSAGES['INSUFFICIENT_PERMISSIONS'])
            
            # Validate required fields
            required_fields = ['circle_name', 'circle_code', 'primary_contact_name', 'contact_email', 'contact_phone']
            for field in required_fields:
                if not request.data.get(field):
                    return InternalAPIResponseBuilder.validation_error({field: 'This field is required.'})
            
            # Build invitation data for circle tenant
            invitation_data = {
                'email': request.data['contact_email'],
                'contact_name': request.data['primary_contact_name'],
                'tenant_type': 'Circle',
                'organization_name': request.data['circle_name'],
                'contact_phone': request.data['contact_phone'],
                'notes': f"Circle invitation for {request.data['circle_name']} ({request.data['circle_code']})"
            }
            
            # Create invitation
            invitation = self.invitation_service.create_invitation(
                invitation_data=invitation_data,
                invited_by=request.user
            )
            
            return InternalAPIResponseBuilder.success(data={
                'message': f'Circle invitation sent to {invitation.email}',
                'invitation_id': str(invitation.id),
                'circle_name': request.data['circle_name'],
                'circle_code': request.data['circle_code'],
                'expires_at': invitation.expires_at
            })
            
        except Exception as e:
            logger.error(f"Error sending circle invitation: {e}", exc_info=True)
            return InternalAPIResponseBuilder.server_error("Failed to send circle invitation")

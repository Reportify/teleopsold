"""
Onboarding service for tenant onboarding workflows
"""

import logging
from typing import Dict, Any
from django.db import transaction
import json

from apps.users.models import User, UserVerificationToken
from ..models import TenantInvitation
from ..exceptions import (
    OnboardingError,
    InvalidInvitationTokenError,
    EmailDeliveryError
)
from .tenant_service import TenantService
from .invitation_service import InvitationService
from .email_service import EmailService

logger = logging.getLogger(__name__)


class OnboardingService:
    """Service for handling tenant onboarding workflows"""
    
    def __init__(self):
        self.tenant_service = TenantService()
        self.invitation_service = InvitationService()
        self.email_service = EmailService()
    
    def complete_onboarding(self, invitation_token: str, onboarding_data: Dict[str, Any]):
        """
        Complete tenant onboarding from invitation - Accept invitation and send verification email
        Tenant creation is deferred until email verification is completed
        
        Args:
            invitation_token: Invitation token string
            onboarding_data: Dictionary containing onboarding details
            
        Returns:
            Dict: Response with user and verification info
            
        Raises:
            OnboardingError: If onboarding fails
            InvalidInvitationTokenError: If invitation is invalid
        """
        try:
            with transaction.atomic():
                # Get and validate invitation
                invitation = self.invitation_service.get_invitation_by_token(invitation_token)
                
                # For circle tenants, merge circle data from invitation with onboarding data
                if invitation.tenant_type == 'Circle' and invitation.notes and 'Circle Data:' in invitation.notes:
                    try:
                        # Extract circle data from existing notes
                        circle_data_str = invitation.notes.split('Circle Data: ')[1]
                        circle_data = json.loads(circle_data_str)
                        
                        # Merge circle data into onboarding data
                        onboarding_data.update({
                            'circle_id': circle_data.get('circle_id'),
                            'circle_code': circle_data.get('circle_code'),
                            'parent_tenant_id': circle_data.get('parent_tenant_id'),
                            'parent_subdomain': circle_data.get('parent_subdomain'),
                            'invitation_type': circle_data.get('invitation_type'),
                        })
                    except (IndexError, json.JSONDecodeError) as e:
                        logger.warning(f"Failed to parse circle data from invitation notes: {e}")
                
                # Store onboarding data in invitation for later tenant creation
                invitation.notes = self._serialize_onboarding_data(onboarding_data)
                invitation.save()
                
                # Create user and verification token
                user, token_obj = self._create_user_for_invitation(invitation)
                
                # Send verification email
                self.email_service.send_verification_email(user, token_obj)
                
                # Mark invitation as accepted (but tenant not created yet)
                self.invitation_service.mark_invitation_accepted(invitation, created_tenant=None)
                
                logger.info(f"Invitation accepted for {invitation.email}. Tenant will be created after email verification.")
                return {
                    'user_id': user.id,
                    'email': user.email,
                    'verification_sent': True,
                    'message': 'Please check your email to verify your account and complete setup.'
                }
                
        except Exception as e:
            logger.error(f"Onboarding failed for token {invitation_token}: {e}", exc_info=True)
            raise OnboardingError(f"Onboarding failed: {str(e)}")
    
    def create_tenant_after_verification(self, user_email: str) -> 'Tenant':
        """
        Create tenant after user email verification is completed
        
        Args:
            user_email: Email of the verified user
            
        Returns:
            Tenant: Created tenant instance
            
        Raises:
            OnboardingError: If tenant creation fails
        """
        try:
            with transaction.atomic():
                # Find the accepted invitation for this user
                invitation = TenantInvitation.objects.filter(
                    email=user_email,
                    status='Accepted'
                ).first()
                
                if not invitation:
                    raise OnboardingError(f"No accepted invitation found for {user_email}")
                
                # Deserialize onboarding data
                onboarding_data = self._deserialize_onboarding_data(invitation.notes)
                
                # Create tenant based on type
                tenant = self._create_tenant_by_type(invitation, onboarding_data)
                
                # Create initial user profile for the invited user (administrator)
                self._create_initial_user_profile(invitation, tenant)
                
                # Update invitation with created tenant
                invitation.created_tenant = tenant
                invitation.save()
                
                # Send confirmation email
                self.email_service.send_onboarding_confirmation_email(tenant)
                
                logger.info(f"Tenant created after verification: {tenant.organization_name}")
                return tenant
                
        except Exception as e:
            logger.error(f"Failed to create tenant after verification for {user_email}: {e}", exc_info=True)
            raise OnboardingError(f"Failed to create tenant: {str(e)}")
    
    def _create_tenant_by_type(self, invitation: TenantInvitation, onboarding_data: Dict[str, Any]):
        """Create tenant based on invitation type"""
        if invitation.tenant_type == 'Corporate':
            return self._create_corporate_with_circles(onboarding_data)
        elif invitation.tenant_type == 'Circle':
            return self._create_circle_tenant(onboarding_data)
        elif invitation.tenant_type == 'Vendor':
            return self._create_vendor_tenant(onboarding_data)
        else:
            raise OnboardingError(f"Unknown tenant type: {invitation.tenant_type}")
    
    def _create_corporate_with_circles(self, onboarding_data: Dict[str, Any]):
        """Create corporate tenant with optional circles"""
        circles = onboarding_data.get('circles', [])
        return self.tenant_service.create_corporate_tenant(onboarding_data, circles)
    
    def _create_circle_tenant(self, onboarding_data: Dict[str, Any]):
        """Create circle tenant"""
        parent_tenant_id = onboarding_data['parent_tenant_id']
        # Extract circle code from subdomain or use provided circle_code
        circle_code = onboarding_data.get('circle_code', 'CIRCLE')
        return self.tenant_service.create_circle_tenant(parent_tenant_id, circle_code, onboarding_data)
    
    def _create_vendor_tenant(self, onboarding_data: Dict[str, Any]):
        """Create vendor tenant"""
        return self.tenant_service.create_vendor_tenant(onboarding_data)
    
    def _get_or_create_user_without_password(self, email, **user_data):
        """Create or get user without requiring password during onboarding"""
        try:
            # Try to get existing user first
            user = User.objects.get(email=email)
            logger.info(f"Found existing user for {email}")
            return user, False
        except User.DoesNotExist:
            # Create new user with unusable password
            user = User(email=email, **user_data)
            user.set_unusable_password()  # This sets password to unusable state
            user.save()
            logger.info(f"Created new user for {email} with unusable password")
            return user, True
    
    def _create_user_and_verification(self, tenant):
        """Create user and verification token for tenant primary contact"""
        try:
            # Create or get user - use the manager method to handle password properly
            user, created = self._get_or_create_user_without_password(
                email=tenant.primary_contact_email,
                first_name=tenant.primary_contact_name.split()[0] if tenant.primary_contact_name else '',
                last_name=' '.join(tenant.primary_contact_name.split()[1:]) if len(tenant.primary_contact_name.split()) > 1 else '',
                user_type='tenant',
                is_active=False,
            )
            
            if not created:
                # Update existing user to be inactive during re-onboarding
                user.is_active = False
                user.save()
            
            # Generate verification token
            token_obj = UserVerificationToken.generate_token(user, expiry_hours=24)
            
            logger.info(f"User and verification token created for {user.email}")
            return user, token_obj
            
        except Exception as e:
            logger.error(f"Failed to create user and verification: {e}", exc_info=True)
            raise OnboardingError(f"Failed to create user verification: {str(e)}")
    
    def _create_user_for_invitation(self, invitation):
        """Create user and verification token for invitation"""
        try:
            # Create or get user - use the manager method to handle password properly
            user, created = self._get_or_create_user_without_password(
                email=invitation.email,
                first_name=invitation.contact_name.split()[0] if invitation.contact_name else '',
                last_name=' '.join(invitation.contact_name.split()[1:]) if len(invitation.contact_name.split()) > 1 else '',
                user_type='tenant',
                is_active=False,
            )
            
            if not created:
                # Update existing user to be inactive during re-onboarding
                user.is_active = False
                user.save()
            
            # Generate verification token
            token_obj = UserVerificationToken.generate_token(user, expiry_hours=24)
            
            logger.info(f"User and verification token created for {user.email}")
            return user, token_obj
            
        except Exception as e:
            logger.error(f"Failed to create user for invitation: {e}", exc_info=True)
            raise OnboardingError(f"Failed to create user verification: {str(e)}")
    
    def _serialize_onboarding_data(self, onboarding_data: Dict[str, Any]) -> str:
        """Serialize onboarding data to JSON string"""
        try:
            return json.dumps(onboarding_data)
        except Exception as e:
            logger.error(f"Failed to serialize onboarding data: {e}")
            return "{}"
    
    def _deserialize_onboarding_data(self, notes: str) -> Dict[str, Any]:
        """Deserialize onboarding data from JSON string"""
        try:
            if not notes:
                return {}
            return json.loads(notes)
        except Exception as e:
            logger.error(f"Failed to deserialize onboarding data: {e}")
            return {}
    
    def get_onboarding_status(self, invitation_id: str) -> Dict[str, Any]:
        """
        Get onboarding status by invitation ID
        
        Args:
            invitation_id: UUID of the invitation
            
        Returns:
            Dict containing onboarding status information
        """
        try:
            invitation = TenantInvitation.objects.get(id=invitation_id)
            
            return {
                "email": invitation.email,
                "contact_name": invitation.contact_name,
                "tenant_type": invitation.tenant_type,
                "status": invitation.status,
                "organization_name": invitation.created_tenant.organization_name if invitation.created_tenant else None,
                "accepted_at": invitation.accepted_at,
                "invited_at": invitation.invited_at,
            }
            
        except TenantInvitation.DoesNotExist:
            raise InvalidInvitationTokenError("Invitation not found")
    
    def get_invitation_details(self, invitation_token: str) -> Dict[str, Any]:
        """
        Get invitation details for public access
        
        Args:
            invitation_token: Invitation token string
            
        Returns:
            Dict containing invitation details
        """
        invitation = self.invitation_service.get_invitation_by_token(invitation_token)
        
        result = {
            "email": invitation.email,
            "contact_name": invitation.contact_name,
            "tenant_type": invitation.tenant_type,
            "invited_at": invitation.invited_at,
            "expires_at": invitation.expires_at,
            "status": invitation.status,
            "organization_name": invitation.organization_name,
        }
        
        # For circle tenants, extract circle information from notes
        if invitation.tenant_type == 'Circle' and invitation.notes and 'Circle Data:' in invitation.notes:
            try:
                import json
                circle_data_str = invitation.notes.split('Circle Data: ')[1]
                circle_data = json.loads(circle_data_str)
                
                # Get parent subdomain - if not in circle_data, try to fetch from parent tenant
                parent_subdomain = circle_data.get('parent_subdomain')
                parent_tenant_id = circle_data.get('parent_tenant_id')
                
                if not parent_subdomain and parent_tenant_id:
                    try:
                        from ..models import Tenant
                        parent_tenant = Tenant.objects.get(id=parent_tenant_id)
                        parent_subdomain = parent_tenant.subdomain
                    except Tenant.DoesNotExist:
                        pass
                
                result.update({
                    "circle_id": circle_data.get('circle_id'),
                    "circle_code": circle_data.get('circle_code'),
                    "parent_tenant_id": parent_tenant_id,
                    "parent_subdomain": parent_subdomain,
                    "invitation_type": circle_data.get('invitation_type'),
                })
            except (IndexError, json.JSONDecodeError) as e:
                # Log error but don't fail the request
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to parse circle data from invitation notes: {e}")
        
        return result 

    def _create_initial_user_profile(self, invitation: TenantInvitation, tenant: 'Tenant'):
        """
        Create initial user profile for the invited user with Administrator role
        
        Args:
            invitation: The tenant invitation
            tenant: The created tenant
        """
        try:
            from django.contrib.auth import get_user_model
            from ..models import TenantUserProfile, TenantDesignation, TenantDepartment, UserDesignationAssignment
            
            User = get_user_model()
            
            # Get the user
            user = User.objects.get(email=invitation.email)
            
            # Create default 'Administration' department if it doesn't exist
            admin_dept, created = TenantDepartment.objects.get_or_create(
                tenant=tenant,
                department_code='ADMIN',
                defaults={
                    'department_name': 'Administration',
                    'description': 'Administrative department for system management',
                    'department_level': 1,
                    'is_system_department': True,
                    'can_manage_users': True,
                    'can_create_projects': True,
                    'can_assign_tasks': True,
                    'can_approve_expenses': True,
                    'can_access_reports': True,
                }
            )
            
            # Create default 'Administrator' designation if it doesn't exist
            admin_designation, created = TenantDesignation.objects.get_or_create(
                tenant=tenant,
                designation_code='ADMIN',
                defaults={
                    'designation_name': 'Administrator',
                    'description': 'System Administrator with full access rights',
                    'designation_level': 1,
                    'department': admin_dept,
                    'designation_type': 'non_field',
                    'is_system_role': True,
                    'can_manage_users': True,
                    'can_create_projects': True,
                    'can_assign_tasks': True,
                    'can_approve_expenses': True,
                    'can_access_reports': True,
                    'permissions': ['*'],  # Full permissions
                    'feature_access': {'all': True},
                    'data_access_level': 'Admin',
                }
            )
            
            # Create TenantUserProfile for the invited user
            user_profile, created = TenantUserProfile.objects.get_or_create(
                user=user,
                tenant=tenant,
                defaults={
                    'display_name': invitation.contact_name,
                    'job_title': 'Administrator',
                    'department': admin_dept.department_name,
                    'employment_type': 'Full-time',
                    'is_active': True,
                }
            )
            
            # Assign Administrator designation to the user
            UserDesignationAssignment.objects.get_or_create(
                user_profile=user_profile,
                designation=admin_designation,
                defaults={
                    'is_primary_designation': True,
                    'assignment_reason': 'Initial setup - invited user',
                    'assignment_status': 'Active',
                    'is_active': True,
                    'assigned_by': user,  # Self-assigned during setup
                }
            )
            
            logger.info(f"Initial user profile created for {user.email} as Administrator")
            
        except Exception as e:
            logger.error(f"Failed to create initial user profile: {e}", exc_info=True)
            raise OnboardingError(f"Failed to create initial user profile: {str(e)}") 
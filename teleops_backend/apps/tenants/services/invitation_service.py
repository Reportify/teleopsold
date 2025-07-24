"""
Invitation service for tenant invitation management
"""

import logging
from typing import Optional, Dict, Any
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from ..models import TenantInvitation
from ..exceptions import (
    InvalidInvitationTokenError, 
    InvitationAlreadyAcceptedError,
    EmailDeliveryError
)
from .email_service import EmailService

logger = logging.getLogger(__name__)


class InvitationService:
    """Service for managing tenant invitations"""
    
    def __init__(self):
        self.email_service = EmailService()
    
    def create_invitation(self, invitation_data: Dict[str, Any], invited_by) -> TenantInvitation:
        """
        Create a new tenant invitation
        
        Args:
            invitation_data: Dictionary containing invitation details
            invited_by: User creating the invitation
            
        Returns:
            TenantInvitation: Created invitation instance
            
        Raises:
            EmailDeliveryError: If email sending fails
        """
        try:
            with transaction.atomic():
                # Set expiry if not provided
                expires_at = invitation_data.get('expires_at')
                if not expires_at:
                    expires_at = timezone.now() + timedelta(days=1)
                
                # Create invitation
                invitation = TenantInvitation.objects.create(
                    email=invitation_data['email'],
                    contact_name=invitation_data['contact_name'],
                    tenant_type=invitation_data['tenant_type'],
                    organization_name=invitation_data.get('organization_name', ''),
                    contact_phone=invitation_data.get('contact_phone', ''),
                    notes=invitation_data.get('notes', ''),
                    expires_at=expires_at,
                    invited_by=invited_by
                )
                
                # Send invitation email
                self.email_service.send_invitation_email(invitation)
                
                logger.info(f"Invitation created and sent to {invitation.email} by {invited_by.email}")
                return invitation
                
        except Exception as e:
            logger.error(f"Failed to create invitation for {invitation_data.get('email')}: {e}", exc_info=True)
            raise
    
    def resend_invitation(self, invitation_id: str, expires_at: Optional[timezone.datetime] = None) -> TenantInvitation:
        """
        Resend an existing invitation
        
        Args:
            invitation_id: UUID of the invitation
            expires_at: Optional new expiry date
            
        Returns:
            TenantInvitation: Updated invitation instance
            
        Raises:
            InvalidInvitationTokenError: If invitation not found or invalid
            EmailDeliveryError: If email sending fails
        """
        try:
            invitation = TenantInvitation.objects.get(pk=invitation_id)
            
            if invitation.status not in ['Pending', 'Expired']:
                raise InvalidInvitationTokenError("Only pending or expired invitations can be resent")
            
            # Update expiry if provided
            if expires_at:
                invitation.expires_at = expires_at
            elif invitation.is_expired:
                # Extend expiry for expired invitations
                invitation.expires_at = timezone.now() + timedelta(days=1)
            
            invitation.save()
            
            # Resend email
            self.email_service.send_invitation_email(invitation)
            
            logger.info(f"Invitation resent to {invitation.email}")
            return invitation
            
        except TenantInvitation.DoesNotExist:
            raise InvalidInvitationTokenError("Invitation not found")
        except Exception as e:
            logger.error(f"Failed to resend invitation {invitation_id}: {e}", exc_info=True)
            raise
    
    def cancel_invitation(self, invitation_id: str) -> bool:
        """
        Cancel an existing invitation
        
        Args:
            invitation_id: UUID of the invitation
            
        Returns:
            bool: True if successfully cancelled
            
        Raises:
            InvalidInvitationTokenError: If invitation not found or invalid
        """
        try:
            invitation = TenantInvitation.objects.get(pk=invitation_id)
            
            if invitation.status not in ['Pending', 'Expired']:
                raise InvalidInvitationTokenError("Only pending or expired invitations can be cancelled")
            
            invitation.cancel()
            
            logger.info(f"Invitation cancelled for {invitation.email}")
            return True
            
        except TenantInvitation.DoesNotExist:
            raise InvalidInvitationTokenError("Invitation not found")
        except Exception as e:
            logger.error(f"Failed to cancel invitation {invitation_id}: {e}", exc_info=True)
            raise

    def delete_invitation(self, invitation_id: str) -> bool:
        """
        Permanently delete an invitation (only allowed for cancelled invitations)
        
        Args:
            invitation_id: UUID of the invitation
            
        Returns:
            bool: True if successfully deleted
            
        Raises:
            InvalidInvitationTokenError: If invitation not found or not cancelled
        """
        try:
            invitation = TenantInvitation.objects.get(pk=invitation_id)
            
            if invitation.status != 'Cancelled':
                raise InvalidInvitationTokenError("Only cancelled invitations can be deleted")
            
            invitation_email = invitation.email  # Store for logging
            invitation.delete()
            
            logger.info(f"Invitation permanently deleted for {invitation_email}")
            return True
            
        except TenantInvitation.DoesNotExist:
            raise InvalidInvitationTokenError("Invitation not found")
        except Exception as e:
            logger.error(f"Failed to delete invitation {invitation_id}: {e}", exc_info=True)
            raise


     
    def get_invitation_by_token(self, invitation_token: str) -> TenantInvitation:
        """
        Get an invitation by its token
        
        Args:
            invitation_token: Unique invitation token
            
        Returns:
            TenantInvitation: Invitation instance
            
        Raises:
            InvalidInvitationTokenError: If invitation not found or invalid
        """
        try:
            invitation = TenantInvitation.objects.get(invitation_token=invitation_token)
            return invitation
            
        except TenantInvitation.DoesNotExist:
            raise InvalidInvitationTokenError("Invalid invitation token")
    
    def accept_invitation(self, invitation_token: str, tenant_data: Dict[str, Any]) -> TenantInvitation:
        """
        Accept an invitation and create a tenant
        
        Args:
            invitation_token: Unique invitation token
            tenant_data: Dictionary containing tenant details
            
        Returns:
            TenantInvitation: Updated invitation instance with linked tenant
            
        Raises:
            InvalidInvitationTokenError: If invitation not found or invalid
            InvitationAlreadyAcceptedError: If invitation already accepted
        """
        try:
            with transaction.atomic():
                invitation = self.get_invitation_by_token(invitation_token)
                
                if invitation.status != 'Pending':
                    if invitation.status == 'Accepted':
                        raise InvitationAlreadyAcceptedError("This invitation has already been accepted")
                    else:
                        raise InvalidInvitationTokenError(f"Invitation is {invitation.status.lower()}")
                
                if invitation.is_expired:
                    raise InvalidInvitationTokenError("This invitation has expired")
                
                # Import here to avoid circular import
                from ..models import Tenant
                
                # Create tenant
                tenant = Tenant.objects.create(
                    organization_name=tenant_data.get('organization_name', invitation.organization_name),
                    tenant_type=invitation.tenant_type,
                    primary_contact_name=invitation.contact_name,
                    primary_contact_email=invitation.email,
                    primary_contact_phone=tenant_data.get('phone', invitation.contact_phone),
                    **{k: v for k, v in tenant_data.items() if k not in ['organization_name', 'phone']}
                )
                
                # Accept invitation
                invitation.accept(tenant)
                
                logger.info(f"Invitation accepted for {invitation.email}, tenant {tenant.id} created")
                return invitation
                
        except Exception as e:
            logger.error(f"Failed to accept invitation {invitation_token}: {e}", exc_info=True)
            raise
    
    def mark_invitation_accepted(self, invitation: TenantInvitation, created_tenant=None) -> None:
        """
        Mark an invitation as accepted and optionally link it to the created tenant
        
        Args:
            invitation: TenantInvitation instance to mark as accepted
            created_tenant: Optional created tenant instance to link (can be None if tenant creation is deferred)
        """
        try:
            invitation.accept(created_tenant)
            if created_tenant:
                logger.info(f"Invitation {invitation.invitation_token} marked as accepted for tenant {created_tenant.id}")
            else:
                logger.info(f"Invitation {invitation.invitation_token} marked as accepted. Tenant creation deferred until email verification.")
        except Exception as e:
            logger.error(f"Failed to mark invitation as accepted: {e}", exc_info=True)
            raise
    
    def validate_invitation_data(self, invitation_data: Dict[str, Any]) -> bool:
        """
        Validate invitation data
        
        Args:
            invitation_data: Dictionary containing invitation details
            
        Returns:
            bool: True if valid
            
        Raises:
            ValidationError: If validation fails
        """
        from django.core.exceptions import ValidationError
        
        required_fields = ['email', 'contact_name', 'tenant_type']
        
        for field in required_fields:
            if not invitation_data.get(field):
                raise ValidationError(f"{field} is required")
        
        # Check for existing pending invitation
        if TenantInvitation.objects.filter(
            email=invitation_data['email'], 
            status='Pending'
        ).exists():
            raise ValidationError("An invitation has already been sent to this email address")
        
        return True
    
    def expire_overdue_invitations(self) -> int:
        """
        Find and expire all pending invitations that have passed their expiry time
        
        Returns:
            int: Number of invitations that were expired
        """
        try:
            from django.utils import timezone
            
            # Find all pending invitations that are past their expiry time
            overdue_invitations = TenantInvitation.objects.filter(
                status='Pending',
                expires_at__lt=timezone.now()
            )
            
            expired_count = 0
            for invitation in overdue_invitations:
                invitation.expire()  # Use the model's expire() method
                expired_count += 1
                logger.info(f"Auto-expired invitation {invitation.id} for {invitation.email}")
            
            if expired_count > 0:
                logger.info(f"Auto-expired {expired_count} overdue invitations")
            
            return expired_count
            
        except Exception as e:
            logger.error(f"Failed to expire overdue invitations: {e}", exc_info=True)
            return 0
    
    def resend_expired_invitation(self, invitation_id: str, expires_at=None) -> bool:
        """
        Resend an expired invitation by reactivating it and optionally updating expiry
        
        Args:
            invitation_id: UUID of the expired invitation
            expires_at: Optional new expiry datetime
            
        Returns:
            bool: True if successfully resent
            
        Raises:
            InvalidInvitationTokenError: If invitation not found or not expired
        """
        try:
            invitation = TenantInvitation.objects.get(pk=invitation_id)
            
            if invitation.status != 'Expired':
                raise InvalidInvitationTokenError("Only expired invitations can be resent")
            
            # Update expiry time
            if expires_at:
                invitation.expires_at = expires_at
            else:
                # Default to 7 days from now
                invitation.expires_at = timezone.now() + timedelta(days=7)
            
            # Reactivate the invitation
            invitation.status = 'Pending'
            invitation.save(update_fields=['status', 'expires_at'])
            
            logger.info(f"Resent expired invitation {invitation.id} for {invitation.email}")
            return True
            
        except TenantInvitation.DoesNotExist:
            raise InvalidInvitationTokenError("Invitation not found")
        except Exception as e:
            logger.error(f"Failed to resend expired invitation {invitation_id}: {e}", exc_info=True)
            raise
    
    def revoke_cancellation(self, invitation_id: str) -> bool:
        """
        Revoke cancellation of an invitation (reactivate a cancelled invitation)
        
        Args:
            invitation_id: UUID of the invitation
            
        Returns:
            bool: True if successfully revoked cancellation
            
        Raises:
            InvalidInvitationTokenError: If invitation not found or invalid
        """
        try:
            invitation = TenantInvitation.objects.get(pk=invitation_id)
            
            if invitation.status != 'Cancelled':
                raise InvalidInvitationTokenError("Only cancelled invitations can have their cancellation revoked")
            
            # Check if invitation has not expired
            if invitation.is_expired:
                raise InvalidInvitationTokenError("Cannot revoke cancellation of an expired invitation")
            
            # Change status back to Pending
            invitation.status = 'Pending'
            invitation.save(update_fields=['status'])
            
            logger.info(f"Cancellation revoked for invitation {invitation.email} - invitation reactivated")
            return True
            
        except TenantInvitation.DoesNotExist:
            raise InvalidInvitationTokenError("Invitation not found")
        except Exception as e:
            logger.error(f"Failed to revoke cancellation for invitation {invitation_id}: {e}", exc_info=True)
            raise 
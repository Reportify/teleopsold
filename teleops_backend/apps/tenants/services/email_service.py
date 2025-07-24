"""
Email service for tenant-related communications
"""

import logging
from typing import Optional
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

from ..exceptions import EmailDeliveryError

logger = logging.getLogger(__name__)


class EmailService:
    """Service for handling tenant-related email communications"""
    
    def __init__(self):
        self.from_email = settings.DEFAULT_FROM_EMAIL
        self.frontend_url = settings.FRONTEND_URL
        self.verify_url = getattr(settings, 'FRONTEND_VERIFY_URL', f'{settings.FRONTEND_URL}/verify-email')
    
    def send_invitation_email(self, invitation) -> bool:
        """
        Send invitation email to tenant
        
        Args:
            invitation: TenantInvitation instance
            
        Returns:
            bool: True if email sent successfully
            
        Raises:
            EmailDeliveryError: If email delivery fails
        """
        try:
            # Generate onboarding URL
            onboarding_url = f"{self.frontend_url}/onboarding/{invitation.invitation_token}"
            
            # Email context
            context = {
                'invitation': invitation,
                'onboarding_url': onboarding_url,
                'expires_at': invitation.expires_at.strftime('%B %d, %Y'),
                'frontend_url': self.frontend_url,
            }
            
            # Subject
            subject = f"Invitation to join Teleops Platform - {invitation.tenant_type}"
            
            # Try to render HTML template, fallback to plain text
            try:
                html_message = render_to_string('emails/tenant_invitation.html', context)
            except Exception as e:
                logger.warning(f"Failed to render HTML template: {e}")
                html_message = None
            
            # Plain text message
            message = self._get_invitation_text_message(context)
            
            # Send email
            send_mail(
                subject=subject,
                message=message,
                html_message=html_message,
                from_email=self.from_email,
                recipient_list=[invitation.email],
                fail_silently=False,
            )
            
            logger.info(f"Invitation email sent successfully to {invitation.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send invitation email to {invitation.email}: {e}", exc_info=True)
            raise EmailDeliveryError(f"Failed to send invitation email: {str(e)}")
    
    def send_verification_email(self, user, token_obj) -> bool:
        """
        Send email verification to user
        
        Args:
            user: User instance
            token_obj: UserVerificationToken instance
            
        Returns:
            bool: True if email sent successfully
            
        Raises:
            EmailDeliveryError: If email delivery fails
        """
        try:
            verify_url = f"{self.verify_url}?token={token_obj.token}"
            
            context = {
                'user': user,
                'verify_url': verify_url,
                'frontend_url': self.frontend_url,
            }
            
            subject = "Welcome to Teleops! Verify your email and set your password"
            
            # Try to render HTML template, fallback to plain text
            try:
                html_message = render_to_string('emails/user_verification.html', context)
            except Exception as e:
                logger.warning(f"Failed to render HTML template: {e}")
                html_message = None
            
            # Plain text message
            message = self._get_verification_text_message(context)
            
            # Send email
            send_mail(
                subject=subject,
                message=message,
                html_message=html_message,
                from_email=self.from_email,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            logger.info(f"Verification email sent successfully to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send verification email to {user.email}: {e}", exc_info=True)
            raise EmailDeliveryError(f"Failed to send verification email: {str(e)}")
    
    def send_onboarding_confirmation_email(self, tenant) -> bool:
        """
        Send onboarding confirmation email
        
        Args:
            tenant: Tenant instance
            
        Returns:
            bool: True if email sent successfully
            
        Raises:
            EmailDeliveryError: If email delivery fails
        """
        try:
            context = {
                'tenant': tenant,
                'frontend_url': self.frontend_url,
            }
            
            subject = "Welcome to Teleops! Your account is active"
            
            # Try to render HTML template, fallback to plain text
            try:
                html_message = render_to_string('emails/onboarding_confirmation.html', context)
            except Exception as e:
                logger.warning(f"Failed to render HTML template: {e}")
                html_message = None
            
            # Plain text message
            message = self._get_confirmation_text_message(context)
            
            # Send email
            send_mail(
                subject=subject,
                message=message,
                html_message=html_message,
                from_email=self.from_email,
                recipient_list=[tenant.primary_contact_email],
                fail_silently=False,
            )
            
            logger.info(f"Confirmation email sent successfully to {tenant.primary_contact_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send confirmation email to {tenant.primary_contact_email}: {e}", exc_info=True)
            raise EmailDeliveryError(f"Failed to send confirmation email: {str(e)}")
    
    def _get_invitation_text_message(self, context) -> str:
        """Get plain text invitation message"""
        invitation = context['invitation']
        onboarding_url = context['onboarding_url']
        expires_at = context['expires_at']
        
        return f"""
Hello {invitation.contact_name},

You have been invited to join the Teleops platform as a {invitation.tenant_type} tenant.

Click the following link to complete your registration:
{onboarding_url}

This invitation expires on {expires_at}.

If you have any questions, please contact our support team.

Best regards,
Teleops Team
        """.strip()
    
    def _get_verification_text_message(self, context) -> str:
        """Get plain text verification message"""
        user = context['user']
        verify_url = context['verify_url']
        
        return f"""
Hello {user.first_name},

Welcome to Teleops! To activate your account, please verify your email and set your password using the link below:

{verify_url}

This link will expire in 24 hours for your security.

If you did not request this, please ignore this email or contact support.

Best regards,
Teleops Team
        """.strip()
    
    def _get_confirmation_text_message(self, context) -> str:
        """Get plain text confirmation message"""
        tenant = context['tenant']
        
        return f"""
Hello {tenant.primary_contact_name},

Your organization ({tenant.organization_name}) has been successfully onboarded to Teleops.
Your account is now active and you can log in using your registered email.

If you have any questions, please contact our support team.

Best regards,
Teleops Team
        """.strip() 
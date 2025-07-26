"""
Tenant Creation Service with Automatic RBAC Initialization
"""

from django.contrib.auth import get_user_model
from django.db import transaction
from django.core.management import call_command
from ..models import Tenant, TenantUserProfile, PermissionGroup, UserPermissionGroupAssignment
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class TenantCreationService:
    """
    Service to handle tenant creation with automatic RBAC setup
    """
    
    @staticmethod
    @transaction.atomic
    def create_tenant_with_admin(tenant_data, admin_user_email):
        """
        Create a new tenant and automatically set up RBAC with an administrator
        
        Args:
            tenant_data (dict): Tenant creation data
            admin_user_email (str): Email of the user who will become the tenant administrator
            
        Returns:
            Tenant: The created tenant instance
            
        Raises:
            ValueError: If admin user doesn't exist
            Exception: If tenant creation fails
        """
        try:
            # Validate admin user exists
            try:
                admin_user = User.objects.get(email=admin_user_email)
            except User.DoesNotExist:
                raise ValueError(f"Admin user with email {admin_user_email} does not exist")
            
            # Create the tenant
            tenant = Tenant.objects.create(**tenant_data)
            logger.info(f"Created tenant: {tenant.organization_name}")
            
            # Initialize RBAC system for the tenant
            call_command('init_circle_portal_rbac', tenant_id=str(tenant.id))
            logger.info(f"Initialized RBAC for tenant: {tenant.organization_name}")
            
            # Create admin user profile
            user_profile = TenantUserProfile.objects.create(
                user=admin_user,
                tenant=tenant,
                display_name=f'{admin_user.first_name} {admin_user.last_name}'.strip() or admin_user.email,
                is_active=True,
                job_title='Tenant Administrator'
            )
            logger.info(f"Created admin user profile for: {admin_user.email}")
            
            # Assign admin to tenant administrators group
            admin_group = PermissionGroup.objects.get(
                tenant=tenant,
                group_code='tenant_administrators'
            )
            
            UserPermissionGroupAssignment.objects.create(
                user_profile=user_profile,
                group=admin_group,
                assigned_by=admin_user,
                assignment_reason='Tenant creation - initial administrator',
                is_active=True
            )
            logger.info(f"Assigned admin permissions to: {admin_user.email}")
            
            return tenant
            
        except Exception as e:
            logger.error(f"Failed to create tenant with admin: {str(e)}")
            raise
    
    @staticmethod
    def initialize_existing_tenant_rbac(tenant_id):
        """
        Initialize RBAC for an existing tenant (useful for migrations)
        
        Args:
            tenant_id (str): UUID of the tenant
        """
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            call_command('init_circle_portal_rbac', tenant_id=str(tenant.id))
            logger.info(f"Initialized RBAC for existing tenant: {tenant.organization_name}")
            
        except Tenant.DoesNotExist:
            raise ValueError(f"Tenant with ID {tenant_id} does not exist")
        except Exception as e:
            logger.error(f"Failed to initialize RBAC for tenant {tenant_id}: {str(e)}")
            raise
    
    @staticmethod
    def assign_tenant_admin(tenant_id, admin_user_email):
        """
        Assign a user as tenant administrator
        
        Args:
            tenant_id (str): UUID of the tenant
            admin_user_email (str): Email of the user to make admin
        """
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            admin_user = User.objects.get(email=admin_user_email)
            
            # Create or get user profile
            user_profile, created = TenantUserProfile.objects.get_or_create(
                user=admin_user,
                tenant=tenant,
                defaults={
                    'display_name': f'{admin_user.first_name} {admin_user.last_name}'.strip() or admin_user.email,
                    'is_active': True,
                    'job_title': 'Tenant Administrator'
                }
            )
            
            # Get admin group
            admin_group = PermissionGroup.objects.get(
                tenant=tenant,
                group_code='tenant_administrators'
            )
            
            # Assign to admin group
            assignment, created = UserPermissionGroupAssignment.objects.get_or_create(
                user_profile=user_profile,
                group=admin_group,
                defaults={
                    'assigned_by': admin_user,
                    'assignment_reason': 'Manual admin assignment',
                    'is_active': True
                }
            )
            
            if created:
                logger.info(f"Assigned admin permissions to {admin_user.email} for tenant {tenant.organization_name}")
            else:
                logger.info(f"User {admin_user.email} already has admin permissions for tenant {tenant.organization_name}")
                
            return assignment
            
        except (Tenant.DoesNotExist, User.DoesNotExist) as e:
            raise ValueError(str(e))
        except Exception as e:
            logger.error(f"Failed to assign tenant admin: {str(e)}")
            raise


# Convenience function for API usage
def create_tenant_with_automatic_rbac(tenant_data, admin_email):
    """
    Convenience function to create tenant with automatic RBAC setup
    
    Usage in API views:
    ```python
    from apps.tenants.services.tenant_creation_service import create_tenant_with_automatic_rbac
    
    tenant = create_tenant_with_automatic_rbac({
        'organization_name': 'New Circle Corp',
        'tenant_type': 'Circle',
        'primary_contact_email': 'admin@newcircle.com'
    }, admin_email='admin@newcircle.com')
    ```
    """
    return TenantCreationService.create_tenant_with_admin(tenant_data, admin_email) 
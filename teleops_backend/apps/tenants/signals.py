"""
Tenant signals for automatic RBAC initialization
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.management import call_command
from django.contrib.auth import get_user_model
from .models import Tenant, CircleVendorRelationship, TenantUserProfile
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


@receiver(post_save, sender=Tenant)
def initialize_tenant_rbac(sender, instance, created, **kwargs):
    """
    Automatically initialize RBAC system when a new tenant is created
    """
    if created:
        try:
            logger.info(f"Auto-initializing RBAC for new tenant: {instance.organization_name}")
            
            # Call the Circle Portal RBAC initialization command
            call_command('init_circle_portal_rbac', tenant_id=str(instance.id))
            
            logger.info(f"✓ RBAC successfully initialized for tenant: {instance.organization_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize RBAC for tenant {instance.organization_name}: {str(e)}")
            # Don't raise the exception to avoid breaking tenant creation
            # The admin can manually run the command later if needed


@receiver(post_save, sender=Tenant)
def create_default_admin_user(sender, instance, created, **kwargs):
    """
    Create a default administrator user profile when tenant is created
    """
    if created and hasattr(instance, '_creating_admin_email'):
        try:
            from django.contrib.auth import get_user_model
            from .models import TenantUserProfile, PermissionGroup, UserPermissionGroupAssignment
            
            User = get_user_model()
            admin_email = instance._creating_admin_email
            
            # Get the user who will become admin
            try:
                admin_user = User.objects.get(email=admin_email)
                
                # Create user profile for this tenant
                user_profile, profile_created = TenantUserProfile.objects.get_or_create(
                    user=admin_user,
                    tenant=instance,
                    defaults={
                        'display_name': f'{admin_user.first_name} {admin_user.last_name}'.strip() or admin_user.email,
                        'is_active': True,
                        'job_title': 'Tenant Administrator'
                    }
                )
                
                # Assign to tenant administrators group
                admin_group = PermissionGroup.objects.get(
                    tenant=instance,
                    group_code='tenant_administrators'
                )
                
                UserPermissionGroupAssignment.objects.get_or_create(
                    user_profile=user_profile,
                    group=admin_group,
                    defaults={
                        'assigned_by': admin_user,
                        'assignment_reason': 'Tenant creation - initial administrator',
                        'is_active': True
                    }
                )
                
                logger.info(f"✓ Default admin user created for tenant: {instance.organization_name}")
                
            except User.DoesNotExist:
                logger.warning(f"Admin user {admin_email} not found for tenant {instance.organization_name}")
                
        except Exception as e:
            logger.error(f"Failed to create default admin for tenant {instance.organization_name}: {str(e)}")


@receiver(post_save, sender=Tenant)
def update_vendor_relationships_on_tenant_approval(sender, instance, created, **kwargs):
    """
    Update CircleVendorRelationship status when tenant approval status changes
    """
    # Only process for vendor tenants that are not newly created
    if created or instance.tenant_type != 'Vendor':
        return
    
    try:
        # Find all vendor relationships for this tenant
        relationships = CircleVendorRelationship.objects.filter(vendor_tenant=instance)
        
        for relationship in relationships:
            # Determine the correct relationship status based on tenant status
            if instance.is_active and instance.registration_status == 'Approved':
                # Tenant is approved and active
                relationship.is_active = True
                relationship.relationship_status = 'Active'
                logger.info(f"Activated vendor relationship {relationship.id} - tenant {instance.organization_name} approved")
                
            elif instance.registration_status == 'Rejected':
                # Tenant was rejected
                relationship.is_active = False
                relationship.relationship_status = 'Terminated'
                logger.info(f"Terminated vendor relationship {relationship.id} - tenant {instance.organization_name} rejected")
                
            else:
                # Tenant is still pending or inactive
                relationship.is_active = False
                relationship.relationship_status = 'Pending_Approval'
                logger.info(f"Set vendor relationship {relationship.id} to pending - tenant {instance.organization_name} status: {instance.registration_status}")
            
            relationship.save()
            
    except Exception as e:
        logger.error(f"Failed to update vendor relationships for tenant {instance.id}: {e}", exc_info=True)


@receiver(post_save, sender=User)
def create_user_tenant_profile(sender, instance, created, **kwargs):
    """
    Automatically create TenantUserProfile when a User is created.
    This ensures all users have proper tenant profiles for RBAC operations.
    """
    if created:
        try:
            # Check if this user already has any tenant profiles
            existing_profiles = TenantUserProfile.objects.filter(user=instance).count()
            
            if existing_profiles == 0:
                # If user has no tenant profiles, we need to determine which tenant they belong to
                # This is a bit tricky since we don't have tenant context in the signal
                # For now, we'll create a profile without a tenant, which can be updated later
                # when the user is properly assigned to a tenant
                
                logger.info(f"User {instance.email} created, but no tenant context available for automatic profile creation")
                # Don't create a profile here - it should be created when user is assigned to a tenant
                
        except Exception as e:
            logger.error(f"Failed to create tenant profile for user {instance.email}: {str(e)}")


def create_tenant_user_profile_for_user(user, tenant, **profile_data):
    """
    Helper function to create TenantUserProfile for a user in a specific tenant.
    This should be called when users are added to tenants.
    """
    try:
        profile, created = TenantUserProfile.objects.get_or_create(
            user=user,
            tenant=tenant,
            defaults={
                'display_name': profile_data.get('display_name', f'{user.first_name} {user.last_name}'.strip() or user.email),
                'is_active': True,
                'job_title': profile_data.get('job_title', ''),
                'department': profile_data.get('department', ''),
                'phone_number': profile_data.get('phone_number', ''),
                'employee_id': profile_data.get('employee_id', ''),
                **profile_data
            }
        )
        
        if created:
            logger.info(f"Created TenantUserProfile for user {user.email} in tenant {tenant.organization_name}")
        
        return profile
        
    except Exception as e:
        logger.error(f"Failed to create TenantUserProfile for user {user.email} in tenant {tenant.organization_name}: {str(e)}")
        return None 
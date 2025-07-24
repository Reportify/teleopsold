"""
Tenant management service for teleops_internal
"""

import uuid
from typing import Dict, List, Optional, Any
from apps.users.models import User
from django.db.models import Q, Count
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import transaction
from apps.tenants.models import Tenant, TenantUserProfile, TenantInvitation
from apps.tenants.serializers import TenantSerializer
from ..exceptions import TenantManagementError
import logging

logger = logging.getLogger(__name__)

class TenantManagementService:
    """Service for managing tenant operations from internal portal"""

    @staticmethod
    def get_tenants_list() -> Dict[str, Any]:
        """
        Get all tenants (simplified - no filtering, no pagination)
        Returns all tenants for client-side filtering
        """
        try:
            # Get all tenants ordered by organization name
            tenants = Tenant.objects.select_related().order_by('organization_name')
            
            # Serialize all tenants with enriched data
            serialized_tenants = []
            for tenant in tenants:
                tenant_data = TenantManagementService._serialize_tenant_summary(tenant)
                serialized_tenants.append(tenant_data)
            
            return {
                'success': True,
                'tenants': serialized_tenants,
                'total_count': len(serialized_tenants)
            }
            
        except Exception as e:
            logger.error(f"Error fetching tenants list: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to fetch tenants: {str(e)}',
                'tenants': [],
                'total_count': 0
            }

    @staticmethod
    def _serialize_tenant_summary(tenant: Tenant) -> Dict[str, Any]:
        """
        Serialize tenant with enriched data for the management interface
        """
        try:
            # Get user count
            user_count = TenantUserProfile.objects.filter(tenant=tenant).count()
            
            # Get usage statistics (simplified)
            usage_stats = {
                'projects_count': 0,
                'sites_count': 0, 
                'equipment_count': 0,
                'tasks_count': 0
            }
            
            # Try to get actual usage statistics if the related models exist
            try:
                from apps.projects.models import Project
                usage_stats['projects_count'] = Project.objects.filter(tenant_id=tenant.id).count()
            except ImportError:
                pass
                
            try:
                from apps.sites.models import Site
                usage_stats['sites_count'] = Site.objects.filter(tenant_id=tenant.id).count()
            except ImportError:
                pass
                
            try:
                from apps.equipment.models import Equipment
                usage_stats['equipment_count'] = Equipment.objects.filter(tenant_id=tenant.id).count()
            except ImportError:
                pass
                
            try:
                from apps.tasks.models import Task
                usage_stats['tasks_count'] = Task.objects.filter(tenant_id=tenant.id).count()
            except ImportError:
                pass

            return {
                'id': str(tenant.id),
                'organization_name': tenant.organization_name,
                'tenant_type': tenant.tenant_type,
                'activation_status': tenant.activation_status,
                'registration_status': tenant.registration_status,
                'subscription_plan': tenant.subscription_plan or 'Standard',
                'primary_contact_name': tenant.primary_contact_name,
                'primary_contact_email': tenant.primary_contact_email,
                'primary_contact_phone': tenant.primary_contact_phone,
                'country': tenant.country,
                'industry_sector': tenant.industry_sector,
                'business_registration_number': tenant.business_registration_number,
                'website': tenant.website,
                'user_count': user_count,
                'users': user_count,  # Frontend expects this field
                'usage_statistics': usage_stats,
                'coverage_areas': tenant.coverage_areas or [],
                'service_capabilities': tenant.service_capabilities or [],
                'certifications': tenant.certifications or [],
                'rejection_reason': tenant.rejection_reason,
                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
                'updated_at': tenant.updated_at.isoformat() if tenant.updated_at else None,
                'registered_at': tenant.registered_at.isoformat() if tenant.registered_at else None,
                'activated_at': tenant.activated_at.isoformat() if tenant.activated_at else None,
            }
            
        except Exception as e:
            logger.error(f"Error serializing tenant {tenant.id}: {str(e)}")
            # Return basic data if enrichment fails
            return {
                'id': str(tenant.id),
                'organization_name': tenant.organization_name,
                'tenant_type': tenant.tenant_type,
                'activation_status': tenant.activation_status,
                'registration_status': tenant.registration_status,
                'subscription_plan': tenant.subscription_plan or 'Standard',
                'primary_contact_name': tenant.primary_contact_name,
                'primary_contact_email': tenant.primary_contact_email,
                'primary_contact_phone': tenant.primary_contact_phone,
                'user_count': 0,
                'users': 0,
                'usage_statistics': {'projects_count': 0, 'sites_count': 0, 'equipment_count': 0, 'tasks_count': 0},
                'created_at': tenant.created_at.isoformat() if tenant.created_at else None,
                'updated_at': tenant.updated_at.isoformat() if tenant.updated_at else None,
            }
    
    def get_tenant_detail(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific tenant
        
        Args:
            tenant_id: UUID of the tenant
            
        Returns:
            Dict: Detailed tenant information
            
        Raises:
            TenantManagementError: If tenant not found or error occurs
        """
        try:
            tenant = Tenant.objects.select_related('parent_tenant', 'circle').prefetch_related(
                'child_tenants'
            ).get(id=tenant_id)
            
            # Get usage statistics
            usage_stats = self._get_tenant_usage_stats(tenant)
            
            # Get user count (only tenant users, not internal users)
            user_count = User.objects.filter(
                tenant_user_profile__tenant_id=tenant.id
            ).count()
            
            # Serialize full tenant data
            tenant_data = self._serialize_tenant_detail(tenant)
            tenant_data.update({
                'usage_statistics': usage_stats,
                'user_count': user_count,
            })
            
            return tenant_data
            
        except Tenant.DoesNotExist:
            raise TenantManagementError("Tenant not found")
        except Exception as e:
            logger.error(f"Failed to get tenant detail for {tenant_id}: {e}", exc_info=True)
            raise TenantManagementError(f"Failed to retrieve tenant details: {str(e)}")
    
    def suspend_tenant(self, tenant_id: str, reason: str, suspended_by: User) -> Dict[str, Any]:
        """
        Suspend a tenant account
        
        Args:
            tenant_id: UUID of the tenant
            reason: Reason for suspension
            suspended_by: User performing the suspension
            
        Returns:
            Dict: Updated tenant status
            
        Raises:
            TenantManagementError: If suspension fails
        """
        try:
            with transaction.atomic():
                tenant = Tenant.objects.get(id=tenant_id)
                
                if tenant.activation_status == 'Suspended':
                    raise TenantManagementError("Tenant is already suspended")
                
                # Update tenant status
                tenant.activation_status = 'Suspended'
                tenant.is_active = False
                tenant.deactivated_at = timezone.now()
                tenant.save(update_fields=['activation_status', 'is_active', 'deactivated_at'])
                
                # Log the suspension (in a real implementation, create audit log)
                logger.info(f"Tenant {tenant.organization_name} suspended by {suspended_by.email}. Reason: {reason}")
                
                # Deactivate all users for this tenant
                self._deactivate_tenant_users(tenant)
                
                return {
                    'tenant_id': str(tenant.id),
                    'organization_name': tenant.organization_name,
                    'status': tenant.activation_status,
                    'suspended_at': tenant.deactivated_at,
                    'suspended_by': suspended_by.email,
                    'reason': reason,
                }
                
        except Tenant.DoesNotExist:
            raise TenantManagementError("Tenant not found")
        except Exception as e:
            logger.error(f"Failed to suspend tenant {tenant_id}: {e}", exc_info=True)
            raise TenantManagementError(f"Failed to suspend tenant: {str(e)}")
    
    def reactivate_tenant(self, tenant_id: str, reactivated_by: User) -> Dict[str, Any]:
        """
        Reactivate a suspended tenant
        
        Args:
            tenant_id: UUID of the tenant
            reactivated_by: User performing the reactivation
            
        Returns:
            Dict: Updated tenant status
            
        Raises:
            TenantManagementError: If reactivation fails
        """
        try:
            with transaction.atomic():
                tenant = Tenant.objects.get(id=tenant_id)
                
                if tenant.activation_status != 'Suspended':
                    raise TenantManagementError("Only suspended tenants can be reactivated")
                
                # Update tenant status
                tenant.activation_status = 'Active'
                tenant.is_active = True
                tenant.activated_at = timezone.now()
                tenant.deactivated_at = None
                tenant.save(update_fields=['activation_status', 'is_active', 'activated_at', 'deactivated_at'])
                
                # Log the reactivation
                logger.info(f"Tenant {tenant.organization_name} reactivated by {reactivated_by.email}")
                
                # Reactivate tenant users (they can manually activate themselves)
                # In a real implementation, send reactivation emails
                
                return {
                    'tenant_id': str(tenant.id),
                    'organization_name': tenant.organization_name,
                    'status': tenant.activation_status,
                    'reactivated_at': tenant.activated_at,
                    'reactivated_by': reactivated_by.email,
                }
                
        except Tenant.DoesNotExist:
            raise TenantManagementError("Tenant not found")
        except Exception as e:
            logger.error(f"Failed to reactivate tenant {tenant_id}: {e}", exc_info=True)
            raise TenantManagementError(f"Failed to reactivate tenant: {str(e)}")
    
    def update_tenant(self, tenant_id: str, update_data: Dict[str, Any], updated_by: User) -> Dict[str, Any]:
        """
        Update tenant information
        
        Args:
            tenant_id: UUID of the tenant
            update_data: Data to update
            updated_by: User performing the update
            
        Returns:
            Dict: Updated tenant data
            
        Raises:
            TenantManagementError: If update fails
        """
        try:
            with transaction.atomic():
                tenant = Tenant.objects.get(id=tenant_id)
                
                # Define updateable fields for internal portal
                updateable_fields = [
                    'primary_contact_name', 'primary_contact_email', 'primary_contact_phone',
                    'secondary_contact_name', 'secondary_contact_email', 'secondary_contact_phone',
                    'primary_business_address', 'website', 'notes',
                    # Status fields for approval/rejection workflow
                    'registration_status', 'activation_status', 'is_active', 'activated_at', 'rejection_reason'
                ]
                
                # Update allowed fields
                updated_fields = []
                for field, value in update_data.items():
                    if field in updateable_fields and hasattr(tenant, field):
                        old_value = getattr(tenant, field)
                        setattr(tenant, field, value)
                        updated_fields.append(f"{field}: {old_value} -> {value}")
                
                if updated_fields:
                    tenant.updated_at = timezone.now()
                    tenant.save()
                    
                    logger.info(f"Tenant {tenant.organization_name} updated by {updated_by.email}: {', '.join(updated_fields)}")
                
                return self._serialize_tenant_detail(tenant)
                
        except Tenant.DoesNotExist:
            raise TenantManagementError("Tenant not found")
        except Exception as e:
            logger.error(f"Failed to update tenant {tenant_id}: {e}", exc_info=True)
            raise TenantManagementError(f"Failed to update tenant: {str(e)}")
    
    @staticmethod
    def cancel_rejection(tenant_id: str, cancelled_by_user_email: str) -> Dict[str, Any]:
        """
        Cancel tenant rejection and move back to pending status (keeps rejection reason for audit)
        
        Args:
            tenant_id: UUID of the tenant
            cancelled_by_user_email: Email of user cancelling the rejection
            
        Returns:
            Dict: Updated tenant data
            
        Raises:
            TenantManagementError: If cancellation fails
        """
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            
            if tenant.registration_status != 'Rejected':
                raise TenantManagementError("Only rejected tenants can have their rejection cancelled")
            
            # Move back to pending status (keep rejection_reason for audit trail)
            tenant.registration_status = 'Pending'
            tenant.updated_at = timezone.now()
            tenant.save(update_fields=['registration_status', 'updated_at'])
            
            logger.info(f"Rejection cancelled for tenant {tenant.organization_name} by {cancelled_by_user_email}")
            
            return {
                'success': True,
                'tenant_id': str(tenant.id),
                'organization_name': tenant.organization_name,
                'previous_status': 'Rejected',
                'current_status': tenant.registration_status,
                'rejection_reason_preserved': tenant.rejection_reason,
                'cancelled_by': cancelled_by_user_email,
                'cancelled_at': tenant.updated_at.isoformat(),
            }
            
        except Tenant.DoesNotExist:
            raise TenantManagementError("Tenant not found")
        except Exception as e:
            logger.error(f"Failed to cancel rejection for tenant {tenant_id}: {e}", exc_info=True)
            raise TenantManagementError(f"Failed to cancel rejection: {str(e)}")
    
    def get_tenant_users(self, tenant_id: str) -> List[Dict[str, Any]]:
        """
        Get list of users for a tenant
        
        Args:
            tenant_id: UUID of the tenant
            
        Returns:
            List[Dict]: List of user data
            
        Raises:
            TenantManagementError: If error occurs
        """
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            
            # Get users associated with this tenant
            users = User.objects.filter(
                tenant_user_profile__tenant_id=tenant.id
            ).select_related('tenant_user_profile')
            
            users_data = []
            for user in users:
                user_data = {
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_active': user.is_active,
                    'user_type': user.user_type,
                    'last_login': user.last_login,
                    'date_joined': user.date_joined,
                }
                
                # Add profile-specific data
                if hasattr(user, 'tenant_user_profile') and user.tenant_user_profile:
                    user_data.update({
                        'designation': user.tenant_user_profile.job_title,
                        'employment_type': user.tenant_user_profile.employment_type,
                    })
                
                users_data.append(user_data)
            
            return users_data
            
        except Tenant.DoesNotExist:
            raise TenantManagementError("Tenant not found")
        except Exception as e:
            logger.error(f"Failed to get tenant users for {tenant_id}: {e}", exc_info=True)
            raise TenantManagementError(f"Failed to retrieve tenant users: {str(e)}")
    
    def get_tenant_analytics(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get analytics data for a tenant
        
        Args:
            tenant_id: UUID of the tenant
            
        Returns:
            Dict: Analytics data
        """
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            
            analytics = {
                'overview': {
                    'tenant_age_days': (timezone.now() - tenant.created_at).days,
                    'activation_status': tenant.activation_status,
                    'tenant_type': tenant.tenant_type,
                },
                'usage': self._get_tenant_usage_stats(tenant),
                'users': {
                    'total_users': User.objects.filter(
                        tenant_user_profile__tenant_id=tenant.id
                    ).count(),
                    'active_users': User.objects.filter(
                        tenant_user_profile__tenant_id=tenant.id,
                        is_active=True
                    ).count(),
                },
            }
            
            return analytics
            
        except Tenant.DoesNotExist:
            raise TenantManagementError("Tenant not found")
        except Exception as e:
            logger.error(f"Failed to get tenant analytics for {tenant_id}: {e}")
            return {}
    
        # Old filtering method removed - now using client-side filtering
    
    def _serialize_tenant_detail(self, tenant):
        """Serialize tenant for detail view"""
        data = {
            'id': str(tenant.id),
            'tenant_type': tenant.tenant_type,
            'organization_name': tenant.organization_name,
            'business_registration_number': tenant.business_registration_number,
            'subdomain': tenant.subdomain,
            'activation_status': tenant.activation_status,
            'registration_status': tenant.registration_status,
            'is_active': tenant.is_active,
            'primary_contact_name': tenant.primary_contact_name,
            'primary_contact_email': tenant.primary_contact_email,
            'primary_contact_phone': tenant.primary_contact_phone,
            'secondary_contact_name': tenant.secondary_contact_name,
            'secondary_contact_email': tenant.secondary_contact_email,
            'secondary_contact_phone': tenant.secondary_contact_phone,
            'primary_business_address': tenant.primary_business_address,
            'website': tenant.website,
            'created_at': tenant.created_at,
            'updated_at': tenant.updated_at,
            'activated_at': tenant.activated_at,
            'deactivated_at': tenant.deactivated_at,
        }
        
        # Add circle-specific data
        if tenant.tenant_type == 'Circle':
            data.update({
                'circle_code': tenant.circle_code,
                'circle_name': tenant.circle_name,
                'parent_tenant': {
                    'id': str(tenant.parent_tenant.id),
                    'organization_name': tenant.parent_tenant.organization_name,
                } if tenant.parent_tenant else None,
            })
        
        # Add corporate-specific data
        elif tenant.tenant_type == 'Corporate':
            circles = tenant.child_tenants.filter(tenant_type='Circle', is_active=True)
            data['circles'] = [
                {
                    'id': str(circle.id),
                    'circle_name': circle.circle_name,
                    'circle_code': circle.circle_code,
                }
                for circle in circles
            ]
        
        # Add vendor-specific data
        elif tenant.tenant_type == 'Vendor':
            data.update({
                'coverage_areas': tenant.coverage_areas or [],
                'service_capabilities': tenant.service_capabilities or [],
                'certifications': tenant.certifications or [],
            })
        
        return data
    
    def _get_tenant_usage_stats(self, tenant):
        """Get usage statistics for tenant"""
        from apps.projects.models import Project
        from apps.sites.models import Site
        from apps.equipment.models import Equipment
        from apps.tasks.models import Task
        
        return {
            'projects_count': Project.objects.filter(tenant=tenant).count(),
            'sites_count': Site.objects.filter(tenant=tenant).count(),
            'equipment_count': Equipment.objects.filter(tenant=tenant).count(),
            'tasks_count': Task.objects.filter(tenant=tenant).count(),
        }
    
    def _deactivate_tenant_users(self, tenant):
        """Deactivate all users for a tenant"""
        users = User.objects.filter(
            tenant_user_profile__tenant_id=tenant.id
        )
        users.update(is_active=False) 
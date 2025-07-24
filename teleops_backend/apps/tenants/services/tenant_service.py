"""
Tenant service for core tenant management
"""

import logging
from typing import Optional, Dict, Any, List
from django.db import transaction
from django.utils import timezone

from ..models import Tenant, TelecomCircle, CorporateCircleRelationship
from ..exceptions import (
    TenantNotFoundError,
    TenantValidationError,
    CircleValidationError
)

logger = logging.getLogger(__name__)


class TenantService:
    """Service for managing tenants"""
    
    def create_corporate_tenant(self, tenant_data: Dict[str, Any], circles: List[str] = None) -> Tenant:
        """
        Create a corporate tenant with optional circles
        
        Args:
            tenant_data: Dictionary containing tenant details
            circles: List of circle codes to create
            
        Returns:
            Tenant: Created corporate tenant
            
        Raises:
            TenantValidationError: If validation fails
            CircleValidationError: If circle validation fails
        """
        try:
            with transaction.atomic():
                # Validate circle codes if provided
                if circles:
                    self._validate_circle_codes(circles)
                
                # Create corporate tenant
                corporate = Tenant.objects.create(
                    tenant_type='Corporate',
                    organization_name=tenant_data['organization_name'],
                    business_registration_number=tenant_data.get('business_registration_number'),
                    subdomain=tenant_data['subdomain'],
                    primary_contact_name=tenant_data['primary_contact_name'],
                    primary_contact_email=tenant_data['primary_contact_email'],
                    primary_contact_phone=tenant_data['primary_contact_phone'],
                    primary_business_address=tenant_data.get('primary_business_address', ''),
                    website=tenant_data.get('website', ''),
                    registration_status='Pending',
                    activation_status='Inactive',  # Changed: Tenant starts as Inactive until email verification
                    is_active=False,  # Changed: Not active until user completes profile setup
                )
                
                # Create circle tenants if specified
                circle_tenants = []
                if circles:
                    for circle_code in circles:
                        circle_tenant = self._create_circle_tenant(corporate, circle_code)
                        circle_tenants.append(circle_tenant)
                
                logger.info(f"Corporate tenant created: {corporate.organization_name} with {len(circle_tenants)} circles")
                return corporate
                
        except Exception as e:
            logger.error(f"Failed to create corporate tenant: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to create corporate tenant: {str(e)}")
    
    def create_circle_tenant(self, parent_tenant_id: str, circle_code: str, tenant_data: Dict[str, Any]) -> Tenant:
        """
        Create a circle tenant under a parent corporate
        
        Args:
            parent_tenant_id: UUID of the parent corporate tenant
            circle_code: Circle code for the tenant
            tenant_data: Dictionary containing tenant details
            
        Returns:
            Tenant: Created circle tenant
            
        Raises:
            TenantNotFoundError: If parent tenant not found
            CircleValidationError: If circle validation fails
        """
        try:
            with transaction.atomic():
                # Get parent tenant
                parent_tenant = self._get_tenant_by_id(parent_tenant_id)
                
                if parent_tenant.tenant_type != 'Corporate':
                    raise TenantValidationError("Parent tenant must be Corporate type")
                
                # Validate circle code
                circle_info = self._get_circle_info(circle_code)
                
                # Create circle tenant
                circle_tenant = Tenant.objects.create(
                    tenant_type='Circle',
                    parent_tenant=parent_tenant,
                    organization_name=tenant_data['organization_name'],
                    circle=circle_info,
                    circle_code=circle_code,
                    circle_name=circle_info.circle_name,
                    business_registration_number=parent_tenant.business_registration_number,
                    subdomain=tenant_data['subdomain'],
                    primary_contact_name=tenant_data['primary_contact_name'],
                    primary_contact_email=tenant_data['primary_contact_email'],
                    primary_contact_phone=tenant_data['primary_contact_phone'],
                    primary_business_address=tenant_data.get('primary_business_address', parent_tenant.primary_business_address),
                    registration_status='Pending',
                    activation_status='Inactive',  # Changed: Tenant starts as Inactive until email verification
                    is_active=False,  # Changed: Not active until user completes profile setup
                )
                
                # Create corporate-circle relationship
                CorporateCircleRelationship.objects.create(
                    corporate_tenant=parent_tenant,
                    circle_tenant=circle_tenant,
                    governance_level='Autonomous',
                    separate_billing=True,
                    independent_vendor_management=True,
                )
                
                logger.info(f"Circle tenant created: {circle_tenant.organization_name}")
                return circle_tenant
                
        except Exception as e:
            logger.error(f"Failed to create circle tenant: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to create circle tenant: {str(e)}")
    
    def create_vendor_tenant(self, tenant_data: Dict[str, Any]) -> Tenant:
        """
        Create a vendor tenant
        
        Args:
            tenant_data: Dictionary containing tenant details
            
        Returns:
            Tenant: Created vendor tenant
            
        Raises:
            TenantValidationError: If validation fails
        """
        try:
            with transaction.atomic():
                vendor = Tenant.objects.create(
                    tenant_type='Vendor',
                    organization_name=tenant_data['organization_name'],
                    business_registration_number=tenant_data.get('business_registration_number'),
                    subdomain=tenant_data['subdomain'],
                    primary_contact_name=tenant_data['primary_contact_name'],
                    primary_contact_email=tenant_data['primary_contact_email'],
                    primary_contact_phone=tenant_data['primary_contact_phone'],
                    primary_business_address=tenant_data.get('primary_business_address', ''),
                    website=tenant_data.get('website', ''),
                    coverage_areas=tenant_data.get('coverage_areas', []),
                    service_capabilities=tenant_data.get('service_capabilities', []),
                    certifications=tenant_data.get('certifications', []),
                    registration_status='Pending',
                    activation_status='Inactive',  # Changed: Tenant starts as Inactive until email verification
                    is_active=False,  # Changed: Not active until user completes profile setup
                )
                
                logger.info(f"Vendor tenant created: {vendor.organization_name}")
                return vendor
                
        except Exception as e:
            logger.error(f"Failed to create vendor tenant: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to create vendor tenant: {str(e)}")
    
    def get_tenant_by_id(self, tenant_id: str) -> Tenant:
        """
        Get tenant by ID
        
        Args:
            tenant_id: UUID of the tenant
            
        Returns:
            Tenant: Tenant instance
            
        Raises:
            TenantNotFoundError: If tenant not found
        """
        return self._get_tenant_by_id(tenant_id)
    
    def get_corporate_circles(self, corporate_tenant_id: str) -> List[Tenant]:
        """
        Get all circle tenants for a corporate
        
        Args:
            corporate_tenant_id: UUID of the corporate tenant
            
        Returns:
            List[Tenant]: List of circle tenants
            
        Raises:
            TenantNotFoundError: If corporate tenant not found
        """
        try:
            corporate = self._get_tenant_by_id(corporate_tenant_id)
            
            if corporate.tenant_type != 'Corporate':
                raise TenantValidationError("Tenant must be Corporate type")
            
            return list(corporate.circle_children.filter(is_active=True))
            
        except Exception as e:
            logger.error(f"Failed to get corporate circles: {e}", exc_info=True)
            raise
    
    def update_tenant(self, tenant_id: str, update_data: Dict[str, Any]) -> Tenant:
        """
        Update tenant information
        
        Args:
            tenant_id: UUID of the tenant
            update_data: Dictionary containing fields to update
            
        Returns:
            Tenant: Updated tenant instance
            
        Raises:
            TenantNotFoundError: If tenant not found
        """
        try:
            tenant = self._get_tenant_by_id(tenant_id)
            
            # Define updateable fields
            updateable_fields = [
                'organization_name', 'primary_contact_name', 'primary_contact_email',
                'primary_contact_phone', 'secondary_contact_name', 'secondary_contact_email',
                'secondary_contact_phone', 'primary_business_address', 'website',
                'specialization', 'coverage_areas', 'service_capabilities',
                'equipment_capabilities', 'certifications'
            ]
            
            # Update allowed fields
            for field, value in update_data.items():
                if field in updateable_fields and hasattr(tenant, field):
                    setattr(tenant, field, value)
            
            tenant.updated_at = timezone.now()
            tenant.save()
            
            logger.info(f"Tenant updated: {tenant.organization_name}")
            return tenant
            
        except Exception as e:
            logger.error(f"Failed to update tenant: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to update tenant: {str(e)}")
    
    def activate_tenant(self, tenant_id: str) -> Tenant:
        """
        Activate a tenant
        
        Args:
            tenant_id: UUID of the tenant
            
        Returns:
            Tenant: Activated tenant instance
        """
        try:
            tenant = self._get_tenant_by_id(tenant_id)
            
            tenant.activation_status = 'Active'
            tenant.is_active = True
            tenant.activated_at = timezone.now()
            tenant.save()
            
            logger.info(f"Tenant activated: {tenant.organization_name}")
            return tenant
            
        except Exception as e:
            logger.error(f"Failed to activate tenant: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to activate tenant: {str(e)}")
    
    def deactivate_tenant(self, tenant_id: str, reason: str = None) -> Tenant:
        """
        Deactivate a tenant
        
        Args:
            tenant_id: UUID of the tenant
            reason: Optional reason for deactivation
            
        Returns:
            Tenant: Deactivated tenant instance
        """
        try:
            tenant = self._get_tenant_by_id(tenant_id)
            
            tenant.activation_status = 'Suspended'
            tenant.is_active = False
            tenant.deactivated_at = timezone.now()
            tenant.save()
            
            logger.info(f"Tenant deactivated: {tenant.organization_name}, reason: {reason}")
            return tenant
            
        except Exception as e:
            logger.error(f"Failed to deactivate tenant: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to deactivate tenant: {str(e)}")
    
    def _get_tenant_by_id(self, tenant_id: str) -> Tenant:
        """Get tenant by ID with error handling"""
        try:
            return Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            raise TenantNotFoundError(f"Tenant with ID {tenant_id} not found")
    
    def _get_circle_info(self, circle_code: str) -> TelecomCircle:
        """Get circle information by code"""
        try:
            return TelecomCircle.objects.get(circle_code=circle_code, is_active=True)
        except TelecomCircle.DoesNotExist:
            raise CircleValidationError(f"Invalid circle code: {circle_code}")
    
    def _validate_circle_codes(self, circle_codes: List[str]) -> bool:
        """Validate multiple circle codes"""
        valid_codes = TelecomCircle.objects.filter(
            circle_code__in=circle_codes, 
            is_active=True
        ).values_list('circle_code', flat=True)
        
        invalid_codes = set(circle_codes) - set(valid_codes)
        if invalid_codes:
            raise CircleValidationError(f"Invalid circle codes: {', '.join(invalid_codes)}")
        
        return True
    
    def _create_circle_tenant(self, corporate: Tenant, circle_code: str) -> Tenant:
        """Create a circle tenant under corporate"""
        circle_info = self._get_circle_info(circle_code)
        
        circle_tenant = Tenant.objects.create(
            tenant_type='Circle',
            parent_tenant=corporate,
            organization_name=f"{corporate.organization_name} {circle_info.circle_name}",
            circle=circle_info,
            circle_code=circle_code,
            circle_name=circle_info.circle_name,
            business_registration_number=corporate.business_registration_number,
            subdomain=f"{corporate.organization_name.lower().replace(' ', '-')}-{circle_code.lower()}-teleops",
            primary_contact_name=corporate.primary_contact_name,
            primary_contact_email=corporate.primary_contact_email,
            primary_contact_phone=corporate.primary_contact_phone,
            primary_business_address=corporate.primary_business_address,
            registration_status='Pending',
            activation_status='Inactive',  # Changed: Tenant starts as Inactive until email verification
            is_active=False,  # Changed: Not active until user completes profile setup
        )
        
        # Create corporate-circle relationship
        CorporateCircleRelationship.objects.create(
            corporate_tenant=corporate,
            circle_tenant=circle_tenant,
            governance_level='Autonomous',
            separate_billing=True,
            independent_vendor_management=True,
        )
        
        return circle_tenant
    
    def activate_tenant_after_verification(self, tenant_id: str) -> bool:
        """
        Activate a tenant after email verification and profile completion
        
        Args:
            tenant_id: UUID of the tenant to activate
            
        Returns:
            bool: True if successfully activated
            
        Raises:
            TenantNotFoundError: If tenant not found
            TenantValidationError: If tenant cannot be activated
        """
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            
            # Only activate if currently inactive
            if tenant.activation_status != 'Inactive':
                logger.warning(f"Tenant {tenant_id} is already {tenant.activation_status}, skipping activation")
                return False
            
            # Activate the tenant
            tenant.activation_status = 'Active'
            tenant.is_active = True
            tenant.activated_at = timezone.now()
            tenant.save()
            
            logger.info(f"Tenant {tenant.organization_name} ({tenant_id}) activated after email verification")
            return True
            
        except Tenant.DoesNotExist:
            raise TenantNotFoundError(f"Tenant {tenant_id} not found")
        except Exception as e:
            logger.error(f"Failed to activate tenant {tenant_id}: {e}", exc_info=True)
            raise TenantValidationError(f"Failed to activate tenant: {str(e)}") 
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Tenant, CircleVendorRelationship
import logging

logger = logging.getLogger(__name__)


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
#!/usr/bin/env python
"""
Script to fix CircleVendorRelationship statuses to match tenant approval status
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import CircleVendorRelationship

def fix_vendor_statuses():
    """Fix vendor relationship statuses to match tenant approval status"""
    print("Starting vendor relationship status fix...")
    
    # Find all vendor relationships that have a linked tenant
    relationships = CircleVendorRelationship.objects.filter(
        vendor_tenant__isnull=False
    ).select_related('vendor_tenant')
    
    total_count = relationships.count()
    fixed_count = 0
    
    print(f"Found {total_count} vendor relationships to check")
    
    for relationship in relationships:
        tenant = relationship.vendor_tenant
        old_status = relationship.relationship_status
        old_active = relationship.is_active
        
        # Determine correct status based on tenant
        if tenant.is_active and tenant.registration_status == 'Approved':
            # Tenant is approved and active
            relationship.is_active = True
            relationship.relationship_status = 'Active'
            new_status = "Active"
            
        elif tenant.registration_status == 'Rejected':
            # Tenant was rejected
            relationship.is_active = False
            relationship.relationship_status = 'Terminated'
            new_status = "Terminated"
            
        else:
            # Tenant is still pending or inactive
            relationship.is_active = False
            relationship.relationship_status = 'Pending_Approval'
            new_status = "Pending_Approval"
        
        # Only save if there's a change
        if (relationship.relationship_status != old_status or 
            relationship.is_active != old_active):
            
            relationship.save()
            fixed_count += 1
            
            print(f"✓ Fixed relationship {relationship.id} "
                  f"({tenant.organization_name}): "
                  f"{old_status} -> {new_status}, "
                  f"active: {old_active} -> {relationship.is_active}")
        else:
            print(f"- No change needed for {relationship.id} "
                  f"({tenant.organization_name}): {old_status}")
    
    print(f"\nCompleted! Fixed {fixed_count} out of {total_count} relationships")

if __name__ == "__main__":
    fix_vendor_statuses() 
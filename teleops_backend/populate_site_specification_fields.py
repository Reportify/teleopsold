#!/usr/bin/env python
"""
Populate the new specification fields for existing sites
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.sites.models import Site

def populate_specification_fields():
    """Populate new specification fields for existing sites"""
    print("Populating specification fields for existing sites...")
    
    try:
        # Get all sites that have null specification fields
        sites_to_update = Site.objects.filter(
            site_id__isnull=True
        ).exclude(deleted_at__isnull=False)
        
        total_sites = sites_to_update.count()
        print(f"Found {total_sites} sites to update")
        
        if total_sites == 0:
            print("✅ All sites already have specification fields populated")
            return True
        
        updated_count = 0
        for site in sites_to_update:
            # Generate site_id from existing data
            if site.site_code:
                site.site_id = site.site_code
            else:
                site.site_id = f"SITE_{site.id:05d}"
            
            # Generate global_id
            site.global_id = f"GLOBAL_{site.id:05d}"
            
            # Use existing name or generate one
            if site.name:
                site.site_name = site.name
            else:
                site.site_name = f"Site {site.id}"
            
            # Use existing city as town
            site.town = site.city or "Unknown"
            
            # Set default cluster
            site.cluster = "Legacy Zone"
            
            # Update legacy fields to match
            if not site.name:
                site.name = site.site_name
            if not site.city:
                site.city = site.town
            if not site.site_code:
                site.site_code = site.site_id
            
            site.save()
            updated_count += 1
            
            if updated_count % 10 == 0:
                print(f"Updated {updated_count}/{total_sites} sites...")
        
        print(f"✅ Successfully updated {updated_count} sites")
        return True
        
    except Exception as e:
        print(f"❌ Error populating fields: {str(e)}")
        return False

if __name__ == "__main__":
    success = populate_specification_fields()
    if success:
        print("\n🎉 Specification fields populated successfully!")
    else:
        print("\n❌ Failed to populate specification fields.")
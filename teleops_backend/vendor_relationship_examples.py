#!/usr/bin/env python
"""
Enhanced Vendor Relationship Examples
=====================================

This script demonstrates how the new VendorRelationship model handles
complex multi-level vendor hierarchies and cross-relationships.

Examples based on user requirements:
- Vodafone (Corporate) have Circles (MPCG, UPE etc)
- Ericsson (Corporate) have Circles (MPDC, RJ, UPW etc)
- For Vodafone MPCG, vedag is a vendor
- vedag can also have vendor Verveland
- Verveland is a vendor of Vodafone MPCG also
- Ericsson MPCG and Ericsson UPW is a Vendor of Vodafone MPCG and Vodafone UPW
- Verveland is also a vendor of Ericsson MPCG
- Verveland is also a vendor of vedag
"""

import os
import sys
import django
from datetime import date, timedelta

# Setup Django environment
sys.path.append('/h:/teleops/teleops_backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import Tenant, VendorRelationship, TelecomCircle


def create_sample_tenants():
    """Create sample tenants for demonstration"""
    
    # Create or get Telecom Circles
    mpcg_circle, _ = TelecomCircle.objects.get_or_create(
        circle_code='MPCG',
        defaults={
            'circle_name': 'Madhya Pradesh & Chhattisgarh',
            'region': 'Central',
            'state_coverage': ['Madhya Pradesh', 'Chhattisgarh']
        }
    )
    
    upe_circle, _ = TelecomCircle.objects.get_or_create(
        circle_code='UPE',
        defaults={
            'circle_name': 'Uttar Pradesh East',
            'region': 'North',
            'state_coverage': ['Uttar Pradesh (East)']
        }
    )
    
    upw_circle, _ = TelecomCircle.objects.get_or_create(
        circle_code='UPW',
        defaults={
            'circle_name': 'Uttar Pradesh West',
            'region': 'North',
            'state_coverage': ['Uttar Pradesh (West)']
        }
    )

    # Create Corporate Tenants
    vodafone_corporate, _ = Tenant.objects.get_or_create(
        organization_name='Vodafone India',
        defaults={
            'tenant_type': 'Corporate',
            'subdomain': 'vodafone-teleops',
            'primary_contact_email': 'admin@vodafone.in',
            'primary_contact_name': 'Vodafone Admin',
            'primary_contact_phone': '+91-9999000001',
            'primary_business_address': 'Mumbai, Maharashtra',
            'industry_sector': 'Telecommunications'
        }
    )
    
    ericsson_corporate, _ = Tenant.objects.get_or_create(
        organization_name='Ericsson India',
        defaults={
            'tenant_type': 'Corporate',
            'subdomain': 'ericsson-teleops',
            'primary_contact_email': 'admin@ericsson.in',
            'primary_contact_name': 'Ericsson Admin',
            'primary_contact_phone': '+91-9999000002',
            'primary_business_address': 'Gurgaon, Haryana',
            'industry_sector': 'Telecommunications Equipment'
        }
    )

    # Create Circle Tenants
    vodafone_mpcg, _ = Tenant.objects.get_or_create(
        organization_name='Vodafone MPCG',
        defaults={
            'tenant_type': 'Circle',
            'parent_tenant': vodafone_corporate,
            'circle': mpcg_circle,
            'circle_code': 'MPCG',
            'circle_name': 'Madhya Pradesh & Chhattisgarh',
            'subdomain': 'vodafone-mpcg-teleops',
            'primary_contact_email': 'mpcg@vodafone.in',
            'primary_contact_name': 'MPCG Circle Head',
            'primary_contact_phone': '+91-9999000003',
            'primary_business_address': 'Bhopal, Madhya Pradesh'
        }
    )
    
    vodafone_upe, _ = Tenant.objects.get_or_create(
        organization_name='Vodafone UPE',
        defaults={
            'tenant_type': 'Circle',
            'parent_tenant': vodafone_corporate,
            'circle': upe_circle,
            'circle_code': 'UPE',
            'circle_name': 'Uttar Pradesh East',
            'subdomain': 'vodafone-upe-teleops',
            'primary_contact_email': 'upe@vodafone.in',
            'primary_contact_name': 'UPE Circle Head',
            'primary_contact_phone': '+91-9999000004',
            'primary_business_address': 'Lucknow, Uttar Pradesh'
        }
    )
    
    vodafone_upw, _ = Tenant.objects.get_or_create(
        organization_name='Vodafone UPW',
        defaults={
            'tenant_type': 'Circle',
            'parent_tenant': vodafone_corporate,
            'circle': upw_circle,
            'circle_code': 'UPW',
            'circle_name': 'Uttar Pradesh West',
            'subdomain': 'vodafone-upw-teleops',
            'primary_contact_email': 'upw@vodafone.in',
            'primary_contact_name': 'UPW Circle Head',
            'primary_contact_phone': '+91-9999000005',
            'primary_business_address': 'Agra, Uttar Pradesh'
        }
    )
    
    ericsson_mpcg, _ = Tenant.objects.get_or_create(
        organization_name='Ericsson MPCG',
        defaults={
            'tenant_type': 'Circle',
            'parent_tenant': ericsson_corporate,
            'circle': mpcg_circle,
            'circle_code': 'MPCG',
            'circle_name': 'Madhya Pradesh & Chhattisgarh',
            'subdomain': 'ericsson-mpcg-teleops',
            'primary_contact_email': 'mpcg@ericsson.in',
            'primary_contact_name': 'Ericsson MPCG Head',
            'primary_contact_phone': '+91-9999000006',
            'primary_business_address': 'Indore, Madhya Pradesh'
        }
    )
    
    ericsson_upw, _ = Tenant.objects.get_or_create(
        organization_name='Ericsson UPW',
        defaults={
            'tenant_type': 'Circle',
            'parent_tenant': ericsson_corporate,
            'circle': upw_circle,
            'circle_code': 'UPW',
            'circle_name': 'Uttar Pradesh West',
            'subdomain': 'ericsson-upw-teleops',
            'primary_contact_email': 'upw@ericsson.in',
            'primary_contact_name': 'Ericsson UPW Head',
            'primary_contact_phone': '+91-9999000007',
            'primary_business_address': 'Meerut, Uttar Pradesh'
        }
    )

    # Create Vendor Tenants
    vedag, _ = Tenant.objects.get_or_create(
        organization_name='vedag',
        defaults={
            'tenant_type': 'Vendor',
            'subdomain': 'vedag-teleops',
            'primary_contact_email': 'admin@vedag.com',
            'primary_contact_name': 'vedag CEO',
            'primary_contact_phone': '+91-9999000008',
            'primary_business_address': 'Delhi, India',
            'specialization': ['Tower Installation', 'Network Maintenance', 'Site Survey']
        }
    )
    
    verveland, _ = Tenant.objects.get_or_create(
        organization_name='Verveland',
        defaults={
            'tenant_type': 'Vendor',
            'subdomain': 'verveland-teleops',
            'primary_contact_email': 'admin@verveland.com',
            'primary_contact_name': 'Verveland Director',
            'primary_contact_phone': '+91-9999000009',
            'primary_business_address': 'Pune, Maharashtra',
            'specialization': ['Tower Dismantling', 'Equipment Recovery', 'Site Maintenance']
        }
    )

    return {
        'vodafone_corporate': vodafone_corporate,
        'ericsson_corporate': ericsson_corporate,
        'vodafone_mpcg': vodafone_mpcg,
        'vodafone_upe': vodafone_upe,
        'vodafone_upw': vodafone_upw,
        'ericsson_mpcg': ericsson_mpcg,
        'ericsson_upw': ericsson_upw,
        'vedag': vedag,
        'verveland': verveland
    }


def create_complex_vendor_relationships():
    """Create complex vendor relationships as described by the user"""
    
    tenants = create_sample_tenants()
    
    print("Creating Complex Vendor Relationships...")
    print("=" * 50)
    
    # Relationship 1: Vodafone MPCG → vedag (Circle hires Vendor)
    rel1, created = VendorRelationship.objects.get_or_create(
        client_tenant=tenants['vodafone_mpcg'],
        vendor_tenant=tenants['vedag'],
        vendor_code='VF_MPCG_VND_001',
        defaults={
            'relationship_type': 'Primary_Vendor',
            'relationship_status': 'Active',
            'verification_status': 'Verified',
            'service_capabilities': ['Tower Installation', 'Network Maintenance'],
            'service_areas': ['Bhopal', 'Indore', 'Gwalior'],
            'billing_rate': 50000.00,
            'billing_unit': 'Per_Project',
            'contract_start_date': date.today(),
            'contract_end_date': date.today() + timedelta(days=365),
            'performance_rating': 4.2
        }
    )
    print(f"✓ Created: {rel1}")
    
    # Relationship 2: vedag → Verveland (Vendor sub-contracts to another Vendor)
    rel2, created = VendorRelationship.objects.get_or_create(
        client_tenant=tenants['vedag'],
        vendor_tenant=tenants['verveland'],
        vendor_code='VEDAG_SUB_001',
        parent_relationship=rel1,  # This makes it a sub-contracting relationship
        defaults={
            'relationship_type': 'Subcontractor',
            'relationship_status': 'Active',
            'verification_status': 'Verified',
            'service_capabilities': ['Tower Dismantling', 'Equipment Recovery'],
            'service_areas': ['Indore', 'Ujjain'],
            'billing_rate': 30000.00,
            'billing_unit': 'Per_Project',
            'revenue_share_percentage': 25.0,  # vedag keeps 25% of revenue
            'contract_start_date': date.today(),
            'contract_end_date': date.today() + timedelta(days=300)
        }
    )
    print(f"✓ Created: {rel2}")
    
    # Relationship 3: Vodafone MPCG → Verveland (Direct vendor relationship)
    rel3, created = VendorRelationship.objects.get_or_create(
        client_tenant=tenants['vodafone_mpcg'],
        vendor_tenant=tenants['verveland'],
        vendor_code='VF_MPCG_VND_002',
        defaults={
            'relationship_type': 'Primary_Vendor',
            'relationship_status': 'Active',
            'verification_status': 'Verified',
            'service_capabilities': ['Tower Dismantling', 'Site Maintenance'],
            'service_areas': ['Bhopal', 'Jabalpur'],
            'billing_rate': 45000.00,
            'billing_unit': 'Per_Project',
            'contract_start_date': date.today(),
            'contract_end_date': date.today() + timedelta(days=365),
            'performance_rating': 4.5
        }
    )
    print(f"✓ Created: {rel3}")
    
    # Relationship 4: Vodafone MPCG → Ericsson MPCG (Corporate Circle as vendor)
    rel4, created = VendorRelationship.objects.get_or_create(
        client_tenant=tenants['vodafone_mpcg'],
        vendor_tenant=tenants['ericsson_mpcg'],
        vendor_code='VF_MPCG_ERI_001',
        defaults={
            'relationship_type': 'Service_Provider',
            'relationship_status': 'Active',
            'verification_status': 'Verified',
            'service_capabilities': ['Equipment Installation', '5G Deployment', 'Network Optimization'],
            'service_areas': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'],
            'billing_rate': 200000.00,
            'billing_unit': 'Per_Project',
            'contract_start_date': date.today(),
            'contract_end_date': date.today() + timedelta(days=730),  # 2 years
            'performance_rating': 4.8
        }
    )
    print(f"✓ Created: {rel4}")
    
    # Relationship 5: Vodafone UPW → Ericsson UPW (Corporate Circle as vendor)
    rel5, created = VendorRelationship.objects.get_or_create(
        client_tenant=tenants['vodafone_upw'],
        vendor_tenant=tenants['ericsson_upw'],
        vendor_code='VF_UPW_ERI_001',
        defaults={
            'relationship_type': 'Service_Provider',
            'relationship_status': 'Active',
            'verification_status': 'Verified',
            'service_capabilities': ['Equipment Installation', 'Network Maintenance', 'Technical Support'],
            'service_areas': ['Agra', 'Mathura', 'Aligarh'],
            'billing_rate': 180000.00,
            'billing_unit': 'Per_Project',
            'contract_start_date': date.today(),
            'contract_end_date': date.today() + timedelta(days=730),
            'performance_rating': 4.6
        }
    )
    print(f"✓ Created: {rel5}")
    
    # Relationship 6: Ericsson MPCG → Verveland (Corporate Circle hires vendor)
    rel6, created = VendorRelationship.objects.get_or_create(
        client_tenant=tenants['ericsson_mpcg'],
        vendor_tenant=tenants['verveland'],
        vendor_code='ERI_MPCG_VND_001',
        defaults={
            'relationship_type': 'Primary_Vendor',
            'relationship_status': 'Active',
            'verification_status': 'Verified',
            'service_capabilities': ['Site Preparation', 'Equipment Installation Support'],
            'service_areas': ['Indore', 'Bhopal'],
            'billing_rate': 40000.00,
            'billing_unit': 'Per_Project',
            'contract_start_date': date.today(),
            'contract_end_date': date.today() + timedelta(days=365),
            'performance_rating': 4.3
        }
    )
    print(f"✓ Created: {rel6}")
    
    return [rel1, rel2, rel3, rel4, rel5, rel6]


def demonstrate_relationship_queries():
    """Demonstrate various relationship queries"""
    
    tenants = create_sample_tenants()
    
    print("\n" + "=" * 50)
    print("RELATIONSHIP QUERY EXAMPLES")
    print("=" * 50)
    
    # Query 1: Find all vendors for Vodafone MPCG
    vodafone_mpcg_vendors = VendorRelationship.objects.filter(
        client_tenant=tenants['vodafone_mpcg'],
        relationship_status='Active'
    )
    print(f"\n1. Vodafone MPCG Vendors ({vodafone_mpcg_vendors.count()}):")
    for rel in vodafone_mpcg_vendors:
        vendor_name = rel.vendor_tenant.organization_name if rel.vendor_tenant else rel.vendor_name
        print(f"   → {vendor_name} ({rel.relationship_type}) - Code: {rel.vendor_code}")
        if rel.hierarchy_level > 1:
            print(f"     ↳ Subcontractor (Level {rel.hierarchy_level})")
    
    # Query 2: Find all clients of Verveland
    verveland_clients = VendorRelationship.objects.filter(
        vendor_tenant=tenants['verveland'],
        relationship_status='Active'
    )
    print(f"\n2. Verveland Clients ({verveland_clients.count()}):")
    for rel in verveland_clients:
        print(f"   ← {rel.client_tenant.organization_name} ({rel.relationship_type})")
        print(f"     Code: {rel.vendor_code}, Rate: ₹{rel.billing_rate}")
        if rel.parent_relationship:
            print(f"     ↳ Sub-contract under: {rel.parent_relationship.client_tenant.organization_name}")
    
    # Query 3: Find all sub-contractors
    subcontractors = VendorRelationship.objects.filter(
        hierarchy_level__gt=1,
        relationship_status='Active'
    )
    print(f"\n3. Sub-contracting Relationships ({subcontractors.count()}):")
    for rel in subcontractors:
        print(f"   {rel.hierarchy_path}")
        print(f"   Revenue Share: {rel.revenue_share_percentage}%")
    
    # Query 4: Find Corporate-to-Corporate relationships
    corp_to_corp = VendorRelationship.objects.filter(
        client_tenant__tenant_type='Circle',
        vendor_tenant__tenant_type='Circle',
        relationship_status='Active'
    )
    print(f"\n4. Circle-to-Circle Service Relationships ({corp_to_corp.count()}):")
    for rel in corp_to_corp:
        print(f"   {rel.client_tenant.organization_name} ← {rel.vendor_tenant.organization_name}")
        print(f"   Service: {', '.join(rel.service_capabilities)}")
        print(f"   Rate: ₹{rel.billing_rate} {rel.billing_unit}")
    
    # Query 5: Find multi-level vendor networks
    print(f"\n5. Multi-level Vendor Networks:")
    primary_relationships = VendorRelationship.objects.filter(
        hierarchy_level=1,
        relationship_status='Active'
    ).prefetch_related('sub_relationships')
    
    for rel in primary_relationships:
        if rel.has_subcontractors:
            print(f"\n   Primary: {rel}")
            subcontractors = rel.get_all_subcontractors()
            for sub in subcontractors:
                vendor_name = sub.vendor_tenant.organization_name if sub.vendor_tenant else sub.vendor_name
                print(f"   {'  ' * sub.hierarchy_level}↳ Level {sub.hierarchy_level}: {vendor_name}")
    
    # Query 6: Cross-vendor analysis for Verveland
    print(f"\n6. Verveland's Complex Relationship Network:")
    verveland_all_relationships = VendorRelationship.objects.filter(
        vendor_tenant=tenants['verveland']
    ).select_related('client_tenant', 'parent_relationship')
    
    for rel in verveland_all_relationships:
        print(f"   • Client: {rel.client_tenant.organization_name}")
        print(f"     Type: {rel.relationship_type}")
        print(f"     Hierarchy: Level {rel.hierarchy_level}")
        if rel.parent_relationship:
            print(f"     Via: {rel.parent_relationship.client_tenant.organization_name}")
        print(f"     Revenue: ₹{rel.billing_rate}")
        print()


def demonstrate_business_logic():
    """Demonstrate business logic and validation"""
    
    print("\n" + "=" * 50)
    print("BUSINESS LOGIC DEMONSTRATIONS")
    print("=" * 50)
    
    tenants = create_sample_tenants()
    
    # Demo 1: Hierarchy validation
    print("\n1. Hierarchy Level Auto-calculation:")
    primary_rel = VendorRelationship.objects.filter(
        client_tenant=tenants['vodafone_mpcg'],
        vendor_tenant=tenants['vedag'],
        hierarchy_level=1
    ).first()
    
    if primary_rel:
        sub_rel = VendorRelationship.objects.filter(
            parent_relationship=primary_rel
        ).first()
        
        if sub_rel:
            print(f"   Primary (Level 1): {primary_rel}")
            print(f"   Sub-contract (Level {sub_rel.hierarchy_level}): {sub_rel}")
            print(f"   Auto-calculated hierarchy level: {sub_rel.hierarchy_level}")
    
    # Demo 2: Revenue calculation
    print("\n2. Revenue Sharing Example:")
    subcontractor_rel = VendorRelationship.objects.filter(
        relationship_type='Subcontractor',
        revenue_share_percentage__isnull=False
    ).first()
    
    if subcontractor_rel:
        total_project_value = 100000  # Example project value
        vendor_share = total_project_value * (subcontractor_rel.revenue_share_percentage / 100)
        parent_share = total_project_value - vendor_share
        
        print(f"   Project Value: ₹{total_project_value:,}")
        print(f"   Vendor Share ({subcontractor_rel.revenue_share_percentage}%): ₹{vendor_share:,}")
        print(f"   Parent Share: ₹{parent_share:,}")
    
    # Demo 3: Performance tracking
    print("\n3. Performance Tracking:")
    high_performers = VendorRelationship.objects.filter(
        performance_rating__gte=4.5,
        relationship_status='Active'
    )
    
    for rel in high_performers:
        vendor_name = rel.vendor_tenant.organization_name if rel.vendor_tenant else rel.vendor_name
        print(f"   ⭐ {vendor_name}: {rel.performance_rating}/5.0")
        print(f"      Client: {rel.client_tenant.organization_name}")
        print(f"      Services: {', '.join(rel.service_capabilities)}")


if __name__ == "__main__":
    print("Enhanced Vendor Relationship Management System")
    print("=" * 50)
    print("Setting up complex vendor relationships...")
    
    # Create the relationships
    relationships = create_complex_vendor_relationships()
    
    # Demonstrate queries
    demonstrate_relationship_queries()
    
    # Demonstrate business logic
    demonstrate_business_logic()
    
    print("\n" + "=" * 50)
    print("✅ Successfully demonstrated enhanced vendor relationship system!")
    print("✅ The new VendorRelationship model supports:")
    print("   • Multi-level vendor hierarchies")
    print("   • Cross-tenant vendor relationships") 
    print("   • Corporate-to-Corporate service relationships")
    print("   • Revenue sharing for sub-contractors")
    print("   • Complex vendor networks")
    print("   • Performance tracking and analytics") 
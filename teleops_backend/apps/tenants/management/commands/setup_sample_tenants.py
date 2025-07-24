"""
Management command to set up sample tenants for Circle-Based Multi-Tenant testing
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant, TelecomCircle, CorporateCircleRelationship, CircleVendorRelationship
import uuid

User = get_user_model()


class Command(BaseCommand):
    help = 'Set up sample tenants for Circle-Based Multi-Tenant testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing tenants before creating new ones',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing tenants...')
            Tenant.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing tenants cleared'))

        self.stdout.write('Setting up sample tenants...')

        # Create sample corporate tenant (Vodafone India)
        vodafone_corporate = Tenant.objects.create(
            tenant_type='Corporate',
            organization_name='Vodafone India',
            organization_code='VOD_CORP',
            business_registration_number='VOD123456789',
            primary_business_address='Vodafone House, Peninsula Corporate Park, Lower Parel, Mumbai - 400013',
            website='https://www.vodafone.in',
            subdomain='vodafone-corporate-teleops',
            primary_contact_name='Vodafone Corporate Admin',
            primary_contact_email='corporate.admin@vodafone.in',
            primary_contact_phone='+91-22-6652-0000',
            registration_status='Approved',
            activation_status='Active',
            is_active=True,
        )

        # Create sample circle tenants
        circles_data = [
            ('MPCG', 'Madhya Pradesh & Chhattisgarh', 'vodafone-mpcg-teleops'),
            ('UPE', 'UP East', 'vodafone-upe-teleops'),
            ('GJ', 'Gujarat', 'vodafone-gj-teleops'),
        ]

        circle_tenants = {}
        for circle_code, circle_name, subdomain in circles_data:
            # Get telecom circle reference
            telecom_circle = TelecomCircle.objects.get(circle_code=circle_code)
            
            circle_tenant = Tenant.objects.create(
                tenant_type='Circle',
                parent_tenant=vodafone_corporate,
                organization_name=f'Vodafone {circle_name}',
                organization_code=f'VOD_{circle_code}',
                circle=telecom_circle,
                circle_code=circle_code,
                circle_name=circle_name,
                subdomain=subdomain,
                primary_contact_name=f'Vodafone {circle_code} Admin',
                primary_contact_email=f'{circle_code.lower()}.admin@vodafone.in',
                primary_contact_phone='+91-22-6652-0000',
                primary_business_address=f'Vodafone {circle_name} Office',
                registration_status='Approved',
                activation_status='Active',
                is_active=True,
                operates_independently=True,
            )
            circle_tenants[circle_code] = circle_tenant

        # Create corporate-circle relationships
        for circle_code, circle_tenant in circle_tenants.items():
            CorporateCircleRelationship.objects.create(
                corporate_tenant=vodafone_corporate,
                circle_tenant=circle_tenant,
                governance_level='Autonomous',
                separate_billing=True,
                independent_vendor_management=True,
                independent_employee_management=True,
                reports_to_corporate=True,
                data_sharing_level='Aggregated',
            )

        # Create sample vendor tenants
        vendor_tenants = {}
        vendors_data = [
            ('ABC Infrastructure', 'ABC_INFRA', 'abc-infrastructure-teleops'),
            ('XYZ Telecom Services', 'XYZ_TELECOM', 'xyz-telecom-teleops'),
            ('DEF Network Solutions', 'DEF_NETWORK', 'def-network-teleops'),
        ]

        for vendor_name, org_code, subdomain in vendors_data:
            vendor_tenant = Tenant.objects.create(
                tenant_type='Vendor',
                organization_name=vendor_name,
                organization_code=org_code,
                subdomain=subdomain,
                primary_contact_name=f'{vendor_name} Admin',
                primary_contact_email=f'admin@{org_code.lower()}.com',
                primary_contact_phone='+91-11-1234-5678',
                primary_business_address=f'{vendor_name} Office, New Delhi',
                vendor_license_number=f'LIC_{org_code}_2024',
                specialization=['Dismantling', 'Installation', 'Maintenance'],
                coverage_areas=['MPCG', 'UPE', 'GJ'],
                service_capabilities=['Site Survey', 'Equipment Installation', 'Network Maintenance'],
                years_in_business=5,
                employee_count=50,
                registration_status='Approved',
                activation_status='Active',
                is_active=True,
            )
            vendor_tenants[org_code] = vendor_tenant

        # Create circle-vendor relationships
        circle_vendor_relationships = [
            # ABC Infrastructure works with MPCG and UPE
            ('MPCG', 'ABC_INFRA', 'ABC-MPCG', ['Dismantling', 'Installation']),
            ('UPE', 'ABC_INFRA', 'ABC-UPE', ['Maintenance', 'Survey']),
            # XYZ Telecom works with UPE and GJ
            ('UPE', 'XYZ_TELECOM', 'XYZ-UPE', ['Installation', 'Maintenance']),
            ('GJ', 'XYZ_TELECOM', 'XYZ-GJ', ['Dismantling', 'Survey']),
            # DEF Network works with all circles
            ('MPCG', 'DEF_NETWORK', 'DEF-MPCG', ['Installation', 'Maintenance']),
            ('UPE', 'DEF_NETWORK', 'DEF-UPE', ['Dismantling', 'Installation']),
            ('GJ', 'DEF_NETWORK', 'DEF-GJ', ['Maintenance', 'Survey']),
        ]

        for circle_code, vendor_code, vendor_internal_code, capabilities in circle_vendor_relationships:
            CircleVendorRelationship.objects.create(
                circle_tenant=circle_tenants[circle_code],
                vendor_tenant=vendor_tenants[vendor_code],
                vendor_code=vendor_internal_code,
                service_capabilities=capabilities,
                relationship_status='Active',
                billing_rate=50000.00,
                payment_terms='Net 30',
                communication_allowed=True,
                contact_access_level='Basic',
                is_active=True,
            )

        # Create sample users
        self.create_sample_users(vodafone_corporate, circle_tenants, vendor_tenants)

        self.stdout.write(self.style.SUCCESS('Sample tenants created successfully!'))
        self.stdout.write('\nCreated tenants:')
        self.stdout.write(f'  Corporate: {vodafone_corporate.organization_name}')
        for circle_code, tenant in circle_tenants.items():
            self.stdout.write(f'  Circle: {tenant.organization_name} ({circle_code})')
        for vendor_code, tenant in vendor_tenants.items():
            self.stdout.write(f'  Vendor: {tenant.organization_name}')

    def create_sample_users(self, corporate_tenant, circle_tenants, vendor_tenants):
        """Create sample users for testing"""
        
        # Create corporate admin
        corporate_admin = User.objects.create_user(
            username='corporate.admin',
            email='corporate.admin@vodafone.in',
            password='testpass123',
            first_name='Corporate',
            last_name='Admin',
            tenant=corporate_tenant,
            is_staff=True,
            is_superuser=True,
        )

        # Create circle admins
        for circle_code, tenant in circle_tenants.items():
            circle_admin = User.objects.create_user(
                username=f'{circle_code.lower()}.admin',
                email=f'{circle_code.lower()}.admin@vodafone.in',
                password='testpass123',
                first_name=f'{circle_code}',
                last_name='Admin',
                tenant=tenant,
                is_staff=True,
            )

        # Create vendor users
        for vendor_code, tenant in vendor_tenants.items():
            vendor_user = User.objects.create_user(
                username=f'{vendor_code.lower()}.user',
                email=f'user@{vendor_code.lower()}.com',
                password='testpass123',
                first_name=f'{vendor_code}',
                last_name='User',
                tenant=tenant,
            ) 
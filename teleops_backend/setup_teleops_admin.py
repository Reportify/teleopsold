#!/usr/bin/env python
"""
Setup script to configure superuser as Teleops admin
Run this script to set up the superuser with proper tenant context
"""

import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.tenants.models import Tenant, TelecomCircle
from apps.users.models import User

def setup_teleops_admin():
    """Setup superuser as Teleops admin"""
    
    print("🔧 Setting up Teleops Admin...")
    print("=" * 50)
    
    # Get the User model
    User = get_user_model()
    
    # Find superuser
    try:
        superuser = User.objects.filter(is_superuser=True).first()
        if not superuser:
            print("❌ No superuser found. Please create one first:")
            print("   python manage.py createsuperuser")
            return
        
        print(f"✅ Found superuser: {superuser.email}")
        
        # Create Teleops tenant if it doesn't exist
        teleops_tenant, created = Tenant.objects.get_or_create(
            organization_code='TELEOPS',
            defaults={
                'tenant_type': 'Corporate',  # Teleops acts as corporate for admin purposes
                'organization_name': 'Teleops Platform',
                'primary_contact_email': superuser.email,
                'primary_contact_name': f"{superuser.first_name} {superuser.last_name}",
                'primary_contact_phone': '+919999999999',
                'primary_business_address': 'Teleops Headquarters, India',
                'subdomain': 'teleops-admin',
                'subscription_plan': 'Enterprise',
                'registration_status': 'Approved',
                'activation_status': 'Active',
                'is_active': True,
            }
        )
        
        if created:
            print(f"✅ Created Teleops tenant: {teleops_tenant.organization_name}")
        else:
            print(f"✅ Found existing Teleops tenant: {teleops_tenant.organization_name}")
        
        # Assign superuser to Teleops tenant
        superuser.tenant = teleops_tenant
        superuser.save()
        
        print(f"✅ Assigned superuser to Teleops tenant")
        
        # Create test telecom circles
        circles_data = [
            {'circle_code': 'MPCG', 'circle_name': 'Madhya Pradesh & Chhattisgarh'},
            {'circle_code': 'UPE', 'circle_name': 'Uttar Pradesh East'},
            {'circle_code': 'GJ', 'circle_name': 'Gujarat'},
        ]
        
        for circle_data in circles_data:
            circle, created = TelecomCircle.objects.get_or_create(
                circle_code=circle_data['circle_code'],
                defaults=circle_data
            )
            if created:
                print(f"✅ Created telecom circle: {circle.circle_code}")
            else:
                print(f"✅ Found existing telecom circle: {circle.circle_code}")
        
        # Create test corporate tenant (Vodafone India)
        vodafone_corp, created = Tenant.objects.get_or_create(
            organization_code='VOD_CORP',
            defaults={
                'tenant_type': 'Corporate',
                'organization_name': 'Vodafone India',
                'primary_contact_email': 'corporate@vodafone.com',
                'primary_contact_name': 'Vodafone Corporate',
                'primary_contact_phone': '+918888888888',
                'primary_business_address': 'Vodafone India HQ, Mumbai',
                'subdomain': 'vodafone-corporate',
                'subscription_plan': 'Enterprise',
                'registration_status': 'Approved',
                'activation_status': 'Active',
                'is_active': True,
            }
        )
        
        if created:
            print(f"✅ Created Vodafone Corporate tenant")
        else:
            print(f"✅ Found existing Vodafone Corporate tenant")
        
        # Create test circle tenants
        circle_tenants_data = [
            {
                'organization_code': 'VOD_MPCG',
                'organization_name': 'Vodafone MPCG',
                'circle_code': 'MPCG',
                'primary_contact_email': 'mpcg@vodafone.com',
            },
            {
                'organization_code': 'VOD_UPE',
                'organization_name': 'Vodafone UPE',
                'circle_code': 'UPE',
                'primary_contact_email': 'upe@vodafone.com',
            },
        ]
        
        for tenant_data in circle_tenants_data:
            circle = TelecomCircle.objects.get(circle_code=tenant_data['circle_code'])
            circle_tenant, created = Tenant.objects.get_or_create(
                organization_code=tenant_data['organization_code'],
                defaults={
                    'tenant_type': 'Circle',
                    'parent_tenant': vodafone_corp,
                    'circle': circle,
                    'organization_name': tenant_data['organization_name'],
                    'circle_code': tenant_data['circle_code'],
                    'primary_contact_email': tenant_data['primary_contact_email'],
                    'primary_contact_name': f"{tenant_data['organization_name']} Admin",
                    'primary_contact_phone': '+917777777777',
                    'primary_business_address': f"{tenant_data['organization_name']} Office",
                    'subdomain': f"vodafone-{tenant_data['circle_code'].lower()}",
                    'subscription_plan': 'Professional',
                    'registration_status': 'Approved',
                    'activation_status': 'Active',
                    'is_active': True,
                }
            )
            
            if created:
                print(f"✅ Created {tenant_data['organization_name']} tenant")
            else:
                print(f"✅ Found existing {tenant_data['organization_name']} tenant")
        
        # Create test users for different tenant types
        test_users = [
            {
                'email': 'corporate@vodafone.com',
                'password': 'testpass123',
                'first_name': 'Corporate',
                'last_name': 'User',
                'tenant': vodafone_corp,
                'is_superuser': False,
                'is_staff': True,
            },
            {
                'email': 'mpcg@vodafone.com',
                'password': 'testpass123',
                'first_name': 'MPCG',
                'last_name': 'User',
                'tenant': Tenant.objects.get(organization_code='VOD_MPCG'),
                'is_superuser': False,
                'is_staff': True,
            },
            {
                'email': 'upe@vodafone.com',
                'password': 'testpass123',
                'first_name': 'UPE',
                'last_name': 'User',
                'tenant': Tenant.objects.get(organization_code='VOD_UPE'),
                'is_superuser': False,
                'is_staff': True,
            },
        ]
        
        for user_data in test_users:
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'username': user_data['email'],
                    'first_name': user_data['first_name'],
                    'last_name': user_data['last_name'],
                    'tenant': user_data['tenant'],
                    'is_superuser': user_data['is_superuser'],
                    'is_staff': user_data['is_staff'],
                }
            )
            
            if created:
                user.set_password(user_data['password'])
                user.save()
                print(f"✅ Created test user: {user.email}")
            else:
                print(f"✅ Found existing test user: {user.email}")
        
        print("\n🎉 Teleops Admin Setup Complete!")
        print("\n📋 Test Credentials:")
        print("=" * 30)
        print(f"Teleops Admin:")
        print(f"  Email: {superuser.email}")
        print(f"  Password: (your superuser password)")
        print(f"  Tenant: Teleops Platform")
        print(f"  Type: Superuser")
        print()
        print(f"Corporate User:")
        print(f"  Email: corporate@vodafone.com")
        print(f"  Password: testpass123")
        print(f"  Tenant: Vodafone India")
        print(f"  Type: Corporate")
        print()
        print(f"Circle Users:")
        print(f"  Email: mpcg@vodafone.com")
        print(f"  Password: testpass123")
        print(f"  Tenant: Vodafone MPCG")
        print(f"  Type: Circle")
        print()
        print(f"  Email: upe@vodafone.com")
        print(f"  Password: testpass123")
        print(f"  Tenant: Vodafone UPE")
        print(f"  Type: Circle")
        print()
        print("🚀 Ready to test login!")
        
    except Exception as e:
        print(f"❌ Error setting up Teleops admin: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    setup_teleops_admin() 
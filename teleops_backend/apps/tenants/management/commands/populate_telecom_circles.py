from django.core.management.base import BaseCommand
from django.db import transaction
from apps.tenants.models import TelecomCircle


class Command(BaseCommand):
    help = 'Populate telecom_circles table with standard Indian telecom circles data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing telecom circles before populating',
        )

    def handle(self, *args, **options):
        # Standard Indian telecom circles data
        circles_data = [
            {
                'circle_code': 'AP',
                'circle_name': 'Andhra Pradesh',
                'region': 'South',
                'state_coverage': ['Andhra Pradesh']
            },
            {
                'circle_code': 'AS',
                'circle_name': 'Assam',
                'region': 'North East',
                'state_coverage': ['Assam']
            },
            {
                'circle_code': 'BH',
                'circle_name': 'Bihar',
                'region': 'East',
                'state_coverage': ['Bihar']
            },
            {
                'circle_code': 'CH',
                'circle_name': 'Chennai',
                'region': 'South',
                'state_coverage': ['Tamil Nadu']
            },
            {
                'circle_code': 'GJ',
                'circle_name': 'Gujarat',
                'region': 'West',
                'state_coverage': ['Gujarat']
            },
            {
                'circle_code': 'HR',
                'circle_name': 'Haryana',
                'region': 'North',
                'state_coverage': ['Haryana']
            },
            {
                'circle_code': 'HP',
                'circle_name': 'Himachal Pradesh',
                'region': 'North',
                'state_coverage': ['Himachal Pradesh']
            },
            {
                'circle_code': 'JK',
                'circle_name': 'Jammu & Kashmir',
                'region': 'North',
                'state_coverage': ['Jammu & Kashmir']
            },
            {
                'circle_code': 'KA',
                'circle_name': 'Karnataka',
                'region': 'South',
                'state_coverage': ['Karnataka']
            },
            {
                'circle_code': 'KL',
                'circle_name': 'Kerala',
                'region': 'South',
                'state_coverage': ['Kerala']
            },
            {
                'circle_code': 'KO',
                'circle_name': 'Kolkata',
                'region': 'East',
                'state_coverage': ['West Bengal']
            },
            {
                'circle_code': 'MH',
                'circle_name': 'Maharashtra & Goa',
                'region': 'West',
                'state_coverage': ['Maharashtra', 'Goa']
            },
            {
                'circle_code': 'MPCG',
                'circle_name': 'Madhya Pradesh & Chhattisgarh',
                'region': 'Central',
                'state_coverage': ['Madhya Pradesh', 'Chhattisgarh']
            },
            {
                'circle_code': 'MU',
                'circle_name': 'Mumbai',
                'region': 'West',
                'state_coverage': ['Maharashtra']
            },
            {
                'circle_code': 'NE',
                'circle_name': 'North East',
                'region': 'North East',
                'state_coverage': ['Arunachal Pradesh', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Tripura']
            },
            {
                'circle_code': 'OR',
                'circle_name': 'Odisha',
                'region': 'East',
                'state_coverage': ['Odisha']
            },
            {
                'circle_code': 'PB',
                'circle_name': 'Punjab',
                'region': 'North',
                'state_coverage': ['Punjab']
            },
            {
                'circle_code': 'RJ',
                'circle_name': 'Rajasthan',
                'region': 'North',
                'state_coverage': ['Rajasthan']
            },
            {
                'circle_code': 'TN',
                'circle_name': 'Tamil Nadu',
                'region': 'South',
                'state_coverage': ['Tamil Nadu']
            },
            {
                'circle_code': 'UPE',
                'circle_name': 'UP (East)',
                'region': 'North',
                'state_coverage': ['Uttar Pradesh']
            },
            {
                'circle_code': 'UPW',
                'circle_name': 'UP (West)',
                'region': 'North',
                'state_coverage': ['Uttar Pradesh']
            },
            {
                'circle_code': 'WB',
                'circle_name': 'West Bengal',
                'region': 'East',
                'state_coverage': ['West Bengal']
            },
            {
                'circle_code': 'MC',
                'circle_name': 'Mumbai Corporate',
                'region': 'West',
                'state_coverage': ['Maharashtra']
            }
        ]

        with transaction.atomic():
            if options['clear']:
                self.stdout.write('Clearing existing telecom circles...')
                TelecomCircle.objects.all().delete()
                self.stdout.write(self.style.SUCCESS('Existing telecom circles cleared.'))

            created_count = 0
            updated_count = 0

            for circle_data in circles_data:
                circle, created = TelecomCircle.objects.get_or_create(
                    circle_code=circle_data['circle_code'],
                    defaults={
                        'circle_name': circle_data['circle_name'],
                        'region': circle_data['region'],
                        'state_coverage': circle_data['state_coverage'],
                        'is_active': True
                    }
                )

                if created:
                    created_count += 1
                    self.stdout.write(f'Created: {circle.circle_code} - {circle.circle_name}')
                else:
                    # Update existing circle with new data
                    circle.circle_name = circle_data['circle_name']
                    circle.region = circle_data['region']
                    circle.state_coverage = circle_data['state_coverage']
                    circle.is_active = True
                    circle.save()
                    updated_count += 1
                    self.stdout.write(f'Updated: {circle.circle_code} - {circle.circle_name}')

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Successfully populated telecom circles: {created_count} created, {updated_count} updated'
        ))
        self.stdout.write(f'Total telecom circles: {TelecomCircle.objects.count()}') 
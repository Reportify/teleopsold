from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from teleops_internal.users.models import InternalProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Create a super admin for Teleops internal portal'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email address for the super admin')
        parser.add_argument('--first-name', type=str, help='First name for the super admin')
        parser.add_argument('--last-name', type=str, help='Last name for the super admin')
        parser.add_argument('--password', type=str, help='Password for the super admin')
        parser.add_argument('--employee-id', type=str, help='Employee ID (optional)')

    def handle(self, *args, **options):
        import getpass
        email = options.get('email') or input('Email: ')
        first_name = options.get('first_name') or input('First name: ')
        last_name = options.get('last_name') or input('Last name: ')
        password = options.get('password') or getpass.getpass('Password: ')
        employee_id = options.get('employee_id') or input('Employee ID (optional): ') or None

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'Internal user with email {email} already exists.')
            )
            return

        try:
            # Create the user first
            user = User.objects.create_user(
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=password,
                is_active=True,
                is_staff=True,
                is_superuser=True,
            )
            
            # Create the internal profile
            internal_profile = InternalProfile.objects.create(
                user=user,
                employee_id=employee_id,
                role='super_admin',
                access_level='admin',
                display_name=f"{first_name} {last_name}",
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created super admin:\n'
                    f'  Email: {user.email}\n'
                    f'  Name: {user.first_name} {user.last_name}\n'
                    f'  Role: {internal_profile.get_role_display()}\n'
                    f'  Access Level: {internal_profile.get_access_level_display()}\n'
                    f'  Employee ID: {internal_profile.employee_id or "Not set"}\n'
                    f'  Active: {user.is_active}\n'
                    f'  Staff: {user.is_staff}\n'
                    f'  Superuser: {user.is_superuser}'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to create super admin: {str(e)}')
            ) 
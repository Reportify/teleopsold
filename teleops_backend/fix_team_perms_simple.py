import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tenants.models import PermissionRegistry, TenantUserProfile
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.get(id=8)
profile = TenantUserProfile.objects.get(user=user, is_active=True)

# Get all team permissions
team_perms = PermissionRegistry.objects.filter(
    tenant=profile.tenant,
    permission_code__icontains='team'
)

print(f'Found {team_perms.count()} team permissions')

# Define the correct business template for each permission
permission_templates = {
    'team.read': 'view_only',
    'team.create': 'creator_only', 
    'team.update': 'contributor',
    'team.delete': 'full_access',
    'team.manage_members': 'contributor'
}

# Update each permission
for perm in team_perms:
    old_template = perm.business_template
    old_resource_type = perm.resource_type
    
    # Set the correct business template and resource type
    new_template = permission_templates.get(perm.permission_code, 'full_access')
    perm.business_template = new_template
    perm.resource_type = 'team'
    perm.save()
    
    print(f'Updated {perm.permission_code}: {old_template} -> {new_template}, resource_type: "{old_resource_type}" -> "team"')

print('All team permissions updated successfully!')

# Verify the changes
print('\nVerification:')
team_perms_updated = PermissionRegistry.objects.filter(
    tenant=profile.tenant,
    permission_code__icontains='team'
)

for perm in team_perms_updated:
    print(f'{perm.permission_code}: business_template={perm.business_template}, resource_type="{perm.resource_type}"')
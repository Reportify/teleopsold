from django.db import models
from django.utils.translation import gettext_lazy as _


class Team(models.Model):
    """Team model for organizing users"""
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='teams')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    members = models.ManyToManyField('apps_users.User', through='TeamMember', related_name='teams')
    created_by = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='created_teams')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teams'
        verbose_name = _('Team')
        verbose_name_plural = _('Teams')
        unique_together = ['tenant', 'name']

    def __str__(self):
        return f"{self.tenant.name} - {self.name}"


class TeamMember(models.Model):
    """Team member with role"""
    ROLE_CHOICES = (
        ('leader', 'Team Leader'),
        ('member', 'Member'),
        ('consultant', 'Consultant'),
    )

    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    user = models.ForeignKey('apps_users.User', on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'team_members'
        unique_together = ['team', 'user']

    def __str__(self):
        return f"{self.user.full_name} - {self.get_role_display()} in {self.team.name}"
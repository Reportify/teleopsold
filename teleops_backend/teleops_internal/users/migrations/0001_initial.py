# Generated by Django 4.2.10 on 2025-07-18 08:48

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="InternalProfile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("display_name", models.CharField(blank=True, max_length=150)),
                ("phone_number", models.CharField(blank=True, max_length=20)),
                ("employee_id", models.CharField(blank=True, max_length=50, null=True)),
                (
                    "profile_photo",
                    models.ImageField(
                        blank=True, null=True, upload_to="profile_photos/"
                    ),
                ),
                (
                    "role",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("super_admin", "Super Administrator"),
                            ("operations_manager", "Operations Manager"),
                            ("support_staff", "Support Staff"),
                            ("", "None"),
                        ],
                        default="",
                        max_length=50,
                    ),
                ),
                (
                    "access_level",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("read_only", "Read Only"),
                            ("standard", "Standard"),
                            ("admin", "Admin"),
                            ("", "None"),
                        ],
                        default="",
                        max_length=20,
                    ),
                ),
                ("department", models.CharField(blank=True, max_length=100)),
                ("last_login", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "reporting_manager",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="teleops_internal_users.internalprofile",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="internal_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "internal_profile",
            },
        ),
    ]

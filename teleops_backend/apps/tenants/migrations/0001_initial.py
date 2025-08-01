# Generated by Django 4.2.10 on 2025-07-18 08:48

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="TelecomCircle",
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
                (
                    "circle_code",
                    models.CharField(
                        help_text="e.g., MPCG, UPE, GJ", max_length=20, unique=True
                    ),
                ),
                (
                    "circle_name",
                    models.CharField(
                        help_text="e.g., Madhya Pradesh & Chhattisgarh", max_length=100
                    ),
                ),
                (
                    "region",
                    models.CharField(
                        blank=True,
                        help_text="North, South, East, West, etc.",
                        max_length=50,
                    ),
                ),
                (
                    "state_coverage",
                    models.JSONField(
                        default=list, help_text="Array of states covered by this circle"
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Telecom Circle",
                "verbose_name_plural": "Telecom Circles",
                "db_table": "telecom_circles",
                "ordering": ["circle_code"],
            },
        ),
        migrations.CreateModel(
            name="Tenant",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "tenant_type",
                    models.CharField(
                        choices=[
                            ("Corporate", "Corporate"),
                            ("Circle", "Circle"),
                            ("Vendor", "Vendor"),
                        ],
                        max_length=30,
                    ),
                ),
                ("organization_name", models.CharField(max_length=255)),
                (
                    "organization_code",
                    models.CharField(
                        help_text="e.g., VOD_MPCG, VOD_UPE", max_length=50, unique=True
                    ),
                ),
                (
                    "business_registration_number",
                    models.CharField(blank=True, max_length=100, null=True),
                ),
                (
                    "industry_sector",
                    models.CharField(default="Telecommunications", max_length=100),
                ),
                ("country", models.CharField(default="India", max_length=100)),
                ("primary_business_address", models.TextField()),
                ("website", models.URLField(blank=True)),
                (
                    "circle_code",
                    models.CharField(
                        blank=True, help_text="e.g., MPCG, UPE, GJ", max_length=20
                    ),
                ),
                (
                    "circle_name",
                    models.CharField(
                        blank=True,
                        help_text="e.g., Madhya Pradesh & Chhattisgarh",
                        max_length=100,
                    ),
                ),
                (
                    "subdomain",
                    models.CharField(
                        help_text="e.g., vodafone-mpcg-teleops",
                        max_length=100,
                        unique=True,
                    ),
                ),
                (
                    "subscription_plan",
                    models.CharField(
                        choices=[
                            ("Basic", "Basic"),
                            ("Professional", "Professional"),
                            ("Enterprise", "Enterprise"),
                            ("Custom", "Custom"),
                        ],
                        default="Professional",
                        max_length=50,
                    ),
                ),
                ("primary_contact_name", models.CharField(max_length=255)),
                (
                    "primary_contact_email",
                    models.EmailField(max_length=254, unique=True),
                ),
                ("primary_contact_phone", models.CharField(max_length=20)),
                (
                    "secondary_contact_name",
                    models.CharField(blank=True, max_length=255),
                ),
                (
                    "secondary_contact_email",
                    models.EmailField(blank=True, max_length=254),
                ),
                (
                    "secondary_contact_phone",
                    models.CharField(blank=True, max_length=20),
                ),
                (
                    "administrative_contact_email",
                    models.EmailField(blank=True, max_length=254),
                ),
                (
                    "specialization",
                    models.JSONField(
                        default=list, help_text="Array of specializations"
                    ),
                ),
                (
                    "coverage_areas",
                    models.JSONField(default=list, help_text="Array of regions/states"),
                ),
                (
                    "service_capabilities",
                    models.JSONField(default=list, help_text="Array of service types"),
                ),
                ("equipment_capabilities", models.TextField(blank=True)),
                (
                    "certifications",
                    models.JSONField(default=list, help_text="Array of certifications"),
                ),
                (
                    "operates_independently",
                    models.BooleanField(
                        default=True, help_text="Circle independence flag"
                    ),
                ),
                (
                    "shared_vendor_pool",
                    models.BooleanField(
                        default=False, help_text="Can share vendors with parent"
                    ),
                ),
                (
                    "cross_circle_reporting",
                    models.BooleanField(
                        default=True, help_text="Allow parent reporting"
                    ),
                ),
                (
                    "registration_status",
                    models.CharField(
                        choices=[
                            ("Pending", "Pending"),
                            ("Approved", "Approved"),
                            ("Rejected", "Rejected"),
                            ("Expired", "Expired"),
                        ],
                        default="Pending",
                        max_length=50,
                    ),
                ),
                (
                    "activation_status",
                    models.CharField(
                        choices=[
                            ("Inactive", "Inactive"),
                            ("Active", "Active"),
                            ("Suspended", "Suspended"),
                            ("Terminated", "Terminated"),
                        ],
                        default="Inactive",
                        max_length=50,
                    ),
                ),
                ("is_active", models.BooleanField(default=False)),
                ("rejection_reason", models.TextField(blank=True)),
                ("subscription_features", models.JSONField(default=dict)),
                ("resource_limits", models.JSONField(default=dict)),
                ("registered_at", models.DateTimeField(auto_now_add=True)),
                ("activated_at", models.DateTimeField(blank=True, null=True)),
                ("deactivated_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "circle",
                    models.ForeignKey(
                        blank=True,
                        help_text="Reference to telecom circle master data",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="tenants",
                        to="tenants.telecomcircle",
                    ),
                ),
                (
                    "parent_tenant",
                    models.ForeignKey(
                        blank=True,
                        help_text="Corporate parent for circles",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="child_tenants",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "verbose_name": "Tenant",
                "verbose_name_plural": "Tenants",
                "db_table": "tenants",
                "ordering": ["organization_name"],
            },
        ),
        migrations.CreateModel(
            name="TenantUserProfile",
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
                ("tenant_id", models.UUIDField()),
                ("display_name", models.CharField(blank=True, max_length=150)),
                ("phone_number", models.CharField(blank=True, max_length=20)),
                ("secondary_phone", models.CharField(blank=True, max_length=20)),
                ("employee_id", models.CharField(blank=True, max_length=50)),
                (
                    "profile_photo",
                    models.ImageField(
                        blank=True, null=True, upload_to="profile_photos/"
                    ),
                ),
                ("job_title", models.CharField(blank=True, max_length=100)),
                ("designation", models.CharField(blank=True, max_length=100)),
                ("department", models.CharField(blank=True, max_length=100)),
                ("last_login", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tenant_user_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="TenantInvitation",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("email", models.EmailField(max_length=254)),
                (
                    "contact_name",
                    models.CharField(default="Unknown Contact", max_length=255),
                ),
                (
                    "tenant_type",
                    models.CharField(
                        choices=[
                            ("Corporate", "Corporate"),
                            ("Circle", "Circle"),
                            ("Vendor", "Vendor"),
                        ],
                        default="Corporate",
                        max_length=20,
                    ),
                ),
                ("invitation_token", models.CharField(max_length=255, unique=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("Pending", "Pending"),
                            ("Accepted", "Accepted"),
                            ("Expired", "Expired"),
                            ("Cancelled", "Cancelled"),
                        ],
                        default="Pending",
                        max_length=20,
                    ),
                ),
                ("invited_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("expires_at", models.DateTimeField()),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                (
                    "created_tenant",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="invitations",
                        to="tenants.tenant",
                    ),
                ),
                (
                    "invited_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "tenant_invitations",
                "ordering": ["-invited_at"],
            },
        ),
        migrations.CreateModel(
            name="CorporateCircleRelationship",
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
                (
                    "relationship_type",
                    models.CharField(
                        choices=[("Parent_Circle", "Parent Circle")],
                        default="Parent_Circle",
                        max_length=30,
                    ),
                ),
                (
                    "governance_level",
                    models.CharField(
                        choices=[
                            ("Autonomous", "Autonomous"),
                            ("Managed", "Managed"),
                            ("Controlled", "Controlled"),
                        ],
                        default="Autonomous",
                        max_length=30,
                    ),
                ),
                ("separate_billing", models.BooleanField(default=True)),
                ("cost_center_code", models.CharField(blank=True, max_length=50)),
                (
                    "budget_authority_level",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=15, null=True
                    ),
                ),
                ("independent_vendor_management", models.BooleanField(default=True)),
                ("independent_employee_management", models.BooleanField(default=True)),
                ("shared_technology_access", models.BooleanField(default=True)),
                ("reports_to_corporate", models.BooleanField(default=True)),
                (
                    "data_sharing_level",
                    models.CharField(
                        choices=[
                            ("None", "None"),
                            ("Aggregated", "Aggregated"),
                            ("Full", "Full"),
                        ],
                        default="Aggregated",
                        max_length=30,
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("effective_from", models.DateField(auto_now_add=True)),
                ("effective_to", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "circle_tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="circle_relationships",
                        to="tenants.tenant",
                    ),
                ),
                (
                    "corporate_tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="corporate_relationships",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "verbose_name": "Corporate Circle Relationship",
                "verbose_name_plural": "Corporate Circle Relationships",
                "db_table": "corporate_circle_relationships",
            },
        ),
        migrations.CreateModel(
            name="CircleVendorRelationship",
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
                (
                    "vendor_name",
                    models.CharField(
                        blank=True,
                        help_text="Vendor name before registration",
                        max_length=255,
                    ),
                ),
                (
                    "vendor_code",
                    models.CharField(
                        help_text="Circle's internal vendor code", max_length=100
                    ),
                ),
                (
                    "vendor_email",
                    models.EmailField(
                        blank=True,
                        help_text="Vendor email for invitation",
                        max_length=254,
                    ),
                ),
                (
                    "service_areas",
                    models.JSONField(
                        default=list, help_text="Districts/regions within circle"
                    ),
                ),
                (
                    "service_capabilities",
                    models.JSONField(
                        default=list,
                        help_text="Dismantling, Installation, Maintenance, Survey",
                    ),
                ),
                (
                    "performance_rating",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=3, null=True
                    ),
                ),
                (
                    "relationship_type",
                    models.CharField(
                        choices=[
                            ("Circle_Vendor", "Circle Vendor"),
                            ("Partnership", "Partnership"),
                            ("Subcontractor", "Subcontractor"),
                        ],
                        default="Circle_Vendor",
                        max_length=50,
                    ),
                ),
                (
                    "relationship_status",
                    models.CharField(
                        choices=[
                            ("Circle_Invitation_Sent", "Circle Invitation Sent"),
                            ("Active", "Active"),
                            ("Suspended", "Suspended"),
                            ("Terminated", "Terminated"),
                            ("Expired", "Expired"),
                        ],
                        default="Circle_Invitation_Sent",
                        max_length=50,
                    ),
                ),
                (
                    "vendor_verification_status",
                    models.CharField(
                        choices=[
                            ("Independent", "Independent"),
                            ("Pending_Verification", "Pending Verification"),
                            ("Verified", "Verified"),
                            ("Verification_Rejected", "Verification Rejected"),
                        ],
                        default="Independent",
                        help_text="Vendor verification status for this circle relationship",
                        max_length=50,
                    ),
                ),
                (
                    "billing_rate",
                    models.DecimalField(
                        blank=True, decimal_places=2, max_digits=10, null=True
                    ),
                ),
                ("payment_terms", models.CharField(blank=True, max_length=100)),
                ("currency", models.CharField(default="INR", max_length=10)),
                (
                    "billing_frequency",
                    models.CharField(default="Monthly", max_length=20),
                ),
                (
                    "vendor_permissions",
                    models.JSONField(
                        default=dict, help_text="Permissions vendor has for circle data"
                    ),
                ),
                ("communication_allowed", models.BooleanField(default=True)),
                (
                    "contact_access_level",
                    models.CharField(
                        choices=[
                            ("Basic", "Basic"),
                            ("Full", "Full"),
                            ("Restricted", "Restricted"),
                            ("None", "None"),
                        ],
                        default="Basic",
                        max_length=50,
                    ),
                ),
                ("invitation_token", models.CharField(blank=True, max_length=255)),
                ("invitation_sent_at", models.DateTimeField(blank=True, null=True)),
                ("invitation_expires_at", models.DateTimeField(blank=True, null=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("contract_start_date", models.DateField(blank=True, null=True)),
                ("contract_end_date", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "approved_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="approved_vendor_relationships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "circle_tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="circle_vendor_relationships",
                        to="tenants.tenant",
                    ),
                ),
                (
                    "invited_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sent_vendor_invitations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "vendor_tenant",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="vendor_circle_relationships",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "verbose_name": "Circle Vendor Relationship",
                "verbose_name_plural": "Circle Vendor Relationships",
                "db_table": "circle_vendor_relationships",
            },
        ),
        migrations.AddIndex(
            model_name="tenant",
            index=models.Index(
                fields=["tenant_type"], name="tenants_tenant__baacd7_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="tenant",
            index=models.Index(
                fields=["parent_tenant"], name="tenants_parent__f676a5_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="tenant",
            index=models.Index(
                fields=["circle_code"], name="tenants_circle__9482ff_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="tenant",
            index=models.Index(
                fields=["registration_status", "activation_status"],
                name="tenants_registr_4f9c07_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="tenant",
            index=models.Index(fields=["subdomain"], name="tenants_subdoma_69cf01_idx"),
        ),
        migrations.AddIndex(
            model_name="tenant",
            index=models.Index(
                fields=["organization_code"], name="tenants_organiz_be8e2b_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="corporatecirclerelationship",
            index=models.Index(
                fields=["corporate_tenant"], name="corporate_c_corpora_73d177_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="corporatecirclerelationship",
            index=models.Index(
                fields=["circle_tenant"], name="corporate_c_circle__e00b61_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="corporatecirclerelationship",
            index=models.Index(
                fields=["is_active"], name="corporate_c_is_acti_3ad344_idx"
            ),
        ),
        migrations.AlterUniqueTogether(
            name="corporatecirclerelationship",
            unique_together={("corporate_tenant", "circle_tenant")},
        ),
        migrations.AddIndex(
            model_name="circlevendorrelationship",
            index=models.Index(
                fields=["circle_tenant"], name="circle_vend_circle__ce37e3_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="circlevendorrelationship",
            index=models.Index(
                fields=["vendor_tenant"], name="circle_vend_vendor__881fec_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="circlevendorrelationship",
            index=models.Index(
                fields=["vendor_code"], name="circle_vend_vendor__2a6005_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="circlevendorrelationship",
            index=models.Index(
                fields=["relationship_status"], name="circle_vend_relatio_b537d2_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="circlevendorrelationship",
            index=models.Index(
                fields=["is_active"], name="circle_vend_is_acti_d75f76_idx"
            ),
        ),
        migrations.AlterUniqueTogether(
            name="circlevendorrelationship",
            unique_together={
                ("circle_tenant", "vendor_tenant"),
                ("circle_tenant", "vendor_code"),
            },
        ),
    ]

# Generated by Django 4.2.10 on 2025-07-20 15:46

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("tenants", "0009_remove_tenant_equipment_capabilities_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="VendorCreatedClient",
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
                    "client_name",
                    models.CharField(
                        help_text="Full organization name (e.g., 'Airtel UP East', 'BSNL Maharashtra')",
                        max_length=255,
                    ),
                ),
                (
                    "client_code",
                    models.CharField(
                        help_text="Vendor's internal reference code for this client",
                        max_length=50,
                    ),
                ),
                (
                    "client_type",
                    models.CharField(
                        choices=[
                            ("Non_Integrated", "Non-Integrated Client"),
                            ("Potential_Platform_User", "Potential Platform User"),
                            ("Legacy_Client", "Legacy Client"),
                            ("Competitor_Client", "Competitor Client"),
                        ],
                        default="Non_Integrated",
                        max_length=30,
                    ),
                ),
                ("primary_contact_name", models.CharField(max_length=255)),
                ("primary_contact_email", models.EmailField(max_length=254)),
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
                ("headquarters_address", models.TextField()),
                (
                    "regional_offices",
                    models.JSONField(
                        default=list, help_text="Array of regional office locations"
                    ),
                ),
                (
                    "business_sectors",
                    models.JSONField(
                        default=list,
                        help_text="Array of business sectors (e.g., ['Telecom', 'Infrastructure'])",
                    ),
                ),
                (
                    "company_size",
                    models.CharField(
                        blank=True,
                        help_text="Employee count range (e.g., '1000-5000', '5000+')",
                        max_length=50,
                    ),
                ),
                (
                    "branding_logo",
                    models.CharField(
                        blank=True,
                        help_text="URL or path to client's logo for vendor portal branding",
                        max_length=255,
                    ),
                ),
                (
                    "primary_color",
                    models.CharField(
                        default="#1976d2",
                        help_text="Hex color code for client branding in vendor portal",
                        max_length=10,
                    ),
                ),
                (
                    "secondary_color",
                    models.CharField(
                        default="#424242",
                        help_text="Secondary hex color for client branding",
                        max_length=10,
                    ),
                ),
                (
                    "platform_interest_level",
                    models.CharField(
                        choices=[
                            ("Unknown", "Unknown"),
                            ("Not_Interested", "Not Interested"),
                            ("Slightly_Interested", "Slightly Interested"),
                            ("Moderately_Interested", "Moderately Interested"),
                            ("Highly_Interested", "Highly Interested"),
                            ("Ready_to_Onboard", "Ready to Onboard"),
                        ],
                        default="Unknown",
                        max_length=30,
                    ),
                ),
                (
                    "conversion_status",
                    models.CharField(
                        choices=[
                            ("None", "No Conversion Activity"),
                            ("Initial_Contact", "Initial Contact Made"),
                            ("Demo_Scheduled", "Demo Scheduled"),
                            ("Demo_Completed", "Demo Completed"),
                            ("Proposal_Sent", "Proposal Sent"),
                            ("Negotiation", "In Negotiation"),
                            ("Conversion_Approved", "Conversion Approved"),
                            ("Conversion_Rejected", "Conversion Rejected"),
                        ],
                        default="None",
                        max_length=30,
                    ),
                ),
                (
                    "conversion_probability",
                    models.IntegerField(
                        default=0,
                        help_text="Probability percentage (0-100) of client adopting platform",
                    ),
                ),
                ("platform_demo_date", models.DateField(blank=True, null=True)),
                (
                    "conversion_notes",
                    models.TextField(
                        blank=True,
                        help_text="Internal notes about platform conversion efforts",
                    ),
                ),
                (
                    "total_sites",
                    models.IntegerField(
                        default=0,
                        help_text="Total number of sites managed for this client",
                    ),
                ),
                (
                    "total_projects",
                    models.IntegerField(
                        default=0,
                        help_text="Total number of projects completed for this client",
                    ),
                ),
                (
                    "active_projects",
                    models.IntegerField(
                        default=0, help_text="Currently active projects for this client"
                    ),
                ),
                (
                    "monthly_activity_level",
                    models.CharField(
                        choices=[
                            ("Low", "Low Activity (1-5 projects/month)"),
                            ("Medium", "Medium Activity (6-15 projects/month)"),
                            ("High", "High Activity (16-30 projects/month)"),
                            ("Very_High", "Very High Activity (30+ projects/month)"),
                        ],
                        default="Low",
                        max_length=20,
                    ),
                ),
                (
                    "last_project_date",
                    models.DateField(
                        blank=True,
                        help_text="Date of most recent project for this client",
                        null=True,
                    ),
                ),
                (
                    "total_revenue_generated",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Total revenue generated from this client (INR)",
                        max_digits=15,
                    ),
                ),
                (
                    "average_project_value",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Average value per project for this client (INR)",
                        max_digits=12,
                    ),
                ),
                (
                    "payment_terms",
                    models.CharField(
                        blank=True,
                        help_text="Standard payment terms for this client",
                        max_length=100,
                    ),
                ),
                ("currency", models.CharField(default="INR", max_length=10)),
                (
                    "relationship_start_date",
                    models.DateField(
                        auto_now_add=True,
                        help_text="Date when vendor started working with this client",
                    ),
                ),
                (
                    "relationship_status",
                    models.CharField(
                        choices=[
                            ("Active", "Active"),
                            ("Inactive", "Inactive"),
                            ("On_Hold", "On Hold"),
                            ("Terminated", "Terminated"),
                        ],
                        default="Active",
                        max_length=50,
                    ),
                ),
                (
                    "contract_end_date",
                    models.DateField(
                        blank=True,
                        help_text="Contract expiration date (if applicable)",
                        null=True,
                    ),
                ),
                (
                    "client_satisfaction_rating",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        help_text="Client satisfaction rating (1.00 - 5.00)",
                        max_digits=3,
                        null=True,
                    ),
                ),
                (
                    "vendor_performance_rating",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        help_text="Vendor's self-assessed performance rating (1.00 - 5.00)",
                        max_digits=3,
                        null=True,
                    ),
                ),
                (
                    "internal_notes",
                    models.TextField(
                        blank=True,
                        help_text="Internal vendor notes about this client relationship",
                    ),
                ),
                (
                    "tags",
                    models.JSONField(
                        default=list,
                        help_text="Array of tags for categorization (e.g., ['High-Value', 'Telecom'])",
                    ),
                ),
                (
                    "platform_onboarding_interest",
                    models.BooleanField(
                        default=False,
                        help_text="Whether client has expressed interest in platform onboarding",
                    ),
                ),
                (
                    "estimated_platform_value",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        help_text="Estimated monthly platform value if client onboards (INR)",
                        max_digits=12,
                        null=True,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "last_activity_date",
                    models.DateTimeField(
                        blank=True,
                        help_text="Date of last recorded activity with this client",
                        null=True,
                    ),
                ),
                (
                    "vendor_tenant",
                    models.ForeignKey(
                        help_text="Vendor who created this client entry",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="created_clients",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "verbose_name": "Vendor Created Client",
                "verbose_name_plural": "Vendor Created Clients",
                "db_table": "vendor_created_clients",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="VendorClientBilling",
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
                ("billing_period_start", models.DateField()),
                ("billing_period_end", models.DateField()),
                (
                    "billing_month",
                    models.DateField(
                        help_text="Month being billed (YYYY-MM-01 format)"
                    ),
                ),
                (
                    "base_client_management_fee",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Base monthly fee for managing this client on platform",
                        max_digits=10,
                    ),
                ),
                (
                    "site_management_fee",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Fee per site managed (sites × rate)",
                        max_digits=10,
                    ),
                ),
                (
                    "project_transaction_fee",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Transaction fee for projects created (projects × rate)",
                        max_digits=10,
                    ),
                ),
                (
                    "data_storage_fee",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Fee for data storage and backup services",
                        max_digits=8,
                    ),
                ),
                (
                    "support_fee",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Customer support and maintenance fee",
                        max_digits=8,
                    ),
                ),
                (
                    "total_platform_cost",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Total amount vendor pays to platform (auto-calculated)",
                        max_digits=12,
                    ),
                ),
                (
                    "client_project_value",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Total value of projects completed for client this month",
                        max_digits=15,
                    ),
                ),
                (
                    "recurring_service_revenue",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Monthly recurring revenue from ongoing services",
                        max_digits=12,
                    ),
                ),
                (
                    "additional_service_revenue",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Additional services revenue (consulting, training, etc.)",
                        max_digits=12,
                    ),
                ),
                (
                    "total_client_revenue",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Total revenue received from client (auto-calculated)",
                        max_digits=15,
                    ),
                ),
                (
                    "gross_profit",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Client revenue minus platform costs",
                        max_digits=15,
                    ),
                ),
                (
                    "profit_margin_percentage",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Profit margin as percentage of client revenue",
                        max_digits=5,
                    ),
                ),
                (
                    "projects_completed",
                    models.IntegerField(
                        default=0,
                        help_text="Number of projects completed this billing period",
                    ),
                ),
                (
                    "sites_managed",
                    models.IntegerField(
                        default=0,
                        help_text="Number of sites actively managed this billing period",
                    ),
                ),
                (
                    "total_transactions",
                    models.IntegerField(
                        default=0,
                        help_text="Total platform transactions for this client this period",
                    ),
                ),
                (
                    "billing_status",
                    models.CharField(
                        choices=[
                            ("Draft", "Draft"),
                            ("Generated", "Generated"),
                            ("Sent", "Sent to Vendor"),
                            ("Paid", "Paid"),
                            ("Overdue", "Overdue"),
                            ("Disputed", "Disputed"),
                            ("Cancelled", "Cancelled"),
                        ],
                        default="Draft",
                        max_length=20,
                    ),
                ),
                (
                    "payment_status",
                    models.CharField(
                        choices=[
                            ("Pending", "Pending"),
                            ("Partial", "Partial Payment"),
                            ("Paid", "Fully Paid"),
                            ("Failed", "Payment Failed"),
                            ("Refunded", "Refunded"),
                        ],
                        default="Pending",
                        max_length=20,
                    ),
                ),
                (
                    "invoice_number",
                    models.CharField(
                        blank=True,
                        help_text="Platform-generated invoice number",
                        max_length=100,
                    ),
                ),
                (
                    "due_date",
                    models.DateField(
                        blank=True, help_text="Payment due date", null=True
                    ),
                ),
                (
                    "paid_date",
                    models.DateField(
                        blank=True, help_text="Date payment was received", null=True
                    ),
                ),
                (
                    "payment_method",
                    models.CharField(
                        blank=True,
                        help_text="Payment method used (Bank Transfer, UPI, etc.)",
                        max_length=50,
                    ),
                ),
                (
                    "payment_reference",
                    models.CharField(
                        blank=True,
                        help_text="Payment reference number or transaction ID",
                        max_length=255,
                    ),
                ),
                ("currency", models.CharField(default="INR", max_length=10)),
                (
                    "tax_rate",
                    models.DecimalField(
                        decimal_places=2,
                        default=18.0,
                        help_text="GST/tax rate percentage",
                        max_digits=5,
                    ),
                ),
                (
                    "tax_amount",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Tax amount calculated on platform costs",
                        max_digits=10,
                    ),
                ),
                (
                    "billing_notes",
                    models.TextField(
                        blank=True, help_text="Notes about this billing period"
                    ),
                ),
                (
                    "adjustments",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        help_text="Manual adjustments (credits/debits)",
                        max_digits=10,
                    ),
                ),
                (
                    "adjustment_reason",
                    models.CharField(
                        blank=True,
                        help_text="Reason for billing adjustments",
                        max_length=255,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "generated_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="When the bill was generated and finalized",
                        null=True,
                    ),
                ),
                (
                    "vendor_created_client",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="billing_records",
                        to="tenants.vendorcreatedclient",
                    ),
                ),
                (
                    "vendor_tenant",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="client_billing_records",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "verbose_name": "Vendor Client Billing",
                "verbose_name_plural": "Vendor Client Billing",
                "db_table": "vendor_client_billing",
                "ordering": ["-billing_month"],
            },
        ),
        migrations.AddIndex(
            model_name="vendorcreatedclient",
            index=models.Index(
                fields=["vendor_tenant", "client_name"],
                name="vendor_crea_vendor__cb6914_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="vendorcreatedclient",
            index=models.Index(
                fields=["vendor_tenant", "relationship_status"],
                name="vendor_crea_vendor__a249bb_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="vendorcreatedclient",
            index=models.Index(
                fields=["conversion_status"], name="vendor_crea_convers_82b0ad_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="vendorcreatedclient",
            index=models.Index(
                fields=["platform_interest_level"],
                name="vendor_crea_platfor_e71fef_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="vendorcreatedclient",
            index=models.Index(
                fields=["monthly_activity_level"], name="vendor_crea_monthly_000d6e_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="vendorcreatedclient",
            index=models.Index(
                fields=["created_at"], name="vendor_crea_created_d76d92_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="vendorcreatedclient",
            index=models.Index(
                fields=["last_activity_date"], name="vendor_crea_last_ac_11f805_idx"
            ),
        ),
        migrations.AlterUniqueTogether(
            name="vendorcreatedclient",
            unique_together={
                ("vendor_tenant", "client_code"),
                ("vendor_tenant", "client_name"),
            },
        ),
        migrations.AddIndex(
            model_name="vendorclientbilling",
            index=models.Index(
                fields=["vendor_tenant", "billing_month"],
                name="vendor_clie_vendor__639f9a_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="vendorclientbilling",
            index=models.Index(
                fields=["vendor_created_client", "billing_month"],
                name="vendor_clie_vendor__0ec157_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="vendorclientbilling",
            index=models.Index(
                fields=["billing_status", "payment_status"],
                name="vendor_clie_billing_5a16c6_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="vendorclientbilling",
            index=models.Index(
                fields=["due_date"], name="vendor_clie_due_dat_9c8d1a_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="vendorclientbilling",
            index=models.Index(
                fields=["created_at"], name="vendor_clie_created_f303f5_idx"
            ),
        ),
        migrations.AlterUniqueTogether(
            name="vendorclientbilling",
            unique_together={
                ("vendor_tenant", "vendor_created_client", "billing_month")
            },
        ),
    ]

from django.db import models
from django.utils.translation import gettext_lazy as _


## Note: Phase 1 uses existing client management APIs; no local Client/Customer tables


class Project(models.Model):
    """Project model for managing telecom infrastructure projects (Phase 1)"""
    PROJECT_STATUS = (
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    PROJECT_TYPE = (
        ('dismantle', 'Dismantle'),
        ('other', 'Other'),
    )

    # Core fields
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    project_type = models.CharField(max_length=20, choices=PROJECT_TYPE, default='other')
    status = models.CharField(max_length=20, choices=PROJECT_STATUS, default='planning')

    # Business context
    client_tenant = models.ForeignKey('tenants.Tenant', on_delete=models.PROTECT, related_name='as_client_projects')
    customer_name = models.CharField(max_length=255)
    circle = models.CharField(max_length=100)
    activity = models.TextField()

    # Project details
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    scope = models.TextField(blank=True)

    # Audit fields
    created_by = models.ForeignKey(
        'apps_users.User',
        on_delete=models.CASCADE,
        related_name='created_projects'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'projects'
        verbose_name = _('Project')
        verbose_name_plural = _('Projects')
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'name'], name='unique_project_name_per_tenant'),
        ]
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['project_type']),
            models.Index(fields=['circle']),
            models.Index(fields=['client_tenant']),
            models.Index(fields=['created_at']),
            models.Index(fields=['deleted_at']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.name}"

    def clean(self):
        """Validate project data"""
        from django.core.exceptions import ValidationError
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError("Start date cannot be after end date")


# -----------------------------
# Phase 2 - Project Design Models
# -----------------------------


class ProjectDesign(models.Model):
    """Container for a project's design and its versions."""
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='project_designs')
    project = models.OneToOneField('projects.Project', on_delete=models.CASCADE, related_name='design')
    status = models.CharField(max_length=20, default='active')
    # Points at the latest draft or published version viewed; optional
    current_version = models.ForeignKey(
        'projects.ProjectDesignVersion', on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )

    created_by = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='created_project_designs')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'project_designs'
        constraints = [
            models.UniqueConstraint(fields=['tenant', 'project'], name='unique_design_per_project'),
        ]

    def __str__(self) -> str:
        return f"Design for {self.project_id} (tenant={self.tenant_id})"


class ProjectDesignVersion(models.Model):
    """Versioned snapshot of a project design."""
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('published', 'Published'),
    )

    design = models.ForeignKey('projects.ProjectDesign', on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    title = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_locked = models.BooleanField(default=False)
    items_count = models.PositiveIntegerField(default=0)
    published_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='created_project_design_versions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'project_design_versions'
        ordering = ['-version_number']
        constraints = [
            models.UniqueConstraint(fields=['design', 'version_number'], name='unique_version_per_design'),
        ]

    def __str__(self) -> str:
        return f"Design v{self.version_number} ({self.status})"


class DesignItem(models.Model):
    """Item in a design version. Category rows are represented by is_category=True."""
    version = models.ForeignKey('projects.ProjectDesignVersion', on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=255)
    equipment_code = models.CharField(max_length=128, blank=True)
    category = models.CharField(max_length=255, blank=True)
    model = models.CharField(max_length=255, blank=True)
    manufacturer = models.CharField(max_length=255, blank=True)
    attributes = models.JSONField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_category = models.BooleanField(default=False)

    class Meta:
        db_table = 'project_design_items'
        ordering = ['sort_order', 'id']

    def __str__(self) -> str:
        return f"{'[CAT] ' if self.is_category else ''}{self.item_name}"


# -----------------------------
# Phase 3 - Project ↔ Site Association
# -----------------------------


class ProjectSite(models.Model):
    """Association between a Project and a master Site.

    A project can link many sites. A site can be linked to many projects.
    """

    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='project_sites')
    site = models.ForeignKey('sites.Site', on_delete=models.CASCADE, related_name='site_projects')

    alias_name = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='created_project_sites')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'project_sites'
        constraints = [
            models.UniqueConstraint(fields=['project', 'site'], name='unique_site_per_project'),
        ]
        indexes = [
            models.Index(fields=['project']),
            models.Index(fields=['site']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self) -> str:
        return f"project={self.project_id} ↔ site={self.site_id}"


# -----------------------------
# Phase 3 - Project Inventory (Dismantle support)
# -----------------------------


class ProjectInventoryPlan(models.Model):
    """Inventory plan created from an approved design for a project.

    For dismantle projects, serials will be planned per site.
    """

    PROJECT_TYPE = (
        ('installation', 'Installation'),
        ('dismantle', 'Dismantle'),
    )

    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='project_inventory_plans')
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='project_inventory_plans')
    project_type = models.CharField(max_length=20, choices=PROJECT_TYPE, default='dismantle')

    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='created_project_inventory_plans')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'project_inventory_plans'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'project']),
            models.Index(fields=['project_type']),
        ]

    def __str__(self) -> str:
        return f"plan={self.id} project={self.project_id} type={self.project_type}"


class ProjectInventoryItem(models.Model):
    """Planned item within an inventory plan."""

    plan = models.ForeignKey('projects.ProjectInventoryPlan', on_delete=models.CASCADE, related_name='items')
    equipment_item = models.ForeignKey('equipment.EquipmentInventoryItem', on_delete=models.PROTECT, related_name='project_inventory_items')
    planned_qty = models.PositiveIntegerField(default=0)
    uom = models.CharField(max_length=32, default='Unit')

    class Meta:
        db_table = 'project_inventory_items'
        constraints = [
            models.UniqueConstraint(fields=['plan', 'equipment_item'], name='unique_equipment_item_per_plan'),
        ]
        indexes = [
            models.Index(fields=['plan']),
            models.Index(fields=['equipment_item']),
        ]

    def __str__(self) -> str:
        return f"plan={self.plan_id} equipment_item={self.equipment_item_id} qty={self.planned_qty}"


class ProjectSiteInventory(models.Model):
    """Per-site planned inventory for dismantle projects (serial-level)."""

    project_site = models.ForeignKey(
        'projects.ProjectSite', on_delete=models.CASCADE, related_name='planned_inventory', null=True, blank=True
    )
    plan = models.ForeignKey('projects.ProjectInventoryPlan', on_delete=models.CASCADE, related_name='site_inventory')
    # Link to tenant master equipment item
    equipment_item = models.ForeignKey('equipment.EquipmentInventoryItem', on_delete=models.PROTECT, related_name='site_planned_serials')
    serial_number = models.CharField(max_length=128)
    serial_normalized = models.CharField(max_length=128, editable=False)
    remarks = models.TextField(blank=True)

    # Snapshots for reporting stability
    equipment_name = models.CharField(max_length=255, blank=True)
    equipment_model = models.CharField(max_length=255, blank=True)
    site_id_business = models.CharField(max_length=100, blank=True, help_text="Original Site ID from upload for traceability")
    equipment_material_code = models.CharField(max_length=100, blank=True)

    created_by = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='created_project_site_inventory')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'project_site_inventory'
        constraints = [
            # Uniqueness when linked to a project_site
            models.UniqueConstraint(
                fields=['plan', 'project_site', 'serial_normalized'],
                condition=models.Q(deleted_at__isnull=True, project_site__isnull=False),
                name='uniq_serial_plan_site_linked'
            ),
            # Uniqueness when not yet linked (deferred linking) using business site id
            models.UniqueConstraint(
                fields=['plan', 'site_id_business', 'serial_normalized'],
                condition=models.Q(deleted_at__isnull=True, project_site__isnull=True),
                name='uniq_serial_plan_business_site_unlinked'
            ),
        ]
        indexes = [
            models.Index(fields=['plan', 'project_site']),
            models.Index(fields=['plan', 'site_id_business']),
            models.Index(fields=['plan', 'equipment_item']),
            models.Index(fields=['plan', 'equipment_material_code']),
            models.Index(fields=['serial_normalized']),
            models.Index(fields=['equipment_item']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self) -> str:
        return f"psite={self.project_site_id} serial={self.serial_number}"

    def save(self, *args, **kwargs):
        # Normalize serial for uniqueness (trim + upper)
        raw = (self.serial_number or '').strip()
        self.serial_normalized = raw.upper()
        # Populate snapshot fields if empty
        if self.equipment_item and not (self.equipment_name and self.equipment_model):
            self.equipment_name = self.equipment_name or (self.equipment_item.name or '')
            # Try to derive model from specifications or material_code/category
            model_val = ''
            try:
                specs = getattr(self.equipment_item, 'specifications', {}) or {}
                model_val = specs.get('model') or ''
            except Exception:
                model_val = ''
            self.equipment_model = self.equipment_model or (model_val or self.equipment_item.material_code or self.equipment_item.sub_category or '')
            if not self.equipment_material_code:
                try:
                    self.equipment_material_code = self.equipment_item.material_code or ''
                except Exception:
                    self.equipment_material_code = ''
        super().save(*args, **kwargs)
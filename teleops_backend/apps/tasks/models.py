from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from django.utils import timezone
import uuid


# Task model removed - using TaskFromFlow as the main task model
# All task functionality is now handled by TaskFromFlow

# Define choices at module level for reuse
TASK_STATUS = (
    ('pending', 'Pending'),
    ('assigned', 'Assigned'),
    ('allocated', 'Allocated'),
    ('in_progress', 'In Progress'),
    ('equipment_verification', 'Equipment Verification'),
    ('completed', 'Completed'),
    ('cancelled', 'Cancelled'),
    ('on_hold', 'On Hold'),
    ('failed', 'Failed'),
    ('rework_required', 'Rework Required'),
)

TASK_PRIORITY = (
    ('low', 'Low'),
    ('medium', 'Medium'),
    ('high', 'High'),
    ('urgent', 'Urgent'),
    ('critical', 'Critical'),
)

TASK_TYPE = (
    ('installation', 'Installation'),
    ('maintenance', 'Maintenance'),
    ('dismantling', 'Dismantling'),
    ('survey', 'Survey'),
    ('audit', 'Audit'),
    ('repair', 'Repair'),
    ('upgrade', 'Upgrade'),
    ('testing', 'Testing'),
    ('commissioning', 'Commissioning'),
    # Additional activity types for flow templates
    ('rf_survey', 'RF Survey'),
    ('emf_survey', 'EMF Survey'),
    ('rfi_survey', 'RFI Survey'),
    ('transportation', 'Transportation'),
    ('packaging', 'Packaging'),
    ('deviation_email', 'Deviation Email'),
    ('rsa', 'RSA'),
)


class TaskSiteAssignment(models.Model):
    """Through model for task-site relationships (multi-site tasks)"""
    
    ASSIGNMENT_STATUS = (
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    task_from_flow = models.ForeignKey('TaskFromFlow', on_delete=models.CASCADE, related_name='site_assignments')
    site = models.ForeignKey('sites.Site', on_delete=models.CASCADE)
    
    # Assignment details
    assignment_order = models.IntegerField(
        default=1,
        help_text="Order in which sites should be processed"
    )
    status = models.CharField(
        max_length=20,
        choices=ASSIGNMENT_STATUS,
        default='pending'
    )
    
    # Site-specific details
    site_specific_instructions = models.TextField(
        blank=True,
        help_text="Instructions specific to this site"
    )
    estimated_hours_at_site = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    actual_hours_at_site = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Timing
    scheduled_start_at_site = models.DateTimeField(null=True, blank=True)
    scheduled_end_at_site = models.DateTimeField(null=True, blank=True)
    actual_start_at_site = models.DateTimeField(null=True, blank=True)
    actual_end_at_site = models.DateTimeField(null=True, blank=True)
    
    # Progress
    progress_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0
    )
    completion_notes = models.TextField(blank=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'task_site_assignments'
        unique_together = ['task_from_flow', 'site']
        ordering = ['assignment_order', 'created_at']
        indexes = [
            models.Index(fields=['task_from_flow', 'status']),
            models.Index(fields=['site', 'status']),
            models.Index(fields=['assignment_order']),
        ]

    def __str__(self):
        return f"{self.task_from_flow.task_name} at {self.site.site_name}"


class TaskTeamAssignment(models.Model):
    """Through model for task team member assignments"""
    
    ROLE_CHOICES = (
        ('lead', 'Team Lead'),
        ('technician', 'Technician'),
        ('engineer', 'Engineer'),
        ('supervisor', 'Supervisor'),
        ('assistant', 'Assistant'),
        ('specialist', 'Specialist'),
        ('safety_officer', 'Safety Officer'),
    )
    
    task_from_flow = models.ForeignKey('TaskFromFlow', on_delete=models.CASCADE, related_name='team_assignments')
    user = models.ForeignKey('apps_users.User', on_delete=models.CASCADE)
    
    # Assignment details
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_primary = models.BooleanField(
        default=False,
        help_text="Whether this is the primary assignee"
    )
    
    # Timing
    assigned_date = models.DateField(auto_now_add=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Hours tracking
    estimated_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    actual_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Notes
    assignment_notes = models.TextField(blank=True)

    class Meta:
        db_table = 'task_team_assignments'
        unique_together = ['task_from_flow', 'user']
        indexes = [
            models.Index(fields=['task_from_flow', 'is_active']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.user.full_name} - {self.get_role_display()} on {self.task_from_flow.task_name}"


class TaskComment(models.Model):
    """Enhanced comments on tasks"""
    
    COMMENT_TYPE = (
        ('general', 'General Comment'),
        ('progress', 'Progress Update'),
        ('issue', 'Issue/Problem'),
        ('equipment', 'Equipment Note'),
        ('safety', 'Safety Note'),
        ('quality', 'Quality Note'),
        ('completion', 'Completion Note'),
    )
    
    task_from_flow = models.ForeignKey('TaskFromFlow', on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='task_comments')
    
    # Comment details
    comment_type = models.CharField(max_length=20, choices=COMMENT_TYPE, default='general')
    comment = models.TextField()
    is_internal = models.BooleanField(
        default=False,
        help_text="Whether comment is internal only (not visible to all team members)"
    )
    
    # Attachments and media
    attachments = models.JSONField(
        default=list,
        help_text="List of attachment file paths"
    )
    
    # Status and visibility
    is_pinned = models.BooleanField(default=False)
    visibility_scope = models.CharField(
        max_length=20,
        choices=[
            ('all', 'All Team Members'),
            ('supervisors', 'Supervisors Only'),
            ('assignees', 'Assignees Only'),
        ],
        default='all'
    )
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'task_comments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task_from_flow', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['comment_type']),
            models.Index(fields=['is_pinned']),
        ]

    def __str__(self):
        return f"Comment by {self.user.full_name} on {self.task_from_flow.task_name}"


class TaskTemplate(models.Model):
    """Task templates for recurring task types"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='task_templates')
    
    # Template details
    name = models.CharField(max_length=255)
    description = models.TextField()
    task_type = models.CharField(max_length=20, choices=TASK_TYPE)
    
    # Default values
    default_priority = models.CharField(max_length=20, choices=TASK_PRIORITY, default='medium')
    default_estimated_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Template configuration
    template_instructions = models.TextField(blank=True)
    safety_requirements_template = models.TextField(blank=True)
    equipment_verification_required = models.BooleanField(default=False)
    
    # Checklist template
    checklist_template = models.JSONField(
        default=list,
        help_text="Template checklist items"
    )
    
    # Status and usage
    is_active = models.BooleanField(default=True)
    usage_count = models.IntegerField(default=0)
    
    # Audit
    created_by = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='created_task_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'task_templates'
        unique_together = [('tenant', 'name')]
        ordering = ['name']
        indexes = [
            models.Index(fields=['tenant', 'is_active']),
            models.Index(fields=['task_type']),
            models.Index(fields=['usage_count']),
        ]

    def __str__(self):
        return f"{self.tenant.organization_name} - {self.name}"

    def create_task_from_template(self, **kwargs):
        """Create a new task based on this template"""
        task_data = {
            'tenant': self.tenant,
            'title': kwargs.get('title', self.name),
            'description': kwargs.get('description', self.description),
            'task_type': self.task_type,
            'priority': kwargs.get('priority', self.default_priority),
            'estimated_hours': kwargs.get('estimated_hours', self.default_estimated_hours),
            'instructions': self.template_instructions,
            'safety_requirements': self.safety_requirements_template,
            'equipment_verification_required': self.equipment_verification_required,
            'created_by': kwargs.get('created_by'),
            'primary_site': kwargs.get('primary_site'),
            'project': kwargs.get('project'),
        }
        
        # Remove None values
        task_data = {k: v for k, v in task_data.items() if v is not None}
        
        task = TaskFromFlow.objects.create(**task_data)
        
        # Increment usage count
        self.usage_count += 1
        self.save(update_fields=['usage_count'])
        
        return task 


class FlowTemplate(models.Model):
    """Flow template for reusable workflow patterns"""
    FLOW_CATEGORY = (
        ('DISMANTLING', 'Dismantling'),
        ('INSTALLATION', 'Installation'),
        ('MAINTENANCE', 'Maintenance'),
        ('SURVEY', 'Survey'),
        ('LOGISTICS', 'Logistics'),
        ('COMMISSIONING', 'Commissioning'),
        ('RELOCATION', 'Relocation'),
        ('CUSTOM', 'Custom'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='flow_templates')
    
    # Basic information
    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=FLOW_CATEGORY, default='CUSTOM')
    tags = models.JSONField(default=list, blank=True)
    
    # Flow configuration
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=False, help_text="Whether this flow can be used by other tenants")
    
    # Usage tracking
    usage_count = models.IntegerField(default=0)
    created_by = models.ForeignKey('apps_users.User', on_delete=models.SET_NULL, null=True, related_name='created_flows')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'flow_templates'
        ordering = ['-created_at']
        unique_together = ['tenant', 'name']

    def __str__(self):
        return f"{self.name} ({self.tenant.name})"


class FlowActivity(models.Model):
    """Individual activity within a flow template"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flow_template = models.ForeignKey(FlowTemplate, on_delete=models.CASCADE, related_name='activities')
    
    # Activity details
    activity_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")  # Make description optional
    activity_type = models.CharField(max_length=50, choices=TASK_TYPE)
    
    # Sequence and dependencies
    sequence_order = models.IntegerField()
    dependencies = models.JSONField(default=list, help_text="List of activity IDs this activity depends on")
    
    # Site and equipment requirements
    requires_site = models.BooleanField(default=True)
    requires_equipment = models.BooleanField(default=False)
    
    # Multi-site support
    site_scope = models.CharField(
        max_length=20, 
        choices=[
            ('SINGLE', 'Single Site'),
            ('MULTIPLE', 'Multiple Sites'),
            ('ALL', 'All Sites'),
        ],
        default='SINGLE'
    )
    parallel_execution = models.BooleanField(default=False, help_text="Can this activity run in parallel across sites")
    dependency_scope = models.CharField(
        max_length=20,
        choices=[
            ('SITE_LOCAL', 'Site Local'),
            ('CROSS_SITE', 'Cross Site'),
            ('GLOBAL', 'Global'),
        ],
        default='SITE_LOCAL'
    )
    site_coordination = models.BooleanField(default=False, help_text="Requires coordination between sites")

    class Meta:
        db_table = 'flow_activities'
        ordering = ['sequence_order']
        unique_together = ['flow_template', 'sequence_order']

    def __str__(self):
        return f"{self.activity_name} (Flow: {self.flow_template.name})"


class FlowSite(models.Model):
    """Site configuration within a flow template"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flow_template = models.ForeignKey(FlowTemplate, on_delete=models.CASCADE, related_name='sites')
    
    # Site reference (optional for flow templates)
    site = models.ForeignKey('sites.Site', on_delete=models.SET_NULL, null=True, blank=True, related_name='flow_templates')
    
    # Flow-specific site configuration
    alias = models.CharField(max_length=100, blank=True, help_text="Custom name for this site in the flow")
    order = models.IntegerField(default=0, help_text="Order of this site in the flow")
    
    # Site-specific settings
    is_required = models.BooleanField(default=True, help_text="Whether this site is required for the flow")
    role = models.CharField(
        max_length=20,
        choices=[
            ('PRIMARY', 'Primary'),
            ('SECONDARY', 'Secondary'),
            ('COORDINATION', 'Coordination'),
        ],
        default='PRIMARY'
    )

    class Meta:
        db_table = 'flow_sites'
        ordering = ['order']
        unique_together = ['flow_template', 'site']

    def __str__(self):
        return f"{self.site.site_name} in {self.flow_template.name}"


class FlowActivitySite(models.Model):
    """Many-to-many relationship between activities and sites in a flow"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flow_activity = models.ForeignKey(FlowActivity, on_delete=models.CASCADE, related_name='assigned_sites')
    flow_site = models.ForeignKey(FlowSite, on_delete=models.CASCADE, related_name='assigned_activities')
    
    # Activity-specific site settings
    is_required = models.BooleanField(default=True, help_text="Whether this site is required for this activity")
    execution_order = models.IntegerField(default=0, help_text="Order of execution for this site in the activity")
    
    class Meta:
        db_table = 'flow_activity_sites'
        unique_together = ['flow_activity', 'flow_site']
        ordering = ['execution_order']

    def __str__(self):
        return f"{self.flow_activity.activity_name} -> {self.flow_site.alias}"


class FlowInstance(models.Model):
    """Instance of a flow template being executed for a specific task"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # References
    flow_template = models.ForeignKey(FlowTemplate, on_delete=models.CASCADE, related_name='instances')
    task_from_flow = models.ForeignKey('TaskFromFlow', on_delete=models.CASCADE, related_name='flow_instances')
    
    # Instance state
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pending'),
            ('IN_PROGRESS', 'In Progress'),
            ('COMPLETED', 'Completed'),
            ('FAILED', 'Failed'),
            ('CANCELLED', 'Cancelled'),
        ],
        default='PENDING'
    )
    
    # Progress tracking
    current_activity_index = models.IntegerField(default=0)
    completed_activities = models.JSONField(default=list)
    failed_activities = models.JSONField(default=list)
    
    # Timestamps
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'flow_instances'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.flow_template.name} for task {self.task_from_flow.task_id}"


class TaskFromFlow(models.Model):
    """Main task created from a flow template for a site group"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Task ID fields
    task_id = models.CharField(max_length=50, help_text="Business task identifier")
    client_task_id = models.CharField(max_length=100, null=True, blank=True, help_text="Client's internal task ID")
    is_client_id_provided = models.BooleanField(default=False, help_text="Whether client provided the task ID")
    
    # Basic information
    task_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    flow_template = models.ForeignKey(FlowTemplate, on_delete=models.CASCADE, related_name='created_tasks')
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='flow_tasks')
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='flow_tasks')
    
    # Task-level status and priority
    status = models.CharField(max_length=25, choices=TASK_STATUS, default='pending')
    priority = models.CharField(max_length=20, choices=TASK_PRIORITY, default='medium')
    task_type = models.CharField(max_length=20, choices=TASK_TYPE, default='maintenance')
    
    # Scheduling
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    
    # User tracking
    created_by = models.ForeignKey('apps_users.User', on_delete=models.SET_NULL, null=True, related_name='created_flow_tasks')
    assigned_to = models.ForeignKey('apps_users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_flow_tasks')
    supervisor = models.ForeignKey('apps_users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='supervised_flow_tasks')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tasks_from_flow'
        unique_together = [
            ['tenant', 'task_id'],
            ['tenant', 'client_task_id']
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.task_id} - {self.task_name}"

    def save(self, *args, **kwargs):
        # Ensure client_task_id uniqueness check
        if self.client_task_id:
            self.is_client_id_provided = True
        super().save(*args, **kwargs)


class TaskSiteGroup(models.Model):
    """Maps site groups to tasks"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_from_flow = models.ForeignKey(TaskFromFlow, on_delete=models.CASCADE, related_name='site_groups')
    site = models.ForeignKey('sites.Site', on_delete=models.CASCADE, related_name='flow_task_groups')
    site_alias = models.CharField(max_length=50, help_text="Site alias from flow template (e.g., 'Near-end', 'Far-end')")
    assignment_order = models.IntegerField(default=0, help_text="Order within the site group")

    class Meta:
        db_table = 'task_site_groups'
        unique_together = ['task_from_flow', 'site_alias']
        ordering = ['assignment_order']

    def __str__(self):
        return f"{self.site_alias} ({self.site.site_name}) in {self.task_from_flow.task_id}"


class TaskSubActivity(models.Model):
    """Sub-tasks (activities) within a main task"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_from_flow = models.ForeignKey(TaskFromFlow, on_delete=models.CASCADE, related_name='sub_activities')
    flow_activity = models.ForeignKey(FlowActivity, on_delete=models.CASCADE, related_name='task_instances')
    
    # Sub-task details
    sequence_order = models.IntegerField(help_text="Local sequence order within this task")
    activity_type = models.CharField(max_length=50, choices=TASK_TYPE)
    activity_name = models.CharField(max_length=255)
    description = models.TextField()
    
    # Site assignment
    assigned_site = models.ForeignKey('sites.Site', on_delete=models.CASCADE, related_name='sub_activities')
    site_alias = models.CharField(max_length=50, help_text="Site alias from flow template")
    
    # Dependencies and coordination
    dependencies = models.JSONField(default=list, help_text="List of sub-task IDs this depends on")
    dependency_scope = models.CharField(
        max_length=20,
        choices=[
            ('SITE_LOCAL', 'Site Local'),
            ('CROSS_SITE', 'Cross Site'),
            ('GLOBAL', 'Global'),
        ],
        default='SITE_LOCAL'
    )
    parallel_execution = models.BooleanField(default=False, help_text="Can this activity run in parallel")
    
    # Status tracking
    status = models.CharField(max_length=25, choices=TASK_STATUS, default='pending')
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    
    # Progress tracking
    progress_percentage = models.IntegerField(default=0, validators=[MinValueValidator(0), MinValueValidator(100)])
    notes = models.TextField(blank=True, help_text="Additional notes for this sub-activity")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'task_sub_activities'
        ordering = ['sequence_order']
        unique_together = ['task_from_flow', 'sequence_order']

    def __str__(self):
        return f"{self.activity_name} ({self.site_alias}) in {self.task_from_flow.task_id}"

    def update_progress(self, percentage):
        """Update progress percentage for this sub-activity"""
        self.progress_percentage = max(0, min(100, percentage))
        self.save(update_fields=['progress_percentage', 'updated_at'])

    def update_status(self, new_status):
        """Update status and handle timestamps"""
        old_status = self.status
        self.status = new_status
        
        if new_status == 'in_progress' and old_status != 'in_progress':
            self.actual_start = timezone.now()
        elif new_status in ['completed', 'failed'] and old_status not in ['completed', 'failed']:
            self.actual_end = timezone.now()
        
        self.save(update_fields=['status', 'actual_start', 'actual_end', 'updated_at']) 


class BulkTaskCreationJob(models.Model):
    """
    Model to track bulk task creation jobs for large CSV uploads
    """
    JOB_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='bulk_task_creation_jobs')
    created_by = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='bulk_task_creation_jobs')
    flow_template = models.ForeignKey('FlowTemplate', on_delete=models.CASCADE, related_name='bulk_task_jobs')
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='bulk_task_jobs')
    file_name = models.CharField(max_length=255)
    total_rows = models.IntegerField(default=0)
    processed_rows = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=JOB_STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True, null=True)
    detailed_errors = models.JSONField(blank=True, null=True, help_text="Detailed error list for each failed row")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tasks_bulk_task_creation_job'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Bulk Task Creation {self.id} - {self.file_name} ({self.status})"
    
    @property
    def progress_percentage(self):
        if self.total_rows == 0:
            return 0
        return round((self.processed_rows / self.total_rows) * 100, 2)
    
    @property
    def duration(self):
        if not self.started_at:
            return None
        from django.utils import timezone
        end_time = self.completed_at or timezone.now()
        return end_time - self.started_at 


class TaskAllocation(models.Model):
    """Task allocation to vendors or internal teams"""
    
    ALLOCATION_TYPE_CHOICES = (
        ('vendor', 'Vendor'),
        ('internal_team', 'Internal Team'),
    )
    
    ALLOCATION_STATUS_CHOICES = (
        ('allocated', 'Allocated'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('reallocated', 'Reallocated'),
    )
    
    # Core fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_from_flow = models.ForeignKey('TaskFromFlow', on_delete=models.CASCADE, related_name='allocations')
    
    # Allocation details
    allocation_type = models.CharField(max_length=20, choices=ALLOCATION_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=ALLOCATION_STATUS_CHOICES, default='allocated')
    
    # Vendor allocation (when allocation_type = 'vendor')
    vendor_relationship = models.ForeignKey(
        'tenants.ClientVendorRelationship', 
        on_delete=models.CASCADE, 
        related_name='task_allocations',
        null=True, 
        blank=True
    )
    
    # Internal team allocation (when allocation_type = 'internal_team')
    internal_team = models.ForeignKey(
        'teams.Team', 
        on_delete=models.CASCADE, 
        related_name='task_allocations',
        null=True, 
        blank=True
    )
    
    # Sub-activities allocation
    allocated_sub_activities = models.ManyToManyField(
        'TaskSubActivity',
        through='TaskSubActivityAllocation',
        related_name='allocations'
    )
    
    # Allocation metadata
    allocation_notes = models.TextField(blank=True)
    estimated_duration_hours = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Estimated duration in hours"
    )
    actual_duration_hours = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Actual duration in hours"
    )
    
    # Scheduling
    allocated_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # User tracking
    allocated_by = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.CASCADE, 
        related_name='allocated_tasks'
    )
    updated_by = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.CASCADE, 
        related_name='updated_task_allocations'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'task_allocations'
        verbose_name = _('Task Allocation')
        verbose_name_plural = _('Task Allocations')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task']),
            models.Index(fields=['allocation_type']),
            models.Index(fields=['status']),
            models.Index(fields=['vendor_relationship']),
            models.Index(fields=['internal_team']),
            models.Index(fields=['allocated_by']),
        ]
    
    def __str__(self):
        if self.allocation_type == 'vendor' and self.vendor_relationship:
            return f"Task {self.task_from_flow.task_id} → {self.vendor_relationship.vendor_tenant.organization_name if self.vendor_relationship.vendor_tenant else 'Unknown Vendor'}"
        elif self.allocation_type == 'internal_team' and self.internal_team:
            return f"Task {self.task_from_flow.task_id} → {self.internal_team.name}"
        else:
            return f"Task {self.task_from_flow.task_id} → {self.allocation_type}"
    
    def clean(self):
        """Validate allocation data"""
        from django.core.exceptions import ValidationError
        
        if self.allocation_type == 'vendor' and not self.vendor_relationship:
            raise ValidationError("Vendor relationship is required for vendor allocation")
        
        if self.allocation_type == 'internal_team' and not self.internal_team:
            raise ValidationError("Internal team is required for internal team allocation")
        
        if self.vendor_relationship and self.internal_team:
            raise ValidationError("Cannot have both vendor relationship and internal team")
    
    @property
    def allocated_to_name(self):
        """Get the name of who the task is allocated to"""
        if self.allocation_type == 'vendor' and self.vendor_relationship:
            return self.vendor_relationship.vendor_tenant.organization_name if self.vendor_relationship.vendor_tenant else 'Unknown Vendor'
        elif self.allocation_type == 'internal_team' and self.internal_team:
            return self.internal_team.name
        return 'Unknown'


class TaskSubActivityAllocation(models.Model):
    """Many-to-many relationship between TaskAllocation and TaskSubActivity with additional metadata"""
    
    allocation = models.ForeignKey('TaskAllocation', on_delete=models.CASCADE, related_name='sub_activity_allocations')
    sub_activity = models.ForeignKey('TaskSubActivity', on_delete=models.CASCADE, related_name='allocation_details')
    
    # Allocation status for this specific sub-activity
    status = models.CharField(
        max_length=20, 
        choices=TaskAllocation.ALLOCATION_STATUS_CHOICES, 
        default='allocated'
    )
    
    # Progress tracking
    progress_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0), MinValueValidator(100)]
    )
    
    # Timing
    estimated_duration_hours = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    actual_duration_hours = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Notes and metadata
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'task_sub_activity_allocations'
        verbose_name = _('Task Sub-Activity Allocation')
        verbose_name_plural = _('Task Sub-Activity Allocations')
        unique_together = ['allocation', 'sub_activity']
        indexes = [
            models.Index(fields=['allocation']),
            models.Index(fields=['sub_activity']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.allocation} - {self.sub_activity}"


class TaskAllocationHistory(models.Model):
    """Track changes to task allocations for audit purposes"""
    
    ACTION_CHOICES = (
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('status_changed', 'Status Changed'),
        ('reallocated', 'Reallocated'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    )
    
    allocation = models.ForeignKey('TaskAllocation', on_delete=models.CASCADE, related_name='history')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    
    # Change details
    previous_status = models.CharField(
        max_length=20, 
        choices=TaskAllocation.ALLOCATION_STATUS_CHOICES, 
        null=True, 
        blank=True
    )
    new_status = models.CharField(
        max_length=20, 
        choices=TaskAllocation.ALLOCATION_STATUS_CHOICES, 
        null=True, 
        blank=True
    )
    
    # User who made the change
    changed_by = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.CASCADE, 
        related_name='allocation_changes'
    )
    
    # Change metadata
    change_reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'task_allocation_history'
        verbose_name = _('Task Allocation History')
        verbose_name_plural = _('Task Allocation History')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['allocation']),
            models.Index(fields=['action']),
            models.Index(fields=['changed_by']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.allocation} - {self.action} by {self.changed_by} at {self.created_at}" 


class TaskTimeline(models.Model):
    """Track task lifecycle events and timeline"""
    
    EVENT_TYPE_CHOICES = (
        ('created', 'Task Created'),
        ('allocated', 'Allocated to Vendor'),
        ('assigned', 'Assigned to Internal Team'),
        ('work_started', 'Work Started'),
        ('work_completed', 'Work Completed'),
        ('cancelled', 'Cancelled'),
        ('reallocated', 'Reallocated'),
        ('status_changed', 'Status Changed'),
        ('progress_updated', 'Progress Updated'),
        ('comment_added', 'Comment Added'),
        ('equipment_verified', 'Equipment Verified'),
    )
    
    task_from_flow = models.ForeignKey('TaskFromFlow', on_delete=models.CASCADE, related_name='timeline_events')
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES)
    event_data = models.JSONField(default=dict, blank=True, help_text="Store relevant event data")
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='task_timeline_events')
    
    class Meta:
        db_table = 'task_timeline'
        verbose_name = _('Task Timeline Event')
        verbose_name_plural = _('Task Timeline Events')
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['task']),
            models.Index(fields=['event_type']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['user']),
        ]
    
    def __str__(self):
        return f"{self.task_from_flow.task_id} - {self.event_type} at {self.timestamp}"
    
    @property
    def event_description(self):
        """Get human-readable event description"""
        descriptions = {
            'created': 'Task was created',
            'allocated': 'Task was allocated to vendor',
            'assigned': 'Task was assigned to internal team',
            'work_started': 'Work on task was started',
            'work_completed': 'Work on task was completed',
            'cancelled': 'Task was cancelled',
            'reallocated': 'Task was reallocated',
            'status_changed': 'Task status was changed',
            'progress_updated': 'Task progress was updated',
            'comment_added': 'Comment was added to task',
            'equipment_verified': 'Equipment was verified',
        }
        return descriptions.get(self.event_type, self.event_type) 
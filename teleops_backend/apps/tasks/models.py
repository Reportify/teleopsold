from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from django.utils import timezone
import uuid


class Task(models.Model):
    """Enhanced task model for project and site tasks with multi-site support"""
    TASK_STATUS = (
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
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
    
    EQUIPMENT_VERIFICATION_STATUS = (
        ('not_required', 'Not Required'),
        ('pending', 'Pending Verification'),
        ('in_progress', 'Verification In Progress'),
        ('verified', 'Verified'),
        ('failed', 'Verification Failed'),
        ('partial', 'Partially Verified'),
    )

    # Core fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='tasks')
    
    # Task relationships
    project = models.ForeignKey(
        'projects.Project', 
        on_delete=models.CASCADE, 
        related_name='tasks', 
        null=True, 
        blank=True
    )
    
    # Multi-site support
    primary_site = models.ForeignKey(
        'sites.Site', 
        on_delete=models.CASCADE, 
        related_name='primary_tasks',
        help_text="Primary site for this task"
    )
    additional_sites = models.ManyToManyField(
        'sites.Site',
        through='TaskSiteAssignment',
        related_name='additional_tasks',
        blank=True,
        help_text="Additional sites involved in this task"
    )
    
    # Task details
    task_id = models.CharField(max_length=50, help_text="Business task identifier")
    title = models.CharField(max_length=255)
    description = models.TextField()
    task_type = models.CharField(max_length=20, choices=TASK_TYPE, default='maintenance')
    status = models.CharField(max_length=25, choices=TASK_STATUS, default='pending')
    priority = models.CharField(max_length=20, choices=TASK_PRIORITY, default='medium')
    
    # Task scheduling and timeline
    due_date = models.DateTimeField(null=True, blank=True)
    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    
    # Time tracking
    estimated_hours = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)]
    )
    actual_hours = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)]
    )
    
    # Team and assignment
    assigned_to = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_tasks'
    )
    assigned_team = models.ManyToManyField(
        'apps_users.User',
        through='TaskTeamAssignment',
        related_name='team_tasks',
        blank=True
    )
    supervisor = models.ForeignKey(
        'apps_users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='supervised_tasks',
        help_text="Task supervisor for quality control"
    )
    
    # Equipment verification
    equipment_verification_required = models.BooleanField(
        default=False,
        help_text="Whether equipment verification is required"
    )
    equipment_verification_status = models.CharField(
        max_length=20,
        choices=EQUIPMENT_VERIFICATION_STATUS,
        default='not_required'
    )
    equipment_verified_by = models.ForeignKey(
        'apps_users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_tasks'
    )
    equipment_verified_at = models.DateTimeField(null=True, blank=True)
    
    # Safety and compliance
    safety_requirements = models.TextField(
        blank=True,
        help_text="Safety requirements and protocols"
    )
    compliance_notes = models.TextField(
        blank=True,
        help_text="Compliance and regulatory notes"
    )
    
    # Task progress and completion
    progress_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Task completion percentage (0-100)"
    )
    quality_score = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Quality score (1-5)"
    )
    
    # Mobile and field support
    mobile_accessible = models.BooleanField(
        default=True,
        help_text="Whether task is accessible via mobile app"
    )
    offline_capable = models.BooleanField(
        default=False,
        help_text="Whether task can be completed offline"
    )
    gps_required = models.BooleanField(
        default=False,
        help_text="Whether GPS verification is required"
    )
    
    # Additional metadata
    instructions = models.TextField(
        blank=True,
        help_text="Detailed task instructions"
    )
    completion_notes = models.TextField(
        blank=True,
        help_text="Notes added upon completion"
    )
    cancellation_reason = models.TextField(
        blank=True,
        help_text="Reason for cancellation"
    )
    
    # Financial
    estimated_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )
    actual_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )
    
    # Audit fields
    created_by = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.CASCADE, 
        related_name='created_tasks'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tasks'
        verbose_name = _('Task')
        verbose_name_plural = _('Tasks')
        ordering = ['-created_at']
        unique_together = [('tenant', 'task_id')]
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['project', 'status']),
            models.Index(fields=['primary_site', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['priority', 'status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['task_type', 'status']),
            models.Index(fields=['equipment_verification_status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['scheduled_start']),
            models.Index(fields=['task_id']),
        ]

    def __str__(self):
        return f"{self.task_id} - {self.title}"

    def clean(self):
        """Validate task data"""
        from django.core.exceptions import ValidationError
        from django.utils import timezone
        
        # Validate dates
        if self.scheduled_start and self.scheduled_end:
            if self.scheduled_start >= self.scheduled_end:
                raise ValidationError("Scheduled start must be before scheduled end")
        
        if self.actual_start and self.actual_end:
            if self.actual_start >= self.actual_end:
                raise ValidationError("Actual start must be before actual end")
        
        # Validate progress percentage
        if self.progress_percentage < 0 or self.progress_percentage > 100:
            raise ValidationError("Progress percentage must be between 0 and 100")
        
        # Validate quality score
        if self.quality_score is not None and (self.quality_score < 1 or self.quality_score > 5):
            raise ValidationError("Quality score must be between 1 and 5")
        
        # Validate equipment verification
        if self.equipment_verification_required and self.equipment_verification_status == 'not_required':
            self.equipment_verification_status = 'pending'

    def save(self, *args, **kwargs):
        """Override save for business logic"""
        # Auto-generate task_id if not provided
        if not self.task_id:
            self.task_id = self._generate_task_id()
        
        # Update completion timestamp
        if self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
            if self.progress_percentage < 100:
                self.progress_percentage = 100
        
        # Update actual end time when task is completed
        if self.status == 'completed' and not self.actual_end:
            self.actual_end = timezone.now()
        
        # Set actual start time when task moves to in_progress
        if self.status == 'in_progress' and not self.actual_start:
            self.actual_start = timezone.now()
        
        self.clean()
        super().save(*args, **kwargs)

    def _generate_task_id(self):
        """Generate unique task ID for the tenant"""
        from django.utils import timezone
        
        # Format: TSK-YYYYMM-NNNN
        current_month = timezone.now().strftime('%Y%m')
        
        # Find last task ID for current month
        last_task = Task.objects.filter(
            tenant=self.tenant,
            task_id__startswith=f'TSK-{current_month}-'
        ).order_by('-task_id').first()
        
        if last_task:
            try:
                last_number = int(last_task.task_id.split('-')[-1])
                next_number = last_number + 1
            except (ValueError, IndexError):
                next_number = 1
        else:
            next_number = 1
        
        return f'TSK-{current_month}-{next_number:04d}'

    @property
    def is_overdue(self):
        """Check if task is overdue"""
        return (
            self.due_date is not None 
            and self.due_date < timezone.now() 
            and self.status not in ['completed', 'cancelled']
        )

    @property
    def is_multi_site(self):
        """Check if task involves multiple sites"""
        return self.additional_sites.exists()

    @property
    def all_sites(self):
        """Get all sites involved in this task"""
        sites = [self.primary_site]
        sites.extend(list(self.additional_sites.all()))
        return sites

    @property
    def sites_count(self):
        """Get total number of sites involved"""
        return 1 + self.additional_sites.count()

    @property
    def duration_hours(self):
        """Calculate actual duration in hours"""
        if self.actual_start and self.actual_end:
            delta = self.actual_end - self.actual_start
            return round(delta.total_seconds() / 3600, 2)
        return None

    @property
    def is_equipment_verified(self):
        """Check if equipment verification is complete"""
        if not self.equipment_verification_required:
            return True
        return self.equipment_verification_status == 'verified'

    def mark_equipment_verified(self, verified_by):
        """Mark equipment as verified"""
        self.equipment_verification_status = 'verified'
        self.equipment_verified_by = verified_by
        self.equipment_verified_at = timezone.now()
        self.save(update_fields=[
            'equipment_verification_status', 
            'equipment_verified_by', 
            'equipment_verified_at',
            'updated_at'
        ])

    def update_progress(self, percentage, notes=None):
        """Update task progress"""
        self.progress_percentage = max(0, min(100, percentage))
        
        if percentage >= 100 and self.status not in ['completed', 'cancelled']:
            self.status = 'completed'
            self.completed_at = timezone.now()
            if not self.actual_end:
                self.actual_end = timezone.now()
        
        if notes:
            if self.completion_notes:
                self.completion_notes += f"\n{timezone.now().strftime('%Y-%m-%d %H:%M')}: {notes}"
            else:
                self.completion_notes = f"{timezone.now().strftime('%Y-%m-%d %H:%M')}: {notes}"
        
        self.save()


class TaskSiteAssignment(models.Model):
    """Through model for task-site relationships (multi-site tasks)"""
    
    ASSIGNMENT_STATUS = (
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
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
        unique_together = ['task', 'site']
        ordering = ['assignment_order', 'created_at']
        indexes = [
            models.Index(fields=['task', 'status']),
            models.Index(fields=['site', 'status']),
            models.Index(fields=['assignment_order']),
        ]

    def __str__(self):
        return f"{self.task.title} at {self.site.site_name}"


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
    
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
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
        unique_together = ['task', 'user']
        indexes = [
            models.Index(fields=['task', 'is_active']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.user.full_name} - {self.get_role_display()} on {self.task.title}"


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
    
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
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
            models.Index(fields=['task', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['comment_type']),
            models.Index(fields=['is_pinned']),
        ]

    def __str__(self):
        return f"Comment by {self.user.full_name} on {self.task.title}"


class TaskTemplate(models.Model):
    """Task templates for recurring task types"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='task_templates')
    
    # Template details
    name = models.CharField(max_length=255)
    description = models.TextField()
    task_type = models.CharField(max_length=20, choices=Task.TASK_TYPE)
    
    # Default values
    default_priority = models.CharField(max_length=20, choices=Task.TASK_PRIORITY, default='medium')
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
        
        task = Task.objects.create(**task_data)
        
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
    description = models.TextField()
    activity_type = models.CharField(max_length=50, choices=Task.TASK_TYPE)
    
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
    task = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name='flow_instances')
    
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
        return f"{self.flow_template.name} for {self.task.title}" 
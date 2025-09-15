from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q, Count, Sum
import uuid
from decimal import Decimal


class AllocationStatus(models.TextChoices):
    """Status choices for individual task allocations (work progress)"""
    PENDING = 'pending', 'Pending'
    ALLOCATED = 'allocated', 'Allocated'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    DEALLOCATED = 'deallocated', 'Deallocated'


class TaskAllocationStatus(models.TextChoices):
    """Aggregated status for task allocation coverage (not work progress)"""
    UNALLOCATED = 'unallocated', 'Unallocated'
    PARTIALLY_ALLOCATED = 'partially_allocated', 'Partially Allocated'
    FULLY_ALLOCATED = 'fully_allocated', 'Fully Allocated'
    MIXED_ALLOCATION = 'mixed_allocation', 'Mixed Allocation'  # Some vendor, some internal


class TaskAllocationManager(models.Manager):
    """Custom manager for TaskAllocation"""
    
    def get_task_allocation_summary(self, task):
        """Get allocation summary for a task"""
        allocations = self.filter(task=task, status__in=[
            AllocationStatus.ALLOCATED, 
            AllocationStatus.IN_PROGRESS, 
            AllocationStatus.COMPLETED
        ])
        
        total_sub_activities = task.sub_activities.count()
        allocated_sub_activities = set()
        
        vendor_allocations = 0
        internal_allocations = 0
        
        for allocation in allocations:
            allocated_sub_activities.update(
                allocation.sub_activity_allocations.values_list('sub_activity_id', flat=True)
            )
            if allocation.allocation_type == 'vendor':
                vendor_allocations += 1
            else:
                internal_allocations += 1
        
        allocated_count = len(allocated_sub_activities)
        
        return {
            'total_sub_activities': total_sub_activities,
            'allocated_sub_activities': allocated_count,
            'unallocated_sub_activities': total_sub_activities - allocated_count,
            'vendor_allocations': vendor_allocations,
            'internal_allocations': internal_allocations,
            'is_mixed': vendor_allocations > 0 and internal_allocations > 0,
            'is_fully_allocated': allocated_count == total_sub_activities,
            'is_partially_allocated': 0 < allocated_count < total_sub_activities
        }


class TaskAllocation(models.Model):
    """Enhanced Task Allocation Model"""
    
    ALLOCATION_TYPE_CHOICES = [
        ('vendor', 'Vendor'),
        ('internal_team', 'Internal Team'),
    ]
    
    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        'TaskFromFlow', 
        on_delete=models.CASCADE, 
        related_name='allocations'
    )
    allocation_type = models.CharField(max_length=20, choices=ALLOCATION_TYPE_CHOICES)
    status = models.CharField(
        max_length=20, 
        choices=AllocationStatus.choices, 
        default=AllocationStatus.PENDING
    )
    
    # Allocation targets (mutually exclusive)
    vendor_relationship = models.ForeignKey(
        'tenants.ClientVendorRelationship', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='task_allocations'
    )
    internal_team = models.ForeignKey(
        'teams.Team', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='task_allocations'
    )
    
    # Allocation metadata
    allocation_reference = models.CharField(
        max_length=100, 
        blank=True, 
        help_text="External reference number for this allocation"
    )
    priority = models.CharField(
        max_length=20,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('urgent', 'Urgent')],
        default='medium'
    )
    
    # Progress tracking
    progress_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Overall progress of this allocation"
    )
    
    # Notes and instructions
    allocation_notes = models.TextField(
        blank=True, 
        help_text="Special instructions or notes for this allocation"
    )
    completion_notes = models.TextField(
        blank=True, 
        help_text="Notes added upon completion"
    )
    
    # User tracking
    allocated_by = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.PROTECT, 
        related_name='allocations_created'
    )
    updated_by = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.PROTECT, 
        related_name='allocations_updated',
        null=True, 
        blank=True
    )
    
    # Timestamps
    allocated_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Metadata for extensibility
    metadata = models.JSONField(default=dict, blank=True)
    
    objects = TaskAllocationManager()
    
    class Meta:
        db_table = 'tasks_taskallocation'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task', 'status']),
            models.Index(fields=['allocation_type', 'status']),
            models.Index(fields=['vendor_relationship', 'status']),
            models.Index(fields=['internal_team', 'status']),
            models.Index(fields=['allocated_at']),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(allocation_type='vendor', vendor_relationship__isnull=False, internal_team__isnull=True) |
                    Q(allocation_type='internal_team', internal_team__isnull=False, vendor_relationship__isnull=True)
                ),
                name='allocation_target_consistency'
            ),
            models.CheckConstraint(
                check=Q(progress_percentage__gte=0, progress_percentage__lte=100),
                name='valid_progress_percentage'
            ),
        ]
    
    def clean(self):
        """Validate allocation data"""
        super().clean()
        
        # Validate allocation type and target consistency
        if self.allocation_type == 'vendor':
            if not self.vendor_relationship:
                raise ValidationError("Vendor relationship is required for vendor allocation")
            if self.internal_team:
                raise ValidationError("Internal team must be null for vendor allocation")
        
        elif self.allocation_type == 'internal_team':
            if not self.internal_team:
                raise ValidationError("Internal team is required for internal team allocation")
            if self.vendor_relationship:
                raise ValidationError("Vendor relationship must be null for internal team allocation")
        

    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
        
        # Update task allocation status after saving
        self.update_task_allocation_status()
    
    def update_task_allocation_status(self):
        """Update the task's allocation status based on all allocations"""
        summary = TaskAllocation.objects.get_task_allocation_summary(self.task)
        
        if summary['allocated_sub_activities'] == 0:
            new_status = TaskAllocationStatus.UNALLOCATED
        elif summary['is_fully_allocated']:
            if summary['is_mixed']:
                new_status = TaskAllocationStatus.MIXED_ALLOCATION
            else:
                new_status = TaskAllocationStatus.FULLY_ALLOCATED
        else:
            new_status = TaskAllocationStatus.PARTIALLY_ALLOCATED
        
        # Check if any allocation is in progress or completed
        active_allocations = TaskAllocation.objects.filter(
            task=self.task, 
            status__in=[AllocationStatus.IN_PROGRESS, AllocationStatus.COMPLETED]
        )
        
        # Note: TaskAllocationStatus is for coverage, not work progress
        # Work progress is tracked at individual allocation level with AllocationStatus
        
        # Update task status if it has changed
        if hasattr(self.task, 'allocation_status') and self.task.allocation_status != new_status:
            self.task.allocation_status = new_status
            self.task.save(update_fields=['allocation_status'])
    
    @property
    def allocated_to_name(self):
        """Get the name of who this is allocated to"""
        if self.allocation_type == 'vendor' and self.vendor_relationship:
            return self.vendor_relationship.vendor_tenant.organization_name
        elif self.allocation_type == 'internal_team' and self.internal_team:
            return self.internal_team.name
        return "Unknown"
    
    @property
    def allocated_sub_activities_count(self):
        """Get count of allocated sub-activities"""
        return self.sub_activity_allocations.count()
    
    @property
    def completed_sub_activities_count(self):
        """Get count of completed sub-activities"""
        return self.sub_activity_allocations.filter(status='completed').count()
    
    @property
    def can_be_started(self):
        """Check if allocation can be started"""
        return self.status in ['allocated', 'accepted'] and self.allocated_sub_activities_count > 0
    
    @property
    def can_be_completed(self):
        """Check if allocation can be completed"""
        return (self.status == 'in_progress' and 
                self.completed_sub_activities_count == self.allocated_sub_activities_count)
    
    def start_work(self, user):
        """Start work on this allocation"""
        if not self.can_be_started:
            raise ValidationError("Allocation cannot be started in current state")
        
        self.status = AllocationStatus.IN_PROGRESS
        self.started_at = timezone.now()
        self.updated_by = user
        self.save()
        
        # Create timeline event
        self.create_timeline_event('work_started', user)
    
    def complete_work(self, user, completion_notes=None):
        """Complete work on this allocation"""
        if not self.can_be_completed:
            raise ValidationError("Allocation cannot be completed - not all sub-activities are done")
        
        self.status = AllocationStatus.COMPLETED
        self.completed_at = timezone.now()
        self.progress_percentage = Decimal('100.00')
        if completion_notes:
            self.completion_notes = completion_notes
        self.updated_by = user
        self.save()
        
        # Create timeline event
        self.create_timeline_event('work_completed', user)
    
    def cancel_allocation(self, user, reason=None):
        """Cancel this allocation"""
        self.status = AllocationStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.updated_by = user
        if reason:
            self.metadata['cancellation_reason'] = reason
        self.save()
        
        # Create timeline event
        self.create_timeline_event('allocation_cancelled', user, {'reason': reason})
    
    def create_timeline_event(self, event_type, user, extra_data=None):
        """Create a timeline event for this allocation"""
        from .models import TaskTimeline
        
        event_data = {
            'allocation_id': str(self.id),
            'allocation_type': self.allocation_type,
            'allocated_to': self.allocated_to_name,
            'status': self.status,
        }
        
        if extra_data:
            event_data.update(extra_data)
        
        TaskTimeline.objects.create(
            task_from_flow=self.task,
            event_type=event_type,
            event_data=event_data,
            user=user
        )
    
    def __str__(self):
        return f"{self.task.task_name} -> {self.allocated_to_name} ({self.status})"


class SubActivityAllocation(models.Model):
    """Enhanced Sub-Activity Allocation Model"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    allocation = models.ForeignKey(
        TaskAllocation, 
        on_delete=models.CASCADE, 
        related_name='sub_activity_allocations'
    )
    sub_activity = models.ForeignKey(
        'TaskSubActivity', 
        on_delete=models.CASCADE, 
        related_name='allocations'
    )
    
    # Status and progress
    status = models.CharField(
        max_length=20, 
        choices=AllocationStatus.choices, 
        default=AllocationStatus.PENDING
    )
    progress_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    # Scheduling
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
    
    # Execution tracking
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True)
    completion_notes = models.TextField(blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tasks_subactivityallocation'
        ordering = ['sub_activity__sequence_order']
        unique_together = ['allocation', 'sub_activity']
        indexes = [
            models.Index(fields=['allocation', 'status']),
            models.Index(fields=['sub_activity', 'status']),
            models.Index(fields=['status', 'started_at']),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(progress_percentage__gte=0, progress_percentage__lte=100),
                name='valid_sub_activity_progress'
            ),
        ]
    
    def clean(self):
        """Validate sub-activity allocation"""
        super().clean()
        
        # Ensure sub-activity belongs to the same task as the allocation
        if self.allocation and self.sub_activity:
            if self.sub_activity.task_from_flow != self.allocation.task:
                raise ValidationError(
                    "Sub-activity must belong to the same task as the allocation"
                )
        
        # Check for duplicate allocations of the same sub-activity
        if self.allocation and self.sub_activity:
            existing = SubActivityAllocation.objects.filter(
                sub_activity=self.sub_activity,
                allocation__status__in=['allocated', 'accepted', 'in_progress']
            ).exclude(id=self.id)
            
            if existing.exists():
                raise ValidationError(
                    f"Sub-activity '{self.sub_activity.activity_name}' is already allocated to another active allocation"
                )
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
        
        # Update parent allocation progress
        self.update_allocation_progress()
    
    def update_allocation_progress(self):
        """Update the parent allocation's progress based on sub-activity progress"""
        allocation = self.allocation
        sub_allocations = allocation.sub_activity_allocations.all()
        
        if sub_allocations.exists():
            total_progress = sum(sa.progress_percentage for sa in sub_allocations)
            avg_progress = total_progress / sub_allocations.count()
            
            allocation.progress_percentage = avg_progress
            allocation.save(update_fields=['progress_percentage'])
    
    def start_work(self, user):
        """Start work on this sub-activity"""
        if self.status not in ['allocated', 'accepted']:
            raise ValidationError("Sub-activity cannot be started in current state")
        
        self.status = AllocationStatus.IN_PROGRESS
        self.started_at = timezone.now()
        self.save()
        
        # Start parent allocation if not already started
        if self.allocation.status in ['allocated', 'accepted']:
            self.allocation.start_work(user)
    
    def complete_work(self, user, completion_notes=None):
        """Complete work on this sub-activity"""
        if self.status != 'in_progress':
            raise ValidationError("Sub-activity must be in progress to be completed")
        
        self.status = AllocationStatus.COMPLETED
        self.completed_at = timezone.now()
        self.progress_percentage = Decimal('100.00')
        if completion_notes:
            self.completion_notes = completion_notes
        self.save()
        
        # Check if parent allocation can be completed
        if self.allocation.can_be_completed:
            self.allocation.complete_work(user)
    
    def __str__(self):
        return f"{self.allocation} - {self.sub_activity.activity_name} ({self.status})"


class AllocationHistory(models.Model):
    """Enhanced Allocation History Model"""
    
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('status_changed', 'Status Changed'),
        ('started', 'Started'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('sub_activity_added', 'Sub-activity Added'),
        ('sub_activity_removed', 'Sub-activity Removed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    allocation = models.ForeignKey(
        TaskAllocation, 
        on_delete=models.CASCADE, 
        related_name='history'
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    
    # Status tracking
    previous_status = models.CharField(
        max_length=20, 
        choices=AllocationStatus.choices, 
        null=True, 
        blank=True
    )
    new_status = models.CharField(
        max_length=20, 
        choices=AllocationStatus.choices, 
        null=True, 
        blank=True
    )
    
    # Change tracking
    changed_by = models.ForeignKey('apps_users.User', on_delete=models.PROTECT)
    change_reason = models.TextField(blank=True)
    
    # Additional data
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'tasks_allocationhistory'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['allocation', 'created_at']),
            models.Index(fields=['action', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.allocation} - {self.action} by {self.changed_by.get_full_name()}"
from django.db import models
from django.utils.translation import gettext_lazy as _


class Task(models.Model):
    """Task model for project and site tasks"""
    TASK_STATUS = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('on_hold', 'On Hold'),
    )

    TASK_PRIORITY = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    )

    # Core relationships - FIXED REFERENCES
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='tasks')
    project = models.ForeignKey(
        'projects.Project', 
        on_delete=models.CASCADE, 
        related_name='tasks', 
        null=True, 
        blank=True
    )
    site = models.ForeignKey(
        'sites.Site', 
        on_delete=models.CASCADE, 
        related_name='tasks', 
        null=True, 
        blank=True
    )
    
    # Task details
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=TASK_STATUS, default='pending')
    priority = models.CharField(max_length=20, choices=TASK_PRIORITY, default='medium')
    
    # Task scheduling
    due_date = models.DateTimeField(null=True, blank=True)
    estimated_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    actual_hours = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Assignment - FIXED REFERENCES
    assigned_to = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='assigned_tasks'
    )
    created_by = models.ForeignKey(
        'apps_users.User', 
        on_delete=models.CASCADE, 
        related_name='created_tasks'
    )
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tasks'
        verbose_name = _('Task')
        verbose_name_plural = _('Tasks')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['project', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['priority', 'status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"

    def clean(self):
        """Validate task data"""
        from django.core.exceptions import ValidationError
        from django.utils import timezone
        
        if self.due_date and self.due_date < timezone.now():
            raise ValidationError("Due date cannot be in the past")
        
        if self.estimated_hours is not None and self.estimated_hours <= 0:
            raise ValidationError("Estimated hours must be positive")
        
        if self.actual_hours is not None and self.actual_hours < 0:
            raise ValidationError("Actual hours cannot be negative")

    @property
    def is_overdue(self):
        """Check if task is overdue"""
        from django.utils import timezone
        return (
            self.due_date is not None 
            and self.due_date < timezone.now() 
            and self.status not in ['completed', 'cancelled']
        )

    @property
    def progress_percentage(self):
        """Calculate progress percentage based on actual vs estimated hours"""
        if self.estimated_hours and self.actual_hours:
            return min(100, (self.actual_hours / self.estimated_hours) * 100)
        return 0


class TaskComment(models.Model):
    """Comments on tasks"""
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='task_comments')  # FIXED REFERENCE
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'task_comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['task', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"Comment by {self.user.get_full_name()} on {self.task.title}" 
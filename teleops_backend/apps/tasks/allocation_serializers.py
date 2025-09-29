from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from decimal import Decimal

from .allocation_models import (
    TaskAllocation, 
    SubActivityAllocation, 
    AllocationHistory,
    TaskAllocationStatus
)
from .models import TaskFromFlow, TaskSubActivity, TaskTimeline
from apps.tenants.models import ClientVendorRelationship
from apps.teams.models import Team
from apps.users.models import User


class SubActivityAllocationSerializer(serializers.ModelSerializer):
    """Serializer for SubActivityAllocation"""
    
    sub_activity_name = serializers.CharField(source='sub_activity.activity_name', read_only=True)
    sub_activity_type = serializers.CharField(source='sub_activity.activity_type', read_only=True)
    sub_activity_sequence = serializers.IntegerField(source='sub_activity.sequence_order', read_only=True)
    site_name = serializers.CharField(source='sub_activity.assigned_site.site_name', read_only=True)
    site_alias = serializers.CharField(source='sub_activity.site_alias', read_only=True)
    
    class Meta:
        model = SubActivityAllocation
        fields = [
            'id', 'sub_activity', 'sub_activity_name', 'sub_activity_type', 
            'sub_activity_sequence', 'site_name', 'site_alias', 'status', 'progress_percentage',
            'estimated_duration_hours', 'actual_duration_hours', 'started_at', 
            'completed_at', 'notes', 'completion_notes', 'metadata', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaskAllocationSerializer(serializers.ModelSerializer):
    """Serializer for TaskAllocation (read-only)"""
    
    # Task information
    task_id = serializers.CharField(source='task.task_id', read_only=True)
    task_name = serializers.CharField(source='task.task_name', read_only=True)
    project_name = serializers.CharField(source='task.project.name', read_only=True)
    
    # Allocation target information
    vendor_name = serializers.CharField(source='vendor_relationship.vendor_tenant.organization_name', read_only=True)
    vendor_code = serializers.CharField(source='vendor_relationship.vendor_code', read_only=True)
    vendor_contact = serializers.CharField(source='vendor_relationship.contact_person_name', read_only=True)
    
    # Client information (for vendor-allocated tasks)
    client_tenant_name = serializers.CharField(source='vendor_relationship.client_tenant.organization_name', read_only=True)
    client_tenant_code = serializers.CharField(source='vendor_relationship.client_tenant.circle_code', read_only=True)
    
    team_name = serializers.CharField(source='internal_team.name', read_only=True)
    team_type = serializers.CharField(source='internal_team.team_type', read_only=True)
    
    # User information
    allocated_by_name = serializers.CharField(source='allocated_by.get_full_name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    
    # Sub-activity allocations
    sub_activity_allocations = SubActivityAllocationSerializer(many=True, read_only=True)
    
    # Site groups information
    site_groups = serializers.SerializerMethodField()
    
    # Computed fields
    allocated_to_name = serializers.CharField(read_only=True)
    allocated_sub_activities_count = serializers.IntegerField(read_only=True)
    completed_sub_activities_count = serializers.IntegerField(read_only=True)
    can_be_started = serializers.BooleanField(read_only=True)
    can_be_completed = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = TaskAllocation
        fields = [
            'id', 'task', 'task_id', 'task_name', 'project_name',
            'allocation_type', 'status', 'priority', 'allocation_reference',
            'vendor_relationship', 'vendor_name', 'vendor_code', 'vendor_contact',
            'client_tenant_name', 'client_tenant_code',
            'internal_team', 'team_name', 'team_type',
            'progress_percentage',
            'allocation_notes', 'completion_notes',
            'allocated_by', 'allocated_by_name', 'updated_by', 'updated_by_name',
            'allocated_at', 'accepted_at', 'started_at', 'completed_at', 'cancelled_at',
            'created_at', 'updated_at', 'metadata',
            'allocated_to_name', 'allocated_sub_activities_count', 'completed_sub_activities_count',
            'can_be_started', 'can_be_completed', 'sub_activity_allocations', 'site_groups'
        ]
        read_only_fields = [
            'id', 'allocated_at', 'accepted_at', 'started_at', 'completed_at', 
            'cancelled_at', 'created_at', 'updated_at'
        ]
    
    def get_site_groups(self, obj):
        """Get site groups information from the related task"""
        if not obj.task or not hasattr(obj.task, 'site_groups'):
            return []
        
        site_groups = obj.task.site_groups.select_related('site').all()
        return [
            {
                'id': str(site_group.id),
                'site': str(site_group.site.id),
                'site_alias': site_group.site_alias,
                'assignment_order': site_group.assignment_order,
                'site_name': site_group.site.site_name,
                'site_global_id': site_group.site.global_id,
                'site_business_id': site_group.site.site_id,
            }
            for site_group in site_groups
        ]


class TaskAllocationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new task allocations"""
    
    sub_activity_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        min_length=1,
        help_text="List of sub-activity IDs to allocate (minimum 1 required)"
    )
    
    class Meta:
        model = TaskAllocation
        fields = [
            'task', 'allocation_type', 'vendor_relationship', 'internal_team',
            'priority', 'allocation_reference', 'allocation_notes',
            'sub_activity_ids'
        ]
    
    def validate(self, data):
        """Comprehensive validation for allocation creation"""
        task = data.get('task')
        allocation_type = data.get('allocation_type')
        vendor_relationship = data.get('vendor_relationship')
        internal_team = data.get('internal_team')
        sub_activity_ids = data.get('sub_activity_ids', [])
        
        # Validate allocation type and target consistency
        if allocation_type == 'vendor':
            if not vendor_relationship:
                raise serializers.ValidationError({
                    'vendor_relationship': 'Vendor relationship is required for vendor allocation'
                })
            if internal_team:
                raise serializers.ValidationError({
                    'internal_team': 'Internal team must be null for vendor allocation'
                })
        
        elif allocation_type == 'internal_team':
            if not internal_team:
                raise serializers.ValidationError({
                    'internal_team': 'Internal team is required for internal team allocation'
                })
            if vendor_relationship:
                raise serializers.ValidationError({
                    'vendor_relationship': 'Vendor relationship must be null for internal team allocation'
                })
        
        # Validate sub-activities
        if task and sub_activity_ids:
            # Check if sub-activities belong to the task
            task_sub_activities = set(
                str(sa.id) for sa in task.sub_activities.all()
            )
            provided_sub_activities = set(str(sa_id) for sa_id in sub_activity_ids)
            
            if not provided_sub_activities.issubset(task_sub_activities):
                invalid_ids = provided_sub_activities - task_sub_activities
                raise serializers.ValidationError({
                    'sub_activity_ids': f'Sub-activities {list(invalid_ids)} do not belong to the specified task'
                })
            
            # Check for already allocated sub-activities
            already_allocated = SubActivityAllocation.objects.filter(
                sub_activity_id__in=sub_activity_ids,
                allocation__status__in=['allocated', 'accepted', 'in_progress']
            ).values_list('sub_activity_id', flat=True)
            
            if already_allocated:
                allocated_names = TaskSubActivity.objects.filter(
                    id__in=already_allocated
                ).values_list('activity_name', flat=True)
                
                raise serializers.ValidationError({
                    'sub_activity_ids': f'Sub-activities {list(allocated_names)} are already allocated to active allocations'
                })
        

        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        """Create task allocation with sub-activity allocations"""
        sub_activity_ids = validated_data.pop('sub_activity_ids')
        request = self.context.get('request')
        user = request.user if request else None
        
        # Set user tracking
        validated_data['allocated_by'] = user
        validated_data['updated_by'] = user
        
        # Create the main allocation
        allocation = TaskAllocation.objects.create(**validated_data)
        
        # Create sub-activity allocations
        sub_activity_allocations = []
        for sub_activity_id in sub_activity_ids:
            sub_allocation = SubActivityAllocation.objects.create(
                allocation=allocation,
                sub_activity_id=sub_activity_id,
                status='allocated'
            )
            sub_activity_allocations.append(sub_allocation)
        
        # Update allocation status
        allocation.status = TaskAllocationStatus.ALLOCATED
        allocation.save()
        
        # Create timeline event
        allocation.create_timeline_event('allocation_created', user, {
            'sub_activities_count': len(sub_activity_ids),
            'sub_activity_names': [
                sa.sub_activity.activity_name for sa in sub_activity_allocations
            ]
        })
        
        # Create history record
        AllocationHistory.objects.create(
            allocation=allocation,
            action='created',
            changed_by=user,
            change_reason='Task allocation created',
            metadata={
                'sub_activities_allocated': len(sub_activity_ids),
                'allocation_type': allocation.allocation_type,
                'allocated_to': allocation.allocated_to_name
            }
        )
        
        return allocation


class TaskAllocationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating task allocations"""
    
    class Meta:
        model = TaskAllocation
        fields = [
            'priority', 'allocation_notes'
        ]
    

    
    def update(self, instance, validated_data):
        """Update allocation and track changes"""
        request = self.context.get('request')
        user = request.user if request else None
        
        # Track what changed
        changes = {}
        for field, new_value in validated_data.items():
            old_value = getattr(instance, field)
            if old_value != new_value:
                changes[field] = {'old': old_value, 'new': new_value}
        
        # Update the instance
        updated_instance = super().update(instance, validated_data)
        updated_instance.updated_by = user
        updated_instance.save()
        
        # Create history record if there were changes
        if changes:
            AllocationHistory.objects.create(
                allocation=updated_instance,
                action='updated',
                changed_by=user,
                change_reason='Allocation details updated',
                metadata={'changes': changes}
            )
        
        return updated_instance


class AllocationActionSerializer(serializers.Serializer):
    """Serializer for allocation actions (start, complete, cancel)"""
    
    action = serializers.ChoiceField(
        choices=['start', 'complete', 'cancel', 'accept', 'reject', 'deallocate', 'assign', 'mark_in_progress', 'mark_done', 'mark_in_issue'],
        required=True
    )
    notes = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text="Optional notes for the action"
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Reason for cancellation or rejection"
    )
    
    def validate(self, data):
        """Validate action data"""
        action = data.get('action')
        
        if action in ['cancel', 'reject', 'deallocate'] and not data.get('reason'):
            raise serializers.ValidationError({
                'reason': f'Reason is required for {action} action'
            })
        
        return data


class SubActivityActionSerializer(serializers.Serializer):
    """Serializer for sub-activity actions"""
    
    action = serializers.ChoiceField(
        choices=['start', 'complete', 'update_progress'],
        required=True
    )
    progress_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=0,
        max_value=100,
        required=False
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True
    )
    
    def validate(self, data):
        """Validate sub-activity action data"""
        action = data.get('action')
        progress = data.get('progress_percentage')
        
        if action == 'update_progress' and progress is None:
            raise serializers.ValidationError({
                'progress_percentage': 'Progress percentage is required for update_progress action'
            })
        
        return data


class AllocationHistorySerializer(serializers.ModelSerializer):
    """Serializer for AllocationHistory"""
    
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)
    
    class Meta:
        model = AllocationHistory
        fields = [
            'id', 'allocation', 'action', 'previous_status', 'new_status',
            'changed_by', 'changed_by_name', 'change_reason', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TaskAllocationSummarySerializer(serializers.Serializer):
    """Serializer for task allocation summary"""
    
    task_id = serializers.CharField()
    task_name = serializers.CharField()
    allocation_status = serializers.CharField()
    total_sub_activities = serializers.IntegerField()
    allocated_sub_activities = serializers.IntegerField()
    unallocated_sub_activities = serializers.IntegerField()
    vendor_allocations = serializers.IntegerField()
    internal_allocations = serializers.IntegerField()
    is_mixed = serializers.BooleanField()
    is_fully_allocated = serializers.BooleanField()
    is_partially_allocated = serializers.BooleanField()
    allocations = TaskAllocationSerializer(many=True)
    
    def to_representation(self, instance):
        """Custom representation for task allocation summary"""
        if isinstance(instance, dict):
            return instance
        
        # If instance is a TaskFromFlow object
        summary = TaskAllocation.objects.get_task_allocation_summary(instance)
        allocations = TaskAllocation.objects.filter(
            task=instance,
            status__in=['allocated', 'accepted', 'in_progress', 'completed']
        )
        
        return {
            'task_id': instance.task_id,
            'task_name': instance.task_name,
            'allocation_status': getattr(instance, 'allocation_status', 'unallocated'),
            'total_sub_activities': summary['total_sub_activities'],
            'allocated_sub_activities': summary['allocated_sub_activities'],
            'unallocated_sub_activities': summary['unallocated_sub_activities'],
            'vendor_allocations': summary['vendor_allocations'],
            'internal_allocations': summary['internal_allocations'],
            'is_mixed': summary['is_mixed'],
            'is_fully_allocated': summary['is_fully_allocated'],
            'is_partially_allocated': summary['is_partially_allocated'],
            'allocations': TaskAllocationSerializer(allocations, many=True).data
        }


class BulkAllocationSerializer(serializers.Serializer):
    """Serializer for bulk allocation operations"""
    
    allocations = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        help_text="List of allocation data"
    )
    
    def validate_allocations(self, value):
        """Validate bulk allocation data"""
        validated_allocations = []
        
        for i, allocation_data in enumerate(value):
            try:
                # Validate each allocation using the create serializer
                serializer = TaskAllocationCreateSerializer(data=allocation_data)
                if serializer.is_valid():
                    validated_allocations.append(serializer.validated_data)
                else:
                    raise serializers.ValidationError(
                        f"Allocation {i+1}: {serializer.errors}"
                    )
            except Exception as e:
                raise serializers.ValidationError(
                    f"Allocation {i+1}: {str(e)}"
                )
        
        return validated_allocations
    
    @transaction.atomic
    def create(self, validated_data):
        """Create multiple allocations"""
        allocations_data = validated_data['allocations']
        created_allocations = []
        
        for allocation_data in allocations_data:
            serializer = TaskAllocationCreateSerializer(
                data=allocation_data,
                context=self.context
            )
            if serializer.is_valid():
                allocation = serializer.save()
                created_allocations.append(allocation)
            else:
                raise serializers.ValidationError(
                    f"Failed to create allocation: {serializer.errors}"
                )
        
        return created_allocations


class ReallocationSerializer(serializers.Serializer):
    """Serializer for reallocating tasks from one vendor/team to another"""
    
    # Current allocation to deallocate
    current_allocation_id = serializers.UUIDField(required=True)
    
    # New allocation details
    new_allocation_type = serializers.ChoiceField(
        choices=[('vendor', 'Vendor'), ('internal_team', 'Internal Team')],
        required=True
    )
    new_vendor_relationship = serializers.UUIDField(required=False, allow_null=True)
    new_internal_team = serializers.UUIDField(required=False, allow_null=True)
    
    # Reallocation metadata
    reallocation_reason = serializers.CharField(
        required=True,
        help_text="Reason for reallocation"
    )
    priority = serializers.ChoiceField(
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('urgent', 'Urgent')],
        default='medium'
    )
    allocation_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate reallocation data"""
        allocation_type = data.get('new_allocation_type')
        vendor_relationship = data.get('new_vendor_relationship')
        internal_team = data.get('new_internal_team')
        
        # Validate allocation target based on type
        if allocation_type == 'vendor':
            if not vendor_relationship:
                raise serializers.ValidationError({
                    'new_vendor_relationship': 'Vendor relationship is required for vendor allocations'
                })
            if internal_team:
                raise serializers.ValidationError({
                    'new_internal_team': 'Cannot specify internal team for vendor allocation'
                })
        elif allocation_type == 'internal_team':
            if not internal_team:
                raise serializers.ValidationError({
                    'new_internal_team': 'Internal team is required for internal team allocations'
                })
            if vendor_relationship:
                raise serializers.ValidationError({
                    'new_vendor_relationship': 'Cannot specify vendor relationship for internal team allocation'
                })
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        """Handle reallocation process"""
        from .models import TaskAllocation
        
        current_allocation_id = validated_data['current_allocation_id']
        
        try:
            # Get current allocation
            current_allocation = TaskAllocation.objects.get(id=current_allocation_id)
        except TaskAllocation.DoesNotExist:
            raise serializers.ValidationError({
                'current_allocation_id': 'Current allocation not found'
            })
        
        # Mark current allocation as deallocated
        current_allocation.status = TaskAllocationStatus.DEALLOCATED
        current_allocation.save()
        
        # Create history entry for deallocation
        AllocationHistory.objects.create(
            allocation=current_allocation,
            action='deallocated',
            previous_status=current_allocation.status,
            new_status=TaskAllocationStatus.DEALLOCATED,
            changed_by=self.context['request'].user,
            change_reason=validated_data['reallocation_reason']
        )
        
        # Create new allocation
        new_allocation_data = {
            'task': current_allocation.task,
            'allocation_type': validated_data['new_allocation_type'],
            'status': TaskAllocationStatus.ALLOCATED,
            'priority': validated_data.get('priority', 'medium'),
            'allocation_notes': validated_data.get('allocation_notes', ''),
            'allocated_by': self.context['request'].user,
            'updated_by': self.context['request'].user,
        }
        
        # Set allocation target
        if validated_data['new_allocation_type'] == 'vendor':
            new_allocation_data['vendor_relationship_id'] = validated_data['new_vendor_relationship']
        else:
            new_allocation_data['internal_team_id'] = validated_data['new_internal_team']
        
        new_allocation = TaskAllocation.objects.create(**new_allocation_data)
        
        # Copy sub-activity allocations to new allocation
        for sub_allocation in current_allocation.sub_activity_allocations.all():
            SubActivityAllocation.objects.create(
                allocation=new_allocation,
                sub_activity=sub_allocation.sub_activity,
                status=TaskAllocationStatus.ALLOCATED,
                notes=f"Reallocated from previous allocation: {current_allocation.id}"
            )
        
        # Create history entry for new allocation
        AllocationHistory.objects.create(
            allocation=new_allocation,
            action='created',
            new_status=TaskAllocationStatus.ALLOCATED,
            changed_by=self.context['request'].user,
            change_reason=f"Reallocated from allocation {current_allocation.id}: {validated_data['reallocation_reason']}"
        )
        
        return {
            'previous_allocation': current_allocation,
            'new_allocation': new_allocation,
            'reallocation_reason': validated_data['reallocation_reason']
        }
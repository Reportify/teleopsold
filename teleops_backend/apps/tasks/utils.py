import re
from typing import Optional, Tuple
from django.db import models

# Avoid circular imports by importing models inside functions


class TaskIDGenerator:
    """Handles task ID generation with client ID support"""
    
    @staticmethod
    def generate_task_id(
        flow_template,
        project,
        client_id: Optional[str] = None,
        prefix: Optional[str] = None,
        start_number: Optional[int] = None,
        tenant=None
    ) -> str:
        """
        Generate task ID based on client preference or auto-generation
        
        Args:
            flow_template: The flow template being used
            project: The project for the task
            client_id: Optional client-provided ID
            prefix: Optional prefix for auto-generated IDs
            start_number: Optional starting number for auto-generated IDs
            tenant: Tenant context for uniqueness checks
            
        Returns:
            Generated task ID string
        """
        if client_id:
            # Use client-provided ID
            return client_id
        else:
            # Auto-generate ID
            return TaskIDGenerator._generate_auto_id(
                flow_template, project, prefix, start_number, tenant
            )
    
    @staticmethod
    def _generate_auto_id(
        flow_template,
        project,
        prefix: Optional[str] = None,
        start_number: Optional[int] = None,
        tenant=None
    ) -> str:
        """
        Auto-generate task ID based on project and flow template context
        """
        # Import models to avoid circular imports
        from .models import TaskFromFlow
        
        # Get the last task number for this project and flow template
        last_task = TaskFromFlow.objects.filter(
            project=project,
            flow_template=flow_template,
            is_client_id_provided=False
        )
        
        if tenant:
            last_task = last_task.filter(tenant=tenant)
        
        last_task = last_task.order_by('-created_at').first()
        
        if last_task and last_task.task_id:
            # Extract number from last task ID
            try:
                # Try to extract number from the end of the task ID
                number_match = re.search(r'(\d+)$', last_task.task_id)
                if number_match:
                    last_number = int(number_match.group(1))
                    next_number = last_number + 1
                else:
                    next_number = start_number or 1
            except (ValueError, AttributeError):
                next_number = start_number or 1
        else:
            next_number = start_number or 1
        
        # Generate ID with prefix
        if prefix:
            return f"{prefix}{next_number}"
        else:
            # Use flow template category as prefix
            category_prefix = flow_template.category[:3].upper()
            return f"{category_prefix}{next_number}"
    
    @staticmethod
    def validate_client_id(client_id: str, tenant) -> Tuple[bool, Optional[str]]:
        """
        Validate client-provided task ID
        
        Args:
            client_id: The client-provided task ID
            tenant: Tenant context for uniqueness checks
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Import models to avoid circular imports
        from .models import TaskFromFlow
        
        if not client_id:
            return True, None
        
        # Check if ID already exists
        existing_task = TaskFromFlow.objects.filter(
            tenant=tenant,
            client_task_id=client_id
        ).first()
        
        if existing_task:
            return False, f"Task ID '{client_id}' already exists"
        
        # Check format validation
        if len(client_id) > 100:
            return False, "Task ID too long (max 100 characters)"
        
        if not client_id.strip():
            return False, "Task ID cannot be empty or whitespace"
        
        # Optional: Add more format validation rules here
        # For example, check for invalid characters, length, etc.
        
        return True, None
    
    @staticmethod
    def generate_unique_task_id(
        flow_template,
        project,
        tenant,
        prefix: Optional[str] = None,
        start_number: Optional[int] = None,
        max_attempts: int = 100
    ) -> str:
        """
        Generate a unique task ID with collision detection
        
        Args:
            flow_template: The flow template being used
            project: The project for the task
            tenant: Tenant context
            prefix: Optional prefix for auto-generated IDs
            start_number: Optional starting number
            max_attempts: Maximum attempts to find a unique ID
            
        Returns:
            Unique task ID string
        """
        # Import models to avoid circular imports
        from .models import TaskFromFlow
        
        for attempt in range(max_attempts):
            # Generate candidate ID
            candidate_id = TaskIDGenerator._generate_auto_id(
                flow_template, project, prefix, start_number, tenant
            )
            
            # Check if it's unique
            if not TaskFromFlow.objects.filter(
                tenant=tenant,
                task_id=candidate_id
            ).exists():
                return candidate_id
            
            # If not unique, increment the start number for next attempt
            if start_number is not None:
                start_number += 1
        
        # If we can't find a unique ID after max attempts, raise an error
        raise ValueError(f"Could not generate unique task ID after {max_attempts} attempts")


class TaskCreationValidator:
    """Validates task creation requests"""
    
    @staticmethod
    def validate_site_groups(site_groups: list, flow_template) -> Tuple[bool, Optional[str]]:
        """
        Validate that site groups match flow template requirements
        
        Args:
            site_groups: List of site group configurations
            flow_template: The flow template being used
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not site_groups:
            return False, "At least one site group must be provided"
        
        # Get required site aliases from flow template
        required_aliases = set(
            flow_template.sites.values_list('alias', flat=True)
        )
        
        for i, site_group in enumerate(site_groups):
            if 'sites' not in site_group:
                return False, f"Site group {i+1} missing 'sites' field"
            
            sites = site_group['sites']
            if not sites:
                return False, f"Site group {i+1} has no sites"
            
            # Check if all required aliases are present
            group_aliases = set(sites.keys())
            if not required_aliases.issubset(group_aliases):
                missing = required_aliases - group_aliases
                return False, f"Site group {i+1} missing required aliases: {missing}"
            
            # Check if all site IDs are valid
            for alias, site_id in sites.items():
                if not site_id or not str(site_id).strip():
                    return False, f"Site group {i+1}, alias '{alias}' has invalid site ID"
        
        return True, None
    
    @staticmethod
    def validate_flow_template(flow_template, project) -> Tuple[bool, Optional[str]]:
        """
        Validate that flow template can be used with the given project
        
        Args:
            flow_template: The flow template to validate
            project: The project to validate against
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not flow_template.is_active:
            return False, "Flow template is not active"
        
        if not flow_template.activities.exists():
            return False, "Flow template has no activities"
        
        # Add more validation rules as needed
        # For example, check if project type matches flow template category
        
        return True, None

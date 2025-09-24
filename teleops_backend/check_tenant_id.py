#!/usr/bin/env python
"""
Script to check tenant ID for the task allocation
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tasks.models import TaskAllocation

def main():
    print("=== Checking Task Allocation Tenant ID ===")
    
    # Get the task allocation
    allocation = TaskAllocation.objects.first()
    if allocation:
        print(f"Allocation ID: {allocation.id}")
        print(f"Task: {allocation.task}")
        print(f"Task ID: {allocation.task.id}")
        
        # Check tenant
        if hasattr(allocation.task, 'tenant'):
            print(f"Task Tenant ID: {allocation.task.tenant.id}")
            print(f"Task Tenant Name: {allocation.task.tenant.organization_name}")
        else:
            print("Task has no tenant attribute")
            
        # Check what fields the task has
        print(f"Task fields: {[field.name for field in allocation.task._meta.fields]}")
        
        # Check if it's a TaskFromFlow
        print(f"Task type: {type(allocation.task)}")
        
    else:
        print("No task allocations found")

if __name__ == "__main__":
    main()
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'teleops_backend.settings')
django.setup()

from apps.tasks.models import TaskFromFlow

print("Checking TaskFromFlow records...")
print(f"Total TaskFromFlow count: {TaskFromFlow.objects.count()}")

print("\nFirst 10 TaskFromFlow records:")
for task in TaskFromFlow.objects.all()[:10]:
    print(f"ID: {task.id}, Task ID: {task.task_id}, Name: {task.task_name}")

# Check for the specific task ID from the error
specific_task_id = "d56b7425-ba78-4ea0-8abc-abf4f194ed1e"
print(f"\nChecking for specific task ID: {specific_task_id}")
task_exists = TaskFromFlow.objects.filter(id=specific_task_id).exists()
print(f"Task with ID {specific_task_id} exists: {task_exists}")

if not task_exists:
    print("\nThis task ID does not exist in TaskFromFlow table.")
    print("The IntegrityError is because TaskAllocation is trying to reference a non-existent task.")
else:
    task = TaskFromFlow.objects.get(id=specific_task_id)
    print(f"Found task: {task.task_id} - {task.task_name}")
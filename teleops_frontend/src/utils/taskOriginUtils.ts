// Task Origin Utility Functions
import { TaskFromFlow } from '../types/task';

export interface TaskOrigin {
  type: 'client_allocated' | 'self_created';
  label: string;
  color: 'info' | 'success';
  iconType: 'Business' | 'AccountTree';
  description: string;
}

/**
 * Determines the origin of a task based on allocation data and creation context
 * @param task - The task to analyze
 * @param allocations - Optional allocation data (if available)
 * @returns TaskOrigin object with type, label, color, icon, and description
 */
export const getTaskOrigin = (task: TaskFromFlow, allocations?: any[]): TaskOrigin => {
  if (!task) {
    return {
      type: 'self_created',
      label: 'Self Created',
      color: 'success',
      iconType: 'AccountTree',
      description: 'Created internally'
    };
  }
  
  // Check if task is marked as vendor-allocated (from task allocation endpoint)
  if (task.is_vendor_allocated) {
    return {
      type: 'client_allocated',
      label: 'Client Allocated',
      color: 'info',
      iconType: 'Business',
      description: 'Allocated by client to vendor'
    };
  }
  
  // Check if task has actual allocations from external clients/vendors
  const hasClientAllocation = allocations?.some(allocation => 
    allocation.allocation_type === 'vendor' && 
    allocation.vendor_relationship
  );
  
  // For now, prioritize allocation data over client task ID presence
  // A task is considered client-allocated only if it has actual vendor allocations
  // Having a client_task_id alone doesn't necessarily mean it was client-allocated
  if (hasClientAllocation) {
    return {
      type: 'client_allocated',
      label: 'Client Allocated',
      color: 'info',
      iconType: 'Business',
      description: 'Allocated to external vendor'
    };
  }
  
  // All other tasks are considered self-created (internal)
  return {
    type: 'self_created',
    label: 'Self Created',
    color: 'success',
    iconType: 'AccountTree',
    description: task.client_task_id ? `Internal task (ID: ${task.client_task_id})` : 'Created internally'
  };
};

/**
 * Gets the available task origin filter options
 * @returns Array of filter options for task origin
 */
export const getTaskOriginFilterOptions = () => [
  { value: 'all', label: 'All Origins' },
  { value: 'client_allocated', label: 'Client Allocated' },
  { value: 'self_created', label: 'Self Created' }
];
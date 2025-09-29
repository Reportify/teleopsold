import { Task, Vendor, AllocationStatus } from "../types/task";
import { API_ENDPOINTS } from "./api";
import api from "./api";

export interface TaskAllocationRequest {
  task: string; // Task ID
  allocation_type: "vendor" | "internal_team";
  vendor_relationship?: number; // ClientVendorRelationship ID
  internal_team?: number; // Team ID
  sub_activity_ids: string[]; // Array of sub-activity IDs
  allocation_notes?: string;
  estimated_duration_hours?: number;
}

export interface TaskAllocation {
  id: string;
  task: string;
  task_id: string;
  task_name: string;
  project_name: string;
  allocation_type: "vendor" | "internal_team";
  status: AllocationStatus;
  vendor_relationship?: number;
  internal_team?: number;
  vendor_name?: string;
  vendor_code?: string;
  vendor_contact_person?: string;
  client_tenant_name?: string;
  client_tenant_code?: string;
  team_name?: string;
  team_type?: string;
  allocated_sub_activities: string[];
  sub_activity_allocations: SubActivityAllocation[];
  allocation_notes?: string;
  estimated_duration_hours?: number;
  actual_duration_hours?: number;
  allocated_at: string;
  started_at?: string;
  completed_at?: string;
  allocated_by: number;
  allocated_by_name: string;
  updated_by: number;
  updated_by_name: string;
  allocated_to_name: string;
  total_sub_activities: number;
  completed_sub_activities: number;
  created_at: string;
  updated_at: string;
}

export interface SubActivityAllocation {
  id: string;
  allocation: string;
  sub_activity: string;
  sub_activity_name: string;
  sub_activity_type: string;
  status: AllocationStatus;
  progress_percentage: number;
  estimated_duration_hours?: number;
  actual_duration_hours?: number;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TaskAllocationHistory {
  id: string;
  allocation: string;
  action: "created" | "updated" | "status_changed" | "deallocated" | "cancelled" | "completed";
  previous_status?: string;
  new_status?: string;
  changed_by: number;
  changed_by_name: string;
  change_reason?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface TaskTimelineEvent {
  id: string;
  task: string;
  event_type: "created" | "allocated" | "assigned" | "work_started" | "work_completed" | "cancelled" | "deallocated" | "status_changed" | "progress_updated" | "comment_added" | "equipment_verified";
  event_data: Record<string, any>;
  timestamp: string;
  user: number;
  user_name: string;
  event_description: string;
}

class TaskAllocationService {
  /**
   * Create a new task allocation
   */
  async createTaskAllocation(allocationData: TaskAllocationRequest): Promise<TaskAllocation> {
    try {
      const response = await api.post(API_ENDPOINTS.TASKS.ALLOCATIONS.CREATE, allocationData);
      return response.data;
    } catch (error) {
      console.error("Error creating task allocation:", error);
      throw error;
    }
  }

  /**
   * Get task allocations with optional filters
   */
  async getTaskAllocations(filters?: { task_id?: string; allocation_type?: "vendor" | "internal_team"; status?: string; vendor_id?: number; project_id?: number }): Promise<TaskAllocation[]> {
    try {
      const params = new URLSearchParams();

      if (filters?.task_id) params.append("task_id", filters.task_id);
      if (filters?.allocation_type) params.append("allocation_type", filters.allocation_type);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.vendor_id) params.append("vendor_id", filters.vendor_id.toString());
      if (filters?.project_id) params.append("project_id", filters.project_id.toString());

      const url = `${API_ENDPOINTS.TASKS.ALLOCATIONS.LIST}${params.toString() ? "?" + params.toString() : ""}`;
      const response = await api.get(url);
      return response.data.results || response.data;
    } catch (error) {
      console.error("Error fetching task allocations:", error);
      throw error;
    }
  }

  /**
   * Get a specific task allocation by ID
   */
  async getTaskAllocation(allocationId: string): Promise<TaskAllocation> {
    try {
      const response = await api.get(API_ENDPOINTS.TASKS.ALLOCATIONS.DETAIL(allocationId));
      return response.data;
    } catch (error) {
      console.error("Error fetching task allocation:", error);
      throw error;
    }
  }

  /**
   * Get task timeline events
   */
  async getTaskTimeline(taskId: string): Promise<TaskTimelineEvent[]> {
    try {
      const response = await api.get(API_ENDPOINTS.TASKS.TIMELINE.BY_TASK(taskId));
      return response.data;
    } catch (error) {
      console.error("Error fetching task timeline:", error);
      throw error;
    }
  }
}

export default new TaskAllocationService();

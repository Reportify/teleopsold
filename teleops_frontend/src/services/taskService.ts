// Task Management Service - Real API implementation
import { Task, TaskFromFlow, TaskFilters, CreateTaskRequest, AssignSubActivityRequest, UpdateProgressRequest, TaskStatistics, TeamWorkload, VendorPerformance } from "../types/task";
import { API_ENDPOINTS, apiHelpers } from "./api";

class TaskService {
  // Get all tasks with optional filtering
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    try {
      const params: any = {};

      if (filters?.search) {
        params.search = filters.search;
      }

      if (filters?.status && filters.status !== "all") {
        params.status = filters.status;
      }

      if (filters?.task_type && filters.task_type !== "all") {
        params.task_type = filters.task_type;
      }

      if (filters?.project_id) {
        params.project = filters.project_id;
      }

      const response = await apiHelpers.get<Task[]>(API_ENDPOINTS.TASKS.LIST, { params });

      // Handle case where response might be wrapped in a 'results' field
      if (response && typeof response === "object" && "results" in response) {
        return (response as any).results || [];
      }

      // Handle case where response is an array
      if (Array.isArray(response)) {
        return response;
      }

      // Handle case where response is unexpected
      console.warn("Unexpected response format:", response);
      return [];
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }
  }

  // Get single task by ID
  async getTaskById(id: number): Promise<Task | null> {
    try {
      const response = await apiHelpers.get<Task>(API_ENDPOINTS.TASKS.DETAIL(String(id)));
      return response;
    } catch (error) {
      console.error(`Error fetching task ${id}:`, error);
      return null;
    }
  }

  // Create new task
  async createTask(taskData: CreateTaskRequest): Promise<Task | null> {
    try {
      const response = await apiHelpers.post<Task>(API_ENDPOINTS.TASKS.CREATE, taskData);
      return response;
    } catch (error) {
      console.error("Error creating task:", error);
      return null;
    }
  }

  // Update task
  async updateTask(id: number, updates: Partial<Task>): Promise<Task | null> {
    try {
      const response = await apiHelpers.put<Task>(API_ENDPOINTS.TASKS.UPDATE(String(id)), updates);
      return response;
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      return null;
    }
  }

  // Delete task
  async deleteTask(id: number): Promise<boolean> {
    try {
      await apiHelpers.delete(API_ENDPOINTS.TASKS.DELETE(String(id)));
      return true;
    } catch (error) {
      console.error(`Error deleting task ${id}:`, error);
      return false;
    }
  }

  // Assign sub-activity
  async assignSubActivity(taskId: number, subActivityId: number, assignment: AssignSubActivityRequest): Promise<Task | null> {
    try {
      const response = await apiHelpers.post<Task>(`${API_ENDPOINTS.TASKS.DETAIL(String(taskId))}/assign-sub-activity/`, {
        sub_activity_id: subActivityId,
        ...assignment,
      });
      return response;
    } catch (error) {
      console.error(`Error assigning sub-activity ${subActivityId} to task ${taskId}:`, error);
      return null;
    }
  }

  // Update sub-activity progress
  async updateSubActivityProgress(taskId: number, subActivityId: number, progress: UpdateProgressRequest): Promise<Task | null> {
    try {
      const response = await apiHelpers.post<Task>(`${API_ENDPOINTS.TASKS.DETAIL(String(taskId))}/update-progress/`, {
        sub_activity_id: subActivityId,
        ...progress,
      });
      return response;
    } catch (error) {
      console.error(`Error updating progress for sub-activity ${subActivityId} in task ${taskId}:`, error);
      return null;
    }
  }

  // Get task statistics
  async getTaskStatistics(): Promise<TaskStatistics | null> {
    try {
      const response = await apiHelpers.get<TaskStatistics>(`${API_ENDPOINTS.TASKS.LIST}statistics/`);
      return response;
    } catch (error) {
      console.error("Error fetching task statistics:", error);
      return null;
    }
  }

  // Get team workload
  async getTeamWorkload(): Promise<TeamWorkload[]> {
    try {
      const response = await apiHelpers.get<TeamWorkload[]>(`${API_ENDPOINTS.TEAMS.LIST}workload/`);
      return response;
    } catch (error) {
      console.error("Error fetching team workload:", error);
      return [];
    }
  }

  // Get vendor performance
  async getVendorPerformance(): Promise<VendorPerformance[]> {
    try {
      const response = await apiHelpers.get<VendorPerformance[]>(`${API_ENDPOINTS.TEAMS.LIST}vendor-performance/`);
      return response;
    } catch (error) {
      console.error("Error fetching vendor performance:", error);
      return [];
    }
  }

  // Get available vendors
  async getVendors() {
    try {
      const response = await apiHelpers.get(`${API_ENDPOINTS.TEAMS.LIST}vendors/`);
      return response;
    } catch (error) {
      console.error("Error fetching vendors:", error);
      return [];
    }
  }

  // Get available teams
  async getTeams() {
    try {
      const response = await apiHelpers.get(`${API_ENDPOINTS.TEAMS.LIST}`);
      return response;
    } catch (error) {
      console.error("Error fetching teams:", error);
      return [];
    }
  }

  // Get teams for specific vendor
  async getVendorTeams(vendorId: number) {
    try {
      const response = await apiHelpers.get(`${API_ENDPOINTS.TEAMS.LIST}?vendor_id=${vendorId}`);
      return response;
    } catch (error) {
      console.error(`Error fetching teams for vendor ${vendorId}:`, error);
      return [];
    }
  }

  // Get internal teams
  async getInternalTeams() {
    try {
      const response = await apiHelpers.get(`${API_ENDPOINTS.TEAMS.LIST}?internal=true`);
      return response;
    } catch (error) {
      console.error("Error fetching internal teams:", error);
      return [];
    }
  }

  // Update task status
  async updateTaskStatus(taskId: string, status: string): Promise<TaskFromFlow | null> {
    try {
      const response = await apiHelpers.patch<TaskFromFlow>(`${API_ENDPOINTS.TASKS.FROM_FLOW.LIST}${taskId}/`, {
        status,
      });
      return response;
    } catch (error) {
      console.error(`Error updating task ${taskId} status to ${status}:`, error);
      return null;
    }
  }

  // Update sub-activity progress for TaskFromFlow
  async updateTaskFromFlowSubActivityProgress(taskId: string, subActivityId: string, progress: number, notes?: string): Promise<TaskFromFlow | null> {
    try {
      const response = await apiHelpers.patch<TaskFromFlow>(`${API_ENDPOINTS.TASKS.FROM_FLOW.LIST}${taskId}/sub-activities/${subActivityId}/`, {
        progress_percentage: progress,
        notes: notes || "",
      });
      return response;
    } catch (error) {
      console.error(`Error updating sub-activity ${subActivityId} progress:`, error);
      return null;
    }
  }

  // Get single task from flow by ID
  async getTaskFromFlowById(id: string): Promise<TaskFromFlow | null> {
    try {
      const response = await apiHelpers.get<TaskFromFlow>(`${API_ENDPOINTS.TASKS.FROM_FLOW.LIST}${id}/`);
      return response;
    } catch (error) {
      console.error(`Error fetching task from flow ${id}:`, error);
      return null;
    }
  }

  // Get tasks from flow templates with pagination
  async getTasksFromFlow(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      project?: number;
      flow_template?: string;
      status?: string;
      search?: string;
      priority?: string;
      created_after?: string;
      created_before?: string;
    }
  ): Promise<{
    results: TaskFromFlow[];
    count: number;
    next: string | null;
    previous: string | null;
    current_page: number;
    page_size: number;
    total_pages: number;
  }> {
    try {
      const params: any = {
        page,
        page_size: pageSize,
      };

      if (filters?.project) {
        params.project = filters.project;
      }

      if (filters?.flow_template) {
        params.flow_template = filters.flow_template;
      }

      if (filters?.status && filters.status !== "all") {
        params.status = filters.status;
      }

      if (filters?.search) {
        params.search = filters.search;
      }

      if (filters?.priority && filters.priority !== "all") {
        params.priority = filters.priority;
      }

      if (filters?.created_after) {
        params.created_after = filters.created_after;
      }

      if (filters?.created_before) {
        params.created_before = filters.created_before;
      }

      const response = await apiHelpers.get<any>(API_ENDPOINTS.TASKS.FROM_FLOW.LIST, { params });

      // Handle paginated response
      if (response && typeof response === "object") {
        return {
          results: response.results || [],
          count: response.count || 0,
          next: response.next || null,
          previous: response.previous || null,
          current_page: response.current_page || page,
          page_size: response.page_size || pageSize,
          total_pages: response.total_pages || 0,
        };
      }

      // Fallback for non-paginated response
      console.warn("Unexpected response format:", response);
      return {
        results: Array.isArray(response) ? response : [],
        count: Array.isArray(response) ? response.length : 0,
        next: null,
        previous: null,
        current_page: page,
        page_size: pageSize,
        total_pages: 1,
      };
    } catch (error) {
      console.error("Error fetching tasks from flow:", error);
      return {
        results: [],
        count: 0,
        next: null,
        previous: null,
        current_page: page,
        page_size: pageSize,
        total_pages: 0,
      };
    }
  }

  // Get task allocations (for vendor users)
  async getTaskAllocations(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      task?: number;
      allocation_type?: string;
      status?: string;
      vendor_id?: number;
      project_id?: number;
      search?: string;
      priority?: string;
      created_after?: string;
      created_before?: string;
    }
  ): Promise<{
    results: any[];
    count: number;
    next: string | null;
    previous: string | null;
    current_page: number;
    page_size: number;
    total_pages: number;
  }> {
    try {
      console.log("TaskService Debug - getTaskAllocations called with:", { page, pageSize, filters });
      const params: any = {
        page,
        page_size: pageSize,
      };

      if (filters?.task) {
        params.task = filters.task;
      }

      if (filters?.allocation_type) {
        params.allocation_type = filters.allocation_type;
      }

      if (filters?.status && filters.status !== "all") {
        params.status = filters.status;
      }

      if (filters?.vendor_id) {
        params.vendor_id = filters.vendor_id;
      }

      if (filters?.project_id) {
        params.project_id = filters.project_id;
      }

      if (filters?.search) {
        params.search = filters.search;
      }

      if (filters?.priority && filters.priority !== "all") {
        params.priority = filters.priority;
      }

      if (filters?.created_after) {
        params.created_after = filters.created_after;
      }

      if (filters?.created_before) {
        params.created_before = filters.created_before;
      }

      console.log("TaskService Debug - Making API call to:", API_ENDPOINTS.TASKS.ALLOCATIONS.LIST);
      console.log("TaskService Debug - API call params:", params);
      
      const response = await apiHelpers.get<any>(API_ENDPOINTS.TASKS.ALLOCATIONS.LIST, { params });
      
      console.log("TaskService Debug - API response received:", response);
      console.log("TaskService Debug - Response type:", typeof response);
      console.log("TaskService Debug - Response results:", response?.results);
      console.log("TaskService Debug - Response count:", response?.count);

      // Handle paginated response
      if (response && typeof response === "object") {
        const result = {
          results: response.results || [],
          count: response.count || 0,
          next: response.next || null,
          previous: response.previous || null,
          current_page: response.current_page || page,
          page_size: response.page_size || pageSize,
          total_pages: response.total_pages || 0,
        };
        console.log("TaskService Debug - Returning paginated result:", result);
        return result;
      }

      // Fallback for non-paginated response
      console.warn("Unexpected response format:", response);
      return {
        results: Array.isArray(response) ? response : [],
        count: Array.isArray(response) ? response.length : 0,
        next: null,
        previous: null,
        current_page: page,
        page_size: pageSize,
        total_pages: 1,
      };
    } catch (error: any) {
      console.error("TaskService Debug - Error fetching task allocations:", error);
      console.error("TaskService Debug - Error details:", {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data
      });
      return {
        results: [],
        count: 0,
        next: null,
        previous: null,
        current_page: page,
        page_size: pageSize,
        total_pages: 0,
      };
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();
export default taskService;

// Task Management Service - Mock implementation for prototype
import { Task, TaskFilters, CreateTaskRequest, AssignSubActivityRequest, UpdateProgressRequest, TaskStatistics, TeamWorkload, VendorPerformance } from "../types/task";
import { mockTasks, mockVendors, mockTeams, getMockTaskById, createMockApiResponse, createMockApiError } from "../mockData/tasks";

class TaskService {
  // Get all tasks with optional filtering
  async getTasks(filters?: TaskFilters): Promise<Task[]> {
    let filteredTasks = [...mockTasks];

    if (filters) {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredTasks = filteredTasks.filter(
          (task) => task.task_name.toLowerCase().includes(searchLower) || task.project_name.toLowerCase().includes(searchLower) || task.client_name.toLowerCase().includes(searchLower)
        );
      }

      if (filters.status && filters.status !== "all") {
        filteredTasks = filteredTasks.filter((task) => task.status === filters.status);
      }

      if (filters.task_type && filters.task_type !== "all") {
        filteredTasks = filteredTasks.filter((task) => task.task_type === filters.task_type);
      }

      if (filters.client_id) {
        // Mock client filtering - would need client ID mapping in real implementation
        filteredTasks = filteredTasks.filter((task) => task.client_name.includes("Client"));
      }

      if (filters.project_id) {
        filteredTasks = filteredTasks.filter((task) => task.project_id === filters.project_id);
      }
    }

    return createMockApiResponse(filteredTasks, 300);
  }

  // Get single task by ID
  async getTaskById(id: number): Promise<Task> {
    const task = getMockTaskById(id);
    if (!task) {
      return createMockApiError(`Task with ID ${id} not found`);
    }
    return createMockApiResponse(task, 200);
  }

  // Create new task
  async createTask(taskData: CreateTaskRequest): Promise<Task> {
    // Simulate task creation
    const newTask: Task = {
      id: Math.max(...mockTasks.map((t) => t.id)) + 1,
      task_name: taskData.task_name,
      task_type: taskData.task_type,
      project_id: taskData.project_id,
      project_name: `Project ${taskData.project_id}`, // Mock project name
      client_name: "Mock Client", // Mock client name
      status: "CREATED",
      progress_percentage: 0,
      sites_count: taskData.site_ids.length,
      requires_coordination: taskData.site_ids.length > 1,
      estimated_duration_hours: taskData.estimated_duration_hours || 8,
      created_at: new Date().toISOString(),
      created_by: "Current User", // Mock current user
      sub_activities: taskData.sub_activities.map((sa, index) => ({
        id: index + 1,
        sub_activity_name: sa.sub_activity_name,
        activity_type: sa.activity_type,
        sequence_order: sa.sequence_order,
        assignment_type: sa.assignment_type || "VENDOR_ALLOCATION",
        status: "UNALLOCATED",
        progress_percentage: 0,
        execution_dependencies: sa.execution_dependencies || [],
        estimated_duration_hours: sa.estimated_duration_hours || 4,
        work_instructions: sa.work_instructions,
      })),
      sites: taskData.site_ids.map((siteId, index) => ({
        id: index + 1,
        site_id: siteId,
        site_name: `Site ${siteId}`,
        site_role: index === 0 ? "Primary" : "Far_End",
        sequence_order: index + 1,
        location: {
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.006 + (Math.random() - 0.5) * 0.1,
          address: `Mock Address ${siteId}`,
        },
      })),
      timeline: [
        {
          id: 1,
          event_type: "TASK_CREATED",
          event_description: "Task created",
          timestamp: new Date().toISOString(),
          updated_by: "Current User",
        },
      ],
    };

    return createMockApiResponse(newTask, 800);
  }

  // Update task
  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const task = getMockTaskById(id);
    if (!task) {
      return createMockApiError(`Task with ID ${id} not found`);
    }

    const updatedTask = { ...task, ...updates };
    return createMockApiResponse(updatedTask, 400);
  }

  // Delete task
  async deleteTask(id: number): Promise<void> {
    const task = getMockTaskById(id);
    if (!task) {
      return createMockApiError(`Task with ID ${id} not found`);
    }

    return createMockApiResponse(undefined, 300);
  }

  // Assign sub-activity
  async assignSubActivity(taskId: number, subActivityId: number, assignment: AssignSubActivityRequest): Promise<Task> {
    const task = getMockTaskById(taskId);
    if (!task) {
      return createMockApiError(`Task with ID ${taskId} not found`);
    }

    // Mock assignment logic
    const updatedTask = { ...task };
    const subActivity = updatedTask.sub_activities?.find((sa) => sa.id === subActivityId);

    if (subActivity) {
      if (assignment.assignment_type === "VENDOR_ALLOCATION" && assignment.vendor_id) {
        const vendor = mockVendors.find((v) => v.id === assignment.vendor_id);
        subActivity.allocated_vendor = vendor ? { id: vendor.id, name: vendor.name } : undefined;
        subActivity.status = "ALLOCATED";
      } else if (assignment.assignment_type === "DIRECT_ASSIGNMENT" && assignment.team_id) {
        const team = mockTeams.find((t) => t.id === assignment.team_id);
        subActivity.assigned_team = team ? { id: team.id, name: team.name } : undefined;
        subActivity.status = "ASSIGNED";
      }
      subActivity.assignment_type = assignment.assignment_type;
    }

    return createMockApiResponse(updatedTask, 500);
  }

  // Update sub-activity progress
  async updateSubActivityProgress(taskId: number, subActivityId: number, progress: UpdateProgressRequest): Promise<Task> {
    const task = getMockTaskById(taskId);
    if (!task) {
      return createMockApiError(`Task with ID ${taskId} not found`);
    }

    const updatedTask = { ...task };
    const subActivity = updatedTask.sub_activities?.find((sa) => sa.id === subActivityId);

    if (subActivity) {
      subActivity.progress_percentage = progress.progress_percentage;
      if (progress.actual_duration_hours) {
        subActivity.actual_duration_hours = progress.actual_duration_hours;
      }

      // Update status based on progress
      if (progress.progress_percentage === 100) {
        subActivity.status = "COMPLETED";
        subActivity.completion_date = new Date().toISOString();
      } else if (progress.progress_percentage > 0 && subActivity.status === "ASSIGNED") {
        subActivity.status = "IN_PROGRESS";
        subActivity.start_date = new Date().toISOString();
      }
    }

    // Update overall task progress
    if (updatedTask.sub_activities) {
      const totalProgress = updatedTask.sub_activities.reduce((sum, sa) => sum + sa.progress_percentage, 0);
      updatedTask.progress_percentage = totalProgress / updatedTask.sub_activities.length;

      // Update task status
      if (updatedTask.progress_percentage === 100) {
        updatedTask.status = "COMPLETED";
        updatedTask.completion_date = new Date().toISOString();
      } else if (updatedTask.progress_percentage > 0 && updatedTask.status === "CREATED") {
        updatedTask.status = "IN_PROGRESS";
        updatedTask.start_date = new Date().toISOString();
      }
    }

    return createMockApiResponse(updatedTask, 400);
  }

  // Get task statistics
  async getTaskStatistics(): Promise<TaskStatistics> {
    const stats: TaskStatistics = {
      total_tasks: mockTasks.length,
      tasks_by_status: {
        CREATED: mockTasks.filter((t) => t.status === "CREATED").length,
        IN_PROGRESS: mockTasks.filter((t) => t.status === "IN_PROGRESS").length,
        COMPLETED: mockTasks.filter((t) => t.status === "COMPLETED").length,
        CANCELLED: mockTasks.filter((t) => t.status === "CANCELLED").length,
      },
      tasks_by_type: {
        "2G_DISMANTLE": mockTasks.filter((t) => t.task_type === "2G_DISMANTLE").length,
        MW_DISMANTLE: mockTasks.filter((t) => t.task_type === "MW_DISMANTLE").length,
        INSTALLATION_COMMISSIONING: mockTasks.filter((t) => t.task_type === "INSTALLATION_COMMISSIONING").length,
        EMF_SURVEY: mockTasks.filter((t) => t.task_type === "EMF_SURVEY").length,
        DEGROW: mockTasks.filter((t) => t.task_type === "DEGROW").length,
        RELOCATION: mockTasks.filter((t) => t.task_type === "RELOCATION").length,
      },
      average_completion_time: 18.5, // Mock average
      completion_rate: 0.75, // Mock completion rate
      overdue_tasks: 2, // Mock overdue count
    };

    return createMockApiResponse(stats, 200);
  }

  // Get team workload
  async getTeamWorkload(): Promise<TeamWorkload[]> {
    const workload: TeamWorkload[] = mockTeams.map((team) => ({
      team_id: team.id,
      team_name: team.name,
      active_tasks: Math.floor(Math.random() * 5) + 1,
      pending_assignments: Math.floor(Math.random() * 3),
      completion_rate: 0.8 + Math.random() * 0.2,
      average_task_duration: 12 + Math.random() * 8,
      utilization_percentage: 60 + Math.random() * 30,
    }));

    return createMockApiResponse(workload, 300);
  }

  // Get vendor performance
  async getVendorPerformance(): Promise<VendorPerformance[]> {
    const performance: VendorPerformance[] = mockVendors.map((vendor) => ({
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      total_allocations: Math.floor(Math.random() * 20) + 5,
      completed_tasks: Math.floor(Math.random() * 15) + 3,
      average_completion_time: 14 + Math.random() * 6,
      quality_score: 3.5 + Math.random() * 1.5,
      on_time_delivery_rate: 0.7 + Math.random() * 0.3,
    }));

    return createMockApiResponse(performance, 300);
  }

  // Get available vendors
  async getVendors() {
    return createMockApiResponse(mockVendors, 200);
  }

  // Get available teams
  async getTeams() {
    return createMockApiResponse(mockTeams, 200);
  }

  // Get teams for specific vendor
  async getVendorTeams(vendorId: number) {
    const teams = mockTeams.filter((team) => team.vendor_id === vendorId);
    return createMockApiResponse(teams, 200);
  }

  // Get internal teams
  async getInternalTeams() {
    const teams = mockTeams.filter((team) => team.vendor_id === null);
    return createMockApiResponse(teams, 200);
  }
}

// Export singleton instance
export const taskService = new TaskService();
export default taskService;

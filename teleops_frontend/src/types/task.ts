// Task Management TypeScript Interfaces

export interface Task {
  id: string; // UUID string
  task_id: string; // Human-readable task identifier (e.g., "AD485_2025_1_1")
  task_name: string;
  task_type: TaskType;
  project_id: number;
  project_name: string;
  client_name: string;
  status: TaskStatus;
  progress_percentage: number;
  sites_count: number;
  requires_coordination: boolean;
  estimated_duration_hours: number;
  actual_duration_hours?: number;
  start_date?: string;
  completion_date?: string;
  created_at: string;
  created_by: string;
  sub_activities?: SubActivity[];
  sites?: TaskSite[];
  timeline?: TimelineEvent[];
}

export interface TaskFromFlow {
  id: string;
  task_id: string;
  client_task_id?: string;
  is_client_id_provided: boolean;
  task_name: string;
  description: string;
  flow_template: string;
  flow_template_name: string;
  project: number;
  project_name: string;
  status: string;
  priority: string;
  scheduled_start?: string;
  scheduled_end?: string;
  created_by: number;
  created_by_name: string;
  assigned_to?: number;
  assigned_to_name?: string;
  supervisor?: number;
  supervisor_name?: string;
  created_at: string;
  updated_at: string;
  site_groups: TaskSiteGroup[];
  sub_activities: TaskSubActivity[];
}

export interface TaskSiteGroup {
  id: string;
  site: number;
  site_alias: string;
  assignment_order: number;
  site_name: string;
  site_global_id: string;
  site_business_id: string;
}

export interface TaskSubActivity {
  id: string;
  sequence_order: number;
  activity_type: string;
  activity_name: string;
  description: string;
  assigned_site: number;
  site_alias: string;
  dependencies: string[];
  dependency_scope: string;
  parallel_execution: boolean;
  status: string;
  actual_start?: string;
  actual_end?: string;
  progress_percentage: number;
  notes: string;
  created_at: string;
  updated_at: string;
  site_name: string;
  site_global_id: string;
  site_business_id: string;
}

export interface SubActivity {
  id: string; // UUID string
  sub_activity_name: string;
  activity_type: ActivityType;
  sequence_order: number;
  assignment_type: AssignmentType;
  status: SubActivityStatus;
  progress_percentage: number;

  // Site assignment info
  assigned_site?: number; // Site ID this sub-activity is assigned to
  site_name?: string; // Site name for this sub-activity
  site_global_id?: string; // Site global ID
  site_business_id?: string; // Site business ID

  // Allocation info (for vendor path)
  allocated_vendor?: {
    id: number;
    name: string;
  };

  // Assignment info
  assigned_team?: {
    id: number;
    name: string;
  };

  // Dependencies
  execution_dependencies: number[];

  // Timing
  estimated_duration_hours: number;
  actual_duration_hours?: number;
  start_date?: string;
  completion_date?: string;

  // Additional metadata
  work_instructions?: string;
  site_associations?: number[]; // Site IDs this sub-activity works on
}

export interface TaskSite {
  id: number;
  site_id: number;
  site_name: string;
  site_role: SiteRole;
  sequence_order: number;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  work_instructions?: string;
  estimated_duration_hours?: number;
}

export interface TimelineEvent {
  id: number;
  event_type: string;
  event_description: string;
  timestamp: string;
  updated_by: string;
  sub_activity_id?: number;
  metadata?: Record<string, any>;
}

export interface Vendor {
  id: number;
  name: string;
  vendor_code: string;
  type: string;
  contact_person: {
    name: string;
    email: string;
    phone: string;
  };
  contact_info?: {
    email?: string;
    phone?: string;
  };
  specializations?: string[];
  rating?: number;
  status?: "active" | "inactive" | "suspended";
}

export interface Team {
  id: number;
  name: string;
  vendor_id?: number | null; // null for internal teams
  team_type: string;
  members_count?: number;
  specializations?: string[];
}

// Enums and Union Types
export type TaskType = "2G_DISMANTLE" | "MW_DISMANTLE" | "INSTALLATION_COMMISSIONING" | "EMF_SURVEY" | "DEGROW" | "RELOCATION";

export type TaskStatus = "CREATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "allocated" | "assigned";

export type ActivityType = "DISMANTLE" | "PACKAGING" | "TRANSPORTATION" | "RF_SURVEY" | "INSTALLATION" | "COMMISSIONING" | "RSA" | "EMF_SURVEY" | "DEVIATION_EMAIL";

export type SubActivityStatus = "UNALLOCATED" | "ALLOCATED" | "ASSIGNING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "CANCELLED";

export type AssignmentType = "VENDOR_ALLOCATION" | "DIRECT_ASSIGNMENT";

export type AllocationStatus = "pending" | "allocated" | "in_progress" | "completed" | "cancelled" | "deallocated";

export type SiteRole = "Primary" | "Far_End" | "Near_End" | "Source_Site" | "Target_Site";

// Request/Response Types for API
export interface CreateTaskRequest {
  task_name: string;
  task_type: TaskType;
  project_id: number;
  priority?: "Low" | "Medium" | "High" | "Critical";
  estimated_duration_hours?: number;
  site_ids: number[];
  sub_activities: CreateSubActivityRequest[];
}

export interface CreateSubActivityRequest {
  sub_activity_name: string;
  activity_type: ActivityType;
  sequence_order: number;
  assignment_type?: AssignmentType;
  allocated_vendor_id?: number;
  assigned_team_id?: number;
  estimated_duration_hours?: number;
  execution_dependencies?: number[];
  work_instructions?: string;
}

export interface AssignSubActivityRequest {
  assignment_type: AssignmentType;
  vendor_id?: number;
  team_id?: number;
  estimated_start_date?: string;
}

export interface UpdateProgressRequest {
  progress_percentage: number;
  actual_duration_hours?: number;
  notes?: string;
}

// Filter and Search Types
export interface TaskFilters {
  search?: string;
  status?: TaskStatus | "all";
  task_type?: TaskType | "all";
  client_id?: number;
  project_id?: number;
  assigned_team_id?: number;
  allocated_vendor_id?: number;
  created_by?: number;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface SubActivityFilters {
  activity_type?: ActivityType | "all";
  status?: SubActivityStatus | "all";
  assignment_type?: AssignmentType | "all";
  assigned_team_id?: number;
  allocated_vendor_id?: number;
}

// UI State Types
export interface TaskListState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  filters: TaskFilters;
  selectedTasks: number[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface TaskDetailsState {
  task: Task | null;
  loading: boolean;
  error: string | null;
  assignmentDialogOpen: boolean;
  selectedSubActivity: SubActivity | null;
}

// Activity Configuration Types (for future extensibility)
export interface ActivityConfig {
  activity_type: ActivityType;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  default_duration_hours: number;
  requires_equipment: boolean;
  requires_site_access: boolean;
  mobile_workflow: string;
  completion_criteria: string[];
}

// Task Template Types (for predefined workflows)
export interface TaskTemplate {
  id: string;
  name: string;
  task_type: TaskType;
  description: string;
  sub_activities: SubActivityTemplate[];
  default_site_roles: SiteRole[];
  estimated_total_duration: number;
}

export interface SubActivityTemplate {
  activity_type: ActivityType;
  name: string;
  sequence_order: number;
  estimated_duration_hours: number;
  dependencies: number[];
  assignment_type: AssignmentType;
  required_specializations?: string[];
}

// Statistics and Analytics Types
export interface TaskStatistics {
  total_tasks: number;
  tasks_by_status: Record<TaskStatus, number>;
  tasks_by_type: Record<TaskType, number>;
  average_completion_time: number;
  completion_rate: number;
  overdue_tasks: number;
}

export interface TeamWorkload {
  team_id: number;
  team_name: string;
  active_tasks: number;
  pending_assignments: number;
  completion_rate: number;
  average_task_duration: number;
  utilization_percentage: number;
}

export interface VendorPerformance {
  vendor_id: number;
  vendor_name: string;
  total_allocations: number;
  completed_tasks: number;
  average_completion_time: number;
  quality_score: number;
  on_time_delivery_rate: number;
}

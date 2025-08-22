// Mock Data for Task Management System
import { Task, SubActivity, TaskSite, TimelineEvent, Vendor, Team, TaskType, TaskStatus, ActivityType, SubActivityStatus, AssignmentType, SiteRole } from "../types/task";

// Mock Vendors
export const mockVendors: Vendor[] = [
  {
    id: 201,
    name: "Field Services Vendor A",
    type: "Field Services",
    contact_info: {
      email: "contact@fieldservices-a.com",
      phone: "+1-555-0101",
    },
  },
  {
    id: 202,
    name: "Transport Vendor B",
    type: "Transportation",
    contact_info: {
      email: "logistics@transport-b.com",
      phone: "+1-555-0102",
    },
  },
  {
    id: 203,
    name: "Logistics Vendor C",
    type: "Logistics",
    contact_info: {
      email: "ops@logistics-c.com",
      phone: "+1-555-0103",
    },
  },
  {
    id: 204,
    name: "Installation Specialists Ltd",
    type: "Installation & Commissioning",
    contact_info: {
      email: "projects@install-specialists.com",
      phone: "+1-555-0104",
    },
  },
];

// Mock Teams
export const mockTeams: Team[] = [
  {
    id: 301,
    name: "Team Alpha",
    vendor_id: 201,
    team_type: "Field Services",
    members_count: 4,
    specializations: ["2G Dismantling", "Equipment Removal"],
  },
  {
    id: 302,
    name: "Internal Packaging Team",
    vendor_id: null, // Internal team
    team_type: "Logistics",
    members_count: 3,
    specializations: ["Equipment Packaging", "Inventory Management"],
  },
  {
    id: 303,
    name: "Team Beta",
    vendor_id: 201,
    team_type: "Field Services",
    members_count: 5,
    specializations: ["MW Installation", "RF Testing"],
  },
  {
    id: 304,
    name: "Team Gamma",
    vendor_id: 201,
    team_type: "Field Services",
    members_count: 3,
    specializations: ["MW Dismantling", "Multi-site Coordination"],
  },
  {
    id: 305,
    name: "Transport Team Delta",
    vendor_id: 202,
    team_type: "Transportation",
    members_count: 2,
    specializations: ["Heavy Equipment Transport", "Logistics Coordination"],
  },
  {
    id: 306,
    name: "Internal Installation Team",
    vendor_id: null, // Internal team
    team_type: "Installation",
    members_count: 6,
    specializations: ["L900 Installation", "System Commissioning"],
  },
];

// Mock Tasks
export const mockTasks: Task[] = [
  {
    id: 1,
    task_name: "2G Site ABC Dismantling",
    task_type: "2G_DISMANTLE",
    project_id: 101,
    project_name: "2G Decommissioning Phase 1",
    client_name: "Telecom Client A",
    status: "IN_PROGRESS",
    progress_percentage: 65,
    sites_count: 1,
    requires_coordination: false,
    estimated_duration_hours: 16,
    actual_duration_hours: 12,
    start_date: "2024-01-15T08:00:00Z",
    created_at: "2024-01-10T10:00:00Z",
    created_by: "John Doe",
    sub_activities: [
      {
        id: 1,
        sub_activity_name: "Site Dismantling",
        activity_type: "DISMANTLE",
        sequence_order: 1,
        assignment_type: "VENDOR_ALLOCATION",
        status: "COMPLETED",
        progress_percentage: 100,
        allocated_vendor: {
          id: 201,
          name: "Field Services Vendor A",
        },
        assigned_team: {
          id: 301,
          name: "Team Alpha",
        },
        execution_dependencies: [],
        estimated_duration_hours: 8,
        actual_duration_hours: 7,
        start_date: "2024-01-15T08:00:00Z",
        completion_date: "2024-01-15T15:00:00Z",
        work_instructions: "Standard 2G dismantling procedure",
      },
      {
        id: 2,
        sub_activity_name: "Equipment Packaging",
        activity_type: "PACKAGING",
        sequence_order: 2,
        assignment_type: "DIRECT_ASSIGNMENT",
        status: "IN_PROGRESS",
        progress_percentage: 60,
        assigned_team: {
          id: 302,
          name: "Internal Packaging Team",
        },
        execution_dependencies: [1],
        estimated_duration_hours: 4,
        actual_duration_hours: 3,
        start_date: "2024-01-15T16:00:00Z",
        work_instructions: "Package all dismantled equipment for transport",
      },
      {
        id: 3,
        sub_activity_name: "Equipment Transportation",
        activity_type: "TRANSPORTATION",
        sequence_order: 3,
        assignment_type: "VENDOR_ALLOCATION",
        status: "ALLOCATED",
        progress_percentage: 0,
        allocated_vendor: {
          id: 202,
          name: "Transport Vendor B",
        },
        execution_dependencies: [2],
        estimated_duration_hours: 4,
        work_instructions: "Transport to central warehouse",
      },
    ],
    sites: [
      {
        id: 1,
        site_id: 501,
        site_name: "Site ABC",
        site_role: "Primary",
        sequence_order: 1,
        location: {
          latitude: 40.7128,
          longitude: -74.006,
          address: "123 Main St, New York, NY 10001",
        },
        work_instructions: "Standard dismantling procedure",
        estimated_duration_hours: 8,
      },
    ],
    timeline: [
      {
        id: 1,
        event_type: "TASK_CREATED",
        event_description: "Task created from project",
        timestamp: "2024-01-10T10:00:00Z",
        updated_by: "John Doe",
      },
      {
        id: 2,
        event_type: "SUB_ACTIVITY_ALLOCATED",
        event_description: "Dismantling allocated to Field Services Vendor A",
        timestamp: "2024-01-10T10:05:00Z",
        updated_by: "John Doe",
        sub_activity_id: 1,
      },
      {
        id: 3,
        event_type: "SUB_ACTIVITY_ASSIGNED",
        event_description: "Dismantling assigned to Team Alpha",
        timestamp: "2024-01-10T11:00:00Z",
        updated_by: "Vendor Manager",
        sub_activity_id: 1,
      },
      {
        id: 4,
        event_type: "SUB_ACTIVITY_STARTED",
        event_description: "Site dismantling work started",
        timestamp: "2024-01-15T08:00:00Z",
        updated_by: "Team Alpha",
        sub_activity_id: 1,
      },
      {
        id: 5,
        event_type: "SUB_ACTIVITY_COMPLETED",
        event_description: "Site dismantling completed",
        timestamp: "2024-01-15T15:00:00Z",
        updated_by: "Team Alpha",
        sub_activity_id: 1,
      },
    ],
  },
  {
    id: 2,
    task_name: "MW Link XYZ Dismantling",
    task_type: "MW_DISMANTLE",
    project_id: 102,
    project_name: "MW Network Decommissioning",
    client_name: "Telecom Client B",
    status: "CREATED",
    progress_percentage: 0,
    sites_count: 2,
    requires_coordination: true,
    estimated_duration_hours: 32,
    created_at: "2024-01-12T14:00:00Z",
    created_by: "Jane Smith",
    sub_activities: [
      {
        id: 4,
        sub_activity_name: "Far-End Site Dismantling",
        activity_type: "DISMANTLE",
        sequence_order: 1,
        assignment_type: "VENDOR_ALLOCATION",
        status: "ASSIGNED",
        progress_percentage: 0,
        allocated_vendor: {
          id: 201,
          name: "Field Services Vendor A",
        },
        assigned_team: {
          id: 303,
          name: "Team Beta",
        },
        execution_dependencies: [],
        estimated_duration_hours: 8,
        work_instructions: "MW far-end dismantling with coordination",
      },
      {
        id: 5,
        sub_activity_name: "Near-End Site Dismantling",
        activity_type: "DISMANTLE",
        sequence_order: 1, // Same order - can run in parallel
        assignment_type: "VENDOR_ALLOCATION",
        status: "ASSIGNED",
        progress_percentage: 0,
        allocated_vendor: {
          id: 201,
          name: "Field Services Vendor A",
        },
        assigned_team: {
          id: 304,
          name: "Team Gamma",
        },
        execution_dependencies: [],
        estimated_duration_hours: 8,
        work_instructions: "MW near-end dismantling with coordination",
      },
      {
        id: 6,
        sub_activity_name: "Deviation Email Notification",
        activity_type: "DEVIATION_EMAIL",
        sequence_order: 2,
        assignment_type: "DIRECT_ASSIGNMENT",
        status: "UNALLOCATED",
        progress_percentage: 0,
        execution_dependencies: [4, 5],
        estimated_duration_hours: 1,
        work_instructions: "Send deviation notifications if any issues found",
      },
      {
        id: 7,
        sub_activity_name: "Equipment Packaging",
        activity_type: "PACKAGING",
        sequence_order: 3,
        assignment_type: "VENDOR_ALLOCATION",
        status: "UNALLOCATED",
        progress_percentage: 0,
        execution_dependencies: [6],
        estimated_duration_hours: 6,
        work_instructions: "Package equipment from both sites",
      },
      {
        id: 8,
        sub_activity_name: "Equipment Transportation",
        activity_type: "TRANSPORTATION",
        sequence_order: 4,
        assignment_type: "VENDOR_ALLOCATION",
        status: "UNALLOCATED",
        progress_percentage: 0,
        execution_dependencies: [7],
        estimated_duration_hours: 4,
        work_instructions: "Transport equipment from both sites to warehouse",
      },
    ],
    sites: [
      {
        id: 2,
        site_id: 502,
        site_name: "Site XYZ Far-End",
        site_role: "Far_End",
        sequence_order: 1,
        location: {
          latitude: 40.7589,
          longitude: -73.9851,
          address: "456 Broadway, New York, NY 10013",
        },
        work_instructions: "MW far-end site dismantling",
        estimated_duration_hours: 8,
      },
      {
        id: 3,
        site_id: 503,
        site_name: "Site XYZ Near-End",
        site_role: "Near_End",
        sequence_order: 2,
        location: {
          latitude: 40.7505,
          longitude: -73.9934,
          address: "789 5th Ave, New York, NY 10022",
        },
        work_instructions: "MW near-end site dismantling",
        estimated_duration_hours: 8,
      },
    ],
    timeline: [
      {
        id: 6,
        event_type: "TASK_CREATED",
        event_description: "MW dismantling task created",
        timestamp: "2024-01-12T14:00:00Z",
        updated_by: "Jane Smith",
      },
      {
        id: 7,
        event_type: "SUB_ACTIVITY_ALLOCATED",
        event_description: "Far-end dismantling allocated to Field Services Vendor A",
        timestamp: "2024-01-12T14:05:00Z",
        updated_by: "Jane Smith",
        sub_activity_id: 4,
      },
      {
        id: 8,
        event_type: "SUB_ACTIVITY_ALLOCATED",
        event_description: "Near-end dismantling allocated to Field Services Vendor A",
        timestamp: "2024-01-12T14:06:00Z",
        updated_by: "Jane Smith",
        sub_activity_id: 5,
      },
    ],
  },
  {
    id: 3,
    task_name: "L900 Installation & Commissioning",
    task_type: "INSTALLATION_COMMISSIONING",
    project_id: 103,
    project_name: "L900 Network Rollout Phase 2",
    client_name: "Telecom Client C",
    status: "COMPLETED",
    progress_percentage: 100,
    sites_count: 1,
    requires_coordination: false,
    estimated_duration_hours: 24,
    actual_duration_hours: 22,
    start_date: "2024-01-08T09:00:00Z",
    completion_date: "2024-01-10T15:00:00Z",
    created_at: "2024-01-05T11:00:00Z",
    created_by: "Mike Johnson",
    sub_activities: [
      {
        id: 9,
        sub_activity_name: "RF Survey",
        activity_type: "RF_SURVEY",
        sequence_order: 1,
        assignment_type: "VENDOR_ALLOCATION",
        status: "COMPLETED",
        progress_percentage: 100,
        allocated_vendor: {
          id: 204,
          name: "Installation Specialists Ltd",
        },
        assigned_team: {
          id: 306,
          name: "Internal Installation Team",
        },
        execution_dependencies: [],
        estimated_duration_hours: 4,
        actual_duration_hours: 3,
        start_date: "2024-01-08T09:00:00Z",
        completion_date: "2024-01-08T12:00:00Z",
        work_instructions: "Conduct RF survey and site assessment",
      },
      {
        id: 10,
        sub_activity_name: "Equipment Installation",
        activity_type: "INSTALLATION",
        sequence_order: 2,
        assignment_type: "DIRECT_ASSIGNMENT",
        status: "COMPLETED",
        progress_percentage: 100,
        assigned_team: {
          id: 306,
          name: "Internal Installation Team",
        },
        execution_dependencies: [9],
        estimated_duration_hours: 12,
        actual_duration_hours: 11,
        start_date: "2024-01-08T13:00:00Z",
        completion_date: "2024-01-09T12:00:00Z",
        work_instructions: "Install L900 equipment and configure connections",
      },
      {
        id: 11,
        sub_activity_name: "System Commissioning",
        activity_type: "COMMISSIONING",
        sequence_order: 3,
        assignment_type: "DIRECT_ASSIGNMENT",
        status: "COMPLETED",
        progress_percentage: 100,
        assigned_team: {
          id: 306,
          name: "Internal Installation Team",
        },
        execution_dependencies: [10],
        estimated_duration_hours: 6,
        actual_duration_hours: 5,
        start_date: "2024-01-09T13:00:00Z",
        completion_date: "2024-01-10T10:00:00Z",
        work_instructions: "Commission system and perform acceptance testing",
      },
      {
        id: 12,
        sub_activity_name: "Radio Site Acceptance",
        activity_type: "RSA",
        sequence_order: 4,
        assignment_type: "DIRECT_ASSIGNMENT",
        status: "COMPLETED",
        progress_percentage: 100,
        assigned_team: {
          id: 306,
          name: "Internal Installation Team",
        },
        execution_dependencies: [11],
        estimated_duration_hours: 2,
        actual_duration_hours: 3,
        start_date: "2024-01-10T11:00:00Z",
        completion_date: "2024-01-10T15:00:00Z",
        work_instructions: "Final acceptance testing and documentation",
      },
    ],
    sites: [
      {
        id: 4,
        site_id: 504,
        site_name: "Site DEF",
        site_role: "Primary",
        sequence_order: 1,
        location: {
          latitude: 40.7282,
          longitude: -73.7949,
          address: "321 Queens Blvd, Queens, NY 11101",
        },
        work_instructions: "L900 installation and commissioning",
        estimated_duration_hours: 24,
      },
    ],
    timeline: [
      {
        id: 9,
        event_type: "TASK_CREATED",
        event_description: "Installation & commissioning task created",
        timestamp: "2024-01-05T11:00:00Z",
        updated_by: "Mike Johnson",
      },
      {
        id: 10,
        event_type: "TASK_STARTED",
        event_description: "Task execution started",
        timestamp: "2024-01-08T09:00:00Z",
        updated_by: "Internal Installation Team",
      },
      {
        id: 11,
        event_type: "SUB_ACTIVITY_COMPLETED",
        event_description: "RF Survey completed",
        timestamp: "2024-01-08T12:00:00Z",
        updated_by: "Internal Installation Team",
        sub_activity_id: 9,
      },
      {
        id: 12,
        event_type: "SUB_ACTIVITY_COMPLETED",
        event_description: "Equipment installation completed",
        timestamp: "2024-01-09T12:00:00Z",
        updated_by: "Internal Installation Team",
        sub_activity_id: 10,
      },
      {
        id: 13,
        event_type: "SUB_ACTIVITY_COMPLETED",
        event_description: "System commissioning completed",
        timestamp: "2024-01-10T10:00:00Z",
        updated_by: "Internal Installation Team",
        sub_activity_id: 11,
      },
      {
        id: 14,
        event_type: "TASK_COMPLETED",
        event_description: "Task completed successfully",
        timestamp: "2024-01-10T15:00:00Z",
        updated_by: "Internal Installation Team",
      },
    ],
  },
];

// Helper functions to get mock data
export const getMockTaskById = (id: number): Task | undefined => {
  return mockTasks.find((task) => task.id === id);
};

export const getMockVendorById = (id: number): Vendor | undefined => {
  return mockVendors.find((vendor) => vendor.id === id);
};

export const getMockTeamById = (id: number): Team | undefined => {
  return mockTeams.find((team) => team.id === id);
};

export const getMockTasksByStatus = (status: TaskStatus): Task[] => {
  return mockTasks.filter((task) => task.status === status);
};

export const getMockTasksByType = (taskType: TaskType): Task[] => {
  return mockTasks.filter((task) => task.task_type === taskType);
};

export const getMockVendorTeams = (vendorId: number): Team[] => {
  return mockTeams.filter((team) => team.vendor_id === vendorId);
};

export const getMockInternalTeams = (): Team[] => {
  return mockTeams.filter((team) => team.vendor_id === null);
};

// Mock API response helpers
export const createMockApiResponse = <T>(data: T, delay: number = 500): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const createMockApiError = (message: string, delay: number = 500): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), delay);
  });
};

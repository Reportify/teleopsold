// Mock Data for Task Management System
import { Task, SubActivity, TaskSite, TimelineEvent, Team, TaskType, TaskStatus, ActivityType, SubActivityStatus, AssignmentType, SiteRole } from "../types/task";

// Mock Vendors - Removed as we now fetch real vendor data from backend

// Mock Teams
export const mockTeams: Team[] = [
  {
    id: 301,
    name: "Team Alpha",
    vendor_id: null, // External team (vendor will be assigned dynamically)
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
    vendor_id: null, // External team (vendor will be assigned dynamically)
    team_type: "Field Services",
    members_count: 5,
    specializations: ["MW Installation", "RF Testing"],
  },
  {
    id: 304,
    name: "Team Gamma",
    vendor_id: null, // External team (vendor will be assigned dynamically)
    team_type: "Field Services",
    members_count: 3,
    specializations: ["MW Dismantling", "Multi-site Coordination"],
  },
  {
    id: 305,
    name: "Transport Team Delta",
    vendor_id: null, // External team (vendor will be assigned dynamically)
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

// Mock Tasks - Removed as we now fetch real tasks from backend
export const mockTasks: Task[] = [];

// Helper functions to get mock data
export const getMockTaskById = (id: string): Task | undefined => {
  return mockTasks.find((task) => task.id === id);
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

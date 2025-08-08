import api, { API_ENDPOINTS, apiHelpers } from "./api";

export type ProjectType = "dismantle" | "other";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";

export interface Project {
  id: number;
  name: string;
  description?: string;
  project_type: ProjectType;
  status: ProjectStatus;
  client_tenant: string | number; // primary key of Tenant
  customer_name?: string;
  circle: string;
  activity: string;
  start_date?: string | null;
  end_date?: string | null;
  scope?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  project_type: ProjectType;
  client_id?: string | number; // maps to client_tenant on backend when not owner
  is_tenant_owner?: boolean;
  customer_is_tenant_owner?: boolean;
  customer_name?: string; // free-text
  circle: string;
  activity: string;
  start_date?: string | null;
  end_date?: string | null;
  scope?: string;
}

export interface ListProjectsParams {
  project_type?: ProjectType;
  status?: ProjectStatus;
  circle?: string;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export const projectService = {
  list: (params?: ListProjectsParams) => apiHelpers.get<{ count?: number; results?: Project[] } | Project[]>(API_ENDPOINTS.PROJECTS.LIST, { params }),
  create: (data: CreateProjectRequest) => apiHelpers.post<Project>(API_ENDPOINTS.PROJECTS.CREATE, data),
  retrieve: (id: number | string) => apiHelpers.get<Project>(API_ENDPOINTS.PROJECTS.DETAIL(String(id))),
  update: (id: number | string, data: Partial<CreateProjectRequest>) => apiHelpers.put<Project>(API_ENDPOINTS.PROJECTS.UPDATE(String(id)), data),
  delete: (id: number | string) => apiHelpers.delete<void>(API_ENDPOINTS.PROJECTS.DELETE(String(id))),
};

export default projectService;

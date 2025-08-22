import { API_ENDPOINTS, apiHelpers } from "./api";

export interface Site {
  id: number;
  name?: string;
  site_name?: string; // API uses site_name
  site_id: string;
  global_id?: string; // API includes global_id
  address?: string;
  town?: string; // API uses town
  latitude?: number;
  longitude?: number;
  circle?: string;
  cluster?: string; // API uses cluster
  zone?: string;
  region?: string;
  state?: string;
  district?: string;
  status?: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface ProjectSite {
  id: number;
  site?: Site; // Mock data structure
  site_details?: Site; // Real API structure
  project: number;
  role?: "primary" | "far_end";
  status?: "active" | "inactive";
  is_active?: boolean; // API uses is_active
  alias_name?: string; // API includes alias_name
  linked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ListSitesParams {
  search?: string;
  circle?: string;
  zone?: string;
  region?: string;
  state?: string;
  district?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface ListProjectSitesParams {
  role?: "primary" | "far_end";
  status?: "active" | "inactive";
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface LinkSiteRequest {
  site_id: number;
  role: "primary" | "far_end";
}

export const siteService = {
  // General sites
  list: (params?: ListSitesParams) => apiHelpers.get<{ count?: number; results?: Site[] } | Site[]>(API_ENDPOINTS.SITES.LIST, { params }),

  create: (data: Partial<Site>) => apiHelpers.post<Site>(API_ENDPOINTS.SITES.CREATE, data),

  retrieve: (id: number | string) => apiHelpers.get<Site>(API_ENDPOINTS.SITES.DETAIL(String(id))),

  update: (id: number | string, data: Partial<Site>) => apiHelpers.put<Site>(API_ENDPOINTS.SITES.UPDATE(String(id)), data),

  delete: (id: number | string) => apiHelpers.delete<void>(API_ENDPOINTS.SITES.DELETE(String(id))),

  // Project sites
  listProjectSites: (projectId: string | number, params?: ListProjectSitesParams) =>
    apiHelpers.get<{ count?: number; results?: ProjectSite[] } | ProjectSite[]>(API_ENDPOINTS.PROJECTS.SITES.LIST(String(projectId)), { params }),

  linkSiteToProject: (projectId: string | number, data: LinkSiteRequest) => apiHelpers.post<ProjectSite>(API_ENDPOINTS.PROJECTS.SITES.LINK(String(projectId)), data),

  unlinkSiteFromProject: (projectId: string | number, linkId: string | number) => apiHelpers.delete<void>(API_ENDPOINTS.PROJECTS.SITES.UNLINK(String(projectId), String(linkId))),

  getProjectSiteCount: (projectId: string | number) => apiHelpers.get<{ count: number }>(API_ENDPOINTS.PROJECTS.SITES.COUNT(String(projectId))),

  importSitesToProject: (projectId: string | number, data: FormData) =>
    apiHelpers.post<{ imported: number; errors?: any[] }>(API_ENDPOINTS.PROJECTS.SITES.IMPORT(String(projectId)), data, { headers: { "Content-Type": "multipart/form-data" } }),
};

export default siteService;

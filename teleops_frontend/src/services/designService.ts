import { apiHelpers, API_ENDPOINTS } from "./api";

export interface DesignItem {
  id: number;
  item_name: string;
  equipment_code?: string;
  category?: string;
  model?: string;
  manufacturer?: string;
  attributes?: Record<string, any> | null;
  remarks?: string;
  sort_order: number;
  is_category: boolean;
}

export interface DesignVersion {
  id: number;
  design: number;
  version_number: number;
  title?: string;
  notes?: string;
  status: "draft" | "published";
  is_locked: boolean;
  items_count: number;
  published_at?: string | null;
  created_at: string;
  items?: DesignItem[];
}

export interface CreateDesignVersionRequest {
  title?: string;
  notes?: string;
  copy_from_version_id?: number | null;
}

const designService = {
  listVersions: (projectId: string) => apiHelpers.get<DesignVersion[]>(API_ENDPOINTS.PROJECTS.DESIGN.VERSIONS(projectId)),
  createVersion: (projectId: string, payload: CreateDesignVersionRequest) => apiHelpers.post<DesignVersion>(API_ENDPOINTS.PROJECTS.DESIGN.VERSIONS(projectId), payload),
  publish: (projectId: string, versionId: number) => apiHelpers.post<DesignVersion>(API_ENDPOINTS.PROJECTS.DESIGN.PUBLISH(projectId, versionId), {}),
  createItem: (projectId: string, versionId: number, item: Partial<DesignItem>) => apiHelpers.post<DesignItem>(API_ENDPOINTS.PROJECTS.DESIGN.ITEMS(projectId, versionId), item),
  listItems: (projectId: string, versionId: number) => apiHelpers.get<DesignItem[]>(API_ENDPOINTS.PROJECTS.DESIGN.ITEMS(projectId, versionId)),
  reorderItems: (projectId: string, versionId: number, fromIndex: number, toIndex: number) =>
    apiHelpers.post<{ ok: boolean }>(API_ENDPOINTS.PROJECTS.DESIGN.REORDER(projectId, versionId), { from_index: fromIndex, to_index: toIndex }),
  bulkCreateItems: (projectId: string, versionId: number, items: Partial<DesignItem>[], opts?: { replace?: boolean }) =>
    apiHelpers.post<{ created: number }>(API_ENDPOINTS.PROJECTS.DESIGN.BULK(projectId, versionId), { create: items, ...(opts || {}) }),
  deleteDraft: (projectId: string, versionId: number) => apiHelpers.delete<void>(API_ENDPOINTS.PROJECTS.DESIGN.DELETE_DRAFT(projectId, versionId)),
};

export default designService;

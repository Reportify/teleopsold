import { API_ENDPOINTS, apiHelpers } from "./api";

export interface EquipmentItem {
  id: number;
  name: string;
  description?: string;
  material_code?: string;
  category?: string;
  sub_category?: string;
  manufacturer?: string;
  unit_of_measurement?: string;
  specifications?: Record<string, any>;
  is_active?: boolean;
  technologies?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ListEquipmentParams {
  search?: string;
  category?: string;
  manufacturer?: string;
  technology?: string;
  page?: number;
  page_size?: number;
}

const equipmentService = {
  list: (params?: ListEquipmentParams) => apiHelpers.get<EquipmentItem[] | { count: number; results: EquipmentItem[] }>(API_ENDPOINTS.EQUIPMENT.ITEMS.LIST, { params }),
  categories: (search?: string) => apiHelpers.get<{ categories: string[] }>(`${API_ENDPOINTS.EQUIPMENT.ITEMS.LIST}categories/`, { params: search ? { search } : undefined }),
};

export default equipmentService;

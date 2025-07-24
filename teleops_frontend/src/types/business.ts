// Business Types for Circle-Based Multi-Tenant Platform
import { Tenant } from "./tenant";
import { UserProfile } from "./user";

export interface Project {
  id: number;
  circle_tenant_id: string;
  project_name: string;
  project_code: string;
  project_type: string;
  circle_budget?: number;
  circle_priority: string;
  circle_manager_id?: number;
  status: "Planning" | "Active" | "Completed" | "On_Hold" | "Cancelled";
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  circle_tenant?: Tenant;
  circle_manager?: UserProfile;
  sites?: Site[];
  tasks?: Task[];
}

export interface ProjectDesign {
  id: number;
  project_id: number;
  design_name: string;
  design_description?: string;
  equipment_categories: string[];
  equipment_models: string[];
  design_status: "Draft" | "Approved" | "In_Use";
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;

  // Related data
  project?: Project;
  approved_by_user?: UserProfile;
}

export interface Site {
  id: number;
  circle_tenant_id: string;
  project_id?: number;
  site_name: string;
  site_code: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  circle_region?: string;
  circle_district?: string;
  site_type: string;
  site_status: "Active" | "Inactive" | "Under_Maintenance";
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  circle_tenant?: Tenant;
  project?: Project;
  tasks?: Task[];
}

export interface EquipmentCategory {
  id: number;
  tenant_id: string;
  category_name: string;
  category_code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  tenant?: Tenant;
  equipment_models?: EquipmentModel[];
}

export interface EquipmentModel {
  id: number;
  category_id: number;
  model_name: string;
  model_code: string;
  specifications?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  category?: EquipmentCategory;
}

export interface Task {
  id: number;
  site_id: number;
  project_id?: number;
  task_name: string;
  task_code: string;
  task_type: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "Assigned" | "In_Progress" | "Completed" | "Cancelled";
  assigned_team_id?: number;
  assigned_user_id?: number;
  estimated_duration?: number; // in hours
  actual_duration?: number; // in hours
  start_date?: string;
  due_date?: string;
  completed_date?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  site?: Site;
  project?: Project;
  assigned_team?: Team;
  assigned_user?: UserProfile;
  equipment_verifications?: TaskEquipmentVerification[];
}

export interface TaskEquipmentVerification {
  id: number;
  task_id: number;
  equipment_category_id: number;
  equipment_model_id: number;
  expected_quantity: number;
  found_quantity: number;
  verification_status: "Pending" | "In_Progress" | "Completed" | "Failed";
  verification_notes?: string;
  verified_by?: number;
  verified_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  task?: Task;
  equipment_category?: EquipmentCategory;
  equipment_model?: EquipmentModel;
  verified_by_user?: UserProfile;
  photos?: TaskEquipmentVerificationPhoto[];
}

export interface TaskEquipmentVerificationPhoto {
  id: number;
  verification_id: number;
  photo_url: string;
  photo_type: "Equipment" | "Location" | "Serial_Number" | "Other";
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  taken_at: string;
  uploaded_at: string;

  // Related data
  verification?: TaskEquipmentVerification;
}

export interface Team {
  id: number;
  circle_tenant_id: string;
  team_name: string;
  team_code: string;
  team_leader_id?: number;
  team_type: string;
  team_size: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  circle_tenant?: Tenant;
  team_leader?: UserProfile;
  team_members?: TeamMembership[];
  tasks?: Task[];
}

export interface TeamMembership {
  id: number;
  team_id: number;
  user_profile_id: number;
  role_in_team: string;
  joined_date: string;
  left_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  team?: Team;
  user_profile?: UserProfile;
}

export interface Warehouse {
  id: number;
  circle_tenant_id: string;
  warehouse_name: string;
  warehouse_code: string;
  location: string;
  capacity: number;
  manager_id?: number;
  warehouse_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  circle_tenant?: Tenant;
  manager?: UserProfile;
  storage_zones?: StorageZone[];
}

export interface StorageZone {
  id: number;
  warehouse_id: number;
  zone_name: string;
  zone_code: string;
  zone_type: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  warehouse?: Warehouse;
  bin_locations?: BinLocation[];
}

export interface BinLocation {
  id: number;
  zone_id: number;
  bin_name: string;
  bin_code: string;
  bin_type: string;
  capacity: number;
  is_occupied: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  zone?: StorageZone;
  inventory_items?: InventoryItem[];
}

export interface InventoryItem {
  id: number;
  bin_location_id: number;
  equipment_category_id: number;
  equipment_model_id: number;
  quantity: number;
  serial_numbers?: string[];
  condition: "Good" | "Damaged";
  received_date: string;
  expiry_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Related data
  bin_location?: BinLocation;
  equipment_category?: EquipmentCategory;
  equipment_model?: EquipmentModel;
}

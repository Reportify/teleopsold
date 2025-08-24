// Flow Management Types - Reusable workflow templates
import { ActivityType, AssignmentType } from "./task";

// Re-export AssignmentType for use in flow components
export type { AssignmentType } from "./task";

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: FlowCategory;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  is_default: boolean;
  usage_count: number;
  activities: FlowActivity[];
  sites?: FlowSite[]; // Sites defined in this flow template
  tags: string[];
}

export interface FlowActivity {
  id: string;
  sequence_order: number;
  activity_name: string;
  activity_type: ActivityType;
  description: string;
  assignment_type: AssignmentType;
  requires_site: boolean;
  requires_equipment: boolean;
  dependencies: string[]; // IDs of activities that must complete first
  parallel_group?: string; // Activities that can run in parallel
  validation_rules?: FlowValidationRule[];
  notes?: string;
}

export interface FlowValidationRule {
  rule_type: "site_count" | "equipment_type" | "skill_requirement" | "time_constraint";
  condition: string;
  message: string;
}

export type FlowCategory = "DISMANTLING" | "INSTALLATION" | "MAINTENANCE" | "SURVEY" | "LOGISTICS" | "COMMISSIONING" | "CUSTOM";

export type TaskType = "2G_DISMANTLE" | "3G_DISMANTLE" | "4G_DISMANTLE" | "MW_DISMANTLE" | "INSTALLATION_COMMISSIONING" | "MW_INSTALLATION" | "SITE_SURVEY" | "MAINTENANCE" | "RELOCATION" | "CUSTOM";

export interface FlowStats {
  total_flows: number;
  active_flows: number;
  most_used_flow: FlowTemplate | null;
  categories: Record<FlowCategory, number>;
  recent_flows: FlowTemplate[];
}

// Site Management for Flow Builder
export interface FlowSite {
  id: string;
  alias: string; // User-defined name like "Far-end", "Near-end", "Source", etc.
  order: number; // Display order in tabs
}

// Flow Builder interfaces
export interface FlowBuilder {
  id?: string;
  name: string;
  description: string;
  category: FlowCategory;
  task_types: TaskType[];
  sites: FlowSite[]; // Sites defined in this flow
  activities: FlowActivityBuilder[];
  estimated_total_hours: number;
  tags: string[];
}

export interface FlowActivityBuilder {
  id: string;
  template_id: string;
  sequence_order: number;
  activity_name: string;
  activity_type: ActivityType;
  description: string;
  estimated_hours: number;
  assignment_type: AssignmentType;
  requires_site: boolean;
  requires_equipment: boolean;
  dependencies: string[];
  parallel_group?: string;
  notes?: string;
  // Site assignment - can be assigned to specific sites or all sites
  assigned_sites: string[]; // Array of site IDs, empty array means "All sites"
  // Backend compatibility fields
  site_scope: "SINGLE" | "MULTIPLE" | "ALL";
  parallel_execution: boolean;
  dependency_scope: "SITE_LOCAL" | "CROSS_SITE" | "GLOBAL";
  site_coordination: boolean;
}

// UI State for Flow Builder
export interface FlowBuilderState {
  selectedSiteId: string | null; // Currently selected site tab (null = "All sites")
  draggedActivity: ActivityTemplate | null;
  editingActivity: FlowActivityBuilder | null;
  showAddSiteDialog: boolean;
  showEditSiteDialog: boolean;
  editingSite: FlowSite | null;
}

// Activity Template for Flow Builder
export interface ActivityTemplate {
  id: string;
  name: string;
  activity_type: ActivityType;
  description: string;
  icon: React.ReactNode;
  estimated_hours: number;
  requires_site: boolean;
  requires_equipment: boolean;
  color: string;
  category: string;
  default_assignment_type: AssignmentType;
}

// Centralized Flow Template Mock Data
import { FlowTemplate } from "../types/flow";

export const mockFlowTemplates: FlowTemplate[] = [
  {
    id: "flow_001",
    name: "Standard 2G Dismantling",
    description: "Complete workflow for 2G site dismantling including equipment removal, packaging, and transportation",
    category: "DISMANTLING",
    created_by: "System Admin",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-20T14:30:00Z",
    is_active: true,
    is_default: false,
    usage_count: 45,
    activities: [
      {
        id: "1",
        sequence_order: 0,
        activity_name: "Site Dismantling",
        activity_type: "DISMANTLE",
        description: "Remove equipment",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: true,
        requires_equipment: true,
        dependencies: [],
      },
      {
        id: "2",
        sequence_order: 1,
        activity_name: "Equipment Packaging",
        activity_type: "PACKAGING",
        description: "Package equipment",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: false,
        requires_equipment: true,
        dependencies: ["1"],
      },
      {
        id: "3",
        sequence_order: 2,
        activity_name: "Equipment Transportation",
        activity_type: "TRANSPORTATION",
        description: "Transport to warehouse",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: false,
        requires_equipment: true,
        dependencies: ["2"],
      },
    ],
    tags: ["standard", "2g", "dismantling", "equipment"],
  },
  {
    id: "flow_002",
    name: "MW Link Dismantling",
    description: "Specialized workflow for microwave link dismantling with far-end and near-end coordination",
    category: "DISMANTLING",
    created_by: "John Smith",
    created_at: "2024-01-10T09:15:00Z",
    updated_at: "2024-01-18T16:45:00Z",
    is_active: true,
    is_default: false,
    usage_count: 23,
    activities: [
      {
        id: "1",
        sequence_order: 0,
        activity_name: "MW Dismantling",
        activity_type: "DISMANTLE",
        description: "Dismantle MW equipment",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: true,
        requires_equipment: true,
        dependencies: [],
      },
      {
        id: "2",
        sequence_order: 1,
        activity_name: "Equipment Transportation",
        activity_type: "TRANSPORTATION",
        description: "Transport equipment",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: false,
        requires_equipment: true,
        dependencies: ["1"],
      },
    ],
    tags: ["microwave", "mw", "dismantling", "coordination"],
  },
  {
    id: "flow_003",
    name: "L900 Installation & Commissioning",
    description: "Complete L900 installation workflow including RF survey, installation, and commissioning",
    category: "INSTALLATION",
    created_by: "Sarah Johnson",
    created_at: "2024-01-05T11:30:00Z",
    updated_at: "2024-01-15T09:20:00Z",
    is_active: true,
    is_default: false,
    usage_count: 67,
    activities: [
      {
        id: "1",
        sequence_order: 0,
        activity_name: "RF Survey",
        activity_type: "RF_SURVEY",
        description: "Conduct RF survey",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: true,
        requires_equipment: false,
        dependencies: [],
      },
      {
        id: "2",
        sequence_order: 1,
        activity_name: "Equipment Installation",
        activity_type: "INSTALLATION",
        description: "Install L900 equipment",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: true,
        requires_equipment: true,
        dependencies: ["1"],
      },
      {
        id: "3",
        sequence_order: 2,
        activity_name: "System Commissioning",
        activity_type: "COMMISSIONING",
        description: "Commission system",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: true,
        requires_equipment: true,
        dependencies: ["2"],
      },
    ],
    tags: ["l900", "installation", "commissioning", "rf-survey"],
  },
  {
    id: "flow_004",
    name: "Site Survey & Assessment",
    description: "Comprehensive site survey workflow for new installations",
    category: "SURVEY",
    created_by: "Mike Wilson",
    created_at: "2024-01-12T08:45:00Z",
    updated_at: "2024-01-12T08:45:00Z",
    is_active: true,
    is_default: false,
    usage_count: 12,
    activities: [
      {
        id: "1",
        sequence_order: 0,
        activity_name: "Site Survey",
        activity_type: "RF_SURVEY",
        description: "Comprehensive site assessment",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: true,
        requires_equipment: false,
        dependencies: [],
      },
    ],
    tags: ["survey", "site-assessment", "planning"],
  },
  {
    id: "flow_005",
    name: "Equipment Relocation",
    description: "Multi-site equipment relocation with dismantling and installation phases",
    category: "CUSTOM",
    created_by: "Lisa Chen",
    created_at: "2024-01-08T14:20:00Z",
    updated_at: "2024-01-22T11:15:00Z",
    is_active: true,
    is_default: false,
    usage_count: 8,
    activities: [
      {
        id: "1",
        sequence_order: 0,
        activity_name: "Site Dismantling",
        activity_type: "DISMANTLE",
        description: "Dismantle at source",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: true,
        requires_equipment: true,
        dependencies: [],
      },
      {
        id: "2",
        sequence_order: 1,
        activity_name: "Equipment Transportation",
        activity_type: "TRANSPORTATION",
        description: "Transport equipment",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: false,
        requires_equipment: true,
        dependencies: ["1"],
      },
      {
        id: "3",
        sequence_order: 2,
        activity_name: "Equipment Installation",
        activity_type: "INSTALLATION",
        description: "Install at destination",
        assignment_type: "VENDOR_ALLOCATION",
        requires_site: true,
        requires_equipment: true,
        dependencies: ["2"],
      },
    ],
    tags: ["relocation", "multi-site", "complex"],
  },
];

// Helper functions for flow data access
export const getFlowTemplateById = (id: string): FlowTemplate | undefined => {
  return mockFlowTemplates.find((flow) => flow.id === id);
};

export const getActiveFlowTemplates = (): FlowTemplate[] => {
  return mockFlowTemplates.filter((flow) => flow.is_active);
};

export const getFlowTemplatesByCategory = (category: string): FlowTemplate[] => {
  if (category === "all") return mockFlowTemplates;
  return mockFlowTemplates.filter((flow) => flow.category === category);
};

export const searchFlowTemplates = (searchTerm: string): FlowTemplate[] => {
  if (!searchTerm) return mockFlowTemplates;

  const term = searchTerm.toLowerCase();
  return mockFlowTemplates.filter(
    (flow) =>
      flow.name.toLowerCase().includes(term) ||
      flow.description.toLowerCase().includes(term) ||
      flow.activities.some((activity) => activity.activity_name.toLowerCase().includes(term) || activity.description.toLowerCase().includes(term))
  );
};

export const getPopularFlowTemplates = (limit: number = 3): FlowTemplate[] => {
  return [...mockFlowTemplates].sort((a, b) => b.usage_count - a.usage_count).slice(0, limit);
};

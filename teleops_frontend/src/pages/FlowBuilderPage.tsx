// Flow Builder Page - Create and edit reusable workflow templates
import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  TextField,
  MenuItem,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Stack,
  InputAdornment,
  Menu,
} from "@mui/material";
import {
  ArrowBack,
  DragIndicator,
  Delete,
  Edit,
  Save,
  ExpandMore,
  ContentCopy,
  Construction,
  LocalShipping,
  Engineering,
  Search,
  AccountTree,
  CheckBox,
  CheckBoxOutlineBlank,
  Add,
  MoreVert,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { FlowBuilder, FlowActivityBuilder, ActivityTemplate, FlowCategory, TaskType, AssignmentType, FlowSite, FlowBuilderState } from "../types/flow";
import { ActivityType } from "../types/task";
import { FlowService } from "../services/flowService";
import { useAuth } from "../contexts/AuthContext";

// Backend FlowActivity interface for API responses
interface BackendFlowActivity {
  id: string;
  activity_name: string;
  description: string;
  activity_type: string;
  sequence_order: number;
  dependencies: string[];
  requires_site: boolean;
  requires_equipment: boolean;
  site_scope: string;
  parallel_execution: boolean;
  dependency_scope: string;
  site_coordination: boolean;
  assigned_sites: BackendFlowActivitySite[]; // Site assignments
}

// Backend FlowActivitySite interface for API responses
interface BackendFlowActivitySite {
  id: string;
  flow_site: {
    id: string;
    alias: string;
    order: number;
  };
  is_required: boolean;
  execution_order: number;
}

// Activity Templates for Flow Builder
const activityTemplates: ActivityTemplate[] = [
  // Field Operations
  {
    id: "dismantle",
    name: "Site Dismantling",
    activity_type: "DISMANTLE",
    description: "Remove equipment and infrastructure from site",
    icon: <Construction />,
    estimated_hours: 8,
    requires_site: true,
    requires_equipment: true,
    color: "#f44336",
    category: "Field Operations",
    default_assignment_type: "VENDOR_ALLOCATION",
  },
  {
    id: "install",
    name: "Equipment Installation",
    activity_type: "INSTALLATION",
    description: "Install and configure new equipment",
    icon: <Construction />,
    estimated_hours: 12,
    requires_site: true,
    requires_equipment: true,
    color: "#4caf50",
    category: "Field Operations",
    default_assignment_type: "VENDOR_ALLOCATION",
  },

  {
    id: "commissioning",
    name: "System Commissioning",
    activity_type: "COMMISSIONING",
    description: "Test and commission installed equipment",
    icon: <Engineering />,
    estimated_hours: 6,
    requires_site: true,
    requires_equipment: true,
    color: "#2e7d32",
    category: "Field Operations",
    default_assignment_type: "VENDOR_ALLOCATION",
  },

  // Logistics & Transport
  {
    id: "transport",
    name: "Equipment Transportation",
    activity_type: "TRANSPORTATION",
    description: "Transport equipment between locations",
    icon: <LocalShipping />,
    estimated_hours: 4,
    requires_site: false,
    requires_equipment: true,
    color: "#2196f3",
    category: "Logistics & Transport",
    default_assignment_type: "VENDOR_ALLOCATION",
  },
  {
    id: "packaging",
    name: "Equipment Packaging",
    activity_type: "PACKAGING",
    description: "Package equipment for safe transportation",
    icon: <LocalShipping />,
    estimated_hours: 2,
    requires_site: false,
    requires_equipment: true,
    color: "#1976d2",
    category: "Logistics & Transport",
    default_assignment_type: "VENDOR_ALLOCATION",
  },

  // Technical Services
  {
    id: "rf_survey",
    name: "RF Survey",
    activity_type: "RF_SURVEY",
    description: "Conduct RF site survey and measurements",
    icon: <Engineering />,
    estimated_hours: 6,
    requires_site: true,
    requires_equipment: false,
    color: "#ff9800",
    category: "Technical Services",
    default_assignment_type: "VENDOR_ALLOCATION",
  },
  {
    id: "emf_survey",
    name: "EMF Survey",
    activity_type: "EMF_SURVEY",
    description: "Conduct electromagnetic field measurements",
    icon: <Engineering />,
    estimated_hours: 4,
    requires_site: true,
    requires_equipment: false,
    color: "#f57c00",
    category: "Technical Services",
    default_assignment_type: "VENDOR_ALLOCATION",
  },
  {
    id: "rfi_survey",
    name: "RFI Survey",
    activity_type: "RF_SURVEY",
    description: "Ready for Installation survey and site preparation assessment",
    icon: <Engineering />,
    estimated_hours: 4,
    requires_site: true,
    requires_equipment: false,
    color: "#ff5722",
    category: "Technical Services",
    default_assignment_type: "VENDOR_ALLOCATION",
  },
  {
    id: "at_testing",
    name: "AT (Acceptance Testing)",
    activity_type: "COMMISSIONING",
    description: "Acceptance testing and system validation",
    icon: <Engineering />,
    estimated_hours: 6,
    requires_site: true,
    requires_equipment: true,
    color: "#795548",
    category: "Technical Services",
    default_assignment_type: "VENDOR_ALLOCATION",
  },
  {
    id: "rsa_testing",
    name: "RSA (Radio Site Acceptance)",
    activity_type: "COMMISSIONING",
    description: "Radio site acceptance testing and final validation",
    icon: <Engineering />,
    estimated_hours: 8,
    requires_site: true,
    requires_equipment: true,
    color: "#607d8b",
    category: "Technical Services",
    default_assignment_type: "VENDOR_ALLOCATION",
  },
  {
    id: "deviation_email",
    name: "Deviation Reporting",
    activity_type: "DEVIATION_EMAIL",
    description: "Report deviations and issues via email",
    icon: <Engineering />,
    estimated_hours: 1,
    requires_site: false,
    requires_equipment: false,
    color: "#e65100",
    category: "Technical Services",
    default_assignment_type: "DIRECT_ASSIGNMENT",
  },
];

// Category configuration for better organization
const categoryConfig = {
  "Field Operations": {
    icon: <Construction />,
    color: "#f44336",
    description: "On-site physical work activities",
  },
  "Logistics & Transport": {
    icon: <LocalShipping />,
    color: "#2196f3",
    description: "Equipment handling and transportation",
  },
  "Technical Services": {
    icon: <Engineering />,
    color: "#00bcd4",
    description: "Technical analysis and testing",
  },
};

const FlowBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { flowId } = useParams();
  const { isAuthenticated } = useAuth();
  const isEditing = Boolean(flowId);

  const [flowBuilder, setFlowBuilder] = useState<FlowBuilder>({
    name: "",
    description: "",
    category: "DISMANTLING",
    task_types: [],
    sites: [],
    activities: [],
    estimated_total_hours: 0,
    tags: [],
  });

  // UI State
  const [builderState, setBuilderState] = useState<FlowBuilderState>({
    selectedSiteId: null, // null = "All sites"
    draggedActivity: null,
    editingActivity: null,
    showAddSiteDialog: false,
    showEditSiteDialog: false,
    editingSite: null,
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<FlowActivityBuilder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
  const [dependencyActivity, setDependencyActivity] = useState<FlowActivityBuilder | null>(null);
  const [draggedActivityIndex, setDraggedActivityIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Site management state
  const [siteContextMenu, setSiteContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    site: FlowSite;
  } | null>(null);
  const [newSiteAlias, setNewSiteAlias] = useState("");
  const [loading, setLoading] = useState(false);

  // Load existing flow data when editing
  useEffect(() => {
    const loadFlowTemplate = async () => {
      if (!isEditing || !flowId) return;

      try {
        setLoading(true);
        const response = await FlowService.getFlowTemplate(flowId);

        if (response.success && response.data) {
          const flowTemplate = response.data;

          // Convert backend data to frontend format
          const activities: FlowActivityBuilder[] = (flowTemplate.activities as unknown as BackendFlowActivity[]).map((activity, index) => ({
            id: `activity-${Date.now()}-${index}`, // Generate new frontend ID
            template_id: activity.id,
            sequence_order: activity.sequence_order,
            activity_name: activity.activity_name,
            activity_type: activity.activity_type as ActivityType, // Cast to ActivityType
            description: activity.description.split(" (Assigned to:")[0], // Remove site assignment from description
            estimated_hours: 0, // Default value
            assignment_type: "VENDOR_ALLOCATION", // Default value
            requires_site: activity.requires_site,
            requires_equipment: activity.requires_equipment,
            dependencies: activity.dependencies.map((dep) => {
              // Find the activity with this sequence order and get its frontend ID
              const depActivity = (flowTemplate.activities as unknown as BackendFlowActivity[]).find((a) => a.sequence_order.toString() === dep);
              if (depActivity) {
                return `activity-${Date.now()}-${depActivity.sequence_order}`;
              }
              return dep;
            }),
            parallel_group: activity.parallel_execution ? "parallel" : undefined,
            notes: "",
            assigned_sites: [], // Will be populated based on site_scope and description
            // Backend compatibility fields
            site_scope: (activity.site_scope as "SINGLE" | "MULTIPLE" | "ALL") || "SINGLE",
            parallel_execution: activity.parallel_execution || false,
            dependency_scope: (activity.dependency_scope as "SITE_LOCAL" | "CROSS_SITE" | "GLOBAL") || "SITE_LOCAL",
            site_coordination: activity.site_coordination || false,
          }));

          // Extract site information from the backend sites
          const sites: FlowSite[] = (flowTemplate.sites || []).map((site: any, index: number) => ({
            id: `site-${Date.now()}-${index}`,
            alias: site.alias || `Site ${index + 1}`,
            order: site.order || index,
          }));

          // Assign activities to sites based on backend site assignments
          activities.forEach((activity) => {
            const backendActivity = (flowTemplate.activities as unknown as BackendFlowActivity[]).find((a) => a.sequence_order === activity.sequence_order);
            if (backendActivity && backendActivity.assigned_sites) {
              const assignedSiteAliases = backendActivity.assigned_sites.map((siteAssignment: BackendFlowActivitySite) => siteAssignment.flow_site.alias || "Unknown Site");
              activity.assigned_sites = assignedSiteAliases
                .map((alias: string) => {
                  const site = sites.find((s) => s.alias === alias);
                  return site ? site.id : null;
                })
                .filter(Boolean) as string[];
            }
          });

          setFlowBuilder({
            id: flowTemplate.id,
            name: flowTemplate.name,
            description: flowTemplate.description,
            category: flowTemplate.category,
            task_types: [],
            sites: sites,
            activities: activities,
            estimated_total_hours: 0,
            tags: flowTemplate.tags || [],
          });
        }
      } catch (error) {
        console.error("Failed to load flow template:", error);
        alert("Failed to load flow template for editing");
      } finally {
        setLoading(false);
      }
    };

    loadFlowTemplate();
  }, [isEditing, flowId]);

  // Site management functions
  const handleAddSite = useCallback(() => {
    if (newSiteAlias.trim()) {
      const newSite: FlowSite = {
        id: `site-${Date.now()}`,
        alias: newSiteAlias.trim(),
        order: flowBuilder.sites.length,
      };
      setFlowBuilder((prev) => ({
        ...prev,
        sites: [...prev.sites, newSite],
      }));
      setNewSiteAlias("");
      setBuilderState((prev) => ({ ...prev, showAddSiteDialog: false }));
    }
  }, [newSiteAlias, flowBuilder.sites.length]);

  const handleEditSite = useCallback((site: FlowSite, newAlias: string) => {
    if (newAlias.trim()) {
      setFlowBuilder((prev) => ({
        ...prev,
        sites: prev.sites.map((s) => (s.id === site.id ? { ...s, alias: newAlias.trim() } : s)),
      }));
      setBuilderState((prev) => ({ ...prev, showEditSiteDialog: false, editingSite: null }));
    }
  }, []);

  const handleDeleteSite = useCallback(
    (siteId: string) => {
      // Check if any activities are assigned to this site
      const activitiesUsingThisSite = flowBuilder.activities.filter((activity) => activity.assigned_sites.includes(siteId));

      if (activitiesUsingThisSite.length > 0) {
        alert(`Cannot delete site. ${activitiesUsingThisSite.length} activities are assigned to this site.`);
        return;
      }

      setFlowBuilder((prev) => ({
        ...prev,
        sites: prev.sites.filter((s) => s.id !== siteId),
      }));

      // If the deleted site was selected, switch to "All sites"
      if (builderState.selectedSiteId === siteId) {
        setBuilderState((prev) => ({ ...prev, selectedSiteId: null }));
      }

      setSiteContextMenu(null);
    },
    [flowBuilder.activities, builderState.selectedSiteId]
  );

  const handleSiteContextMenu = useCallback((event: React.MouseEvent, site: FlowSite) => {
    event.preventDefault();
    setSiteContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      site,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setSiteContextMenu(null);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, template: ActivityTemplate) => {
    e.dataTransfer.setData("application/json", JSON.stringify(template));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const templateData = e.dataTransfer.getData("application/json");
      if (templateData) {
        const template: ActivityTemplate = JSON.parse(templateData);
        const newActivity: FlowActivityBuilder = {
          id: `activity-${Date.now()}`,
          template_id: template.id,
          sequence_order: flowBuilder.activities.length,
          activity_name: template.name,
          activity_type: template.activity_type,
          description: template.description,
          estimated_hours: template.estimated_hours,
          assignment_type: template.default_assignment_type,
          requires_site: template.requires_site,
          requires_equipment: template.requires_equipment,
          dependencies: [],
          // Assign to currently selected site or "All sites" if none selected
          assigned_sites: builderState.selectedSiteId ? [builderState.selectedSiteId] : [],
          // Backend compatibility fields with smart defaults
          site_scope: builderState.selectedSiteId ? "SINGLE" : "ALL",
          parallel_execution: false,
          dependency_scope: "SITE_LOCAL", // Default to SITE_LOCAL, will be updated based on dependencies
          site_coordination: false,
        };
        setFlowBuilder((prev) => ({
          ...prev,
          activities: [...prev.activities, newActivity],
        }));
      }
    },
    [flowBuilder.activities.length, builderState.selectedSiteId]
  );

  const handleRemoveActivity = useCallback((activityId: string) => {
    setFlowBuilder((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== activityId),
    }));
  }, []);

  const handleEditActivity = useCallback((activity: FlowActivityBuilder) => {
    setEditingActivity(activity);
    setEditDialogOpen(true);
  }, []);

  const handleDuplicateActivity = useCallback(
    (activity: FlowActivityBuilder) => {
      const duplicated: FlowActivityBuilder = {
        ...activity,
        id: `activity-${Date.now()}`,
        activity_name: `${activity.activity_name} (Copy)`,
        sequence_order: flowBuilder.activities.length,
      };
      setFlowBuilder((prev) => ({
        ...prev,
        activities: [...prev.activities, duplicated],
      }));
    },
    [flowBuilder.activities.length]
  );

  const handleSaveEditedActivity = useCallback(() => {
    if (editingActivity) {
      setFlowBuilder((prev) => ({
        ...prev,
        activities: prev.activities.map((a) => (a.id === editingActivity.id ? editingActivity : a)),
      }));
      setEditDialogOpen(false);
      setEditingActivity(null);
    }
  }, [editingActivity]);

  const handleManageDependencies = useCallback((activity: FlowActivityBuilder) => {
    setDependencyActivity(activity);
    setDependencyDialogOpen(true);
  }, []);

  const handleSaveDependencies = useCallback(() => {
    if (dependencyActivity) {
      setFlowBuilder((prev) => ({
        ...prev,
        activities: prev.activities.map((a) => (a.id === dependencyActivity.id ? dependencyActivity : a)),
      }));
      setDependencyDialogOpen(false);
      setDependencyActivity(null);
    }
  }, [dependencyActivity]);

  // Helper function to get site alias from site ID
  const getSiteAlias = useCallback((siteId: string, sites: FlowSite[]): string | null => {
    const site = sites.find((s) => s.id === siteId);
    return site ? site.alias : null;
  }, []);

  // Helper function to determine if cross-site dependencies form a coordinated workflow
  const checkIfCoordinatedWorkflow = useCallback(
    (currentActivity: FlowActivityBuilder, dependencies: string[], allActivities: FlowActivityBuilder[]): boolean => {
      // Get all dependent activities
      const dependentActivities = dependencies.map((depId) => allActivities.find((a) => a.id === depId)).filter(Boolean) as FlowActivityBuilder[];

      if (dependentActivities.length === 0) return false;

      // Check if this is a coordinated multi-site workflow
      // Coordinated means: activities that form a logical sequence across sites

      // 1. Check if this is a simple "wait for all sites to complete a phase" pattern
      // This is the most common case for multi-site workflows
      const currentSequence = currentActivity.sequence_order;
      const depSequences = dependentActivities.map((dep) => dep.sequence_order);

      // If current activity comes after all dependencies, it's likely coordinated
      const maxDepSequence = Math.max(...depSequences);
      if (currentSequence > maxDepSequence) {
        // Current activity waits for dependencies to complete = coordinated = CROSS_SITE
        return true;
      }

      // 2. Check if dependencies are from the same sequence order (parallel execution)
      const uniqueDepSequences = new Set(depSequences);
      if (uniqueDepSequences.size === 1) {
        // All dependencies are from the same sequence = coordinated = CROSS_SITE
        return true;
      }

      // 3. Check if this forms a logical workflow sequence
      // (e.g., dismantling → transportation → installation across sites)
      const minDepSequence = Math.min(...depSequences);
      if (currentSequence > minDepSequence && currentSequence <= maxDepSequence + 2) {
        // Current activity is part of a logical sequence = coordinated = CROSS_SITE
        return true;
      }

      // 4. Only set to GLOBAL if it's truly a complex, unrelated workflow
      // (e.g., target site waiting for source site in relocation)
      const hasUnrelatedContext = dependentActivities.some((dep) => {
        // Check if dependency is from a completely different workflow context
        // For example: source vs target sites in relocation
        const depSiteAlias = getSiteAlias(dep.assigned_sites[0], flowBuilder.sites);
        const currentSiteAlias = getSiteAlias(currentActivity.assigned_sites[0], flowBuilder.sites);

        // If one is "Source" and one is "Target", it's GLOBAL
        if (depSiteAlias?.includes("Source") && currentSiteAlias?.includes("Target")) return true;
        if (depSiteAlias?.includes("Target") && currentSiteAlias?.includes("Source")) return true;

        return false;
      });

      if (hasUnrelatedContext) {
        return false; // This will result in GLOBAL scope
      }

      // Default to coordinated (CROSS_SITE) for most multi-site workflows
      return true;
    },
    [flowBuilder.sites, getSiteAlias]
  );

  const handleToggleDependency = useCallback(
    (dependencyId: string) => {
      if (dependencyActivity) {
        setDependencyActivity((prev) => {
          if (!prev) return null;
          const currentDependencies = prev.dependencies || [];
          const newDependencies = currentDependencies.includes(dependencyId) ? currentDependencies.filter((id) => id !== dependencyId) : [...currentDependencies, dependencyId];

          // Determine the appropriate dependency scope based on the dependencies
          let newDependencyScope: "SITE_LOCAL" | "CROSS_SITE" | "GLOBAL" = "SITE_LOCAL";

          if (newDependencies.length > 0) {
            // Check if any dependency is from a different site
            const hasCrossSiteDependency = newDependencies.some((depId) => {
              const depActivity = flowBuilder.activities.find((a) => a.id === depId);
              if (!depActivity) return false;

              // If current activity has no assigned sites, it's GLOBAL
              if (prev.assigned_sites.length === 0) return true;

              // If dependency has no assigned sites, it's GLOBAL
              if (depActivity.assigned_sites.length === 0) return true;

              // Check if dependency is from a different site
              const currentSites = new Set(prev.assigned_sites);
              const depSites = new Set(depActivity.assigned_sites);

              // If there's no overlap in sites, it's a cross-site dependency
              const hasOverlap = Array.from(currentSites).some((siteId) => depSites.has(siteId));
              return !hasOverlap;
            });

            if (hasCrossSiteDependency) {
              // Determine if it's CROSS_SITE (coordinated) or GLOBAL (complex workflow)
              const isCoordinatedMultiSiteWorkflow = checkIfCoordinatedWorkflow(prev, newDependencies, flowBuilder.activities);

              if (isCoordinatedMultiSiteWorkflow) {
                newDependencyScope = "CROSS_SITE";
              } else {
                newDependencyScope = "GLOBAL";
              }
            } else if (newDependencies.length > 1) {
              newDependencyScope = "CROSS_SITE";
            }
          }

          return {
            ...prev,
            dependencies: newDependencies,
            dependency_scope: newDependencyScope,
          };
        });
      }
    },
    [dependencyActivity, flowBuilder.activities, checkIfCoordinatedWorkflow, getSiteAlias]
  );

  const handleSaveFlow = useCallback(async () => {
    try {
      // Validate sequence orders are unique
      const sequenceOrders = flowBuilder.activities.map((a) => a.sequence_order);
      const uniqueSequenceOrders = new Set(sequenceOrders);
      if (sequenceOrders.length !== Array.from(uniqueSequenceOrders).length) {
        alert("Error: Duplicate sequence orders detected. Please ensure each activity has a unique sequence order.");
        return;
      }

      // Create a complete flow template object for the API
      const flowTemplateData: any = {
        name: flowBuilder.name,
        description: flowBuilder.description,
        category: flowBuilder.category,
        is_active: true,
        is_public: false,
        tags: flowBuilder.tags,
        activities: flowBuilder.activities.map((activity) => ({
          sequence_order: activity.sequence_order,
          activity_name: activity.activity_name,
          // Map frontend activity types to backend task types
          activity_type: (() => {
            switch (activity.activity_type) {
              case "DISMANTLE":
                return "dismantling";
              case "INSTALLATION":
                return "installation";
              case "COMMISSIONING":
                return "commissioning";
              case "RF_SURVEY":
                return "rf_survey";
              case "EMF_SURVEY":
                return "emf_survey";
              case "TRANSPORTATION":
                return "transportation";
              case "PACKAGING":
                return "packaging";
              case "DEVIATION_EMAIL":
                return "deviation_email";
              case "RSA":
                return "rsa";
              default:
                return "maintenance"; // Default fallback
            }
          })(),

          requires_site: activity.requires_site,
          requires_equipment: activity.requires_equipment,
          // Map frontend activity IDs to sequence-based dependencies
          dependencies: activity.dependencies
            .map((depId) => {
              // Find the dependent activity by its frontend ID
              const dependentActivity = flowBuilder.activities.find((a) => a.id === depId);
              if (dependentActivity) {
                // Return the sequence order as a string (backend expects string dependencies)
                return dependentActivity.sequence_order.toString();
              }
              return null;
            })
            .filter(Boolean), // Remove any null values
          // Map frontend fields to backend fields
          site_scope: activity.assigned_sites.length === 0 ? "ALL" : activity.assigned_sites.length === 1 ? "SINGLE" : "MULTIPLE",
          // Send site assignments as a separate field
          assigned_sites: activity.assigned_sites.map((siteId) => {
            const site = flowBuilder.sites.find((s) => s.id === siteId);
            return site ? site.alias : "Unknown Site";
          }),
          parallel_execution: activity.parallel_group ? true : false,
          dependency_scope: activity.dependency_scope, // Use the actual dependency scope
          site_coordination: activity.site_coordination || false, // Use the actual site coordination setting
        })),
        // Frontend sites are abstract placeholders for flow organization
        // They don't need to be stored in the backend database
        sites: [],
      };

      let response;
      if (isEditing && flowBuilder.id) {
        // Update existing flow
        response = await FlowService.updateFlowTemplate(flowBuilder.id, flowTemplateData);
      } else {
        // Create new flow
        response = await FlowService.createFlowTemplate(flowTemplateData);
      }

      if (response.success) {
        // Show success message
        alert(`Flow "${flowBuilder.name}" ${isEditing ? "updated" : "created"} successfully!`);

        // Navigate back to flows page
        navigate("/tasks?tab=1"); // Navigate to Flow Templates tab
      } else {
        // Show error message
        alert(`Error ${isEditing ? "updating" : "creating"} flow: ${response.message}`);
      }
    } catch (error) {
      console.error("Error saving flow:", error);
      alert("Error saving flow. Please try again.");
    }
  }, [flowBuilder, navigate, isEditing]);

  // Filter activities based on search term
  const filteredActivities = useCallback(
    (categoryName: string) => {
      return activityTemplates
        .filter((template) => template.category === categoryName)
        .filter((template) => searchTerm === "" || template.name.toLowerCase().includes(searchTerm.toLowerCase()) || template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    },
    [searchTerm]
  );

  // Handle activity reordering
  const handleActivityDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedActivityIndex(index);
    setDragOverIndex(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", "activity-reorder");
  }, []);

  const handleActivityDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      if (draggedActivityIndex !== null && draggedActivityIndex !== index) {
        setDragOverIndex(index);
      }
    },
    [draggedActivityIndex]
  );

  const handleActivityDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear drag over if we're leaving the entire drop zone area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  }, []);

  const handleActivityDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();

      if (draggedActivityIndex === null || draggedActivityIndex === dropIndex) {
        setDraggedActivityIndex(null);
        setDragOverIndex(null);
        return;
      }

      setFlowBuilder((prev) => {
        const newActivities = [...prev.activities];
        const draggedActivity = newActivities[draggedActivityIndex];

        // Remove the dragged activity
        newActivities.splice(draggedActivityIndex, 1);

        // Insert at new position
        const insertIndex = draggedActivityIndex < dropIndex ? dropIndex - 1 : dropIndex;
        newActivities.splice(insertIndex, 0, draggedActivity);

        // Update sequence orders
        const updatedActivities = newActivities.map((activity, index) => ({
          ...activity,
          sequence_order: index,
        }));

        return {
          ...prev,
          activities: updatedActivities,
        };
      });

      setDraggedActivityIndex(null);
      setDragOverIndex(null);
    },
    [draggedActivityIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedActivityIndex(null);
    setDragOverIndex(null);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="h6">Loading flow template...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Header */}
      <Box
        sx={{
          background: "white",
          borderBottom: "1px solid #e0e0e0",
          p: 3,
          position: "sticky",
          top: 0,
          zIndex: 1000,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={() => navigate("/flows")} sx={{ color: "#666" }}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 600, color: "#1a1a1a" }}>
                {isEditing ? "Edit Flow Template" : "Create Flow Template"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Build reusable workflow templates for task creation
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={2}>
            <Button variant="contained" startIcon={<Save />} onClick={handleSaveFlow} disabled={!flowBuilder.name || flowBuilder.activities.length === 0}>
              Save Flow
            </Button>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ p: 3 }}>
        {/* Flow Configuration - Full Width */}
        <Card sx={{ mb: 3, border: "1px solid #e0e0e0", boxShadow: "none" }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Flow Configuration
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Flow Name" value={flowBuilder.name} onChange={(e) => setFlowBuilder((prev) => ({ ...prev, name: e.target.value }))} variant="outlined" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={flowBuilder.category} onChange={(e) => setFlowBuilder((prev) => ({ ...prev, category: e.target.value as FlowCategory }))}>
                    <MenuItem value="DISMANTLING">Dismantling</MenuItem>
                    <MenuItem value="INSTALLATION">Installation</MenuItem>
                    <MenuItem value="RELOCATION">Relocation</MenuItem>
                    <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
                    <MenuItem value="SURVEY">Survey</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Description"
                  value={flowBuilder.description}
                  onChange={(e) => setFlowBuilder((prev) => ({ ...prev, description: e.target.value }))}
                  multiline
                  rows={2}
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <Grid container spacing={3}>
          {/* Activity Catalog */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                border: "1px solid #e0e0e0",
                boxShadow: "none",
                height: "fit-content",
                maxHeight: "80vh",
                overflow: "hidden",
              }}
            >
              <CardContent
                sx={{
                  p: 3,
                  maxHeight: "80vh",
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Activity Catalog
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Drag activities to build your workflow
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: "#666", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />

                <Stack spacing={2}>
                  {Object.entries(categoryConfig).map(([categoryName, config]) => (
                    <Accordion key={categoryName} defaultExpanded disableGutters>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {categoryName}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0 }}>
                        <Stack spacing={1}>
                          {filteredActivities(categoryName).map((template) => (
                            <Paper
                              key={template.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, template)}
                              sx={{
                                p: 2,
                                cursor: "grab",
                                border: "1px solid #e0e0e0",
                                boxShadow: "none",
                                "&:hover": {
                                  borderColor: "#1976d2",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                },
                                "&:active": {
                                  cursor: "grabbing",
                                },
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: template.color,
                                  }}
                                />
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {template.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {template.description}
                                  </Typography>
                                </Box>
                                <DragIndicator sx={{ color: "#ccc", fontSize: 20 }} />
                              </Box>
                            </Paper>
                          ))}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Flow Workflow */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ border: "1px solid #e0e0e0", boxShadow: "none", minHeight: 500 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Flow Workflow
                  </Typography>
                </Box>

                {/* Site Management Tabs */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    {/* All Sites Tab */}
                    <Button
                      variant={builderState.selectedSiteId === null ? "contained" : "outlined"}
                      size="small"
                      onClick={() => setBuilderState((prev) => ({ ...prev, selectedSiteId: null }))}
                      sx={{
                        minWidth: "auto",
                        px: 2,
                        py: 0.5,
                        backgroundColor: builderState.selectedSiteId === null ? "#ff9800" : "transparent",
                        borderColor: "#ff9800",
                        color: builderState.selectedSiteId === null ? "white" : "#ff9800",
                        "&:hover": {
                          backgroundColor: builderState.selectedSiteId === null ? "#f57c00" : "rgba(255, 152, 0, 0.1)",
                        },
                      }}
                    >
                      All sites
                    </Button>

                    {/* Individual Site Tabs */}
                    {flowBuilder.sites.map((site) => (
                      <Button
                        key={site.id}
                        variant={builderState.selectedSiteId === site.id ? "contained" : "outlined"}
                        size="small"
                        onClick={() => setBuilderState((prev) => ({ ...prev, selectedSiteId: site.id }))}
                        onContextMenu={(e) => handleSiteContextMenu(e, site)}
                        sx={{
                          minWidth: "auto",
                          px: 2,
                          py: 0.5,
                        }}
                      >
                        Site {String.fromCharCode(65 + site.order)}: {site.alias}
                      </Button>
                    ))}

                    {/* Add Site Button */}
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setBuilderState((prev) => ({ ...prev, showAddSiteDialog: true }))}
                      sx={{
                        minWidth: "auto",
                        px: 2,
                        py: 0.5,
                        borderStyle: "dashed",
                        color: "#666",
                        borderColor: "#ccc",
                        "&:hover": {
                          borderColor: "#1976d2",
                          color: "#1976d2",
                        },
                      }}
                    >
                      Add Site
                    </Button>
                  </Box>

                  {/* Current Context Indicator */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {builderState.selectedSiteId === null
                      ? "Activities dropped here will apply to all sites"
                      : `Activities dropped here will be assigned to ${flowBuilder.sites.find((s) => s.id === builderState.selectedSiteId)?.alias || "selected site"}`}
                  </Typography>
                </Box>

                <Paper
                  sx={{
                    minHeight: 400,
                    p: 3,
                    border: flowBuilder.activities.length === 0 ? "2px dashed #ccc" : "1px solid #e0e0e0",
                    background: flowBuilder.activities.length === 0 ? "#fafafa" : "white",
                    boxShadow: "none",
                  }}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {flowBuilder.activities.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 8 }}>
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                        Drop activities here to build your workflow
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Drag activities from the catalog to create your reusable flow template
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1.5}>
                      {flowBuilder.activities.map((activity, index) => {
                        const template = activityTemplates.find((t) => t.id === activity.template_id);
                        const isDragging = draggedActivityIndex === index;
                        const isDropTarget = dragOverIndex === index && draggedActivityIndex !== null && draggedActivityIndex !== index;

                        return (
                          <React.Fragment key={activity.id}>
                            {/* Drop Zone Indicator - Top */}
                            {isDropTarget && draggedActivityIndex !== null && draggedActivityIndex > index && (
                              <Box
                                sx={{
                                  height: 4,
                                  backgroundColor: "#1976d2",
                                  borderRadius: 2,
                                  mx: 2,
                                  animation: "pulse 1s infinite",
                                  "@keyframes pulse": {
                                    "0%": { opacity: 0.6 },
                                    "50%": { opacity: 1 },
                                    "100%": { opacity: 0.6 },
                                  },
                                }}
                              />
                            )}

                            <Paper
                              draggable
                              onDragStart={(e) => handleActivityDragStart(e, index)}
                              onDragOver={(e) => handleActivityDragOver(e, index)}
                              onDragLeave={handleActivityDragLeave}
                              onDrop={(e) => handleActivityDrop(e, index)}
                              onDragEnd={handleDragEnd}
                              sx={{
                                p: 2,
                                border: isDragging ? "2px dashed #1976d2" : "1px solid #e0e0e0",
                                boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
                                borderRadius: 2,
                                opacity: isDragging ? 0.7 : 1,
                                cursor: "grab",
                                transform: isDragging ? "rotate(2deg)" : "none",
                                "&:hover": {
                                  borderColor: "#1976d2",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                },
                                "&:active": {
                                  cursor: "grabbing",
                                },
                                transition: "all 0.2s ease",
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                {/* Drag Handle */}
                                <DragIndicator
                                  sx={{
                                    color: "#ccc",
                                    fontSize: 16,
                                    cursor: "grab",
                                    "&:hover": { color: "#1976d2" },
                                  }}
                                />

                                {/* Step Number */}
                                <Box
                                  sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    background: "#1976d2",
                                    color: "white",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    flexShrink: 0,
                                  }}
                                >
                                  {index + 1}
                                </Box>

                                {/* Activity Content */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                      {activity.activity_name}
                                    </Typography>
                                    <Chip label={activity.activity_type} size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />

                                    {/* Site Assignment Chips */}
                                    {activity.assigned_sites.length === 0 ? (
                                      <Chip
                                        label="All sites"
                                        size="small"
                                        sx={{
                                          fontSize: "0.7rem",
                                          height: 20,
                                          backgroundColor: "#ff9800",
                                          color: "white",
                                          "& .MuiChip-label": { px: 1 },
                                        }}
                                      />
                                    ) : (
                                      activity.assigned_sites.map((siteId) => {
                                        const site = flowBuilder.sites.find((s) => s.id === siteId);
                                        return site ? (
                                          <Chip
                                            key={siteId}
                                            label={`Site ${String.fromCharCode(65 + site.order)}: ${site.alias}`}
                                            size="small"
                                            sx={{
                                              fontSize: "0.7rem",
                                              height: 20,
                                              backgroundColor: "#1976d2",
                                              color: "white",
                                              "& .MuiChip-label": { px: 1 },
                                            }}
                                          />
                                        ) : null;
                                      })
                                    )}

                                    {activity.dependencies && activity.dependencies.length > 0 && (
                                      <Chip
                                        label={`Depends on: ${activity.dependencies
                                          .map((depId) => {
                                            const depActivity = flowBuilder.activities.find((a) => a.id === depId);
                                            if (!depActivity) return null;

                                            // Add site information to dependency name
                                            if (depActivity.assigned_sites.length === 0) {
                                              return `${depActivity.activity_name} (All sites)`;
                                            } else if (depActivity.assigned_sites.length === 1) {
                                              const site = flowBuilder.sites.find((s) => s.id === depActivity.assigned_sites[0]);
                                              return site ? `${depActivity.activity_name} (Site ${String.fromCharCode(65 + site.order)}: ${site.alias})` : depActivity.activity_name;
                                            } else {
                                              // Multiple sites - show count
                                              return `${depActivity.activity_name} (${depActivity.assigned_sites.length} sites)`;
                                            }
                                          })
                                          .filter(Boolean)
                                          .join(", ")}`}
                                        size="small"
                                        color={activity.dependency_scope === "GLOBAL" ? "error" : activity.dependency_scope === "CROSS_SITE" ? "warning" : "primary"}
                                        variant="outlined"
                                        sx={{
                                          fontSize: "0.7rem",
                                          height: 20,
                                          borderColor: activity.dependency_scope === "GLOBAL" ? "#f44336" : activity.dependency_scope === "CROSS_SITE" ? "#ff9800" : "#1976d2",
                                          "& .MuiChip-label": {
                                            px: 1,
                                            color: activity.dependency_scope === "GLOBAL" ? "#f44336" : activity.dependency_scope === "CROSS_SITE" ? "#ff9800" : "#1976d2",
                                          },
                                        }}
                                        title={`Dependency Scope: ${activity.dependency_scope}`}
                                      />
                                    )}
                                  </Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                                    {activity.description}
                                  </Typography>
                                </Box>

                                {/* Actions */}
                                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleManageDependencies(activity)}
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      color: activity.dependencies && activity.dependencies.length > 0 ? "#1976d2" : "#666",
                                    }}
                                  >
                                    <AccountTree fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleDuplicateActivity(activity)} sx={{ width: 28, height: 28, color: "#666" }}>
                                    <ContentCopy fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleEditActivity(activity)} sx={{ width: 28, height: 28, color: "#666" }}>
                                    <Edit fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small" onClick={() => handleRemoveActivity(activity.id)} sx={{ width: 28, height: 28, color: "#666" }}>
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </Box>
                            </Paper>

                            {/* Drop Zone Indicator - Bottom */}
                            {isDropTarget && draggedActivityIndex !== null && draggedActivityIndex < index && (
                              <Box
                                sx={{
                                  height: 4,
                                  backgroundColor: "#1976d2",
                                  borderRadius: 2,
                                  mx: 2,
                                  animation: "pulse 1s infinite",
                                  "@keyframes pulse": {
                                    "0%": { opacity: 0.6 },
                                    "50%": { opacity: 1 },
                                    "100%": { opacity: 0.6 },
                                  },
                                }}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Drop Zone at the end of the list */}
                      {draggedActivityIndex !== null && (
                        <Box
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverIndex(flowBuilder.activities.length);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleActivityDrop(e, flowBuilder.activities.length);
                          }}
                          sx={{
                            height: dragOverIndex === flowBuilder.activities.length ? 40 : 20,
                            borderRadius: 2,
                            border: dragOverIndex === flowBuilder.activities.length ? "2px dashed #1976d2" : "2px dashed transparent",
                            backgroundColor: dragOverIndex === flowBuilder.activities.length ? "rgba(25, 118, 210, 0.1)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                            mx: 2,
                          }}
                        >
                          {dragOverIndex === flowBuilder.activities.length && (
                            <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                              Drop here to add at the end
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Stack>
                  )}
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Edit Activity Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Activity</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Activity Name"
              value={editingActivity?.activity_name || ""}
              onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, activity_name: e.target.value } : null))}
            />
            <TextField
              fullWidth
              label="Description"
              value={editingActivity?.description || ""}
              onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, description: e.target.value } : null))}
              multiline
              rows={3}
            />

            {/* Site Assignment */}
            {flowBuilder.sites.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Site Assignment
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select which sites this activity applies to. Leave none selected for "All sites".
                </Typography>
                <Stack spacing={1}>
                  {/* All Sites Option */}
                  <Paper
                    sx={{
                      p: 2,
                      border: (editingActivity?.assigned_sites?.length || 0) === 0 ? "2px solid #ff9800" : "1px solid #e0e0e0",
                      cursor: "pointer",
                      "&:hover": {
                        borderColor: "#ff9800",
                        backgroundColor: "#fff3e0",
                      },
                    }}
                    onClick={() => setEditingActivity((prev) => (prev ? { ...prev, assigned_sites: [] } : null))}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {(editingActivity?.assigned_sites?.length || 0) === 0 ? <CheckBox color="primary" /> : <CheckBoxOutlineBlank />}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          All Sites
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          This activity will apply to all sites in the flow
                        </Typography>
                      </Box>
                      <Chip
                        label="All sites"
                        size="small"
                        sx={{
                          backgroundColor: "#ff9800",
                          color: "white",
                        }}
                      />
                    </Box>
                  </Paper>

                  {/* Individual Site Options */}
                  {flowBuilder.sites.map((site) => {
                    const isSelected = editingActivity?.assigned_sites?.includes(site.id) || false;
                    return (
                      <Paper
                        key={site.id}
                        sx={{
                          p: 2,
                          border: isSelected ? "2px solid #1976d2" : "1px solid #e0e0e0",
                          cursor: "pointer",
                          "&:hover": {
                            borderColor: "#1976d2",
                            backgroundColor: "#f5f5f5",
                          },
                        }}
                        onClick={() => {
                          setEditingActivity((prev) => {
                            if (!prev) return null;
                            const currentSites = prev.assigned_sites || [];
                            const newSites = isSelected ? currentSites.filter((id) => id !== site.id) : [...currentSites, site.id];
                            return { ...prev, assigned_sites: newSites };
                          });
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          {isSelected ? <CheckBox color="primary" /> : <CheckBoxOutlineBlank />}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              Site {String.fromCharCode(65 + site.order)}: {site.alias}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              This activity will be assigned specifically to {site.alias}
                            </Typography>
                          </Box>
                          <Chip
                            label={`Site ${String.fromCharCode(65 + site.order)}: ${site.alias}`}
                            size="small"
                            sx={{
                              backgroundColor: "#1976d2",
                              color: "white",
                            }}
                          />
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEditedActivity} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dependency Management Dialog */}
      <Dialog open={dependencyDialogOpen} onClose={() => setDependencyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Manage Dependencies - {dependencyActivity?.activity_name}
          {dependencyActivity && (
            <>
              {dependencyActivity.assigned_sites.length === 0 ? (
                <Chip
                  label="All sites"
                  size="small"
                  sx={{
                    ml: 1,
                    fontSize: "0.7rem",
                    backgroundColor: "#ff9800",
                    color: "white",
                  }}
                />
              ) : dependencyActivity.assigned_sites.length === 1 ? (
                (() => {
                  const site = flowBuilder.sites.find((s) => s.id === dependencyActivity.assigned_sites[0]);
                  return site ? (
                    <Chip
                      label={`Site ${String.fromCharCode(65 + site.order)}: ${site.alias}`}
                      size="small"
                      sx={{
                        ml: 1,
                        fontSize: "0.7rem",
                        backgroundColor: "#1976d2",
                        color: "white",
                      }}
                    />
                  ) : null;
                })()
              ) : (
                <Chip
                  label={`${dependencyActivity.assigned_sites.length} sites`}
                  size="small"
                  sx={{
                    ml: 1,
                    fontSize: "0.7rem",
                    backgroundColor: "#1976d2",
                    color: "white",
                  }}
                />
              )}
              {/* Dependency Scope Indicator */}
              <Chip
                label={`Scope: ${dependencyActivity.dependency_scope}`}
                size="small"
                sx={{
                  ml: 1,
                  fontSize: "0.7rem",
                  backgroundColor: dependencyActivity.dependency_scope === "GLOBAL" ? "#f44336" : dependencyActivity.dependency_scope === "CROSS_SITE" ? "#ff9800" : "#4caf50",
                  color: "white",
                }}
              />
            </>
          )}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select which activities must be completed before "
            <strong>
              {dependencyActivity?.activity_name}
              {dependencyActivity && (
                <>
                  {dependencyActivity.assigned_sites.length === 0
                    ? " (All sites)"
                    : dependencyActivity.assigned_sites.length === 1
                    ? (() => {
                        const site = flowBuilder.sites.find((s) => s.id === dependencyActivity.assigned_sites[0]);
                        return site ? ` (Site ${String.fromCharCode(65 + site.order)}: ${site.alias})` : "";
                      })()
                    : ` (${dependencyActivity.assigned_sites.length} sites)`}
                </>
              )}
            </strong>
            " can start.
          </Typography>

          {/* Dependency Scope Explanation */}
          <Box sx={{ mb: 3, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              Dependency Scope: {dependencyActivity?.dependency_scope}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
              {dependencyActivity?.dependency_scope === "SITE_LOCAL" &&
                "Dependencies will only be checked within the same site. This activity waits for other activities at the same site to complete."}
              {dependencyActivity?.dependency_scope === "CROSS_SITE" &&
                "Coordinated multi-site dependencies. This activity waits for the same type of activity to complete across multiple sites before proceeding. Use this for parallel workflows where all sites need to complete a step together."}
              {dependencyActivity?.dependency_scope === "GLOBAL" &&
                "Complex cross-site dependencies. This activity waits for activities from different workflow phases or contexts to complete. Use this for complex workflows that span multiple site contexts and workflow phases."}
            </Typography>
          </Box>
          <Stack spacing={2}>
            {flowBuilder.activities
              .filter((activity) => activity.id !== dependencyActivity?.id)
              .map((activity) => {
                const isSelected = dependencyActivity?.dependencies?.includes(activity.id) || false;
                return (
                  <Paper
                    key={activity.id}
                    sx={{
                      p: 2,
                      border: isSelected ? "2px solid #1976d2" : "1px solid #e0e0e0",
                      cursor: "pointer",
                      "&:hover": {
                        borderColor: "#1976d2",
                        backgroundColor: "#f5f5f5",
                      },
                    }}
                    onClick={() => handleToggleDependency(activity.id)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {isSelected ? <CheckBox color="primary" /> : <CheckBoxOutlineBlank />}
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {activity.activity_name}
                          </Typography>
                          <Chip label={activity.activity_type} size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />

                          {/* Site Assignment Chips */}
                          {activity.assigned_sites.length === 0 ? (
                            <Chip
                              label="All sites"
                              size="small"
                              sx={{
                                fontSize: "0.7rem",
                                height: 20,
                                backgroundColor: "#ff9800",
                                color: "white",
                                "& .MuiChip-label": { px: 1 },
                              }}
                            />
                          ) : (
                            activity.assigned_sites.map((siteId) => {
                              const site = flowBuilder.sites.find((s) => s.id === siteId);
                              return site ? (
                                <Chip
                                  key={siteId}
                                  label={`Site ${String.fromCharCode(65 + site.order)}: ${site.alias}`}
                                  size="small"
                                  sx={{
                                    fontSize: "0.7rem",
                                    height: 20,
                                    backgroundColor: "#1976d2",
                                    color: "white",
                                    "& .MuiChip-label": { px: 1 },
                                  }}
                                />
                              ) : null;
                            })
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {activity.description}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            {flowBuilder.activities.filter((activity) => activity.id !== dependencyActivity?.id).length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                No other activities available to set as dependencies.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDependencyDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveDependencies} variant="contained">
            Save Dependencies
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Site Dialog */}
      <Dialog open={builderState.showAddSiteDialog} onClose={() => setBuilderState((prev) => ({ ...prev, showAddSiteDialog: false }))} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Site</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Add a new site to your flow with a custom alias name.
          </Typography>
          <TextField
            fullWidth
            label="Site Alias"
            placeholder="e.g., Far-end, Near-end, Source, Target"
            value={newSiteAlias}
            onChange={(e) => setNewSiteAlias(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleAddSite();
              }
            }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setBuilderState((prev) => ({ ...prev, showAddSiteDialog: false }));
              setNewSiteAlias("");
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleAddSite} variant="contained" disabled={!newSiteAlias.trim()}>
            Add Site
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Site Dialog */}
      <Dialog open={builderState.showEditSiteDialog} onClose={() => setBuilderState((prev) => ({ ...prev, showEditSiteDialog: false, editingSite: null }))} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Site</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Update the alias name for this site.
          </Typography>
          <TextField
            fullWidth
            label="Site Alias"
            value={builderState.editingSite?.alias || ""}
            onChange={(e) =>
              setBuilderState((prev) => ({
                ...prev,
                editingSite: prev.editingSite ? { ...prev.editingSite, alias: e.target.value } : null,
              }))
            }
            onKeyPress={(e) => {
              if (e.key === "Enter" && builderState.editingSite) {
                handleEditSite(builderState.editingSite, builderState.editingSite.alias);
              }
            }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBuilderState((prev) => ({ ...prev, showEditSiteDialog: false, editingSite: null }))}>Cancel</Button>
          <Button
            onClick={() => {
              if (builderState.editingSite) {
                handleEditSite(builderState.editingSite, builderState.editingSite.alias);
              }
            }}
            variant="contained"
            disabled={!builderState.editingSite?.alias.trim()}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Site Context Menu */}
      <Menu
        open={siteContextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={siteContextMenu !== null ? { top: siteContextMenu.mouseY, left: siteContextMenu.mouseX } : undefined}
      >
        <MenuItem
          onClick={() => {
            if (siteContextMenu) {
              setBuilderState((prev) => ({
                ...prev,
                showEditSiteDialog: true,
                editingSite: siteContextMenu.site,
              }));
              setSiteContextMenu(null);
            }
          }}
        >
          <Edit sx={{ mr: 1, fontSize: 18 }} />
          Edit Site
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (siteContextMenu) {
              handleDeleteSite(siteContextMenu.site.id);
            }
          }}
          sx={{ color: "error.main" }}
        >
          <Delete sx={{ mr: 1, fontSize: 18 }} />
          Delete Site
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default FlowBuilderPage;

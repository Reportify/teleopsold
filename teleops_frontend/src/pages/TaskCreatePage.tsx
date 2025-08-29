// Task Creation Page - Flow-Based Task Builder
import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Grid,
  TextField,
  MenuItem,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormControlLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormGroup,
  Tooltip,
  Autocomplete,
  LinearProgress,
} from "@mui/material";
import {
  ArrowBack,
  DragIndicator,
  Add,
  Delete,
  Edit,
  LocationOn,
  Business,
  People,
  PlayArrow,
  CheckCircle,
  ExpandMore,
  Warning,
  Info,
  Search,
  FilterList,
  Preview,
  Save,
  Refresh,
  Upload,
  Download,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { TaskType, ActivityType, AssignmentType } from "../types/task";
import { FlowTemplate, FlowActivity } from "../types/flow";
import { FlowService } from "../services/flowService";
import projectService, { Project } from "../services/projectService";
import siteService, { ProjectSite, Site } from "../services/siteService";
import { API_ENDPOINTS } from "../services/api";
import { AuthService } from "../services/authService";

// Backend flow activity interface with assigned_sites and dependency info
interface BackendFlowActivity extends Omit<FlowActivity, "id" | "dependencies"> {
  id: string;
  dependencies?: string[];
  assigned_sites?: {
    id: string;
    flow_site: {
      id: string;
      alias: string;
      order: number;
    };
    is_required: boolean;
    execution_order: number;
  }[];
  // Add dependency-related fields that exist in the backend
  dependency_scope?: "SITE_LOCAL" | "CROSS_SITE" | "GLOBAL";
  parallel_execution?: boolean;
}

// New interfaces for flow-based task creation
interface TaskFromFlowPreview {
  task_id: string;
  task_name: string;
  project_name: string;
  flow_template_name: string;
  site_groups: TaskSiteGroupPreview[];
  sub_activities: TaskSubActivityPreview[];
}

interface TaskSiteGroupPreview {
  site_alias: string;
  site_name: string;
  site_global_id: string;
}

interface TaskSubActivityPreview {
  sequence_order: number;
  activity_name: string;
  activity_type: string;
  site_alias: string;
  dependencies: string[];
  dependency_scope: "SITE_LOCAL" | "CROSS_SITE" | "GLOBAL";
  parallel_execution: boolean;
}

interface SiteGroupConfig {
  sites: { [alias: string]: number }; // alias -> project_site_id mapping
  task_name?: string;
  client_task_id?: string;
}

interface TaskCreationConfig {
  flow_template_id: string;
  project_id: number; // Backend now accepts numeric IDs to match Project model
  site_groups: SiteGroupConfig[];
  task_naming: {
    auto_id_prefix?: string;
    auto_id_start?: number;
  };
}

// Activity Templates
interface ActivityTemplate {
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
}

interface SubActivityBuilder {
  id: string;
  template_id: string;
  name: string;
  activity_type: ActivityType;
  sequence_order: number;
  assignment_type: AssignmentType;
  estimated_hours: number;
  dependencies: string[];
  site_associations: string[];
  notes?: string;
}

interface TaskBuilder {
  task_name: string;
  task_type: TaskType;
  project_id: number;
  project_name: string;
  client_name: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  sites: SiteSelection[];
  sub_activities: SubActivityBuilder[];
  estimated_total_hours: number;
}

interface SiteSelection {
  id: string;
  site_id: number;
  site_name: string;
  site_role: string;
  address: string;
  selected: boolean;
}

// Mock data
const activityTemplates: ActivityTemplate[] = [
  {
    id: "dismantle",
    name: "Site Dismantling",
    activity_type: "DISMANTLE",
    description: "Remove equipment and infrastructure from site",
    icon: <Delete color="error" />,
    estimated_hours: 8,
    requires_site: true,
    requires_equipment: true,
    color: "#f44336",
    category: "Field Work",
  },
  {
    id: "packaging",
    name: "Equipment Packaging",
    activity_type: "PACKAGING",
    description: "Package dismantled equipment for transport",
    icon: <Business color="primary" />,
    estimated_hours: 4,
    requires_site: false,
    requires_equipment: true,
    color: "#2196f3",
    category: "Logistics",
  },
  {
    id: "transport",
    name: "Equipment Transportation",
    activity_type: "TRANSPORTATION",
    description: "Transport equipment to warehouse or destination",
    icon: <PlayArrow color="success" />,
    estimated_hours: 4,
    requires_site: false,
    requires_equipment: true,
    color: "#4caf50",
    category: "Logistics",
  },
  {
    id: "rf_survey",
    name: "RF Survey",
    activity_type: "RF_SURVEY",
    description: "Conduct radio frequency survey and analysis",
    icon: <CheckCircle color="info" />,
    estimated_hours: 3,
    requires_site: true,
    requires_equipment: false,
    color: "#00bcd4",
    category: "Technical",
  },
  {
    id: "installation",
    name: "Equipment Installation",
    activity_type: "INSTALLATION",
    description: "Install and configure new equipment",
    icon: <Add color="success" />,
    estimated_hours: 12,
    requires_site: true,
    requires_equipment: true,
    color: "#8bc34a",
    category: "Field Work",
  },
  {
    id: "commissioning",
    name: "System Commissioning",
    activity_type: "COMMISSIONING",
    description: "Test and commission installed systems",
    icon: <CheckCircle color="success" />,
    estimated_hours: 6,
    requires_site: true,
    requires_equipment: false,
    color: "#4caf50",
    category: "Technical",
  },
];

// Removed mock data - now using API calls

const TaskCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [flowTemplates, setFlowTemplates] = useState<FlowTemplate[]>([]);
  const [selectedFlowTemplate, setSelectedFlowTemplate] = useState<FlowTemplate | null>(null);
  const [loadingFlows, setLoadingFlows] = useState(false);

  // API data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
  const [loadingProjectSites, setLoadingProjectSites] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Site management state
  const [siteSearchTerm, setSiteSearchTerm] = useState("");
  const [siteTownFilter, setSiteTownFilter] = useState<string>("all");
  const [siteClusterFilter, setSiteClusterFilter] = useState<string>("all");

  // New state for flow-based task creation
  const [siteGroups, setSiteGroups] = useState<SiteGroupConfig[]>([]);
  const [taskNaming, setTaskNaming] = useState({
    auto_id_prefix: "",
    auto_id_start: 1,
  });
  const [taskPreview, setTaskPreview] = useState<TaskFromFlowPreview[]>([]);
  const [loadingTaskCreation, setLoadingTaskCreation] = useState(false);
  const [showTaskPreview, setShowTaskPreview] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [uploadingBulkData, setUploadingBulkData] = useState(false);
  const [bulkUploadJobId, setBulkUploadJobId] = useState<number | null>(null);
  const [jobPollingInterval, setJobPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [uploadResults, setUploadResults] = useState<{
    message: string;
    status: string;
    summary: {
      total_rows: number;
      success_count: number;
      error_count: number;
    };
    errors: any[];
  } | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Progress tracking state (following ProjectSitesImportPage pattern)
  const [isAsyncUpload, setIsAsyncUpload] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState(false);

  // Legacy task builder state (keeping for compatibility)
  const [taskBuilder, setTaskBuilder] = useState<TaskBuilder>({
    task_name: "",
    task_type: "2G_DISMANTLE",
    project_id: 0,
    project_name: "",
    client_name: "",
    description: "",
    priority: "Medium",
    sites: [],
    sub_activities: [],
    estimated_total_hours: 0,
  });

  const [draggedActivity, setDraggedActivity] = useState<ActivityTemplate | null>(null);
  const [editingActivity, setEditingActivity] = useState<SubActivityBuilder | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const steps = ["Project & Basic Info", "Select Flow Template", "Configure Task Creation", "Review & Create"];

  // Add CSS for custom spinner
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Cleanup polling when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (jobPollingInterval) {
        clearInterval(jobPollingInterval);
        setJobPollingInterval(null);
      }
      setIsPolling(false);
      setIsAsyncUpload(false);
    };
  }, [jobPollingInterval]);

  // Load popular flow templates
  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load projects and flow templates in parallel
        const [projectsPromise, flowsPromise] = await Promise.allSettled([loadProjects(), loadFlowTemplates()]);

        if (projectsPromise.status === "rejected") {
          console.error("Failed to load projects:", projectsPromise.reason);
        }
        if (flowsPromise.status === "rejected") {
          console.error("Failed to load flow templates:", flowsPromise.reason);
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
        setApiError("Failed to load initial data. Please refresh the page.");
      }
    };

    loadInitialData();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopJobPolling();
    };
  }, []);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      setApiError(null);

      try {
        const response = await projectService.list({ page_size: 100 });
        const projectsData = Array.isArray(response) ? response : response.results || [];
        setProjects(projectsData);
      } catch (apiError) {
        console.warn("Projects API call failed, using mock data:", apiError);

        // Mock projects data for development
        const mockProjects = [
          {
            id: 101,
            name: "2G Network Decommissioning Phase 1",
            description: "Decommissioning of legacy 2G infrastructure across multiple sites",
            project_type: "dismantle" as const,
            status: "active" as const,
            client_tenant: 1,
            client_tenant_name: "Bharti Airtel Ltd",
            customer_name: "Bharti Airtel Ltd",
            circle: "Delhi",
            activity: "Network Decommissioning",
            start_date: "2024-01-15",
            end_date: "2024-06-30",
            scope: "2G BSC and BTS removal",
            created_by_name: "System Admin",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
          {
            id: 102,
            name: "MW Network Expansion Project",
            description: "Microwave network expansion for 4G/5G rollout",
            project_type: "dismantle" as const,
            status: "planning" as const,
            client_tenant: 2,
            client_tenant_name: "Reliance Jio",
            customer_name: "Reliance Jio",
            circle: "Mumbai",
            activity: "MW Infrastructure Setup",
            start_date: "2024-03-01",
            end_date: "2024-12-31",
            scope: "MW link installation and commissioning",
            created_by_name: "Project Manager",
            created_at: "2024-02-01T00:00:00Z",
            updated_at: "2024-02-01T00:00:00Z",
          },
          {
            id: 103,
            name: "L900 Band Network Rollout",
            description: "L900 band deployment for improved coverage",
            project_type: "dismantle" as const,
            status: "active" as const,
            client_tenant: 3,
            client_tenant_name: "Vodafone Idea",
            customer_name: "Vodafone Idea",
            circle: "Karnataka",
            activity: "L900 Installation & Commissioning",
            start_date: "2024-02-01",
            end_date: "2024-08-31",
            scope: "L900 equipment installation",
            created_by_name: "Technical Lead",
            created_at: "2024-01-15T00:00:00Z",
            updated_at: "2024-01-15T00:00:00Z",
          },
        ];

        setProjects(mockProjects);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      setApiError("Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadFlowTemplates = async () => {
    try {
      setLoadingFlows(true);
      const response = await FlowService.getFlowTemplates();
      if (response.success) {
        setFlowTemplates(response.data);
        // Auto-select the most popular template
        if (response.data.length > 0) {
          setSelectedFlowTemplate(response.data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load flow templates", error);
    } finally {
      setLoadingFlows(false);
    }
  };

  const loadProjectSites = async (projectId: number) => {
    try {
      setLoadingProjectSites(true);
      setApiError(null);

      console.log("Loading project sites for project:", projectId);
      const response = await siteService.listProjectSites(projectId, { page_size: 100 });
      console.log("Raw API response:", response);

      const sitesData = Array.isArray(response) ? response : response.results || [];
      console.log("Processed sites data:", sitesData);

      setProjectSites(sitesData);

      // Update taskBuilder sites - handle both API and mock data structures
      const siteBuilders: SiteSelection[] = sitesData
        .filter((projectSite) => projectSite.site_details || projectSite.site) // Filter out entries without site data
        .map((projectSite) => {
          // Handle real API response structure (site_details) vs mock structure (site)
          const siteData = projectSite.site_details || projectSite.site!; // Non-null assertion since we filtered above

          const siteName = siteData.site_name || siteData.name || "";
          const siteId = siteData.site_id || "";
          const role = projectSite.role || (projectSite.is_active ? "primary" : "far_end"); // fallback role logic

          return {
            id: siteData.id.toString(),
            site_id: parseInt(siteId) || siteData.id, // Convert to number to match SiteSelection interface
            site_name: siteName,
            site_role: role,
            address: siteData.address || siteData.town || "",
            selected: false,
          };
        });

      console.log("Site builders:", siteBuilders);

      setTaskBuilder((prev) => ({
        ...prev,
        sites: siteBuilders,
      }));
    } catch (error) {
      console.error("Failed to load project sites:", error);
      setApiError("Failed to load project sites");
    } finally {
      setLoadingProjectSites(false);
    }
  };

  // Filter project sites based on search and filters
  const getFilteredProjectSites = () => {
    return projectSites.filter((projectSite) => {
      // Handle both API and mock data structures
      const siteData = projectSite.site_details || projectSite.site;
      if (!siteData) return false; // Skip items without site data

      const siteName = siteData.site_name || siteData.name || "";
      const siteId = siteData.site_id || "";
      const cluster = siteData.cluster || siteData.circle || siteData.zone || "";
      const town = siteData.town || siteData.address || "";

      const matchesSearch =
        siteSearchTerm === "" ||
        siteName.toLowerCase().includes(siteSearchTerm.toLowerCase()) ||
        siteId.toLowerCase().includes(siteSearchTerm.toLowerCase()) ||
        cluster.toLowerCase().includes(siteSearchTerm.toLowerCase()) ||
        town.toLowerCase().includes(siteSearchTerm.toLowerCase());

      const matchesTown = siteTownFilter === "all" || town === siteTownFilter;
      const matchesCluster = siteClusterFilter === "all" || cluster === siteClusterFilter;

      return matchesSearch && matchesTown && matchesCluster;
    });
  };

  // Drag and Drop handlers
  const handleDragStart = (activity: ActivityTemplate) => {
    setDraggedActivity(activity);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedActivity) {
      const newSubActivity: SubActivityBuilder = {
        id: `${draggedActivity.id}_${Date.now()}`,
        template_id: draggedActivity.id,
        name: draggedActivity.name,
        activity_type: draggedActivity.activity_type,
        sequence_order: taskBuilder.sub_activities.length + 1,
        assignment_type: "VENDOR_ALLOCATION",
        estimated_hours: draggedActivity.estimated_hours,
        dependencies: [],
        site_associations: [],
        notes: "",
      };

      setTaskBuilder((prev) => ({
        ...prev,
        sub_activities: [...prev.sub_activities, newSubActivity],
        estimated_total_hours: prev.estimated_total_hours + draggedActivity.estimated_hours,
      }));
    }
    setDraggedActivity(null);
  };

  const handleRemoveActivity = (activityId: string) => {
    const activity = taskBuilder.sub_activities.find((a) => a.id === activityId);
    if (activity) {
      setTaskBuilder((prev) => ({
        ...prev,
        sub_activities: prev.sub_activities.filter((a) => a.id !== activityId),
        estimated_total_hours: prev.estimated_total_hours - activity.estimated_hours,
      }));
    }
  };

  const handleEditActivity = (activity: SubActivityBuilder) => {
    setEditingActivity(activity);
    setEditDialogOpen(true);
  };

  const handleSaveActivity = () => {
    if (editingActivity) {
      setTaskBuilder((prev) => ({
        ...prev,
        sub_activities: prev.sub_activities.map((a) => (a.id === editingActivity.id ? editingActivity : a)),
      }));
    }
    setEditDialogOpen(false);
    setEditingActivity(null);
  };

  const handleProjectChange = async (projectId: number) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setTaskBuilder((prev) => ({
        ...prev,
        project_id: projectId,
        project_name: project.name,
        client_name: project.client_tenant_name || project.customer_name || "",
        task_type: project.project_type === "dismantle" ? "2G_DISMANTLE" : "INSTALLATION_COMMISSIONING",
      }));

      // Load sites for this project
      await loadProjectSites(projectId);
    }
  };

  const handleSiteToggle = (siteId: string) => {
    setTaskBuilder((prev) => ({
      ...prev,
      sites: prev.sites.map((site) => (site.id === siteId ? { ...site, selected: !site.selected } : site)),
    }));
  };

  // New functions for flow-based task creation
  const generateSiteGroups = useCallback(() => {
    if (!selectedFlowTemplate || !projectSites.length) return;

    // Get required site aliases from flow template
    const requiredAliases = selectedFlowTemplate.sites?.map((site) => site.alias) || [];

    // Create initial site group
    const group: SiteGroupConfig = {
      sites: {},
      task_name: undefined,
      client_task_id: undefined,
    };

    requiredAliases.forEach((alias) => {
      // Find the first available site for this alias
      const availableSite = projectSites.find((site) => !Object.values(group.sites).includes(site.id));

      if (availableSite) {
        group.sites[alias] = availableSite.id;
      }
    });

    if (Object.keys(group.sites).length > 0) {
      setSiteGroups([group]);
    }
  }, [selectedFlowTemplate, projectSites]);

  const handleAddSiteGroup = useCallback(() => {
    if (!selectedFlowTemplate) return;

    const requiredAliases = selectedFlowTemplate.sites?.map((site) => site.alias) || [];
    const newGroup: SiteGroupConfig = {
      sites: {},
      task_name: undefined,
      client_task_id: undefined,
    };

    // Initialize with empty sites - user will select them
    requiredAliases.forEach((alias) => {
      newGroup.sites[alias] = 0; // 0 means no site selected yet
    });

    setSiteGroups((prev) => [...prev, newGroup]);
  }, [selectedFlowTemplate]);

  const handleRemoveSiteGroup = useCallback((groupIndex: number) => {
    setSiteGroups((prev) => prev.filter((_, index) => index !== groupIndex));
  }, []);

  const handleSiteGroupUpdate = (groupIndex: number, alias: string, projectSiteId: number) => {
    setSiteGroups((prev) =>
      prev.map((group, index) => {
        if (index === groupIndex) {
          return {
            ...group,
            sites: {
              ...group.sites,
              [alias]: projectSiteId,
            },
          };
        }
        return group;
      })
    );
  };

  const handleClientTaskIdChange = (groupIndex: number, clientId: string) => {
    setSiteGroups((prev) =>
      prev.map((group, index) => {
        if (index === groupIndex) {
          return {
            ...group,
            client_task_id: clientId || undefined,
          };
        }
        return group;
      })
    );
  };

  const handleTaskNameChange = (groupIndex: number, taskName: string) => {
    setSiteGroups((prev) =>
      prev.map((group, index) => {
        if (index === groupIndex) {
          return {
            ...group,
            task_name: taskName || undefined,
          };
        }
        return group;
      })
    );
  };

  const previewTaskCreation = async () => {
    if (!selectedFlowTemplate || !siteGroups.length) return;

    setLoadingTaskCreation(true);
    try {
      // This would call the backend API to preview task creation
      // For now, we'll create a mock preview
      const preview: TaskFromFlowPreview[] = siteGroups.map((group, index) => ({
        task_id: group.client_task_id || `${taskNaming.auto_id_prefix || "TASK"}${taskNaming.auto_id_start + index}`,
        task_name: group.task_name || `${selectedFlowTemplate.name} Task`,
        project_name: projects.find((p) => p.id === taskBuilder.project_id)?.name || "",
        flow_template_name: selectedFlowTemplate.name,
        site_groups: Object.entries(group.sites)
          .filter(([alias, projectSiteId]) => projectSiteId > 0) // Only include selected project sites
          .map(([alias, projectSiteId]) => {
            const projectSite = projectSites.find((s) => s.id === projectSiteId);
            return {
              site_alias: alias,
              site_name: projectSite?.site_details?.site_name || projectSite?.site?.name || "",
              site_global_id: projectSite?.site_details?.global_id || projectSite?.site?.global_id || "",
            };
          }),
        sub_activities:
          selectedFlowTemplate.activities?.map((activity) => {
            const backendActivity = activity as BackendFlowActivity;
            return {
              sequence_order: activity.sequence_order,
              activity_name: activity.activity_name,
              activity_type: activity.activity_type,
              site_alias:
                backendActivity.assigned_sites && backendActivity.assigned_sites.length > 0
                  ? backendActivity.assigned_sites
                      .map((siteAssignment) => {
                        const alias = siteAssignment.flow_site.alias;
                        // Extract just the alias if it's formatted as "Site Name (Alias)"
                        const match = alias.match(/\(([^)]+)\)$/);
                        return match ? match[1] : alias;
                      })
                      .join(", ")
                  : "All Sites",
              dependencies: backendActivity.dependencies || activity.dependencies || [],
              dependency_scope: backendActivity.dependency_scope || "SITE_LOCAL",
              parallel_execution: backendActivity.parallel_execution || false,
            };
          }) || [],
      }));

      setTaskPreview(preview);
      setShowTaskPreview(true);
    } catch (error) {
      setApiError("Failed to preview task creation");
    } finally {
      setLoadingTaskCreation(false);
    }
  };

  const createTasksFromFlow = async () => {
    if (!selectedFlowTemplate || !siteGroups.length) return;

    setLoadingTaskCreation(true);
    try {
      const config: TaskCreationConfig = {
        flow_template_id: selectedFlowTemplate.id,
        project_id: taskBuilder.project_id, // Backend now accepts numeric IDs
        site_groups: siteGroups,
        task_naming: taskNaming,
      };

      // Call the backend API
      const response = await FlowService.createTasksFromFlow(config);

      if (response.success) {
        const { created_count, total_sites } = response.data;
        alert(`Successfully created ${created_count} task${created_count > 1 ? "s" : ""} across ${total_sites} site${total_sites > 1 ? "s" : ""}!`);
        navigate("/tasks");
      } else {
        setApiError(response.message || "Failed to create tasks");
      }
    } catch (error: any) {
      console.error("Failed to create tasks:", error);
      setApiError(error.response?.data?.message || error.message || "Failed to create tasks");
    } finally {
      setLoadingTaskCreation(false);
    }
  };

  // Bulk Upload Functions
  const downloadCSVTemplate = () => {
    if (!selectedFlowTemplate) return;

    const headers = ["Task Unique ID (Optional)"];
    selectedFlowTemplate.sites?.forEach((site) => {
      headers.push(`${site.alias} Site ID`);
      headers.push(`${site.alias} Global ID`);
      headers.push(`${site.alias} Site Name`);
    });

    const csvContent = [
      headers.join(","),
      // Example rows showing different scenarios
      `"2G-DIS-VI-001",${selectedFlowTemplate.sites?.map(() => "IMBIL_07825,IDMP108831,NAWAGAON").join(",")}`,
      `"",${selectedFlowTemplate.sites?.map(() => "IMBIL_07333,IDMP104082,VidhyaNagar").join(",")}`,
      `"CUSTOM-TASK-ID",${selectedFlowTemplate.sites?.map(() => "IMBIL_07024,IDMP100771,Gorella").join(",")}`,
      `"",${selectedFlowTemplate.sites?.map(() => "IMBPL_36009,IDMP102612,Harda").join(",")}`,
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedFlowTemplate.name.replace(/\s+/g, "_")}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setUploadError("");
    setUploadedData([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split("\n");
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

        // Validate headers
        const expectedHeaders = ["Task Unique ID (Optional)"];
        selectedFlowTemplate?.sites?.forEach((site) => {
          expectedHeaders.push(`${site.alias} Site ID`);
          expectedHeaders.push(`${site.alias} Global ID`);
          expectedHeaders.push(`${site.alias} Site Name`);
        });

        if (headers.length !== expectedHeaders.length) {
          setUploadError(`Invalid CSV format. Expected ${expectedHeaders.length} columns but got ${headers.length}`);
          return;
        }

        const data = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));

            // Debug logging for CSV parsing
            console.log(`🚨 CSV ROW ${i} DEBUG:`, {
              rawValues: values,
              taskUniqueId: values[0],
              hasTaskUniqueId: !!values[0],
              rowNumber: i,
            });

            const row: any = {
              task_unique_id: values[0] || "",
              sites: {},
              site_details: {},
            };

            let valueIndex = 1;
            selectedFlowTemplate?.sites?.forEach((site) => {
              const siteId = values[valueIndex] || "";
              const globalId = values[valueIndex + 1] || "";
              const siteName = values[valueIndex + 2] || "";

              row.sites[site.alias] = siteId;
              row.site_details[site.alias] = {
                global_id: globalId,
                site_name: siteName,
              };

              valueIndex += 3; // Move to next site's data
            });

            data.push(row);
          }
        }

        setUploadedData(data);
      } catch (error) {
        setUploadError("Failed to parse CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const applyBulkUpload = async () => {
    if (!uploadedData.length || !selectedFlowTemplate) return;

    setUploadingBulkData(true);
    setUploadError("");

    try {
      // Convert uploaded data to CSV format for backend processing
      const csvContent = convertDataToCSV(uploadedData);
      const csvBlob = new Blob([csvContent], { type: "text/csv" });
      const csvFile = new File([csvBlob], "bulk_upload.csv", { type: "text/csv" });

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("csv_file", csvFile);
      formData.append("flow_template_id", selectedFlowTemplate.id);
      formData.append("project_id", taskBuilder.project_id.toString());

      // Add task naming configuration for backend processing
      if (taskNaming.auto_id_prefix) {
        formData.append("auto_id_prefix", taskNaming.auto_id_prefix);
      }
      if (taskNaming.auto_id_start) {
        formData.append("auto_id_start", taskNaming.auto_id_start.toString());
      }

      // Add the task name from step 1
      formData.append("task_name", taskBuilder.task_name);

      // Debug logging
      console.log("🚨 BULK UPLOAD DEBUG - FormData contents:");
      console.log("CSV File:", csvFile);
      console.log("Flow Template ID:", selectedFlowTemplate.id);
      console.log("Project ID:", taskBuilder.project_id);
      console.log("Auto-ID Prefix:", taskNaming.auto_id_prefix);
      console.log("Auto-ID Start:", taskNaming.auto_id_start);
      console.log("Task Name:", taskBuilder.task_name);
      console.log("Uploaded Data Sample:", uploadedData.slice(0, 3));

      // Log what's in the CSV content
      console.log("Generated CSV Content:", csvContent);

      // Call backend API using API service
      const tenantContext = AuthService.getTenantContext();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      };

      if (tenantContext?.currentTenant?.id) {
        headers["X-Tenant-ID"] = tenantContext.currentTenant.id;
      }

      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api/v1"}${API_ENDPOINTS.TASKS.BULK_CREATE_FROM_CSV}`, {
        method: "POST",
        body: formData,
        headers,
      });

      const result = await response.json();

      if (result.success) {
        if (result.data.job_id) {
          // Large file - start async processing with polling
          setIsAsyncUpload(true);
          setBulkUploadJobId(result.data.job_id);
          startJobPolling(result.data.job_id);
          // Don't set uploadingBulkData to false here - keep it true for progress tracking
        } else {
          // Small file - show immediate results
          setIsAsyncUpload(false);

          // Set upload results for display
          setUploadResults({
            message: `Successfully created ${result.data.created_count} tasks!`,
            status: "completed",
            summary: {
              total_rows: result.data.total_rows,
              success_count: result.data.created_count,
              error_count: result.data.error_count,
            },
            errors: result.data.errors || [],
          });

          setBulkUploadOpen(false);
          setUploadedData([]);
          setUploadedFileName("");
          setUploadingBulkData(false);

          // Navigate to tasks page after successful upload
          setTimeout(() => {
            navigate("/tasks");
          }, 3000); // Longer delay to show the success message and allow user to click the button
        }
      } else {
        setUploadError(result.message || "Failed to process bulk upload");
        setUploadingBulkData(false);
        setIsAsyncUpload(false);
      }
    } catch (error) {
      console.error("Bulk upload error:", error);
      setUploadError("Failed to process bulk upload. Please check your data.");
      setUploadingBulkData(false);
    }
  };

  const convertDataToCSV = (data: any[]): string => {
    if (!selectedFlowTemplate) return "";

    const headers = ["Task Unique ID (Optional)"];
    selectedFlowTemplate.sites?.forEach((site) => {
      headers.push(`${site.alias} Site ID`);
      headers.push(`${site.alias} Global ID`);
      headers.push(`${site.alias} Site Name`);
    });

    const csvRows = [headers.join(",")];

    data.forEach((row) => {
      const csvRow = [row.task_unique_id || ""];
      selectedFlowTemplate.sites?.forEach((site) => {
        // The backend expects:
        // - "Site ID" column: Site Business ID (e.g., "IMBIL_07024") - NOT ProjectSite ID
        // - "Global ID" column: Site Global ID (e.g., "IDMP100771") - for reference
        // - "Site Name" column: Site Name (e.g., "Gorella") - for reference
        csvRow.push(row.site_details[site.alias]?.site_id || ""); // Site Business ID (e.g., "IMBIL_07024")
        csvRow.push(row.site_details[site.alias]?.global_id || ""); // Site Global ID (e.g., "IDMP100771")
        csvRow.push(row.site_details[site.alias]?.site_name || ""); // Site Name (e.g., "Gorella")
      });
      csvRows.push(csvRow.join(","));
    });

    return csvRows.join("\n");
  };

  // Job polling functions
  const startJobPolling = (jobId: number) => {
    console.log(`🚨 Starting job polling for job ${jobId} 🚨`);

    // Stop any existing polling first
    stopJobPolling();

    setBulkUploadJobId(jobId);
    setIsPolling(true);

    console.log(`📝 Set states: bulkUploadJobId=${jobId}, isPolling=true`);

    // Track if this job is still active
    let isJobActive = true;

    const interval = setInterval(async () => {
      // Check if job is still active
      if (!isJobActive) {
        console.log(`🛑 Job ${jobId} is no longer active, cleaning up interval`);
        clearInterval(interval);
        return;
      }

      console.log(`🔍 Interval check: bulkUploadJobId=${bulkUploadJobId}, jobId=${jobId}, isPolling=${isPolling}`);

      // Simple check - just verify we're still polling for the same job
      // The interval will be cleared when the job completes or fails

      try {
        console.log(`🔄 Polling job ${jobId} status...`);
        const tenantContext = AuthService.getTenantContext();
        const headers: Record<string, string> = {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        };

        if (tenantContext?.currentTenant?.id) {
          headers["X-Tenant-ID"] = tenantContext.currentTenant.id;
        }

        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api/v1"}${API_ENDPOINTS.TASKS.BULK_TASK_CREATION_JOB(jobId)}`, {
          headers,
        });

        const jobData = await response.json();
        console.log(`📊 Job ${jobId} status:`, jobData);

        if (jobData.success) {
          setJobStatus(jobData.data);

          if (jobData.data.status === "completed" || jobData.data.status === "failed") {
            console.log(`🏁 Job ${jobId} finished with status: ${jobData.data.status} - STOPPING POLLING`);

            // Mark job as inactive to stop polling
            isJobActive = false;

            // Clear the interval immediately to prevent further calls
            clearInterval(interval);
            setJobPollingInterval(null);

            // Stop polling state
            setIsPolling(false);
            setIsAsyncUpload(false);

            if (jobData.data.status === "completed") {
              // Show completion message in the UI instead of alert popup
              setUploadResults({
                message: `Bulk upload completed! ${jobData.data.success_count} tasks created, ${jobData.data.error_count} errors.`,
                status: "completed",
                summary: {
                  total_rows: jobData.data.total_rows,
                  success_count: jobData.data.success_count,
                  error_count: jobData.data.error_count,
                },
                errors: jobData.data.detailed_errors || [],
              });

              // Keep progress tracking visible for a few seconds to show completion
              setTimeout(() => {
                setUploadingBulkData(false); // Hide progress tracking after showing completion
              }, 5000);

              // Auto-close modal after a delay only if no errors
              if (jobData.data.error_count === 0) {
                setTimeout(() => {
                  setBulkUploadOpen(false);
                  setUploadedData([]);
                  setUploadedFileName("");
                  setUploadResults(null);

                  // Navigate to tasks page after successful async upload
                  setTimeout(() => {
                    navigate("/tasks");
                  }, 1000); // Small delay after modal closes
                }, 8000);
              }
            } else {
              setUploadError(`Job failed: ${jobData.data.error_message || "Unknown error"}`);
              // Hide progress tracking after showing error
              setTimeout(() => {
                setUploadingBulkData(false);
              }, 3000);
            }
          } else if (jobData.data.status === "processing") {
            // Update progress for ongoing processing
            console.log(`📊 Job ${jobId} progress: ${jobData.data.processed_rows}/${jobData.data.total_rows} (${jobData.data.progress_percentage}%)`);
          }
        }
      } catch (error) {
        console.error(`Error polling job ${jobId}:`, error);
        setUploadError("Failed to check job status");

        // Mark job as inactive and stop polling on error
        isJobActive = false;

        // Clear interval and stop polling on error
        clearInterval(interval);
        setJobPollingInterval(null);
        setIsPolling(false);
        setIsAsyncUpload(false);
      }
    }, 2000); // Poll every 2 seconds

    setJobPollingInterval(interval);
  };

  const stopJobPolling = () => {
    if (jobPollingInterval) {
      clearInterval(jobPollingInterval);
      setJobPollingInterval(null);
    }
    setBulkUploadJobId(null);
    setJobStatus(null);
    // Don't set uploadingBulkData to false here - let the UI decide when to hide it
    setIsPolling(false);
    setIsAsyncUpload(false);
  };

  // Function to manually hide progress tracking
  const hideProgressTracking = () => {
    setUploadingBulkData(false);
    setJobStatus(null);
    setUploadResults(null);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Task Name" value={taskBuilder.task_name} onChange={(e) => setTaskBuilder((prev) => ({ ...prev, task_name: e.target.value }))} sx={{ mb: 2 }} />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Project</InputLabel>
                <Select value={taskBuilder.project_id} onChange={(e) => handleProjectChange(e.target.value as number)} disabled={loadingProjects}>
                  {loadingProjects ? (
                    <MenuItem disabled>Loading projects...</MenuItem>
                  ) : projects.length === 0 ? (
                    <MenuItem disabled>No projects available</MenuItem>
                  ) : (
                    projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name} - {project.client_tenant_name || project.customer_name || "Unknown Client"}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Priority</InputLabel>
                <Select value={taskBuilder.priority} onChange={(e) => setTaskBuilder((prev) => ({ ...prev, priority: e.target.value as any }))}>
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Task Description"
                value={taskBuilder.description}
                onChange={(e) => setTaskBuilder((prev) => ({ ...prev, description: e.target.value }))}
                sx={{ mb: 2 }}
              />
              {taskBuilder.project_name && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Selected Project:</strong> {taskBuilder.project_name}
                    <br />
                    <strong>Client:</strong> {taskBuilder.client_name}
                    <br />
                    <strong>Task Type:</strong> {taskBuilder.task_type.replace("_", " ")}
                  </Typography>
                </Alert>
              )}
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Flow Template
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose a pre-built workflow template for this task. You can also create a custom flow.
            </Typography>

            {/* Flow Template Selection */}
            {loadingFlows ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <Typography>Loading flow templates...</Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {/* Dynamic Flow Templates */}
                {flowTemplates.map((flow, index) => (
                  <Grid key={flow.id} size={{ xs: 12, md: 6 }}>
                    <Card
                      sx={{
                        cursor: "pointer",
                        border: selectedFlowTemplate?.id === flow.id ? 2 : 1,
                        borderColor: selectedFlowTemplate?.id === flow.id ? "primary.main" : "divider",
                        mb: 2,
                      }}
                      onClick={() => setSelectedFlowTemplate(flow)}
                    >
                      <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <CheckCircle color={selectedFlowTemplate?.id === flow.id ? "primary" : "action"} />
                          <Typography variant="h6">{flow.name}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {flow.description}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                          {flow.activities.slice(0, 3).map((activity) => (
                            <Chip key={activity.id} label={activity.activity_name} size="small" variant="outlined" />
                          ))}
                          {flow.activities.length > 3 && <Chip label={`+${flow.activities.length - 3} more`} size="small" variant="outlined" />}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {/* Create Custom Flow Card */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ cursor: "pointer", border: 1, borderColor: "divider", borderStyle: "dashed", mb: 2 }}>
                    <CardContent sx={{ textAlign: "center", py: 4 }}>
                      <Add fontSize="large" color="primary" sx={{ mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        Create Custom Flow
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Build a custom workflow from scratch using drag & drop
                      </Typography>
                      <Button variant="outlined" onClick={() => navigate("/flows/new")}>
                        Flow Builder
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {selectedFlowTemplate && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Selected Template:</strong> {selectedFlowTemplate.name}
                  <br />
                  Activities: {selectedFlowTemplate.activities.map((a) => a.activity_name).join(", ")}
                  <br />
                  You can modify the workflow after selecting sites in the next step.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure Task Creation from Flow Template
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure how tasks will be created from the selected flow template. Each site group will create one main task with activities as sub-tasks.
            </Typography>

            {!selectedFlowTemplate ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                Please select a flow template first to configure task creation.
              </Alert>
            ) : !taskBuilder.project_id ? (
              <Alert severity="info" sx={{ mb: 3 }}>
                Please select a project first to view available sites.
              </Alert>
            ) : loadingProjectSites ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <Typography>Loading project sites...</Typography>
              </Box>
            ) : projectSites.length === 0 ? (
              <Alert severity="warning" sx={{ mb: 3 }}>
                No sites found for the selected project. Please contact your administrator.
              </Alert>
            ) : (
              <Box>
                {/* Flow Template Info */}
                <Card sx={{ mb: 3, bgcolor: "primary.50" }}>
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Flow Template: {selectedFlowTemplate.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Category: {selectedFlowTemplate.category} • Required Sites: {selectedFlowTemplate.sites?.map((s) => s.alias).join(", ")} • Activities:{" "}
                      {selectedFlowTemplate.activities?.length || 0}
                    </Typography>
                  </CardContent>
                </Card>

                {/* Task Naming Configuration */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Task Naming Configuration
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Auto-ID Prefix (optional)"
                          placeholder="e.g., MWD, 2GD"
                          value={taskNaming.auto_id_prefix}
                          onChange={(e) => setTaskNaming((prev) => ({ ...prev, auto_id_prefix: e.target.value }))}
                          helperText="Prefix for auto-generated task IDs"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Starting Number"
                          value={taskNaming.auto_id_start}
                          onChange={(e) => setTaskNaming((prev) => ({ ...prev, auto_id_start: parseInt(e.target.value) || 1 }))}
                          helperText="Starting number for auto-generated task IDs (e.g., if 5, first task will be PREFIX-5, then PREFIX-6, etc.)"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Site Group Configuration */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Typography variant="h6">Site Group Configuration</Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={generateSiteGroups} disabled={!selectedFlowTemplate || !projectSites.length}>
                          Generate Initial Group
                        </Button>
                        <Button variant="outlined" startIcon={<Upload />} onClick={() => setBulkUploadOpen(true)} disabled={!selectedFlowTemplate || !projectSites.length}>
                          Bulk Upload Sites
                        </Button>
                      </Box>
                    </Box>

                    {siteGroups.length === 0 ? (
                      <Alert severity="info">
                        Click "Generate Initial Group" to create the first site group based on the flow template requirements. You can then add more site groups to create multiple tasks at once.
                      </Alert>
                    ) : (
                      <>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Each site group will create one task. You currently have {siteGroups.length} site group{siteGroups.length > 1 ? "s" : ""}, which will create {siteGroups.length} task
                          {siteGroups.length > 1 ? "s" : ""}.
                        </Alert>

                        {siteGroups.map((group, groupIndex) => (
                          <Accordion key={groupIndex} defaultExpanded sx={{ mb: 2 }}>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                                <Typography variant="subtitle1">
                                  Task {groupIndex + 1} - Site Group {groupIndex + 1}
                                </Typography>
                                {siteGroups.length > 1 && (
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSiteGroup(groupIndex);
                                    }}
                                    sx={{ color: "error.main" }}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Grid container spacing={2}>
                                {/* Task Name */}
                                <Grid size={{ xs: 12 }}>
                                  <TextField
                                    fullWidth
                                    label="Task Name (optional)"
                                    placeholder="e.g., Site Dismantle Task 1"
                                    value={group.task_name || ""}
                                    onChange={(e) => handleTaskNameChange(groupIndex, e.target.value)}
                                    helperText="Provide a custom task name, or leave blank for auto-generation"
                                  />
                                </Grid>
                                {/* Client Task ID */}
                                <Grid size={{ xs: 12 }}>
                                  <TextField
                                    fullWidth
                                    label="Client Task ID (optional)"
                                    placeholder="e.g., CLIENT-001"
                                    value={group.client_task_id || ""}
                                    onChange={(e) => handleClientTaskIdChange(groupIndex, e.target.value)}
                                    helperText="Provide a client-specific task ID, or leave blank for auto-generation"
                                  />
                                </Grid>

                                {/* Site Assignments */}
                                {selectedFlowTemplate.sites?.map((flowSite) => (
                                  <Grid size={{ xs: 12, md: 6 }} key={flowSite.alias}>
                                    <FormControl fullWidth>
                                      <Autocomplete<ProjectSite>
                                        options={projectSites}
                                        getOptionLabel={(option: ProjectSite) => {
                                          const siteData = option.site_details || option.site;
                                          if (!siteData) return "Unknown Site";
                                          return String(siteData.site_name || siteData.name || siteData.id || "Unknown Site");
                                        }}
                                        renderOption={(props: React.HTMLAttributes<HTMLLIElement>, option: ProjectSite) => {
                                          const siteData = option.site_details || option.site;
                                          if (!siteData) return null;

                                          return (
                                            <Box component="li" {...props}>
                                              <Box>
                                                <Typography variant="body2">{siteData.site_name || siteData.name || siteData.id}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                  {siteData.global_id || siteData.id} • {siteData.cluster || siteData.circle || "N/A"}
                                                </Typography>
                                              </Box>
                                            </Box>
                                          );
                                        }}
                                        value={projectSites.find((site) => site.id === group.sites[flowSite.alias]) || null}
                                        onChange={(event: React.SyntheticEvent, newValue: ProjectSite | null) => {
                                          handleSiteGroupUpdate(groupIndex, flowSite.alias, newValue?.id || 0);
                                        }}
                                        renderInput={(params) => <TextField {...params} label={`${flowSite.alias} Site`} placeholder="Search sites..." size="small" />}
                                        filterOptions={(options: ProjectSite[], { inputValue }: { inputValue: string }) => {
                                          if (!inputValue) return options;

                                          return options.filter((option: ProjectSite) => {
                                            const siteData = option.site_details || option.site;
                                            if (!siteData) return false;

                                            const siteName = String(siteData.site_name || siteData.name || siteData.id || "").toLowerCase();
                                            const globalId = String(siteData.global_id || siteData.id || "").toLowerCase();
                                            const cluster = String(siteData.cluster || siteData.circle || "").toLowerCase();
                                            const searchTerm = inputValue.toLowerCase();

                                            return siteName.includes(searchTerm) || globalId.includes(searchTerm) || cluster.includes(searchTerm);
                                          });
                                        }}
                                        isOptionEqualToValue={(option: ProjectSite, value: ProjectSite) => option.id === value.id}
                                        noOptionsText="No sites found"
                                        clearOnBlur={false}
                                        openOnFocus
                                      />
                                    </FormControl>
                                  </Grid>
                                ))}
                              </Grid>
                            </AccordionDetails>
                          </Accordion>
                        ))}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3 }}>
                  <Button variant="outlined" size="large" startIcon={<Add />} onClick={handleAddSiteGroup} disabled={!selectedFlowTemplate || siteGroups.length === 0}>
                    Add Site Group
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Preview />}
                    onClick={previewTaskCreation}
                    disabled={!siteGroups.length || siteGroups.some((group) => Object.keys(group.sites).length === 0 || Object.values(group.sites).some((siteId) => siteId <= 0))}
                    loading={loadingTaskCreation}
                  >
                    Preview Task Creation
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Create Tasks from Flow Template
            </Typography>

            {!selectedFlowTemplate ? (
              <Alert severity="info">Please select a flow template first to review task creation.</Alert>
            ) : !siteGroups.length ? (
              <Alert severity="info">Please configure site groups in the previous step to review task creation.</Alert>
            ) : (
              <Grid container spacing={3}>
                {/* Flow Template Summary */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Flow Template Summary
                      </Typography>
                      <Typography>
                        <strong>Template:</strong> {selectedFlowTemplate.name}
                      </Typography>
                      <Typography>
                        <strong>Category:</strong> {selectedFlowTemplate.category}
                      </Typography>
                      <Typography>
                        <strong>Required Sites:</strong> {selectedFlowTemplate.sites?.map((s) => s.alias).join(", ")}
                      </Typography>
                      <Typography>
                        <strong>Activities:</strong> {selectedFlowTemplate.activities?.length || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Project Summary */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Project Summary
                      </Typography>
                      <Typography>
                        <strong>Project:</strong> {projects.find((p) => p.id === taskBuilder.project_id)?.name}
                      </Typography>
                      <Typography>
                        <strong>Client:</strong> {projects.find((p) => p.id === taskBuilder.project_id)?.client_tenant_name || projects.find((p) => p.id === taskBuilder.project_id)?.customer_name}
                      </Typography>
                      <Typography>
                        <strong>Task Naming:</strong> {taskNaming.auto_id_prefix ? `${taskNaming.auto_id_prefix}${taskNaming.auto_id_start}` : "Auto-generated"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Site Groups Summary */}
                <Grid size={{ xs: 12 }}>
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary">
                        Tasks to be Created ({siteGroups.length})
                      </Typography>
                      {siteGroups.map((group, index) => (
                        <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Task {index + 1} - Site Group {index + 1}
                            {group.client_task_id && <Chip label={`Client ID: ${group.client_task_id}`} size="small" color="primary" sx={{ ml: 1 }} />}
                          </Typography>
                          <Grid container spacing={2}>
                            {Object.entries(group.sites).map(([alias, projectSiteId]) => {
                              if (projectSiteId <= 0) return null; // Skip unselected project sites

                              const projectSite = projectSites.find((s) => s.id === projectSiteId);
                              const siteData = projectSite?.site_details || projectSite?.site;

                              return (
                                <Grid size={{ xs: 12, md: 6 }} key={alias}>
                                  <Typography variant="body2">
                                    <strong>{alias}:</strong> {siteData?.site_name || siteData?.name || siteData?.id || "Unknown Site"}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {siteData?.global_id || siteData?.id} • {siteData?.cluster || siteData?.circle || "N/A"}
                                  </Typography>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Action Buttons */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                    <Button variant="outlined" startIcon={<Preview />} onClick={previewTaskCreation} disabled={loadingTaskCreation}>
                      Preview Tasks
                    </Button>
                    <Button variant="contained" size="large" startIcon={<Save />} onClick={createTasksFromFlow} disabled={loadingTaskCreation} loading={loadingTaskCreation}>
                      Create {siteGroups.length} Task{siteGroups.length > 1 ? "s" : ""} from Flow
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleCreateTask = () => {
    console.log("Creating task:", taskBuilder);
    // Here you would call the API to create the task
    navigate("/tasks");
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return taskBuilder.task_name && taskBuilder.project_id; // Description is now optional
      case 1:
        return selectedFlowTemplate !== null;
      case 2:
        return (
          siteGroups.length > 0 &&
          siteGroups.every(
            (group) => Object.keys(group.sites).length > 0 && Object.values(group.sites).every((siteId) => siteId > 0) // Ensure all sites are actually selected
          )
        );
      case 3:
        return selectedFlowTemplate !== null && siteGroups.length > 0;
      default:
        return false;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={() => navigate("/tasks")}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1">
            Create New Task
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Build your task workflow with drag & drop
          </Typography>
        </Box>
      </Box>

      {/* API Error Alert */}
      {apiError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setApiError(null)}>
          {apiError}
        </Alert>
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step Content */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ minHeight: 500 }}>{renderStepContent(activeStep)}</CardContent>
      </Card>

      {/* Navigation */}
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button onClick={handleBack} disabled={activeStep === 0}>
          Back
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          {activeStep < steps.length - 1 ? (
            <Button variant="contained" onClick={handleNext} disabled={!isStepValid(activeStep)}>
              Next
            </Button>
          ) : (
            <Button variant="contained" onClick={handleCreateTask} disabled={!isStepValid(activeStep)}>
              Create Task
            </Button>
          )}
        </Box>
      </Box>

      {/* Edit Activity Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Sub-Activity</DialogTitle>
        <DialogContent>
          {editingActivity && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Activity Name"
                  value={editingActivity.name}
                  onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, name: e.target.value } : null))}
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Assignment Type</InputLabel>
                  <Select value={editingActivity.assignment_type} onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, assignment_type: e.target.value as AssignmentType } : null))}>
                    <MenuItem value="VENDOR_ALLOCATION">Vendor Allocation</MenuItem>
                    <MenuItem value="DIRECT_ASSIGNMENT">Direct Assignment</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  type="number"
                  label="Estimated Hours"
                  value={editingActivity.estimated_hours}
                  onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, estimated_hours: parseInt(e.target.value) } : null))}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={editingActivity.notes || ""}
                  onChange={(e) => setEditingActivity((prev) => (prev ? { ...prev, notes: e.target.value } : null))}
                  sx={{ mb: 2 }}
                />
                <Typography variant="subtitle2" gutterBottom>
                  Site Associations
                </Typography>
                {taskBuilder.sites
                  .filter((s) => s.selected)
                  .map((site) => (
                    <FormControlLabel
                      key={site.id}
                      control={
                        <Checkbox
                          checked={editingActivity.site_associations.includes(site.id)}
                          onChange={(e) => {
                            const siteAssociations = e.target.checked ? [...editingActivity.site_associations, site.id] : editingActivity.site_associations.filter((id) => id !== site.id);
                            setEditingActivity((prev) => (prev ? { ...prev, site_associations: siteAssociations } : null));
                          }}
                        />
                      }
                      label={site.site_name}
                    />
                  ))}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveActivity}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Preview Dialog */}
      <Dialog open={showTaskPreview} onClose={() => setShowTaskPreview(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Task Creation Preview</Typography>
          <Typography variant="body2" color="text.secondary">
            Review the tasks that will be created from the flow template
          </Typography>
        </DialogTitle>
        <DialogContent>
          {taskPreview.length > 0 && (
            <>
              {/* Common Task Information */}
              <Card sx={{ mb: 3, bgcolor: "primary.50" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Task Creation Summary
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Task Name:</strong> {taskBuilder.task_name}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Description:</strong> {taskBuilder.description || "No description provided"}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Priority:</strong> {taskBuilder.priority}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Project:</strong> {taskPreview[0].project_name}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Flow Template:</strong> {taskPreview[0].flow_template_name}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Tasks to Create:</strong> {taskPreview.length}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Task Flow (Sub-activities) */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Task Flow - Sub-activities ({taskPreview[0].sub_activities.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This workflow will be applied to all {taskPreview.length} task{taskPreview.length > 1 ? "s" : ""}
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Order</TableCell>
                          <TableCell>Activity</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Site Alias</TableCell>
                          <TableCell>Dependencies</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {taskPreview[0].sub_activities.map((activity, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{activity.sequence_order}</TableCell>
                            <TableCell>{activity.activity_name}</TableCell>
                            <TableCell>{activity.activity_type}</TableCell>
                            <TableCell>{activity.site_alias || "All Sites"}</TableCell>
                            <TableCell>{activity.dependencies.length > 0 ? activity.dependencies.join(", ") : "None"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {/* Individual Tasks */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Tasks to be Created ({taskPreview.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Each task will have the same workflow but applied to different site groups
                  </Typography>

                  {taskPreview.map((task, index) => (
                    <Box key={index} sx={{ mb: 3, p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                        Task {index + 1}: {task.task_id}
                      </Typography>

                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Site Group Assignment:
                      </Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Alias</TableCell>
                              <TableCell>Site Name</TableCell>
                              <TableCell>Global ID</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {task.site_groups.map((siteGroup, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{siteGroup.site_alias}</TableCell>
                                <TableCell>{siteGroup.site_name}</TableCell>
                                <TableCell>{siteGroup.site_global_id}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTaskPreview(false)}>Close</Button>
          <Button variant="contained" onClick={createTasksFromFlow} loading={loadingTaskCreation}>
            Create {siteGroups.length} Task{siteGroups.length > 1 ? "s" : ""}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success message display */}
      {uploadResults && uploadResults.status === "completed" && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate("/tasks")} startIcon={<CheckCircle />}>
              View Tasks ({uploadResults.summary?.success_count || 0})
            </Button>
          }
          onClose={() => setUploadResults(null)}
        >
          <Typography variant="body2">✅ {uploadResults.message}</Typography>
        </Alert>
      )}

      {/* Progress tracking is now shown inside the modal */}

      {/* Bulk Upload Modal */}
      <Dialog
        open={bulkUploadOpen}
        onClose={() => {
          // Stop polling and reset states when modal is closed
          if (jobPollingInterval) {
            clearInterval(jobPollingInterval);
            setJobPollingInterval(null);
          }
          setIsPolling(false);
          setIsAsyncUpload(false);
          setUploadingBulkData(false);
          setJobStatus(null);
          setBulkUploadOpen(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Upload />
            Bulk Upload Site Groups
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload multiple site groups at once using a CSV file. Each row will create one task with the Task Name from Step 1.
          </Typography>

          {selectedFlowTemplate && (
            <Box>
              {/* Template Download Section */}
              <Card sx={{ mb: 3, bgcolor: "primary.50" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Download CSV Template
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Download a template based on your selected flow template: <strong>{selectedFlowTemplate.name}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Required site aliases: {selectedFlowTemplate.sites?.map((s) => s.alias).join(", ")}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>CSV Structure:</strong> Task Unique ID (optional), Site ID, Global ID, Site Name
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Task ID Generation Rules:</strong>
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                    <li>If Auto-ID Prefix is set: Use prefix + counter starting from Starting Number (e.g., 2G-DIS-VI-1, 2G-DIS-VI-2)</li>
                    <li>If Task Unique ID in CSV: Use the provided ID</li>
                    <li>If both blank: Auto-generate unique ID as T_bulk_uuid_row_number</li>
                  </Box>
                  <Button variant="contained" startIcon={<Download />} onClick={downloadCSVTemplate} sx={{ mr: 2 }}>
                    Download Template
                  </Button>
                  <Button variant="outlined" onClick={() => setShowTemplatePreview(true)}>
                    Preview Template
                  </Button>
                </CardContent>
              </Card>

              {/* File Upload Section */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Upload CSV File
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select a CSV file with your site group data. Make sure it follows the template format.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    <strong>Note:</strong> Task Name from Step 1 will be used for all created tasks. The CSV Task Unique ID column is optional.
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    <strong>Task ID Generation:</strong> If CSV Task Unique ID is blank, the system will use Auto-ID Prefix + counter (starting from Starting Number) or auto-generate as
                    T_bulk_uuid_row_number.
                  </Typography>

                  <Box sx={{ border: 2, borderColor: "divider", borderStyle: "dashed", borderRadius: 1, p: 3, textAlign: "center" }}>
                    <Upload sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Drop your CSV file here
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      or click to browse
                    </Typography>
                    <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: "none" }} id="csv-upload-input" />
                    <label htmlFor="csv-upload-input">
                      <Button variant="outlined" component="span">
                        Choose File
                      </Button>
                    </label>
                  </Box>

                  {uploadedFileName && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      File uploaded: <strong>{uploadedFileName}</strong>
                    </Alert>
                  )}

                  {uploadError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {uploadError}
                    </Alert>
                  )}

                  {/* Success message for immediate upload completion */}
                  {uploadResults && uploadResults.status === "completed" && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        ✅ {uploadResults.message}
                      </Typography>
                      <Button variant="contained" size="small" onClick={() => navigate("/tasks")} startIcon={<CheckCircle />} sx={{ mt: 1 }}>
                        View Tasks ({uploadResults.summary?.success_count || 0})
                      </Button>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Upload Preview OR Progress Tracking - Show one or the other */}
              {uploadedData.length > 0 && !uploadingBulkData && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Upload Preview ({uploadedData.length} site groups)
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Review the data before applying. This will create {uploadedData.length} task{uploadedData.length > 1 ? "s" : ""} with the Task Name: <strong>"{taskBuilder.task_name}"</strong>
                    </Typography>

                    {uploadedData.length > 100 && (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Large Dataset Detected:</strong> Processing {uploadedData.length} rows may take a few moments. The system will process data in chunks to prevent freezing.
                        </Typography>
                      </Alert>
                    )}

                    {/* Error Display Section */}
                    {jobStatus?.detailed_errors && jobStatus.detailed_errors.length > 0 && (
                      <Card sx={{ mb: 2, bgcolor: "error.50" }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom color="error.main">
                            ⚠️ Upload Errors ({jobStatus.detailed_errors.length} errors)
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            The following rows had errors during processing. Please review and fix them.
                          </Typography>

                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Row</TableCell>
                                  <TableCell>Error Message</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {jobStatus.detailed_errors.slice(0, 10).map((error: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell>{error.row}</TableCell>
                                    <TableCell>
                                      <Typography variant="body2" color="error.main">
                                        {error.error}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {jobStatus.detailed_errors.length > 10 && (
                                  <TableRow>
                                    <TableCell colSpan={2} sx={{ textAlign: "center" }}>
                                      <Typography variant="body2" color="text.secondary">
                                        ... and {jobStatus.detailed_errors.length - 10} more errors
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    )}

                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Row</TableCell>
                            <TableCell>Task Unique ID (Optional)</TableCell>
                            {selectedFlowTemplate.sites?.map((site) => (
                              <React.Fragment key={site.alias}>
                                <TableCell>{site.alias} Site ID</TableCell>
                                <TableCell>{site.alias} Global ID</TableCell>
                                <TableCell>{site.alias} Site Name</TableCell>
                              </React.Fragment>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {uploadedData.slice(0, 5).map((row, index) => (
                            <TableRow key={index}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{row.task_unique_id || "Auto-generated"}</TableCell>
                              {selectedFlowTemplate.sites?.map((site) => (
                                <React.Fragment key={site.alias}>
                                  <TableCell>{row.sites[site.alias] || "Not specified"}</TableCell>
                                  <TableCell>{row.site_details[site.alias]?.global_id || "Not specified"}</TableCell>
                                  <TableCell>{row.site_details[site.alias]?.site_name || "Not specified"}</TableCell>
                                </React.Fragment>
                              ))}
                            </TableRow>
                          ))}
                          {uploadedData.length > 5 && (
                            <TableRow>
                              <TableCell colSpan={(selectedFlowTemplate.sites?.length || 0) * 3 + 2} sx={{ textAlign: "center" }}>
                                <Typography variant="body2" color="text.secondary">
                                  ... and {uploadedData.length - 5} more rows
                                </Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}

              {/* Progress Tracking - Show when polling starts */}
              {uploadingBulkData && (
                <Card sx={{ bgcolor: "info.50" }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="info.main">
                      {isAsyncUpload ? "Processing Large File..." : "Uploading..."}
                    </Typography>

                    {isAsyncUpload && (
                      <Typography variant="body2" color="info.main" sx={{ mb: 2 }}>
                        ⚡ Large file detected - using background processing to prevent timeouts
                      </Typography>
                    )}

                    {jobStatus?.status === "processing" && (
                      <>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              border: "2px solid #1976d2",
                              borderTop: "2px solid transparent",
                              borderRadius: "50%",
                              animation: "spin 1s linear infinite",
                              mr: 1,
                            }}
                          />
                          <Typography variant="subtitle2">{jobStatus.message || "Processing in background..."}</Typography>
                        </Box>

                        <LinearProgress
                          variant={jobStatus.progress_percentage ? "determinate" : "indeterminate"}
                          value={jobStatus.progress_percentage || 0}
                          sx={{
                            mb: 2,
                            height: 8,
                            borderRadius: 4,
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 4,
                            },
                          }}
                        />

                        <Typography variant="caption" color="text.secondary">
                          {jobStatus.progress_percentage
                            ? `Progress: ${jobStatus.progress_percentage}% (${jobStatus.processed_rows || 0}/${jobStatus.total_rows || 0} rows processed)`
                            : "Processing in background..."}
                        </Typography>

                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          Processing in background... This may take a few minutes for large files.
                        </Typography>
                      </>
                    )}

                    {!jobStatus?.progress_percentage && (
                      <>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              border: "2px solid #f3f3f3",
                              borderTop: "2px solid #3498db",
                              borderRadius: "50%",
                              animation: "spin 1s linear infinite",
                              mr: 1,
                            }}
                          />
                          <Typography variant="body2">Starting background processing...</Typography>
                        </Box>
                        <LinearProgress sx={{ mb: 1 }} />
                      </>
                    )}

                    {/* Show completion results when done */}
                    {jobStatus?.status === "completed" && (
                      <Box sx={{ mt: 2 }}>
                        <Alert severity="success" sx={{ mb: 2 }}>
                          <Typography variant="body2">✅ Successfully created {jobStatus.success_count || 0} tasks!</Typography>
                          {jobStatus.error_count > 0 && (
                            <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
                              ⚠️ Upload completed with {jobStatus.error_count} errors. Please review the errors below.
                            </Typography>
                          )}
                        </Alert>

                        <Typography variant="caption" color="text.secondary">
                          Total rows: {jobStatus.total_rows} • Processed: {jobStatus.processed_rows} • Duration: {jobStatus.duration}
                        </Typography>

                        <Box sx={{ mt: 2, textAlign: "center" }}>
                          <Button variant="outlined" size="small" onClick={hideProgressTracking} sx={{ mr: 1 }}>
                            Hide Progress Tracking
                          </Button>
                          <Button variant="contained" size="small" onClick={() => navigate("/tasks")} startIcon={<CheckCircle />}>
                            View Tasks ({jobStatus.success_count || 0})
                          </Button>
                        </Box>
                      </Box>
                    )}

                    {/* Show failure results when done */}
                    {jobStatus?.status === "failed" && (
                      <Box sx={{ mt: 2 }}>
                        <Alert severity="error" sx={{ mb: 2 }}>
                          <Typography variant="body2">❌ Upload failed: {jobStatus.error_message || "Unknown error"}</Typography>
                        </Alert>
                        <Typography variant="caption" color="text.secondary">
                          Please check your data and try again.
                        </Typography>

                        <Box sx={{ mt: 2, textAlign: "center" }}>
                          <Button variant="outlined" size="small" onClick={hideProgressTracking}>
                            Hide Progress Tracking
                          </Button>
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkUploadOpen(false)}>Cancel</Button>
          {uploadedData.length > 0 && (
            <Button variant="contained" onClick={applyBulkUpload} disabled={uploadingBulkData}>
              {uploadingBulkData ? (jobStatus?.status === "completed" || jobStatus?.status === "failed" ? "Done" : "Processing...") : `Apply ${uploadedData.length} Site Groups`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Template Preview Modal */}
      <Dialog open={showTemplatePreview} onClose={() => setShowTemplatePreview(false)} maxWidth="lg" fullWidth>
        <DialogTitle>CSV Template Preview</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This is how your CSV file should be structured. The first row contains column headers.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Column 1:</strong> Task Unique ID (Optional) - Leave blank for auto-generation
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Task Unique ID (Optional)</TableCell>
                  {selectedFlowTemplate?.sites?.map((site) => (
                    <React.Fragment key={site.alias}>
                      <TableCell>{site.alias} Site ID</TableCell>
                      <TableCell>{site.alias} Global ID</TableCell>
                      <TableCell>{site.alias} Site Name</TableCell>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>2G-DIS-VI-001</TableCell>
                  {selectedFlowTemplate?.sites?.map((site) => (
                    <React.Fragment key={site.alias}>
                      <TableCell>IMBIL_07825</TableCell>
                      <TableCell>IDMP108831</TableCell>
                      <TableCell>NAWAGAON</TableCell>
                    </React.Fragment>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>(blank - auto-generated)</TableCell>
                  {selectedFlowTemplate?.sites?.map((site) => (
                    <React.Fragment key={site.alias}>
                      <TableCell>IMBIL_07333</TableCell>
                      <TableCell>IDMP104082</TableCell>
                      <TableCell>VidhyaNagar</TableCell>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplatePreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskCreatePage;

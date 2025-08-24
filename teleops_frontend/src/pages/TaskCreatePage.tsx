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
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { TaskType, ActivityType, AssignmentType } from "../types/task";
import { FlowTemplate } from "../types/flow";
import { FlowService } from "../services/flowService";
import projectService, { Project } from "../services/projectService";
import siteService, { ProjectSite, Site } from "../services/siteService";

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
  role: string;
}

interface TaskSubActivityPreview {
  sequence_order: number;
  activity_name: string;
  activity_type: string;
  site_alias: string;
  dependencies: string[];
  dependency_scope: string;
  parallel_execution: boolean;
}

interface SiteGroupConfig {
  sites: { [alias: string]: number }; // alias -> site_id mapping
  client_task_id?: string;
}

interface TaskCreationConfig {
  flow_template_id: string;
  project_id: number;
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
      console.error("Failed to load flow templates:", error);
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

    // Create site groups based on available sites
    const groups: SiteGroupConfig[] = [];

    // For now, create one group with all sites
    // In the future, this could be enhanced to create multiple groups
    const group: SiteGroupConfig = {
      sites: {},
    };

    requiredAliases.forEach((alias) => {
      // Find a site that matches this alias requirement
      // For now, assign the first available site
      const availableSite = projectSites.find((site) => !Object.values(group.sites).includes(site.id));

      if (availableSite) {
        group.sites[alias] = availableSite.id;
      }
    });

    if (Object.keys(group.sites).length > 0) {
      setSiteGroups([group]);
    }
  }, [selectedFlowTemplate, projectSites]);

  const handleSiteGroupUpdate = (groupIndex: number, alias: string, siteId: number) => {
    setSiteGroups((prev) =>
      prev.map((group, index) => {
        if (index === groupIndex) {
          return {
            ...group,
            sites: {
              ...group.sites,
              [alias]: siteId,
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

  const previewTaskCreation = async () => {
    if (!selectedFlowTemplate || !siteGroups.length) return;

    setLoadingTaskCreation(true);
    try {
      // This would call the backend API to preview task creation
      // For now, we'll create a mock preview
      const preview: TaskFromFlowPreview[] = siteGroups.map((group, index) => ({
        task_id: group.client_task_id || `TASK${taskNaming.auto_id_start + index}`,
        task_name: `${selectedFlowTemplate.name} Task`,
        project_name: projects.find((p) => p.id === taskBuilder.project_id)?.name || "",
        flow_template_name: selectedFlowTemplate.name,
        site_groups: Object.entries(group.sites).map(([alias, siteId]) => {
          const site = projectSites.find((s) => s.id === siteId);
          return {
            site_alias: alias,
            site_name: site?.site_details?.site_name || site?.site?.name || "",
            site_global_id: site?.site_details?.global_id || site?.site?.global_id || "",
            role: index === 0 ? "PRIMARY" : "SECONDARY",
          };
        }),
        sub_activities:
          selectedFlowTemplate.activities?.map((activity) => ({
            sequence_order: activity.sequence_order,
            activity_name: activity.activity_name,
            activity_type: activity.activity_type,
            site_alias: "", // FlowActivity doesn't have assigned_sites in the current type
            dependencies: activity.dependencies || [],
            dependency_scope: "SITE_LOCAL", // Default value since FlowActivity doesn't have this
            parallel_execution: false, // Default value since FlowActivity doesn't have this
          })) || [],
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
        project_id: taskBuilder.project_id,
        site_groups: siteGroups,
        task_naming: taskNaming,
      };

      // TODO: Call the backend API
      // const response = await FlowService.createTasksFromFlow(config);
      console.log("Creating tasks with config:", config);

      // For now, just navigate back
      navigate("/tasks");
    } catch (error) {
      setApiError("Failed to create tasks");
    } finally {
      setLoadingTaskCreation(false);
    }
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
                          helperText="Starting number for auto-generated task IDs"
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
                      <Button variant="outlined" startIcon={<Refresh />} onClick={generateSiteGroups} disabled={!selectedFlowTemplate || !projectSites.length}>
                        Generate Site Groups
                      </Button>
                    </Box>

                    {siteGroups.length === 0 ? (
                      <Alert severity="info">Click "Generate Site Groups" to automatically configure site assignments based on the flow template requirements.</Alert>
                    ) : (
                      siteGroups.map((group, groupIndex) => (
                        <Accordion key={groupIndex} defaultExpanded sx={{ mb: 2 }}>
                          <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="subtitle1">Site Group {groupIndex + 1}</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Grid container spacing={2}>
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
                                    <InputLabel>{flowSite.alias} Site</InputLabel>
                                    <Select
                                      value={group.sites[flowSite.alias] || ""}
                                      onChange={(e) => handleSiteGroupUpdate(groupIndex, flowSite.alias, e.target.value as number)}
                                      label={`${flowSite.alias} Site`}
                                    >
                                      <MenuItem value="">
                                        <em>Select a site</em>
                                      </MenuItem>
                                      {projectSites.map((projectSite) => {
                                        const siteData = projectSite.site_details || projectSite.site;
                                        if (!siteData) return null;

                                        return (
                                          <MenuItem key={projectSite.id} value={projectSite.id}>
                                            <Box>
                                              <Typography variant="body2">{siteData.site_name || siteData.name || siteData.id}</Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                {siteData.global_id || siteData.id} • {siteData.cluster || siteData.circle || "N/A"}
                                              </Typography>
                                            </Box>
                                          </MenuItem>
                                        );
                                      })}
                                    </Select>
                                  </FormControl>
                                </Grid>
                              ))}
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Preview Button */}
                <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Preview />}
                    onClick={previewTaskCreation}
                    disabled={!siteGroups.length || siteGroups.some((group) => Object.keys(group.sites).length === 0)}
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
                        Site Groups Configuration
                      </Typography>
                      {siteGroups.map((group, index) => (
                        <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Site Group {index + 1}
                            {group.client_task_id && <Chip label={`Client ID: ${group.client_task_id}`} size="small" color="primary" sx={{ ml: 1 }} />}
                          </Typography>
                          <Grid container spacing={2}>
                            {Object.entries(group.sites).map(([alias, siteId]) => {
                              const site = projectSites.find((s) => s.id === siteId);
                              const siteData = site?.site_details || site?.site;

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
                      Create Tasks from Flow
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
        return taskBuilder.task_name && taskBuilder.project_id && taskBuilder.description;
      case 1:
        return selectedFlowTemplate !== null;
      case 2:
        return siteGroups.length > 0 && siteGroups.every((group) => Object.keys(group.sites).length > 0);
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
          {taskPreview.map((task, index) => (
            <Card key={index} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {task.task_name} - {task.task_id}
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Project:</strong> {task.project_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Flow Template:</strong> {task.flow_template_name}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Site Groups:</strong> {task.site_groups.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Sub-activities:</strong> {task.sub_activities.length}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Site Groups */}
                <Typography variant="subtitle2" gutterBottom>
                  Site Groups:
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Alias</TableCell>
                        <TableCell>Site Name</TableCell>
                        <TableCell>Global ID</TableCell>
                        <TableCell>Role</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {task.site_groups.map((siteGroup, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{siteGroup.site_alias}</TableCell>
                          <TableCell>{siteGroup.site_name}</TableCell>
                          <TableCell>{siteGroup.site_global_id}</TableCell>
                          <TableCell>{siteGroup.role}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Sub-activities */}
                <Typography variant="subtitle2" gutterBottom>
                  Sub-activities:
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
                      {task.sub_activities.map((activity, idx) => (
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
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTaskPreview(false)}>Close</Button>
          <Button variant="contained" onClick={createTasksFromFlow} loading={loadingTaskCreation}>
            Create Tasks
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskCreatePage;

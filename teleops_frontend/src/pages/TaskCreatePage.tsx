// Task Creation Page - Drag & Drop Task Builder
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
} from "@mui/material";
import { ArrowBack, DragIndicator, Add, Delete, Edit, LocationOn, Business, People, PlayArrow, CheckCircle, ExpandMore, Warning, Info, Search, FilterList } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { TaskType, ActivityType, AssignmentType } from "../types/task";
import { FlowTemplate } from "../types/flow";
import { FlowService } from "../services/flowService";
import projectService, { Project } from "../services/projectService";
import siteService, { ProjectSite, Site } from "../services/siteService";

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

  const steps = ["Project & Basic Info", "Select Flow Template", "Select Sites", "Review & Create"];

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
              Select Sites for this Task
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose which sites will be involved in this task. Use filters and search to find specific sites. Click on any site card to select/deselect it.
            </Typography>
            {!taskBuilder.project_id ? (
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
                {/* Search and Filter Controls */}
                <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        placeholder="Search sites by name, ID, or cluster..."
                        value={siteSearchTerm}
                        onChange={(e) => setSiteSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Search />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth>
                        <InputLabel>Town Filter</InputLabel>
                        <Select
                          value={siteTownFilter}
                          onChange={(e) => {
                            const newTownFilter = e.target.value;
                            setSiteTownFilter(newTownFilter);
                            // Reset cluster filter if town filter changes to avoid incompatible combinations
                            if (newTownFilter !== "all") {
                              setSiteClusterFilter("all");
                            }
                          }}
                          label="Town Filter"
                        >
                          <MenuItem value="all">
                            All Towns (
                            {(() => {
                              // If cluster filter is active, count only sites from that cluster
                              if (siteClusterFilter !== "all") {
                                return projectSites.filter((ps) => {
                                  const siteData = ps.site_details || ps.site;
                                  if (!siteData) return false;
                                  const siteCluster = siteData.cluster || siteData.circle || siteData.zone;
                                  return siteCluster === siteClusterFilter;
                                }).length;
                              }
                              // If no cluster filter, show total sites
                              return projectSites.length;
                            })()}
                            )
                          </MenuItem>
                          {Array.from(
                            new Set(
                              projectSites
                                .filter((ps) => {
                                  // If cluster filter is active, only show towns from that cluster
                                  if (siteClusterFilter !== "all") {
                                    const siteData = ps.site_details || ps.site;
                                    if (!siteData) return false;
                                    const siteCluster = siteData.cluster || siteData.circle || siteData.zone;
                                    return siteCluster === siteClusterFilter;
                                  }
                                  return true;
                                })
                                .map((ps) => (ps.site_details || ps.site)?.town || (ps.site_details || ps.site)?.address)
                                .filter(Boolean)
                            )
                          )
                            .sort()
                            .map((town) => {
                              const count = projectSites.filter((ps) => {
                                const siteData = ps.site_details || ps.site;
                                if (!siteData) return false;
                                const siteTown = siteData.town || siteData.address;
                                const siteCluster = siteData.cluster || siteData.circle || siteData.zone;
                                // Count sites that match both town and cluster filter (if active)
                                const matchesTown = siteTown === town;
                                const matchesCluster = siteClusterFilter === "all" || siteCluster === siteClusterFilter;
                                return matchesTown && matchesCluster;
                              }).length;
                              return (
                                <MenuItem key={town} value={town}>
                                  {town} ({count})
                                </MenuItem>
                              );
                            })}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <FormControl fullWidth>
                        <InputLabel>Cluster Filter</InputLabel>
                        <Select
                          value={siteClusterFilter}
                          onChange={(e) => {
                            const newClusterFilter = e.target.value;
                            setSiteClusterFilter(newClusterFilter);
                            // Reset town filter if cluster filter changes to avoid incompatible combinations
                            if (newClusterFilter !== "all") {
                              setSiteTownFilter("all");
                            }
                          }}
                          label="Cluster Filter"
                        >
                          <MenuItem value="all">
                            All Clusters (
                            {(() => {
                              // If town filter is active, count only sites from that town
                              if (siteTownFilter !== "all") {
                                return projectSites.filter((ps) => {
                                  const siteData = ps.site_details || ps.site;
                                  if (!siteData) return false;
                                  const siteTown = siteData.town || siteData.address;
                                  return siteTown === siteTownFilter;
                                }).length;
                              }
                              // If no town filter, show total sites
                              return projectSites.length;
                            })()}
                            )
                          </MenuItem>
                          {Array.from(
                            new Set(
                              projectSites
                                .filter((ps) => {
                                  // If town filter is active, only show clusters from that town
                                  if (siteTownFilter !== "all") {
                                    const siteData = ps.site_details || ps.site;
                                    if (!siteData) return false;
                                    const siteTown = siteData.town || siteData.address;
                                    return siteTown === siteTownFilter;
                                  }
                                  return true;
                                })
                                .map((ps) => (ps.site_details || ps.site)?.cluster || (ps.site_details || ps.site)?.circle || (ps.site_details || ps.site)?.zone)
                                .filter(Boolean)
                            )
                          )
                            .sort()
                            .map((cluster) => {
                              const count = projectSites.filter((ps) => {
                                const siteData = ps.site_details || ps.site;
                                if (!siteData) return false;
                                const siteCluster = siteData.cluster || siteData.circle || siteData.zone;
                                const siteTown = siteData.town || siteData.address;
                                // Count sites that match both cluster and town filter (if active)
                                const matchesCluster = siteCluster === cluster;
                                const matchesTown = siteTownFilter === "all" || siteTown === siteTownFilter;
                                return matchesCluster && matchesTown;
                              }).length;
                              return (
                                <MenuItem key={cluster} value={cluster}>
                                  {cluster} ({count})
                                </MenuItem>
                              );
                            })}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<FilterList />}
                        onClick={() => {
                          setSiteSearchTerm("");
                          setSiteTownFilter("all");
                          setSiteClusterFilter("all");
                        }}
                        fullWidth
                      >
                        Clear Filters
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Sites Grid - Two Column Layout */}
                {getFilteredProjectSites().length === 0 ? (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    {projectSites.length === 0 ? "No sites found for this project." : "No sites match the current filters."}
                  </Alert>
                ) : (
                  <Grid container spacing={2}>
                    {getFilteredProjectSites()
                      .map((projectSite) => {
                        // Handle both API and mock data structures
                        const siteData = projectSite.site_details || projectSite.site;
                        if (!siteData) return null; // Skip if no site data

                        const siteName = siteData.site_name || siteData.name || "";
                        const globalId = siteData.global_id || siteData.id;
                        const siteId = siteData.site_id || "";
                        const cluster = siteData.cluster || siteData.circle || siteData.zone || "N/A";
                        const role = projectSite.role || (projectSite.is_active ? "primary" : "far_end");
                        const status = siteData.status || (projectSite.is_active ? "active" : "inactive");
                        const town = siteData.town || siteData.address || "N/A";

                        return (
                          <Grid size={{ xs: 12, md: 6 }} key={projectSite.id}>
                            <Paper
                              elevation={1}
                              sx={{
                                p: 2,
                                border: taskBuilder.sites.find((s) => s.id === siteData.id.toString())?.selected ? "2px solid #1976d2" : "1px solid #e0e0e0",
                                borderRadius: 2,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                  elevation: 3,
                                  borderColor: "#1976d2",
                                  backgroundColor: "#fafafa",
                                },
                              }}
                              onClick={() => handleSiteToggle(siteData.id.toString())}
                            >
                              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                                {/* Checkbox */}
                                <Checkbox
                                  checked={taskBuilder.sites.find((s) => s.id === siteData.id.toString())?.selected || false}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleSiteToggle(siteData.id.toString());
                                  }}
                                  color="primary"
                                  sx={{ mt: 0.5 }}
                                />

                                {/* Site Content */}
                                <Box sx={{ flex: 1 }}>
                                  {/* Site Information */}
                                  <Box sx={{ mb: 1.5 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                      {siteName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
                                      ID: {siteId}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Global: {globalId}
                                    </Typography>
                                  </Box>
                                </Box>

                                {/* Location & GPS Coordinates */}
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-end", minWidth: 120 }}>
                                  {/* Location */}
                                  <Box sx={{ textAlign: "right" }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "flex-end", mb: 0.5 }}>
                                      <LocationOn color="primary" fontSize="small" />
                                      <Typography variant="body2" color="text.secondary">
                                        {town}
                                      </Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                      Cluster: {cluster}
                                    </Typography>
                                  </Box>

                                  {/* GPS Coordinates */}
                                  <Box sx={{ textAlign: "right" }}>
                                    {siteData.latitude && siteData.longitude ? (
                                      <Typography variant="body2" color="text.secondary">
                                        {siteData.latitude.toFixed(6)}, {siteData.longitude.toFixed(6)}
                                      </Typography>
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">
                                        GPS: Not available
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            </Paper>
                          </Grid>
                        );
                      })
                      .filter(Boolean)}
                  </Grid>
                )}
              </Box>
            )}
            {taskBuilder.sites.filter((s) => s.selected).length > 0 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>{taskBuilder.sites.filter((s) => s.selected).length} site(s) selected</strong> for this task. Sites:{" "}
                {taskBuilder.sites
                  .filter((s) => s.selected)
                  .map((s) => s.site_name)
                  .join(", ")}
              </Alert>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Task Configuration
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Task Details
                    </Typography>
                    <Typography>
                      <strong>Name:</strong> {taskBuilder.task_name}
                    </Typography>
                    <Typography>
                      <strong>Project:</strong> {taskBuilder.project_name}
                    </Typography>
                    <Typography>
                      <strong>Client:</strong> {taskBuilder.client_name}
                    </Typography>
                    <Typography>
                      <strong>Type:</strong> {taskBuilder.task_type.replace("_", " ")}
                    </Typography>
                    <Typography>
                      <strong>Priority:</strong> {taskBuilder.priority}
                    </Typography>
                    <Typography>
                      <strong>Estimated Duration:</strong> {taskBuilder.estimated_total_hours} hours
                    </Typography>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Selected Sites
                    </Typography>
                    {taskBuilder.sites
                      .filter((s) => s.selected)
                      .map((site) => (
                        <Box key={site.id} sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            <LocationOn fontSize="small" sx={{ mr: 1, verticalAlign: "middle" }} />
                            {site.site_name} ({site.site_role})
                          </Typography>
                        </Box>
                      ))}
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Workflow Summary
                    </Typography>
                    {taskBuilder.sub_activities.map((activity, index) => (
                      <Box key={activity.id} sx={{ mb: 2, p: 1, border: 1, borderColor: "divider", borderRadius: 1 }}>
                        <Typography variant="subtitle2">
                          {index + 1}. {activity.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {activity.activity_type} • {activity.estimated_hours}h • {activity.assignment_type.replace("_", " ")}
                        </Typography>
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
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
        return taskBuilder.sites.some((s) => s.selected);
      case 3:
        return true; // Review step
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
    </Box>
  );
};

export default TaskCreatePage;

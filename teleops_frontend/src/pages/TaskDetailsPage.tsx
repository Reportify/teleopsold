// Task Details Page - Comprehensive view of task information
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Tabs,
  Tab,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  IconButton,
  Tooltip,
  Badge,
  LinearProgress,
  Paper,
  Stack,
  Alert,
  Skeleton,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
} from "@mui/material";
import {
  ArrowBack,
  Edit,
  Delete,
  Assignment,
  CheckCircle,
  Schedule,
  Cancel,
  PlayArrow,
  Pause,
  Stop,
  LocationOn,
  Person,
  Business,
  Description,
  Timeline,
  Settings,
  Refresh,
  Visibility,
  Warning,
  Info,
  Error,
  AccountTree,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { TaskFromFlow, TaskSiteGroup, TaskSubActivity, Vendor, Task } from "../types/task";
import { taskService } from "../services/taskService";
import taskAllocationService, { TaskAllocation } from "../services/taskAllocationService";
import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/ThemeContext";
import { FeatureGate, useFeaturePermissions } from "../hooks/useFeaturePermissions";
import VendorSelectionDialog from "../components/VendorSelectionDialog";
import AllocationTypeDialog, { AllocationType } from "../components/AllocationTypeDialog";
import InternalTeamAssignmentDialog from "../components/InternalTeamAssignmentDialog";
import vendorService from "../services/vendorService";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`task-tabpanel-${index}`} aria-labelledby={`task-tab-${index}`} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const TaskDetailsPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { getCurrentTenant, isCorporateUser, isCircleUser } = useAuth();
  const { darkMode } = useDarkMode();

  // State
  const [task, setTask] = useState<TaskFromFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedSubActivity, setSelectedSubActivity] = useState<TaskSubActivity | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressNotes, setProgressNotes] = useState("");

  // Allocation state
  const [allocationTypeDialogOpen, setAllocationTypeDialogOpen] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [internalTeamDialogOpen, setInternalTeamDialogOpen] = useState(false);
  const [selectedTaskForAllocation, setSelectedTaskForAllocation] = useState<TaskFromFlow | null>(null);
  const [allocationType, setAllocationType] = useState<AllocationType | null>(null);

  // Real vendors from backend
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsError, setVendorsError] = useState<string | null>(null);

  // Teams data
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  // Allocation details state
  const [allocations, setAllocations] = useState<TaskAllocation[]>([]);
  const [allocationsLoading, setAllocationsLoading] = useState(false);
  const [allocationsError, setAllocationsError] = useState<string | null>(null);

  // Timeline state
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  // Feature permissions
  const { hasPermission } = useFeaturePermissions();
  const canEditTasks = hasPermission("tasks.edit");
  const canDeleteTasks = hasPermission("tasks.delete");

  // Load task data
  useEffect(() => {
    if (taskId) {
      loadTaskData();
    }
  }, [taskId]);

  // Fetch vendors on component mount
  useEffect(() => {
    if (task?.project) {
      const fetchProjectVendors = async () => {
        setVendorsLoading(true);
        try {
          const projectVendors = await vendorService.getProjectVendors(task.project);
          setVendors(projectVendors);
        } catch (error) {
          console.error("Error fetching project vendors:", error);
          setVendorsError("Failed to fetch project vendors");
        } finally {
          setVendorsLoading(false);
        }
      };

      fetchProjectVendors();
    }
  }, [task]);

  // Fetch teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      setTeamsLoading(true);
      try {
        const teamsData = await taskService.getTeams();
        setTeams(teamsData as any[]);
      } catch (error) {
        console.error("Error fetching teams:", error);
        setTeamsError("Failed to fetch teams");
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Helper functions to get names by ID
  const getVendorName = (vendorId: number) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    return vendor ? vendor.name : `Vendor ID: ${vendorId}`;
  };

  const getTeamName = (teamId: number) => {
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : `Team ID: ${teamId}`;
  };

  // Helper function to determine task origin
  const getTaskOrigin = () => {
    if (!task) return null;

    // Check if task has allocations from external clients
    const clientAllocation = allocations?.find((allocation) => allocation.allocation_type === "vendor" && allocation.vendor_relationship);

    // Check if task has client-provided ID
    const hasClientTaskId = task.is_client_id_provided && task.client_task_id;

    if (clientAllocation || hasClientTaskId) {
      let description = "Allocated from client";

      // Build description with client information
      if (clientAllocation?.client_tenant_name) {
        const clientInfo = clientAllocation.client_tenant_code ? `${clientAllocation.client_tenant_name} (${clientAllocation.client_tenant_code})` : clientAllocation.client_tenant_name;
        description = `Allocated by ${clientInfo}`;
      }

      if (hasClientTaskId) {
        description += ` • Client Task ID: ${task.client_task_id}`;
      }

      return {
        type: "client_allocated",
        label: "Client Allocated",
        color: "info" as const,
        iconType: "Business",
        description,
      };
    }

    return {
      type: "self_created",
      label: "Self Created",
      color: "success" as const,
      iconType: "AccountTree",
      description: "Created internally",
    };
  };

  const loadAllocationData = async () => {
    if (!taskId) return;

    try {
      setAllocationsLoading(true);
      setAllocationsError(null);

      const allocationData = await taskAllocationService.getTaskAllocations({ task_id: taskId });
      setAllocations(allocationData);
    } catch (err) {
      console.error("Error loading allocations:", err);
      setAllocationsError("Failed to load allocation details");
    } finally {
      setAllocationsLoading(false);
    }
  };

  const loadTimelineData = async () => {
    if (!taskId) return;

    try {
      setTimelineLoading(true);
      setTimelineError(null);

      const timelineData = await taskAllocationService.getTaskTimeline(taskId);
      setTimelineEvents(timelineData);
    } catch (err) {
      console.error("Error loading timeline:", err);
      setTimelineError("Failed to load timeline data");
    } finally {
      setTimelineLoading(false);
    }
  };

  const loadTaskData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!taskId) {
        setError("Task ID is required");
        return;
      }

      let taskData = null;
      let isClientAllocated = false;

      // First, try to fetch as a self-created task (tasks-from-flow)
      try {
        taskData = await taskService.getTaskFromFlowById(taskId);
        console.log("✅ Successfully fetched as self-created task:", taskData);
      } catch (err) {
        console.log("❌ Failed to fetch as self-created task, trying client-allocated...");

        // If that fails, try to fetch as a client-allocated task (task-allocations)
        try {
          const taskAllocationService = (await import("../services/taskAllocationService")).default;
          const allocationData = await taskAllocationService.getTaskAllocation(taskId);
          console.log("✅ Successfully fetched as client-allocated task:", allocationData);

          // Convert allocation data to TaskFromFlow format using the same adapter
          const adaptTaskAllocationToTaskFromFlow = (allocation: any): TaskFromFlow => {
            let siteGroups = [];

            if (allocation.site_groups && allocation.site_groups.length > 0) {
              siteGroups = allocation.site_groups;
            } else if (allocation.sub_activity_allocations) {
              const uniqueSites = new Map();

              allocation.sub_activity_allocations.forEach((subAlloc: any, index: number) => {
                const siteAlias = subAlloc.site_alias || `Site-${index + 1}`;
                const siteKey = siteAlias;

                if (!uniqueSites.has(siteKey)) {
                  uniqueSites.set(siteKey, {
                    id: uniqueSites.size + 1,
                    site_alias: siteAlias,
                    site_name: subAlloc.site_name || "",
                    site_global_id: subAlloc.site_global_id || "",
                    site_business_id: subAlloc.site_business_id || "",
                    assignment_order: uniqueSites.size + 1,
                    site: null,
                  });
                }
              });

              siteGroups = Array.from(uniqueSites.values());
            }

            return {
              id: allocation.id,
              task_id: allocation.task_id,
              client_task_id: allocation.client_task_id || undefined,
              is_client_id_provided: Boolean(allocation.client_task_id),
              task_name: allocation.task_name,
              description: allocation.description || "",
              flow_template: allocation.flow_template || "",
              flow_template_name: allocation.flow_template_name || "",
              project: allocation.task || allocation.project_id || 0,
              project_name: allocation.project_name || "",
              status: allocation.status || "pending",
              priority: allocation.priority || "medium",
              scheduled_start: allocation.scheduled_start || undefined,
              scheduled_end: allocation.scheduled_end || undefined,
              created_by: allocation.created_by || 0,
              created_by_name: allocation.allocated_by_name || allocation.created_by_name || "",
              assigned_to: allocation.assigned_to || undefined,
              assigned_to_name: allocation.assigned_to_name || undefined,
              supervisor: allocation.supervisor || undefined,
              supervisor_name: allocation.supervisor_name || undefined,
              created_at: allocation.created_at || new Date().toISOString(),
              updated_at: allocation.updated_at || new Date().toISOString(),
              site_groups: siteGroups,
              sub_activities:
                allocation.sub_activity_allocations?.map((subAlloc: any) => ({
                  id: subAlloc.id,
                  activity_name: subAlloc.sub_activity_name,
                  activity_type: subAlloc.activity_type || "DISMANTLE",
                  sequence_order: subAlloc.sequence_order || 1,
                  status: subAlloc.status,
                  progress_percentage: subAlloc.progress_percentage || 0,
                  assigned_site: subAlloc.site_alias,
                  site_name: subAlloc.site_name,
                  site_global_id: subAlloc.site_global_id,
                  site_business_id: subAlloc.site_business_id,
                  dependencies: [],
                  notes: subAlloc.notes || "",
                })) || [],
              is_vendor_allocated: true, // Mark as client-allocated
            };
          };

          taskData = adaptTaskAllocationToTaskFromFlow(allocationData);
          isClientAllocated = true;
        } catch (allocationErr) {
          console.error("❌ Failed to fetch as both self-created and client-allocated task:", allocationErr);
          throw allocationErr;
        }
      }

      if (taskData) {
        setTask(taskData);
        console.log(`📋 Task loaded successfully as ${isClientAllocated ? "client-allocated" : "self-created"} task`);
        // Load allocation and timeline data after task is loaded
        loadAllocationData();
        loadTimelineData();
      } else {
        setError("Task not found");
      }
    } catch (err) {
      console.error("Error loading task:", err);
      setError("Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTaskData();
    await loadAllocationData();
    setRefreshing(false);
  };

  const handleEdit = () => {
    navigate(`/tasks/${taskId}/edit`);
  };

  const handleDelete = async () => {
    if (task && window.confirm(`Are you sure you want to delete task "${task.task_name}"?`)) {
      try {
        // TODO: Implement delete API call
        navigate("/tasks");
      } catch (err) {
        console.error("Error deleting task:", err);
      }
    }
  };

  // Task status update handlers
  const handleStartTask = async () => {
    if (task && taskId) {
      try {
        const updatedTask = await taskService.updateTaskStatus(taskId, "in_progress");
        if (updatedTask) {
          setTask(updatedTask);
        }
      } catch (err) {
        console.error("Error starting task:", err);
      }
    }
  };

  const handlePauseTask = async () => {
    if (task && taskId) {
      try {
        const updatedTask = await taskService.updateTaskStatus(taskId, "paused");
        if (updatedTask) {
          setTask(updatedTask);
        }
      } catch (err) {
        console.error("Error pausing task:", err);
      }
    }
  };

  const handleStopTask = async () => {
    if (task && taskId) {
      try {
        const updatedTask = await taskService.updateTaskStatus(taskId, "stopped");
        if (updatedTask) {
          setTask(updatedTask);
        }
      } catch (err) {
        console.error("Error stopping task:", err);
      }
    }
  };

  const handleCompleteTask = async () => {
    if (task && taskId) {
      try {
        const updatedTask = await taskService.updateTaskStatus(taskId, "completed");
        if (updatedTask) {
          setTask(updatedTask);
        }
      } catch (err) {
        console.error("Error completing task:", err);
      }
    }
  };

  // Sub-activity progress handlers
  const handleOpenProgressDialog = (subActivity: TaskSubActivity) => {
    setSelectedSubActivity(subActivity);
    setProgressValue(subActivity.progress_percentage);
    setProgressNotes(subActivity.notes || "");
    setProgressDialogOpen(true);
  };

  const handleUpdateProgress = async () => {
    if (selectedSubActivity && taskId) {
      try {
        const updatedTask = await taskService.updateTaskFromFlowSubActivityProgress(taskId, selectedSubActivity.id, progressValue, progressNotes);
        if (updatedTask) {
          setTask(updatedTask);
          setProgressDialogOpen(false);
          setSelectedSubActivity(null);
        }
      } catch (err) {
        console.error("Error updating progress:", err);
      }
    }
  };

  const handleAllocateSubTask = (subActivity: TaskSubActivity) => {
    setSelectedSubActivity(subActivity);
    setSelectedTaskForAllocation(task);
    setAllocationTypeDialogOpen(true);
  };

  const handleAllocationTypeSelection = (type: AllocationType) => {
    setAllocationType(type);
    if (type === "vendor") {
      setAllocationDialogOpen(true);
    } else if (type === "internal_team") {
      setInternalTeamDialogOpen(true);
    }
  };

  // Convert TaskFromFlow to Task for the VendorSelectionDialog
  const convertTaskFromFlowToTask = (taskFlow: TaskFromFlow): Task => {
    return {
      id: taskFlow.id, // Keep as UUID string
      task_id: taskFlow.task_id, // Add the missing task_id field
      task_name: taskFlow.task_name,
      task_type: "2G_DISMANTLE" as any, // Default type
      project_id: taskFlow.project,
      project_name: taskFlow.project_name,
      client_name: "Client", // Default client name
      status: taskFlow.status as any,
      progress_percentage: taskFlow.sub_activities.reduce((acc, sa) => acc + sa.progress_percentage, 0) / taskFlow.sub_activities.length || 0,
      sites_count: taskFlow.site_groups.length,
      requires_coordination: taskFlow.site_groups.length > 1,
      estimated_duration_hours: 48, // Default duration
      created_at: taskFlow.created_at,
      created_by: taskFlow.created_by_name,
      sub_activities: taskFlow.sub_activities.map((sa) => ({
        id: sa.id, // Keep as UUID string
        sub_activity_name: sa.activity_name,
        activity_type: sa.activity_type as any,
        sequence_order: sa.sequence_order,
        assignment_type: "VENDOR_ALLOCATION" as any,
        status: sa.status as any,
        progress_percentage: sa.progress_percentage,
        assigned_site: typeof sa.assigned_site === "string" ? parseInt(sa.assigned_site) : sa.assigned_site,
        site_name: sa.site_name,
        site_global_id: sa.site_global_id,
        site_business_id: sa.site_business_id,
        execution_dependencies: sa.dependencies.map((d) => parseInt(d)),
        estimated_duration_hours: 8, // Default duration
        work_instructions: sa.notes || "",
      })),
      sites: taskFlow.site_groups.map((sg) => ({
        id: parseInt(sg.id),
        site_id: sg.site,
        site_name: sg.site_name,
        site_role: "Primary" as any,
        sequence_order: sg.assignment_order,
        location: {
          latitude: 0, // Default values
          longitude: 0,
          address: "Site location",
        },
        work_instructions: "Site-specific instructions",
        estimated_duration_hours: 8,
      })),
    };
  };

  const handleAllocationComplete = (task: Task, vendor: Vendor | null, allocation?: any) => {
    // Update the task status to show it's been allocated
    setTask((prevTask) => {
      if (!prevTask) return prevTask;
      return {
        ...prevTask,
        status: allocation?.allocation_type === "vendor" ? "allocated" : "assigned",
        sub_activities: prevTask.sub_activities.map((sa) => (sa.id === selectedSubActivity?.id ? { ...sa, status: "allocated" } : sa)),
      };
    });

    setAllocationDialogOpen(false);
    setSelectedTaskForAllocation(null);
    setSelectedSubActivity(null);

    // Show success message
    alert(`Task successfully ${allocation?.allocation_type === "vendor" ? "allocated to vendor" : "assigned to internal team"}!`);
  };

  const handleInternalTeamAssignmentComplete = (memberId: number, estimatedStartDate: string, notes: string) => {
    // Update the task status to show it's been assigned to internal team
    setTask((prevTask) => {
      if (!prevTask) return prevTask;
      return {
        ...prevTask,
        sub_activities: prevTask.sub_activities.map((sa) => (sa.id === selectedSubActivity?.id ? { ...sa, status: "assigned" } : sa)),
      };
    });

    setInternalTeamDialogOpen(false);
    setSelectedTaskForAllocation(null);
    setSelectedSubActivity(null);

    // Show success message (you can implement a snackbar here)
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "success";
      case "in_progress":
        return "info";
      case "pending":
      case "received":
        return "warning";
      case "allocated":
        return "info";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  // Helper function to get appropriate status display for vendor portal
  const getDisplayStatus = () => {
    if (!task) return "";

    // Check if this task is allocated TO the current vendor (vendor portal context)
    const isAllocatedToVendor = allocations?.some((allocation) => allocation.allocation_type === "vendor" && allocation.vendor_relationship && task.status === "allocated");

    // If task is allocated to vendor but not yet assigned internally, show as 'received'
    if (isAllocatedToVendor) {
      return "received";
    }

    return task.status;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "default";
      default:
        return "default";
    }
  };

  const getActivityTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "dismantle":
        return "error";
      case "packaging":
        return "warning";
      case "transportation":
        return "info";
      case "installation":
        return "success";
      default:
        return "default";
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "created":
        return "primary.main";
      case "allocated":
      case "assigned":
        return "info.main";
      case "work_started":
        return "warning.main";
      case "work_completed":
        return "success.main";
      case "cancelled":
      case "deallocated":
        return "error.main";
      case "status_changed":
      case "progress_updated":
        return "secondary.main";
      default:
        return "grey.500";
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case "created":
        return <Assignment />;
      case "allocated":
      case "assigned":
        return <Person />;
      case "work_started":
        return <PlayArrow />;
      case "work_completed":
        return <CheckCircle />;
      case "cancelled":
      case "deallocated":
        return <Cancel />;
      case "status_changed":
        return <Edit />;
      case "progress_updated":
        return <Schedule />;
      case "comment_added":
        return <Description />;
      default:
        return <Info />;
    }
  };

  const renderEventDetails = (eventData: any) => {
    if (!eventData || Object.keys(eventData).length === 0) {
      return null;
    }

    // Special formatting for allocation events
    if (eventData.allocated_to && eventData.allocation_type) {
      return (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Allocated to:</strong> {eventData.allocated_to}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Allocation Type:</strong> {eventData.allocation_type === "vendor" ? "External Vendor" : "Internal Team"}
          </Typography>
          {eventData.previous_status && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Status Change:</strong> {eventData.previous_status} → {eventData.new_status}
            </Typography>
          )}
          {eventData.sub_activities_count && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Sub-activities:</strong> {eventData.sub_activities_count} activities allocated
            </Typography>
          )}
        </Box>
      );
    }

    // Special formatting for status change events
    if (eventData.previous_status && eventData.new_status) {
      return (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Status Change:</strong> {eventData.previous_status} → {eventData.new_status}
          </Typography>
          {eventData.reason && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Reason:</strong> {eventData.reason}
            </Typography>
          )}
        </Box>
      );
    }

    // Default formatting for other event types
    return (
      <Box sx={{ mt: 1 }}>
        {Object.entries(eventData).map(([key, value]) => (
          <Typography key={key} variant="body2" sx={{ mb: 0.5 }}>
            <strong>{key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}:</strong> {String(value)}
          </Typography>
        ))}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="text" width={200} height={24} />
        </Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rectangular" height={300} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (error || !task) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Task not found"}
        </Alert>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate("/tasks")}>
          Back to Tasks
        </Button>
      </Box>
    );
  }

  const taskOrigin = getTaskOrigin();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link component="button" variant="body2" onClick={() => navigate("/tasks")} sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            Tasks
          </Link>
          <Typography color="text.primary">{task.task_name}</Typography>
        </Breadcrumbs>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {task.task_name}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {task.description}
            </Typography>

            {/* Status and Priority Badges */}
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Chip label={getDisplayStatus()} color={getStatusColor(getDisplayStatus()) as any} size="small" icon={<CheckCircle />} />
              <Chip label={task.priority} color={getPriorityColor(task.priority) as any} size="small" variant="outlined" />
              <Chip label={task.task_id} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} />

              {/* Task Origin Badge */}
              {taskOrigin && (
                <Tooltip title={taskOrigin.description} arrow>
                  <Chip
                    label={taskOrigin.label}
                    color={taskOrigin.color}
                    size="small"
                    icon={taskOrigin.iconType === "Business" ? <Business /> : <AccountTree />}
                    variant="outlined"
                    sx={{
                      fontWeight: "medium",
                      "& .MuiChip-icon": {
                        fontSize: "16px",
                      },
                    }}
                  />
                </Tooltip>
              )}
            </Stack>
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={handleRefresh} disabled={refreshing}>
              Refresh
            </Button>
            {canEditTasks && (
              <Button variant="outlined" startIcon={<Edit />} onClick={handleEdit}>
                Edit
              </Button>
            )}
            {canDeleteTasks && (
              <Button variant="outlined" color="error" startIcon={<Delete />} onClick={handleDelete}>
                Delete
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<Assignment />}
              onClick={() => {
                setSelectedTaskForAllocation(task);
                setAllocationTypeDialogOpen(true);
              }}
              disabled={vendorsLoading}
            >
              {vendorsLoading ? "Loading..." : "Allocate"}
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Main Content */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Tabs */}
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
                <Tab label="Overview" />
                <Tab label="Sub-Activities" />
                <Tab label="Sites" />
                <Tab label="Timeline" />
                <Tab label="Allocation Details" />
                <Tab label="Settings" />
              </Tabs>
            </Box>

            {/* Tab Panels */}
            <TabPanel value={currentTab} index={0}>
              {/* Overview Tab */}
              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Basic Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemIcon>
                            <Business />
                          </ListItemIcon>
                          <ListItemText primary="Project" secondary={task.project_name} />
                        </ListItem>
                        {task.client_tenant_name && (
                          <ListItem>
                            <ListItemIcon>
                              <Business />
                            </ListItemIcon>
                            <ListItemText primary="Client" secondary={task.client_tenant_name} />
                          </ListItem>
                        )}
                        <ListItem>
                          <ListItemIcon>
                            <Description />
                          </ListItemIcon>
                          <ListItemText primary="Flow Template" secondary={task.flow_template_name} />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <Person />
                          </ListItemIcon>
                          <ListItemText primary="Created By" secondary={task.created_by_name} />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon>
                            <Schedule />
                          </ListItemIcon>
                          <ListItemText primary="Created" secondary={new Date(task.created_at).toLocaleString()} />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Progress and Statistics */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Progress & Statistics
                      </Typography>

                      {/* Overall Progress */}
                      <Box sx={{ mb: 3 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                          <Typography variant="body2">Overall Progress</Typography>
                          <Typography variant="body2">{task.sub_activities.reduce((acc, sa) => acc + sa.progress_percentage, 0) / task.sub_activities.length || 0}%</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={task.sub_activities.reduce((acc, sa) => acc + sa.progress_percentage, 0) / task.sub_activities.length || 0}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>

                      {/* Statistics */}
                      <List dense>
                        <ListItem>
                          <ListItemText primary="Total Sub-Activities" secondary={task.sub_activities.length} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Total Sites" secondary={task.site_groups.length} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Completed Activities" secondary={task.sub_activities.filter((sa) => sa.status === "completed").length} />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={currentTab} index={1}>
              {/* Sub-Activities Tab - Redesigned */}
              <Box sx={{ mb: 3, px: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6" color="primary">
                    Sub-Activities ({task.sub_activities.length})
                  </Typography>
                  <Chip label={`${task.sub_activities.filter((sa) => sa.status === "completed").length} of ${task.sub_activities.length} completed`} color="info" variant="outlined" size="small" />
                </Box>

                {/* Overall Progress Bar */}
                <Box sx={{ mb: 3, p: 2, backgroundColor: "rgba(0,0,0,0.02)", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      Overall Task Progress
                    </Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {Math.round(task.sub_activities.reduce((acc, sa) => acc + sa.progress_percentage, 0) / task.sub_activities.length)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={task.sub_activities.reduce((acc, sa) => acc + sa.progress_percentage, 0) / task.sub_activities.length}
                    sx={{
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: "rgba(0,0,0,0.1)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 6,
                        background: "linear-gradient(90deg, #2196f3 0%, #42a5f5 100%)",
                      },
                    }}
                  />
                </Box>

                {/* Full-width Sub-Activity Cards */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {task.sub_activities.map((subActivity, index) => (
                    <Card
                      key={subActivity.id}
                      variant="outlined"
                      sx={{
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          boxShadow: 2,
                          borderColor: "primary.main",
                        },
                        borderColor: subActivity.status === "completed" ? "success.main" : "divider",
                        backgroundColor: subActivity.status === "completed" ? "success.light" : "background.paper",
                      }}
                    >
                      <CardContent sx={{ p: 0 }}>
                        {/* Header Row */}
                        <Box sx={{ mt: 1, px: 3, pt: 3 }}>
                          <Box sx={{ display: "flex", gap: 3 }}>
                            {/* Left Section - Larger (2x2 Grid) */}
                            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                              {/* Top Row - Activity Info */}
                              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 3 }}>
                                {/* Square Button "1" */}
                                <Chip label={index + 1} size="small" variant="filled" color="primary" sx={{ minWidth: 32, height: 32 }} />
                                {/* Activity Name */}
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5 }}>
                                  <Typography variant="h6" fontWeight="medium" sx={{ lineHeight: 1.2 }}>
                                    {subActivity.activity_name}
                                  </Typography>
                                  <Chip
                                    label={subActivity.activity_type.replace("_", " ").toLowerCase()}
                                    size="small"
                                    color={getActivityTypeColor(subActivity.activity_type) as any}
                                    sx={{ fontSize: "0.7rem", height: 20 }}
                                  />
                                  <Chip
                                    label={subActivity.status}
                                    size="small"
                                    color={getStatusColor(subActivity.status) as any}
                                    variant={subActivity.status === "completed" ? "filled" : "outlined"}
                                    sx={{ fontSize: "0.7rem", height: 20 }}
                                  />
                                </Box>
                                {/* Activity Type */}
                                <Box
                                  sx={{
                                    p: 1,
                                    backgroundColor: "rgba(0,0,0,0.02)",
                                    borderRadius: 1,
                                    minWidth: 100,
                                  }}
                                ></Box>
                              </Box>

                              {/* Bottom Row - Site Details + Progress Bar */}
                              <Box sx={{ display: "flex", gap: 2 }}>
                                {/* Site Details - Location Card */}
                                <Box
                                  sx={{
                                    flex: 0.6,
                                    p: 2.5,
                                    backgroundColor: "rgba(33, 150, 243, 0.08)",
                                    borderRadius: 1.5,
                                    borderColor: "divider",
                                    minHeight: 80,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, width: "100%" }}>
                                    {/* Location Icon with Site Alias */}
                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <LocationOn fontSize="large" color="primary" sx={{ mb: 0.5 }} />
                                      <Typography variant="caption" color="text.secondary" fontWeight="medium">
                                        {(() => {
                                          const siteGroup = task.site_groups.find((sg: any) => sg.site_alias === subActivity.site_alias);
                                          return siteGroup?.site_alias || subActivity.site_alias || "Site Alias";
                                        })()}
                                      </Typography>
                                    </Box>

                                    {/* Site Information - Simplified Layout */}
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ mb: 1.5, lineHeight: 1.2 }}>
                                        {(() => {
                                          const siteGroup = task.site_groups.find((sg: any) => sg.site_alias === subActivity.site_alias);
                                          return siteGroup?.site_name || subActivity.site_name || "Tarad";
                                        })()}
                                      </Typography>

                                      {/* Two IDs in a column layout */}
                                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                        <Typography variant="body2" color="text.secondary" fontFamily="monospace" sx={{ fontSize: "0.75rem" }}>
                                          {(() => {
                                            const siteGroup = task.site_groups.find((sg: any) => sg.site_alias === subActivity.site_alias);
                                            const businessId = siteGroup?.site_business_id || subActivity.site_business_id;
                                            return businessId ? businessId : "Business ID";
                                          })()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" fontFamily="monospace" sx={{ fontSize: "0.75rem" }}>
                                          {(() => {
                                            const siteGroup = task.site_groups.find((sg: any) => sg.site_alias === subActivity.site_alias);
                                            const globalId = siteGroup?.site_global_id || subActivity.site_global_id;
                                            return globalId ? globalId : "Global ID";
                                          })()}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                </Box>

                                {/* Progress Bar - Simplified */}
                                <Box
                                  sx={{
                                    flex: 1.4,
                                    p: 2.5,
                                    minHeight: 80,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                  }}
                                >
                                  {/* Progress Header - Simple Layout */}
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      mb: 2,
                                    }}
                                  >
                                    <Typography variant="body1" fontWeight="medium" color="text.primary">
                                      Progress
                                    </Typography>
                                    <Typography variant="body1" fontWeight="bold" color="text.primary">
                                      {subActivity.progress_percentage}%
                                    </Typography>
                                  </Box>

                                  {/* Simple Progress Bar */}
                                  <Box>
                                    <LinearProgress
                                      variant="determinate"
                                      value={subActivity.progress_percentage}
                                      sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: "rgba(0,0,0,0.1)",
                                        "& .MuiLinearProgress-bar": {
                                          borderRadius: 4,
                                          background: subActivity.progress_percentage === 100 ? "linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)" : "linear-gradient(90deg, #2196f3 0%, #42a5f5 100%)",
                                        },
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Box>
                            </Box>

                            {/* Right Section - Smaller (2x1 Grid) */}
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                                minWidth: 140,
                              }}
                            >
                              {/* Button 1 */}
                              <Button
                                variant="contained"
                                size="medium"
                                startIcon={<Edit />}
                                onClick={() => handleOpenProgressDialog(subActivity)}
                                disabled={subActivity.status === "completed"}
                                sx={{
                                  minWidth: 140,
                                  borderRadius: 2,
                                  textTransform: "none",
                                  fontWeight: "medium",
                                  px: 3,
                                }}
                              >
                                {subActivity.status === "completed" ? "View Details" : "Update Progress"}
                              </Button>

                              {/* Button 2 - Allocation Status */}
                              {(subActivity as any).allocated_vendor || (subActivity as any).assigned_team ? (
                                <Box
                                  sx={{
                                    minWidth: 140,
                                    p: 1.5,
                                    borderRadius: 2,
                                    border: "1px solid",
                                    borderColor: "success.main",
                                    backgroundColor: "success.light",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Typography variant="caption" color="success.dark" fontWeight="medium">
                                    {(subActivity as any).allocated_vendor ? "Vendor" : "Internal Team"}
                                  </Typography>
                                  <Typography variant="body2" fontWeight="bold" color="text.primary" textAlign="center">
                                    {(subActivity as any).allocated_vendor ? (subActivity as any).allocated_vendor.name : (subActivity as any).assigned_team?.name}
                                  </Typography>
                                  <IconButton size="small" onClick={() => handleAllocateSubTask(subActivity)} sx={{ mt: 0.5, color: "primary.main" }}>
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </Box>
                              ) : (
                                <Button
                                  variant="outlined"
                                  size="medium"
                                  startIcon={<Assignment />}
                                  onClick={() => handleAllocateSubTask(subActivity)}
                                  disabled={vendorsLoading}
                                  sx={{
                                    minWidth: 140,
                                    borderRadius: 2,
                                    textTransform: "none",
                                    fontWeight: "medium",
                                    px: 3,
                                  }}
                                >
                                  {vendorsLoading ? "Loading..." : "Allocate"}
                                </Button>
                              )}
                              {/* Dependencies Section - Minimalist Design */}
                              {subActivity.dependencies.length > 0 && (
                                <Box sx={{ mt: 2, px: 3 }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                    <AccountTree
                                      sx={{
                                        fontSize: 16,
                                        color: "primary.main",
                                        opacity: 0.8,
                                      }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                      Depends on
                                    </Typography>
                                  </Box>
                                  <Box sx={{ mt: 1, pl: 2.5 }}>
                                    {subActivity.dependencies.map((depId) => {
                                      const dependentSubActivity = task?.sub_activities.find((sub) => sub.id === depId);
                                      if (dependentSubActivity) {
                                        return (
                                          <Box
                                            key={depId}
                                            sx={{
                                              display: "flex",
                                              alignItems: "flex-start",
                                              flexDirection: "column",
                                              gap: 1,
                                              py: 0.5,
                                            }}
                                          >
                                            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                                              {dependentSubActivity.activity_name}
                                            </Typography>
                                            <Chip label={dependentSubActivity.site_name} size="small" sx={{ fontSize: "0.7rem", height: 20 }} />
                                          </Box>
                                        );
                                      }
                                      return null;
                                    })}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
                <Box sx={{ pb: 3 }} />
              </Box>
            </TabPanel>

            <TabPanel value={currentTab} index={2}>
              {/* Sites Tab */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Associated Sites ({task.site_groups.length})
                  </Typography>

                  <Grid container spacing={2}>
                    {task.site_groups.map((siteGroup) => (
                      <Grid size={{ xs: 12, md: 6 }} key={siteGroup.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                              <Typography variant="subtitle1">{siteGroup.site_alias}</Typography>
                              <Chip label={`Order: ${siteGroup.assignment_order}`} size="small" variant="outlined" />
                            </Box>

                            <Typography variant="h6" gutterBottom>
                              {siteGroup.site_name}
                            </Typography>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Global ID: {siteGroup.site_global_id}
                            </Typography>

                            <Button variant="outlined" size="small" startIcon={<Visibility />} onClick={() => navigate(`/sites/${siteGroup.site}`)}>
                              View Site Details
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </TabPanel>

            <TabPanel value={currentTab} index={3}>
              {/* Timeline Tab */}
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6">Task Timeline</Typography>
                    <IconButton onClick={() => loadTimelineData()} disabled={timelineLoading}>
                      <Refresh />
                    </IconButton>
                  </Box>

                  {timelineLoading && (
                    <Box sx={{ py: 2 }}>
                      <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
                      <Skeleton variant="rectangular" height={60} sx={{ mb: 1 }} />
                      <Skeleton variant="rectangular" height={60} />
                    </Box>
                  )}

                  {timelineError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {timelineError}
                    </Alert>
                  )}

                  {!timelineLoading && !timelineError && timelineEvents.length === 0 && (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <Timeline sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        No timeline events found
                      </Typography>
                    </Box>
                  )}

                  {!timelineLoading && !timelineError && timelineEvents.length > 0 && (
                    <List>
                      {timelineEvents.map((event, index) => (
                        <React.Fragment key={event.id}>
                          <ListItem alignItems="flex-start">
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: getEventColor(event.event_type) }}>{getEventIcon(event.event_type)}</Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <Typography variant="subtitle2">{event.event_description}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(event.timestamp).toLocaleString()}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 1 }}>
                                  <Chip label={event.event_type.replace("_", " ").toUpperCase()} size="small" sx={{ mr: 1, mb: 1 }} />
                                  {event.user_name && <Chip label={`By: ${event.user_name}`} size="small" variant="outlined" sx={{ mb: 1 }} />}
                                  {event.event_data && Object.keys(event.event_data).length > 0 && (
                                    <Box sx={{ mt: 1, p: 1, bgcolor: "grey.50", borderRadius: 1 }}>
                                      <Typography variant="caption" color="text.secondary">
                                        Additional Details:
                                      </Typography>
                                      {renderEventDetails(event.event_data)}
                                    </Box>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                          {index < timelineEvents.length - 1 && <Divider variant="inset" component="li" />}
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </CardContent>
              </Card>
            </TabPanel>

            <TabPanel value={currentTab} index={4}>
              {/* Allocation Details Tab */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Allocation Details
                  </Typography>

                  {allocationsLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <Skeleton variant="rectangular" width="100%" height={200} />
                    </Box>
                  ) : allocationsError ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {allocationsError}
                    </Alert>
                  ) : allocations.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <Assignment sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        No allocations found for this task
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {allocations.map((allocation) => (
                        <Grid size={{ xs: 12 }} key={allocation.id}>
                          <Card variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                                <Typography variant="h6">Allocation #{allocation.id}</Typography>
                                <Chip
                                  label={allocation.status}
                                  color={allocation.status === "allocated" ? "success" : allocation.status === "pending" ? "warning" : allocation.status === "in_progress" ? "info" : "default"}
                                  size="small"
                                />
                              </Box>

                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <List dense>
                                    <ListItem>
                                      <ListItemIcon>
                                        <Business />
                                      </ListItemIcon>
                                      <ListItemText primary="Allocation Type" secondary={allocation.allocation_type} />
                                    </ListItem>
                                    <ListItem>
                                      <ListItemIcon>
                                        <Person />
                                      </ListItemIcon>
                                      <ListItemText primary="Allocated To" secondary={allocation.vendor_name || allocation.team_name || "N/A"} />
                                    </ListItem>
                                    <ListItem>
                                      <ListItemIcon>
                                        <Schedule />
                                      </ListItemIcon>
                                      <ListItemText primary="Created" secondary={new Date(allocation.created_at).toLocaleString()} />
                                    </ListItem>
                                  </List>
                                </Grid>

                                <Grid size={{ xs: 12, md: 6 }}>
                                  <List dense>
                                    {allocation.started_at && (
                                      <ListItem>
                                        <ListItemIcon>
                                          <PlayArrow />
                                        </ListItemIcon>
                                        <ListItemText primary="Started At" secondary={new Date(allocation.started_at).toLocaleString()} />
                                      </ListItem>
                                    )}
                                    {allocation.completed_at && (
                                      <ListItem>
                                        <ListItemIcon>
                                          <Stop />
                                        </ListItemIcon>
                                        <ListItemText primary="Completed At" secondary={new Date(allocation.completed_at).toLocaleString()} />
                                      </ListItem>
                                    )}
                                    <ListItem>
                                      <ListItemIcon>
                                        <Info />
                                      </ListItemIcon>
                                      <ListItemText primary="Sub-Activities" secondary={`${allocation.completed_sub_activities}/${allocation.total_sub_activities} completed`} />
                                    </ListItem>
                                  </List>
                                </Grid>
                              </Grid>

                              {/* Sub-Activities Details */}
                              {allocation.sub_activity_allocations && allocation.sub_activity_allocations.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: "bold" }}>
                                    Sub-Activity Details
                                  </Typography>
                                  <List dense>
                                    {allocation.sub_activity_allocations.map((subAllocation) => (
                                      <ListItem key={subAllocation.id} sx={{ pl: 0 }}>
                                        <ListItemIcon>
                                          <AccountTree fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                          primary={
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                              <Typography variant="body2" component="span">
                                                {subAllocation.sub_activity_name || `Sub-Activity ${subAllocation.sub_activity}`}
                                              </Typography>
                                              <Chip
                                                label={subAllocation.status}
                                                size="small"
                                                color={
                                                  subAllocation.status === "completed"
                                                    ? "success"
                                                    : subAllocation.status === "in_progress"
                                                    ? "info"
                                                    : subAllocation.status === "allocated"
                                                    ? "primary"
                                                    : "default"
                                                }
                                                sx={{ fontSize: "0.7rem", height: "20px" }}
                                              />
                                            </Box>
                                          }
                                          secondary={
                                            <Box>
                                              <Typography variant="caption" color="text.secondary">
                                                Site: {subAllocation.metadata?.site_name || "Not assigned"}
                                              </Typography>
                                              {subAllocation.progress_percentage > 0 && (
                                                <Box sx={{ mt: 0.5 }}>
                                                  <Typography variant="caption" color="text.secondary">
                                                    Progress: {subAllocation.progress_percentage}%
                                                  </Typography>
                                                  <LinearProgress variant="determinate" value={subAllocation.progress_percentage} sx={{ mt: 0.5, height: 4 }} />
                                                </Box>
                                              )}
                                            </Box>
                                          }
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </Box>
                              )}

                              {allocation.allocation_notes && (
                                <Box sx={{ mt: 2, p: 2, backgroundColor: "rgba(0,0,0,0.02)", borderRadius: 1 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Notes:</strong> {allocation.allocation_notes}
                                  </Typography>
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </TabPanel>

            <TabPanel value={currentTab} index={5}>
              {/* Settings Tab */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Task Settings
                  </Typography>

                  <Alert severity="info" sx={{ mb: 2 }}>
                    Advanced task configuration options will be available here in future updates.
                  </Alert>

                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Settings sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      Settings panel coming soon
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </TabPanel>
          </Card>
        </Grid>

        {/* Right Column - Sidebar */}
        <Grid size={{ xs: 12, lg: 4 }}>
          {/* Quick Actions */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>

              <Stack spacing={2}>
                <Button variant="contained" startIcon={<PlayArrow />} fullWidth disabled={task.status === "completed"} onClick={handleStartTask}>
                  Start Task
                </Button>

                <Button variant="outlined" startIcon={<Pause />} fullWidth disabled={task.status !== "in_progress"} onClick={handlePauseTask}>
                  Pause Task
                </Button>

                <Button variant="outlined" startIcon={<Stop />} fullWidth color="error" disabled={task.status === "completed"} onClick={handleStopTask}>
                  Stop Task
                </Button>

                <Button variant="outlined" startIcon={<CheckCircle />} fullWidth color="success" disabled={task.status === "completed"} onClick={handleCompleteTask}>
                  Mark Complete
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Task Metadata */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Task Metadata
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Task ID"
                    secondary={
                      <Typography variant="body2" fontFamily="monospace">
                        {task.task_id}
                      </Typography>
                    }
                  />
                </ListItem>

                <ListItem>
                  <ListItemText
                    primary="Client Task ID"
                    secondary={
                      <Typography variant="body2" fontFamily="monospace">
                        {task.client_task_id}
                      </Typography>
                    }
                  />
                </ListItem>

                <ListItem>
                  <ListItemText primary="Last Updated" secondary={new Date(task.updated_at).toLocaleString()} />
                </ListItem>

                <ListItem>
                  <ListItemText primary="Flow Template ID" secondary={task.flow_template} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progress Update Dialog */}
      <Dialog open={progressDialogOpen} onClose={() => setProgressDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Progress: {selectedSubActivity?.activity_name}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Update the progress percentage and add any notes for this sub-activity.
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Progress: {progressValue}%
              </Typography>
              <Slider
                value={progressValue}
                onChange={(e: Event, value: number | number[]) => setProgressValue(value as number)}
                min={0}
                max={100}
                step={5}
                marks={[
                  { value: 0, label: "0%" },
                  { value: 25, label: "25%" },
                  { value: 50, label: "50%" },
                  { value: 75, label: "75%" },
                  { value: 100, label: "100%" },
                ]}
                sx={{ mt: 1 }}
              />
            </Box>

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={progressNotes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProgressNotes(e.target.value)}
              placeholder="Add any notes about the progress..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgressDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateProgress}>
            Update Progress
          </Button>
        </DialogActions>
      </Dialog>

      {/* Allocation Type Selection Dialog */}
      <AllocationTypeDialog
        open={allocationTypeDialogOpen}
        onClose={() => setAllocationTypeDialogOpen(false)}
        onSelectType={handleAllocationTypeSelection}
        taskName={selectedTaskForAllocation?.task_name}
      />

      {/* Task Allocation Dialog */}
      {allocationType && (
        <VendorSelectionDialog
          open={allocationDialogOpen}
          onClose={() => setAllocationDialogOpen(false)}
          task={selectedTaskForAllocation ? convertTaskFromFlowToTask(selectedTaskForAllocation) : null}
          vendors={vendors}
          allocationType={allocationType}
          onAllocationComplete={handleAllocationComplete}
        />
      )}

      {/* Internal Team Assignment Dialog */}
      <InternalTeamAssignmentDialog
        open={internalTeamDialogOpen}
        onClose={() => setInternalTeamDialogOpen(false)}
        onAssignmentComplete={handleInternalTeamAssignmentComplete}
        taskName={selectedTaskForAllocation?.task_name}
      />
    </Box>
  );
};

export default TaskDetailsPage;

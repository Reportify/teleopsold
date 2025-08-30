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
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { TaskFromFlow, TaskSiteGroup, TaskSubActivity } from "../types/task";
import { taskService } from "../services/taskService";
import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/ThemeContext";
import { FeatureGate, useFeaturePermissions } from "../hooks/useFeaturePermissions";

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

  const loadTaskData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!taskId) {
        setError("Task ID is required");
        return;
      }

      // Call the real API endpoint
      const taskData = await taskService.getTaskFromFlowById(taskId);

      if (taskData) {
        setTask(taskData);
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

  const handleAssignSubTask = (subActivity: TaskSubActivity) => {
    // TODO: Implement subtask assignment logic
    console.log("Assigning subtask:", subActivity.id, subActivity.activity_name);
    // This could open a dialog to select users/teams to assign the subtask to
    // For now, just log the action
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "success";
      case "in_progress":
        return "info";
      case "pending":
        return "warning";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
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
              <Chip label={task.status} color={getStatusColor(task.status) as any} size="small" icon={<CheckCircle />} />
              <Chip label={task.priority} color={getPriorityColor(task.priority) as any} size="small" variant="outlined" />
              <Chip label={task.task_id} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} />
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
            <Button variant="contained" startIcon={<Assignment />} onClick={() => navigate(`/tasks/${taskId}/assign`)}>
              Assign
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
                                    borderRadius: 2.5,
                                    border: "1px solid",
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
                                            const globalId = siteGroup?.site_global_id || subActivity.site_global_id;
                                            return globalId ? globalId : "Global ID";
                                          })()}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" fontFamily="monospace" sx={{ fontSize: "0.75rem" }}>
                                          {(() => {
                                            const siteGroup = task.site_groups.find((sg: any) => sg.site_alias === subActivity.site_alias);
                                            const globalId = siteGroup?.site_global_id || subActivity.site_global_id;
                                            return globalId ? globalId.replace(/\d+$/, (match: string) => String(parseInt(match) + 1)) : "Site ID";
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

                              {/* Button 2 */}
                              <Button
                                variant="outlined"
                                size="medium"
                                startIcon={<Assignment />}
                                onClick={() => handleAssignSubTask(subActivity)}
                                sx={{
                                  minWidth: 140,
                                  borderRadius: 2,
                                  textTransform: "none",
                                  fontWeight: "medium",
                                  px: 3,
                                }}
                              >
                                Assign
                              </Button>
                            </Box>
                          </Box>
                        </Box>

                        {/* Dependencies Section - Below if exists */}
                        {subActivity.dependencies.length > 0 && (
                          <Box sx={{ mt: 2, px: 3 }}>
                            <Box
                              sx={{
                                p: 2,
                                backgroundColor: "warning.light",
                                borderRadius: 2,
                                border: "1px solid",
                                borderColor: "warning.main",
                                maxWidth: "fit-content",
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Info fontSize="small" color="warning" />
                                <Typography variant="body2" color="warning.dark" fontWeight="medium">
                                  Depends on: {subActivity.dependencies.join(", ")}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        )}
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
                  <Typography variant="h6" gutterBottom>
                    Task Timeline
                  </Typography>

                  <Alert severity="info" sx={{ mb: 2 }}>
                    Timeline feature will be implemented in future updates. This will show task progress, status changes, and activity updates over time.
                  </Alert>

                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Timeline sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      Timeline view coming soon
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </TabPanel>

            <TabPanel value={currentTab} index={4}>
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
    </Box>
  );
};

export default TaskDetailsPage;

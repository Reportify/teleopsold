// Task Details Page - Detailed view of a single task with sub-activities
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from "@mui/material";
import { ArrowBack, Edit, PlayArrow, Pause, CheckCircle, Schedule, Cancel, LocationOn, Business, People, Assignment, Timeline, Settings, Visibility } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/ThemeContext";
import { FeatureGate, useFeaturePermissions } from "../hooks/useFeaturePermissions";
import { useNavigate, useParams } from "react-router-dom";
import { Task } from "../types/task";
import { getMockTaskById } from "../mockData/tasks";

// Mock data for task details
const getMockTaskDetails = (id: number): Task | undefined => {
  return getMockTaskById(id);
};

const TaskDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCurrentTenant } = useAuth();
  const { darkMode } = useDarkMode();
  const { hasPermission } = useFeaturePermissions();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedSubActivity, setSelectedSubActivity] = useState<any>(null);

  // Load task details
  useEffect(() => {
    if (id) {
      // Simulate API call
      setTimeout(() => {
        const taskData = getMockTaskDetails(parseInt(id));
        setTask(taskData || null);
        setLoading(false);
      }, 500);
    }
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <Typography>Loading task details...</Typography>
      </Box>
    );
  }

  if (!task) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6">Task not found</Typography>
        <Button onClick={() => navigate("/tasks")} sx={{ mt: 2 }}>
          Back to Tasks
        </Button>
      </Box>
    );
  }

  // Status badge component
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case "CREATED":
        case "UNALLOCATED":
          return "default";
        case "IN_PROGRESS":
        case "ALLOCATED":
        case "ASSIGNING":
        case "ASSIGNED":
          return "primary";
        case "COMPLETED":
          return "success";
        case "CANCELLED":
          return "error";
        default:
          return "default";
      }
    };

    return <Chip label={status.replace("_", " ")} color={getStatusColor(status)} size="small" variant="outlined" />;
  };

  // Progress bar component
  const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          flexGrow: 1,
          height: 8,
          borderRadius: 4,
          backgroundColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        }}
      />
      <Typography variant="caption" sx={{ minWidth: 35 }}>
        {progress}%
      </Typography>
    </Box>
  );

  // Handle assignment
  const handleAssignment = (subActivity: any) => {
    setSelectedSubActivity(subActivity);
    setAssignmentDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={() => navigate("/tasks")}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            {task.task_name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {task.project_name} • {task.client_name}
          </Typography>
        </Box>
        <FeatureGate featureId="tasks.edit">
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Edit />} onClick={() => navigate(`/tasks/${task.id}/edit`)}>
              Edit Task
            </Button>
            {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
              <Button
                variant="outlined"
                startIcon={<Assignment />}
                onClick={() => {
                  // Open a task-level assignment dialog
                  console.log("Edit task-level assignments");
                }}
              >
                Edit Assignments
              </Button>
            )}
          </Box>
        </FeatureGate>
      </Box>

      <Grid container spacing={3}>
        {/* Task Overview */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Task Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusBadge status={task.status} />
                  </Box>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {task.task_type.replace("_", " ")}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Sites
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {task.sites_count} site{task.sites_count > 1 ? "s" : ""}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {new Date(task.created_at).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">
                    Overall Progress
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <ProgressBar progress={task.progress_percentage} />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Sub-Activities */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sub-Activities
              </Typography>
              <List>
                {task.sub_activities?.map((subActivity, index) => (
                  <React.Fragment key={subActivity.id}>
                    <ListItem
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: darkMode ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)",
                      }}
                    >
                      <ListItemIcon>
                        <Typography variant="h6" color="primary">
                          {subActivity.sequence_order}
                        </Typography>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {subActivity.sub_activity_name}
                            </Typography>
                            <StatusBadge status={subActivity.status} />
                            {subActivity.status === "UNALLOCATED" && (
                              <Button size="small" variant="outlined" onClick={() => handleAssignment(subActivity)}>
                                Assign
                              </Button>
                            )}
                            {subActivity.status !== "COMPLETED" && subActivity.status !== "UNALLOCATED" && (
                              <IconButton size="small" onClick={() => handleAssignment(subActivity)} title="Edit Assignment">
                                <Edit fontSize="small" />
                              </IconButton>
                            )}
                            <Chip label={subActivity.activity_type} size="small" variant="filled" sx={{ ml: "auto" }} />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Assignment
                              </Typography>
                              <Typography variant="body2">
                                {subActivity.assigned_team ? (
                                  <>
                                    <People fontSize="small" sx={{ mr: 0.5, verticalAlign: "middle" }} />
                                    {subActivity.assigned_team.name}
                                    {subActivity.allocated_vendor && (
                                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                        via {subActivity.allocated_vendor.name}
                                      </Typography>
                                    )}
                                  </>
                                ) : subActivity.allocated_vendor ? (
                                  <>
                                    <Business fontSize="small" sx={{ mr: 0.5, verticalAlign: "middle" }} />
                                    {subActivity.allocated_vendor.name} (pending team assignment)
                                  </>
                                ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    Unassigned
                                  </Typography>
                                )}
                              </Typography>
                            </Box>
                            <ProgressBar progress={subActivity.progress_percentage} />
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Sites */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sites
              </Typography>
              {task.sites?.map((site) => (
                <Box key={site.id} sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <LocationOn fontSize="small" color="primary" />
                    <Typography variant="subtitle2">{site.site_name}</Typography>
                    <Chip label={site.site_role.replace("_", " ")} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {site.location.address}
                  </Typography>
                  {site.work_instructions && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                      {site.work_instructions}
                    </Typography>
                  )}
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Timeline
              </Typography>
              <List dense>
                {task.timeline?.slice(0, 5).map((event) => (
                  <ListItem key={event.id} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Timeline fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={event.event_description}
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(event.timestamp).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            by {event.updated_by}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              {(task.timeline?.length || 0) > 5 && (
                <Button size="small" sx={{ mt: 1 }}>
                  View All Events
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onClose={() => setAssignmentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedSubActivity?.status === "UNALLOCATED" ? "Assign" : "Edit Assignment"} Sub-Activity: {selectedSubActivity?.sub_activity_name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedSubActivity?.status === "UNALLOCATED" ? "Choose how to assign this sub-activity" : "Update the assignment for this sub-activity"}
          </Typography>

          {/* Current Assignment Info (for editing) */}
          {selectedSubActivity?.status !== "UNALLOCATED" && (
            <Box sx={{ mb: 2, p: 2, backgroundColor: "rgba(0, 0, 0, 0.04)", borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Current Assignment
              </Typography>
              <Typography variant="body2">
                {selectedSubActivity?.assigned_team ? (
                  <>
                    <People fontSize="small" sx={{ mr: 0.5, verticalAlign: "middle" }} />
                    {selectedSubActivity.assigned_team.name}
                    {selectedSubActivity.allocated_vendor && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        via {selectedSubActivity.allocated_vendor.name}
                      </Typography>
                    )}
                  </>
                ) : selectedSubActivity?.allocated_vendor ? (
                  <>
                    <Business fontSize="small" sx={{ mr: 0.5, verticalAlign: "middle" }} />
                    {selectedSubActivity.allocated_vendor.name} (pending team assignment)
                  </>
                ) : (
                  "Unassigned"
                )}
              </Typography>
            </Box>
          )}

          <TextField fullWidth select label="Assignment Type" sx={{ mb: 2 }} defaultValue={selectedSubActivity?.assignment_type === "DIRECT_ASSIGNMENT" ? "internal" : "vendor"}>
            <MenuItem value="vendor">Allocate to Vendor</MenuItem>
            <MenuItem value="internal">Assign to Internal Team</MenuItem>
          </TextField>

          <TextField fullWidth select label="Select Vendor/Team">
            <MenuItem value="vendor1">Field Services Vendor A</MenuItem>
            <MenuItem value="vendor2">Transport Vendor B</MenuItem>
            <MenuItem value="vendor3">Installation Specialists Ltd</MenuItem>
            <MenuItem value="team1">Internal Packaging Team</MenuItem>
            <MenuItem value="team2">Internal Installation Team</MenuItem>
          </TextField>

          {selectedSubActivity?.status !== "UNALLOCATED" && (
            <Typography variant="caption" color="warning.main" sx={{ mt: 2, display: "block" }}>
              Note: Changing assignment may affect task progress and timeline.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setAssignmentDialogOpen(false)}>
            {selectedSubActivity?.status === "UNALLOCATED" ? "Assign" : "Update Assignment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskDetailsPage;

// Tasks Page Component with Feature-Based Permissions
import React, { useState } from "react";
import { Box, Typography, Button, Paper, Card, CardContent, Chip, IconButton, TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { Add, Edit, Assignment, Comment, CheckCircle, Schedule, Person, LibraryBooks } from "@mui/icons-material";
import { FeatureGate } from "../hooks/useFeaturePermissions";

const TasksPage: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock task data
  const mockTasks = [
    {
      id: "1",
      title: "Site Survey - Mumbai BTS-001",
      description: "Complete initial site survey and documentation",
      status: "pending",
      priority: "high",
      assignee: "John Doe",
      dueDate: "2024-02-15",
      project: "Mumbai Circle BTS Dismantling",
    },
    {
      id: "2",
      title: "Equipment Installation - Delhi Tower-05",
      description: "Install 5G equipment and configure settings",
      status: "in_progress",
      priority: "medium",
      assignee: "Jane Smith",
      dueDate: "2024-02-20",
      project: "Delhi 5G Tower Installation",
    },
    {
      id: "3",
      title: "Maintenance Check - Bangalore Site-12",
      description: "Quarterly maintenance and safety inspection",
      status: "completed",
      priority: "low",
      assignee: "Mike Johnson",
      dueDate: "2024-02-10",
      project: "Bangalore Equipment Maintenance",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "in_progress":
        return "warning";
      case "pending":
        return "error";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with View Permission */}
      <FeatureGate
        featureId="task_view"
        fallback={
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
              You don't have permission to view tasks
            </Typography>
          </Box>
        }
      >
        <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 500, mb: 1 }}>
              Task Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage and track project tasks with workflow automation
            </Typography>
          </Box>

          {/* Create Task Button with Create Permission */}
          <FeatureGate featureId="task_create">
            <Button variant="contained" startIcon={<Add />} sx={{ textTransform: "none" }}>
              Create Task
            </Button>
          </FeatureGate>
        </Box>

        {/* Filters and Search */}
        <Box sx={{ mb: 3, display: "flex", gap: 2, alignItems: "center" }}>
          <TextField placeholder="Search tasks..." size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ minWidth: 250 }} />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Filter</InputLabel>
            <Select value={selectedFilter} label="Filter" onChange={(e) => setSelectedFilter(e.target.value)}>
              <MenuItem value="all">All Tasks</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>

          {/* Task Templates with Template Permission */}
          <FeatureGate featureId="task_template">
            <Button variant="outlined" startIcon={<LibraryBooks />} sx={{ textTransform: "none" }}>
              Templates
            </Button>
          </FeatureGate>
        </Box>

        {/* Task Cards */}
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))" }}>
          {mockTasks.map((task) => (
            <Card key={task.id} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
                      {task.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {task.description}
                    </Typography>
                  </Box>

                  {/* Edit Button with Edit Permission */}
                  <FeatureGate featureId="task_edit">
                    <IconButton size="small">
                      <Edit fontSize="small" />
                    </IconButton>
                  </FeatureGate>
                </Box>

                <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                  <Chip label={task.status} color={getStatusColor(task.status)} size="small" />
                  <Chip label={task.priority} color={getPriorityColor(task.priority)} size="small" variant="outlined" />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <Person fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {task.assignee}
                  </Typography>
                  <Schedule fontSize="small" color="action" sx={{ ml: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Due: {task.dueDate}
                  </Typography>
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                  Project: {task.project}
                </Typography>

                <Box sx={{ display: "flex", gap: 1 }}>
                  {/* Assign Task with Assign Permission */}
                  <FeatureGate featureId="task_assign">
                    <Button size="small" startIcon={<Assignment />} sx={{ textTransform: "none" }}>
                      Assign
                    </Button>
                  </FeatureGate>

                  {/* Comment on Task with Comment Permission */}
                  <FeatureGate featureId="task_comment">
                    <Button size="small" startIcon={<Comment />} sx={{ textTransform: "none" }}>
                      Comment
                    </Button>
                  </FeatureGate>

                  {task.status !== "completed" && (
                    <Button size="small" startIcon={<CheckCircle />} color="success" sx={{ textTransform: "none" }}>
                      Complete
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* No Tasks Message */}
        {mockTasks.length === 0 && (
          <Paper sx={{ p: 4, textAlign: "center", mt: 4 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              No tasks found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first task to get started with project management
            </Typography>
            <FeatureGate featureId="task_create">
              <Button variant="contained" startIcon={<Add />}>
                Create First Task
              </Button>
            </FeatureGate>
          </Paper>
        )}
      </FeatureGate>
    </Box>
  );
};

export default TasksPage;

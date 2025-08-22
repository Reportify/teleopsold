// Task Management Page - Main task list and management interface
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  IconButton,
  Tooltip,
  Stack,
  Tabs,
  Tab,
} from "@mui/material";
import { Add, Edit, Delete, Visibility, Assignment, CheckCircle, Schedule, Cancel, Task as TaskIcon, PlayArrow, Pause, Stop, AccountTree } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { DataTable, Column, RowAction } from "../components";
import { useDarkMode } from "../contexts/ThemeContext";
import { FeatureGate, useFeaturePermissions } from "../hooks/useFeaturePermissions";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Task, TaskStatus, TaskType } from "../types/task";
import { mockTasks } from "../mockData/tasks";
import FlowLibraryPage from "./FlowLibraryPage";

const TasksPage: React.FC = () => {
  const { getCurrentTenant, isCorporateUser, isCircleUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [loading, setLoading] = useState(false);
  const [error] = useState<string | null>(null);
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab state - initialize from query parameter
  const [currentTab, setCurrentTab] = useState(() => {
    const tabParam = searchParams.get("tab");
    return tabParam ? parseInt(tabParam, 10) : 0;
  });

  // Local state for filtering and search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Feature permissions
  const { hasPermission } = useFeaturePermissions();
  const canEditTasks = hasPermission("tasks.edit");
  const canDeleteTasks = hasPermission("tasks.delete");

  // Filter tasks based on search and filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        task.task_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.client_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesType = typeFilter === "all" || task.task_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [tasks, searchTerm, statusFilter, typeFilter]);

  // Status badge component
  const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
    const getStatusColor = (status: TaskStatus) => {
      switch (status) {
        case "CREATED":
          return "default";
        case "IN_PROGRESS":
          return "primary";
        case "COMPLETED":
          return "success";
        case "CANCELLED":
          return "error";
        default:
          return "default";
      }
    };

    const getStatusIcon = (status: TaskStatus) => {
      switch (status) {
        case "CREATED":
          return <Schedule fontSize="small" />;
        case "IN_PROGRESS":
          return <PlayArrow fontSize="small" />;
        case "COMPLETED":
          return <CheckCircle fontSize="small" />;
        case "CANCELLED":
          return <Cancel fontSize="small" />;
        default:
          return <Schedule fontSize="small" />;
      }
    };

    return <Chip icon={getStatusIcon(status)} label={status.replace("_", " ")} color={getStatusColor(status)} size="small" variant="outlined" />;
  };

  // Task type badge component
  const TaskTypeBadge: React.FC<{ type: TaskType }> = ({ type }) => {
    const getTypeLabel = (type: TaskType) => {
      switch (type) {
        case "2G_DISMANTLE":
          return "2G Dismantle";
        case "MW_DISMANTLE":
          return "MW Dismantle";
        case "INSTALLATION_COMMISSIONING":
          return "Installation & Commissioning";
        default:
          return type;
      }
    };

    return (
      <Chip
        label={getTypeLabel(type)}
        size="small"
        variant="filled"
        sx={{
          backgroundColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
          color: darkMode ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
        }}
      />
    );
  };

  // Progress bar component
  const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 120 }}>
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

  // Table columns
  const columns: Column[] = [
    {
      id: "task_name",
      label: "Task Name",
      sortable: true,
      format: (value, task) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {task.task_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {task.project_name}
          </Typography>
        </Box>
      ),
    },
    {
      id: "task_type",
      label: "Type",
      sortable: true,
      format: (value, task) => <TaskTypeBadge type={task.task_type} />,
    },
    {
      id: "client_name",
      label: "Client",
      sortable: true,
    },
    {
      id: "status",
      label: "Status",
      sortable: true,
      format: (value, task) => <StatusBadge status={task.status} />,
    },
    {
      id: "progress_percentage",
      label: "Progress",
      sortable: true,
      format: (value, task) => <ProgressBar progress={task.progress_percentage} />,
    },
    {
      id: "sites_count",
      label: "Sites",
      sortable: true,
      format: (value, task) => <Chip label={`${task.sites_count} site${task.sites_count > 1 ? "s" : ""}`} size="small" variant="outlined" color={task.requires_coordination ? "warning" : "default"} />,
    },
    {
      id: "created_at",
      label: "Created",
      sortable: true,
      format: (value, task) => new Date(task.created_at).toLocaleDateString(),
    },
  ];

  // Row actions
  const rowActions: RowAction[] = [
    {
      label: "View Details",
      icon: <Visibility />,
      onClick: (task) => navigate(`/tasks/${task.id}`),
    },
    ...(canEditTasks
      ? [
          {
            label: "Edit",
            icon: <Edit />,
            onClick: (task: Task) => navigate(`/tasks/${task.id}/edit`),
          },
        ]
      : []),
    ...(canDeleteTasks
      ? [
          {
            label: "Delete",
            icon: <Delete />,
            onClick: (task: Task) => {
              // TODO: Implement delete functionality
              console.log("Delete task:", task.id);
            },
            color: "error" as const,
          },
        ]
      : []),
  ];

  // Handle create task
  const handleCreateTask = () => {
    navigate("/tasks/create");
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Task Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage tasks, workflows, and execution across projects
          </Typography>
        </Box>
        {currentTab === 0 && (
          <Button variant="contained" startIcon={<Add />} onClick={handleCreateTask} sx={{ minWidth: 140 }}>
            Create Task
          </Button>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab icon={<TaskIcon />} label="Tasks" />
          <Tab icon={<AccountTree />} label="Flow Templates" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 && (
        <>
          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label="Search tasks..." variant="outlined" size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth select label="Status" size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="CREATED">Created</MenuItem>
                    <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                    <MenuItem value="COMPLETED">Completed</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth select label="Task Type" size="small" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="2G_DISMANTLE">2G Dismantle</MenuItem>
                    <MenuItem value="MW_DISMANTLE">MW Dismantle</MenuItem>
                    <MenuItem value="INSTALLATION_COMMISSIONING">Installation & Commissioning</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Tasks Table */}
          <Card>
            <DataTable rows={filteredTasks} columns={columns} loading={loading} error={error} actions={rowActions} emptyMessage="No tasks found" />
          </Card>
        </>
      )}

      {currentTab === 1 && (
        <Box sx={{ mt: -3 }}>
          <FlowLibraryPage />
        </Box>
      )}
    </Box>
  );
};

export default TasksPage;

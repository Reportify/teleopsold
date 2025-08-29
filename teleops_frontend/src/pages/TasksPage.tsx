// Task Management Page - Main task list and management interface
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  IconButton,
  Tooltip,
  Stack,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  Collapse,
  Divider,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Assignment,
  CheckCircle,
  Schedule,
  Cancel,
  Task as TaskIcon,
  PlayArrow,
  Pause,
  Stop,
  AccountTree,
  Refresh,
  Search,
  FilterList,
  Clear,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { DataTable, Column, RowAction, Pagination } from "../components";
import { useDarkMode } from "../contexts/ThemeContext";
import { FeatureGate, useFeaturePermissions } from "../hooks/useFeaturePermissions";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TaskFromFlow, TaskStatus, TaskSiteGroup } from "../types/task";
import FlowLibraryPage from "./FlowLibraryPage";
import { taskService } from "../services/taskService";
import { usePagination, PaginationFilters } from "../hooks/usePagination";

const TasksPage: React.FC = () => {
  const { getCurrentTenant, isCorporateUser, isCircleUser } = useAuth();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab state - initialize from query parameter
  const [currentTab, setCurrentTab] = useState(() => {
    const tabParam = searchParams.get("tab");
    return tabParam ? parseInt(tabParam, 10) : 0;
  });

  // Feature permissions
  const { hasPermission } = useFeaturePermissions();
  const canEditTasks = hasPermission("tasks.edit");
  const canDeleteTasks = hasPermission("tasks.delete");

  // Pagination hook
  const {
    data: tasks,
    pagination,
    loading,
    error,
    refresh,
    setPage,
    setPageSize,
    setFilters,
    clearFilters,
    hasNextPage,
    hasPreviousPage,
  } = usePagination(
    useCallback((page: number, pageSize: number, filters: PaginationFilters) => {
      return taskService.getTasksFromFlow(page, pageSize, filters);
    }, []),
    {
      status: "all",
      priority: "all",
    },
    {
      pageSize: 20,
      cacheKey: "tasks-from-flow",
      enableCache: true,
      cacheExpiry: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Debounced search
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update filters when search term changes
  useEffect(() => {
    setFilters({
      search: debouncedSearchTerm || undefined,
      status: searchParams.get("status") || "all",
      priority: searchParams.get("priority") || "all",
    });
  }, [debouncedSearchTerm, searchParams, setFilters]);

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

  // Priority badge component
  const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
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

    return <Chip label={priority} size="small" variant="filled" color={getPriorityColor(priority)} />;
  };

  // Table columns for TaskFromFlow
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
      id: "task_id",
      label: "Task ID",
      sortable: true,
      format: (value, task) => (
        <Typography variant="body2" fontFamily="monospace">
          {task.task_id}
        </Typography>
      ),
    },
    {
      id: "status",
      label: "Status",
      sortable: true,
      format: (value, task) => <StatusBadge status={task.status as TaskStatus} />,
    },
    {
      id: "priority",
      label: "Priority",
      sortable: true,
      format: (value, task) => <Chip label={task.priority} size="small" variant="outlined" color={task.priority === "high" ? "error" : task.priority === "medium" ? "warning" : "default"} />,
    },
    {
      id: "site_groups",
      label: "Sites",
      sortable: true,
      format: (value, task) => (
        <Box>
          {task.site_groups.map((siteGroup: TaskSiteGroup, index: number) => (
            <Box key={siteGroup.id} sx={{ mb: index < task.site_groups.length - 1 ? 1 : 0 }}>
              <Typography variant="body2" component="span">
                <strong>{siteGroup.site_alias}:</strong> {siteGroup.site_global_id || siteGroup.site_name}
              </Typography>
            </Box>
          ))}
        </Box>
      ),
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
            onClick: (task: TaskFromFlow) => navigate(`/tasks/${task.id}/edit`),
          },
        ]
      : []),
    ...(canDeleteTasks
      ? [
          {
            label: "Delete",
            icon: <Delete />,
            onClick: async (task: TaskFromFlow) => {
              if (window.confirm(`Are you sure you want to delete task "${task.task_name}"?`)) {
                try {
                  // TODO: Implement proper delete for TaskFromFlow
                  // For now, refresh the data to get updated list
                  refresh();
                } catch (err) {
                  console.error("Error deleting task:", err);
                }
              }
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
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={refresh} sx={{ minWidth: 120 }}>
              Refresh
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={handleCreateTask} sx={{ minWidth: 140 }}>
              Create Task
            </Button>
          </Box>
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
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" color="primary">
                  Filters & Search
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {pagination.totalItems} task{pagination.totalItems !== 1 ? "s" : ""} found
                </Typography>
              </Box>

              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Search tasks..."
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchTerm("")} edge="end">
                            <Clear />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    placeholder="Search by task name, ID, or project..."
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    select
                    label="Status"
                    size="small"
                    value={searchParams.get("status") || "all"}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(searchParams);
                      if (e.target.value === "all") {
                        newParams.delete("status");
                      } else {
                        newParams.set("status", e.target.value);
                      }
                      navigate(`?${newParams.toString()}`);
                    }}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="CREATED">Created</MenuItem>
                    <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                    <MenuItem value="COMPLETED">Completed</MenuItem>
                    <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    select
                    label="Priority"
                    size="small"
                    value={searchParams.get("priority") || "all"}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(searchParams);
                      if (e.target.value === "all") {
                        newParams.delete("priority");
                      } else {
                        newParams.set("priority", e.target.value);
                      }
                      navigate(`?${newParams.toString()}`);
                    }}
                  >
                    <MenuItem value="all">All Priorities</MenuItem>
                    <MenuItem value="Low">Low</MenuItem>
                    <MenuItem value="High">High</MenuItem>
                    <MenuItem value="Medium">Medium</MenuItem>
                    <MenuItem value="Critical">Critical</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              {/* Clear filters button */}
              {(searchParams.get("status") || searchParams.get("priority") || searchTerm) && (
                <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Clear />}
                    onClick={() => {
                      setSearchTerm("");
                      navigate("?");
                    }}
                  >
                    Clear All Filters
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card sx={{ mb: 3, borderColor: "error.main" }}>
              <CardContent>
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Tasks Table */}
          <Card>
            <DataTable rows={Array.isArray(tasks) ? tasks : []} columns={columns} loading={loading} error={null} actions={rowActions} emptyMessage="No tasks found" />
          </Card>

          {/* Pagination */}
          <Pagination
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onRefresh={refresh}
            pageSizeOptions={[10, 20, 50, 100]}
            showPageSizeSelector={true}
            showRefreshButton={true}
            disabled={loading}
          />
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

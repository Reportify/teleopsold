// Task Management Page - Main task list and management interface
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tabs,
  Tab,
  InputAdornment,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Schedule,
  Cancel,
  Task as TaskIcon,
  PlayArrow,
  AccountTree,
  Refresh,
  Search,
  Clear,
} from "@mui/icons-material";
import { DataTable, Pagination, TaskOriginBadge } from "../components";
import type { Column, RowAction } from "../components";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TaskFromFlow, TaskStatus, TaskSiteGroup } from "../types/task";
import { taskService } from "../services/taskService";
import { usePagination } from "../hooks/usePagination";
import { getTaskOrigin, getTaskOriginFilterOptions } from "../utils/taskOriginUtils";
import { AuthService } from "../services/authService";
import vendorService from "../services/vendorService";
import { useFeaturePermissions } from "../hooks/useFeaturePermissions";
import FlowLibraryPage from "./FlowLibraryPage";

const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Tab state - initialize from query parameter
  const [currentTab, setCurrentTab] = useState(() => {
    const tabParam = searchParams.get("tab");
    return tabParam ? parseInt(tabParam, 10) : 0;
  });

  // Search state - declare before using in usePagination
  const [searchTerm, setSearchTerm] = useState("");

  // Feature permissions
  const { hasPermission } = useFeaturePermissions();
  const canEditTasks = hasPermission("tasks.edit");
  const canDeleteTasks = hasPermission("tasks.delete");

  // Determine if user is vendor to use appropriate endpoint
  const isVendorUser = AuthService.isVendorUser();

  // Data adapter to normalize TaskAllocation to TaskFromFlow structure
  const adaptTaskAllocationToTaskFromFlow = (allocation: any): TaskFromFlow => {
    
    // Extract unique sites from sub_activity_allocations
    const siteGroups = [];
    if (allocation.sub_activity_allocations) {
      const uniqueSites = new Map();
      
      allocation.sub_activity_allocations.forEach((subAlloc: any) => {
        const siteKey = subAlloc.site_global_id || subAlloc.site_business_id || subAlloc.site_name;
        if (siteKey && !uniqueSites.has(siteKey)) {
          uniqueSites.set(siteKey, {
            id: uniqueSites.size + 1, // Generate a unique ID
            site_alias: subAlloc.site_name || subAlloc.site_global_id || subAlloc.site_business_id || 'Unknown Site',
            site_name: subAlloc.site_name || '',
            site_global_id: subAlloc.site_global_id || '',
            site_business_id: subAlloc.site_business_id || '',
            assignment_order: uniqueSites.size + 1,
            site: null // This would normally contain full site details
          });
        }
      });
      
      siteGroups.push(...Array.from(uniqueSites.values()));
    }
    
    console.log("adaptTaskAllocationToTaskFromFlow - created site_groups:", siteGroups);
    
    const adapted = {
      id: allocation.id,
      task_id: allocation.task_id,
      client_task_id: undefined,
      is_client_id_provided: false,
      task_name: allocation.task_name,
      description: allocation.allocation_notes || '',
      flow_template: '',
      flow_template_name: '',
      project: allocation.task || 0, // Use task ID if available
      project_name: allocation.project_name,
      status: allocation.status,
      priority: allocation.priority || 'medium',
      scheduled_start: undefined,
      scheduled_end: undefined,
      created_by: allocation.allocated_by,
      created_by_name: allocation.allocated_by_name,
      assigned_to: undefined,
      assigned_to_name: allocation.allocated_to_name,
      supervisor: undefined,
      supervisor_name: undefined,
      created_at: allocation.created_at,
      updated_at: allocation.updated_at,
      site_groups: siteGroups,
      // Add flag to indicate this task came from vendor allocation
      is_vendor_allocated: true,
      sub_activities: allocation.sub_activity_allocations?.map((subAlloc: any) => ({
        id: subAlloc.id,
        sequence_order: 0,
        activity_type: subAlloc.sub_activity_type || subAlloc.activity_type,
        activity_name: subAlloc.sub_activity_name || subAlloc.activity_name,
        description: subAlloc.notes || '',
        assigned_site: 0,
        site_alias: '',
        dependencies: [],
        dependency_scope: '',
        parallel_execution: false,
        status: subAlloc.status,
        actual_start: subAlloc.started_at,
        actual_end: subAlloc.completed_at,
        progress_percentage: subAlloc.progress_percentage || 0,
        notes: subAlloc.notes || '',
        created_at: subAlloc.created_at,
        updated_at: subAlloc.updated_at,
        site_name: subAlloc.site_name || '',
        site_global_id: subAlloc.site_global_id || '',
        site_business_id: subAlloc.site_business_id || '',
      })) || [],
    };
    return adapted;
  };

  // Get vendor relationship ID for vendor users
  const [vendorRelationshipId, setVendorRelationshipId] = useState<number | null>(null);
  
  useEffect(() => {
    let isMounted = true;

    if (isVendorUser) {
      vendorService.getCurrentVendorRelationshipId().then((id) => {
        if (isMounted) {
          setVendorRelationshipId(id);
        }
      }).catch((error) => {
        if (isMounted) {
          console.error("Error fetching vendor relationship ID:", error);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isVendorUser]);

  // For dual-role users (vendors who are also clients), we need to fetch both types of tasks
  const fetchParams = useMemo(() => ({
    page: parseInt(searchParams.get("page") || "1"),
    pageSize: parseInt(searchParams.get("pageSize") || "20"),
    vendor_id: vendorRelationshipId, // Use vendor relationship ID for vendor users
    project: searchParams.get("project") ? parseInt(searchParams.get("project")!) : undefined,
    flow_template: searchParams.get("flow_template") || undefined,
    status: searchParams.get("status") || undefined,
    search: searchTerm || undefined,
    priority: searchParams.get("priority") || undefined,
    created_after: searchParams.get("created_after") || undefined,
    created_before: searchParams.get("created_before") || undefined,
  }), [searchParams, vendorRelationshipId, searchTerm]);

  // Fetch vendor-allocated tasks (tasks allocated TO this user as a vendor)
  // Only fetch if user is a vendor and has a vendor relationship ID
  const shouldFetchVendorTasks = isVendorUser && vendorRelationshipId !== null;

  // Use refs to capture current values and avoid function recreation
  const isVendorUserRef = useRef(isVendorUser);
  const vendorRelationshipIdRef = useRef(vendorRelationshipId);
  
  // Update refs when values change
  useEffect(() => {
    isVendorUserRef.current = isVendorUser;
  }, [isVendorUser]);
  
  useEffect(() => {
    vendorRelationshipIdRef.current = vendorRelationshipId;
  }, [vendorRelationshipId]);

  // Create a stable function that handles conditional logic internally
  const vendorTasksFetchFunction = useCallback(async (page: number, pageSize: number, filters: any) => {
    const currentIsVendorUser = isVendorUserRef.current;
    const currentVendorRelationshipId = vendorRelationshipIdRef.current;
    
    if (!currentIsVendorUser || currentVendorRelationshipId === null) {
      return { results: [], count: 0, next: null, previous: null, current_page: 1, page_size: 20, total_pages: 0 };
    }
    
    // Prepare filters with vendor_id (not vendor_relationship)
    const vendorFilters = {
      ...filters,
      vendor_id: currentVendorRelationshipId, // Use vendor_id as expected by the service
      allocation_type: 'vendor' // Ensure we only get vendor allocations
    };

    try {
      const response = await taskService.getTaskAllocations(page, pageSize, vendorFilters);
      
      // Adapt the results to TaskFromFlow format
      const adaptedResults = response.results.map(adaptTaskAllocationToTaskFromFlow);
      
      return {
        ...response,
        results: adaptedResults
      };
    } catch (error) {
      console.error("Error in vendorTasksFetchFunction:", error);
      throw error;
    }
  }, []); // Empty dependency array for stable function

  const { data: vendorTasks, loading: vendorLoading, error: vendorError, pagination: vendorPagination, refresh: refreshVendor, setFilters: setVendorFilters } = usePagination(
    vendorTasksFetchFunction,
    fetchParams, // Remove vendor_id from initial filters since it's handled in the fetch function
    {
      cacheKey: "vendor-allocated-tasks",
    }
  );

  // Refresh vendor tasks when vendorRelationshipId changes
  useEffect(() => {
    if (vendorRelationshipId !== null) {
      // Just trigger a refresh since vendorTasksFetchFunction handles vendor_id internally
      refreshVendor();
    }
  }, [vendorRelationshipId, refreshVendor]);


  // Fetch self-created tasks (tasks created BY this user as a client)
  const { data: clientTasks, loading: clientLoading, error: clientError, pagination: clientPagination, refresh: refreshClient, setPage, setPageSize } = usePagination(
    taskService.getTasksFromFlow,
    fetchParams,
    {
      cacheKey: "self-created-tasks",
    }
  );

  // Merge and process tasks for dual-role users
  const tasks = useMemo(() => {
    const allTasks = [];
    
    console.log("Tasks merging - isVendorUser:", isVendorUser, "vendorRelationshipId:", vendorRelationshipId);
    console.log("Tasks merging - vendorTasks:", vendorTasks);
    console.log("Tasks merging - clientTasks:", clientTasks);
    
    // Add vendor-allocated tasks (if user is a vendor and has vendor relationship)
    // Note: vendorTasks are already adapted by vendorTasksFetchFunction
    if (isVendorUser && vendorTasks && vendorRelationshipId) {
      console.log("Adding vendor tasks:", vendorTasks.length);
      allTasks.push(...vendorTasks);
    }
    
    // Add self-created tasks (always include these)
    if (clientTasks) {
      console.log("Adding client tasks:", clientTasks.length);
      allTasks.push(...clientTasks);
    }
    
    // Remove duplicates based on task ID (in case a task appears in both lists)
    const uniqueTasks = allTasks.filter((task, index, self) => 
      index === self.findIndex(t => t.id === task.id)
    );
    
    return uniqueTasks;
  }, [isVendorUser, vendorTasks, clientTasks, vendorRelationshipId]);

  // Combine loading and error states
  const loading = vendorLoading || clientLoading;
  const error = vendorError || clientError;
  
  // Combined refresh function
  const refresh = () => {
    refreshVendor();
    refreshClient();
  };

  // Use client pagination as primary (since it's always present)
  const pagination = clientPagination;



  // Client-side filtering for origin
  const filteredTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    
    const originFilter = searchParams.get("origin") || "all";
    
    if (originFilter === "all") {
      return tasks;
    }
    
    return tasks.filter(task => {
      const origin = getTaskOrigin(task);
      return origin.type === originFilter;
    });
  }, [tasks, searchParams]);

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
      id: "origin",
      label: "Origin",
      sortable: false,
      format: (value, task) => {
        const origin = getTaskOrigin(task);
        return <TaskOriginBadge origin={origin} size="small" variant="outlined" />;
      },
    },
    {
      id: "site_groups",
      label: "Sites",
      sortable: true,
      format: (value, task) => {
        console.log("Sites column - task:", task.task_name, "site_groups:", task.site_groups);
        return (
          <Box>
            {task.site_groups.map((siteGroup: TaskSiteGroup, index: number) => {
              console.log("Sites column - siteGroup:", siteGroup);
              return (
                <Box key={siteGroup.id} sx={{ mb: index < task.site_groups.length - 1 ? 1 : 0 }}>
                  <Typography variant="body2" component="span">
                    <strong>{siteGroup.site_alias}:</strong> {siteGroup.site_name || siteGroup.site_global_id}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        );
      },
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
                  {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} found
                  {filteredTasks.length !== pagination.totalItems && (
                    <span> (filtered from {pagination.totalItems} total)</span>
                  )}
                </Typography>
              </Box>

              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 4 }}>
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
                <Grid size={{ xs: 12, md: 2 }}>
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
                <Grid size={{ xs: 12, md: 2 }}>
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
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField
                    fullWidth
                    select
                    label="Origin"
                    size="small"
                    value={searchParams.get("origin") || "all"}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(searchParams);
                      if (e.target.value === "all") {
                        newParams.delete("origin");
                      } else {
                        newParams.set("origin", e.target.value);
                      }
                      navigate(`?${newParams.toString()}`);
                    }}
                  >
                    {getTaskOriginFilterOptions().map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>

              {/* Clear filters button */}
              {(searchParams.get("status") || searchParams.get("priority") || searchParams.get("origin") || searchTerm) && (
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
            <DataTable rows={Array.isArray(filteredTasks) ? filteredTasks : []} columns={columns} loading={loading} error={null} actions={rowActions} emptyMessage="No tasks found" />
          </Card>

          {/* Pagination */}
          <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
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
          </Box>
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

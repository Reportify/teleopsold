// Task Allocation Page - Manage task allocation to vendors
import React, { useState, useEffect } from "react";
import { Box, Typography, Card, CardContent, Grid, Chip, Button, Alert, Tabs, Tab } from "@mui/material";
import { Assignment, CheckCircle, FilterList, Refresh, WorkOutline } from "@mui/icons-material";
import { ModernSnackbar, AppBreadcrumbs } from "../components";
import type { BreadcrumbItem } from "../components";
import type { Task, Vendor, TaskStatus } from "../types/task";
import TaskAllocationCard from "../components/TaskAllocationCard";
import VendorSelectionDialog from "../components/VendorSelectionDialog";
import vendorService from "../services/vendorService";

// Mock tasks removed - now fetching real tasks from backend
const mockTasks: Task[] = [];

// Mock vendors removed - now using real vendor data from backend

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`allocation-tabpanel-${index}`} aria-labelledby={`allocation-tab-${index}`} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

const TaskAllocationPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorsError, setVendorsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Dashboard", path: "/" },
    { label: "Tasks", path: "/tasks" },
    { label: "Task Allocation", path: "/tasks/allocation" },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleAllocationStart = (task: Task) => {
    setSelectedTask(task);
    setAllocationDialogOpen(true);
  };

  const handleAllocationComplete = (task: Task, vendor: Vendor | null, allocation?: any) => {
    setTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? { ...t, status: "IN_PROGRESS" as TaskStatus } : t)));

    setSnackbar({
      open: true,
      message: `Task "${task.task_name}" successfully ${allocation?.allocation_type === "vendor" ? "allocated to vendor" : "assigned to internal team"}`,
      severity: "success",
    });
  };

  // Fetch tasks on component mount
  useEffect(() => {
    const fetchTasks = async () => {
      setTasksLoading(true);
      setTasksError(null);
      try {
        // TODO: Replace with actual API call to fetch tasks
        // const tasksData = await taskService.getTasks();
        // setTasks(tasksData);

        // For now, set empty array until we implement the task service
        setTasks([]);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasksError("Failed to fetch tasks. Please try again.");
      } finally {
        setTasksLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Fetch vendors on component mount
  useEffect(() => {
    const fetchVendors = async () => {
      setVendorsLoading(true);
      setVendorsError(null);
      try {
        const vendorsData = await vendorService.getVendors();
        setVendors(vendorsData);
      } catch (error) {
        console.error("Error fetching vendors:", error);
        setVendorsError("Failed to fetch vendors. Please try again.");
      } finally {
        setVendorsLoading(false);
      }
    };

    fetchVendors();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <AppBreadcrumbs items={breadcrumbs} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Task Allocation Management
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" startIcon={<FilterList />} size="small">
            Filters
          </Button>
          <Button variant="outlined" startIcon={<Refresh />} size="small" onClick={() => setLoading(true)}>
            Refresh
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Allocation Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="primary">
                  {tasksLoading ? "..." : tasks.filter((t) => t.status === "CREATED").length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Allocation
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="warning.main">
                  {tasksLoading ? "..." : tasks.filter((t) => t.status === "IN_PROGRESS").length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Progress
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="success.main">
                  {tasksLoading ? "..." : tasks.filter((t) => t.status === "COMPLETED").length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="info.main">
                  {vendorsLoading ? "..." : vendors.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Available Vendors
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={selectedTab} onChange={handleTabChange}>
            <Tab label="Pending Allocation" />
            <Tab label="Allocated Tasks" />
            <Tab label="Completed Tasks" />
          </Tabs>
        </Box>

        <TabPanel value={selectedTab} index={0}>
          {tasksLoading ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography>Loading tasks...</Typography>
            </Box>
          ) : tasksError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {tasksError}
            </Alert>
          ) : tasks.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Tasks Available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tasks will appear here once they are created from project flows.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3} sx={{ p: 3 }}>
              {tasks
                .filter((task) => task.status === "CREATED")
                .map((task) => (
                  <Grid size={{ xs: 12, md: 6 }} key={task.id}>
                    <TaskAllocationCard task={task} onAllocate={handleAllocationStart} />
                  </Grid>
                ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {tasksLoading ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography>Loading tasks...</Typography>
            </Box>
          ) : tasksError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {tasksError}
            </Alert>
          ) : tasks.filter((task) => task.status === "IN_PROGRESS").length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Allocated Tasks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tasks that are allocated to vendors will appear here.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3} sx={{ p: 3 }}>
              {tasks
                .filter((task) => task.status === "IN_PROGRESS")
                .map((task) => (
                  <Grid size={{ xs: 12, md: 6 }} key={task.id}>
                    <TaskAllocationCard task={task} onAllocate={handleAllocationStart} />
                  </Grid>
                ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {tasksLoading ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography>Loading tasks...</Typography>
            </Box>
          ) : tasksError ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {tasksError}
            </Alert>
          ) : tasks.filter((task) => task.status === "COMPLETED").length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Completed Tasks
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed tasks will appear here.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3} sx={{ p: 3 }}>
              {tasks
                .filter((task) => task.status === "COMPLETED")
                .map((task) => (
                  <Grid size={{ xs: 12, md: 6 }} key={task.id}>
                    <TaskAllocationCard task={task} onAllocate={handleAllocationStart} />
                  </Grid>
                ))}
            </Grid>
          )}
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Vendor Performance & Availability
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overview of vendor capabilities, current workload, and performance metrics
            </Typography>
          </Box>

          {vendorsLoading && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Loading vendors...
              </Typography>
            </Box>
          )}

          {vendorsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {vendorsError}
            </Alert>
          )}

          {!vendorsLoading && !vendorsError && vendors.length === 0 && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No vendors available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No vendors have been configured yet
              </Typography>
            </Box>
          )}

          {!vendorsLoading && !vendorsError && vendors.length > 0 && (
            <Grid container spacing={2}>
              {vendors.map((vendor) => (
                <Grid size={{ xs: 12, md: 6 }} key={vendor.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Box>
                          <Typography variant="h6">{vendor.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {vendor.type}
                          </Typography>
                        </Box>
                        <Chip label="Available" color="success" size="small" />
                      </Box>

                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Vendor Code:</strong> {vendor.vendor_code}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Contact Person:</strong> {vendor.contact_person.name}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Email:</strong> {vendor.contact_person.email}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Card>

      <VendorSelectionDialog open={allocationDialogOpen} onClose={() => setAllocationDialogOpen(false)} task={selectedTask} vendors={vendors} onAllocationComplete={handleAllocationComplete} />

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default TaskAllocationPage;

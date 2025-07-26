// Circle User Management Page for Circle Tenants
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  Tabs,
  Tab,
  Alert,
  Tooltip,
  Stack,
  Divider,
  Avatar,
  Badge,
  ListItemIcon,
  FormHelperText,
} from "@mui/material";
import {
  Add,
  MoreVert,
  Person,
  Business,
  Group,
  AdminPanelSettings,
  SupervisorAccount,
  Badge as BadgeIcon,
  Email,
  Phone,
  Edit,
  Delete,
  Visibility,
  Send,
  CheckCircle,
  Warning,
  ErrorOutline,
  PersonAdd,
  Assignment,
  Analytics,
  Schedule,
  LocationOn,
  Work,
  ContactPhone,
  AlternateEmail,
  Refresh,
  Download,
  Search,
  FilterList,
} from "@mui/icons-material";

import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/ThemeContext";
import { StatsCard } from "../components";
import useEmployeeManagement from "../hooks/useEmployeeManagement";
import { EnhancedUserProfile, UserCreateData } from "../types/user";
import api from "../services/api";

// Using types from the hook - CircleUser is now EnhancedUserProfile
type CircleUser = EnhancedUserProfile;

interface CreateUserForm {
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  phone_number: string;
  secondary_phone: string;
  employee_id: string;
  designation_id: number;
  department_id: number;
  employment_type: string;
  password: string; // Adding password field
}

const CircleUserManagementPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const { darkMode } = useDarkMode();

  // Use the Employee Management Hook
  const {
    // Employee data
    employees,
    total,
    loading,
    error,
    selectedEmployee,
    setSelectedEmployee,

    // Employee operations
    loadEmployees,
    createEmployee,
    deleteEmployee,
    activateEmployee,
    deactivateEmployee,

    // Operation states
    creating,
    updating,
    deleting,

    // Statistics
    stats,
    loadEmployeeStats,

    // Designations
    designations,

    // Departments
    departments,

    // Utility functions
    searchEmployees,
    filterByDesignation,
    filterByActiveStatus,
    clearErrors,
  } = useEmployeeManagement();

  // Local UI state
  const [activeTab, setActiveTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const currentTenant = getCurrentTenant();

  // Map hook data to existing component variables for compatibility
  const users = employees; // Use employees from hook
  const selectedUser = selectedEmployee; // Use selectedEmployee from hook

  // Calculate statistics from actual user data instead of relying on potentially null stats
  const statistics = {
    total_users: users.length,
    active_users: users.filter((user) => user.is_active && user.user?.last_login).length,
    pending_users: users.filter((user) => user.is_active && !user.user?.last_login).length,
    admin_users: users.filter((user) => (user.designation as any)?.name?.toLowerCase().includes("admin")).length,
    inactive_users: users.filter((user) => !user.is_active).length,
  };

  // Create departments and designations counts from employees data
  const departmentCounts = employees.reduce((acc, user) => {
    const dept = (user as any).department || "Unassigned";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const designationsCount = employees.reduce((acc, user) => {
    if (user.designation) {
      const designationName = (user.designation as any).name;
      acc[designationName] = (acc[designationName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Form state for user creation
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: "",
    first_name: "",
    last_name: "",
    display_name: "",
    phone_number: "",
    secondary_phone: "",
    employee_id: "",
    designation_id: 0,
    department_id: 0,
    employment_type: "Full-time",
    password: "TempPassword123!", // Default temporary password
  });

  // Use designations from hook instead of separate state
  const availableDesignations = designations;

  // Debug logging to check data
  useEffect(() => {
    console.log("=== DESIGNATION DEBUG ===");
    console.log("Designations from hook:", designations);
    console.log("Designations length:", designations?.length);
    console.log("Designations type:", typeof designations);
    console.log("Designations is array:", Array.isArray(designations));
    if (designations && designations.length > 0) {
      console.log("First designation:", designations[0]);
    }

    console.log("=== DEPARTMENT DEBUG ===");
    console.log("Departments from hook:", departments);
    console.log("Departments length:", departments?.length);
    console.log("Departments type:", typeof departments);
    console.log("Departments is array:", Array.isArray(departments));
    if (departments && departments.length > 0) {
      console.log("First department:", departments[0]);
    }
    console.log("=== END DEBUG ===");
  }, [designations, departments]);

  // Load circle users using hook
  const loadCircleUsers = async () => {
    try {
      await loadEmployees();
      // Note: Statistics are now calculated from user data directly, not from API stats
      // await loadEmployeeStats(); // Uncomment if needed for other purposes
    } catch (error) {
      console.error("Error loading circle users:", error);
    }
  };

  useEffect(() => {
    loadCircleUsers();
  }, []);

  // Handle user creation
  const handleCreateUser = async () => {
    try {
      const payload: UserCreateData = {
        email: createForm.email,
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        password: createForm.password, // Use the password from the form
        employee_id: createForm.employee_id,
        phone_number: createForm.phone_number,
        designation_id: createForm.designation_id > 0 ? createForm.designation_id : undefined, // Only include if selected
        department_id: createForm.department_id > 0 ? createForm.department_id : undefined, // Only include if available
        circle_tenant_id: currentTenant?.id || "",
      };

      await createEmployee(payload);

      // Reset form and close dialog
      setCreateForm({
        email: "",
        first_name: "",
        last_name: "",
        display_name: "",
        phone_number: "",
        secondary_phone: "",
        employee_id: "",
        designation_id: 0,
        department_id: 0,
        employment_type: "Full-time",
        password: "TempPassword123!", // Reset password to temporary
      });
      setCreateDialogOpen(false);

      // Reload users
      await loadCircleUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      // Handle error display
    }
  };

  // Handle resend invitation
  const handleResendInvitation = async (userId: number) => {
    try {
      await api.post(`/api/v1/tenant/users/${userId}/resend-invitation/`);
      await loadCircleUsers(); // Refresh data
    } catch (error) {
      console.error("Error resending invitation:", error);
    }
  };

  // Handle user deactivation
  const handleDeactivateUser = async (userId: number) => {
    try {
      await api.delete(`/api/v1/tenant/users/${userId}/`);
      await loadCircleUsers(); // Refresh data
    } catch (error) {
      console.error("Error deactivating user:", error);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const userEmail = user.user?.email || "";
    const userDepartment = (user as any).department || "Unassigned";

    const matchesSearch =
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || userEmail.toLowerCase().includes(searchTerm.toLowerCase()) || userDepartment.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = departmentFilter === "all" || userDepartment === departmentFilter;

    const matchesStatus =
      statusFilter === "all" || (statusFilter === "active" && user.is_active) || (statusFilter === "inactive" && !user.is_active) || (statusFilter === "pending" && !user.user?.last_login);

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Helper functions
  const getStatusColor = (user: CircleUser) => {
    if (!user.is_active) return "error";
    if (!user.user?.last_login) return "warning";
    return "success";
  };

  const getStatusText = (user: CircleUser) => {
    if (!user.is_active) return "Inactive";
    if (!user.user?.last_login) return "Pending Setup"; // User created but hasn't logged in yet
    return "Active";
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case "Administrator":
        return "error";
      case "Supervisor":
        return "warning";
      case "Senior":
        return "info";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const handleUserMenuClick = (event: React.MouseEvent<HTMLButtonElement>, user: CircleUser) => {
    setUserMenuAnchor(event.currentTarget);
    setSelectedEmployee(user);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
    setSelectedEmployee(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Circle User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage users and designations for {currentTenant?.organization_name}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setCreateDialogOpen(true)} size="large">
          Add User
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatsCard title="Total Users" value={statistics.total_users} subtitle={`${statistics.active_users} active`} icon={Group} color="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatsCard title="Active Users" value={statistics.active_users} subtitle="Currently active" icon={CheckCircle} color="success" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatsCard title="Pending Invites" value={statistics.pending_users} subtitle="Awaiting setup" icon={Send} color="warning" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatsCard title="Administrators" value={statistics.admin_users} subtitle="User managers" icon={AdminPanelSettings} color="info" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatsCard title="Inactive Users" value={statistics.inactive_users} subtitle="Deactivated" icon={ErrorOutline} color="error" />
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} label="Department">
                  <MenuItem value="all">All Departments</MenuItem>
                  {Object.keys(departmentCounts).map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept} ({departmentCounts[dept]})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="pending">Pending Invitation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={loadCircleUsers}>
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          {loading && <LinearProgress sx={{ mb: 2 }} />}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Designations</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Access Level</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Avatar sx={{ mr: 2, bgcolor: "primary.main" }}>{user.full_name.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {user.full_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.user?.email || "No email"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(user.designation as any)?.name || "No designation"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        {user.phone_number && (
                          <Typography variant="body2" sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                            <Phone sx={{ fontSize: 16, mr: 1 }} />
                            {user.phone_number}
                          </Typography>
                        )}
                        {user.employee_id && (
                          <Typography variant="caption" color="text.secondary">
                            ID: {user.employee_id}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{(user as any).department || "Unassigned"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {user.designation ? (
                          <Chip key={user.designation.id} label={(user.designation as any).name} size="small" color="primary" variant="outlined" />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No designations
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={getStatusText(user)} color={getStatusColor(user)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label="Member" color="default" size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(user.user?.last_login || null)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton onClick={(e) => handleUserMenuClick(e, user)} size="small">
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No users found matching the current filters
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* User Actions Menu */}
      <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={handleUserMenuClose}>
        <MenuItem
          onClick={() => {
            // Handle view user details
            handleUserMenuClose();
          }}
        >
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            // Handle edit user
            handleUserMenuClose();
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          Edit User
        </MenuItem>
        {selectedUser && !selectedUser.user?.last_login && (
          <MenuItem
            onClick={() => {
              if (selectedUser) {
                handleResendInvitation(selectedUser.id);
              }
              handleUserMenuClose();
            }}
          >
            <ListItemIcon>
              <Send fontSize="small" />
            </ListItemIcon>
            Resend Invitation
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            if (selectedUser) {
              handleDeactivateUser(selectedUser.id);
            }
            handleUserMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          Deactivate User
        </MenuItem>
      </Menu>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Basic Information
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="First Name" value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} fullWidth required />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Last Name" value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} fullWidth required />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField label="Email Address" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} fullWidth required />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Phone Number" value={createForm.phone_number} onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })} fullWidth />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Secondary Phone" value={createForm.secondary_phone} onChange={(e) => setCreateForm({ ...createForm, secondary_phone: e.target.value })} fullWidth />
            </Grid>

            {/* Job Information */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Job Information
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Job Title (Designation)</InputLabel>
                <Select
                  value={createForm.designation_id}
                  onChange={(e) => {
                    const designationId = e.target.value as number;
                    const selectedDesignation = designations?.find((d) => d.id === designationId);
                    setCreateForm({
                      ...createForm,
                      designation_id: designationId,
                      // Auto-populate department from designation
                      department_id: selectedDesignation?.department || (selectedDesignation as any)?.department_id || 0,
                    });
                  }}
                  label="Job Title (Designation)"
                >
                  <MenuItem value={0}>{designations && designations.length > 0 ? "Select Designation" : "No Designations Available"}</MenuItem>
                  {designations && designations.length > 0
                    ? designations.map((designation) => (
                        <MenuItem key={designation.id} value={designation.id}>
                          {designation.designation_name || (designation as any).name}
                          {(designation.department_name || (designation as any).department) && ` (${designation.department_name || (designation as any).department})`}
                        </MenuItem>
                      ))
                    : null}
                </Select>
                {(!designations || designations.length === 0) && (
                  <FormHelperText>No designations found. Create departments and designations first, or leave empty for Administrator role.</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Employee ID" value={createForm.employee_id} onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })} fullWidth />
            </Grid>

            {/* Show guidance for first-time setup */}
            {(!designations || designations.length === 0) && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    First Time Setup Detected
                  </Typography>
                  <Typography variant="body2">
                    Since no departments and designations exist yet, this user will be created with Administrator privileges. You can later:
                    <br />• Create departments and designations using the "Designation Management" page
                    <br />• Update user designations from this page or their profile
                    <br />• Assign specific roles and permissions as needed
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Employment Type</InputLabel>
                <Select value={createForm.employment_type} onChange={(e) => setCreateForm({ ...createForm, employment_type: e.target.value })} label="Employment Type">
                  <MenuItem value="Full-time">Full-time</MenuItem>
                  <MenuItem value="Part-time">Part-time</MenuItem>
                  <MenuItem value="Contract">Contract</MenuItem>
                  <MenuItem value="Consultant">Consultant</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Password Field */}
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                fullWidth
                required
                helperText="Temporary password: TempPassword123!"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateUser} variant="contained" disabled={loading}>
            {loading ? "Creating..." : "Create User"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CircleUserManagementPage;

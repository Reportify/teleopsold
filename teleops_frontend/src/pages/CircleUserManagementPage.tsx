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
import api from "../services/api";

interface CircleUser {
  id: number;
  uuid: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  user_type: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;

  // Profile Information
  profile_id: number;
  display_name: string;
  phone_number: string;
  secondary_phone: string;
  employee_id: string;
  job_title: string;
  designation: string;
  department: string;
  employment_type: string;
  profile_photo: string | null;

  // Designations
  designations: Array<{
    id: number;
    name: string;
    level: number;
    department: string;
    can_approve_tasks: boolean;
    can_manage_users: boolean;
  }>;

  // Status
  verification_status: string;
  invitation_status: string;
  access_level: string;
  last_activity: string | null;
}

interface UserStatistics {
  total_users: number;
  active_users: number;
  pending_users: number;
  admin_users: number;
  inactive_users: number;
}

interface CreateUserForm {
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  phone_number: string;
  secondary_phone: string;
  employee_id: string;
  job_title: string;
  designation: string;
  department: string;
  employment_type: string;
  designation_ids: number[];
}

const CircleUserManagementPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const { darkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState(0);
  const [users, setUsers] = useState<CircleUser[]>([]);
  const [statistics, setStatistics] = useState<UserStatistics>({
    total_users: 0,
    active_users: 0,
    pending_users: 0,
    admin_users: 0,
    inactive_users: 0,
  });
  const [departments, setDepartments] = useState<Record<string, number>>({});
  const [designations, setDesignations] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CircleUser | null>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const currentTenant = getCurrentTenant();

  // Form state for user creation
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    email: "",
    first_name: "",
    last_name: "",
    display_name: "",
    phone_number: "",
    secondary_phone: "",
    employee_id: "",
    job_title: "",
    designation: "",
    department: "",
    employment_type: "Full-time",
    designation_ids: [],
  });

  const [availableDesignations, setAvailableDesignations] = useState<
    Array<{
      id: number;
      name: string;
      level: number;
      department: string;
    }>
  >([]);

  // Load circle users
  const loadCircleUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/v1/tenant/users/");

      if (response.data) {
        setUsers(response.data.users || []);
        setStatistics(response.data.statistics || {});
        setDepartments(response.data.departments || {});
        setDesignations(response.data.designations || {});
      }
    } catch (error) {
      console.error("Error loading circle users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load available designations for the form
  const loadAvailableDesignations = async () => {
    try {
      const response = await api.get("/api/v1/designations/");
      setAvailableDesignations(response.data || []);
    } catch (error) {
      console.error("Error loading designations:", error);
    }
  };

  useEffect(() => {
    loadCircleUsers();
    loadAvailableDesignations();
  }, []);

  // Handle user creation
  const handleCreateUser = async () => {
    try {
      setLoading(true);

      const payload = {
        ...createForm,
        display_name: createForm.display_name || `${createForm.first_name} ${createForm.last_name}`.trim(),
      };

      await api.post("/api/v1/tenant/users/", payload);

      // Reset form and close dialog
      setCreateForm({
        email: "",
        first_name: "",
        last_name: "",
        display_name: "",
        phone_number: "",
        secondary_phone: "",
        employee_id: "",
        job_title: "",
        designation: "",
        department: "",
        employment_type: "Full-time",
        designation_ids: [],
      });
      setCreateDialogOpen(false);

      // Reload users
      await loadCircleUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      // Handle error display
    } finally {
      setLoading(false);
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
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = departmentFilter === "all" || user.department === departmentFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active) ||
      (statusFilter === "pending" && user.verification_status === "invitation_sent");

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Helper functions
  const getStatusColor = (user: CircleUser) => {
    if (!user.is_active) return "error";
    if (user.verification_status === "invitation_sent") return "warning";
    return "success";
  };

  const getStatusText = (user: CircleUser) => {
    if (!user.is_active) return "Inactive";
    if (user.verification_status === "invitation_sent") return "Invitation Sent";
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
    setSelectedUser(user);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
    setSelectedUser(null);
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
                  {Object.keys(departments).map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept} ({departments[dept]})
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
                        <Avatar src={user.profile_photo || undefined} sx={{ mr: 2, bgcolor: "primary.main" }}>
                          {user.full_name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {user.full_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {user.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.job_title}
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
                      <Typography variant="body2">{user.department || "Unassigned"}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {user.designations.map((designation) => (
                          <Chip
                            key={designation.id}
                            label={designation.name}
                            size="small"
                            color={designation.can_manage_users ? "primary" : "default"}
                            variant={designation.can_approve_tasks ? "filled" : "outlined"}
                          />
                        ))}
                        {user.designations.length === 0 && (
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
                      <Chip label={user.access_level} color={getAccessLevelColor(user.access_level)} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(user.last_login)}</Typography>
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
        {selectedUser?.verification_status === "invitation_sent" && (
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
              <TextField label="Job Title" value={createForm.job_title} onChange={(e) => setCreateForm({ ...createForm, job_title: e.target.value })} fullWidth required />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Employee ID" value={createForm.employee_id} onChange={(e) => setCreateForm({ ...createForm, employee_id: e.target.value })} fullWidth />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Department" value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} fullWidth />
            </Grid>

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

            {/* Designations */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Designations (Optional)
              </Typography>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Assign Designations</InputLabel>
                <Select
                  multiple
                  value={createForm.designation_ids}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      designation_ids: e.target.value as number[],
                    })
                  }
                  label="Assign Designations"
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {(selected as number[]).map((value) => {
                        const designation = availableDesignations.find((d) => d.id === value);
                        return <Chip key={value} label={designation?.name || value} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {availableDesignations.map((designation) => (
                    <MenuItem key={designation.id} value={designation.id}>
                      <Checkbox checked={createForm.designation_ids.includes(designation.id)} />
                      {designation.name} - {designation.department}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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

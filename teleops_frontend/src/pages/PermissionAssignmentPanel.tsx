/**
 * Permission Assignment Panel
 * Comprehensive panel for managing permission assignments across designations, groups, and users
 * Implements the recommended 80/15/5 assignment strategy
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Assignment, WorkOutline, Groups, AdminPanelSettings, TrendingUp, Add, Refresh, Edit, Visibility, Person, Remove, School, Filter1, Filter2, Filter3 } from "@mui/icons-material";
import dayjs from "dayjs";
import { ModernSnackbar, AppBreadcrumbs } from "../components";
import type { BreadcrumbItem } from "../components";
import { rbacAPI, type PermissionGroup } from "../services/rbacAPI";
import userManagementAPI from "../services/userAPI";

interface AssignmentStrategy {
  type: "designation" | "group" | "override";
  description: string;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "warning";
  priority: number;
  usage_note: string;
}

const PermissionAssignmentPanel: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedAssignmentType, setSelectedAssignmentType] = useState<"designation" | "group" | "override" | null>(null);

  // Data states
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroup | null>(null);
  const [designations, setDesignations] = useState<any[]>([]);
  const [selectedDesignation, setSelectedDesignation] = useState<any | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<any[]>([]);
  const [assignmentReason, setAssignmentReason] = useState("");
  const [assignmentDuration, setAssignmentDuration] = useState("permanent");
  const [customStartDate, setCustomStartDate] = useState<any>(null);
  const [customEndDate, setCustomEndDate] = useState<any>(null);
  const [isPrimaryDesignation, setIsPrimaryDesignation] = useState(false);
  const [isTemporaryAssignment, setIsTemporaryAssignment] = useState(false);
  const [permissionLevel, setPermissionLevel] = useState("granted");
  const [requiresApproval, setRequiresApproval] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  // Load permission groups, designations, and users on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load permission groups
        const groupsResponse = await rbacAPI.getPermissionGroups();
        setPermissionGroups(groupsResponse.results);

        // Load designations
        const designationsResponse = await rbacAPI.getDesignations();
        setDesignations(designationsResponse);

        // Load permissions
        const permissionsResponse = await rbacAPI.getPermissions();
        setPermissions(permissionsResponse.results || permissionsResponse);

        // Load available users
        const usersResponse = await userManagementAPI.users.list();
        setAvailableUsers(usersResponse.results || []);
      } catch (error) {
        console.error("Error loading data:", error);
        setSnackbar({
          open: true,
          message: "Failed to load data",
          severity: "error",
        });
      }
    };

    loadData();
  }, []);

  // Assignment strategies configuration
  const assignmentStrategies: AssignmentStrategy[] = [
    {
      type: "designation",
      description: "Core permissions tied to job roles and designations",
      icon: <WorkOutline />,
      color: "primary",
      priority: 1,
      usage_note: "Primary method - covers most permission needs",
    },
    {
      type: "group",
      description: "Project-based and temporary team permissions",
      icon: <Groups />,
      color: "secondary",
      priority: 2,
      usage_note: "For projects and cross-functional teams",
    },
    {
      type: "override",
      description: "Emergency access and special circumstances",
      icon: <AdminPanelSettings />,
      color: "warning",
      priority: 3,
      usage_note: "Use sparingly for exceptions only",
    },
  ];

  const handleAssignmentAction = (type: "designation" | "group" | "override") => {
    setSelectedAssignmentType(type);
    setAssignmentDialogOpen(true);
  };

  const handleGroupAssignment = async () => {
    if (!selectedGroup || selectedUsers.length === 0) return;

    setLoading(true);
    try {
      // Extract TenantUserProfile IDs from selected users (user.id is the profile ID, not user_id)
      const userProfileIds = selectedUsers.map((user) => user.id);

      // Call the API to assign users to the group
      const result = await rbacAPI.assignUsersToGroup(selectedGroup.id, userProfileIds);

      setSnackbar({
        open: true,
        message: `Successfully assigned ${selectedUsers.length} user(s) to ${selectedGroup.group_name}`,
        severity: "success",
      });

      // Reset form
      setAssignmentDialogOpen(false);
      setSelectedUsers([]);
      setAssignmentReason("");
      setAssignmentDuration("permanent");
      setCustomStartDate(null);
      setCustomEndDate(null);
    } catch (error) {
      console.error("Error assigning users to group:", error);
      setSnackbar({
        open: true,
        message: "Failed to assign users to group. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDesignationAssignment = async () => {
    if (!selectedDesignation || selectedUsers.length === 0) return;

    setLoading(true);
    try {
      // Extract TenantUserProfile IDs from selected users
      const userProfileIds = selectedUsers.map((user) => user.id);

      // Prepare assignment data
      const assignmentData: any = {
        assignment_reason: assignmentReason,
        is_primary: isPrimaryDesignation,
        is_temporary: isTemporaryAssignment,
      };

      // Add date ranges if custom duration is selected
      if (assignmentDuration === "custom" && customStartDate && customEndDate) {
        assignmentData.effective_from = customStartDate.format("YYYY-MM-DD");
        assignmentData.effective_to = customEndDate.format("YYYY-MM-DD");
      }

      // Call the API to assign users to the designation
      const result = await rbacAPI.assignUsersToDesignation(selectedDesignation.id, userProfileIds, assignmentData);

      setSnackbar({
        open: true,
        message: `Successfully assigned ${selectedUsers.length} user(s) to ${selectedDesignation.designation_name}`,
        severity: "success",
      });

      // Reset form
      setSelectedDesignation(null);
      setSelectedUsers([]);
      setAssignmentReason("");
      setAssignmentDuration("permanent");
      setCustomStartDate(null);
      setCustomEndDate(null);
      setIsPrimaryDesignation(false);
      setIsTemporaryAssignment(false);
      setAssignmentDialogOpen(false);
    } catch (error) {
      console.error("Error assigning users to designation:", error);
      setSnackbar({
        open: true,
        message: "Failed to assign users to designation",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDesignationPermissionAssignment = async () => {
    if (!selectedDesignation || selectedPermissions.length === 0) return;

    setLoading(true);
    try {
      // Extract permission IDs from selected permissions
      const permissionIds = selectedPermissions.map((permission) => permission.id);

      // Prepare assignment data
      const assignmentData: any = {
        assignment_reason: assignmentReason,
        permission_level: permissionLevel,
        requires_approval: requiresApproval,
      };

      // Add date ranges if custom duration is selected
      if (assignmentDuration === "custom" && customStartDate && customEndDate) {
        assignmentData.effective_from = customStartDate.format("YYYY-MM-DD");
        assignmentData.effective_to = customEndDate.format("YYYY-MM-DD");
      }

      // Call the API to assign permissions to the designation
      const result = await rbacAPI.assignPermissionsToDesignation(selectedDesignation.id, permissionIds, assignmentData);

      setSnackbar({
        open: true,
        message: `Successfully assigned ${selectedPermissions.length} permission(s) to ${selectedDesignation.designation_name}`,
        severity: "success",
      });

      // Reset form
      setSelectedDesignation(null);
      setSelectedPermissions([]);
      setAssignmentReason("");
      setAssignmentDuration("permanent");
      setCustomStartDate(null);
      setCustomEndDate(null);
      setPermissionLevel("granted");
      setRequiresApproval(false);
      setAssignmentDialogOpen(false);
    } catch (error) {
      console.error("Error assigning permissions to designation:", error);
      setSnackbar({
        open: true,
        message: "Failed to assign permissions to designation",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Breadcrumb configuration
  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: "dashboard",
    },
    {
      label: "RBAC Management",
      path: "/rbac",
      icon: "security",
    },
    {
      label: "Permission Assignment",
      icon: "assignment",
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Breadcrumb Navigation */}
      <AppBreadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Assignment color="primary" />
            Permission Assignment Panel
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Comprehensive management of permission assignments across designations, groups, and users
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleAssignmentAction("designation")}>
            New Assignment
          </Button>
          <Button variant="outlined" startIcon={<Refresh />}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Assignment Strategy Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TrendingUp color="primary" />
            Recommended Assignment Strategy
          </Typography>
          <Grid container spacing={3}>
            {assignmentStrategies.map((strategy) => (
              <Grid size={{ xs: 12, md: 4 }} key={strategy.type}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: `${strategy.color}.main` }}>{strategy.icon}</Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ textTransform: "capitalize" }}>
                          {strategy.type} Based
                        </Typography>
                        <Typography variant="body1" color={`${strategy.color}.main`} fontWeight={600}>
                          {strategy.usage_note}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {strategy.description}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        icon={strategy.priority === 1 ? <Filter1 /> : strategy.priority === 2 ? <Filter2 /> : <Filter3 />}
                        label={`Priority ${strategy.priority}`}
                        size="small"
                        color={strategy.color}
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Assignment Management Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab label="Designations" icon={<WorkOutline />} />
            <Tab label="Groups" icon={<Groups />} />
            <Tab label="User Overrides" icon={<AdminPanelSettings />} />
            <Tab label="Assignment Wizard" icon={<School />} />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <CardContent>
          {selectedTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Designation-Based Permissions
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Assign core permissions to job roles. This is the primary method for most permission assignments.
              </Alert>
              <Button variant="contained" onClick={() => handleAssignmentAction("designation")}>
                Assign to Designation
              </Button>
            </Box>
          )}

          {selectedTab === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Group-Based Permissions
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Create groups for projects and cross-functional teams. Use for temporary or specialized access.
              </Alert>
              <Button variant="contained" onClick={() => handleAssignmentAction("group")}>
                Assign to Group
              </Button>
            </Box>
          )}

          {selectedTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                User Permission Overrides
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Use overrides sparingly for emergency access and special circumstances only.
              </Alert>
              <Button variant="contained" onClick={() => handleAssignmentAction("override")}>
                Create Override
              </Button>
            </Box>
          )}

          {selectedTab === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Smart Assignment Wizard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Follow the recommended strategy to assign permissions efficiently
              </Typography>

              <Stepper orientation="vertical">
                <Step active>
                  <StepLabel>
                    <Typography variant="h6">1. Start with Designations</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Assign core permissions to job roles and designations. This is the primary method and covers the majority of your permission needs.
                    </Typography>
                    <Button variant="contained" onClick={() => handleAssignmentAction("designation")}>
                      Assign to Designation
                    </Button>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>
                    <Typography variant="h6">2. Add Group Permissions</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Create groups for projects and cross-functional teams. Use for temporary or specialized access needs.
                    </Typography>
                    <Button variant="contained" onClick={() => handleAssignmentAction("group")}>
                      Assign to Group
                    </Button>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>
                    <Typography variant="h6">3. Handle Exceptions</Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      Use overrides sparingly for emergency access and special circumstances only.
                    </Typography>
                    <Button variant="contained" onClick={() => handleAssignmentAction("override")}>
                      Create Override
                    </Button>
                  </StepContent>
                </Step>
              </Stepper>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onClose={() => setAssignmentDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedAssignmentType === "designation" && "Assign Permissions to Designation"}
          {selectedAssignmentType === "group" && "Assign Users to Permission Group"}
          {selectedAssignmentType === "override" && "Create User Permission Override"}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedAssignmentType === "group" && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                💡 <strong>Assigning users to permission groups</strong> gives them all permissions defined in that group. Groups are perfect for project teams and cross-functional access.
              </Alert>

              <Grid container spacing={3}>
                {/* Step 1: Select Permission Group */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    1️⃣ Select Permission Group
                  </Typography>
                  <FormControl fullWidth>
                    <InputLabel>Select Permission Group</InputLabel>
                    <Select
                      value={selectedGroup?.id || ""}
                      onChange={(e) => {
                        const group = permissionGroups.find((g) => g.id === Number(e.target.value));
                        setSelectedGroup(group || null);
                      }}
                      label="Select Permission Group"
                    >
                      {permissionGroups.map((group) => (
                        <MenuItem key={group.id} value={group.id}>
                          <Box>
                            <Typography variant="body1" fontWeight={600}>
                              {group.group_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {group.group_type} • {group.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedGroup && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        📋 Group Details:
                      </Typography>
                      <Typography variant="body2">
                        <strong>Type:</strong> {selectedGroup.group_type}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Code:</strong> {selectedGroup.group_code}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Description:</strong> {selectedGroup.description || "No description"}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                {/* Step 2: Select Users */}
                {selectedGroup && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      2️⃣ Select Users to Assign
                    </Typography>
                    <Autocomplete
                      multiple
                      options={availableUsers}
                      getOptionLabel={(user) => {
                        const userName = user.full_name || user.display_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Unknown User";
                        const userEmail = user.email || user.user?.email || "No email";
                        return `${userName} (${userEmail})`;
                      }}
                      value={selectedUsers}
                      onChange={(event, newValue) => {
                        setSelectedUsers(newValue);
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Select Users" placeholder="Search and select users to assign to this group" helperText={`${selectedUsers.length} user(s) selected`} />
                      )}
                      renderOption={(props, user) => {
                        const userName = user.full_name || user.display_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Unknown User";
                        const userEmail = user.email || user.user?.email || "No email";
                        const userDesignation =
                          user.designation?.designation_name ||
                          user.designation?.name ||
                          user.designation_name ||
                          user.current_designation?.name ||
                          (typeof user.designation === "string" ? user.designation : null) ||
                          "No designation";

                        return (
                          <li {...props} key={user.id}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 1 }}>
                              <Avatar sx={{ width: 40, height: 40, bgcolor: "primary.main" }}>{userName[0]?.toUpperCase() || userEmail[0]?.toUpperCase() || "U"}</Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={600}>
                                  {userName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  📧 {userEmail}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  💼 {userDesignation}
                                </Typography>
                              </Box>
                            </Box>
                          </li>
                        );
                      }}
                    />

                    {selectedUsers.length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          ✅ Selected Users ({selectedUsers.length})
                        </Typography>
                        <Box
                          sx={{
                            border: 1,
                            borderColor: "success.main",
                            borderRadius: 2,
                            bgcolor: "success.50",
                            maxHeight: 300,
                            overflow: "auto",
                          }}
                        >
                          {selectedUsers.map((user, index) => {
                            const userName = user.full_name || user.display_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Unknown User";
                            const userEmail = user.email || user.user?.email || "No email";
                            const userDesignation =
                              user.designation?.designation_name ||
                              user.designation?.name ||
                              user.designation_name ||
                              user.current_designation?.name ||
                              (typeof user.designation === "string" ? user.designation : null) ||
                              "No designation";

                            return (
                              <Box
                                key={user.id}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 2,
                                  p: 2,
                                  borderBottom: index < selectedUsers.length - 1 ? 1 : 0,
                                  borderColor: "success.200",
                                  "&:hover": {
                                    bgcolor: "success.100",
                                  },
                                }}
                              >
                                <Avatar sx={{ width: 40, height: 40, bgcolor: "success.main" }}>{userName[0]?.toUpperCase() || userEmail[0]?.toUpperCase() || "U"}</Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {userName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                    📧 {userEmail}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                    💼 {userDesignation}
                                  </Typography>
                                </Box>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
                                  }}
                                  sx={{ color: "error.main" }}
                                >
                                  <Remove />
                                </IconButton>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    )}
                  </Grid>
                )}

                {/* Step 3: Assignment Details */}
                {selectedGroup && selectedUsers.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      3️⃣ Assignment Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          fullWidth
                          label="Assignment Reason"
                          placeholder="Why are you assigning these users to this group?"
                          multiline
                          rows={3}
                          value={assignmentReason}
                          onChange={(e) => setAssignmentReason(e.target.value)}
                          helperText="Provide a business justification for this assignment"
                        />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <FormControl fullWidth>
                          <InputLabel>Assignment Duration</InputLabel>
                          <Select value={assignmentDuration} onChange={(e) => setAssignmentDuration(e.target.value)} label="Assignment Duration">
                            <MenuItem value="permanent">Permanent</MenuItem>
                            <MenuItem value="project">Project Duration</MenuItem>
                            <MenuItem value="temporary">Temporary (30 days)</MenuItem>
                            <MenuItem value="custom">Custom Date Range</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    {/* Custom Date Range Fields */}
                    {assignmentDuration === "custom" && (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                              label="Start Date"
                              value={customStartDate}
                              onChange={(newValue) => setCustomStartDate(newValue)}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  helperText: "Select when this assignment should begin",
                                },
                              }}
                              minDate={dayjs()}
                            />
                          </LocalizationProvider>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                          <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                              label="End Date"
                              value={customEndDate}
                              onChange={(newValue) => setCustomEndDate(newValue)}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                  helperText: "Select when this assignment should end",
                                },
                              }}
                              minDate={customStartDate || dayjs()}
                            />
                          </LocalizationProvider>
                        </Grid>
                      </Grid>
                    )}
                  </Grid>
                )}
              </Grid>

              {!selectedGroup && (
                <Box sx={{ mt: 3, p: 2, bgcolor: "info.light", borderRadius: 1 }}>
                  <Typography variant="body2">
                    🎯 <strong>Available Groups:</strong> You have {permissionGroups.length} permission groups created from RBAC Management. Select a group above to proceed with user assignment.
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {selectedAssignmentType === "designation" && (
            <Box>
              <Grid container spacing={3}>
                {/* Designation Selection */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>Select Designation</InputLabel>
                    <Select
                      value={selectedDesignation?.id || ""}
                      onChange={(e) => {
                        const designation = designations.find((d) => d.id === e.target.value);
                        setSelectedDesignation(designation);
                      }}
                      label="Select Designation"
                    >
                      <MenuItem value="">
                        <em>Choose a designation...</em>
                      </MenuItem>
                      {designations.map((designation) => (
                        <MenuItem key={designation.id} value={designation.id}>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {designation.designation_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {designation.department_name} • {designation.designation_category}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Assignment Options */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box>
                    <FormControl component="fieldset">
                      <Typography variant="subtitle2" gutterBottom>
                        Permission Level
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel>Permission Level</InputLabel>
                        <Select value={permissionLevel} onChange={(e) => setPermissionLevel(e.target.value)} label="Permission Level">
                          <MenuItem value="granted">Granted</MenuItem>
                          <MenuItem value="denied">Denied</MenuItem>
                          <MenuItem value="conditional">Conditional</MenuItem>
                          <MenuItem value="approval_required">Approval Required</MenuItem>
                        </Select>
                      </FormControl>
                    </FormControl>
                  </Box>
                </Grid>

                {/* Permission Selection */}
                <Grid size={{ xs: 12 }}>
                  <Autocomplete
                    multiple
                    options={permissions}
                    getOptionLabel={(option) => `${option.permission_name} (${option.permission_code})`}
                    value={selectedPermissions}
                    onChange={(event, newValue) => setSelectedPermissions(newValue)}
                    renderInput={(params) => <TextField {...params} label="Select Permissions" placeholder="Choose permissions to assign..." />}
                    renderTags={(value, getTagProps) => value.map((option, index) => <Chip {...getTagProps({ index })} key={option.id} label={option.permission_name} color="primary" />)}
                  />
                </Grid>

                {/* Assignment Reason */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Assignment Reason"
                    value={assignmentReason}
                    onChange={(e) => setAssignmentReason(e.target.value)}
                    placeholder="Reason for assigning these permissions..."
                    multiline
                    rows={2}
                    required
                  />
                </Grid>

                {/* Assignment Options */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box>
                    <FormControl component="fieldset">
                      <Typography variant="subtitle2" gutterBottom>
                        Assignment Options
                      </Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <label>
                          <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} style={{ marginRight: 8 }} />
                          Requires Approval
                        </label>
                      </Box>
                    </FormControl>
                  </Box>
                </Grid>

                {/* Selected Designation Info */}
                {selectedDesignation && (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>Assigning permissions to:</strong> {selectedDesignation.designation_name} in {selectedDesignation.department_name}
                        <br />
                        <strong>Level:</strong> {selectedDesignation.hierarchy_level} • <strong>Category:</strong> {selectedDesignation.designation_category}
                        {selectedDesignation.description && (
                          <>
                            <br />
                            <strong>Description:</strong> {selectedDesignation.description}
                          </>
                        )}
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {selectedAssignmentType === "override" && (
            <Typography variant="body2" color="text.secondary">
              ⚠️ Override assignment dialog will be implemented for individual user permission exceptions and emergency access.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={selectedAssignmentType === "group" ? handleGroupAssignment : selectedAssignmentType === "designation" ? handleDesignationPermissionAssignment : undefined}
            disabled={
              loading ||
              (selectedAssignmentType === "group" &&
                (!selectedGroup || selectedUsers.length === 0 || !assignmentReason.trim() || (assignmentDuration === "custom" && (!customStartDate || !customEndDate)))) ||
              (selectedAssignmentType === "designation" &&
                (!selectedDesignation || selectedPermissions.length === 0 || !assignmentReason.trim() || (assignmentDuration === "custom" && (!customStartDate || !customEndDate))))
            }
          >
            {loading
              ? "Assigning..."
              : selectedAssignmentType === "group"
              ? `Assign ${selectedUsers.length} User(s) to Group`
              : selectedAssignmentType === "designation"
              ? `Assign ${selectedPermissions.length} Permission(s) to Designation`
              : "Save Assignment"}
          </Button>
        </DialogActions>
      </Dialog>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default PermissionAssignmentPanel;

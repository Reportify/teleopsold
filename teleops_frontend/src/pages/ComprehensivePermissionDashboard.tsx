/**
 * Comprehensive Permission Dashboard
 * Provides complete visibility into permission system with multiple views
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  Autocomplete,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from "@mui/material";
import { Dashboard, Person, Security, Analytics, Search, Refresh, Download, Visibility, Group, Assignment, ExpandMore, WorkOutline, AdminPanelSettings, Shield, Remove } from "@mui/icons-material";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";

import { rbacAPI } from "../services/rbacAPI";
import { ModernSnackbar, StatsCard, AppBreadcrumbs } from "../components";
import type { BreadcrumbItem } from "../components";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`dashboard-tabpanel-${index}`} aria-labelledby={`dashboard-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ComprehensivePermissionDashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [userAnalysisData, setUserAnalysisData] = useState<any>(null);
  const [permissionAnalysisData, setPermissionAnalysisData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedPermission, setSelectedPermission] = useState<any>(null);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Dialog states
  const [userDetailDialog, setUserDetailDialog] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);

  // Removal operation states
  const [removingPermissions, setRemovingPermissions] = useState(false);
  const [selectedUsersForRemoval, setSelectedUsersForRemoval] = useState<number[]>([]);
  const [selectedPermissionsForRemoval, setSelectedPermissionsForRemoval] = useState<number[]>([]);
  const [confirmRemovalDialog, setConfirmRemovalDialog] = useState(false);
  const [removalContext, setRemovalContext] = useState<{
    type: "user_from_permission" | "permission_from_user";
    data: any;
  } | null>(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Dashboard", path: "/" },
    { label: "RBAC Management", path: "/rbac" },
    { label: "Comprehensive Dashboard", path: "/permissions/comprehensive" },
  ];

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      const data = await rbacAPI.getPermissionOverview();
      setOverviewData(data);
    } catch (error) {
      console.error("Error loading overview data:", error);
      setSnackbar({
        open: true,
        message: "Failed to load permission overview",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserAnalysisData = async (userId?: number) => {
    try {
      setLoading(true);
      console.log("Loading user analysis data, userId:", userId);
      const data = await rbacAPI.getUserAnalysis(userId);
      console.log("User analysis data received:", data);
      setUserAnalysisData(data);
    } catch (error) {
      console.error("Error loading user analysis:", error);
      setUserAnalysisData(null); // Set to null on error so we can retry
      setSnackbar({
        open: true,
        message: "Failed to load user analysis",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPermissionAnalysisData = async (permissionId?: number) => {
    try {
      setLoading(true);
      console.log("Loading permission analysis data, permissionId:", permissionId);
      const data = await rbacAPI.getPermissionAnalysis(permissionId);
      console.log("Permission analysis data received:", data);
      setPermissionAnalysisData(data);
    } catch (error) {
      console.error("Error loading permission analysis:", error);
      setPermissionAnalysisData(null); // Set to null on error so we can retry
      setSnackbar({
        open: true,
        message: "Failed to load permission analysis",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      console.log("Loading analytics data");
      const data = await rbacAPI.getPermissionAnalytics();
      console.log("Analytics data received:", data);
      setAnalyticsData(data);
    } catch (error) {
      console.error("Error loading analytics:", error);
      setAnalyticsData(null); // Set to null on error so we can retry
      setSnackbar({
        open: true,
        message: "Failed to load analytics data",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    console.log("Tab changed to:", newValue);
    setSelectedTab(newValue);
    switch (newValue) {
      case 0:
        if (!overviewData) {
          console.log("Loading overview data");
          loadOverviewData();
        }
        break;
      case 1:
        console.log("User Analysis tab selected, loading data");
        loadUserAnalysisData();
        break;
      case 2:
        console.log("Permission Analysis tab selected, loading data");
        loadPermissionAnalysisData();
        break;
      case 3:
        console.log("Analytics tab selected, loading data");
        loadAnalyticsData();
        break;
    }
  };

  const getUserDetailedPermissions = async (userId: number) => {
    try {
      const data = await rbacAPI.getUserPermissionsDetailed(userId, false, categoryFilter || undefined);
      setSelectedUserDetail(data);
      setUserDetailDialog(true);
    } catch (error) {
      console.error("Error getting user permissions:", error);
      setSnackbar({
        open: true,
        message: "Failed to load user permissions",
        severity: "error",
      });
    }
  };

  // Permission Removal Handlers
  const handleRemoveUserFromPermission = (user: any, permissionCode: string) => {
    setRemovalContext({
      type: "user_from_permission",
      data: {
        user,
        permissionCode,
        permissionName: permissionAnalysisData?.permission_details?.permission_name,
      },
    });
    setConfirmRemovalDialog(true);
  };

  const handleRemovePermissionFromUser = (permission: any) => {
    setRemovalContext({
      type: "permission_from_user",
      data: {
        user: selectedUser,
        permission,
        userName: userAnalysisData?.user_summary?.name,
      },
    });
    setConfirmRemovalDialog(true);
  };

  const handleBulkRemoveUsersFromPermission = () => {
    if (selectedUsersForRemoval.length === 0 || !searchTerm) {
      setSnackbar({
        open: true,
        message: "Please select users to remove",
        severity: "warning",
      });
      return;
    }

    setRemovalContext({
      type: "user_from_permission",
      data: {
        userIds: selectedUsersForRemoval,
        permissionCode: searchTerm,
        permissionName: permissionAnalysisData?.permission_details?.permission_name,
        isBulk: true,
      },
    });
    setConfirmRemovalDialog(true);
  };

  const handleBulkRemovePermissionsFromUser = () => {
    if (selectedPermissionsForRemoval.length === 0 || !selectedUser) {
      setSnackbar({
        open: true,
        message: "Please select permissions to remove",
        severity: "warning",
      });
      return;
    }

    setRemovalContext({
      type: "permission_from_user",
      data: {
        userId: selectedUser.user_id,
        permissionIds: selectedPermissionsForRemoval,
        userName: userAnalysisData?.user_summary?.name,
        isBulk: true,
      },
    });
    setConfirmRemovalDialog(true);
  };

  const executeRemoval = async () => {
    if (!removalContext) return;

    try {
      setRemovingPermissions(true);
      const { type, data } = removalContext;

      if (type === "user_from_permission") {
        // Remove user(s) from permission
        if (data.isBulk) {
          // Get permission ID from permission code
          const permission = Object.values(overviewData?.permission_summaries || {}).find((p: any) => p.permission_code === data.permissionCode);

          if (!permission) {
            throw new Error("Permission not found");
          }

          const result = await rbacAPI.bulkRevokePermissions({
            permission_ids: [(permission as any).id],
            target_type: "users",
            target_ids: data.userIds,
            reason: `Bulk removal from permission: ${data.permissionCode}`,
          });

          // Check results and provide appropriate feedback
          const successfulResults = result.results?.filter((r: any) => r.success) || [];
          const failedResults = result.results?.filter((r: any) => !r.success) || [];

          let message = `Successfully processed ${successfulResults.length} users`;
          if (failedResults.length > 0) {
            const adminFailures = failedResults.filter((r: any) => r.error?.includes("administrator"));
            if (adminFailures.length > 0) {
              message += ` (${adminFailures.length} administrators skipped)`;
            }
          }

          setSnackbar({
            open: true,
            message: message,
            severity: successfulResults.length > 0 ? "success" : "warning",
          });
        } else {
          // Single user removal
          const permission = Object.values(overviewData?.permission_summaries || {}).find((p: any) => p.permission_code === data.permissionCode);

          if (!permission) {
            throw new Error("Permission not found");
          }

          const result = await rbacAPI.bulkRevokePermissions({
            permission_ids: [(permission as any).id],
            target_type: "users",
            target_ids: [data.user.user_id],
            reason: `Removed user ${data.user.name} from permission: ${data.permissionCode}`,
          });

          // Check if any operations were successful
          const successfulResults = result.results?.filter((r: any) => r.success) || [];

          let message = `Successfully processed removal for ${data.user.name}`;
          if (successfulResults.length > 0) {
            // Check if user had designation/group permissions (will create deny override)
            const isDesignationOrGroupUser = data.user.source?.startsWith("designation_") || data.user.source?.startsWith("group_");
            if (isDesignationOrGroupUser) {
              message = `Created deny override for ${data.user.name} - permission will now be blocked despite designation/group assignment`;
            } else {
              message = `Successfully removed ${data.user.name} from permission ${data.permissionName}`;
            }
          }

          setSnackbar({
            open: true,
            message: message,
            severity: "success",
          });
        }

        // Refresh permission analysis data
        if (searchTerm) {
          await loadPermissionAnalysisData();
        }
        setSelectedUsersForRemoval([]);
      } else if (type === "permission_from_user") {
        // Remove permission(s) from user
        if (data.isBulk) {
          await rbacAPI.bulkRevokePermissions({
            permission_ids: data.permissionIds,
            target_type: "users",
            target_ids: [data.userId],
            reason: `Bulk removal of ${data.permissionIds.length} permissions from user: ${data.userName}`,
          });

          setSnackbar({
            open: true,
            message: `Successfully removed ${data.permissionIds.length} permissions from ${data.userName}`,
            severity: "success",
          });
        } else {
          await rbacAPI.bulkRevokePermissions({
            permission_ids: [data.permission.permission_id],
            target_type: "users",
            target_ids: [selectedUser.user_id],
            reason: `Removed permission ${data.permission.permission_code} from user: ${data.userName}`,
          });

          setSnackbar({
            open: true,
            message: `Successfully removed permission ${data.permission.permission_name} from ${data.userName}`,
            severity: "success",
          });
        }

        // Refresh user analysis data
        if (selectedUser) {
          await loadUserAnalysisData(selectedUser.user_id);
        }
        setSelectedPermissionsForRemoval([]);
      }
    } catch (error: any) {
      console.error("Error during removal:", error);

      // Check if it's a specific error about administrator users
      let errorMessage = error.message || "Failed to remove permissions";

      if (error.response?.data?.results) {
        const failedResults = error.response.data.results.filter((r: any) => !r.success);
        if (failedResults.length > 0) {
          const adminErrors = failedResults.filter((r: any) => r.error?.includes("administrator") || r.error?.includes("Cannot remove permissions from administrator"));

          if (adminErrors.length > 0) {
            errorMessage = "Cannot remove permissions from administrator users. Administrators have unrestricted access to all permissions.";
          } else {
            errorMessage = failedResults[0].error || "Failed to remove permissions";
          }
        }
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setRemovingPermissions(false);
      setConfirmRemovalDialog(false);
      setRemovalContext(null);
    }
  };

  const handleRemovePermissionFromGroup = async (permissionId: number, groupId: number, groupName: string) => {
    if (window.confirm(`Remove permission from group "${groupName}"? All users in this group will naturally lose this permission.`)) {
      try {
        const result = await rbacAPI.bulkRevokePermissions({
          permission_ids: [permissionId],
          target_type: "groups",
          target_ids: [groupId],
          reason: "Removed via comprehensive dashboard",
        });

        if (result.success && result.results[0]) {
          const groupResult = result.results[0];
          setSnackbar({
            open: true,
            message: `Permission removed from group "${groupResult.group_name}". ${groupResult.users_affected} users affected.`,
            severity: "success",
          });
          // Refresh current view
          if (selectedTab === 0) {
            loadOverviewData();
          } else if (selectedTab === 3) {
            loadAnalyticsData();
          }
        }
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error.message || "Failed to remove permission from group",
          severity: "error",
        });
      }
    }
  };

  const handleRemovePermissionFromDesignation = async (permissionId: number, designationId: number, designationName: string) => {
    if (window.confirm(`Remove permission from designation "${designationName}"? All users with this designation will lose this permission.`)) {
      try {
        const result = await rbacAPI.bulkRevokePermissions({
          permission_ids: [permissionId],
          target_type: "designations",
          target_ids: [designationId],
          reason: "Removed via comprehensive dashboard",
        });

        if (result.success) {
          setSnackbar({
            open: true,
            message: `Permission removed from designation "${designationName}"`,
            severity: "success",
          });
          // Refresh current view
          if (selectedTab === 0) {
            loadOverviewData();
          } else if (selectedTab === 3) {
            loadAnalyticsData();
          }
        }
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error.message || "Failed to remove permission from designation",
          severity: "error",
        });
      }
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return "#d32f2f";
      case "high":
        return "#f57c00";
      case "medium":
        return "#fbc02d";
      case "low":
        return "#388e3c";
      default:
        return "#757575";
    }
  };

  const getSourceIcon = (source: string) => {
    if (source.includes("designation")) return <WorkOutline fontSize="small" />;
    if (source.includes("group")) return <Group fontSize="small" />;
    if (source.includes("override")) return <AdminPanelSettings fontSize="small" />;
    return <Shield fontSize="small" />;
  };

  const renderOverviewTab = () => {
    if (!overviewData) return <CircularProgress />;

    const userColumns: GridColDef[] = [
      { field: "name", headerName: "User", width: 200 },
      { field: "job_title", headerName: "Job Title", width: 150 },
      { field: "total_permissions", headerName: "Total Permissions", width: 150, type: "number" },
      {
        field: "actions",
        headerName: "Actions",
        width: 120,
        renderCell: (params) => (
          <IconButton size="small" onClick={() => getUserDetailedPermissions(params.row.user_id)}>
            <Visibility />
          </IconButton>
        ),
      },
    ];

    const userRows = Object.values(overviewData.user_summaries || {}).map((user: any) => ({
      id: user.user_id,
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      job_title: user.job_title,
      total_permissions: user.total_permissions,
    }));

    return (
      <Grid container spacing={3}>
        {/* Summary Stats */}
        <Grid size={{ xs: 12 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 3 }}>
              <StatsCard title="Total Users" value={overviewData.summary?.total_users || 0} icon={Person} color="primary" />
            </Grid>
            <Grid size={{ xs: 3 }}>
              <StatsCard title="Total Permissions" value={overviewData.summary?.total_permissions || 0} icon={Security} color="secondary" />
            </Grid>
            <Grid size={{ xs: 3 }}>
              <StatsCard title="Total Assignments" value={overviewData.summary?.total_assignments || 0} icon={Assignment} color="warning" />
            </Grid>
            <Grid size={{ xs: 3 }}>
              <StatsCard title="Avg Permissions/User" value={Math.round(overviewData.summary?.average_permissions_per_user || 0)} icon={Analytics} color="success" />
            </Grid>
          </Grid>
        </Grid>

        {/* Users Table */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Users & Permissions Overview
              </Typography>
              <Box sx={{ height: 600, width: "100%" }}>
                <DataGrid
                  rows={userRows}
                  columns={userColumns}
                  initialState={{
                    pagination: {
                      paginationModel: { page: 0, pageSize: 25 },
                    },
                  }}
                  pageSizeOptions={[25, 50, 100]}
                  slots={{ toolbar: GridToolbar }}
                  disableRowSelectionOnClick
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderUserAnalysisTab = () => {
    if (!userAnalysisData && !overviewData) return <CircularProgress />;

    // Debug logging
    console.log("renderUserAnalysisTab - userAnalysisData:", userAnalysisData);
    console.log("renderUserAnalysisTab - selectedUser:", selectedUser);
    console.log("renderUserAnalysisTab - loading:", loading);

    // Get all users for the dropdown
    const allUsers = overviewData ? Object.values(overviewData.user_summaries || {}) : [];

    return (
      <Grid container spacing={3}>
        {/* User Selection */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 4 }}>
                  <Autocomplete
                    options={allUsers}
                    getOptionLabel={(option: any) => `${option.name} (${option.email})`}
                    value={selectedUser}
                    onChange={(event, newValue) => {
                      console.log("User selected:", newValue);
                      setSelectedUser(newValue);
                      if (newValue) {
                        console.log("Loading user analysis for user_id:", newValue.user_id);
                        loadUserAnalysisData(newValue.user_id);
                      }
                    }}
                    renderInput={(params) => <TextField {...params} label="Select User" placeholder="Search users..." />}
                  />
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Source Filter</InputLabel>
                    <Select value={sourceTypeFilter} label="Source Filter" onChange={(e) => setSourceTypeFilter(e.target.value)}>
                      <MenuItem value="">All Sources</MenuItem>
                      <MenuItem value="designation">Designation</MenuItem>
                      <MenuItem value="group">Group</MenuItem>
                      <MenuItem value="override">Override</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <TextField fullWidth label="Category Filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} placeholder="e.g., project, user, system" />
                </Grid>
                <Grid size={{ xs: 2 }}>
                  <Button variant="contained" fullWidth startIcon={<Search />} onClick={() => selectedUser && loadUserAnalysisData(selectedUser.user_id)} disabled={!selectedUser || loading}>
                    Analyze
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* User Analysis Results */}
        {userAnalysisData && (
          <>
            {/* User Summary */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 2 }}>
                      <Avatar sx={{ width: 80, height: 80, bgcolor: "primary.main", fontSize: "2rem" }}>{userAnalysisData.user_summary?.name?.charAt(0) || "U"}</Avatar>
                    </Grid>
                    <Grid size={{ xs: 10 }}>
                      <Typography variant="h5">{userAnalysisData.user_summary?.name}</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {userAnalysisData.user_summary?.job_title} • {userAnalysisData.user_summary?.email}
                      </Typography>
                      <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 3 }}>
                          <Typography variant="h6" color="primary">
                            {Object.keys(userAnalysisData.effective_permissions?.permissions || {}).length}
                          </Typography>
                          <Typography variant="body2">Total Permissions</Typography>
                        </Grid>
                        <Grid size={{ xs: 3 }}>
                          <Typography variant="h6" color="secondary">
                            {userAnalysisData.permission_sources?.designation_permissions?.length || 0}
                          </Typography>
                          <Typography variant="body2">From Designation</Typography>
                        </Grid>
                        <Grid size={{ xs: 3 }}>
                          <Typography variant="h6" color="warning.main">
                            {userAnalysisData.permission_sources?.group_permissions?.length || 0}
                          </Typography>
                          <Typography variant="body2">From Groups</Typography>
                        </Grid>
                        <Grid size={{ xs: 3 }}>
                          <Typography variant="h6" color="error.main">
                            {userAnalysisData.permission_sources?.override_permissions?.length || 0}
                          </Typography>
                          <Typography variant="body2">From Overrides</Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Permission Breakdown */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Permission Sources Breakdown
                  </Typography>

                  {/* Designation Permissions */}
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <WorkOutline sx={{ mr: 1 }} />
                      <Typography>Designation Permissions ({userAnalysisData.permission_sources?.designation_permissions?.length || 0})</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Permission</TableCell>
                              <TableCell>Source</TableCell>
                              <TableCell>Risk Level</TableCell>
                              <TableCell>Status</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {userAnalysisData.permission_sources?.designation_permissions?.map((perm: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {perm.permission_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {perm.permission_code}
                                  </Typography>
                                </TableCell>
                                <TableCell>{perm.source_name}</TableCell>
                                <TableCell>
                                  <Chip label={perm.risk_level} size="small" style={{ backgroundColor: getRiskLevelColor(perm.risk_level), color: "white" }} />
                                </TableCell>
                                <TableCell>
                                  <Chip label={perm.is_mandatory ? "Mandatory" : "Optional"} size="small" color={perm.is_mandatory ? "error" : "default"} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>

                  {/* Group Permissions */}
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Group sx={{ mr: 1 }} />
                      <Typography>Group Permissions ({userAnalysisData.permission_sources?.group_permissions?.length || 0})</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Permission</TableCell>
                              <TableCell>Group</TableCell>
                              <TableCell>Risk Level</TableCell>
                              <TableCell>Assignment Reason</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {userAnalysisData.permission_sources?.group_permissions?.map((perm: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {perm.permission_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {perm.permission_code}
                                  </Typography>
                                </TableCell>
                                <TableCell>{perm.source_name}</TableCell>
                                <TableCell>
                                  <Chip label={perm.risk_level} size="small" style={{ backgroundColor: getRiskLevelColor(perm.risk_level), color: "white" }} />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption">{perm.assignment_reason || "Manual assignment"}</Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>

                  {/* Override Permissions */}
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <AdminPanelSettings sx={{ mr: 1 }} />
                      <Typography>Override Permissions ({userAnalysisData.permission_sources?.override_permissions?.length || 0})</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Permission</TableCell>
                              <TableCell>Override Type</TableCell>
                              <TableCell>Risk Level</TableCell>
                              <TableCell>Justification</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {userAnalysisData.permission_sources?.override_permissions?.map((perm: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight="medium">
                                    {perm.permission_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {perm.permission_code}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip label={perm.override_type} size="small" color="warning" />
                                </TableCell>
                                <TableCell>
                                  <Chip label={perm.risk_level} size="small" style={{ backgroundColor: getRiskLevelColor(perm.risk_level), color: "white" }} />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption">{perm.business_justification || perm.override_reason || "No justification provided"}</Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Default state when no user selected */}
        {!userAnalysisData && !loading && !selectedUser && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent sx={{ textAlign: "center", py: 8 }}>
                <Person sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Select a user to analyze their permissions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a user from the dropdown above to see detailed permission breakdown, sources, and risk analysis.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderPermissionAnalysisTab = () => {
    if (!permissionAnalysisData && !overviewData) return <CircularProgress />;

    // Debug logging for permission analysis
    console.log("renderPermissionAnalysisTab - permissionAnalysisData:", permissionAnalysisData);
    console.log("renderPermissionAnalysisTab - results:", permissionAnalysisData?.results);
    console.log("renderPermissionAnalysisTab - users:", permissionAnalysisData?.results?.users);
    console.log("renderPermissionAnalysisTab - users length:", permissionAnalysisData?.results?.users?.length);

    // Get all permissions from overview data for autocomplete
    const allPermissions = overviewData ? Object.values(overviewData.permission_summaries || {}) : [];

    const searchUsersByPermission = async () => {
      if (!searchTerm) return;

      try {
        setLoading(true);
        const data = await rbacAPI.searchUsersByPermission(searchTerm, sourceTypeFilter as "designation" | "group" | "override" | undefined);
        console.log("Search users by permission - API response:", data);
        console.log("Users data:", data?.results?.users);
        console.log("Users length:", data?.results?.users?.length);
        setPermissionAnalysisData(data);
        console.log("After setting permissionAnalysisData, state should be:", data);
      } catch (error) {
        console.error("Error searching users by permission:", error);
        setSnackbar({
          open: true,
          message: "Failed to search users by permission",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    return (
      <Grid container spacing={3}>
        {/* Permission Search */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 4 }}>
                  <Autocomplete
                    freeSolo
                    options={allPermissions}
                    getOptionLabel={(option: any) => (typeof option === "string" ? option : `${option.permission_name} (${option.permission_code})`)}
                    value={selectedPermission}
                    onInputChange={(event, newInputValue) => {
                      setSearchTerm(newInputValue);
                    }}
                    onChange={(event, newValue) => {
                      setSelectedPermission(newValue);
                      if (typeof newValue === "object" && newValue?.permission_code) {
                        setSearchTerm(newValue.permission_code);
                      }
                    }}
                    renderInput={(params) => <TextField {...params} label="Permission Code/Name" placeholder="e.g., project.create, user.view" />}
                  />
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Source Type</InputLabel>
                    <Select value={sourceTypeFilter} label="Source Type" onChange={(e) => setSourceTypeFilter(e.target.value)}>
                      <MenuItem value="">All Sources</MenuItem>
                      <MenuItem value="designation">Designation Only</MenuItem>
                      <MenuItem value="group">Group Only</MenuItem>
                      <MenuItem value="override">Override Only</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 3 }}>
                  <TextField
                    fullWidth
                    label="Filter Users"
                    placeholder="Search by name, email..."
                    onChange={(e) => {
                      // This would filter the results in real-time
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 2 }}>
                  <Button variant="contained" fullWidth startIcon={<Search />} onClick={searchUsersByPermission} disabled={!searchTerm || loading}>
                    Search
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Permission Analysis Results */}
        {permissionAnalysisData && (
          <>
            {/* Permission Summary */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 1 }}>
                      <Shield sx={{ fontSize: 48, color: "primary.main" }} />
                    </Grid>
                    <Grid size={{ xs: 11 }}>
                      <Typography variant="h5">Permission: {permissionAnalysisData.permission_details?.permission_name || searchTerm}</Typography>
                      <Typography variant="body1" color="text.secondary">
                        {permissionAnalysisData.permission_details?.permission_code} • Category: {permissionAnalysisData.permission_details?.category || "Unknown"} • Risk Level:{" "}
                        <Chip
                          label={permissionAnalysisData.permission_details?.risk_level || "Unknown"}
                          size="small"
                          style={{
                            backgroundColor: getRiskLevelColor(permissionAnalysisData.permission_details?.risk_level || "unknown"),
                            color: "white",
                          }}
                        />
                      </Typography>
                      <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 3 }}>
                          <Typography variant="h6" color="primary">
                            {permissionAnalysisData.results?.total_users_found || 0}
                          </Typography>
                          <Typography variant="body2">Total Users</Typography>
                        </Grid>
                        <Grid size={{ xs: 3 }}>
                          <Typography variant="h6" color="secondary">
                            {permissionAnalysisData.breakdown_by_source?.designation || 0}
                          </Typography>
                          <Typography variant="body2">Via Designation</Typography>
                        </Grid>
                        <Grid size={{ xs: 3 }}>
                          <Typography variant="h6" color="warning.main">
                            {permissionAnalysisData.breakdown_by_source?.group || 0}
                          </Typography>
                          <Typography variant="body2">Via Groups</Typography>
                        </Grid>
                        <Grid size={{ xs: 3 }}>
                          <Typography variant="h6" color="error.main">
                            {permissionAnalysisData.breakdown_by_source?.override || 0}
                          </Typography>
                          <Typography variant="body2">Via Override</Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Users with Permission Table */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6">Users with this Permission</Typography>
                    {selectedUsersForRemoval.length > 0 && (
                      <Button variant="contained" color="error" startIcon={<Remove />} onClick={handleBulkRemoveUsersFromPermission} disabled={removingPermissions}>
                        Remove {selectedUsersForRemoval.length} User{selectedUsersForRemoval.length > 1 ? "s" : ""} from Permission
                      </Button>
                    )}
                  </Box>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <input
                              type="checkbox"
                              checked={permissionAnalysisData?.results?.users?.length > 0 && selectedUsersForRemoval.length === permissionAnalysisData.results.users.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsersForRemoval(permissionAnalysisData.results.users.map((user: any) => user.user_id));
                                } else {
                                  setSelectedUsersForRemoval([]);
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>User</TableCell>
                          <TableCell>Job Title</TableCell>
                          <TableCell>Source</TableCell>
                          <TableCell>Assignment Details</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(() => {
                          console.log("Permission analysis users check:", {
                            permissionAnalysisData,
                            usersArray: permissionAnalysisData.results?.users,
                            usersLength: permissionAnalysisData.results?.users?.length,
                            hasUsers: permissionAnalysisData.results?.users?.length > 0,
                          });
                          return permissionAnalysisData.results?.users?.length > 0;
                        })() ? (
                          permissionAnalysisData.results.users.map((user: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell padding="checkbox">
                                <input
                                  type="checkbox"
                                  checked={selectedUsersForRemoval.includes(user.user_id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedUsersForRemoval((prev) => [...prev, user.user_id]);
                                    } else {
                                      setSelectedUsersForRemoval((prev) => prev.filter((id) => id !== user.user_id));
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Avatar sx={{ width: 32, height: 32 }}>{user.name?.charAt(0) || "U"}</Avatar>
                                  <Box>
                                    <Typography variant="body2" fontWeight="medium">
                                      {user.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {user.email}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>{user.job_title || "N/A"}</TableCell>
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  {getSourceIcon(user.permission_source)}
                                  <Chip
                                    label={user.permission_source}
                                    size="small"
                                    color={user.permission_source.includes("designation") ? "secondary" : user.permission_source.includes("group") ? "warning" : "error"}
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">
                                  {user.permission_source}
                                  {user.last_login && (
                                    <>
                                      <br />
                                      Last Login: {new Date(user.last_login).toLocaleDateString()}
                                    </>
                                  )}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                  <IconButton size="small" onClick={() => getUserDetailedPermissions(user.user_id)}>
                                    <Visibility />
                                  </IconButton>
                                  <IconButton size="small" color="error" onClick={() => handleRemoveUserFromPermission(user, searchTerm)} disabled={removingPermissions}>
                                    <Remove />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} align="center">
                              <Typography variant="body2" color="text.secondary">
                                No users found with this permission
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Permission Usage Statistics */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Usage Statistics & Trends
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: "center", p: 2, bgcolor: "background.default", borderRadius: 1 }}>
                        <Typography variant="h4" color="primary">
                          {Math.round(((permissionAnalysisData.results?.total_users_found || 0) / (overviewData?.summary?.total_users || 1)) * 100)}%
                        </Typography>
                        <Typography variant="body2">Permission Coverage</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: "center", p: 2, bgcolor: "background.default", borderRadius: 1 }}>
                        <Typography variant="h4" color="warning.main">
                          {permissionAnalysisData.permission_details?.risk_level?.toUpperCase() || "UNKNOWN"}
                        </Typography>
                        <Typography variant="body2">Risk Level</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Box sx={{ textAlign: "center", p: 2, bgcolor: "background.default", borderRadius: 1 }}>
                        <Typography variant="h4" color="success.main">
                          {permissionAnalysisData.breakdown_by_source
                            ? Object.keys(permissionAnalysisData.breakdown_by_source).reduce(
                                (a, b) => (permissionAnalysisData.breakdown_by_source[a] > permissionAnalysisData.breakdown_by_source[b] ? a : b),
                                "N/A"
                              )
                            : "N/A"}
                        </Typography>
                        <Typography variant="body2">Primary Source</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Default state when no search performed */}
        {!permissionAnalysisData && !loading && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent sx={{ textAlign: "center", py: 8 }}>
                <Security sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Search for a permission to analyze
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter a permission code or name above to see who has this permission and how they got it.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderAnalyticsTab = () => {
    if (!analyticsData && !overviewData) return <CircularProgress />;

    // Calculate analytics from overview data if analytics data not available
    const getAnalyticsFromOverview = () => {
      if (!overviewData || !overviewData.user_summaries || !overviewData.permission_summaries) return null;

      try {
        const users = Object.values(overviewData.user_summaries);
        const permissions = Object.values(overviewData.permission_summaries);

        // Ensure we have arrays
        if (!Array.isArray(users) || !Array.isArray(permissions)) {
          console.warn("Analytics data is not in expected format");
          return null;
        }

        // Calculate user rankings
        const userRankings = users
          .filter((user: any) => user && typeof user === "object")
          .map((user: any) => ({
            name: user.name || "Unknown User",
            total_permissions: user.total_permissions || 0,
            user_id: user.user_id || 0,
          }))
          .sort((a, b) => b.total_permissions - a.total_permissions);

        // Calculate permission usage
        const permissionUsage = permissions
          .filter((perm: any) => perm && typeof perm === "object")
          .map((perm: any) => ({
            permission_name: perm.permission_name || "Unknown Permission",
            permission_code: perm.permission_code || "unknown.code",
            users_count: perm.users_with_permission || 0,
            risk_level: perm.risk_level || "unknown",
          }))
          .sort((a, b) => b.users_count - a.users_count);

        // Calculate risk distribution
        const riskDistribution = permissions
          .filter((perm: any) => perm && typeof perm === "object")
          .reduce((acc: any, perm: any) => {
            const risk = perm.risk_level || "unknown";
            acc[risk] = (acc[risk] || 0) + (perm.users_with_permission || 0);
            return acc;
          }, {});

        return {
          user_rankings: userRankings,
          permission_usage: permissionUsage,
          risk_distribution: riskDistribution,
        };
      } catch (error) {
        console.error("Error calculating analytics from overview data:", error);
        return null;
      }
    };

    // Use backend analytics data if available, otherwise fall back to calculated analytics
    const analytics = analyticsData
      ? {
          user_rankings: (analyticsData.user_analytics?.top_users || analyticsData.user_analytics?.users_by_permission_count || []).map((user: any) => ({
            name: user.user_name,
            total_permissions: user.permission_count,
            user_id: user.user_id || 0,
          })),
          permission_usage: (analyticsData.permission_usage?.top_permissions || []).map((perm: any) => ({
            permission_name: perm.permission_name,
            permission_code: perm.permission_code,
            users_count: perm.total_usage,
            risk_level: perm.risk_level,
          })),
          risk_distribution: analyticsData.risk_analysis?.permissions_by_risk || {},
        }
      : getAnalyticsFromOverview();

    // If we still don't have analytics data, show loading or empty state
    if (!analytics) {
      return (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent sx={{ textAlign: "center", py: 8 }}>
                <Analytics sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No analytics data available
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Analytics data will be available once users and permissions are set up in the system.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      );
    }

    return (
      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom>
            System-wide Analytics & Insights
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h4" color="primary">
                    {overviewData?.summary?.total_users || 0}
                  </Typography>
                  <Typography variant="body2">Active Users</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Across all tenants
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h4" color="secondary">
                    {overviewData?.summary?.total_permissions || 0}
                  </Typography>
                  <Typography variant="body2">Total Permissions</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Available in system
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h4" color="warning.main">
                    {Math.round(overviewData?.summary?.average_permissions_per_user || 0)}
                  </Typography>
                  <Typography variant="body2">Avg Permissions</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Per user
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 3 }}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h4" color="success.main">
                    {analytics?.risk_distribution ? Object.values(analytics.risk_distribution).reduce((sum: number, count: any) => sum + count, 0) : 0}
                  </Typography>
                  <Typography variant="body2">Total Assignments</Typography>
                  <Typography variant="caption" color="text.secondary">
                    All sources
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* User Rankings */}
        <Grid size={{ xs: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                User Permission Rankings
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Rank</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell align="right">Permissions</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(analytics?.user_rankings)
                      ? analytics.user_rankings.slice(0, 10).map((user: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip label={`#${index + 1}`} size="small" color={index < 3 ? "primary" : "default"} />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem" }}>{user.name?.charAt(0) || "U"}</Avatar>
                                <Typography variant="body2">{user.name}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {user.total_permissions}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => getUserDetailedPermissions(user.user_id)}>
                                <Visibility />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      : []}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Permission Usage */}
        <Grid size={{ xs: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Most Used Permissions
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Permission</TableCell>
                      <TableCell align="right">Users</TableCell>
                      <TableCell>Risk</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(analytics?.permission_usage)
                      ? analytics.permission_usage.slice(0, 10).map((perm: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {perm.permission_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {perm.permission_code}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">{perm.users_count}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={perm.risk_level}
                                size="small"
                                style={{
                                  backgroundColor: getRiskLevelColor(perm.risk_level),
                                  color: "white",
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      : []}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Analysis */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Risk Analysis & Distribution
              </Typography>
              <Grid container spacing={3}>
                {Object.entries(analytics?.risk_distribution || {}).map(([riskLevel, count]: [string, any]) => (
                  <Grid size={{ xs: 3 }} key={riskLevel}>
                    <Box
                      sx={{
                        textAlign: "center",
                        p: 3,
                        bgcolor: "background.default",
                        borderRadius: 2,
                        border: `2px solid ${getRiskLevelColor(riskLevel)}`,
                      }}
                    >
                      <Typography variant="h3" sx={{ color: getRiskLevelColor(riskLevel), fontWeight: "bold" }}>
                        {count}
                      </Typography>
                      <Typography variant="h6" sx={{ textTransform: "capitalize", mt: 1 }}>
                        {riskLevel} Risk
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Permission assignments
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Insights */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Security Insights & Recommendations
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 4 }}>
                  <Alert severity="info">
                    <Typography variant="body2" fontWeight="medium">
                      Permission Distribution
                    </Typography>
                    <Typography variant="caption">
                      Most users have {Math.round(overviewData?.summary?.average_permissions_per_user || 0)} permissions on average. Consider reviewing users with significantly more permissions.
                    </Typography>
                  </Alert>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Alert severity="warning">
                    <Typography variant="body2" fontWeight="medium">
                      High-Risk Permissions
                    </Typography>
                    <Typography variant="caption">{analytics?.risk_distribution?.high || 0} high-risk permission assignments detected. Regular audits recommended.</Typography>
                  </Alert>
                </Grid>
                <Grid size={{ xs: 4 }}>
                  <Alert severity="success">
                    <Typography variant="body2" fontWeight="medium">
                      System Health
                    </Typography>
                    <Typography variant="caption">
                      {analytics?.risk_distribution
                        ? (((analytics.risk_distribution.low || 0) / Object.values(analytics.risk_distribution).reduce((sum: number, count: any) => sum + count, 1)) * 100).toFixed(0)
                        : 0}
                      % of permissions are low-risk.
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Recommended Actions:
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Review users with more than {Math.round((overviewData?.summary?.average_permissions_per_user || 0) * 1.5)} permissions
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Audit all critical and high-risk permission assignments monthly
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Consider implementing least-privilege principles for new users
                </Typography>
                <Typography component="li" variant="body2">
                  Set up automated alerts for override permission assignments
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <AppBreadcrumbs items={breadcrumbs} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Comprehensive Permission Dashboard
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => {
              switch (selectedTab) {
                case 0:
                  loadOverviewData();
                  break;
                case 1:
                  loadUserAnalysisData();
                  break;
                case 2:
                  loadPermissionAnalysisData();
                  break;
                case 3:
                  loadAnalyticsData();
                  break;
              }
            }}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button variant="outlined" startIcon={<Download />} disabled={loading}>
            Export
          </Button>
        </Box>
      </Box>

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={selectedTab} onChange={handleTabChange} aria-label="permission dashboard tabs">
            <Tab icon={<Dashboard />} label="Overview" id="dashboard-tab-0" aria-controls="dashboard-tabpanel-0" />
            <Tab icon={<Person />} label="User Analysis" id="dashboard-tab-1" aria-controls="dashboard-tabpanel-1" />
            <Tab icon={<Security />} label="Permission Analysis" id="dashboard-tab-2" aria-controls="dashboard-tabpanel-2" />
            <Tab icon={<Analytics />} label="Analytics" id="dashboard-tab-3" aria-controls="dashboard-tabpanel-3" />
          </Tabs>
        </Box>

        <TabPanel value={selectedTab} index={0}>
          {renderOverviewTab()}
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {renderUserAnalysisTab()}
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {renderPermissionAnalysisTab()}
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          {renderAnalyticsTab()}
        </TabPanel>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={userDetailDialog} onClose={() => setUserDetailDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          User Permissions Detail
          {selectedUserDetail && ` - ${selectedUserDetail.user_details?.name}`}
        </DialogTitle>
        <DialogContent>
          {selectedUserDetail && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="h6">Total Permissions: {selectedUserDetail.statistics?.total_effective_permissions || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Detailed permission breakdown for {selectedUserDetail.user_details?.name}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default ComprehensivePermissionDashboard;

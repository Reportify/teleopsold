/**
 * Permission Dashboard Page
 * Comprehensive view of user permissions including sources, conflicts, and management
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
  Paper,
  Avatar,
  LinearProgress,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Button,
  Stack,
  IconButton,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import {
  Search,
  ExpandMore,
  Security,
  Group,
  Person,
  Warning,
  CheckCircle,
  Info,
  Assignment,
  History,
  FilterList,
  Refresh,
  Timeline,
  TrendingUp,
  Shield,
  PersonAdd,
  GroupAdd,
  MoreVert,
  Add,
  Remove,
  Block,
  AdminPanelSettings,
  Edit,
} from "@mui/icons-material";
import { useRBAC } from "../hooks/useRBAC";
import { FeatureGate } from "../hooks/useFeaturePermissions";
import { ModernSnackbar, AppBreadcrumbs } from "../components";
import type { BreadcrumbItem } from "../components";
import { getPermissionDashboard, assignPermissionToUser, revokePermissionFromUser, createUserPermissionOverride, getPermissions } from "../services/rbacAPI";
import type { PermissionDashboardData, Permission } from "../services/rbacAPI";

interface PermissionSource {
  permission_id: number;
  permission_code: string;
  permission_name: string;
  permission_level: string;
  source_type: "designation" | "group" | "override";
  source_name: string;
  source_id: number;
  risk_level: "low" | "medium" | "high" | "critical";
  effective_from?: string;
  effective_to?: string;
  is_temporary?: boolean;
  assignment_reason?: string;
  override_reason?: string;
}

interface UserSummary {
  user_id: number;
  name: string;
  email: string;
  employee_id?: string;
  job_title?: string;
  department?: string;
  is_active: boolean;
  last_login?: string;
}

const PermissionDashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<PermissionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  // Permission management states
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedPermissionForAction, setSelectedPermissionForAction] = useState<PermissionSource | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for dialogs
  const [grantForm, setGrantForm] = useState({
    permission_id: null as number | null,
    permission_level: "granted",
    assignment_reason: "",
    effective_from: "",
    effective_to: "",
  });

  const [overrideForm, setOverrideForm] = useState({
    permission_id: null as number | null,
    override_type: "grant" as "grant" | "restrict",
    permission_level: "granted",
    override_reason: "",
    business_justification: "",
    effective_from: "",
    effective_to: "",
    is_temporary: false,
    requires_mfa: false,
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  useEffect(() => {
    loadDashboardData();
    loadAvailablePermissions();
  }, [selectedUser]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getPermissionDashboard(selectedUser || undefined);
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message);
      setSnackbar({
        open: true,
        message: `Error loading dashboard: ${err.message}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePermissions = async () => {
    try {
      const response = await getPermissions();
      setAvailablePermissions(response.results || response);
    } catch (err: any) {
      // Error loading permissions - handled silently
    }
  };

  const handleGrantPermission = async () => {
    if (!grantForm.permission_id || !dashboardData?.user_summary) return;

    try {
      setActionLoading(true);
      await assignPermissionToUser({
        user_id: dashboardData.user_summary.user_id,
        permission_id: grantForm.permission_id,
        permission_level: grantForm.permission_level,
        assignment_reason: grantForm.assignment_reason,
        effective_from: grantForm.effective_from || undefined,
        effective_to: grantForm.effective_to || undefined,
      });

      setSnackbar({
        open: true,
        message: "Permission granted successfully!",
        severity: "success",
      });

      setGrantDialogOpen(false);
      setGrantForm({
        permission_id: null,
        permission_level: "granted",
        assignment_reason: "",
        effective_from: "",
        effective_to: "",
      });

      await loadDashboardData();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `Error granting permission: ${err.message}`,
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokePermission = async () => {
    if (!selectedPermissionForAction || !dashboardData?.user_summary) return;

    try {
      setActionLoading(true);
      await revokePermissionFromUser({
        user_id: dashboardData.user_summary.user_id,
        permission_id: selectedPermissionForAction.permission_id,
        revocation_reason: "Revoked via dashboard",
      });

      setSnackbar({
        open: true,
        message: "Permission revoked successfully!",
        severity: "success",
      });

      setRevokeDialogOpen(false);
      setSelectedPermissionForAction(null);

      await loadDashboardData();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `Error revoking permission: ${err.message}`,
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateOverride = async () => {
    if (!overrideForm.permission_id || !dashboardData?.user_summary) return;

    try {
      setActionLoading(true);
      await createUserPermissionOverride({
        user_profile_id: dashboardData.user_summary.user_id,
        permission_id: overrideForm.permission_id,
        override_type: overrideForm.override_type,
        permission_level: overrideForm.permission_level,
        override_reason: overrideForm.override_reason,
        business_justification: overrideForm.business_justification,
        effective_from: overrideForm.effective_from || undefined,
        effective_to: overrideForm.effective_to || undefined,
        is_temporary: overrideForm.is_temporary,
        requires_mfa: overrideForm.requires_mfa,
      });

      setSnackbar({
        open: true,
        message: "Permission override created successfully!",
        severity: "success",
      });

      setOverrideDialogOpen(false);
      setOverrideForm({
        permission_id: null,
        override_type: "grant",
        permission_level: "granted",
        override_reason: "",
        business_justification: "",
        effective_from: "",
        effective_to: "",
        is_temporary: false,
        requires_mfa: false,
      });

      await loadDashboardData();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `Error creating override: ${err.message}`,
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openRevokeDialog = (permission: PermissionSource) => {
    setSelectedPermissionForAction(permission);
    setRevokeDialogOpen(true);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      case "low":
        return "success";
      default:
        return "default";
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "designation":
        return <Person fontSize="small" />;
      case "group":
        return <Group fontSize="small" />;
      case "override":
        return <Security fontSize="small" />;
      default:
        return <Assignment fontSize="small" />;
    }
  };

  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case "designation":
        return "primary";
      case "group":
        return "secondary";
      case "override":
        return "warning";
      default:
        return "default";
    }
  };

  // Combine all permissions for unified view
  const getAllPermissions = (): PermissionSource[] => {
    if (!dashboardData) return [];

    const { designation_permissions, group_permissions, override_permissions } = dashboardData.permission_sources;
    return [...designation_permissions, ...group_permissions, ...override_permissions];
  };

  // Filter permissions based on search and filters
  const getFilteredPermissions = (): PermissionSource[] => {
    let permissions = getAllPermissions();

    if (searchTerm) {
      permissions = permissions.filter(
        (p) =>
          p.permission_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.permission_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.source_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRisk) {
      permissions = permissions.filter((p) => p.risk_level === filterRisk);
    }

    if (filterSource) {
      permissions = permissions.filter((p) => p.source_type === filterSource);
    }

    return permissions;
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Permission Dashboard
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading permission data...
        </Typography>
      </Box>
    );
  }

  if (error || !dashboardData) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Permission Dashboard
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || "Failed to load dashboard data"}
        </Alert>
        <Button variant="contained" onClick={loadDashboardData} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  const { user_summary, statistics, permission_sources } = dashboardData;

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
      label: "Permission Dashboard",
      icon: "security",
      chip: {
        label: `${statistics.total_permissions} permissions`,
        color: "primary",
      },
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
            <Shield color="primary" />
            Permission Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Comprehensive view of user permissions and access control
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <FeatureGate featureId="rbac_permissions_grant">
            <Button variant="contained" startIcon={<Add />} onClick={() => setGrantDialogOpen(true)}>
              Grant Permission
            </Button>
          </FeatureGate>
          <FeatureGate featureId="rbac_permissions_grant">
            <Button variant="outlined" startIcon={<AdminPanelSettings />} onClick={() => setOverrideDialogOpen(true)}>
              Create Override
            </Button>
          </FeatureGate>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadDashboardData}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* User Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: "primary.main", fontSize: "2rem" }}>{user_summary.name.charAt(0).toUpperCase()}</Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" fontWeight={600}>
                {user_summary.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {user_summary.email} {user_summary.employee_id && `• ${user_summary.employee_id}`}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {user_summary.job_title && <Chip label={user_summary.job_title} size="small" color="primary" variant="outlined" />}
                {user_summary.department && <Chip label={user_summary.department} size="small" color="secondary" variant="outlined" />}
                <Chip label={user_summary.is_active ? "Active" : "Inactive"} size="small" color={user_summary.is_active ? "success" : "error"} />
              </Box>
            </Box>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="h6" color="primary.main">
                {statistics.total_permissions}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Permissions
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Person color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight={600} color="primary.main">
                {statistics.designation_permissions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Designation Permissions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Group color="secondary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight={600} color="secondary.main">
                {statistics.group_permissions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Group Permissions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Security color="warning" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight={600} color="warning.main">
                {statistics.override_permissions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Permission Overrides
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Warning color="error" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight={600} color="error.main">
                {statistics.high_risk_permissions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                High Risk Permissions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search permissions, codes, or sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk Level</InputLabel>
                <Select value={filterRisk} label="Risk Level" onChange={(e) => setFilterRisk(e.target.value)}>
                  <MenuItem value="">All Levels</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Source Type</InputLabel>
                <Select value={filterSource} label="Source Type" onChange={(e) => setFilterSource(e.target.value)}>
                  <MenuItem value="">All Sources</MenuItem>
                  <MenuItem value="designation">Designation</MenuItem>
                  <MenuItem value="group">Group</MenuItem>
                  <MenuItem value="override">Override</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
            <Tab label="All Permissions" icon={<Security />} />
            <Tab label="By Source" icon={<Assignment />} />
            <Tab label="Recent Activity" icon={<History />} />
            <Tab label="Risk Analysis" icon={<TrendingUp />} />
          </Tabs>
        </Box>

        {/* All Permissions Tab */}
        {selectedTab === 0 && (
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Permission</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Risk Level</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Expiry</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredPermissions().map((permission, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {permission.permission_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {permission.permission_code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip icon={getSourceIcon(permission.source_type)} label={permission.source_name} size="small" color={getSourceColor(permission.source_type) as any} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={permission.risk_level} size="small" color={getRiskLevelColor(permission.risk_level) as any} />
                      </TableCell>
                      <TableCell>
                        <Chip label={permission.permission_level} size="small" color={permission.permission_level === "granted" ? "success" : "error"} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {permission.effective_to ? (
                          <Typography variant="caption" color="warning.main">
                            {new Date(permission.effective_to).toLocaleDateString()}
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Permanent
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          {permission.source_type === "override" && (
                            <FeatureGate featureId="rbac_permissions_revoke">
                              <Tooltip title="Revoke Permission">
                                <IconButton size="small" color="error" onClick={() => openRevokeDialog(permission)}>
                                  <Remove />
                                </IconButton>
                              </Tooltip>
                            </FeatureGate>
                          )}
                          <Tooltip title="Create Override">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => {
                                setOverrideForm({
                                  ...overrideForm,
                                  permission_id: permission.permission_id,
                                });
                                setOverrideDialogOpen(true);
                              }}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        )}

        {/* By Source Tab */}
        {selectedTab === 1 && (
          <CardContent>
            <Stack spacing={2}>
              {/* Designation Permissions */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Person color="primary" />
                    <Typography variant="h6">Designation Permissions ({permission_sources.designation_permissions.length})</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Permissions inherited from job designation/role
                  </Typography>
                  {permission_sources.designation_permissions.map((permission, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {permission.permission_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {permission.permission_code}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Chip label={permission.risk_level} size="small" color={getRiskLevelColor(permission.risk_level) as any} />
                          <Chip label={permission.permission_level} size="small" color="success" variant="outlined" />
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>

              {/* Group Permissions */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Group color="secondary" />
                    <Typography variant="h6">Group Permissions ({permission_sources.group_permissions.length})</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Permissions from group memberships
                  </Typography>
                  {permission_sources.group_permissions.map((permission, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {permission.permission_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {permission.permission_code} • via {permission.source_name}
                          </Typography>
                          {permission.assignment_reason && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              Reason: {permission.assignment_reason}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Chip label={permission.risk_level} size="small" color={getRiskLevelColor(permission.risk_level) as any} />
                          {permission.is_temporary && <Chip label="Temporary" size="small" color="warning" variant="outlined" />}
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>

              {/* Override Permissions */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Security color="warning" />
                    <Typography variant="h6">Permission Overrides ({permission_sources.override_permissions.length})</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Individual permission grants and restrictions
                  </Typography>
                  {permission_sources.override_permissions.map((permission, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: "warning.light", borderRadius: 1, bgcolor: "warning.50" }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {permission.permission_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {permission.permission_code}
                          </Typography>
                          {permission.override_reason && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              Reason: {permission.override_reason}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Chip label={permission.risk_level} size="small" color={getRiskLevelColor(permission.risk_level) as any} />
                          {permission.is_temporary && <Chip label="Temporary" size="small" color="warning" />}
                          <FeatureGate featureId="rbac_permissions_revoke">
                            <Tooltip title="Revoke Override">
                              <IconButton size="small" color="error" onClick={() => openRevokeDialog(permission)}>
                                <Remove />
                              </IconButton>
                            </Tooltip>
                          </FeatureGate>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            </Stack>
          </CardContent>
        )}

        {/* Recent Activity Tab */}
        {selectedTab === 2 && (
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Permission Changes (Last 30 Days)
            </Typography>
            <Timeline>
              {dashboardData.assignment_history.map((item, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: 1, borderColor: "divider", borderRadius: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Timeline color="primary" />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.entity_name} • {item.action_type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        by {item.performed_by} • {new Date(item.performed_at).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Timeline>
          </CardContent>
        )}

        {/* Risk Analysis Tab */}
        {selectedTab === 3 && (
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Permission Risk Analysis
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="error.main" gutterBottom>
                      High-Risk Permissions
                    </Typography>
                    <Typography variant="h3" color="error.main">
                      {statistics.high_risk_permissions}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Permissions requiring elevated security
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" color="warning.main" gutterBottom>
                      Temporary Permissions
                    </Typography>
                    <Typography variant="h3" color="warning.main">
                      {getAllPermissions().filter((p) => p.is_temporary).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Time-limited access grants
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        )}
      </Card>

      {/* Grant Permission Dialog */}
      <Dialog open={grantDialogOpen} onClose={() => setGrantDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Grant Permission</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Autocomplete
              options={availablePermissions}
              getOptionLabel={(option) => `${option.permission_name} (${option.permission_code})`}
              value={availablePermissions.find((p) => p.id === grantForm.permission_id) || null}
              onChange={(_, value) => setGrantForm({ ...grantForm, permission_id: value?.id || null })}
              renderInput={(params) => <TextField {...params} label="Select Permission" fullWidth />}
            />
            <FormControl fullWidth>
              <InputLabel>Permission Level</InputLabel>
              <Select value={grantForm.permission_level} label="Permission Level" onChange={(e) => setGrantForm({ ...grantForm, permission_level: e.target.value })}>
                <MenuItem value="granted">Granted</MenuItem>
                <MenuItem value="denied">Denied</MenuItem>
                <MenuItem value="conditional">Conditional</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Assignment Reason" value={grantForm.assignment_reason} onChange={(e) => setGrantForm({ ...grantForm, assignment_reason: e.target.value })} multiline rows={2} />
            <TextField
              fullWidth
              label="Effective From"
              type="datetime-local"
              value={grantForm.effective_from}
              onChange={(e) => setGrantForm({ ...grantForm, effective_from: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Effective To (Optional)"
              type="datetime-local"
              value={grantForm.effective_to}
              onChange={(e) => setGrantForm({ ...grantForm, effective_to: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGrantDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button onClick={handleGrantPermission} variant="contained" disabled={!grantForm.permission_id || actionLoading}>
            {actionLoading ? "Granting..." : "Grant Permission"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Permission Dialog */}
      <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Revoke Permission</DialogTitle>
        <DialogContent>
          {selectedPermissionForAction && (
            <Box sx={{ mt: 1 }}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Are you sure you want to revoke this permission?
              </Alert>
              <Typography variant="body1" fontWeight={600}>
                {selectedPermissionForAction.permission_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedPermissionForAction.permission_code}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Source: {selectedPermissionForAction.source_name} ({selectedPermissionForAction.source_type})
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button onClick={handleRevokePermission} variant="contained" color="error" disabled={actionLoading}>
            {actionLoading ? "Revoking..." : "Revoke Permission"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Override Dialog */}
      <Dialog open={overrideDialogOpen} onClose={() => setOverrideDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Permission Override</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Autocomplete
              options={availablePermissions}
              getOptionLabel={(option) => `${option.permission_name} (${option.permission_code})`}
              value={availablePermissions.find((p) => p.id === overrideForm.permission_id) || null}
              onChange={(_, value) => setOverrideForm({ ...overrideForm, permission_id: value?.id || null })}
              renderInput={(params) => <TextField {...params} label="Select Permission" fullWidth />}
            />
            <FormControl fullWidth>
              <InputLabel>Override Type</InputLabel>
              <Select value={overrideForm.override_type} label="Override Type" onChange={(e) => setOverrideForm({ ...overrideForm, override_type: e.target.value as "grant" | "restrict" })}>
                <MenuItem value="grant">Grant</MenuItem>
                <MenuItem value="restrict">Restrict</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Permission Level</InputLabel>
              <Select value={overrideForm.permission_level} label="Permission Level" onChange={(e) => setOverrideForm({ ...overrideForm, permission_level: e.target.value })}>
                <MenuItem value="granted">Granted</MenuItem>
                <MenuItem value="denied">Denied</MenuItem>
                <MenuItem value="conditional">Conditional</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Override Reason"
              value={overrideForm.override_reason}
              onChange={(e) => setOverrideForm({ ...overrideForm, override_reason: e.target.value })}
              multiline
              rows={2}
              required
            />
            <TextField
              fullWidth
              label="Business Justification"
              value={overrideForm.business_justification}
              onChange={(e) => setOverrideForm({ ...overrideForm, business_justification: e.target.value })}
              multiline
              rows={2}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateOverride} variant="contained" disabled={!overrideForm.permission_id || !overrideForm.override_reason || !overrideForm.business_justification || actionLoading}>
            {actionLoading ? "Creating..." : "Create Override"}
          </Button>
        </DialogActions>
      </Dialog>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default PermissionDashboardPage;

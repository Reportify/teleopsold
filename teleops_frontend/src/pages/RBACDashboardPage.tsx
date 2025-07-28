// RBAC Dashboard Page - Main Permission Management Interface
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
  Divider,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import { Security, Group, Person, Assignment, History, Add, MoreVert, TrendingUp, Warning, CheckCircle, Schedule, AdminPanelSettings, Shield, Key, Visibility, Assessment } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { ModernSnackbar, AppBreadcrumbs } from "../components";
import type { BreadcrumbItem } from "../components";
import { useRBAC } from "../hooks/useRBAC";
import { Permission, PermissionGroup, PermissionAuditTrail } from "../services/rbacAPI";

interface PermissionSummary {
  total_permissions: number;
  active_permissions: number;
  by_category: Record<string, number>;
  by_risk_level: Record<string, number>;
  recent_changes: number;
}

interface GroupSummary {
  total_groups: number;
  active_groups: number;
  total_assignments: number;
  recent_assignments: number;
}

interface RecentActivity {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string;
  performed_by: string;
  performed_at: string;
  risk_level: string;
  change_summary?: string[];
}

const RBACDashboardPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const {
    state: { permissions, permissionGroups, auditTrail, totalPermissions, totalGroups, loading, error },
    loadPermissions,
    loadPermissionGroups,
    loadAuditTrail,
    loadUserEffectivePermissions,
  } = useRBAC();

  const [tabValue, setTabValue] = useState(0);
  const [permissionSummary, setPermissionSummary] = useState<PermissionSummary | null>(null);
  const [groupSummary, setGroupSummary] = useState<GroupSummary | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });

  const currentTenant = getCurrentTenant();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    // Update summary when data changes
    if (permissions.length > 0) {
      calculatePermissionSummary();
    }
    if (permissionGroups.length > 0) {
      calculateGroupSummary();
    }
    if (auditTrail.length > 0) {
      formatRecentActivity();
    }
  }, [permissions, permissionGroups, auditTrail]);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        loadPermissions(),
        loadPermissionGroups(),
        loadAuditTrail({ page_size: 10 }), // Load recent activity
        loadUserEffectivePermissions(), // Load current user permissions
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setSnackbar({
        open: true,
        message: "Failed to load dashboard data",
        severity: "error",
      });
    }
  };

  const calculatePermissionSummary = useCallback(() => {
    const activePermissions = permissions.filter((p) => p.is_active);

    // Calculate by category - use current page data for breakdown
    const byCategory = permissions.reduce((acc, permission) => {
      const category = permission.permission_category || "Other";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate by risk level - use current page data for breakdown
    const byRiskLevel = permissions.reduce((acc, permission) => {
      const risk = permission.risk_level || "low";
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate recent changes (permissions created in last 7 days, excluding system permissions)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentChanges = permissions.filter((p) => new Date(p.created_at) > oneWeekAgo && !p.is_system_permission).length;

    setPermissionSummary({
      total_permissions: totalPermissions || permissions.length, // Use total count from API
      active_permissions: activePermissions.length,
      by_category: byCategory,
      by_risk_level: byRiskLevel,
      recent_changes: recentChanges,
    });
  }, [permissions, totalPermissions]);

  const calculateGroupSummary = useCallback(() => {
    const activeGroups = permissionGroups.filter((g) => g.is_active);

    // Note: We don't have assignment counts from the API yet, so we'll estimate
    // In a real implementation, this would come from the API
    const totalAssignments = activeGroups.length * 8; // Estimate 8 users per group
    const recentAssignments = Math.floor(totalAssignments * 0.1); // Estimate 10% recent

    setGroupSummary({
      total_groups: totalGroups || permissionGroups.length, // Use total count from API
      active_groups: activeGroups.length,
      total_assignments: totalAssignments,
      recent_assignments: recentAssignments,
    });
  }, [permissionGroups, totalGroups]);

  const formatRecentActivity = useCallback(() => {
    const formattedActivity = auditTrail.slice(0, 10).map((activity, index) => ({
      id: activity.id.toString(),
      action: activity.action_description || formatActionType(activity.action_type),
      entity_type: activity.entity_type,
      entity_name: activity.entity_name || getEntityName(activity),
      performed_by: activity.performed_by_name || `User ${activity.performed_by}`,
      performed_at: activity.performed_at,
      risk_level: getRiskLevelFromAction(activity.action_type),
      change_summary: activity.change_summary || [],
    }));
    setRecentActivity(formattedActivity);
  }, [auditTrail]);

  const formatActionType = (actionType: string): string => {
    const actionMap: Record<string, string> = {
      grant: "Permission Granted",
      revoke: "Permission Revoked",
      modify: "Permission Modified",
      restrict: "Permission Restricted",
      escalate: "Permission Escalated",
      expire: "Permission Expired",
    };
    return actionMap[actionType] || actionType;
  };

  const getEntityName = (activity: PermissionAuditTrail): string => {
    // In a real implementation, this would resolve entity names from IDs
    return `${activity.entity_type}_${activity.entity_id}`;
  };

  const getRiskLevelFromAction = (actionType: string): string => {
    const riskMap: Record<string, string> = {
      grant: "medium",
      revoke: "high",
      modify: "medium",
      restrict: "low",
      escalate: "critical",
      expire: "low",
    };
    return riskMap[actionType] || "low";
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          RBAC Dashboard
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading permission data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          RBAC Dashboard
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="h6">Failed to load RBAC data</Typography>
          <Typography variant="body2">{error}</Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => loadDashboardData()}>
            Retry
          </Button>
        </Alert>
      </Box>
    );
  }

  // Breadcrumb configuration
  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: "dashboard",
    },
    {
      label: "RBAC Management",
      icon: "security",
      chip: {
        label: "Role-Based Access Control",
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
            RBAC Management
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Role-Based Access Control for {currentTenant?.organization_name}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" startIcon={<Visibility />} onClick={() => loadUserEffectivePermissions()}>
            My Permissions
          </Button>
          <Button variant="outlined" startIcon={<Assessment />} onClick={() => (window.location.href = "/rbac/permission-dashboard")}>
            Permission Dashboard
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => (window.location.href = "/rbac/permissions")}>
            Manage Permissions
          </Button>
        </Box>
      </Box>

      {/* Alert for important notifications */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>System Update:</strong> New permission scoping features are available.
          <Button size="small" sx={{ ml: 1 }}>
            Learn More
          </Button>
        </Typography>
      </Alert>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Permissions
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="primary.main">
                    {permissionSummary?.total_permissions}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    +{permissionSummary?.recent_changes} this week
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "primary.main" }}>
                  <Key />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Permission Groups
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="secondary.main">
                    {groupSummary?.total_groups}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {groupSummary?.total_assignments} assignments
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "secondary.main" }}>
                  <Group />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    High Risk Permissions
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="warning.main">
                    {(permissionSummary?.by_risk_level.high || 0) + (permissionSummary?.by_risk_level.critical || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Requires approval
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "warning.main" }}>
                  <Warning />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Recent Activity
                  </Typography>
                  <Typography variant="h4" fontWeight={600} color="info.main">
                    {recentActivity.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last 24 hours
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: "info.main" }}>
                  <History />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Card elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab icon={<Key />} label="Permissions Overview" />
            <Tab icon={<Group />} label="Groups & Assignments" />
            <Tab icon={<History />} label="Recent Activity" />
            <Tab icon={<TrendingUp />} label="Analytics" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <CardContent>
          {tabValue === 0 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Permission Registry Overview
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => (window.location.href = "/rbac/permissions")}>
                  Manage Permissions
                </Button>
              </Box>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Permissions by Category
                    </Typography>
                    {permissionSummary &&
                      Object.entries(permissionSummary.by_category).map(([category, count]) => (
                        <Box key={category} sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                          <Typography variant="body2">{category}</Typography>
                          <Chip label={count} size="small" variant="outlined" />
                        </Box>
                      ))}
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Risk Level Distribution
                    </Typography>
                    {permissionSummary &&
                      Object.entries(permissionSummary.by_risk_level).map(([level, count]) => (
                        <Box key={level} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                              {level}
                            </Typography>
                          </Box>
                          <Chip label={count} size="small" color={getRiskLevelColor(level) as any} />
                        </Box>
                      ))}
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {tabValue === 1 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Typography variant="h6" fontWeight={600}>
                  Permission Groups Management
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => (window.location.href = "/rbac/groups")}>
                  Manage Groups
                </Button>
              </Box>

              {/* Summary Cards */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary.main" gutterBottom>
                        {groupSummary?.total_groups}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Permission Groups
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="secondary.main" gutterBottom>
                        {groupSummary?.total_assignments}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        User Assignments
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="success.main" gutterBottom>
                        {groupSummary?.recent_assignments}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Recent Assignments
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Permission Groups Table */}
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6" fontWeight={600}>
                      Permission Groups
                    </Typography>
                    <Button variant="outlined" size="small" onClick={() => (window.location.href = "/rbac/groups")}>
                      View All
                    </Button>
                  </Box>

                  {permissionGroups.length > 0 ? (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Group Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Permissions</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {permissionGroups.slice(0, 5).map((group) => (
                            <TableRow key={group.id} hover>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" fontWeight={600}>
                                    {group.group_name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {group.group_code}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={group.group_type}
                                  size="small"
                                  variant="outlined"
                                  color={group.group_type === "administrative" ? "error" : group.group_type === "functional" ? "primary" : group.group_type === "project" ? "secondary" : "default"}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`${group.group_permissions?.length || 0} permissions`}
                                  size="small"
                                  color={(group.group_permissions?.length || 0) > 0 ? "primary" : "default"}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip label={group.is_active ? "Active" : "Inactive"} size="small" color={group.is_active ? "success" : "default"} variant={group.is_active ? "filled" : "outlined"} />
                              </TableCell>
                              <TableCell align="center">
                                <IconButton size="small" onClick={() => (window.location.href = `/rbac/groups?edit=${group.id}`)}>
                                  <MoreVert />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ textAlign: "center", py: 4 }}>
                      <Group sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Permission Groups
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Create your first permission group to organize user access control
                      </Typography>
                      <Button variant="contained" startIcon={<Add />} onClick={() => (window.location.href = "/rbac/groups?action=create")}>
                        Create Group
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Recent Permission Activity
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Action</TableCell>
                      <TableCell>Entity</TableCell>
                      <TableCell>Performed By</TableCell>
                      <TableCell>Risk Level</TableCell>
                      <TableCell>Time</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivity.map((activity) => (
                      <TableRow key={activity.id} hover>
                        <TableCell sx={{ maxWidth: 350 }}>
                          <Box>
                            <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ mb: 0.5 }}>
                              {activity.action}
                            </Typography>
                            <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                              {activity.entity_name}
                            </Typography>
                            {activity.change_summary && activity.change_summary.length > 0 && (
                              <Box
                                sx={{
                                  mt: 1,
                                  p: 1.5,
                                  backgroundColor: "grey.50",
                                  borderRadius: 1,
                                  border: "1px solid",
                                  borderColor: "grey.200",
                                }}
                              >
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: "block" }}>
                                  Changes Made:
                                </Typography>
                                {activity.change_summary.map((summary, idx) => (
                                  <Typography key={idx} variant="caption" color="text.primary" display="block" sx={{ mb: 0.3, lineHeight: 1.4 }}>
                                    {summary}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={activity.entity_type.charAt(0).toUpperCase() + activity.entity_type.slice(1)} size="small" variant="outlined" color="default" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {activity.performed_by}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={activity.risk_level} size="small" color={getRiskLevelColor(activity.risk_level) as any} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatDate(activity.performed_at)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small">
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabValue === 3 && (
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Permission Analytics & Reports
              </Typography>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper sx={{ p: 3, textAlign: "center" }}>
                    <TrendingUp sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Permission Usage Trends
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Coming soon - Analytics dashboard with permission usage patterns and trends.
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper sx={{ p: 3, textAlign: "center" }}>
                    <Assessment sx={{ fontSize: 48, color: "secondary.main", mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Compliance Reports
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Generate compliance reports for audit and regulatory requirements.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Global Quick Actions Panel */}
      <Card elevation={2} sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Button variant="outlined" fullWidth startIcon={<Add />} onClick={() => (window.location.href = "/rbac/permissions?action=create")} sx={{ height: 56 }}>
                Create Permission
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Button variant="outlined" fullWidth startIcon={<Group />} onClick={() => (window.location.href = "/rbac/groups?action=create")} sx={{ height: 56 }}>
                Create Group
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Button variant="outlined" fullWidth startIcon={<Person />} onClick={() => (window.location.href = "/users")} sx={{ height: 56 }}>
                Manage Users
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Button variant="outlined" fullWidth startIcon={<Assessment />} onClick={() => (window.location.href = "/rbac/permission-dashboard")} sx={{ height: 56 }}>
                Permission Dashboard
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Button variant="outlined" fullWidth startIcon={<Assignment />} onClick={() => (window.location.href = "/rbac/assignment-panel")} sx={{ height: 56 }}>
                Assignment Panel
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Button variant="outlined" fullWidth startIcon={<History />} onClick={() => setTabValue(2)} sx={{ height: 56 }}>
                View Activity
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default RBACDashboardPage;

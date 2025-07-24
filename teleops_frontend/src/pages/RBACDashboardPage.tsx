// RBAC Dashboard Page - Main Permission Management Interface
import React, { useState, useEffect } from "react";
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
import { ModernSnackbar } from "../components";

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
}

const RBACDashboardPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
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

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // Mock data for demonstration
      setPermissionSummary({
        total_permissions: 145,
        active_permissions: 142,
        by_category: {
          "User Management": 25,
          "Data Access": 35,
          Administrative: 15,
          System: 8,
          Project: 32,
          Billing: 12,
          Reports: 18,
        },
        by_risk_level: {
          low: 85,
          medium: 42,
          high: 15,
          critical: 3,
        },
        recent_changes: 7,
      });

      setGroupSummary({
        total_groups: 12,
        active_groups: 11,
        total_assignments: 89,
        recent_assignments: 5,
      });

      setRecentActivity([
        {
          id: "1",
          action: "Permission Created",
          entity_type: "permission",
          entity_name: "project.create_milestone",
          performed_by: "Admin User",
          performed_at: "2025-01-22T10:30:00Z",
          risk_level: "medium",
        },
        {
          id: "2",
          action: "User Added to Group",
          entity_type: "group_assignment",
          entity_name: "Project Managers",
          performed_by: "HR Manager",
          performed_at: "2025-01-22T09:15:00Z",
          risk_level: "low",
        },
        {
          id: "3",
          action: "Permission Override",
          entity_type: "user_override",
          entity_name: "billing.view_all_invoices",
          performed_by: "Finance Admin",
          performed_at: "2025-01-22T08:45:00Z",
          risk_level: "high",
        },
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setSnackbar({
        open: true,
        message: "Failed to load dashboard data",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
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

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
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
          <Button variant="outlined" startIcon={<Visibility />} onClick={() => (window.location.href = "/my-permissions")}>
            My Permissions
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => (window.location.href = "/rbac/permissions/create")}>
            Quick Setup
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

              <Grid container spacing={3}>
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
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {activity.action}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{activity.entity_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.entity_type}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{activity.performed_by}</Typography>
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

      {/* Quick Actions Panel */}
      <Card elevation={2} sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button variant="outlined" fullWidth startIcon={<Add />} onClick={() => (window.location.href = "/rbac/permissions/create")} sx={{ height: 56 }}>
                Create Permission
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button variant="outlined" fullWidth startIcon={<Group />} onClick={() => (window.location.href = "/rbac/groups/create")} sx={{ height: 56 }}>
                Create Group
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button variant="outlined" fullWidth startIcon={<Person />} onClick={() => (window.location.href = "/rbac/user-permissions")} sx={{ height: 56 }}>
                Manage User Access
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Button variant="outlined" fullWidth startIcon={<History />} onClick={() => (window.location.href = "/rbac/audit")} sx={{ height: 56 }}>
                View Audit Trail
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

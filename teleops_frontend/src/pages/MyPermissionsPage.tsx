// My Permissions Page - For Regular Users
import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  ExpandMore,
  Security,
  Schedule,
  LocationOn,
  Functions,
  Warning,
  Info,
  CheckCircle,
  Block,
  Group,
  Assignment,
  Person,
  AccessTime,
  Shield,
  Key,
  Visibility,
  Lock,
  AdminPanelSettings,
  Business,
  Assessment,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { ModernSnackbar } from "../components";

interface UserPermission {
  permission_code: string;
  permission_name: string;
  permission_category: string;
  permission_level: string;
  source: string;
  risk_level: string;
  requires_mfa: boolean;
  scope_limitations: {
    geographic_scope: string[];
    functional_scope: string[];
    temporal_scope: Record<string, any>;
  };
  conditions: Record<string, any>;
}

interface PermissionSummary {
  total_permissions: number;
  by_category: Record<string, number>;
  by_risk_level: Record<string, number>;
  requires_mfa_count: number;
  administrative_access: boolean;
  conditional_permissions: string[];
}

const MyPermissionsPage: React.FC = () => {
  const { user, getCurrentTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [permissionSummary, setPermissionSummary] = useState<PermissionSummary | null>(null);
  const [scopeLimitations, setScopeLimitations] = useState<any>(null);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });

  const currentTenant = getCurrentTenant();

  useEffect(() => {
    loadUserPermissions();
  }, []);

  const loadUserPermissions = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call to /api/v1/tenants/rbac/user-permissions/effective_permissions/
      // Mock data for demonstration
      const mockPermissions: UserPermission[] = [
        {
          permission_code: "users.view_profiles",
          permission_name: "View User Profiles",
          permission_category: "User Management",
          permission_level: "granted",
          source: "designation_manager",
          risk_level: "low",
          requires_mfa: false,
          scope_limitations: {
            geographic_scope: ["Mumbai Circle", "Delhi Circle"],
            functional_scope: ["Operations", "Support"],
            temporal_scope: { working_hours: { start: 9, end: 18 } },
          },
          conditions: {},
        },
        {
          permission_code: "projects.create_tasks",
          permission_name: "Create Project Tasks",
          permission_category: "Project Management",
          permission_level: "granted",
          source: "group_project_managers",
          risk_level: "medium",
          requires_mfa: false,
          scope_limitations: {
            geographic_scope: [],
            functional_scope: ["Project Management"],
            temporal_scope: {},
          },
          conditions: { min_tenure_days: 30 },
        },
        {
          permission_code: "billing.view_invoices",
          permission_name: "View Billing Invoices",
          permission_category: "Billing & Finance",
          permission_level: "conditional",
          source: "user_override_12",
          risk_level: "high",
          requires_mfa: true,
          scope_limitations: {
            geographic_scope: ["Mumbai Circle"],
            functional_scope: ["Finance"],
            temporal_scope: { valid_days: [1, 2, 3, 4, 5] }, // Monday to Friday
          },
          conditions: { required_approval: true },
        },
      ];

      setPermissions(mockPermissions);

      const summary: PermissionSummary = {
        total_permissions: mockPermissions.length,
        by_category: mockPermissions.reduce((acc, p) => {
          acc[p.permission_category] = (acc[p.permission_category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        by_risk_level: mockPermissions.reduce((acc, p) => {
          acc[p.risk_level] = (acc[p.risk_level] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        requires_mfa_count: mockPermissions.filter((p) => p.requires_mfa).length,
        administrative_access: mockPermissions.some((p) => p.permission_category === "Administrative"),
        conditional_permissions: mockPermissions.filter((p) => p.permission_level === "conditional").map((p) => p.permission_code),
      };

      setPermissionSummary(summary);

      setScopeLimitations({
        geographic_scope: ["Mumbai Circle", "Delhi Circle"],
        functional_scope: ["Operations", "Support", "Project Management", "Finance"],
        temporal_scope: {
          working_hours: { start: 9, end: 18 },
          valid_days: [1, 2, 3, 4, 5],
        },
      });
    } catch (error) {
      console.error("Failed to load user permissions:", error);
      setSnackbar({
        open: true,
        message: "Failed to load your permissions",
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

  const getSourceIcon = (source: string) => {
    if (source.startsWith("designation_")) return <Assignment />;
    if (source.startsWith("group_")) return <Group />;
    if (source.startsWith("user_override_")) return <Person />;
    return <Security />;
  };

  const getSourceLabel = (source: string) => {
    if (source.startsWith("designation_")) return "From Designation";
    if (source.startsWith("group_")) return "From Permission Group";
    if (source.startsWith("user_override_")) return "Special Assignment";
    return "System Permission";
  };

  const formatWorkingHours = (hours: { start: number; end: number }) => {
    return `${hours.start}:00 - ${hours.end}:00`;
  };

  const formatValidDays = (days: number[]) => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map((d) => dayNames[d]).join(", ");
  };

  const getFilteredPermissions = () => {
    let filtered = permissions;

    if (tabValue === 1) {
      // High-risk permissions
      filtered = permissions.filter((p) => p.risk_level === "high" || p.risk_level === "critical");
    } else if (tabValue === 2) {
      // Conditional permissions
      filtered = permissions.filter((p) => p.permission_level === "conditional" || p.requires_mfa);
    } else if (tabValue === 3) {
      // Limited scope permissions
      filtered = permissions.filter(
        (p) => p.scope_limitations.geographic_scope.length > 0 || p.scope_limitations.functional_scope.length > 0 || Object.keys(p.scope_limitations.temporal_scope).length > 0
      );
    }

    return filtered;
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          My Permissions
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading your access rights...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Shield color="primary" />
          My Permissions
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          Your access rights and limitations in {currentTenant?.organization_name}
        </Typography>
      </Box>

      {/* User Info Card */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>{(user?.first_name?.[0] || "") + (user?.last_name?.[0] || "") || user?.email?.charAt(0)}</Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Member since: {new Date().toLocaleDateString()} {/* Replace with actual join date */}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                <Typography variant="body2" color="text.secondary">
                  Total Permissions
                </Typography>
                <Typography variant="h4" fontWeight={600} color="primary.main">
                  {permissionSummary?.total_permissions}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: "center" }}>
              <CheckCircle sx={{ fontSize: 32, color: "success.main", mb: 1 }} />
              <Typography variant="h6" fontWeight={600}>
                {permissions.filter((p) => p.permission_level === "granted").length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Granted Permissions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: "center" }}>
              <Warning sx={{ fontSize: 32, color: "warning.main", mb: 1 }} />
              <Typography variant="h6" fontWeight={600}>
                {permissionSummary?.requires_mfa_count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Require MFA
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: "center" }}>
              <Schedule sx={{ fontSize: 32, color: "info.main", mb: 1 }} />
              <Typography variant="h6" fontWeight={600}>
                {permissions.filter((p) => Object.keys(p.scope_limitations.temporal_scope).length > 0).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Time Restricted
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={1}>
            <CardContent sx={{ textAlign: "center" }}>
              <AdminPanelSettings sx={{ fontSize: 32, color: permissionSummary?.administrative_access ? "primary.main" : "grey.400", mb: 1 }} />
              <Typography variant="h6" fontWeight={600}>
                {permissionSummary?.administrative_access ? "Yes" : "No"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Admin Access
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Important Alerts */}
      {permissionSummary?.conditional_permissions && permissionSummary.conditional_permissions.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            You have {permissionSummary.conditional_permissions.length} permissions that require special conditions or approval. Check the "Conditional Access" tab for details.
          </Typography>
        </Alert>
      )}

      {/* Main Content */}
      <Card elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab icon={<Key />} label="All Permissions" />
            <Tab icon={<Warning />} label="High Risk" />
            <Tab icon={<Lock />} label="Conditional Access" />
            <Tab icon={<LocationOn />} label="Scope Limited" />
          </Tabs>
        </Box>

        <CardContent>
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Complete Permission List
              </Typography>

              {/* Permissions by Category */}
              {Object.entries(permissionSummary?.by_category || {}).map(([category, count]) => (
                <Accordion key={category} expanded={expandedAccordion === category} onChange={(e, isExpanded) => setExpandedAccordion(isExpanded ? category : false)}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                      <Business />
                      <Typography variant="subtitle1" fontWeight={600}>
                        {category}
                      </Typography>
                      <Chip label={`${count} permissions`} size="small" />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {permissions
                        .filter((p) => p.permission_category === category)
                        .map((permission) => (
                          <ListItem key={permission.permission_code}>
                            <ListItemIcon>{getSourceIcon(permission.source)}</ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Typography variant="body1">{permission.permission_name}</Typography>
                                  <Chip label={permission.risk_level} size="small" color={getRiskLevelColor(permission.risk_level) as any} />
                                  {permission.requires_mfa && <Chip label="MFA Required" size="small" color="warning" />}
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    {permission.permission_code} • {getSourceLabel(permission.source)}
                                  </Typography>
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          {(tabValue === 1 || tabValue === 2 || tabValue === 3) && (
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {tabValue === 1 && "High Risk Permissions"}
                {tabValue === 2 && "Conditional Access Permissions"}
                {tabValue === 3 && "Scope Limited Permissions"}
              </Typography>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Permission</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell align="center">Risk Level</TableCell>
                      <TableCell align="center">Source</TableCell>
                      <TableCell align="center">Conditions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredPermissions().map((permission) => (
                      <TableRow key={permission.permission_code} hover>
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
                          <Chip label={permission.permission_category} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={permission.risk_level} size="small" color={getRiskLevelColor(permission.risk_level) as any} />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={getSourceLabel(permission.source)}>{getSourceIcon(permission.source)}</Tooltip>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                            {permission.requires_mfa && <Chip label="MFA Required" size="small" color="warning" />}
                            {permission.permission_level === "conditional" && <Chip label="Approval Required" size="small" color="info" />}
                            {permission.scope_limitations.geographic_scope.length > 0 && <Chip label="Location Limited" size="small" color="secondary" />}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Scope Limitations Card */}
      {scopeLimitations && (
        <Card elevation={2} sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LocationOn />
              Your Access Limitations
            </Typography>

            <Grid container spacing={3}>
              {scopeLimitations.geographic_scope?.length > 0 && (
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2 }} variant="outlined">
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Geographic Scope
                    </Typography>
                    {scopeLimitations.geographic_scope.map((location: string) => (
                      <Chip key={location} label={location} size="small" sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </Paper>
                </Grid>
              )}

              {scopeLimitations.functional_scope?.length > 0 && (
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2 }} variant="outlined">
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Functional Areas
                    </Typography>
                    {scopeLimitations.functional_scope.map((func: string) => (
                      <Chip key={func} label={func} size="small" sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </Paper>
                </Grid>
              )}

              {scopeLimitations.temporal_scope && Object.keys(scopeLimitations.temporal_scope).length > 0 && (
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2 }} variant="outlined">
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      Time Restrictions
                    </Typography>
                    {scopeLimitations.temporal_scope.working_hours && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Working Hours:
                        </Typography>
                        <br />
                        <Chip label={formatWorkingHours(scopeLimitations.temporal_scope.working_hours)} size="small" icon={<AccessTime />} />
                      </Box>
                    )}
                    {scopeLimitations.temporal_scope.valid_days && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Valid Days:
                        </Typography>
                        <br />
                        <Chip label={formatValidDays(scopeLimitations.temporal_scope.valid_days)} size="small" icon={<Schedule />} />
                      </Box>
                    )}
                  </Paper>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default MyPermissionsPage;

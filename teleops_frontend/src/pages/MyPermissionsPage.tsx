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
  Refresh,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { ModernSnackbar } from "../components";
import rbacAPI from "../services/rbacAPI";

interface UserPermission {
  permission_code: string;
  permission_name: string;
  permission_category: string;
  permission_level: string;
  source_type: string;
  source_name: string;
  risk_level: string;
  requires_mfa: boolean;
  scope_configuration: Record<string, any>;
  geographic_scope: string[];
  functional_scope: string[];
  temporal_scope: Record<string, any>;
  conditions: Record<string, any>;
  is_temporary: boolean;
  effective_from?: string;
  effective_to?: string;
}

interface PermissionSummary {
  total_permissions: number;
  granted_permissions: number;
  denied_permissions: number;
  conditional_permissions: number;
  high_risk_permissions: number;
  critical_permissions: number;
}

interface EffectivePermissionsResponse {
  view_type: string;
  user_summary: any;
  effective_permissions: {
    permissions: Record<string, any>;
    scope_limitations: Record<string, any>;
    permission_summary: PermissionSummary;
    metadata: {
      calculation_time: string;
      sources: {
        designation_count: number;
        group_count: number;
        override_count: number;
      };
      is_administrator?: boolean;
    };
  };
  permission_sources: any;
  assignment_history: any[];
  conflicts: any[];
  recommendations: string[];
  generated_at: string;
}

const MyPermissionsPage: React.FC = () => {
  const { user, getCurrentTenant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [permissionSummary, setPermissionSummary] = useState<PermissionSummary | null>(null);
  const [scopeLimitations, setScopeLimitations] = useState<any>(null);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermissionsResponse | null>(null);
  const [userDesignations, setUserDesignations] = useState<any[]>([]);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });

  const currentTenant = getCurrentTenant();

  // Computed admin status from the API response
  const isAdministrator = effectivePermissions?.effective_permissions?.metadata?.is_administrator || false;

  useEffect(() => {
    loadUserPermissions();
  }, []);

  const loadUserPermissions = async () => {
    setLoading(true);
    try {
      // Get current user's effective permissions
      const userProfile = await rbacAPI.getCurrentUserProfile();
      console.log("Current user profile:", userProfile);

      // Get effective permissions using the comprehensive dashboard API
      const effectivePerms = await rbacAPI.getComprehensiveDashboard("user_analysis", {
        user_id: userProfile.user_id,
      });
      console.log("Effective permissions response:", effectivePerms);

      setEffectivePermissions(effectivePerms);

      // Transform the permissions data
      const transformedPermissions: UserPermission[] = [];

      // The API returns effective_permissions at the root level
      if (effectivePerms.effective_permissions) {
        const permsData = effectivePerms.effective_permissions;

        // Convert permissions object to array
        Object.entries(permsData.permissions || {}).forEach(([permCode, permData]: [string, any]) => {
          const permission = permData.permission;
          transformedPermissions.push({
            permission_code: permCode,
            permission_name: permission?.permission_name || permCode,
            permission_category: permission?.permission_category || "General",
            permission_level: permData.permission_level || "granted",
            source_type: permData.source_type || "unknown",
            source_name: permData.source_name || "Unknown",
            risk_level: permission?.risk_level || "low",
            requires_mfa: permission?.requires_mfa || false,
            scope_configuration: permData.scope_configuration || {},
            geographic_scope: permData.geographic_scope || [],
            functional_scope: permData.functional_scope || [],
            temporal_scope: permData.temporal_scope || {},
            conditions: permData.conditions || {},
            is_temporary: permData.is_temporary || false,
            effective_from: permData.effective_from,
            effective_to: permData.effective_to,
          });
        });

        setPermissions(transformedPermissions);
        setPermissionSummary(permsData.permission_summary);
        setScopeLimitations(permsData.scope_limitations);
      } else {
        // Fallback: create permissions from the permissions object if structure is different
        Object.entries(effectivePerms.permissions || {}).forEach(([permCode, permData]: [string, any]) => {
          const permission = permData.permission;
          transformedPermissions.push({
            permission_code: permCode,
            permission_name: permission?.permission_name || permCode,
            permission_category: permission?.permission_category || "General",
            permission_level: permData.permission_level || "granted",
            source_type: permData.source_type || "unknown",
            source_name: permData.source_name || "Unknown",
            risk_level: permission?.risk_level || "low",
            requires_mfa: permission?.requires_mfa || false,
            scope_configuration: permData.scope_configuration || {},
            geographic_scope: permData.geographic_scope || [],
            functional_scope: permData.functional_scope || [],
            temporal_scope: permData.temporal_scope || {},
            conditions: permData.conditions || {},
            is_temporary: permData.is_temporary || false,
            effective_from: permData.effective_from,
            effective_to: permData.effective_to,
          });
        });

        setPermissions(transformedPermissions);
        setPermissionSummary(effectivePerms.permission_summary);
        setScopeLimitations(effectivePerms.scope_limitations);
      }

      // Get user's designations
      try {
        const designations = await rbacAPI.getUserDesignations(userProfile.id);
        setUserDesignations(designations);
      } catch (error) {
        console.warn("Failed to load user designations:", error);
      }
    } catch (error) {
      console.error("Failed to load user permissions:", error);
      setSnackbar({
        open: true,
        message: "Failed to load your permissions. Please try again.",
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
    if (source.includes("designation")) return <Assignment />;
    if (source.includes("group")) return <Group />;
    if (source.includes("override") || source.includes("user")) return <Person />;
    return <Security />;
  };

  const getSourceLabel = (sourceType: string, sourceName: string) => {
    if (sourceType.includes("designation")) return `From Designation: ${sourceName}`;
    if (sourceType.includes("group")) return `From Group: ${sourceName}`;
    if (sourceType.includes("override") || sourceType.includes("user")) return `Special Assignment: ${sourceName}`;
    return `System: ${sourceName}`;
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
      filtered = permissions.filter((p) => p.permission_level === "conditional" || p.requires_mfa || Object.keys(p.conditions).length > 0);
    } else if (tabValue === 3) {
      // Limited scope permissions
      filtered = permissions.filter((p) => p.geographic_scope.length > 0 || p.functional_scope.length > 0 || Object.keys(p.temporal_scope).length > 0);
    }

    return filtered;
  };

  const getPermissionsByCategory = () => {
    return permissions.reduce((acc, permission) => {
      const category = permission.permission_category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, UserPermission[]>);
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
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Shield color="primary" />
            My Permissions
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Your access rights and limitations in {currentTenant?.organization_name}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadUserPermissions} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {/* Administrator Badge */}
      {isAdministrator && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Administrator Access:</strong> You have administrative privileges and access to all permissions in this tenant.
          </Typography>
        </Alert>
      )}

      {/* User Info Card */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56 }}>{(user?.first_name?.[0] || "") + (user?.last_name?.[0] || "") || user?.email?.charAt(0)}</Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={600}>
                    {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.email}
                  </Typography>
                  {userDesignations.length > 0 && (
                    <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {userDesignations.map((designation, index) => (
                        <Chip key={index} label={designation.designation_name} size="small" color="primary" variant="outlined" />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
                <Typography variant="body2" color="text.secondary">
                  Total Permissions
                </Typography>
                <Typography variant="h4" fontWeight={600} color="primary.main">
                  {permissions.length}
                </Typography>
                {effectivePermissions?.effective_permissions?.metadata && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    Sources: {effectivePermissions.effective_permissions.metadata.sources.designation_count} designations, {effectivePermissions.effective_permissions.metadata.sources.group_count}{" "}
                    groups, {effectivePermissions.effective_permissions.metadata.sources.override_count} overrides
                  </Typography>
                )}
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
                {permissions.filter((p) => p.requires_mfa).length}
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
                {permissions.filter((p) => p.is_temporary || Object.keys(p.temporal_scope).length > 0).length}
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
              <AdminPanelSettings
                sx={{
                  fontSize: 32,
                  color: isAdministrator ? "primary.main" : "grey.400",
                  mb: 1,
                }}
              />
              <Typography variant="h6" fontWeight={600}>
                {isAdministrator ? "Yes" : "No"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Admin Access
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Important Alerts */}
      {permissions.filter((p) => p.permission_level === "conditional" || Object.keys(p.conditions).length > 0).length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            You have {permissions.filter((p) => p.permission_level === "conditional" || Object.keys(p.conditions).length > 0).length} permissions that require special conditions or approval. Check the
            "Conditional Access" tab for details.
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
                Complete Permission List ({permissions.length} permissions)
              </Typography>

              {/* Permissions by Category */}
              {Object.entries(getPermissionsByCategory()).map(([category, categoryPermissions]) => (
                <Accordion key={category} expanded={expandedAccordion === category} onChange={(e, isExpanded) => setExpandedAccordion(isExpanded ? category : false)}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                      <Business />
                      <Typography variant="subtitle1" fontWeight={600}>
                        {category}
                      </Typography>
                      <Chip label={`${categoryPermissions.length} permissions`} size="small" />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {categoryPermissions.map((permission) => (
                        <ListItem key={permission.permission_code}>
                          <ListItemIcon>{getSourceIcon(permission.source_type)}</ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                <Typography variant="body1">{permission.permission_name}</Typography>
                                <Chip label={permission.risk_level} size="small" color={getRiskLevelColor(permission.risk_level) as any} />
                                {permission.requires_mfa && <Chip label="MFA Required" size="small" color="warning" />}
                                {permission.is_temporary && <Chip label="Temporary" size="small" color="info" />}
                                {permission.permission_level === "conditional" && <Chip label="Conditional" size="small" color="secondary" />}
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  {permission.permission_code} • {getSourceLabel(permission.source_type, permission.source_name)}
                                </Typography>
                                {(permission.effective_from || permission.effective_to) && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                    {permission.effective_from && `From: ${new Date(permission.effective_from).toLocaleDateString()}`}
                                    {permission.effective_to && ` To: ${new Date(permission.effective_to).toLocaleDateString()}`}
                                  </Typography>
                                )}
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
                {tabValue === 1 && `High Risk Permissions (${getFilteredPermissions().length})`}
                {tabValue === 2 && `Conditional Access Permissions (${getFilteredPermissions().length})`}
                {tabValue === 3 && `Scope Limited Permissions (${getFilteredPermissions().length})`}
              </Typography>

              {getFilteredPermissions().length === 0 ? (
                <Alert severity="info">
                  <Typography variant="body2">
                    {tabValue === 1 && "You don't have any high-risk permissions."}
                    {tabValue === 2 && "You don't have any conditional access permissions."}
                    {tabValue === 3 && "You don't have any scope-limited permissions."}
                  </Typography>
                </Alert>
              ) : (
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
                            <Tooltip title={getSourceLabel(permission.source_type, permission.source_name)}>{getSourceIcon(permission.source_type)}</Tooltip>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                              {permission.requires_mfa && <Chip label="MFA Required" size="small" color="warning" />}
                              {permission.permission_level === "conditional" && <Chip label="Approval Required" size="small" color="info" />}
                              {permission.geographic_scope.length > 0 && <Chip label="Location Limited" size="small" color="secondary" />}
                              {permission.is_temporary && <Chip label="Temporary" size="small" color="default" />}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Scope Limitations Card */}
      {scopeLimitations && Object.keys(scopeLimitations).length > 0 && (
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

// Circle Management Page for Corporate Tenants
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Tabs,
  Tab,
  Paper,
  Divider,
  LinearProgress,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Alert,
} from "@mui/material";
import { Add, Circle, MoreVert, Business, People, Assignment, TrendingUp, TrendingDown, Email, Phone, LocationOn, CheckCircle, Warning, Error, Info, Assessment, Settings } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { StatsCard, ModernSnackbar } from "../components";
import { useDarkMode } from "../contexts/ThemeContext";
import { corporateCircleApi, telecomCircleApi } from "../services/api";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface CircleData {
  id: string;
  name: string;
  circle_code: string;
  circle_name: string;
  status: string;
  activation_date: string | null;
  primary_contact: string;
  email: string;
  phone: string;
  performance: {
    projects_completed: number;
    sites_dismantled: number;
    equipment_recovered: number;
    efficiency_score: number;
  };
  metrics: {
    monthly_revenue: number;
    active_projects: number;
    vendor_count: number;
    compliance_score: number;
  };
}

interface CorporateMetrics {
  total_circles: number;
  active_circles: number;
  total_monthly_revenue: number;
  total_projects: number;
  total_sites: number;
  average_efficiency: number;
}

const CircleManagementPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const { darkMode } = useDarkMode();
  const [tabValue, setTabValue] = useState(0);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCircle, setSelectedCircle] = useState<CircleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [circles, setCircles] = useState<CircleData[]>([]);
  const [corporateMetrics, setCorporateMetrics] = useState<CorporateMetrics | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });
  const [inviteForm, setInviteForm] = useState({
    selected_circle_id: "",
    circle_name: "",
    circle_code: "",
    primary_contact_name: "",
    contact_email: "",
    contact_phone: "",
    expiry_date: "",
  });
  const [availableCircles, setAvailableCircles] = useState<any[]>([]);
  const [loadingCircles, setLoadingCircles] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  const currentTenant = getCurrentTenant();

  useEffect(() => {
    loadCircleData();
    loadPendingInvitations();
  }, []);

  const loadCircleData = async () => {
    try {
      setLoading(true);

      if (!currentTenant?.id) {
        setSnackbar({
          open: true,
          message: "No current tenant found. Please log in again.",
          severity: "error",
        });
        return;
      }

      console.log("Loading circle data for corporate tenant:", currentTenant.id);

      // Get circles for current corporate tenant
      const response = await corporateCircleApi.getCircleTenants();

      console.log("Circle API response:", response as any);

      // Tenant API returns data directly
      const circleData = (response as any).circles || [];
      const metrics = (response as any).corporate_metrics || null;

      setCircles(circleData);
      setCorporateMetrics(metrics);

      console.log("Loaded circles:", circleData.length);
      console.log("Corporate metrics:", metrics);
    } catch (error: any) {
      console.error("Error loading circle data:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to load circle data. Please try again.",
        severity: "error",
      });
      // Set empty arrays to prevent UI errors
      setCircles([]);
      setCorporateMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCircles = async () => {
    try {
      setLoadingCircles(true);
      const response = await telecomCircleApi.list();
      console.log("Available circles response:", response);
      setAvailableCircles((response as any) || []);
    } catch (error: any) {
      console.error("Error loading available circles:", error);
      setSnackbar({
        open: true,
        message: "Failed to load available circles. Please try again.",
        severity: "error",
      });
    } finally {
      setLoadingCircles(false);
    }
  };

  const loadPendingInvitations = async () => {
    try {
      setLoadingInvitations(true);
      const response = await corporateCircleApi.getPendingInvitations();
      console.log("Pending invitations response:", response);
      setPendingInvitations((response as any)?.invitations || []);
    } catch (error: any) {
      console.error("Error loading pending invitations:", error);
      setSnackbar({
        open: true,
        message: "Failed to load pending invitations. Please try again.",
        severity: "error",
      });
      setPendingInvitations([]);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, circle: CircleData) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedCircle(circle);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedCircle(null);
  };

  const handleInviteFormChange = (field: string, value: string) => {
    setInviteForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleOpenInviteDialog = () => {
    setInviteDialogOpen(true);
    loadAvailableCircles();
  };

  const handleCircleSelection = (circleId: string) => {
    const selectedCircle = availableCircles.find((circle) => circle.id === circleId);
    setInviteForm((prev) => ({
      ...prev,
      selected_circle_id: circleId,
      circle_name: selectedCircle?.circle_name || "",
      circle_code: selectedCircle?.circle_code || "",
    }));
  };

  const validateInviteForm = () => {
    const requiredFields = ["selected_circle_id", "primary_contact_name", "contact_email", "contact_phone", "expiry_date"];
    const errors: string[] = [];

    for (const field of requiredFields) {
      const value = inviteForm[field as keyof typeof inviteForm];
      if (!value || (typeof value === "string" && !value.trim())) {
        const fieldName = field ? field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Unknown Field";
        errors.push(fieldName);
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (inviteForm.contact_email && !emailRegex.test(inviteForm.contact_email)) {
      errors.push("Valid Email");
    }

    return errors;
  };

  const handleInviteSubmit = async () => {
    try {
      setSubmitting(true);

      // Validate form
      const validationErrors = validateInviteForm();
      if (validationErrors.length > 0) {
        setSnackbar({
          open: true,
          message: `Please provide valid: ${validationErrors.join(", ")}`,
          severity: "error",
        });
        return;
      }

      console.log("Sending circle invitation:", inviteForm);

      // Debug: Check authentication context
      console.log("🔍 Debug - Current Tenant:", currentTenant);
      console.log("🔍 Debug - Tenant Type:", currentTenant?.tenant_type);
      console.log("🔍 Debug - Tenant ID:", currentTenant?.id);

      // Send invitation with only the required fields
      const invitationData = {
        selected_circle_id: inviteForm.selected_circle_id,
        primary_contact_name: inviteForm.primary_contact_name,
        contact_email: inviteForm.contact_email,
        contact_phone: inviteForm.contact_phone,
        expiry_date: inviteForm.expiry_date,
      };

      const response = await corporateCircleApi.inviteCircleTenant(invitationData);

      console.log("Invitation response:", response as any);

      // Tenant API returns success response directly
      setSnackbar({
        open: true,
        message: (response as any).message || "Circle invitation sent successfully!",
        severity: "success",
      });

      // Reset form and close dialog
      setInviteForm({
        selected_circle_id: "",
        circle_name: "",
        circle_code: "",
        primary_contact_name: "",
        contact_email: "",
        contact_phone: "",
        expiry_date: "",
      });
      setInviteDialogOpen(false);

      // Reload data to show any updates
      setTimeout(() => {
        loadCircleData();
        loadPendingInvitations();
      }, 1000);
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || error.message || "Failed to send invitation. Please try again.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "success";
      case "Pending_Setup":
      case "Inactive":
        return "warning";
      case "Suspended":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return <CheckCircle color="success" />;
      case "Pending_Setup":
      case "Inactive":
        return <Warning color="warning" />;
      case "Suspended":
        return <Error color="error" />;
      default:
        return <Info />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const testEndpoint = async () => {
    try {
      const response = await corporateCircleApi.testInviteEndpoint();
      console.log("✅ Endpoint test successful:", response);
      setSnackbar({
        open: true,
        message: "Endpoint is working! Check console for details.",
        severity: "success",
      });
    } catch (error: any) {
      console.error("❌ Endpoint test failed:", error);
      setSnackbar({
        open: true,
        message: `Endpoint test failed: ${error.response?.status} ${error.response?.statusText}`,
        severity: "error",
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          backgroundColor: darkMode ? "#121212" : "#FAFBFC",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Loading Circle Data...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Fetching circles for {currentTenant?.organization_name}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flexGrow: 1,
        p: { xs: 2, md: 3 },
        backgroundColor: darkMode ? "#121212" : "#FAFBFC",
        minHeight: "100vh",
        color: darkMode ? "#e8eaed" : "#1a1a1a",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 500,
            color: darkMode ? "#e8eaed" : "#1a1a1a",
            fontSize: { xs: "1.5rem", sm: "1.875rem", md: "2rem" },
            letterSpacing: "-0.01em",
            mb: 1,
          }}
        >
          Circle Management
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: darkMode ? "#9aa0a6" : "#6b7280",
            fontSize: "0.875rem",
            opacity: 0.8,
            mb: 3,
          }}
        >
          Manage and monitor circle operations for {currentTenant?.organization_name}
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="outlined"
            onClick={testEndpoint}
            sx={{
              fontWeight: 500,
              textTransform: "none",
              borderRadius: "8px",
              color: darkMode ? "#8ab4f8" : "#1a73e8",
              borderColor: darkMode ? "#8ab4f8" : "#1a73e8",
            }}
          >
            🔧 Test API
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenInviteDialog}
            sx={{
              fontWeight: 500,
              textTransform: "none",
              borderRadius: "8px",
              backgroundColor: darkMode ? "#8ab4f8" : "#1a73e8",
              color: darkMode ? "#202124" : "#ffffff",
              "&:hover": {
                backgroundColor: darkMode ? "#a8c7fa" : "#1557b0",
              },
            }}
          >
            Invite New Circle
          </Button>
        </Box>
      </Box>

      {/* Corporate Overview Metrics */}
      {corporateMetrics && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Corporate Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatsCard title="Total Circles" value={corporateMetrics.total_circles || 0} subtitle={`${corporateMetrics.active_circles || 0} active`} icon={Circle} color="primary" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatsCard
                title="Monthly Revenue"
                value={formatCurrency(corporateMetrics.total_monthly_revenue || 0)}
                subtitle="Across all circles"
                icon={TrendingUp}
                color="success"
                trend={{ value: 8, isPositive: true, suffix: "% vs last month" }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatsCard title="Total Projects" value={corporateMetrics.total_projects || 0} subtitle="Completed projects" icon={Assignment} color="info" trend={{ value: 12, isPositive: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatsCard
                title="Avg Efficiency"
                value={`${(corporateMetrics.average_efficiency || 0).toFixed(1)}%`}
                subtitle="Circle performance"
                icon={TrendingUp}
                color="warning"
                trend={{ value: 3, isPositive: true, suffix: "% improvement" }}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* No circles message */}
      {circles.length === 0 && !loading && (
        <Alert
          severity="info"
          sx={{ mb: 4 }}
          action={
            <Button color="inherit" size="small" onClick={() => setInviteDialogOpen(true)}>
              Invite Circle
            </Button>
          }
        >
          No circles found for this corporate tenant. Start by inviting your first circle.
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ width: "100%" }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab label={`Circle Overview (${circles.length})`} />
          <Tab label="Performance Analytics" />
          <Tab label="Pending Invitations" />
        </Tabs>

        {/* Circle Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          {circles.length > 0 ? (
            <Grid container spacing={3}>
              {circles.map((circle) => (
                <Grid size={{ xs: 12, md: 6 }} key={circle.id}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
                            <Circle />
                          </Avatar>
                          <Box>
                            <Typography variant="h6">{circle.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {circle.circle_name} ({circle.circle_code})
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Chip icon={getStatusIcon(circle.status)} label={circle.status ? circle.status.replace("_", " ") : "Unknown"} color={getStatusColor(circle.status)} size="small" />
                          <IconButton size="small" onClick={(e) => handleMenuOpen(e, circle)}>
                            <MoreVert />
                          </IconButton>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Contact Information
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <People sx={{ mr: 1, fontSize: 16, color: "text.secondary" }} />
                          <Typography variant="body2">{circle.primary_contact}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <Email sx={{ mr: 1, fontSize: 16, color: "text.secondary" }} />
                          <Typography variant="body2">{circle.email}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Phone sx={{ mr: 1, fontSize: 16, color: "text.secondary" }} />
                          <Typography variant="body2">{circle.phone}</Typography>
                        </Box>
                      </Box>

                      {circle.status === "Active" && (
                        <>
                          <Divider sx={{ my: 2 }} />
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Key Metrics
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Projects
                                </Typography>
                                <Typography variant="h6">{circle.performance?.projects_completed || 0}</Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Sites
                                </Typography>
                                <Typography variant="h6">{circle.performance?.sites_dismantled || 0}</Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Revenue
                                </Typography>
                                <Typography variant="h6">{formatCurrency(circle.metrics?.monthly_revenue || 0)}</Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Efficiency
                                </Typography>
                                <Typography variant="h6">{circle.performance?.efficiency_score || 0}%</Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Circle sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Circles Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Get started by inviting your first circle tenant.
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={() => setInviteDialogOpen(true)}>
                Invite Circle
              </Button>
            </Box>
          )}
        </TabPanel>

        {/* Performance Analytics Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Performance Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Detailed performance analytics and cross-circle comparisons will be available here.
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue Comparison
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly revenue performance across circles
                  </Typography>
                  <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50", mt: 2 }}>
                    <Typography color="text.secondary">Chart will be implemented</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Efficiency Trends
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Circle efficiency scores over time
                  </Typography>
                  <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50", mt: 2 }}>
                    <Typography color="text.secondary">Chart will be implemented</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Pending Invitations Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Pending Circle Invitations
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Track and manage pending circle invitations and onboarding status.
          </Typography>

          {loadingInvitations ? (
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 4 }}>
                  <CircularProgress sx={{ mr: 2 }} />
                  <Typography>Loading pending invitations...</Typography>
                </Box>
              </CardContent>
            </Card>
          ) : pendingInvitations.length > 0 ? (
            <Grid container spacing={3}>
              {pendingInvitations.map((invitation) => (
                <Grid size={{ xs: 12, md: 6 }} key={invitation.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                        <Box>
                          <Typography variant="h6" gutterBottom>
                            {invitation.organization_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Circle Code: {invitation.circle_code || "N/A"}
                          </Typography>
                        </Box>
                        <Chip label={invitation.status} color="warning" size="small" />
                      </Box>

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">
                            Contact Name
                          </Typography>
                          <Typography variant="body1">{invitation.contact_name}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">
                            Email
                          </Typography>
                          <Typography variant="body1">{invitation.email}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">
                            Phone
                          </Typography>
                          <Typography variant="body1">{invitation.contact_phone || "N/A"}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">
                            Expires At
                          </Typography>
                          <Typography variant="body1">{invitation.expires_at ? new Date(invitation.expires_at).toLocaleDateString() : "N/A"}</Typography>
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                          Invited: {invitation.invited_at ? new Date(invitation.invited_at).toLocaleDateString() : "N/A"}
                        </Typography>
                        <Box>
                          <Button size="small" startIcon={<Email />} sx={{ mr: 1 }}>
                            Resend
                          </Button>
                          <Button size="small" color="error">
                            Cancel
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                  No pending invitations at this time.
                </Typography>
              </CardContent>
            </Card>
          )}
        </TabPanel>
      </Paper>

      {/* Circle Actions Menu */}
      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleMenuClose}>
          <Business sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Assessment sx={{ mr: 1 }} />
          Performance Report
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Email sx={{ mr: 1 }} />
          Contact Circle
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          <Settings sx={{ mr: 1 }} />
          Manage Settings
        </MenuItem>
      </Menu>

      {/* Invite New Circle Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => !submitting && setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite New Circle</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Send an invitation to onboard a new circle under your corporate tenant.
          </Typography>

          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Select Circle *</InputLabel>
            <Select value={inviteForm.selected_circle_id} onChange={(e) => handleCircleSelection(e.target.value)} disabled={submitting || loadingCircles} label="Select Circle *">
              {loadingCircles ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading circles...
                </MenuItem>
              ) : availableCircles.length === 0 ? (
                <MenuItem disabled>No circles available</MenuItem>
              ) : (
                availableCircles.map((circle) => (
                  <MenuItem key={circle.id} value={circle.id}>
                    {circle.circle_name} ({circle.circle_code})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label="Primary Contact Name *"
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
            value={inviteForm.primary_contact_name}
            onChange={(e) => handleInviteFormChange("primary_contact_name", e.target.value)}
            disabled={submitting}
            placeholder="e.g., John Doe"
          />

          <TextField
            margin="dense"
            label="Contact Email *"
            type="email"
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
            value={inviteForm.contact_email}
            onChange={(e) => handleInviteFormChange("contact_email", e.target.value)}
            disabled={submitting}
            placeholder="e.g., john.doe@company.com"
          />

          <TextField
            margin="dense"
            label="Contact Phone *"
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
            value={inviteForm.contact_phone}
            onChange={(e) => handleInviteFormChange("contact_phone", e.target.value)}
            disabled={submitting}
            placeholder="e.g., +91 98765 43210"
          />

          <TextField
            margin="dense"
            label="Invitation Expiry Date *"
            type="date"
            fullWidth
            variant="outlined"
            value={inviteForm.expiry_date}
            onChange={(e) => handleInviteFormChange("expiry_date", e.target.value)}
            disabled={submitting}
            InputLabelProps={{
              shrink: true,
            }}
            inputProps={{
              min: new Date().toISOString().split("T")[0], // Minimum date is today
            }}
            helperText="Select when this invitation should expire"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleInviteSubmit} disabled={submitting} startIcon={submitting ? <CircularProgress size={16} /> : <Add />}>
            {submitting ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modern Snackbar */}
      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default CircleManagementPage;

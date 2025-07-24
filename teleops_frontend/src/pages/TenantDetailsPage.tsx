import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ModernSnackbar } from "../components";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Avatar,
  useTheme,
  Divider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack,
  Business,
  Person,
  Email,
  Phone,
  CheckCircle,
  Schedule,
  MonetizationOn,
  Assessment,
  People,
  Engineering,
  LocationOn,
  Assignment,
  SupportAgent,
  Security,
  History,
  TrendingUp,
  Warning,
  AccountTree,
  Dashboard,
} from "@mui/icons-material";
import { InternalAPIService, TenantData } from "../services/internalApi";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const TenantDetailsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { tenantId } = useParams<{ tenantId: string }>();

  const [selectedTab, setSelectedTab] = useState(0);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" | "warning" | "info" });

  // Mock data for comprehensive view
  const [onboardingSteps] = useState([
    { step: "Initial Registration", completed: true, date: "2024-01-15", status: "Completed" },
    { step: "Document Verification", completed: true, date: "2024-01-16", status: "Completed" },
    { step: "Business Verification", completed: true, date: "2024-01-18", status: "Completed" },
    { step: "Payment Setup", completed: true, date: "2024-01-20", status: "Completed" },
    { step: "User Training", completed: false, date: null, status: "Pending" },
    { step: "Go Live", completed: false, date: null, status: "Pending" },
  ]);

  const [connectedEntities] = useState({
    clients: [
      { id: "1", name: "ABC Construction Ltd", type: "Corporate", status: "Active", since: "2024-01-22" },
      { id: "2", name: "XYZ Infrastructure", type: "Corporate", status: "Active", since: "2024-02-01" },
    ],
    vendors: [
      { id: "1", name: "TechServ Solutions", type: "Vendor", status: "Active", services: ["Installation", "Maintenance"] },
      { id: "2", name: "FieldOps Pro", type: "Vendor", status: "Active", services: ["Field Operations", "Support"] },
    ],
  });

  const [projects] = useState([
    { id: "1", name: "Tower Installation Phase 1", status: "In Progress", sites: 12, completion: 75 },
    { id: "2", name: "Network Optimization", status: "Planning", sites: 8, completion: 15 },
    { id: "3", name: "Equipment Upgrade", status: "Completed", sites: 5, completion: 100 },
  ]);

  const [billingHistory] = useState([
    { month: "January 2024", amount: 45000, status: "Paid", dueDate: "2024-01-31", paidDate: "2024-01-28" },
    { month: "February 2024", amount: 52000, status: "Paid", dueDate: "2024-02-29", paidDate: "2024-02-25" },
    { month: "March 2024", amount: 48000, status: "Pending", dueDate: "2024-03-31", paidDate: null },
  ]);

  const [supportTickets] = useState([
    { id: "T001", title: "Login Issues", priority: "High", status: "Open", created: "2024-03-15" },
    { id: "T002", title: "Feature Request", priority: "Medium", status: "In Progress", created: "2024-03-10" },
    { id: "T003", title: "Data Export", priority: "Low", status: "Resolved", created: "2024-03-05" },
  ]);

  const [complianceItems] = useState([
    { item: "Business License", status: "Verified", expiry: "2025-01-15", risk: "Low" },
    { item: "Tax Registration", status: "Verified", expiry: "2024-12-31", risk: "Medium" },
    { item: "Insurance Certificate", status: "Pending", expiry: "2024-08-30", risk: "High" },
  ]);

  useEffect(() => {
    if (tenantId) {
      loadTenantDetails();
    }
  }, [tenantId]);

  const loadTenantDetails = async () => {
    try {
      setLoading(true);
      const response = await InternalAPIService.getTenantDetail(tenantId!);

      if (response.success && response.data) {
        const enrichedTenantData = {
          ...response.data,
          subscription_plan: response.data.subscription_plan || "Standard",
          users: response.data.user_count || 0,
          support_tickets: 0,
          monthly_revenue: 0,
          overage_charges: 0,
          payment_status: "paid" as "paid" | "pending" | "overdue" | "failed",
          is_trial: false,
          usage_metrics: {
            projects: response.data.usage_statistics?.projects_count || 0,
            sites: response.data.usage_statistics?.sites_count || 0,
            equipment: response.data.usage_statistics?.equipment_count || 0,
            storage_gb: 0,
            api_calls: 0,
          },
        };
        setTenant(enrichedTenantData);
      } else {
        throw new Error(response.message || "Failed to load tenant details");
      }
    } catch (error: any) {
      console.error("Error loading tenant details:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to load tenant details",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "completed":
      case "paid":
      case "verified":
        return theme.palette.success.main;
      case "pending":
      case "in progress":
        return theme.palette.warning.main;
      case "suspended":
      case "overdue":
      case "high":
        return theme.palette.error.main;
      case "inactive":
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading tenant details...
        </Typography>
      </Box>
    );
  }

  if (!tenant) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6">Tenant not found</Typography>
        <Button variant="contained" onClick={() => navigate("/internal/tenants")} sx={{ mt: 2 }}>
          Back to Tenants
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
        <IconButton onClick={() => navigate("/internal/tenants")} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={700}>
            {tenant.organization_name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {tenant.tenant_type} • ID: {tenant.id.slice(-8)}
          </Typography>
        </Box>
        <Chip
          label={tenant.activation_status}
          sx={{
            bgcolor: getStatusColor(tenant.activation_status),
            color: "white",
            fontWeight: 600,
          }}
        />
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Users
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {tenant.users}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <People />
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
                    Projects
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {tenant.usage_metrics?.projects || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <Assignment />
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
                    Sites
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {tenant.usage_metrics?.sites || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                  <LocationOn />
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
                    Equipment
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {tenant.usage_metrics?.equipment || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                  <Engineering />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabbed Content */}
      <Paper elevation={3}>
        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ px: 3, pt: 2 }}>
          <Tab label="Overview" />
          <Tab label="Onboarding Trail" />
          <Tab label="Connected Entities" />
          <Tab label="Projects & Operations" />
          <Tab label="Billing & Finance" />
          <Tab label="Support & Compliance" />
        </Tabs>

        <TabPanel value={selectedTab} index={0}>
          {/* Overview Tab */}
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Contact Information */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Contact Information
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <Person />
                        </ListItemIcon>
                        <ListItemText primary={tenant.primary_contact_name} secondary="Primary Contact" />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Email />
                        </ListItemIcon>
                        <ListItemText primary={tenant.primary_contact_email} secondary="Email Address" />
                      </ListItem>
                      {tenant.primary_contact_phone && (
                        <ListItem>
                          <ListItemIcon>
                            <Phone />
                          </ListItemIcon>
                          <ListItemText primary={tenant.primary_contact_phone} secondary="Phone Number" />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Business Information */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Business Information
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText primary="Subscription Plan" secondary={tenant.subscription_plan} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Registration Status" secondary={tenant.registration_status} />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="Created Date" secondary={formatDate(tenant.created_at)} />
                      </ListItem>
                      {tenant.activated_at && (
                        <ListItem>
                          <ListItemText primary="Activated Date" secondary={formatDate(tenant.activated_at)} />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {/* Onboarding Trail Tab */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Onboarding Progress
            </Typography>
            <List>
              {onboardingSteps.map((step, index) => (
                <ListItem
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    borderLeft: index < onboardingSteps.length - 1 ? `2px solid ${theme.palette.grey[300]}` : "none",
                    marginLeft: 2,
                    paddingLeft: 3,
                    position: "relative",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: -9,
                      top: 12,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      bgcolor: step.completed ? theme.palette.success.main : theme.palette.grey[400],
                      border: `2px solid ${theme.palette.background.paper}`,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {step.completed ? <CheckCircle sx={{ color: theme.palette.success.main }} /> : <Schedule sx={{ color: theme.palette.grey[400] }} />}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="h6" sx={{ mb: 0.5 }}>
                        {step.step}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        Status: {step.status}
                        {step.date && ` • Completed: ${formatDate(step.date)}`}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {/* Connected Entities Tab */}
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Clients */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Connected Clients
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Since</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {connectedEntities.clients.map((client) => (
                            <TableRow key={client.id}>
                              <TableCell>{client.name}</TableCell>
                              <TableCell>{client.type}</TableCell>
                              <TableCell>
                                <Chip label={client.status} size="small" sx={{ bgcolor: getStatusColor(client.status), color: "white" }} />
                              </TableCell>
                              <TableCell>{formatDate(client.since)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Vendors */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Partner Vendors
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Services</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {connectedEntities.vendors.map((vendor) => (
                            <TableRow key={vendor.id}>
                              <TableCell>{vendor.name}</TableCell>
                              <TableCell>
                                {vendor.services.map((service, idx) => (
                                  <Chip key={idx} label={service} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                                ))}
                              </TableCell>
                              <TableCell>
                                <Chip label={vendor.status} size="small" sx={{ bgcolor: getStatusColor(vendor.status), color: "white" }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          {/* Projects & Operations Tab */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Active Projects
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Project Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Sites</TableCell>
                    <TableCell align="center">Completion</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>{project.name}</TableCell>
                      <TableCell>
                        <Chip label={project.status} size="small" sx={{ bgcolor: getStatusColor(project.status), color: "white" }} />
                      </TableCell>
                      <TableCell align="center">{project.sites}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LinearProgress variant="determinate" value={project.completion} sx={{ flexGrow: 1, height: 8, borderRadius: 4 }} />
                          <Typography variant="body2">{project.completion}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Button size="small" variant="outlined">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={4}>
          {/* Billing & Finance Tab */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Billing History
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Paid Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billingHistory.map((bill, index) => (
                    <TableRow key={index}>
                      <TableCell>{bill.month}</TableCell>
                      <TableCell align="right">{formatCurrency(bill.amount)}</TableCell>
                      <TableCell>
                        <Chip label={bill.status} size="small" sx={{ bgcolor: getStatusColor(bill.status), color: "white" }} />
                      </TableCell>
                      <TableCell>{formatDate(bill.dueDate)}</TableCell>
                      <TableCell>{bill.paidDate ? formatDate(bill.paidDate) : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={5}>
          {/* Support & Compliance Tab */}
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Support Tickets */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Support Tickets
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Ticket ID</TableCell>
                            <TableCell>Title</TableCell>
                            <TableCell>Priority</TableCell>
                            <TableCell>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {supportTickets.map((ticket) => (
                            <TableRow key={ticket.id}>
                              <TableCell>{ticket.id}</TableCell>
                              <TableCell>{ticket.title}</TableCell>
                              <TableCell>
                                <Chip label={ticket.priority} size="small" sx={{ bgcolor: getStatusColor(ticket.priority), color: "white" }} />
                              </TableCell>
                              <TableCell>
                                <Chip label={ticket.status} size="small" sx={{ bgcolor: getStatusColor(ticket.status), color: "white" }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Compliance */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card elevation={1}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Compliance Status
                    </Typography>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Item</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Expiry</TableCell>
                            <TableCell>Risk</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {complianceItems.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.item}</TableCell>
                              <TableCell>
                                <Chip label={item.status} size="small" sx={{ bgcolor: getStatusColor(item.status), color: "white" }} />
                              </TableCell>
                              <TableCell>{formatDate(item.expiry)}</TableCell>
                              <TableCell>
                                <Chip label={item.risk} size="small" sx={{ bgcolor: getStatusColor(item.risk), color: "white" }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* Modern Snackbar */}
      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default TenantDetailsPage;

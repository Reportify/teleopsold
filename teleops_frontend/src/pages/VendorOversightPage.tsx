// Vendor Oversight Page for Corporate Tenants
import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
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
  LinearProgress,
  Divider,
} from "@mui/material";
import { SupervisorAccount, MoreVert, TrendingUp, TrendingDown, Star, Warning, CheckCircle, Business, Assessment, Email, Phone, Add, FilterList } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { FeatureGate, useFeaturePermissions } from "../hooks/useFeaturePermissions";
import { StatsCard, ModernSnackbar } from "../components";
import { useDarkMode } from "../contexts/ThemeContext";

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

const VendorOversightPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const { darkMode } = useDarkMode();
  const [tabValue, setTabValue] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [newVendorDialogOpen, setNewVendorDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  const currentTenant = getCurrentTenant();

  // Mock vendor data across circles
  const mockVendors = [
    {
      id: "1",
      name: "TechTower Infrastructure Pvt Ltd",
      vendor_code: "TT001",
      vendor_type: "Primary",
      circles: ["MPCG", "UPE"],
      services: ["Dismantling", "Installation", "Survey"],
      performance_rating: 4.8,
      total_projects: 78,
      active_projects: 12,
      compliance_score: 96,
      monthly_revenue: 2850000,
      contact_person: "Suresh Mehta",
      contact_email: "suresh@techtower.com",
      contact_phone: "+91 98765 43220",
      status: "Active",
      contract_expiry: "2025-12-31",
      risk_level: "Low",
    },
    {
      id: "2",
      name: "Gujarat Infra Solutions",
      vendor_code: "GIS002",
      vendor_type: "Preferred",
      circles: ["GJ"],
      services: ["Dismantling", "Transportation"],
      performance_rating: 4.5,
      total_projects: 34,
      active_projects: 6,
      compliance_score: 88,
      monthly_revenue: 1620000,
      contact_person: "Rajesh Patel",
      contact_email: "rajesh@gujaratinfra.com",
      contact_phone: "+91 98765 43221",
      status: "Active",
      contract_expiry: "2025-06-30",
      risk_level: "Medium",
    },
    {
      id: "3",
      name: "Central Equipment Services",
      vendor_code: "CES003",
      vendor_type: "Subcontractor",
      circles: ["MPCG"],
      services: ["Equipment Recovery", "Logistics"],
      performance_rating: 4.2,
      total_projects: 19,
      active_projects: 3,
      compliance_score: 82,
      monthly_revenue: 980000,
      contact_person: "Amit Singh",
      contact_email: "amit@centralequip.com",
      contact_phone: "+91 98765 43222",
      status: "Under Review",
      contract_expiry: "2024-12-31",
      risk_level: "High",
    },
  ];

  // Corporate vendor metrics
  const vendorMetrics = {
    total_vendors: mockVendors.length,
    active_vendors: mockVendors.filter((v) => v.status === "Active").length,
    total_monthly_spend: mockVendors.reduce((sum, v) => sum + v.monthly_revenue, 0),
    average_performance: mockVendors.reduce((sum, v) => sum + v.performance_rating, 0) / mockVendors.length,
    total_active_projects: mockVendors.reduce((sum, v) => sum + v.active_projects, 0),
    high_risk_vendors: mockVendors.filter((v) => v.risk_level === "High").length,
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, vendor: any) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedVendor(vendor);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedVendor(null);
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return "success";
    if (rating >= 4.0) return "warning";
    return "error";
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low":
        return "success";
      case "Medium":
        return "warning";
      case "High":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "success";
      case "Under Review":
        return "warning";
      case "Suspended":
        return "error";
      default:
        return "default";
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

  return (
    <FeatureGate
      featureId="vendor_oversight"
      fallback={
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            You don't have permission to view vendor oversight
          </Typography>
        </Box>
      }
    >
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
            Vendor Oversight
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
            Strategic vendor relationship management across {currentTenant?.organization_name} circles
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              sx={{
                fontWeight: 500,
                textTransform: "none",
                borderRadius: "8px",
                borderColor: darkMode ? "#5f6368" : "#d1d5db",
                color: darkMode ? "#e8eaed" : "#374151",
                "&:hover": {
                  borderColor: darkMode ? "#8ab4f8" : "#1a73e8",
                  backgroundColor: darkMode ? "rgba(138, 180, 248, 0.1)" : "rgba(26, 115, 232, 0.04)",
                },
              }}
            >
              Filter & Sort
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setNewVendorDialogOpen(true)}
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
              Add Vendor
            </Button>
          </Box>
        </Box>

        {/* Vendor Overview Metrics */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Vendor Portfolio Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <StatsCard title="Total Vendors" value={vendorMetrics.total_vendors} subtitle={`${vendorMetrics.active_vendors} active`} icon={SupervisorAccount} color="primary" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <StatsCard
                title="Monthly Spend"
                value={formatCurrency(vendorMetrics.total_monthly_spend)}
                subtitle="Across all vendors"
                icon={TrendingUp}
                color="success"
                trend={{ value: 5, isPositive: true, suffix: "% vs last month" }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <StatsCard title="Avg Performance" value={vendorMetrics.average_performance.toFixed(1)} subtitle="Rating out of 5" icon={Star} color="warning" trend={{ value: 0.2, isPositive: true }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <StatsCard title="Active Projects" value={vendorMetrics.total_active_projects} subtitle="Currently ongoing" icon={Assessment} color="info" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <StatsCard title="Risk Alerts" value={vendorMetrics.high_risk_vendors} subtitle="High risk vendors" icon={Warning} color="error" />
            </Grid>
          </Grid>
        </Box>

        {/* Tabs */}
        <Paper sx={{ width: "100%" }}>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tab label="Vendor Directory" />
            <Tab label="Performance Dashboard" />
            <Tab label="Contract Management" />
            <Tab label="Risk Assessment" />
          </Tabs>

          {/* Vendor Directory Tab */}
          <TabPanel value={tabValue} index={0}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Circles</TableCell>
                    <TableCell>Performance</TableCell>
                    <TableCell>Active Projects</TableCell>
                    <TableCell>Monthly Spend</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockVendors.map((vendor) => (
                    <TableRow key={vendor.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Avatar sx={{ bgcolor: "primary.main", mr: 2, width: 40, height: 40 }}>
                            <SupervisorAccount />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{vendor.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {vendor.vendor_code}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={vendor.vendor_type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          {vendor.circles.map((circle) => (
                            <Chip key={circle} label={circle} size="small" color="primary" variant="filled" />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Chip icon={<Star />} label={vendor.performance_rating.toFixed(1)} size="small" color={getPerformanceColor(vendor.performance_rating)} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{vendor.active_projects}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatCurrency(vendor.monthly_revenue)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={vendor.status} size="small" color={getStatusColor(vendor.status)} />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, vendor)}>
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Performance Dashboard Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Vendor Performance Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Comprehensive performance analytics and vendor comparison metrics.
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Performance Trends
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vendor performance ratings over time
                    </Typography>
                    <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50", mt: 2 }}>
                      <Typography color="text.secondary">Performance Chart Placeholder</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Cost Analysis
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vendor cost breakdown and efficiency metrics
                    </Typography>
                    <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50", mt: 2 }}>
                      <Typography color="text.secondary">Cost Analysis Chart Placeholder</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Contract Management Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Contract Management
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Monitor vendor contracts, renewals, and compliance across all circles.
            </Typography>

            <Grid container spacing={3}>
              {mockVendors.map((vendor) => (
                <Grid size={{ xs: 12, md: 6 }} key={vendor.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                        <Typography variant="h6">{vendor.name}</Typography>
                        <Chip label={vendor.status} size="small" color={getStatusColor(vendor.status)} />
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Contract Details
                      </Typography>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Contract Expiry
                        </Typography>
                        <Typography variant="body2">{vendor.contract_expiry}</Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Compliance Score
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                          <LinearProgress variant="determinate" value={vendor.compliance_score} sx={{ flexGrow: 1, mr: 1 }} />
                          <Typography variant="caption">{vendor.compliance_score}%</Typography>
                        </Box>
                      </Box>

                      <Button variant="outlined" size="small" fullWidth>
                        View Contract Details
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Risk Assessment Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Vendor Risk Assessment
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Monitor and assess vendor risks across operational, financial, and compliance dimensions.
            </Typography>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Risk Level</TableCell>
                    <TableCell>Performance Risk</TableCell>
                    <TableCell>Financial Risk</TableCell>
                    <TableCell>Compliance Risk</TableCell>
                    <TableCell>Contract Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell>{vendor.name}</TableCell>
                      <TableCell>
                        <Chip label={vendor.risk_level} size="small" color={getRiskColor(vendor.risk_level)} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={vendor.performance_rating >= 4.5 ? "Low" : vendor.performance_rating >= 4.0 ? "Medium" : "High"}
                          size="small"
                          color={getPerformanceColor(vendor.performance_rating)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label="Low" size="small" color="success" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={vendor.compliance_score >= 90 ? "Low" : vendor.compliance_score >= 80 ? "Medium" : "High"}
                          size="small"
                          color={vendor.compliance_score >= 90 ? "success" : vendor.compliance_score >= 80 ? "warning" : "error"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{vendor.contract_expiry}</Typography>
                      </TableCell>
                      <TableCell>
                        <Button variant="outlined" size="small">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Paper>

        {/* Vendor Actions Menu */}
        <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleMenuClose}>View Vendor Profile</MenuItem>
          <MenuItem onClick={handleMenuClose}>Performance Report</MenuItem>
          <MenuItem onClick={handleMenuClose}>Contract Details</MenuItem>
          <MenuItem onClick={handleMenuClose}>Risk Assessment</MenuItem>
          <Divider />
          <MenuItem onClick={handleMenuClose}>Contact Vendor</MenuItem>
          <MenuItem onClick={handleMenuClose}>Manage Settings</MenuItem>
        </Menu>

        {/* Add New Vendor Dialog */}
        <Dialog open={newVendorDialogOpen} onClose={() => setNewVendorDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Add Strategic Vendor Relationship</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              Establish a new strategic vendor relationship across your corporate circles.
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField autoFocus margin="dense" label="Vendor Name" fullWidth variant="outlined" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField margin="dense" label="Vendor Code" fullWidth variant="outlined" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Vendor Type</InputLabel>
                  <Select label="Vendor Type">
                    <MenuItem value="Primary">Primary Vendor</MenuItem>
                    <MenuItem value="Preferred">Preferred Vendor</MenuItem>
                    <MenuItem value="Subcontractor">Subcontractor</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth margin="dense">
                  <InputLabel>Service Circles</InputLabel>
                  <Select multiple label="Service Circles">
                    <MenuItem value="MPCG">MPCG</MenuItem>
                    <MenuItem value="UPE">UPE</MenuItem>
                    <MenuItem value="GJ">Gujarat</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField margin="dense" label="Primary Contact Name" fullWidth variant="outlined" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField margin="dense" label="Contact Email" type="email" fullWidth variant="outlined" />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField margin="dense" label="Contact Phone" fullWidth variant="outlined" />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewVendorDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={() => setNewVendorDialogOpen(false)}>
              Add Vendor
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modern Snackbar */}
        <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
      </Box>
    </FeatureGate>
  );
};

export default VendorOversightPage;

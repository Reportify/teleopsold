import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  useTheme,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  LinearProgress,
  Tooltip,
  Badge,
  Collapse,
} from "@mui/material";
import {
  Add,
  Search,
  FilterList,
  Business,
  AccountTree,
  MonetizationOn,
  TrendingUp,
  TrendingDown,
  Assessment,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Warning,
  Error,
  Info,
  Star,
  Link,
  LinkOff,
  Security,
  Analytics,
  ExpandMore,
  ChevronRight,
  Group,
  Domain,
} from "@mui/icons-material";

interface VendorRelationship {
  id: number;
  primary_vendor_id: string;
  primary_vendor_name: string;
  secondary_vendor_id: string;
  secondary_vendor_name: string;
  relationship_type: "subcontractor" | "partner" | "supplier" | "cross_corporate";
  relationship_level: number; // 1 = direct, 2 = sub-sub, etc.
  revenue_sharing_percentage: number;
  platform_fee_monthly: number;
  status: "active" | "pending" | "suspended" | "terminated";
  verification_status: "verified" | "pending" | "rejected";
  created_at: string;
  monthly_revenue: number;
  total_transactions: number;
  parent_relationship_id?: number;
}

interface VendorHierarchy {
  vendor_id: string;
  vendor_name: string;
  level: number;
  children: VendorHierarchy[];
  relationships: VendorRelationship[];
  total_revenue: number;
  total_fee_revenue: number;
}

interface CrossTenantNetwork {
  id: number;
  primary_tenant: string;
  secondary_tenant: string;
  vendor_count: number;
  monthly_revenue: number;
  platform_fees: number;
  status: "active" | "pending_approval" | "approved" | "rejected";
  risk_level: "low" | "medium" | "high";
}

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

const InternalVendorManagementPage: React.FC = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [relationships, setRelationships] = useState<VendorRelationship[]>([]);
  const [vendorHierarchies, setVendorHierarchies] = useState<VendorHierarchy[]>([]);
  const [crossTenantNetworks, setCrossTenantNetworks] = useState<CrossTenantNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [openRelationshipDialog, setOpenRelationshipDialog] = useState(false);
  const [openApprovalDialog, setOpenApprovalDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

  const [relationshipForm, setRelationshipForm] = useState({
    primary_vendor_name: "",
    secondary_vendor_name: "",
    relationship_type: "subcontractor" as "subcontractor" | "partner" | "supplier" | "cross_corporate",
    revenue_sharing_percentage: 10,
    platform_fee_monthly: 500,
    parent_relationship_id: undefined as number | undefined,
  });

  // Mock data - would be replaced with API calls
  const mockRelationships: VendorRelationship[] = [
    {
      id: 1,
      primary_vendor_id: "vendor-1",
      primary_vendor_name: "Ericsson India",
      secondary_vendor_id: "vendor-2",
      secondary_vendor_name: "TechSol Partners",
      relationship_type: "subcontractor",
      relationship_level: 1,
      revenue_sharing_percentage: 15,
      platform_fee_monthly: 2500,
      status: "active",
      verification_status: "verified",
      created_at: "2024-01-01",
      monthly_revenue: 125000,
      total_transactions: 45,
    },
    {
      id: 2,
      primary_vendor_id: "vendor-2",
      primary_vendor_name: "TechSol Partners",
      secondary_vendor_id: "vendor-3",
      secondary_vendor_name: "LocalTech Services",
      relationship_type: "subcontractor",
      relationship_level: 2,
      revenue_sharing_percentage: 8,
      platform_fee_monthly: 800,
      status: "active",
      verification_status: "verified",
      created_at: "2024-01-15",
      monthly_revenue: 45000,
      total_transactions: 28,
      parent_relationship_id: 1,
    },
    {
      id: 3,
      primary_vendor_id: "vendor-4",
      primary_vendor_name: "Vodafone Enterprise",
      secondary_vendor_id: "vendor-1",
      secondary_vendor_name: "Ericsson India",
      relationship_type: "cross_corporate",
      relationship_level: 1,
      revenue_sharing_percentage: 12,
      platform_fee_monthly: 5000,
      status: "pending",
      verification_status: "pending",
      created_at: "2024-01-20",
      monthly_revenue: 0,
      total_transactions: 0,
    },
  ];

  const mockCrossTenantNetworks: CrossTenantNetwork[] = [
    {
      id: 1,
      primary_tenant: "Ericsson India",
      secondary_tenant: "Vodafone Enterprise",
      vendor_count: 15,
      monthly_revenue: 850000,
      platform_fees: 42500,
      status: "active",
      risk_level: "low",
    },
    {
      id: 2,
      primary_tenant: "TechFlow Solutions",
      secondary_tenant: "DataSync Corporation",
      vendor_count: 8,
      monthly_revenue: 320000,
      platform_fees: 16000,
      status: "pending_approval",
      risk_level: "medium",
    },
  ];

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setRelationships(mockRelationships);
      setCrossTenantNetworks(mockCrossTenantNetworks);
      // Build vendor hierarchies from relationships
      buildVendorHierarchies(mockRelationships);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const buildVendorHierarchies = (relationships: VendorRelationship[]) => {
    // Group relationships by primary vendor
    const hierarchyMap = new Map<string, VendorHierarchy>();

    // Initialize primary vendors
    relationships.forEach((rel) => {
      if (!hierarchyMap.has(rel.primary_vendor_id)) {
        hierarchyMap.set(rel.primary_vendor_id, {
          vendor_id: rel.primary_vendor_id,
          vendor_name: rel.primary_vendor_name,
          level: 0,
          children: [],
          relationships: [],
          total_revenue: 0,
          total_fee_revenue: 0,
        });
      }
    });

    // Build hierarchies
    const hierarchies = Array.from(hierarchyMap.values());
    setVendorHierarchies(hierarchies);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, item: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleCreateRelationship = async () => {
    try {
      const newRelationship: VendorRelationship = {
        id: Date.now(),
        primary_vendor_id: `vendor-${Date.now()}`,
        primary_vendor_name: relationshipForm.primary_vendor_name,
        secondary_vendor_id: `vendor-${Date.now() + 1}`,
        secondary_vendor_name: relationshipForm.secondary_vendor_name,
        relationship_type: relationshipForm.relationship_type,
        relationship_level: relationshipForm.parent_relationship_id ? 2 : 1,
        revenue_sharing_percentage: relationshipForm.revenue_sharing_percentage,
        platform_fee_monthly: relationshipForm.platform_fee_monthly,
        status: "pending",
        verification_status: "pending",
        created_at: new Date().toISOString(),
        monthly_revenue: 0,
        total_transactions: 0,
        parent_relationship_id: relationshipForm.parent_relationship_id,
      };

      setRelationships((prev) => [newRelationship, ...prev]);
      setOpenRelationshipDialog(false);
      setRelationshipForm({
        primary_vendor_name: "",
        secondary_vendor_name: "",
        relationship_type: "subcontractor",
        revenue_sharing_percentage: 10,
        platform_fee_monthly: 500,
        parent_relationship_id: undefined,
      });
      setSnackbar({
        open: true,
        message: "Vendor relationship created successfully",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to create relationship",
        severity: "error",
      });
    }
  };

  const handleApproveRelationship = async (relationship: VendorRelationship) => {
    try {
      setRelationships((prev) => prev.map((rel) => (rel.id === relationship.id ? { ...rel, status: "active", verification_status: "verified" } : rel)));
      setSnackbar({
        open: true,
        message: "Relationship approved successfully",
        severity: "success",
      });
      handleMenuClose();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to approve relationship",
        severity: "error",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "verified":
        return theme.palette.success.main;
      case "pending":
      case "pending_approval":
        return theme.palette.warning.main;
      case "suspended":
      case "rejected":
        return theme.palette.error.main;
      case "terminated":
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "low":
        return theme.palette.success.main;
      case "medium":
        return theme.palette.warning.main;
      case "high":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const vendorMetrics = {
    totalRelationships: relationships.length,
    activeRelationships: relationships.filter((r) => r.status === "active").length,
    pendingApprovals: relationships.filter((r) => r.verification_status === "pending").length,
    totalRevenue: relationships.reduce((sum, r) => sum + r.monthly_revenue, 0),
    totalPlatformFees: relationships.reduce((sum, r) => sum + r.platform_fee_monthly, 0),
    crossTenantNetworks: crossTenantNetworks.length,
    averageRevenueShare: relationships.length > 0 ? relationships.reduce((sum, r) => sum + r.revenue_sharing_percentage, 0) / relationships.length : 0,
    multiLevelRelationships: relationships.filter((r) => r.relationship_level > 1).length,
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Vendor Relationship Management
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          Enhanced Vendor Relationship Management
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" startIcon={<Analytics />}>
            Generate Report
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenRelationshipDialog(true)}>
            Create Relationship
          </Button>
        </Box>
      </Box>

      {/* Vendor Network Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Relationships
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {vendorMetrics.totalRelationships}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <AccountTree />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Network Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {formatCurrency(vendorMetrics.totalRevenue)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <MonetizationOn />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Platform Fees
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="secondary.main">
                    {formatCurrency(vendorMetrics.totalPlatformFees)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                  <Assessment />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Cross-Tenant Networks
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="info.main">
                    {vendorMetrics.crossTenantNetworks}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                  <Domain />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending Approvals
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="warning.main">
                    {vendorMetrics.pendingApprovals}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                  <Security />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabbed Content */}
      <Paper elevation={3}>
        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ px: 3, pt: 2 }}>
          <Tab
            label={
              <Badge badgeContent={vendorMetrics.pendingApprovals} color="warning">
                Relationship Network
              </Badge>
            }
          />
          <Tab label="Hierarchy View" />
          <Tab label="Cross-Tenant Networks" />
          <Tab label="Revenue Analytics" />
        </Tabs>

        <TabPanel value={selectedTab} index={0}>
          {/* Relationship Network */}
          <Box sx={{ p: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Relationship Details</TableCell>
                    <TableCell>Type & Level</TableCell>
                    <TableCell align="right">Revenue Share</TableCell>
                    <TableCell align="right">Platform Fee</TableCell>
                    <TableCell align="right">Monthly Revenue</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Verification</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {relationships.map((relationship) => (
                    <TableRow key={relationship.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {relationship.primary_vendor_name}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              →
                            </Typography>
                            <Typography variant="body2" color="primary.main">
                              {relationship.secondary_vendor_name}
                            </Typography>
                          </Box>
                          {relationship.parent_relationship_id && (
                            <Typography variant="caption" color="warning.main">
                              Sub-level relationship
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Chip label={relationship.relationship_type} size="small" color="primary" variant="outlined" />
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            Level {relationship.relationship_level}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={600}>
                          {relationship.revenue_sharing_percentage}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(relationship.platform_fee_monthly)}/mo
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={600} color="success.main">
                          {formatCurrency(relationship.monthly_revenue)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={relationship.status}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(relationship.status),
                            color: "white",
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={relationship.verification_status}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: getStatusColor(relationship.verification_status),
                            color: getStatusColor(relationship.verification_status),
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={(e) => handleMenuClick(e, relationship)} size="small">
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {/* Hierarchy View */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Vendor Relationship Hierarchies
            </Typography>
            <Paper elevation={1} sx={{ p: 3 }}>
              {vendorHierarchies.map((hierarchy) => (
                <Box key={hierarchy.vendor_id} sx={{ mb: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                      <Business />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{hierarchy.vendor_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Primary Vendor • Level {hierarchy.level}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Show direct relationships */}
                  {relationships
                    .filter((r) => r.primary_vendor_name === hierarchy.vendor_name)
                    .map((rel) => (
                      <Box key={rel.id} sx={{ ml: 4, mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
                        <Box sx={{ width: 2, height: 20, bgcolor: theme.palette.divider }} />
                        <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.secondary.main }}>
                          <Group fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {rel.secondary_vendor_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {rel.relationship_type} • {rel.revenue_sharing_percentage}% revenue share
                          </Typography>
                        </Box>
                        <Chip label={rel.status} size="small" sx={{ bgcolor: getStatusColor(rel.status), color: "white" }} />
                      </Box>
                    ))}
                </Box>
              ))}

              {vendorHierarchies.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                  No vendor hierarchies found. Create relationships to build vendor networks.
                </Typography>
              )}
            </Paper>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {/* Cross-Tenant Networks */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Cross-Tenant Vendor Networks
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Network Details</TableCell>
                    <TableCell align="center">Vendors</TableCell>
                    <TableCell align="right">Monthly Revenue</TableCell>
                    <TableCell align="right">Platform Fees</TableCell>
                    <TableCell align="center">Risk Level</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {crossTenantNetworks.map((network) => (
                    <TableRow key={network.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {network.primary_tenant}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                            <Link fontSize="small" color="primary" />
                            <Typography variant="body2" color="primary.main">
                              {network.secondary_tenant}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" color="primary.main">
                          {network.vendor_count}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={600} color="success.main">
                          {formatCurrency(network.monthly_revenue)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={600} color="secondary.main">
                          {formatCurrency(network.platform_fees)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={network.risk_level}
                          size="small"
                          sx={{
                            bgcolor: getRiskLevelColor(network.risk_level),
                            color: "white",
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={network.status ? network.status.replace("_", " ") : "Unknown"}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: getStatusColor(network.status),
                            color: getStatusColor(network.status),
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={(e) => handleMenuClick(e, network)} size="small">
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          {/* Revenue Analytics */}
          <Grid container spacing={3} sx={{ p: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="Revenue Multiplication Analysis" />
                <CardContent>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Base Revenue (Direct)
                    </Typography>
                    <Typography variant="h6">{formatCurrency(185000)}</Typography>
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Network Multiplier Revenue
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(555000)}
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      3x multiplication achieved
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Platform Fee Revenue
                    </Typography>
                    <Typography variant="h6" color="secondary.main">
                      {formatCurrency(8300)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Revenue Share Commission (5%)
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {formatCurrency(27750)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="Network Performance Metrics" />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2">Multi-level Relationships</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {vendorMetrics.multiLevelRelationships}/{vendorMetrics.totalRelationships}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={(vendorMetrics.multiLevelRelationships / vendorMetrics.totalRelationships) * 100} sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2">Average Revenue Share</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {vendorMetrics.averageRevenueShare.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={vendorMetrics.averageRevenueShare} color="secondary" sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2">Active Relationships</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {vendorMetrics.activeRelationships}/{vendorMetrics.totalRelationships}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={(vendorMetrics.activeRelationships / vendorMetrics.totalRelationships) * 100} color="success" sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Network Expansion Rate
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                      <TrendingUp color="success" fontSize="small" />
                      <Typography variant="h6" color="success.main">
                        +23.5%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        this month
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleMenuClose}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => selectedItem && selectedItem.verification_status === "pending" && handleApproveRelationship(selectedItem)}>
          <CheckCircle fontSize="small" sx={{ mr: 1 }} />
          Approve
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit Relationship
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Security fontSize="small" sx={{ mr: 1 }} />
          Verify Network
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose} sx={{ color: "error.main" }}>
          <LinkOff fontSize="small" sx={{ mr: 1 }} />
          Terminate Relationship
        </MenuItem>
      </Menu>

      {/* Create Relationship Dialog */}
      <Dialog open={openRelationshipDialog} onClose={() => setOpenRelationshipDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Vendor Relationship</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Primary Vendor"
                value={relationshipForm.primary_vendor_name}
                onChange={(e) => setRelationshipForm({ ...relationshipForm, primary_vendor_name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Secondary Vendor"
                value={relationshipForm.secondary_vendor_name}
                onChange={(e) => setRelationshipForm({ ...relationshipForm, secondary_vendor_name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Relationship Type</InputLabel>
                <Select value={relationshipForm.relationship_type} onChange={(e) => setRelationshipForm({ ...relationshipForm, relationship_type: e.target.value as any })} label="Relationship Type">
                  <MenuItem value="subcontractor">Subcontractor</MenuItem>
                  <MenuItem value="partner">Partner</MenuItem>
                  <MenuItem value="supplier">Supplier</MenuItem>
                  <MenuItem value="cross_corporate">Cross Corporate</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Revenue Sharing (%)"
                type="number"
                value={relationshipForm.revenue_sharing_percentage}
                onChange={(e) => setRelationshipForm({ ...relationshipForm, revenue_sharing_percentage: Number(e.target.value) })}
                inputProps={{ min: 0, max: 50 }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Monthly Platform Fee (₹)"
                type="number"
                value={relationshipForm.platform_fee_monthly}
                onChange={(e) => setRelationshipForm({ ...relationshipForm, platform_fee_monthly: Number(e.target.value) })}
                inputProps={{ min: 500, max: 50000 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenRelationshipDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateRelationship}>
            Create Relationship
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InternalVendorManagementPage;

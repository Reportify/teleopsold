// Governance Page for Corporate Tenants
import React, { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  LinearProgress,
  Alert,
  IconButton,
} from "@mui/material";
import { AccountBalance, Security, Assignment, Policy, Gavel, CheckCircle, Warning, Error, Add, Edit, Visibility, TrendingUp, Assessment, Group, Description, Info } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { StatsCard } from "../components";

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

const GovernancePage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [newPolicyDialogOpen, setNewPolicyDialogOpen] = useState(false);
  // const [selectedPolicy, setSelectedPolicy] = useState<any>(null);

  const currentTenant = getCurrentTenant();

  // Mock governance data
  const mockPolicies = [
    {
      id: "1",
      title: "Site Safety and Security Standards",
      category: "Safety",
      status: "Active",
      version: "2.1",
      effective_date: "2024-01-01",
      review_date: "2024-12-31",
      circles_applied: ["MPCG", "UPE", "GJ"],
      compliance_rate: 94,
      violations: 3,
      description: "Comprehensive safety protocols for all dismantling operations",
    },
    {
      id: "2",
      title: "Vendor Code of Conduct",
      category: "Compliance",
      status: "Active",
      version: "1.5",
      effective_date: "2024-02-15",
      review_date: "2025-02-15",
      circles_applied: ["MPCG", "UPE"],
      compliance_rate: 89,
      violations: 7,
      description: "Ethical standards and conduct requirements for all vendor partners",
    },
    {
      id: "3",
      title: "Equipment Recovery Guidelines",
      category: "Operations",
      status: "Under Review",
      version: "3.0 (Draft)",
      effective_date: null,
      review_date: "2024-12-15",
      circles_applied: [],
      compliance_rate: 0,
      violations: 0,
      description: "Updated guidelines for equipment recovery and asset management",
    },
    {
      id: "4",
      title: "Environmental Protection Standards",
      category: "Environmental",
      status: "Active",
      version: "1.2",
      effective_date: "2024-03-01",
      review_date: "2024-09-01",
      circles_applied: ["MPCG", "UPE", "GJ"],
      compliance_rate: 97,
      violations: 1,
      description: "Environmental compliance and sustainability requirements",
    },
  ];

  const mockComplianceIssues = [
    {
      id: "1",
      circle: "MPCG",
      policy: "Site Safety and Security Standards",
      severity: "High",
      status: "Open",
      description: "Missing safety equipment verification at 3 sites",
      reported_date: "2024-11-15",
      due_date: "2024-11-25",
    },
    {
      id: "2",
      circle: "UPE",
      policy: "Vendor Code of Conduct",
      severity: "Medium",
      status: "In Progress",
      description: "Vendor documentation incomplete for 2 contractors",
      reported_date: "2024-11-10",
      due_date: "2024-11-20",
    },
    {
      id: "3",
      circle: "GJ",
      policy: "Environmental Protection Standards",
      severity: "Low",
      status: "Resolved",
      description: "Minor waste disposal documentation delay",
      reported_date: "2024-11-05",
      due_date: "2024-11-15",
    },
  ];

  // Governance metrics
  const governanceMetrics = {
    total_policies: mockPolicies.length,
    active_policies: mockPolicies.filter((p) => p.status === "Active").length,
    average_compliance: mockPolicies.filter((p) => p.status === "Active").reduce((sum, p) => sum + p.compliance_rate, 0) / mockPolicies.filter((p) => p.status === "Active").length || 0,
    open_violations: mockComplianceIssues.filter((i) => i.status === "Open").length,
    policies_under_review: mockPolicies.filter((p) => p.status === "Under Review").length,
    circles_covered: 3,
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "success";
      case "Under Review":
        return "warning";
      case "Draft":
        return "info";
      case "Expired":
        return "error";
      default:
        return "default";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "High":
        return "error";
      case "Medium":
        return "warning";
      case "Low":
        return "info";
      default:
        return "default";
    }
  };

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "error";
      case "In Progress":
        return "warning";
      case "Resolved":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Corporate Governance
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage policies, compliance, and governance standards across {currentTenant?.organization_name}
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setNewPolicyDialogOpen(true)}>
            Create Policy
          </Button>
        </Box>
      </Box>

      {/* Governance Overview Metrics */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Governance Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <StatsCard title="Total Policies" value={governanceMetrics.total_policies} subtitle={`${governanceMetrics.active_policies} active`} icon={Policy} color="primary" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <StatsCard
              title="Avg Compliance"
              value={`${governanceMetrics.average_compliance.toFixed(1)}%`}
              subtitle="Across all policies"
              icon={CheckCircle}
              color="success"
              trend={{ value: 2, isPositive: true, suffix: "% improvement" }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <StatsCard title="Open Violations" value={governanceMetrics.open_violations} subtitle="Require attention" icon={Warning} color="error" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <StatsCard title="Under Review" value={governanceMetrics.policies_under_review} subtitle="Policies pending" icon={Assessment} color="warning" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
            <StatsCard title="Circle Coverage" value={governanceMetrics.circles_covered} subtitle="Circles governed" icon={Group} color="info" />
          </Grid>
        </Grid>
      </Box>

      {/* Alert for urgent items */}
      {governanceMetrics.open_violations > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>{governanceMetrics.open_violations} compliance violation(s)</strong> require immediate attention across your circles.
          <Button color="inherit" size="small" sx={{ ml: 2 }}>
            Review Issues
          </Button>
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ width: "100%" }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Policy Management" />
          <Tab label="Compliance Monitoring" />
          <Tab label="Audit & Reports" />
          <Tab label="Risk Assessment" />
        </Tabs>

        {/* Policy Management Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {mockPolicies.map((policy) => (
              <Grid size={{ xs: 12, md: 6 }} key={policy.id}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {policy.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {policy.description}
                        </Typography>
                      </Box>
                      <Chip label={policy.status} size="small" color={getStatusColor(policy.status)} />
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Category
                      </Typography>
                      <Typography variant="body2">{policy.category}</Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Version
                      </Typography>
                      <Typography variant="body2">{policy.version}</Typography>
                    </Box>

                    {policy.status === "Active" && (
                      <>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Compliance Rate
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                            <LinearProgress
                              variant="determinate"
                              value={policy.compliance_rate}
                              sx={{ flexGrow: 1, mr: 1 }}
                              color={policy.compliance_rate >= 90 ? "success" : policy.compliance_rate >= 80 ? "warning" : "error"}
                            />
                            <Typography variant="caption">{policy.compliance_rate}%</Typography>
                          </Box>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Applied to Circles
                          </Typography>
                          <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                            {policy.circles_applied.map((circle) => (
                              <Chip key={circle} label={circle} size="small" color="primary" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      </>
                    )}

                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                      <Button variant="outlined" size="small" startIcon={<Visibility />}>
                        View
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<Edit />}>
                        Edit
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Compliance Monitoring Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Compliance Issues & Violations
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Monitor and track compliance issues across all circles and policies.
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Circle</TableCell>
                  <TableCell>Policy</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockComplianceIssues.map((issue) => (
                  <TableRow key={issue.id} hover>
                    <TableCell>
                      <Chip label={issue.circle} size="small" color="primary" />
                    </TableCell>
                    <TableCell>{issue.policy}</TableCell>
                    <TableCell>
                      <Chip label={issue.severity} size="small" color={getSeverityColor(issue.severity)} />
                    </TableCell>
                    <TableCell>
                      <Chip label={issue.status} size="small" color={getComplianceStatusColor(issue.status)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{issue.description}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{issue.due_date}</Typography>
                    </TableCell>
                    <TableCell>
                      <Button variant="outlined" size="small">
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Audit & Reports Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Audit & Reporting
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Generate compliance reports and track audit activities across your organization.
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Audit Activities
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText primary="Safety Compliance Audit - MPCG" secondary="Completed on Nov 10, 2024 • 94% compliance" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Assignment color="info" />
                      </ListItemIcon>
                      <ListItemText primary="Vendor Code Review - UPE" secondary="In progress • Due Nov 20, 2024" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Warning color="warning" />
                      </ListItemIcon>
                      <ListItemText primary="Environmental Standards - GJ" secondary="Scheduled for Nov 25, 2024" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Available Reports
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Description />
                      </ListItemIcon>
                      <ListItemText primary="Quarterly Compliance Report" secondary="Q4 2024 • Ready for download" />
                      <Button variant="outlined" size="small">
                        Download
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Assessment />
                      </ListItemIcon>
                      <ListItemText primary="Circle Performance Analysis" secondary="November 2024 • Generate new" />
                      <Button variant="outlined" size="small">
                        Generate
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Security />
                      </ListItemIcon>
                      <ListItemText primary="Risk Assessment Report" secondary="Annual 2024 • In preparation" />
                      <Button variant="outlined" size="small" disabled>
                        Pending
                      </Button>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Risk Assessment Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Enterprise Risk Assessment
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Monitor and assess governance risks across operational, compliance, and strategic dimensions.
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="error.main" gutterBottom>
                    High Risk Areas
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Error color="error" />
                      </ListItemIcon>
                      <ListItemText primary="Site Safety Compliance" secondary="3 open violations in MPCG" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Warning color="warning" />
                      </ListItemIcon>
                      <ListItemText primary="Vendor Documentation" secondary="Missing compliance docs" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="warning.main" gutterBottom>
                    Medium Risk Areas
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Warning color="warning" />
                      </ListItemIcon>
                      <ListItemText primary="Policy Review Schedule" secondary="2 policies overdue for review" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Info color="info" />
                      </ListItemIcon>
                      <ListItemText primary="Training Compliance" secondary="87% completion rate" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="success.main" gutterBottom>
                    Well Managed
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText primary="Environmental Standards" secondary="97% compliance rate" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText primary="Financial Controls" secondary="All audits passed" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Create New Policy Dialog */}
      <Dialog open={newPolicyDialogOpen} onClose={() => setNewPolicyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Policy</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Define a new governance policy to be applied across your corporate circles.
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField autoFocus margin="dense" label="Policy Title" fullWidth variant="outlined" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Category</InputLabel>
                <Select label="Category">
                  <MenuItem value="Safety">Safety</MenuItem>
                  <MenuItem value="Compliance">Compliance</MenuItem>
                  <MenuItem value="Operations">Operations</MenuItem>
                  <MenuItem value="Environmental">Environmental</MenuItem>
                  <MenuItem value="Financial">Financial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField margin="dense" label="Policy Description" fullWidth multiline rows={3} variant="outlined" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Apply to Circles</InputLabel>
                <Select multiple label="Apply to Circles">
                  <MenuItem value="MPCG">MPCG</MenuItem>
                  <MenuItem value="UPE">UPE</MenuItem>
                  <MenuItem value="GJ">Gujarat</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField margin="dense" label="Effective Date" type="date" fullWidth variant="outlined" InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewPolicyDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setNewPolicyDialogOpen(false)}>
            Create Policy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GovernancePage;

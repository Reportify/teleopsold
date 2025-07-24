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
  Switch,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  useTheme,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Alert,
  Snackbar,
} from "@mui/material";
import { Add, Edit, Delete, MoreVert, Visibility, VisibilityOff, Star, TrendingUp, People, MonetizationOn, Schedule, Settings, CheckCircle, Cancel } from "@mui/icons-material";

interface SubscriptionPlan {
  id: number;
  plan_name: string;
  plan_code: string;
  description: string;
  monthly_price: number;
  annual_price: number;
  max_users: number;
  trial_period_days: number;
  is_active: boolean;
  created_at: string;
  subscribers?: number;
  monthly_revenue?: number;
  features: string[];
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

const InternalPlansPage: React.FC = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });

  // Form state
  const [formData, setFormData] = useState({
    plan_name: "",
    plan_code: "",
    description: "",
    monthly_price: 0,
    annual_price: 0,
    max_users: 5,
    trial_period_days: 14,
    is_active: true,
    features: [] as string[],
  });

  // Mock data - would be replaced with API calls
  const mockPlans: SubscriptionPlan[] = [
    {
      id: 1,
      plan_name: "Starter",
      plan_code: "STARTER",
      description: "Perfect for small teams getting started",
      monthly_price: 999,
      annual_price: 9990,
      max_users: 5,
      trial_period_days: 14,
      is_active: true,
      created_at: "2024-01-01",
      subscribers: 312,
      monthly_revenue: 312000,
      features: ["Basic Dashboard", "Email Support", "API Access"],
    },
    {
      id: 2,
      plan_name: "Professional",
      plan_code: "PROFESSIONAL",
      description: "Advanced features for growing businesses",
      monthly_price: 2499,
      annual_price: 24990,
      max_users: 25,
      trial_period_days: 14,
      is_active: true,
      created_at: "2024-01-01",
      subscribers: 289,
      monthly_revenue: 721750,
      features: ["Advanced Analytics", "Priority Support", "Custom Integrations", "Team Management"],
    },
    {
      id: 3,
      plan_name: "Enterprise",
      plan_code: "ENTERPRISE",
      description: "Complete solution for large organizations",
      monthly_price: 4999,
      annual_price: 49990,
      max_users: 100,
      trial_period_days: 30,
      is_active: true,
      created_at: "2024-01-01",
      subscribers: 156,
      monthly_revenue: 779844,
      features: ["Enterprise Analytics", "24/7 Support", "Custom Development", "White Labeling", "SLA Guarantee"],
    },
    {
      id: 4,
      plan_name: "Premium",
      plan_code: "PREMIUM",
      description: "Ultimate package with all features",
      monthly_price: 7999,
      annual_price: 79990,
      max_users: 500,
      trial_period_days: 30,
      is_active: false,
      created_at: "2024-01-01",
      subscribers: 66,
      monthly_revenue: 527934,
      features: ["All Enterprise Features", "Dedicated Account Manager", "Custom Training", "On-premise Deployment"],
    },
  ];

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setPlans(mockPlans);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleOpenDialog = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        plan_name: plan.plan_name,
        plan_code: plan.plan_code,
        description: plan.description,
        monthly_price: plan.monthly_price,
        annual_price: plan.annual_price,
        max_users: plan.max_users,
        trial_period_days: plan.trial_period_days,
        is_active: plan.is_active,
        features: plan.features || [],
      });
    } else {
      setEditingPlan(null);
      setFormData({
        plan_name: "",
        plan_code: "",
        description: "",
        monthly_price: 0,
        annual_price: 0,
        max_users: 5,
        trial_period_days: 14,
        is_active: true,
        features: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPlan(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, plan: SubscriptionPlan) => {
    setAnchorEl(event.currentTarget);
    setSelectedPlan(plan);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPlan(null);
  };

  const handleTogglePlan = async (plan: SubscriptionPlan) => {
    try {
      // Simulate API call
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, is_active: !p.is_active } : p)));
      setSnackbar({
        open: true,
        message: `Plan ${plan.is_active ? "deactivated" : "activated"} successfully`,
        severity: "success",
      });
      handleMenuClose();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to update plan status",
        severity: "error",
      });
    }
  };

  const handleSavePlan = async () => {
    try {
      if (editingPlan) {
        // Update existing plan
        setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? { ...p, ...formData } : p)));
        setSnackbar({
          open: true,
          message: "Plan updated successfully",
          severity: "success",
        });
      } else {
        // Create new plan
        const newPlan: SubscriptionPlan = {
          id: Date.now(), // In real app, this would come from API
          ...formData,
          created_at: new Date().toISOString(),
          subscribers: 0,
          monthly_revenue: 0,
        };
        setPlans((prev) => [...prev, newPlan]);
        setSnackbar({
          open: true,
          message: "Plan created successfully",
          severity: "success",
        });
      }
      handleCloseDialog();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to save plan",
        severity: "error",
      });
    }
  };

  const planAnalytics = {
    totalPlans: plans.length,
    activePlans: plans.filter((p) => p.is_active).length,
    totalSubscribers: plans.reduce((sum, p) => sum + (p.subscribers || 0), 0),
    totalRevenue: plans.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0),
    averagePrice: plans.length > 0 ? plans.reduce((sum, p) => sum + p.monthly_price, 0) / plans.length : 0,
    mostPopular: plans.reduce((prev, current) => ((current.subscribers || 0) > (prev.subscribers || 0) ? current : prev), plans[0]),
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          Subscription Plans Management
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()} sx={{ borderRadius: 2 }}>
          Create Plan
        </Button>
      </Box>

      {/* Plan Analytics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Plans
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {planAnalytics.totalPlans}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <Settings />
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
                    Active Plans
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {planAnalytics.activePlans}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <CheckCircle />
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
                    Total Subscribers
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {planAnalytics.totalSubscribers}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                  <People />
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
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {formatCurrency(planAnalytics.totalRevenue)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
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
                    Most Popular
                  </Typography>
                  <Typography variant="h6" fontWeight={600} noWrap>
                    {planAnalytics.mostPopular?.plan_name}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                  <Star />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabbed Content */}
      <Paper elevation={3}>
        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ px: 3, pt: 2 }}>
          <Tab label="All Plans" />
          <Tab label="Plan Analytics" />
          <Tab label="Performance" />
        </Tabs>

        <TabPanel value={selectedTab} index={0}>
          {/* Plans Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plan Details</TableCell>
                  <TableCell align="right">Pricing</TableCell>
                  <TableCell align="center">Users</TableCell>
                  <TableCell align="center">Trial Period</TableCell>
                  <TableCell align="center">Subscribers</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {plan.plan_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {plan.plan_code} • {plan.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(plan.monthly_price)}/mo
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(plan.annual_price)}/yr
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body1">{plan.max_users}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body1">{plan.trial_period_days} days</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body1" fontWeight={600} color="primary.main">
                        {plan.subscribers}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={plan.is_active ? "Active" : "Inactive"} color={plan.is_active ? "success" : "default"} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton onClick={(e) => handleMenuClick(e, plan)} size="small">
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {/* Plan Analytics */}
          <Grid container spacing={3} sx={{ p: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="Revenue by Plan" />
                <CardContent>
                  {plans.map((plan) => (
                    <Box key={plan.id} sx={{ mb: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Typography variant="body2">{plan.plan_name}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(plan.monthly_revenue || 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ flexGrow: 1, height: 8, bgcolor: theme.palette.grey[200], borderRadius: 4 }}>
                          <Box
                            sx={{
                              height: "100%",
                              bgcolor: plan.is_active ? theme.palette.primary.main : theme.palette.grey[400],
                              borderRadius: 4,
                              width: `${((plan.monthly_revenue || 0) / planAnalytics.totalRevenue) * 100}%`,
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {(((plan.monthly_revenue || 0) / planAnalytics.totalRevenue) * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="Subscriber Distribution" />
                <CardContent>
                  {plans.map((plan) => (
                    <Box key={plan.id} sx={{ mb: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                        <Typography variant="body2">{plan.plan_name}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {plan.subscribers} subscribers
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ flexGrow: 1, height: 8, bgcolor: theme.palette.grey[200], borderRadius: 4 }}>
                          <Box
                            sx={{
                              height: "100%",
                              bgcolor: plan.is_active ? theme.palette.secondary.main : theme.palette.grey[400],
                              borderRadius: 4,
                              width: `${((plan.subscribers || 0) / planAnalytics.totalSubscribers) * 100}%`,
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {(((plan.subscribers || 0) / planAnalytics.totalSubscribers) * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {/* Performance Metrics */}
          <Grid container spacing={3} sx={{ p: 3 }}>
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardHeader title="Plan Performance Metrics" />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Plan</TableCell>
                          <TableCell align="right">Subscribers</TableCell>
                          <TableCell align="right">Revenue/Month</TableCell>
                          <TableCell align="right">ARPU</TableCell>
                          <TableCell align="right">Conversion Rate</TableCell>
                          <TableCell align="right">Growth</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {plans.map((plan) => {
                          const arpu = (plan.subscribers || 0) > 0 ? (plan.monthly_revenue || 0) / (plan.subscribers || 1) : 0;
                          const conversionRate = Math.random() * 20 + 5; // Mock data
                          const growth = Math.random() * 30 - 10; // Mock data

                          return (
                            <TableRow key={plan.id}>
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Typography variant="body1" fontWeight={600}>
                                    {plan.plan_name}
                                  </Typography>
                                  {plan.id === planAnalytics.mostPopular?.id && <Star fontSize="small" color="warning" />}
                                </Box>
                              </TableCell>
                              <TableCell align="right">{plan.subscribers}</TableCell>
                              <TableCell align="right">{formatCurrency(plan.monthly_revenue || 0)}</TableCell>
                              <TableCell align="right">{formatCurrency(arpu)}</TableCell>
                              <TableCell align="right">{conversionRate.toFixed(1)}%</TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                                  {growth >= 0 ? <TrendingUp fontSize="small" color="success" /> : <TrendingUp fontSize="small" color="error" sx={{ transform: "rotate(180deg)" }} />}
                                  <Typography variant="body2" color={growth >= 0 ? "success.main" : "error.main"}>
                                    {Math.abs(growth).toFixed(1)}%
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
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
        <MenuItem
          onClick={() => {
            handleOpenDialog(selectedPlan!);
            handleMenuClose();
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit Plan
        </MenuItem>
        <MenuItem onClick={() => handleTogglePlan(selectedPlan!)}>
          {selectedPlan?.is_active ? <VisibilityOff fontSize="small" sx={{ mr: 1 }} /> : <Visibility fontSize="small" sx={{ mr: 1 }} />}
          {selectedPlan?.is_active ? "Deactivate" : "Activate"}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose} sx={{ color: "error.main" }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete Plan
        </MenuItem>
      </Menu>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingPlan ? "Edit Subscription Plan" : "Create New Subscription Plan"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Plan Name" value={formData.plan_name} onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Plan Code" value={formData.plan_code} onChange={(e) => setFormData({ ...formData, plan_code: e.target.value.toUpperCase() })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={3} label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Monthly Price"
                type="number"
                value={formData.monthly_price}
                onChange={(e) => setFormData({ ...formData, monthly_price: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Annual Price"
                type="number"
                value={formData.annual_price}
                onChange={(e) => setFormData({ ...formData, annual_price: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Max Users" type="number" value={formData.max_users} onChange={(e) => setFormData({ ...formData, max_users: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Trial Period (Days)"
                type="number"
                value={formData.trial_period_days}
                onChange={(e) => setFormData({ ...formData, trial_period_days: Number(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel control={<Switch checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />} label="Active Plan" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePlan}>
            {editingPlan ? "Update Plan" : "Create Plan"}
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

export default InternalPlansPage;

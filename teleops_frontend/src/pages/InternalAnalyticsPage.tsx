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
  LinearProgress,
  Avatar,
  useTheme,
  Button,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { TrendingUp, TrendingDown, People, MonetizationOn, Assessment, SupportAgent, Business, Receipt, CheckCircle, Error, Schedule } from "@mui/icons-material";

interface AnalyticsMetric {
  title: string;
  value: string | number;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  icon: React.ReactNode;
  color: string;
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

const InternalAnalyticsPage: React.FC = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  // Mock data - would be replaced with API calls
  const platformMetrics: AnalyticsMetric[] = [
    {
      title: "Total Tenants",
      value: 847,
      change: 12.3,
      changeType: "increase",
      icon: <Business />,
      color: theme.palette.primary.main,
    },
    {
      title: "Active Subscriptions",
      value: 823,
      change: 8.7,
      changeType: "increase",
      icon: <CheckCircle />,
      color: theme.palette.success.main,
    },
    {
      title: "Monthly Revenue",
      value: "₹12,45,680",
      change: 15.2,
      changeType: "increase",
      icon: <MonetizationOn />,
      color: theme.palette.secondary.main,
    },
    {
      title: "Support Tickets",
      value: 156,
      change: -5.4,
      changeType: "decrease",
      icon: <SupportAgent />,
      color: theme.palette.info.main,
    },
  ];

  const revenueMetrics = [
    { title: "New Tenants This Month", value: 47, previous: 39 },
    { title: "Revenue Growth", value: "15.2%", previous: "12.8%" },
    { title: "Payment Success Rate", value: "97.8%", previous: "96.5%" },
    { title: "Average Subscription Value", value: "₹1,512", previous: "₹1,485" },
  ];

  const tenantStatusData = [
    { status: "Active", count: 756, percentage: 89.3, color: theme.palette.success.main },
    { status: "Trial", count: 67, percentage: 7.9, color: theme.palette.warning.main },
    { status: "Suspended", count: 18, percentage: 2.1, color: theme.palette.error.main },
    { status: "Cancelled", count: 6, percentage: 0.7, color: theme.palette.grey[500] },
  ];

  const recentTickets = [
    { id: "TKT-2024-001", tenant: "Acme Corp", subject: "Billing Issue", priority: "High", status: "Open", created: "2024-01-15" },
    { id: "TKT-2024-002", tenant: "TechFlow Ltd", subject: "Feature Request", priority: "Medium", status: "In Progress", created: "2024-01-14" },
    { id: "TKT-2024-003", tenant: "DataSync Inc", subject: "Login Problem", priority: "High", status: "Resolved", created: "2024-01-13" },
    { id: "TKT-2024-004", tenant: "CloudNet Solutions", subject: "Performance Issue", priority: "Critical", status: "Open", created: "2024-01-12" },
  ];

  const subscriptionPlansData = [
    { plan: "Starter", subscribers: 312, revenue: "₹4,68,000", growth: "+8.2%" },
    { plan: "Professional", subscribers: 289, revenue: "₹5,78,000", growth: "+12.4%" },
    { plan: "Enterprise", subscribers: 156, revenue: "₹4,68,000", growth: "+18.7%" },
    { plan: "Premium", subscribers: 66, revenue: "₹1,98,000", growth: "+22.1%" },
  ];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return theme.palette.error.main;
      case "high":
        return theme.palette.warning.main;
      case "medium":
        return theme.palette.info.main;
      case "low":
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "resolved":
        return theme.palette.success.main;
      case "in progress":
        return theme.palette.warning.main;
      case "open":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Analytics Dashboard
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
          Analytics Dashboard
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} label="Time Range">
            <MenuItem value="7d">Last 7 days</MenuItem>
            <MenuItem value="30d">Last 30 days</MenuItem>
            <MenuItem value="90d">Last 90 days</MenuItem>
            <MenuItem value="1y">Last year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Platform Overview Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {platformMetrics.map((metric, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {metric.title}
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {metric.value}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                      {metric.changeType === "increase" ? <TrendingUp fontSize="small" color="success" /> : <TrendingDown fontSize="small" color="error" />}
                      <Typography variant="body2" color={metric.changeType === "increase" ? "success.main" : "error.main"} sx={{ ml: 0.5 }}>
                        {Math.abs(metric.change)}%
                      </Typography>
                    </Box>
                  </Box>
                  <Avatar sx={{ bgcolor: metric.color, width: 56, height: 56 }}>{metric.icon}</Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabbed Content */}
      <Paper elevation={3}>
        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ px: 3, pt: 2 }}>
          <Tab label="Revenue Analytics" />
          <Tab label="Tenant Analytics" />
          <Tab label="Support Analytics" />
          <Tab label="Subscription Plans" />
        </Tabs>

        <TabPanel value={selectedTab} index={0}>
          {/* Revenue Analytics */}
          <Grid container spacing={3} sx={{ p: 3 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Card>
                <CardHeader title="Revenue Metrics" />
                <CardContent>
                  <Grid container spacing={2}>
                    {revenueMetrics.map((metric, index) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={index}>
                        <Box sx={{ p: 2, bgcolor: theme.palette.grey[50], borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {metric.title}
                          </Typography>
                          <Typography variant="h6" fontWeight={600}>
                            {metric.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Previous: {metric.previous}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Card>
                <CardHeader title="Payment Status" />
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="body2">Success Rate</Typography>
                    <Typography variant="h6" color="success.main">
                      97.8%
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="body2">Failed Payments</Typography>
                    <Typography variant="h6" color="error.main">
                      18
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2">Pending</Typography>
                    <Typography variant="h6" color="warning.main">
                      5
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {/* Tenant Analytics */}
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Tenant Status Distribution" />
                  <CardContent>
                    {tenantStatusData.map((item, index) => (
                      <Box key={index} sx={{ mb: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                          <Typography variant="body2">{item.status}</Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {item.count} ({item.percentage}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={item.percentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: theme.palette.grey[200],
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: item.color,
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardHeader title="Tenant Growth" />
                  <CardContent>
                    <Typography variant="h4" color="primary.main" gutterBottom>
                      +47
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      New tenants this month
                    </Typography>
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="body2" gutterBottom>
                        Monthly Growth Rate
                      </Typography>
                      <LinearProgress variant="determinate" value={15.2} sx={{ height: 8, borderRadius: 4 }} />
                      <Typography variant="caption" color="text.secondary">
                        15.2% increase from last month
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {/* Support Analytics */}
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Card>
                  <CardHeader title="Recent Support Tickets" />
                  <CardContent>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Ticket ID</TableCell>
                            <TableCell>Tenant</TableCell>
                            <TableCell>Subject</TableCell>
                            <TableCell>Priority</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Created</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {recentTickets.map((ticket) => (
                            <TableRow key={ticket.id}>
                              <TableCell>{ticket.id}</TableCell>
                              <TableCell>{ticket.tenant}</TableCell>
                              <TableCell>{ticket.subject}</TableCell>
                              <TableCell>
                                <Chip
                                  label={ticket.priority}
                                  size="small"
                                  sx={{
                                    bgcolor: getPriorityColor(ticket.priority),
                                    color: "white",
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={ticket.status}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    borderColor: getStatusColor(ticket.status),
                                    color: getStatusColor(ticket.status),
                                  }}
                                />
                              </TableCell>
                              <TableCell>{ticket.created}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card>
                  <CardHeader title="Support Metrics" />
                  <CardContent>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Average Response Time
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        2.3 hours
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Resolution Rate
                      </Typography>
                      <Typography variant="h6" color="primary.main">
                        94.2%
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Customer Satisfaction
                      </Typography>
                      <Typography variant="h6" color="warning.main">
                        4.7/5.0
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Open Tickets
                      </Typography>
                      <Typography variant="h6" color="error.main">
                        23
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          {/* Subscription Plans */}
          <Box sx={{ p: 3 }}>
            <Card>
              <CardHeader
                title="Subscription Plan Performance"
                action={
                  <Button variant="outlined" size="small">
                    View All Plans
                  </Button>
                }
              />
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Plan Name</TableCell>
                        <TableCell align="right">Subscribers</TableCell>
                        <TableCell align="right">Monthly Revenue</TableCell>
                        <TableCell align="right">Growth</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {subscriptionPlansData.map((plan) => (
                        <TableRow key={plan.plan}>
                          <TableCell>
                            <Typography variant="body1" fontWeight={600}>
                              {plan.plan}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{plan.subscribers}</TableCell>
                          <TableCell align="right">{plan.revenue}</TableCell>
                          <TableCell align="right">
                            <Typography color="success.main" variant="body2">
                              {plan.growth}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default InternalAnalyticsPage;

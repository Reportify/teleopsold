import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Avatar,
  Button,
  useTheme,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  People,
  MonetizationOn,
  SupportAgent,
  Assessment,
  Settings,
  AccountTree,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Warning,
  Error,
  Schedule,
  Business,
  Receipt,
  Star,
  Notifications,
  Security,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface DashboardMetric {
  label: string;
  value: string | number;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  icon: React.ReactNode;
  color: string;
  target?: string;
}

interface RecentActivity {
  id: number;
  type: "tenant" | "billing" | "support" | "vendor" | "system";
  description: string;
  timestamp: string;
  severity: "info" | "warning" | "error" | "success";
  user?: string;
}

interface Alert {
  id: number;
  type: "critical" | "warning" | "info";
  message: string;
  action?: string;
  count?: number;
}

const InternalDashboardPage: React.FC = () => {
  const { internalUser, logoutInternal } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Role-based metrics configuration
  const getRoleBasedMetrics = (role: string): DashboardMetric[] => {
    const baseMetrics = [
      {
        label: "Total Tenants",
        value: 847,
        change: 12.3,
        changeType: "increase" as const,
        icon: <Business />,
        color: theme.palette.primary.main,
        target: "/internal/tenants",
      },
      {
        label: "Active Subscriptions",
        value: 823,
        change: 8.7,
        changeType: "increase" as const,
        icon: <CheckCircle />,
        color: theme.palette.success.main,
        target: "/internal/plans",
      },
      {
        label: "Monthly Revenue",
        value: "₹12,45,680",
        change: 15.2,
        changeType: "increase" as const,
        icon: <MonetizationOn />,
        color: theme.palette.secondary.main,
        target: "/internal/billing",
      },
      {
        label: "Open Tickets",
        value: 23,
        change: -5.4,
        changeType: "decrease" as const,
        icon: <SupportAgent />,
        color: theme.palette.info.main,
        target: "/internal/support",
      },
    ];

    // Add role-specific metrics
    if (role === "super_admin") {
      baseMetrics.push({
        label: "Vendor Networks",
        value: 156,
        change: 23.8,
        changeType: "increase" as const,
        icon: <AccountTree />,
        color: theme.palette.warning.main,
        target: "/internal/vendors",
      });
    }

    return baseMetrics;
  };

  const modules = [
    { label: "Tenants", icon: <People />, path: "/internal/tenants", description: "Manage tenant accounts and subscriptions" },
    { label: "Billing", icon: <MonetizationOn />, path: "/internal/billing", description: "Invoice and payment management" },
    { label: "Plans", icon: <Settings />, path: "/internal/plans", description: "Subscription plan configuration" },
    { label: "Support", icon: <SupportAgent />, path: "/internal/support", description: "Customer support tickets" },
    { label: "Vendors", icon: <AccountTree />, path: "/internal/vendors", description: "Vendor relationship networks" },
    { label: "Analytics", icon: <Assessment />, path: "/internal/analytics", description: "Platform analytics and reports" },
  ];

  // Mock recent activity data
  const recentActivity: RecentActivity[] = [
    {
      id: 1,
      type: "tenant",
      description: 'New tenant "DataFlow Solutions" onboarded successfully',
      timestamp: "2 hours ago",
      severity: "success",
      user: "Sarah Johnson",
    },
    {
      id: 2,
      type: "billing",
      description: "Payment of ₹45,000 received from Acme Corporation",
      timestamp: "3 hours ago",
      severity: "info",
      user: "System",
    },
    {
      id: 3,
      type: "support",
      description: "Critical ticket resolved for TechFlow Ltd",
      timestamp: "5 hours ago",
      severity: "warning",
      user: "Mike Wilson",
    },
    {
      id: 4,
      type: "vendor",
      description: "New vendor relationship approved: Ericsson → LocalTech",
      timestamp: "1 day ago",
      severity: "success",
      user: "Jennifer Brown",
    },
    {
      id: 5,
      type: "system",
      description: "Monthly billing cycle completed for 823 subscriptions",
      timestamp: "1 day ago",
      severity: "info",
      user: "System",
    },
  ];

  // Mock alerts data
  const alerts: Alert[] = [
    {
      id: 1,
      type: "critical",
      message: "Failed payments requiring attention",
      action: "Review failed payments",
      count: 5,
    },
    {
      id: 2,
      type: "warning",
      message: "Vendor relationships pending approval",
      action: "Review pending approvals",
      count: 8,
    },
    {
      id: 3,
      type: "info",
      message: "Trial periods expiring soon",
      action: "Contact trial users",
      count: 12,
    },
  ];

  // Top performing metrics
  const topPerformers = [
    { name: "Enterprise Plan", metric: "Highest Revenue", value: "₹4,68,000", growth: "+18.7%" },
    { name: "Sarah Johnson", metric: "Top Support Agent", value: "98.5% CSAT", growth: "+2.3%" },
    { name: "Ericsson Network", metric: "Top Vendor Revenue", value: "₹1,25,000", growth: "+15.2%" },
    { name: "TechFlow Solutions", metric: "Fastest Growing Tenant", value: "156% growth", growth: "+156%" },
  ];

  useEffect(() => {
    // Simulate loading dashboard data
    const timer = setTimeout(() => {
      setDashboardData({
        metrics: getRoleBasedMetrics(internalUser?.role || "support_staff"),
        activity: recentActivity,
        alerts: alerts,
        topPerformers: topPerformers,
      });
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [internalUser]);

  const handleLogout = async () => {
    await logoutInternal();
    navigate("/internal-login");
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "tenant":
        return <Business fontSize="small" />;
      case "billing":
        return <Receipt fontSize="small" />;
      case "support":
        return <SupportAgent fontSize="small" />;
      case "vendor":
        return <AccountTree fontSize="small" />;
      case "system":
        return <Settings fontSize="small" />;
      default:
        return <Notifications fontSize="small" />;
    }
  };

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case "success":
        return theme.palette.success.main;
      case "warning":
        return theme.palette.warning.main;
      case "error":
        return theme.palette.error.main;
      case "info":
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <Error />;
      case "warning":
        return <Warning />;
      case "info":
        return <Notifications />;
      default:
        return <Notifications />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "critical":
        return "error";
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "info";
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard Loading...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Welcome Header */}
      <Paper elevation={0} sx={{ p: 4, mb: 4, bgcolor: "background.paper", borderRadius: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Welcome, {internalUser ? `${internalUser.first_name} ${internalUser.last_name}` : "User"}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Role: {internalUser?.role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())} • Last login: Today, 9:30 AM
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Chip icon={<Security />} label="System Healthy" color="success" variant="outlined" />
            <Button variant="outlined" size="small">
              View Profile
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {alerts.map((alert) => (
            <Grid size={{ xs: 12, md: 4 }} key={alert.id}>
              <Alert
                severity={getAlertColor(alert.type) as any}
                icon={getAlertIcon(alert.type)}
                action={
                  <Button size="small" color="inherit">
                    {alert.action}
                  </Button>
                }
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                    {alert.message}
                  </Typography>
                  {alert.count && <Typography variant="caption">{alert.count} items need attention</Typography>}
                </Box>
              </Alert>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {dashboardData?.metrics.map((metric: DashboardMetric, index: number) => (
          <Grid size={{ xs: 12, sm: 6, md: dashboardData.metrics.length === 5 ? 2.4 : 3 }} key={index}>
            <Card
              elevation={2}
              sx={{
                cursor: metric.target ? "pointer" : "default",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  boxShadow: metric.target ? 6 : 2,
                  transform: metric.target ? "translateY(-2px)" : "none",
                },
              }}
              onClick={() => metric.target && navigate(metric.target)}
            >
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {metric.label}
                    </Typography>
                    <Typography variant="h5">{metric.value}</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                      {metric.changeType === "increase" ? <TrendingUp fontSize="small" color="success" /> : <TrendingDown fontSize="small" color="error" />}
                      <Typography variant="body2" color={metric.changeType === "increase" ? "success.main" : "error.main"} sx={{ ml: 0.5 }}>
                        {Math.abs(metric.change)}% vs last month
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

      <Grid container spacing={4}>
        {/* Quick Access Modules */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Quick Access Modules
            </Typography>
            <Grid container spacing={3}>
              {modules.map((mod) => (
                <Grid size={{ xs: 6, sm: 4, md: 4 }} key={mod.label}>
                  <Card
                    elevation={2}
                    sx={{
                      p: 3,
                      textAlign: "center",
                      borderRadius: 2,
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        boxShadow: 6,
                        bgcolor: "grey.50",
                        transform: "translateY(-4px)",
                      },
                    }}
                    onClick={() => navigate(mod.path)}
                  >
                    <Avatar sx={{ bgcolor: "secondary.main", mx: "auto", mb: 1, width: 48, height: 48 }}>{mod.icon}</Avatar>
                    <Typography variant="subtitle1" gutterBottom>
                      {mod.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {mod.description}
                    </Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Top Performers */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Top Performers This Month
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Typography variant="subtitle2">Category</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">Metric</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">Value</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2">Growth</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topPerformers.map((performer, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Star fontSize="small" color="warning" />
                          <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                            {performer.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {performer.metric}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                          {performer.value}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="success.main">
                          {performer.growth}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Activity & System Status */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List sx={{ maxHeight: 400, overflow: "auto" }}>
              {recentActivity.map((activity) => (
                <ListItem key={activity.id} divider>
                  <ListItemIcon>
                    <Avatar
                      sx={{
                        bgcolor: getActivityColor(activity.severity),
                        width: 32,
                        height: 32,
                      }}
                    >
                      {getActivityIcon(activity.type)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                        {activity.description}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {activity.timestamp}
                        </Typography>
                        {activity.user && (
                          <Typography variant="caption" color="primary.main">
                            {activity.user}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* System Health */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2">Server Performance</Typography>
                <Typography variant="body2" sx={{ fontWeight: "medium" }} color="success.main">
                  98.5%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={98.5} sx={{ height: 8, borderRadius: 4 }} color="success" />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2">Database Performance</Typography>
                <Typography variant="body2" sx={{ fontWeight: "medium" }} color="success.main">
                  94.2%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={94.2} sx={{ height: 8, borderRadius: 4 }} color="success" />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="body2">API Response Time</Typography>
                <Typography variant="body2" sx={{ fontWeight: "medium" }} color="warning.main">
                  2.3s avg
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={76} sx={{ height: 8, borderRadius: 4 }} color="warning" />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Last updated: {new Date().toLocaleTimeString()}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default InternalDashboardPage;

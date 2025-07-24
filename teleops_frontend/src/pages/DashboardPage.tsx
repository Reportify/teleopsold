// Enhanced Dashboard for Circle-Based Multi-Tenant Platform
import React from "react";
import { Box, Typography, Grid, Card, CardContent, List, ListItem, ListItemText, LinearProgress, Chip, IconButton, Paper, Stack, Divider } from "@mui/material";
import { TrendingUp, Business, Group, Assignment, Warning, CheckCircle, Notifications, ArrowForward, Dashboard as DashboardIcon } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/ThemeContext";
import { StatsCard } from "../components";

const DashboardPage: React.FC = () => {
  const { isCorporateUser, isCircleUser, isVendorUser, getCurrentTenant } = useAuth();

  const currentTenant = getCurrentTenant();

  if (isCorporateUser()) {
    return <CorporateExecutiveDashboard currentTenant={currentTenant} />;
  } else if (isCircleUser()) {
    return <CircleOperationalDashboard currentTenant={currentTenant} />;
  } else if (isVendorUser()) {
    return <VendorServiceDashboard currentTenant={currentTenant} />;
  }

  return <DefaultDashboard />;
};

const CorporateExecutiveDashboard: React.FC<{ currentTenant: any }> = ({ currentTenant }) => {
  const { darkMode } = useDarkMode();
  // Mock data for corporate dashboard
  const corporateMetrics = {
    activeCircles: 2,
    totalCircles: 3,
    totalRevenue: 5470000,
    operationalEfficiency: 90.3,
    complianceScore: 94,
  };

  const circlePerformance = [
    {
      name: "MPCG - Madhya Pradesh & Chhattisgarh",
      status: "Active",
      projects: 45,
      sites: 312,
      revenue: 1850000,
      efficiency: 92,
    },
    {
      name: "UPE - Uttar Pradesh East",
      status: "Active",
      projects: 38,
      sites: 267,
      revenue: 1620000,
      efficiency: 88,
    },
  ];

  const executiveAlerts = [
    {
      type: "warning",
      message: "3 compliance violations in MPCG circle require immediate attention",
      time: "2 hours ago",
    },
    {
      type: "info",
      message: "UPE circle efficiency below target (88% vs 90%)",
      time: "4 hours ago",
    },
    {
      type: "success",
      message: "Gujarat circle ready for operational launch",
      time: "1 day ago",
    },
  ];

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3, lg: 4 },
        pl: { xs: 1, md: 2, lg: 3 },
        backgroundColor: darkMode ? "#121212" : "#FAFBFC",
        minHeight: "100vh",
        maxWidth: "1400px",
        mx: "auto",
        color: darkMode ? "#e8eaed" : "#0F172A",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "14px",
              background: "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
              mr: 3,
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
            }}
          >
            <DashboardIcon sx={{ fontSize: 24, color: "white" }} />
          </Box>
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 500,
                color: darkMode ? "#e8eaed" : "#1a1a1a",
                lineHeight: 1.2,
                fontSize: { xs: "1.5rem", sm: "1.875rem", md: "2rem" },
                letterSpacing: "-0.01em",
              }}
            >
              Executive Dashboard
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: darkMode ? "#9aa0a6" : "#6b7280",
                fontSize: "0.875rem",
                fontWeight: 400,
                mt: 1,
                opacity: 0.8,
              }}
            >
              Strategic overview for {currentTenant?.organization_name}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Info Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          background: darkMode ? "linear-gradient(135deg, #1a2332 0%, #233041 100%)" : "linear-gradient(135deg, #EBF4FF 0%, #DBEAFE 100%)",
          border: darkMode ? "1px solid #3c4043" : "1px solid #BFDBFE",
          borderRadius: "16px",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: darkMode ? "linear-gradient(90deg, #8ab4f8, #aecbfa)" : "linear-gradient(90deg, #2563EB, #3B82F6)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "12px",
              backgroundColor: darkMode ? "rgba(138, 180, 248, 0.2)" : "rgba(37, 99, 235, 0.1)",
              color: darkMode ? "#8ab4f8" : "#2563EB",
              mr: 3,
              flexShrink: 0,
            }}
          >
            <CheckCircle sx={{ fontSize: 24 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 500, color: darkMode ? "#aecbfa" : "#1E40AF", mb: 1, fontSize: "1rem" }}>
              Corporate Oversight Mode
            </Typography>
            <Typography variant="body2" sx={{ color: darkMode ? "#8ab4f8" : "#3B82F6", lineHeight: 1.4, fontSize: "0.8rem", opacity: 0.9 }}>
              You have strategic oversight across all circles. Circle managers handle day-to-day operations.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Key Performance Indicators */}
      <Box sx={{ mb: 5 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            mb: 3,
            color: darkMode ? "#e8eaed" : "#374151",
            fontSize: "1.125rem",
            letterSpacing: "-0.005em",
          }}
        >
          Key Performance Indicators
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <StatsCard
              title="Active Circles"
              value={corporateMetrics.activeCircles}
              subtitle={`of ${corporateMetrics.totalCircles} total`}
              icon={Business}
              color="primary"
              trend={{ value: 1, isPositive: true, suffix: " new this quarter" }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <StatsCard
              title="Total Revenue"
              value={`₹${(corporateMetrics.totalRevenue / 100000).toFixed(1)}L`}
              subtitle="Monthly across circles"
              icon={TrendingUp}
              color="success"
              trend={{ value: 12, isPositive: true, suffix: "% vs last month" }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <StatsCard
              title="Operational Efficiency"
              value={`${corporateMetrics.operationalEfficiency}%`}
              subtitle="Average across circles"
              icon={TrendingUp}
              color="info"
              trend={{ value: 3.2, isPositive: true, suffix: "% improvement" }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <StatsCard
              title="Compliance Score"
              value={`${corporateMetrics.complianceScore}%`}
              subtitle="Organization-wide"
              icon={CheckCircle}
              color="warning"
              trend={{ value: 2, isPositive: true, suffix: "% improvement" }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}>
            <StatsCard title="Total Projects" value={circlePerformance.reduce((sum, circle) => sum + circle.projects, 0)} subtitle="Active across circles" icon={Assignment} color="secondary" />
          </Grid>
        </Grid>
      </Box>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Circle Performance Overview */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card
            elevation={0}
            sx={{
              height: "100%",
              backgroundColor: darkMode ? "#202124" : "#ffffff",
              border: darkMode ? "1px solid #3c4043" : "1px solid #F1F5F9",
              borderRadius: "16px",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 500, color: darkMode ? "#e8eaed" : "#374151", mb: 1, fontSize: "1rem" }}>
                    Circle Performance Overview
                  </Typography>
                  <Typography variant="body2" sx={{ color: darkMode ? "#9aa0a6" : "#6b7280", fontSize: "0.8rem", opacity: 0.7 }}>
                    Monitor performance across operational circles
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  sx={{
                    backgroundColor: "#2563EB",
                    color: "white",
                    width: 36,
                    height: 36,
                    "&:hover": { backgroundColor: "#1D4ED8" },
                    boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  <ArrowForward sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>

              <Stack spacing={2}>
                {circlePerformance.map((circle, index) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 4,
                      backgroundColor: darkMode ? "#202124" : "#ffffff",
                      border: darkMode ? "1px solid #3c4043" : "1px solid #F1F5F9",
                      borderRadius: "12px",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      overflow: "hidden",
                      "&:hover": {
                        borderColor: darkMode ? "#5f6368" : "#E2E8F0",
                        transform: "translateY(-2px)",
                        boxShadow: darkMode ? "0 10px 25px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)" : "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                      },
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "2px",
                        background: darkMode ? "linear-gradient(90deg, #34a853, #5bb85b)" : "linear-gradient(90deg, #10B981, #34D399)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: "#0F172A" }}>
                          {circle.name}
                        </Typography>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            px: 2,
                            py: 0.5,
                            borderRadius: "8px",
                            backgroundColor: "rgba(16, 185, 129, 0.08)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              color: "#059669",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {circle.status}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Grid container spacing={4}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Box>
                          <Typography
                            variant="overline"
                            sx={{
                              color: "#64748B",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                              letterSpacing: "0.8px",
                            }}
                          >
                            PROJECTS
                          </Typography>
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 700,
                              color: "#0F172A",
                              mt: 0.5,
                              fontFeatureSettings: '"tnum"',
                            }}
                          >
                            {circle.projects}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Box>
                          <Typography
                            variant="overline"
                            sx={{
                              color: "#64748B",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                              letterSpacing: "0.8px",
                            }}
                          >
                            SITES
                          </Typography>
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 700,
                              color: "#0F172A",
                              mt: 0.5,
                              fontFeatureSettings: '"tnum"',
                            }}
                          >
                            {circle.sites}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Box>
                          <Typography
                            variant="overline"
                            sx={{
                              color: "#64748B",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                              letterSpacing: "0.8px",
                            }}
                          >
                            REVENUE
                          </Typography>
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 700,
                              color: "#0F172A",
                              mt: 0.5,
                              fontFeatureSettings: '"tnum"',
                            }}
                          >
                            ₹{(circle.revenue / 100000).toFixed(1)}L
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Box>
                          <Typography
                            variant="overline"
                            sx={{
                              color: "#64748B",
                              fontWeight: 600,
                              fontSize: "0.7rem",
                              letterSpacing: "0.8px",
                            }}
                          >
                            EFFICIENCY
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                            <Box sx={{ flex: 1, mr: 2 }}>
                              <LinearProgress
                                variant="determinate"
                                value={circle.efficiency}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: "#F1F5F9",
                                  "& .MuiLinearProgress-bar": {
                                    borderRadius: 3,
                                    background: circle.efficiency >= 90 ? "linear-gradient(90deg, #10B981, #34D399)" : "linear-gradient(90deg, #F59E0B, #FBBF24)",
                                  },
                                }}
                              />
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                minWidth: "fit-content",
                                color: "#0F172A",
                                fontFeatureSettings: '"tnum"',
                              }}
                            >
                              {circle.efficiency}%
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Executive Alerts */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card
            elevation={0}
            sx={{
              height: "100%",
              border: "1px solid #F1F5F9",
              borderRadius: "16px",
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 4 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    backgroundColor: "rgba(37, 99, 235, 0.08)",
                    color: "#2563EB",
                    mr: 2,
                  }}
                >
                  <Notifications sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#0F172A" }}>
                    Executive Alerts
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#64748B", fontSize: "0.875rem" }}>
                    Priority notifications requiring attention
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={3}>
                {executiveAlerts.map((alert, index) => (
                  <Box key={index}>
                    <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 32,
                          height: 32,
                          borderRadius: "8px",
                          backgroundColor: alert.type === "warning" ? "rgba(245, 158, 11, 0.08)" : alert.type === "success" ? "rgba(16, 185, 129, 0.08)" : "rgba(14, 165, 233, 0.08)",
                          color: alert.type === "warning" ? "#D97706" : alert.type === "success" ? "#059669" : "#0284C7",
                          mr: 3,
                          flexShrink: 0,
                        }}
                      >
                        {alert.type === "warning" ? <Warning sx={{ fontSize: 16 }} /> : alert.type === "success" ? <CheckCircle sx={{ fontSize: 16 }} /> : <TrendingUp sx={{ fontSize: 16 }} />}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            mb: 0.5,
                            color: "#0F172A",
                            lineHeight: 1.4,
                          }}
                        >
                          {alert.message}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#64748B",
                            fontSize: "0.75rem",
                          }}
                        >
                          {alert.time}
                        </Typography>
                      </Box>
                    </Box>
                    {index < executiveAlerts.length - 1 && <Divider sx={{ my: 3, borderColor: "#F1F5F9" }} />}
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Circle Operational Dashboard (simplified for now)
const CircleOperationalDashboard: React.FC<{ currentTenant: any }> = ({ currentTenant }) => {
  const circleMetrics = {
    activeProjects: 24,
    completedSites: 156,
    monthlyRevenue: 1850000,
    teamMembers: 45,
    efficiency: 92,
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "background.default", minHeight: "100vh" }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Operations Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Circle operations for {currentTenant?.circle_name}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatsCard
            title="Active Projects"
            value={circleMetrics.activeProjects}
            subtitle="Currently ongoing"
            icon={Assignment}
            color="primary"
            trend={{ value: 3, isPositive: true, suffix: " new this month" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatsCard
            title="Completed Sites"
            value={circleMetrics.completedSites}
            subtitle="This quarter"
            icon={Business}
            color="success"
            trend={{ value: 15, isPositive: true, suffix: "% increase" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatsCard
            title="Monthly Revenue"
            value={`₹${(circleMetrics.monthlyRevenue / 100000).toFixed(1)}L`}
            subtitle="Current month"
            icon={TrendingUp}
            color="info"
            trend={{ value: 8, isPositive: true, suffix: "% vs target" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatsCard title="Team Members" value={circleMetrics.teamMembers} subtitle="Active personnel" icon={Group} color="secondary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <StatsCard
            title="Efficiency Score"
            value={`${circleMetrics.efficiency}%`}
            subtitle="Overall performance"
            icon={CheckCircle}
            color="warning"
            trend={{ value: 2, isPositive: true, suffix: "% improvement" }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

// Vendor Service Dashboard (placeholder)
const VendorServiceDashboard: React.FC<{ currentTenant: any }> = ({ currentTenant }) => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "background.default", minHeight: "100vh" }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Service Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Vendor operations for {currentTenant?.organization_name}
        </Typography>
      </Box>

      <Card elevation={0} sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" sx={{ color: "text.secondary" }}>
          Vendor dashboard coming soon...
        </Typography>
      </Card>
    </Box>
  );
};

// Default Dashboard
const DefaultDashboard: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: "background.default", minHeight: "100vh" }}>
      <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
        Dashboard
      </Typography>
      <Typography variant="body1" sx={{ color: "text.secondary" }}>
        Welcome to the Teleops platform
      </Typography>
    </Box>
  );
};

export default DashboardPage;

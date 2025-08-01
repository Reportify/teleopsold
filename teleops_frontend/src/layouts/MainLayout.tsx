// Main Layout Component for Circle-Based Multi-Tenant Platform
import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
  Badge,
  Stack,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard,
  Business,
  People,
  Assignment,
  Inventory,
  Warehouse,
  LocalShipping,
  Assessment,
  Settings,
  AccountCircle,
  Logout,
  Notifications,
  Circle,
  CorporateFare,
  BarChart,
  Security,
  AccountBalance,
  SupervisorAccount,
  Group,
  DarkMode,
  LightMode,
  Key,
  AdminPanelSettings,
  Shield,
  ExpandLess,
  ExpandMore,
  FiberManualRecord,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/ThemeContext";
import { useNavigate, useLocation } from "react-router-dom";

const drawerWidth = 280;

// Corporate tenant navigation (strategic oversight)
const corporateNavigationItems = [
  {
    text: "Executive Dashboard",
    icon: <Dashboard />,
    path: "/dashboard",
    permission: "dashboard.view",
    description: "Strategic overview and key metrics",
  },
  {
    text: "Circle Management",
    icon: <Circle />,
    path: "/circles",
    permission: "circles.manage",
    description: "Manage and monitor circle tenants",
  },
  {
    text: "Vendor Oversight",
    icon: <SupervisorAccount />,
    path: "/vendor-oversight",
    permission: "vendors.oversight",
    description: "Strategic vendor relationship management",
  },
  {
    text: "Analytics & Reports",
    icon: <BarChart />,
    path: "/analytics",
    permission: "analytics.view",
    description: "Cross-circle analytics and insights",
  },
  {
    text: "Compliance Center",
    icon: <Security />,
    path: "/compliance-center",
    permission: "compliance.monitor",
    description: "Monitor compliance across circles",
  },
  {
    text: "Governance",
    icon: <AccountBalance />,
    path: "/governance",
    permission: "governance.manage",
    description: "Corporate governance and policies",
  },
  {
    text: "Settings",
    icon: <Settings />,
    path: "/settings",
    permission: "settings.view",
    description: "Corporate configuration and preferences",
  },
  {
    text: "RBAC Management",
    icon: <Key />,
    path: "/rbac",
    permission: "rbac.manage",
    description: "Role-based access control management",
  },
];

// Unified navigation for both Circle and Vendor tenants
const unifiedNavigationItems = [
  {
    text: "Dashboard",
    icon: <Dashboard />,
    path: "/dashboard",
    permission: "dashboard.view",
    description: "Operational overview",
  },
  {
    text: "Projects",
    icon: <Assignment />,
    path: "/projects",
    permission: "projects.view",
    description: "Project management",
  },
  {
    text: "Sites",
    icon: <Business />,
    path: "/sites",
    permission: "sites.view",
    description: "Site operations",
  },
  {
    text: "Vendors",
    icon: <SupervisorAccount />,
    path: "/vendors",
    permission: "vendors.manage",
    description: "Vendor management and relationships",
  },
  {
    text: "Clients",
    icon: <Business />,
    path: "/clients",
    permission: "clients.manage",
    description: "Client management and relationships",
  },
  {
    text: "Teams",
    icon: <People />,
    path: "/teams",
    permission: "teams.view",
    description: "Team management",
  },
  {
    text: "Users",
    icon: <Group />,
    path: "/users",
    permission: "users.manage",
    description: "User management and designations",
  },
  {
    text: "Equipment",
    icon: <Inventory />,
    path: "/equipment",
    permission: "equipment.view",
    description: "Equipment inventory",
  },
  {
    text: "Warehouse",
    icon: <Warehouse />,
    path: "/warehouse",
    permission: "warehouse.view",
    description: "Warehouse operations",
  },
  {
    text: "Transport",
    icon: <LocalShipping />,
    path: "/transport",
    permission: "transport.view",
    description: "Transportation management",
  },
  {
    text: "Analytics",
    icon: <Assessment />,
    path: "/analytics",
    permission: "analytics.view",
    description: "Analytics & reporting",
  },
  {
    text: "Settings",
    icon: <Settings />,
    path: "/settings",
    permission: "settings.view",
    description: "Settings and configuration",
  },
  {
    text: "Designations",
    icon: <AdminPanelSettings />,
    path: "/designations",
    permission: "designations.manage",
    description: "Manage organizational roles and designations",
  },
  {
    text: "RBAC Management",
    icon: <Key />,
    path: "/rbac",
    permission: "rbac.manage",
    description: "Role-based access control management",
  },
  {
    text: "Permission Analytics",
    icon: <BarChart />,
    path: "/rbac/comprehensive-dashboard",
    permission: "rbac.manage",
    description: "Advanced permission analysis and insights",
  },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, getCurrentTenant, isCorporateUser, isCircleUser, isVendorUser } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
  const { darkMode, toggleDarkMode } = useDarkMode();

  const currentTenant = getCurrentTenant();

  // Get navigation items based on tenant type
  const getNavigationItems = () => {
    if (isCorporateUser()) return corporateNavigationItems;
    return unifiedNavigationItems; // For both Circle and Vendor
  };

  const navigationItems = getNavigationItems();

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleDarkModeToggle = () => {
    toggleDarkMode();
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleSubmenu = (menuText: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuText]: !prev[menuText],
    }));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    handleProfileMenuClose();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const getTenantTypeIcon = () => {
    if (isCorporateUser()) return <CorporateFare sx={{ fontSize: 20 }} />;
    if (isCircleUser()) return <Circle sx={{ fontSize: 20 }} />;
    if (isVendorUser()) return <Business sx={{ fontSize: 20 }} />;
    return <Business sx={{ fontSize: 20 }} />;
  };

  const getTenantTypeLabel = () => {
    if (isCorporateUser()) return "Corporate";
    if (isCircleUser()) return "Circle";
    if (isVendorUser()) return "Vendor";
    return "Tenant";
  };

  // Tenant context component for optional parent display
  const TenantContext = () => {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" fontWeight={500}>
          {currentTenant.organization_name}
        </Typography>
        {currentTenant.parent_tenant && <Chip label={`Part of ${currentTenant.parent_tenant.organization_name}`} size="small" variant="outlined" />}
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", width: "100%", backgroundColor: darkMode ? "#202124" : "#FFFFFF" }}>
      <CssBaseline />

      {/* App Bar - Google Workspace Style */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: "100%",
          zIndex: 1201,
          backgroundColor: darkMode ? "#202124" : "#FFFFFF",
          color: darkMode ? "#e8eaed" : "#5f6368",
          borderBottom: darkMode ? "1px solid #3c4043" : "1px solid #e8eaed",
          boxShadow: "none",
          transition: "all 0.3s ease-in-out",
        }}
      >
        <Toolbar sx={{ minHeight: 64, px: 3 }}>
          {/* Left Section - Hamburger Menu and Tenant Card */}
          <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, maxWidth: sidebarOpen ? "50%" : "auto" }}>
            {/* Google Style Hamburger Menu */}
            <IconButton
              edge="start"
              onClick={handleSidebarToggle}
              sx={{
                mr: 2,
                color: darkMode ? "#9aa0a6" : "#5f6368",
                "&:hover": {
                  backgroundColor: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(60, 64, 67, 0.08)",
                },
              }}
            >
              <MenuIcon />
            </IconButton>

            {/* Tenant Card beside hamburger - only show when sidebar is open and on larger screens */}
            {currentTenant && sidebarOpen && (
              <Box
                sx={{
                  display: { xs: "none", md: "flex" },
                  alignItems: "center",
                  p: 0.75,
                  backgroundColor: darkMode ? "#2d2e30" : "#f8f9fa",
                  borderRadius: 1.5,
                  border: darkMode ? "1px solid #3c4043" : "1px solid #e8eaed",
                  mr: 2,
                  maxWidth: "240px",
                  minWidth: "180px",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: "4px",
                    backgroundColor: darkMode ? "rgba(138, 180, 248, 0.2)" : "#e8f0fe",
                    mr: 1,
                    border: darkMode ? "1px solid #5f6368" : "1px solid #dadce0",
                  }}
                >
                  <Box sx={{ fontSize: "14px", color: darkMode ? "#8ab4f8" : "#1a73e8" }}>{getTenantTypeIcon()}</Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      fontSize: "11px",
                      color: darkMode ? "#e8eaed" : "#3c4043",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      lineHeight: 1.2,
                    }}
                  >
                    {currentTenant.organization_name}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    px: 0.75,
                    py: 0.25,
                    borderRadius: "6px",
                    backgroundColor: darkMode ? "rgba(138, 180, 248, 0.2)" : "#e8f0fe",
                    border: darkMode ? "1px solid #5f6368" : "1px solid #dadce0",
                    ml: 0.75,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: darkMode ? "#8ab4f8" : "#1a73e8",
                      fontSize: "8px",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.2px",
                      lineHeight: 1,
                    }}
                  >
                    {getTenantTypeLabel()}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {/* Centered Teleops Logo */}
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 400,
                fontSize: "22px",
                color: darkMode ? "#e8eaed" : "#5f6368",
                fontFamily: '"Product Sans", Arial, sans-serif',
              }}
            >
              Teleops
            </Typography>
          </Box>

          {/* Right Actions - Google Style */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: "200px" }}>
            {/* Dark Mode Toggle - Modern & Minimalistic */}
            <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} arrow>
              <IconButton
                onClick={handleDarkModeToggle}
                size="small"
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "10px",
                  backgroundColor: "transparent",
                  border: darkMode ? "1px solid #3c4043" : "1px solid #e8eaed",
                  color: darkMode ? "#e8eaed" : "#5f6368",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  mr: 1,
                  boxShadow: darkMode ? "0 1px 3px rgba(0, 0, 0, 0.2)" : "0 1px 2px rgba(0, 0, 0, 0.05)",
                  "&:hover": {
                    backgroundColor: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(60, 64, 67, 0.08)",
                    borderColor: darkMode ? "#5f6368" : "#dadce0",
                    transform: "scale(1.05)",
                    boxShadow: darkMode ? "0 2px 8px rgba(0, 0, 0, 0.3)" : "0 2px 4px rgba(0, 0, 0, 0.1)",
                  },
                  "&:active": {
                    transform: "scale(0.95)",
                  },
                }}
              >
                {darkMode ? (
                  <LightMode
                    sx={{
                      fontSize: 20,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform: "rotate(360deg)",
                    }}
                  />
                ) : (
                  <DarkMode
                    sx={{
                      fontSize: 20,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      transform: "rotate(0deg)",
                    }}
                  />
                )}
              </IconButton>
            </Tooltip>

            <IconButton
              sx={{
                color: darkMode ? "#9aa0a6" : "#5f6368",
                "&:hover": {
                  backgroundColor: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(60, 64, 67, 0.08)",
                },
              }}
            >
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>

            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{
                color: darkMode ? "#9aa0a6" : "#5f6368",
                "&:hover": {
                  backgroundColor: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(60, 64, 67, 0.08)",
                },
              }}
            >
              <AccountCircle />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Google Workspace Style Sidebar */}
      <Drawer
        variant="permanent"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? drawerWidth : 56,
          flexShrink: 0,
          transition: "width 0.2s ease-in-out",
          "& .MuiDrawer-paper": {
            width: sidebarOpen ? drawerWidth : 56,
            boxSizing: "border-box",
            backgroundColor: darkMode ? "#202124" : "#FFFFFF",
            borderRight: darkMode ? "1px solid #3c4043" : "1px solid #e8eaed",
            boxShadow: darkMode ? "0 1px 2px 0 rgba(0, 0, 0, 0.5), 0 2px 6px 2px rgba(0, 0, 0, 0.3)" : "0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 2px 6px 2px rgba(60, 64, 67, 0.15)",
            transition: "width 0.2s ease-in-out, background-color 0.3s ease-in-out, border-color 0.3s ease-in-out",
            overflowX: "hidden",
            top: 64,
            height: "calc(100vh - 64px)",
            position: "fixed",
            zIndex: 1200,
          },
        }}
      >
        {/* Google Style Navigation */}
        <Box sx={{ pt: 2 }}>
          {navigationItems.map((item: any) => (
            <ListItem key={item.text} disablePadding sx={{ display: "block", px: 1 }}>
              <ListItemButton
                component={RouterLink}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 48,
                  justifyContent: sidebarOpen ? "initial" : "center",
                  px: 2.5,
                  borderRadius: "0 24px 24px 0",
                  mr: 1,
                  "&:hover": {
                    backgroundColor: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(60, 64, 67, 0.08)",
                  },
                  "&.Mui-selected": {
                    backgroundColor: darkMode ? "rgba(138, 180, 248, 0.2)" : "#e8f0fe",
                    color: darkMode ? "#8ab4f8" : "#1a73e8",
                    "&:hover": {
                      backgroundColor: darkMode ? "rgba(138, 180, 248, 0.2)" : "#e8f0fe",
                    },
                    "& .MuiListItemIcon-root": {
                      color: darkMode ? "#8ab4f8" : "#1a73e8",
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: sidebarOpen ? 3 : "auto",
                    justifyContent: "center",
                    color: location.pathname === item.path ? (darkMode ? "#8ab4f8" : "#1a73e8") : darkMode ? "#9aa0a6" : "#5f6368",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    opacity: sidebarOpen ? 1 : 0,
                    "& .MuiTypography-root": {
                      fontSize: "14px",
                      fontWeight: location.pathname === item.path ? 500 : 400,
                      color: location.pathname === item.path ? (darkMode ? "#8ab4f8" : "#1a73e8") : darkMode ? "#e8eaed" : "#3c4043",
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </Box>

        {/* Google Style User Section */}
        {sidebarOpen && (
          <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                p: 2,
                backgroundColor: darkMode ? "#2d2e30" : "#f8f9fa",
                borderRadius: 2,
                cursor: "pointer",
                border: darkMode ? "1px solid #3c4043" : "1px solid transparent",
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  backgroundColor: darkMode ? "#3c4043" : "#e8eaed",
                  borderColor: darkMode ? "#5f6368" : "transparent",
                },
              }}
              onClick={handleProfileMenuOpen}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: darkMode ? "#8ab4f8" : "#1a73e8",
                  fontSize: "14px",
                  fontWeight: 500,
                  mr: 2,
                  color: darkMode ? "#202124" : "#ffffff",
                }}
              >
                {user?.first_name?.[0]}
                {user?.last_name?.[0]}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "14px", color: darkMode ? "#e8eaed" : "#3c4043" }}>
                  {user?.first_name} {user?.last_name}
                </Typography>
                <Typography variant="caption" sx={{ color: darkMode ? "#9aa0a6" : "#5f6368", fontSize: "12px" }}>
                  {getTenantTypeLabel()} User
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          elevation: 8,
          sx: {
            mt: 1.5,
            minWidth: 200,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "grey.200",
          },
        }}
      >
        <MenuItem onClick={() => navigate("/profile")} sx={{ py: 1.5 }}>
          <AccountCircle sx={{ mr: 2, color: "text.secondary" }} />
          Profile Settings
        </MenuItem>
        <MenuItem onClick={() => navigate("/my-permissions")} sx={{ py: 1.5 }}>
          <Shield sx={{ mr: 2, color: "text.secondary" }} />
          My Permissions
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: "error.main" }}>
          <Logout sx={{ mr: 2 }} />
          Sign Out
        </MenuItem>
      </Menu>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          backgroundColor: darkMode ? "#121212" : "#FFFFFF",
          minHeight: "100vh",
          pt: 8,
          ml: "0px",
          transition: "margin-left 0.2s ease-in-out, background-color 0.3s ease-in-out",
          overflow: "auto",
          px: 1,
        }}
      >
        <Box
          sx={{
            backgroundColor: darkMode ? "#121212" : "transparent",
            minHeight: "calc(100vh - 120px)",
            color: darkMode ? "#e8eaed" : "#3c4043",
            pl: 1,
            "& .MuiPaper-root": {
              backgroundColor: darkMode ? "#202124" : "#ffffff",
              color: darkMode ? "#e8eaed" : "#3c4043",
            },
            "& .MuiCard-root": {
              backgroundColor: darkMode ? "#202124" : "#ffffff",
              color: darkMode ? "#e8eaed" : "#3c4043",
            },
            "& .MuiTypography-root": {
              color: darkMode ? "#e8eaed" : "#3c4043",
            },
            "& .MuiTableContainer-root": {
              backgroundColor: darkMode ? "#202124" : "#ffffff",
            },
            "& .MuiTable-root": {
              backgroundColor: darkMode ? "#202124" : "#ffffff",
            },
            "& .MuiTableHead-root": {
              backgroundColor: darkMode ? "#2d2e30" : "#f8f9fa",
            },
            "& .MuiTableCell-root": {
              color: darkMode ? "#e8eaed" : "#3c4043",
              borderColor: darkMode ? "#3c4043" : "#e0e0e0",
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;

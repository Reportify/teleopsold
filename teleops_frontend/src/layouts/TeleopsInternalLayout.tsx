import React from "react";
import { AppBar, Toolbar, Tabs, Tab, Box, Avatar, Menu, MenuItem, Typography, IconButton } from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navTabs = [
  { label: "DASHBOARD", path: "/internal/dashboard" },
  { label: "TENANTS", path: "/internal/tenants" },
  { label: "BILLING", path: "/internal/billing" },
  { label: "PLANS", path: "/internal/plans" },
  { label: "SUPPORT", path: "/internal/support" },
  { label: "VENDORS", path: "/internal/vendors" },
  { label: "ANALYTICS", path: "/internal/analytics" },
];

const TeleopsInternalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logoutInternal, internalUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };
  const handleLogout = async () => {
    handleProfileMenuClose();
    await logoutInternal();
    navigate("/internal-login");
  };
  const handleViewProfile = () => {
    handleProfileMenuClose();
    navigate("/internal/profile");
  };

  return (
    <Box>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar sx={{ minHeight: 64, px: 3, bgcolor: "primary.main" }}>
          {/* Brand */}
          <Box
            sx={{
              fontWeight: 600,
              fontSize: 24,
              color: "white",
              mr: 5,
              display: "flex",
              alignItems: "center",
            }}
          >
            {/* Add a logo here if available */}
            Teleops Internal Portal
          </Box>
          {/* Tabs */}
          <Tabs
            value={navTabs.findIndex((tab) => location.pathname.startsWith(tab.path))}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{
              flexGrow: 1,
              ".MuiTab-root": {
                fontWeight: 500,
                fontSize: 16,
                mx: 1,
                px: 2,
                borderRadius: 2,
                transition: "background 0.2s ease-in-out",
              },
              ".Mui-selected": { bgcolor: "white", color: "primary.main" },
              ".MuiTab-root:hover": { bgcolor: "primary.light", color: "white" },
            }}
          >
            {navTabs.map((tab) => (
              <Tab key={tab.path} label={tab.label} onClick={() => navigate(tab.path)} />
            ))}
          </Tabs>
          {/* Profile section */}
          <Box sx={{ display: "flex", alignItems: "center", ml: 3 }}>
            <Typography sx={{ color: "white", fontWeight: 500, mr: 1 }}>{internalUser?.first_name}</Typography>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                fontWeight: 500,
                fontSize: 22,
                background: "linear-gradient(135deg, #1976d2 60%, #ff4081 100%)",
                color: "white",
                boxShadow: "0 2px 8px rgba(25, 118, 210, 0.15)",
                mr: 0,
                transition: "transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
                "&:hover": {
                  transform: "scale(1.07)",
                  boxShadow: "0 4px 16px rgba(25, 118, 210, 0.25)",
                },
              }}
            >
              {internalUser?.first_name?.[0] || <AccountCircleIcon />}
            </Avatar>
            <IconButton onClick={handleProfileMenuOpen} sx={{ color: "white", ml: 0.5 }}>
              <ArrowDropDownIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem onClick={handleViewProfile}>View Profile</MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box>{children}</Box>
    </Box>
  );
};

export default TeleopsInternalLayout;

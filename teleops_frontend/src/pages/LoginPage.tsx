// Login Page Component for Circle-Based Multi-Tenant Platform
import React, { useState, useEffect } from "react";
import { Box, Paper, TextField, Button, Typography, CircularProgress, FormControlLabel, Checkbox, Link, Divider, Chip, IconButton, useTheme, useMediaQuery } from "@mui/material";
import { Email, Lock, Visibility, VisibilityOff, Business, Circle, CorporateFare, Engineering } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS } from "../services/api";
import { ModernSnackbar } from "../components";

// Login form interface
interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

const LoginPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();

  const { login, isAuthenticated, isLoading, loginInternal, isInternalAuthenticated } = useAuth();

  // Form state
  const [formData, setFormData] = useState<LoginForm>({
    email: "",
    password: "",
    rememberMe: false,
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "error" as "success" | "error" | "warning" | "info",
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isInternalAuthenticated && !isLoading) {
      navigate("/internal/dashboard", { replace: true });
    } else if (isAuthenticated && !isLoading) {
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isInternalAuthenticated, isLoading, navigate, location]);

  // Handle form input changes
  const handleInputChange = (field: keyof LoginForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    // Clear snackbar when user starts typing (optional)
    // User can manually close snackbar if needed
  };

  // Handle checkbox change
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      rememberMe: event.target.checked,
    }));
  };

  // Toggle password visibility
  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Validate form
    if (!formData.email || !formData.password) {
      setSnackbar({
        open: true,
        message: "Please enter both email and password.",
        severity: "error",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setSnackbar({
        open: true,
        message: "Please enter a valid email address.",
        severity: "error",
      });
      return;
    }

    setIsLoggingIn(true);

    try {
      // If email is a Teleops internal user, use internal login
      if (formData.email.endsWith("@teleops.com")) {
        // Option 1: Redirect to internal login page
        navigate("/internal/login", { replace: true, state: { from: location } });
        return;
        // Option 2: Show error (uncomment to use)
        // setError("internal_login");
        // setErrorMessage("Internal users must log in via /internal/login");
        // setIsLoggingIn(false);
        // return;
      }
      await login(formData.email, formData.password);

      // Store remember me preference
      if (formData.rememberMe) {
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberMe");
      }

      // Redirect handled by useEffect
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.response?.status === 401) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.response?.status === 423) {
        errorMessage = "Account is locked. Please contact your administrator.";
      } else if (error.response?.status === 403) {
        errorMessage = "Insufficient permissions to access the platform.";
      } else if (error.response?.status === 410) {
        errorMessage = "Your organization account is inactive. Please contact support.";
      } else if (error.message === "Network Error") {
        errorMessage = "Network error. Please check your connection and try again.";
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    // TODO: Implement forgot password flow
    alert("Forgot password functionality will be implemented here.");
  };

  // Loading state
  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "background.default",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "background.default",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 450,
          p: 4,
          borderRadius: 3,
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: "bold", mb: 1 }}>
            Teleops
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Circle-Based Multi-Tenant Platform
          </Typography>
          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
            Sign In
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Access your organization's telecom infrastructure management
          </Typography>
        </Box>

        {/* User Type Indicators */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Platform supports:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Chip icon={<CorporateFare />} label="Corporate" size="small" variant="outlined" color="primary" />
            <Chip icon={<Circle />} label="Circle" size="small" variant="outlined" color="secondary" />
            <Chip icon={<Engineering />} label="Vendor" size="small" variant="outlined" color="info" />
            <Chip icon={<Business />} label="Teleops" size="small" variant="outlined" color="success" />
          </Box>
        </Box>

        {/* Login Form */}
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
          {/* Email Field */}
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleInputChange("email")}
            margin="normal"
            required
            autoComplete="email"
            autoFocus
            InputProps={{
              startAdornment: <Email sx={{ mr: 1, color: "text.secondary" }} />,
            }}
            disabled={isLoggingIn}
          />

          {/* Password Field */}
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleInputChange("password")}
            margin="normal"
            required
            autoComplete="current-password"
            InputProps={{
              startAdornment: <Lock sx={{ mr: 1, color: "text.secondary" }} />,
              endAdornment: (
                <IconButton onClick={handleTogglePassword} edge="end" disabled={isLoggingIn}>
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
            disabled={isLoggingIn}
          />

          {/* Remember Me & Forgot Password */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
            <FormControlLabel control={<Checkbox checked={formData.rememberMe} onChange={handleCheckboxChange} disabled={isLoggingIn} />} label="Remember me" />
            <Link component="button" variant="body2" onClick={handleForgotPassword} disabled={isLoggingIn} sx={{ textDecoration: "none" }}>
              Forgot password?
            </Link>
          </Box>

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoggingIn}
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              fontSize: "1.1rem",
              fontWeight: "bold",
            }}
          >
            {isLoggingIn ? (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CircularProgress size={20} sx={{ mr: 1, color: "inherit" }} />
                Signing In...
              </Box>
            ) : (
              "Sign In"
            )}
          </Button>
        </Box>

        {/* Divider */}
        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Platform Information
          </Typography>
        </Divider>

        {/* Platform Info */}
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Circle-Based Multi-Tenant Architecture
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Supporting Corporate → Circle → Vendor hierarchy with independent operations
          </Typography>
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            © 2024 Teleops. All rights reserved.
          </Typography>
        </Box>
      </Paper>

      {/* Modern Snackbar */}
      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default LoginPage;

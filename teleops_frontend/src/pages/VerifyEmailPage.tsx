import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Avatar,
  IconButton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
} from "@mui/material";
import { PhotoCamera, CheckCircleOutline, Business, Person, Email, Login, Assignment, Verified, Dashboard } from "@mui/icons-material";
import { api, API_ENDPOINTS } from "../services/api";

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    employee_id: "",
    reporting_manager: "",
    profile_photo: null as File | null,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenValidating, setTokenValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  // Validate token on component mount
  React.useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("No verification token provided.");
        setTokenValidating(false);
        return;
      }

      try {
        const response = await api.get(`/auth/verify-email/validate/?token=${token}`);

        if (response.status === 200) {
          setTokenValid(true);
          setUserInfo({
            email: response.data.user_email,
            name: response.data.user_name,
          });
        }
      } catch (err: any) {
        setTokenValid(false);
        if (err.response?.status === 410) {
          // Token expired or already used
          setError(err.response.data.error);
        } else if (err.response?.status === 409) {
          // Already verified
          setError(err.response.data.error);
        } else {
          setError(err.response?.data?.error || "Invalid verification token.");
        }
      } finally {
        setTokenValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, profile_photo: file }));
    if (file) setPhotoPreview(URL.createObjectURL(file));
    else setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!form.password || !form.confirmPassword) {
      setError("Please enter and confirm your password.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    // Basic required field check (frontend)
    const required = ["first_name", "last_name", "phone_number"];
    const missing = required.filter((f) => !form[f as keyof typeof form]);
    if (missing.length > 0) {
      setError(`Please fill all required fields: ${missing.join(", ")}`);
      return;
    }
    setLoading(true);
    try {
      const data = new FormData();
      data.append("token", token);
      data.append("password", form.password);
      data.append("first_name", form.first_name);
      data.append("last_name", form.last_name);
      data.append("phone_number", form.phone_number);
      if (form.employee_id) data.append("employee_id", form.employee_id);
      if (form.reporting_manager) data.append("reporting_manager", form.reporting_manager);
      if (form.profile_photo) data.append("profile_photo", form.profile_photo);
      const res = await api.post("/auth/verify-email/", data, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.status !== 200) {
        setError(res.data.error || "Verification failed.");
        setFieldErrors(res.data);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(err.response.data.error || "Verification failed.");
        setFieldErrors(err.response.data);
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while validating token
  if (tokenValidating) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50" }}>
        <Paper sx={{ p: 4, maxWidth: 400, mx: "auto", borderRadius: 3, boxShadow: 3, textAlign: "center" }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Validating Verification Link
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please wait while we verify your email verification link...
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Show error if token is invalid
  if (!tokenValid) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50", py: 4 }}>
        <Paper sx={{ p: 4, maxWidth: 500, mx: "auto", borderRadius: 3, boxShadow: 3, textAlign: "center" }}>
          <Typography variant="h5" fontWeight="bold" color="error" gutterBottom>
            Invalid Verification Link
          </Typography>
          <Alert severity="error" sx={{ mb: 3, textAlign: "left" }}>
            {error}
          </Alert>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button variant="contained" onClick={() => navigate("/login")}>
              Go to Login
            </Button>
            <Button variant="outlined" onClick={() => navigate("/support")}>
              Contact Support
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "grey.50", py: 4 }}>
      <Paper sx={{ p: 4, maxWidth: success ? 700 : 520, mx: "auto", borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h5" align="center" fontWeight="bold" sx={{ mb: 2 }}>
          Complete Your Account Setup
        </Typography>
        {userInfo && (
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Welcome, {userInfo.name}! Please complete your profile to activate your account.
          </Typography>
        )}

        {/* Administrator Role Information */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Administrator Setup
          </Typography>
          <Typography variant="body2">
            As the first user, you'll be assigned Administrator privileges with full access to:
            <br />• Create and manage departments and designations
            <br />• Add and manage team members
            <br />• Access all system features and settings
            <br />• You can later assign yourself specific job designations while keeping Administrator role
          </Typography>
        </Alert>
        {success ? (
          <Box sx={{ textAlign: "center" }}>
            {/* Success Icon and Header */}
            <Box sx={{ mb: 3 }}>
              <CheckCircleOutline sx={{ fontSize: 80, color: theme.palette.success.main, mb: 2 }} />
              <Typography variant="h4" fontWeight="bold" color="success.main" gutterBottom>
                Account Setup Complete!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Your email has been verified and your organization account is now active.
              </Typography>
            </Box>

            {/* What Was Created */}
            <Card elevation={2} sx={{ mb: 3, textAlign: "left" }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Assignment color="primary" />
                  What's Been Set Up
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Business color="primary" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Organization Account Created" secondary={`Your organization has been registered and activated on Teleops`} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Person color="primary" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Administrator Profile Created" secondary={`Your profile with Administrator role and full system access`} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Verified color="primary" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Email Verified" secondary="Your email address has been confirmed and activated" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card elevation={2} sx={{ mb: 3, textAlign: "left" }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Dashboard color="primary" />
                  Ready to Get Started
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  You can now log in to access your organization's dashboard and start managing your telecom operations.
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Login color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Access Your Dashboard" secondary="View projects, sites, tasks, and analytics" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Person color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Manage Your Team" secondary="Invite team members and assign roles" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <Business color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Configure Your Organization" secondary="Set up preferences and integrate with your systems" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button variant="contained" size="large" startIcon={<Login />} onClick={() => navigate("/login")} sx={{ px: 4, py: 1.5 }}>
                Continue to Login
              </Button>
              <Button variant="outlined" size="large" onClick={() => navigate("/support")} sx={{ px: 4, py: 1.5 }}>
                Get Support
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 3 }}>
              If you have any questions, our support team is ready to help you get started.
            </Typography>
          </Box>
        ) : (
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="First Name"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  fullWidth
                  required
                  error={!!fieldErrors.first_name}
                  helperText={fieldErrors.first_name}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} fullWidth required error={!!fieldErrors.last_name} helperText={fieldErrors.last_name} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Phone Number"
                  name="phone_number"
                  value={form.phone_number}
                  onChange={handleChange}
                  fullWidth
                  required
                  error={!!fieldErrors.phone_number}
                  helperText={fieldErrors.phone_number}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Employee ID (optional)"
                  name="employee_id"
                  value={form.employee_id}
                  onChange={handleChange}
                  fullWidth
                  error={!!fieldErrors.employee_id}
                  helperText={fieldErrors.employee_id}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Reporting Manager (optional)"
                  name="reporting_manager"
                  value={form.reporting_manager}
                  onChange={handleChange}
                  fullWidth
                  error={!!fieldErrors.reporting_manager}
                  helperText={fieldErrors.reporting_manager}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Avatar src={photoPreview || undefined} sx={{ width: 48, height: 48 }} />
                  <Button variant="outlined" component="label" startIcon={<PhotoCamera />}>
                    Upload Profile Photo
                    <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
                  </Button>
                </Box>
                {fieldErrors.profile_photo && (
                  <Typography color="error" variant="caption">
                    {fieldErrors.profile_photo}
                  </Typography>
                )}
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="New Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  fullWidth
                  required
                  error={!!fieldErrors.password}
                  helperText={fieldErrors.password}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} fullWidth required />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} sx={{ mb: 2 }}>
                  {loading ? <CircularProgress size={24} /> : "Complete Onboarding"}
                </Button>
              </Grid>
            </Grid>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default VerifyEmailPage;

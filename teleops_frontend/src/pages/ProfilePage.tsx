import React, { useEffect, useState } from "react";
import { Box, Typography, Card, IconButton, Button, TextField, CircularProgress, Avatar, Divider, Paper, Stack, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Edit as EditIcon, PhotoCamera, Person, Email, Phone, Business, Badge, Security, Save, Cancel } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/ThemeContext";
import { ModernSnackbar } from "../components";

const ProfilePage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { darkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  // Create display name from first_name and last_name
  const displayName = user ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : "";
  const initials = user ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}` : "?";

  const profileData = [
    {
      key: "name",
      label: "Full Name",
      value: displayName || "Not provided",
      icon: Person,
      editable: true,
    },
    {
      key: "email",
      label: "Email Address",
      value: user?.email || "Not provided",
      icon: Email,
      editable: false,
    },
    {
      key: "phone",
      label: "Phone Number",
      value: profile?.phone_number || "Not provided",
      icon: Phone,
      editable: true,
    },
    {
      key: "department",
      label: "Department",
      value: profile?.department || "Not specified",
      icon: Business,
      editable: true,
    },
    {
      key: "employee_id",
      label: "Employee ID",
      value: profile?.employee_id || "Not assigned",
      icon: Badge,
      editable: true,
    },
    {
      key: "role",
      label: "Role",
      value: profile?.role || "Standard User",
      icon: Security,
      editable: false,
    },
  ];

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue === "Not provided" || currentValue === "Not specified" || currentValue === "Not assigned" ? "" : currentValue);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Here you would implement the actual API call to update the profile
      // For now, we'll just simulate it
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update the profile data
      await refreshProfile();

      setEditingField(null);
      setEditValue("");
      setSnackbar({
        open: true,
        message: "Profile updated successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      setSnackbar({
        open: true,
        message: "Failed to update profile. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleAvatarUpload = () => {
    setAvatarDialogOpen(true);
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        backgroundColor: darkMode ? "#121212" : "#FAFBFC",
        minHeight: "100vh",
        color: darkMode ? "#e8eaed" : "#1a1a1a",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 500,
            color: darkMode ? "#e8eaed" : "#1a1a1a",
            fontSize: { xs: "1.5rem", sm: "1.875rem", md: "2rem" },
            letterSpacing: "-0.01em",
            mb: 1,
          }}
        >
          My Profile
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: darkMode ? "#9aa0a6" : "#6b7280",
            fontSize: "0.875rem",
            opacity: 0.8,
          }}
        >
          Manage your personal information and preferences
        </Typography>
      </Box>

      <Box sx={{ maxWidth: "800px", mx: "auto" }}>
        {/* Profile Header Card */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 3,
            backgroundColor: darkMode ? "#202124" : "#ffffff",
            border: darkMode ? "1px solid #3c4043" : "1px solid #e5e7eb",
            borderRadius: "12px",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Box sx={{ position: "relative" }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  backgroundColor: darkMode ? "#8ab4f8" : "#1a73e8",
                  fontSize: "2rem",
                  fontWeight: 500,
                  color: darkMode ? "#202124" : "#ffffff",
                }}
              >
                {initials}
              </Avatar>
              <IconButton
                size="small"
                onClick={handleAvatarUpload}
                sx={{
                  position: "absolute",
                  bottom: -4,
                  right: -4,
                  backgroundColor: darkMode ? "#3c4043" : "#f3f4f6",
                  color: darkMode ? "#e8eaed" : "#374151",
                  border: darkMode ? "2px solid #202124" : "2px solid #ffffff",
                  "&:hover": {
                    backgroundColor: darkMode ? "#5f6368" : "#e5e7eb",
                  },
                }}
              >
                <PhotoCamera sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 500,
                  color: darkMode ? "#e8eaed" : "#1a1a1a",
                  mb: 0.5,
                }}
              >
                {displayName || "User Profile"}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: darkMode ? "#9aa0a6" : "#6b7280",
                  fontSize: "0.875rem",
                }}
              >
                {user?.email}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: darkMode ? "#8ab4f8" : "#1a73e8",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  fontWeight: 500,
                }}
              >
                {profile?.role || "Standard User"}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Profile Information */}
        <Paper
          elevation={0}
          sx={{
            backgroundColor: darkMode ? "#202124" : "#ffffff",
            border: darkMode ? "1px solid #3c4043" : "1px solid #e5e7eb",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: 3, borderBottom: darkMode ? "1px solid #3c4043" : "1px solid #e5e7eb" }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 500,
                color: darkMode ? "#e8eaed" : "#374151",
                fontSize: "1.125rem",
              }}
            >
              Personal Information
            </Typography>
          </Box>

          <Stack divider={<Divider sx={{ borderColor: darkMode ? "#3c4043" : "#e5e7eb" }} />}>
            {profileData.map((item, index) => {
              const Icon = item.icon;
              const isEditing = editingField === item.key;

              return (
                <Box key={item.key} sx={{ p: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                      <Icon
                        sx={{
                          fontSize: 20,
                          color: darkMode ? "#9aa0a6" : "#6b7280",
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: darkMode ? "#9aa0a6" : "#6b7280",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            mb: 0.5,
                          }}
                        >
                          {item.label}
                        </Typography>
                        {isEditing ? (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                            <TextField
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              size="small"
                              sx={{
                                flex: 1,
                                "& .MuiOutlinedInput-root": {
                                  backgroundColor: darkMode ? "#2d2e30" : "#f9fafb",
                                  borderColor: darkMode ? "#3c4043" : "#d1d5db",
                                  color: darkMode ? "#e8eaed" : "#374151",
                                },
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={handleSave}
                              disabled={loading}
                              sx={{
                                color: darkMode ? "#8ab4f8" : "#1a73e8",
                                "&:hover": {
                                  backgroundColor: darkMode ? "rgba(138, 180, 248, 0.1)" : "rgba(26, 115, 232, 0.1)",
                                },
                              }}
                            >
                              {loading ? <CircularProgress size={16} /> : <Save sx={{ fontSize: 16 }} />}
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={handleCancel}
                              sx={{
                                color: darkMode ? "#9aa0a6" : "#6b7280",
                                "&:hover": {
                                  backgroundColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                                },
                              }}
                            >
                              <Cancel sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        ) : (
                          <Typography
                            variant="body1"
                            sx={{
                              color: darkMode ? "#e8eaed" : "#1a1a1a",
                              fontSize: "0.875rem",
                              fontWeight: 400,
                            }}
                          >
                            {item.value}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {item.editable && !isEditing && (
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(item.key, item.value)}
                        sx={{
                          color: darkMode ? "#9aa0a6" : "#6b7280",
                          "&:hover": {
                            backgroundColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                          },
                        }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      </Box>

      {/* Avatar Upload Dialog */}
      <Dialog open={avatarDialogOpen} onClose={() => setAvatarDialogOpen(false)}>
        <DialogTitle>Update Profile Picture</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose a new profile picture to upload.
          </Typography>
          <Button variant="outlined" component="label" fullWidth>
            Choose File
            <input type="file" hidden accept="image/*" />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAvatarDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Upload</Button>
        </DialogActions>
      </Dialog>

      {/* Modern Snackbar */}
      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default ProfilePage;

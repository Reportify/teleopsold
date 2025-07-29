/**
 * Designation Permission Management Page
 * Provides functionality to view and manage permissions assigned to designations
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
} from "@mui/material";
import { Remove, ExpandMore, Refresh, Security, Group, Person, Assignment, AdminPanelSettings, ArrowBack, Visibility } from "@mui/icons-material";
import { rbacAPI } from "../services/rbacAPI";
import { ModernSnackbar, AppBreadcrumbs } from "../components";
import type { BreadcrumbItem } from "../components";

interface Designation {
  id: number;
  designation_name: string;
  designation_code: string;
  description?: string;
  is_active: boolean;
  permission_count?: number;
  user_count?: number;
}

interface DesignationPermission {
  id: number;
  permission_id: number;
  permission_name: string;
  permission_code: string;
  permission_category: string;
  risk_level: "low" | "medium" | "high" | "critical";
  is_active: boolean;
}

const DesignationPermissionPage: React.FC = () => {
  // State management
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);
  const [designationPermissions, setDesignationPermissions] = useState<DesignationPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Dialog states
  const [permissionsDialog, setPermissionsDialog] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Dashboard", path: "/" },
    { label: "RBAC Management", path: "/rbac" },
    { label: "Designation Permissions", path: "/rbac/designation-permissions" },
  ];

  // Load designations on component mount
  useEffect(() => {
    loadDesignations();
  }, []);

  const loadDesignations = async () => {
    setLoading(true);
    try {
      const response = await rbacAPI.getDesignations();
      setDesignations(Array.isArray(response) ? response : []);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to load designations",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDesignationPermissions = async (designationId: number) => {
    setPermissionsLoading(true);
    try {
      const response = await rbacAPI.getDesignationPermissions(designationId);
      setDesignationPermissions(Array.isArray(response) ? (response as unknown as DesignationPermission[]) : []);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to load designation permissions",
        severity: "error",
      });
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleViewPermissions = async (designation: Designation) => {
    setSelectedDesignation(designation);
    setPermissionsDialog(true);
    await loadDesignationPermissions(designation.id);
  };

  const handleRemovePermissionFromDesignation = async (designationId: number, permissionId: number, permissionName: string) => {
    if (window.confirm(`Remove permission "${permissionName}" from designation? All users with this designation will lose this permission.`)) {
      try {
        const result = await rbacAPI.bulkRevokePermissions({
          permission_ids: [permissionId],
          target_type: "designations",
          target_ids: [designationId],
          reason: "Removed via designation management",
        });

        if (result.success) {
          setSnackbar({
            open: true,
            message: "Permission removed from designation successfully",
            severity: "success",
          });
          // Refresh designation permissions
          await loadDesignationPermissions(designationId);
          // Refresh designations list
          await loadDesignations();
        }
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error.message || "Failed to remove permission from designation",
          severity: "error",
        });
      }
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      default:
        return "success";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <AppBreadcrumbs items={breadcrumbs} />

      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Designation Permission Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage permissions assigned to job designations
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadDesignations}>
          Refresh
        </Button>
      </Box>

      {/* Designations Grid */}
      <Grid container spacing={3}>
        {designations.map((designation) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={designation.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
                    <AdminPanelSettings />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{designation.designation_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {designation.designation_code}
                    </Typography>
                  </Box>
                  <Chip label={designation.is_active ? "Active" : "Inactive"} color={designation.is_active ? "success" : "default"} size="small" />
                </Box>

                {designation.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {designation.description}
                  </Typography>
                )}

                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Security fontSize="small" />
                    <Typography variant="body2">{designation.permission_count || 0} permissions</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Person fontSize="small" />
                    <Typography variant="body2">{designation.user_count || 0} users</Typography>
                  </Box>
                </Box>

                <Button variant="outlined" fullWidth startIcon={<Security />} onClick={() => handleViewPermissions(designation)} disabled={!designation.is_active}>
                  View Permissions
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {designations.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <AdminPanelSettings sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Designations Found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No job designations are available in the system.
          </Typography>
        </Box>
      )}

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialog} onClose={() => setPermissionsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <AdminPanelSettings />
            <Box>
              <Typography variant="h6">{selectedDesignation?.designation_name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Designation Permissions
              </Typography>
            </Box>
            <Chip label={`${designationPermissions.length} permissions`} size="small" color="primary" variant="filled" sx={{ ml: "auto" }} />
          </Box>
        </DialogTitle>

        <DialogContent>
          {permissionsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : designationPermissions.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Assigned Permissions ({designationPermissions.length})
              </Typography>

              <Grid container spacing={2}>
                {designationPermissions.map((permission) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={permission.id}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {permission.permission_name}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                          <Chip label={permission.risk_level} size="small" color={getRiskLevelColor(permission.risk_level)} variant="outlined" />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemovePermissionFromDesignation(selectedDesignation!.id, permission.permission_id, permission.permission_name)}
                            title="Remove permission from designation"
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                        {permission.permission_code}
                      </Typography>
                      <Chip label={permission.permission_category} size="small" variant="outlined" />
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Security sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Permissions Assigned
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This designation doesn't have any permissions assigned yet.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setPermissionsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default DesignationPermissionPage;

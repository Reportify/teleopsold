/**
 * Permission Registry Management Page
 * Provides comprehensive CRUD operations for tenant permissions
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Menu,
  Pagination,
  Grid,
  Alert,
  LinearProgress,
  FormControlLabel,
  Switch,
  Autocomplete,
} from "@mui/material";
import { Add, Edit, Delete, MoreVert, Search, FilterList, Refresh, Security, Warning, CheckCircle, Info, ArrowBack } from "@mui/icons-material";
import { useRBAC } from "../hooks/useRBAC";
import { Permission } from "../services/rbacAPI";
import { ModernSnackbar, AppBreadcrumbs } from "../components";
import type { BreadcrumbItem } from "../components";

interface PermissionFormData {
  permission_name: string;
  permission_code: string;
  permission_category: string;
  description: string;
  permission_type: "action" | "access" | "data" | "administrative" | "system";
  risk_level: "low" | "medium" | "high" | "critical";
  resource_type: string;
  action_type: string;
  effect: "allow" | "deny";
  requires_scope: boolean;
  is_delegatable: boolean;
  is_auditable: boolean;
}

const defaultFormData: PermissionFormData = {
  permission_name: "",
  permission_code: "",
  permission_category: "",
  description: "",
  permission_type: "action",
  risk_level: "low",
  resource_type: "",
  action_type: "",
  effect: "allow",
  requires_scope: false,
  is_delegatable: true,
  is_auditable: true,
};

const PermissionRegistryPage: React.FC = () => {
  const {
    state: { permissions, loading, error },
    loadPermissions,
    createPermission,
    updatePermission,
    deletePermission,
  } = useRBAC();

  // UI State
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState<PermissionFormData>(defaultFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  // Filters and Search
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  // Add step state and better form organization
  const [currentStep, setCurrentStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (permissions.length === 0) {
      loadPermissions();
    }

    // Handle URL parameters for direct actions
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "create") {
      handleOpenDialog();
      // Clean up URL without reloading page
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Filter and search logic
  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch =
      permission.permission_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.permission_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !categoryFilter || permission.permission_category === categoryFilter;
    const matchesType = !typeFilter || permission.permission_type === typeFilter;
    const matchesRisk = !riskFilter || permission.risk_level === riskFilter;

    return matchesSearch && matchesCategory && matchesType && matchesRisk;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPermissions.length / rowsPerPage);
  const paginatedPermissions = filteredPermissions.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Get unique values for filters
  const categories = Array.from(new Set(permissions.map((p) => p.permission_category))).filter(Boolean);
  const types = Array.from(new Set(permissions.map((p) => p.permission_type)));
  const riskLevels = Array.from(new Set(permissions.map((p) => p.risk_level)));

  // Helper function to generate permission code from name
  const generatePermissionCode = (name: string, category: string): string => {
    const cleanName = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    const cleanCategory = category
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");

    return cleanCategory ? `${cleanCategory}.${cleanName}` : cleanName;
  };

  const handlePermissionNameChange = (name: string) => {
    setFormData((prev) => {
      const newCode = !editingPermission && !prev.permission_code ? generatePermissionCode(name, prev.permission_category) : prev.permission_code;

      return {
        ...prev,
        permission_name: name,
        permission_code: newCode,
      };
    });
  };

  const handleCategoryChange = (category: string) => {
    setFormData((prev) => {
      const newCode = !editingPermission && prev.permission_name ? generatePermissionCode(prev.permission_name, category) : prev.permission_code;

      return {
        ...prev,
        permission_category: category,
        permission_code: newCode,
      };
    });
  };

  const handleOpenDialog = (permission?: Permission) => {
    if (permission) {
      setEditingPermission(permission);
      setFormData({
        permission_name: permission.permission_name,
        permission_code: permission.permission_code,
        permission_category: permission.permission_category,
        description: permission.description || "",
        permission_type: permission.permission_type,
        risk_level: permission.risk_level,
        resource_type: permission.resource_type || "",
        action_type: permission.action_type || "",
        effect: permission.effect,
        requires_scope: permission.requires_scope,
        is_delegatable: permission.is_delegatable,
        is_auditable: permission.is_auditable,
      });
    } else {
      setEditingPermission(null);
      setFormData(defaultFormData);
    }
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPermission(null);
    setFormData(defaultFormData);
    setFormErrors({});
    setCurrentStep(0); // Reset step when closing
    setShowAdvanced(false); // Reset advanced toggle
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!formData.permission_name.trim()) {
      errors.permission_name = "Permission name is required";
    } else if (formData.permission_name.length < 3) {
      errors.permission_name = "Permission name must be at least 3 characters";
    } else if (formData.permission_name.length > 100) {
      errors.permission_name = "Permission name must be less than 100 characters";
    }

    if (!formData.permission_code.trim()) {
      errors.permission_code = "Permission code is required";
    } else if (!/^[a-z0-9_\.]+$/.test(formData.permission_code)) {
      errors.permission_code = "Permission code can only contain lowercase letters, numbers, underscores, and dots";
    } else if (formData.permission_code.length < 3) {
      errors.permission_code = "Permission code must be at least 3 characters";
    } else if (formData.permission_code.length > 100) {
      errors.permission_code = "Permission code must be less than 100 characters";
    } else {
      // Check for duplicate codes (excluding current permission when editing)
      const duplicatePermission = permissions.find((p) => p.permission_code === formData.permission_code && (!editingPermission || p.id !== editingPermission.id));
      if (duplicatePermission) {
        errors.permission_code = "Permission code already exists";
      }
    }

    if (!formData.permission_category.trim()) {
      errors.permission_category = "Category is required";
    }

    // Business validation
    if (formData.risk_level === "critical" && formData.effect === "allow" && !formData.description.trim()) {
      errors.description = "Critical permissions require a description explaining the security implications";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (editingPermission) {
        await updatePermission(editingPermission.id, formData);
        setSnackbar({
          open: true,
          message: "Permission updated successfully",
          severity: "success",
        });
      } else {
        await createPermission(formData);
        setSnackbar({
          open: true,
          message: "Permission created successfully",
          severity: "success",
        });
      }
      handleCloseDialog();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to save permission",
        severity: "error",
      });
    }
  };

  const handleDelete = async (permission: Permission) => {
    if (window.confirm(`Are you sure you want to delete "${permission.permission_name}"?`)) {
      try {
        await deletePermission(permission.id);
        setSnackbar({
          open: true,
          message: "Permission deleted successfully",
          severity: "success",
        });
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error.message || "Failed to delete permission",
          severity: "error",
        });
      }
    }
    setAnchorEl(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, permission: Permission) => {
    setAnchorEl(event.currentTarget);
    setSelectedPermission(permission);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPermission(null);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "error";
      case "high":
        return "warning";
      case "medium":
        return "info";
      case "low":
        return "success";
      default:
        return "default";
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case "critical":
      case "high":
        return <Warning fontSize="small" />;
      case "medium":
        return <Info fontSize="small" />;
      case "low":
        return <CheckCircle fontSize="small" />;
      default:
        return <Security fontSize="small" />;
    }
  };

  const steps = [
    {
      label: "Basic Information",
      description: "Essential permission details",
      fields: ["permission_name", "permission_category", "description"],
    },
    {
      label: "Classification",
      description: "Risk level and type settings",
      fields: ["permission_type", "risk_level", "effect"],
    },
    {
      label: "Advanced Options",
      description: "Resource scoping and delegation",
      fields: ["resource_type", "action_type", "requires_scope", "is_delegatable", "is_auditable"],
    },
  ];

  const isStepValid = (stepIndex: number): boolean => {
    const stepFields = steps[stepIndex].fields;
    return stepFields.every((field) => {
      if (field === "permission_name" && !formData.permission_name.trim()) return false;
      if (field === "permission_category" && !formData.permission_category.trim()) return false;
      if (field === "description" && formData.risk_level === "critical" && !formData.description.trim()) return false;
      return true;
    });
  };

  const handleNext = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  if (loading && permissions.length === 0) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Permission Registry
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading permissions...
        </Typography>
      </Box>
    );
  }

  // Breadcrumb configuration
  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: "dashboard",
    },
    {
      label: "RBAC Management",
      path: "/rbac",
      icon: "security",
    },
    {
      label: "Permission Registry",
      icon: "security",
      chip: {
        label: `${permissions.length} permissions`,
        color: "primary",
      },
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Breadcrumb Navigation */}
      <AppBreadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Security color="primary" />
            Permission Registry
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage tenant permissions and access control
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => (window.location.href = "/rbac")}>
            Back to RBAC
          </Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => loadPermissions()}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Create Permission
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
                  <MenuItem value="">All Types</MenuItem>
                  {types.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk Level</InputLabel>
                <Select value={riskFilter} label="Risk Level" onChange={(e) => setRiskFilter(e.target.value)}>
                  <MenuItem value="">All Levels</MenuItem>
                  {riskLevels.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("");
                  setTypeFilter("");
                  setRiskFilter("");
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Permissions Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Permission</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Risk Level</TableCell>
                <TableCell>Effect</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedPermissions.map((permission) => (
                <TableRow key={permission.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {permission.permission_name}
                      </Typography>
                      {permission.description && (
                        <Typography variant="caption" color="text.secondary">
                          {permission.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      component="code"
                      sx={{
                        bgcolor: "grey.100",
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                      }}
                    >
                      {permission.permission_code}
                    </Typography>
                  </TableCell>
                  <TableCell>{permission.permission_category}</TableCell>
                  <TableCell>
                    <Chip label={permission.permission_type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={permission.risk_level} size="small" color={getRiskLevelColor(permission.risk_level) as any} icon={getRiskLevelIcon(permission.risk_level)} />
                  </TableCell>
                  <TableCell>
                    <Chip label={permission.effect} size="small" color={permission.effect === "allow" ? "success" : "error"} variant={permission.effect === "allow" ? "outlined" : "filled"} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={permission.is_active ? "Active" : "Inactive"}
                      size="small"
                      color={permission.is_active ? "success" : "default"}
                      variant={permission.is_active ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, permission)}>
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedPermissions.length === 0 && permissions.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 6, px: 4 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Security sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                      <Typography variant="h6" gutterBottom>
                        No Permissions Created Yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Start by creating your first custom permission for this tenant
                      </Typography>
                      <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
                        Create First Permission
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              )}

              {paginatedPermissions.length === 0 && permissions.length > 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No permissions found matching your search criteria
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        setSearchTerm("");
                        setCategoryFilter("");
                        setTypeFilter("");
                        setRiskFilter("");
                        setPage(1);
                      }}
                      sx={{ mt: 1 }}
                    >
                      Clear Filters
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(e, value) => setPage(value)} color="primary" />
          </Box>
        )}
      </Card>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            handleOpenDialog(selectedPermission!);
            handleMenuClose();
          }}
        >
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit Permission
        </MenuItem>
        <MenuItem onClick={() => selectedPermission && handleDelete(selectedPermission)}>
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete Permission
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog - Enhanced with Stepper */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Security color="primary" />
              {editingPermission ? "Edit Permission" : "Create New Permission"}
            </Box>
            {!editingPermission && <Chip label={`Step ${currentStep + 1} of ${steps.length}`} size="small" color="primary" variant="outlined" />}
          </Box>
          {!editingPermission && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {steps[currentStep].description}
              </Typography>
              <LinearProgress variant="determinate" value={((currentStep + 1) / steps.length) * 100} sx={{ mt: 1, height: 6, borderRadius: 3 }} />
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ pb: 1 }}>
          {/* Permission Preview */}
          {formData.permission_name && formData.permission_code && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.permission_name}
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                    {formData.permission_code}
                  </Typography>
                </Box>
                <Chip label={formData.permission_category} size="small" variant="outlined" sx={{ ml: "auto" }} />
              </Box>
            </Alert>
          )}

          {/* Step Content */}
          <Box sx={{ minHeight: 400 }}>
            {(!editingPermission && currentStep === 0) || (editingPermission && (currentStep === 0 || showAdvanced)) ? (
              /* Step 1: Basic Information */
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Info color="primary" />
                      Basic Information
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Define the core identity and purpose of this permission
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Permission Name"
                    value={formData.permission_name}
                    onChange={(e) => handlePermissionNameChange(e.target.value)}
                    error={!!formErrors.permission_name}
                    helperText={formErrors.permission_name || "Clear, descriptive name (e.g., 'Create Projects')"}
                    required
                    placeholder="Enter a human-readable permission name"
                    InputProps={{
                      endAdornment: formData.permission_name && <CheckCircle color="success" fontSize="small" />,
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    freeSolo
                    options={categories}
                    value={formData.permission_category}
                    onChange={(e, value) => handleCategoryChange(value || "")}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Category"
                        error={!!formErrors.permission_category}
                        helperText={formErrors.permission_category || "Group related permissions (e.g., 'Project Management')"}
                        required
                        placeholder="Select or create a category"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {params.InputProps.endAdornment}
                              {formData.permission_category && <CheckCircle color="success" fontSize="small" sx={{ mr: 1 }} />}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Permission Code"
                    value={formData.permission_code}
                    onChange={(e) => setFormData({ ...formData, permission_code: e.target.value })}
                    error={!!formErrors.permission_code}
                    helperText={formErrors.permission_code || "Auto-generated unique identifier"}
                    required
                    placeholder="Automatically generated from name and category"
                    InputProps={{
                      startAdornment: (
                        <Typography variant="caption" sx={{ mr: 1, color: "text.secondary" }}>
                          CODE:
                        </Typography>
                      ),
                      endAdornment: formData.permission_code && !formErrors.permission_code && <CheckCircle color="success" fontSize="small" />,
                      sx: { fontFamily: "monospace" },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    error={!!formErrors.description}
                    helperText={formErrors.description || "Explain what actions this permission enables (required for critical permissions)"}
                    placeholder="Describe what users can do with this permission..."
                    required={formData.risk_level === "critical"}
                  />
                </Grid>
              </Grid>
            ) : null}

            {(!editingPermission && currentStep === 1) || (editingPermission && (currentStep === 1 || showAdvanced)) ? (
              /* Step 2: Classification */
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Security color="primary" />
                      Security Classification
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Configure the security level and behavioral properties
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Permission Type</InputLabel>
                    <Select value={formData.permission_type} label="Permission Type" onChange={(e) => setFormData({ ...formData, permission_type: e.target.value as any })}>
                      <MenuItem value="action">
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                          <Typography variant="body2">Action</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Allows specific operations
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="access">
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                          <Typography variant="body2">Access</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Controls visibility/entry
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="data">
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                          <Typography variant="body2">Data</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Data manipulation rights
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="administrative">
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                          <Typography variant="body2">Administrative</Typography>
                          <Typography variant="caption" color="text.secondary">
                            System configuration
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="system">
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                          <Typography variant="body2">System</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Core system functions
                          </Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Risk Level</InputLabel>
                    <Select value={formData.risk_level} label="Risk Level" onChange={(e) => setFormData({ ...formData, risk_level: e.target.value as any })}>
                      <MenuItem value="low">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircle fontSize="small" color="success" />
                          <Box>
                            <Typography variant="body2">Low Risk</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Minimal security impact
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                      <MenuItem value="medium">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Info fontSize="small" color="info" />
                          <Box>
                            <Typography variant="body2">Medium Risk</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Moderate security considerations
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                      <MenuItem value="high">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Warning fontSize="small" color="warning" />
                          <Box>
                            <Typography variant="body2">High Risk</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Requires careful assignment
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                      <MenuItem value="critical">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Warning fontSize="small" color="error" />
                          <Box>
                            <Typography variant="body2">Critical Risk</Typography>
                            <Typography variant="caption" color="text.secondary">
                              May require approval
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  {/* Risk Level Warning */}
                  {(formData.risk_level === "high" || formData.risk_level === "critical") && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="caption">
                        {formData.risk_level === "critical" ? "Critical permissions may require approval before assignment" : "High-risk permissions should be assigned carefully"}
                      </Typography>
                    </Alert>
                  )}
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Effect</InputLabel>
                    <Select value={formData.effect} label="Effect" onChange={(e) => setFormData({ ...formData, effect: e.target.value as any })}>
                      <MenuItem value="allow">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircle fontSize="small" color="success" />
                          <Box>
                            <Typography variant="body2">Allow</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Grants access/capability
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                      <MenuItem value="deny">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Warning fontSize="small" color="error" />
                          <Box>
                            <Typography variant="body2">Deny</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Explicitly blocks access
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            ) : null}

            {(!editingPermission && currentStep === 2) || (editingPermission && showAdvanced) ? (
              /* Step 3: Advanced Options */
              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Security color="primary" />
                      Advanced Configuration
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Optional settings for resource scoping and delegation
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Resource Type"
                    value={formData.resource_type}
                    onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                    placeholder="e.g., project, user, site"
                    helperText="What type of resource this permission applies to (optional)"
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Action Type"
                    value={formData.action_type}
                    onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                    placeholder="e.g., create, read, update, delete"
                    helperText="Specific action this permission enables (optional)"
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Permission Behaviors
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <FormControlLabel
                        control={<Switch checked={formData.requires_scope} onChange={(e) => setFormData({ ...formData, requires_scope: e.target.checked })} />}
                        label={
                          <Box>
                            <Typography variant="body2">Requires Scope</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Permission must be scoped to specific resources
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        control={<Switch checked={formData.is_delegatable} onChange={(e) => setFormData({ ...formData, is_delegatable: e.target.checked })} />}
                        label={
                          <Box>
                            <Typography variant="body2">Delegatable</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Users can delegate this permission to others
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        control={<Switch checked={formData.is_auditable} onChange={(e) => setFormData({ ...formData, is_auditable: e.target.checked })} />}
                        label={
                          <Box>
                            <Typography variant="body2">Auditable</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Usage of this permission will be logged
                            </Typography>
                          </Box>
                        }
                      />
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            ) : null}

            {/* Show Advanced Toggle for Edit Mode */}
            {editingPermission && (
              <Box sx={{ mt: 3, textAlign: "center" }}>
                <Button variant="outlined" onClick={() => setShowAdvanced(!showAdvanced)} startIcon={showAdvanced ? <Warning /> : <Add />}>
                  {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
          {/* Left side - Previous/Cancel */}
          <Box>
            {!editingPermission && currentStep > 0 ? (
              <Button onClick={handlePrevious} disabled={loading}>
                Previous
              </Button>
            ) : (
              <Button onClick={handleCloseDialog} disabled={loading}>
                Cancel
              </Button>
            )}
          </Box>

          {/* Right side - Next/Create */}
          <Box sx={{ display: "flex", gap: 1 }}>
            {!editingPermission && currentStep < steps.length - 1 ? (
              <Button variant="contained" onClick={handleNext} disabled={!isStepValid(currentStep)} endIcon={<Add />}>
                Next: {steps[currentStep + 1].label}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleSubmit} disabled={loading || !formData.permission_name || !formData.permission_code} startIcon={editingPermission ? <Edit /> : <Add />}>
                {loading ? "Saving..." : editingPermission ? "Update Permission" : "Create Permission"}
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default PermissionRegistryPage;

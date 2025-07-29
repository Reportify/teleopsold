/**
 * Permission Groups Management Page
 * Provides comprehensive group management with CRUD operations, user assignments, and permission management
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
  Tab,
  Tabs,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Tooltip,
  Checkbox,
  Collapse,
  Badge,
  Stack,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Search,
  FilterList,
  Refresh,
  Group,
  Person,
  Security,
  ArrowBack,
  Assignment,
  CheckCircle,
  Warning,
  Info,
  People,
  Key,
  Settings,
  Visibility,
  ExpandMore,
  ExpandLess,
  Clear,
  SelectAll,
  PlaylistAddCheck,
  ClearAll,
  Remove,
} from "@mui/icons-material";
import { useRBAC } from "../hooks/useRBAC";
import { PermissionGroup, Permission, CreatePermissionGroupData, UpdatePermissionGroupData, rbacAPI } from "../services/rbacAPI";
import { ModernSnackbar, AppBreadcrumbs } from "../components";
import EmptyState from "../components/EmptyState";
import type { BreadcrumbItem } from "../components";

interface GroupFormData {
  group_name: string;
  group_code: string;
  description: string;
  group_type: "functional" | "project" | "temporary" | "administrative" | "basic" | "operational";
  is_assignable: boolean;
  auto_assign_conditions: Record<string, any>;
}

const defaultFormData: GroupFormData = {
  group_name: "",
  group_code: "",
  description: "",
  group_type: "functional",
  is_assignable: true,
  auto_assign_conditions: {},
};

const PermissionGroupsPage: React.FC = () => {
  const {
    state: { permissionGroups, permissions, loading, error },
    loadPermissionGroups,
    loadPermissions,
    createPermissionGroup,
    updatePermissionGroup,
    deletePermissionGroup,
  } = useRBAC();

  // UI State
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTab, setDialogTab] = useState(0);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
  const [formData, setFormData] = useState<GroupFormData>(defaultFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroup | null>(null);

  // Filters and Search
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  // Selected permissions for group
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  // Permission filters
  const [permSearchTerm, setPermSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState("");
  const [permissionTypeFilter, setPermissionTypeFilter] = useState("");
  const [showSelected, setShowSelected] = useState(false);

  // View permissions dialog
  const [viewPermissionsDialog, setViewPermissionsDialog] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<PermissionGroup | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  useEffect(() => {
    if (permissionGroups.length === 0) {
      loadPermissionGroups();
    }
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

  // Filter permissions based on criteria
  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch =
      permission.permission_name.toLowerCase().includes(permSearchTerm.toLowerCase()) ||
      permission.permission_code.toLowerCase().includes(permSearchTerm.toLowerCase()) ||
      permission.description?.toLowerCase().includes(permSearchTerm.toLowerCase());

    const matchesCategory = !categoryFilter || permission.permission_category === categoryFilter;
    const matchesRiskLevel = !riskLevelFilter || permission.risk_level === riskLevelFilter;
    const matchesType = !permissionTypeFilter || permission.permission_type === permissionTypeFilter;
    const matchesSelected = !showSelected || selectedPermissions.includes(permission.id);

    return matchesSearch && matchesCategory && matchesRiskLevel && matchesType && matchesSelected;
  });

  // Filter and search logic
  const filteredGroups = permissionGroups.filter((group) => {
    const matchesSearch =
      group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.group_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !typeFilter || group.group_type === typeFilter;
    const matchesStatus = !statusFilter || (statusFilter === "active" ? group.is_active : !group.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredGroups.length / rowsPerPage);
  const paginatedGroups = filteredGroups.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // Get unique values for filters
  const groupTypes = Array.from(new Set(permissionGroups.map((g) => g.group_type)));
  const categories = Array.from(new Set(permissions.map((p) => p.permission_category))).sort();
  const permissionTypes = Array.from(new Set(permissions.map((p) => p.permission_type))).sort();

  // Helper function to generate group code from name
  const generateGroupCode = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  };

  const handleGroupNameChange = (name: string) => {
    setFormData((prev) => {
      const newCode = !editingGroup && !prev.group_code ? generateGroupCode(name) : prev.group_code;

      return {
        ...prev,
        group_name: name,
        group_code: newCode,
      };
    });
  };

  const handleOpenDialog = (group?: PermissionGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        group_name: group.group_name,
        group_code: group.group_code,
        description: group.description || "",
        group_type: group.group_type,
        is_assignable: group.is_assignable,
        auto_assign_conditions: group.auto_assign_conditions,
      });
      // Set selected permissions if group has permissions
      const groupPermissions = group.group_permissions?.map((gp) => gp.permission) || group.permissions?.map((p) => (typeof p === "number" ? p : p.id)) || [];
      setSelectedPermissions(groupPermissions);
    } else {
      setEditingGroup(null);
      setFormData(defaultFormData);
      setSelectedPermissions([]);
    }
    setFormErrors({});
    setDialogTab(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGroup(null);
    setFormData(defaultFormData);
    setFormErrors({});
    setSelectedPermissions([]);
    setDialogTab(0);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields validation
    if (!formData.group_name.trim()) {
      errors.group_name = "Group name is required";
    } else if (formData.group_name.length < 3) {
      errors.group_name = "Group name must be at least 3 characters";
    } else if (formData.group_name.length > 100) {
      errors.group_name = "Group name must be less than 100 characters";
    }

    if (!formData.group_code.trim()) {
      errors.group_code = "Group code is required";
    } else if (!/^[a-z0-9_]+$/.test(formData.group_code)) {
      errors.group_code = "Group code can only contain lowercase letters, numbers, and underscores";
    } else if (formData.group_code.length < 3) {
      errors.group_code = "Group code must be at least 3 characters";
    } else if (formData.group_code.length > 50) {
      errors.group_code = "Group code must be less than 50 characters";
    } else {
      // Check for duplicate codes (excluding current group when editing)
      const duplicateGroup = permissionGroups.find((g) => g.group_code === formData.group_code && (!editingGroup || g.id !== editingGroup.id));
      if (duplicateGroup) {
        errors.group_code = "Group code already exists";
      }
    }

    // Business validation
    if (formData.group_type === "temporary" && !formData.description.trim()) {
      errors.description = "Temporary groups require a description explaining their purpose and duration";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (editingGroup) {
        // For updates, prepare UpdatePermissionGroupData
        const updateData: UpdatePermissionGroupData = {
          group_name: formData.group_name,
          group_code: formData.group_code,
          description: formData.description,
          group_type: formData.group_type,
          is_assignable: formData.is_assignable,
          auto_assign_conditions: formData.auto_assign_conditions,
          permissions: selectedPermissions,
        };

        await updatePermissionGroup(editingGroup.id, updateData);
        setSnackbar({
          open: true,
          message: "Permission group updated successfully",
          severity: "success",
        });
      } else {
        // For creation, prepare CreatePermissionGroupData
        const createData: CreatePermissionGroupData = {
          group_name: formData.group_name,
          group_code: formData.group_code,
          description: formData.description,
          group_type: formData.group_type,
          is_assignable: formData.is_assignable,
          auto_assign_conditions: formData.auto_assign_conditions,
          permissions: selectedPermissions,
        };

        await createPermissionGroup(createData);
        setSnackbar({
          open: true,
          message: "Permission group created successfully",
          severity: "success",
        });
      }
      handleCloseDialog();
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to save permission group",
        severity: "error",
      });
    }
  };

  const handleDelete = async (group: PermissionGroup) => {
    if (window.confirm(`Are you sure you want to delete the group "${group.group_name}"?`)) {
      try {
        await deletePermissionGroup(group.id);
        setSnackbar({
          open: true,
          message: "Permission group deleted successfully",
          severity: "success",
        });
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error.message || "Failed to delete permission group",
          severity: "error",
        });
      }
    }
    setAnchorEl(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, group: PermissionGroup) => {
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGroup(null);
  };

  const handleViewPermissions = (group: PermissionGroup) => {
    setViewingGroup(group);
    setViewPermissionsDialog(true);
  };

  const handleCloseViewPermissions = () => {
    setViewPermissionsDialog(false);
    setViewingGroup(null);
  };

  const handleRemovePermissionFromGroup = async (groupId: number, permissionId: number, permissionName: string) => {
    if (window.confirm(`Remove permission "${permissionName}" from this group? Users in this group will lose this permission naturally.`)) {
      try {
        const result = await rbacAPI.bulkRevokePermissions({
          permission_ids: [permissionId],
          target_type: "groups",
          target_ids: [groupId],
          reason: `Removed permission from group via management interface`,
        });

        if (result.success) {
          const groupResult = result.results[0];
          setSnackbar({
            open: true,
            message: `Permission removed from group. ${groupResult.users_affected} users affected.`,
            severity: "success",
          });
          // Refresh group data
          loadPermissionGroups();
          // Close and reopen the permissions dialog to refresh
          if (viewingGroup && viewingGroup.id === groupId) {
            const updatedGroup = permissionGroups.find((g) => g.id === groupId);
            if (updatedGroup) {
              setViewingGroup(updatedGroup);
            }
          }
        }
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error.message || "Failed to remove permission from group",
          severity: "error",
        });
      }
    }
  };

  const getGroupTypeColor = (type: string) => {
    switch (type) {
      case "functional":
        return "primary";
      case "project":
        return "secondary";
      case "temporary":
        return "warning";
      case "administrative":
        return "error";
      default:
        return "default";
    }
  };

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case "functional":
        return <Group fontSize="small" />;
      case "project":
        return <Assignment fontSize="small" />;
      case "temporary":
        return <Warning fontSize="small" />;
      case "administrative":
        return <Settings fontSize="small" />;
      default:
        return <Group fontSize="small" />;
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
      case "low":
        return "success";
      default:
        return "default";
    }
  };

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
      label: "Permission Groups",
      icon: "group",
      chip: {
        label: `${permissionGroups.length} groups`,
        color: "primary",
      },
    },
  ];

  if (loading && permissionGroups.length === 0) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Permission Groups
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading permission groups...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Breadcrumb Navigation */}
      <AppBreadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Group color="primary" />
            Permission Groups
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage role-based permission groups and assignments
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => (window.location.href = "/rbac")}>
            Back to RBAC
          </Button>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => loadPermissionGroups()}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Create Group
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ bgcolor: "primary.main" }}>
                <Group />
              </Avatar>
              <Box>
                <Typography variant="h6">{permissionGroups.length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Groups
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ bgcolor: "success.main" }}>
                <CheckCircle />
              </Avatar>
              <Box>
                <Typography variant="h6">{permissionGroups.filter((g) => g.is_active).length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Groups
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ bgcolor: "secondary.main" }}>
                <People />
              </Avatar>
              <Box>
                <Typography variant="h6">{permissionGroups.filter((g) => g.is_assignable).length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Assignable Groups
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ bgcolor: "warning.main" }}>
                <Security />
              </Avatar>
              <Box>
                <Typography variant="h6">{permissionGroups.filter((g) => g.is_system_group).length}</Typography>
                <Typography variant="body2" color="text.secondary">
                  System Groups
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
                  <MenuItem value="">All Types</MenuItem>
                  {groupTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("");
                  setStatusFilter("");
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Groups Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Group</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Properties</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedGroups.map((group) => (
                <TableRow key={group.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {group.group_name}
                      </Typography>
                      {group.description && (
                        <Typography variant="caption" color="text.secondary">
                          {group.description}
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
                      {group.group_code}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={group.group_type} size="small" color={getGroupTypeColor(group.group_type) as any} icon={getGroupTypeIcon(group.group_type)} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Tooltip
                        title={
                          group.group_permissions && group.group_permissions.length > 0
                            ? `Permissions: ${group.group_permissions
                                .map((gp) => gp.permission_name)
                                .slice(0, 3)
                                .join(", ")}${group.group_permissions.length > 3 ? "..." : ""}`
                            : "No permissions assigned"
                        }
                        placement="top"
                      >
                        <Chip
                          label={`${group.group_permissions?.length || 0} permissions`}
                          size="small"
                          variant="outlined"
                          color={(group.group_permissions?.length || 0) > 0 ? "primary" : "default"}
                        />
                      </Tooltip>
                      {(group.group_permissions?.length || 0) > 0 && (
                        <Tooltip title="View all assigned permissions">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPermissions(group);
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={group.is_active ? "Active" : "Inactive"} size="small" color={group.is_active ? "success" : "default"} variant={group.is_active ? "filled" : "outlined"} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {group.is_system_group && (
                        <Tooltip title="System Group">
                          <Chip label="System" size="small" color="error" variant="outlined" />
                        </Tooltip>
                      )}
                      {group.is_assignable && (
                        <Tooltip title="User Assignable">
                          <Chip label="Assignable" size="small" color="primary" variant="outlined" />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, group)}>
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedGroups.length === 0 && permissionGroups.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 6, px: 4 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Group sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                      <Typography variant="h6" fontWeight={600} gutterBottom>
                        No Permission Groups Created Yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: "auto" }}>
                        Start by creating your first permission group for role-based access management. Groups help organize permissions and simplify user access control.
                      </Typography>
                      <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()} size="large">
                        Create First Group
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              )}

              {paginatedGroups.length === 0 && permissionGroups.length > 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No groups found matching your search criteria
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        setSearchTerm("");
                        setTypeFilter("");
                        setStatusFilter("");
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
            handleViewPermissions(selectedGroup!);
            handleMenuClose();
          }}
        >
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          View Permissions
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleOpenDialog(selectedGroup!);
            handleMenuClose();
          }}
        >
          <Edit sx={{ mr: 1 }} fontSize="small" />
          Edit Group
        </MenuItem>
        <MenuItem onClick={() => selectedGroup && handleDelete(selectedGroup)}>
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete Group
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Group color="primary" />
            {editingGroup ? "Edit Permission Group" : "Create New Permission Group"}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pb: 1 }}>
          {/* Group Preview */}
          {formData.group_name && formData.group_code && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {formData.group_name}
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                    {formData.group_code}
                  </Typography>
                </Box>
                <Chip label={formData.group_type} size="small" variant="outlined" sx={{ ml: "auto" }} />
              </Box>
            </Alert>
          )}

          {/* Tabs for different sections */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs value={dialogTab} onChange={(e, newValue) => setDialogTab(newValue)}>
              <Tab icon={<Info />} label="Basic Information" />
              <Tab icon={<Key />} label="Permissions" />
              <Tab icon={<Settings />} label="Advanced Settings" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          {dialogTab === 0 && (
            /* Basic Information Tab */
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Group Name"
                  value={formData.group_name}
                  onChange={(e) => handleGroupNameChange(e.target.value)}
                  error={!!formErrors.group_name}
                  helperText={formErrors.group_name || "Descriptive name for this group"}
                  required
                  placeholder="e.g., Project Managers"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Group Code"
                  value={formData.group_code}
                  onChange={(e) => setFormData({ ...formData, group_code: e.target.value })}
                  error={!!formErrors.group_code}
                  helperText={formErrors.group_code || "Unique identifier (auto-generated)"}
                  required
                  placeholder="e.g., project_managers"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Group Type</InputLabel>
                  <Select value={formData.group_type} label="Group Type" onChange={(e) => setFormData({ ...formData, group_type: e.target.value as any })}>
                    <MenuItem value="functional">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Group fontSize="small" />
                        <Box>
                          <Typography variant="body2">Functional</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Role-based groups (e.g., Managers, Engineers)
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                    <MenuItem value="project">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Assignment fontSize="small" />
                        <Box>
                          <Typography variant="body2">Project</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Project-specific groups
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                    <MenuItem value="temporary">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Warning fontSize="small" />
                        <Box>
                          <Typography variant="body2">Temporary</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Time-limited groups
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                    <MenuItem value="administrative">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Settings fontSize="small" />
                        <Box>
                          <Typography variant="body2">Administrative</Typography>
                          <Typography variant="caption" color="text.secondary">
                            System administration groups
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                  control={<Switch checked={formData.is_assignable} onChange={(e) => setFormData({ ...formData, is_assignable: e.target.checked })} />}
                  label={
                    <Box>
                      <Typography variant="body2">User Assignable</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Allow users to be assigned to this group
                      </Typography>
                    </Box>
                  }
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
                  helperText={formErrors.description || "Describe the purpose and scope of this group"}
                  placeholder="Explain what this group is for and who should be assigned to it..."
                  required={formData.group_type === "temporary"}
                />
              </Grid>
            </Grid>
          )}

          {dialogTab === 1 && (
            /* Permissions Tab */
            <Box>
              <Typography variant="h6" gutterBottom>
                Assign Permissions to Group
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select permissions that members of this group will inherit. Use filters to find specific permissions quickly.
              </Typography>

              {/* Filters Section */}
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    {/* Search */}
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Search permissions..."
                        value={permSearchTerm}
                        onChange={(e) => setPermSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} fontSize="small" />,
                        }}
                      />
                    </Grid>

                    {/* Category Filter */}
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

                    {/* Risk Level Filter */}
                    <Grid size={{ xs: 12, md: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Risk Level</InputLabel>
                        <Select value={riskLevelFilter} label="Risk Level" onChange={(e) => setRiskLevelFilter(e.target.value)}>
                          <MenuItem value="">All Risk Levels</MenuItem>
                          {["low", "medium", "high", "critical"].map((level) => (
                            <MenuItem key={level} value={level}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Chip size="small" label={level.charAt(0).toUpperCase() + level.slice(1)} color={getRiskLevelColor(level) as any} variant="outlined" />
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Type Filter */}
                    <Grid size={{ xs: 12, md: 2 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Type</InputLabel>
                        <Select value={permissionTypeFilter} label="Type" onChange={(e) => setPermissionTypeFilter(e.target.value)}>
                          <MenuItem value="">All Types</MenuItem>
                          {permissionTypes.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* View Options */}
                    <Grid size={{ xs: 12, md: 3 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FormControlLabel control={<Checkbox size="small" checked={showSelected} onChange={(e) => setShowSelected(e.target.checked)} />} label="Show selected only" />
                        <Button
                          size="small"
                          startIcon={<Clear />}
                          onClick={() => {
                            setPermSearchTerm("");
                            setCategoryFilter("");
                            setRiskLevelFilter("");
                            setPermissionTypeFilter("");
                            setShowSelected(false);
                          }}
                          variant="outlined"
                        >
                          Clear
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Action Bar */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {filteredPermissions.length} permissions found • {selectedPermissions.length} selected
                  </Typography>
                  <Badge badgeContent={selectedPermissions.length} color="primary" max={999}>
                    <PlaylistAddCheck color="action" />
                  </Badge>
                </Box>

                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button size="small" startIcon={<SelectAll />} onClick={() => setSelectedPermissions(filteredPermissions.map((p) => p.id))} variant="outlined">
                    {filteredPermissions.every((p) => selectedPermissions.includes(p.id)) ? "Deselect All" : "Select All"} Filtered
                  </Button>
                  <Button size="small" startIcon={<ClearAll />} onClick={() => setSelectedPermissions([])} variant="outlined" color="error">
                    Clear All
                  </Button>
                </Box>
              </Box>

              {/* Permissions Grid by Category */}
              <Stack spacing={2}>
                {Array.from(new Set(filteredPermissions.map((p) => p.permission_category)))
                  .sort()
                  .map((category) => {
                    const categoryPermissions = filteredPermissions.filter((p) => p.permission_category === category);
                    const categorySelectedCount = categoryPermissions.filter((p) => selectedPermissions.includes(p.id)).length;

                    return (
                      <Card key={category} variant="outlined">
                        <CardContent>
                          {/* Category Header */}
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {category}
                              </Typography>
                              <Chip
                                size="small"
                                label={`${categorySelectedCount}/${categoryPermissions.length}`}
                                color={categorySelectedCount === categoryPermissions.length ? "success" : "default"}
                                variant="outlined"
                              />
                            </Box>

                            <Button
                              size="small"
                              onClick={() => {
                                const categoryIds = categoryPermissions.map((p) => p.id);
                                const allSelected = categoryIds.every((id) => selectedPermissions.includes(id));
                                if (allSelected) {
                                  setSelectedPermissions((prev) => prev.filter((id) => !categoryIds.includes(id)));
                                } else {
                                  setSelectedPermissions((prev) => Array.from(new Set([...prev, ...categoryIds])));
                                }
                              }}
                              variant="outlined"
                              startIcon={categorySelectedCount === categoryPermissions.length ? <Clear /> : <SelectAll />}
                            >
                              {categorySelectedCount === categoryPermissions.length ? "Deselect All" : "Select All"}
                            </Button>
                          </Box>

                          {/* Permissions Grid */}
                          <Grid container spacing={2}>
                            {categoryPermissions.map((permission) => {
                              const isSelected = selectedPermissions.includes(permission.id);

                              return (
                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={permission.id}>
                                  <Card
                                    variant="outlined"
                                    sx={{
                                      cursor: "pointer",
                                      transition: "all 0.2s",
                                      border: isSelected ? 2 : 1,
                                      borderColor: isSelected ? "primary.main" : "divider",
                                      bgcolor: isSelected ? "primary.50" : "background.paper",
                                      "&:hover": {
                                        borderColor: "primary.main",
                                        bgcolor: isSelected ? "primary.100" : "action.hover",
                                      },
                                    }}
                                    onClick={() => {
                                      const newSelected = isSelected ? selectedPermissions.filter((id) => id !== permission.id) : [...selectedPermissions, permission.id];
                                      setSelectedPermissions(newSelected);
                                    }}
                                  >
                                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                                        <Checkbox
                                          checked={isSelected}
                                          onChange={() => {
                                            const newSelected = isSelected ? selectedPermissions.filter((id) => id !== permission.id) : [...selectedPermissions, permission.id];
                                            setSelectedPermissions(newSelected);
                                          }}
                                          size="small"
                                          color="primary"
                                        />
                                        <Chip size="small" label={permission.risk_level} color={getRiskLevelColor(permission.risk_level) as any} variant="outlined" />
                                      </Box>

                                      <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                                        {permission.permission_name}
                                      </Typography>

                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                          display: "block",
                                          mb: 1,
                                          fontFamily: "monospace",
                                          fontSize: "0.75rem",
                                        }}
                                      >
                                        {permission.permission_code}
                                      </Typography>

                                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                        <Chip size="small" label={permission.permission_type} variant="outlined" sx={{ fontSize: "0.7rem" }} />
                                        {permission.is_system_permission && <Chip size="small" label="System" color="warning" variant="outlined" sx={{ fontSize: "0.7rem" }} />}
                                      </Box>

                                      {permission.description && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{
                                            display: "block",
                                            mt: 1,
                                            fontSize: "0.75rem",
                                            lineHeight: 1.3,
                                          }}
                                        >
                                          {permission.description.length > 80 ? `${permission.description.substring(0, 80)}...` : permission.description}
                                        </Typography>
                                      )}
                                    </CardContent>
                                  </Card>
                                </Grid>
                              );
                            })}
                          </Grid>
                        </CardContent>
                      </Card>
                    );
                  })}
              </Stack>

              {/* No Results State */}
              {filteredPermissions.length === 0 && (
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: "center", py: 4 }}>
                    <Key sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      No permissions found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Try adjusting your search criteria or filters
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setPermSearchTerm("");
                        setCategoryFilter("");
                        setRiskLevelFilter("");
                        setPermissionTypeFilter("");
                        setShowSelected(false);
                      }}
                      startIcon={<Clear />}
                    >
                      Clear all filters
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Selected Permissions Summary */}
              {selectedPermissions.length > 0 && (
                <Card variant="outlined" sx={{ mt: 3, border: 2, borderColor: "primary.main" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Typography variant="h6" color="primary">
                        Selected Permissions ({selectedPermissions.length})
                      </Typography>
                      <Button size="small" startIcon={<ClearAll />} onClick={() => setSelectedPermissions([])} variant="outlined" color="error">
                        Clear All
                      </Button>
                    </Box>

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {permissions
                        .filter((p) => selectedPermissions.includes(p.id))
                        .map((permission) => (
                          <Chip
                            key={permission.id}
                            label={permission.permission_name}
                            size="small"
                            color="primary"
                            variant="filled"
                            onDelete={() => setSelectedPermissions((prev) => prev.filter((id) => id !== permission.id))}
                            sx={{
                              "& .MuiChip-deleteIcon": {
                                color: "primary.contrastText",
                                "&:hover": { color: "error.main" },
                              },
                            }}
                          />
                        ))}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {dialogTab === 2 && (
            /* Advanced Settings Tab */
            <Box>
              <Typography variant="h6" gutterBottom>
                Advanced Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure advanced group settings and automation rules
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Coming Soon:</strong> Advanced group settings including auto-assignment rules, inheritance policies, and approval workflows will be available in a future update.
                </Typography>
              </Alert>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Auto-Assignment Conditions
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Define conditions for automatically assigning users to this group
                      </Typography>
                      <TextField
                        fullWidth
                        label="JSON Configuration"
                        multiline
                        rows={4}
                        value={JSON.stringify(formData.auto_assign_conditions, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            setFormData({ ...formData, auto_assign_conditions: parsed });
                          } catch {
                            // Invalid JSON, keep current value
                          }
                        }}
                        placeholder='{"department": "engineering", "role": "senior"}'
                        helperText="JSON object defining auto-assignment criteria"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading || !formData.group_name || !formData.group_code} startIcon={editingGroup ? <Edit /> : <Add />}>
            {loading ? "Saving..." : editingGroup ? "Update Group" : "Create Group"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Permissions Dialog */}
      <Dialog open={viewPermissionsDialog} onClose={handleCloseViewPermissions} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Key color="primary" />
            Permissions for "{viewingGroup?.group_name}"
          </Box>
        </DialogTitle>

        <DialogContent>
          {viewingGroup && (
            <Box>
              {/* Group Summary */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {viewingGroup.group_name}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                      {viewingGroup.group_code}
                    </Typography>
                  </Box>
                  <Chip label={viewingGroup.group_type} size="small" variant="outlined" />
                  <Chip label={`${viewingGroup.group_permissions?.length || 0} permissions`} size="small" color="primary" variant="filled" sx={{ ml: "auto" }} />
                </Box>
              </Alert>

              {/* Permissions List */}
              {viewingGroup.group_permissions && viewingGroup.group_permissions.length > 0 ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Assigned Permissions ({viewingGroup.group_permissions.length})
                  </Typography>

                  <Grid container spacing={2}>
                    {viewingGroup.group_permissions.map((groupPermission) => (
                      <Grid size={{ xs: 12, sm: 6 }} key={groupPermission.id}>
                        <Card variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {groupPermission.permission_name}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                              <Chip
                                label={groupPermission.risk_level}
                                size="small"
                                color={
                                  groupPermission.risk_level === "critical" ? "error" : groupPermission.risk_level === "high" ? "warning" : groupPermission.risk_level === "medium" ? "info" : "success"
                                }
                                variant="outlined"
                              />
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemovePermissionFromGroup(viewingGroup.id, groupPermission.permission, groupPermission.permission_name)}
                                title="Remove permission from group"
                              >
                                <Remove fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                            {groupPermission.permission_code}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            <Chip label={groupPermission.permission_category} size="small" variant="outlined" />
                            <Chip label={groupPermission.permission_level} size="small" variant="outlined" />
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Key sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Permissions Assigned
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This group doesn't have any permissions assigned yet.
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => {
                      handleCloseViewPermissions();
                      handleOpenDialog(viewingGroup);
                    }}
                  >
                    Assign Permissions
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseViewPermissions}>Close</Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => {
              handleCloseViewPermissions();
              handleOpenDialog(viewingGroup!);
            }}
          >
            Edit Group
          </Button>
        </DialogActions>
      </Dialog>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default PermissionGroupsPage;

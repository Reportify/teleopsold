// Permission Registry Management Page
import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Tabs,
  Tab,
  Autocomplete,
  Tooltip,
  Menu,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Add, Edit, Delete, MoreVert, Security, Warning, Info, CheckCircle, FilterList, Search, Visibility, Code, Category, Assignment, Shield, Key, Lock } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { ModernSnackbar } from "../components";

interface Permission {
  id: number;
  permission_name: string;
  permission_code: string;
  permission_category: string;
  description: string;
  permission_type: string;
  risk_level: string;
  resource_type: string;
  action_type: string;
  is_system_permission: boolean;
  requires_scope: boolean;
  is_delegatable: boolean;
  is_active: boolean;
  is_auditable: boolean;
  usage_count: number;
  created_at: string;
  created_by_name: string;
}

interface PermissionForm {
  permission_name: string;
  permission_code: string;
  permission_category: string;
  description: string;
  permission_type: string;
  risk_level: string;
  resource_type: string;
  action_type: string;
  is_system_permission: boolean;
  requires_scope: boolean;
  is_delegatable: boolean;
  is_auditable: boolean;
}

const PermissionRegistryPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  const [formData, setFormData] = useState<PermissionForm>({
    permission_name: "",
    permission_code: "",
    permission_category: "",
    description: "",
    permission_type: "action",
    risk_level: "low",
    resource_type: "",
    action_type: "",
    is_system_permission: false,
    requires_scope: false,
    is_delegatable: true,
    is_auditable: true,
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });

  const currentTenant = getCurrentTenant();

  // Permission categories and types
  const permissionCategories = [
    "User Management",
    "Data Access",
    "Administrative",
    "System",
    "Project Management",
    "Billing & Finance",
    "Reports & Analytics",
    "Equipment",
    "Sites",
    "Tasks",
    "Teams",
    "Custom",
  ];

  const permissionTypes = [
    { value: "action", label: "Action" },
    { value: "access", label: "Access" },
    { value: "data", label: "Data" },
    { value: "administrative", label: "Administrative" },
    { value: "system", label: "System" },
  ];

  const riskLevels = [
    { value: "low", label: "Low", color: "success" },
    { value: "medium", label: "Medium", color: "info" },
    { value: "high", label: "High", color: "warning" },
    { value: "critical", label: "Critical", color: "error" },
  ];

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // Mock data for demonstration
      const mockPermissions: Permission[] = [
        {
          id: 1,
          permission_name: "View User Profiles",
          permission_code: "users.view_profiles",
          permission_category: "User Management",
          description: "Allows viewing of user profile information",
          permission_type: "access",
          risk_level: "low",
          resource_type: "user_profile",
          action_type: "view",
          is_system_permission: false,
          requires_scope: true,
          is_delegatable: true,
          is_active: true,
          is_auditable: true,
          usage_count: 25,
          created_at: "2025-01-15T10:00:00Z",
          created_by_name: "Admin User",
        },
        {
          id: 2,
          permission_name: "Delete User Accounts",
          permission_code: "users.delete_accounts",
          permission_category: "User Management",
          description: "Allows permanent deletion of user accounts",
          permission_type: "action",
          risk_level: "critical",
          resource_type: "user_account",
          action_type: "delete",
          is_system_permission: false,
          requires_scope: true,
          is_delegatable: false,
          is_active: true,
          is_auditable: true,
          usage_count: 3,
          created_at: "2025-01-10T14:30:00Z",
          created_by_name: "System Admin",
        },
        {
          id: 3,
          permission_name: "Generate Financial Reports",
          permission_code: "reports.financial_generate",
          permission_category: "Reports & Analytics",
          description: "Create and export financial reports",
          permission_type: "action",
          risk_level: "medium",
          resource_type: "financial_report",
          action_type: "generate",
          is_system_permission: false,
          requires_scope: false,
          is_delegatable: true,
          is_active: true,
          is_auditable: true,
          usage_count: 12,
          created_at: "2025-01-18T09:15:00Z",
          created_by_name: "Finance Admin",
        },
      ];
      setPermissions(mockPermissions);
    } catch (error) {
      console.error("Failed to load permissions:", error);
      setSnackbar({
        open: true,
        message: "Failed to load permissions",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = () => {
    setEditingPermission(null);
    setFormData({
      permission_name: "",
      permission_code: "",
      permission_category: "",
      description: "",
      permission_type: "action",
      risk_level: "low",
      resource_type: "",
      action_type: "",
      is_system_permission: false,
      requires_scope: false,
      is_delegatable: true,
      is_auditable: true,
    });
    setDialogOpen(true);
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setFormData({
      permission_name: permission.permission_name,
      permission_code: permission.permission_code,
      permission_category: permission.permission_category,
      description: permission.description,
      permission_type: permission.permission_type,
      risk_level: permission.risk_level,
      resource_type: permission.resource_type,
      action_type: permission.action_type,
      is_system_permission: permission.is_system_permission,
      requires_scope: permission.requires_scope,
      is_delegatable: permission.is_delegatable,
      is_auditable: permission.is_auditable,
    });
    setDialogOpen(true);
  };

  const handleSavePermission = async () => {
    try {
      // TODO: Replace with actual API call
      if (editingPermission) {
        // Update existing permission
        console.log("Updating permission:", formData);
      } else {
        // Create new permission
        console.log("Creating permission:", formData);
      }

      setSnackbar({
        open: true,
        message: `Permission ${editingPermission ? "updated" : "created"} successfully`,
        severity: "success",
      });

      setDialogOpen(false);
      loadPermissions();
    } catch (error) {
      console.error("Failed to save permission:", error);
      setSnackbar({
        open: true,
        message: "Failed to save permission",
        severity: "error",
      });
    }
  };

  const generatePermissionCode = (name: string, category: string) => {
    const categoryMap: Record<string, string> = {
      "User Management": "users",
      "Data Access": "data",
      Administrative: "admin",
      System: "system",
      "Project Management": "projects",
      "Billing & Finance": "billing",
      "Reports & Analytics": "reports",
      Equipment: "equipment",
      Sites: "sites",
      Tasks: "tasks",
      Teams: "teams",
      Custom: "custom",
    };

    const prefix = categoryMap[category] || "custom";
    const suffix = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");

    return `${prefix}.${suffix}`;
  };

  const getFilteredPermissions = () => {
    let filtered = permissions;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((p) => p.permission_name.toLowerCase().includes(search) || p.permission_code.toLowerCase().includes(search) || p.description.toLowerCase().includes(search));
    }

    if (categoryFilter) {
      filtered = filtered.filter((p) => p.permission_category === categoryFilter);
    }

    if (riskFilter) {
      filtered = filtered.filter((p) => p.risk_level === riskFilter);
    }

    if (tabValue === 1) {
      filtered = filtered.filter((p) => p.risk_level === "high" || p.risk_level === "critical");
    } else if (tabValue === 2) {
      filtered = filtered.filter((p) => !p.is_active);
    }

    return filtered;
  };

  const getRiskLevelColor = (level: string) => {
    const riskLevel = riskLevels.find((r) => r.value === level);
    return riskLevel?.color || "default";
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, permission: Permission) => {
    setMenuAnchor(event.currentTarget);
    setSelectedPermission(permission);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedPermission(null);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Key color="primary" />
            Permission Registry
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage tenant-specific permissions and access controls
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreatePermission} sx={{ borderRadius: 2 }}>
          Create Permission
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total Permissions
              </Typography>
              <Typography variant="h5" fontWeight={600} color="primary.main">
                {permissions.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                High Risk
              </Typography>
              <Typography variant="h5" fontWeight={600} color="warning.main">
                {permissions.filter((p) => p.risk_level === "high" || p.risk_level === "critical").length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Categories
              </Typography>
              <Typography variant="h5" fontWeight={600} color="secondary.main">
                {new Set(permissions.map((p) => p.permission_category)).size}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Active Usage
              </Typography>
              <Typography variant="h5" fontWeight={600} color="success.main">
                {permissions.reduce((sum, p) => sum + p.usage_count, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
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
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} label="Category">
                  <MenuItem value="">All Categories</MenuItem>
                  {permissionCategories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk Level</InputLabel>
                <Select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} label="Risk Level">
                  <MenuItem value="">All Risk Levels</MenuItem>
                  {riskLevels.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      <Chip label={level.label} size="small" color={level.color as any} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("");
                  setRiskFilter("");
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab icon={<Shield />} label="All Permissions" />
            <Tab icon={<Warning />} label="High Risk" />
            <Tab icon={<Lock />} label="Inactive" />
          </Tabs>
        </Box>

        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Permission Details</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="center">Risk Level</TableCell>
                  <TableCell align="center">Type</TableCell>
                  <TableCell align="center">Usage</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredPermissions().map((permission) => (
                  <TableRow key={permission.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>
                          {permission.permission_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <Code sx={{ fontSize: 14, mr: 0.5 }} />
                          {permission.permission_code}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {permission.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={permission.permission_category} size="small" variant="outlined" icon={<Category />} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={permission.risk_level} size="small" color={getRiskLevelColor(permission.risk_level) as any} sx={{ textTransform: "capitalize" }} />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                        {permission.permission_type}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Number of assignments">
                        <Chip label={permission.usage_count} size="small" color={permission.usage_count > 0 ? "primary" : "default"} />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={permission.is_active ? "Active" : "Inactive"}
                        size="small"
                        color={permission.is_active ? "success" : "default"}
                        icon={permission.is_active ? <CheckCircle /> : <Lock />}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton onClick={(e) => handleMenuOpen(e, permission)}>
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Permission Actions Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => selectedPermission && handleEditPermission(selectedPermission)}>
          <ListItemIcon>
            <Edit />
          </ListItemIcon>
          <ListItemText>Edit Permission</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Visibility />
          </ListItemIcon>
          <ListItemText>View Usage</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Assignment />
          </ListItemIcon>
          <ListItemText>Copy Permission Code</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <Delete color="error" />
          </ListItemIcon>
          <ListItemText>Deactivate</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create/Edit Permission Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingPermission ? "Edit Permission" : "Create New Permission"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Permission Name"
                fullWidth
                value={formData.permission_name}
                onChange={(e) => {
                  setFormData({ ...formData, permission_name: e.target.value });
                  if (!editingPermission && formData.permission_category) {
                    setFormData((prev) => ({
                      ...prev,
                      permission_name: e.target.value,
                      permission_code: generatePermissionCode(e.target.value, prev.permission_category),
                    }));
                  }
                }}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Permission Code"
                fullWidth
                value={formData.permission_code}
                onChange={(e) => setFormData({ ...formData, permission_code: e.target.value })}
                required
                helperText="Auto-generated based on name and category"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                options={permissionCategories}
                value={formData.permission_category}
                onChange={(e, value) => {
                  setFormData({ ...formData, permission_category: value || "" });
                  if (!editingPermission && formData.permission_name && value) {
                    setFormData((prev) => ({
                      ...prev,
                      permission_category: value || "",
                      permission_code: generatePermissionCode(prev.permission_name, value || ""),
                    }));
                  }
                }}
                renderInput={(params) => <TextField {...params} label="Category" required />}
                freeSolo
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Permission Type</InputLabel>
                <Select value={formData.permission_type} onChange={(e) => setFormData({ ...formData, permission_type: e.target.value })} label="Permission Type">
                  {permissionTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                helperText="Describe what this permission allows users to do"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Resource Type"
                fullWidth
                value={formData.resource_type}
                onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                helperText="What resource this permission applies to"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Action Type"
                fullWidth
                value={formData.action_type}
                onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                helperText="What action this permission allows"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Risk Level</InputLabel>
                <Select value={formData.risk_level} onChange={(e) => setFormData({ ...formData, risk_level: e.target.value })} label="Risk Level">
                  {riskLevels.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      <Chip label={level.label} size="small" color={level.color as any} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <FormControlLabel
                  control={<Switch checked={formData.requires_scope} onChange={(e) => setFormData({ ...formData, requires_scope: e.target.checked })} />}
                  label="Requires Scope Validation"
                />
                <FormControlLabel control={<Switch checked={formData.is_delegatable} onChange={(e) => setFormData({ ...formData, is_delegatable: e.target.checked })} />} label="Can be Delegated" />
                <FormControlLabel control={<Switch checked={formData.is_auditable} onChange={(e) => setFormData({ ...formData, is_auditable: e.target.checked })} />} label="Audit All Usage" />
                <FormControlLabel
                  control={<Switch checked={formData.is_system_permission} onChange={(e) => setFormData({ ...formData, is_system_permission: e.target.checked })} />}
                  label="System Permission"
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePermission} disabled={!formData.permission_name || !formData.permission_code || !formData.permission_category}>
            {editingPermission ? "Update" : "Create"} Permission
          </Button>
        </DialogActions>
      </Dialog>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default PermissionRegistryPage;

// Designation Management Page for Tenant Portals
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  LinearProgress,
  CircularProgress,
  Alert,
  Tooltip,
  Stack,
  Divider,
  Avatar,
  Badge,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  FormGroup,
  Snackbar,
  ListItemIcon,
} from "@mui/material";
import {
  Add,
  MoreVert,
  Work,
  Business,
  Group,
  AdminPanelSettings,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Warning,
  ErrorOutline,
  PersonAdd,
  Assignment,
  Analytics,
  Schedule,
  Refresh,
  Download,
  Search,
  FilterList,
  Save,
  Cancel,
  AddCircle,
  MedicalServices,
  Construction,
  Engineering,
  VerifiedUser,
} from "@mui/icons-material";

import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/ThemeContext";
import { StatsCard } from "../components";
import api from "../services/api";

interface Designation {
  id: number;
  designation_name: string;
  designation_code: string;
  department: number; // Changed from string to number (ID)
  department_name?: string;
  description: string;
  designation_type: "field" | "non_field";
  certifications_required: {
    farmtocli: boolean;
    fat: boolean;
    medical: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number; // For statistics
}

interface Department {
  id: number;
  department_name: string;
  department_code: string;
  description: string;
  is_active: boolean;
  // For backward compatibility if needed
  name?: string;
  code?: string;
}

interface DesignationFormData {
  designation_name: string;
  department: number | null; // changed from string to number|null
  description: string;
  designation_type: "field" | "non_field";
  certifications_required: {
    farmtocli: boolean;
    fat: boolean;
    medical: boolean;
  };
}

const initialFormData: DesignationFormData = {
  designation_name: "",
  department: null, // changed from "" to null
  description: "",
  designation_type: "non_field",
  certifications_required: {
    farmtocli: false,
    fat: false,
    medical: false,
  },
};

const DesignationManagementPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const { darkMode } = useDarkMode();

  // State management
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Dialog states
  const [designationDialogOpen, setDesignationDialogOpen] = useState(false);
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState<DesignationFormData>(initialFormData);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentDescription, setNewDepartmentDescription] = useState("");

  // UI states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "field" | "non_field">("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  const currentTenant = getCurrentTenant();

  // Load data
  useEffect(() => {
    loadDesignations();
    loadDepartments();
  }, []);

  const loadDesignations = async () => {
    try {
      setLoading(true);
      const response = await api.get("/tenant/designations/");
      setDesignations(response.data.designations || []);
    } catch (error) {
      console.error("Error loading designations:", error);
      showSnackbar("Failed to load designations", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get("/tenant/departments/");
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error("Error loading departments:", error);
      showSnackbar("Failed to load departments", "error");
    }
  };

  const showSnackbar = (message: string, severity: "success" | "error" | "warning" | "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Form handlers
  const handleOpenDesignationDialog = (designation?: Designation) => {
    if (designation) {
      setEditingDesignation(designation);
      setFormData({
        designation_name: designation.designation_name,
        department: typeof designation.department === "number" ? designation.department : departments.find((d) => d.name === designation.department_name)?.id || null,
        description: designation.description,
        designation_type: designation.designation_type,
        certifications_required: designation.certifications_required,
      });
    } else {
      setEditingDesignation(null);
      setFormData(initialFormData);
    }
    setDesignationDialogOpen(true);
  };

  const handleCloseDesignationDialog = () => {
    setDesignationDialogOpen(false);
    setEditingDesignation(null);
    setFormData(initialFormData);
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCertificationToggle = (certification: "farmtocli" | "fat" | "medical") => {
    setFormData((prev) => ({
      ...prev,
      certifications_required: {
        ...prev.certifications_required,
        [certification]: !prev.certifications_required[certification],
      },
    }));
  };

  const handleSubmitDesignation = async () => {
    try {
      setSubmitting(true);

      const payload = {
        ...formData,
        designation_code: formData.designation_name.toLowerCase().replace(/\s+/g, "_"),
      };
      // Remove department if not selected
      if (!formData.department) payload.department = null;

      if (editingDesignation) {
        await api.put(`/tenant/designations/${editingDesignation.id}/`, payload);
        showSnackbar("Designation updated successfully", "success");
      } else {
        await api.post("/tenant/designations/", payload);
        showSnackbar("Designation created successfully", "success");
      }

      await loadDesignations();
      handleCloseDesignationDialog();
    } catch (error: any) {
      console.error("Error saving designation:", error);
      showSnackbar(error.response?.data?.message || "Failed to save designation", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDesignation = async () => {
    if (!selectedDesignation) return;

    try {
      setSubmitting(true);
      await api.delete(`/tenant/designations/${selectedDesignation.id}/`);
      showSnackbar("Designation deleted successfully", "success");
      await loadDesignations();
      setDeleteDialogOpen(false);
      setSelectedDesignation(null);
    } catch (error: any) {
      console.error("Error deleting designation:", error);
      showSnackbar(error.response?.data?.message || "Failed to delete designation", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDepartment = async () => {
    try {
      setSubmitting(true);
      const payload = {
        department_name: newDepartmentName, // was name
        department_code: newDepartmentName.toLowerCase().replace(/\s+/g, "_"), // was code
        description: newDepartmentDescription,
      };

      const response = await api.post("/tenant/departments/", payload);
      showSnackbar("Department created successfully", "success");
      await loadDepartments();
      setDepartmentDialogOpen(false);
      setNewDepartmentName("");
      setNewDepartmentDescription("");

      // Auto-select the new department by ID
      setFormData((prev) => ({ ...prev, department: response.data.id }));
    } catch (error: any) {
      console.error("Error creating department:", error);
      showSnackbar(error.response?.data?.message || "Failed to create department", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter designations
  const filteredDesignations = designations.filter((designation) => {
    const matchesSearch = designation.designation_name.toLowerCase().includes(searchTerm.toLowerCase()) || designation.department_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "all" || designation.designation_type === typeFilter;
    const matchesDepartment = departmentFilter === "all" || designation.department_name === departmentFilter;

    return matchesSearch && matchesType && matchesDepartment;
  });

  // Statistics
  const stats = {
    total: designations.length,
    field: designations.filter((d) => d.designation_type === "field").length,
    nonField: designations.filter((d) => d.designation_type === "non_field").length,
    departments: new Set(designations.map((d) => d.department_name)).size,
  };

  const getDesignationTypeColor = (type: string) => {
    return type === "field" ? "primary" : "secondary";
  };

  const getCertificationIcon = (certification: string) => {
    switch (certification) {
      case "farmtocli":
        return <Construction fontSize="small" />;
      case "fat":
        return <Engineering fontSize="small" />;
      case "medical":
        return <MedicalServices fontSize="small" />;
      default:
        return <VerifiedUser fontSize="small" />;
    }
  };

  const renderCertifications = (certifications: any) => {
    const required = Object.entries(certifications || {})
      .filter(([_, isRequired]) => isRequired)
      .map(([cert, _]) => cert);

    if (required.length === 0) return <Typography variant="body2">None</Typography>;

    return (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {required.map((cert) => (
          <Chip key={cert} label={cert.toUpperCase()} size="small" icon={getCertificationIcon(cert)} color="primary" variant="outlined" />
        ))}
      </Stack>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Designation Management
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Designation Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage organizational roles and responsibilities for {currentTenant?.organization_name}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={loadDesignations}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDesignationDialog()} size="large">
            Add Designation
          </Button>
        </Stack>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard title="Total Designations" value={stats.total} subtitle={`${stats.field} field, ${stats.nonField} non-field`} icon={Work} color="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard title="Field Designations" value={stats.field} subtitle="Operational roles" icon={Construction} color="secondary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard title="Non-Field Designations" value={stats.nonField} subtitle="Administrative roles" icon={AdminPanelSettings} color="info" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatsCard title="Departments" value={stats.departments} subtitle="Organizational units" icon={Business} color="success" />
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              placeholder="Search designations..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
              }}
              sx={{ minWidth: 200 }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value as any)}>
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="field">Field</MenuItem>
                <MenuItem value="non_field">Non-Field</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Department</InputLabel>
              <Select value={departmentFilter} label="Department" onChange={(e) => setDepartmentFilter(e.target.value)}>
                <MenuItem value="all">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {/* Designations Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Designation</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Certifications Required</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDesignations.map((designation) => (
                <TableRow key={designation.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {designation.designation_name}
                      </Typography>
                      {designation.description && (
                        <Typography variant="body2" color="text.secondary">
                          {designation.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={designation.department_name || "No Department"} size="small" variant="outlined" icon={<Business />} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={designation.designation_type === "field" ? "Field" : "Non-Field"}
                      size="small"
                      color={getDesignationTypeColor(designation.designation_type)}
                      variant={designation.designation_type === "field" ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell>
                    {designation.designation_type === "field" ? (
                      renderCertifications(designation.certifications_required)
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={designation.is_active ? "Active" : "Inactive"}
                      size="small"
                      color={designation.is_active ? "success" : "default"}
                      icon={designation.is_active ? <CheckCircle /> : <ErrorOutline />}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{new Date(designation.created_at).toLocaleDateString()}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      onClick={(e) => {
                        setSelectedDesignation(designation);
                        setMenuAnchor(e.currentTarget);
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDesignations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No designations found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Action Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            if (selectedDesignation) {
              handleOpenDesignationDialog(selectedDesignation);
            }
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <Edit />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteDialogOpen(true);
            setMenuAnchor(null);
          }}
        >
          <ListItemIcon>
            <Delete />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

      {/* Designation Create/Edit Dialog */}
      <Dialog open={designationDialogOpen} onClose={handleCloseDesignationDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingDesignation ? "Edit Designation" : "Create New Designation"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {/* Designation Name */}
            <TextField
              label="Designation Name"
              value={formData.designation_name}
              onChange={(e) => handleFormChange("designation_name", e.target.value)}
              fullWidth
              required
              helperText="Enter the official designation title"
            />

            {/* Department Selection */}
            <Stack direction="row" spacing={2} alignItems="flex-end">
              <Autocomplete
                options={departments}
                getOptionLabel={(option) => option.department_name}
                value={departments.find((d) => d.id === formData.department) || null}
                onChange={(_, value) => handleFormChange("department", value ? value.id : null)}
                renderInput={(params) => <TextField {...params} label="Department" required helperText="Select department" />}
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" startIcon={<AddCircle />} onClick={() => setDepartmentDialogOpen(true)} sx={{ mb: 3 }}>
                Add Department
              </Button>
            </Stack>

            {/* Description */}
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              fullWidth
              multiline
              rows={3}
              helperText="Brief description of roles and responsibilities"
            />

            {/* Designation Type */}
            <FormControl fullWidth>
              <Typography variant="subtitle2" gutterBottom>
                Designation Type
              </Typography>
              <ToggleButtonGroup
                value={formData.designation_type}
                exclusive
                onChange={(_, value) => {
                  if (value) {
                    handleFormChange("designation_type", value);
                    // Reset certifications when switching to non-field
                    if (value === "non_field") {
                      handleFormChange("certifications_required", {
                        farmtocli: false,
                        fat: false,
                        medical: false,
                      });
                    }
                  }
                }}
                sx={{ width: "100%" }}
              >
                <ToggleButton value="non_field" sx={{ flex: 1 }}>
                  <AdminPanelSettings sx={{ mr: 1 }} />
                  Non-Field
                </ToggleButton>
                <ToggleButton value="field" sx={{ flex: 1 }}>
                  <Construction sx={{ mr: 1 }} />
                  Field
                </ToggleButton>
              </ToggleButtonGroup>
            </FormControl>

            {/* Certification Requirements (Field Only) */}
            {formData.designation_type === "field" && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Certification Requirements
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select which certifications are required for this field designation
                </Typography>

                <FormGroup>
                  <FormControlLabel
                    control={<Switch checked={formData.certifications_required.farmtocli} onChange={() => handleCertificationToggle("farmtocli")} color="primary" />}
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Construction fontSize="small" />
                        <Box>
                          <Typography variant="body2">FARMTocli</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Fall Arrest, Rescue, Medical Training, Climbing
                          </Typography>
                        </Box>
                      </Stack>
                    }
                  />
                  <FormControlLabel
                    control={<Switch checked={formData.certifications_required.fat} onChange={() => handleCertificationToggle("fat")} color="primary" />}
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Engineering fontSize="small" />
                        <Box>
                          <Typography variant="body2">FAT</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Factory Acceptance Test
                          </Typography>
                        </Box>
                      </Stack>
                    }
                  />
                  <FormControlLabel
                    control={<Switch checked={formData.certifications_required.medical} onChange={() => handleCertificationToggle("medical")} color="primary" />}
                    label={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <MedicalServices fontSize="small" />
                        <Box>
                          <Typography variant="body2">Medical</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Medical Fitness Certificate
                          </Typography>
                        </Box>
                      </Stack>
                    }
                  />
                </FormGroup>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDesignationDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitDesignation}
            variant="contained"
            disabled={submitting || !formData.designation_name || !formData.department}
            startIcon={submitting ? <CircularProgress size={20} /> : <Save />}
          >
            {editingDesignation ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Department Creation Dialog */}
      <Dialog open={departmentDialogOpen} onClose={() => setDepartmentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Department</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField label="Department Name" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} fullWidth required helperText="Enter the department name" />
            <TextField
              label="Description"
              value={newDepartmentDescription}
              onChange={(e) => setNewDepartmentDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              helperText="Brief description of the department"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepartmentDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleCreateDepartment} variant="contained" disabled={submitting || !newDepartmentName} startIcon={submitting ? <CircularProgress size={20} /> : <Save />}>
            Create Department
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Designation</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the designation "{selectedDesignation?.designation_name}"? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleDeleteDesignation} color="error" variant="contained" disabled={submitting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DesignationManagementPage;

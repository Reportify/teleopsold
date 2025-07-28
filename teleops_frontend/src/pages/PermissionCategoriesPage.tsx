/**
 * Permission Categories Management Page
 * Allows tenant administrators to manage permission categories
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  LinearProgress,
  Menu,
  MenuItem,
  Tooltip,
  Chip,
  Paper,
} from "@mui/material";
import { Add, Edit, Delete, MoreVert, ArrowBack, Category, DragIndicator } from "@mui/icons-material";
import { getPermissionCategories, createPermissionCategory, updatePermissionCategory, deletePermissionCategory } from "../services/rbacAPI";

interface PermissionCategory {
  id: number;
  category_name: string;
  category_code: string;
  description?: string;
  is_system_category: boolean;
  is_active: boolean;
  sort_order: number;
  permission_count: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

const PermissionCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PermissionCategory | null>(null);
  const [formData, setFormData] = useState({
    category_name: "",
    category_code: "",
    description: "",
    sort_order: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<PermissionCategory | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "warning" | "info",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPermissionCategories();
      const categoriesData = response.results || response;
      setCategories(categoriesData);
    } catch (err) {
      setError("Failed to load permission categories");
      console.error("Error loading categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: PermissionCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        category_name: category.category_name,
        category_code: category.category_code,
        description: category.description || "",
        sort_order: category.sort_order,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        category_name: "",
        category_code: "",
        description: "",
        sort_order: categories.length + 1,
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      category_name: "",
      category_code: "",
      description: "",
      sort_order: 0,
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.category_name.trim()) {
      errors.category_name = "Category name is required";
    }

    if (!formData.category_code.trim()) {
      errors.category_code = "Category code is required";
    } else if (!/^[a-z0-9_]+$/.test(formData.category_code)) {
      errors.category_code = "Category code must contain only lowercase letters, numbers, and underscores";
    }

    // Check for duplicate codes
    const isDuplicate = categories.some((cat) => cat.category_code === formData.category_code && (!editingCategory || cat.id !== editingCategory.id));
    if (isDuplicate) {
      errors.category_code = "Category code already exists";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (editingCategory) {
        await updatePermissionCategory(editingCategory.id, formData);
        setSnackbar({
          open: true,
          message: "Category updated successfully",
          severity: "success",
        });
      } else {
        await createPermissionCategory(formData);
        setSnackbar({
          open: true,
          message: "Category created successfully",
          severity: "success",
        });
      }

      handleCloseDialog();
      await loadCategories();
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to ${editingCategory ? "update" : "create"} category`,
        severity: "error",
      });
      console.error("Error saving category:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category: PermissionCategory) => {
    if (category.is_system_category) {
      setSnackbar({
        open: true,
        message: "Cannot delete system categories",
        severity: "warning",
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${category.category_name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deletePermissionCategory(category.id);
      setSnackbar({
        open: true,
        message: "Category deleted successfully",
        severity: "success",
      });
      await loadCategories();
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to delete category",
        severity: "error",
      });
      console.error("Error deleting category:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, category: PermissionCategory) => {
    setAnchorEl(event.currentTarget);
    setSelectedCategory(category);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCategory(null);
  };

  const handleFormChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === "sort_order" ? parseInt(event.target.value) || 0 : event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate category code from name
    if (field === "category_name") {
      const generatedCode = event.target.value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "_");
      setFormData((prev) => ({ ...prev, category_code: generatedCode }));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => window.history.back()}>
            <ArrowBack />
          </IconButton>
          <Category color="primary" />
          <Typography variant="h4" fontWeight={600}>
            Permission Categories
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Create Category
        </Button>
      </Box>

      {/* Description */}
      <Alert severity="info" sx={{ mb: 3 }}>
        Manage permission categories to organize your permissions. System categories cannot be deleted but custom categories can be added, edited, or removed.
      </Alert>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Categories Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order</TableCell>
                  <TableCell>Category Name</TableCell>
                  <TableCell>Category Code</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <DragIndicator color="disabled" />
                        {category.sort_order}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {category.category_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {category.category_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {category.description || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={category.is_system_category ? "System" : "Custom"} size="small" color={category.is_system_category ? "primary" : "default"} />
                    </TableCell>
                    <TableCell>
                      <Chip label={category.permission_count} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={category.is_active ? "Active" : "Inactive"} size="small" color={category.is_active ? "success" : "default"} />
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={(e) => handleMenuOpen(e, category)}>
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: "center", py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No permission categories found. Create your first category to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            handleOpenDialog(selectedCategory!);
            handleMenuClose();
          }}
        >
          <Edit sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {selectedCategory && !selectedCategory.is_system_category && (
          <MenuItem
            onClick={() => {
              handleDelete(selectedCategory);
              handleMenuClose();
            }}
          >
            <Delete sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory ? "Edit Category" : "Create Category"}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Category Name"
              value={formData.category_name}
              onChange={handleFormChange("category_name")}
              error={!!formErrors.category_name}
              helperText={formErrors.category_name}
              fullWidth
              required
            />
            <TextField
              label="Category Code"
              value={formData.category_code}
              onChange={handleFormChange("category_code")}
              error={!!formErrors.category_code}
              helperText={formErrors.category_code || "Lowercase letters, numbers, and underscores only"}
              fullWidth
              required
            />
            <TextField label="Description" value={formData.description} onChange={handleFormChange("description")} multiline rows={3} fullWidth />
            <TextField label="Sort Order" type="number" value={formData.sort_order} onChange={handleFormChange("sort_order")} fullWidth helperText="Lower numbers appear first" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {editingCategory ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar would go here - simplified for this example */}
    </Box>
  );
};

export default PermissionCategoriesPage;

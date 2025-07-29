// Circle-Based Multi-Tenant Projects Management
import React, { useState } from "react";
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip } from "@mui/material";
import { Add, Edit, Delete, Visibility, Assignment, CheckCircle, Schedule, Cancel } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useAppSelector } from "../store/hooks";
import { DataTable, Column, RowAction } from "../components";
import { Project } from "../store/slices/projectsSlice";
import { useDarkMode } from "../contexts/ThemeContext";
import { FeatureGate, useFeaturePermissions } from "../hooks/useFeaturePermissions";

const ProjectsPage: React.FC = () => {
  const { getCurrentTenant, isCorporateUser, isCircleUser } = useAuth();
  const { projects, loading, error } = useAppSelector((state) => state.projects);
  const { darkMode } = useDarkMode();

  // Local state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    client: "",
    project_type: "Dismantle" as "Dismantle" | "Installation" | "Maintenance",
    start_date: "",
    end_date: "",
  });

  const currentTenant = getCurrentTenant();

  // Mock data for demonstration
  const mockProjects: Project[] = [
    {
      id: "1",
      name: "Mumbai Circle BTS Dismantling Phase 1",
      description: "Dismantling of 50 BTS sites in Mumbai region",
      client: "Vodafone India",
      tenant_id: currentTenant?.id || "1",
      circle_id: "circle_mumbai",
      project_type: "Dismantle",
      status: "Active",
      start_date: "2024-01-15",
      end_date: "2024-06-30",
      created_at: "2024-01-10T10:00:00Z",
      updated_at: "2024-01-15T14:30:00Z",
      total_sites: 50,
      completed_sites: 12,
      progress_percentage: 24,
      estimated_value: 850000,
    },
    {
      id: "2",
      name: "Delhi 5G Tower Installation",
      description: "5G equipment installation across Delhi NCR",
      client: "Airtel",
      tenant_id: currentTenant?.id || "1",
      circle_id: "circle_delhi",
      project_type: "Installation",
      status: "Planning",
      start_date: "2024-03-01",
      end_date: "2024-12-31",
      created_at: "2024-01-05T09:00:00Z",
      updated_at: "2024-01-20T11:15:00Z",
      total_sites: 120,
      completed_sites: 0,
      progress_percentage: 0,
      estimated_value: 2400000,
    },
    {
      id: "3",
      name: "Bangalore Equipment Maintenance",
      description: "Quarterly maintenance of telecom equipment",
      client: "Reliance Jio",
      tenant_id: currentTenant?.id || "1",
      circle_id: "circle_bangalore",
      project_type: "Maintenance",
      status: "Completed",
      start_date: "2023-10-01",
      end_date: "2023-12-31",
      created_at: "2023-09-15T08:00:00Z",
      updated_at: "2024-01-02T16:45:00Z",
      total_sites: 85,
      completed_sites: 85,
      progress_percentage: 100,
      estimated_value: 425000,
    },
  ];

  // Table columns definition
  const columns: Column[] = [
    {
      id: "name",
      label: "Project Name",
      minWidth: 200,
      format: (value: string) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {value}
          </Typography>
        </Box>
      ),
    },
    {
      id: "client",
      label: "Client",
      minWidth: 150,
    },
    {
      id: "project_type",
      label: "Type",
      minWidth: 120,
      format: (value: string) => <Chip label={value} size="small" color={value === "Dismantle" ? "error" : value === "Installation" ? "primary" : value === "Maintenance" ? "warning" : "default"} />,
    },
    {
      id: "status",
      label: "Status",
      minWidth: 120,
      format: (value: string) => (
        <Chip
          icon={value === "Completed" ? <CheckCircle /> : value === "Active" ? <Schedule /> : value === "Planning" ? <Assignment /> : <Cancel />}
          label={value}
          size="small"
          color={value === "Completed" ? "success" : value === "Active" ? "primary" : value === "Planning" ? "info" : "default"}
        />
      ),
    },
    {
      id: "progress_percentage",
      label: "Progress",
      minWidth: 100,
      align: "center",
      format: (value: number) => `${value}%`,
    },
    {
      id: "total_sites",
      label: "Sites",
      minWidth: 80,
      align: "center",
      format: (value: number, row: Project) => (
        <Box>
          <Typography variant="body2">
            {row.completed_sites || 0}/{value}
          </Typography>
        </Box>
      ),
    },
    {
      id: "estimated_value",
      label: "Value",
      minWidth: 120,
      align: "right",
      format: (value: number) => `₹${(value / 100000).toFixed(1)}L`,
    },
    {
      id: "start_date",
      label: "Start Date",
      minWidth: 120,
      format: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  // Get feature permissions
  const { hasFeatureAccess } = useFeaturePermissions();

  const rowActions: RowAction[] = [
    {
      label: "View Details",
      icon: <Visibility />,
      onClick: (project: Project) => {
        console.log("View project:", project);
        // TODO: Navigate to project details
      },
    },
    // Edit action only if user has edit permission
    ...(hasFeatureAccess("project_edit")
      ? [
          {
            label: "Edit",
            icon: <Edit />,
            onClick: (project: Project) => {
              setEditingProject(project);
              setFormData({
                name: project.name,
                description: project.description || "",
                client: project.client,
                project_type: project.project_type,
                start_date: project.start_date,
                end_date: project.end_date || "",
              });
              setCreateDialogOpen(true);
            },
          },
        ]
      : []),
    // Delete action only if user has delete permission (using edit permission for now)
    ...(hasFeatureAccess("project_edit")
      ? [
          {
            label: "Delete",
            icon: <Delete />,
            color: "error" as const,
            onClick: (project: Project) => {
              if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
                console.log("Delete project:", project);
                // TODO: Implement delete functionality
              }
            },
            disabled: (project: Project) => project.status === "Active",
          },
        ]
      : []),
  ];

  // Handlers
  const handleCreateProject = () => {
    setEditingProject(null);
    setFormData({
      name: "",
      description: "",
      client: "",
      project_type: "Dismantle",
      start_date: "",
      end_date: "",
    });
    setCreateDialogOpen(true);
  };

  const handleSaveProject = () => {
    console.log("Save project:", formData);
    // TODO: Implement save functionality
    setCreateDialogOpen(false);
    setEditingProject(null);
  };

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      {/* Wrap entire page content with view permission */}
      <FeatureGate
        featureId="project_view"
        fallback={
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
              You don't have permission to view projects
            </Typography>
          </Box>
        }
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
            Projects
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: darkMode ? "#9aa0a6" : "#6b7280",
              fontSize: "0.875rem",
              opacity: 0.8,
            }}
          >
            Manage your {currentTenant?.tenant_type?.toLowerCase()} projects and track progress
          </Typography>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            {/* Create Project Button with Create Permission */}
            <FeatureGate featureId="project_create">
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateProject}
                sx={{
                  fontWeight: 500,
                  textTransform: "none",
                  borderRadius: "8px",
                  backgroundColor: darkMode ? "#8ab4f8" : "#1a73e8",
                  color: darkMode ? "#202124" : "#ffffff",
                  "&:hover": {
                    backgroundColor: darkMode ? "#a8c7fa" : "#1557b0",
                  },
                }}
              >
                Create Project
              </Button>
            </FeatureGate>
          </Box>
        </Box>

        {/* Projects Table */}
        <DataTable
          columns={columns}
          rows={mockProjects}
          loading={loading}
          error={error}
          selectable={isCorporateUser() || isCircleUser()}
          selectedRows={selectedProjects}
          onSelectionChange={setSelectedProjects}
          actions={rowActions}
          title="All Projects"
          searchPlaceholder="Search projects..."
          emptyMessage="No projects found. Create your first project to get started."
        />

        {/* Create/Edit Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle
            sx={{
              fontWeight: 500,
              fontSize: "1.125rem",
              color: darkMode ? "#e8eaed" : "#1a1a1a",
            }}
          >
            {editingProject ? "Edit Project" : "Create New Project"}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
              <TextField
                label="Project Name"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                fullWidth
                required
                sx={{
                  "& .MuiInputLabel-root": {
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: darkMode ? "#9aa0a6" : "#6b7280",
                  },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: darkMode ? "#2d2e30" : "#f9fafb",
                    borderColor: darkMode ? "#3c4043" : "#d1d5db",
                    color: darkMode ? "#e8eaed" : "#374151",
                  },
                }}
              />

              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                fullWidth
                multiline
                rows={3}
                sx={{
                  "& .MuiInputLabel-root": {
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: darkMode ? "#9aa0a6" : "#6b7280",
                  },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: darkMode ? "#2d2e30" : "#f9fafb",
                    borderColor: darkMode ? "#3c4043" : "#d1d5db",
                    color: darkMode ? "#e8eaed" : "#374151",
                  },
                }}
              />

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField
                  label="Client"
                  value={formData.client}
                  onChange={(e) => handleFormChange("client", e.target.value)}
                  fullWidth
                  required
                  sx={{
                    "& .MuiInputLabel-root": {
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: darkMode ? "#9aa0a6" : "#6b7280",
                    },
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: darkMode ? "#2d2e30" : "#f9fafb",
                      borderColor: darkMode ? "#3c4043" : "#d1d5db",
                      color: darkMode ? "#e8eaed" : "#374151",
                    },
                  }}
                />

                <TextField
                  select
                  label="Project Type"
                  value={formData.project_type}
                  onChange={(e) => handleFormChange("project_type", e.target.value)}
                  fullWidth
                  required
                  sx={{
                    "& .MuiInputLabel-root": {
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: darkMode ? "#9aa0a6" : "#6b7280",
                    },
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: darkMode ? "#2d2e30" : "#f9fafb",
                      borderColor: darkMode ? "#3c4043" : "#d1d5db",
                      color: darkMode ? "#e8eaed" : "#374151",
                    },
                  }}
                >
                  <MenuItem value="Dismantle">Dismantle</MenuItem>
                  <MenuItem value="Installation">Installation</MenuItem>
                  <MenuItem value="Maintenance">Maintenance</MenuItem>
                </TextField>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleFormChange("start_date", e.target.value)}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiInputLabel-root": {
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: darkMode ? "#9aa0a6" : "#6b7280",
                    },
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: darkMode ? "#2d2e30" : "#f9fafb",
                      borderColor: darkMode ? "#3c4043" : "#d1d5db",
                      color: darkMode ? "#e8eaed" : "#374151",
                    },
                  }}
                />

                <TextField
                  label="End Date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleFormChange("end_date", e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiInputLabel-root": {
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: darkMode ? "#9aa0a6" : "#6b7280",
                    },
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: darkMode ? "#2d2e30" : "#f9fafb",
                      borderColor: darkMode ? "#3c4043" : "#d1d5db",
                      color: darkMode ? "#e8eaed" : "#374151",
                    },
                  }}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => setCreateDialogOpen(false)}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                color: darkMode ? "#9aa0a6" : "#6b7280",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProject}
              variant="contained"
              disabled={!formData.name || !formData.client || !formData.start_date}
              sx={{
                fontWeight: 500,
                textTransform: "none",
                borderRadius: "8px",
                backgroundColor: darkMode ? "#8ab4f8" : "#1a73e8",
                color: darkMode ? "#202124" : "#ffffff",
                "&:hover": {
                  backgroundColor: darkMode ? "#a8c7fa" : "#1557b0",
                },
              }}
            >
              {editingProject ? "Update" : "Create"} Project
            </Button>
          </DialogActions>
        </Dialog>
      </FeatureGate>
    </Box>
  );
};

export default ProjectsPage;

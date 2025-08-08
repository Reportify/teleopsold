// Circle-Based Multi-Tenant Projects Management
import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, FormControlLabel, Switch } from "@mui/material";
import { Add, Edit, Delete, Visibility, Assignment, CheckCircle, Schedule, Cancel } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { DataTable, Column, RowAction } from "../components";
import { Project as ApiProject, ProjectType } from "../services/projectService";
import { useDarkMode } from "../contexts/ThemeContext";
import { FeatureGate, useFeaturePermissions } from "../hooks/useFeaturePermissions";
import clientService, { Client } from "../services/clientService";
import projectService, { CreateProjectRequest } from "../services/projectService";
import { telecomCircleApi } from "../services/api";

const ProjectsPage: React.FC = () => {
  const { getCurrentTenant, isCorporateUser, isCircleUser } = useAuth();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { darkMode } = useDarkMode();

  // Local state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ApiProject | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  // Form state aligned with Phase 1 backend
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    project_type: ProjectType;
    client_id: string | number | "";
    is_tenant_owner: boolean;
    customer_is_tenant_owner: boolean;
    customer_name: string;
    circle: string;
    activity: string;
    start_date: string;
    end_date: string;
    scope: string;
  }>({
    name: "",
    description: "",
    project_type: "other",
    client_id: "",
    is_tenant_owner: true,
    customer_is_tenant_owner: false,
    customer_name: "",
    circle: "",
    activity: "",
    start_date: "",
    end_date: "",
    scope: "",
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [circles, setCircles] = useState<Array<{ value: string; label: string }>>([]);
  // Keep a ref for formatter usage in column definition
  const circlesRef = React.useRef<Array<{ value: string; label: string }>>([]);

  const [creating, setCreating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ApiProject | null>(null);

  // Load clients and circles on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const clientResp = await clientService.getClients();
        setClients(clientResp.clients || []);
      } catch (e) {
        console.error("Failed to load clients", e);
      }
      try {
        const apiCircles = await telecomCircleApi.list();
        console.log("API Circles response:", apiCircles);
        const normalized = Array.isArray(apiCircles) ? apiCircles.map((c: any) => ({ value: c.circle_code, label: c.circle_name })) : [];
        console.log("Normalized circles:", normalized);
        setCircles(normalized);
        circlesRef.current = normalized;
      } catch (e) {
        const fallback = [
          { value: "MH", label: "Maharashtra & Goa" },
          { value: "KA", label: "Karnataka" },
          { value: "TN", label: "Tamil Nadu" },
          { value: "AP", label: "Andhra Pradesh" },
        ];
        setCircles(fallback);
        circlesRef.current = fallback;
      }
    };
    loadData();
  }, []);

  // Load projects
  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.list();
      // Handle pagination or plain array
      const list = Array.isArray(data) ? data : data.results || [];
      setProjects(list as ApiProject[]);
    } catch (e: any) {
      console.error("Failed to load projects", e);
      setError(e?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const currentTenant = getCurrentTenant();

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
      id: "project_type",
      label: "Type",
      minWidth: 120,
      format: (value: string) => {
        const label = value === "dismantle" ? "Dismantle" : "Other";
        return <Chip label={label} size="small" color={value === "dismantle" ? "error" : "default"} />;
      },
    },
    {
      id: "status",
      label: "Status",
      minWidth: 120,
      format: (value: string) => (
        <Chip
          icon={value === "completed" ? <CheckCircle /> : value === "active" ? <Schedule /> : value === "planning" ? <Assignment /> : <Cancel />}
          label={value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          size="small"
          color={value === "completed" ? "success" : value === "active" ? "primary" : value === "planning" ? "info" : "default"}
        />
      ),
    },
    {
      id: "client_tenant_name",
      label: "Client",
      minWidth: 180,
    },
    {
      id: "start_date",
      label: "Start Date",
      minWidth: 120,
      format: (value: string) => (value ? new Date(value).toLocaleDateString() : "-"),
    },
    {
      id: "end_date",
      label: "End Date",
      minWidth: 120,
      format: (value: string) => (value ? new Date(value).toLocaleDateString() : "-"),
    },
    {
      id: "circle",
      label: "Circle",
      minWidth: 140,
      format: (value: string) => {
        // Render label instead of raw code using loaded circles
        const found = circlesRef.current.find((c) => c.value === value);
        return found ? found.label : value;
      },
    },
    {
      id: "customer_name",
      label: "Customer",
      minWidth: 160,
    },
  ];

  // Get feature permissions
  const { hasFeatureAccess } = useFeaturePermissions();

  // Helper to map legacy UI types to API enum
  const mapUiTypeToApi = (uiType: string): ProjectType => {
    return uiType.toLowerCase() === "dismantle" ? "dismantle" : "other";
  };

  const rowActions: RowAction[] = [
    {
      label: "View Details",
      icon: <Visibility />,
      onClick: (project: any) => {
        window.location.href = `/projects/${project.id}`;
      },
    },
    // Edit action only if user has edit permission
    ...(hasFeatureAccess("project_edit")
      ? [
          {
            label: "Edit",
            icon: <Edit />,
            onClick: (project: any) => {
              setEditingProject(project);
              setFormData({
                name: project.name || "",
                description: project.description || "",
                project_type: (project.project_type as ProjectType) || "other",
                client_id: project.client_tenant || "",
                is_tenant_owner: String(project.client_tenant) === String(currentTenant?.id),
                customer_is_tenant_owner: project.customer_name && project.customer_name === (currentTenant?.organization_name || "") ? true : false,
                customer_name: project.customer_name || "",
                circle: project.circle || "",
                activity: project.activity || "",
                start_date: project.start_date || "",
                end_date: project.end_date || "",
                scope: project.scope || "",
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
            onClick: (project: any) => {
              if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
                projectService
                  .delete(project.id)
                  .then(() => loadProjects())
                  .catch((e) => console.error("Failed to delete", e));
              }
            },
            disabled: (project?: any) => project?.status === "active",
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
      project_type: "other",
      client_id: "",
      is_tenant_owner: true,
      customer_is_tenant_owner: false,
      customer_name: "",
      circle: "",
      activity: "",
      start_date: "",
      end_date: "",
      scope: "",
    });
    setCreateDialogOpen(true);
  };

  const canSubmit = useMemo(() => {
    if (editingProject) {
      return !!formData.name && !!formData.project_type;
    }
    return (
      !!formData.name &&
      !!formData.project_type &&
      (formData.is_tenant_owner || !!formData.client_id) &&
      !!formData.circle &&
      !!formData.activity &&
      (formData.customer_is_tenant_owner || !!formData.customer_name)
    );
  }, [formData, editingProject]);

  const handleSaveProject = async () => {
    try {
      setCreating(true);
      if (editingProject) {
        // Update only Phase 1 editable fields
        const updatePayload: Partial<CreateProjectRequest> = {
          name: formData.name,
          description: formData.description || undefined,
          project_type: formData.project_type,
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
          scope: formData.scope || undefined,
        };
        await projectService.update((editingProject as any).id, updatePayload);
      } else {
        const payload: CreateProjectRequest = {
          name: formData.name,
          description: formData.description || undefined,
          project_type: formData.project_type,
          client_id: formData.is_tenant_owner ? undefined : (formData.client_id as string | number),
          is_tenant_owner: formData.is_tenant_owner || undefined,
          customer_is_tenant_owner: formData.customer_is_tenant_owner || undefined,
          customer_name: formData.customer_is_tenant_owner ? undefined : formData.customer_name || undefined,
          circle: formData.circle,
          activity: formData.activity,
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
          scope: formData.scope || undefined,
        };
        await projectService.create(payload);
      }
      await loadProjects();
      setCreateDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error("Failed to save project:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleFormChange = (field: keyof typeof formData, value: any) => {
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
          rows={projects}
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
                <FormControlLabel
                  control={<Switch checked={formData.is_tenant_owner} onChange={(e) => handleFormChange("is_tenant_owner", e.target.checked)} />}
                  label="This project is owned by my organization"
                />
                <TextField
                  select
                  label="Client"
                  value={formData.client_id}
                  onChange={(e) => handleFormChange("client_id", e.target.value)}
                  fullWidth
                  required={!formData.is_tenant_owner}
                  disabled={formData.is_tenant_owner}
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
                  {clients.map((c) => (
                    <MenuItem key={c.id} value={c.client_tenant}>
                      {c.client_tenant_data?.organization_name || c.vendor_code || c.id}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Project Type"
                  value={formData.project_type}
                  onChange={(e) => handleFormChange("project_type", e.target.value as ProjectType)}
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
                  <MenuItem value="dismantle">Dismantle</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </TextField>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <FormControlLabel
                  control={<Switch checked={formData.customer_is_tenant_owner} onChange={(e) => handleFormChange("customer_is_tenant_owner", e.target.checked)} />}
                  label="Customer is my organization (infrastructure owner)"
                />
                <TextField
                  label="Customer (free text)"
                  value={formData.customer_name}
                  onChange={(e) => handleFormChange("customer_name", e.target.value)}
                  fullWidth
                  required={!formData.customer_is_tenant_owner}
                  disabled={formData.customer_is_tenant_owner}
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
                  label="Telecom Circle"
                  value={formData.circle}
                  onChange={(e) => handleFormChange("circle", e.target.value)}
                  fullWidth
                  required
                  SelectProps={{
                    renderValue: (value: any) => {
                      const circle = circles.find((c) => c.value === value);
                      return circle ? circle.label : value;
                    },
                  }}
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
                  {circles.map((circle) => (
                    <MenuItem key={circle.value} value={circle.value}>
                      {circle.label}
                    </MenuItem>
                  ))}
                  {circles.length === 0 && <MenuItem disabled>Loading circles...</MenuItem>}
                </TextField>
              </Box>

              <TextField
                label="Activity Description"
                value={formData.activity}
                onChange={(e) => handleFormChange("activity", e.target.value)}
                fullWidth
                multiline
                rows={3}
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

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleFormChange("start_date", e.target.value)}
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
              disabled={!canSubmit || creating}
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
              {creating ? "Creating..." : editingProject ? "Update" : "Create"} Project
            </Button>
          </DialogActions>
        </Dialog>

        {/* Project Details Dialog */}
        <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Project Details</DialogTitle>
          <DialogContent dividers>
            {selectedProject && (
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField label="Name" value={selectedProject.name} fullWidth InputProps={{ readOnly: true }} />
                <TextField label="Type" value={selectedProject.project_type} fullWidth InputProps={{ readOnly: true }} />
                <TextField label="Status" value={selectedProject.status} fullWidth InputProps={{ readOnly: true }} />
                <TextField label="Circle" value={selectedProject.circle} fullWidth InputProps={{ readOnly: true }} />
                <TextField label="Customer" value={selectedProject.customer_name || "-"} fullWidth InputProps={{ readOnly: true }} />
                <TextField label="Start Date" value={selectedProject.start_date || "-"} fullWidth InputProps={{ readOnly: true }} />
                <TextField label="End Date" value={selectedProject.end_date || "-"} fullWidth InputProps={{ readOnly: true }} />
                <TextField label="Created By" value={selectedProject.created_by_name || "-"} fullWidth InputProps={{ readOnly: true }} />
                <TextField label="Activity" value={selectedProject.activity} fullWidth multiline rows={3} InputProps={{ readOnly: true }} />
                <TextField label="Scope" value={selectedProject.scope || "-"} fullWidth multiline rows={2} InputProps={{ readOnly: true }} />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </FeatureGate>
    </Box>
  );
};

export default ProjectsPage;

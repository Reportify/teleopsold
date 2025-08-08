import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Box, Breadcrumbs, Typography, Chip, CircularProgress, Button, Divider, Paper } from "@mui/material";
import projectService, { Project } from "../services/projectService";
import { useDarkMode } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { API_ENDPOINTS, apiHelpers, telecomCircleApi } from "../services/api";

const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { darkMode } = useDarkMode();
  const { getCurrentTenant } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");
  const [circleLabel, setCircleLabel] = useState<string>("");

  const formattedStart = useMemo(() => (project?.start_date ? new Date(project.start_date).toLocaleDateString() : "-"), [project]);
  const formattedEnd = useMemo(() => (project?.end_date ? new Date(project.end_date).toLocaleDateString() : "-"), [project]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await projectService.retrieve(id);
        setProject(data);

        // Resolve client organization name
        try {
          const current = getCurrentTenant();
          if (current && String(current.id) === String(data.client_tenant)) {
            setClientName(`${current.organization_name} (My organization)`);
          } else {
            const tenant = await apiHelpers.get<any>(API_ENDPOINTS.TENANTS.DETAIL(String(data.client_tenant)));
            setClientName(tenant?.organization_name || String(data.client_tenant));
          }
        } catch {
          setClientName(String(data.client_tenant));
        }

        // Resolve circle friendly label
        try {
          const circles = await telecomCircleApi.list();
          const found = Array.isArray(circles) ? circles.find((c: any) => c.circle_code === data.circle) : null;
          setCircleLabel(found?.circle_name || data.circle);
        } catch {
          setCircleLabel(data.circle);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!project) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        <Typography color="text.primary">{project.name}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {project.name}
        </Typography>
        <Chip
          size="small"
          label={project.status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase())}
          color={project.status === "completed" ? "success" : project.status === "active" ? "primary" : "default"}
        />
        <Chip size="small" label={project.project_type === "dismantle" ? "Dismantle" : "Other"} />
      </Box>

      <Typography variant="body2" sx={{ color: darkMode ? "#9aa0a6" : "#6b7280", mb: 3 }}>
        {project.description || "No description"}
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Context
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ color: darkMode ? "#9aa0a6" : "#6b7280" }}>
              Client
            </Typography>
            <Typography variant="body1">{clientName}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ color: darkMode ? "#9aa0a6" : "#6b7280" }}>
              Customer
            </Typography>
            <Typography variant="body1">{project.customer_name || "-"}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ color: darkMode ? "#9aa0a6" : "#6b7280" }}>
              Circle
            </Typography>
            <Typography variant="body1">{circleLabel}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ color: darkMode ? "#9aa0a6" : "#6b7280" }}>
              Activity
            </Typography>
            <Typography variant="body1">{project.activity}</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Timeline & Scope
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ color: darkMode ? "#9aa0a6" : "#6b7280" }}>
              Start Date
            </Typography>
            <Typography variant="body1">{formattedStart}</Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ color: darkMode ? "#9aa0a6" : "#6b7280" }}>
              End Date
            </Typography>
            <Typography variant="body1">{formattedEnd}</Typography>
          </Box>
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Typography variant="subtitle2" sx={{ color: darkMode ? "#9aa0a6" : "#6b7280" }}>
              Scope
            </Typography>
            <Typography variant="body1">{project.scope || "-"}</Typography>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="outlined" component={Link} to={`/projects`}>
          Back to Projects
        </Button>
        <Button variant="contained" onClick={() => navigate(`/projects`)}>
          Edit Project
        </Button>
      </Box>
    </Box>
  );
};

export default ProjectDetailsPage;

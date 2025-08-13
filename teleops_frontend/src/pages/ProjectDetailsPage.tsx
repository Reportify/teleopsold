import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Box, Breadcrumbs, Typography, Chip, Button, Divider, Paper, Stack, Grid, Skeleton, Alert } from "@mui/material";
import { BusinessOutlined, PlaceOutlined, CalendarTodayOutlined, BadgeOutlined, InfoOutlined } from "@mui/icons-material";
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
  const [siteCount, setSiteCount] = useState<number | null>(null);
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [vendorCount, setVendorCount] = useState<number | null>(null);

  const formattedStart = useMemo(() => (project?.start_date ? new Date(project.start_date).toLocaleDateString() : "-"), [project]);
  const formattedEnd = useMemo(() => (project?.end_date ? new Date(project.end_date).toLocaleDateString() : "-"), [project]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await projectService.retrieve(id);
        setProject(data);

        // Prefer backend-provided friendly name
        if ((data as any).client_tenant_name) {
          setClientName((data as any).client_tenant_name as string);
        } else {
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
        }

        // Resolve circle friendly label
        try {
          const circles = await telecomCircleApi.list();
          const found = Array.isArray(circles) ? circles.find((c: any) => c.circle_code === data.circle) : null;
          setCircleLabel(found?.circle_name || data.circle);
        } catch {
          setCircleLabel(data.circle);
        }

        // Use project-linked site count from backend annotation
        setSiteCount((data as any).site_count ?? 0);

        // Preload inventory count for dismantle projects
        if ((data as any).project_type === "dismantle") {
          try {
            const res: any = await apiHelpers.get(API_ENDPOINTS.PROJECTS.INVENTORY.SITE_SERIALS(String(id)));
            // If paginated, expect results and count in headers; otherwise use length
            if (Array.isArray(res)) {
              setInventoryCount(res.length);
            } else if (res && Array.isArray(res.results)) {
              setInventoryCount(res.count ?? res.results.length);
            } else {
              setInventoryCount(null);
            }
          } catch {
            setInventoryCount(null);
          }
        }

        // Preload vendors count
        try {
          const vendors: any = await apiHelpers.get(API_ENDPOINTS.PROJECTS.VENDORS.LIST(String(id)));
          const list = Array.isArray(vendors) ? vendors : vendors?.results || [];
          const count = Array.isArray(vendors) ? list.length : vendors?.count ?? list.length;
          setVendorCount(count);
        } catch {
          setVendorCount(null);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const StatusChip: React.FC<{ value: Project["status"] }> = ({ value }) => {
    const color = value === "completed" ? "success" : value === "active" ? "primary" : value === "on_hold" ? "warning" : "default";
    const label = value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
    return <Chip size="small" variant="filled" color={color as any} label={label} />;
  };

  const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value?: React.ReactNode }> = ({ icon, label, value }) => (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1,
          display: "grid",
          placeItems: "center",
          bgcolor: (theme) => (darkMode ? theme.palette.grey[800] : theme.palette.grey[100]),
          color: (theme) => (darkMode ? theme.palette.grey[300] : theme.palette.text.secondary),
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: (theme) => (darkMode ? theme.palette.grey[400] : theme.palette.text.secondary) }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {value || "-"}
        </Typography>
      </Box>
    </Stack>
  );

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/projects">Projects</Link>
          <Typography color="text.primary">Loading…</Typography>
        </Breadcrumbs>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack spacing={1}>
            <Skeleton variant="text" height={36} width={280} />
            <Skeleton variant="text" height={18} width={160} />
          </Stack>
        </Paper>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Skeleton variant="rectangular" height={140} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Skeleton variant="rectangular" height={140} />
            </Paper>
          </Grid>
        </Grid>
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
      {/* Header */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" spacing={1.5}>
          <Box>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {project.name}
              </Typography>
              <StatusChip value={project.status} />
              <Chip size="small" variant="outlined" label={project.project_type === "dismantle" ? "Dismantle" : "Other"} />
            </Stack>
            <Typography variant="body2" sx={{ color: darkMode ? "#9aa0a6" : "#6b7280", mt: 0.5 }}>
              {project.description || "No description provided"}
            </Typography>
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button variant="outlined" component={Link} to={`/projects`}>
              Back
            </Button>
            <Button variant="contained" onClick={() => navigate(`/projects`)}>
              Edit
            </Button>
            {project.project_type === "dismantle" && (
              <Button variant="contained" color="secondary" component={Link} to={`/projects/${project.id}/design`}>
                Open Design
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Quick facts */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
            <InfoItem icon={<BusinessOutlined fontSize="small" />} label="Client" value={clientName} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
            <InfoItem icon={<BadgeOutlined fontSize="small" />} label="Customer" value={project.customer_name || "-"} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
            <InfoItem icon={<PlaceOutlined fontSize="small" />} label="Circle" value={circleLabel} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 6 }}>
            <InfoItem icon={<InfoOutlined fontSize="small" />} label="Activity" value={project.activity} />
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Timeline
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <InfoItem icon={<CalendarTodayOutlined fontSize="small" />} label="Start date" value={formattedStart} />
              <InfoItem icon={<CalendarTodayOutlined fontSize="small" />} label="End date" value={formattedEnd} />
            </Stack>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Scope
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2">{project.scope || "-"}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Project Sites summary */}
      <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Project Sites
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {siteCount === null ? "-" : `${siteCount} site${siteCount === 1 ? "" : "s"}`} available
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" component={Link} to={`/projects/${project.id}/sites`}>
              Details
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Project Vendors summary */}
      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Project Vendors
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {vendorCount == null ? "-" : `${vendorCount} vendor${vendorCount === 1 ? "" : "s"}`} linked
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" component={Link} to={`/projects/${project.id}/vendors`}>
              Details
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Project Inventory summary (dismantle only) */}
      {project.project_type === "dismantle" && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between">
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Project Inventory (Dismantle)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {inventoryCount == null ? "-" : `${inventoryCount} serial${inventoryCount === 1 ? "" : "s"}`} planned
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" component={Link} to={`/projects/${project.id}/inventory`}>
                Details
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default ProjectDetailsPage;

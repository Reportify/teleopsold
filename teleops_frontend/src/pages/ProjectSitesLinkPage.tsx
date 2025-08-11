import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Box, Breadcrumbs, Typography, Paper, Stack, TextField, Button, Table, TableHead, TableBody, TableRow, TableCell, Checkbox, TableContainer, LinearProgress, Alert } from "@mui/material";
import { API_ENDPOINTS, apiHelpers } from "../services/api";

interface MasterSiteRow {
  id: number;
  site_id: string;
  global_id: string;
  site_name: string;
  town: string;
  cluster: string;
}

const ProjectSitesLinkPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rows, setRows] = useState<MasterSiteRow[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await apiHelpers.get(API_ENDPOINTS.SITES.LIST);
      setRows(res?.sites || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load sites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((r) => `${r.site_id} ${r.global_id} ${r.site_name} ${r.town} ${r.cluster}`.toLowerCase().includes(q));
  }, [rows, search]);

  const toggle = (siteId: number) => {
    setSelected((prev) => (prev.includes(siteId) ? prev.filter((p) => p !== siteId) : [...prev, siteId]));
  };

  const linkSelected = async () => {
    if (!id || selected.length === 0) return;
    setSubmitting(true);
    try {
      await apiHelpers.post(API_ENDPOINTS.PROJECTS.SITES.LINK(String(id)), { site_ids: selected });
      navigate(`/projects/${id}/sites`);
    } catch (e: any) {
      setError(e?.message || "Failed to link sites");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        <Link to={`/projects/${id}`}>Project Details</Link>
        <Link to={`/projects/${id}/sites`}>Project Sites</Link>
        <Typography color="text.primary">Link Sites</Typography>
      </Breadcrumbs>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
          <TextField placeholder="Search master sites…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ width: { xs: "100%", sm: 360 } }} />
          <Stack direction="row" spacing={1}>
            <Button variant="text" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button variant="outlined" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button variant="contained" onClick={linkSelected} disabled={submitting || selected.length === 0}>
              Link {selected.length > 0 ? `(${selected.length})` : "Sites"}
            </Button>
            <Button variant="text" onClick={() => navigate(`/projects/${id}/sites`)}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        {loading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox disabled />
                </TableCell>
                <TableCell>Site</TableCell>
                <TableCell>IDs</TableCell>
                <TableCell>Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {r.site_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">ID: {r.site_id}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Global: {r.global_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{r.town}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cluster: {r.cluster}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No master sites found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ProjectSitesLinkPage;

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Breadcrumbs,
  Typography,
  Button,
  Paper,
  Stack,
  Card,
  CardContent,
  Grid,
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
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Add, CloudUpload, Refresh, Download } from "@mui/icons-material";
import { API_ENDPOINTS, apiHelpers } from "../services/api";

interface SiteRow {
  id: number;
  site_id: string;
  global_id: string;
  site_name: string;
  town: string;
  cluster: string;
  latitude: number | null;
  longitude: number | null;
  site_type: string;
  status: string;
  contact_person?: string;
  contact_phone?: string;
  has_coordinates: boolean;
}

const ProjectSitesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SiteRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [siteType, setSiteType] = useState("all");
  const [cluster, setCluster] = useState("all");
  const [town, setTown] = useState("all");
  const [clusters, setClusters] = useState<Array<{ cluster: string; site_count: number }>>([]);
  const [towns, setTowns] = useState<Array<{ town: string; site_count: number }>>([]);
  const [openImport, setOpenImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [importUploading, setImportUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch project-linked sites
      const links: any[] = await apiHelpers.get(API_ENDPOINTS.PROJECTS.SITES.LIST(String(id)));
      const rowsFromLinks: SiteRow[] = (links || []).map((l: any) => ({
        id: l.site_details?.id ?? l.site,
        site_id: l.site_details?.site_id,
        global_id: l.site_details?.global_id,
        site_name: l.site_details?.site_name,
        town: l.site_details?.town,
        cluster: l.site_details?.cluster,
        latitude: l.site_details?.latitude ?? null,
        longitude: l.site_details?.longitude ?? null,
        site_type: l.site_details?.site_type || "tower",
        status: l.site_details?.status || "active",
        contact_person: l.site_details?.contact_person,
        contact_phone: l.site_details?.contact_phone,
        has_coordinates: l.site_details?.latitude != null && l.site_details?.longitude != null,
      }));
      setRows(rowsFromLinks);
      // Populate filters from current linked sites dataset
      const clusterMap: Record<string, number> = {};
      const townMap: Record<string, number> = {};
      rowsFromLinks.forEach((r) => {
        if (r.cluster) clusterMap[r.cluster] = (clusterMap[r.cluster] || 0) + 1;
        if (r.town) townMap[r.town] = (townMap[r.town] || 0) + 1;
      });
      setClusters(
        Object.keys(clusterMap)
          .sort()
          .map((k) => ({ cluster: k, site_count: clusterMap[k] }))
      );
      setTowns(
        Object.keys(townMap)
          .sort()
          .map((k) => ({ town: k, site_count: townMap[k] }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const filtered = useMemo(() => {
    return rows.filter((s) => {
      const text = `${s.site_name} ${s.site_id} ${s.global_id} ${s.town} ${s.cluster}`.toLowerCase();
      const matchesText = text.includes(search.toLowerCase());
      const matchesStatus = status === "all" || s.status === status;
      const matchesType = siteType === "all" || s.site_type === siteType;
      const matchesCluster = cluster === "all" || s.cluster === cluster;
      const matchesTown = town === "all" || s.town === town;
      return matchesText && matchesStatus && matchesType && matchesCluster && matchesTown;
    });
  }, [rows, search, status, siteType, cluster, town]);

  const formatCoord = (v: number | null) => (v == null ? "N/A" : v.toFixed(6));

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        <Link to={`/projects/${id}`}>Project Details</Link>
        <Typography color="text.primary">Project Sites</Typography>
      </Breadcrumbs>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Project Sites
            </Typography>
            <Chip size="small" variant="outlined" label={`${rows.length} site${rows.length === 1 ? "" : "s"}`} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<CloudUpload />} onClick={() => setOpenImport(true)}>
              Bulk Import
            </Button>
            <Button variant="outlined" startIcon={<Add />} onClick={() => navigate(`/projects/${id}/sites/link`)}>
              Link Sites
            </Button>
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadData}>
              Refresh
            </Button>
            <Button variant="contained" onClick={() => navigate(-1)}>
              Back
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth placeholder="Search sites…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Site Type</InputLabel>
                <Select label="Site Type" value={siteType} onChange={(e) => setSiteType(e.target.value)}>
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="tower">Tower</MenuItem>
                  <MenuItem value="data_center">Data Center</MenuItem>
                  <MenuItem value="exchange">Exchange</MenuItem>
                  <MenuItem value="office">Office</MenuItem>
                  <MenuItem value="warehouse">Warehouse</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Cluster</InputLabel>
                <Select label="Cluster" value={cluster} onChange={(e) => setCluster(e.target.value)}>
                  <MenuItem value="all">All Clusters</MenuItem>
                  {clusters.map((c) => (
                    <MenuItem key={c.cluster} value={c.cluster}>
                      {c.cluster} ({c.site_count})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Town</InputLabel>
                <Select label="Town" value={town} onChange={(e) => setTown(e.target.value)}>
                  <MenuItem value="all">All Towns</MenuItem>
                  {towns.map((t) => (
                    <MenuItem key={t.town} value={t.town}>
                      {t.town} ({t.site_count})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Site Information</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>GPS Coordinates</TableCell>
                  <TableCell>Type & Status</TableCell>
                  <TableCell>Contact Info</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {s.site_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ID: {s.site_id} | Global: {s.global_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{s.town}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Cluster: {s.cluster}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {s.has_coordinates ? (
                        <Typography variant="body2">
                          {formatCoord(s.latitude)}, {formatCoord(s.longitude)}
                        </Typography>
                      ) : (
                        <Chip size="small" color="error" label="No GPS Data" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Chip size="small" variant="outlined" label={(s.site_type || "").replace("_", " ").toUpperCase()} />
                        <Chip size="small" color={s.status === "active" ? "success" : s.status === "maintenance" ? "warning" : "default"} label={s.status?.toUpperCase()} />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{s.contact_person || "-"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.contact_phone || ""}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No sites found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Bulk Import Modal */}
      <Dialog open={openImport} onClose={() => setOpenImport(false)} fullWidth maxWidth="sm">
        <DialogTitle>Import Project Sites</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Upload an Excel/CSV file with columns: site_id, global_id, site_name, town, cluster, address, latitude, longitude
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
              <Button variant="outlined" startIcon={<Download />} onClick={() => apiHelpers.download(API_ENDPOINTS.SITES.TEMPLATE, "sites_upload_template.xlsx")}>
                Download Template
              </Button>
            </Stack>
            {importError && <Alert severity="error">{importError}</Alert>}
            {importResult && (
              <Alert severity="success">
                Created Master: {importResult.created_master} | Linked: {importResult.linked} | Skipped: {importResult.skipped}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImport(false)}>Close</Button>
          <Button
            variant="contained"
            disabled={!importFile || importUploading}
            startIcon={importUploading ? <CircularProgress size={18} color="inherit" /> : undefined}
            onClick={async () => {
              if (!importFile) return;
              setImportError(null);
              try {
                const form = new FormData();
                form.append("file", importFile);
                setImportUploading(true);
                const res = await apiHelpers.post<any>(API_ENDPOINTS.PROJECTS.SITES.IMPORT(String(id)), form, {
                  headers: { "Content-Type": "multipart/form-data" },
                });
                setImportResult(res);
                await loadData();
                // Close modal on success and reset state
                setOpenImport(false);
                setImportFile(null);
                setImportResult(null);
                setImportUploading(false);
              } catch (e: any) {
                setImportError(e?.message || "Failed to import file");
                setImportUploading(false);
              }
            }}
          >
            {importUploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectSitesPage;

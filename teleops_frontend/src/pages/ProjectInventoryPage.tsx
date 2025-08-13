import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Breadcrumbs,
  Typography,
  Paper,
  Stack,
  Button,
  Grid,
  TextField,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Add, CloudUpload, Refresh, Download, PlaceOutlined, SortByAlpha, FormatListNumbered, ExpandLess, ExpandMore, ContentCopy, Search } from "@mui/icons-material";
import { API_ENDPOINTS, apiHelpers } from "../services/api";

interface SerialRow {
  id: number;
  project_site: number;
  equipment_item: number;
  equipment_item_name: string;
  equipment_category?: string;
  serial_number: string;
  equipment_model?: string;
  site_id_business?: string;
}

const ProjectInventoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SerialRow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [openImport, setOpenImport] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [siteSort, setSiteSort] = useState<"alpha" | "qty">("alpha");
  const [expandedRadio, setExpandedRadio] = useState(true);
  const [expandedDug, setExpandedDug] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [siteInfoMap, setSiteInfoMap] = useState<Record<string, { site_id?: string; global_id?: string; site_name?: string }>>({});
  const [totalCount, setTotalCount] = useState<number>(0);
  const [sitesCount, setSitesCount] = useState<number>(0);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // ignore
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await apiHelpers.get(API_ENDPOINTS.PROJECTS.INVENTORY.SITE_SERIALS(String(id)), { params: { page_size: 5000 } });
      const list = Array.isArray(res) ? res : res?.results || [];
      const count = Array.isArray(res) ? list.length : res?.count ?? list.length;
      setTotalCount(count);
      setRows(list);

      // Fetch linked project sites once to enrich left list with global_id and site_name
      try {
        const siteRes: any = await apiHelpers.get(API_ENDPOINTS.PROJECTS.SITES.LIST(String(id)));
        const siteList = Array.isArray(siteRes) ? siteRes : siteRes?.results || [];
        const info: Record<string, { site_id?: string; global_id?: string; site_name?: string }> = {};
        siteList.forEach((ps: any) => {
          const d = ps?.site_details || {};
          const payload = { site_id: d?.site_id, global_id: d?.global_id, site_name: d?.site_name };
          if (d?.site_id) info[d.site_id] = payload;
          // Some tenants use business Site ID in global_id; map both keys so lookups by either value work
          if (d?.global_id) info[d.global_id] = payload;
        });
        setSiteInfoMap(info);
        setSitesCount(siteList.length);
      } catch (e) {
        // best-effort enrichment; ignore failures
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  // Aggregate by site
  const { sites, bySite } = useMemo(() => {
    const map: Record<string, { total: number; items: SerialRow[] }> = {};
    for (const r of rows) {
      const site = (r as any).site_id_business || "Unknown";
      if (!map[site]) map[site] = { total: 0, items: [] };
      map[site].total += 1;
      map[site].items.push(r);
    }
    let siteList = Object.keys(map).filter((s) => s.toLowerCase().includes(search.toLowerCase()));
    siteList = siteSort === "alpha" ? siteList.sort((a, b) => a.localeCompare(b)) : siteList.sort((a, b) => map[b].total - map[a].total || a.localeCompare(b));
    const siteTuples = siteList.map((s) => ({ site: s, total: map[s].total }));
    return { sites: siteTuples, bySite: map };
  }, [rows, search, siteSort]);

  useEffect(() => {
    if (!selectedSite && sites.length > 0) setSelectedSite(sites[0].site);
  }, [sites, selectedSite]);

  const groupForSite = useMemo(() => {
    const data = selectedSite ? bySite[selectedSite]?.items || [] : [];
    const groups: Record<string, Record<string, string[]>> = {};
    const categoryName = (row: SerialRow) => row.equipment_category || row.equipment_item_name || "Uncategorized";
    const typeOf = (name?: string) => name || "UNKNOWN";
    data.forEach((r) => {
      const cat = categoryName(r);
      const type = typeOf(r.equipment_item_name);
      if (!groups[cat]) groups[cat] = {};
      if (!groups[cat][type]) groups[cat][type] = [];
      groups[cat][type].push(r.serial_number);
    });
    return groups;
  }, [selectedSite, bySite]);

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        <Link to={`/projects/${id}`}>Project Details</Link>
        <Typography color="text.primary">Project Inventory</Typography>
      </Breadcrumbs>

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
              Project Inventory (Dismantle)
            </Typography>
            <Chip size="small" variant="outlined" label={`${totalCount} serial${totalCount === 1 ? "" : "s"}`} />
            <Chip size="small" variant="outlined" label={`${sitesCount} site${sitesCount === 1 ? "" : "s"}`} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<CloudUpload />} onClick={() => setOpenImport(true)}>
              Bulk Upload
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => apiHelpers.download(API_ENDPOINTS.PROJECTS.INVENTORY.DISMANTLE_TEMPLATE(String(id)), "dismantle_planned_inventory_template.xlsx")}
            >
              Template
            </Button>
            <Button variant="text" startIcon={<Refresh />} onClick={load}>
              Refresh
            </Button>
            <Button variant="contained" onClick={() => navigate(-1)}>
              Back
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {/* Left: Sites list */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, position: "sticky", top: 8 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <TextField fullWidth size="small" placeholder="Search by Site ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <ToggleButtonGroup size="small" value={siteSort} exclusive onChange={(_, v) => v && setSiteSort(v)} aria-label="sort sites">
                <ToggleButton value="alpha" aria-label="sort-by-name">
                  <SortByAlpha fontSize="small" />
                </ToggleButton>
                <ToggleButton value="qty" aria-label="sort-by-qty">
                  <FormatListNumbered fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <List dense sx={{ maxHeight: 600, overflowY: "auto", px: 0 }}>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <ListItemButton key={i} sx={{ py: 1.25 }} disabled>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <Skeleton variant="circular" width={18} height={18} />
                      </ListItemIcon>
                      <ListItemText primary={<Skeleton width={120} />} />
                      <Skeleton variant="rounded" width={44} height={22} />
                    </ListItemButton>
                  ))
                : sites.map(({ site, total }) => {
                    const extra = siteInfoMap[site];
                    const primaryLabel = extra?.site_id || site;
                    const secondary = [extra?.global_id, extra?.site_name].filter(Boolean).join(" • ");
                    return (
                      <ListItemButton key={site} selected={selectedSite === site} onClick={() => setSelectedSite(site)} sx={{ borderRadius: 1, mb: 0.25, py: 1.25 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <PlaceOutlined fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                              {primaryLabel}
                            </Typography>
                          }
                          secondary={
                            extra ? (
                              <Stack spacing={0.25}>
                                {extra.site_name && (
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {extra.site_name}
                                  </Typography>
                                )}
                                {extra.global_id && (
                                  <Typography variant="caption" color="text.secondary" noWrap>
                                    {extra.global_id}
                                  </Typography>
                                )}
                              </Stack>
                            ) : undefined
                          }
                        />
                        <Chip size="small" variant="outlined" label={`Qty: ${total}`} />
                      </ListItemButton>
                    );
                  })}
              {!loading && sites.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
                  No sites
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Right: Equipment by category/type for selected site */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <PlaceOutlined color="primary" fontSize="small" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {selectedSite || "Select a site"}
              </Typography>
              {selectedSite && <Chip size="small" label={`Qty: ${bySite[selectedSite]?.total || 0}`} />}
              <Box sx={{ flex: 1 }} />
            </Stack>

            {/* Dynamic Category Section 1 (first category if exists) */}
            {Object.keys(groupForSite).length > 0 && (
              <>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5, color: "text.secondary" }}>
                  <Typography variant="overline" sx={{ fontWeight: 700 }}>
                    {Object.keys(groupForSite)[0]}
                  </Typography>
                </Stack>
                <Grid container spacing={2.5} sx={{ mb: 2 }}>
                  {Object.entries(groupForSite[Object.keys(groupForSite)[0]]).map(([type, serials]) => (
                    <Grid size={{ xs: 12, md: 6 }} key={type}>
                      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {type}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={`Qty: ${(serials as string[]).length}`} />
                            <Tooltip title="Copy all">
                              <IconButton size="small" onClick={() => copyToClipboard((serials as string[]).join(", "))}>
                                <ContentCopy fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>
                        <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                          Serials:
                        </Typography>
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                          {(serials as string[]).map((s) => (
                            <Tooltip title="Copy" key={s}>
                              <Chip size="small" variant="outlined" label={s} onClick={() => copyToClipboard(s)} clickable />
                            </Tooltip>
                          ))}
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}

            {/* Remaining categories */}
            {Object.keys(groupForSite)
              .slice(1)
              .map((cat) => (
                <React.Fragment key={cat}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5, color: "text.secondary" }}>
                    <Typography variant="overline" sx={{ fontWeight: 700 }}>
                      {cat}
                    </Typography>
                  </Stack>
                  <Grid container spacing={2.5}>
                    {Object.entries(groupForSite[cat]).map(([type, serials]) => (
                      <Grid size={{ xs: 12, md: 6 }} key={type}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {type}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip size="small" label={`Qty: ${(serials as string[]).length}`} />
                              <Tooltip title="Copy all">
                                <IconButton size="small" onClick={() => copyToClipboard((serials as string[]).join(", "))}>
                                  <ContentCopy fontSize="inherit" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </Stack>
                          <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
                            Serials:
                          </Typography>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                            {(serials as string[]).map((s) => (
                              <Tooltip title="Copy" key={s}>
                                <Chip size="small" variant="outlined" label={s} onClick={() => copyToClipboard(s)} clickable />
                              </Tooltip>
                            ))}
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </React.Fragment>
              ))}
          </Paper>
        </Grid>
      </Grid>

      {/* Bulk Upload Modal */}
      <Dialog open={openImport} onClose={() => setOpenImport(false)} fullWidth maxWidth="sm">
        <DialogTitle>Upload Dismantle Plan</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Excel/CSV with columns: Site ID, Radio, Radio Serial, DXU, DXU Serial
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </Stack>
            {error && <Alert severity="error">{error}</Alert>}
            {summary && (
              <Alert severity={summary?.errors && summary.errors.length ? "warning" : "success"}>
                Created: {summary.created} | Skipped: {summary.skipped}
                {summary?.errors && summary.errors.length > 0 && (
                  <>
                    <br />
                    First errors:
                    <ul style={{ marginTop: 4 }}>
                      {summary.errors.slice(0, 5).map((e: any, idx: number) => (
                        <li key={idx}>
                          Row {e.row}: {e.error}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImport(false)}>Close</Button>
          <Button
            variant="contained"
            disabled={!file || uploading}
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : undefined}
            onClick={async () => {
              if (!file) return;
              setError(null);
              setUploading(true);
              try {
                const form = new FormData();
                form.append("file", file);
                const res = await apiHelpers.post<any>(API_ENDPOINTS.PROJECTS.INVENTORY.DISMANTLE_UPLOAD(String(id)), form, {
                  headers: { "Content-Type": "multipart/form-data" },
                  timeout: 180000,
                });
                setSummary(res);
                await load();
                // Keep modal open if there are errors so user can read them
                if (!(res?.errors && res.errors.length)) {
                  setOpenImport(false);
                  setFile(null);
                  setSummary(null);
                }
              } catch (e: any) {
                setError(e?.message || "Upload failed");
              } finally {
                setUploading(false);
              }
            }}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectInventoryPage;

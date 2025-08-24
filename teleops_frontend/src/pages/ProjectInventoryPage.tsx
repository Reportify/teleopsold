import React, { useEffect, useMemo, useState, useRef } from "react";
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { Add, CloudUpload, Refresh, Download, PlaceOutlined, SortByAlpha, FormatListNumbered, ExpandLess, ExpandMore, ContentCopy, Search, ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
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

interface UploadResult {
  // Sync upload result
  plan_id?: number;
  created?: number;
  skipped?: number;
  errors?: Array<{ row: number; error: string }>;
  has_more_errors?: boolean;

  // Async upload result
  job_id?: number;
  status?: string;
  message?: string;
  estimated_rows?: number;
  file_name?: string;
  total_rows?: number;
  processed_rows?: number;
  progress_percentage?: number;
  created_count?: number;
  skipped_count?: number;
  error_count?: number;
  error_message?: string;
  detailed_errors?: Array<{ row?: number; error?: string; message?: string; [key: string]: any }>;
  duration?: string;
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
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  // Async processing states
  const [isAsyncUpload, setIsAsyncUpload] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [jobStatusInterval, setJobStatusInterval] = useState<NodeJS.Timeout | null>(null);
  const [pollingTimeout, setPollingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Refs for stable polling
  const activeJobIdRef = useRef<number | null>(null);
  const pollCountRef = useRef<number>(0);
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

  // Add CSS for custom spinner
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopJobStatusPolling();
    };
  }, []);

  // Intelligent file size detection and upload selection
  const handleBulkUpload = async () => {
    if (!file || !id) return;

    console.log(`🚨🚨🚨 PROJECT INVENTORY: Upload clicked! 🚨🚨🚨`);
    console.log(`🚨🚨🚨 File:`, file.name, `Size:`, file.size);

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      // Check file size and estimate row count for large files
      const fileSizeMB = file.size / (1024 * 1024);
      const fileSizeKB = file.size / 1024;

      // For Excel files, estimate row count based on file size
      // Excel files are typically ~1KB per row, so estimate rows from file size
      let estimatedRows = 0;
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        estimatedRows = Math.round(fileSizeKB * 0.8); // Estimate 0.8 rows per KB
      }

      // Always use async for better progress tracking and user experience
      // TEMPORARY: Use sync for now due to backend 500 error on async endpoint
      const useAsync = false; // TODO: Fix backend async endpoint and re-enable
      console.log(`⚠️ TEMPORARY: Using sync endpoint due to backend async issues`);

      console.log(`🚨🚨🚨 File Analysis:`, {
        sizeMB: fileSizeMB.toFixed(2),
        estimatedRows,
        useAsync,
        endpoint: useAsync ? "ASYNC" : "SYNC",
      });

      setIsAsyncUpload(useAsync);

      const formData = new FormData();
      formData.append("file", file);

      // Use appropriate endpoint
      const endpoint = useAsync ? API_ENDPOINTS.PROJECTS.INVENTORY.DISMANTLE_UPLOAD_ASYNC(String(id)) : API_ENDPOINTS.PROJECTS.INVENTORY.DISMANTLE_UPLOAD(String(id));

      console.log(`🚨🚨🚨 CALLING ENDPOINT:`, endpoint);

      const res = await apiHelpers.post<UploadResult>(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: useAsync ? 120000 : 60000, // 2 min async, 1 min sync
      });

      console.log(`🚨🚨🚨 RESPONSE:`, res);
      console.log(`🚨🚨🚨 RESPONSE STRUCTURE:`, {
        hasJobId: !!res.job_id,
        jobId: res.job_id,
        status: res.status,
        message: res.message,
        created: res.created,
        skipped: res.skipped,
        estimatedRows: res.estimated_rows,
      });

      setUploadResult(res);

      if (useAsync && res.job_id) {
        // Start polling for async jobs
        console.log(`🚨🚨🚨 Starting job polling for async upload 🚨🚨🚨`);
        startJobStatusPolling(res.job_id);
        // Don't close modal for async uploads so user can see progress
      } else {
        // Sync upload completed
        await load();
        setUploading(false);
      }
    } catch (e: any) {
      console.error("🚨🚨🚨 INVENTORY IMPORT FAILED 🚨🚨🚨");
      console.error("🚨🚨🚨 Error Object:", e);
      console.error("🚨🚨🚨 Error Response:", e?.response);
      console.error("🚨🚨🚨 Error Message:", e?.message);

      // Better error message handling
      let errorMessage = "Upload failed";
      if (e?.response?.status === 500) {
        errorMessage = "🚨 Server error occurred during async upload. The backend may need attention. Please contact support.";
        console.error("🚨🚨🚨 500 ERROR: Backend async endpoint failed");
      } else if (e?.response?.data?.error) {
        errorMessage = e.response.data.error;
      } else if (e?.response?.data?.detail) {
        errorMessage = e.response.data.detail;
      } else if (e?.message) {
        errorMessage = e.message;
      } else if (e?.code === "ECONNABORTED") {
        errorMessage = "Upload timed out. The file may be too large. Please try again or contact support.";
      }

      setError(errorMessage);
      setUploading(false);
    }
  };

  // Start polling for job status
  const startJobStatusPolling = (jobId: number) => {
    console.log(`🔄 Starting polling for inventory job ${jobId}`);

    // Clear any existing intervals
    stopJobStatusPolling();

    setIsPolling(true);
    activeJobIdRef.current = jobId;
    pollCountRef.current = 0;

    // Start polling with a slight delay to ensure React state updates
    setTimeout(() => {
      checkJobStatus(jobId);
    }, 100);

    const interval = setInterval(() => {
      checkJobStatus(jobId);
    }, 2000); // Poll every 2 seconds

    setJobStatusInterval(interval);

    // Set a 30-minute timeout for safety
    const timeout = setTimeout(() => {
      console.log("⚠️ Inventory job polling timed out after 30 minutes");
      stopJobStatusPolling();
      setError("Upload timed out. Please check the status manually.");
    }, 30 * 60 * 1000); // 30 minutes

    setPollingTimeout(timeout);
  };

  // Stop polling
  const stopJobStatusPolling = () => {
    console.log("🛑 Stopping inventory job polling");

    if (jobStatusInterval) {
      clearInterval(jobStatusInterval);
      setJobStatusInterval(null);
    }

    if (pollingTimeout) {
      clearTimeout(pollingTimeout);
      setPollingTimeout(null);
    }

    setIsPolling(false);
    activeJobIdRef.current = null;
    pollCountRef.current = 0;
  };

  // Check job status
  const checkJobStatus = async (jobId: number) => {
    // Prevent stale calls
    if (activeJobIdRef.current !== jobId) {
      console.log(`🚫 Skipping stale job status check for job ${jobId}`);
      return;
    }

    try {
      pollCountRef.current += 1;

      // Safety check for excessive polling
      if (pollCountRef.current > 100) {
        console.log("⚠️ Stopping inventory job polling after 100 attempts");
        stopJobStatusPolling();
        setError("Polling limit reached. Please refresh to check status.");
        return;
      }

      const jobData = await apiHelpers.get<UploadResult>(API_ENDPOINTS.PROJECTS.INVENTORY.DISMANTLE_UPLOAD_JOB_DETAIL(String(id), jobId));

      console.log(`📊 Inventory Job ${jobId} status: ${jobData.status} (${jobData.progress_percentage || 0}%)`);

      // Enhanced logging for debugging
      if (jobData.status === "failed") {
        console.error(`🚨🚨🚨 INVENTORY JOB FAILED 🚨🚨🚨`);
        console.error(`🚨 Job ID: ${jobId}`);
        console.error(`🚨 Error Message:`, jobData.error_message);
        console.error(`🚨 Message:`, jobData.message);
        console.error(`🚨 Error Count:`, jobData.error_count);
        console.error(`🚨 Detailed Errors:`, jobData.detailed_errors);
        console.error(`🚨 Full Job Data:`, jobData);
      }

      setUploadResult((prev: any) => ({
        ...prev,
        ...jobData,
        // Add fallback progress calculation
        progress_percentage: jobData.progress_percentage || (jobData.total_rows ? Math.round(((jobData.processed_rows || 0) / jobData.total_rows) * 100) : 0),
      }));

      if (jobData.status === "completed" || jobData.status === "failed") {
        console.log(`🏁 Inventory Job ${jobId} finished with status: ${jobData.status}`);

        if (jobData.status === "failed") {
          console.log(`🔍 Failure Analysis:`);
          console.log(`   - Total Rows: ${jobData.total_rows}`);
          console.log(`   - Processed Rows: ${jobData.processed_rows}`);
          console.log(`   - Created Count: ${jobData.created_count}`);
          console.log(`   - Error Count: ${jobData.error_count}`);
          console.log(`   - Duration: ${jobData.duration}`);
        }

        stopJobStatusPolling();
        setUploading(false);

        if (jobData.status === "completed" && jobData.error_count === 0) {
          // Auto-close dialog after successful async upload with no errors
          setTimeout(() => {
            setOpenImport(false);
            setFile(null);
            setUploadResult(null);
          }, 3000);
        }

        await load(); // Refresh data
      }
    } catch (error) {
      console.error("❌ Error checking inventory job status:", error);
      stopJobStatusPolling();
      setError("Failed to check upload status");
      setUploading(false);
    }
  };

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
      <Dialog
        open={openImport}
        onClose={() => {
          if (isPolling) {
            stopJobStatusPolling();
          }
          setOpenImport(false);
          setFile(null);
          setUploadResult(null);
          setError(null);
        }}
        fullWidth
        maxWidth="md"
        disableEscapeKeyDown={uploading}
      >
        <DialogTitle>Upload Dismantle Plan</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Excel/CSV with columns: Site ID, Radio, Radio Serial, DXU, DXU Serial
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading} />
            </Stack>

            {/* Progress Indicator */}
            {uploading && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {isAsyncUpload ? "Processing Large File..." : "Uploading..."}
                </Typography>
                {isAsyncUpload && (
                  <Typography variant="body2" color="info.main" sx={{ mb: 1 }}>
                    ⚡ Large file detected - using background processing to prevent timeouts
                  </Typography>
                )}

                {uploadResult?.status === "processing" && (
                  <>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          border: "2px solid #1976d2",
                          borderTop: "2px solid transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                          mr: 1,
                        }}
                      />
                      <Typography variant="subtitle2">{uploadResult.message || "Processing in background..."}</Typography>
                    </Box>

                    <LinearProgress
                      variant={uploadResult.progress_percentage ? "determinate" : "indeterminate"}
                      value={uploadResult.progress_percentage || 0}
                      sx={{
                        mb: 1,
                        height: 8,
                        borderRadius: 4,
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 4,
                        },
                      }}
                    />

                    <Typography variant="caption" color="text.secondary">
                      {uploadResult.progress_percentage
                        ? `Progress: ${uploadResult.progress_percentage}% (${uploadResult.processed_rows || 0}/${uploadResult.total_rows || 0} rows processed)`
                        : "Processing in background..."}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      Processing in background... This may take a few minutes for large files.
                    </Typography>
                  </>
                )}

                {!uploadResult?.progress_percentage && (
                  <>
                    <Box
                      sx={{
                        display: "inline-block",
                        width: 16,
                        height: 16,
                        border: "2px solid #f3f3f3",
                        borderTop: "2px solid #3498db",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        mr: 1,
                      }}
                    />
                    <LinearProgress sx={{ mb: 1 }} />
                  </>
                )}
              </Paper>
            )}

            {error && <Alert severity="error">{error}</Alert>}

            {/* Upload Results */}
            {uploadResult && !uploading && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Import Summary
                </Typography>

                {/* Success metrics */}
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Chip label={`Created: ${uploadResult.created || uploadResult.created_count || 0}`} color="success" variant="outlined" />
                  <Chip label={`Skipped: ${uploadResult.skipped || uploadResult.skipped_count || 0}`} color="info" variant="outlined" />
                  {((uploadResult.error_count && uploadResult.error_count > 0) || (uploadResult.errors && uploadResult.errors.length > 0)) && (
                    <Chip label={`Errors: ${uploadResult.error_count || uploadResult.errors?.length || 0}`} color="error" variant="outlined" />
                  )}
                </Stack>

                {/* Status indicator for async uploads */}
                {uploadResult.status && (
                  <Alert
                    severity={uploadResult.status === "completed" ? "success" : uploadResult.status === "failed" ? "error" : uploadResult.status === "processing" ? "info" : "warning"}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Status: {uploadResult.status.charAt(0).toUpperCase() + uploadResult.status.slice(1)}
                    </Typography>

                    {uploadResult.status === "completed" && uploadResult.error_count === 0 && (
                      <Typography variant="body2" color="success.main">
                        ✅ Import completed successfully!
                      </Typography>
                    )}

                    {uploadResult.status === "completed" && (uploadResult.error_count || 0) > 0 && (
                      <Typography variant="body2" color="warning.main">
                        ⚠️ Import completed with {uploadResult.error_count || 0} errors. Review errors below.
                      </Typography>
                    )}

                    {uploadResult.status === "failed" && (
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="error.main">
                          ❌ Import failed to complete
                        </Typography>

                        {uploadResult.error_message && (
                          <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                            Error: {uploadResult.error_message}
                          </Typography>
                        )}

                        {uploadResult.message && uploadResult.message !== uploadResult.error_message && (
                          <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                            Details: {uploadResult.message}
                          </Typography>
                        )}

                        {uploadResult.detailed_errors && uploadResult.detailed_errors.length > 0 && (
                          <Typography variant="body2" color="text.secondary">
                            📋 {uploadResult.detailed_errors.length} detailed error(s) available below
                          </Typography>
                        )}

                        {!uploadResult.error_message && !uploadResult.message && !uploadResult.detailed_errors && (
                          <Typography variant="body2" color="text.secondary">
                            ⚠️ No specific error details available. Check backend logs for more information.
                          </Typography>
                        )}
                      </Stack>
                    )}

                    {uploadResult.status === "processing" && (
                      <Typography variant="body2" color="info.main">
                        🔄 Processing {uploadResult.total_rows} rows... ({uploadResult.progress_percentage || 0}% complete)
                      </Typography>
                    )}
                  </Alert>
                )}

                {/* Error details - handles both sync errors and async detailed_errors */}
                {((uploadResult.errors && uploadResult.errors.length > 0) || (uploadResult.detailed_errors && uploadResult.detailed_errors.length > 0)) && (
                  <Accordion sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2" color="error">
                        📋 Import Errors ({(uploadResult.errors?.length || 0) + (uploadResult.detailed_errors?.length || 0)})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                        {/* Display sync errors */}
                        {uploadResult.errors &&
                          uploadResult.errors.map((error, index) => (
                            <Alert key={`sync-error-${index}`} severity="error" sx={{ mb: 1 }}>
                              <Typography variant="body2">
                                <strong>Row {error.row}:</strong> {error.error}
                              </Typography>
                            </Alert>
                          ))}

                        {/* Display async detailed errors */}
                        {uploadResult.detailed_errors &&
                          uploadResult.detailed_errors.map((error, index) => (
                            <Alert key={`async-error-${index}`} severity="error" sx={{ mb: 1 }}>
                              <Typography variant="body2">
                                {error.row ? (
                                  <>
                                    <strong>Row {error.row}:</strong> {error.error || error.message || JSON.stringify(error)}
                                  </>
                                ) : (
                                  <>{error.error || error.message || JSON.stringify(error)}</>
                                )}
                              </Typography>
                            </Alert>
                          ))}

                        {/* Show if no detailed errors are available but job failed */}
                        {uploadResult.status === "failed" && !uploadResult.errors?.length && !uploadResult.detailed_errors?.length && (
                          <Alert severity="warning" sx={{ mb: 1 }}>
                            <Typography variant="body2">
                              ⚠️ <strong>Upload failed but no detailed errors are available.</strong>
                              <br />
                              This could indicate:
                              <br />
                              • File format issues (invalid Excel/CSV structure)
                              <br />
                              • Missing required columns
                              <br />
                              • Server processing error
                              <br />
                              • Database connection issues
                              <br />
                              <br />
                              💡 <strong>Suggestions:</strong>
                              <br />
                              • Check that your file has the required columns: Site ID, Radio, Radio Serial, DXU, DXU Serial
                              <br />
                              • Ensure the file is a valid Excel (.xlsx/.xls) or CSV format
                              <br />
                              • Try with a smaller sample file first
                              <br />• Contact support if the issue persists
                            </Typography>
                          </Alert>
                        )}
                      </Box>

                      {(uploadResult.has_more_errors || (uploadResult.detailed_errors && uploadResult.detailed_errors.length >= 50)) && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                          📝 Note: Only showing first 50 errors. Check backend logs for complete error details.
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                )}

                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={() => window.location.reload()} disabled={uploadResult.status === "processing"}>
                    Refresh Page
                  </Button>
                  {uploadResult.status !== "processing" && (
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setFile(null);
                        setUploadResult(null);
                        setError(null);
                      }}
                    >
                      Upload Another File
                    </Button>
                  )}
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (isPolling) {
                stopJobStatusPolling();
              }
              setOpenImport(false);
              setFile(null);
              setUploadResult(null);
              setError(null);
            }}
          >
            Close
          </Button>
          <Button variant="contained" disabled={!file || uploading} startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : undefined} onClick={handleBulkUpload}>
            {uploading ? (isAsyncUpload ? "Processing..." : "Uploading...") : "Upload"}
          </Button>
          {/* Show "Close" button when upload completes with errors */}
          {uploadResult && ((uploadResult.error_count && uploadResult.error_count > 0) || (uploadResult.errors && uploadResult.errors.length > 0)) && !uploading && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                setOpenImport(false);
                setFile(null);
                setUploadResult(null);
                setError(null);
              }}
            >
              Close & Review
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectInventoryPage;

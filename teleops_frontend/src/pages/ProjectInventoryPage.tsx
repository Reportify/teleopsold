import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  Add,
  CloudUpload,
  Refresh,
  Download,
  PlaceOutlined,
  SortByAlpha,
  FormatListNumbered,
  ExpandLess,
  ExpandMore,
  ContentCopy,
  Search,
  ExpandMore as ExpandMoreIcon,
  FilterList,
  Clear,
} from "@mui/icons-material";
import { API_ENDPOINTS, apiHelpers } from "../services/api";

interface SerialRow {
  id: number;
  project_site: number | null;
  equipment_item: number;
  equipment_item_name: string;
  equipment_category?: string;
  serial_number: string;
  equipment_model?: string;
  equipment_name?: string;
  site_id_business: string; // Remove optional - this should always exist
  equipment_material_code?: string;
  site_details?: {
    site_id?: string;
    global_id?: string;
    site_name?: string;
    town?: string;
    cluster?: string;
    is_linked?: boolean;
  };
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

interface InventoryFilters {
  search: string;
  equipment_type: string;
  equipment_category: string;
  site_id: string;
}

interface PaginationInfo {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

const ProjectInventoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data states
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SerialRow[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [siteInfoMap, setSiteInfoMap] = useState<Record<string, { site_id?: string; global_id?: string; site_name?: string }>>({});
  const [sitesCount, setSitesCount] = useState<number>(0);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: parseInt(searchParams.get("page") || "1"),
    page_size: parseInt(searchParams.get("page_size") || "20"),
    total_count: 0,
    total_pages: 0,
  });

  // Filter states
  const [filters, setFilters] = useState<InventoryFilters>({
    search: searchParams.get("search") || "",
    equipment_type: searchParams.get("equipment_type") || "",
    equipment_category: searchParams.get("equipment_category") || "",
    site_id: searchParams.get("site_id") || "",
  });

  // Search debounce state
  const [searchInput, setSearchInput] = useState(filters.search);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Upload states
  const [openImport, setOpenImport] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
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

  // Display options
  const [siteSort, setSiteSort] = useState<"alpha" | "qty">("alpha");
  const [expandedRadio, setExpandedRadio] = useState(true);
  const [expandedDug, setExpandedDug] = useState(true);

  // Available filter options
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [equipmentCategories, setEquipmentCategories] = useState<string[]>([]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // ignore
    }
  };

  // Update URL params when filters change
  const updateURLParams = useCallback(
    (newFilters: Partial<InventoryFilters>, newPage?: number) => {
      const params = new URLSearchParams(searchParams);

      if (newPage !== undefined) {
        params.set("page", newPage.toString());
      }

      Object.entries(newFilters).forEach(([key, value]) => {
        if (value && value.trim()) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // Load inventory data with pagination and filters
  const load = useCallback(
    async (page?: number, filterOverrides?: Partial<InventoryFilters>) => {
      setLoading(true);
      try {
        const currentPage = page || pagination.page;
        const currentFilters = { ...filters, ...filterOverrides };

        // Build API parameters (only use backend-supported filters)
        const params: any = {
          page: currentPage,
          page_size: pagination.page_size,
        };

        // Only send search parameter (supported by backend)
        if (currentFilters.search?.trim()) {
          params.search = currentFilters.search.trim();
        }

        console.log("📊 Loading inventory data:", {
          projectId: id,
          page: currentPage,
          params,
          endpoint: API_ENDPOINTS.PROJECTS.INVENTORY.SITE_SERIALS(String(id)),
        });

        const res: any = await apiHelpers.get(API_ENDPOINTS.PROJECTS.INVENTORY.SITE_SERIALS(String(id)), { params });

        console.log("🔍 Raw API response:", res);
        console.log("🔍 Response type:", typeof res, "Is array:", Array.isArray(res));

        // Handle both paginated and non-paginated responses
        let list: SerialRow[] = [];
        let count = 0;
        let totalPages = 1;

        if (Array.isArray(res)) {
          // Non-paginated response (direct array)
          list = res.filter((item: any): item is SerialRow => item && typeof item === "object" && typeof item.id === "number" && typeof item.serial_number === "string");
          count = list.length;
          totalPages = 1;
        } else if (res && typeof res === "object") {
          // Paginated response
          list = (res.results || []).filter((item: any): item is SerialRow => item && typeof item === "object" && typeof item.id === "number" && typeof item.serial_number === "string");
          count = res.count ?? list.length;
          totalPages = Math.max(1, Math.ceil(count / pagination.page_size));
        }

        console.log("✅ Processed data:", {
          listLength: list.length,
          count,
          totalPages,
          sampleItem: list[0],
        });

        setRows(list);
        setPagination((prev) => ({
          ...prev,
          page: currentPage,
          total_count: count,
          total_pages: totalPages,
        }));

        // Update URL params
        updateURLParams(currentFilters, currentPage);

        console.log("✅ Inventory data loaded:", { count, totalPages, page: currentPage });

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
          console.warn("Failed to load site enrichment data:", e);
        }
      } catch (error: any) {
        console.error("❌ Failed to load inventory data:", error);
        console.error("❌ Error details:", {
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          message: error?.message,
          projectId: id,
        });

        let errorMessage = "Failed to load inventory data";
        if (error?.response?.status === 404) {
          errorMessage = "Project not found or you don't have access to this project";
        } else if (error?.response?.data?.error?.message) {
          errorMessage = error.response.data.error.message;
        } else if (error?.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [id, pagination.page_size, filters, updateURLParams]
  );

  // Load filter options
  const loadFilterOptions = useCallback(async () => {
    try {
      // Load equipment types and categories for filters
      // This could be from a separate endpoint or derived from the current data
      const params = { page_size: 1000, fields: "equipment_item_name,equipment_category" };
      const res: any = await apiHelpers.get(API_ENDPOINTS.PROJECTS.INVENTORY.SITE_SERIALS(String(id)), { params });
      const list = Array.isArray(res) ? res : res?.results || [];

      const types = Array.from(new Set(list.map((item: SerialRow) => item.equipment_item_name).filter(Boolean) as string[])).sort();
      const categories = Array.from(new Set(list.map((item: SerialRow) => item.equipment_category).filter(Boolean) as string[])).sort();

      setEquipmentTypes(types);
      setEquipmentCategories(categories);
    } catch (error) {
      console.warn("Failed to load filter options:", error);
    }
  }, [id]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchInput !== filters.search) {
        handleFilterChange("search", searchInput);
      }
    }, 500); // 500ms delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput, filters.search]);

  // Load data when component mounts or id changes
  useEffect(() => {
    if (id) {
      load();
      loadFilterOptions();
    }
  }, [id]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (key: keyof InventoryFilters, value: string) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      // Reset to page 1 when filters change
      load(1, newFilters);
    },
    [filters, load]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (event: React.ChangeEvent<unknown>, newPage: number) => {
      load(newPage);
    },
    [load]
  );

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (event: any) => {
      const newPageSize = parseInt(event.target.value);
      setPagination((prev) => ({ ...prev, page_size: newPageSize }));
      load(1, filters); // Reset to page 1 with new page size
    },
    [filters, load]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    const clearedFilters: InventoryFilters = {
      search: "",
      equipment_type: "",
      equipment_category: "",
      site_id: "",
    };
    setFilters(clearedFilters);
    setSearchInput("");
    load(1, clearedFilters);
  }, [load]);

  // Refresh data
  const handleRefresh = useCallback(() => {
    load(pagination.page, filters);
  }, [load, pagination.page, filters]);

  // Aggregate by site with robust data validation
  const { sites, bySite } = useMemo(() => {
    console.log("🔍 Aggregating sites from rows:", rows.length, "rows");

    // Validate data structure first
    if (!Array.isArray(rows) || rows.length === 0) {
      console.warn("⚠️ No valid rows data for site aggregation");
      return { sites: [], bySite: {} };
    }

    console.log("📊 Sample row data:", rows[0]);

    const map: Record<string, { total: number; items: SerialRow[] }> = {};
    const invalidRows: any[] = [];

    for (const r of rows) {
      // Validate row structure
      if (!r || typeof r !== "object") {
        invalidRows.push(r);
        continue;
      }

      // Get site identifier with multiple fallbacks
      let site = "Unknown";

      if (r.site_id_business && typeof r.site_id_business === "string" && r.site_id_business.trim()) {
        site = r.site_id_business.trim();
      } else if (r.site_details?.site_id && typeof r.site_details.site_id === "string" && r.site_details.site_id.trim()) {
        site = r.site_details.site_id.trim();
      } else if (r.site_details?.global_id && typeof r.site_details.global_id === "string" && r.site_details.global_id.trim()) {
        site = r.site_details.global_id.trim();
      }

      console.log("🏠 Processing row:", {
        id: r.id,
        site_id_business: r.site_id_business,
        site_details: r.site_details,
        resolved_site: site,
      });

      if (!map[site]) map[site] = { total: 0, items: [] };
      map[site].total += 1;
      map[site].items.push(r);
    }

    if (invalidRows.length > 0) {
      console.warn("⚠️ Found invalid rows during aggregation:", invalidRows);
    }

    console.log("🗺️ Site map created:", Object.keys(map));

    // Apply client-side site filtering if a specific site filter is applied
    let siteList = Object.keys(map);
    if (filters.site_id && filters.site_id.trim()) {
      const searchTerm = filters.site_id.toLowerCase().trim();
      siteList = siteList.filter((s) => s.toLowerCase().includes(searchTerm));
    }

    // Apply sorting
    siteList = siteSort === "alpha" ? siteList.sort((a, b) => a.localeCompare(b)) : siteList.sort((a, b) => map[b].total - map[a].total || a.localeCompare(b));

    const siteTuples = siteList.map((s) => ({ site: s, total: map[s].total }));
    console.log("📋 Final sites list:", siteTuples);
    return { sites: siteTuples, bySite: map };
  }, [rows, filters.site_id, siteSort]);

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
      const useAsync = true; // Force async for all files - provides better UX, progress tracking, and performance
      console.log(`🚀 FORCING ASYNC: Using async endpoint for all files (better UX & progress tracking)`);

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

      if (res.job_id) {
        // Start polling for async jobs (always async now)
        console.log(`🚨🚨🚨 Starting job polling for async upload 🚨🚨🚨`);
        startJobStatusPolling(res.job_id);
        // Don't close modal for async uploads so user can see progress
      } else {
        // Fallback: if no job_id but still successful (shouldn't happen with async)
        console.warn("⚠️ No job_id in response - unexpected for async upload");
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

  // Handle template download with loading state
  const handleTemplateDownload = async () => {
    if (!id || downloadingTemplate) return;

    setDownloadingTemplate(true);
    try {
      console.log(`📄 Starting template download for project ${id}`);
      await apiHelpers.download(API_ENDPOINTS.PROJECTS.INVENTORY.DISMANTLE_TEMPLATE(String(id)), "dismantle_planned_inventory_template.xlsx");
      console.log(`✅ Template download completed successfully`);
    } catch (error) {
      console.error(`❌ Template download failed:`, error);
      // Could show a toast/alert here if needed
    } finally {
      setDownloadingTemplate(false);
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
            <Chip size="small" variant="outlined" label={`${pagination.total_count} serial${pagination.total_count === 1 ? "" : "s"}`} />
            <Chip size="small" variant="outlined" label={`${sitesCount} site${sitesCount === 1 ? "" : "s"}`} />
            {pagination.total_pages > 1 && <Chip size="small" variant="outlined" color="primary" label={`Page ${pagination.page} of ${pagination.total_pages}`} />}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<CloudUpload />} onClick={() => setOpenImport(true)}>
              Bulk Upload
            </Button>
            <Button variant="outlined" startIcon={downloadingTemplate ? <CircularProgress size={18} color="inherit" /> : <Download />} onClick={handleTemplateDownload} disabled={downloadingTemplate}>
              {downloadingTemplate ? "Downloading..." : "Template"}
            </Button>
            <Button variant="text" startIcon={<Refresh />} onClick={handleRefresh}>
              Refresh
            </Button>
            <Button variant="contained" onClick={() => navigate(-1)}>
              Back
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Filters Section */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FilterList fontSize="small" color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Filters
            </Typography>
            {filters.search && (
              <Button size="small" startIcon={<Clear />} onClick={clearFilters} color="error">
                Clear Search
              </Button>
            )}
          </Stack>

          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search"
                  placeholder="Search serials, equipment models, or equipment names..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <Divider />

            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              🚧 Additional filters (Equipment Type, Equipment Category, Site ID) are planned for future releases and require backend API enhancements.
            </Typography>
          </Stack>

          {loading && <LinearProgress sx={{ mt: 1 }} />}
        </Stack>
      </Paper>

      {/* Error Display */}
      {error && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Alert severity="error" onClose={() => setError(null)}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Failed to Load Project Inventory
            </Typography>
            <Typography variant="body2">{error}</Typography>
            {error.includes("Project not found") && (
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                  💡 <strong>Troubleshooting steps:</strong>
                </Typography>
                <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                  1. Check the project ID in the URL: <code>/projects/{id}/inventory</code>
                  <br />
                  2. Verify you have access to this project
                  <br />
                  3. Ensure the project exists and is not deleted
                  <br />
                  4. Check if you need vendor permissions for this project
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: "italic", color: "text.secondary" }}>
                  🔧 If you believe this is a backend issue, check the browser console for detailed error information.
                </Typography>
              </Stack>
            )}
          </Alert>
        </Paper>
      )}

      <Grid container spacing={2}>
        {/* Left: Sites list */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, position: "sticky", top: 8 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Sites ({sites.length})
              </Typography>
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
                    // Get enhanced site info from multiple sources
                    const extra = siteInfoMap[site];
                    const sampleItem = bySite[site]?.items?.[0];
                    const siteDetails = sampleItem?.site_details;

                    // Determine primary label with fallbacks
                    const primaryLabel = siteDetails?.site_id || extra?.site_id || site;

                    // Build secondary info with site name and status
                    const secondaryInfo = [];
                    if (siteDetails?.site_name) {
                      secondaryInfo.push(siteDetails.site_name);
                    } else if (extra?.site_name) {
                      secondaryInfo.push(extra.site_name);
                    }

                    if (siteDetails?.global_id && siteDetails.global_id !== primaryLabel) {
                      secondaryInfo.push(siteDetails.global_id);
                    } else if (extra?.global_id && extra.global_id !== primaryLabel) {
                      secondaryInfo.push(extra.global_id);
                    }

                    // Show linking status
                    const isLinked = siteDetails?.is_linked ?? false;

                    return (
                      <ListItemButton key={site} selected={selectedSite === site} onClick={() => setSelectedSite(site)} sx={{ borderRadius: 1, mb: 0.25, py: 1.25 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <PlaceOutlined fontSize="small" color={isLinked ? "primary" : "action"} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                {primaryLabel}
                              </Typography>
                              {!isLinked && <Chip size="small" label="Unlinked" color="warning" variant="outlined" sx={{ fontSize: "0.6rem", height: 16 }} />}
                            </Stack>
                          }
                          secondary={
                            secondaryInfo.length > 0 ? (
                              <Stack spacing={0.25}>
                                {secondaryInfo.map((info, idx) => (
                                  <Typography key={idx} variant="caption" color="text.secondary" noWrap>
                                    {info}
                                  </Typography>
                                ))}
                              </Stack>
                            ) : undefined
                          }
                        />
                        <Chip size="small" variant="outlined" label={`Qty: ${total}`} />
                      </ListItemButton>
                    );
                  })}
              {!loading && sites.length === 0 && (
                <Stack spacing={1} sx={{ px: 1, py: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {filters.search ? "No sites found matching your search" : "No sites available"}
                  </Typography>
                  {filters.search && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                      Searched for: "{filters.search}"
                    </Typography>
                  )}
                </Stack>
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

      {/* Pagination Controls */}
      {pagination.total_pages > 1 && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                Showing {(pagination.page - 1) * pagination.page_size + 1} - {Math.min(pagination.page * pagination.page_size, pagination.total_count)} of {pagination.total_count} results
              </Typography>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Per Page</InputLabel>
                <Select value={pagination.page_size} label="Per Page" onChange={handlePageSizeChange}>
                  <MenuItem value={10}>10 per page</MenuItem>
                  <MenuItem value={20}>20 per page</MenuItem>
                  <MenuItem value={50}>50 per page</MenuItem>
                  <MenuItem value={100}>100 per page</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Pagination
              count={pagination.total_pages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
              size="small"
              showFirstButton
              showLastButton
              siblingCount={1}
              boundaryCount={1}
            />
          </Stack>
        </Paper>
      )}

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
              📄 Unified template with columns: Site ID, Equipment 1 (Material Code or Name), Equipment 1 Serial, Equipment 2 (Material Code or Name), Equipment 2 Serial, etc.
              <br />
              💡 Supports multiple equipment types per site. Use "NA" for missing serial numbers. Multiple rows per site are allowed.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={uploading} />
            </Stack>

            {/* Progress Indicator */}
            {uploading && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Processing File...
                </Typography>
                <Typography variant="body2" color="info.main" sx={{ mb: 1 }}>
                  ⚡ Using async processing for optimal performance and progress tracking
                </Typography>

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
            {uploading ? "Processing..." : "Upload"}
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

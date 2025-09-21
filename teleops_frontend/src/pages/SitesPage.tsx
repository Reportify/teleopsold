// Site Management Page for Tenants
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Alert,
  Tooltip,
  Stack,
  Divider,
  Badge,
  ListItemIcon,
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Pagination,
} from "@mui/material";
import {
  Add,
  MoreVert,
  LocationOn,
  Map,
  Business,
  Visibility,
  Edit,
  Delete,
  Upload,
  Download,
  Search,
  FilterList,
  Refresh,
  GpsFixed,
  Warning,
  CheckCircle,
  ErrorOutline,
  Info,
  Phone,
  ContactPhone,
  SafetyDivider,
  Directions,
  Terrain,
  ExpandMore,
  Public,
  Place,
  MyLocation,
  TravelExplore,
} from "@mui/icons-material";

import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/ThemeContext";
import { StatsCard } from "../components";
import api from "../services/api";
import { FeatureGate, useFeaturePermissions } from "../hooks/useFeaturePermissions";

interface CircleSite {
  id: number;
  site_id: string;
  global_id: string;
  site_name: string;
  site_code: string;
  site_type: string;
  status: string;

  // Location Information
  town: string;
  cluster: string;
  state: string;
  country: string;
  district: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  full_address: string;

  // Site Details
  access_instructions: string;
  safety_requirements: string;
  contact_person: string;
  contact_phone: string;

  // Operational Information
  has_coordinates: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface SiteStatistics {
  total_sites: number;
  active_sites: number;
  inactive_sites: number;
  maintenance_sites: number;
  sites_with_coordinates: number;
  sites_without_coordinates: number;
}

interface CreateSiteForm {
  site_id: string;
  global_id: string;
  site_name: string;
  town: string;
  cluster: string;
  latitude: string;
  longitude: string;
  state: string;
  country: string;
  district: string;
  postal_code: string;
  elevation: string;
  site_type: string;
  status: string;
  access_instructions: string;
  safety_requirements: string;
  contact_person: string;
  contact_phone: string;
}

interface SiteFilters {
  search?: string;
  status?: string;
  site_type?: string;
  cluster?: string;
}

const SitesPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const { darkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState(0);
  const [sites, setSites] = useState<CircleSite[]>([]);
  const [statistics, setStatistics] = useState<SiteStatistics>({
    total_sites: 0,
    active_sites: 0,
    inactive_sites: 0,
    maintenance_sites: 0,
    sites_with_coordinates: 0,
    sites_without_coordinates: 0,
  });
  const [distributions, setDistributions] = useState<{
    site_types: Record<string, number>;
    cities: Record<string, number>;
    states: Record<string, number>;
  }>({
    site_types: {},
    cities: {},
    states: {},
  });
  const [geographicAnalysis, setGeographicAnalysis] = useState<{
    coverage_radius_km: number;
    geographic_center: { latitude: number; longitude: number } | null;
    total_area_covered: number;
  }>({
    coverage_radius_km: 0,
    geographic_center: null,
    total_area_covered: 0,
  });
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<CircleSite | null>(null);
  const [siteMenuAnchor, setSiteMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [siteTypeFilter, setSiteTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const currentTenant = getCurrentTenant();

  // Form state for site creation
  const [createForm, setCreateForm] = useState<CreateSiteForm>({
    site_id: "",
    global_id: "",
    site_name: "",
    town: "",
    cluster: "",
    latitude: "",
    longitude: "",
    state: "",
    country: "India",
    district: "",
    postal_code: "",
    elevation: "",
    site_type: "tower",
    status: "active",
    access_instructions: "",
    safety_requirements: "",
    contact_person: "",
    contact_phone: "",
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [clusters, setClusters] = useState<Array<{ cluster: string; site_count: number }>>([]);
  const [towns, setTowns] = useState<Array<{ town: string; site_count: number }>>([]);
  const [clusterFilter, setClusterFilter] = useState("all");
  const [geographicAnalysisLoading, setGeographicAnalysisLoading] = useState(false);
  const [jobStatusInterval, setJobStatusInterval] = useState<NodeJS.Timeout | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingTimeout, setPollingTimeout] = useState<NodeJS.Timeout | null>(null);
  const activeJobIdRef = useRef<number | null>(null);
  const pollCountRef = useRef<number>(0);

  // Add CSS animation for spinning loader
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Loading state effect for cleanup
  React.useEffect(() => {
    // Reset upload results when loading starts
    if (loading) {
      setUploadResults(null);
    }
  }, [loading]);

  // Ref to track if loading is in progress
  const loadingSitesRef = useRef(false);
  const loadingClustersRef = useRef(false);
  const loadingTownsRef = useRef(false);

  // Pagination state with caching
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 50,
    total_count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false,
  });

  // Cache for paginated site data
  const [cachedPages, setCachedPages] = useState<{
    [key: string]: CircleSite[];
  }>({});

  // Current filter signature for cache invalidation
  const [currentFilters, setCurrentFilters] = useState<SiteFilters>({});

  // Generate cache key for filters + page combination
  const getCacheKey = (page: number, filters: SiteFilters) => {
    return `page_${page}_${JSON.stringify(filters)}`;
  };

  // Check if filters have changed (for cache invalidation)
  const filtersChanged = (newFilters: SiteFilters) => {
    return JSON.stringify(newFilters) !== JSON.stringify(currentFilters);
  };

  // Load circle sites with pagination and caching
  const loadCircleSites = async (page = 1, filters: SiteFilters = {}, forceRefresh = false) => {
    if (loadingSitesRef.current) {
      return;
    }

    // Check if filters changed - if so, clear cache
    if (filtersChanged(filters)) {
      setCachedPages({});
      setCurrentFilters(filters);
    }

    // Check cache first (unless forcing refresh)
    const cacheKey = getCacheKey(page, filters);
    if (!forceRefresh && cachedPages[cacheKey]) {
      setSites(cachedPages[cacheKey]);
      setPagination((prev) => ({ ...prev, page }));
      return; // No API call needed!
    }

    try {
      loadingSitesRef.current = true;
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", "50"); // Fixed page size

      // Add filters if provided
      if (filters.search) params.append("search", filters.search);
      if (filters.status && filters.status !== "all") params.append("status", filters.status);
      if (filters.site_type && filters.site_type !== "all") params.append("site_type", filters.site_type);
      if (filters.cluster && filters.cluster !== "all") params.append("cluster", filters.cluster);

      // Use a longer timeout for sites data loading, especially after bulk uploads
      const response = await api.get(`/sites/?${params.toString()}`, {
        timeout: 30000, // 30 seconds timeout (reduced from 90s since we're using pagination)
      });

      if (response.data) {
        const sitesData = response.data.sites || [];

        // Update current page display
        setSites(sitesData);
        setStatistics(response.data.statistics || {});
        setDistributions(response.data.distributions || {});
        setPagination(response.data.pagination || {});

        // Cache the loaded page
        setCachedPages((prev) => ({
          ...prev,
          [cacheKey]: sitesData,
        }));


      }
    } catch (error: any) {
      console.error("❌ Error loading circle sites:", error);
      // Don't fail silently - provide user feedback
      if (error?.response?.status === 403) {
        console.error("Permission denied - check authentication");
      } else if (error?.response?.status === 500) {
        console.error("Server error - backend issue");
      } else if (error?.code === "ECONNABORTED") {
        console.error("Request timeout - server taking too long");
      }
    } finally {
      loadingSitesRef.current = false;
      setLoading(false);
    }
  };

  // Load clusters for filtering
  const loadClusters = async () => {
    if (loadingClustersRef.current) {
      return;
    }

    try {
      loadingClustersRef.current = true;
      const response = await api.get("/sites/clusters/", {
        timeout: 15000, // 15 seconds timeout for clusters
      });
      if (response.data) {
        setClusters(response.data.clusters || []);
      }
    } catch (error) {
      console.error("❌ Error loading clusters:", error);
    } finally {
      loadingClustersRef.current = false;
    }
  };

  // Check job status for large uploads
  const checkJobStatus = async (jobId: number) => {
    // Increment poll count
    pollCountRef.current += 1;

    // Check if this is still the active job
    if (activeJobIdRef.current !== jobId) {
      return;
    }

    // Safety check: stop if we've polled too many times
    if (pollCountRef.current > 100) {
      stopJobStatusPolling();
      return;
    }

    try {
      const response = await api.get(`/sites/bulk-upload-jobs/${jobId}/`);

      if (response.data) {
        const jobData = response.data;

        // Update upload results with current job status
        // Calculate progress percentage if not provided by backend
        const calculatedProgress = jobData.progress_percentage || (jobData.total_rows > 0 ? Math.round((jobData.processed_rows / jobData.total_rows) * 100) : 0);

        setUploadResults((prev: any) => ({
          ...prev,
          message: `Processing: ${jobData.processed_rows}/${jobData.total_rows} rows completed`,
          summary: {
            total_rows: jobData.total_rows,
            success_count: jobData.success_count,
            error_count: jobData.error_count,
          },
          status: jobData.status,
          progress_percentage: calculatedProgress,
        }));

        // If job is completed, stop polling and refresh sites data
        if (jobData.status === "completed") {
          stopJobStatusPolling();

          // Show completion message first
          setUploadResults((prev: any) => ({
            ...prev,
            message: `Upload completed! ${jobData.success_count} sites created, ${jobData.error_count} errors.`,
            status: "completed",
            errors: jobData.errors || [], // Include errors from backend
          }));

          // Set loading to false when async job completes
          setLoading(false);

          // Wait a moment for backend to finish processing, then refresh sites
          setTimeout(async () => {
            try {
              const filters: SiteFilters = {
                search: searchTerm,
                status: statusFilter,
                site_type: siteTypeFilter,
                cluster: clusterFilter,
              };
              // Clear cache since new data was uploaded
              setCachedPages({});
              await loadCircleSites(pagination.page, filters, true); // Force refresh after bulk upload
            } catch (error) {
              console.error("❌ Error refreshing sites after bulk upload:", error);
              // Don't fail the upload completion - just log the error
            }
          }, 2000); // Wait 2 seconds for backend to finish

          // Only auto-close dialog if there are NO errors
          if (jobData.error_count === 0) {
            setTimeout(() => {
              setBulkUploadDialogOpen(false);
              setUploadFile(null);
              setUploadResults(null);
            }, 5000); // Increased to 5 seconds to allow sites refresh
          }
          // If there are errors, keep dialog open so user can view them
        } else if (jobData.status === "failed") {
          stopJobStatusPolling();
          setUploadResults((prev: any) => ({
            ...prev,
            message: `Upload failed: ${jobData.error_message}`,
            status: "failed",
          }));

          // Set loading to false when async job fails
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Error checking job status:", error);
      // On error, stop polling to prevent infinite retries
      stopJobStatusPolling();
      // Set loading to false on error
      setLoading(false);
    }
  };

  // Stop job status polling
  const stopJobStatusPolling = () => {
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

  // Start job status polling
  const startJobStatusPolling = (jobId: number) => {
    // Clear any existing interval
    if (jobStatusInterval) {
      clearInterval(jobStatusInterval);
    }

    // Set polling flag and active job ID
    setIsPolling(true);
    activeJobIdRef.current = jobId;

    // Start polling every 5 seconds
    const interval = setInterval(() => {
      // Only poll if this is still the active job
      if (activeJobIdRef.current === jobId) {
        checkJobStatus(jobId);
      } else {
        clearInterval(interval);
      }
    }, 5000);
    setJobStatusInterval(interval);

    // Set a timeout to stop polling after 30 minutes (safety measure)
    const timeout = setTimeout(() => {
      stopJobStatusPolling();
    }, 30 * 60 * 1000); // 30 minutes
    setPollingTimeout(timeout);

    // Check immediately - but use a small delay to ensure state is updated
    setTimeout(() => {
      checkJobStatus(jobId);
    }, 100);
  };

  // Load geographic analysis on-demand
  const loadGeographicAnalysis = async () => {
    if (geographicAnalysisLoading) {
      return;
    }

    try {
      setGeographicAnalysisLoading(true);

      const response = await api.get("/sites/geographic-analysis/");

      if (response.data) {
        setGeographicAnalysis(response.data.geographic_analysis || {});
        // Update statistics with GPS data
        setStatistics((prev) => ({
          ...prev,
          sites_with_coordinates: response.data.gps_statistics?.sites_with_coordinates || 0,
          sites_without_coordinates: response.data.gps_statistics?.sites_without_coordinates || 0,
        }));
      }
    } catch (error: any) {
      console.error("❌ Error loading geographic analysis:", error);
      // Don't fail silently - provide user feedback
      if (error?.response?.status === 403) {
        console.error("Permission denied - check authentication");
      } else if (error?.response?.status === 500) {
        console.error("Server error - backend issue");
      }
    } finally {
      setGeographicAnalysisLoading(false);
    }
  };

  // Load towns for filtering (optionally filtered by cluster) with pagination
  const loadTowns = async (cluster?: string) => {
    if (loadingTownsRef.current) {
      return;
    }

    try {
      loadingTownsRef.current = true;

      // Build URL with pagination parameters (load only first 100 towns for dropdown)
      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("page_size", "100"); // Limit to first 100 towns for dropdown
      if (cluster && cluster !== "all") {
        params.append("cluster", cluster);
      }

      const url = `/sites/towns/?${params.toString()}`;

      const response = await api.get(url, {
        timeout: 15000, // 15 seconds timeout for towns
      });

      if (response.data) {
        setTowns(response.data.towns || []);
      }
    } catch (error) {
      console.error("❌ Error loading towns:", error);
    } finally {
      loadingTownsRef.current = false;
    }
  };

  // Download Excel template
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get("/sites/template/", {
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "sites_upload_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading template:", error);
    }
  };

  // Export sites
  const handleExportSites = async (format: "excel" | "csv") => {
    try {
      setLoading(true);

      // Build query parameters for filtering
      const params = new URLSearchParams();
      params.append("format", format);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (siteTypeFilter !== "all") params.append("site_type", siteTypeFilter);
      if (clusterFilter !== "all") params.append("cluster", clusterFilter);

      const response = await api.get(`/sites/export/?${params.toString()}`, {
        responseType: "blob",
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sites_export.${format === "excel" ? "xlsx" : "csv"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting sites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        if (isMounted) await loadCircleSites(1); // Load first page
        if (isMounted) await loadClusters();
        if (isMounted) await loadTowns();
      } catch (error) {
        if (isMounted) {
          console.error("Error loading site data:", error);
        }
      }
    };

    // Add small delay to prevent double mounting issues
    const timeoutId = setTimeout(loadData, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      // Reset loading flags on unmount
      loadingSitesRef.current = false;
      loadingClustersRef.current = false;
      loadingTownsRef.current = false;
      // Cleanup job status interval
      if (jobStatusInterval) {
        clearInterval(jobStatusInterval);
      }
      // Cleanup polling timeout
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
      // Stop polling if active
      if (isPolling) {
        setIsPolling(false);
      }
    };
  }, []);

  // Handle filter changes with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const filters: SiteFilters = {
        search: searchTerm,
        status: statusFilter,
        site_type: siteTypeFilter,
        cluster: clusterFilter,
      };
      loadCircleSites(1, filters); // Reset to page 1 when filters change
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, siteTypeFilter, clusterFilter]);

  // Update towns when cluster filter changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTowns(clusterFilter);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [clusterFilter]);

  // Handle site creation
  const handleCreateSite = async () => {
    try {
      setLoading(true);

      const payload = {
        ...createForm,
        latitude: createForm.latitude ? parseFloat(createForm.latitude) : null,
        longitude: createForm.longitude ? parseFloat(createForm.longitude) : null,
        elevation: createForm.elevation ? parseFloat(createForm.elevation) : null,
      };

      await api.post("/sites/", payload);

      // Reset form and close dialog
      setCreateForm({
        site_id: "",
        global_id: "",
        site_name: "",
        town: "",
        cluster: "",
        latitude: "",
        longitude: "",
        state: "",
        country: "India",
        district: "",
        postal_code: "",
        elevation: "",
        site_type: "tower",
        status: "active",
        access_instructions: "",
        safety_requirements: "",
        contact_person: "",
        contact_phone: "",
      });
      setCreateDialogOpen(false);

      // Reload sites
      const filters: SiteFilters = {
        search: searchTerm,
        status: statusFilter,
        site_type: siteTypeFilter,
        cluster: clusterFilter,
      };
      // Clear cache since new site was created
      setCachedPages({});
      await loadCircleSites(pagination.page, filters, true); // Force refresh after create
    } catch (error: any) {
      console.error("Error creating site:", error);
      // Handle error display
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!uploadFile) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", uploadFile);

      // Check file size and estimate row count for large files
      const fileSizeMB = uploadFile.size / (1024 * 1024);

      // For Excel files, estimate row count based on file size
      // Excel files are typically ~1KB per row, so estimate rows from file size
      let estimatedRows = 0;
      if (uploadFile.name.endsWith(".xlsx") || uploadFile.name.endsWith(".xls")) {
        estimatedRows = Math.round((uploadFile.size / 1024) * 0.8); // Estimate 0.8 rows per KB
      }

      // Use async endpoint for files > 1MB OR estimated > 500 rows OR > 100KB (conservative approach)
      const isLargeFile = fileSizeMB > 1 || estimatedRows > 500 || uploadFile.size > 100 * 1024;

      // Use appropriate endpoint based on file size and estimated rows
      const endpoint = isLargeFile ? "/sites/bulk-upload-async/" : "/sites/bulk-upload/";



      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (isLargeFile && response.status === 202) {
        // Large file - show job tracking
        const initialResults = {
          message: `Starting bulk upload of ${response.data.total_rows} sites...`,
          job_id: response.data.job_id,
          status: "processing",
          summary: {
            total_rows: response.data.total_rows,
            success_count: 0,
            error_count: 0,
          },
          isAsyncJob: true,
        };

        setUploadResults(initialResults);

        // Start polling for job status immediately
        startJobStatusPolling(response.data.job_id);

        // Keep loading state active for async jobs - don't set loading to false here
        // Loading will be set to false when the job completes in checkJobStatus
      } else {
        // Small file - show immediate results
        setUploadResults(response.data);
        const filters: SiteFilters = {
          search: searchTerm,
          status: statusFilter,
          site_type: siteTypeFilter,
          cluster: clusterFilter,
        };
        // Clear cache since new data was uploaded
        setCachedPages({});
        await loadCircleSites(pagination.page, filters, true); // Force refresh after upload

        // Auto-close dialog only if upload was completely successful (no errors)
        if (response.data && !response.data.error && response.data.summary?.error_count === 0) {
          setTimeout(() => {
            setBulkUploadDialogOpen(false);
            setUploadFile(null);
            setUploadResults(null);
          }, 2000);
        }
        // If there are errors, keep dialog open so user can view them

        // Only set loading to false for small files
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      setUploadResults({
        error: error.response?.data?.error || "Upload failed",
      });
      setLoading(false);
    }
  };

  // Handle site deletion
  const handleDeleteSite = async (siteId: number) => {
    try {
      await api.delete(`/sites/${siteId}/`);
      const filters: SiteFilters = {
        search: searchTerm,
        status: statusFilter,
        site_type: siteTypeFilter,
        cluster: clusterFilter,
      };
      // Clear cache since site was deleted
      setCachedPages({});
      await loadCircleSites(pagination.page, filters, true); // Force refresh after delete
    } catch (error) {
      console.error("Error deleting site:", error);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const filters: SiteFilters = {
      search: searchTerm,
      status: statusFilter,
      site_type: siteTypeFilter,
      cluster: clusterFilter,
    };
    loadCircleSites(newPage, filters);
  };

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "error";
      case "maintenance":
        return "warning";
      default:
        return "default";
    }
  };

  const formatCoordinate = (value: number | null) => {
    return value !== null ? value.toFixed(6) : "N/A";
  };

  const handleSiteMenuClick = (event: React.MouseEvent<HTMLButtonElement>, site: CircleSite) => {
    setSiteMenuAnchor(event.currentTarget);
    setSelectedSite(site);
  };

  const handleSiteMenuClose = () => {
    setSiteMenuAnchor(null);
    setSelectedSite(null);
  };

  return (
    <FeatureGate
      featureId="site_view"
      fallback={
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            You don't have permission to view sites
          </Typography>
        </Box>
      }
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              Site Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Master site data for {currentTenant?.organization_name}
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <FeatureGate featureId="site_template_download">
              <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadTemplate}>
                Download Template
              </Button>
            </FeatureGate>
            <FeatureGate featureId="site_export">
              <Button variant="outlined" startIcon={<Download />} onClick={() => handleExportSites("excel")}>
                Export Excel
              </Button>
            </FeatureGate>
            <FeatureGate featureId="site_export">
              <Button variant="outlined" startIcon={<Download />} onClick={() => handleExportSites("csv")}>
                Export CSV
              </Button>
            </FeatureGate>
            <FeatureGate featureId="site_bulk_upload">
              <Button variant="outlined" startIcon={<Upload />} onClick={() => setBulkUploadDialogOpen(true)}>
                Bulk Upload
              </Button>
            </FeatureGate>
            <FeatureGate featureId="site_create">
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)} size="large">
                Add Site
              </Button>
            </FeatureGate>
          </Stack>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsCard title="Total Sites" value={statistics.total_sites} subtitle={`${statistics.active_sites} active`} icon={Business} color="primary" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsCard title="Active Sites" value={statistics.active_sites} subtitle="Currently operational" icon={CheckCircle} color="success" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <StatsCard title="GPS Coordinates" value={statistics.sites_with_coordinates} subtitle={`${statistics.sites_without_coordinates} missing`} icon={GpsFixed} color="info" />
          </Grid>
        </Grid>

        {/* Tabs */}
        <Card sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => {
              setActiveTab(newValue);
              // Load geographic analysis when Geographic Analysis tab is clicked
              if (newValue === 1) {
                loadGeographicAnalysis();
              }
            }}
          >
            <Tab label="Site Directory" />
            <Tab label="Geographic Analysis" />
            <Tab label="Distribution Analytics" />
          </Tabs>
        </Card>

        {activeTab === 0 && (
          <>
            {/* Filters */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 2.5 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Search sites..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 1.5 }}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="maintenance">Maintenance</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 1.5 }}>
                    <FormControl fullWidth>
                      <InputLabel>Site Type</InputLabel>
                      <Select value={siteTypeFilter} onChange={(e) => setSiteTypeFilter(e.target.value)} label="Site Type">
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
                      <Select value={clusterFilter} onChange={(e) => setClusterFilter(e.target.value)} label="Cluster">
                        <MenuItem value="all">All Clusters</MenuItem>
                        {clusters.map((cluster) => (
                          <MenuItem key={cluster.cluster} value={cluster.cluster}>
                            {cluster.cluster} ({cluster.site_count})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Town</InputLabel>
                      <Select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} label="Town">
                        <MenuItem value="all">All Towns</MenuItem>
                        {towns.length > 0 && (
                          <MenuItem disabled sx={{ fontSize: "0.75rem", fontStyle: "italic" }}>
                            Showing first {towns.length} towns
                          </MenuItem>
                        )}
                        {towns.map((town) => (
                          <MenuItem key={town.town} value={town.town}>
                            {town.town} ({town.site_count})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, md: 2 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={() => {
                        const filters: SiteFilters = {
                          search: searchTerm,
                          status: statusFilter,
                          site_type: siteTypeFilter,
                          cluster: clusterFilter,
                        };
                        loadCircleSites(pagination.page, filters, true); // Force refresh
                      }}
                    >
                      Refresh
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Sites Table */}
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
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sites.map((site) => (
                        <TableRow key={site.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {site.site_name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                ID: {site.site_id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Global: {site.global_id}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                                <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
                                {site.town}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Cluster: {site.cluster}
                              </Typography>
                              {site.state && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {site.state}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {site.has_coordinates ? (
                              <Typography variant="body2">
                                {formatCoordinate(site.latitude)}, {formatCoordinate(site.longitude)}
                              </Typography>
                            ) : (
                              <Chip label="No GPS Data" color="error" size="small" icon={<Warning />} />
                            )}
                          </TableCell>
                          <TableCell>
                            <Stack spacing={1}>
                              <Chip label={site.site_type ? site.site_type.replace("_", " ").toUpperCase() : "Unknown"} size="small" variant="outlined" />
                              <Chip label={site.status.toUpperCase()} color={getStatusColor(site.status)} size="small" />
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Box>
                              {site.contact_person && (
                                <Typography variant="body2" sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                                  <ContactPhone sx={{ fontSize: 16, mr: 0.5 }} />
                                  {site.contact_person}
                                </Typography>
                              )}
                              {site.contact_phone && (
                                <Typography variant="caption" color="text.secondary">
                                  {site.contact_phone}
                                </Typography>
                              )}
                              {!site.contact_person && !site.contact_phone && (
                                <Typography variant="caption" color="text.secondary">
                                  No contact info
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <FeatureGate featureId="site_view">
                              <IconButton onClick={(e) => handleSiteMenuClick(e, site)} size="small">
                                <MoreVert />
                              </IconButton>
                            </FeatureGate>
                          </TableCell>
                        </TableRow>
                      ))}
                      {sites.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              No sites found matching the current filters
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination Controls */}
                {pagination.total_count > 0 && (
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Showing {(pagination.page - 1) * pagination.page_size + 1} to {Math.min(pagination.page * pagination.page_size, pagination.total_count)} of {pagination.total_count} sites
                      </Typography>
                      {Object.keys(cachedPages).length > 0 && (
                        <Typography variant="caption" color="success.main" sx={{ display: "block", mt: 0.5 }}>
                          📄 {Object.keys(cachedPages).length} page(s) cached for faster navigation
                        </Typography>
                      )}
                    </Box>
                    <Pagination count={pagination.total_pages} page={pagination.page} onChange={(e, page) => handlePageChange(page)} color="primary" size="medium" showFirstButton showLastButton />
                  </Box>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 1 && (
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                <Typography variant="h6">Geographic Analysis</Typography>
                <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={loadGeographicAnalysis} disabled={geographicAnalysisLoading}>
                  {geographicAnalysisLoading ? "Loading..." : "Refresh Analysis"}
                </Button>
              </Box>

              {geographicAnalysisLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                  <Stack spacing={2} alignItems="center">
                    <LinearProgress sx={{ width: 200 }} />
                    <Typography variant="body2" color="text.secondary">
                      Calculating geographic analysis...
                    </Typography>
                  </Stack>
                </Box>
              ) : Object.keys(geographicAnalysis).length === 0 ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                  <Stack spacing={2} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Click "Refresh Analysis" to load geographic data
                    </Typography>
                    <Button variant="contained" size="small" onClick={loadGeographicAnalysis}>
                      Load Analysis
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                        <MyLocation sx={{ mr: 1 }} />
                        Coverage Metrics
                      </Typography>
                      <Stack spacing={2}>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Coverage Radius:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {geographicAnalysis.coverage_radius_km} km
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Total Area:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {geographicAnalysis.total_area_covered} km²
                          </Typography>
                        </Box>
                        {geographicAnalysis.geographic_center && (
                          <>
                            <Divider />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              Geographic Center:
                            </Typography>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body2">Latitude:</Typography>
                              <Typography variant="body2">{geographicAnalysis.geographic_center.latitude.toFixed(6)}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="body2">Longitude:</Typography>
                              <Typography variant="body2">{geographicAnalysis.geographic_center.longitude.toFixed(6)}</Typography>
                            </Box>
                          </>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 3 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                        <GpsFixed sx={{ mr: 1 }} />
                        GPS Data Quality
                      </Typography>
                      <Stack spacing={2}>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Sites with GPS:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {statistics.sites_with_coordinates} / {statistics.total_sites}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Coverage %:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {statistics.total_sites > 0 ? Math.round((statistics.sites_with_coordinates / statistics.total_sites) * 100) : 0}%
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Missing GPS:</Typography>
                          <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
                            {statistics.sites_without_coordinates}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Distribution Analytics
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      Site Types
                    </Typography>
                    <Stack spacing={1}>
                      {Object.entries(distributions.site_types).map(([type, count]) => (
                        <Box key={type} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="body2">{type ? type.replace("_", " ").toUpperCase() : "Unknown"}</Typography>
                          <Chip label={count} size="small" />
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      Top Cities
                    </Typography>
                    <Stack spacing={1}>
                      {Object.entries(distributions.cities)
                        .slice(0, 8)
                        .map(([city, count]) => (
                          <Box key={city} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography variant="body2">{city}</Typography>
                            <Chip label={count} size="small" />
                          </Box>
                        ))}
                    </Stack>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      States
                    </Typography>
                    <Stack spacing={1}>
                      {Object.entries(distributions.states).map(([state, count]) => (
                        <Box key={state} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="body2">{state}</Typography>
                          <Chip label={count} size="small" />
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Site Actions Menu */}
        <Menu anchorEl={siteMenuAnchor} open={Boolean(siteMenuAnchor)} onClose={handleSiteMenuClose}>
          <FeatureGate featureId="site_view">
            <MenuItem
              onClick={() => {
                // Handle view site details
                handleSiteMenuClose();
              }}
            >
              <ListItemIcon>
                <Visibility fontSize="small" />
              </ListItemIcon>
              View Details
            </MenuItem>
          </FeatureGate>
          <FeatureGate featureId="site_edit">
            <MenuItem
              onClick={() => {
                // Handle edit site
                handleSiteMenuClose();
              }}
            >
              <ListItemIcon>
                <Edit fontSize="small" />
              </ListItemIcon>
              Edit Site
            </MenuItem>
          </FeatureGate>
          <FeatureGate featureId="site_view">
            <MenuItem
              onClick={() => {
                if (selectedSite?.has_coordinates) {
                  window.open(`https://www.google.com/maps?q=${selectedSite.latitude},${selectedSite.longitude}`, "_blank");
                }
                handleSiteMenuClose();
              }}
              disabled={!selectedSite?.has_coordinates}
            >
              <ListItemIcon>
                <Map fontSize="small" />
              </ListItemIcon>
              View on Map
            </MenuItem>
          </FeatureGate>
          <FeatureGate featureId="site_delete">
            <Divider />
            <MenuItem
              onClick={() => {
                if (selectedSite) {
                  handleDeleteSite(selectedSite.id);
                }
                handleSiteMenuClose();
              }}
              sx={{ color: "error.main" }}
            >
              <ListItemIcon>
                <Delete fontSize="small" color="error" />
              </ListItemIcon>
              Delete Site
            </MenuItem>
          </FeatureGate>
        </Menu>

        {/* Create Site Dialog */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="lg" fullWidth>
          <DialogTitle>Add New Site</DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Required Information */}
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Required Information
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Site ID"
                  value={createForm.site_id}
                  onChange={(e) => setCreateForm({ ...createForm, site_id: e.target.value })}
                  fullWidth
                  required
                  helperText="Unique identifier within your circle"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Global ID"
                  value={createForm.global_id}
                  onChange={(e) => setCreateForm({ ...createForm, global_id: e.target.value })}
                  fullWidth
                  required
                  helperText="Globally unique identifier"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Site Name" value={createForm.site_name} onChange={(e) => setCreateForm({ ...createForm, site_name: e.target.value })} fullWidth required />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Town/City" value={createForm.town} onChange={(e) => setCreateForm({ ...createForm, town: e.target.value })} fullWidth required />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Cluster"
                  value={createForm.cluster}
                  onChange={(e) => setCreateForm({ ...createForm, cluster: e.target.value })}
                  fullWidth
                  required
                  helperText="Operational grouping/region"
                />
              </Grid>

              {/* GPS Coordinates */}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  GPS Coordinates (Required)
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Latitude"
                  type="number"
                  value={createForm.latitude}
                  onChange={(e) => setCreateForm({ ...createForm, latitude: e.target.value })}
                  fullWidth
                  required
                  helperText="Decimal degrees (-90 to 90)"
                  inputProps={{ step: "any", min: -90, max: 90 }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Longitude"
                  type="number"
                  value={createForm.longitude}
                  onChange={(e) => setCreateForm({ ...createForm, longitude: e.target.value })}
                  fullWidth
                  required
                  helperText="Decimal degrees (-180 to 180)"
                  inputProps={{ step: "any", min: -180, max: 180 }}
                />
              </Grid>

              {/* Optional Location Details */}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Additional Location Details
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="State" value={createForm.state} onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })} fullWidth />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="District" value={createForm.district} onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })} fullWidth />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField label="Postal Code" value={createForm.postal_code} onChange={(e) => setCreateForm({ ...createForm, postal_code: e.target.value })} fullWidth />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Site Type</InputLabel>
                  <Select value={createForm.site_type} onChange={(e) => setCreateForm({ ...createForm, site_type: e.target.value })} label="Site Type">
                    <MenuItem value="tower">Tower</MenuItem>
                    <MenuItem value="data_center">Data Center</MenuItem>
                    <MenuItem value="exchange">Exchange</MenuItem>
                    <MenuItem value="substation">Substation</MenuItem>
                    <MenuItem value="office">Office</MenuItem>
                    <MenuItem value="warehouse">Warehouse</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Elevation (meters)"
                  type="number"
                  value={createForm.elevation}
                  onChange={(e) => setCreateForm({ ...createForm, elevation: e.target.value })}
                  fullWidth
                  inputProps={{ step: "any" }}
                />
              </Grid>

              {/* Contact & Access Information */}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Contact & Access Information
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Contact Person" value={createForm.contact_person} onChange={(e) => setCreateForm({ ...createForm, contact_person: e.target.value })} fullWidth />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Contact Phone" value={createForm.contact_phone} onChange={(e) => setCreateForm({ ...createForm, contact_phone: e.target.value })} fullWidth />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Access Instructions"
                  value={createForm.access_instructions}
                  onChange={(e) => setCreateForm({ ...createForm, access_instructions: e.target.value })}
                  fullWidth
                  multiline
                  rows={3}
                  helperText="Instructions for accessing the site"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Safety Requirements"
                  value={createForm.safety_requirements}
                  onChange={(e) => setCreateForm({ ...createForm, safety_requirements: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  helperText="Safety requirements and precautions"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSite} variant="contained" disabled={loading}>
              {loading ? "Creating..." : "Create Site"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog open={bulkUploadDialogOpen} onClose={() => setBulkUploadDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Bulk Site Upload</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 3 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Upload Excel (.xlsx, .xls) or CSV files with site data. Required columns: site_id, global_id, site_name, town, cluster, latitude, longitude.
              </Alert>

              <Box sx={{ mb: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  📄 Need a template?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Download our Excel template with sample data and field descriptions to get started quickly.
                </Typography>
                <FeatureGate featureId="site_template_download">
                  <Button variant="outlined" size="small" startIcon={<Download />} onClick={handleDownloadTemplate}>
                    Download Template
                  </Button>
                </FeatureGate>
              </Box>

              <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} style={{ marginBottom: 16 }} />

              {uploadResults && (
                <Box sx={{ mt: 2 }}>
                  {uploadResults.error ? (
                    <Alert severity="error">{uploadResults.error}</Alert>
                  ) : uploadResults.isAsyncJob ? (
                    // Large file upload with progress tracking
                    <Alert severity="info">
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        {uploadResults.status === "processing" && (
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
                        )}
                        <Typography variant="subtitle2">{uploadResults.message}</Typography>
                      </Box>

                      {uploadResults.status === "processing" && (
                        <>
                          <LinearProgress
                            variant="determinate"
                            value={uploadResults.progress_percentage || 0}
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
                            Progress: {uploadResults.progress_percentage || 0}% ({uploadResults.summary?.success_count + uploadResults.summary?.error_count}/{uploadResults.summary?.total_rows} rows
                            processed)
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                            Processing in background... This may take a few minutes for large files.
                          </Typography>
                        </>
                      )}

                      {uploadResults.status === "completed" && (
                        <Box>
                          <Typography variant="body2" color="success.main">
                            ✅ {uploadResults.message}
                          </Typography>
                          {uploadResults.summary?.error_count > 0 && (
                            <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 1 }}>
                              ⚠️ Upload completed with {uploadResults.summary.error_count} errors. Please review the errors below.
                            </Typography>
                          )}
                        </Box>
                      )}

                      {uploadResults.status === "failed" && (
                        <Typography variant="body2" color="error.main">
                          ❌ {uploadResults.message}
                        </Typography>
                      )}
                    </Alert>
                  ) : (
                    // Small file upload with immediate results
                    <Alert severity={uploadResults.summary?.error_count === 0 ? "success" : "warning"}>
                      {uploadResults.summary?.error_count === 0 ? (
                        <>
                          🎉 <strong>Upload Successful!</strong> All {uploadResults.summary?.success_count} sites were created successfully.
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            Dialog will close automatically in 2 seconds...
                          </Typography>
                        </>
                      ) : (
                        <>
                          {uploadResults.message}
                          <br />
                          Success: {uploadResults.summary?.success_count}, Errors: {uploadResults.summary?.error_count}
                        </>
                      )}
                    </Alert>
                  )}

                  {/* Show errors section for both sync and async uploads */}
                  {((uploadResults.errors && uploadResults.errors.length > 0) || uploadResults.summary?.error_count > 0) && (
                    <Accordion sx={{ mt: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography>View Errors ({uploadResults.errors?.length || uploadResults.summary?.error_count || 0})</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ maxHeight: 400, overflow: "auto" }}>
                          <Stack spacing={1}>
                            {uploadResults.errors && uploadResults.errors.length > 0 ? (
                              uploadResults.errors.map((error: any, index: number) => (
                                <Typography key={index} variant="body2" color="error">
                                  Row {error.row}: {error.error}
                                </Typography>
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {uploadResults.summary?.error_count > 0
                                  ? `${uploadResults.summary.error_count} errors occurred during upload. Detailed error information is not available.`
                                  : "No detailed error information available."}
                              </Typography>
                            )}
                          </Stack>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  )}
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                // Stop any active polling when dialog is closed
                if (isPolling) {
                  stopJobStatusPolling();
                }
                setBulkUploadDialogOpen(false);
                setUploadFile(null);
                setUploadResults(null);
              }}
            >
              {uploadResults?.status === "completed" && uploadResults?.summary?.error_count > 0 ? "Close" : "Cancel"}
            </Button>
            {(!uploadResults || uploadResults.status === "failed" || (!uploadResults.isAsyncJob && uploadResults.status !== "completed")) && (
              <Button onClick={handleBulkUpload} variant="contained" disabled={!uploadFile || loading}>
                {loading && uploadResults?.isAsyncJob ? "Processing..." : loading ? "Uploading..." : "Upload"}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </FeatureGate>
  );
};

export default SitesPage;

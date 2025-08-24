import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Breadcrumbs,
  Typography,
  Paper,
  Stack,
  Button,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import api, { API_ENDPOINTS, apiHelpers } from "../services/api";

interface UploadResult {
  // Sync upload result
  created_master?: number;
  linked?: number;
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
  linked_count?: number;
  skipped_count?: number;
  error_count?: number;
  error_message?: string;
}

const ProjectSitesImportPage: React.FC = () => {
  console.log(`🔥🔥🔥 ProjectSitesImportPage COMPONENT IS LOADING 🔥🔥🔥`);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  console.log(`🚨🚨🚨 COMPONENT LOADED: ProjectSitesImportPage with id: ${id} 🚨🚨🚨`);
  console.log(`🚨🚨🚨 URL PARAMS:`, { id });
  console.log(`🚨🚨🚨 CURRENT URL:`, window.location.href);

  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Async processing states
  const [isAsyncUpload, setIsAsyncUpload] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [jobStatusInterval, setJobStatusInterval] = useState<NodeJS.Timeout | null>(null);
  const [pollingTimeout, setPollingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Refs for stable polling
  const activeJobIdRef = useRef<number | null>(null);
  const pollCountRef = useRef<number>(0);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`🔥🔥🔥 FILE SELECTION EVENT TRIGGERED 🔥🔥🔥`);
    const selectedFile = e.target.files?.[0] || null;
    console.log(`🚨🚨🚨 FILE SELECTED:`, {
      name: selectedFile?.name,
      size: selectedFile?.size,
      type: selectedFile?.type,
    });
    setFile(selectedFile);
    console.log(`🚨🚨🚨 FILE STATE UPDATED 🚨🚨🚨`);
  };

  // Intelligent file size detection and upload selection
  const onSubmit = async () => {
    console.log(`🔥🔥🔥 UPLOAD BUTTON CLICKED! 🔥🔥🔥`);
    console.log(`🚨🚨🚨 CHECKING CONDITIONS - file:`, !!file, `id:`, !!id);

    if (!file || !id) {
      console.log(`🚨🚨🚨 EARLY RETURN: Missing file or id`, { file: !!file, id: !!id });
      return;
    }

    console.log(`🚀🚀🚀 PROJECT SITES UPLOAD STARTED 🚀🚀🚀`);
    console.log(`📁 File Details:`, {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
    });
    console.log(`🔗 Project ID:`, id);
    console.log(`🚨🚨🚨 CRITICAL DEBUG: Starting upload process 🚨🚨🚨`);

    setSubmitting(true);
    setError(null);
    setResult(null);

    // Declare endpoint variable in outer scope for error logging
    let endpoint = "UNKNOWN_ENDPOINT";

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

      // Use async endpoint for files > 1MB OR estimated > 500 rows OR > 100KB (conservative approach - same as Master Sites)
      // TEMPORARY: Force async for ALL uploads to avoid timeout issues during debugging
      const useAsync = true; // fileSizeMB > 1 || estimatedRows > 500 || file.size > 100 * 1024;

      console.log(`🚨🚨🚨 CRITICAL: useAsync is FORCED to TRUE 🚨🚨🚨`);
      console.log(`🚨🚨🚨 CRITICAL: useAsync value = ${useAsync} 🚨🚨🚨`);
      console.log(`🚨🚨🚨 CRITICAL: typeof useAsync = ${typeof useAsync} 🚨🚨🚨`);

      console.log(`📊 DETAILED FILE ANALYSIS:`, {
        name: file.name,
        sizeBytes: file.size,
        sizeKB: fileSizeKB.toFixed(2),
        sizeMB: fileSizeMB.toFixed(2),
        estimatedRows: estimatedRows,
        useAsync: useAsync,
        threshold: "1MB or 500+ rows or >100KB",
        endpoint: useAsync ? "ASYNC" : "SYNC",
        conditions: {
          fileSizeMBCheck: `${fileSizeMB.toFixed(2)}MB > 1MB = ${fileSizeMB > 1}`,
          estimatedRowsCheck: `${estimatedRows} rows > 500 = ${estimatedRows > 500}`,
          fileSizeBytesCheck: `${file.size} bytes > 100KB = ${file.size > 100 * 1024}`,
        },
      });

      setIsAsyncUpload(useAsync);

      const formData = new FormData();
      formData.append("file", file);

      // Use the EXACT logic from Master Sites (which works)
      // Use appropriate endpoint based on file size and estimated rows
      const asyncEndpoint = API_ENDPOINTS.PROJECTS.SITES.IMPORT_ASYNC(String(id));
      const syncEndpoint = API_ENDPOINTS.PROJECTS.SITES.IMPORT(String(id));
      endpoint = useAsync ? asyncEndpoint : syncEndpoint;

      console.log(`🚨🚨🚨 CRITICAL: Endpoint Construction 🚨🚨🚨`);
      console.log(`🚨🚨🚨 CRITICAL: Project ID: ${id} 🚨🚨🚨`);
      console.log(`🚨🚨🚨 CRITICAL: Async Endpoint: ${asyncEndpoint} 🚨🚨🚨`);
      console.log(`🚨🚨🚨 CRITICAL: Sync Endpoint: ${syncEndpoint} 🚨🚨🚨`);
      console.log(`🚨🚨🚨 CRITICAL: useAsync: ${useAsync} 🚨🚨🚨`);
      console.log(`🚨🚨🚨 CRITICAL: Selected Endpoint: ${endpoint} 🚨🚨🚨`);

      // TRIPLE CHECK: Verify endpoint selection logic
      if (useAsync === true) {
        console.log(`✅✅✅ SHOULD USE ASYNC: ${asyncEndpoint} ✅✅✅`);
      } else {
        console.log(`❌❌❌ SHOULD USE SYNC: ${syncEndpoint} ❌❌❌`);
      }

      // FINAL VERIFICATION
      console.log(`🔥🔥🔥 FINAL ENDPOINT TO BE CALLED: ${endpoint} 🔥🔥🔥`);

      console.log(`📤 PROJECT SITES: Uploading ${file.name} (${fileSizeMB.toFixed(2)}MB, ~${estimatedRows} estimated rows) using ${useAsync ? "async" : "sync"} endpoint`);
      console.log(`🔗 Final Endpoint: ${endpoint}`);
      console.log(`📦 FormData file appended:`, formData.has("file"));

      const startTime = Date.now();
      console.log(`⏰ API call started at: ${new Date(startTime).toISOString()}`);

      // EXACT COPY FROM MASTER SITES: Use api.post directly (not apiHelpers.post)
      // Add longer timeout for file uploads to prevent timeouts
      console.log(`🚨🚨🚨 CRITICAL: About to call API with endpoint: ${endpoint} 🚨🚨🚨`);
      console.log(`🚨🚨🚨 CRITICAL: Expected status for async: 202, for sync: 200 🚨🚨🚨`);
      console.log(`🚨🚨🚨 CRITICAL: If this is not import-async, we have a bug! 🚨🚨🚨`);

      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: useAsync ? 120000 : 60000, // 2 minutes for async, 1 minute for sync
      });

      console.log(`🚨🚨🚨 CRITICAL: Response received 🚨🚨🚨`);
      console.log(`🚨🚨🚨 CRITICAL: Status: ${response.status} 🚨🚨🚨`);
      console.log(`🚨🚨🚨 CRITICAL: Data:`, response.data);
      console.log(`🚨🚨🚨 CRITICAL: Expected async response should have job_id, actual:`, response.data?.job_id);

      // VERIFY RESPONSE TYPE
      if (response.status === 202 && response.data?.job_id) {
        console.log(`✅✅✅ SUCCESS: Async response detected with job_id: ${response.data.job_id} ✅✅✅`);
      } else if (response.status === 200) {
        console.log(`❌❌❌ ERROR: Got sync response (200) when we expected async (202)! ❌❌❌`);
      } else {
        console.log(`❌❌❌ ERROR: Unexpected response status: ${response.status} ❌❌❌`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`⏰ API call completed in: ${duration}ms`);
      console.log(`📥 Response Status: ${response.status}`);
      console.log(`📥 Response Data:`, response.data);

      if (useAsync && response.status === 202) {
        console.log("🔄 Async job started, setting initial state...");
        console.log("🔒 Loading state before setting results:", submitting);

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

        console.log("📝 Setting initial upload results:", initialResults);
        setResult(initialResults);

        // Start polling for job status immediately
        startJobStatusPolling(response.data.job_id);

        // Keep loading state active for async jobs - don't set submitting to false here
        // Loading will be set to false when the job completes in checkJobStatus
        console.log("🔒 Loading state after setting results (should still be true):", submitting);
      } else {
        // Small file - show immediate results
        setResult(response.data);
        console.log(`✅ Completed sync project sites import: ${response.data.created_master} created, ${response.data.linked} linked`);

        // Auto-navigate after successful sync upload (only if no errors)
        if (response.data && !response.data.error && (!response.data.errors || response.data.errors.length === 0)) {
          setTimeout(() => {
            navigate(`/projects/${id}/sites`);
          }, 3000);
        }
        // If there are errors, keep on page so user can view them

        // Only set loading to false for small files
        setSubmitting(false);
      }
    } catch (e: any) {
      console.error("🚨🚨🚨 CRITICAL: PROJECT SITES IMPORT FAILED 🚨🚨🚨");
      console.error("🚨🚨🚨 CRITICAL: Error Object:", e);
      console.error("🚨🚨🚨 CRITICAL: Error Code:", e?.code);
      console.error("🚨🚨🚨 CRITICAL: Error Message:", e?.message);
      console.error("🚨🚨🚨 CRITICAL: Error Response:", e?.response);
      console.error("🚨🚨🚨 CRITICAL: Error Response Data:", e?.response?.data);
      console.error("🚨🚨🚨 CRITICAL: Error Response Status:", e?.response?.status);
      console.error("🚨🚨🚨 CRITICAL: Error Response Headers:", e?.response?.headers);
      console.error("🚨🚨🚨 CRITICAL: Error Config:", e?.config);
      console.error("🚨🚨🚨 CRITICAL: Error Request:", e?.request);
      console.error("🚨🚨🚨 CRITICAL: This error occurred for endpoint:", endpoint);

      // Check if this is a timeout error
      const isTimeout = e?.code === "ECONNABORTED" || e?.message?.includes("timeout");
      console.error("❌ Is Timeout Error:", isTimeout);

      // Better error message handling
      let errorMessage = "Failed to import file";
      if (e?.response?.data?.error) {
        errorMessage = e.response.data.error;
      } else if (e?.response?.data?.detail) {
        errorMessage = e.response.data.detail;
      } else if (e?.message) {
        errorMessage = e.message;
      } else if (isTimeout) {
        errorMessage = "Upload timed out. The file may be too large. Please try again or contact support.";
      }

      console.error("❌ Final Error Message:", errorMessage);
      setError(errorMessage);
      setSubmitting(false); // Always stop loading on error
    }
  };

  // Start polling for job status
  const startJobStatusPolling = (jobId: number) => {
    console.log(`🔄 Starting polling for project sites job ${jobId}`);

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
      // Only poll if this is still the active job
      if (activeJobIdRef.current === jobId) {
        checkJobStatus(jobId);
      } else {
        console.log("🛑 Polling stopped for inactive job");
        clearInterval(interval);
      }
    }, 5000); // Poll every 5 seconds (same as Master Sites)

    setJobStatusInterval(interval);

    // Set a 30-minute timeout for safety
    const timeout = setTimeout(() => {
      console.log("⏰ Polling timeout reached for project sites job");
      stopJobStatusPolling();
      setError("Upload timed out. Please check the status manually.");
    }, 30 * 60 * 1000); // 30 minutes

    setPollingTimeout(timeout);
  };

  // Stop polling
  const stopJobStatusPolling = () => {
    console.log("🛑 Stopping project sites job polling");

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
    // Safety check to prevent polling for wrong job
    if (activeJobIdRef.current !== jobId) {
      console.log(`🚫 Job ID mismatch, stopping polling for ${jobId}`);
      return;
    }

    try {
      pollCountRef.current += 1;

      // Safety check for excessive polling
      if (pollCountRef.current > 100) {
        console.log("🚫 Too many poll attempts, stopping");
        stopJobStatusPolling();
        setError("Upload monitoring exceeded maximum attempts. Please refresh to check status.");
        return;
      }

      const response = await api.get(API_ENDPOINTS.PROJECTS.SITES.IMPORT_JOB_DETAIL(String(id), jobId));

      if (response.data) {
        const jobData = response.data;

        console.log(`📊 Job ${jobId} status: ${jobData.status} (${jobData.progress_percentage || 0}%)`);

        // Update upload results with current job status (exact copy from Master Sites)
        // Calculate progress percentage if not provided by backend
        const calculatedProgress = jobData.progress_percentage || (jobData.total_rows > 0 ? Math.round((jobData.processed_rows / jobData.total_rows) * 100) : 0);

        setResult((prev: any) => ({
          ...prev,
          message: `Processing: ${jobData.processed_rows}/${jobData.total_rows} rows completed`,
          summary: {
            total_rows: jobData.total_rows,
            success_count: jobData.success_count || jobData.linked_count || 0,
            error_count: jobData.error_count,
          },
          status: jobData.status,
          progress_percentage: calculatedProgress,
          errors: jobData.errors || [], // Include errors from backend
        }));

        // If job is completed, stop polling and handle completion (exact copy from Master Sites)
        if (jobData.status === "completed") {
          console.log("✅ Job completed, stopping polling");
          stopJobStatusPolling();

          // Show completion message first
          setResult((prev: any) => ({
            ...prev,
            message: `Upload completed! ${jobData.success_count || jobData.linked_count || 0} sites linked, ${jobData.error_count} errors.`,
            status: "completed",
            errors: jobData.errors || [], // Include errors from backend
          }));

          // Set loading to false when async job completes
          setSubmitting(false);

          // Only auto-navigate if there are NO errors
          if (jobData.error_count === 0) {
            setTimeout(() => {
              navigate(`/projects/${id}/sites`);
            }, 5000);
          }
          // If there are errors, keep on page so user can view them
        } else if (jobData.status === "failed") {
          console.log("❌ Job failed, stopping polling");
          stopJobStatusPolling();
          setResult((prev: any) => ({
            ...prev,
            message: `Upload failed: ${jobData.error_message}`,
            status: "failed",
          }));

          // Set loading to false when async job fails
          setSubmitting(false);
        }
      }
    } catch (error) {
      console.error("❌ Error checking project sites job status:", error);
      stopJobStatusPolling();
      setSubmitting(false);
      setError("Failed to check upload status. Please refresh the page.");
    }
  };

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

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        <Link to={`/projects/${id}`}>Project Details</Link>
        <Typography color="text.primary">Import Project Sites</Typography>
      </Breadcrumbs>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
            <Button variant="contained" onClick={onSubmit} disabled={!file || submitting}>
              Upload
            </Button>
            <Button variant="outlined" onClick={() => apiHelpers.download(API_ENDPOINTS.PROJECTS.SITES.IMPORT(String(id)), "project_sites_template.xlsx")}>
              Download Template
            </Button>
            <Button variant="text" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Progress Indicator */}
      {submitting && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            {isAsyncUpload ? "Processing Large File..." : "Uploading..."}
          </Typography>

          {isAsyncUpload && (
            <Typography variant="body2" color="info.main" sx={{ mb: 1 }}>
              ⚡ Large file detected - using background processing to prevent timeouts
            </Typography>
          )}

          {result?.status === "processing" && (
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
                <Typography variant="subtitle2">{result.message || "Processing in background..."}</Typography>
              </Box>

              <LinearProgress
                variant={result.progress_percentage ? "determinate" : "indeterminate"}
                value={result.progress_percentage || 0}
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
                {result.progress_percentage ? `Progress: ${result.progress_percentage}% (${result.processed_rows || 0}/${result.total_rows || 0} rows processed)` : "Processing in background..."}
              </Typography>

              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                Processing in background... This may take a few minutes for large files.
              </Typography>
            </>
          )}

          {!result?.progress_percentage && (
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

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results Display */}
      {result && (result.status === "completed" || result.created_master !== undefined) && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Import Summary
          </Typography>

          {/* Success metrics */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h4" color="primary.main">
                {result.created_master || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Master Sites Created
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" color="success.main">
                {result.linked || result.linked_count || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sites Linked to Project
              </Typography>
            </Box>
            <Box>
              <Typography variant="h4" color="warning.main">
                {result.skipped || result.skipped_count || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Already Linked (Skipped)
              </Typography>
            </Box>
            {((result.error_count && result.error_count > 0) || (result.errors && result.errors.length > 0)) && (
              <Box>
                <Typography variant="h4" color="error.main">
                  {result.error_count || result.errors?.length || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Errors
                </Typography>
              </Box>
            )}
          </Stack>

          {/* Status indicator for async uploads */}
          {result.status && (
            <Alert severity={result.status === "completed" ? "success" : result.status === "failed" ? "error" : result.status === "processing" ? "info" : "warning"} sx={{ mb: 2 }}>
              Status: {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
              {result.status === "completed" && (!result.error_count || result.error_count === 0) && " - Import completed successfully!"}
              {result.status === "completed" && result.error_count && result.error_count > 0 && ` - Import completed with ${result.error_count} errors`}
            </Alert>
          )}

          {/* Error details */}
          {result.errors && result.errors.length > 0 && (
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="subtitle2" color="error">
                  View Errors ({result.errors.length} errors)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ maxHeight: 300, overflow: "auto" }}>
                  {result.errors.map((error, index) => (
                    <Alert key={index} severity="error" sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        <strong>Row {error.row}:</strong> {error.error}
                      </Typography>
                    </Alert>
                  ))}
                </Box>
                {result.has_more_errors && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Note: Only showing first 50 errors. Download the full error report if needed.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => navigate(`/projects/${id}/sites`)} disabled={result.status === "processing"}>
              Go to Project Sites
            </Button>
            {result.status !== "processing" && (
              <Button
                variant="outlined"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setError(null);
                  setSubmitting(false);
                  stopJobStatusPolling();
                }}
              >
                Upload Another File
              </Button>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default ProjectSitesImportPage;

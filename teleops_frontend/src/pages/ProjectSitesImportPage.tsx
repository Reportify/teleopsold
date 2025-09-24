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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
  };

  // Intelligent file size detection and upload selection
  const onSubmit = async () => {
    if (!file || !id) {
      return;
    }

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

      setIsAsyncUpload(useAsync);

      const formData = new FormData();
      formData.append("file", file);

      // Use the EXACT logic from Master Sites (which works)
      // Use appropriate endpoint based on file size and estimated rows
      const asyncEndpoint = API_ENDPOINTS.PROJECTS.SITES.IMPORT_ASYNC(String(id));
      const syncEndpoint = API_ENDPOINTS.PROJECTS.SITES.IMPORT(String(id));
      endpoint = useAsync ? asyncEndpoint : syncEndpoint;

      const startTime = Date.now();

      // EXACT COPY FROM MASTER SITES: Use api.post directly (not apiHelpers.post)
      // Add longer timeout for file uploads to prevent timeouts
      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: useAsync ? 120000 : 60000, // 2 minutes for async, 1 minute for sync
      });

      if (useAsync && response.status === 202) {
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

        setResult(initialResults);

        // Start polling for job status immediately
        startJobStatusPolling(response.data.job_id);

        // Keep loading state active for async jobs - don't set submitting to false here
        // Loading will be set to false when the job completes in checkJobStatus
      } else {
        // Small file - show immediate results
        setResult(response.data);

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
      console.error("Project sites import failed:", e);

      // Check if this is a timeout error
      const isTimeout = e?.code === "ECONNABORTED" || e?.message?.includes("timeout");

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

      setError(errorMessage);
      setSubmitting(false); // Always stop loading on error
    }
  };

  // Start polling for job status
  const startJobStatusPolling = (jobId: number) => {
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
        clearInterval(interval);
      }
    }, 5000); // Poll every 5 seconds (same as Master Sites)

    setJobStatusInterval(interval);

    // Set a 30-minute timeout for safety
    const timeout = setTimeout(() => {
      stopJobStatusPolling();
      setError("Upload timed out. Please check the status manually.");
    }, 30 * 60 * 1000); // 30 minutes

    setPollingTimeout(timeout);
  };

  // Stop polling
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

  // Check job status
  const checkJobStatus = async (jobId: number) => {
    // Safety check to prevent polling for wrong job
    if (activeJobIdRef.current !== jobId) {
      return;
    }

    try {
      pollCountRef.current += 1;

      // Safety check for excessive polling
      if (pollCountRef.current > 100) {
        stopJobStatusPolling();
        setError("Upload monitoring exceeded maximum attempts. Please refresh to check status.");
        return;
      }

      const response = await api.get(API_ENDPOINTS.PROJECTS.SITES.IMPORT_JOB_DETAIL(String(id), jobId));

      if (response.data) {
        const jobData = response.data;

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
      console.error("Error checking project sites job status:", error);
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
      try {
        if (style.parentNode === document.head) {
          document.head.removeChild(style);
        }
      } catch (error) {
        // Silently handle the case where the element was already removed
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
